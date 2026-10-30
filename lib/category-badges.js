// A common cap height, open counters and optical spacing keep the classical
// punctuation readable at 18–24px. Tapered ! stems stay distinct from their dots;
// paired question marks retain the same height with room between their bowls.
// The four nonclassical defaults are simple companions to ! and ?.
export const CATEGORY_SYMBOL_OPTIONS = Object.freeze(Object.fromEntries(Object.entries({
  brilliant: ['brilliant', 'comet', 'flame'],
  great: ['great', 'bolt', 'key', 'interesting', 'only'],
  best: ['star', 'crown', 'summit'],
  excellent: ['thumbSimple', 'thumbDetailed', 'doubleCheck', 'spark', 'diamond', 'laurel', 'medal'],
  good: ['check', 'leaf', 'anchor'],
  book: ['book', 'reference', 'scroll'],
  inacc: ['dubious', 'wave', 'offset'],
  mistake: ['mistake', 'drop', 'steps'],
  miss: ['miss', 'target', 'crossedBang', 'bypass', 'hourglass'],
  blunder: ['blunder', 'fracture', 'fallenKing'],
}).map(([category, symbols]) => [category, Object.freeze(symbols)])));

const dot = x => `<circle cx="${x}" cy="73" r="5.2" fill="#fff" stroke="none"/>`;
const bang = x => `<path fill="#fff" stroke="none" d="M${x - 4} 22H${x + 4}Q${x + 6} 22 ${x + 5.8} 24L${x + 4} 56.5Q${x + 3.9} 59 ${x + 1.5} 59H${x - 1.5}Q${x - 3.9} 59 ${x - 4} 56.5L${x - 5.8} 24Q${x - 6} 22 ${x - 4} 22Z"/>${dot(x)}`;
// Inter Bold's question body, normalized to 32 × 56; the shared round dot gives
// ? and ! the same baseline. Derived from the bundled SIL OFL Inter font.
const QUESTION_BODY = 'M10.26 38.52V37.67Q10.26 32.99 11 30.32Q11.74 27.65 13.15 26.06Q14.56 24.48 16.59 23.1Q18.82 21.51 20.33 19.64Q21.84 17.76 21.84 15.09Q21.84 13.18 21.03 11.79Q20.23 10.41 18.87 9.63Q17.51 8.85 15.84 8.85Q14.25 8.85 12.82 9.62Q11.4 10.39 10.5 11.9Q9.6 13.41 9.51 15.63H0Q0.08 10.35 2.24 6.89Q4.41 3.43 7.99 1.71Q11.57 0 15.87 0Q20.62 0 24.25 1.75Q27.88 3.5 29.94 6.8Q32 10.1 32 14.73Q32 19.4 30.01 22.52Q28.02 25.64 24.65 27.86Q22.75 29.13 21.51 30.39Q20.27 31.65 19.68 33.33Q19.1 35.02 19.1 37.67V38.52Z';
const question = (x, width = 32) => `<g fill="#fff" stroke="none" transform="translate(${x - width / 2} 22) scale(${width / 32} 1)"><path d="${QUESTION_BODY}"/></g>${dot(x - 1.28 * width / 32)}`;
const stroke = (content, width = 9) => `<g fill="none" stroke="#fff" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${content}</g>`;
export const CATEGORY_SYMBOLS = Object.freeze({
  brilliant: { name: '!! · Brilliant', svg: stroke(bang(35) + bang(65)) },
  great: { name: '! · Great', svg: stroke(bang(50)) },
  star: { name: 'Star', svg: '<path fill="#fff" d="M48.5 23Q50 20 51.5 23L59 38.5l17.8 2.6q3 .5.8 2.7L64.7 56.4l3.1 17.7q.5 3-2.2 1.6L50 65.5 34.4 75.7q-2.7 1.4-2.2-1.6l3.1-17.7-12.9-12.6q-2.2-2.2.8-2.7L41 38.5Z"/>' },
  // Both hand silhouettes share the notation's white artwork and
  // clear margins. Transparent cuff gaps work on any category's background.
  thumbSimple: { name: 'Thumb · Simple', svg: '<g fill="#fff"><rect x="21" y="47" width="11" height="29" rx="2.5"/><path d="m40 46 9-13c3-4 4-8 4-11 0-3 5-2 7 1 3 5 3 10 0 18h13c6 0 9 4 7 10l-7 20c-1 4-4 6-9 6H49c-4 0-7-2-10-4V49q0-2 1-3Z"/></g>' },
  thumbDetailed: { name: 'Thumb · Detailed', svg: '<g fill="#fff"><path fill-rule="evenodd" d="M22 46h8q2 0 2 2v26q0 2-2 2h-8q-2 0-2-2V48q0-2 2-2Zm6 23a2 2 0 1 0-4 0 2 2 0 1 0 4 0Z"/><path d="m39 46 9-12 3-11q1-4 5-2l3 2q4 3 1 9l-3 9h16q6 0 6 6 0 4-4 5H65v3h10q4 0 2 5-1 3-5 3h-8v3h8q2 0 0 5-1 4-7 5H48l-9-4Z"/></g>' },
  spark: { name: 'Four-point spark', svg: '<path fill="#fff" d="M50 22C54 41 59 46 78 50 59 54 54 59 50 78 46 59 41 54 22 50 41 46 46 41 50 22Z"/>' },
  doubleCheck: { name: 'Double check', svg: stroke('<path d="m22 50 13 14 24-28m-8 28 27-31"/>', 8.5) },
  check: { name: 'Check', svg: stroke('<path d="m28 50 15 15 30-32"/>', 9.5) },
  book: { name: 'Book', svg: '<g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M50 35C43 30 32 29 25 32V70C33 67 43 68 50 73 57 68 67 67 75 70V32C68 29 57 30 50 35Z M50 35V73"/></g>' },
  dubious: { name: '?! · Dubious', svg: stroke(question(40, 28) + bang(69), 8.5) },
  mistake: { name: '? · Mistake', svg: stroke(question(50)) },
  miss: { name: '× · Miss', svg: stroke('<path d="m33 33 34 34m0-34L33 67"/>') },
  blunder: { name: '?? · Blunder', svg: stroke(question(32, 28) + question(68, 28), 8.5) },
  interesting: { name: '!? · Interesting', svg: stroke(bang(31) + question(60, 28), 8.5) },
  only: { name: '□ · Only move', svg: stroke('<path d="M29 29H71V71H29Z"/>', 8.5) },
  diamond: { name: 'Diamond', svg: stroke('<path d="m50 24 26 26-26 26-26-26Z"/>', 8.5) },
  crossedBang: { name: 'Crossed exclamation', svg: stroke(bang(50) + '<path d="m28 71 44-44"/>', 8.5) },
  target: { name: 'Missed target', svg: stroke('<path d="M44 33a22 22 0 1 0 22 22M77 22 61 38m0-11v11h11"/><circle cx="44" cy="55" r="4.5" fill="#fff" stroke="none"/>', 7.5) },
  // Emblems: open counters, broad silhouettes and shared round terminals.
  comet: { name: 'Comet · Brilliant', svg: stroke('<path d="m27 51 20-20M27 72l22-22m-2 23 20-20"/><circle cx="63" cy="37" r="12" fill="#fff" stroke="none"/>', 7.5) },
  bolt: { name: 'Bolt · Great', svg: '<path fill="#fff" d="M54 23q1-2 3-2h7L55 43h16q4 0 1 4L45 78q-3 3-3-1l5-24H30q-4 0-2-3Z"/>' },
  crown: { name: 'Crown · Best', svg: '<path fill="#fff" d="m25 36 14 10 9-19q2-4 4 0l9 19 14-10q3-2 2 2l-9 25q-1 3-4 3H36q-3 0-4-3l-9-25q-1-4 2-2Z"/>' + stroke('<path d="M37 75h26"/>', 7) },
  laurel: { name: 'Laurel · Excellent', svg: stroke('<path d="M44 76C29 68 25 51 32 31m24 45c15-8 19-25 12-45"/>', 6.5) + '<g fill="#fff"><path d="M30 51C19 49 20 38 22 34 32 35 36 43 30 51ZM36 68C24 70 19 60 20 55 30 52 38 58 36 68ZM70 51C81 49 80 38 78 34 68 35 64 43 70 51ZM64 68C76 70 81 60 80 55 70 52 62 58 64 68Z"/></g>' },
  leaf: { name: 'Leaf · Good', svg: stroke('<path d="M29 70C16 39 40 23 74 26 75 57 59 81 29 70Zm0 0 29-28"/>', 7.5) },
  reference: { name: 'Reference · Book', svg: stroke('<path d="M33 27h39v46H33q-8 0-8-8V35q0-8 8-8Zm-8 38q0-8 8-8h39M47 27v20l8-5 8 5V27"/>', 6.5) },
  wave: { name: 'Wave · Inaccuracy', svg: stroke('<path d="M24 49C33 28 42 29 50 50s17 22 26 1"/>', 9) },
  drop: { name: 'Drop · Mistake', svg: stroke('<path d="M50 26v46M30 52l20 20 20-20"/>', 8.5) },
  bypass: { name: 'Bypass · Miss', svg: stroke('<path d="M25 70V45q0-13 14-13h34M61 20l12 12-12 12"/><circle cx="54" cy="64" r="8" fill="#fff" stroke="none"/>', 7.5) },
  fracture: { name: 'Fracture · Blunder', svg: '<path fill="#fff" d="M50 23 26 32v16q0 20 23 30l-6-18 13-12-11-9Zm10 3 14 6v16q0 20-22 30l3-16 11-13-11-11Z"/>' },
  // Tokens: compact pictograms with generous gaps and distinct outer contours.
  flame: { name: 'Flame · Brilliant', svg: '<path fill="#fff" fill-rule="evenodd" d="M53 21C56 35 73 40 73 55 73 69 62 78 49 78 36 78 26 68 26 56 26 44 34 35 41 30 40 43 44 45 47 46 55 40 55 30 53 21ZM49 52C40 61 39 66 43 70 47 75 57 71 57 65 57 60 53 57 49 52Z"/>' },
  key: { name: 'Key · Great', svg: stroke('<circle cx="39" cy="39" r="14"/><path d="m49 49 23 23M59 59l8-8m-1 15 8-8"/>', 7.5) },
  summit: { name: 'Summit · Best', svg: stroke('<path d="m25 73 25-47 25 47Zm14-26 11 8 8-7 9 9"/>', 7.5) },
  medal: { name: 'Medal · Excellent', svg: stroke('<circle cx="50" cy="40" r="16"/>', 7.5) + '<path fill="#fff" d="m37 55-6 22 12-6 6 6-1-18Zm26 0 6 22-12-6-6 6 1-18Z"/>' },
  anchor: { name: 'Anchor · Good', svg: stroke('<circle cx="50" cy="28" r="6"/><path d="M50 35v39M38 46h24M26 58c0 22 48 22 48 0M26 58l-3 11m3-11 11 3M74 58l3 11m-3-11-11 3"/>', 7) },
  scroll: { name: 'Scroll · Book', svg: stroke('<path d="M34 27h35q7 0 7 8v5H62v25q0 10-10 10H32q-8 0-8-8v-5h29M34 27q-8 0-8 9v26m36-22v-5q0-8 7-8M53 62v5q0 8-8 8M37 46h14"/>', 6.5) },
  offset: { name: 'Offset · Inaccuracy', svg: '<g fill="#fff"><rect x="26" y="32" width="33" height="10" rx="5"/><rect x="42" y="58" width="33" height="10" rx="5"/></g>' },
  steps: { name: 'Steps · Mistake', svg: stroke('<path d="M25 30h18v20h17v20h16"/>', 8.5) },
  hourglass: { name: 'Hourglass · Miss', svg: stroke('<path d="M31 25h38M31 75h38M36 25v8q0 8 14 17t14 17v8M64 25v8q0 8-14 17T36 67v8"/>', 7) + '<path fill="#fff" d="m42 68 8-10 8 10Z"/>' },
  fallenKing: { name: 'Fallen king · Blunder', svg: '<g transform="rotate(-38 50 50)">' + stroke('<path d="M50 22v16m-8-8h16"/>', 7.5) + '<path fill="#fff" d="M38 42h24l-5 13 7 14H36l7-14Z"/><rect x="33" y="74" width="34" height="7" rx="3.5" fill="#fff"/></g>' },
});

export function categoryBadgeSymbol(category, options = {}) {
  const selected = Object.hasOwn(options.badgeSymbols || {}, category) ? options.badgeSymbols[category] : null;
  const allowed = Object.hasOwn(CATEGORY_SYMBOL_OPTIONS, category) ? CATEGORY_SYMBOL_OPTIONS[category] : [];
  return allowed.includes(selected) ? selected : category === 'book' ? 'book' : 'numbers';
}

export function cleanBadgeSymbols(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.keys(CATEGORY_SYMBOL_OPTIONS)
    .filter(category => Object.hasOwn(value, category)
      && CATEGORY_SYMBOL_OPTIONS[category].includes(value[category])
      && !(category === 'book' && value[category] === 'book'))
    .map(category => [category, value[category]]));
}
