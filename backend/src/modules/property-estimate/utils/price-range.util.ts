const MULTIPLE = 5000;

export function getRangeWidthPercent(centerPrice: number): number {
  if (centerPrice <= 250_000) return 0.08;
  if (centerPrice <= 500_000) return 0.06;
  return 0.05;
}

export function getPriceRangeIn5000(estimatedPrice: number): { min: number; max: number } {
  const width = getRangeWidthPercent(estimatedPrice);
  const rawMin = estimatedPrice * (1 - width);
  const rawMax = estimatedPrice * (1 + width);
  const min = Math.floor(rawMin / MULTIPLE) * MULTIPLE;
  const max = Math.ceil(rawMax / MULTIPLE) * MULTIPLE;
  return { min, max };
}
