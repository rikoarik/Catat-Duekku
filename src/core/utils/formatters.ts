/**
 * Format currency amount to Indonesian Rupiah (Rp) per DESIGN.md Section 13.
 * Examples: Rp4.309.573, -Rp25.000, +Rp7.500.000
 */
export function formatCurrency(
  amount: number,
  showSignPrefix: boolean = false
): string {
  if (isNaN(amount)) return 'Rp0';

  const absFormatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  if (amount < 0) {
    return `-Rp${absFormatted}`;
  }
  if (amount > 0 && showSignPrefix) {
    return `+Rp${absFormatted}`;
  }
  return `Rp${absFormatted}`;
}

/**
 * Format date to Indonesian short format per DESIGN.md Section 13 (e.g., 21 Jul 2026)
 */
export function formatDate(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
