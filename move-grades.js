// Review grades describe a move within its annotation category. They are not
// position evaluations, win probabilities, game accuracy, or rating-model inputs.
export const MOVE_GRADE_CONFIG = Object.freeze({
  brilliant: { color: '#26c2a3', min: 10, max: 10 },
  great: { color: '#749bb8', min: 9.5, max: 9.9, criticalLossMax: 50 },
  best: { color: '#81b64c', min: 9, max: 9 },
  excellent: { color: '#81b64c', min: 7, max: 8.9, lossBand: ['zero', 'good'] },
  good: { color: '#95b776', min: 5, max: 6.9, lossBand: ['good', 'inacc'] },
  book: { color: '#a88865', min: null, max: null },
  inacc: { color: '#f7c531', min: 3, max: 4.9, lossBand: ['inacc', 'mistake'] },
  mistake: { color: '#f9a85a', min: 2, max: 2.9, lossBand: ['mistake', 'blunder'] },
  miss: { color: '#f5746a', min: 0, max: 4.9, opportunityDecay: 20, zeroLoss: 99 },
  blunder: { color: '#ee4a2f', min: 0, max: 1.9, lossBand: ['blunder', 'total'] },
});
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const finite = n => typeof n === 'number' && Number.isFinite(n);

// Bundled, unmodified SIL OFL fonts. Only these trusted families enter SVG markup.
export const BADGE_FONTS = Object.freeze({
  original: { name: 'Original', family: 'Arial, Helvetica, sans-serif', style: 'Classic', file: null },
  inter: { name: 'Inter', family: 'Badge Inter, Arial, sans-serif', style: 'Minimal', file: 'inter.ttf' },
  manrope: { name: 'Manrope', family: 'Badge Manrope, Arial, sans-serif', style: 'Soft geometric', file: 'manrope.ttf' },
  sora: { name: 'Sora', family: 'Badge Sora, Arial, sans-serif', style: 'Modern geometric', file: 'sora.ttf' },
  spacegrotesk: { name: 'Space Grotesk', family: 'Badge Space Grotesk, Arial, sans-serif', style: 'Technical', file: 'spacegrotesk.ttf' },
  rajdhani: { name: 'Rajdhani', family: 'Badge Rajdhani, Arial, sans-serif', style: 'Technical condensed', file: 'rajdhani.ttf' },
  spacemono: { name: 'Space Mono', family: 'Badge Space Mono, monospace', style: 'Monospace', file: 'spacemono.ttf' },
});

export function moveGrade(category, loss, thresholds = {}, criticalLoss = null) {
  const cfg = MOVE_GRADE_CONFIG[category];
  if (!cfg || category === 'book' || !finite(loss)) return null;
  const bands = { zero: 0, good: 2, inacc: 5, mistake: 10, blunder: 20, total: 100, ...thresholds };
  let grade;
  if (cfg.min === cfg.max) grade = cfg.min;
  else if (category === 'great') {
    // The gap to the runner-up is already required by the Great classifier.
    const t = clamp(((finite(criticalLoss) ? criticalLoss : bands.inacc) - bands.inacc)
      / Math.max(1, cfg.criticalLossMax - bands.inacc), 0, 1);
    grade = cfg.min + (cfg.max - cfg.min) * t;
  } else if (category === 'miss') {
    // Miss is contextual, so it shares scores with error categories. Penalise the
    // opportunity actually lost, not the fact that the opponent erred first.
    grade = cfg.max * Math.exp(-Math.max(0, loss) / cfg.opportunityDecay);
    if (loss >= cfg.zeroLoss) grade = 0;
  } else {
    const [from, to] = cfg.lossBand.map(k => bands[k]);
    const t = clamp((Math.max(0, loss) - from) / Math.max(0.001, to - from), 0, 1);
    grade = cfg.max - t * (cfg.max - cfg.min);
  }
  return clamp(Math.round(grade * 10) / 10, cfg.min, cfg.max);
}

export function gradeText(score, fixedDecimals = false) {
  if (!finite(score)) return '—';
  const rounded = Math.round(score * 10) / 10;
  return fixedDecimals ? rounded.toFixed(1) : String(rounded);
}

const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
export function gradeLabel(category, score, name, example = false) {
  if (category === 'book') return name;
  const cfg = MOVE_GRADE_CONFIG[category];
  if (example && cfg) return `${name}, score ${cfg.min === cfg.max ? cfg.min : `range ${cfg.min} to ${cfg.max}`}`;
  return `${name}, score ${finite(score) ? gradeText(score) : 'pending'}`;
}

// One vector renderer for every placement. Optical centring uses the numeral's
// cap height; decimal figures are slightly narrower, without shrinking the badge.
export function gradeSvg(category, score, name, example = false, options = {}) {
  const cfg = MOVE_GRADE_CONFIG[category];
  if (!cfg) return '';
  const label = escape(gradeLabel(category, score, name, example));
  const text = gradeText(example ? (cfg.min + cfg.max) / 2 : score, options.badgeDecimals);
  // Fixed mode uses the same type size for every grade, including 0.0 and 10.0.
  const size = options.badgeDecimals ? 40 : text.includes('.') ? 43 : text.length > 1 ? 53 : 62;
  const font = Object.hasOwn(BADGE_FONTS, options.badgeFont) ? BADGE_FONTS[options.badgeFont] : BADGE_FONTS.original;
  const symbol = category === 'book'
    ? '<g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M50 35C43 30 32 29 25 32V70C33 67 43 68 50 73 57 68 67 67 75 70V32C68 29 57 30 50 35Z M50 35V73"/></g>'
    : `<text class="grade-numeral" x="50" y="51" dy=".35em" text-anchor="middle" fill="#fff" font-family="${font.family}" font-size="${size}" font-weight="700" letter-spacing="-1.5">${text}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${label}"><circle cx="50" cy="50" r="49" fill="${cfg.color}"/>${symbol}</svg>`;
}
