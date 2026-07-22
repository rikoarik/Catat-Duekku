# PRD — Catat Duekku
## Fokus: User Flow, Use Case, dan Perilaku Sistem

**Versi:** 1.1  
**Tujuan dokumen:** Menjelaskan bagaimana pengguna berpikir, berbicara, mengambil tindakan, dan menerima respons dari sistem. Dokumen ini tidak mengunci bentuk aplikasi, navigasi, framework, atau tampilan tertentu.

---

## 1. Konteks Produk

Catat Duekku adalah asisten keuangan pribadi berbasis AI.

Pengguna tidak ingin “mengoperasikan aplikasi keuangan”. Pengguna hanya ingin menyampaikan apa yang terjadi pada uangnya dengan bahasa sehari-hari, lalu sistem memahami, mencatat, menghitung, dan menjelaskan kembali kondisi keuangannya.

Contoh cara pengguna berinteraksi:

- `makan 25 ribu cash`
- `gajian 4 juta masuk bank`
- `cash sekarang tinggal 500 ribu`
- `aku punya utang kredivo 1 juta`
- `bayar kredivo 200 ribu`
- `buat tabungan laptop 15 juta`
- `nabung 300 ribu ke laptop`
- `bulan ini paling boros di mana`
- `uangku aman sampai gajian nggak`

Bentuk antarmuka dapat berupa aplikasi mobile, web, Telegram, chat, voice assistant, atau bentuk lain. Yang wajib dipertahankan adalah logika interaksi pengguna dan respons sistem.

---

## 2. Latar Belakang Masalah

Pengguna sudah mencoba mencatat keuangan melalui Telegram Bot dan Google Sheets.

Sistem sebelumnya sudah bisa mencatat transaksi, menampilkan ringkasan, mengelola utang, dan menampilkan dashboard. Namun pengalaman pengguna masih terasa teknis karena:

1. Pengguna harus memahami struktur data.
2. Pengguna kadang diminta memilih kategori atau ID.
3. Pengguna tidak ingin melihat ID utang atau ID tabungan.
4. Pengguna tidak ingin membuka spreadsheet hanya untuk mengetahui kondisi uangnya.
5. Pengguna ingin cukup mengetik seperti berbicara dengan manusia.
6. Pengguna ingin sistem memahami konteks tanpa banyak pertanyaan.
7. Pengguna ingin saldo cash dibedakan dari uang di bank atau e-wallet.
8. Pengguna ingin mengelola utang dan tabungan dengan bahasa natural.
9. Pengguna ingin mendapatkan jawaban keuangan yang berasal dari data nyata, bukan jawaban AI generik.
10. Pengguna ingin sistem bersifat pribadi, bukan platform publik multi-user.

---

## 3. Tujuan Pengguna

Pengguna ingin dapat:

- mencatat pemasukan dengan cepat;
- mencatat pengeluaran tanpa form panjang;
- mengetahui total uang yang dimiliki;
- mengetahui uang cash yang sedang dipegang;
- mengetahui saldo bank dan e-wallet;
- mengetahui sisa utang;
- mencatat pembayaran utang;
- membuat target tabungan;
- menambah atau menarik uang tabungan;
- mengetahui kondisi keuangan saat ini;
- mengetahui pola pengeluaran;
- memperbaiki transaksi yang salah;
- melakukan semua itu tanpa memasukkan ID atau kode teknis.

---

## 4. Prinsip User Flow

### 4.1 Pengguna berbicara secara natural

Pengguna tidak mengikuti format sistem.

Sistem yang harus menyesuaikan dengan pengguna.

Contoh:

`makan 20 ribu tadi siang pakai cash`

Sistem harus memahami:

- jenis: pengeluaran;
- nominal: Rp20.000;
- kategori: Makan & Harian;
- waktu: hari ini, siang;
- akun: Cash.

### 4.2 Jangan menanyakan hal yang tidak perlu

Jika data sudah cukup jelas, sistem langsung menjalankan aksi.

Salah:

`Silakan pilih tipe transaksi.`  
`Masukkan kategori.`  
`Masukkan ID akun.`

Benar:

`Pengeluaran Rp20.000 untuk makan dari Cash berhasil dicatat.`

### 4.3 Klarifikasi hanya untuk informasi penting

Sistem hanya bertanya jika satu informasi penting tidak dapat disimpulkan.

Contoh:

Pengguna:

`bayar utang 200 ribu`

Jika hanya ada satu utang aktif, sistem langsung memproses.

Jika ada beberapa utang aktif, sistem bertanya:

`Rp200.000 ini untuk Kredivo atau TikTok PayLater?`

### 4.4 ID hanya untuk sistem

ID transaksi, utang, tabungan, dan akun boleh ada di database, tetapi tidak menjadi bagian dari interaksi pengguna.

Pengguna cukup menyebut:

- Kredivo;
- Laptop;
- Cash;
- BCA;
- DANA.

### 4.5 Semua aksi penting harus dapat dikoreksi

Setelah sistem melakukan aksi, pengguna harus dapat berkata:

- `salah, tadi 30 ribu`
- `ubah jadi cash`
- `hapus transaksi terakhir`
- `batal`
- `bukan kredivo, tapi tiktok`

Sistem harus memahami bahwa koreksi mengacu pada konteks terakhir.

---

## 5. Aktor

### 5.1 Pengguna utama

Satu pengguna pribadi yang menggunakan sistem untuk mengelola keuangannya sendiri.

### 5.2 AI Interpreter

Bertugas memahami bahasa natural pengguna dan mengubahnya menjadi intent serta data terstruktur.

### 5.3 Financial Engine

Bertugas menjalankan perhitungan, validasi, perubahan saldo, perubahan utang, perubahan tabungan, dan analitik.

### 5.4 Data Store

Menyimpan transaksi, saldo, utang, tabungan, anggaran, dan konteks percakapan.

---

# 6. User Journey Utama

## Journey 1 — Memulai dari kondisi keuangan saat ini

### Situasi

Pengguna baru mulai menggunakan sistem dan belum memiliki data.

### Tujuan pengguna

Memasukkan kondisi awal tanpa mengisi banyak form.

### Contoh input

`cash aku 500 ribu, di bank 3 juta`

### Alur

1. Pengguna menyebut saldo aktual.
2. Sistem mendeteksi dua akun:
   - Cash: Rp500.000
   - Bank: Rp3.000.000
3. Sistem membuat saldo awal atau penyesuaian saldo.
4. Sistem menampilkan ringkasan kondisi awal.

### Respons

`Saldo awal berhasil disimpan. Cash Rp500.000, Bank Rp3.000.000, total Rp3.500.000.`

### Kondisi khusus

Jika pengguna hanya berkata:

`uangku sekarang 3 juta`

Sistem bertanya:

`Rp3.000.000 ini seluruh uangmu atau saldo salah satu akun?`

---

## Journey 2 — Mencatat pengeluaran harian

### Situasi

Pengguna baru selesai melakukan pembelian.

### Tujuan pengguna

Mencatat pengeluaran secepat mungkin.

### Contoh input

`makan 25 ribu cash`

### Alur

1. Sistem mendeteksi intent pengeluaran.
2. Sistem mengekstrak nominal.
3. Sistem menentukan kategori.
4. Sistem menentukan akun.
5. Sistem menyimpan transaksi.
6. Sistem mengurangi saldo akun.
7. Sistem memberi konfirmasi singkat.

### Respons

`Pengeluaran Rp25.000 untuk Makan & Harian dari Cash berhasil dicatat.`

### Variasi input

- `ngopi 18k`
- `bensin 50 ribu`
- `bayar kos 700 ribu via bank`
- `tadi beli obat 35 ribu`
- `grab 22 ribu pakai gopay`

### Aturan

Jika akun tidak disebutkan:

1. Gunakan akun default pengguna, atau
2. Gunakan akun dari kebiasaan sebelumnya, atau
3. Tanyakan hanya jika saldo akun akan menjadi tidak masuk akal.

---

## Journey 3 — Mencatat pemasukan

### Situasi

Pengguna menerima uang.

### Contoh input

`gajian 4 juta masuk bank`

### Alur

1. Sistem mendeteksi pemasukan.
2. Sistem menetapkan kategori Gaji.
3. Sistem menambah saldo Bank.
4. Sistem menyimpan transaksi.

### Respons

`Pemasukan gaji Rp4.000.000 ke Bank berhasil dicatat.`

### Variasi

- `dapat refund 150 ribu`
- `temen balikin uang 300 ribu cash`
- `freelance cair 2 juta ke seabank`

---

## Journey 4 — Menyesuaikan saldo aktual

### Situasi

Saldo pada sistem berbeda dengan kondisi nyata.

### Contoh input

`cash sekarang tinggal 450 ribu`

### Masalah

Input ini bukan pemasukan atau pengeluaran biasa. Pengguna sedang menyatakan saldo aktual.

### Alur

1. Sistem membaca saldo cash pada data.
2. Sistem membandingkan dengan nominal baru.
3. Sistem membuat transaksi penyesuaian sebesar selisih.
4. Sistem menetapkan saldo akhir menjadi Rp450.000.
5. Sistem menyimpan alasan sebagai penyesuaian saldo.

### Respons

`Saldo Cash disesuaikan menjadi Rp450.000.`

### Aturan

Jangan menambahkan Rp450.000 ke saldo sebelumnya.

---

## Journey 5 — Menambah utang

### Situasi

Pengguna memiliki kewajiban baru.

### Contoh input

`aku punya utang kredivo 1 juta jatuh tempo tanggal 25`

### Alur

1. Sistem mendeteksi intent membuat utang.
2. Sistem mengambil nama pemberi utang.
3. Sistem mengambil nominal.
4. Sistem mengambil jatuh tempo.
5. Sistem membuat utang aktif.
6. Sistem tidak menampilkan ID internal.

### Respons

`Utang Kredivo Rp1.000.000 dengan jatuh tempo tanggal 25 berhasil dicatat.`

### Data minimum

- nama pemberi utang;
- jumlah utang.

### Data opsional

- tanggal jatuh tempo;
- cicilan;
- prioritas;
- catatan.

---

## Journey 6 — Membayar utang

### Situasi

Pengguna membayar sebagian atau seluruh utang.

### Contoh input

`bayar kredivo 300 ribu dari bank`

### Alur

1. Sistem mencari utang aktif bernama Kredivo.
2. Sistem memastikan nominal tidak melebihi sisa utang.
3. Sistem membuat transaksi pembayaran utang.
4. Sistem mengurangi saldo Bank.
5. Sistem mengurangi sisa utang.
6. Jika sisa menjadi nol, status berubah menjadi Lunas.
7. Sistem menampilkan sisa utang.

### Respons

`Pembayaran Kredivo Rp300.000 berhasil. Sisa utang Rp700.000.`

### Klarifikasi

Jika ada dua utang dengan nama mirip:

`Ada dua utang Kredivo aktif. Yang jatuh tempo tanggal 15 atau tanggal 25?`

---

## Journey 7 — Membuat target tabungan

### Situasi

Pengguna ingin menabung untuk tujuan tertentu.

### Contoh input

`buat target tabungan laptop 15 juta sebelum desember`

### Alur

1. Sistem mendeteksi target bernama Laptop.
2. Sistem mengambil target nominal.
3. Sistem mengambil target waktu.
4. Sistem membuat target.
5. Sistem menampilkan progres awal.

### Respons

`Target tabungan Laptop sebesar Rp15.000.000 berhasil dibuat.`

---

## Journey 8 — Menambah uang ke tabungan

### Situasi

Pengguna memindahkan uang dari akun ke target tabungan.

### Contoh input

`nabung 200 ribu ke laptop dari bank`

### Alur

1. Sistem mencari target Laptop.
2. Sistem memeriksa saldo Bank.
3. Sistem mengurangi saldo Bank.
4. Sistem menambah saldo target Laptop.
5. Sistem menyimpan mutasi.
6. Sistem memperbarui progres.

### Respons

`Rp200.000 ditambahkan ke tabungan Laptop. Total terkumpul Rp1.200.000.`

---

## Journey 9 — Menarik uang dari tabungan

### Contoh input

`ambil 100 ribu dari tabungan laptop ke cash`

### Alur

1. Sistem mencari target Laptop.
2. Sistem memeriksa saldo target.
3. Sistem mengurangi saldo tabungan.
4. Sistem menambah saldo Cash.
5. Sistem menyimpan mutasi.

### Respons

`Rp100.000 ditarik dari tabungan Laptop ke Cash.`

---

## Journey 10 — Melihat kondisi keuangan

### Contoh input

- `ringkasan`
- `uangku sekarang berapa`
- `cash berapa`
- `utang tersisa berapa`
- `bulan ini keluar berapa`

### Alur

1. Sistem menentukan jenis ringkasan yang diminta.
2. Sistem mengambil data aktual.
3. Sistem menghitung hasil.
4. Sistem menjawab ringkas.

### Respons contoh

`Total saldo Rp3.500.000. Cash Rp500.000, Bank Rp3.000.000. Pengeluaran bulan ini Rp1.200.000. Sisa utang Rp700.000.`

---

## Journey 11 — Meminta analisis

### Contoh input

`bulan ini paling boros di mana`

### Alur

1. Sistem mengambil transaksi bulan berjalan.
2. Sistem mengelompokkan pengeluaran.
3. Sistem menghitung kategori terbesar.
4. Sistem menyampaikan hasil berdasarkan data aktual.

### Respons

`Pengeluaran terbesar bulan ini ada di Makan & Harian sebesar Rp850.000, yaitu 38% dari seluruh pengeluaran.`

### Aturan

AI tidak boleh memberikan angka jika data tidak tersedia.

---

## Journey 12 — Mengoreksi kesalahan

### Contoh

Pengguna:

`makan 25 ribu cash`

Sistem:

`Pengeluaran Rp25.000 berhasil dicatat.`

Pengguna:

`salah, 35 ribu`

### Alur

1. Sistem membaca konteks transaksi terakhir.
2. Sistem mengubah nominal menjadi Rp35.000.
3. Sistem memperbarui saldo.
4. Sistem memberi konfirmasi.

### Respons

`Transaksi terakhir diubah menjadi Rp35.000.`

### Variasi koreksi

- `bukan cash, bank`
- `hapus yang tadi`
- `kategorinya transport`
- `tanggalnya kemarin`
- `batal`

---

# 7. Daftar Use Case

## UC-01 Mencatat pengeluaran

**Aktor:** Pengguna  
**Trigger:** Pengguna menyebut aktivitas yang mengurangi uang.  
**Precondition:** Pengguna terautentikasi.  
**Main flow:**
1. Pengguna mengirim input natural.
2. Sistem mengenali pengeluaran.
3. Sistem mengekstrak nominal, kategori, akun, dan waktu.
4. Sistem memvalidasi saldo.
5. Sistem menyimpan transaksi.
6. Sistem memperbarui saldo.
7. Sistem mengirim konfirmasi.

**Alternative flow:**
- Nominal tidak ditemukan → sistem meminta nominal.
- Akun ambigu → sistem meminta akun.
- Saldo tidak cukup → sistem memperingatkan tetapi tidak mengarang saldo.

**Postcondition:** Transaksi tersimpan dan saldo diperbarui.

---

## UC-02 Mencatat pemasukan

**Trigger:** Pengguna menerima uang.  
**Postcondition:** Saldo akun bertambah dan transaksi tersimpan.

---

## UC-03 Menetapkan saldo aktual

**Trigger:** Pengguna menyebut saldo saat ini.  
**Main flow:** Sistem menghitung selisih dan membuat penyesuaian saldo.  
**Postcondition:** Saldo sistem sama dengan saldo aktual pengguna.

---

## UC-04 Membuat utang

**Trigger:** Pengguna menyebut utang baru.  
**Postcondition:** Utang aktif dibuat tanpa pengguna memasukkan ID.

---

## UC-05 Membayar utang

**Trigger:** Pengguna menyebut pembayaran utang.  
**Postcondition:** Saldo akun berkurang dan sisa utang diperbarui.

---

## UC-06 Membuat target tabungan

**Trigger:** Pengguna menyebut tujuan tabungan.  
**Postcondition:** Target tabungan dibuat.

---

## UC-07 Menyetor tabungan

**Trigger:** Pengguna menyebut nominal dan target tabungan.  
**Postcondition:** Saldo sumber berkurang dan saldo target bertambah.

---

## UC-08 Menarik tabungan

**Trigger:** Pengguna menarik dana dari target.  
**Postcondition:** Saldo target berkurang dan akun tujuan bertambah.

---

## UC-09 Meminta ringkasan

**Trigger:** Pengguna meminta kondisi keuangan.  
**Postcondition:** Sistem memberikan ringkasan dari data aktual.

---

## UC-10 Meminta analisis

**Trigger:** Pengguna bertanya tentang pola, risiko, atau kemampuan keuangan.  
**Postcondition:** Sistem memberikan analisis berbasis data.

---

## UC-11 Mengoreksi transaksi terakhir

**Trigger:** Pengguna menyatakan koreksi.  
**Postcondition:** Data terakhir diperbarui secara konsisten.

---

## UC-12 Menghapus atau membatalkan aksi

**Trigger:** Pengguna berkata `hapus`, `batal`, atau `undo`.  
**Postcondition:** Aksi dibatalkan dan saldo dikembalikan secara benar.

---

# 8. Intent yang Harus Dipahami AI

```text
create_expense
create_income
set_cash_balance
set_account_balance
create_debt
pay_debt
update_debt
delete_debt
create_saving_goal
deposit_saving
withdraw_saving
update_saving_goal
create_budget
update_budget
get_summary
get_cash_balance
get_account_balance
get_debt_summary
get_saving_summary
get_recent_transactions
get_analysis
update_last_action
undo_last_action
delete_transaction
unknown
```

---

# 9. Entity yang Harus Diekstrak

```text
amount
transaction_type
category
description
account
creditor
debt_name
saving_goal
date
time
due_date
target_date
payment_method
source_account
destination_account
reference
```

---

# 10. Aturan Pemahaman Konteks

Sistem harus menyimpan konteks percakapan terakhir.

Contoh:

Pengguna:

`bayar kredivo 200 ribu`

Lalu:

`pakai cash`

Sistem harus memahami bahwa `pakai cash` adalah perubahan akun pembayaran untuk transaksi sebelumnya.

Contoh lain:

Pengguna:

`buat tabungan laptop 15 juta`

Lalu:

`target desember`

Sistem harus memperbarui target tanggal tabungan Laptop.

Konteks harus memiliki masa berlaku dan tidak boleh menghubungkan input yang sudah terlalu lama.

---

# 11. Aturan Klarifikasi

Sistem bertanya hanya jika:

1. nominal tidak ada;
2. terdapat beberapa utang yang sama-sama cocok;
3. terdapat beberapa target tabungan yang sama-sama cocok;
4. akun sumber penting tetapi tidak dapat disimpulkan;
5. pernyataan saldo tidak jelas apakah total atau per akun;
6. input berisiko menghasilkan perubahan besar yang ambigu.

Contoh klarifikasi yang baik:

`Rp200.000 ini dibayar untuk Kredivo atau TikTok PayLater?`

Contoh klarifikasi yang buruk:

`Silakan masukkan ID utang.`

---

# 12. Aturan Respons

Respons harus:

- singkat;
- menjelaskan apa yang dilakukan;
- menampilkan nominal;
- menampilkan akun atau target jika relevan;
- menampilkan hasil akhir seperti sisa utang atau saldo;
- menyediakan koreksi melalui bahasa natural.

Contoh:

`Pengeluaran Rp25.000 untuk makan dari Cash berhasil dicatat. Saldo Cash sekarang Rp475.000.`

---

# 13. Error Handling

## Input tidak dipahami

`Aku belum yakin maksudnya. Kamu ingin mencatat pengeluaran, pemasukan, utang, atau tabungan?`

## Nominal tidak ada

`Nominalnya berapa?`

## Saldo tidak cukup

`Saldo Bank hanya Rp150.000, sedangkan transaksi ini Rp200.000. Tetap catat atau ganti akun?`

## Utang tidak ditemukan

`Aku belum menemukan utang aktif bernama Kredivo.`

## Target tabungan tidak ditemukan

`Target tabungan Laptop belum ada. Buat sekarang?`

## Data kosong

`Belum ada transaksi bulan ini, jadi belum ada pola pengeluaran yang bisa dianalisis.`

---

# 14. Acceptance Criteria Berbasis User Flow

Produk dianggap berhasil jika:

1. Pengguna dapat mencatat transaksi dengan satu kalimat.
2. Pengguna tidak pernah diwajibkan memasukkan ID.
3. Sistem dapat membedakan saldo aktual dan transaksi.
4. Sistem dapat memahami koreksi terhadap aksi terakhir.
5. Sistem hanya bertanya ketika informasi penting ambigu.
6. Sistem dapat mengelola utang berdasarkan nama.
7. Sistem dapat mengelola tabungan berdasarkan nama tujuan.
8. Sistem dapat membedakan Cash, Bank, dan E-Wallet.
9. Sistem dapat menjawab ringkasan dari data aktual.
10. Sistem tidak mengarang angka.
11. Semua perubahan saldo konsisten.
12. Setiap aksi penting dapat dibatalkan atau dikoreksi.
13. Pengguna dapat menggunakan sistem tanpa membuka spreadsheet.
14. Bentuk antarmuka boleh berubah tanpa mengubah user flow inti.

---

# 15. Prompt Utama untuk AI Builder

> Bangun Catat Duekku berdasarkan user flow, bukan berdasarkan navigasi aplikasi tertentu. Pengguna berinteraksi menggunakan bahasa Indonesia sehari-hari. Sistem harus memahami niat pengguna, mengekstrak data, menjalankan perubahan keuangan, dan memberi respons singkat. Pengguna tidak boleh diminta memasukkan ID transaksi, ID utang, ID akun, atau ID tabungan. Sistem harus memahami konteks percakapan seperti “salah, tadi 35 ribu”, “bukan cash, bank”, dan “yang Kredivo”. Fokus utama adalah use case pengguna: mencatat pengeluaran, pemasukan, saldo aktual, utang, pembayaran utang, tabungan, penarikan tabungan, ringkasan, analisis, koreksi, dan undo. Antarmuka bebas menyesuaikan platform, tetapi perilaku sistem dan alur pengguna ini wajib dipertahankan.
