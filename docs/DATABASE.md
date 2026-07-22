# Database

Dokumen ini adalah **target database contract** untuk backend Catat Duekku.

Status aplikasi saat ini:
- Auth sudah memakai Supabase Auth.
- `full_name`, `pin_hash`, dan `biometric_enabled` saat ini disimpan di Supabase Auth `user_metadata`.
- Cache PIN/biometric juga disimpan di AsyncStorage.
- Data keuangan aplikasi saat ini masih campuran `financeStore` in-memory dan mock/static UI.
- Tabel Postgres di bawah adalah target backend supaya UI bisa dipindahkan dari mock/in-memory ke API.

## Prinsip umum

- **Target source of truth server-side**: Postgres
- **Auth**: Supabase Auth
- **User identity**: `auth.users.id`
- **Semua tabel domain** scope ke `user_id`
- **Money**: integer rupiah (`bigint`)
- **RLS**: semua tabel user pakai `auth.uid()`
- **PIN dan biometric** bukan tabel domain transaksi; dipisahkan dari data keuangan

## Pembagian penyimpanan

### 1. Target server-side tables
Masuk Postgres dan jadi basis API saat backend mulai diimplementasikan:
- profiles
- accounts
- categories
- transactions
- debts
- debt_payments
- saving_goals
- goal_movements
- monthly_budgets
- budget_envelopes
- last_actions
- processed_events
- telegram_links
- telegram_link_codes

### 2. Supabase Auth metadata
Disimpan di `auth.users.user_metadata`, bukan tabel domain utama:
- `full_name`
- `pin_hash`
- `biometric_enabled`

### 3. Device-local only
Tetap lokal di device:
- cache `pin_hash`
- cache `biometric_enabled`
- lock state runtime
- hardware biometric availability

> ponytail: untuk V1, `pin_hash` dan `biometric_enabled` boleh tetap di `user_metadata` karena memang itu yang dipakai app sekarang. Kalau nanti butuh audit/security policy lebih ketat, pindahkan ke tabel `security_preferences` khusus.

## Current UI data status

Bagian ini penting supaya dokumen database tidak dibaca seolah semua UI sudah server-backed.

| Area UI | Status sekarang | Target backend |
|---|---|---|
| Auth email/password | Supabase Auth | Tetap Supabase Auth |
| Register `full_name` | Supabase `user_metadata` | Mirror/read via `profiles.full_name` jika dibutuhkan |
| PIN | `user_metadata.pin_hash` + AsyncStorage cache | Tetap metadata untuk V1, optional `security_preferences` nanti |
| Biometric preference | `user_metadata.biometric_enabled` + AsyncStorage cache | Tetap metadata untuk V1 |
| Home metrics | Static/mock component data | `GET /summary` dari transaksi |
| Wallet accounts | Static screen data + parser default in-memory accounts | `accounts` table |
| Kelola accounts/categories | Local component state | `accounts`, `categories` |
| Transactions | `financeStore` in-memory | `transactions` table |
| Debts | Mock/local state screen + partial `financeStore` support | `debts`, `debt_payments`, linked transactions |
| Savings goals | `financeStore` in-memory | `saving_goals`, `goal_movements` |
| Budget | Static/mock envelopes | `monthly_budgets`, `budget_envelopes` |
| Analytics | Derived from `financeStore` in-memory | `GET /analytics/overview` from Postgres |
| Profile sync | Fake timeout success | `POST /sync` target |
| Reset data | local reset + auth metadata cleanup | `DELETE /me/data` target + local cleanup |
| Telegram | Docs/future only | `telegram_*` tables if enabled |

## Tables

## profiles

Mewakili data user yang dibaca layar Profile.

- `id uuid primary key` = `auth.users.id`
- `email text not null`
- `full_name text null`
- `timezone text null`
- `theme_mode text null default 'system'`
- `cloud_sync_enabled boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Catatan:
- `email` saat ini dibaca dari Supabase Auth user session, tapi tetap berguna di profile view/materialized join.
- `full_name` sekarang muncul di UI profile dan avatar initials.

## accounts

Dipakai oleh Kelola, Wallets, parser, transaksi, debt payment, saving goal movement.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `kind text not null check (kind in ('CASH','BANK','E_WALLET'))`
- `balance bigint not null default 0`
- `is_default boolean not null default false`
- `account_number text null`
- `icon text null`
- `sort_order int null`
- `active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

Catatan:
- `opening_balance` saja tidak cukup karena UI dan logic pakai **saldo berjalan**.
- `balance` wajib ada supaya Wallets, summary, dan mutation account tetap sinkron.

## categories

Dipakai untuk transaksi, analytics, budget envelopes, parser suggestion, dan Kelola kategori.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `type text not null check (type in ('INCOME','EXPENSE'))`
- `icon text null`
- `color text null`
- `active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

Constraint yang disarankan:
- unique user + name + type untuk kategori aktif.

## transactions

Tabel inti untuk semua histori keuangan.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `occurred_at timestamptz not null`
- `type text not null check (type in ('INCOME','EXPENSE','ADJUSTMENT','DEBT_PAYMENT','GOAL_DEPOSIT','GOAL_WITHDRAW'))`
- `amount bigint not null`
- `category_id uuid null references categories(id)`
- `category_name text null`
- `account_id uuid null references accounts(id)`
- `description text null`
- `note text null`
- `debt_id uuid null references debts(id)`
- `goal_id uuid null references saving_goals(id)`
- `resulting_balance bigint null`
- `source text null`
- `external_ref text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

Catatan amount:
- `INCOME` positif
- `EXPENSE` negatif
- `ADJUSTMENT` signed delta
- `DEBT_PAYMENT` negatif
- `GOAL_DEPOSIT` negatif
- `GOAL_WITHDRAW` positif

## debts

Dipakai di Debts screen, Debt detail, Manage, parser.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `creditor text null`
- `due_date date null`
- `total_amount bigint not null`
- `paid_amount bigint not null default 0`
- `status text not null check (status in ('active','paid')) default 'active'`
- `notes text null`
- `installment_plan jsonb null` — lihat [INSTALLMENT-PLAN.md](./INSTALLMENT-PLAN.md)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

Computed di API:
- `remaining_amount`
- `progress_percent`
- `days_until_due`
- `due_label`
- `due_status` = `overdue | due_soon | active | paid`
- `is_overdue`
- `installment_plan` (kalau null, utang model satu jatuh tempo)

## debt_payments

Riwayat pembayaran utang supaya tidak cuma bergantung ke transaksi umum.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `debt_id uuid not null references debts(id)`
- `transaction_id uuid not null references transactions(id)`
- `account_id uuid not null references accounts(id)`
- `amount bigint not null`
- `notes text null`
- `occurred_at timestamptz not null`
- `created_at timestamptz not null default now()`

Catatan:
- satu payment selalu punya satu transaksi `DEBT_PAYMENT`.

## saving_goals

Dipakai di Tabungan/Kelola/Savings screen/parser.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `target_amount bigint not null`
- `target_date date null`
- `saved_amount bigint not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

Computed di API:
- `progress_percent`
- `remaining_amount`
- `days_until_target`
- `target_label`
- `monthly_needed`
- `status` = `active | due_soon | overdue | achieved`

## goal_movements

Mutasi target tabungan.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `goal_id uuid not null references saving_goals(id)`
- `transaction_id uuid not null references transactions(id)`
- `account_id uuid not null references accounts(id)`
- `kind text not null check (kind in ('deposit','withdraw'))`
- `amount bigint not null`
- `note text null`
- `occurred_at timestamptz not null`
- `created_at timestamptz not null default now()`

## monthly_budgets

Budget level bulan.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `month text not null` -- format `YYYY-MM`
- `income_amount bigint null`
- `total_limit bigint not null`
- `period_start date generated always as (to_date(month || '-01', 'YYYY-MM-DD')) stored`
- `period_end date generated always as ((date_trunc('month', to_date(month || '-01', 'YYYY-MM-DD')) + interval '1 month - 1 day')::date) stored`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

Constraint:
- unique `(user_id, month)` untuk budget aktif.

## budget_envelopes

Pos anggaran per bulan.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `budget_id uuid not null references monthly_budgets(id)`
- `name text not null`
- `icon text null`
- `total_amount bigint not null`
- `accent_color text null`
- `accent_bg text null`
- `status text null check (status in ('safe','warning','low'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

Catatan:
- `used_amount`, `remaining_amount`, `percent_used`, `month_progress`, `day_of_month`, `days_in_month` lebih aman dihitung di query/API dari transaksi + kategori mapping + tanggal hari ini.

## budget_envelope_categories

Pivot table untuk relasi pos anggaran ↔ kategori.

- `envelope_id uuid not null references budget_envelopes(id)`
- `category_id uuid not null references categories(id)`
- primary key `(envelope_id, category_id)`

## last_actions

Agar fitur koreksi dan undo tidak bergantung pada memori lokal app.

- `user_id uuid primary key references auth.users(id)`
- `kind text not null check (kind in ('none','transaction','debt_payment','goal_deposit','goal_withdraw'))`
- `transaction_id uuid null references transactions(id)`
- `debt_id uuid null references debts(id)`
- `goal_id uuid null references saving_goals(id)`
- `updated_at timestamptz not null default now()`

## telegram_links

Tetap dipakai bila fitur Telegram diaktifkan.

- `user_id uuid unique not null references auth.users(id)`
- `telegram_user_id text unique not null`
- `username text null`
- `linked_at timestamptz not null default now()`
- `revoked_at timestamptz null`

## telegram_link_codes

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `token_hash text not null`
- `expires_at timestamptz not null`
- `consumed_at timestamptz null`
- `created_at timestamptz not null default now()`

## processed_events

Untuk idempotency webhook/import/event processing.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `source text not null`
- `external_id text not null`
- `result jsonb null`
- `created_at timestamptz not null default now()`

Constraint:
- unique `(source, external_id)`

## RLS

Semua user table:

```sql
using (user_id = auth.uid())
with check (user_id = auth.uid())
```

Untuk `profiles`:

```sql
using (id = auth.uid())
with check (id = auth.uid())
```

## PIN & biometric

### Yang dipakai UI saat ini
Implementasi sekarang menyimpan:
- `pin_hash`
- `biometric_enabled`

ke:
1. `supabase.auth.user_metadata`
2. `AsyncStorage` sebagai cache lokal/offline fallback

### Jadi apakah perlu tabel khusus?
**Belum wajib** untuk V1.

Karena code sekarang memang pakai:
- `savePin()` → `supabase.auth.updateUser({ data: { pin_hash } })`
- `setBiometricEnabled()` → `supabase.auth.updateUser({ data: { biometric_enabled } })`

Artinya, untuk kondisi **sesuai UI sekarang**, dokumen database harus bilang ini bagian dari **auth metadata**, bukan kolom `accounts`, dan bukan tabel keuangan utama.

### Kalau nanti mau dipisah lebih rapi
Bisa tambah tabel:

#### security_preferences
- `user_id uuid primary key references auth.users(id)`
- `pin_hash text null`
- `biometric_enabled boolean not null default false`
- `updated_at timestamptz not null default now()`

Tapi itu **upgrade path**, belum kondisi aktual app sekarang.

## Data user yang harus kebaca dari backend / auth

Sesuai UI profile + auth sekarang, minimal user-facing data yang perlu ada:
- `email`
- `full_name`
- `timezone`
- `theme_mode`
- `cloud_sync_enabled`
- `pin_hash` (auth metadata)
- `biometric_enabled` (auth metadata)

## Yang perlu diperhatikan saat implementasi API

1. **Jangan kirim PIN plaintext ke server**.
2. `pin_hash` boleh tetap di auth metadata selama flow masih sederhana.
3. Semua money mutation harus atomic.
4. Analytics jangan hitung dari mock; hitung dari tabel transaksi.
5. Lookup by name perlu untuk parser:
   - account
   - debt
   - saving goal
6. Soft delete lebih aman untuk audit.
7. `category_name` tetap disimpan di transaksi supaya history tidak rusak walau kategori dihapus.

skipped: SQL migration detail belum ditulis.
add when: kamu fix pilihan final apakah `pin_hash` tetap di auth metadata atau dipindah ke tabel `security_preferences`.