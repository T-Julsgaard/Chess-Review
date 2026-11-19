// Player profile — the review board as a visualization surface. Works on the
// existing 64 `.sq` elements: pieces for a FEN, animated move playback, heat and
// schedule tints, a progressive win/draw/loss fill, a split tint and a card
// preview. Everything added carries a `profile-` class so it can be removed.
import {Chess} from '../chess.js';
import {SQUARES, squareIndex} from './features.js';
import {WEEKDAYS, BANDS} from './insights.js';
import {boardPieces, glidePieces} from './transition.js';
import {createPortrait} from './portrait.js';

const FILES = 'abcdefgh';
export function squareNames(flipped) {
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? [...FILES].reverse() : [...FILES];
  const out = [];
  for (const rank of ranks) for (const file of files) out.push(file + rank);
  return out;
}

export function createProfileBoard({board, makePiece, motion = () => true, doc = board.ownerDocument, onMove = null}) {
  const squares = [...board.querySelectorAll('.sq')];
  let names = squareNames(false), byName = {}, timers = new Set(), animations = new Set(), overlay = null, generation = 0, playback = null;
  let portrait = null;
  const index = () => { byName = {}; names.forEach((name, i) => { if (squares[i]) byName[name] = squares[i]; }); };
  index();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  /** Win/draw/loss squares shrink away instead of vanishing when the board moves on. */
  function fadeFill() {
    const filled = squares.filter(sq => sq.classList.contains('profile-fill'));
    if (!filled.length || !motion() || typeof board.animate !== 'function') return;
    const ghost = doc.createElement('div'); ghost.className = 'profile-fill-ghost';
    const box = board.getBoundingClientRect();
    if (!box.width) return;
    const scale = board.offsetWidth ? box.width / board.offsetWidth : 1;
    filled.forEach((sq, i) => {
      const r = sq.getBoundingClientRect(), tile = doc.createElement('span');
      Object.assign(tile.style, {left: (r.left - box.left) / scale + 'px', top: (r.top - box.top) / scale + 'px', width: r.width / scale + 'px', height: r.height / scale + 'px'});
      tile.style.setProperty('--fill-color', sq.style.getPropertyValue('--fill-color'));
      tile.style.setProperty('--fill-win', sq.style.getPropertyValue('--fill-win'));
      tile.style.setProperty('--fill-draw', sq.style.getPropertyValue('--fill-draw'));
      ghost.append(tile);
      tile.animate([{transform: 'none', opacity: .85}, {transform: 'scale(.2)', opacity: 0}], {duration: 380, delay: (filled.length - 1 - i) * 5, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'});
    });
    board.append(ghost);
    setTimeout(() => ghost.remove(), 380 + filled.length * 5 + 60);
  }
  function clear() {
    fadeFill();
    generation++;
    playback = null;
    board.querySelectorAll(':scope > .profile-intro').forEach(n => n.remove());
    for (const id of timers) clearTimeout(id); timers.clear();
    for (const a of animations) try { a.cancel(); } catch {} animations.clear();
    for (const sq of squares) {
      sq.querySelectorAll('.profile-piece, .profile-label').forEach(n => n.remove());
      sq.classList.remove('profile-hl', 'profile-heat', 'profile-fill', 'profile-fill-updating', 'profile-split-l', 'profile-split-r', 'profile-mate', 'profile-dim', 'profile-moving');
      sq.style.removeProperty('--fill-win'); sq.style.removeProperty('--fill-draw');
      sq.style.removeProperty('--heat'); sq.style.removeProperty('--fill-color'); sq.removeAttribute('data-profile-tip'); sq.removeAttribute('title');
    }
    portrait?.cancel(); portrait = null;
    overlay?.remove(); overlay = null;
    board.classList.remove('profile-board-busy');
  }
  function setOrientation(flipped) {
    names = squareNames(flipped); index();
    names.forEach((name, i) => {
      const sq = squares[i]; if (!sq) return;
      const rank = sq.querySelector('.coord.rank'), file = sq.querySelector('.coord.file');
      if (rank) rank.textContent = name[1];
      if (file) file.textContent = name[0];
    });
  }
  function piecesFromFen(fen) {
    const rows = String(fen || '').split(' ')[0].split('/'), out = {};
    if (rows.length !== 8) return out;
    rows.forEach((row, r) => { let c = 0; for (const ch of row) { if (/\d/.test(ch)) c += Number(ch); else { out[FILES[c] + (8 - r)] = ch; c++; } } });
    return out;
  }
  function placePieces(fen) {
    for (const sq of squares) sq.querySelectorAll('.profile-piece').forEach(n => n.remove());
    const pieces = piecesFromFen(fen);
    for (const [square, ch] of Object.entries(pieces)) {
      const el = byName[square]; if (!el) continue;
      const img = makePiece(ch.toLowerCase(), ch === ch.toUpperCase() ? 'w' : 'b');
      img.classList.add('profile-piece');
      el.append(img);
    }
    return pieces;
  }
  function highlight(list, cls = 'profile-hl') { for (const square of list) byName[square]?.classList.add(cls); }
  function slide(from, to, ch) {
    const fromEl = byName[from], toEl = byName[to];
    const img = toEl?.querySelector('.profile-piece');
    if (!fromEl || !toEl || !img || !motion() || typeof img.animate !== 'function') return;
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    // Rectangles include the canvas/panel scale; transforms use local pixels.
    const dx = (a.left - b.left) * (toEl.offsetWidth / b.width || 1);
    const dy = (a.top - b.top) * (toEl.offsetHeight / b.height || 1);
    toEl.classList.add('profile-moving');
    const anim = img.animate([{transform: `translate(${dx}px, ${dy}px)`}, {transform: 'translate(0,0)'}], {duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)'});
    animations.add(anim); anim.onfinish = () => { animations.delete(anim); toEl.classList.remove('profile-moving'); };
  }
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = doc.createElement('div'); overlay.className = 'profile-board-overlay';
    board.append(overlay);
    return overlay;
  }

  const api = {
    clear, setOrientation,
    fen(fen, {highlight: hl = [], mate = false} = {}) {
      clear(); placePieces(fen); highlight(hl);
      if (mate) { try { const chess = new Chess(fen); if (chess.isCheckmate()) { const king = Object.entries(piecesFromFen(fen)).find(([, ch]) => ch === (chess.turn() === 'w' ? 'K' : 'k')); if (king) byName[king[0]]?.classList.add('profile-mate'); } } catch {} }
    },
    /** Replay `moves` (SAN) from the start; show the position after `from` plies first, then animate the rest. */
    moves(moves, {from = 0, interval = 700, delay = 900, onStep = null, onDone = null, autoplay = true, startFen = null, timing = null} = {}) {
      clear();
      const gen = generation;
      const chess = startFen ? new Chess(startFen) : new Chess();
      const played = [];
      const animated = motion(); let finished = false;
      const done = () => { if (finished || gen !== generation) return; finished = true; board.classList.remove('profile-board-busy'); onDone?.(); };
      for (let i = 0; i < Math.min(from, moves.length); i++) { try { const move = chess.move(moves[i]); if (!move) { done(); return; } played.push(move); } catch { done(); return; } }
      placePieces(chess.fen());
      if (played.length) highlight([played.at(-1).from, played.at(-1).to]);
      if (played.length) onStep?.(played.at(-1), played.length, moves.length);
      let i = played.length;
      playback = {
        step(delta) {
          // Taking over a replay cancels its scheduled moves, including at the
          // endpoints. Manual navigation never changes the profile slide.
          for (const id of timers) clearTimeout(id); timers.clear();
          board.classList.remove('profile-board-busy');
          const target = Math.max(0, Math.min(moves.length, i + delta));
          if (target === i) return true;
          const old = i, previousMove = chess.history({verbose: true}).at(-1);
          try {
            while (i > target) { chess.undo(); i--; }
            while (i < target) { if (!chess.move(moves[i])) break; i++; }
          } catch { return true; }
          for (const a of animations) a.cancel(); animations.clear();
          for (const sq of squares) sq.classList.remove('profile-hl', 'profile-moving');
          placePieces(chess.fen());
          const move = chess.history({verbose: true}).at(-1);
          if (move) { highlight([move.from, move.to]); if (i === old + 1) slide(move.from, move.to, move.piece); }
          onStep?.(move || null, i, moves.length);
          if (i !== old) onMove?.(i < old ? previousMove : move);
          onDone?.();
          return true;
        },
      };
      const step = () => {
        if (gen !== generation || finished) return;
        if (i >= moves.length) {
          done();
          return;
        }
        let move;
        try { move = chess.move(moves[i]); } catch { done(); return; }
        if (!move) { done(); return; }
        i++;
        for (const sq of squares) sq.classList.remove('profile-hl');
        placePieces(chess.fen());
        slide(move.from, move.to, move.piece);
        highlight([move.from, move.to]);
        onStep?.(move, i, moves.length);
        if (animated) onMove?.(move);
        if (i >= moves.length) done();
        else if (animated) later(step, timing ? timing(i, moves.length) : interval);
      };
      if (!autoplay) { onStep?.(played.at(-1) || null, i, moves.length); return; }
      if (!animated) {
        while (i < moves.length && gen === generation && !finished) step();
        done(); return;
      }
      if (i >= moves.length) { done(); return; }
      board.classList.add('profile-board-busy');
      later(step, delay);
    },
    step(delta) { return playback?.step(delta) || false; },
    /**
     * "You versus them": the board is covered by two grey halves carrying each
     * player's name on their own side, which then part to reveal the game.
     * Resolves when the board is clear; `ready` may delay the parting (e.g. the moves loading).
     */
    intro({top = '', bottom = '', ready = Promise.resolve(), hold = 900} = {}) {
      board.querySelectorAll(':scope > .profile-intro').forEach(n => n.remove());
      if (!motion()) return ready;
      const gen = generation;
      const cover = doc.createElement('div'); cover.className = 'profile-intro';
      const half = (cls, name) => { const node = doc.createElement('div'); node.className = 'profile-intro-half ' + cls; const label = doc.createElement('span'); label.textContent = name; node.append(label); return node; };
      const upper = half('profile-intro-top', top), lower = half('profile-intro-bottom', bottom), vs = doc.createElement('i');
      vs.className = 'profile-intro-vs'; vs.textContent = 'vs';
      cover.append(upper, lower, vs);
      board.append(cover);
      const wait = ms => new Promise(resolve => later(resolve, ms));
      return Promise.all([ready, wait(hold)]).then(() => {
        if (gen !== generation || !cover.isConnected) return;
        const ease = 'cubic-bezier(.7,0,.2,1)';
        const a = upper.animate([{transform: 'none'}, {transform: 'translateY(-101%)'}], {duration: 650, easing: ease, fill: 'forwards'});
        lower.animate([{transform: 'none'}, {transform: 'translateY(101%)'}], {duration: 650, easing: ease, fill: 'forwards'});
        vs.animate([{opacity: 1}, {opacity: 0, transform: 'scale(.6)'}], {duration: 260, fill: 'forwards'});
        return a.finished.catch(() => {}).then(() => cover.remove());
      });
    },
    /** Lowest point, then the final position. */
    journey(fenFrom, fenTo, {delay = 1900} = {}) {
      clear();
      const gen = generation;
      placePieces(fenFrom || fenTo);
      if (fenFrom && fenTo && fenFrom !== fenTo) {
        if (!motion()) placePieces(fenTo);
        else later(() => {
          if (gen !== generation) return;
          const before = boardPieces(board); placePieces(fenTo);
          const glide = glidePieces(board, before); animations.add(glide);
          glide.finished.then(() => animations.delete(glide));
        }, delay);
      }
    },
    heat(counts, {top = 3} = {}) {
      clear(); placePieces('8/8/8/8/8/8/8/8');
      const max = Math.max(1, ...counts);
      const ranked = counts.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]).slice(0, top).map(x => x[1]);
      counts.forEach((count, i) => {
        const el = byName[SQUARES[i]]; if (!el) return;
        const v = Math.sqrt(count / max);
        el.classList.add('profile-heat'); el.style.setProperty('--heat', v.toFixed(3));
        el.title = `${SQUARES[i]}: ${count} ${count === 1 ? 'move' : 'moves'}`;
        if (ranked.includes(i) && count) { const label = doc.createElement('span'); label.className = 'profile-label'; label.textContent = SQUARES[i]; el.append(label); }
      });
    },
    /** Each square is one slice of the game count: wins, then draws, then losses, lit in order. */
    fill(total, wins, draws, {duration = 1400} = {}) {
      const updating = squares.some(sq => sq.classList.contains('profile-fill'));
      if (updating) { for (const id of timers) clearTimeout(id); timers.clear(); }
      else { clear(); placePieces('8/8/8/8/8/8/8/8'); }
      const gen = generation;
      const winSquares = 64 * wins / Math.max(1, total), drawEnd = 64 * (wins + draws) / Math.max(1, total);
      const order = names.slice();
      const paint = i => {
        const el = byName[order[i]]; if (!el) return;
        el.classList.add('profile-fill');
        el.classList.toggle('profile-fill-updating', updating && motion());
        const win = Math.max(0, Math.min(1, winSquares - i)) * 100;
        const draw = Math.max(win, Math.max(0, Math.min(1, drawEnd - i)) * 100);
        el.style.setProperty('--fill-win', win + '%'); el.style.setProperty('--fill-draw', draw + '%');
        el.style.setProperty('--fill-color', 'linear-gradient(to right, var(--q-best) 0% var(--fill-win), var(--ink-2) var(--fill-win) var(--fill-draw), var(--q-miss) var(--fill-draw) 100%)');
        el.title = `Wins: ${win.toFixed(1)}% · Draws: ${(draw - win).toFixed(1)}% · Losses: ${(100 - draw).toFixed(1)}% of this square. Each square represents ${(total / 64).toFixed(2)} games.`;
      };
      if (!motion() || updating) { for (let i = 0; i < 64; i++) paint(i); return; }
      for (let i = 0; i < 64; i++) later(() => { if (gen === generation) paint(i); }, (i / 64) * duration);
    },
    /** Weekday rows (Monday at the top, Sunday last) × three-hour columns. Rank 1 is left empty. */
    schedule(matrix) {
      clear(); placePieces('8/8/8/8/8/8/8/8');
      const order = [1, 2, 3, 4, 5, 6, 0];
      const max = Math.max(1, ...matrix.flat().map(c => c.g));
      order.forEach((day, rowIndex) => {
        const rank = 8 - rowIndex;
        matrix[day].forEach((cell, band) => {
          const el = byName[FILES[band] + rank]; if (!el) return;
          el.classList.add('profile-heat'); el.style.setProperty('--heat', Math.sqrt(cell.g / max).toFixed(3));
          el.title = `${WEEKDAYS[day]} ${BANDS[band]}: ${cell.g} ${cell.g === 1 ? 'game' : 'games'}${cell.g ? `, ${Math.round(100 * cell.w / cell.g)}% wins` : ''}`;
          if (band === 0) { const label = doc.createElement('span'); label.className = 'profile-label profile-label-left'; label.textContent = WEEKDAYS[day]; el.append(label); }
        });
      });
      for (let band = 0; band < 8; band++) { const el = byName[FILES[band] + '1']; if (!el) continue; el.classList.add('profile-dim'); const label = doc.createElement('span'); label.className = 'profile-label'; label.textContent = BANDS[band].split('–')[0]; el.append(label); }
    },
    split(left, right) {
      clear(); placePieces('8/8/8/8/8/8/8/8');
      for (const name of names) { const file = FILES.indexOf(name[0]); byName[name]?.classList.add(file < 4 ? 'profile-split-l' : 'profile-split-r'); }
      const o = ensureOverlay();
      o.innerHTML = '';
      for (const [side, item] of [['l', left], ['r', right]]) {
        const box = doc.createElement('div'); box.className = 'profile-split-box profile-split-box-' + side;
        const value = doc.createElement('strong'); value.textContent = item.value; const label = doc.createElement('span'); label.textContent = item.label;
        box.append(value, label); o.append(box);
      }
    },
    cover(white, black) {
      const moves = [white, black].filter(Boolean);
      if (!moves.length) { api.fen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); return; }
      const chess = new Chess(); const legal = [];
      for (const san of moves) { try { if (chess.move(san)) legal.push(san); else break; } catch { break; } }
      // The cover is an illustration, not an endlessly restarting game.
      api.moves(legal, {from: legal.length});
    },
    card(canvas) {
      clear(); placePieces('8/8/8/8/8/8/8/8');
      for (const name of names) byName[name]?.classList.add('profile-dim');
      const o = ensureOverlay(); o.innerHTML = '';
      const img = doc.createElement('img'); img.className = 'profile-card-preview'; img.alt = 'Preview of your share card';
      try { img.src = canvas.toDataURL('image/png'); } catch {}
      o.append(img);
    },
    /** The pieces now on the board dissolve and reassemble as the portrait `id` (portrait.js). */
    portrait(id, options = {}) {
      portrait?.cancel();
      const o = ensureOverlay(); o.innerHTML = '';
      portrait = createPortrait({board, overlay: o, id, makePiece, motion, ...options});
      return portrait;
    },
    squareIndex,
    nameOf: el => names[squares.indexOf(el)] || null,
  };
  return api;
}
