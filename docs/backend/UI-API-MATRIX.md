# Matriks UI → API — Phase 1 / Awal Phase 2

## Konvensi

Semua endpoint domain berada pada satu modular Supabase Edge Function REST router dengan prefix **`/api/v1`**. Request domain memakai `Authorization: Bearer <Supabase access token>`; database tetap menerapkan RLS dengan `auth.uid()`.

Status menggambarkan implementasi repository **sebelum backend baru ditulis**:

- **MISSING:** aksi/read UI ada, tetapi endpoint dan integrasi backend belum ada.
- **PARTIAL:** sebagian kebutuhan sudah nyata (misalnya Supabase Auth langsung atau memory implementation), tetapi flow target belum lengkap. PARTIAL tidak berarti endpoint Edge Function sudah tersedia.
- **NOT_REQUIRED:** aksi device, presentasi, navigasi, atau operasi Supabase Auth langsung; tidak boleh dibuatkan resource REST domain.
- **BLOCKED:** CTA tampil tetapi handler/wiring/product flow belum ada atau belum cukup jelas; jangan menciptakan endpoint hanya dari label.

Auth tidak menggunakan `/api/v1`. PIN/biometrik tidak pernah menjadi resource REST. Konflik arsitektur Express/Prisma terdokumentasi di `docs/API-REST.md:12-21` dan digantikan oleh keputusan di atas.

## Matriks lengkap

| ID | Route/area | Aksi/read UI aktual | State/form/data aktual | Target API atau boundary | Status | Referensi dan alasan |
|---:|---|---|---|---|---|---|
| 1 | `/` | Periksa session saat cold start | `isChecking`; Supabase session | Direct `supabase.auth.getSession`; status PIN local-only | PARTIAL | Gate aktif di `src/features/auth/hooks/use-auth-gate.ts:13-29`; pemeriksaan session benar, tetapi `hasPin()` membaca remote metadata (`src/core/lib/pin-storage.ts:74-89`). |
| 2 | `/auth` | Ganti tab login/register | State `mode`; animasi form | Tidak ada API | NOT_REQUIRED | Presentasi lokal (`src/features/auth/screens/auth-screen.tsx:73-109`, `src/features/auth/screens/auth-screen.tsx:146-181`). |
| 3 | `/auth` | Login email/password | Email, password, loading, modal | Direct `supabase.auth.signInWithPassword` | PARTIAL | Sudah aktif (`src/features/auth/hooks/use-auth-form.ts:64-114`); bukan Edge Function. Setelah sukses route memaksa `/pin-lock` tanpa cek PIN (`src/app/auth.tsx:7-10`). |
| 4 | `/auth` | Register nama/email/password | Nama wajib, email, password, modal | Direct `supabase.auth.signUp` | PARTIAL | Sudah aktif dan menyimpan `full_name` metadata (`src/features/auth/hooks/use-auth-form.ts:75-83`, `src/features/auth/hooks/use-auth-form.ts:117-143`); email-confirmation/session state belum dibedakan. |
| 5 | `/auth` | Toggle “Ingat saya” | Boolean default true | Tidak ada API | NOT_REQUIRED | Hanya state, tidak dipersist (`src/features/auth/hooks/use-auth-form.ts:38-39`, `src/features/auth/screens/auth-screen.tsx:214-229`). |
| 6 | `/auth` | Lupa kata sandi | Navigasi | Tidak ada API | NOT_REQUIRED | Membuka route lokal (`src/features/auth/screens/auth-screen.tsx:231-235`). |
| 7 | `/auth` | Masuk dengan Google | CTA tanpa `onPress` | Tetap direct Supabase OAuth bila flow produk disetujui | BLOCKED | CTA aktif secara visual tetapi mati (`src/features/auth/screens/auth-screen.tsx:261-274`); jangan buat endpoint REST. |
| 8 | `/auth` | Masuk dengan Apple | CTA tanpa `onPress` | Tetap direct Supabase OAuth bila flow produk disetujui | BLOCKED | Tidak ada handler (`src/features/auth/screens/auth-screen.tsx:276-289`). |
| 9 | `/auth` | Lanjut Facebook | CTA tanpa `onPress` | Tetap direct Supabase OAuth bila flow produk disetujui | BLOCKED | Tidak ada handler (`src/features/auth/screens/auth-screen.tsx:291-303`). |
| 10 | `/forgot-password` | Kirim link reset | Email, loading, success/error | Direct `supabase.auth.resetPasswordForEmail` | PARTIAL | Request aktif (`src/features/auth/screens/forgot-password-screen.tsx:47-75`); target deep link `catatduekku://reset-password` tidak memiliki route penyelesaian (`src/features/auth/screens/forgot-password-screen.tsx:55-57`). |
| 11 | `/forgot-password` | Kembali | Router back | Tidak ada API | NOT_REQUIRED | Navigasi lokal (`src/features/auth/screens/forgot-password-screen.tsx:87-93`, `src/features/auth/screens/forgot-password-screen.tsx:127-135`). |
| 12 | `/setup-pin` | Buat dan konfirmasi PIN enam digit | `create/confirm`, dots, pad, mismatch shake, loading | **Local-only secure storage; tanpa endpoint** | PARTIAL | UI benar (`src/features/security/screens/setup-pin-screen.tsx:54-109`), tetapi helper mengirim hash ke remote metadata (`src/core/lib/pin-storage.ts:36-47`), gap kritis. |
| 13 | `/setup-biometric` | Deteksi dukungan device | Hardware, enrolled, type | Device API saja | NOT_REQUIRED | `expo-local-authentication` (`src/features/security/screens/setup-biometric-screen.tsx:41-57`). |
| 14 | `/setup-biometric` | Enable biometrik | Prompt device, loading | Local-only preference; tanpa endpoint | PARTIAL | Prompt benar (`src/features/security/screens/setup-biometric-screen.tsx:69-87`), tetapi preference helper menulis remote metadata (`src/core/lib/pin-storage.ts:111-120`). |
| 15 | `/setup-biometric` | Skip/auto-skip biometrik | Boolean lokal, navigasi main | Local-only; tanpa endpoint | PARTIAL | Aksi aktif (`src/features/security/screens/setup-biometric-screen.tsx:45-50`, `src/features/security/screens/setup-biometric-screen.tsx:90-93`), remote write masih terjadi melalui helper. |
| 16 | `/pin-lock` | Auto-prompt dan manual biometrik | Available/enabled, device prompt | Device API saja | PARTIAL | UI aktif (`src/features/security/screens/pin-lock-screen.tsx:56-83`, `src/features/security/screens/pin-lock-screen.tsx:169-174`); preference remote harus dihapus. |
| 17 | `/pin-lock` | Verifikasi PIN | PIN dots/pad, loading, shake, attempts | Local-only verification; tanpa endpoint | PARTIAL | Verifikasi aktif (`src/features/security/screens/pin-lock-screen.tsx:98-134`), tetapi remote hash diprioritaskan (`src/core/lib/pin-storage.ts:52-70`). |
| 18 | `/pin-lock` | Lockout setelah lima salah | Error count dan modal | Device policy saja | PARTIAL | Modal ada (`src/features/security/screens/pin-lock-screen.tsx:110-129`), tetapi tidak ada delay/cooldown; confirm langsung reset counter. |
| 19 | `/pin-lock` | Lupa PIN | Navigasi `/forgot-pin` | Tidak ada API | NOT_REQUIRED | `src/features/security/screens/pin-lock-screen.tsx:177-181`. |
| 20 | `/pin-lock` | Keluar dan ganti akun | Clear PIN, sign out, route auth | Direct Supabase Auth + local cleanup | PARTIAL | Aktif (`src/features/security/screens/pin-lock-screen.tsx:136-140`); `clearPin()` masih remote (`src/core/lib/pin-storage.ts:95-102`). |
| 21 | `/forgot-pin` | Re-auth email/password | Email, password, loading, modal | Direct `supabase.auth.signInWithPassword`; lalu local PIN reset | PARTIAL | Re-auth aktif (`src/features/security/screens/forgot-pin-screen.tsx:75-106`), tetapi clear PIN menyentuh remote metadata. |
| 22 | `/(main)` | Pindah Home/Kelola/Analitik/Profil | `activeTab` lokal | Tidak ada API | NOT_REQUIRED | Semua tab adalah state satu route (`src/app/(main)/index.tsx:20-43`; tombol nav `src/components/navigation/floating-glass-nav.tsx:95-131`). |
| 23 | Home | Tampilkan nama/greeting | Nama hard-coded `Budi Pratama` | Direct Supabase Auth user metadata | PARTIAL | Parent hard-code (`src/app/(main)/index.tsx:31`), meski profil sudah bisa membaca Auth user. Bukan REST domain. |
| 24 | Home | Tekan avatar | Callback opsional tidak diberikan | Tidak ditentukan | BLOCKED | Komponen memanggil callback (`src/features/dashboard/components/dashboard-header.tsx:33-38`), parent tidak memasok (`src/app/(main)/index.tsx:31`). |
| 25 | Home | Tekan notifikasi | Callback opsional tidak diberikan; badge statis | Tidak ditentukan | BLOCKED | `src/features/dashboard/components/dashboard-header.tsx:50-60`; tidak ada produk notification aktif. |
| 26 | Home | Baca saldo/summary/range | Saldo, perubahan, 5 metrics semuanya default/static | `GET /api/v1/summary?range=24h|7d|30d` | MISSING | Mock/default di `src/features/dashboard/components/savings-balance-section.tsx:39-102`; tidak ada REST. |
| 27 | Home | Pilih 24h/7d/30d | State `activeRange`; callback tidak diberikan | Endpoint summary yang sama setelah wiring | PARTIAL | State berubah (`src/features/dashboard/components/savings-balance-section.tsx:107-131`, `src/features/dashboard/components/savings-balance-section.tsx:178-189`), data tidak berubah. |
| 28 | Home | Sembunyikan/tampilkan saldo | Boolean `isBalanceVisible` | Tidak ada API | NOT_REQUIRED | Preferensi ephemeral/presentasi (`src/features/dashboard/components/savings-balance-section.tsx:110-145`, `src/features/dashboard/components/savings-balance-section.tsx:163-175`). |
| 29 | Home | Pilih metric card pada meter | `selectedItemId` lokal | Tidak ada API tambahan | NOT_REQUIRED | Mengubah detail statis (`src/features/dashboard/components/savings-balance-section.tsx:158-273`). |
| 30 | Home | Quick action Catat | Callback `onAction` tidak diberikan | Belum dipetakan | BLOCKED | CTA tampil (`src/features/dashboard/components/home-compact-panel.tsx:20-25`, `src/features/dashboard/components/home-compact-panel.tsx:49-64`) tetapi parent hanya `<HomeCompactPanel />` (`src/app/(main)/index.tsx:34`). |
| 31 | Home | Quick action Utang | Callback tidak diberikan | Belum dipetakan | BLOCKED | Sama; tidak boleh mengarang create/pay action dari label saja. |
| 32 | Home | Quick action Tabungan | Callback tidak diberikan | Belum dipetakan | BLOCKED | Sama; tidak jelas create/deposit/withdraw. |
| 33 | Home | Quick action Ringkasan | Callback tidak diberikan | `GET /api/v1/summary` bila diwiring sebagai read | BLOCKED | Intent label ada tetapi handler parent tidak ada (`src/features/dashboard/components/home-compact-panel.tsx:16-25`, `src/app/(main)/index.tsx:34`). |
| 34 | Home | Lihat compact metrics dan alert Kredivo | Semua konstanta statis | `GET /api/v1/summary` dapat memasok metrics; alert belum ada action | MISSING | Metrics di `src/features/dashboard/components/home-compact-panel.tsx:27-32`; alert hard-coded di `src/features/dashboard/components/home-compact-panel.tsx:95-103`. |
| 35 | Home/AI bar | Parse teks sambil mengetik | Text, debounce, confidence, fields; regex lokal + opsional provider client | `POST /api/v1/parser` body `{text}`; tanpa side effect | PARTIAL | Parser lokal nyata (`src/core/lib/transaction-parser.ts:118-303`), provider dipanggil dari client (`src/core/lib/transaction-parser.ts:309-378`); Edge Function belum ada. |
| 36 | Home/AI bar | Kirim hasil parser | `onSubmit` opsional tidak diberikan; input hanya dibersihkan | Tidak ada endpoint eksekusi sampai confirmation flow diwiring | BLOCKED | `src/features/dashboard/components/ai-input-bar.tsx:68-74`; parent tidak memberi callback (`src/app/(main)/index.tsx:33`). |
| 37 | Home/AI bar | Konfirmasi preview untuk execute intent | Tombol hanya dirender bila callback tersedia; saat ini tidak tersedia | `POST /api/v1/parser/execute` setelah konfirmasi, atomic | BLOCKED | Kondisi render `src/features/dashboard/components/ai-input-bar.tsx:212-219`; tidak aktif pada parent. Endpoint jangan dibangun sebagai requirement UI aktif sebelum wiring. |
| 38 | Kelola | Baca daftar akun dan saldo | Tiga akun/saldo mock state screen | `GET /api/v1/accounts` | MISSING | Mock `src/features/manage/screens/manage-screen.tsx:69-73`, state `src/features/manage/screens/manage-screen.tsx:104`; bukan `financeStore`. |
| 39 | Kelola | Tambah akun | Form nama; saldo otomatis `Rp0` | `POST /api/v1/accounts` body minimal `{name, kind}` | MISSING | Save hanya append state (`src/features/manage/screens/manage-screen.tsx:159-165`). UI belum memilih `kind`; backend integration perlu default yang eksplisit atau field UI. |
| 40 | Kelola | Baca budget bulan berjalan | Limit state, used mock, derived remaining/pace | `GET /api/v1/budgets/current` | MISSING | `budgetLimit` dan `budgetUsed` di `src/features/manage/screens/manage-screen.tsx:106-108`, derivasi `src/features/manage/screens/manage-screen.tsx:116-118`. |
| 41 | Kelola | Atur limit budget bulanan | Form angka limit | `PUT /api/v1/budgets/current` body `{total_limit}` | MISSING | Hanya update state (`src/features/manage/screens/manage-screen.tsx:167-173`). Tidak ada envelope action aktif. |
| 42 | Kelola | Baca target tabungan | Dari `financeStore`; empty card bila kosong | `GET /api/v1/saving-goals` | MISSING | Read memory (`src/features/manage/screens/manage-screen.tsx:112-128`); store tidak persisten. |
| 43 | Kelola | Buat target tabungan | Nama, target amount, target date opsional | `POST /api/v1/saving-goals` | MISSING | Memory create (`src/features/manage/screens/manage-screen.tsx:175-187`; store `src/core/lib/finance-store.ts:394-409`). |
| 44 | Kelola | Pilih target/carousel | Tap card/dot dan index lokal | Tidak ada API | NOT_REQUIRED | `src/features/manage/screens/manage-screen.tsx:799-913`. |
| 45 | Kelola | Baca utang/cicilan | State screen; awal kosong | `GET /api/v1/debts` | MISSING | `INITIAL_DEBTS` kosong (`src/features/manage/screens/manage-screen.tsx:76`), state terpisah dari store (`src/features/manage/screens/manage-screen.tsx:108`). |
| 46 | Kelola | Buat utang/cicilan | Nama, amount, tenor, paid months, start date; preview lokal | `POST /api/v1/debts` termasuk installment input | MISSING | Menulis `financeStore` dan state terpisah (`src/features/manage/screens/manage-screen.tsx:190-220`), tidak REST. |
| 47 | Kelola | Pilih tanggal target/mulai cicilan | Date picker modal | Tidak ada API sampai form disimpan | NOT_REQUIRED | `src/features/manage/screens/manage-screen.tsx:130-138`, `src/features/manage/screens/manage-screen.tsx:740-746`. |
| 48 | Kelola | Baca kategori | Empat kategori mock, expand/collapse | `GET /api/v1/categories` | MISSING | Mock `src/features/manage/screens/manage-screen.tsx:75`, render `src/features/manage/screens/manage-screen.tsx:374-427`. |
| 49 | Kelola | Tambah kategori | Nama saja | `POST /api/v1/categories` | MISSING | Append state (`src/features/manage/screens/manage-screen.tsx:223-229`). Form tidak menentukan tipe INCOME/EXPENSE; gap payload harus diselesaikan di UI/contract. |
| 50 | Kelola | Tutup/buka sheet, expand kategori | State modal/accordion | Tidak ada API | NOT_REQUIRED | `src/features/manage/screens/manage-screen.tsx:140-154`, `src/features/manage/screens/manage-screen.tsx:374-429`, `src/features/manage/screens/manage-screen.tsx:432-447`. |
| 51 | Analitik | Baca overview 7 bulan | Transaksi memory lalu agregasi client | `GET /api/v1/analytics/overview?month=YYYY-MM&months=7` | MISSING | Read/derive di `src/features/analytics/screens/analytics-screen.tsx:278-433`; belum REST. Response harus memasok buckets, KPI, category slices, quick stats, insight. |
| 52 | Analitik | Empty state | Berdasar `transactions.length` | Endpoint overview mengembalikan data kosong valid | MISSING | Empty state `src/features/analytics/screens/analytics-screen.tsx:435-461`. |
| 53 | Analitik | Ganti Kategori/Arus Kas/Tabungan | State tab lokal; semua memakai dataset overview | Tidak ada request tambahan wajib | NOT_REQUIRED | `src/features/analytics/screens/analytics-screen.tsx:516-675`. |
| 54 | Analitik | Tanya AI | CTA tanpa `onPress` | Tidak ditentukan | BLOCKED | Tombol visual saja (`src/features/analytics/screens/analytics-screen.tsx:677-693`); jangan invent chat endpoint. |
| 55 | Main nav | Buka scan | Navigasi `/scan` | Tidak ada API | NOT_REQUIRED | `src/app/(main)/index.tsx:50-54`. |
| 56 | `/scan` | Minta izin kamera | Device permission | Tidak ada API | NOT_REQUIRED | `src/features/scan/screens/scan-screen.tsx:437-452`. |
| 57 | `/scan` | Toggle auto-detect dan flash | Device/UI state | Tidak ada API | NOT_REQUIRED | `src/features/scan/screens/scan-screen.tsx:210-220`, controls `src/features/scan/screens/scan-screen.tsx:374-410`. |
| 58 | `/scan` | Ambil foto/scan barcode | Camera capture, barcode callback, haptic | Tidak ada REST sampai extraction | NOT_REQUIRED | `src/features/scan/screens/scan-screen.tsx:165-180`, `src/features/scan/screens/scan-screen.tsx:223-247`, camera `src/features/scan/screens/scan-screen.tsx:425-435`. |
| 59 | `/scan` | Pilih gambar dari galeri | Media permission/picker | Tidak ada API sampai extraction | NOT_REQUIRED | `src/features/scan/screens/scan-screen.tsx:249-273`. |
| 60 | `/scan` | Ekstrak data struk | Random tiga mock + timeout; states camera/scanning/result | `POST /api/v1/receipt-extractions` multipart/image reference, tanpa auto-save | MISSING | Mock source `src/features/scan/screens/scan-screen.tsx:63-93`, simulasi `src/features/scan/screens/scan-screen.tsx:275-323`. Aksi extraction memang aktif, tetapi backend belum ada. |
| 61 | `/scan` | Pilih struk contoh | Tiga preset mock | Tidak ada production API | NOT_REQUIRED | Fasilitas simulasi lokal (`src/features/scan/screens/scan-screen.tsx:741-794`). |
| 62 | `/scan` | Koreksi amount/vendor/category/account/note | Form hasil; category hard-coded; accounts memory | Reads `GET /api/v1/accounts`, `GET /api/v1/categories`; edit form lokal | PARTIAL | Fields `src/features/scan/screens/scan-screen.tsx:121-129`, form `src/features/scan/screens/scan-screen.tsx:610-715`; reference lists belum backend. |
| 63 | `/scan` | Simpan pengeluaran hasil scan | Validasi amount/account; memory transaction | `POST /api/v1/transactions` body `{type:"EXPENSE", amount, account_id, category_id/name, description, note}` | MISSING | Save aktif ke memory (`src/features/scan/screens/scan-screen.tsx:325-357`); target harus atomik mengurangi saldo. |
| 64 | `/scan` | Foto/pindai ulang | Reset state/URI | Tidak ada API | NOT_REQUIRED | `src/features/scan/screens/scan-screen.tsx:591-608`, `src/features/scan/screens/scan-screen.tsx:726-735`. |
| 65 | Profil | Baca nama/email | Supabase Auth user | Direct `supabase.auth.getUser` | PARTIAL | Sudah aktif (`src/features/profile/hooks/use-profile-settings.ts:44-71`); bukan REST domain. Badge “cloud sync active” selalu tampil (`src/features/profile/screens/profile-screen.tsx:97-102`). |
| 66 | Profil | Buka edit profil | Navigasi `/edit-profile` | Tidak ada API | NOT_REQUIRED | `src/features/profile/screens/profile-screen.tsx:115-137`. |
| 67 | `/edit-profile` | Ambil nama/email | Supabase Auth user | Direct `supabase.auth.getUser` | PARTIAL | `src/features/profile/hooks/use-edit-profile-form.ts:31-50`. |
| 68 | `/edit-profile` | Simpan nama | Full name wajib; email read-only | Direct `supabase.auth.updateUser` | PARTIAL | Aktif (`src/features/profile/hooks/use-edit-profile-form.ts:54-99`); bukan `/api/v1/me/profile` karena UI hanya Auth metadata. |
| 69 | Profil | Enable/disable PIN | Switch, confirm destructive, route setup | Local-only; tanpa endpoint | PARTIAL | Flow `src/features/profile/hooks/use-profile-settings.ts:87-107`; disable memakai remote `clearPin()` saat ini. |
| 70 | Profil | Ubah PIN | Navigasi `/setup-pin` | Local-only; tanpa endpoint | PARTIAL | CTA aktif (`src/features/profile/screens/profile-screen.tsx:195-217`); penyimpanan remote masih gap kritis. |
| 71 | Profil | Enable/disable biometrik | Hardware state, prompt, switch | Local-only; tanpa endpoint | PARTIAL | `src/features/profile/hooks/use-profile-settings.ts:109-146`; helper remote harus diubah. |
| 72 | Profil | Lihat timezone | Derived dari device | Tidak ada API | NOT_REQUIRED | Read-only UI (`src/features/profile/screens/profile-screen.tsx:222-246`). |
| 73 | Profil | Lihat appearance | Derived dari color scheme | Tidak ada API | NOT_REQUIRED | Read-only UI (`src/features/profile/screens/profile-screen.tsx:248-268`). |
| 74 | Profil | Sinkronkan sekarang | Timeout 1,5 detik lalu sukses palsu | Belum ditentukan; jangan buat generic sync endpoint | BLOCKED | Tidak ada transfer data (`src/features/profile/hooks/use-profile-settings.ts:79-85`), CTA di `src/features/profile/screens/profile-screen.tsx:278-304`. REST CRUD normal harus menjadi source of truth, bukan tombol sync palsu. |
| 75 | Profil | Reset semua data | Confirm; reset memory, PIN, biometrik | `DELETE /api/v1/me/data` untuk data domain; local cleanup terpisah | MISSING | Aksi destruktif aktif (`src/features/profile/hooks/use-profile-settings.ts:148-164`). Endpoint tidak boleh menyentuh PIN/biometrik/Auth account. |
| 76 | Profil | Logout | Confirm, direct signOut, memory reset | Direct `supabase.auth.signOut` | PARTIAL | Aktif (`src/features/profile/hooks/use-profile-settings.ts:166-179`); bukan REST. Kebijakan cache finance setelah signout perlu ditangani frontend. |
| 77 | `/explore` | Expand/collapse tutorial | State lokal | Tidak ada API | NOT_REQUIRED | Template Expo (`src/app/explore.tsx:61-121`). |
| 78 | `/explore` | Buka external docs links | Browser/external link | Tidak ada API | NOT_REQUIRED | `src/app/explore.tsx:47-59`, `src/app/explore.tsx:71-73`, `src/app/explore.tsx:97-109`; route bukan flow produk dan tidak terhubung nav. |

## Operasi domain yang ada di code tetapi belum punya CTA aktif langsung

Bagian ini mencegah code yang sudah ada disalahartikan sebagai aksi UI aktif.

| Operasi code | Implementasi sekarang | Status untuk API pada audit ini | Alasan |
|---|---|---|---|
| Set saldo akun | `financeStore.setAccountBalance` (`src/core/lib/finance-store.ts:181-199`) | BLOCKED | Hanya dapat muncul sebagai intent parser; tombol/form langsung tidak ada dan parser submit tidak wired. |
| Transaksi income/expense via AI bar | Parser intents (`src/core/lib/transaction-parser.ts:258-302`) | BLOCKED | Preview ada, tetapi parent tidak memasok submit/confirm handler (`src/app/(main)/index.tsx:33`). Expense scan tetap MISSING secara terpisah karena tombol simpan aktif. |
| Koreksi nominal/akun transaksi terakhir | Parser intent (`src/core/lib/transaction-parser.ts:130-153`), store mutate (`src/core/lib/finance-store.ts:237-273`) | BLOCKED | Tidak ada CTA execute aktif. |
| Undo/delete transaksi terakhir | Parser shortcut (`src/core/lib/transaction-parser.ts:122-127`), store mutate (`src/core/lib/finance-store.ts:275-340`) | BLOCKED | Tidak ada CTA execute aktif. |
| Bayar utang | Store (`src/core/lib/finance-store.ts:368-391`) dan parser intent (`src/core/lib/transaction-parser.ts:174-191`) | BLOCKED | Layar Kelola hanya membuat utang; tidak ada tombol pembayaran. |
| Deposit target | Store (`src/core/lib/finance-store.ts:411-430`) dan parser intent (`src/core/lib/transaction-parser.ts:208-225`) | BLOCKED | Tidak ada CTA deposit aktif. |
| Withdraw target | Store (`src/core/lib/finance-store.ts:432-453`) dan parser intent (`src/core/lib/transaction-parser.ts:227-244`) | BLOCKED | Tidak ada CTA withdraw aktif. |
| CRUD edit/delete akun, kategori, utang, goal, budget | Tidak ada handler UI | BLOCKED | Jangan membawa daftar CRUD generik dari `docs/API-REST.md` menjadi scope Phase 1 hanya karena resource ada. |
| Budget envelopes | Tidak ada UI aktif | NOT_REQUIRED | Layar hanya mengatur satu limit budget bulanan (`src/features/manage/screens/manage-screen.tsx:257-275`, `src/features/manage/screens/manage-screen.tsx:690-718`). |
| Riwayat/detail transaksi, utang, pembayaran, goal movement | Tidak ada route/screen aktif | NOT_REQUIRED | Tidak ditemukan route atau CTA aktif dalam `src/app`. |

## Ringkasan target endpoint berdasarkan UI aktif

Status berikut adalah jumlah **endpoint unik**, bukan jumlah baris aksi:

| Endpoint target | Konsumen UI | Status saat ini |
|---|---|---|
| `GET /api/v1/summary?range=` | Dashboard saldo, metrics, compact summary | MISSING |
| `GET /api/v1/accounts` | Kelola, dropdown scan | MISSING |
| `POST /api/v1/accounts` | Form tambah akun | MISSING |
| `GET /api/v1/budgets/current` | Widget budget | MISSING |
| `PUT /api/v1/budgets/current` | Form limit budget | MISSING |
| `GET /api/v1/saving-goals` | Widget target tabungan | MISSING |
| `POST /api/v1/saving-goals` | Form target tabungan | MISSING |
| `GET /api/v1/debts` | Widget utang/cicilan | MISSING |
| `POST /api/v1/debts` | Form utang/cicilan | MISSING |
| `GET /api/v1/categories` | Kelola dan scan | MISSING |
| `POST /api/v1/categories` | Form kategori | MISSING |
| `GET /api/v1/analytics/overview?month=&months=7` | Analitik | MISSING |
| `POST /api/v1/receipt-extractions` | Scan foto/galeri | MISSING |
| `POST /api/v1/transactions` | Simpan expense hasil scan | MISSING |
| `DELETE /api/v1/me/data` | Reset semua data domain | MISSING |
| `POST /api/v1/parser` | Live parsing AI bar | PARTIAL |
| `POST /api/v1/parser/execute` | Konfirmasi intent parser | BLOCKED |

**Total endpoint unik yang dipetakan: 17 — 15 MISSING, 1 PARTIAL, 1 BLOCKED.**

## Total audit

- **Route Expo aktual:** 11.
- **Baris aksi/read UI yang diaudit:** 78.
- **Status baris:** 17 MISSING, 23 PARTIAL, 25 NOT_REQUIRED, 13 BLOCKED.
- **Operasi code tanpa CTA aktif yang ditahan dari scope:** 9 kelompok.
- **Resource REST untuk auth/PIN/biometrik:** 0; auth direct Supabase, PIN/biometrik local-only.
