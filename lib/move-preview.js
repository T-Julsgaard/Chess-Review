import {Chess} from './chess.js';
import {MOVE_ANIMATION_EASING} from './move-animation.js';

function slide(move) {
  const pieces = [[move.from, move.to]];
  if (move.isKingsideCastle()) pieces.push(['h' + move.from[1], 'f' + move.from[1]]);
  if (move.isQueensideCastle()) pieces.push(['a' + move.from[1], 'd' + move.from[1]]);
  return pieces;
}
const reverse = pieces => pieces.map(([from, to]) => [to, from]);

// A disposable board layer keeps review positions, engine data and input intact.
export function createMovePreview({setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
  let active = null;
  function cancel() {
    if (!active) return;
    clearTimer(active.timer);
    active.animations.forEach(animation => animation.cancel());
    active.layer.remove();
    active.board.classList.remove('previewing-move');
    active = null;
  }
  function show({board, squares, makePiece, makeBadge, currentFen, baseFen, played, uci, owner,
    hold = false, motion = true, duration = 160}) {
    if (!board || !baseFen || !owner?.isConnected) return;
    const steps = [];
    // Alternatives begin before the played move. Undo it visually first.
    try {
      const chess = new Chess(baseFen);
      if (baseFen !== currentFen) {
        const original = chess.move({from: played.from, to: played.to, promotion: played.promotion});
        if (chess.fen() !== currentFen) return;
        steps.push({before: currentFen, after: baseFen, pieces: reverse(slide(original))});
        chess.undo();
      }
      for (const token of uci.trim().split(/\s+/)) {
        if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(token)) return;
        const move = chess.move({from: token.slice(0, 2), to: token.slice(2, 4), promotion: token[4]});
        steps.push({before: move.before, after: move.after, pieces: slide(move), to: move.to});
      }
    } catch { return; }
    if (!steps.length) return;
    cancel();
    const layer = board.ownerDocument.createElement('div');
    layer.className = 'move-preview';
    layer.setAttribute('aria-hidden', 'true');
    const cells = {};
    for (const [name, square] of Object.entries(squares)) {
      const cell = square.cloneNode(false);
      cell.className = 'sq ' + (square.classList.contains('light') ? 'light' : 'dark');
      for (const edge of ['top-row', 'right-col']) if (square.classList.contains(edge)) cell.classList.add(edge);
      cell.removeAttribute('style');
      square.querySelectorAll('.coord').forEach(coord => cell.append(coord.cloneNode(true)));
      layer.append(cell); cells[name] = cell;
    }
    const session = {board, layer, owner, hold, animations: [], timer: null, index: 0, returning: false};
    active = session;
    board.append(layer); board.classList.add('previewing-move');
    function paint(fen) {
      const chess = new Chess(fen);
      for (const [name, cell] of Object.entries(cells)) {
        cell.querySelector('.sq-badge')?.remove(); cell.classList.remove('has-badge');
        const piece = chess.get(name), code = piece ? piece.color + piece.type.toUpperCase() : null;
        const existing = cell.querySelector('.piece-img');
        if (existing?.dataset.piece === code) continue;
        existing?.remove();
        if (piece) cell.append(makePiece(piece.type.toUpperCase(), piece.color));
      }
    }
    function badge() {
      if (!makeBadge) return;
      const cell = cells[steps.at(-1).to];
      cell.append(makeBadge()); cell.classList.add('has-badge');
    }
    function later(fn, ms) {
      clearTimer(session.timer);
      session.timer = setTimer(() => {
        if (active !== session) return;
        if (!owner.isConnected || !board.isConnected) { cancel(); return; }
        fn();
      }, ms);
    }
    function animate(pieces) {
      session.animations.forEach(animation => animation.cancel()); session.animations = [];
      Object.values(cells).forEach(cell => cell.classList.remove('anim-top'));
      // Panel scaling changes screen rects; transforms use local CSS pixels.
      const bounds = layer.getBoundingClientRect();
      const scaleX = bounds.width / layer.offsetWidth || 1, scaleY = bounds.height / layer.offsetHeight || 1;
      for (const [from, to] of pieces) {
        const piece = cells[to]?.querySelector('.piece-img');
        if (!piece?.animate) continue;
        const start = cells[from].getBoundingClientRect(), end = cells[to].getBoundingClientRect();
        const cell = cells[to]; cell.classList.add('anim-top');
        const animation = piece.animate([
          {transform: `translate(${(start.left - end.left) / scaleX}px, ${(start.top - end.top) / scaleY}px)`},
          {transform: 'translate(0, 0)'},
        ], {duration, easing: MOVE_ANIMATION_EASING});
        animation.onfinish = () => cell.classList.remove('anim-top');
        session.animations.push(animation);
      }
    }
    function back() {
      if (session.index === 0) { cancel(); return; }
      const step = steps[--session.index];
      paint(step.before); animate(reverse(step.pieces));
      later(back, duration + 60);
    }
    session.back = () => {
      if (!motion) { cancel(); return; }
      session.returning = true; clearTimer(session.timer); back();
    };
    function forward() {
      const step = steps[session.index++];
      paint(step.after); animate(step.pieces);
      if (session.index === steps.length) badge();
      if (session.index < steps.length) later(forward, duration + 160);
      else if (!hold) later(session.back, duration + 850);
    }
    if (!motion) {
      session.index = steps.length; paint(steps.at(-1).after);
      badge();
      if (!hold) later(session.back, 850);
    } else {
      paint(currentFen); forward();
    }
  }
  function release(owner) {
    if (active?.owner === owner && active.hold && !active.returning) active.back();
  }
  return {show, release, cancel};
}
