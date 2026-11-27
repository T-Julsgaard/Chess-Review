// The intro: Playstyle, Learn, then a live demonstration of engine explanations.
// It shows once, ever, to new installs and to existing
// users alike (updates included), not once per version. Keep this key fixed
// across releases and separate from settings, layouts and learning progress.
export const INTRO_TOUR_SEEN = 'introTour:seen';
// The earlier puzzles note's markers ('learningAnnouncement:puzzles:seen' and
// ':disabled') do not suppress the tour: that note never introduced the Player
// profile, so users updating past it see the tour too.
const keys = [INTRO_TOUR_SEEN];
// The engine card needs a loaded game's Insights switch. A tour that starts
// without a game (a new user opening the toolbar icon) stops after Learn and
// sets this, and the first game that loads shows the engine card on its own.
export const INTRO_EXPLANATIONS_PENDING = 'introTour:explanationsPending';
const lockName = 'chess-review-learning-announcement';

export const INTRO_STEPS = [
  {target: '.section-btn[data-section="playstyle"]', title: 'Your player profile',
    text: 'See how you really play: accuracy, openings, habits and endings from your recent games, all in one place.'},
  {target: '.section-btn[data-section="learn"]', title: 'Learn with Chess Review',
    text: 'Sharpen your game with 50,000 puzzles and opening lessons. Free, offline and ready whenever you are.'},
  {target: '.ip-explanations-toggle', fallback: '.insight-panel', title: 'Engine explanations',
    text: 'See why a move works, what went wrong and what to play instead. Engine explanations are now on. Use the switch in Insights to bring your coach back anytime.'},
];

function locallySuppressed(local) {
  return keys.some(key => local?.getItem(key));
}
function rememberLocally(local, key) {
  try { local?.setItem(key, 'true'); } catch { /* Extension storage remains authoritative. */ }
}

export async function claimLearningAnnouncement({storage, local, locks, eligible = () => true, deferExplanations = false}) {
  // Without an origin-wide lock two tabs could both read an absent marker.
  // Fail closed on unavailable/broken storage: missing persistence must never nag.
  if (!locks?.request) return false;
  try {
    return await locks.request(lockName, async () => {
      if (!eligible() || locallySuppressed(local)) return false;
      const stored = await storage.get(keys);
      if (keys.some(key => stored[key]) || !eligible()) return false;
      await storage.set({[INTRO_TOUR_SEEN]: true, ...(deferExplanations ? {[INTRO_EXPLANATIONS_PENDING]: true} : {})});
      // Remember before mounting, even if the tab closes before "Got it": the
      // intro shows at most once, ever.
      rememberLocally(local, INTRO_TOUR_SEEN);
      const saved = await storage.get(keys);
      return saved[INTRO_TOUR_SEEN] === true && eligible();
    });
  } catch { return false; }
}

// 'show' hands the waiting engine card to exactly one tab, 'wait' keeps it for
// a later chance, and 'done' means there is nothing left to show.
export async function claimDeferredExplanations({storage, locks, eligible = () => true}) {
  if (!locks?.request) return 'done';
  const key = INTRO_EXPLANATIONS_PENDING;
  try {
    return await locks.request(lockName, async () => {
      if ((await storage.get([key]))[key] !== true) return 'done';
      if (!eligible()) return 'wait';
      await storage.set({[key]: false});
      if ((await storage.get([key]))[key] !== false) return 'done';
      if (eligible()) return 'show';
      await storage.set({[key]: true});
      return 'wait';
    });
  } catch { return 'done'; }
}

// The engine card's demonstration: a pause to find the switch, the switch
// sliding on, then the coach falling away before Got it is ready.
// A coach still loading or rising in (a game that just loaded) arrives and stays in view
// for COACH_SEEN first, waiting at most COACH_ARRIVAL.
const SWITCH_SLIDE = 350, COACH_FALL = 600, COACH_SEEN = 700, COACH_ARRIVAL = 4000;

export function mountLearningAnnouncement({document, storage, motion = () => true, setEngineExplanations = () => {},
  explanationsDelay = 1500}) {
  const win = document.defaultView;
  let local;
  try { local = win.localStorage; } catch { return {close() {}, dispose() {}}; }
  const persistence = {storage, local, locks: win.navigator.locks};
  const last = INTRO_STEPS.length - 1;
  // Insights replaces its switch on each render; always resolve the live target.
  const targets = () => INTRO_STEPS.map(step => document.querySelector(step.target)
    || (step.fallback && document.querySelector(step.fallback)));
  // Without a game, Insights has no explanations switch to demonstrate.
  const engineReady = () => !!document.querySelector(INTRO_STEPS[last].target);
  // `close()` hides the card (a tour without a game then waits for one);
  // `ended` stops everything for this page.
  let ended = false, showing = false, attempting = false, dismissing = false, morphing = false, step = 0;
  let phase = 'tour', generation = 0, pendingStored = false;
  let explanationsIntroduced = false, enablingExplanations = false, explanationsTimer = 0, applyExplanations = null;
  let card, copy, heading, text, dots, gotIt, overlay, arrow, frame = 0, observer, dismissTimer, morphTimer, gameWatch;
  const animations = new Set();
  const cleanups = [], cardCleanups = [];
  const listen = (target, type, fn, options, list = cleanups) => {
    target.addEventListener(type, fn, options);
    list.push(() => target.removeEventListener(type, fn, options));
  };
  const target = () => targets()[step];
  const visible = () => document.visibilityState === 'visible';
  const sectionOpen = () => !!document.querySelector('.has-learning, .has-profile');
  const tourEligible = () => !ended && visible() && targets().every(button => button?.isConnected) && !sectionOpen();
  const explanationsEligible = () => !ended && visible() && engineReady() && !sectionOpen();
  function highlightTarget() {
    document.querySelectorAll('.learning-announcement-target').forEach(element => element.classList.remove('learning-announcement-target'));
    target()?.classList.add('learning-announcement-target');
  }
  const moving = () => motion() && !win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // `paced` plays the demonstration; skipping the card applies the setting at once.
  function introduceExplanations({paced = true} = {}) {
    explanationsIntroduced = true;
    enablingExplanations = true;
    // Keep keyboard focus on Got it while the switch changes and the preference saves.
    gotIt?.setAttribute('aria-disabled', 'true');
    const apply = () => {
      if (applyExplanations !== apply) return;
      applyExplanations = null;
      win.clearTimeout(explanationsTimer);
      const watching = paced && explanationsDelay > 0 && showing && moving();
      // Use the same setting path as the Insights switch, including its coach exit.
      const saved = Promise.resolve().then(() => setEngineExplanations(true));
      // A tour that started without a game no longer owes the engine card once
      // the preference is saved; a failure brings the card back with a game.
      if (pendingStored) saved.then(() => storage.set({[INTRO_EXPLANATIONS_PENDING]: false}))
        .catch(() => { /* Reported below. */ });
      let ready = saved.catch(error => win.console.warn('Intro engine explanations:', error));
      // Got it waits until the coach has fallen out of view.
      if (watching) ready = ready.then(() => new Promise(resolve => { explanationsTimer = win.setTimeout(resolve, COACH_FALL); }));
      ready.finally(() => {
          enablingExplanations = false;
          if (!showing) return;
          gotIt.removeAttribute('aria-disabled');
          highlightTarget(); schedulePosition();
        });
    };
    applyExplanations = apply;
    if (!paced || !explanationsDelay) return apply();
    // Let the user find the switch (still off, coach still there) before it changes.
    const flip = () => {
      const live = showing && document.querySelector(INTRO_STEPS[last].target);
      if (!live || !moving()) return apply();
      // Insights rebuilds its switch on save, so slide the one on screen first.
      live.setAttribute('aria-checked', 'true');
      explanationsTimer = win.setTimeout(apply, SWITCH_SLIDE);
    };
    // A game that just loaded may still be loading or bringing in its coach;
    // let it arrive and be seen before it falls away again.
    const deadline = Date.now() + COACH_ARRIVAL;
    const arriving = () => !!document.querySelector('.coach-transition, .coach-frame:not(.ready)') && Date.now() < deadline;
    const whenSettled = () => {
      if (!arriving()) return flip();
      explanationsTimer = win.setTimeout(() => {
        if (arriving()) return whenSettled();
        explanationsTimer = win.setTimeout(flip, COACH_SEEN);
      }, 100);
    };
    explanationsTimer = win.setTimeout(whenSettled, explanationsDelay);
  }
  // Closing mid-demonstration still leaves the feature enabled, right away.
  const hurryExplanations = () => applyExplanations?.();
  const animated = () => moving() && !!card?.animate;
  function play(element, keyframes, options) {
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    return animation;
  }
  function closeCard() {
    const restoreFocus = card?.contains(document.activeElement);
    showing = false; dismissing = false; morphing = false;
    win.clearTimeout(dismissTimer); win.clearTimeout(morphTimer);
    animations.forEach(animation => animation.cancel());
    cardCleanups.splice(0).forEach(cleanup => cleanup());
    observer?.disconnect(); observer = null;
    win.cancelAnimationFrame(frame); frame = 0;
    card?.remove(); overlay?.remove();
    document.querySelectorAll('.learning-announcement-target').forEach(button => button.classList.remove('learning-announcement-target'));
    if (restoreFocus) target()?.focus({preventScroll: true});
    card = null;
  }
  function end() {
    if (ended) return;
    // Skipping the remaining cards still leaves the new feature enabled.
    if (showing && !explanationsIntroduced && engineReady()) introduceExplanations({paced: false});
    hurryExplanations();
    ended = true; generation++;
    closeCard();
    cleanups.splice(0).forEach(cleanup => cleanup());
  }
  function close() {
    if (ended) return;
    // Cancels a claim in flight; the engine card, if owed, waits for a later chance.
    if (!showing) { generation++; return; }
    if (!explanationsIntroduced && engineReady()) introduceExplanations({paced: false});
    hurryExplanations();
    if (explanationsIntroduced) return end();
    // No game yet (or it was closed mid-tour): the engine card waits for one.
    closeCard();
    phase = 'explanations'; step = last;
    if (!pendingStored) {
      pendingStored = true;
      Promise.resolve().then(() => storage.set({[INTRO_EXPLANATIONS_PENDING]: true}))
        .catch(error => win.console.warn('Intro engine explanations:', error));
    }
    watchForGame();
  }
  function dismiss() {
    if (!showing || dismissing) return;
    if (!animated()) return close();
    dismissing = true;
    const finish = () => { if (dismissing) close(); };
    if (card.contains(document.activeElement)) target()?.focus({preventScroll: true});
    card.inert = true;
    try {
      play(card, [
        {opacity: 1, transform: 'scale(1)'},
        {opacity: 1, transform: 'scale(1.025)', offset: .3},
        {opacity: 0, transform: 'scale(.92)'},
      ], {duration: 180, easing: 'ease-out', fill: 'forwards'}).finished.then(finish, finish);
      play(overlay, [{opacity: 1}, {opacity: 0}], {duration: 140, fill: 'forwards'});
      // Always finish cleanup if animation completion is interrupted.
      dismissTimer = win.setTimeout(finish, 250);
    } catch { close(); }
  }
  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
  }
  function svg(tag, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }
  function renderStep() {
    const current = INTRO_STEPS[step];
    card.dataset.step = String(step + 1);
    heading.textContent = current.title;
    text.textContent = current.text;
    dots.setAttribute('aria-label', `Step ${step + 1} of ${INTRO_STEPS.length}`);
    [...dots.children].forEach((dot, index) => dot.classList.toggle('active', index === step));
    highlightTarget();
    if (step === last) introduceExplanations();
  }
  function position() {
    frame = 0;
    if (!card?.isConnected || dismissing) return;
    highlightTarget();
    card.dataset.motion = motion() ? 'on' : 'off';
    overlay.dataset.motion = card.dataset.motion;
    const bar = document.querySelector('.topbar').getBoundingClientRect();
    const insight = document.querySelector('.insight-panel')?.getBoundingClientRect();
    const accuracy = document.querySelector('[data-mod="accuracy"]')?.getBoundingClientRect();
    // Use the gutter beside Insights and Accuracy when it can hold readable copy.
    // Measure before the height check, since a narrower card wraps more lines.
    const panelRight = Math.max(insight?.right || 0, accuracy?.right || 0);
    const available = win.innerWidth - panelRight - 32;
    card.style.width = `${panelRight > 0 && available >= 220 ? Math.min(280, available) : 280}px`;
    // Align with Insights when it sits alongside the note. Stacked/scrolled
    // layouts keep the note in view beneath the toolbar.
    const align = insight && insight.top >= bar.bottom + 16
      && insight.top + card.offsetHeight <= win.innerHeight - 16;
    card.style.top = `${align ? insight.top : bar.bottom + 22}px`;
    overlay.setAttribute('viewBox', `0 0 ${win.innerWidth} ${win.innerHeight}`);
    overlay.style.width = `${win.innerWidth}px`;
    overlay.style.height = `${win.innerHeight}px`;
    let box = card.getBoundingClientRect();
    const button = target();
    if (!button) { arrow.style.display = 'none'; return; }
    let rect = button.getBoundingClientRect();
    // Never cover the button the note is pointing at.
    const covers = r => r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top;
    if (covers(rect)) {
      const below = rect.bottom + 16, above = rect.top - box.height - 16;
      if (below + box.height <= win.innerHeight - 16) card.style.top = `${below}px`;
      else if (above >= bar.bottom + 16) card.style.top = `${above}px`;
      box = card.getBoundingClientRect();
    }
    const visible = rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= win.innerHeight
      && rect.left >= 0 && rect.right <= win.innerWidth;
    arrow.style.display = visible && !covers(rect) ? '' : 'none';
    if (!visible || covers(rect)) return;
    const above = rect.bottom <= box.top;
    const x = above ? Math.max(box.left + 24, Math.min(box.right - 24, rect.left + rect.width / 2)) : box.left + box.width / 2;
    const y = above ? box.top - 5 : box.bottom + 5;
    const endX = above ? rect.left + rect.width / 2 : rect.right + 2;
    const endY = above ? rect.bottom + 9 : rect.top + rect.height / 2;
    // A single curve leaves the bottom center and eases into the button's
    // right edge horizontally, without a separate turn near the arrowhead.
    const gutter = Math.min(win.innerWidth - 12, Math.max(box.right, rect.right) + 18);
    const drop = Math.max(36, Math.min(140, (endY - y) * .35));
    const d = above
      ? `M ${x} ${y} V ${(y + endY) / 2} H ${endX} V ${endY}`
      : `M ${x} ${y} C ${x} ${y + drop}, ${gutter} ${endY}, ${endX} ${endY}`;
    arrow.setAttribute('d', d);
    // The CSS copy lets the arrow glide between buttons when the step changes.
    arrow.style.setProperty?.('d', `path("${d}")`);
  }
  function schedulePosition() {
    if (!frame) frame = win.requestAnimationFrame(position);
  }
  function advance() {
    if (!showing || dismissing || morphing || enablingExplanations) return;
    // Without a game the tour pauses after Learn; the engine card waits for one.
    if (step >= last || (step === last - 1 && !engineReady())) return dismiss();
    const previousStep = step;
    const from = card.getBoundingClientRect().height;
    const swap = () => {
      if (!showing) return;
      step++;
      overlay.classList.add('learning-announcement-morph');
      renderStep();
      card.style.height = '';
      position();
    };
    if (!animated()) { swap(); overlay.classList.remove('learning-announcement-morph'); return; }
    morphing = true;
    let out;
    const finish = () => {
      if (!morphing) return;
      morphing = false;
      win.clearTimeout(morphTimer);
      // The slide-out holds the old text hidden; never let it outlive the swap.
      out?.cancel();
      overlay?.classList.remove('learning-announcement-morph');
    };
    // The text slides out, the card settles to its new height while the arrow
    // glides to the next button, then the new text slides in.
    morphTimer = win.setTimeout(() => { if (step === previousStep) swap(); finish(); }, 900);
    out = play(copy, [{opacity: 1, transform: 'translateX(0)'}, {opacity: 0, transform: 'translateX(-18px)'}],
      {duration: 150, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards'});
    out.finished.then(() => {
      if (!showing || !morphing) return;
      swap();
      const to = card.getBoundingClientRect().height;
      play(card, [{height: `${from}px`}, {height: `${to}px`}], {duration: 320, easing: 'cubic-bezier(.16,1,.3,1)'});
      play(copy, [{opacity: 0, transform: 'translateX(18px)'}, {opacity: 1, transform: 'translateX(0)'}],
        {duration: 320, delay: 60, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards'})
        .finished.then(() => win.setTimeout(finish, 160), finish);
      out.cancel();
    }, finish);
  }
  function show() {
    showing = true;
    card = node('aside', 'learning-announcement');
    card.setAttribute('aria-labelledby', 'learning-announcement-title');
    dots = node('div', 'learning-announcement-steps');
    dots.setAttribute('role', 'img');
    INTRO_STEPS.forEach(() => dots.append(node('i')));
    heading = node('h2'); heading.id = 'learning-announcement-title';
    text = node('p');
    copy = node('div', 'learning-announcement-copy');
    copy.setAttribute('role', 'status');
    copy.append(node('span', 'learning-announcement-eyebrow', 'Welcome to Chess Review'), heading, text);
    const actions = node('div', 'learning-announcement-actions');
    gotIt = node('button', 'learning-announcement-dismiss', 'Got it');
    gotIt.type = 'button';
    gotIt.addEventListener('click', advance);
    actions.append(gotIt); card.append(dots, copy, actions);
    overlay = svg('svg', {class: 'learning-announcement-arrows', 'aria-hidden': 'true', preserveAspectRatio: 'none'});
    const defs = svg('defs', {}), marker = svg('marker', {id: 'learning-announcement-tip', viewBox: '0 0 12 12', refX: '10', refY: '6', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse'});
    marker.append(svg('path', {d: 'M 2 2 L 10 6 L 2 10', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}));
    defs.append(marker); overlay.append(defs);
    arrow = svg('path', {class: 'learning-announcement-arrow', 'marker-end': 'url(#learning-announcement-tip)'});
    overlay.append(arrow);
    renderStep();
    document.body.append(overlay, card);
    const listenCard = (target, type, fn, options) => listen(target, type, fn, options, cardCleanups);
    // Delegation also catches switches replaced while the game is rendering.
    listenCard(document, 'click', event => {
      if (INTRO_STEPS.some(step => event.target.closest?.(step.target))) close();
    }, true);
    listenCard(document, 'keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    }, true);
    listenCard(win, 'resize', schedulePosition);
    listenCard(document, 'scroll', schedulePosition, true);
    // Section buttons can move without resizing while the layout settles.
    listenCard(document, 'animationend', schedulePosition, true);
    listenCard(document, 'transitionend', schedulePosition, true);
    let lastRect = '';
    const watch = win.setInterval(() => {
      const r = target()?.getBoundingClientRect();
      const key = r ? `${r.left},${r.top},${r.width},${r.height},${win.innerWidth},${win.innerHeight}` : '';
      if (key !== lastRect) { lastRect = key; if (!morphing) schedulePosition(); }
    }, 400);
    cardCleanups.push(() => win.clearInterval(watch));
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(() => { if (!morphing) schedulePosition(); });
      [card, ...targets(), document.querySelector('#canvas'), document.querySelector('.insight-panel')].filter(Boolean).forEach(element => observer.observe(element));
    }
    position();
  }
  // A game can arrive from the saved-games list, a section closing, or a rerender;
  // watching the page covers all of them without each caller knowing about the intro.
  function watchForGame() {
    if (ended || gameWatch || !win.MutationObserver) return;
    let queued = 0;
    const queue = () => { if (!queued) queued = win.setTimeout(() => { queued = 0; attempt(); }, 100); };
    gameWatch = new win.MutationObserver(queue);
    gameWatch.observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
    cleanups.push(() => { gameWatch.disconnect(); gameWatch = null; win.clearTimeout(queued); });
    queue();
  }
  async function attempt() {
    if (ended || showing || attempting || !visible()) return;
    // While waiting for a game, skip the lock and storage until one is on screen.
    if (gameWatch && !explanationsEligible()) return;
    attempting = true;
    const run = generation, current = () => run === generation;
    try {
      if (phase === 'tour') {
        const deferExplanations = !engineReady();
        const claimed = await claimLearningAnnouncement({...persistence, deferExplanations,
          eligible: () => current() && tourEligible()});
        if (claimed) pendingStored = deferExplanations;
        if (claimed && current()) {
          await setEngineExplanations(false);
          if (ended) return;
          if (current()) { step = 0; show(); return; }
        }
        if (ended) return;
        phase = 'explanations';
      }
      const result = await claimDeferredExplanations({...persistence, eligible: () => current() && explanationsEligible()});
      if (result === 'show' && current() && !ended) { step = last; show(); return; }
      // Hand back an engine card this page claimed but can no longer show.
      if (result === 'show') await storage.set({[INTRO_EXPLANATIONS_PENDING]: true});
      if (ended) return;
      if (result === 'done') return end();
      watchForGame();
    } catch (error) { win.console.warn('Intro initialization:', error); end(); }
    finally { attempting = false; }
  }
  listen(document, 'visibilitychange', attempt);
  listen(win, 'pagehide', () => end(), {once: true});
  const ready = attempt();
  return {close, dispose: () => end(), ready, get step() { return step; }};
}
