// The first-run intro: a short, two-step tour of the toolbar's Player profile and
// Learn with Chess Review buttons. It is a one-time welcome, not a per-version
// screen. Keep these keys fixed across releases and separate from settings,
// layouts and learning progress.
export const INTRO_TOUR_SEEN = 'introTour:seen';
// Markers from the earlier puzzles note. Anyone who saw it (or opted out) is not a
// first-time user, so it suppresses the intro as well.
export const LEGACY_ANNOUNCEMENT_KEYS = ['learningAnnouncement:puzzles:seen', 'learningAnnouncement:puzzles:disabled'];
const keys = [INTRO_TOUR_SEEN, ...LEGACY_ANNOUNCEMENT_KEYS];
const lockName = 'chess-review-learning-announcement';

export const INTRO_STEPS = [
  {target: '#profileToggle', title: 'Your player profile',
    text: 'See how you really play: accuracy, openings, habits and endings from your recent games, all in one place.'},
  {target: '#learningToggle', title: 'Learn with Chess Review',
    text: 'Sharpen your game with 50,000 puzzles and opening lessons. Free, offline and ready whenever you are.'},
];

function locallySuppressed(local) {
  return keys.some(key => local?.getItem(key));
}
function rememberLocally(local, key) {
  try { local?.setItem(key, 'true'); } catch { /* Extension storage remains authoritative. */ }
}

export async function claimLearningAnnouncement({storage, local, locks, eligible = () => true}) {
  // Without an origin-wide lock two tabs could both read an absent marker.
  // Fail closed on unavailable/broken storage: missing persistence must never nag.
  if (!locks?.request) return false;
  try {
    return await locks.request(lockName, async () => {
      if (!eligible() || locallySuppressed(local)) return false;
      const stored = await storage.get(keys);
      if (keys.some(key => stored[key]) || !eligible()) return false;
      await storage.set({[INTRO_TOUR_SEEN]: true});
      // Remember before mounting, even if the tab closes before "Got it": the
      // intro shows at most once, ever.
      rememberLocally(local, INTRO_TOUR_SEEN);
      const saved = await storage.get(keys);
      return saved[INTRO_TOUR_SEEN] === true && eligible();
    });
  } catch { return false; }
}

export function mountLearningAnnouncement({document, storage, motion = () => true}) {
  const win = document.defaultView;
  let local;
  try { local = win.localStorage; } catch { return {close() {}, dispose() {}}; }
  const persistence = {storage, local, locks: win.navigator.locks};
  const targets = INTRO_STEPS.map(step => document.querySelector(step.target));
  const getComputedStyle = element => win.getComputedStyle(element);
  let closed = false, attempting = false, dismissing = false, morphing = false, step = 0;
  let card, copy, heading, text, dots, gotIt, overlay, arrow, frame = 0, observer, dismissTimer, morphTimer;
  const animations = new Set();
  const cleanups = [];
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    cleanups.push(() => target.removeEventListener(type, fn, options));
  };
  const target = () => targets[step];
  const animated = () => motion() && !win.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !!card?.animate;
  function play(element, keyframes, options) {
    const animation = element.animate(keyframes, options);
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    return animation;
  }
  function close() {
    if (closed) return;
    closed = true;
    win.clearTimeout(dismissTimer); win.clearTimeout(morphTimer);
    animations.forEach(animation => animation.cancel());
    const restoreFocus = card?.contains(document.activeElement);
    cleanups.splice(0).forEach(cleanup => cleanup());
    observer?.disconnect();
    win.cancelAnimationFrame(frame);
    card?.remove(); overlay?.remove();
    targets.forEach(button => button?.classList.remove('learning-announcement-target'));
    if (restoreFocus) target()?.focus({preventScroll: true});
  }
  function dismiss() {
    if (closed || dismissing) return;
    if (!animated()) return close();
    dismissing = true;
    if (card.contains(document.activeElement)) target()?.focus({preventScroll: true});
    card.inert = true;
    try {
      play(card, [
        {opacity: 1, transform: 'scale(1)'},
        {opacity: 1, transform: 'scale(1.025)', offset: .3},
        {opacity: 0, transform: 'scale(.92)'},
      ], {duration: 180, easing: 'ease-out', fill: 'forwards'}).finished.then(() => close(), () => close());
      play(overlay, [{opacity: 1}, {opacity: 0}], {duration: 140, fill: 'forwards'});
      // Always finish cleanup if animation completion is interrupted.
      dismissTimer = win.setTimeout(() => close(), 250);
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
    targets.forEach((button, index) => button?.classList.toggle('learning-announcement-target', index === step));
    // The ring draws in around each newly highlighted button. Script-driven, so
    // it never disturbs the toolbar buttons' own CSS animations.
    const button = target();
    if (button?.animate && animated()) {
      play(button, [
        {outlineOffset: '12px', outlineColor: 'transparent', boxShadow: '0 0 0 18px transparent'},
        {outlineOffset: '4px', outlineColor: getComputedStyle(button).outlineColor, boxShadow: getComputedStyle(button).boxShadow},
      ], {duration: 560, easing: 'cubic-bezier(.16,1,.3,1)'});
    }
  }
  function position() {
    frame = 0;
    if (!card?.isConnected || dismissing) return;
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
    if (closed || dismissing || morphing) return;
    if (step >= INTRO_STEPS.length - 1) return dismiss();
    const from = card.getBoundingClientRect().height;
    const swap = () => {
      if (closed) return;
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
    morphTimer = win.setTimeout(() => { if (step === 0) swap(); finish(); }, 900);
    out = play(copy, [{opacity: 1, transform: 'translateX(0)'}, {opacity: 0, transform: 'translateX(-18px)'}],
      {duration: 150, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards'});
    out.finished.then(() => {
      if (closed || !morphing) return;
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
    // Using either button is the best possible "got it": the tour ends for good.
    targets.forEach(button => listen(button, 'click', () => close(), true));
    listen(document, 'keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    }, true);
    listen(win, 'resize', schedulePosition);
    listen(document, 'scroll', schedulePosition, true);
    // Toolbar buttons can shift without resizing (labels and fitting settle
    // after a window change), which a ResizeObserver never reports.
    listen(document, 'animationend', schedulePosition, true);
    listen(document, 'transitionend', schedulePosition, true);
    let last = '';
    const watch = win.setInterval(() => {
      const r = target()?.getBoundingClientRect();
      const key = r ? `${r.left},${r.top},${r.width},${r.height},${win.innerWidth},${win.innerHeight}` : '';
      if (key !== last) { last = key; if (!morphing) schedulePosition(); }
    }, 400);
    cleanups.push(() => win.clearInterval(watch));
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(() => { if (!morphing) schedulePosition(); });
      [card, ...targets, document.querySelector('#canvas'), document.querySelector('.insight-panel')].filter(Boolean).forEach(element => observer.observe(element));
    }
    position();
  }
  async function attempt() {
    if (closed || attempting || document.visibilityState !== 'visible') return;
    attempting = true;
    const claimed = await claimLearningAnnouncement({...persistence,
      eligible: () => !closed && document.visibilityState === 'visible' && targets.every(button => button?.isConnected)
        && !document.querySelector('.has-learning, .has-profile')});
    if (claimed && !closed) show();
    else close();
  }
  listen(document, 'visibilitychange', attempt);
  listen(win, 'pagehide', () => close(), {once: true});
  const ready = attempt();
  return {close, dispose: () => close(), ready, get step() { return step; }};
}
