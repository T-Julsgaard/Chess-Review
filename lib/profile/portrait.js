// Player profile — the historical twin's face, assembled from chess pieces.
//
// Two styles:
//  - 'assemble' (default): the face is drawn with the real piece set, exactly as
//    the board shows it: white pieces carry the light, black pieces the shadow,
//    and an empty cell is the board's own mid tone, chosen cell by cell with
//    error diffusion. The pieces move the way every position change in the
//    extension moves (glidePieces, slidePuzzlePieces): the same easing, the same
//    durations, straight routes. The board's own pieces glide to the nearest
//    face cell of their own kind and colour, shrinking as they go; pieces the
//    face has no use for leave through the nearest board edge; every other piece
//    of the face enters through the nearest edge, outside in. Leaving the face
//    plays the assembly backwards, so the board gets its pieces back.
//  - 'swarm': the board goes dark, its pieces dissolve into a swirling swarm
//    that settles outside-in into a tinted mosaic. About ten seconds.
// Drawn on a canvas inside the board overlay; the real piece set supplies the sprites.
import {PORTRAITS, PORTRAIT_SIZE} from './portraits.js';
import {nearestBoardEdge} from '../learning/piece-transition.js';

export const hasPortrait = id => !!id && Object.hasOwn(PORTRAITS, id);
export const portraitCredit = id => hasPortrait(id) ? {credit: PORTRAITS[id].credit, source: PORTRAITS[id].source} : null;

/** Animation styles Settings can offer; the first is the default. */
export const PORTRAIT_STYLES = [{id: 'assemble', label: 'Assemble'}, {id: 'swarm', label: 'Swarm'}];
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
 * the face comes in outside in over that long. `plate` is how far the squares
 * blend into one tone under the face, and `plateTone` that tone: the board's own
 * hue, dark enough that white pieces read as light and black ones as shadow.
 * `back` speeds up the way out.
 */
export const GLIDE = {ease: [.4, 0, .2, 1], move: [520, 34, 240], route: [680, 24, 220], stagger: [24, 192], enter: [160, 1500], jitter: 90, plate: .9, plateTone: .42, back: 1.6};
/** Every piece fills this much of its square or face cell, like the board's pieces. */
export const PIECE_FILL = .94;
export const PIECE_CODES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
// How much of its cell each piece covers (`cover`, measured from the real set
// when it loads) and how much light it adds (`ink`). The eye reads a white piece
// as white and a black one as black, outlines and all, so `ink` is the cover
// times the piece's colour (FACE.white, FACE.black), not its mean pixel.
// `sharpen` is an unsharp mask that keeps eyes, brows and mouth on the coarse
// grid; `equalize` spreads each face's tones over the whole ladder; `diffuse` is
// how much of each cell's error passes to its neighbours (1 = Floyd–Steinberg).
export const FACE = {white: .95, black: .05, sharpen: 1.2, equalize: .7, diffuse: .6};
const COVER = {P: .2, N: .32, B: .23, R: .28, Q: .32, K: .3};
export const pieceInk = (code, cover) => cover * (code[0] === 'w' ? FACE.white : FACE.black);
export const DEFAULT_PIECES = PIECE_CODES.map(code => ({code, cover: COVER[code[1]], ink: pieceInk(code, COVER[code[1]])}));
/** The mean tone of a cell holding `piece` over a background of tone `bg`. */
export const pieceTone = (piece, bg) => bg * (1 - piece.cover) + piece.ink;

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
 * Plan the 'assemble' style on an n×n grid (n a multiple of 8, so the cells
 * line up with the squares). Positions are in squares (0..8, display order,
 * like the board). `pieces` is the measured piece set ({code, cover, ink});
 * `background` the plate's tone; `sources` the board's pieces ({code, x, y, size}).
 * Pure: returns {cells, leaves, k, size, landed, duration}, where every cell and
 * leave has {kind: 'move' | 'enter' | 'leave', code, from, to, sizeFrom, sizeTo, start, dur}.
 */
export function planFace(tones, n, {pieces = DEFAULT_PIECES, background = .42, sources = [], seed = 7, sharpen = FACE.sharpen, equalize = FACE.equalize, diffuse = FACE.diffuse} = {}) {
  const rnd = random(seed), k = n / 8, size = PIECE_FILL / k, count = n * n, bg = background;
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
  // Darkest to lightest: the biggest black piece, through the empty plate, to the biggest white one.
  const ladder = pieces.map(p => ({code: p.code, tone: pieceTone(p, bg)}));
  const lo = Math.min(bg, ...ladder.map(l => l.tone)), hi = Math.max(bg, ...ladder.map(l => l.tone)), span = hi - lo;
  // Error diffusion (serpentine): each cell takes the piece, or no piece, whose
  // tone is nearest, and passes part of the difference on.
  const err = new Float32Array(count), cells = [];
  const push = (x, y, v) => { if (x >= 0 && x < n && y < n) err[y * n + x] += v; };
  for (let y = 0; y < n; y++) {
    const dir = y % 2 ? -1 : 1;
    for (let j = 0; j < n; j++) {
      const x = dir > 0 ? j : n - 1 - j, i = y * n + x;
      const goal = lo + span * tones[i] + err[i] * diffuse;
      let best = null, miss = Math.abs(goal - bg);
      for (const l of ladder) { const m = Math.abs(goal - l.tone); if (m < miss - 1e-9) { miss = m; best = l; } }
      const e = Math.max(-span / 2, Math.min(span / 2, goal - (best ? best.tone : bg)));
      push(x + dir, y, e * 7 / 16); push(x - dir, y + 1, e * 3 / 16); push(x, y + 1, e * 5 / 16); push(x + dir, y + 1, e / 16);
      if (best) cells.push({gx: x, gy: y, x: (x + .5) / k, y: (y + .5) / k, code: best.code});
    }
  }
  for (const c of cells) Object.assign(c, {kind: 'enter', to: {x: c.x, y: c.y}, sizeFrom: size, sizeTo: size, source: -1});
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
  return options.style === 'swarm' ? createSwarm(options) : createAssemble(options);
}

function createAssemble({board, overlay, id, makePiece, motion = () => true, win = board.ownerDocument.defaultView, delay = 1200, label = 'Portrait made of chess pieces', pieces = '.profile-piece', onReveal = null}) {
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
  let plan = null, sprites = null, set = null, loaded = null, width = 0, height = 0, ratio = 1;
  let frame = 0, timer = 0, at = 0, closed = false, revealed = false, shown = false, pending = null;
  // The board's own piece images, hidden while the canvas carries them.
  let held = [];

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
  /** How much of its face cell each piece of this set covers, and so how much light or shadow it adds. */
  function measureSet(imgs) {
    const px = 48, area = PIECE_FILL * PIECE_FILL;
    return PIECE_CODES.map((code, i) => {
      try {
        const d = raster(imgs[i], px).getContext('2d').getImageData(0, 0, px, px).data;
        let sum = 0;
        for (let j = 3; j < d.length; j += 4) sum += d[j] / 255;
        if (!sum) return DEFAULT_PIECES[i];
        const cover = sum / (px * px) * area;
        return {code, cover, ink: pieceInk(code, cover)};
      } catch { return DEFAULT_PIECES[i]; }
    });
  }
  /** Each piece twice: at face-cell size and at full square size, in canvas pixels. */
  function buildSprites(imgs) {
    const square = canvas.width / 8, cell = {}, full = {};
    PIECE_CODES.forEach((code, i) => {
      cell[code] = raster(imgs[i], Math.max(6, Math.ceil(square * plan.size)));
      full[code] = raster(imgs[i], Math.max(8, Math.ceil(square * PIECE_FILL)));
    });
    return {cell, full};
  }
  /** The plate colour that evens out the squares: their average hue, at GLIDE.plateTone. */
  function squareTones() {
    const list = [...board.querySelectorAll(':scope > .sq')];
    const rgb = Array.from({length: 64}, (_, i) => (list[i] && parseColor(win.getComputedStyle(list[i]).backgroundColor))
      || ((i % 8 + (i >> 3)) % 2 ? [181, 136, 99] : [240, 217, 181]));
    const mean = [0, 1, 2].map(j => rgb.reduce((s, c) => s + c[j], 0) / 64), scale = GLIDE.plateTone / Math.max(.05, luma(mean));
    return {plate: mean.map(c => Math.round(Math.min(255, c * scale)))};
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
    // Small pieces use the face-cell raster, larger ones the full-square one; a piece of unknown kind is drawn from its own image.
    const sprite = item.code ? (s.size <= plan.size * 1.3 ? sprites.cell : sprites.full)[item.code] : held[item.source];
    if (!drawable(sprite)) return;
    const sx = w / 8, sy = h / 8, pw = s.size * sx, ph = s.size * sy;
    g.drawImage(sprite, s.x * sx - pw / 2, s.y * sy - ph / 2, pw, ph);
  }
  /** The face at timeline `ms`: settled pieces, then the moving ones, the board's own on top. */
  function paint(g, ms, w, h) {
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
    plate.style.opacity = String(plateAt(at, plan.landed));
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
      if (dir > 0 && at >= plan.landed * .85) reveal();
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
      // Four or five face cells per square on a laptop-sized board: each piece about 17 px.
      const k = Math.max(3, Math.min(5, Math.round(width / 8 / 17))) || 4, n = 8 * k;
      const squares = squareTones(), found = sources();
      plate.style.background = `rgb(${squares.plate.join(', ')})`;
      set = set || measureSet(imgs);
      const seed = [...id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7);
      plan = planFace(portraitTones(id, n), n, {pieces: set, background: luma(squares.plate), sources: found, seed});
      sprites = buildSprites(imgs);
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
    const base = plateAt(at, plan.landed), colour = plate.style.background;
    const out = plan.cells.map(c => [c, faceState(c, at)]).filter(([c, s]) => s.visible && !(c.kind === 'move' && s.p === 0)).map(([c, s]) => {
      const from = {x: s.x, y: s.y}, to = nearestBoardEdge(from);
      return {kind: 'leave', code: c.code, from, to, sizeFrom: s.size, sizeTo: s.size, depth: Math.min(s.x, 8 - s.x, s.y, 8 - s.y), dur: route(GLIDE.route, Math.hypot(to.x - from.x, to.y - from.y)) * .8};
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
      for (const o of out) { const s = faceState(o, ms); if (s.p < 1) drawItem(g, o, s, ghost.width, ghost.height); }
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
