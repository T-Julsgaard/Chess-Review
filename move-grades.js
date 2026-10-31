import { CATEGORY_SYMBOLS, categoryBadgeSymbol } from './lib/category-badges.js';
import { ENAMEL_PALETTE, enamelBadgeDisc } from './lib/badge-enamel.js';

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
export const BADGE_APPEARANCES = Object.freeze({
  solid: 'Solid',
  'ink-mineral': 'Ink & mineral',
  enamel: 'Enamel',
});
const INK_MINERAL_COLORS = Object.freeze({
  brilliant: '#ab9bf1', great: '#80b1e4', best: '#65c6a5', excellent: '#7fc7bb',
  good: '#b0c496', book: '#c9b394', inacc: '#e5c478', mistake: '#e7a779',
  miss: '#d799b5', blunder: '#e78781',
});
const inkTint = (color, amount) => '#' + [0, 1, 2].map(i => {
  const base = [27, 37, 43][i];
  const channel = parseInt(color.slice(1 + i * 2, 3 + i * 2), 16);
  return Math.round(base + (channel - base) * amount).toString(16).padStart(2, '0');
}).join('');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const finite = n => typeof n === 'number' && Number.isFinite(n);

// Bundled, unmodified SIL OFL fonts. Only these trusted families enter SVG markup.
export const BADGE_FONTS = Object.freeze({
  spacemono: { name: 'Space Mono', family: 'Badge Space Mono, monospace', style: 'Monospace', file: 'spacemono.ttf' },
  original: { name: 'Original', family: 'Arial, Helvetica, sans-serif', style: 'Plain', file: null },
  inter: { name: 'Inter', family: 'Badge Inter, Arial, sans-serif', style: 'Minimal', file: 'inter.ttf' },
  manrope: { name: 'Manrope', family: 'Badge Manrope, Arial, sans-serif', style: 'Soft geometric', file: 'manrope.ttf' },
  sora: { name: 'Sora', family: 'Badge Sora, Arial, sans-serif', style: 'Modern geometric', file: 'sora.ttf' },
  spacegrotesk: { name: 'Space Grotesk', family: 'Badge Space Grotesk, Arial, sans-serif', style: 'Technical', file: 'spacegrotesk.ttf' },
  rajdhani: { name: 'Rajdhani', family: 'Badge Rajdhani, Arial, sans-serif', style: 'Technical condensed', file: 'rajdhani.ttf' },
  lato: { name: 'Lato', family: 'Badge Lato, Arial, sans-serif', style: 'Humanist', file: 'lato.ttf' },
  nunito: { name: 'Nunito', family: 'Badge Nunito, Arial, sans-serif', style: 'Rounded', file: 'nunito.ttf' },
  quicksand: { name: 'Quicksand', family: 'Badge Quicksand, Arial, sans-serif', style: 'Light geometric', file: 'quicksand.ttf' },
  oswald: { name: 'Oswald', family: 'Badge Oswald, Arial, sans-serif', style: 'Tall condensed', file: 'oswald.ttf' },
  barlowcondensed: { name: 'Barlow Condensed', family: 'Badge Barlow Condensed, Arial, sans-serif', style: 'Narrow', file: 'barlowcondensed.ttf' },
  firasans: { name: 'Fira Sans', family: 'Badge Fira Sans, Arial, sans-serif', style: 'Clear humanist', file: 'firasans.ttf' },
  firamono: { name: 'Fira Mono', family: 'Badge Fira Mono, monospace', style: 'Monospace', file: 'firamono.ttf' },
  lora: { name: 'Lora', family: 'Badge Lora, Arial, sans-serif', style: 'Traditional serif', file: 'lora.ttf' },
  bitter: { name: 'Bitter', family: 'Badge Bitter, Arial, sans-serif', style: 'Slab serif', file: 'bitter.ttf' },
  cabin: { name: 'Cabin', family: 'Badge Cabin, Arial, sans-serif', style: 'Friendly sans', file: 'cabin.ttf' },
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
export function gradeLabel(category, score, name, example = false, options = {}) {
  if (categoryBadgeSymbol(category, options) !== 'numbers') return name;
  if (category === 'book') return name;
  const cfg = MOVE_GRADE_CONFIG[category];
  if (example && cfg) return `${name}, score ${cfg.min === cfg.max ? cfg.min : `range ${cfg.min} to ${cfg.max}`}`;
  return `${name}, score ${finite(score) ? gradeText(score) : 'pending'}`;
}

// One vector renderer for every placement. All grades use one decimal and the
// same type size, including zero, ten and pending scores.
export function gradeSvg(category, score, name, example = false, options = {}) {
  const cfg = MOVE_GRADE_CONFIG[category];
  if (!cfg) return '';
  const label = escape(gradeLabel(category, score, name, example, options));
  const text = gradeText(example ? (cfg.min + cfg.max) / 2 : score, true);
  const size = 40;
  const font = Object.hasOwn(BADGE_FONTS, options.badgeFont) ? BADGE_FONTS[options.badgeFont] : BADGE_FONTS.spacemono;
  const mark = categoryBadgeSymbol(category, options);
  let symbol = mark !== 'numbers'
    ? `<g class="category-symbol" data-symbol="${mark}">${CATEGORY_SYMBOLS[mark].svg}</g>`
    : category === 'book' ? CATEGORY_SYMBOLS.book.svg
    : `<text class="grade-numeral" x="50" y="51" dy=".35em" text-anchor="middle" fill="#fff" font-family="${font.family}" font-size="${size}" font-weight="700" letter-spacing="-1.5">${text}</text>`;
  if (options.badgeAppearance === 'enamel') {
    symbol = symbol.replaceAll('#fff', ENAMEL_PALETTE[category].ink);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${label}">${enamelBadgeDisc(category)}${symbol}</svg>`;
  }
  if (options.badgeAppearance === 'ink-mineral') {
    const ink = INK_MINERAL_COLORS[category];
    symbol = symbol.replaceAll('#fff', ink);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${label}"><circle cx="50" cy="50" r="48.5" fill="${inkTint(ink, 0.13)}" stroke="${inkTint(ink, 0.48)}" stroke-width="2.5"/>${symbol}</svg>`;
  }
  // Keep category circles distinct from similarly colored board squares. The
  // two-unit edge fits inside the viewBox even at the smallest badge sizes.
  const edge = mark === 'numbers' ? '' : ' stroke="#10251c" stroke-opacity=".18" stroke-width="2"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${label}"><circle cx="50" cy="50" r="49" fill="${cfg.color}"${edge}/>${symbol}</svg>`;
}
