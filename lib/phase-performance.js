// Presentation bands for an aggregate phase accuracy, not move annotations.
// Keep contextual labels (Brilliant, Great, Miss, Book) exclusive to moves.
export const PHASE_PERFORMANCE_BANDS = Object.freeze([
  {minimum: 90, category: 'excellent', mark: '✓'},
  {minimum: 80, category: 'good', mark: '✓'},
  {minimum: 65, category: 'inacc', mark: '?!'},
  {minimum: 50, category: 'mistake', mark: '?'},
  {minimum: 0, category: 'blunder', mark: '??'},
]);

export function phasePerformance(accuracy) {
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) return null;
  return PHASE_PERFORMANCE_BANDS.find(band => accuracy >= band.minimum);
}
