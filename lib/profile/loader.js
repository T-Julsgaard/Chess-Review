// Player profile — the loading scene. A knight tours a small board while your
// games arrive: every hop lights a square, the tour length tracks real progress,
// and a counter ticks up with the games found. When collection finishes the
// knight sprints home and the deck takes over.
import {knightsTour, EASE_OUT} from './transition.js';

const QUIPS = [
  'Dusting off the archive',
  'Counting every en passant',
  'Lining up the rematches',
  'Measuring the time scrambles',
  'Finding your favourite openings',
  'Sorting brilliancies from blunders',
  'Tallying the castled kings',
  'Looking for your nemesis',
];

export function createTourLoader({h, win, makePiece, motion = () => true, onCancel = null}) {
  const tour = knightsTour();
  const cells = Array.from({length: 64}, (_, i) => h('i', {class: 'profile-tour-cell ' + ((i % 8 + Math.floor(i / 8)) % 2 ? 'dark' : 'light')}));
  const knight = h('span', {class: 'profile-tour-knight'}, makePiece('n', 'w'));
  const board = h('div', {class: 'profile-tour', 'aria-hidden': 'true'}, ...cells, knight);
  const count = h('strong', {class: 'profile-loader-count tnum'}, '0');
  const unit = h('span', {class: 'profile-loader-unit'}, 'games found');
  const phase = h('p', {class: 'profile-loader-phase'}, 'Getting ready…');
  const quip = h('p', {class: 'profile-loader-quip'}, QUIPS[0] + '…');
  const bar = h('div', {class: 'profile-loader-meter', role: 'progressbar', 'aria-label': 'Loading your games', 'aria-valuemin': '0', 'aria-valuemax': '100'}, h('i'));
  const cancel = onCancel ? h('button', {type: 'button', class: 'profile-button ghost', onclick: () => onCancel()}, 'Cancel') : null;
  const element = h('div', {class: 'profile-loader', 'aria-live': 'polite'},
    board,
    h('div', {class: 'profile-loader-tally'}, count, unit),
    phase, bar, quip, cancel);

  let step = 0, target = 0, known = false, shownCount = 0, goalCount = 0, stopped = false, finishing = null, hopTimer = 0, crawlTimer = 0, quipTimer = 0, countFrame = 0, quipIndex = 0;
  const at = i => `translate(${(i % 8) * 100}%, ${Math.floor(i / 8) * 100}%)`;
  const light = upto => {
    for (let n = 0; n <= upto; n++) {
      const age = upto - n;
      cells[tour[n]].classList.add('on');
      cells[tour[n]].style.setProperty('--glow', age < 6 ? String(1 - age / 7) : '0');
    }
  };
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
  // Without a fraction yet, keep the knight walking slowly so the scene never stalls.
  const crawl = () => { crawlTimer = 0; if (stopped || finishing) return; if (!known && target < 40) { target++; wake(); } crawlTimer = win.setTimeout(crawl, 700); };
  const tickCount = () => {
    countFrame = 0;
    if (stopped) return;
    shownCount += Math.max(1, Math.ceil((goalCount - shownCount) / 8));
    if (shownCount > goalCount) shownCount = goalCount;
    count.textContent = shownCount.toLocaleString('en-US');
    if (shownCount < goalCount) countFrame = win.requestAnimationFrame(tickCount);
  };
  const rotate = () => {
    quipTimer = 0; if (stopped) return;
    quip.classList.add('out');
    quipTimer = win.setTimeout(() => {
      quipIndex = (quipIndex + 1) % QUIPS.length; quip.textContent = QUIPS[quipIndex] + '…'; quip.classList.remove('out');
      quipTimer = win.setTimeout(rotate, 2600);
    }, 260);
  };
  if (motion()) { crawlTimer = win.setTimeout(crawl, 500); quipTimer = win.setTimeout(rotate, 2600); }

  return {
    element,
    /** {text, fraction (0–1 or null), games} */
    update({text, fraction = null, games = null} = {}) {
      if (stopped) return;
      if (text) phase.textContent = text;
      if (fraction != null && Number.isFinite(fraction)) {
        known = true;
        target = Math.max(target, Math.min(62, Math.round(fraction * 63)));
        bar.firstChild.style.width = Math.round(100 * Math.min(1, fraction)) + '%';
        bar.setAttribute('aria-valuenow', String(Math.round(100 * Math.min(1, fraction))));
      }
      if (games != null && games > goalCount) {
        goalCount = games;
        if (!motion()) { shownCount = goalCount; count.textContent = goalCount.toLocaleString('en-US'); }
        else if (!countFrame) countFrame = win.requestAnimationFrame(tickCount);
        unit.textContent = goalCount === 1 ? 'game found' : 'games found';
      }
      if (motion()) wake(); else { while (step < target) hop(); }
    },
    /** Sprint to the last square; resolves when the tour is complete. */
    finish() {
      if (stopped) return Promise.resolve();
      bar.firstChild.style.width = '100%';
      phase.textContent = 'Putting your story together…';
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
      win.clearTimeout(hopTimer); win.clearTimeout(crawlTimer); win.clearTimeout(quipTimer); win.cancelAnimationFrame(countFrame);
      const done = finishing; finishing = null; done?.();
    },
  };
}
