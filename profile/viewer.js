// Static viewer for shared Chess Review player profiles. Decodes #p=… in the browser,
// builds the same slide deck the extension uses and draws it with a static board.
// No network requests beyond this page's own files; nothing is sent anywhere.
import {decodeProfile} from '../lib/profile/share.js';
import {buildDeck} from '../lib/profile/deck.js';
import {Chess} from '../lib/chess.js';
import {WEEKDAYS, BANDS} from '../lib/profile/insights.js';
import {SQUARES} from '../lib/profile/features.js';

const $ = id => document.getElementById(id);
const FILES = 'abcdefgh';
const h = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) { if (value == null || value === false) continue; if (key === 'class') node.className = value; else if (key.startsWith('on')) node.addEventListener(key.slice(2), value); else node.setAttribute(key, value === true ? '' : String(value)); }
  for (const child of children.flat()) if (child != null && child !== false) node.append(child.nodeType ? child : document.createTextNode(String(child)));
  return node;
};
const squares = [];
function buildBoard() {
  const board = $('board'); board.replaceChildren(); squares.length = 0;
  for (let rank = 8; rank >= 1; rank--) for (let f = 0; f < 8; f++) { const sq = h('div', {class: 'sq' + ((rank + f) % 2 ? '' : ' dark'), 'data-name': FILES[f] + rank}); squares.push(sq); board.append(sq); }
}
const byName = name => squares.find(sq => sq.dataset.name === name);
let timers = [];
function clearBoard() { for (const t of timers) clearTimeout(t); timers = []; for (const sq of squares) { sq.replaceChildren(); sq.className = sq.className.replace(/\b(hl|heat|fill|dim|split-l|split-r)\b/g, '').trim(); sq.style.removeProperty('--heat'); sq.style.removeProperty('--fill'); sq.removeAttribute('title'); } }
function piece(ch) { const code = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase(); return h('img', {src: '../pieces-img/cburnett/' + code + '.svg', alt: ''}); }
function placeFen(fen) {
  for (const sq of squares) sq.querySelectorAll('img').forEach(n => n.remove());
  const rows = String(fen || '').split(' ')[0].split('/'); if (rows.length !== 8) return;
  rows.forEach((row, r) => { let c = 0; for (const ch of row) { if (/\d/.test(ch)) c += Number(ch); else { byName(FILES[c] + (8 - r))?.append(piece(ch)); c++; } } });
}
function playMoves(moves, from = 0, onStep) {
  clearBoard();
  const chess = new Chess(); let i = 0;
  for (; i < Math.min(from, moves.length); i++) { try { chess.move(moves[i]); } catch { break; } }
  placeFen(chess.fen());
  const step = () => {
    if (i >= moves.length) return;
    let move; try { move = chess.move(moves[i]); } catch { return; }
    if (!move) return; i++;
    for (const sq of squares) sq.classList.remove('hl');
    placeFen(chess.fen()); byName(move.from)?.classList.add('hl'); byName(move.to)?.classList.add('hl');
    onStep?.(move, i, moves.length);
    timers.push(setTimeout(step, 700));
  };
  timers.push(setTimeout(step, 800));
}
function showBoard(spec) {
  clearBoard(); $('caption').textContent = spec?.caption || '';
  if (!spec) return;
  switch (spec.kind) {
    case 'cover': { const moves = [spec.white, spec.black].filter(Boolean); if (moves.length) playMoves(moves); else placeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); break; }
    case 'fen': placeFen(spec.fen); break;
    case 'moves': playMoves(spec.moves, spec.from || 0, (move, i) => { $('caption').textContent = `${spec.caption || ''} · ${Math.ceil(i / 2)}${i % 2 ? '.' : '…'} ${move.san}`; }); break;
    case 'journey': placeFen(spec.fenFrom || spec.fenTo); if (spec.fenFrom && spec.fenTo) timers.push(setTimeout(() => placeFen(spec.fenTo), 1900)); break;
    case 'heat': { const max = Math.max(1, ...spec.counts); spec.counts.forEach((count, i) => { const sq = byName(SQUARES[i]); if (!sq) return; sq.classList.add('heat'); sq.style.setProperty('--heat', Math.sqrt(count / max).toFixed(3)); sq.title = SQUARES[i] + ': ' + count; }); break; }
    case 'fill': { const win = Math.round(64 * spec.wins / Math.max(1, spec.total)), draw = Math.round(64 * spec.draws / Math.max(1, spec.total)); squares.forEach((sq, i) => { sq.classList.add('fill'); sq.style.setProperty('--fill', i < win ? 'var(--good)' : i < win + draw ? 'var(--ink-2)' : '#f5746a'); }); break; }
    case 'schedule': { const order = [1, 2, 3, 4, 5, 6, 0], max = Math.max(1, ...spec.matrix.flat().map(c => c.g)); order.forEach((day, row) => spec.matrix[day].forEach((cell, band) => { const sq = byName(FILES[band] + (8 - row)); if (!sq) return; sq.classList.add('heat'); sq.style.setProperty('--heat', Math.sqrt(cell.g / max).toFixed(3)); sq.title = `${WEEKDAYS[day]} ${BANDS[band]}: ${cell.g} games`; if (!band) sq.append(h('span', {class: 'label left'}, WEEKDAYS[day])); })); for (let band = 0; band < 8; band++) { const sq = byName(FILES[band] + '1'); sq?.classList.add('dim'); sq?.append(h('span', {class: 'label'}, BANDS[band].split('–')[0])); } break; }
    case 'split': squares.forEach(sq => sq.classList.add(FILES.indexOf(sq.dataset.name[0]) < 4 ? 'split-l' : 'split-r')); byName('b5')?.append(h('span', {class: 'label'}, spec.left.value)); byName('g5')?.append(h('span', {class: 'label'}, spec.right.value)); byName('b4')?.append(h('span', {class: 'label'}, spec.left.label)); byName('g4')?.append(h('span', {class: 'label'}, spec.right.label)); break;
    default: placeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }
}

let deck = [], index = 0;
function render() {
  const slide = deck[index], host = $('slide'); host.replaceChildren();
  host.append(h('span', {class: 'eyebrow'}, slide.eyebrow), h('h2', {}, slide.title), h('p', {class: 'lead'}, slide.lead || ''));
  if (slide.stats?.length) host.append(h('div', {class: 'stats'}, ...slide.stats.map(s => h('div', {class: 'stat' + (s.tone ? ' ' + s.tone : '')}, h('strong', {}, s.value), h('span', {}, s.label), s.sub ? h('small', {}, s.sub) : null))));
  if (slide.openings) host.append(h('div', {class: 'openings'}, ...[['As White', slide.openings.w], ['As Black', slide.openings.b]].map(([label, list]) => h('div', {}, h('h3', {}, label), ...list.map(o => h('div', {class: 'opening'}, h('span', {}, o.name), h('span', {}, `${o.games} · ${o.winRate ?? '–'}%`)))))));
  if (slide.twin) host.append(h('p', {class: 'muted'}, `${slide.twin.era}. Runner-up: ${slide.twin.runnerUp}.`));
  if (slide.bullets?.length) host.append(h('ul', {class: 'bullets'}, ...slide.bullets.map(t => h('li', {}, t))));
  if (slide.id === 'share') host.append(h('p', {class: 'muted'}, 'This is a shared, read-only profile. Install Chess Review to build your own from your games.'), h('a', {class: 'button primary', href: 'https://chromewebstore.google.com/detail/chess-review/pdbffcjdmcadihmnmenkadndbdbigfam', rel: 'noopener'}, 'Get Chess Review'));
  else if (slide.pending === 'engine') host.append(h('p', {class: 'muted'}, 'Engine-based figures appear when the profile owner runs the engine check in the extension.'));
  if (slide.evidence?.url) host.append(h('a', {class: 'evidence', href: slide.evidence.url, target: '_blank', rel: 'noopener noreferrer'}, slide.evidence.label + ' ↗'));
  $('prev').disabled = index === 0; $('next').disabled = index === deck.length - 1; $('counter').textContent = `${index + 1} / ${deck.length}`;
  $('dots').replaceChildren(...deck.map((s, i) => h('button', {type: 'button', class: 'dot' + (i === index ? ' on' : ''), role: 'tab', 'aria-selected': String(i === index), 'aria-label': s.eyebrow, onclick: () => go(i)})));
  showBoard(slide.board);
}
function go(i) { index = Math.max(0, Math.min(deck.length - 1, i)); render(); window.scrollTo({top: 0, behavior: 'smooth'}); }
async function main() {
  const m = location.hash.match(/[#&]p=([^&]+)/);
  const state = $('state');
  if (!m) { state.querySelector('p').textContent = 'This page shows a player profile shared from the Chess Review extension. Open it through a share link, or install the extension to build your own.'; return; }
  try {
    const report = await decodeProfile(m[1]);
    deck = buildDeck(report, {account: report.account, site: report.site, periodLabel: report.periodLabel, engineStatus: 'unavailable'});
    buildBoard();
    state.hidden = true; $('deck').hidden = false;
    document.title = `${report.account} · Chess Review player profile`;
    $('prev').addEventListener('click', () => go(index - 1)); $('next').addEventListener('click', () => go(index + 1));
    document.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight') go(index + 1); else if (e.key === 'ArrowLeft') go(index - 1); });
    render();
  } catch (error) {
    state.querySelector('h1').textContent = 'Could not read this profile';
    state.querySelector('p').textContent = error.message || 'The link seems incomplete.';
  }
}
main();
window.addEventListener('hashchange', () => location.reload());
