/**
 * Debt/Utang domain types matching DATABASE.md schema
 */

export type DebtStatus = 'active' | 'paid';

export interface Debt {
  id: string;
  user_id: string;
  name: string; // "Utang ke Teman", "Pinjaman Bank"
  due_date: string; // ISO date string
  total_amount: number; // bigint in DB, number in TS (IDR rupiah)
  paid_amount: number; // bigint in DB, number in TS
  status: DebtStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface DebtPayment {
  debt_id: string;
  amount: number;
  account_id: string;
  notes?: string;
  occurred_at?: string; // Optional, defaults to now
}

export interface DebtSummary {
  total_debts: number; // Count of active debts
  total_amount: number; // Sum of all debt total_amount
  paid_amount: number; // Sum of all debt paid_amount
  remaining_amount: number; // total_amount - paid_amount
}

// Helper computed properties
export interface DebtWithComputed extends Debt {
  remaining_amount: number; // total_amount - paid_amount
  progress_percent: number; // (paid_amount / total_amount) * 100
  days_until_due: number; // Calculated from due_date
  is_overdue: boolean; // due_date < today && remaining > 0
}
