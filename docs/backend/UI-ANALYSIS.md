# Analisis UI untuk Backend — Phase 1 / Awal Phase 2

## 1. Tujuan dan batas audit

Dokumen ini mencatat keadaan **frontend yang benar-benar aktif di repository**, bukan daftar fitur dari PRD. Audit mencakup seluruh route Expo Router, aksi UI bermakna, form, state, sumber data, mock, dan gap integrasi backend. Acuan implementasi adalah source saat audit; kontrak rinci per aksi ada di `docs/backend/UI-API-MATRIX.md`.

## 2. Keputusan arsitektur otoritatif

Arsitektur backend yang berlaku untuk fase ini:

- **Database:** Supabase Postgres.
- **Otorisasi data:** Row Level Security (RLS) pada seluruh tabel domain; identitas pemilik berasal dari `auth.uid()`, bukan `user_id` kiriman client.
- **App API:** satu **Supabase Edge Function** modular sebagai REST router, dengan prefix publik `/api/v1`.
- **Auth:** signup, login, logout, reset password, refresh session, dan pembaruan metadata identitas tetap langsung melalui Supabase Auth SDK; bukan resource REST aplikasi.
- **PIN dan biometrik:** keamanan perangkat, bukan resource backend REST. PIN harus local-only sesuai `AGENTS.md`; server tidak menerima PIN plaintext maupun hash PIN. Biometrik dan ketersediaan hardware juga local-only.
- **Uang:** integer rupiah; mutasi saldo, transaksi, pembayaran utang, dan pergerakan tabungan harus atomik di database.

### Konflik dokumen lama

`docs/API-REST.md:12-21` menetapkan Express 4, Prisma, dan Postgres, serta `docs/API-REST.md:470-505` mengusulkan scaffold `apps/api`. Keputusan itu **digantikan** untuk Phase 1/awal Phase 2 oleh Supabase Postgres + RLS + satu modular Edge Function REST router. Daftar resource lama boleh menjadi bahan domain, tetapi runtime Express/Prisma, hosting Vercel/Neon, dan folder plan tersebut tidak otoritatif. Kontradiksi lain: dokumen lama masih mengizinkan PIN/biometrik di remote metadata (`docs/API-REST.md:383-395`), sedangkan batas keamanan sekarang mewajibkan keduanya lokal dan tanpa endpoint REST.

## 3. Inventaris seluruh route Expo

Expo Router memakai satu root stack tanpa deklarasi pembatas route (`src/app/_layout.tsx:33-38`). Semua file route berikut dapat dialamatkan:

| Route | Implementasi | UI/data aktif | Gap utama |
|---|---|---|---|
| `/` | `src/app/index.tsx:13-33` | Auth gate membaca session dan status PIN, lalu replace ke auth/PIN setup/PIN lock (`src/features/auth/hooks/use-auth-gate.ts:13-24`). | `hasPin()` saat ini memprioritaskan remote metadata, bertentangan dengan local-only. |
| `/auth` | `src/app/auth.tsx:4-17`; `src/features/auth/screens/auth-screen.tsx:37-317` | Tab login/register; nama, email, password; remember-me lokal; status modal. Login/signup langsung Supabase Auth (`src/features/auth/hooks/use-auth-form.ts:64-143`). | Social Google/Apple/Facebook tampil tetapi tanpa handler (`src/features/auth/screens/auth-screen.tsx:261-303`); remember-me tidak dipersist. Login selalu menuju `/pin-lock` (`src/app/auth.tsx:7-10`) tanpa memeriksa PIN edge case. |
| `/forgot-password` | `src/app/forgot-password.tsx:1-5`; `src/features/auth/screens/forgot-password-screen.tsx:15-150` | Form email dan `supabase.auth.resetPasswordForEmail` (`src/features/auth/screens/forgot-password-screen.tsx:47-71`). | Deep-link target `catatduekku://reset-password` tidak memiliki route reset-password di `src/app` (`src/features/auth/screens/forgot-password-screen.tsx:55-57`). |
| `/setup-pin` | `src/app/setup-pin.tsx:1-5`; `src/features/security/screens/setup-pin-screen.tsx:22-164` | PIN enam digit dua tahap, mismatch shake, lalu navigasi biometrik (`src/features/security/screens/setup-pin-screen.tsx:54-109`). | **Kritis:** `savePin` mengirim SHA-256 PIN ke `user_metadata.pin_hash` sebelum cache lokal (`src/core/lib/pin-storage.ts:36-47`). Harus dihapus dari remote dan diganti penyimpanan lokal yang sesuai. |
| `/setup-biometric` | `src/app/setup-biometric.tsx:1-5`; `src/features/security/screens/setup-biometric-screen.tsx:19-167` | Deteksi hardware/enrollment, autentikasi device, enable/skip, auto-skip jika unavailable (`src/features/security/screens/setup-biometric-screen.tsx:41-57`, `src/features/security/screens/setup-biometric-screen.tsx:69-93`). | Preferensi saat ini juga dikirim ke Supabase metadata melalui helper; harus local-only (`src/core/lib/pin-storage.ts:111-120`). |
| `/pin-lock` | `src/app/pin-lock.tsx:1-5`; `src/features/security/screens/pin-lock-screen.tsx:24-198` | Auto-prompt biometrik, PIN fallback, shake, modal setelah lima gagal, lupa PIN, logout (`src/features/security/screens/pin-lock-screen.tsx:56-83`, `src/features/security/screens/pin-lock-screen.tsx:98-140`). | Verifikasi PIN membaca remote hash lebih dahulu (`src/core/lib/pin-storage.ts:52-70`); penghitung lima gagal langsung direset lewat modal tanpa cooldown nyata (`src/features/security/screens/pin-lock-screen.tsx:110-120`). Logout juga menghapus PIN, sehingga kebijakan PIN per akun/per perangkat belum tegas. |
| `/forgot-pin` | `src/app/forgot-pin.tsx:1-5`; `src/features/security/screens/forgot-pin-screen.tsx:30-195` | Re-auth email/password langsung Supabase Auth, clear PIN, lalu setup ulang (`src/features/security/screens/forgot-pin-screen.tsx:75-106`). | `clearPin()` menghapus remote metadata (`src/core/lib/pin-storage.ts:95-102`), bertentangan dengan local-only. |
| `/(main)` | `src/app/(main)/index.tsx:17-57` | Satu route berisi empat tab state lokal: home, kelola, analitik, profil (`src/app/(main)/index.tsx:20-43`); scan membuka `/scan` (`src/app/(main)/index.tsx:50-54`). | Tidak ada backend domain. State tab hilang saat remount; home berisi banyak angka statis. |
| `/scan` | `src/app/scan.tsx:1-5`; `src/features/scan/screens/scan-screen.tsx:97-810` | Kamera/galeri, auto-detect barcode, form koreksi hasil, simpan expense ke memory store. | “AI extraction” sepenuhnya mock acak dengan timeout (`src/features/scan/screens/scan-screen.tsx:275-323`); transaksi hanya memory (`src/features/scan/screens/scan-screen.tsx:325-357`). |
| `/edit-profile` | `src/app/edit-profile.tsx:1-5`; `src/features/profile/screens/edit-profile-screen.tsx:24-105` | Ambil user, edit nama; email read-only. Pembaruan langsung `supabase.auth.updateUser` (`src/features/profile/hooks/use-edit-profile-form.ts:31-49`, `src/features/profile/hooks/use-edit-profile-form.ts:54-99`). | Bukan REST app; nama tetap Auth metadata. Tidak ada avatar/field profil domain aktif. |
| `/explore` | `src/app/explore.tsx:14-126` | Route template Expo berbahasa Inggris, collapsible lokal, external documentation links. | Bukan produk Catat Duekku dan tidak terhubung dari navigasi utama; tidak membutuhkan API. Sebaiknya diblokir dari build produk atau dihapus pada fase frontend. |

**Total route aktual: 11.** Empat tab utama bukan route terpisah; semuanya dirender di `/(main)`.

## 4. Analisis UI aktif per area

### 4.1 Auth dan keamanan

- Login: email/password, validasi kosong, loading, success/error modal; langsung `signInWithPassword` (`src/features/auth/hooks/use-auth-form.ts:64-114`).
- Register: nama/email/password; langsung `signUp`, nama menjadi `full_name` metadata (`src/features/auth/hooks/use-auth-form.ts:117-143`). Tidak ada confirm-password atau acceptance terms pada screen aktif gabungan.
- Tab auth dan remember-me hanya state UI (`src/features/auth/screens/auth-screen.tsx:45-60`, `src/features/auth/screens/auth-screen.tsx:214-237`).
- Social auth adalah CTA mati (`src/features/auth/screens/auth-screen.tsx:261-303`): **BLOCKED**, bukan endpoint domain yang boleh diada-adakan.
- File `login-screen.tsx` dan `register-screen.tsx` memiliki simulasi timeout serta CTA kosong (`src/features/auth/screens/login-screen.tsx:52-57`, `src/features/auth/screens/register-screen.tsx:31-37`), tetapi tidak diimpor route aktif; jangan menjadikannya requirement API.
- Seluruh operasi PIN/biometrik harus **NOT_REQUIRED** untuk `/api/v1`. Gap remote hash sangat kritis karena implementasi sekarang menyatakan Supabase metadata authoritative (`src/core/lib/pin-storage.ts:1-9`) dan melakukan read/write remote (`src/core/lib/pin-storage.ts:36-101`, `src/core/lib/pin-storage.ts:111-137`).

### 4.2 Home

Home merender nama hard-coded `Budi Pratama` (`src/app/(main)/index.tsx:29-35`). Header avatar dan lonceng menerima callback opsional tetapi parent tidak memasok callback (`src/features/dashboard/components/dashboard-header.tsx:15-19`, `src/app/(main)/index.tsx:31`), sehingga keduanya **BLOCKED**.

Ringkasan saldo memakai default props dan lima item statis (`src/features/dashboard/components/savings-balance-section.tsx:39-102`). Filter 24h/7d/30d, hide balance, pemilihan metric, dan scroll hanya state presentasi (`src/features/dashboard/components/savings-balance-section.tsx:107-136`, `src/features/dashboard/components/savings-balance-section.tsx:158-273`). Filter tidak melakukan fetch karena callback tidak diberikan.

Quick actions dan metrik juga statis (`src/features/dashboard/components/home-compact-panel.tsx:20-32`); parent tidak memberikan `onAction`, jadi Catat/Utang/Tabungan/Ringkasan adalah CTA mati (`src/features/dashboard/components/home-compact-panel.tsx:34-64`, `src/app/(main)/index.tsx:34`). Alert Kredivo juga hard-coded (`src/features/dashboard/components/home-compact-panel.tsx:95-103`).

AI input melakukan parser regex lokal dan, bila confidence rendah serta env tersedia, memanggil provider OpenAI-compatible langsung dari client (`src/core/lib/transaction-parser.ts:305-378`). UI parent tidak memasok `onSubmit` maupun `onConfirmPreview` (`src/app/(main)/index.tsx:33`), sehingga kirim hanya membersihkan input dan preview konfirmasi tidak muncul (`src/features/dashboard/components/ai-input-bar.tsx:68-81`, `src/features/dashboard/components/ai-input-bar.tsx:212-219`). Parsing tetap merupakan kandidat `POST /api/v1/parser`, tetapi eksekusi intent saat ini **BLOCKED** oleh wiring UI yang tidak ada.

### 4.3 Kelola

Layar memiliki lima form aktif (`src/features/manage/screens/manage-screen.tsx:41-84`):

1. **Akun:** nama saja; append ke state screen, saldo `Rp0` (`src/features/manage/screens/manage-screen.tsx:159-165`). Daftar awal adalah mock statis tiga akun dan saldo (`src/features/manage/screens/manage-screen.tsx:69-73`), berbeda dari `financeStore` default yang semuanya nol (`src/core/lib/finance-store.ts:68-72`).
2. **Budget bulanan:** input limit; update state lokal (`src/features/manage/screens/manage-screen.tsx:167-173`). Pemakaian selalu mock Rp3.450.000 (`src/features/manage/screens/manage-screen.tsx:106-108`). Tidak ada envelope aktif.
3. **Target tabungan:** nama, nominal, tanggal opsional; membuat goal memory (`src/features/manage/screens/manage-screen.tsx:175-187`). Tidak ada deposit/withdraw CTA pada layar kelola.
4. **Utang/cicilan:** nama, total, tenor, bulan terbayar, tanggal mulai; kalkulasi installment lokal, lalu menulis dua representasi memory yang berbeda (`financeStore` dan state `debts`) (`src/features/manage/screens/manage-screen.tsx:190-220`). Tidak ada bayar utang CTA aktif.
5. **Kategori:** nama saja; append state lokal (`src/features/manage/screens/manage-screen.tsx:223-229`). Daftar awal mock (`src/features/manage/screens/manage-screen.tsx:75`). Tipe income/expense tidak dipilih oleh form.

Buka/tutup modal, date picker, carousel target, expand kategori, dan pemilihan dot adalah presentasi lokal dan **NOT_REQUIRED** untuk API (`src/features/manage/screens/manage-screen.tsx:130-154`, `src/features/manage/screens/manage-screen.tsx:374-429`, `src/features/manage/screens/manage-screen.tsx:799-913`).

### 4.4 Analitik

Analitik membaca transaksi dari memory store dan menghitung tujuh bulan, KPI, kategori, quick stats, dan insight secara client-side (`src/features/analytics/screens/analytics-screen.tsx:278-433`). Empty state aktif bila belum ada transaksi (`src/features/analytics/screens/analytics-screen.tsx:435-461`). Selector Kategori/Arus Kas/Tabungan hanya mengubah visual lokal (`src/features/analytics/screens/analytics-screen.tsx:516-675`). Target backend adalah satu aggregate `GET /api/v1/analytics/overview?month=YYYY-MM&months=7`; tidak perlu memecah fetch hanya karena ada tiga tab.

CTA “Tanya AI” tidak memiliki `onPress` (`src/features/analytics/screens/analytics-screen.tsx:677-693`) sehingga **BLOCKED** dan tidak boleh melahirkan endpoint dokumen-only.

### 4.5 Scan struk

- Izin kamera, flash, auto scan, shutter, galeri, retake, dropdown, dan preset adalah operasi device/presentasi, bukan REST (`src/features/scan/screens/scan-screen.tsx:210-273`, `src/features/scan/screens/scan-screen.tsx:359-535`).
- Preset berisi tiga struk mock (`src/features/scan/screens/scan-screen.tsx:63-93`). Foto atau preset memilih mock acak dan timeout 2–2,4 detik (`src/features/scan/screens/scan-screen.tsx:275-323`). Tidak ada OCR/AI upload.
- Form hasil: amount, vendor, kategori statis, akun dari memory store, note (`src/features/scan/screens/scan-screen.tsx:121-129`, `src/features/scan/screens/scan-screen.tsx:610-715`).
- Simpan membuat expense memory dan mengubah saldo memory (`src/features/scan/screens/scan-screen.tsx:325-357`; mutasi store di `src/core/lib/finance-store.ts:202-231`). Targetnya `POST /api/v1/transactions`, sedangkan extraction baru dapat dipetakan ke `POST /api/v1/receipt-extractions` karena aksi scan memang aktif; status keduanya tetap jujur di matrix.

### 4.6 Profil dan data

Profil membaca user langsung dari Supabase Auth dan status security/device (`src/features/profile/hooks/use-profile-settings.ts:44-71`). Edit nama tetap direct Auth metadata, bukan endpoint profile domain (`src/features/profile/hooks/use-edit-profile-form.ts:54-99`). Timezone dan appearance hanya hasil device/theme (`src/features/profile/screens/profile-screen.tsx:222-268`).

“Sinkronkan sekarang” hanya timeout sukses tanpa data transfer (`src/features/profile/hooks/use-profile-settings.ts:79-85`): **BLOCKED** sampai strategi sync ditentukan; jangan mengarang endpoint sync generik. “Reset semua data” benar-benar aktif, tetapi hanya reset memory + security lokal/metadata (`src/features/profile/hooks/use-profile-settings.ts:148-164`). Untuk backend target, penghapusan seluruh data domain dipetakan ke `DELETE /api/v1/me/data`, namun PIN/biometrik tetap dibersihkan lokal. Logout langsung Supabase Auth dan reset memory (`src/features/profile/hooks/use-profile-settings.ts:166-179`), sehingga **NOT_REQUIRED** untuk REST.

## 5. Model state dan sumber data saat ini

| Area | Sumber aktual | Persistensi | Masalah |
|---|---|---|---|
| Session/user | Supabase Auth (`src/core/lib/supabase.ts`; pemakaian gate `src/features/auth/hooks/use-auth-gate.ts:13-24`) | Remote Auth/session client | Sudah nyata; bukan REST domain. |
| PIN/biometrik | Supabase metadata + AsyncStorage (`src/core/lib/pin-storage.ts:1-16`) | Remote dan lokal | **Pelanggaran kritis** terhadap local-only. |
| Accounts/transactions/debts/goals | Singleton `financeStore` (`src/core/lib/finance-store.ts:74-80`, `src/core/lib/finance-store.ts:466`) | Memory proses | Hilang saat reload; tidak user-scoped; ID berbasis waktu. |
| Kelola accounts/categories/budget/debt cards | `useState` + konstanta mock (`src/features/manage/screens/manage-screen.tsx:69-110`) | Lifetime screen | Duplikat/tidak konsisten dengan `financeStore`. |
| Dashboard | Props default dan konstanta statis (`src/features/dashboard/components/savings-balance-section.tsx:39-102`; `src/features/dashboard/components/home-compact-panel.tsx:20-32`) | Tidak ada | Tidak bereaksi terhadap store. |
| Analytics | Derived dari memory transactions (`src/features/analytics/screens/analytics-screen.tsx:278-338`) | Tidak ada | Kalkulasi client, data kosong setelah restart. |
| Scan extraction | Random `MOCK_RECEIPTS` + timeout (`src/features/scan/screens/scan-screen.tsx:63-93`, `src/features/scan/screens/scan-screen.tsx:275-323`) | Tidak ada | Bukan OCR/AI. |
| Parser | Regex lokal + opsional AI langsung client (`src/core/lib/transaction-parser.ts:118-303`, `src/core/lib/transaction-parser.ts:309-378`) | Tidak ada | API key publik berisiko; submit tidak wired ke eksekusi. |

## 6. State UX yang perlu dipertahankan saat integrasi

- Auth: loading, validasi kosong, success/error modal (`src/features/auth/hooks/use-auth-form.ts:35-40`, `src/features/auth/hooks/use-auth-form.ts:64-153`).
- PIN: create/confirm, mismatch shake, verifying/loading, salah 1–5, biometric fallback (`src/features/security/screens/setup-pin-screen.tsx:26-36`; `src/features/security/screens/pin-lock-screen.tsx:28-38`).
- Kelola: modal per form, disabled save ketika field wajib kosong, date picker, empty goal/debt (`src/features/manage/screens/manage-screen.tsx:91-110`, `src/features/manage/screens/manage-screen.tsx:720-746`).
- Analitik: empty state, category empty-month state, tiga visualisasi (`src/features/analytics/screens/analytics-screen.tsx:435-461`, `src/features/analytics/screens/analytics-screen.tsx:516-675`).
- Scan: camera permission, camera/scanning/result, invalid amount/account, success/error (`src/features/scan/screens/scan-screen.tsx:95-137`, `src/features/scan/screens/scan-screen.tsx:325-357`).
- Profile: loading user, syncing, confirmation destructive, success/error modal (`src/features/profile/hooks/use-profile-settings.ts:35-42`, `src/features/profile/hooks/use-profile-settings.ts:148-179`).

## 7. Gap prioritas

1. **Kritis — security boundary:** hentikan seluruh read/write `pin_hash` dan `biometric_enabled` di Supabase metadata (`src/core/lib/pin-storage.ts:36-137`); migrasikan menjadi local-only tanpa endpoint REST.
2. **Kritis — data durability:** pindahkan mutasi finance dari memory ke Postgres melalui Edge Function; seluruh tabel memakai RLS.
3. **Tinggi — source of truth:** hilangkan tiga dunia data yang berbeda: dashboard mock, manage state, dan `financeStore`.
4. **Tinggi — atomicity:** transaksi dan saldo, pembayaran utang, goal movement, adjustment, correction, undo harus satu transaksi database; implementasi memory saat ini memutasi beberapa array/objek (`src/core/lib/finance-store.ts:181-453`).
5. **Tinggi — receipt extraction:** ganti random timeout dengan extraction nyata; client mengonfirmasi sebelum transaksi dibuat.
6. **Tinggi — parser wiring/security:** jangan ekspos provider key di Expo client (`src/core/lib/transaction-parser.ts:315-329`); parser server tidak boleh auto-save, dan eksekusi hanya sesudah konfirmasi.
7. **Sedang — dead UI:** wiring atau hapus social login, home shortcuts/header icons, sync palsu, Tanya AI, dan route template `/explore`; status detail ada di matrix.
8. **Sedang — password recovery:** sediakan route/deep-link penyelesaian reset password; saat ini hanya email request yang ada.

## 8. Target minimum Phase 1 / awal Phase 2

- Supabase migration untuk accounts, transactions, categories, debts, saving_goals, budgets yang memang disentuh UI, plus tabel movement/payment bila operasi tersebut mulai dieksekusi parser.
- RLS CRUD per `auth.uid()` dan constraint/check untuk amount/status/type.
- Satu Edge Function router modular dengan prefix `/api/v1`, verifikasi JWT Supabase, response/error konsisten, dan operasi uang atomik.
- Endpoint hanya yang mempunyai aksi/read aktif dalam matrix; endpoint untuk CTA mati tetap BLOCKED atau NOT_REQUIRED.
- Auth tetap direct Supabase Auth. PIN/biometrik tidak masuk schema, RLS, OpenAPI domain, log request, maupun endpoint `/api/v1`.
