# Cicilan / Installment Plan

Catat Duekku belum punya model cicilan. Utang cuma `total_amount`, `paid_amount`, dan satu `due_date` final. Padahal PRD dan UX nyebut "cicilan" di beberapa tempat (catatan, label, contoh input). Dokumen ini jadi target kontrak supaya backend + UI nyambung.

## Tujuan

Jawaban yang harus bisa dijawab UI tanpa hitung manual:

- "Cicilan per bulan berapa?"
- "Sudah berapa bulan dibayar?"
- "Tinggal berapa bulan lagi?"
- "Kapan proyeksi lunas?"
- "Cicilan berikutnya tanggal berapa?"
- "Kalau aku bayar segini per bulan, lunas kapan?"
- "Ada bunga?"

## Hitungan

Semua nominal integer rupiah. Pembulatan ke atas (`Math.ceil`) supaya sisa tidak nyangkut di bulan terakhir.

### Flat tanpa bunga (default)

```
monthly_amount   = ceil(remaining_amount / tenor_months)
months_left      = tenor_months - paid_installments
payoff_date      = start_date + tenor_months
next_due_date    = start_date + paid_installments bulan
```

### Flat dengan bunga (bunga = persen dari principal)

```
total_with_interest = ceil(remaining_amount * (1 + interest_rate / 100))
monthly_amount      = ceil(total_with_interest / tenor_months)
```

Cocok untuk cicilan KPR/leasing yang bunganya flat per tahun, gampang dijelaskan ke user.

### Efektif per bulan (PMT, opsional V2)

```
P = remaining_amount
r = interest_rate / 100 / 12
n = tenor_months
PMT = P * r * (1+r)^n / ((1+r)^n - 1)
monthly_amount = ceil(PMT)
```

Versi akurat untuk kartu kredit / paylater, tapi V1 cukup flat dulu.

## Data model

Tambah `installment_plan` sebagai sub-resource opsional di `debts`. Kalau null, utang tetap model satu jatuh tempo (`due_date`).

```ts
interface InstallmentPlan {
  tenor_months: number;             // >= 1
  monthly_amount: number;           // nominal per bulan, integer rupiah
  interest_rate?: number;           // persen bunga (opsional, 0 = tanpa bunga)
  start_date: string;               // ISO date — tanggal cicilan pertama
  paid_installments: number;        // increment tiap payment sukses
  // computed:
  months_left: number;              // tenor_months - paid_installments
  projected_payoff_date: string;    // start_date + tenor_months
  next_due_date: string;            // start_date + paid_installments * 1 month
  total_with_interest?: number;     // kalau ada bunga
}
```

Tambahan response simulasi (opsional V1, untuk tombol "kalau bayar segini"):

```ts
interface InstallmentSimulation {
  amount_per_month: number;
  months_to_payoff: number;
  payoff_date: string;
  months_saved: number;
}
```

## Aturan validasi

- `tenor_months >= 1`
- `monthly_amount > 0` (kalau user isi manual)
- `interest_rate` opsional, kalau ada harus `>= 0`
- `paid_installments <= tenor_months`
- `start_date` harus tanggal valid
- kalau `installment_plan` ada, `due_date` di `debts` tetap dipakai sebagai deadline akhir (sama dengan `projected_payoff_date`)

## API tambahan

### `POST /debts`
Body baru:
```json
{
  "name": "Cicilan Motor",
  "total_amount": 8000000,
  "due_date": "2027-03-10",
  "notes": "Leasing Honda Beat",
  "installment_plan": {
    "tenor_months": 12,
    "monthly_amount": 700000,
    "interest_rate": 5,
    "start_date": "2026-03-10"
  }
}
```

Kalau `installment_plan` dikirim, backend wajib:
1. Hitung ulang `monthly_amount` (kalau user override, validasi konsistensi).
2. Hitung `projected_payoff_date`, `next_due_date`, `months_left`, `total_with_interest`.
3. Set `paid_installments = 0`.

### `GET /debts/{id}`
Response wajib menyertakan `installment_plan` (kalau ada).

### `POST /debts/{id}/payments`
Response wajib menyertakan `installment_plan` yang sudah di-update. Backend increment `paid_installments` kalau payment >= `monthly_amount`. Kalau `status` jadi `paid`, set `paid_installments = tenor_months`.

### `POST /debts/{id}/simulate` (opsional V1, target V2)
Body: `{ amount_per_month: number }`
Response: `InstallmentSimulation`.

## Flow UX

### Create Utang
- Field toggle "Ini cicilan?".
- Kalau aktif, muncul field opsional:
  - Tenor (bulan, default 12)
  - Cicilan per bulan (opsional, auto kalau kosong)
  - Bunga total % (opsional)
  - Tanggal mulai cicilan (default hari ini)
- Preview: "Cicilan Rp X / bulan · Lunas pada {tanggal}".

### Daftar Utang
Summary card tambah blok kecil:
- "Komitmen cicilan / bulan: Rp X · N cicilan aktif"

### Debt Card
Tiap card dengan cicilan nampilin:
- "Cicilan Rp X / bulan"
- "N dari T bulan · sisa K"
- mini progress bar tenor

### Debt Detail
Blok baru "Rencana Cicilan" dengan:
- nominal / bulan
- progress tenor
- mulai, cicilan berikut, lunas pada
- badge bunga % (kalau ada)
- simulasi "kalau bayar segini, lunas pada..."

### Debt Payment Modal
- Setelah payment sukses, tampilkan di preview:
  - Sisa utang
  - Progress % (principal)
  - Kalau `installment_plan` ada: tambah "Cicilan ke-N dari T" dan "Cicilan berikut: {tanggal}"

## Aturan side effect saat payment

```
payment.amount >= installment.monthly_amount  →  paid_installments += 1
debt.status === 'paid'                         →  paid_installments = tenor_months
```

Pembayaran kurang dari cicilan dianggap pembayaran sebagian, tidak increment counter installment.

## Yang harus diperhatikan saat implementasi

1. **Date math**: `start_date + N bulan` di JS bisa overflow (31 Jan + 1 bulan → 3 Mar). Pakai helper `addMonths` yang clamp hari.
2. **Timezone**: simpan `start_date` sebagai ISO date (`YYYY-MM-DD`), bukan datetime, untuk konsistensi lintas zona.
3. **Interest rate**: di UI pakai "bunga total %" (mis. 5%) supaya user tidak bingung dengan eff vs nominal. Backend boleh pilih model bunga, asal deterministik.
4. **Soft delete**: cicilan ikut soft delete lewat parent `debt`.
5. **Audit**: tiap payment yang increment installment harus atomic dengan transaksi `DEBT_PAYMENT` yang sudah ada.
6. **Undo last payment**: kalau undo payment yang increment installment, decrement `paid_installments`. (Backend endpoint `POST /last-action/undo` butuh extend.)

## Yang saat ini sudah masuk UI

- `src/types/debt.ts` → `InstallmentPlan` dan `InstallmentSimulation`
- `src/core/lib/installment.ts` → `flatMonthly`, `flatWithInterest`, `effectiveMonthly`, `buildInstallmentPlan`, `incrementPaidInstallments`, `simulateInstallment`, `summarizeInstallment`, `installmentProgressLabel`, `shiftIsoMonth`
- `src/features/debts/screens/create-debt-screen.tsx` → toggle + field cicilan + preview
- `src/features/debts/screens/debts-screen.tsx` → handleInstallment, summary card komitmen cicilan
- `src/features/debts/components/debt-card.tsx` → ringkasan cicilan per card
- `src/features/debts/screens/debt-detail-screen.tsx` → blok Rencana Cicilan + simulasi

## Yang masih jadi target backend

- Tabel/JSONB column `installment_plan` di `debts` (atau tabel terpisah `debt_installment_plans`).
- Hitungan server-side (jangan andalkan UI untuk hitung ulang kalau data sudah di server).
- `POST /debts` + `POST /debts/{id}/payments` untuk handle plan.
- Extend `POST /last-action/undo` supaya bisa undo increment installment.

skipped: SQL migration detail belum ditulis.
add when: backend stack di-approve dan kontrak OpenAPI/zod siap.