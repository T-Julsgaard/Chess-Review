// Player profile — the historical twin's face, assembled from chess pieces.
//
// Two styles, both a mosaic of the twin's face where brighter cells get larger,
// lighter, inkier pieces and darker ones small, dim pawns:
//  - 'assemble' (default): the board stays. Its own pieces glide along curves
//    into the brightest cells of the face, and the rest of the mosaic slides in
//    from the left and right edges, row by row in four interlaced waves, while
//    the board dims gently underneath. About four seconds.
//  - 'swarm': the board goes dark, its pieces dissolve into a swirling swarm
//    that settles outside-in into the face. About ten seconds.
// Drawn on two canvases inside the board overlay; the real piece set supplies the sprites.
import {PORTRAITS, PORTRAIT_SIZE} from './portraits.js';

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
// Assemble timeline in milliseconds. `lift`: when the board's pieces set off; `fly`: their flight.
// `waves`: [first start, gap, count] of the interlaced rows; `row`: top-to-bottom lag inside a wave;
// `lead`: how much earlier the deepest piece of a row leaves; `slide`: [base, extra at the centre].
export const ASSEMBLE = {
  frame: .88, lift: 250, fly: 1500, waves: [550, 400, 4], row: 220, lead: 240, slide: [650, 450], jitter: 60,
  plate: [600, 2900], glow: [1700, 3200], sweep: [3150, 3950],
};
export const ASSEMBLE_DURATION = ASSEMBLE.sweep[1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Ink: near-black umber to warm ivory, on a darker plate.
const STOPS = [[0, [28, 22, 17]], [.3, [92, 66, 40]], [.62, [196, 150, 92]], [.85, [236, 205, 152]], [1, [255, 246, 228]]];

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

/**
 * Plan every mosaic cell: target, tone, piece rank, size, where it comes from
 * and when it lands. Pure, so tests can check the choreography.
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

/** Where a cell is, how big, turned how far and how settled it is, at `ms`. */
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

const cellTone = (t, x, y) => ({
  t,
  rank: clamp01(.12 + .72 * t + ((BAYER[(y % 4) * 4 + (x % 4)] + .5) / 16 - .5) * .55),
  level: Math.round(clamp01(t) * (LEVELS - 1)),
  size: .38 + .92 * Math.pow(t, 1.1),
});

/**
 * Plan the 'assemble' style. The mosaic fills the central `frame` of the board.
 * `sources` are the board's pieces ({x, y, w, h, type?} as board fractions):
 * each flies to one of the brightest cells, nearest first, and keeps its own
 * shape (`piece`, an index into TYPES, when known). Every other cell slides in
 * from the nearer side edge along its own row. Rows come in four interlaced
 * waves (0, 4, 8… then 2, 6… then 1, 5… then 3, 7…), so the face sharpens
 * like a progressive image. Pure: returns {cells, landed, duration}.
 */
export function planAssemble(tones, n, {sources = [], seed = 7, frame = ASSEMBLE.frame} = {}) {
  const rnd = random(seed), cells = [];
  const at = v => .5 + (v - .5) * frame;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    cells.push({gx: x, gy: y, x: at((x + .5) / n), y: at((y + .5) / n), ...cellTone(tones[y * n + x], x, y), piece: -1, source: -1});
  }
  // Targets for the board's pieces: bright cells, spread out across the face.
  const pool = cells.filter(c => c.t > .35).sort((a, b) => b.t - a.t || a.gy - b.gy || a.gx - b.gx);
  const targets = [], gap = Math.max(2, n / 14);
  for (const c of pool) {
    if (targets.length >= sources.length) break;
    if (targets.every(o => Math.hypot(o.gx - c.gx, o.gy - c.gy) >= gap)) targets.push(c);
  }
  for (const c of pool) { if (targets.length >= sources.length) break; if (!targets.includes(c)) targets.push(c); }
  // Nearest pairs first: pieces from the top ranks take the top of the face, and so on.
  const pairs = [];
  sources.forEach((s, i) => targets.forEach((c, j) => pairs.push([Math.hypot(s.x - c.x, s.y - c.y), i, j])));
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const usedSource = new Set(), usedTarget = new Set();
  let far = 0;
  for (const [d, i, j] of pairs) {
    if (usedSource.has(i) || usedTarget.has(j)) continue;
    usedSource.add(i); usedTarget.add(j);
    const s = sources[i], c = targets[j];
    c.source = i; c.piece = TYPES.indexOf(String(s.type || '').toLowerCase());
    c.from = {x: s.x, y: s.y}; c.scaleFrom = Math.max(s.w, s.h) / (frame / n); c.dist = d;
    c.bend = (rnd() < .5 ? -1 : 1) * (.16 + .14 * rnd());
    far = Math.max(far, d);
  }
  const [first, waveGap, waves] = ASSEMBLE.waves, order = [0, 2, 1, 3];
  let landed = 0;
  for (const c of cells) {
    if (c.source >= 0) {
      // The farthest pieces leave first, so the board's pieces arrive close together.
      c.start = ASSEMBLE.lift * (far ? 1 - c.dist / far : 0); c.dur = ASSEMBLE.fly; c.board = true;
    } else {
      const left = c.gx < n / 2, half = n / 2;
      const depth = left ? (c.gx + .5) / half : (n - c.gx - .5) / half; // 0 at the edge, 1 at the centre
      const wave = order[c.gy % 4] % waves;
      c.from = {x: left ? -.04 : 1.04, y: c.y};
      c.scaleFrom = c.size;
      c.bend = (left ? 1 : -1) * (c.gy % 2 ? .05 : -.05);
      c.start = first + wave * waveGap + ASSEMBLE.row * c.gy / n + ASSEMBLE.lead * (1 - depth) + ASSEMBLE.jitter * rnd();
      c.dur = ASSEMBLE.slide[0] + ASSEMBLE.slide[1] * depth; c.board = false;
    }
    landed = Math.max(landed, c.start + c.dur);
  }
  return {cells, landed, duration: Math.max(ASSEMBLE_DURATION, landed + 400)};
}

/** Where an 'assemble' cell is at `ms`: position, scale, how far its colour has turned to ink, opacity. */
export function assembleState(cell, ms) {
  const p = clamp01((ms - cell.start) / cell.dur);
  // The board's pieces lift and settle; the edge pieces slide in and slow down.
  const e = cell.board ? easeInOut(p) : easeOut(p);
  // A quadratic curve from `from` to the cell, bowed sideways by `bend`.
  const dx = cell.x - cell.from.x, dy = cell.y - cell.from.y;
  const cx = cell.from.x + dx / 2 - dy * cell.bend, cy = cell.from.y + dy / 2 + dx * cell.bend;
  const u = 1 - e;
  const x = u * u * cell.from.x + 2 * u * e * cx + e * e * cell.x;
  const y = u * u * cell.from.y + 2 * u * e * cy + e * e * cell.y;
  const shrink = cell.board ? easeInOut(clamp01((p - .15) / .8)) : e;
  return {
    x, y, settle: p,
    scale: cell.scaleFrom + (cell.size - cell.scaleFrom) * shrink,
    ink: cell.board ? smooth(clamp01((p - .4) / .55)) : 1,
    alpha: cell.board ? 1 : smooth(clamp01(p / .18)),
    moving: p > 0 && p < 1,
  };
}

/**
 * Mount the portrait in `overlay` over `board`. Returns {replay, dismiss, cancel}.
 * `delay` is how long the board's own position stays before the portrait starts
 * (PORTRAIT_DELAY suits 'assemble'); `pieces` selects the board's piece images
 * the portrait is made from; `style` is one of PORTRAIT_STYLES.
 */
export function createPortrait({board, overlay, id, makePiece, motion = () => true, win = board.ownerDocument.defaultView, delay = 1200, label = 'Portrait made of chess pieces', pieces = '.profile-piece', onReveal = null, style = 'assemble'}) {
  const doc = board.ownerDocument;
  const animated = motion();
  const assemble = style !== 'swarm';
  const canvas = doc.createElement('canvas'), ctx = canvas.getContext?.('2d');
  // Without a 2D canvas (tests, odd embedders) the board simply keeps its position.
  if (!ctx) return {revealed: false, replay() {}, dismiss: () => Promise.resolve(), cancel() {}};
  overlay.classList.add('profile-portrait');
  if (assemble) overlay.classList.add('profile-portrait-assemble');
  overlay.setAttribute('role', 'img'); overlay.setAttribute('aria-label', label);
  const plate = doc.createElement('div'); plate.className = 'profile-portrait-plate';
  const glow = doc.createElement('canvas'); glow.className = 'profile-portrait-glow';
  canvas.className = 'profile-portrait-pieces';
  overlay.replaceChildren(plate, glow, canvas);
  let frame = 0, timer = 0, start = 0, cells = null, n = 0, sprites = null, still = null, width = 0, height = 0, ratio = 1, closed = false, revealed = false;
  // 'assemble': the board's own piece images, hidden while the canvas draws them.
  let held = [], landed = 0, duration = PORTRAIT_DURATION;
  const fit = assemble ? ASSEMBLE.frame : 1;

  // Glow: the tone map itself, tinted and blurred, sitting under the pieces.
  function paintGlow() {
    const size = PORTRAIT_SIZE, tones = portraitTones(id, size);
    glow.width = size; glow.height = size;
    const g = glow.getContext('2d'); if (!g) return;
    const img = g.createImageData(size, size);
    tones.forEach((t, i) => { const [r, gg, b] = inkColor(t * .9); img.data.set([r, gg, b, Math.round(255 * Math.pow(t, 1.4))], i * 4); });
    g.putImageData(img, 0, 0);
  }

  const images = Promise.all(TYPES.map(type => {
    const img = makePiece(type, 'w');
    return (img.decode ? img.decode() : Promise.resolve()).then(() => img, () => img);
  }));

  function measure() {
    const rect = overlay.getBoundingClientRect();
    width = overlay.offsetWidth || rect.width; height = overlay.offsetHeight || rect.height;
    const scale = width ? rect.width / width : 1;
    ratio = Math.min(2.5, Math.max(1, (win.devicePixelRatio || 1) * scale));
    if (width * ratio > 2400) ratio = 2400 / width;
    canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
  }
  /** One mosaic cell, in canvas pixels. */
  const pitch = () => Math.min(width, height) * fit / n * ratio;

  /** Tinted sprites: per piece type and tone level, the piece's light parts take the ink colour. */
  function buildSprites(imgs) {
    const px = Math.max(8, Math.ceil(pitch() * 1.3));
    const make = (img, rgb) => {
      const c = doc.createElement('canvas'); c.width = c.height = px;
      const g = c.getContext('2d');
      const shape = () => { if (img.naturalWidth || img.width) g.drawImage(img, 0, 0, px, px); else { g.beginPath(); g.arc(px / 2, px / 2, px * .32, 0, Math.PI * 2); g.fill(); } };
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
    return {px, levels, cloud, ink};
  }

  function drawPiece(sprite, x, y, scale, turn, alpha, g = ctx, w = canvas.width, h = canvas.height) {
    const size = pitch() * scale, cos = Math.cos(turn), sin = Math.sin(turn);
    g.globalAlpha = alpha;
    g.setTransform(cos, sin, -sin, cos, x * w, y * h);
    g.drawImage(sprite, -size / 2, -size / 2, size, size);
  }
  // A board piece keeps its own shape; every other cell takes the shape its tone ranks.
  const typeOf = cell => cell.piece >= 0 && sprites?.ink ? sprites.ink.indexOf(cell.piece) : Math.min(TYPES.length - 1, Math.floor(cell.rank * TYPES.length));

  function draw(ms) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!sprites) return;
    if (ms >= landed && still) { ctx.drawImage(still, 0, 0); return sweep(ms); }
    if (assemble) drawAssemble(ms);
    else for (const cell of cells) {
      const s = cellState(cell, ms);
      if (!s.visible) continue;
      const type = typeOf(cell);
      if (s.settle < 1) drawPiece(sprites.cloud[type], s.x, s.y, s.scale, s.turn, 1 - smooth(s.settle));
      if (s.settle > 0) drawPiece(sprites.levels[type][cell.level], s.x, s.y, s.scale, s.turn, smooth(s.settle));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  }
  function drawAssemble(ms) {
    // The edge pieces first, then the board's own pieces on top of them.
    for (const pass of [false, true]) for (const cell of cells) {
      if (cell.board !== pass) continue;
      const s = assembleState(cell, ms);
      if (s.alpha <= 0) continue;
      const sprite = sprites.levels[typeOf(cell)][cell.level];
      if (!cell.board) { drawPiece(sprite, s.x, s.y, s.scale, 0, s.alpha); continue; }
      const img = held[cell.source];
      if (img && s.ink < 1 && (img.naturalWidth || img.width)) drawPiece(img, s.x, s.y, s.scale, 0, 1 - s.ink);
      if (s.ink > 0) drawPiece(sprite, s.x, s.y, s.scale, 0, s.ink);
    }
  }
  function renderStill() {
    still = doc.createElement('canvas'); still.width = canvas.width; still.height = canvas.height;
    const g = still.getContext('2d');
    for (const cell of cells) drawPiece(sprites.levels[typeOf(cell)][cell.level], cell.x, cell.y, cell.size, 0, 1, g, still.width, still.height);
  }
  // A band of light crosses the finished face once: softly and quickly for 'assemble'.
  function sweep(ms) {
    const [from, to] = assemble ? ASSEMBLE.sweep : TIMELINE.sweep;
    const p = (ms - from) / (to - from);
    if (p <= 0 || p >= 1) return;
    const w = canvas.width, h = canvas.height, at = -.4 + 1.8 * easeInOut(p), light = assemble ? .32 : .55;
    const band = ctx.createLinearGradient(w * (at - .25), h * (at - .25) * .6, w * (at + .25), h * (at + .25) * .6);
    band.addColorStop(0, 'rgba(255,240,210,0)'); band.addColorStop(.5, `rgba(255,240,210,${light})`); band.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = band; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  function sources() {
    const b = board.getBoundingClientRect();
    if (!b.width || !b.height) return [];
    return [...board.querySelectorAll(pieces)].map(img => {
      const r = img.getBoundingClientRect();
      const code = img.dataset?.piece || '';
      return {img, type: code.length === 2 ? code[1] : '', x: (r.left + r.width / 2 - b.left) / b.width, y: (r.top + r.height / 2 - b.top) / b.height, w: r.width / b.width, h: r.height / b.height};
    }).filter(s => s.w > 0);
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

  // The plate and glow fade in over the timeline: under the swarm at once, under the assembly late and gently.
  function backdrop(ms) {
    const plateAt = assemble ? smooth(clamp01((ms - ASSEMBLE.plate[0]) / (ASSEMBLE.plate[1] - ASSEMBLE.plate[0]))) : clamp01(ms / TIMELINE.burst);
    const [g0, g1] = assemble ? ASSEMBLE.glow : TIMELINE.glow;
    overlay.style.setProperty('--portrait-plate', String(plateAt));
    overlay.style.setProperty('--portrait-glow', String(smooth(clamp01((ms - g0) / (g1 - g0)))));
  }

  function tick(now) {
    if (closed) return;
    const ms = now - start;
    backdrop(ms);
    if (!still && ms >= landed) renderStill();
    draw(ms);
    if (!revealed && ms >= (assemble ? landed * .85 : TIMELINE.converge[1] + TIMELINE.fly * .6)) { revealed = true; onReveal?.(); }
    if (ms < duration) frame = win.requestAnimationFrame(tick);
    else { frame = 0; draw(duration); }
  }

  function finalFrame() {
    overlay.style.setProperty('--portrait-plate', '1'); overlay.style.setProperty('--portrait-glow', '1');
    if (!assemble) board.classList.add('profile-portrait-burst');
    if (!still) renderStill();
    draw(duration);
    if (!revealed) { revealed = true; onReveal?.(); }
  }

  function begin() {
    if (closed) return;
    images.then(imgs => {
      if (closed) return;
      measure();
      n = Math.max(36, Math.min(56, Math.round(Math.min(width, height) * fit / 10.5))) || 44;
      const seed = [...id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7), tones = portraitTones(id, n), found = sources();
      if (assemble) {
        const plan = planAssemble(tones, n, {sources: found, seed});
        cells = plan.cells; landed = plan.landed; duration = plan.duration;
        hold(found);
      } else {
        cells = planMosaic(tones, n, {sources: found, seed});
        landed = TIMELINE.converge[1] + TIMELINE.fly; duration = PORTRAIT_DURATION;
      }
      sprites = buildSprites(imgs); still = null;
      if (!animated) { finalFrame(); return; }
      if (!assemble) board.classList.add('profile-portrait-burst');
      start = win.performance.now();
      // Draw the board's pieces on the canvas at once, in the same frame they are hidden.
      backdrop(0); draw(0);
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
      stop(); revealed = false; still = null; release();
      board.classList.remove('profile-portrait-burst');
      overlay.style.setProperty('--portrait-plate', '0'); overlay.style.setProperty('--portrait-glow', '0');
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (animated) timer = win.setTimeout(begin, assemble ? 600 : 900); else begin();
    },
    /** Fade the portrait away and give the board its pieces back. */
    dismiss() {
      if (closed) return Promise.resolve();
      stop(); release();
      board.classList.remove('profile-portrait-burst');
      if (!animated) { this.cancel(); return Promise.resolve(); }
      overlay.classList.add('profile-portrait-leaving');
      return new Promise(resolve => win.setTimeout(() => { this.cancel(); resolve(); }, 520));
    },
    cancel() {
      if (closed) return;
      closed = true; stop(); resize?.disconnect(); release();
      board.classList.remove('profile-portrait-burst');
      overlay.classList.remove('profile-portrait', 'profile-portrait-assemble', 'profile-portrait-leaving');
      overlay.removeAttribute('role'); overlay.removeAttribute('aria-label');
      overlay.replaceChildren();
    },
  };
}
