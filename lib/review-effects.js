// Presentation only: consumes existing categories, never changes move grading.
export function createReviewEffects(document) {
  let lastKey = null, lastCategory = null, overlay = null, timer = null;
  const view = document.defaultView;
  const categories = new Set(['brilliant','great','best','excellent','good','inacc','mistake','miss','blunder']);
  function clear() {
    view.clearTimeout(timer);
    overlay?.remove();
    overlay = null;
  }
  function show(board, {category, square, flipped, motion = true}) {
    clear();
    if (!board || !categories.has(category)) return;
    const node = document.createElement('div');
    overlay = node;
    node.className = 'dopamine-effect';
    node.dataset.category = category;
    node.dataset.motion = motion && !view.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off';
    node.setAttribute('aria-hidden', 'true');
    let originX = 3.5, originY = 3.5;
    if (/^[a-h][1-8]$/.test(square || '')) {
      const file = square.charCodeAt(0) - 97, rank = Number(square[1]) - 1;
      originX = flipped ? 7 - file : file;
      originY = flipped ? rank : 7 - rank;
    }
    node.style.setProperty('--effect-x', (originX + .5) * 12.5 + '%');
    node.style.setProperty('--effect-y', (originY + .5) * 12.5 + '%');
    const add = (name, parent = node) => {
      const child = document.createElement('span');
      child.className = 'dopamine-' + name;
      parent.append(child);
      return child;
    };
    add('origin');
    if (node.dataset.motion === 'on') {
      const major = category === 'brilliant' || category === 'blunder';
      if (major || ['great','mistake','miss'].includes(category)) add('ripple');
      if (major) {
        const wave = add('wave');
        // An 8×8 layer follows the board without changing its squares or input.
        for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
          add('wave-cell', wave).style.setProperty('--wave-delay', Math.round(Math.hypot(col - originX, row - originY) * 65) + 'ms');
        }
        add('aura');
        if (category === 'brilliant') add('sweep');
      }
      if (major || ['great','best'].includes(category)) {
        const count = major ? 24 : 10;
        for (let i = 0; i < count; i++) {
          const spark = add('spark'), angle = i * 2.39996, radius = 12 + i % 5 * 5;
          spark.style.setProperty('--dx', Math.cos(angle) * radius + 'cqw');
          spark.style.setProperty('--dy', Math.sin(angle) * radius + 'cqw');
          spark.style.setProperty('--i', i);
        }
      }
    }
    board.append(node);
    timer = view.setTimeout(clear, ['brilliant','blunder'].includes(category) ? 2400 : 1300);
  }
  return {
    clear, show,
    update(board, options) {
      const changed = options.key !== lastKey;
      const firstGrade = lastCategory == null && options.category != null;
      if (changed || options.category !== lastCategory || !options.enabled) clear();
      lastKey = options.key; lastCategory = options.category;
      // A move's first result can arrive after navigation. Repaints and later
      // corrections cannot replay it, nor can toggling the mode at the same move.
      if ((changed || firstGrade) && options.enabled) show(board, options);
    },
  };
}
