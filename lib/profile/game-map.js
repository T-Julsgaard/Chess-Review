// A bounded SVG: three paths represent every game, with exact result proportions
// in grouped cells. Hit testing is arithmetic; no per-game DOM or listeners.
export const MAP_CELLS = 1024;
export function mapLayout(rows) {
  const size = Math.max(1, Math.ceil(rows.length / MAP_CELLS));
  const cells = [];
  for (let start = 0; start < rows.length; start += size) {
    const end = Math.min(rows.length, start + size), counts = {w: 0, d: 0, l: 0};
    for (let i = start; i < end; i++) counts[rows[i].res in counts ? rows[i].res : 'd']++;
    cells.push({start, end, counts});
  }
  return {cells, columns: Math.max(8, Math.ceil(Math.sqrt(cells.length) / 8) * 8)};
}
export function gameUrl(row) {
  try {
    const url = new URL(row?.url);
    return url.protocol === 'https:' && ['www.chess.com', 'chess.com', 'lichess.org', 'www.lichess.org'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
export function createGameMap({h, doc, onOpen}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = doc.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'profile-game-map'); svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'group');
  const paths = {};
  for (const res of ['w', 'd', 'l']) { const path = doc.createElementNS(ns, 'path'); path.setAttribute('class', 'profile-map-' + res); paths[res] = path; svg.append(path); }
  const cursor = doc.createElementNS(ns, 'rect'); cursor.setAttribute('class', 'profile-map-cursor'); cursor.setAttribute('width', '9'); cursor.setAttribute('height', '9'); svg.append(cursor);
  const summary = h('span', {class: 'profile-map-summary'});
  const detail = h('span', {class: 'profile-map-detail', role: 'status'});
  const back = h('button', {type: 'button', class: 'profile-caption-button', hidden: true, onclick: () => { range = null; draw(); svg.focus(); }}, 'All games');
  const open = h('button', {type: 'button', class: 'profile-caption-button', hidden: true, onclick: () => activate()}, 'View game');
  const caption = h('div', {class: 'profile-map-caption'}, h('div', {class: 'profile-map-legend'}, summary, h('span', {class: 'profile-map-key w'}, 'Won'), h('span', {class: 'profile-map-key d'}, 'Drew'), h('span', {class: 'profile-map-key l'}, 'Lost')), detail, h('div', {class: 'profile-map-actions'}, back, open));
  let rows = [], visible = [], range = null, cells = [], columns = 8, selected = 0;
  const describe = () => {
    const cell = cells[selected]; cursor.style.display = cell ? '' : 'none'; open.hidden = true;
    if (!cell) { detail.textContent = 'Games appear here as they arrive.'; return; }
    cursor.setAttribute('x', String(selected % columns * 10 + .5)); cursor.setAttribute('y', String(Math.floor(selected / columns) * 10 + .5));
    const row = visible[cell.start], date = row.t ? new Date(row.t * 1000).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'}) : '';
    if (cell.end - cell.start > 1) detail.textContent = `${cell.end - cell.start} games · ${cell.counts.w} won, ${cell.counts.d} drew, ${cell.counts.l} lost · Click to zoom`;
    else {
      detail.textContent = `${date} · vs ${row.opp || 'Opponent'} · ${{w: 'Won', d: 'Drew', l: 'Lost'}[row.res] || 'Draw'}${row.cls ? ' · ' + row.cls : ''}`;
      const url = gameUrl(row); if (url) open.hidden = false;
    }
  };
  const activate = () => {
    const cell = cells[selected]; if (!cell) return;
    if (cell.end - cell.start > 1) { range = visible.slice(cell.start, cell.end); draw(); }
    else { const row = visible[cell.start], url = gameUrl(row); if (url) onOpen?.(url, row); }
  };
  const draw = () => {
    visible = range || rows;
    ({cells, columns} = mapLayout(visible)); selected = Math.min(selected, Math.max(0, cells.length - 1));
    svg.setAttribute('viewBox', `0 0 ${columns * 10} ${columns * 10}`);
    svg.setAttribute('aria-label', `${visible.length.toLocaleString()} games, oldest first. Green wins, silver draws, coral losses. Use arrow keys to inspect, Enter to view a game or zoom a group.`);
    const d = {w: [], d: [], l: []};
    cells.forEach((cell, i) => {
      const x = i % columns * 10 + 1, y = Math.floor(i / columns) * 10 + 1, n = cell.end - cell.start;
      let offset = 0;
      for (const res of ['w', 'd', 'l']) {
        const width = 8 * cell.counts[res] / n;
        if (width) d[res].push(`M${x + offset},${y}h${width}v8h-${width}z`);
        offset += width;
      }
    });
    for (const res of ['w', 'd', 'l']) paths[res].setAttribute('d', d[res].join(''));
    summary.textContent = `${rows.length.toLocaleString()} ${rows.length === 1 ? 'game' : 'games'}`;
    back.hidden = !range; describe();
  };
  const pick = event => {
    const rect = svg.getBoundingClientRect(); if (!rect.width || !rect.height) return false;
    const x = Math.floor(((event.clientX - rect.left) / rect.width - .03) / .94 * columns), y = Math.floor(((event.clientY - rect.top) / rect.height - .03) / .94 * columns);
    if (x < 0 || y < 0 || x >= columns || y >= columns || y * columns + x >= cells.length) return false;
    selected = y * columns + x; describe(); return true;
  };
  svg.addEventListener('pointermove', pick);
  svg.addEventListener('click', event => { if (pick(event)) activate(); });
  svg.addEventListener('focus', describe);
  svg.addEventListener('keydown', event => {
    const steps = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns, Home: -selected, End: cells.length - 1 - selected};
    if (event.key in steps) { event.preventDefault(); event.stopPropagation(); selected = Math.max(0, Math.min(cells.length - 1, selected + steps[event.key])); describe(); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); activate(); }
    else if (event.key === 'Escape' && range) { event.preventDefault(); event.stopPropagation(); range = null; draw(); }
  });
  return {element: svg, caption, update(next) { rows = next; if (range) { const ids = new Set(range.map(r => `${r.site}:${r.id}`)); range = rows.filter(r => ids.has(`${r.site}:${r.id}`)); } draw(); }};
}
