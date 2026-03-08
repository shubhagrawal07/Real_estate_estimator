/**
 * Reusable formatting helpers for the frontend.
 */

export function formatPrice(price: number | undefined, currency = 'USD'): string {
  if (price == null || Number.isNaN(price)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
