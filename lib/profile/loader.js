// Player profile — the loading scene. A knight tours a small board while your
// games arrive: every hop lights a square, the tour length tracks real progress,
// and a counter ticks up with the games found. No status line, bar or time
// estimate: on Lichess the total is unknown until the stream ends, so those
// flickered and guessed. When collection finishes the
// knight sprints home and the deck takes over.
import {knightsTour, EASE_OUT} from './transition.js';

export function createTourLoader({h, win, makePiece, motion = () => true, onCancel = null}) {
  const tour = knightsTour();
  const cells = Array.from({length: 64}, (_, i) => h('i', {class: 'profile-tour-cell ' + ((i % 8 + Math.floor(i / 8)) % 2 ? 'dark' : 'light')}));
  const knight = h('span', {class: 'profile-tour-knight'}, makePiece('n', 'w'));
  const board = h('div', {class: 'profile-tour', 'aria-hidden': 'true'}, ...cells, knight);
  const count = h('strong', {class: 'profile-loader-count tnum'}, '0');
  const unit = h('span', {class: 'profile-loader-unit'}, 'games found');
  const cancel = onCancel ? h('button', {type: 'button', class: 'profile-button ghost', onclick: () => onCancel()}, 'Cancel') : null;
  const element = h('div', {class: 'profile-loader', 'aria-live': 'polite'},
    board,
    h('div', {class: 'profile-loader-tally'}, count, unit),
    cancel);

  let step = 0, target = 0, known = false, shownCount = 0, goalCount = 0, stopped = false, finishing = null, hopTimer = 0, crawlTimer = 0, countFrame = 0;
  const at = i => `translate(${(i % 8) * 100}%, ${Math.floor(i / 8) * 100}%)`;
  // Every square the knight has touched keeps the same green.
  const light = upto => { for (let n = 0; n <= upto; n++) cells[tour[n]].classList.add('on'); };
  knight.style.transform = at(tour[0]); light(0);

  const hop = () => {
    const from = tour[step]; step++;
    const to = tour[step];
    knight.style.transform = at(to);
    if (motion() && typeof knight.animate === 'function') {
      knight.animate([{transform: at(from)}, {transform: `${at(from)} translate(${((to % 8) - (from % 8)) * 50}%, ${(Math.floor(to / 8) - Math.floor(from / 8)) * 50 - 18}%) scale(1.14)`, offset: .5}, {transform: at(to)}],
        {duration: finishing ? 120 : 300, easing: EASE_OUT});
    }
    light(step);
  };
  const pump = () => {
    hopTimer = 0;
    if (stopped) return;
    if (step < target) hop();
    if (finishing && step >= 63) { const done = finishing; finishing = null; win.setTimeout(done, motion() ? 260 : 0); return; }
    const remaining = target - step;
    const delay = finishing ? Math.max(28, Math.min(110, 640 / Math.max(1, remaining))) : remaining > 6 ? 110 : 240;
    if (step < target || finishing) hopTimer = win.setTimeout(pump, delay);
  };
  const wake = () => { if (!hopTimer && !stopped) hopTimer = win.setTimeout(pump, 0); };
  // Once games arrive without a known total, keep the knight walking slowly.
  const crawl = () => {
    crawlTimer = 0;
    if (stopped || finishing || known || target >= 40) return;
    target++; wake();
    crawlTimer = win.setTimeout(crawl, 700);
  };
  const showCount = value => {
    shownCount = value;
    count.textContent = value.toLocaleString('en-US');
    unit.textContent = value === 1 ? 'game found' : 'games found';
  };
  const tickCount = () => {
    countFrame = 0;
    if (stopped) return;
    showCount(Math.min(goalCount, shownCount + Math.ceil((goalCount - shownCount) / 8)));
    if (shownCount < goalCount) countFrame = win.requestAnimationFrame(tickCount);
  };
  return {
    element,
    /** {fraction (0–1 or null), games}: the fraction paces the knight's tour. */
    update({fraction = null, games = null} = {}) {
      if (stopped) return;
      const firstGames = !goalCount && games > 0;
      if (games != null && games > goalCount) {
        goalCount = games;
        if (!motion()) showCount(goalCount);
        else if (!countFrame) tickCount();
      }
      if (!goalCount) return;
      if (firstGames) target = 1;
      if (fraction != null && Number.isFinite(fraction)) {
        known = true;
        target = Math.max(target, Math.min(62, Math.round(fraction * 63)));
      }
      if (motion()) {
        if (step < target) wake();
        if (firstGames && !known) crawlTimer = win.setTimeout(crawl, 700);
      } else { while (step < target) hop(); }
    },
    /** Sprint to the last square; resolves when the tour is complete. */
    finish() {
      if (stopped || !goalCount) return Promise.resolve();
      if (!motion()) { while (step < 63) hop(); return Promise.resolve(); }
      target = 63;
      return new Promise(resolve => {
        finishing = resolve; wake();
        // Background tabs throttle timers; never hold the deck back for the flourish.
        win.setTimeout(() => { if (finishing !== resolve) return; finishing = null; while (step < 63) hop(); resolve(); }, 1400);
      });
    },
    stop() {
      stopped = true;
      win.clearTimeout(hopTimer); win.clearTimeout(crawlTimer); win.cancelAnimationFrame(countFrame);
      const done = finishing; finishing = null; done?.();
    },
  };
}
