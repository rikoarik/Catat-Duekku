/**
 * Cicilan (installment) math helpers.
 *
 * Aturan dari docs/INSTALLMENT-PLAN.md:
 * - Flat tanpa bunga: monthly_amount = ceil(remaining_amount / tenor_months)
 * - Flat dengan bunga: total_with_interest = total_amount * (1 + interest_rate/100)
 *                       monthly_amount = ceil(total_with_interest / tenor_months)
 * - months_left   = tenor_months - paid_installments
 * - payoff_date   = start_date + tenor_months (bulan)
 * - next_due_date = start_date + paid_installments * 1 month
 *
 * Semua nominal integer rupiah. Pembulatan ke atas (`Math.ceil`) supaya sisa tidak
 * nyangkut di bulan terakhir.
 */

import type { InstallmentPlan, DebtWithComputed, InstallmentSimulation } from '@/types/debt';
import { classifyDue, daysBetween, dueLabel, shiftIsoMonth, todayIso } from '@/core/lib/dates';
import type { DueStatus } from '@/core/lib/dates';

export { shiftIsoMonth, toIsoDate } from '@/core/lib/dates';

function addMonths(baseIso: string, months: number): string {
  return shiftIsoMonth(baseIso, months);
}

/** Hitung cicilan flat tanpa bunga. */
export function flatMonthly(remainingAmount: number, tenorMonths: number): number {
  if (tenorMonths <= 0) return remainingAmount;
  return Math.ceil(remainingAmount / tenorMonths);
}

/** Hitung cicilan flat dengan bunga flat (bunga = persen dari principal). */
export function flatWithInterest(
  remainingAmount: number,
  tenorMonths: number,
  interestRatePercent: number,
): { monthlyAmount: number; totalWithInterest: number } {
  const totalWithInterest = Math.ceil(remainingAmount * (1 + interestRatePercent / 100));
  return {
    monthlyAmount: tenorMonths > 0 ? Math.ceil(totalWithInterest / tenorMonths) : totalWithInterest,
    totalWithInterest,
  };
}

/** Hitung cicilan efektif per bulan (PMT-like). */
export function effectiveMonthly(
  remainingAmount: number,
  tenorMonths: number,
  annualInterestPercent: number,
): number {
  const r = annualInterestPercent / 100 / 12;
  if (r === 0) return flatMonthly(remainingAmount, tenorMonths);
  if (tenorMonths <= 0) return remainingAmount;
  const factor = Math.pow(1 + r, tenorMonths);
  const pmt = (remainingAmount * r * factor) / (factor - 1);
  return Math.ceil(pmt);
}

/** Bangun / refresh InstallmentPlan. */
export function buildInstallmentPlan(input: {
  totalAmount: number;
  tenorMonths: number;
  startDate: string;
  interestRate?: number;
  paidInstallments?: number;
  monthlyAmountOverride?: number;
}): InstallmentPlan {
  const tenor = Math.max(1, Math.floor(input.tenorMonths));
  const start = input.startDate;
  const paid = Math.max(0, Math.floor(input.paidInstallments ?? 0));
  const hasInterest = typeof input.interestRate === 'number' && input.interestRate > 0;
  const interestRate = input.interestRate ?? 0;

  let monthly = input.monthlyAmountOverride ?? 0;
  let totalWithInterest: number | undefined;
  if (!monthly) {
    if (hasInterest) {
      const result = flatWithInterest(input.totalAmount, tenor, interestRate);
      monthly = result.monthlyAmount;
      totalWithInterest = result.totalWithInterest;
    } else {
      monthly = flatMonthly(input.totalAmount, tenor);
    }
  }

  return {
    tenor_months: tenor,
    monthly_amount: monthly,
    interest_rate: hasInterest ? interestRate : undefined,
    start_date: start,
    paid_installments: Math.min(paid, tenor),
    months_left: Math.max(0, tenor - Math.min(paid, tenor)),
    projected_payoff_date: shiftIsoMonth(start, tenor),
    next_due_date: shiftIsoMonth(start, paid),
    total_with_interest: totalWithInterest,
  };
}

/** Tambah counter installment. Dipanggil tiap kali payment sukses. */
export function incrementPaidInstallments(plan: InstallmentPlan): InstallmentPlan {
  const nextPaid = Math.min(plan.paid_installments + 1, plan.tenor_months);
  return {
    ...plan,
    paid_installments: nextPaid,
    months_left: Math.max(0, plan.tenor_months - nextPaid),
    next_due_date: shiftIsoMonth(plan.start_date, nextPaid),
  };
}

/** Simulasi payoff date kalau user bayar amountPerMonth yang lain. */
export function simulateInstallment(
  remainingAmount: number,
  annualInterestPercent: number | undefined,
  amountPerMonth: number,
): InstallmentSimulation {
  const monthlyRate = (annualInterestPercent ?? 0) / 100 / 12;
  const principal = Math.max(0, remainingAmount);
  if (amountPerMonth <= 0) {
    return {
      amount_per_month: 0,
      months_to_payoff: 0,
      payoff_date: '',
      months_saved: 0,
    };
  }

  let balance = principal;
  let months = 0;
  // Cap iterasi supaya tidak loop selamanya kalau interest > payment.
  const safety = 1000;
  while (balance > 0 && months < safety) {
    months += 1;
    const interest = Math.round(balance * monthlyRate);
    const principalPart = Math.max(0, amountPerMonth - interest);
    balance = Math.max(0, balance - principalPart);
  }

  const payoffDate = addMonths(todayIso(), months);

  // months_saved vs flat-default tenor (best effort kalau tenor diketahui)
  const baselineMonths = monthlyRate > 0
    ? Math.ceil(principal / amountPerMonth)
    : Math.ceil(principal / amountPerMonth);
  const monthsSaved = Math.max(0, baselineMonths - months);

  return {
    amount_per_month: amountPerMonth,
    months_to_payoff: months,
    payoff_date: payoffDate,
    months_saved: monthsSaved,
  };
}

/** Ringkas data cicilan untuk widget Kelola dan kontrak API. */
export function summarizeInstallment(plan: InstallmentPlan | null | undefined) {
  if (!plan) return null;
  return {
    tenor_months: plan.tenor_months,
    paid_installments: plan.paid_installments,
    months_left: plan.months_left,
    monthly_amount: plan.monthly_amount,
    next_due_date: plan.next_due_date,
    projected_payoff_date: plan.projected_payoff_date,
    interest_rate: plan.interest_rate ?? 0,
  };
}

/** Status + label jatuh tempo untuk UI ringan. */
export function summarizeInstallmentDue(
  plan: InstallmentPlan | null | undefined,
  opts?: { today?: string; dueSoonWindowDays?: number },
): {
  status: DueStatus;
  days_until_due: number | null;
  due_label: string;
  next_due_date: string;
  projected_payoff_date: string;
} | null {
  if (!plan) return null;
  const today = opts?.today ?? todayIso();
  const isPaid = plan.months_left <= 0 || plan.paid_installments >= plan.tenor_months;
  return {
    status: classifyDue(plan.next_due_date, isPaid, today, opts?.dueSoonWindowDays ?? 7),
    days_until_due: isPaid ? 0 : daysBetween(today, plan.next_due_date),
    due_label: isPaid ? 'lunas' : dueLabel(plan.next_due_date),
    next_due_date: plan.next_due_date,
    projected_payoff_date: plan.projected_payoff_date,
  };
}

/** Teks pendek progress cicilan. */
export function installmentProgressLabel(plan: InstallmentPlan | null | undefined): string {
  if (!plan) return '';
  return `${plan.paid_installments} dari ${plan.tenor_months} bulan`;
}