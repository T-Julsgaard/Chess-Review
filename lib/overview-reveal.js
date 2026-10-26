export const OVERVIEW_REVEAL_DURATION = 1200;

// One clock drives numbers, writing and meters. Full text reserves its final
// geometry and accessible name while a separate, decorative copy animates.
export function createOverviewReveal({
  requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = id => cancelAnimationFrame(id),
} = {}) {
  const seen = new WeakMap();
  let active = null;

  function stop() {
    if (!active) return;
    cancelFrame(active.frame);
    active.finish();
    active = null;
  }

  function matches(panel, game, key) {
    return !!active && active.panel === panel && panel.isConnected && active.game === game && active.key === key;
  }

  function mount(panel, {game, key, enabled = true}) {
    stop();
    let keys = seen.get(game);
    if (!keys) { keys = new Set(); seen.set(game, keys); }
    if (keys.has(key)) return;
    keys.add(key);
    if (!enabled) return;

    const doc = panel.ownerDocument, win = doc.defaultView;
    const texts = [...panel.querySelectorAll('.acc-name,.acc-dial-label,.acc-elo-label,.acc-phase-values > span,.acc-page-name,.phase-summary-label,.phase-report-name')];
    const numbers = [...panel.querySelectorAll('.acc-val,.acc-elo,.acc-phase-values > strong,.phase-report-score')];
    const copies = [];
    for (const node of [...texts, ...numbers]) {
      const original = [...node.childNodes], text = node.textContent;
      const slot = doc.createElement('span'), ghost = doc.createElement('span'), ink = doc.createElement('span'), accessible = doc.createElement('span');
      slot.className = 'acc-reveal-slot';
      accessible.className = 'acc-reveal-accessible'; accessible.textContent = text;
      ghost.className = 'acc-reveal-ghost'; ghost.append(...original.map(child => child.cloneNode(true))); ghost.setAttribute('aria-hidden', 'true');
      ink.className = 'acc-reveal-ink'; ink.setAttribute('aria-hidden', 'true');
      slot.append(accessible, ghost, ink); node.replaceChildren(slot);
      const match = numbers.includes(node) && text.match(/^(≈\s*)?(\d+(?:\.\d+)?)(%)?$/);
      let numeral = null;
      if (match) {
        numeral = doc.createTextNode(''); ink.append(match[1] || '', numeral);
        if (match[3]) {
          const suffix = doc.createElement('span'); suffix.textContent = match[3];
          if (node.classList.contains('acc-val')) suffix.className = 'acc-unit';
          ink.append(suffix);
        }
      }
      copies.push({node, original, text, ink, match, numeral});
    }
    const arcs = [...panel.querySelectorAll('.acc-dial-fill')].map(node => ({node, value: node.getAttribute('stroke-dasharray')}));
    const bars = [...panel.querySelectorAll('.acc-phase-bars i')].map(node => ({node, value: node.style.width, style: node.getAttribute('style')}));
    let started = null;
    panel.dataset.revealing = 'true';
    const finish = () => {
      for (const {node, original} of copies) node.replaceChildren(...original);
      for (const {node, value} of arcs) node.setAttribute('stroke-dasharray', value);
      for (const {node, style} of bars) node.setAttribute('style', style);
      delete panel.dataset.revealing;
    };
    const session = {panel, game, key, frame: 0, finish};
    active = session;
    const paint = progress => {
      const eased = 1 - Math.pow(1 - progress, 3);
      for (const {text, ink, match, numeral} of copies) {
        if (match) {
          const decimals = match[2].includes('.') ? match[2].split('.')[1].length : 0;
          numeral.textContent = (Number(match[2]) * eased).toFixed(decimals);
        } else ink.textContent = [...text].slice(0, Math.ceil([...text].length * Math.min(1, progress / .7))).join('');
      }
      for (const {node, value} of arcs) node.setAttribute('stroke-dasharray', parseFloat(value) * eased + ' 100');
      for (const {node, value} of bars) node.style.width = parseFloat(value) * eased + '%';
    };
    paint(0);
    const tick = now => {
      if (active !== session) return;
      if (!panel.isConnected) { stop(); return; }
      if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { stop(); return; }
      // Cached reviews must wait until startup shutters have uncovered the UI.
      // Background tabs likewise retain the whole reveal for their first view.
      if (doc.hidden || doc.body.hasAttribute('data-starting') || doc.getElementById('startup')) {
        session.frame = requestFrame(tick); return;
      }
      if (started == null) started = now;
      const progress = Math.min(1, Math.max(0, (now - started) / OVERVIEW_REVEAL_DURATION));
      paint(progress);
      if (progress === 1) { finish(); active = null; }
      else session.frame = requestFrame(tick);
    };
    session.frame = requestFrame(tick);
  }
  return {mount, matches, stop};
}
