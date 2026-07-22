# Micro-task Policy

## Tujuan

Mengurangi token, context pollution, dan perubahan terlalu besar.

## Ukuran task

Task ideal:

- 5–15 menit;
- 1 tujuan;
- 1–3 file;
- 1 test utama;
- output kurang dari 150 kata.

Task terlalu besar bila memakai kata:

- dan;
- sekaligus;
- seluruh;
- lengkap;
- semua screen;
- end-to-end;

Pecah lagi bila terdapat lebih dari satu hasil yang dapat diuji terpisah.

## Contoh task baik

- Bootstrap Expo workspace.
- Tambahkan token warna light.
- Tambahkan token warna dark.
- Buat komponen `AppText`.
- Buat komponen `Button`.
- Buat migration tabel profiles.
- Tambahkan RLS profiles.
- Tambahkan test RLS profiles.
- Buat form login.
- Hubungkan form login ke Supabase.
- Buat query daftar transaksi.
- Buat `TransactionRow`.
- Tampilkan list transaksi.
- Buat form nominal.
- Tambahkan create transaction mutation.
- Tambahkan empty state transaksi.
- Buat RPC pembayaran utang.
- Tambahkan test RPC pembayaran utang.
- Buat parser `/keluar`.
- Tambahkan idempotency Telegram.
- Tambahkan export CSV.

## Contoh task buruk

- Bangun auth lengkap.
- Bangun dashboard dan transaksi.
- Selesaikan seluruh backend.
- Implementasikan Telegram lengkap.
- Buat semua reusable components.
- Audit dan perbaiki seluruh aplikasi.

## Milestone verification

Jalankan `pnpm verify` hanya setelah:

- foundation;
- auth;
- transactions;
- debts;
- Telegram;
- release.

Pada task biasa, jalankan test paling dekat saja.
