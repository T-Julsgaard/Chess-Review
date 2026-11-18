// The profile owns its game labels and evaluation; the review stays untouched.
import {Chess} from '../chess.js';

export function createProfileGameView({h, doc, settings, createEngine, motion}) {
  const win = doc.defaultView;
  const top = h('div', {class: 'profile-game-player profile-game-player-top'});
  const bottom = h('div', {class: 'profile-game-player profile-game-player-bottom'});
  const fill = h('div', {class: 'white-fill', style: {height: '50%'}});
  const topScore = h('span', {class: 'score top'}), bottomScore = h('span', {class: 'score bot'}, '…');
  const bar = h('div', {class: 'profile-game-eval evalbar', role: 'img', 'aria-label': 'Evaluation pending'}, fill, topScore, bottomScore);
  const element = h('div', {class: 'profile-game-chrome', 'data-motion': motion() ? 'on' : 'off'}, top, bottom, bar);
  doc.body.append(element);
  let engine, pending, timer, token = 0, closed = false;
  function paint(score, mate = false) {
    const cp = score.cp ?? (score.mate > 0 ? 600 : -600);
    const text = score.mate != null ? (mate ? '#' : `M${Math.abs(score.mate)}`) : (Math.abs(cp) / 100).toFixed(2);
    const share = score.mate != null ? (cp > 0 ? 100 : 0) : 50 + Math.max(-600, Math.min(600, cp)) / 600 * 46;
    fill.style.height = share + '%';
    topScore.textContent = cp < 0 ? text : ''; bottomScore.textContent = cp >= 0 ? text : '';
    bar.style.setProperty('--score-chars', text.length);
    bar.setAttribute('aria-label', score.mate != null ? (mate ? 'Checkmate' : `${cp > 0 ? 'White' : 'Black'} mates in ${Math.abs(score.mate)}`) : `Evaluation: ${(cp / 100).toFixed(2)} pawns for White`);
    bar.title = bar.getAttribute('aria-label');
  }
  return {
    element,
    unavailable() { topScore.textContent = ''; bottomScore.textContent = '–'; bar.setAttribute('aria-label', 'Evaluation unavailable'); },
    position(rect) { Object.assign(element.style, {left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px'}); },
    players({white, black, whiteRating, blackRating, me}) {
      const label = (node, name, rating) => node.replaceChildren(h('strong', {}, name || 'Unknown player'), rating ? h('span', {}, String(rating)) : null);
      label(top, me === 'b' ? white : black, me === 'b' ? whiteRating : blackRating);
      label(bottom, me === 'b' ? black : white, me === 'b' ? blackRating : whiteRating);
      bar.classList.toggle('flipped', me === 'b');
    },
    update(fen, history) {
      const current = ++token;
      win.clearTimeout(timer); engine?.cancelPending?.(); engine?.stop?.();
      const chess = new Chess(fen);
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
          pending = null; topScore.textContent = ''; bottomScore.textContent = '–';
          bar.setAttribute('aria-label', 'Evaluation unavailable'); bar.title = 'Evaluation unavailable';
        }
      }, 100);
    },
    destroy() { closed = true; token++; win.clearTimeout(timer); engine?.terminate(); element.remove(); },
  };
}
