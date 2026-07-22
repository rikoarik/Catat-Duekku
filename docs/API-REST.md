# API REST Contract — Catat Duekku

Dokumen ini adalah **kontrak backend target** yang akan disesuaikan dengan flow aplikasi Catat Duekku.

Status aplikasi saat ini (untuk konteks pembaca):
- UI sudah pakai Supabase Auth.
- `full_name`, `pin_hash`, dan `biometric_enabled` sudah disimpan di Supabase Auth `user_metadata`.
- Cache lokal AsyncStorage digunakan untuk offline fallback PIN/biometric.
- Data keuangan aplikasi saat ini masih berasal dari `financeStore` in-memory + mock/static UI; belum ada REST call.
- Kontrak API di bawah ini adalah target supaya UI bisa dipindahkan dari mock/in-memory ke backend sungguhan.

## Keputusan teknis

- **Frontend / app**: Expo React Native
- **Auth**: langsung pakai **Supabase Auth** dari app
- **Backend app API**: **Express 4**
- **ORM**: **Prisma**
- **Database**: **Postgres**
- **Validasi**: **Zod** sebagai source of truth schema
- **Dokumentasi**: **OpenAPI 3.1 YAML**
- **JWT verify**: `Authorization: Bearer <supabase-jwt>` diverifikasi via **Supabase JWKS**

## Rekomendasi hosting

### Pilihan utama
- **Vercel Functions + Neon + Prisma**

Kenapa:
- frontend sudah cocok ke Vercel;
- free tier Vercel cukup untuk CRUD app traffic rendah-menengah;
- Neon free paling pas untuk Postgres serverless di 2026;
- Prisma tetap aman dipakai asal runtime pakai **pooled connection string** dan migration pakai **direct URL**.

### Backup
- **Vercel Functions + Supabase Postgres + Prisma**

Pilih backup ini kalau kamu ingin vendor lebih sedikit karena auth sudah ada di Supabase.

### Yang tidak direkomendasikan untuk V1
- **Render free**: cold start sekitar 1 menit terlalu jelek untuk finance app.
- **Fly.io**: tidak menarik untuk free tier baru.
- **Railway**: free story berubah-ubah; kurang stabil untuk baseline gratis.

## Prinsip kontrak

1. **Auth bukan urusan backend ini**
   - signup/login/reset password/social auth tetap lewat Supabase SDK.
   - backend hanya verify JWT dan ambil `sub` sebagai `user_id`.

2. **Semua resource milik user**
   - semua query dan mutation harus scope ke `user_id`.
   - client tidak boleh mengontrol `user_id` di body write.

3. **Money selalu integer rupiah**
   - simpan sebagai integer/bigint.
   - request amount dari client selalu positif.
   - transaksi tersimpan signed sesuai jenis.

4. **Parser tidak auto-save**
   - `POST /parser` hanya parse.
   - save hanya terjadi saat confirm lewat endpoint domain atau `POST /parser/execute`.

5. **Atomic untuk semua gerakan uang**
   - transaksi biasa;
   - set saldo;
   - bayar utang;
   - deposit/withdraw target tabungan;
   - undo/koreksi last action.

6. **ID internal, nama untuk UX**
   - API pakai UUID internal.
   - parser butuh lookup by name untuk akun, utang, dan target tabungan.

## Resource utama

### 1. Accounts
Dipakai oleh:
- Kelola → tambah akun
- Wallets/Akun screen
- parser (`cash`, `bank`, `e-wallet`)
- semua transaksi

Field utama:
- `id`
- `user_id`
- `name`
- `kind` = `CASH | BANK | E_WALLET`
- `balance`
- `is_default`
- `account_number?`
- `icon?`
- `created_at`
- `updated_at`
- `deleted_at?`

### 2. Transactions
Dipakai oleh:
- AI input bar
- Analytics
- Dashboard summary
- debt payment / saving goal movement

Field utama:
- `id`
- `user_id`
- `type` = `INCOME | EXPENSE | ADJUSTMENT | DEBT_PAYMENT | GOAL_DEPOSIT | GOAL_WITHDRAW`
- `amount` (signed di storage)
- `account_id?`
- `category_id?`
- `category_name?`
- `description?`
- `note?`
- `occurred_at`
- `debt_id?`
- `goal_id?`
- `resulting_balance?`
- `created_at`
- `updated_at`
- `deleted_at?`

### 3. Categories
Dipakai oleh:
- Kelola kategori
- Categories screen
- parser category guess
- Analytics kategori

Field utama:
- `id`
- `user_id`
- `name`
- `type` = `INCOME | EXPENSE`
- `icon?`
- `color?`
- `created_at`
- `updated_at`
- `deleted_at?`

### 4. Debts
Dipakai oleh:
- Kelola utang
- Debts screen
- Debt detail
- Debt payment modal
- parser create/pay debt

Field utama:
- `id`
- `user_id`
- `name`
- `creditor?`
- `due_date?`
- `total_amount`
- `paid_amount`
- `status` = `active | paid`
- `notes?`
- `installment_plan?`
- `created_at`
- `updated_at`
- `deleted_at?`

`installment_plan`:
- `tenor_months`
- `monthly_amount`
- `interest_rate?`
- `start_date`
- `paid_installments`
- `months_left`
- `projected_payoff_date`
- `next_due_date`
- `due_day_of_month?`
- `total_with_interest?`

Computed:
- `remaining_amount`
- `progress_percent`
- `days_until_due`
- `due_label`
- `due_status` = `overdue | due_soon | active | paid`
- `is_overdue`

Lihat detail model: `docs/INSTALLMENT-PLAN.md`.

### 5. Debt payments
Dipakai oleh:
- Bayar cicilan
- Riwayat pembayaran utang
- Undo last action

Field utama:
- `id`
- `user_id`
- `debt_id`
- `transaction_id`
- `account_id`
- `amount`
- `notes?`
- `occurred_at`

### 6. Saving goals
Dipakai oleh:
- Kelola tabungan
- Savings screen
- parser create/deposit/withdraw goal

Field utama:
- `id`
- `user_id`
- `name`
- `target_amount`
- `target_date?`
- `saved_amount`
- `created_at`
- `updated_at`
- `deleted_at?`

Computed:
- `progress_percent`
- `remaining_amount`
- `days_until_target`
- `target_label`
- `monthly_needed`
- `status` = `active | due_soon | overdue | achieved`

### 7. Goal movements
Dipakai oleh:
- deposit target
- tarik tabungan
- undo

Field utama:
- `id`
- `user_id`
- `goal_id`
- `transaction_id`
- `account_id`
- `kind` = `deposit | withdraw`
- `amount`
- `occurred_at`
- `note?`

### 8. Monthly budgets
Dipakai oleh:
- Kelola budget
- Wallets budget card
- Budget screen

Field utama:
- `id`
- `user_id`
- `month` (`YYYY-MM`)
- `period_start` (computed)
- `period_end` (computed)
- `income_amount?`
- `total_limit`
- `used_amount` (computed)
- `remaining_amount` (computed)
- `percent_used` (computed)
- `month_progress` (computed 0..1)
- `day_of_month` (computed)
- `days_in_month` (computed)
- `created_at`
- `updated_at`

### 9. Budget envelopes
Dipakai oleh:
- Budget screen pos anggaran
- Wallets breakdown kategori budget

Field utama:
- `id`
- `user_id`
- `budget_id`
- `name`
- `icon?`
- `total_amount`
- `used_amount`
- `remaining_amount`
- `percent_used`
- `accent_color?`
- `accent_bg?`
- `status`
- `category_ids?`
- `created_at`
- `updated_at`

### 10. Summary / analytics aggregates
Dipakai oleh:
- Home summary
- Analytics overview
- parser intent `get_summary`

### 11. User profile
Dipakai oleh:
- Profile screen
- sync/reset data

## Endpoint groups

## Accounts
- `GET /accounts`
- `GET /accounts/{account_id}`
- `GET /accounts/lookup?name=`
- `POST /accounts`
- `PATCH /accounts/{account_id}`
- `DELETE /accounts/{account_id}`
- `PUT /accounts/{account_id}/balance`

## Transactions
- `GET /transactions`
- `GET /transactions/{transaction_id}`
- `POST /transactions`
- `PATCH /transactions/{transaction_id}`
- `DELETE /transactions/{transaction_id}`

## Categories
- `GET /categories`
- `GET /categories/{category_id}`
- `POST /categories`
- `PATCH /categories/{category_id}`
- `DELETE /categories/{category_id}`

## Debts
- `GET /debts`
- `GET /debts/{debt_id}`
- `GET /debts/lookup?name=`
- `POST /debts`
- `PATCH /debts/{debt_id}`
- `DELETE /debts/{debt_id}`
- `GET /debts/{debt_id}/payments`
- `POST /debts/{debt_id}/payments`
- `DELETE /debt-payments/{payment_id}`

## Saving goals
- `GET /saving-goals`
- `GET /saving-goals/{goal_id}`
- `GET /saving-goals/lookup?name=`
- `POST /saving-goals`
- `PATCH /saving-goals/{goal_id}`
- `DELETE /saving-goals/{goal_id}`
- `POST /saving-goals/{goal_id}/deposits`
- `POST /saving-goals/{goal_id}/withdrawals`

## Budgets
- `GET /budgets`
- `GET /budgets/current`
- `POST /budgets`
- `PATCH /budgets/{budget_id}`
- `DELETE /budgets/{budget_id}`
- `GET /budgets/{budget_id}/envelopes`
- `POST /budgets/{budget_id}/envelopes`
- `PATCH /budget-envelopes/{envelope_id}`
- `DELETE /budget-envelopes/{envelope_id}`

## Summary / analytics
- `GET /summary`
- `GET /analytics/overview`
- `GET /analytics/monthly`
- `GET /analytics/categories`
- `GET /analytics/quick-stats`

## Last action / correction
- `GET /last-action`
- `PATCH /last-action/amount`
- `PATCH /last-action/account`
- `DELETE /last-action/transaction`
- `POST /last-action/undo`

## Parser
- `POST /parser`
- `POST /parser/execute`

## Profile / sync
- `GET /me/profile`
- `PATCH /me/profile`
- `POST /sync`
- `DELETE /me/data`

## Security boundaries

Pembagian ini mencerminkan kondisi UI sekarang + target backend.

### Saat ini (live UI)
- **Auth provider**: Supabase Auth.
- **User profile ringan**: `full_name` di Supabase `user_metadata`. `email` dari `auth.getUser()`. `timezone`/`theme_mode`/`cloud_sync_enabled` masih diturunkan lokal di Profile screen.
- **PIN hash (`pin_hash`)**: Supabase `user_metadata` + AsyncStorage cache (`@catat_duekku/pin_hash`).
- **Biometric preference (`biometric_enabled`)**: Supabase `user_metadata` + AsyncStorage cache (`@catat_duekku/biometric_enabled`).
- **Hardware biometric availability & lock state runtime**: device-local only.
- **Data keuangan (accounts, transactions, debts, saving goals, budgets, categories)**: `financeStore` in-memory + static/mock UI, belum REST-backed.

### Target setelah backend live
- Domain tables (accounts, transactions, categories, debts, debt payments, saving goals, goal movements, monthly budgets, budget envelopes, last_actions) pindah ke Postgres dengan RLS.
- Server endpoints baca/tulis domain tersebut sesuai kontrak di bawah.
- PIN/biometric tetap di auth metadata untuk V1; optional migrasi ke tabel `security_preferences` kemudian.
- Server **tidak boleh menerima PIN plaintext**.

## Parser intents yang harus didukung backend

- `create_expense`
- `create_income`
- `set_balance`
- `create_debt`
- `pay_debt`
- `create_goal`
- `deposit_goal`
- `withdraw_goal`
- `update_last_amount`
- `update_last_account`
- `undo_last`
- `get_summary`
- `unknown`

## Aturan side effect yang wajib

### Buat transaksi biasa
- income → tambah saldo akun
- expense → kurang saldo akun
- set `last_action = transaction`

### Set saldo akun
- `new_balance` adalah nilai absolut
- backend hitung `delta = new_balance - current_balance`
- buat transaksi `ADJUSTMENT`
- set `resulting_balance`
- set `last_action = transaction`

### Bayar utang
- validasi `amount <= remaining_amount`
- validasi saldo akun cukup
- update `paid_amount`
- bila lunas → `status = paid`
- kurangi saldo akun
- buat transaksi `DEBT_PAYMENT`
- simpan `last_action = debt_payment`

### Deposit target tabungan
- validasi saldo akun cukup
- tambah `saved_amount`
- kurangi saldo akun
- buat transaksi `GOAL_DEPOSIT`
- simpan `last_action = goal_deposit`

### Withdraw target tabungan
- validasi `amount <= saved_amount`
- kurangi `saved_amount`
- tambah saldo akun
- buat transaksi `GOAL_WITHDRAW`
- simpan `last_action = goal_withdraw`

### Undo / correction
- hanya berlaku untuk last action user itu sendiri
- semua undo harus atomic
- undo tidak boleh mengganggu user lain

## Query aggregate yang lebih bagus untuk UX

Daripada app fetch semua transaksi lalu hitung sendiri, backend sebaiknya kasih endpoint gabungan:

### `GET /analytics/overview?month=2026-07&months=7`
Response minimal:
- `month_label`
- `monthly_buckets[]`
- `kpis`
- `category_slices[]`
- `quick_stats`
- `insight`

Ini paling pas untuk layar Analitik sekarang.

## Rencana folder backend

```text
apps/
  api/
    src/
      app.ts
      server.ts
      env.ts
      middleware/
        auth.ts
        cors.ts
        rate-limit.ts
        error.ts
      modules/
        accounts/
        transactions/
        categories/
        debts/
        saving-goals/
        budgets/
        analytics/
        parser/
        profile/
      openapi/
        registry.ts
packages/
  shared/
    src/
      schemas/
      index.ts
  db/
    prisma/
      schema.prisma
      seed.ts
```

## File kontrak lain

- OpenAPI lengkap: `docs/openapi.yaml`
- Zod source-of-truth draft: `docs/ZOD-SCHEMAS.md`
- Deploy guide backend: `docs/BACKEND-DEPLOY.md`

skipped: scaffold Express/Prisma belum dibuat.
add when: kamu setuju kontrak ini jadi basis implementasi backend.