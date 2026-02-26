const MULTIPLE = 5000;

/**
 * Range width (as decimal): ≤250k → ±8%, 250k–500k → ±6%, >500k → ±5%.
 * Matches backend PropertyEstimateService.getRangeWidthPercent.
 */
export function getRangeWidthPercent(centerPrice: number): number {
  if (centerPrice <= 250_000) return 0.08;
  if (centerPrice <= 500_000) return 0.06;
  return 0.05;
}

/**
 * Returns min and max price range in multiples of 5000, based on saved estimatedPrice.
 * Uses tiered range width (same as backend) and rounds bounds to nearest 5000 (min down, max up).
 */
export function getPriceRangeIn5000(estimatedPrice: number): { min: number; max: number } {
  const width = getRangeWidthPercent(estimatedPrice);
  const rawMin = estimatedPrice * (1 - width);
  const rawMax = estimatedPrice * (1 + width);
  const min = Math.floor(rawMin / MULTIPLE) * MULTIPLE;
  const max = Math.ceil(rawMax / MULTIPLE) * MULTIPLE;
  return { min, max };
}
