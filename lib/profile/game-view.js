// The profile owns its game labels and evaluation; the review stays untouched.
import {Chess} from '../chess.js';

export function createProfileGameView({h, doc, settings, createEngine, motion, renderPlayer, renderEvaluation, geometry}) {
  const win = doc.defaultView;
  const top = h('div', {class: 'profile-game-player profile-game-player-top'});
  const bottom = h('div', {class: 'profile-game-player profile-game-player-bottom'});
  const fill = h('div', {class: 'white-fill', style: {height: '50%'}});
  const topScore = h('span', {class: 'score top'}), bottomScore = h('span', {class: 'score bot'}, '…');
  const bar = h('div', {class: 'profile-game-eval evalbar', role: 'img', 'aria-label': 'Evaluation pending'}, fill, topScore, bottomScore);
  const element = h('div', {class: 'profile-game-chrome', 'data-motion': motion() ? 'on' : 'off'}, top, bottom, bar);
  doc.body.append(element);
  let engine, pending, timer, token = 0, closed = false, players = null, flipped = false;
  function paintPlayers(fen) {
    if (!players || !renderPlayer) return;
    for (const [node, side] of [[top, flipped ? 'w' : 'b'], [bottom, flipped ? 'b' : 'w']]) {
      node.replaceChildren(renderPlayer(side, players[side], fen));
    }
  }
  function paint(score, mate = false) {
    const cp = score.cp ?? (score.mate > 0 ? 600 : -600);
    const text = score.mate != null ? (mate ? '#' : `M${Math.abs(score.mate)}`) : (Math.abs(cp) / 100).toFixed(2);
    const share = score.mate != null ? (cp > 0 ? 100 : 0) : 50 + Math.max(-600, Math.min(600, cp)) / 600 * 46;
    fill.style.height = share + '%';
    topScore.textContent = cp < 0 ? text : ''; bottomScore.textContent = cp >= 0 ? text : '';
    bar.style.setProperty('--score-chars', text.length);
    bar.setAttribute('aria-label', score.mate != null ? (mate ? 'Checkmate' : `${cp > 0 ? 'White' : 'Black'} mates in ${Math.abs(score.mate)}`) : `Evaluation: ${(cp / 100).toFixed(2)} pawns for White`);
    bar.title = bar.getAttribute('aria-label');
    renderEvaluation?.(bar, score, flipped);
  }
  function unavailable() {
    for (const score of bar.querySelectorAll('.score, .eval-balance-score')) score.textContent = '';
    const score = bar.querySelector('.score.bot, .eval-balance-score'); if (score) score.textContent = '–';
    bar.setAttribute('aria-label', 'Evaluation unavailable'); bar.title = 'Evaluation unavailable';
  }
  return {
    element,
    unavailable,
    position(rect) {
      Object.assign(element.style, {left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px'});
      const layout = geometry?.();
      if (layout) Object.assign(bar.style, {width: layout.width + 'px', left: -(layout.width + layout.gap) + 'px'});
    },
    players({white, black, whiteRating, blackRating, me}) {
      flipped = me === 'b';
      players = {w: {name: white || 'Unknown player', rating: whiteRating}, b: {name: black || 'Unknown player', rating: blackRating}};
      const label = (node, name, rating) => node.replaceChildren(h('strong', {}, name || 'Unknown player'), rating ? h('span', {}, String(rating)) : null);
      label(top, me === 'b' ? white : black, me === 'b' ? whiteRating : blackRating);
      label(bottom, me === 'b' ? black : white, me === 'b' ? blackRating : whiteRating);
      bar.classList.toggle('flipped', me === 'b');
      renderEvaluation?.(bar, null, flipped);
      paintPlayers(new Chess().fen());
    },
    update(fen, history) {
      const current = ++token;
      win.clearTimeout(timer); engine?.cancelPending?.(); engine?.stop?.();
      const chess = new Chess(fen);
      paintPlayers(fen);
      if (chess.isCheckmate()) { paint({mate: chess.turn() === 'w' ? -1 : 1}, true); return; }
      if (chess.isDraw()) { paint({cp: 0}); return; }
      bar.setAttribute('aria-label', 'Evaluation pending');
      timer = win.setTimeout(async () => {
        try {
          if (!engine) {
            pending ||= Promise.resolve().then(() => { if (!createEngine) throw Error('Engine unavailable'); return createEngine(); });
            const ready = await pending;
            if (closed) { ready.terminate(); return; }
            engine = ready;
          }
          if (current !== token || closed) return;
          const result = await engine.analyse(fen, Math.min(12, settings().engineDepth || 10), 1, history);
          if (current !== token || closed) return;
          const score = result?.score, sign = chess.turn() === 'w' ? 1 : -1;
          if (!score || !(Number.isFinite(score.cp) || Number.isFinite(score.mate))) throw Error('No evaluation');
          paint(score.mate != null ? {mate: score.mate * sign} : {cp: score.cp * sign});
        } catch {
          if (closed || current !== token) return;
          pending = null; unavailable();
        }
      }, 100);
    },
    destroy() { closed = true; token++; win.clearTimeout(timer); engine?.terminate(); element.remove(); },
  };
}
