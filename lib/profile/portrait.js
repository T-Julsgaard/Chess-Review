// Player profile — the historical twin's face, assembled from chess pieces.
//
// Three styles, all drawn exclusively from pieces of the board's own set:
//  - 'assemble' (default): the actual pieces glide, turn and unfold into a small
//    collection of connected contours. Their silhouettes become the face.
//  - 'halftone': the face is drawn like ink on paper, with the black
//    army of the real piece set on the board's light colour. Each cell of a grid
//    aligned with the squares holds one piece, sized by how dark the photograph
//    is there, and ranked by it too: pawns in light shading, kings and queens in
//    the deepest shadow. The pieces move the way every position change in the
//    extension moves (glidePieces, slidePuzzlePieces): the same easing, the same
//    durations, straight routes. The board's black pieces glide to the nearest
//    face cell of their own kind, shrinking as they go; the white pieces, which
//    the face has no use for, leave through the nearest board edge; every other
//    piece of the face enters through the nearest edge, outside in. Leaving the
//    face plays the assembly backwards, so the board gets its pieces back.
//  - 'swarm': the board goes dark, its pieces dissolve into a swirling swarm
//    that settles outside-in into a tinted mosaic. About ten seconds.
// Drawn on a canvas inside the board overlay; the real piece set supplies the sprites.
import {PORTRAITS, PORTRAIT_SIZE} from './portraits.js';
import {nearestBoardEdge} from '../learning/piece-transition.js';
import {portraitContours, traceContours, sampleContour, SCULPT} from './portrait-contours.js';

export const hasPortrait = id => !!id && Object.hasOwn(PORTRAITS, id);
export const portraitCredit = id => hasPortrait(id) ? {credit: PORTRAITS[id].credit, source: PORTRAITS[id].source} : null;

/** Animation styles Settings can offer; the first is the default. */
export const PORTRAIT_STYLES = [{id: 'assemble', label: 'Assemble'}, {id: 'halftone', label: 'Mosaic'}, {id: 'swarm', label: 'Swarm'}];
/** The delay (ms) the caller should leave the board's position up before the portrait starts. */
export const PORTRAIT_DELAY = 1100;

const TYPES = ['p', 'n', 'b', 'r', 'q', 'k'];
const LEVELS = 16;
// Swarm timeline in milliseconds, from the moment the board's pieces start to dissolve.
export const TIMELINE = {burst: 1500, converge: [2600, 6000], fly: 2600, glow: [6400, 9000], sweep: [8200, 10200]};
export const PORTRAIT_DURATION = TIMELINE.sweep[1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Ink: near-black umber to warm ivory, on a darker plate.
const STOPS = [[0, [28, 22, 17]], [.3, [92, 66, 40]], [.62, [196, 150, 92]], [.85, [236, 205, 152]], [1, [255, 246, 228]]];

/**
 * The board's own motion, as glidePieces and slidePuzzlePieces use it. `move`
 * and `route` are [base, per square, cap] durations for a piece gliding
 * between squares and for a piece entering or leaving through an edge;
 * `stagger` spaces pieces leaving the board. `enter` is [first entry, spread]:
 * the face comes in outside in over that long. `plate` is how far the board's
 * light colour covers the squares under the face; `back` speeds up the way out.
 */
export const GLIDE = {ease: [.4, 0, .2, 1], move: [520, 34, 240], route: [680, 24, 220], stagger: [24, 192], enter: [160, 1500], jitter: 90, plate: .9, back: 1.6};
/** Every piece fills this much of its square, like the board's pieces. */
export const PIECE_FILL = .94;
export const PIECE_CODES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
/**
 * The face, as a halftone. `cell` is the target size of a face cell in CSS
 * pixels (the grid takes 4 to 6 cells per square); `sharpen` is an unsharp mask
 * that keeps eyes, brows and mouth on that grid; `equalize` spreads each
 * photograph's tones; shadow below `floor` stays empty board, and a piece grows
 * with the square root of the shadow up to `max` cells (so its ink, its area,
 * follows the shadow), and is left out when it would be smaller than `min`.
 */
export const FACE = {cell: 13, sharpen: 1, equalize: .5, floor: .12, min: .28, max: 1.25};
/** Light shading to deep shadow: pawn, bishop, knight, rook, queen, king. */
export const SHADE_RANKS = ['P', 'B', 'N', 'R', 'Q', 'K'];
/** Grid size for a board `width` CSS pixels wide: whole cells per square, so the face lines up with the squares. */
export const faceGrid = width => 8 * Math.max(4, Math.min(6, Math.round(width / 8 / FACE.cell) || 5));
export function inkColor(t) {
  t = Math.max(0, Math.min(1, t));
  let i = 1; while (i < STOPS.length - 1 && STOPS[i][0] < t) i++;
  const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], k = (t - a) / (b - a || 1);
  return ca.map((c, j) => Math.round(c + (cb[j] - c) * k));
}

/** The portrait's tone map, 0..1, sampled on an n×n grid (box filter). */
export function portraitTones(id, n) {
  const raw = PORTRAITS[id]?.data;
  if (!raw) return null;
  const bin = typeof atob === 'function' ? atob(raw) : Buffer.from(raw, 'base64').toString('binary');
  const size = PORTRAIT_SIZE, src = new Float32Array(size * size);
  for (let i = 0; i < src.length; i++) src[i] = bin.charCodeAt(i) / 255;
  const out = new Float32Array(n * n), step = size / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const x0 = x * step, x1 = x0 + step, y0 = y * step, y1 = y0 + step;
    let sum = 0, weight = 0;
    for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
      const w = (Math.min(x1, sx + 1) - Math.max(x0, sx)) * (Math.min(y1, sy + 1) - Math.max(y0, sy));
      if (w > 0) { sum += w * src[Math.min(size - 1, sy) * size + Math.min(size - 1, sx)]; weight += w; }
    }
    const t = weight ? sum / weight : 0, c = clamp01((t - .06) / .86);
    // S-curve: shadows recede into the plate, highlights carry the face.
    out[y * n + x] = c * c * (3 - 2 * c) * .6 + Math.pow(c, 1.35) * .4;
  }
  return out;
}

/** Deterministic pseudo-random numbers, so a replay looks the same. */
function random(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const smooth = p => p * p * (3 - 2 * p);

/** A CSS cubic-bezier() timing function. */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return p => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - p, d = dX(t);
      if (Math.abs(e) < 1e-7) return Y(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
      if (t < 0 || t > 1) break;
    }
    let lo = 0, hi = 1; t = p;
    for (let i = 0; i < 40; i++) { const x = X(t); if (Math.abs(x - p) < 1e-7) break; if (x < p) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
/** The board's glide easing. */
export const glideEase = cubicBezier(...GLIDE.ease);
const route = ([base, per, cap], distance) => base + Math.min(distance * per, cap);

/**
 * Plan the 'halftone' (Mosaic) style on an n×n grid (n a multiple of 8, so the cells
 * line up with the squares). Positions and sizes are in squares (0..8, display
 * order, like the board). `sources` are the board's pieces ({code, x, y, size}).
 * Pure: returns {cells, leaves, k, size, landed, duration}, where `size` is the
 * largest face piece and every cell and leave has
 * {kind: 'move' | 'enter' | 'leave', code, from, to, sizeFrom, sizeTo, start, dur}.
 */
export function planFace(tones, n, {sources = [], seed = 7, sharpen = FACE.sharpen, equalize = FACE.equalize} = {}) {
  const rnd = random(seed), k = n / 8, count = n * n, size = FACE.max / k;
  if (sharpen > 0) {
    const at = (x, y) => tones[Math.min(n - 1, Math.max(0, y)) * n + Math.min(n - 1, Math.max(0, x))];
    tones = Float32Array.from(tones, (t, i) => {
      const x = i % n, y = (i - x) / n;
      let blur = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blur += at(x + dx, y + dy) * (dx ? 1 : 2) * (dy ? 1 : 2);
      return clamp01(t + (t - blur / 16) * sharpen);
    });
  }
  if (equalize > 0) {
    const sorted = Float32Array.from(tones).sort();
    const rank = t => { let a = 0, b = count; while (a < b) { const m = (a + b) >> 1; if (sorted[m] < t) a = m + 1; else b = m; } return a / count; };
    tones = Float32Array.from(tones, t => t * (1 - equalize) + rank(t) * equalize);
  }
  // A black piece per cell, as big as the shadow is deep, ranked by it too.
  const cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const shade = 1 - tones[y * n + x], ink = clamp01((shade - FACE.floor) / (1 - FACE.floor)), grow = FACE.max * Math.sqrt(ink);
    if (grow < FACE.min) continue;
    // Ranked over the drawn range: pawns in the lightest shading, kings in the deepest shadow.
    const lowest = (FACE.min / FACE.max) ** 2, rank = SHADE_RANKS[Math.min(SHADE_RANKS.length - 1, Math.floor((ink - lowest) / (1 - lowest) * SHADE_RANKS.length))];
    cells.push({gx: x, gy: y, x: (x + .5) / k, y: (y + .5) / k, code: 'b' + rank, shade, grow: grow / k});
  }
  for (const c of cells) Object.assign(c, {kind: 'enter', to: {x: c.x, y: c.y}, sizeFrom: c.grow, sizeTo: c.grow, source: -1});
  // The board's pieces glide to the nearest cell of their own kind, nearest pairs first, as in pairPieces.
  const pairs = [];
  sources.forEach((s, a) => { if (s.code) cells.forEach((c, b) => { if (c.code === s.code) pairs.push([Math.hypot(s.x - c.x, s.y - c.y), a, b]); }); });
  pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
  const paired = new Set(), taken = new Set();
  for (const [d, a, b] of pairs) {
    if (paired.has(a) || taken.has(b)) continue;
    paired.add(a); taken.add(b);
    const s = sources[a], c = cells[b];
    Object.assign(c, {kind: 'move', source: a, from: {x: s.x, y: s.y}, sizeFrom: s.size || PIECE_FILL, start: 0, dur: route(GLIDE.move, d)});
  }
  // The rest of the board's pieces leave through the nearest edge.
  const leaves = [];
  sources.forEach((s, a) => {
    if (paired.has(a)) return;
    const from = {x: s.x, y: s.y}, to = nearestBoardEdge(from), stagger = Math.min(leaves.length * GLIDE.stagger[0], GLIDE.stagger[1]);
    leaves.push({kind: 'leave', code: s.code || '', source: a, from, to, sizeFrom: s.size || PIECE_FILL, sizeTo: s.size || PIECE_FILL, start: stagger, dur: route(GLIDE.route, Math.hypot(to.x - from.x, to.y - from.y))});
  });
  // Everything else enters through the nearest edge: cells nearer the edge first, the middle of the face last.
  const entering = cells.filter(c => c.kind === 'enter');
  const depth = c => Math.min(c.x, 8 - c.x, c.y, 8 - c.y);
  const near = Math.min(...entering.map(depth)), far = Math.max(...entering.map(depth));
  for (const c of entering) {
    c.from = nearestBoardEdge(c);
    c.start = GLIDE.enter[0] + GLIDE.enter[1] * (far > near ? (depth(c) - near) / (far - near) : 0) + GLIDE.jitter * rnd();
    c.dur = route(GLIDE.route, Math.hypot(c.x - c.from.x, c.y - c.from.y));
  }
  const landed = Math.max(0, ...cells.map(c => c.start + c.dur), ...leaves.map(l => l.start + l.dur));
  return {cells, leaves, k, size, landed, duration: landed + 120};
}

/** One continuous material shape per piece. All of the position's pieces take
 * part; only the remaining contours need pieces from outside the board. */
export function planSculpture(tones, n, {sources = [], seed = 7} = {}) {
  const cells = portraitContours(tones, n, {minShapes: sources.length}), rnd = random(seed);
  const pairs = [];
  sources.forEach((s, a) => cells.forEach((c, b) => {
    const colour = s.code?.[0] === 'w' ? 1 : 0;
    pairs.push([Math.hypot(s.x - c.x, s.y - c.y) + Math.abs(c.tone - colour) * 1.4, a, b]);
  }));
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const paired = new Set(), taken = new Set();
  for (const [, a, b] of pairs) {
    if (paired.has(a) || taken.has(b)) continue;
    paired.add(a); taken.add(b);
    const c = cells[b], s = sources[a];
    Object.assign(c, {kind: 'move', source: a, code: s.code, from: {x: s.x, y: s.y}, sizeFrom: s.size || PIECE_FILL,
      start: Math.min(a * GLIDE.stagger[0], GLIDE.stagger[1]) + c.level * 65});
  }
  for (const c of cells) {
    if (!c.kind) {
      const depth = Math.min(c.x, 8 - c.x, c.y, 8 - c.y) / 4;
      Object.assign(c, {kind: 'enter', source: -1, code: (c.tone > .5 ? 'w' : 'b') + SHADE_RANKS[Math.min(5, Math.floor(rnd() * 6))],
        from: nearestBoardEdge(c), sizeFrom: PIECE_FILL * (.72 + rnd() * .22),
        start: GLIDE.enter[0] + SCULPT.spread * (.55 * depth + .45 * c.level / (SCULPT.levels - 1)) + rnd() * GLIDE.jitter});
    }
    c.to = {x: c.x, y: c.y}; c.sizeTo = c.sizeFrom;
    c.dur = route(c.kind === 'move' ? GLIDE.move : GLIDE.route, Math.hypot(c.x - c.from.x, c.y - c.from.y));
    c.turn = (rnd() > .5 ? 1 : -1) * (.35 + rnd() * 1.3);
    c.end = c.start + Math.max(c.dur, 130 + SCULPT.morph);
  }
  const landed = Math.max(0, ...cells.map(c => c.end));
  return {cells, leaves: [], size: PIECE_FILL, landed, duration: landed + 120};
}

/** Translation keeps the board's exact glide. The silhouette unfolds a little
 * later, allowing the original chess piece to remain readable on its journey. */
export function sculptureState(item, ms) {
  const state = faceState(item, ms);
  const morph = glideEase(clamp01((ms - item.start - 130) / SCULPT.morph));
  return {...state, morph, moving: state.moving || (morph > 0 && morph < 1)};
}

/** Where a planned piece is at `ms`: position and size in squares, progress, and whether it is drawn. */
export function faceState(item, ms) {
  const p = clamp01((ms - item.start) / item.dur), e = glideEase(p);
  return {
    x: item.from.x + (item.to.x - item.from.x) * e, y: item.from.y + (item.to.y - item.from.y) * e,
    size: item.sizeFrom + (item.sizeTo - item.sizeFrom) * e, p,
    // Face pieces wait off the board until they set off; the board's pieces are there from the start.
    visible: item.kind !== 'enter' || ms >= item.start,
    moving: p > 0 && p < 1,
  };
}

/** How opaque the plate that evens out the squares is at `ms`. */
export const plateAt = (ms, landed) => GLIDE.plate * smooth(clamp01((ms - 120) / Math.max(1, landed * .7 - 120)));

/**
 * Plan every mosaic cell of the 'swarm' style: target, tone, piece rank, size,
 * where it comes from and when it lands. Pure, so tests can check the choreography.
 */
export function planMosaic(tones, n, {sources = [], seed = 7} = {}) {
  const rnd = random(seed), cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const t = tones[y * n + x];
    const cx = (x + .5) / n, cy = (y + .5) / n;
    // Outer cells first, the face (centre, slightly high) last.
    const dist = Math.min(1, Math.hypot((cx - .5) / .5, (cy - .45) / .55));
    const order = clamp01(.62 * (1 - dist) + .38 * rnd());
    const source = sources.length ? sources[Math.floor(rnd() * sources.length)] : null;
    const angle = rnd() * Math.PI * 2;
    // The swirl is a three-armed galaxy; the inner pieces turn faster, winding the arms.
    const radius = .06 + .42 * Math.pow(rnd(), .75), arm = Math.floor(rnd() * 3);
    const spread = (rnd() + rnd() - 1) * (.55 + .5 * radius);
    cells.push({
      x: cx, y: cy, t,
      // Mostly pawns in the shadows, majors in the light, with some mixing for texture.
      rank: clamp01(.12 + .72 * t + ((BAYER[(y % 4) * 4 + (x % 4)] + .5) / 16 - .5) * .55),
      level: Math.round(clamp01(t) * (LEVELS - 1)),
      size: .38 + .92 * Math.pow(t, 1.1),
      // Where the piece is born: one of the board's pieces, or just outside the board.
      from: source ? {x: source.x + (rnd() - .5) * source.w * .6, y: source.y + (rnd() - .5) * source.h * .6}
        : {x: .5 + Math.cos(angle) * .78, y: .5 + Math.sin(angle) * .78},
      emit: rnd() * 650,
      orbit: {angle: arm * Math.PI * 2 / 3 + radius * 6.5 + spread, radius, speed: .5 / (.3 + radius * 2.2), wobble: rnd() * Math.PI * 2},
      spin: (rnd() - .5) * 7,
      land: TIMELINE.converge[0] + (TIMELINE.converge[1] - TIMELINE.converge[0]) * order,
    });
  }
  return cells;
}

/** Where a swarm cell is, how big, turned how far and how settled it is, at `ms`. */
export function cellState(cell, ms) {
  const {orbit} = cell;
  const a = orbit.angle + orbit.speed * ms / 1000;
  const r = orbit.radius * (1 + .08 * Math.sin(ms / 900 + orbit.wobble));
  let x = .5 + Math.cos(a) * r, y = .5 + Math.sin(a) * r * .92;
  // Bursting out of the board's pieces into the swirl.
  const born = clamp01((ms - cell.emit) / (TIMELINE.burst - 400));
  if (born < 1) { const e = easeOut(born); x = cell.from.x + (x - cell.from.x) * e; y = cell.from.y + (y - cell.from.y) * e; }
  const p = clamp01((ms - cell.land) / TIMELINE.fly), e = easeInOut(p);
  if (p > 0) {
    // Curl in along an arc that straightens as the piece arrives.
    const curl = Math.sin(Math.PI * e) * .9, dx = (x - cell.x) * (1 - e), dy = (y - cell.y) * (1 - e);
    x = cell.x + dx * Math.cos(curl) - dy * Math.sin(curl);
    y = cell.y + dx * Math.sin(curl) + dy * Math.cos(curl);
  }
  return {x, y, settle: e, visible: ms >= cell.emit, scale: (.35 + .65 * easeOut(born)) * (.78 + (cell.size - .78) * e), turn: cell.spin * (ms / 1000) * (1 - e)};
}

const INERT = () => ({revealed: false, replay() {}, dismiss: () => Promise.resolve(), cancel() {}});
const decoded = img => (img.decode ? img.decode() : Promise.resolve()).then(() => img, () => img);
const drawable = img => !!img && !!(img.naturalWidth || img.width);
const luma = ([r, g, b]) => (.2126 * r + .7152 * g + .0722 * b) / 255;

/** 'rgb(…)', 'rgba(…)' or 'color(srgb …)' as [r, g, b] 0..255; null when transparent or unknown. */
export function parseColor(text) {
  const s = String(text || '').trim();
  let m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (m) {
    const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (v.length < 3 || v.slice(0, 3).some(Number.isNaN) || (v.length > 3 && !(v[3] > 0))) return null;
    return v.slice(0, 3).map(Math.round);
  }
  m = /^color\(srgb\s+([^)]+)\)$/i.exec(s);
  if (m) {
    const v = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
    if (v.length < 3 || v.slice(0, 3).some(Number.isNaN) || (v.length > 3 && !(v[3] > 0))) return null;
    return v.slice(0, 3).map(c => Math.round(clamp01(c) * 255));
  }
  return null;
}

/** 'wP' style code of a board piece image: its data-piece, or the file name of its picture. */
function pieceCode(img) {
  const raw = img.dataset?.piece || (/([wb][pnbrqk])\.[a-z]+(?:[?#].*)?$/i.exec(img.getAttribute?.('src') || '') || [])[1] || '';
  return /^[wb][pnbrqk]$/i.test(raw) ? raw[0].toLowerCase() + raw[1].toUpperCase() : '';
}

/**
 * Mount the portrait in `overlay` over `board`. Returns {replay, dismiss, cancel}.
 * `delay` is how long the board's own position stays before the portrait starts
 * (PORTRAIT_DELAY suits 'assemble'); `pieces` selects the board's piece images
 * the portrait is made from; `style` is one of PORTRAIT_STYLES.
 */
export function createPortrait(options) {
  if (!hasPortrait(options.id)) return INERT();
  return options.style === 'swarm' ? createSwarm(options) : createAssemble({...options, sculpt: options.style !== 'halftone'});
}

function createAssemble({board, overlay, id, makePiece, motion = () => true, win = board.ownerDocument.defaultView, delay = 1200, label = 'Portrait made of chess pieces', pieces = '.profile-piece', onReveal = null, sculpt = true}) {
  const doc = board.ownerDocument, animated = motion();
  const canvas = doc.createElement('canvas'), ctx = canvas.getContext?.('2d');
  // Without a 2D canvas (tests, odd embedders) the board simply keeps its position.
  if (!ctx) return INERT();
  overlay.classList.add('profile-portrait', 'profile-portrait-assemble');
  overlay.setAttribute('role', 'img'); overlay.setAttribute('aria-label', label);
  const plate = doc.createElement('div'); plate.className = 'profile-portrait-plate';
  plate.style.boxShadow = 'none'; plate.style.opacity = '0';
  canvas.className = 'profile-portrait-pieces';
  overlay.replaceChildren(plate, canvas);
  let plan = null, sprites = null, loaded = null, width = 0, height = 0, ratio = 1;
  let frame = 0, timer = 0, at = 0, closed = false, revealed = false, shown = false, pending = null;
  // The board's own piece images, hidden while the canvas carries them.
  let held = [];
  let paper = [242, 237, 226], ground = [21, 23, 25];
  const stateAt = sculpt ? sculptureState : faceState;

  const images = Promise.all(PIECE_CODES.map(code => decoded(makePiece(code[1].toLowerCase(), code[0]))));

  function measure() {
    const rect = overlay.getBoundingClientRect();
    width = overlay.offsetWidth || rect.width; height = overlay.offsetHeight || rect.height;
    const scale = width ? rect.width / width : 1;
    ratio = Math.min(2.5, Math.max(1, (win.devicePixelRatio || 1) * scale));
    if (width * ratio > 2400) ratio = 2400 / width;
    canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
  }
  const raster = (img, px) => {
    const c = doc.createElement('canvas'); c.width = c.height = px;
    if (drawable(img)) c.getContext('2d')?.drawImage(img, 0, 0, px, px);
    return c;
  };
  /** Each piece twice: at the largest face size and at full square size, in canvas pixels. */
  function buildSprites(imgs) {
    const square = canvas.width / 8, cell = {}, full = {};
    PIECE_CODES.forEach((code, i) => {
      cell[code] = raster(imgs[i], Math.max(6, Math.ceil(square * plan.size)));
      full[code] = raster(imgs[i], Math.max(8, Math.ceil(square * PIECE_FILL)));
    });
    const outlines = {};
    if (sculpt) for (const code of PIECE_CODES) {
      const c = raster(imgs[PIECE_CODES.indexOf(code)], 96), g = c.getContext('2d');
      try {
        const pixels = g.getImageData(0, 0, 96, 96).data;
        const mask = Uint8Array.from({length: 96 * 96}, (_, i) => pixels[i * 4 + 3] > 80 ? 1 : 0);
        const ring = traceContours(mask, 96).filter(r => r.area > 0).sort((a, b) => b.area - a.area)[0];
        if (ring) outlines[code] = ring.points.map(p => ({x: p.x / 96 - .5, y: p.y / 96 - .5}));
      } catch { /* Some embedders disallow reading their piece images; keep their sprites. */ }
    }
    return {cell, full, outlines};
  }
  /** The plate: the board's light square colour, kept light enough to read as paper. */
  function plateColour() {
    const list = [...board.querySelectorAll(':scope > .sq')];
    const rgb = list.map(sq => parseColor(win.getComputedStyle(sq).backgroundColor)).filter(Boolean);
    const light = rgb.length ? rgb.reduce((a, b) => luma(b) > luma(a) ? b : a) : [240, 217, 181];
    const lift = clamp01((.8 - luma(light)) / .5);
    return light.map((c, j) => Math.round(c + ([244, 236, 220][j] - c) * lift));
  }
  /** The board's pieces, in squares. Centred on their own square, so a glide still finishing does not shift them. */
  function sources() {
    const b = board.getBoundingClientRect();
    if (!b.width || !b.height) return [];
    return [...board.querySelectorAll(pieces)].map(img => {
      const r = (img.parentElement?.matches?.('.sq') ? img.parentElement : img).getBoundingClientRect();
      const size = (img.offsetWidth || img.getBoundingClientRect().width) / (board.offsetWidth || b.width) * 8;
      return {img, code: pieceCode(img), x: (r.left + r.width / 2 - b.left) / b.width * 8, y: (r.top + r.height / 2 - b.top) / b.height * 8, size};
    }).filter(s => s.size > 0);
  }
  /** Hide the board's pieces while the canvas carries them, and give them back. */
  function hold(list) {
    release();
    held = list.map(s => s.img);
    for (const img of held) { img.dataset.portraitVisibility = img.style.visibility || ''; img.style.visibility = 'hidden'; }
  }
  function release() {
    for (const img of held) { img.style.visibility = img.dataset.portraitVisibility || ''; delete img.dataset.portraitVisibility; }
    held = [];
  }

  function drawItem(g, item, s, w, h) {
    // Face-sized pieces use the face raster, larger ones the full-square one; a piece of unknown kind is drawn from its own image.
    const sprite = item.code ? (s.size <= plan.size * 1.05 ? sprites.cell : sprites.full)[item.code] : held[item.source];
    if (!drawable(sprite)) return;
    const sx = w / 8, sy = h / 8, pw = s.size * sx, ph = s.size * sy;
    g.drawImage(sprite, s.x * sx - pw / 2, s.y * sy - ph / 2, pw, ph);
  }
  function prepareContours() {
    if (!sculpt) return;
    for (const c of plan.cells) {
      const outline = sprites.outlines[c.code];
      if (!outline) continue;
      c.silhouette = sampleContour(outline, c.rings[0].length);
    }
  }
  function drawSculpture(g, c, s, w, h) {
    if (!c.silhouette || !c.rings) { drawItem(g, c, s, w, h); return; }
    const m = s.morph, sx = w / 8, sy = h / 8, angle = c.turn * m;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    g.beginPath();
    for (let r = 0; r < c.rings.length; r++) {
      const ring = c.rings[r];
      for (let i = 0; i < ring.length; i++) {
        const p = r === 0 ? c.silhouette[i] : {x: 0, y: 0};
        const x = (p.x * cos - p.y * sin) * c.sizeFrom, y = (p.x * sin + p.y * cos) * c.sizeFrom;
        const px = (s.x + x * (1 - m) + (ring[i].x - c.x) * m) * sx;
        const py = (s.y + y * (1 - m) + (ring[i].y - c.y) * m) * sy;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    }
    // Material changes with the silhouette, never a photographic texture.
    const start = c.code?.[0] === 'w' ? paper : ground.map(v => v * .65);
    const target = ground.map((v, i) => v + (paper[i] - v) * c.tone);
    const ink = smooth(clamp01(m * 2.5));
    g.fillStyle = `rgb(${start.map((v, i) => Math.round(v + (target[i] - v) * ink)).join(',')})`;
    g.fill('evenodd');
    // Retain the chosen set's actual drawing until it begins to change shape.
    if (m < .16) {
      g.globalAlpha = 1 - smooth(m / .16);
      g.save(); g.translate(s.x * sx, s.y * sy); g.rotate(angle);
      drawItem(g, c, {...s, x: 0, y: 0}, w, h);
      g.restore(); g.globalAlpha = 1;
    }
  }
  /** Material contours in tone order, with still-readable pieces on top. The
   * Mosaic style draws settled pieces, then moving pieces, then the board's own. */
  function paint(g, ms, w, h) {
    if (sculpt) {
      const waiting = [];
      for (const c of plan.cells) {
        const s = stateAt(c, ms);
        if (!s.visible) continue;
        if (s.morph < .025) waiting.push([c, s]); else drawSculpture(g, c, s, w, h);
      }
      for (const [c, s] of waiting) drawSculpture(g, c, s, w, h);
      return;
    }
    const flying = [];
    for (const c of plan.cells) {
      const s = faceState(c, ms);
      if (!s.visible) continue;
      if (s.p < 1) flying.push([c, s]); else drawItem(g, c, s, w, h);
    }
    for (const pass of ['enter', 'move']) for (const [c, s] of flying) if (c.kind === pass) drawItem(g, c, s, w, h);
    for (const l of plan.leaves) { const s = faceState(l, ms); if (s.p < 1) drawItem(g, l, s, w, h); }
  }
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!plan || !sprites) return;
    plate.style.opacity = String(plateAt(at, plan.landed) * (sculpt ? 1 / GLIDE.plate : 1));
    paint(ctx, at, canvas.width, canvas.height);
  }
  function reveal() { if (!revealed) { revealed = true; onReveal?.(); } }
  const stop = () => { win.cancelAnimationFrame(frame); win.clearTimeout(timer); frame = 0; timer = 0; };

  /** Play the timeline from `from` to `to` (either way) at `speed`, then call `then`. */
  function run(from, to, speed, then = null) {
    stop();
    const t0 = win.performance.now(), span = Math.abs(to - from), dir = to >= from ? 1 : -1;
    const step = now => {
      if (closed) return;
      const t = Math.min(span, Math.max(0, now - t0) * speed);
      at = from + dir * t; render();
      if (dir > 0 && at >= plan.landed) reveal();
      if (t < span) frame = win.requestAnimationFrame(step);
      else { frame = 0; then?.(); }
    };
    // Draw at once, in the same frame the board's pieces are hidden.
    at = from; render();
    frame = win.requestAnimationFrame(step);
  }

  function begin() {
    if (closed) return;
    images.then(imgs => {
      if (closed) return;
      loaded = imgs;
      measure();
      const n = faceGrid(width), colour = plateColour(), found = sources();
      paper = colour.map((v, i) => Math.round(v * .2 + [245, 241, 233][i] * .8));
      ground = colour.map(v => Math.round(17 + v * .025));
      plate.style.background = `rgb(${(sculpt ? ground : colour).join(', ')})`;
      const seed = [...id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7);
      plan = sculpt ? planSculpture(portraitTones(id, PORTRAIT_SIZE), PORTRAIT_SIZE, {sources: found, seed})
        : planFace(portraitTones(id, n), n, {sources: found, seed});
      sprites = buildSprites(imgs);
      prepareContours();
      hold(found); shown = true;
      if (!animated) { at = plan.duration; render(); reveal(); return; }
      run(0, plan.duration, 1);
    });
  }

  /** Leaving for another view: the face's pieces slip out through the nearest edges while the next position comes in. */
  function exit() {
    if (!plan || !sprites || typeof win.requestAnimationFrame !== 'function') return;
    const ghost = doc.createElement('canvas'), g = ghost.getContext?.('2d');
    if (!g) return;
    ghost.width = canvas.width; ghost.height = canvas.height; ghost.setAttribute('aria-hidden', 'true');
    ghost.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
    const base = plateAt(at, plan.landed) * (sculpt ? 1 / GLIDE.plate : 1), colour = plate.style.background;
    const out = plan.cells.map(c => [c, stateAt(c, at)]).filter(([c, s]) => s.visible && !(c.kind === 'move' && s.p === 0)).map(([c, s]) => {
      const from = {x: s.x, y: s.y}, to = nearestBoardEdge(from);
      return {...c, kind: 'leave', from, to, sizeFrom: s.size, sizeTo: s.size, morphFrom: s.morph, depth: Math.min(s.x, 8 - s.x, s.y, 8 - s.y), dur: route(GLIDE.route, Math.hypot(to.x - from.x, to.y - from.y)) * .8};
    });
    if (!out.length) return;
    const deepest = Math.max(...out.map(o => o.depth)) || 1;
    for (const o of out) o.start = 260 * o.depth / deepest;
    const end = Math.max(...out.map(o => o.start + o.dur));
    if (win.getComputedStyle(board).position === 'static') return;
    board.append(ghost);
    const t0 = win.performance.now();
    let raf = 0;
    const done = () => { win.cancelAnimationFrame(raf); ghost.remove(); };
    const step = now => {
      const ms = now - t0;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ghost.width, ghost.height);
      g.globalAlpha = base * (1 - smooth(clamp01(ms / 420))); g.fillStyle = colour || 'transparent'; g.fillRect(0, 0, ghost.width, ghost.height);
      g.globalAlpha = 1;
      for (const o of out) {
        const s = faceState(o, ms);
        if (s.p < 1) {
          if (sculpt) drawSculpture(g, o, {...s, morph: o.morphFrom * (1 - glideEase(s.p))}, ghost.width, ghost.height);
          else drawItem(g, o, s, ghost.width, ghost.height);
        }
      }
      if (ms < end) raf = win.requestAnimationFrame(step); else done();
    };
    step(t0);
    win.setTimeout(done, end + 600);
  }

  // Keep it sharp if the board changes size. Measuring resets the canvas, so always draw again.
  const resize = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => {
    if (!plan || closed) return;
    const before = width;
    measure();
    if (Math.abs(before - width) >= 1 && loaded) sprites = buildSprites(loaded);
    render();
  }) : null;
  resize?.observe(overlay);

  if (animated) timer = win.setTimeout(begin, delay); else begin();

  const api = {
    get revealed() { return revealed; },
    /** Take the face apart again, back into the board's position, and assemble it once more. */
    replay() {
      if (closed || !plan || !animated) return;
      revealed = false;
      run(at, 0, GLIDE.back, () => { timer = win.setTimeout(() => run(0, plan.duration, 1), 280); });
    },
    /** Play the assembly backwards: the face leaves through the edges and the board's pieces glide home. */
    dismiss() {
      if (closed) return Promise.resolve();
      stop();
      if (!animated || !plan || !shown) { api.cancel(); return Promise.resolve(); }
      return new Promise(resolve => {
        pending = resolve;
        run(at, 0, GLIDE.back, () => { shown = false; api.cancel(); });
      });
    },
    cancel() {
      if (closed) return;
      if (animated && shown) exit();
      closed = true; stop(); resize?.disconnect(); release();
      overlay.classList.remove('profile-portrait', 'profile-portrait-assemble', 'profile-portrait-leaving');
      overlay.removeAttribute('role'); overlay.removeAttribute('aria-label');
      overlay.replaceChildren();
      const settle = pending; pending = null; settle?.();
    },
  };
  return api;
}

function createSwarm({board, overlay, id, makePiece, motion = () => true, win = board.ownerDocument.defaultView, delay = 1200, label = 'Portrait made of chess pieces', pieces = '.profile-piece', onReveal = null}) {
  const doc = board.ownerDocument;
  const animated = motion();
  const canvas = doc.createElement('canvas'), ctx = canvas.getContext?.('2d');
  if (!ctx) return INERT();
  overlay.classList.add('profile-portrait');
  overlay.setAttribute('role', 'img'); overlay.setAttribute('aria-label', label);
  const plate = doc.createElement('div'); plate.className = 'profile-portrait-plate';
  const glow = doc.createElement('canvas'); glow.className = 'profile-portrait-glow';
  canvas.className = 'profile-portrait-pieces';
  overlay.replaceChildren(plate, glow, canvas);
  let frame = 0, timer = 0, start = 0, cells = null, n = 0, sprites = null, still = null, width = 0, height = 0, ratio = 1, closed = false, revealed = false;
  const landed = TIMELINE.converge[1] + TIMELINE.fly, duration = PORTRAIT_DURATION;

  // Glow: the tone map itself, tinted and blurred, sitting under the pieces.
  function paintGlow() {
    const size = PORTRAIT_SIZE, tones = portraitTones(id, size);
    glow.width = size; glow.height = size;
    const g = glow.getContext('2d'); if (!g) return;
    const img = g.createImageData(size, size);
    tones.forEach((t, i) => { const [r, gg, b] = inkColor(t * .9); img.data.set([r, gg, b, Math.round(255 * Math.pow(t, 1.4))], i * 4); });
    g.putImageData(img, 0, 0);
  }

  const images = Promise.all(TYPES.map(type => decoded(makePiece(type, 'w'))));

  function measure() {
    const rect = overlay.getBoundingClientRect();
    width = overlay.offsetWidth || rect.width; height = overlay.offsetHeight || rect.height;
    const scale = width ? rect.width / width : 1;
    ratio = Math.min(2.5, Math.max(1, (win.devicePixelRatio || 1) * scale));
    if (width * ratio > 2400) ratio = 2400 / width;
    canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
  }
  /** One mosaic cell, in canvas pixels. */
  const pitch = () => Math.min(width, height) / n * ratio;

  /** Tinted sprites: per piece type and tone level, the piece's light parts take the ink colour. */
  function buildSprites(imgs) {
    const px = Math.max(8, Math.ceil(pitch() * 1.3));
    const make = (img, rgb) => {
      const c = doc.createElement('canvas'); c.width = c.height = px;
      const g = c.getContext('2d');
      const shape = () => { if (drawable(img)) g.drawImage(img, 0, 0, px, px); else { g.beginPath(); g.arc(px / 2, px / 2, px * .32, 0, Math.PI * 2); g.fill(); } };
      // Solid ink in the piece's silhouette, with its drawn lines kept faintly.
      g.fillStyle = '#fff'; shape();
      g.globalCompositeOperation = 'source-in'; g.fillStyle = `rgb(${rgb})`; g.fillRect(0, 0, px, px);
      g.globalCompositeOperation = 'multiply'; g.globalAlpha = .4; shape();
      g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; shape();
      return c;
    };
    // Rank the set's pieces by how much light they carry, so brighter cells get inkier pieces.
    const ink = imgs.map((img, i) => {
      const c = make(img, [255, 255, 255]);
      let sum = 0;
      try { const d = c.getContext('2d').getImageData(0, 0, px, px).data; for (let k = 0; k < d.length; k += 4) sum += d[k] * d[k + 3]; } catch { sum = i; }
      return {i, sum};
    }).sort((a, b) => a.sum - b.sum).map(r => r.i);
    const levels = ink.map(i => Array.from({length: LEVELS}, (_, L) => make(imgs[i], inkColor(L / (LEVELS - 1)))));
    const cloud = ink.map(i => make(imgs[i], inkColor(.8)));
    return {levels, cloud};
  }

  function drawPiece(sprite, x, y, scale, turn, alpha, g = ctx, w = canvas.width, h = canvas.height) {
    const size = pitch() * scale, cos = Math.cos(turn), sin = Math.sin(turn);
    g.globalAlpha = alpha;
    g.setTransform(cos, sin, -sin, cos, x * w, y * h);
    g.drawImage(sprite, -size / 2, -size / 2, size, size);
  }
  const typeOf = cell => Math.min(TYPES.length - 1, Math.floor(cell.rank * TYPES.length));

  function draw(ms) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!sprites) return;
    if (ms >= landed && still) { ctx.drawImage(still, 0, 0); return sweep(ms); }
    for (const cell of cells) {
      const s = cellState(cell, ms);
      if (!s.visible) continue;
      const type = typeOf(cell);
      if (s.settle < 1) drawPiece(sprites.cloud[type], s.x, s.y, s.scale, s.turn, 1 - smooth(s.settle));
      if (s.settle > 0) drawPiece(sprites.levels[type][cell.level], s.x, s.y, s.scale, s.turn, smooth(s.settle));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  }
  function renderStill() {
    still = doc.createElement('canvas'); still.width = canvas.width; still.height = canvas.height;
    const g = still.getContext('2d');
    for (const cell of cells) drawPiece(sprites.levels[typeOf(cell)][cell.level], cell.x, cell.y, cell.size, 0, 1, g, still.width, still.height);
  }
  // A band of light crosses the finished face once.
  function sweep(ms) {
    const [from, to] = TIMELINE.sweep;
    const p = (ms - from) / (to - from);
    if (p <= 0 || p >= 1) return;
    const w = canvas.width, h = canvas.height, at = -.4 + 1.8 * easeInOut(p);
    const band = ctx.createLinearGradient(w * (at - .25), h * (at - .25) * .6, w * (at + .25), h * (at + .25) * .6);
    band.addColorStop(0, 'rgba(255,240,210,0)'); band.addColorStop(.5, 'rgba(255,240,210,.55)'); band.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = band; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  function sources() {
    const b = board.getBoundingClientRect();
    if (!b.width || !b.height) return [];
    return [...board.querySelectorAll(pieces)].map(img => {
      const r = img.getBoundingClientRect();
      return {x: (r.left + r.width / 2 - b.left) / b.width, y: (r.top + r.height / 2 - b.top) / b.height, w: r.width / b.width, h: r.height / b.height};
    }).filter(s => s.w > 0);
  }

  // The plate and glow fade in over the timeline.
  function backdrop(ms) {
    const [g0, g1] = TIMELINE.glow;
    overlay.style.setProperty('--portrait-plate', String(clamp01(ms / TIMELINE.burst)));
    overlay.style.setProperty('--portrait-glow', String(smooth(clamp01((ms - g0) / (g1 - g0)))));
  }

  function tick(now) {
    if (closed) return;
    const ms = now - start;
    backdrop(ms);
    if (!still && ms >= landed) renderStill();
    draw(ms);
    if (!revealed && ms >= TIMELINE.converge[1] + TIMELINE.fly * .6) { revealed = true; onReveal?.(); }
    if (ms < duration) frame = win.requestAnimationFrame(tick);
    else { frame = 0; draw(duration); }
  }

  function finalFrame() {
    overlay.style.setProperty('--portrait-plate', '1'); overlay.style.setProperty('--portrait-glow', '1');
    board.classList.add('profile-portrait-burst');
    if (!still) renderStill();
    draw(duration);
    if (!revealed) { revealed = true; onReveal?.(); }
  }

  function begin() {
    if (closed) return;
    images.then(imgs => {
      if (closed) return;
      measure();
      n = Math.max(36, Math.min(56, Math.round(Math.min(width, height) / 10.5))) || 44;
      const seed = [...id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7);
      cells = planMosaic(portraitTones(id, n), n, {sources: sources(), seed});
      sprites = buildSprites(imgs); still = null;
      if (!animated) { finalFrame(); return; }
      board.classList.add('profile-portrait-burst');
      start = win.performance.now();
      frame = win.requestAnimationFrame(tick);
    });
  }

  // Keep it sharp if the board changes size.
  const resize = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => {
    if (!cells || closed) return;
    const before = width;
    measure();
    if (Math.abs(before - width) < 1 && sprites) { if (!frame) draw(duration); return; }
    images.then(imgs => { if (closed) return; sprites = buildSprites(imgs); still = null; if (!frame) { renderStill(); draw(duration); } });
  }) : null;
  resize?.observe(overlay);

  paintGlow();
  overlay.style.setProperty('--portrait-plate', '0'); overlay.style.setProperty('--portrait-glow', '0');
  if (animated) timer = win.setTimeout(begin, delay); else begin();

  const stop = () => { win.cancelAnimationFrame(frame); win.clearTimeout(timer); frame = 0; timer = 0; };
  return {
    get revealed() { return revealed; },
    /** Bring the board's pieces back, then turn them into the face again. */
    replay() {
      if (closed) return;
      stop(); revealed = false; still = null;
      board.classList.remove('profile-portrait-burst');
      overlay.style.setProperty('--portrait-plate', '0'); overlay.style.setProperty('--portrait-glow', '0');
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (animated) timer = win.setTimeout(begin, 900); else begin();
    },
    /** Fade the portrait away and give the board its pieces back. */
    dismiss() {
      if (closed) return Promise.resolve();
      stop();
      board.classList.remove('profile-portrait-burst');
      if (!animated) { this.cancel(); return Promise.resolve(); }
      overlay.classList.add('profile-portrait-leaving');
      return new Promise(resolve => win.setTimeout(() => { this.cancel(); resolve(); }, 520));
    },
    cancel() {
      if (closed) return;
      closed = true; stop(); resize?.disconnect();
      board.classList.remove('profile-portrait-burst');
      overlay.classList.remove('profile-portrait', 'profile-portrait-leaving');
      overlay.removeAttribute('role'); overlay.removeAttribute('aria-label');
      overlay.replaceChildren();
    },
  };
}
