// Player profile — motion. The board never moves: the review chrome fades out
// in place, the profile panel settles in beside the board, and pieces glide
// between whatever two positions the board shows. Everything here uses the Web
// Animations API and releases its styles when finished or cancelled.

import {nearestBoardEdge} from '../learning/piece-transition.js';

export const EASE = 'cubic-bezier(.28, .06, .18, 1)';
export const EASE_OUT = 'cubic-bezier(.16, 1, .3, 1)';
const GLIDE = 'cubic-bezier(.4, 0, .2, 1)';

const animates = node => typeof node?.animate === 'function';

/**
 * A cancellable group of animations whose promise settles when all finish.
 * A hidden tab may never advance its timeline, so the group also releases
 * itself after `timeout` ms; nothing is left half-faded or detached-but-present.
 */
export function motionGroup(animations, cleanup = () => {}, {timeout = 1800} = {}) {
  let done = false, timer = 0, settle;
  const settled = new Promise(resolve => { settle = resolve; });
  const release = () => { if (done) return; done = true; clearTimeout(timer); for (const a of animations) { try { a.cancel(); } catch {} } cleanup(); settle(); };
  if (animations.length) { timer = setTimeout(release, timeout); Promise.allSettled(animations.map(a => a.finished)).then(release); }
  else release();
  return {finished: settled, cancel: release};
}

/** The review surfaces that make way for the profile: panel bodies, player bars, the library rail. */
export function reviewSurfaces(doc, stage) {
  return [...stage.querySelectorAll('.mod:not([data-mod="board"]) > .mod-inner'), doc.querySelector('#playerTop'), doc.querySelector('#playerBot'), doc.querySelector('.library-rail')]
    .filter(node => node && node.getBoundingClientRect().width > 1);
}

/** Fade surfaces out where they stand. Visibility rides along so CSS can take over afterwards. */
export function fadeOut(nodes, {duration = 220, lift = 6} = {}) {
  const list = nodes.filter(animates);
  return motionGroup(list.map(node => {
    const opacity = parseFloat(node.ownerDocument.defaultView.getComputedStyle(node).opacity);
    const still = node.matches('#playerTop, #playerBot, .library-rail');
    return node.animate([
      {opacity: Number.isFinite(opacity) ? opacity : 1, visibility: 'visible', translate: '0 0'},
      {opacity: 0, visibility: 'hidden', translate: still ? '0 0' : `0 -${lift}px`},
    ], {duration, easing: EASE, fill: 'both'});
  }));
}

/** Fade surfaces in with a short rise and a gentle stagger. */
export function fadeIn(nodes, {delay = 0, duration = 440, rise = 8, stagger = 24, maxStagger = 96} = {}) {
  const list = nodes.filter(animates);
  return motionGroup(list.map((node, index) => {
    const still = node.matches('#playerTop, #playerBot, .library-rail');
    return node.animate([
      {opacity: 0, translate: still ? '0 0' : `0 ${rise}px`},
      {opacity: 1, translate: '0 0'},
    ], {duration, delay: delay + Math.min(index * stagger, maxStagger), easing: EASE_OUT, fill: 'both'});
  }));
}

/* ---------- pieces ---------- */

/** Pieces currently drawn on a board, by display index (0 = top-left square). */
export function boardPieces(board) {
  const out = [];
  [...board.querySelectorAll(':scope > .sq')].forEach((sq, i) => {
    const img = sq.querySelector('img[data-piece]');
    if (img && img.getClientRects().length) out.push({i, code: img.dataset.piece, img});
  });
  return out;
}

const cell = i => ({x: i % 8, y: Math.floor(i / 8)});
const gap = (a, b) => { const p = cell(a), q = cell(b); return Math.hypot(p.x - q.x, p.y - q.y); };

/**
 * Pair two piece lists. Identical pieces on the same square stay; the rest pair
 * by proximity within the same colour and type. Unpaired pieces leave or enter.
 */
export function pairPieces(from, to) {
  const a = [...from], b = [...to], moves = [];
  for (const piece of [...a]) {
    const same = b.find(p => p.code === piece.code && p.i === piece.i);
    if (same) { a.splice(a.indexOf(piece), 1); b.splice(b.indexOf(same), 1); }
  }
  while (a.length && b.length) {
    let best = null, cost = Infinity;
    for (const p of a) for (const q of b) if (p.code === q.code) { const d = gap(p.i, q.i); if (d < cost) { cost = d; best = [p, q]; } }
    if (!best) break;
    moves.push({from: best[0], to: best[1]});
    a.splice(a.indexOf(best[0]), 1); b.splice(b.indexOf(best[1]), 1);
  }
  return {moves, leave: a, enter: b};
}

/**
 * Glide from `before` (a boardPieces() snapshot, possibly from another board)
 * to what `board` shows now. Unpaired pieces follow the same routes from and
 * to the board edges as the learning board's assemble/disassemble animation.
 */
export function glidePieces(board, before, {motion = true} = {}) {
  if (!motion || !animates(board)) return motionGroup([]);
  const doc = board.ownerDocument, view = doc.defaultView;
  const after = boardPieces(board);
  const {moves, leave, enter} = pairPieces(before, after);
  if (!moves.length && !leave.length && !enter.length) return motionGroup([]);
  const squares = [...board.querySelectorAll(':scope > .sq')];
  const size = squares[0]?.offsetWidth || board.offsetWidth / 8 || 0;
  const animations = [], raised = [];
  for (const {from, to} of moves) {
    const p = cell(from.i), q = cell(to.i), sq = squares[to.i];
    const distance = Math.hypot(p.x - q.x, p.y - q.y);
    if (sq) { raised.push([sq, sq.style.zIndex]); sq.style.zIndex = '7'; }
    animations.push(to.img.animate([
      {transform: `translate(${(p.x - q.x) * size}px, ${(p.y - q.y) * size}px)`},
      {transform: 'translate(0, 0)'},
    ], {duration: 520 + Math.min(distance * 34, 240), easing: GLIDE, fill: 'backwards'}));
  }
  let overlay = null;
  if (leave.length) {
    overlay = doc.createElement('div'); overlay.className = 'profile-glide'; overlay.setAttribute('aria-hidden', 'true');
    if (view.getComputedStyle(board).position === 'static') { board.style.position = 'relative'; overlay.dataset.positioned = 'true'; }
    board.append(overlay);
    leave.forEach(({i, img}, n) => {
      const ghost = doc.createElement('span'), at = cell(i);
      ghost.className = 'profile-glide-piece'; ghost.style.left = at.x * 12.5 + '%'; ghost.style.top = at.y * 12.5 + '%';
      const copy = img.cloneNode(true); copy.className = 'piece-img'; ghost.append(copy); overlay.append(ghost);
      const edge = nearestBoardEdge({x: at.x + .5, y: at.y + .5});
      const dx = edge.x - at.x - .5, dy = edge.y - at.y - .5;
      animations.push(ghost.animate([{transform: 'translate(0,0)'}, {transform: `translate(${dx * 100}%,${dy * 100}%)`}],
        {duration: 680 + Math.min(Math.hypot(dx, dy) * 24, 220), delay: Math.min(n * 24, 192), easing: GLIDE, fill: 'both'}));
    });
  }
  enter.forEach(({img, i}, n) => {
    const at = cell(i), edge = nearestBoardEdge({x: at.x + .5, y: at.y + .5});
    const dx = edge.x - at.x - .5, dy = edge.y - at.y - .5;
    const sq = squares[i];
    if (sq) { raised.push([sq, sq.style.zIndex]); sq.style.zIndex = '7'; }
    animations.push(img.animate([{transform: `translate(${dx * size}px,${dy * size}px)`}, {transform: 'translate(0,0)'}],
      {duration: 680 + Math.min(Math.hypot(dx, dy) * 24, 220), delay: Math.min(n * 24, 192), easing: GLIDE, fill: 'backwards'}));
  });
  return motionGroup(animations, () => {
    for (const [sq, z] of raised) sq.style.zIndex = z;
    if (overlay?.dataset.positioned) board.style.position = '';
    overlay?.remove();
  });
}

/* ---------- loader ---------- */

/** A closed-ish knight's tour of the 64 squares by Warnsdorff's rule, starting at b1 (index 57). */
export function knightsTour(start = 57) {
  const jumps = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const next = (i, seen) => jumps.map(([dx, dy]) => [i % 8 + dx, Math.floor(i / 8) + dy])
    .filter(([x, y]) => x >= 0 && x < 8 && y >= 0 && y < 8).map(([x, y]) => y * 8 + x).filter(j => !seen.has(j));
  const tour = [start], seen = new Set(tour);
  while (tour.length < 64) {
    const options = next(tour.at(-1), seen);
    if (!options.length) break;
    // Fewest onward moves first; ties toward the edge keep the tour moving outward.
    options.sort((a, b) => next(a, seen).length - next(b, seen).length || edgeScore(a) - edgeScore(b));
    tour.push(options[0]); seen.add(options[0]);
  }
  return tour;
}
const edgeScore = i => -Math.max(Math.abs(i % 8 - 3.5), Math.abs(Math.floor(i / 8) - 3.5));
