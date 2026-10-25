// A feature announcement, not a per-version welcome screen. Keep these keys fixed
// across releases and separate from settings, layouts and learning progress.
export const LEARNING_ANNOUNCEMENT_SEEN = 'learningAnnouncement:puzzles:seen';
export const LEARNING_ANNOUNCEMENT_DISABLED = 'learningAnnouncement:puzzles:disabled';
const keys = [LEARNING_ANNOUNCEMENT_SEEN, LEARNING_ANNOUNCEMENT_DISABLED];
const lockName = 'chess-review-learning-announcement';

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
      await storage.set({[LEARNING_ANNOUNCEMENT_SEEN]: true});
      // Remember before mounting, even if the tab closes without a dismissal.
      rememberLocally(local, LEARNING_ANNOUNCEMENT_SEEN);
      const saved = await storage.get(keys);
      return saved[LEARNING_ANNOUNCEMENT_SEEN] === true && !saved[LEARNING_ANNOUNCEMENT_DISABLED] && eligible();
    });
  } catch { return false; }
}

export async function disableLearningAnnouncement({storage, local}) {
  // A separate, permanent opt-out protects against a lost/reset "seen" marker.
  rememberLocally(local, LEARNING_ANNOUNCEMENT_DISABLED);
  try { await storage.set({[LEARNING_ANNOUNCEMENT_DISABLED]: true}); } catch {}
}

export function mountLearningAnnouncement({document, storage, motion = () => true}) {
  const win = document.defaultView;
  let local;
  try { local = win.localStorage; } catch { return {close() {}, dispose() {}}; }
  const persistence = {storage, local, locks: win.navigator.locks};
  const targets = [...document.querySelectorAll('#learningToggle, .learn-entry-button')];
  let closed = false, attempting = false, card, overlay, frame = 0, observer;
  const cleanups = [];
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    cleanups.push(() => target.removeEventListener(type, fn, options));
  };
  function close(optOut = false) {
    closed = true;
    if (optOut) void disableLearningAnnouncement(persistence);
    const restoreFocus = card?.contains(document.activeElement);
    cleanups.splice(0).forEach(cleanup => cleanup());
    observer?.disconnect();
    win.cancelAnimationFrame(frame);
    card?.remove(); overlay?.remove();
    targets.forEach(target => target.classList.remove('learning-announcement-target'));
    if (restoreFocus) targets[0]?.focus({preventScroll: true});
  }
  function node(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text) element.textContent = text;
    return element;
  }
  function svg(tag, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }
  function position() {
    frame = 0;
    if (!card?.isConnected) return;
    card.dataset.motion = motion() ? 'on' : 'off';
    overlay.dataset.motion = card.dataset.motion;
    targets.forEach(target => target.classList.add('learning-announcement-target'));
    const bar = document.querySelector('.topbar').getBoundingClientRect();
    card.style.top = `${bar.bottom + 22}px`;
    overlay.setAttribute('viewBox', `0 0 ${win.innerWidth} ${win.innerHeight}`);
    overlay.style.width = `${win.innerWidth}px`;
    overlay.style.height = `${win.innerHeight}px`;
    const box = card.getBoundingClientRect();
    targets.forEach((target, index) => {
      const rect = target.getBoundingClientRect(), path = overlay.querySelectorAll('.learning-announcement-arrow')[index];
      const visible = rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= win.innerHeight
        && rect.left >= 0 && rect.right <= win.innerWidth;
      const overlaps = rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top;
      path.style.display = visible && !overlaps ? '' : 'none';
      if (!visible || overlaps) return;
      const above = rect.bottom <= box.top;
      const x = above ? Math.max(box.left + 24, Math.min(box.right - 24, rect.left + rect.width / 2)) : box.right - 24;
      const y = above ? box.top - 5 : box.bottom + 5;
      const endX = above ? rect.left + rect.width / 2 : rect.right - Math.min(30, rect.width / 4);
      const endY = above ? rect.bottom + 9 : rect.top - 10;
      const bend = Math.max(18, Math.abs(endY - y) * .55);
      // Sweep down the right gutter instead of drawing through panel text.
      const gutter = Math.min(win.innerWidth - 12, Math.max(box.right, rect.right) + 18);
      path.setAttribute('d', above
        ? `M ${x} ${y} C ${x} ${y - bend}, ${endX} ${endY + bend}, ${endX} ${endY}`
        : `M ${x} ${y} C ${gutter} ${y + 32}, ${gutter} ${endY - 60}, ${endX} ${endY - 36} Q ${endX} ${endY - 18}, ${endX} ${endY}`);
    });
  }
  function schedulePosition() {
    if (!frame) frame = win.requestAnimationFrame(position);
  }
  function show() {
    card = node('aside', 'learning-announcement');
    card.setAttribute('aria-labelledby', 'learning-announcement-title');
    const heading = node('h2', '', 'A new place to grow your chess.');
    heading.id = 'learning-announcement-title';
    const copy = node('div', 'learning-announcement-copy');
    copy.setAttribute('role', 'status');
    copy.append(node('span', 'learning-announcement-eyebrow', 'A little note from the developer'), heading,
      node('p', '', "Hi! Chess Review now has a dedicated space for puzzles and learning. Sharpen your tactics, explore openings, and learn something new at your own pace."),
      node('p', 'learning-announcement-directions', 'Jump in with “Learn with Chess review” or “Solve Puzzles”. I hope you enjoy it!'));
    const actions = node('div', 'learning-announcement-actions');
    const gotIt = node('button', 'learning-announcement-dismiss', 'Got it, thanks!');
    const disable = node('button', 'learning-announcement-disable', 'Don’t show again');
    gotIt.type = disable.type = 'button';
    gotIt.addEventListener('click', () => close());
    disable.addEventListener('click', () => close(true));
    actions.append(gotIt, disable); card.append(copy, actions);
    overlay = svg('svg', {class: 'learning-announcement-arrows', 'aria-hidden': 'true', preserveAspectRatio: 'none'});
    const defs = svg('defs', {}), marker = svg('marker', {id: 'learning-announcement-tip', viewBox: '0 0 12 12', refX: '10', refY: '6', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse'});
    marker.append(svg('path', {d: 'M 2 2 L 10 6 L 2 10', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}));
    defs.append(marker); overlay.append(defs);
    targets.forEach(() => overlay.append(svg('path', {class: 'learning-announcement-arrow', 'marker-end': 'url(#learning-announcement-tip)'})));
    document.body.append(overlay, card);
    targets.forEach(target => listen(target, 'click', () => close(), true));
    listen(document, 'keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    }, true);
    listen(win, 'resize', schedulePosition);
    listen(card, 'animationend', schedulePosition);
    listen(document, 'scroll', schedulePosition, true);
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(schedulePosition);
      [card, ...targets, document.querySelector('#canvas')].filter(Boolean).forEach(target => observer.observe(target));
    }
    position();
  }
  async function attempt() {
    if (closed || attempting || document.visibilityState !== 'visible') return;
    attempting = true;
    const claimed = await claimLearningAnnouncement({...persistence,
      eligible: () => !closed && document.visibilityState === 'visible' && targets.length === 2 && targets.every(target => target.isConnected)
        && !document.querySelector('.has-learning')});
    if (claimed && !closed) show();
    else close();
  }
  listen(document, 'visibilitychange', attempt);
  listen(win, 'pagehide', () => close(), {once: true});
  const ready = attempt();
  return {close, dispose: () => close(), ready};
}
