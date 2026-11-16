// Player profile designs — charts drawn on the chessboard itself. A layer sits
// over the 64 squares (which stay visible, dimmed) and paints with the grid:
// columns are stacks of lit squares, a rating line crosses the files, a share
// fills squares in reading order. Everything lives in one `.pv-layer`, so
// clearing a scene is removing that layer.
const SVG = 'http://www.w3.org/2000/svg';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** A win score (0–100) as a colour between the loss and win tones. */
export const scoreColor = score => score == null ? 'var(--line)' : `color-mix(in oklab, var(--q-best) ${clamp(Math.round((score - 30) / 40 * 100), 0, 100)}%, var(--q-miss))`;

export function createViz(board, {doc = board.ownerDocument, motion = () => true} = {}) {
  let layer = null;
  const el = (tag, cls, text) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const svg = (tag, attrs) => { const n = doc.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  function clear() { layer?.remove(); layer = null; board.classList.remove('pv-scene'); }
  function open(kind, {dim = true, color = null} = {}) {
    clear();
    layer = el('div', 'pv-layer pv-' + kind);
    layer.dataset.motion = motion() ? 'on' : 'off';
    if (color) layer.style.setProperty('--pv-c', color);
    if (dim) layer.classList.add('pv-dim');
    board.append(layer); board.classList.add('pv-scene');
    return layer;
  }
  const at = (node, col, row, w = 1, h = 1) => { Object.assign(node.style, {left: col * 12.5 + '%', top: row * 12.5 + '%', width: w * 12.5 + '%', height: h * 12.5 + '%'}); return node; };

  const api = {
    clear, get layer() { return layer; },
    /** Up to eight columns of lit squares over ranks 7–2 (rank 8 keeps room for the values); labels sit on rank 1. */
    columns(columns, {max = null, unit = '', color: tint = null} = {}) {
      const L = open('columns', {color: tint});
      const cols = columns.slice(-8), offset = Math.floor((8 - cols.length) / 2);
      const top = Math.max(1, max ?? Math.max(...cols.map(c => c.value || 0)));
      cols.forEach((column, i) => {
        const col = offset + i, height = 6 * (column.value || 0) / top, color = column.color || scoreColor(column.tone);
        for (let k = 0; k < Math.ceil(height - 1e-9); k++) {
          const tile = at(el('span', 'pv-tile'), col, 6 - k);
          tile.style.setProperty('--f', clamp(height - k, 0, 1).toFixed(3));
          tile.style.setProperty('--c', color);
          tile.style.setProperty('--d', (i * 70 + k * 55) + 'ms');
          if (k === Math.ceil(height - 1e-9) - 1) tile.classList.add('pv-tile-top');
          if (column.detail) tile.title = column.detail;
          L.append(tile);
        }
        const value = at(el('span', 'pv-col-value', column.display ?? String(column.value ?? '') + unit), col, Math.max(0, 6 - Math.ceil(height - 1e-9)));
        value.style.setProperty('--d', (i * 70 + Math.ceil(height) * 55 + 120) + 'ms');
        const label = at(el('span', 'pv-col-label', column.label), col, 7);
        if (column.detail) label.title = column.detail;
        L.append(value, label);
      });
      return L;
    },
    /** A line across the board, the files as time and the ranks as rating. */
    line(series, {peak = null, label = '', color = null} = {}) {
      const L = open('line', {color});
      if (!series?.length) return L;
      const rs = series.map(p => p.r), lo = Math.min(...rs), hi = Math.max(...rs), pad = Math.max(8, (hi - lo) * .14);
      const min = lo - pad, max = hi + pad, t0 = series[0].t, t1 = series.at(-1).t;
      const x = t => 4 + 92 * (t1 > t0 ? (t - t0) / (t1 - t0) : .5), y = r => 92 - 80 * (r - min) / (max - min);
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
      mark(series[0], 'pv-start', String(series[0].r));
      if (peak && peak.t !== series.at(-1).t) mark(peak, 'pv-peak', `Peak ${peak.r}`);
      mark(series.at(-1), 'pv-end', String(series.at(-1).r));
      if (label) L.append(el('span', 'pv-line-label', label));
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
