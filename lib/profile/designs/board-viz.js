// Player profile designs — charts drawn on the chessboard itself. A layer sits
// over the 64 squares (which stay visible, dimmed) and paints with the grid:
// columns are stacks of lit squares, a rating line crosses the files, a share
// fills squares in reading order. Everything lives in one `.pv-layer`, so
// clearing a scene is removing that layer.
const SVG = 'http://www.w3.org/2000/svg';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** Milliseconds each square of a morphing column takes to fill or drain (see designs.css). */
const MORPH_STEP = 110;
/** Top edge, in squares from the board's top, of a column `height` squares tall standing on rank 2. */
const barTop = height => {
  const stack = Math.ceil(height - 1e-9);
  return stack ? (7 - stack) + 1 - .04 - .92 * clamp(height - (stack - 1), 0, 1) : 6.96;
};
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
    if (!motion() || typeof old.animate !== 'function' || !old.isConnected) { old.remove(); return; }
    old.classList.add('pv-leaving'); old.style.pointerEvents = 'none';
    const tiles = [...old.querySelectorAll('.pv-tile, .pv-bubble')];
    tiles.forEach((tile, i) => tile.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'scale(.6)'}], {duration: 260, delay: Math.min(220, (tiles.length - i) * 4), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'}));
    const fade = old.animate([{opacity: 1}, {opacity: 0}], {duration: 420, easing: 'ease', fill: 'forwards'});
    fade.onfinish = () => old.remove(); fade.oncancel = () => old.remove();
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

  const api = {
    clear, get layer() { return layer; },
    /**
     * Columns of lit squares over ranks 7–2; labels sit on rank 1. Eight or fewer
     * columns take one file each; more share the board's width, so a whole period fits.
     */
    columns(columns, {max = null, unit = '', color: tint = null, compactLabels = false, plainLabels = false, morph = false} = {}) {
      const cols = columns.slice(-24), width = cols.length > 8 ? 8 / cols.length : 1, offset = cols.length > 8 ? 0 : Math.floor((8 - cols.length) / 2);
      const top = Math.max(1, max ?? Math.max(...cols.map(c => c.value || 0)));
      // Every column owns six squares (empty ones have no height), so a column can grow or shrink in place.
      const kept = morphable(morph, 'columns', '.pv-tile', cols.length * 6);
      const L = kept || open('columns', {color: tint});
      if (kept && tint) L.style.setProperty('--pv-c', tint);
      if (width < 1) L.classList.add('pv-columns-dense');
      const step = Math.min(70, 560 / cols.length);
      const tiles = kept ? [...L.querySelectorAll('.pv-tile')] : null, values = kept ? [...L.querySelectorAll('.pv-col-value')] : null, labels = kept ? [...L.querySelectorAll('.pv-col-label')] : null;
      cols.forEach((column, i) => {
        const col = offset + i * width, height = 6 * (column.value || 0) / top, color = column.color || scoreColor(column.tone);
        const stack = Math.ceil(height - 1e-9);
        // In a morph the level moves like a liquid: a rising column fills its squares
        // from the bottom up, a falling one drains them from the top down.
        let travel = 0;
        if (kept) {
          const own = tiles.slice(i * 6, i * 6 + 6), from = own.map(t => Number(t.style.getPropertyValue('--f')) || 0), to = own.map((t, k) => clamp(height - k, 0, 1));
          const changed = own.map((t, k) => k).filter(k => Math.abs(from[k] - to[k]) > 1e-3);
          const rising = to.reduce((s, v) => s + v, 0) >= from.reduce((s, v) => s + v, 0);
          own.forEach((t, k) => t.style.setProperty('--md', changed.length ? Math.max(0, rising ? k - changed[0] : changed.at(-1) - k) * MORPH_STEP + 'ms' : '0ms'));
          travel = changed.length ? (changed.at(-1) - changed[0] + 1) * MORPH_STEP : 0;
        }
        for (let k = 0; k < 6; k++) {
          const tile = kept ? tiles[i * 6 + k] : at(el('span', 'pv-tile'), col, 6 - k, width);
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
        Object.assign(value.style, {left: col * 12.5 + '%', width: width * 12.5 + '%', top: barTop(height) * 12.5 + '%'});
        if (!kept) value.style.setProperty('--d', (i * step + stack * 55 + 120) + 'ms');
        else Object.assign(value.style, {transitionDuration: travel + 'ms', transitionTimingFunction: 'linear'});
        const label = kept ? labels[i] : at(el('span', 'pv-col-label' + (plainLabels ? ' pv-col-plain' : '')), col, 7, width);
        label.textContent = column.label;
        if (compactLabels) { label.style.height = '5%'; label.style.top = '87.5%'; }
        for (const node of [label, value]) if (column.detail) node.title = column.detail; else node.removeAttribute('title');
        if (!kept) L.append(value, label);
      });
      return L;
    },
    /**
     * You against a typical player: per metric a pair of columns (yours tinted,
     * typical grey), each metric scaled to its own range. Up to four metrics.
     */
    pairs(items, {color: tint = null} = {}) {
      const L = open('columns', {color: tint, scene: 'pairs'});
      L.classList.add('pv-pairs');
      const list = items.slice(0, 4), offset = 4 - list.length;
      list.forEach((item, i) => {
        const top = Math.max(item.you, item.typical, 1e-9) * 1.12;
        [[item.you, 'var(--pv-c, var(--accent))', item.youText], [item.typical, 'color-mix(in srgb, var(--ink) 34%, transparent)', item.typicalText]].forEach(([v, c, text], j) => {
          const col = offset + i * 2 + j, height = 6 * v / top, stack = Math.ceil(height - 1e-9);
          for (let k = 0; k < stack; k++) {
            const tile = at(el('span', 'pv-tile'), col, 6 - k);
            tile.style.setProperty('--f', clamp(height - k, 0, 1).toFixed(3));
            tile.style.setProperty('--c', c);
            tile.style.setProperty('--d', (i * 140 + j * 60 + k * 50) + 'ms');
            if (k === stack - 1) tile.classList.add('pv-tile-top');
            tile.title = `${item.label}: ${j ? 'typical' : 'you'} ${text}`;
            L.append(tile);
          }
          const value = el('span', 'pv-col-value' + (j ? ' pv-muted' : ''), text);
          Object.assign(value.style, {left: col * 12.5 + '%', width: '12.5%', top: barTop(height) * 12.5 + '%'});
          value.style.setProperty('--d', (i * 140 + j * 60 + stack * 50 + 120) + 'ms');
          L.append(value);
        });
        const label = at(el('span', 'pv-col-label pv-pair-label', item.short || item.label), offset + i * 2, 7, 2);
        label.title = item.label;
        L.append(label);
      });
      return L;
    },
    /**
     * Weekday × time of day: one dot per cell, its size the number of games and
     * its colour the win rate. Day names take files a–b, hours label rank 1.
     */
    bubbles(matrix, {days = [], bands = [], color: tint = null, morph = false} = {}) {
      const order = [1, 2, 3, 4, 5, 6, 0], cols = matrix[0]?.length || 6, width = 6 / cols;
      const max = Math.max(1, ...matrix.flat().map(c => c.g));
      // Switching time control keeps the dots: they grow, shrink and recolour in place.
      const kept = morphable(morph, 'bubbles', '.pv-bubble', 7 * cols);
      const L = kept || open('bubbles', {color: tint});
      if (kept && tint) L.style.setProperty('--pv-c', tint);
      const dots = kept ? [...L.querySelectorAll('.pv-bubble')] : null;
      order.forEach((day, row) => {
        if (!kept) L.append(at(el('span', 'pv-bubble-day', days[day] || ''), 0, row, 2));
        matrix[day].forEach((cell, band) => {
          const node = kept ? dots[row * cols + band] : at(el('span', 'pv-bubble'), 2 + band * width, row, width);
          const size = cell.g ? .28 + .72 * Math.sqrt(cell.g / max) : 0;
          node.style.setProperty('--s', size.toFixed(3));
          node.style.setProperty('--c', cell.g ? scoreColor(100 * (cell.w + (cell.d || 0) / 2) / cell.g) : 'transparent');
          if (!kept) node.style.setProperty('--d', (row * 45 + band * 30) + 'ms');
          node.title = `${days[day]} ${bands[band] || ''}: ${cell.g} ${cell.g === 1 ? 'game' : 'games'}${cell.g ? `, ${Math.round(100 * cell.w / cell.g)}% win rate` : ''}`;
          if (!kept) L.append(node);
        });
      });
      if (!kept) bands.forEach((label, band) => L.append(at(el('span', 'pv-col-label', label.split('–')[0] + ':00'), 2 + band * width, 7, width)));
      return L;
    },
    /** A line across the board, the files as time and the ranks as rating. */
    line(series, {peak = null, label = '', color = null, unit = ''} = {}) {
      const L = open('line', {color});
      if (!series?.length) return L;
      const lo = series.reduce((v, p) => Math.min(v, p.r), Infinity), hi = series.reduce((v, p) => Math.max(v, p.r), -Infinity), pad = Math.max(8, (hi - lo) * .14);
      const min = lo - pad, max = hi + pad, t0 = series[0].t, t1 = series.at(-1).t;
      const x = t => 100 * (t1 > t0 ? (t - t0) / (t1 - t0) : .5), y = r => 92 - 80 * (r - min) / (max - min);
      const chart = svg('svg', {viewBox: '0 0 100 100', preserveAspectRatio: 'none', class: 'pv-line-svg', 'aria-hidden': 'true'});
      const id = 'pvg' + Math.random().toString(36).slice(2, 8);
      const grad = svg('linearGradient', {id, x1: 0, y1: 0, x2: 0, y2: 1});
      grad.append(svg('stop', {offset: '0', class: 'pv-stop', 'stop-opacity': '.45'}), svg('stop', {offset: '1', class: 'pv-stop', 'stop-opacity': '0'}));
      const defs = svg('defs', {}); defs.append(grad); chart.append(defs);
      const d = series.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(2) + ' ' + y(p.r).toFixed(2)).join(' ');
      chart.append(svg('path', {d: `${d} L${x(t1).toFixed(2)} 100 L${x(t0).toFixed(2)} 100 Z`, fill: `url(#${id})`, class: 'pv-line-area'}),
        svg('path', {d, class: 'pv-line-path pv-line-glow', pathLength: '1'}), svg('path', {d, class: 'pv-line-path', pathLength: '1'}));
      L.append(chart);
      const mark = (p, cls, text) => {
        const dot = el('span', 'pv-line-dot ' + cls); Object.assign(dot.style, {left: x(p.t) + '%', top: y(p.r) + '%'});
        const tag = el('span', 'pv-line-tag', text); dot.append(tag);
        if (x(p.t) > 70) dot.classList.add('pv-left');
        L.append(dot);
      };
      mark(series[0], 'pv-start', String(series[0].r) + unit);
      if (peak && peak.t !== series.at(-1).t) mark(peak, 'pv-peak', `Peak ${peak.r}${unit}`);
      mark(series.at(-1), 'pv-end', String(series.at(-1).r) + unit);
      if (label) L.append(el('span', 'pv-line-label', label));
      const cursor = el('span', 'pv-line-cursor'), dot = el('span', 'pv-line-dot pv-inspect');
      const tooltip = el('span', 'pv-line-tag'); dot.append(tooltip); L.append(cursor, dot);
      cursor.hidden = dot.hidden = true;
      L.tabIndex = 0; L.setAttribute('role', 'group');
      L.setAttribute('aria-label', `${label || 'Chart'}, ${series.length} points. Hover or use arrow keys to inspect.`);
      let selected = 0;
      const inspect = i => {
        selected = clamp(i, 0, series.length - 1);
        const p = series[selected], px = x(p.t);
        dot.style.left = cursor.style.left = px + '%'; dot.style.top = y(p.r) + '%';
        dot.classList.toggle('pv-left', px > 65); dot.classList.toggle('pv-right', px < 35);
        tooltip.textContent = `${new Date(p.t * 1000).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})} · ${p.r}${unit}`;
        cursor.hidden = dot.hidden = false;
        L.setAttribute('aria-label', `${label || 'Chart'}: ${tooltip.textContent}. Point ${selected + 1} of ${series.length}.`);
      };
      const pointAt = event => {
        const rect = L.getBoundingClientRect(); if (!rect.width) return;
        const t = t0 + clamp((event.clientX - rect.left) / rect.width, 0, 1) * (t1 - t0);
        let low = 0, high = series.length - 1;
        while (low < high) { const mid = (low + high) >> 1; if (series[mid].t < t) low = mid + 1; else high = mid; }
        inspect(low > 0 && t - series[low - 1].t < series[low].t - t ? low - 1 : low);
      };
      L.addEventListener('pointermove', pointAt); L.addEventListener('pointerdown', pointAt);
      L.addEventListener('pointerleave', () => { if (doc.activeElement !== L) cursor.hidden = dot.hidden = true; });
      L.addEventListener('focus', () => inspect(selected));
      L.addEventListener('blur', () => { cursor.hidden = dot.hidden = true; });
      L.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        inspect(event.key === 'Home' ? 0 : event.key === 'End' ? series.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1));
      });
      return L;
    },
    /** `share` percent of the squares light up in reading order; the rest stay dark. */
    share(share, {color = null} = {}) {
      const L = open('share', {color});
      const lit = 64 * clamp(share, 0, 100) / 100;
      for (let i = 0; i < 64; i++) {
        const tile = at(el('span', 'pv-tile pv-tile-share'), i % 8, Math.floor(i / 8));
        const f = clamp(lit - i, 0, 1);
        tile.style.setProperty('--f', f > 0 ? f.toFixed(3) : '0');
        tile.style.setProperty('--c', f > 0 ? 'var(--pv-c, var(--accent))' : 'transparent');
        tile.style.setProperty('--d', i * 14 + 'ms');
        tile.classList.add('pv-tile-top');
        L.append(tile);
      }
      return L;
    },
    /** A glass card over the middle of the board, on top of whatever is there. */
    badge({value, label, sub = null, place = 'center'}) {
      const host = layer || open('badge', {dim: false});
      const card = el('div', 'pv-badge pv-badge-' + place);
      card.append(el('strong', 'pv-badge-value', value), el('span', 'pv-badge-label', label));
      if (sub) card.append(el('span', 'pv-badge-sub', sub));
      host.append(card);
      return card;
    },
  };
  return api;
}
