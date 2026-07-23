export function calculateDailyRatio(lunch: number, dinner: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, (lunch + dinner) / (total * 2)));
}

export function availabilityBackgroundColor(normalizedRatio: number): string {
  const safeRatio = Math.max(0, Math.min(1, normalizedRatio));
  const hue = Math.round(120 * safeRatio);
  return `hsl(${hue} 70% 91%)`;
}
