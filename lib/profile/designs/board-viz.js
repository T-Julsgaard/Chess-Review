// Player profile designs — charts drawn on the chessboard itself. A layer sits
// over the 64 squares (which stay visible, dimmed) and paints with the grid:
// columns are stacks of lit squares, a rating line crosses the files, a share
// fills squares in reading order. Everything lives in one `.pv-layer`, so
// clearing a scene is removing that layer.
import {smoothed, SMOOTH_MIN_POINTS} from '../insights.js';
import {signatureDiagram} from './signature-diagrams.js';
const SVG = 'http://www.w3.org/2000/svg';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const signatureFormat = new Intl.NumberFormat(undefined, {maximumFractionDigits: 1});
const signatureSigned = new Intl.NumberFormat(undefined, {maximumFractionDigits: 1, signDisplay: 'exceptZero'});
const signatureValue = (value, number) => number ? signatureFormat.format(value) : `${signatureFormat.format(100 * value)}%`;
/** Milliseconds each square of a morphing column takes to fill or drain (see designs.css). */
const MORPH_STEP = 110;
/** Top edge, in squares from the board's top, of a column `height` squares tall whose lowest square is row `base` (6: rank 2). */
const barTop = (height, base = 6) => {
  const stack = Math.ceil(height - 1e-9);
  return stack ? (base + 1 - stack) + 1 - .04 - .92 * clamp(height - (stack - 1), 0, 1) : base + .96;
};
/** The rating line's draw (designs.css .pv-line-path): delay and duration in ms, and its easing curve. */
const LINE_DRAW = {delay: 150, duration: 1500, ease: [.45, .05, .25, 1]};
/** The endings ring turning to new shares: its duration in ms and easing curve. */
const PIE_TURN = {duration: 700, ease: [.3, .8, .3, 1]};
/** How far along (0–1) a CSS cubic-bezier `ease` is at `time` (0–1). */
function eased([x1, y1, x2, y2], time) {
  const bezier = (s, a, b) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3, t = clamp(time, 0, 1);
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (bezier(mid, x1, x2) < t) lo = mid; else hi = mid; }
  return bezier((lo + hi) / 2, y1, y2);
}
/** The share of the draw's time (0–1) after which `fraction` of the line is drawn. */
export function drawTime(fraction) {
  const [x1, y1, x2, y2] = LINE_DRAW.ease, f = clamp(fraction, 0, 1);
  const bezier = (s, a, b) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (bezier(mid, y1, y2) < f) lo = mid; else hi = mid; }
  return bezier((lo + hi) / 2, x1, x2);
}
/** Round values between `lo` and `hi` for a chart's side: the finest step that gives at most five. */
export function ratingTicks(lo, hi) {
  for (const step of [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]) {
    const ticks = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    if (ticks.length <= 5) return ticks;
  }
  return [];
}
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/**
 * Dates under a chart from `t0` to `t1` (seconds). Prefer calendar ticks, with
 * room at the edges, and use the endpoints when too few calendar ticks fit.
 */
export function timeTicks(t0, t1, most = 7) {
  const start = new Date(t0 * 1000), end = new Date(t1 * 1000), ticks = [];
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (months <= 24) {
    const step = [1, 2, 3, 6].find(s => months / s <= most) || 6;
    for (let d = new Date(start.getFullYear(), start.getMonth() + 1, 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1))
      if (d.getMonth() % step === 0) ticks.push({t: d.getTime() / 1000, label: MONTH_NAMES[d.getMonth()]});
  } else {
    const years = end.getFullYear() - start.getFullYear(), step = [1, 2, 5, 10].find(s => years / s <= most) || 10;
    for (let year = start.getFullYear() + 1; year <= end.getFullYear(); year++) if (year % step === 0) ticks.push({t: new Date(year, 0, 1).getTime() / 1000, label: String(year)});
  }
  const inset = (t1 - t0) * .03;
  const visible = ticks.filter(({t}) => t >= t0 + inset && t <= t1 - inset);
  if (visible.length >= Math.min(2, most)) return visible;

  const endpoints = t0 === t1 || most === 1 ? [t0] : [t0, t1];
  const options = {month: 'short', day: 'numeric'};
  if (endpoints.length === 2 && start.toDateString() === end.toDateString()) {
    Object.assign(options, {hourCycle: 'h23', hour: '2-digit', minute: '2-digit'});
    if (t1 - t0 < 60) options.second = '2-digit';
  }
  const format = new Intl.DateTimeFormat('en-US', options);
  return endpoints.map(t => ({t, label: format.format(t * 1000)}));
}
/**
 * The line's tags as laid out (in px, inside `marks`): where two overlap, the
 * later one moves to the other side of its dot. The start tag always stays put.
 */
/** Where a line dot's tag sits (in px, inside a `W` × `H` box), by the same rules as designs.css. */
function tagBox(dot, W, H) {
  const tag = dot.firstElementChild, w = tag.offsetWidth, h = tag.offsetHeight, size = dot.offsetWidth || 14;
  const cx = parseFloat(dot.style.left) / 100 * W, cy = parseFloat(dot.style.top) / 100 * H;
  const start = dot.classList.contains('pv-start'), below = start || dot.classList.contains('pv-below');
  const leftward = dot.classList.contains('pv-left'), rightward = dot.classList.contains('pv-inspect') && dot.classList.contains('pv-right');
  const left = start ? (leftward ? cx + size / 2 - w : cx - size / 2) : leftward ? cx + size / 2 - 8 - w : rightward ? cx - size / 2 : cx - w / 2;
  const top = below ? cy + size / 2 + 8 : cy - size / 2 - 8 - h;
  return {left, right: left + w, top, bottom: top + h};
}
const tagsHit = (a, b) => a.left < b.right + 4 && b.left < a.right + 4 && a.top < b.bottom + 3 && b.top < a.bottom + 3;
function untangle(marks) {
  const W = marks.offsetWidth, H = marks.offsetHeight;
  if (!W || !H) return;
  const dots = [...marks.querySelectorAll(':scope > .pv-line-dot:not(.pv-inspect)')].filter(dot => dot.firstElementChild);
  const box = dot => tagBox(dot, W, H), hit = tagsHit;
  dots.forEach((dot, i) => {
    if (dot.classList.contains('pv-start') || !dots.slice(0, i).some(other => hit(box(other), box(dot)))) return;
    dot.classList.toggle('pv-below');
    // Neither side is free: keep the original side, the clash is no worse than before.
    if (dots.slice(0, i).some(other => hit(box(other), box(dot)))) dot.classList.toggle('pv-below');
  });
}
// The running average lives with the insights, so the chapter's headline and the line agree.
export {smoothed};
/** A win score (0–100) as a colour between the loss and win tones. */
export const scoreColor = score => score == null ? 'var(--line)' : `color-mix(in oklab, var(--q-best) ${clamp(Math.round((score - 30) / 40 * 100), 0, 100)}%, var(--q-miss))`;

export function createViz(board, {doc = board.ownerDocument, motion = () => true} = {}) {
  let layer = null;
  const el = (tag, cls, text) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const svg = (tag, attrs) => { const n = doc.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  /** The old scene shrinks back into the board while the next one draws; it never blocks the new layer. */
  function clear() {
    const old = layer; layer = null; board.classList.remove('pv-scene');
    if (!old) return;
    old.cancelLineBuild?.();
    const outside = old.outside, remove = () => { old.remove(); outside?.release(); };
    if (!motion() || typeof old.animate !== 'function' || !old.isConnected) { remove(); return; }
    old.classList.add('pv-leaving'); old.style.pointerEvents = 'none';
    old.inert = true;
    // A chart of many squares (results over time) simply fades: shrinking each of its squares costs more frames than it is worth.
    const tiles = [...old.querySelectorAll('.pv-tile, .pv-bubble')];
    if (tiles.length <= 96) tiles.forEach((tile, i) => tile.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(.6)'}], {duration: 260, delay: Math.min(220, (tiles.length - i) * 4), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'}));
    const fade = old.animate([{opacity: 1}, {opacity: 0}], {duration: 420, easing: 'ease', fill: 'forwards'});
    if (outside?.isConnected) { outside.style.pointerEvents = 'none'; outside.animate([{opacity: 1}, {opacity: 0}], {duration: 300, easing: 'ease', fill: 'forwards'}); }
    fade.onfinish = remove; fade.oncancel = remove;
    // A board detached mid-fade never finishes the animation; the labels outside it must still go.
    doc.defaultView?.setTimeout(remove, 480);
  }
  /**
   * A twin of the layer that is not clipped by the board's rounded edge: labels
   * and markers that belong to the chart but may reach past the squares (a peak
   * tag near the edge, month names under the board). It sits on the board's
   * offset parent and follows the board's box.
   */
  function outside(L) {
    if (L.outside) return L.outside;
    const out = el('div', 'pv-outside');
    out.dataset.motion = L.dataset.motion; out.dataset.scene = L.dataset.scene;
    const color = L.style.getPropertyValue('--pv-c'); if (color) out.style.setProperty('--pv-c', color);
    let released = false;
    const sync = () => {
      // A frame or resize already on its way must not bring back a twin that has been released.
      const host = !released && board.isConnected ? board.offsetParent : null;
      if (!host) return;
      if (out.parentElement !== host) host.append(out);
      Object.assign(out.style, {left: board.offsetLeft + 'px', top: board.offsetTop + 'px', width: board.offsetWidth + 'px', height: board.offsetHeight + 'px'});
    };
    const view = doc.defaultView, observer = typeof view?.ResizeObserver === 'function' ? new view.ResizeObserver(sync) : null;
    observer?.observe(board);
    view?.addEventListener('resize', sync);
    out.release = () => { released = true; observer?.disconnect(); view?.removeEventListener('resize', sync); out.remove(); };
    out.sync = sync;
    L.outside = out; sync();
    // A board still waiting to be attached gets its twin as soon as it is.
    if (!out.isConnected) view?.requestAnimationFrame?.(sync);
    return out;
  }
  function open(kind, {dim = true, color = null, scene = kind} = {}) {
    clear();
    layer = el('div', 'pv-layer pv-' + kind);
    layer.dataset.motion = motion() ? 'on' : 'off';
    layer.dataset.scene = scene;
    if (color) layer.style.setProperty('--pv-c', color);
    if (dim) layer.classList.add('pv-dim');
    board.append(layer); board.classList.add('pv-scene');
    return layer;
  }
  /**
   * The layer already showing `scene` with `count` marks of `selector`, when the
   * caller asked to morph: the marks then change in place instead of redrawing.
   */
  const morphable = (morph, scene, selector, count) => morph && layer?.isConnected && layer.dataset.scene === scene && layer.querySelectorAll(selector).length === count ? layer : null;
  const at = (node, col, row, w = 1, h = 1) => { Object.assign(node.style, {left: col * 12.5 + '%', top: row * 12.5 + '%', width: w * 12.5 + '%', height: h * 12.5 + '%'}); return node; };
  function signatureValues({you, typical, number}, labeled = false) {
    const values = el('div', 'pv-sig-values');
    for (const [who, value] of [['You', you], ['Typical', typical]]) {
      const stat = el('span', who === 'You' ? 'pv-sig-you' : 'pv-sig-typical');
      stat.append(el('span', labeled ? 'pv-sig-value-label' : 'pv-diff-hidden', `${who} `), el('b', '', signatureValue(value, number)));
      values.append(stat);
    }
    return values;
  }
  function signatureLayer(mode, color, listClass) {
    const L = open(`signature-${mode}`, {color});
    L.classList.add('pv-signature-chart');
    const list = el('ul', listClass);
    list.setAttribute('aria-label', 'Your habits compared with a typical player');
    L.append(list);
    return {L, list};
  }
  function signatureKnight(you) {
    const piece = el('i', `pv-sig-knight ${you ? 'pv-sig-you' : 'pv-sig-typical'}`, you ? '♞\uFE0E' : '♘');
    piece.setAttribute('aria-hidden', 'true');
    return piece;
  }
  /**
   * Regrouping columns (the clock's "Increase granularity"): every new column
   * names the old column it belongs to (`group`). Splitting, each column of the
   * old chart cracks into slivers of its own height that slide apart to their
   * new places and then fill or drain to their own level. Closing again runs
   * the same in reverse on the old chart before the new one takes its place.
   */
  function regroupFrom(previous, L) {
    const old = previous.layer, retire = () => { old.remove(); old.outside?.release(); };
    const before = previous.columns, after = L.regroupColumns, levels = L.regroupLevels;
    if (previous.levels !== levels || !before?.length || !after?.length || typeof L.animate !== 'function') { retire(); return; }
    const splitting = after.length >= before.length, many = splitting ? after : before, few = splitting ? before : after, moving = splitting ? L : old;
    // Column `c` as one of the equal slivers of the column it splits from (or closes into).
    const sliver = c => {
      const parent = few.find(p => p.group === c.group), kin = many.filter(m => m.group === c.group);
      return parent ? {col: parent.col + kin.indexOf(c) * parent.width / kin.length, width: parent.width / kin.length, height: parent.height} : c;
    };
    const tiles = [...moving.querySelectorAll(':scope > .pv-tile')];
    old.classList.add('pv-regroup-old'); old.style.pointerEvents = 'none';
    L.classList.add('pv-regrouping');
    const wait = on => { L.classList.toggle('pv-regroup-wait', on); L.outside?.classList.toggle('pv-regroup-wait', on); };
    if (!splitting) wait(true);
    const place = (own, {col, width, height}) => own.forEach((tile, k) => {
      Object.assign(tile.style, {left: col * 12.5 + '%', width: width * 12.5 + '%'});
      tile.style.setProperty('--f', clamp(height - k, 0, 1).toFixed(3));
      const stack = Math.ceil(height - 1e-9);
      tile.classList.toggle('pv-tile-top', k === stack - 1); tile.classList.toggle('pv-tile-empty', k >= stack);
    });
    const SPREAD = 460, levelsFrom = splitting ? 300 : 0, spreadFrom = splitting ? 0 : 260;
    const plan = many.map((c, i) => ({own: tiles.slice(i * levels, i * levels + levels), start: splitting ? sliver(c) : c, end: splitting ? c : sliver(c)}));
    moving.classList.add('pv-regroup-moving');
    for (const {own, start} of plan) { own.forEach(t => { t.style.setProperty('--md', '0ms'); t.style.setProperty('--gd', spreadFrom + 'ms'); }); place(own, start); }
    void moving.offsetWidth;
    // The level moves like the time-control morph: rising squares fill bottom-up, falling ones drain top-down.
    let travel = 0;
    for (const {own, start, end} of plan) {
      const from = own.map((t, k) => clamp(start.height - k, 0, 1)), to = own.map((t, k) => clamp(end.height - k, 0, 1));
      const changed = own.map((t, k) => k).filter(k => Math.abs(from[k] - to[k]) > 1e-3), rising = end.height >= start.height;
      own.forEach((t, k) => t.style.setProperty('--md', levelsFrom + (changed.length ? Math.max(0, rising ? k - changed[0] : changed.at(-1) - k) * MORPH_STEP : 0) + 'ms'));
      travel = Math.max(travel, changed.length ? (changed.at(-1) - changed[0] + 1) * MORPH_STEP : 0);
      place(own, end);
    }
    const done = Math.max(levelsFrom + travel, spreadFrom + SPREAD);
    const fadeOut = nodes => nodes.forEach(n => n.animate([{opacity: 1}, {opacity: 0}], {duration: 180, easing: 'ease', fill: 'forwards'}));
    const words = layer => [...layer.querySelectorAll(':scope > .pv-col-value, :scope > .pv-col-label'), ...(layer.outside ? layer.outside.children : [])];
    fadeOut(words(old));
    if (splitting) {
      // The new values and labels arrive once the slivers have reached their places.
      for (const node of words(L)) node.animate([{opacity: 0}, {opacity: 1}], {duration: 320, delay: done - 120, easing: 'ease', fill: 'backwards'});
      old.animate([{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'}).onfinish = retire;
      return;
    }
    const timer = (doc.defaultView || globalThis).setTimeout(() => {
      wait(false);
      if (L.isConnected) for (const node of [...L.querySelectorAll(':scope > .pv-tile'), ...words(L)]) node.animate([{opacity: node.classList.contains('pv-tile') ? .4 : 0}, {opacity: 1}], {duration: node.classList.contains('pv-tile') ? 160 : 300, easing: 'ease'});
      retire();
    }, done + 40);
    L.cancelRegroup = () => { (doc.defaultView || globalThis).clearTimeout(timer); wait(false); retire(); };
  }

  /**
   * Every checked game, then the average they make. The games are joined in the order they were played and each draws
   * its own short line, so hundreds or thousands of segments build up across
   * the board. Once the last one is in, every point eases onto the average in a
   * wave from left to right while the scale narrows to the average's, the lines
   * thicken and brighten into one, and `done` swaps in the finished chart at
   * exactly that place. Painted on a canvas: an SVG node per game is too many.
   */
  function buildFromGames(L, series, games, smooth, done) {
    const view = doc.defaultView, canvas = el('canvas', 'pv-line-build'), ctx = canvas.getContext?.('2d');
    const pts = games.filter(p => Number.isFinite(p?.t) && Number.isFinite(p?.r)).sort((a, b) => a.t - b.t), n = pts.length;
    if (!ctx || n < 2) { done(); return; }
    canvas.setAttribute('aria-hidden', 'true'); L.append(canvas);
    // The finished chart's frame (line() below): the scale fits the average, with the same padding.
    const trend = smooth && series.length > SMOOTH_MIN_POINTS ? smoothed(series) : series;
    const lo = Math.min(...trend.map(p => p.r)), hi = Math.max(...trend.map(p => p.r)), pad = Math.max(8, (hi - lo) * .14);
    const end = {min: lo - pad, max: hi + pad};
    // While the games draw, the scale is wide enough for the best and the worst of them.
    const start = {min: Math.min(end.min, Math.min(...pts.map(p => p.r)) - 4), max: Math.max(end.max, Math.max(...pts.map(p => p.r)) + 4)};
    const t0 = series[0].t, t1 = series.at(-1).t, xs = pts.map(p => clamp(t1 > t0 ? (p.t - t0) / (t1 - t0) : .5, 0, 1));
    // Where the average runs at each game's moment: the point it merges into.
    const avgAt = t => {
      if (t <= trend[0].t) return trend[0].r;
      if (t >= trend.at(-1).t) return trend.at(-1).r;
      let a = 0, b = trend.length - 1;
      while (b - a > 1) { const mid = (a + b) >> 1; if (trend[mid].t <= t) a = mid; else b = mid; }
      return trend[a].r + (trend[b].r - trend[a].r) * (t - trend[a].t) / ((trend[b].t - trend[a].t) || 1);
    };
    const goal = pts.map(p => avgAt(p.t));
    const DRAW = clamp(360 + n * .2, 400, 540), GROW = 80, MERGE = 280, total = DRAW + GROW + MERGE;
    const visible = clamp(9 / Math.sqrt(n), .52, .82), ease = s => s < .5 ? 4 * s * s * s : 1 - (-2 * s + 2) ** 3 / 2;
    const lerp = (a, b, k) => a + (b - a) * k;
    let begun = null, frame = 0, finished = false, color = '', W = 0, H = 0, timer = 0;
    const cancel = () => { finished = true; view.cancelAnimationFrame(frame); view.clearTimeout(timer); delete L.cancelLineBuild; };
    const finish = () => { if (!finished) { cancel(); done(); } };
    L.cancelLineBuild = cancel;
    // A hidden tab pauses frames: the chapter still gets its finished chart.
    timer = view.setTimeout(finish, total + 2000);
    const paint = now => {
      if (finished) return;
      const w = L.clientWidth, h = L.clientHeight;
      if (!canvas.isConnected || !w || !h) { frame = view.requestAnimationFrame(paint); return; }
      begun ??= now;
      const ms = now - begun, dpr = view.devicePixelRatio || 1;
      if (w !== W || h !== H) { W = w; H = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      color ||= view.getComputedStyle(canvas).color;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = color; ctx.lineCap = ctx.lineJoin = 'round';
      const merge = clamp((ms - DRAW - GROW) / MERGE, 0, 1), zoom = ease(merge);
      const min = lerp(start.min, end.min, zoom), max = lerp(start.max, end.max, zoom);
      const X = i => W * xs[i], Y = r => H * (92 - 80 * (r - min) / (max - min)) / 100;
      // Each point leaves for the average a little after the one to its left.
      const pull = i => merge <= 0 ? 0 : ease(clamp((merge - .35 * xs[i]) / .65, 0, 1));
      const ys = pts.map((p, i) => Y(lerp(p.r, goal[i], pull(i))));
      // Game i appears at appear(i) and draws its line from the game before it.
      const appear = i => DRAW * Math.sqrt(i / (n - 1)) ** 1.6;
      // The finished chart's line: .7 and 2.6 units of a 100-unit board (designs.css .pv-line-path, .pv-line-glow).
      const thin = lerp(1.6, .007 * W, zoom);
      if (zoom > 0) {
        ctx.globalAlpha = .22 * zoom; ctx.lineWidth = .026 * W * zoom;
        ctx.beginPath(); pts.forEach((_, i) => i ? ctx.lineTo(X(i), ys[i]) : ctx.moveTo(X(i), ys[i])); ctx.stroke();
      }
      ctx.lineWidth = thin;
      for (let i = 1; i < n; i++) {
        const age = ms - appear(i);
        if (age < 0) break;
        const grow = clamp(age / GROW, 0, 1);
        const k = Math.max(pull(i - 1), pull(i));
        ctx.globalAlpha = lerp(visible, 1, k);
        ctx.beginPath(); ctx.moveTo(X(i - 1), ys[i - 1]);
        ctx.lineTo(lerp(X(i - 1), X(i), grow), lerp(ys[i - 1], ys[i], grow)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (ms >= total) { finish(); return; }
      frame = view.requestAnimationFrame(paint);
    };
    frame = view.requestAnimationFrame(paint);
  }
  const api = {
    clear, get layer() { return layer; },
    /**
     * Columns of lit squares over ranks 7–2; labels sit on rank 1. Eight or fewer
     * columns take one file each; more share the board's width, so a whole period fits.
     * With `floor`, the columns stand on the board's bottom edge (ranks 1–7) and
     * their labels sit just outside the board, under it.
     */
    columns(columns, {max = null, unit = '', color: tint = null, compactLabels = false, plainLabels = false, morph = false, floor = false, regroup = false} = {}) {
      const cols = columns.slice(-24), width = cols.length > 8 ? 8 / cols.length : 1, offset = cols.length > 8 ? 0 : Math.floor((8 - cols.length) / 2);
      const top = Math.max(1, max ?? Math.max(...cols.map(c => c.value || 0)));
      // With `regroup`, the chart on the board stays for the split (regroupFrom) instead of leaving.
      layer?.cancelRegroup?.();
      const previous = regroup && motion() && layer?.isConnected && layer.regroupColumns ? {layer, columns: layer.regroupColumns, levels: layer.regroupLevels} : null;
      if (previous) layer = null;
      // Every column owns its squares (six, or seven on the floor; empty ones have no height), so a column can grow or shrink in place.
      const levels = floor ? 7 : 6, base = levels;
      const kept = morphable(morph, 'columns', '.pv-tile', cols.length * levels);
      const L = kept || open('columns', {color: tint});
      if (kept && tint) L.style.setProperty('--pv-c', tint);
      if (width < 1) L.classList.add('pv-columns-dense');
      const below = floor ? outside(L) : null;
      if (below) { below.classList.toggle('pv-columns-dense', width < 1); below.classList.add('pv-columns-below'); }
      const step = Math.min(70, 560 / cols.length);
      const tiles = kept ? [...L.querySelectorAll('.pv-tile')] : null, values = kept ? [...L.querySelectorAll('.pv-col-value')] : null, labels = kept ? [...(below || L).querySelectorAll('.pv-col-label')] : null;
      cols.forEach((column, i) => {
        const col = offset + i * width, height = levels * (column.value || 0) / top, color = column.color || scoreColor(column.tone);
        const stack = Math.ceil(height - 1e-9);
        // In a morph the level moves like a liquid: a rising column fills its squares
        // from the bottom up, a falling one drains them from the top down.
        let travel = 0;
        if (kept) {
          const own = tiles.slice(i * levels, i * levels + levels), from = own.map(t => Number(t.style.getPropertyValue('--f')) || 0), to = own.map((t, k) => clamp(height - k, 0, 1));
          const changed = own.map((t, k) => k).filter(k => Math.abs(from[k] - to[k]) > 1e-3);
          const rising = to.reduce((s, v) => s + v, 0) >= from.reduce((s, v) => s + v, 0);
          own.forEach((t, k) => t.style.setProperty('--md', changed.length ? Math.max(0, rising ? k - changed[0] : changed.at(-1) - k) * MORPH_STEP + 'ms' : '0ms'));
          travel = changed.length ? (changed.at(-1) - changed[0] + 1) * MORPH_STEP : 0;
        }
        for (let k = 0; k < levels; k++) {
          const tile = kept ? tiles[i * levels + k] : at(el('span', 'pv-tile'), col, base - k, width);
          tile.style.setProperty('--f', clamp(height - k, 0, 1).toFixed(3));
          tile.style.setProperty('--c', color);
          if (!kept) tile.style.setProperty('--d', (i * step + k * 55) + 'ms');
          tile.classList.toggle('pv-tile-top', k === stack - 1);
          tile.classList.toggle('pv-tile-empty', k >= stack);
          if (column.detail) tile.title = column.detail; else tile.removeAttribute('title');
          if (!kept) L.append(tile);
        }
        // The value sits just above the bar's real top, including a partly filled last square.
        const value = kept ? values[i] : el('span', 'pv-col-value');
        value.textContent = column.display ?? String(column.value ?? '') + unit;
        Object.assign(value.style, {left: col * 12.5 + '%', width: width * 12.5 + '%', top: barTop(height, base) * 12.5 + '%'});
        if (!kept) value.style.setProperty('--d', (i * step + stack * 55 + 120) + 'ms');
        else Object.assign(value.style, {transitionDuration: travel + 'ms', transitionTimingFunction: 'linear'});
        const label = kept ? labels[i] : below ? el('span', 'pv-col-label pv-col-below' + (plainLabels ? ' pv-col-plain' : '')) : at(el('span', 'pv-col-label' + (plainLabels ? ' pv-col-plain' : '')), col, 7, width);
        label.textContent = column.label;
        if (below && !kept) { Object.assign(label.style, {left: col * 12.5 + '%', width: width * 12.5 + '%'}); label.style.setProperty('--d', (i * step) + 'ms'); }
        else if (compactLabels && !below) { label.style.height = '5%'; label.style.top = '87.5%'; }
        for (const node of [label, value]) if (column.detail) node.title = column.detail; else node.removeAttribute('title');
        if (!kept) { L.append(value); (below || L).append(label); }
      });
      L.regroupColumns = cols.map((column, i) => ({group: column.group ?? i, col: offset + i * width, width, height: levels * (column.value || 0) / top}));
      L.regroupLevels = levels;
      if (previous) regroupFrom(previous, L);
      return L;
    },
    /**
     * Results by opponent rating: every column is the whole height of the board,
     * its eight squares lit loss-coral from the bottom, then draw-silver, then
     * win-green, each square painted with the part of the column it covers. A
     * column with few games is fainter; an empty one stays dark. Labels sit under the board.
     */
    results(columns, {label = 'Results by opponent rating.'} = {}) {
      const L = open('columns', {scene: 'results'});
      L.classList.add('pv-results');
      const cols = columns.slice(0, 24), width = cols.length > 8 ? 8 / cols.length : 1, offset = cols.length > 8 ? 0 : Math.floor((8 - cols.length) / 2);
      if (width < 1) L.classList.add('pv-columns-dense');
      const below = outside(L);
      below.classList.add('pv-columns-below'); below.classList.toggle('pv-columns-dense', width < 1);
      const step = Math.min(70, 560 / cols.length);
      const tones = [['l', 'var(--q-miss)'], ['d', 'var(--pv-draw)'], ['w', 'var(--q-best)']];
      cols.forEach((column, i) => {
        const col = offset + i * width;
        if (column.games) {
          // Where each result ends, as a share of the column from the bottom.
          let sum = 0; const ends = tones.map(([key]) => (sum += column[key] || 0));
          for (let k = 0; k < 8; k++) {
            const local = v => (clamp((v - k / 8) * 8, 0, 1) * 100).toFixed(1) + '%';
            const stops = tones.map(([, c], j) => `${c} ${local(j ? ends[j - 1] : 0)} ${local(ends[j])}`).join(', ');
            const tile = at(el('span', 'pv-tile pv-tile-result'), col, 7 - k, width);
            tile.style.setProperty('--g', `linear-gradient(to top, ${stops})`);
            tile.style.setProperty('--c', tones[ends.findIndex(e => e > (k + .5) / 8)]?.[1] || tones[2][1]);
            tile.style.setProperty('--d', (i * step + k * (width < 1 ? 14 : 40)) + 'ms');
            if (column.games < 5) tile.style.opacity = String(.35 + .13 * column.games);
            if (k === 7) tile.classList.add('pv-tile-top');
            if (column.detail) tile.title = column.detail;
            L.append(tile);
          }
        }
        if (column.label) {
          const label = el('span', 'pv-col-label pv-col-below pv-col-plain', column.label);
          Object.assign(label.style, {left: col * 12.5 + '%', width: width * 12.5 + '%'});
          label.style.setProperty('--d', (i * step) + 'ms');
          if (column.detail) label.title = column.detail;
          below.append(label);
        }
      });
      // Every column is all of its games, so the board's height reads as a share: 0% at the bottom edge, 100% at the top.
      for (const pct of [0, 25, 50, 75, 100]) {
        const tick = el('span', 'pv-axis-tick', pct + '%');
        tick.style.top = (100 - pct) + '%';
        tick.style.setProperty('--d', (120 + pct * 3) + 'ms');
        below.append(tick);
      }
      below.classList.add('pv-has-axis');
      L.setAttribute('role', 'img');
      L.setAttribute('aria-label', label + ' ' + cols.filter(c => c.games).map(c => c.detail).join(' '));
      return L;
    },
    /**
     * You against a typical player: per metric a pair of columns (yours tinted,
     * typical grey), each metric scaled to its own range. Up to four metrics.
     */
    pairs(items, {color: tint = null, floor = true} = {}) {
      const L = open('columns', {color: tint, scene: 'pairs'});
      L.classList.add('pv-pairs');
      // On the floor (the default) the pairs stand on the board's bottom edge and their names sit under the board.
      const below = floor ? outside(L) : null, levels = floor ? 7 : 6;
      below?.classList.add('pv-columns-below');
      const list = items.slice(0, 4), offset = 4 - list.length;
      list.forEach((item, i) => {
        const top = Math.max(item.you, item.typical, 1e-9) * 1.12;
        [[item.you, 'var(--pv-c, var(--accent))', item.youText], [item.typical, 'color-mix(in srgb, var(--ink) 34%, transparent)', item.typicalText]].forEach(([v, c, text], j) => {
          const col = offset + i * 2 + j, height = levels * v / top, stack = Math.ceil(height - 1e-9);
          for (let k = 0; k < stack; k++) {
            const tile = at(el('span', 'pv-tile'), col, levels - k);
            tile.style.setProperty('--f', clamp(height - k, 0, 1).toFixed(3));
            tile.style.setProperty('--c', c);
            tile.style.setProperty('--d', (i * 140 + j * 60 + k * 50) + 'ms');
            if (k === stack - 1) tile.classList.add('pv-tile-top');
            tile.title = `${item.label}: ${j ? 'typical' : 'you'} ${text}`;
            L.append(tile);
          }
          const value = el('span', 'pv-col-value' + (j ? ' pv-muted' : ''), text);
          Object.assign(value.style, {left: col * 12.5 + '%', width: '12.5%', top: barTop(height, levels) * 12.5 + '%'});
          value.style.setProperty('--d', (i * 140 + j * 60 + stack * 50 + 120) + 'ms');
          L.append(value);
        });
        const name = item.short || item.label;
        const label = below ? el('span', 'pv-col-label pv-col-below pv-pair-label', name) : at(el('span', 'pv-col-label pv-pair-label', name), offset + i * 2, 7, 2);
        if (below) { Object.assign(label.style, {left: (offset + i * 2) * 12.5 + '%', width: '25%'}); label.style.setProperty('--d', (i * 140) + 'ms'); }
        label.title = item.label;
        (below || L).append(label);
      });
      return L;
    },
    /** Your value and the typical value joined by the difference between them. */
    differences(items, {color = null} = {}) {
      const L = open('differences', {color});
      const key = el('div', 'pv-diff-key'), list = el('ul', 'pv-diff-list');
      key.append(el('span', 'pv-diff-you', 'You'), el('span', 'pv-diff-typical', 'Typical'));
      list.setAttribute('aria-label', 'Your habits compared with a typical player');
      for (const {label, you, typical, number} of items) {
        const row = el('li', 'pv-diff-row'), heading = el('div', 'pv-diff-heading'), track = el('div', 'pv-diff-track'), values = el('div', 'pv-diff-values');
        const max = Math.max(number ? 0 : 1, you, typical) || 1;
        row.style.setProperty('--you', `${100 * you / max}%`);
        row.style.setProperty('--typical', `${100 * typical / max}%`);
        const delta = (you - typical) * (number ? 1 : 100);
        const difference = el('span', 'pv-diff-gap', `${signatureSigned.format(delta)}${number ? '' : ' pp'}`);
        difference.title = `${signatureSigned.format(delta)}${number ? ' per game' : ' percentage points'}`;
        heading.append(el('strong', '', label), difference);
        track.setAttribute('aria-hidden', 'true');
        track.append(el('i', 'pv-diff-link'), el('i', 'pv-diff-typical'), el('i', 'pv-diff-you'));
        for (const [who, value] of [['You', you], ['Typical', typical]]) {
          const marker = el('span', 'pv-diff-' + who.toLowerCase(), signatureValue(value, number));
          marker.prepend(el('span', 'pv-diff-hidden', `${who}: `));
          values.append(marker);
        }
        row.append(heading, track, values); list.append(row);
      }
      L.append(key, list);
      return L;
    },
    /** Align every benchmark on the line between the d- and e-files. */
    signatureCentered(items, {color = null} = {}) {
      const {L, list} = signatureLayer('centered', color, 'pv-sig-rows');
      const key = el('div', 'pv-sig-key');
      key.append(el('span', '', 'Less'), el('b', '', 'Typical'), el('span', '', 'More'));
      const axis = el('i', 'pv-sig-centerline');
      axis.setAttribute('aria-hidden', 'true');
      L.prepend(axis, key);
      // Percentage-point gaps and counts per game each have their own scale.
      const maxGap = number => Math.max(number ? 1 : .1, ...items.filter(item => item.number === number).map(item => Math.abs(item.you - item.typical)));
      const rateGap = maxGap(false), countGap = maxGap(true);
      for (const item of items) {
        const {label, you, typical, number} = item, delta = you - typical;
        const row = el('li', 'pv-sig-row'), track = el('div', 'pv-sig-track');
        const value = signatureSigned.format(delta * (number ? 1 : 100));
        const gap = el('span', 'pv-sig-gap pv-sig-you', `${value}${number ? ' / game' : ' pp'}`);
        if (!number) gap.title = `${value} percentage points`;
        const heading = el('div', 'pv-sig-heading');
        heading.append(el('strong', '', label), gap);
        track.style.setProperty('--you', `${50 + 50 * delta / (number ? countGap : rateGap)}%`);
        track.style.setProperty('--typical', '50%');
        track.setAttribute('aria-hidden', 'true');
        track.append(el('i', 'pv-sig-link'), el('i', 'pv-sig-dot'));
        row.append(heading, track, signatureValues(item, true));
        list.append(row);
      }
      return L;
    },
    /** Plot the two values across the files with distinct filled and outlined markers. */
    signaturePieces(items, {color = null} = {}) {
      const {L, list} = signatureLayer('pieces', color, 'pv-sig-rows');
      const key = el('div', 'pv-sig-key');
      for (const [who, you] of [['You', true], ['Typical', false]]) {
        const label = el('span', you ? 'pv-sig-you' : 'pv-sig-typical');
        label.append(signatureKnight(you), doc.createTextNode(who));
        key.append(label);
      }
      L.prepend(key);
      for (const item of items) {
        const {label, you, typical, number} = item;
        const row = el('li', 'pv-sig-row'), heading = el('div', 'pv-sig-heading'), track = el('div', 'pv-sig-track');
        const max = number ? Math.ceil(Math.max(you, typical, 1)) : Math.max(1, you, typical);
        heading.append(el('strong', '', label), signatureValues(item));
        track.style.setProperty('--you', `${100 * you / max}%`);
        track.style.setProperty('--typical', `${100 * typical / max}%`);
        track.setAttribute('aria-hidden', 'true');
        track.append(el('i', 'pv-sig-link'), signatureKnight(false), signatureKnight(true));
        row.append(heading, track);
        list.append(row);
      }
      return L;
    },
    signatureCards(items, {color = null} = {}) {
      const {L, list} = signatureLayer('cards', color, 'pv-sig-cards');
      for (const item of items) {
        const card = el('li', 'pv-sig-card'), diagram = signatureDiagram(doc, item.id);
        card.append(el('strong', '', item.label));
        if (diagram) card.append(diagram);
        card.append(signatureValues(item, true));
        list.append(card);
      }
      return L;
    },
    /**
     * Weekday × time of day: one dot per cell, its size the number of games and
     * its colour the win rate. Day names take the a-file, the time blocks files b–h
     * and are labelled on rank 1 ("06:00" over "09:00").
     */
    bubbles(matrix, {days = [], bands = [], color: tint = null, morph = false} = {}) {
      const order = [1, 2, 3, 4, 5, 6, 0], cols = matrix[0]?.length || 7, width = 7 / cols;
      const max = Math.max(1, ...matrix.flat().map(c => c.g));
      // Switching time control keeps the dots: they grow, shrink and recolour in place.
      const kept = morphable(morph, 'bubbles', '.pv-bubble', 7 * cols);
      const L = kept || open('bubbles', {color: tint});
      if (kept && tint) L.style.setProperty('--pv-c', tint);
      const dots = kept ? [...L.querySelectorAll('.pv-bubble')] : null;
      order.forEach((day, row) => {
        if (!kept) L.append(at(el('span', 'pv-bubble-day', days[day] || ''), 0, row));
        matrix[day].forEach((cell, band) => {
          const node = kept ? dots[row * cols + band] : at(el('span', 'pv-bubble'), 1 + band * width, row, width);
          const size = cell.g ? .28 + .72 * Math.sqrt(cell.g / max) : 0;
          node.style.setProperty('--s', size.toFixed(3));
          node.style.setProperty('--c', cell.g ? scoreColor(100 * (cell.w + (cell.d || 0) / 2) / cell.g) : 'transparent');
          if (!kept) node.style.setProperty('--d', (row * 45 + band * 30) + 'ms');
          const [from, to] = String(bands[band] || '').split('–');
          node.title = `${days[day]} ${from ? `${from}:00–${to}:00` : ''}: ${cell.g} ${cell.g === 1 ? 'game' : 'games'}${cell.g ? `, ${Math.round(100 * cell.w / cell.g)}% win rate` : ''}`;
          if (!kept) L.append(node);
        });
      });
      if (!kept) bands.forEach((label, band) => {
        const [from, to] = label.split('–'), tag = at(el('span', 'pv-col-label pv-bubble-band'), 1 + band * width, 7, width);
        tag.append(el('b', '', from + ':00'), el('small', '', '–' + to + ':00'));
        tag.title = `${from}:00–${to}:00`;
        L.append(tag);
      });
      return L;
    },
    /**
     * A line across the board, the files as time and the ranks as rating. With
     * `smooth`, the line is the running average of the points (each weighted by
     * its games, `n`), and hovering reads that average. With `live` (an accuracy
     * check still running) the board shows every point as a thin line instead,
     * redrawn in place without the draw animation each time new points arrive
     * (`morph`); the average takes over once the check stops.
     *
     * `extra` adds more lines on the same axes ([{series, color, name}], e.g. the
     * Lichess rating beside the Chess.com one), drawn like the main one with
     * their own peak; the axes span all of them, and a key under the board
     * (the scene's legend) names them. With `axes`, round values stand left of
     * the board and calendar ticks or endpoint dates under it.
     */
    line(series, options = {}) {
      const {peak = null, label = '', name = null, tag = true, color = null, unit = '', smooth = false, live = false, morph = false, extra = [], axes = false, games = null, settled = false, into = null, empty = false} = options;
      // No checked games yet: a level line across the dimmed board. Redrawn on the same chapter it stays as it is,
      // and the check's first games replace it in place (`live`), so the board never fades out and back between them.
      if (empty) {
        const same = morph && layer?.isConnected && layer.dataset.scene === 'line' && layer.dataset.empty === 'on' ? layer : null;
        if (same) { if (live) same.dataset.live = 'on'; else delete same.dataset.live; return same; }
        const L = open('line', {color});
        L.dataset.empty = 'on';
        if (live) L.dataset.live = 'on';
        L.classList.toggle('pv-line-settled', settled);
        const chart = svg('svg', {viewBox: '0 0 100 100', preserveAspectRatio: 'none', class: 'pv-line-svg', 'aria-hidden': 'true'});
        chart.append(svg('path', {d: 'M0 52 L100 52', class: 'pv-line-path pv-line-glow', pathLength: '1'}), svg('path', {d: 'M0 52 L100 52', class: 'pv-line-path', pathLength: '1'}));
        L.append(chart);
        L.setAttribute('role', 'img'); L.setAttribute('aria-label', `${label || 'Chart'}: no checked games yet.`);
        return L;
      }
      // Every checked game first, then the average they make (buildFromGames); the chart itself follows on the same layer.
      if (games?.length >= 2 && series?.length && !live && !settled && !into && motion() && typeof doc.defaultView?.requestAnimationFrame === 'function') {
        const L = open('line', {color});
        buildFromGames(L, series, games, smooth, () => this.line(series, {...options, games: null, settled: true, into: L}));
        return L;
      }
      const kept = into || (morph && layer?.isConnected && layer.dataset.scene === 'line' && (settled || live && (layer.dataset.live === 'on' || layer.dataset.empty === 'on')) ? layer : null);
      if (kept) {
        kept.cancelLineBuild?.(); kept.outside?.release(); kept.outside = null; kept.replaceChildren(); if (color) kept.style.setProperty('--pv-c', color);
        delete kept.dataset.empty; kept.removeAttribute('aria-label');
      }
      const L = kept || open('line', {color});
      if (live) L.dataset.live = 'on'; else delete L.dataset.live;
      L.classList.toggle('pv-line-live', live);
      L.classList.toggle('pv-line-settled', settled);
      if (!series?.length) return L;
      const trend = !live && smooth && series.length > SMOOTH_MIN_POINTS ? smoothed(series) : series;
      const others = live ? [] : (extra || []).filter(e => e?.series?.length >= 2);
      const drawn = [trend, ...others.map(e => e.series)];
      // The scale fits what is drawn: the average spans a narrower band than the days it averages.
      const lo = Math.min(...drawn.map(list => list.reduce((v, p) => Math.min(v, p.r), Infinity))), hi = Math.max(...drawn.map(list => list.reduce((v, p) => Math.max(v, p.r), -Infinity))), pad = Math.max(8, (hi - lo) * .14);
      const min = lo - pad, max = hi + pad, t0 = Math.min(series[0].t, ...others.map(e => e.series[0].t)), t1 = Math.max(series.at(-1).t, ...others.map(e => e.series.at(-1).t));
      const x = t => 100 * (t1 > t0 ? (t - t0) / (t1 - t0) : .5), y = r => 92 - 80 * (r - min) / (max - min);
      const chart = svg('svg', {viewBox: '0 0 100 100', preserveAspectRatio: 'none', class: 'pv-line-svg', 'aria-hidden': 'true'});
      const pathOf = list => list.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(2) + ' ' + y(p.r).toFixed(2)).join(' ');
      const d = pathOf(trend);
      if (live) chart.append(svg('path', {d, class: 'pv-line-path pv-line-raw', pathLength: '1'}));
      else {
        const defs = svg('defs', {}); chart.append(defs);
        // Every line is drawn the same way: a soft area under it, a glow, the line itself.
        const draw = (list, stroke, opacity, extraClass = '') => {
          const id = 'pvg' + Math.random().toString(36).slice(2, 8), path = pathOf(list);
          const grad = svg('linearGradient', {id, x1: 0, y1: 0, x2: 0, y2: 1});
          grad.append(svg('stop', {offset: '0', class: 'pv-stop', 'stop-opacity': opacity}), svg('stop', {offset: '1', class: 'pv-stop', 'stop-opacity': '0'}));
          defs.append(grad);
          const parts = [svg('path', {d: `${path} L${x(list.at(-1).t).toFixed(2)} 100 L${x(list[0].t).toFixed(2)} 100 Z`, fill: `url(#${id})`, class: 'pv-line-area'}),
            svg('path', {d: path, class: 'pv-line-path pv-line-glow' + extraClass, pathLength: '1'}), svg('path', {d: path, class: 'pv-line-path' + extraClass, pathLength: '1'})];
          if (stroke) { grad.querySelectorAll('stop').forEach(stop => { stop.style.stopColor = stroke; }); parts.slice(1).forEach(part => { part.style.stroke = stroke; }); }
          chart.append(...parts);
        };
        // The other lines go under the main one, in their own colour, their area a little fainter.
        for (const other of others) draw(other.series, other.color, '.22', ' pv-line-alt');
        draw(trend, null, '.45');
      }
      L.append(chart);
      // Markers live outside the board's clip, so a tag near the edge reads in full.
      const marks = outside(L);
      if (live) marks.classList.add('pv-line-live');
      // The average is ready after the merge or a time-control change.
      if (settled) marks.classList.add('pv-line-settled');
      // Each marker appears as the line reaches it, never ahead of the drawing.
      const reachOf = list => {
        const lengths = [0];
        for (let i = 1; i < list.length; i++) lengths.push(lengths[i - 1] + Math.hypot(x(list[i].t) - x(list[i - 1].t), y(list[i].r) - y(list[i - 1].r)));
        const total = lengths.at(-1) || 1;
        return t => {
          let i = 0; while (i < list.length - 1 && list[i + 1].t <= t) i++;
          return LINE_DRAW.delay + LINE_DRAW.duration * drawTime(lengths[i] / total);
        };
      };
      const reach = reachOf(trend);
      const mark = (p, cls, text, at) => {
        const dot = el('span', 'pv-line-dot ' + cls); Object.assign(dot.style, {left: x(p.t) + '%', top: y(p.r) + '%'});
        if (at != null) dot.style.animationDelay = Math.round(at) + 'ms';
        const tag = el('span', 'pv-line-tag', text); dot.append(tag);
        if (x(p.t) > 70) dot.classList.add('pv-left');
        marks.append(dot);
        return dot;
      };
      // A live line is still changing: no start and end tags until its average is drawn.
      if (!live) {
        mark(trend[0], 'pv-start', String(trend[0].r) + unit);
        if (peak && peak.t !== series.at(-1).t) mark(peak, 'pv-peak', `Peak ${peak.r}${unit}`, reach(peak.t));
        const end = mark(trend.at(-1), 'pv-end', String(trend.at(-1).r) + unit, LINE_DRAW.delay + LINE_DRAW.duration);
        // Each other line has its own peak and end tag; the lower of two ends that would collide puts its tag under the dot.
        for (const other of others) {
          const list = other.series, top = list.reduce((best, p) => p.r > best.r ? p : best, list[0]);
          if (top !== list.at(-1)) mark(top, 'pv-peak pv-alt', `Peak ${top.r}${unit}`, reachOf(list)(top.t));
          const p = list.at(-1), dot = mark(p, 'pv-end pv-alt', String(p.r) + unit, LINE_DRAW.delay + LINE_DRAW.duration);
          if (other.color) dot.style.setProperty('--pv-c', other.color);
          const mainY = y(trend.at(-1).r), altY = y(p.r);
          if (Math.abs(x(p.t) - x(trend.at(-1).t)) < 30 && Math.abs(altY - mainY) < 12) (altY >= mainY ? dot : end).classList.add('pv-below');
        }
        if (axes) {
          // Round values left of the board, each with a faint guide across it: about four of them.
          const ratingAt = top => min + (92 - top) / 80 * (max - min);
          ratingTicks(ratingAt(96), ratingAt(6)).forEach((value, i) => {
            const tick = el('span', 'pv-axis-tick', String(value) + unit);
            tick.style.top = y(value) + '%'; tick.style.setProperty('--d', (120 + i * 60) + 'ms');
            marks.append(tick);
            const guide = el('span', 'pv-line-grid'); guide.style.top = y(value) + '%';
            L.prepend(guide);
          });
          // Endpoint labels sit inside the board's width, with the tick still at the edge.
          for (const [i, tick] of timeTicks(t0, t1).entries()) {
            const left = x(tick.t);
            const label = el('span', 'pv-axis-x', tick.label);
            label.style.left = left + '%'; label.style.setProperty('--d', (200 + i * 40) + 'ms');
            if (left === 0 || left === 100) label.style.setProperty('--pv-axis-anchor', left + '%');
            marks.append(label);
          }
          marks.classList.add('pv-columns-below', 'pv-has-axis');
        }
        // Tags that still overlap once laid out (a peak beside an end, two peaks) move the later one to the other side of its dot.
        doc.defaultView?.requestAnimationFrame?.(() => untangle(marks));
      }
      // `tag: false` keeps the label for screen readers only (the rating chapter already names its time control).
      if (label && tag) L.append(el('span', 'pv-line-label', label));
      const cursor = el('span', 'pv-line-cursor'), multiple = others.length > 0;
      // Hovering puts a dot on every line, each with its own tag above it: that line's rating there and the day it was played.
      const inspected = [{series: trend, name, color}, ...others].map(entry => {
        const dot = el('span', 'pv-line-dot pv-inspect'), tag = el('span', 'pv-line-tag');
        if (entry.color) dot.style.setProperty('--pv-c', entry.color);
        dot.append(tag); marks.append(dot);
        return {...entry, dot, tag};
      });
      L.append(cursor);
      const show = on => { cursor.hidden = !on; inspected.forEach(({dot}) => { dot.hidden = !on; }); };
      // Two lines' tags that would cover each other: the lower line's goes under its dot.
      const separate = () => {
        const W = marks.offsetWidth, H = marks.offsetHeight, placed = [];
        const byHeight = [...inspected].sort((a, b) => parseFloat(a.dot.style.top) - parseFloat(b.dot.style.top));
        for (const {dot} of byHeight) {
          dot.classList.remove('pv-below');
          // Unmeasured (not laid out yet), tags count as close within about a tag's size of each other.
          const near = W && H ? placed.some(other => tagsHit(tagBox(other, W, H), tagBox(dot, W, H)))
            : placed.some(other => Math.abs(parseFloat(other.style.left) - parseFloat(dot.style.left)) < 30 && Math.abs(parseFloat(other.style.top) - parseFloat(dot.style.top)) < 12);
          if (near) dot.classList.add('pv-below');
          placed.push(dot);
        }
      };
      show(false);
      const timeline = multiple ? [...new Set(drawn.flatMap(list => list.map(p => p.t)))].sort((a, b) => a - b).map(t => ({t})) : trend;
      const closestIndex = (list, t) => {
        let low = 0, high = list.length - 1;
        while (low < high) { const mid = (low + high) >> 1; if (list[mid].t < t) low = mid + 1; else high = mid; }
        return low > 0 && t - list[low - 1].t < list[low].t - t ? low - 1 : low;
      };
      L.tabIndex = 0; L.setAttribute('role', 'group');
      L.setAttribute('aria-label', `${label || 'Chart'}, ${timeline.length} points. Hover or use arrow keys to inspect.`);
      // Hovering reads the line that is drawn: the average once it is smoothed, each day while live.
      const averaged = trend !== series;
      let selected = 0;
      const inspect = (i, at) => {
        selected = clamp(i, 0, timeline.length - 1);
        const t = at ?? timeline[selected].t;
        cursor.style.left = x(t) + '%';
        const details = inspected.map(({series, dot, tag, name}) => {
          const p = multiple ? series[closestIndex(series, t)] : series[selected], px = x(p.t);
          dot.style.left = px + '%'; dot.style.top = y(p.r) + '%';
          dot.classList.toggle('pv-left', px > 65); dot.classList.toggle('pv-right', px < 35);
          const date = new Date(p.t * 1000).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
          if (multiple) {
            tag.textContent = `${date} · ${p.r}${unit}`;
            return `${name}: ${p.r}${unit} on ${date}`;
          }
          tag.textContent = averaged ? `${date} · ${p.r}${unit} average` : `${date} · ${p.r}${unit}${smooth && p.n ? ` · ${p.n} ${p.n === 1 ? 'game' : 'games'}` : ''}`;
          return tag.textContent;
        });
        show(true);
        if (multiple) separate();
        L.setAttribute('aria-label', `${label || 'Chart'}: ${details.join('; ')}. Point ${selected + 1} of ${timeline.length}.`);
      };
      const pointAt = event => {
        const rect = L.getBoundingClientRect(); if (!rect.width) return;
        // Remembered so a redraw under a still pointer (the live check) reads the same spot again.
        L.linePointer = event.clientX;
        const t = t0 + clamp((event.clientX - rect.left) / rect.width, 0, 1) * (t1 - t0);
        inspect(closestIndex(timeline, t), multiple ? t : undefined);
      };
      // A live line is redrawn on the same layer: the previous drawing's listeners go first.
      L.lineListeners?.forEach(([type, fn]) => L.removeEventListener(type, fn));
      L.lineListeners = [['pointermove', pointAt], ['pointerdown', pointAt],
        ['pointerleave', () => { L.linePointer = null; if (doc.activeElement !== L) show(false); }],
        ['focus', () => inspect(selected)], ['blur', () => show(false)],
        ['keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          inspect(event.key === 'Home' ? 0 : event.key === 'End' ? timeline.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1));
        }]];
      L.lineListeners.forEach(([type, fn]) => L.addEventListener(type, fn));
      // Redrawn under the pointer, the point there stays inspected; with keyboard focus, the newest point.
      if (kept && L.linePointer != null) pointAt({clientX: L.linePointer});
      else if (kept && doc.activeElement === L) inspect(timeline.length - 1);
      return L;
    },
    /**
     * A ring centred on the board, one slice per part (`share`, 0–100): the slices
     * sweep in one after another, so the ring assembles clockwise from the top.
     * The total sits in the middle and every slice, however thin, is named just
     * outside the ring. With `morph` (another result, another time control) the
     * slices already there turn to their new sizes instead of drawing again.
     *
     * A slice is one dash whose gap is longer than the circle, so its pattern
     * never comes round again: a second copy would show as a sliver at the top.
     * A turn moves the shares, not each slice on its own: every
     * frame lays all the slices out again end to end from the shares part way
     * there, so they never overlap or leave a gap, even when a slice comes or
     * goes or another turn starts before this one ends.
     */
    pie(slices, {center = null, label = '', color: tint = null, morph = false} = {}) {
      const R = 24, C = 2 * Math.PI * R, parts = slices.filter(s => s.share > 0), gapFor = n => n > 1 ? .8 : 0;
      const kept = morph && layer?.isConnected && layer.dataset.scene === 'pie' ? layer : null;
      const L = kept || open('pie', {color: tint});
      const view = doc.defaultView || globalThis;
      const moving = motion() && typeof L.animate === 'function' && typeof view.requestAnimationFrame === 'function';
      let ring = L.querySelector('.pv-pie-ring');
      if (!ring) {
        ring = svg('svg', {viewBox: '0 0 100 100', class: 'pv-pie-ring', 'aria-hidden': 'true'});
        ring.append(svg('circle', {cx: 50, cy: 50, r: R, class: 'pv-pie-track', transform: 'rotate(-90 50 50)'}));
        L.append(ring);
      }
      if (ring.pvTurn) { view.cancelAnimationFrame?.(ring.pvTurn); ring.pvTurn = 0; }
      const arcs = [...ring.querySelectorAll('.pv-pie-slice')];
      // New slices join at the end of the ring with nothing, so the others make room for them.
      while (arcs.length < parts.length) {
        const arc = svg('circle', {cx: 50, cy: 50, r: R, class: 'pv-pie-slice', transform: 'rotate(-90 50 50)'});
        arc.append(svg('title', {})); arc.pvShare = 0;
        ring.append(arc); arcs.push(arc);
      }
      parts.forEach((part, i) => { arcs[i].style.stroke = part.color; arcs[i].firstChild.textContent = part.detail || ''; });
      const from = arcs.map(arc => kept ? arc.pvShare ?? 0 : 0), to = arcs.map((_, i) => parts[i]?.share ?? 0);
      const gapFrom = kept ? ring.pvGap ?? gapFor(parts.length) : gapFor(parts.length), gapTo = gapFor(parts.length);
      const lay = progress => {
        const gap = gapFrom + (gapTo - gapFrom) * progress;
        let start = 0;
        arcs.forEach((arc, i) => {
          const share = from[i] + (to[i] - from[i]) * progress, drawn = Math.max(0, C * share / 100 - gap);
          arc.style.strokeDasharray = `${drawn} ${2 * C}`; arc.style.strokeDashoffset = String(-(C * start / 100 + gap / 2));
          arc.pvShare = share; start += share;
        });
        ring.pvGap = gap;
      };
      // Slices the new parts no longer need have shrunk to nothing at the end of the ring: they go.
      const settle = () => { lay(1); ring.pvTurn = 0; arcs.slice(parts.length).forEach(arc => arc.remove()); };
      if (kept && moving) {
        // A ring still sweeping in turns from where its slices are headed.
        arcs.forEach(arc => arc.getAnimations?.().forEach(a => a.cancel()));
        let began = null;
        const frame = now => {
          if (!ring.isConnected) { ring.pvTurn = 0; return; }
          began ??= now;
          const time = (now - began) / PIE_TURN.duration;
          if (time >= 1) { settle(); return; }
          lay(eased(PIE_TURN.ease, time)); ring.pvTurn = view.requestAnimationFrame(frame);
        };
        lay(0); ring.pvTurn = view.requestAnimationFrame(frame);
      } else settle();
      // Drawn fresh, the slices follow each other round the ring at one speed.
      if (!kept && moving) {
        let start = 0;
        parts.forEach((part, i) => {
          arcs[i].animate([{strokeDasharray: `0 ${2 * C}`},{strokeDasharray: arcs[i].style.strokeDasharray}], {duration: Math.max(160, 1000 * part.share / 100), delay: 260 + 1000 * start / 100, easing: 'cubic-bezier(.35,.1,.35,1)', fill: 'backwards'});
          start += part.share;
        });
        ring.animate([{opacity: 0, transform: 'scale(.94) rotate(-12deg)'}, {opacity: 1, transform: 'none'}], {duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)'});
      }
      // The middle: how many games the ring is about.
      L.querySelector('.pv-pie-center')?.remove();
      if (center) {
        const mid = el('div', 'pv-pie-center');
        mid.append(el('strong', '', center.value), el('span', '', center.label));
        mid.style.setProperty('--d', kept ? '120ms' : '420ms');
        L.append(mid);
      }
      // Names outside the ring, pushed apart where two small slices sit close.
      const marks = outside(L);
      marks.querySelectorAll('.pv-pie-label').forEach(node => node.remove());
      const RL = 34.5, labels = [];
      let start = 0;
      for (const part of parts) {
        const mid = (start + part.share / 2) / 100 * 2 * Math.PI - Math.PI / 2, cos = Math.cos(mid);
        // A ring of one slice needs no name outside it: the middle and the legend already say it.
        if (parts.length > 1) labels.push({part, x: 50 + RL * cos, y: 50 + RL * Math.sin(mid), side: cos > .3 ? 'right' : cos < -.3 ? 'left' : 'mid', at: start});
        start += part.share;
      }
      for (const side of ['left', 'right', 'mid']) {
        const list = labels.filter(l => l.side === side).sort((a, b) => a.y - b.y);
        for (let i = 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + 9);
      }
      for (const {part, x, y, side, at} of labels) {
        const tag = el('span', 'pv-pie-label is-' + side);
        tag.append(el('b', '', Math.round(part.pct ?? part.share) + '%'), el('small', '', part.short || part.label || ''));
        Object.assign(tag.style, {left: x + '%', top: y + '%'});
        tag.style.setProperty('--d', (kept ? 260 : 360 + 1000 * (at + part.share) / 100) + 'ms');
        if (part.detail) tag.title = part.detail;
        marks.append(tag);
      }
      L.setAttribute('role', 'img');
      L.setAttribute('aria-label', [label, ...parts.map(p => p.detail)].filter(Boolean).join(' '));
      return L;
    },
    overview(content) { open('overview', {dim: false}).append(content); },
  };
  return api;
}
