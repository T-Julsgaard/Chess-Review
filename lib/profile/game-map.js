// Every game is one square. Squares grow outward from the top-left corner in
// square shells (a new column down the right, then a new row along the bottom),
// so a new game never moves an old one: the board simply zooms out to keep the
// whole history in view. The first 64 games sit on the board's own squares.
// One canvas draws everything; hit testing is arithmetic.
export const MIN_SIDE = 8;
const POP_MS = 520, FLIP_MS = 440, FLIP_SPREAD = 950, DRAIN_MS = 650, MIN_RATE = 45;

/** Grid cell of the i-th square: shell k holds squares k² … (k+1)² − 1. */
export function shellCell(i) {
  const k = Math.floor(Math.sqrt(i)), j = i - k * k;
  return j < k ? {x: k, y: j} : {x: j - k, y: k};
}
/** Inverse of shellCell. */
export function shellIndex(x, y) {
  const k = Math.max(x, y);
  return x === k && y < k ? k * k + y : k * k + k + x;
}
/** Squares per side needed to show n games (never fewer than the board's eight). */
export function mapSide(n) { return Math.max(MIN_SIDE, Math.ceil(Math.sqrt(n))); }
export function gameUrl(row) {
  try {
    const url = new URL(row?.url);
    return url.protocol === 'https:' && ['www.chess.com', 'chess.com', 'lichess.org', 'www.lichess.org'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
const keyOf = row => `${row.site}:${row.id}`;
const easeOutBack = t => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
function rgb(color, fallback) {
  const m = String(color || '').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const hex = String(color || '').trim().match(/^#([0-9a-f]{6})$/i);
  return hex ? [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)) : fallback;
}

export function createGameMap({h, doc, onOpen, motion = () => true}) {
  const win = doc.defaultView;
  const element = h('div', {class: 'profile-game-map', tabindex: '0', role: 'img'});
  const canvas = doc.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  element.append(canvas);
  const summary = h('span', {class: 'profile-map-summary'});
  const detail = h('span', {class: 'profile-map-detail', role: 'status'});
  const open = h('button', {type: 'button', class: 'profile-caption-button', hidden: true, onclick: () => activate()}, 'View game');
  const caption = h('div', {class: 'profile-map-caption'}, h('div', {class: 'profile-map-legend'}, summary, h('span', {class: 'profile-map-key w'}, 'Won'), h('span', {class: 'profile-map-key d'}, 'Drew'), h('span', {class: 'profile-map-key l'}, 'Lost')), detail, h('div', {class: 'profile-map-actions'}, open));

  // slots[i] is the game in square i; born[i] is when it appeared (−1: queued).
  let slots = [], index = new Map(), born = [], shown = 0, settled = 0, selected = -1, hover = -1;
  let side = MIN_SIDE, frame = 0, last = 0, moves = null, ctx = null, colors = null, paths = null, pathBucket = '', destroyed = false;
  const animated = () => motion() && typeof win?.requestAnimationFrame === 'function';

  function palette() {
    const style = win.getComputedStyle(element);
    colors = {
      w: rgb(style.getPropertyValue('--q-best'), [129, 181, 139]),
      d: rgb(style.getPropertyValue('--ink-2'), [182, 185, 178]),
      l: rgb(style.getPropertyValue('--q-miss'), [219, 140, 122]),
      veil: rgb(style.getPropertyValue('--panel'), [32, 31, 28]),
      ink: rgb(style.getPropertyValue('--ink'), [240, 240, 236]),
    };
  }
  const res = row => row && row.res in {w: 1, d: 1, l: 1} ? row.res : 'd';
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  function geometry() {
    const width = element.clientWidth || 0;
    const zoom = Math.max(0, Math.min(1, (side - MIN_SIDE) / MIN_SIDE));
    const pad = width * .028 * zoom, cell = (width - pad * 2) / side;
    // Gaps and corners in grid units, chosen per zoom band so paths can be reused.
    const px = cell;
    const gap = px >= 18 ? .1 : px >= 7 ? .14 : px >= 3.5 ? .2 : 0;
    const radius = px >= 7 ? Math.min(.16, 5 / px) : 0;
    return {width, pad, cell, gap, radius, zoom};
  }
  function addSquare(path, i, gap, radius) {
    const {x, y} = shellCell(i), s = 1 - gap;
    if (radius && path.roundRect) path.roundRect(x + gap / 2, y + gap / 2, s, s, radius); else path.rect(x + gap / 2, y + gap / 2, s, s);
  }
  function context() {
    if (ctx) return ctx;
    if (!element.clientWidth || typeof canvas.getContext !== 'function') return null;
    try { ctx = canvas.getContext('2d'); } catch { ctx = null; }
    return ctx;
  }
  function draw(now = win.performance?.now() || Date.now()) {
    const g = context(); if (!g || !colors) return;
    const geo = geometry(), dpr = win.devicePixelRatio || 1, size = Math.round(geo.width * dpr);
    if (canvas.width !== size || canvas.height !== size) { canvas.width = size; canvas.height = size; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, size, size);
    // The board recedes behind the squares as the history outgrows its 64 squares.
    if (geo.zoom > 0) { g.fillStyle = css(colors.veil, .93 * geo.zoom); g.fillRect(0, 0, size, size); }
    g.setTransform(dpr * geo.cell, 0, 0, dpr * geo.cell, dpr * geo.pad, dpr * geo.pad);
    const bucket = `${geo.gap}:${geo.radius.toFixed(3)}`;
    if (moves) {
      // Re-sorting keeps every square in place: the cells flip like cards to
      // their date-order colour in a wave from the oldest corner.
      const t = now - moves.start, span = Math.max(1, 2 * (Math.ceil(side) - 1)), s = 1 - geo.gap;
      for (let i = 0; i < slots.length; i++) {
        const {x, y} = shellCell(i), before = moves.before[i], after = res(slots[i]);
        const p = before === after ? 1 : easeInOut(Math.max(0, Math.min(1, (t - (x + y) / span * FLIP_SPREAD) / FLIP_MS)));
        const w = s * Math.abs(Math.cos(p * Math.PI)), c = colors[p < .5 ? before : after], shine = Math.sin(p * Math.PI) * .45;
        g.fillStyle = `rgb(${c[0] + (255 - c[0]) * shine | 0},${c[1] + (255 - c[1]) * shine | 0},${c[2] + (255 - c[2]) * shine | 0})`;
        g.fillRect(x + .5 - w / 2, y + geo.gap / 2, w, s);
      }
      if (t > FLIP_SPREAD + FLIP_MS) { moves = null; paths = null; }
    } else {
      // Settled squares are batched into one path per result.
      if (!paths || bucket !== pathBucket) {
        paths = {w: new Path2D(), d: new Path2D(), l: new Path2D()}; pathBucket = bucket;
        for (let i = 0; i < settled; i++) addSquare(paths[res(slots[i])], i, geo.gap, geo.radius);
      }
      while (settled < shown && (born[settled] < 0 || now - born[settled] >= POP_MS)) { addSquare(paths[res(slots[settled])], settled, geo.gap, geo.radius); settled++; }
      for (const r of ['w', 'd', 'l']) { g.fillStyle = css(colors[r]); g.fill(paths[r]); }
      // Newly found games pop in with a brief glow, then settle into their colour.
      for (let i = settled; i < shown; i++) {
        const t = Math.max(0, Math.min(1, (now - born[i]) / POP_MS)), scale = easeOutBack(t), c = colors[res(slots[i])];
        const flash = 1 - Math.min(1, t * 1.6), mix = k => c[k] + (255 - c[k]) * flash * .75;
        const {x, y} = shellCell(i), s = (1 - geo.gap) * scale;
        const halo = s * (1 + .9 * flash);
        g.globalAlpha = .28 * flash; g.fillStyle = css(c);
        g.fillRect(x + .5 - halo / 2, y + .5 - halo / 2, halo, halo);
        g.globalAlpha = Math.min(1, t * 3); g.fillStyle = `rgb(${mix(0) | 0},${mix(1) | 0},${mix(2) | 0})`;
        g.fillRect(x + .5 - s / 2, y + .5 - s / 2, s, s);
        g.globalAlpha = 1;
      }
    }
    const mark = hover >= 0 ? hover : selected;
    if (mark >= 0 && mark < shown && !moves) {
      const {x, y} = shellCell(mark), line = Math.max(1.5, geo.cell * .08) / geo.cell;
      g.strokeStyle = css(colors.ink, .95); g.lineWidth = line;
      g.strokeRect(x + line / 2, y + line / 2, 1 - line, 1 - line);
    }
  }
  function busy(now) {
    const target = mapSide(slots.length);
    return shown < slots.length || settled < shown || !!moves || Math.abs(side - target) > .002 || (shown && now - born[shown - 1] < POP_MS);
  }
  function tick(now) {
    frame = 0; if (destroyed) return;
    const dt = Math.min(64, last ? now - last : 16); last = now;
    // Release queued games at a pace that spreads each batch over a moment.
    const queued = slots.length - shown;
    if (queued > 0) {
      const count = Math.max(1, Math.round(Math.max(queued / DRAIN_MS, MIN_RATE / 1000) * dt));
      for (let i = 0; i < count && shown < slots.length; i++) born[shown++] = now - (count - 1 - i) * dt / count;
      describe();
    }
    // The view eases outward first, opening room for the games just found.
    const target = mapSide(slots.length);
    side += (target - side) * (1 - Math.exp(-dt / 420));
    if (Math.abs(target - side) < .002) side = target;
    draw(now);
    if (busy(now)) frame = win.requestAnimationFrame(tick); else last = 0;
  }
  function schedule() {
    if (destroyed) return;
    if (!animated() || !element.clientWidth) {
      for (let i = shown; i < slots.length; i++) born[i] = -1;
      shown = settled = slots.length; side = mapSide(shown); moves = null; paths = null;
      if (colors) draw(); return;
    }
    if (!frame) frame = win.requestAnimationFrame(tick);
  }
  const date = row => row.t ? new Date(row.t * 1000).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'}) : '';
  function describe() {
    summary.textContent = `${slots.length.toLocaleString()} ${slots.length === 1 ? 'game' : 'games'}`;
    const mark = hover >= 0 ? hover : selected, row = mark >= 0 && mark < shown ? slots[mark] : null;
    open.hidden = true;
    if (!row) { detail.textContent = slots.length ? 'Point at a square to see the game.' : 'Games appear here as they arrive.'; return; }
    detail.textContent = [date(row), `vs ${row.opp || 'Opponent'}`, {w: 'Won', d: 'Drew', l: 'Lost'}[res(row)], row.cls].filter(Boolean).join(' · ');
    if (gameUrl(row)) open.hidden = false;
  }
  function label() {
    element.setAttribute('aria-label', `${slots.length.toLocaleString()} ${slots.length === 1 ? 'game' : 'games'}, one square each, oldest in the top-left corner. Green wins, silver draws, coral losses. Use arrow keys to inspect, Enter to view a game.`);
  }
  function activate() {
    const i = hover >= 0 ? hover : selected, row = slots[i];
    if (i < 0 || i >= shown || !row) return;
    const url = gameUrl(row); if (url) onOpen?.(url, row);
  }
  function pick(event) {
    const rect = element.getBoundingClientRect(); if (!rect.width) return -1;
    const geo = geometry(), scale = rect.width / (geo.width || rect.width);
    const x = Math.floor(((event.clientX - rect.left) / scale - geo.pad) / geo.cell), y = Math.floor(((event.clientY - rect.top) / scale - geo.pad) / geo.cell);
    if (x < 0 || y < 0 || x >= Math.ceil(side) || y >= Math.ceil(side)) return -1;
    const i = shellIndex(x, y);
    return i < shown ? i : -1;
  }
  element.addEventListener('pointermove', event => { const i = pick(event); if (i !== hover) { hover = i; describe(); if (!frame) draw(); } });
  element.addEventListener('pointerleave', () => { if (hover < 0) return; hover = -1; describe(); if (!frame) draw(); });
  element.addEventListener('click', event => { hover = pick(event); if (hover >= 0) { selected = hover; activate(); } });
  element.addEventListener('focus', () => { if (selected < 0 && shown) selected = 0; describe(); if (!frame) draw(); });
  element.addEventListener('blur', () => { describe(); if (!frame) draw(); });
  element.addEventListener('keydown', event => {
    if (!shown) return;
    const at = shellCell(Math.max(0, selected)), steps = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
    if (event.key in steps) {
      event.preventDefault(); event.stopPropagation();
      const [dx, dy] = steps[event.key], x = at.x + dx, y = at.y + dy;
      if (x >= 0 && y >= 0) { const i = shellIndex(x, y); if (i < shown) selected = i; }
    } else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); event.stopPropagation(); selected = event.key === 'Home' ? 0 : shown - 1; }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); hover = -1; activate(); return; }
    else return;
    hover = -1; describe(); if (!frame) draw();
  });
  const resize = typeof win?.ResizeObserver === 'function' ? new win.ResizeObserver(() => { if (!element.isConnected) return; colors || palette(); if (!frame) draw(); schedule(); }) : null;
  resize?.observe(element);

  return {
    element, caption,
    /**
     * Show `rows` (oldest first). New games join the edge of the grid; `final`
     * re-sorts streamed games into date order, each square gliding home.
     */
    update(next, {final = false} = {}) {
      if (destroyed) return;
      if (!colors && element.isConnected) palette();
      const keys = new Set(next.map(keyOf));
      if (slots.some(row => !keys.has(keyOf(row)))) {
        // A different set of games (another period or player): start over.
        slots = []; index = new Map(); born = []; shown = settled = 0; side = MIN_SIDE; moves = null; paths = null; selected = hover = -1;
      }
      for (const row of next) {
        const key = keyOf(row), at = index.get(key);
        if (at != null) slots[at] = row;
        else { index.set(key, slots.length); slots.push(row); born.push(-1); }
      }
      if (final && slots.length > 1) {
        const order = next.map(row => index.get(keyOf(row)));
        if (order.some((slot, i) => slot !== i)) {
          const before = slots.map(res), wasShown = shown;
          slots = order.map(slot => slots[slot]); index = new Map(slots.map((row, i) => [keyOf(row), i]));
          born = slots.map(() => -1); shown = settled = slots.length; side = mapSide(shown); paths = null;
          if (animated() && wasShown && slots.length <= 40000) moves = {start: win.performance?.now() || Date.now(), before};
          selected = hover = -1;
        }
      }
      label(); describe(); schedule();
    },
    destroy() { destroyed = true; if (frame) win.cancelAnimationFrame(frame); frame = 0; resize?.disconnect(); element.remove(); caption.remove(); },
  };
}
