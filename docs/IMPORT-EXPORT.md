# Import dan Export

## Import

Format transaksi:

- Tanggal
- Tipe
- Nominal
- Kategori
- Akun
- Keterangan

Flow:

1. pilih file;
2. parse;
3. preview;
4. tandai valid/invalid;
5. commit;
6. skip duplicate;
7. result summary.

## Export

- CSV transaksi;
- XLSX semua data;
- kompatibel dengan Excel dan Google Sheets.

## Aturan

- database tetap source of truth;
- import memakai row external reference;
- file sama tidak membuat data ganda;
- jangan membuat live sync pada V1.
