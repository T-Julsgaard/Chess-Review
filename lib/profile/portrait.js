// Player profile — the historical twin's face, assembled from chess pieces.
//
// The pieces on the board dissolve into a swarm of small pieces that swirl
// around the board and then settle, cell by cell, into a mosaic of the twin's
// face: brighter cells get larger, lighter, inkier pieces; darker ones small,
// dim pawns. The outer cells land first and the face itself last, so the
// likeness only appears in the final seconds. Drawn on two canvases inside the
// board overlay; the real piece set supplies the sprites.
import {PORTRAITS, PORTRAIT_SIZE} from './portraits.js';

export const hasPortrait = id => !!id && Object.hasOwn(PORTRAITS, id);
export const portraitCredit = id => hasPortrait(id) ? {credit: PORTRAITS[id].credit, source: PORTRAITS[id].source} : null;

const TYPES = ['p', 'n', 'b', 'r', 'q', 'k'];
const LEVELS = 16;
// Timeline in milliseconds, from the moment the board's pieces start to dissolve.
export const TIMELINE = {burst: 1500, converge: [2600, 6000], fly: 2600, glow: [6400, 9000], sweep: [8200, 10200]};
export const PORTRAIT_DURATION = TIMELINE.sweep[1];
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

/**
 * Mount the portrait in `overlay` over `board`. Returns {replay, dismiss, cancel}.
 * `delay` is how long the board's own position stays before it dissolves;
 * `pieces` selects the board's piece images the swarm is born from.
 */
export function createPortrait({board, overlay, id, makePiece, motion = () => true, win = board.ownerDocument.defaultView, delay = 1200, label = 'Portrait made of chess pieces', pieces = '.profile-piece', onReveal = null}) {
  const doc = board.ownerDocument;
  const animated = motion();
  const canvas = doc.createElement('canvas'), ctx = canvas.getContext?.('2d');
  // Without a 2D canvas (tests, odd embedders) the board simply keeps its position.
  if (!ctx) return {revealed: false, replay() {}, dismiss: () => Promise.resolve(), cancel() {}};
  overlay.classList.add('profile-portrait');
  overlay.setAttribute('role', 'img'); overlay.setAttribute('aria-label', label);
  const plate = doc.createElement('div'); plate.className = 'profile-portrait-plate';
  const glow = doc.createElement('canvas'); glow.className = 'profile-portrait-glow';
  canvas.className = 'profile-portrait-pieces';
  overlay.replaceChildren(plate, glow, canvas);
  let frame = 0, timer = 0, start = 0, cells = null, n = 0, sprites = null, still = null, width = 0, height = 0, ratio = 1, closed = false, revealed = false;

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

  /** Tinted sprites: per piece type and tone level, the piece's light parts take the ink colour. */
  function buildSprites(imgs) {
    const cell = Math.min(width, height) / n;
    const px = Math.max(8, Math.ceil(cell * 1.3 * ratio));
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
    return {px, levels, cloud};
  }

  function drawPiece(sprite, x, y, scale, turn, alpha) {
    const cell = Math.min(width, height) / n * ratio, size = cell * scale, s = size / sprite.width;
    const cos = Math.cos(turn) * s, sin = Math.sin(turn) * s;
    ctx.globalAlpha = alpha;
    ctx.setTransform(cos, sin, -sin, cos, x * canvas.width, y * canvas.height);
    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
  }
  const typeOf = cell => Math.min(TYPES.length - 1, Math.floor(cell.rank * TYPES.length));

  function draw(ms) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!sprites) return;
    if (ms >= TIMELINE.converge[1] + TIMELINE.fly && still) { ctx.drawImage(still, 0, 0); return sweep(ms); }
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
    for (const cell of cells) {
      const sprite = sprites.levels[typeOf(cell)][cell.level], size = Math.min(width, height) / n * ratio * cell.size;
      g.drawImage(sprite, cell.x * still.width - size / 2, cell.y * still.height - size / 2, size, size);
    }
  }
  // A band of light crosses the finished face once.
  function sweep(ms) {
    const p = (ms - TIMELINE.sweep[0]) / (TIMELINE.sweep[1] - TIMELINE.sweep[0]);
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

  function tick(now) {
    if (closed) return;
    const ms = now - start;
    overlay.style.setProperty('--portrait-plate', String(clamp01(ms / TIMELINE.burst)));
    overlay.style.setProperty('--portrait-glow', String(smooth(clamp01((ms - TIMELINE.glow[0]) / (TIMELINE.glow[1] - TIMELINE.glow[0])))));
    if (!still && ms >= TIMELINE.converge[1] + TIMELINE.fly) renderStill();
    draw(ms);
    if (!revealed && ms >= TIMELINE.converge[1] + TIMELINE.fly * .6) { revealed = true; onReveal?.(); }
    if (ms < PORTRAIT_DURATION) frame = win.requestAnimationFrame(tick);
    else { frame = 0; draw(PORTRAIT_DURATION); }
  }

  function finalFrame() {
    overlay.style.setProperty('--portrait-plate', '1'); overlay.style.setProperty('--portrait-glow', '1');
    board.classList.add('profile-portrait-burst');
    if (!still) renderStill();
    draw(PORTRAIT_DURATION);
    if (!revealed) { revealed = true; onReveal?.(); }
  }

  function begin() {
    if (closed) return;
    images.then(imgs => {
      if (closed) return;
      measure();
      n = Math.max(36, Math.min(56, Math.round(Math.min(width, height) / 10.5))) || 44;
      cells = planMosaic(portraitTones(id, n), n, {sources: sources(), seed: [...id].reduce((s, c) => s * 31 + c.charCodeAt(0), 7)});
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
    if (Math.abs(before - width) < 1 && sprites) { if (!frame) draw(PORTRAIT_DURATION); return; }
    images.then(imgs => { if (closed) return; sprites = buildSprites(imgs); still = null; if (!frame) { renderStill(); draw(PORTRAIT_DURATION); } });
  }) : null;
  resize?.observe(overlay);

  paintGlow();
  overlay.style.setProperty('--portrait-plate', '0'); overlay.style.setProperty('--portrait-glow', '0');
  if (animated) timer = win.setTimeout(begin, delay); else begin();

  const stop = () => { win.cancelAnimationFrame(frame); win.clearTimeout(timer); frame = 0; timer = 0; };
  return {
    get revealed() { return revealed; },
    /** Bring the board's pieces back, then dissolve them into the face again. */
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
