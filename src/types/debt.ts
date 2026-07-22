/**
 * Debt/Utang domain types matching DATABASE.md schema.
 *
 * Cicilan / installment plan ditambahkan sebagai sub-resource.
 * Kalau `installment_plan` null, utang diperlakukan sebagai pinjaman satu jatuh tempo (`due_date`).
 */

export type DebtStatus = 'active' | 'paid';

export interface Debt {
  id: string;
  user_id: string;
  name: string; // "Utang ke Teman", "Pinjaman Bank"
  due_date: string; // ISO date string (final deadline kalau tidak ada installment_plan)
  total_amount: number; // bigint in DB, number in TS (IDR rupiah)
  paid_amount: number; // bigint in DB, number in TS
  status: DebtStatus;
  notes?: string;
  // Cicilan — opsional. null untuk pinjaman satu jatuh tempo.
  installment_plan?: InstallmentPlan | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface InstallmentPlan {
  tenor_months: number;          // jumlah bulan total (>= 1)
  monthly_amount: number;         // nominal per bulan saat create (>= 1)
  interest_rate?: number;         // persen bunga, opsional. 0 / null = flat tanpa bunga
  start_date: string;             // ISO date — tanggal cicilan pertama
  paid_installments: number;      // increment tiap payment
  // computed:
  months_left: number;            // tenor - paid_installments (>= 0)
  projected_payoff_date: string;  // start_date + tenor_months
  next_due_date: string;          // start_date + paid_installments * 1 month
  total_with_interest?: number;   // total_amount * (1 + interest_rate/100) — kalau ada bunga
}

export interface DebtPayment {
  debt_id: string;
  amount: number;
  account_id: string;
  notes?: string;
  occurred_at?: string; // Optional, defaults to now
}

export interface DebtSummary {
  total_debts: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
}

// Helper computed properties
export interface DebtWithComputed extends Debt {
  remaining_amount: number;
  progress_percent: number;
  days_until_due: number;
  is_overdue: boolean;
}

// Hasil simulasi pembayaran (opsional V1, untuk tombol "kalau bayar segini")
export interface InstallmentSimulation {
  amount_per_month: number;
  months_to_payoff: number;
  payoff_date: string;
  months_saved: number;
}