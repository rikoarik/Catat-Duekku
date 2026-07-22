/**
 * Helper tanggal lintas resource.
 *
 * Native Date doang. Aturan:
 * - semua ISO date string `YYYY-MM-DD` di-truncate ke midnight UTC biar math stabil.
 * - `daysUntil(targetIso, todayIso?)` → integer; negatif = lewat.
 * - tidak depend dayjs/luxon.
 */

const MS_PER_DAY = 86_400_000;

/** Tambah `months` bulan ke ISO date string `YYYY-MM-DD`. */
export function shiftIsoMonth(isoDate: string, months: number): string {
  const base = parseIsoDate(isoDate);
  if (!base) return isoDate;
  const targetMonth = base.getMonth() + months;
  const next = new Date(base);
  next.setMonth(targetMonth);
  // Hindari overflow (mis. 31 Jan + 1 bulan → 3 Mar di beberapa runtime)
  if (next.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    next.setDate(0);
  }
  return toIsoDate(next);
}

const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/** ISO date string `YYYY-MM-DD` untuk "hari ini" (lokal user). */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Convert Date → `YYYY-MM-DD` (lokal). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse ISO date string ke Date di midnight lokal. Return null kalau invalid. */
export function parseIsoDate(iso: string): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    const fallback = new Date(iso);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Selisih hari `from → to` (positif kalau `to` di masa depan). */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** `daysUntil(targetIso)` — wrapper yang pakai `todayIso()` sebagai `from`. */
export function daysUntil(targetIso: string | null | undefined): number | null {
  if (!targetIso) return null;
  return daysBetween(todayIso(), targetIso);
}

/** Batas bulan `YYYY-MM`: `{ start: 'YYYY-MM-01', end: 'YYYY-MM-LAST', daysInMonth }`. */
export function monthBounds(yearMonth: string): {
  start: string;
  end: string;
  daysInMonth: number;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) {
    const fallback = new Date();
    return {
      start: toIsoDate(new Date(fallback.getFullYear(), fallback.getMonth(), 1)),
      end: toIsoDate(new Date(fallback.getFullYear(), fallback.getMonth() + 1, 0)),
      daysInMonth: new Date(fallback.getFullYear(), fallback.getMonth() + 1, 0).getDate(),
    };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const last = new Date(year, month, 0);
  return {
    start: toIsoDate(new Date(year, month - 1, 1)),
    end: toIsoDate(last),
    daysInMonth: last.getDate(),
  };
}

/** `YYYY-MM` bulan ini (lokal). */
export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Progress bulan berjalan.
 * - `day`: hari ke- (1..daysInMonth)
 * - `days_in_month`
 * - `progress`: 0..1 (di-clamp)
 * - `days_left`: sisa hari sampai akhir bulan (>= 0)
 */
export function monthProgress(yearMonth?: string): {
  day: number;
  days_in_month: number;
  progress: number;
  days_left: number;
  start: string;
  end: string;
} {
  const ym = yearMonth ?? currentYearMonth();
  const bounds = monthBounds(ym);
  const today = todayIso();
  const elapsed = Math.max(0, daysBetween(bounds.start, today));
  const day = Math.min(elapsed + 1, bounds.daysInMonth);
  const progress = bounds.daysInMonth > 0 ? Math.min(day / bounds.daysInMonth, 1) : 0;
  const daysLeft = Math.max(0, daysBetween(today, bounds.end));
  return {
    day,
    days_in_month: bounds.daysInMonth,
    progress,
    days_left: daysLeft,
    start: bounds.start,
    end: bounds.end,
  };
}

/**
 * Teks jatuh tempo natural (Bahasa Indonesia).
 * - lewat 1 hari → "lewat 1 hari"
 * - lewat N hari → "lewat N hari"
 * - hari ini → "hari ini"
 * - besok → "besok"
 * - 3 hari lagi → "3 hari lagi"
 * - tanggal spesifik (>7 hari) → "dd MMM"
 * - null/iso invalid → ''
 */
export function dueLabel(targetIso: string | null | undefined): string {
  if (!targetIso) return '';
  const diff = daysUntil(targetIso);
  if (diff === null) return '';
  if (diff < 0) {
    const n = Math.abs(diff);
    return n === 1 ? 'lewat 1 hari' : `lewat ${n} hari`;
  }
  if (diff === 0) return 'hari ini';
  if (diff === 1) return 'besok';
  if (diff <= 7) return `${diff} hari lagi`;
  const date = parseIsoDate(targetIso);
  if (!date) return '';
  return `${date.getDate()} ${MONTHS_ID[date.getMonth()]}`;
}

/** Tanggal bulanan berikutnya untuk due day 1..31. */
export function nextMonthlyDate(dayOfMonth: number, fromIso = todayIso()): string {
  const from = parseIsoDate(fromIso) ?? new Date();
  const day = Math.max(1, Math.min(31, Math.floor(dayOfMonth)));
  const candidate = new Date(from.getFullYear(), from.getMonth(), day);
  if (candidate.getTime() < from.getTime()) candidate.setMonth(candidate.getMonth() + 1);
  const lastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
  candidate.setDate(Math.min(day, lastDay));
  return toIsoDate(candidate);
}

/** Format ISO → "dd MMM yyyy" (Bahasa). */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = parseIsoDate(iso);
  if (!date) return '';
  return `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

/** Status jatuh tempo cicilan/utang. */
export type DueStatus = 'overdue' | 'due_soon' | 'active' | 'paid';

/** `due_soon` window default = 7 hari. Bisa dioverride. */
export function classifyDue(
  dueIso: string | null | undefined,
  isPaid: boolean,
  todayIsoOverride?: string,
  dueSoonWindowDays = 7,
): DueStatus {
  if (isPaid) return 'paid';
  if (!dueIso) return 'active';
  const diff = daysBetween(todayIsoOverride ?? todayIso(), dueIso);
  if (diff < 0) return 'overdue';
  if (diff <= dueSoonWindowDays) return 'due_soon';
  return 'active';
}

/**
 * Hitung bulan yang dibutuhkan untuk mencapai target tabungan tepat waktu.
 * Return 0 kalau lewat tanggal target atau sisa sudah 0.
 */
export function monthsUntil(targetIso: string | null | undefined): number {
  if (!targetIso) return 0;
  const target = parseIsoDate(targetIso);
  if (!target) return 0;
  const today = new Date();
  if (target.getFullYear() < today.getFullYear()) return 0;
  if (target.getFullYear() === today.getFullYear() && target.getMonth() <= today.getMonth()) return 0;
  return (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
}

/**
 * Nominal bulanan yang ideal supaya target tabungan tercapai tepat `targetDate`.
 * Return 0 kalau `monthsUntil = 0` atau `remaining = 0`.
 */
export function monthlyNeeded(remaining: number, targetIso: string | null | undefined): number {
  const months = monthsUntil(targetIso);
  if (months <= 0 || remaining <= 0) return 0;
  return Math.ceil(remaining / months);
}
