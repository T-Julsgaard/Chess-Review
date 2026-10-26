// One retained rail keeps its painted position through result updates and quick
// direction changes. Geometry is measured in local units, including panel zoom.
export function createAccuracyNavigation({doc, el, names, select, motion}) {
  let page = null, target = null, flow = null, wake = null, focused = null;
  const current = el('span', {class: 'acc-nav-current', 'aria-hidden': 'true'});
  const trail = el('span', {class: 'acc-nav-wake', 'aria-hidden': 'true'});
  const buttons = names.map((name, i) => el('button', {
    type: 'button', role: 'tab', id: 'accuracy-tab-' + i,
    'aria-label': name, 'aria-controls': 'accuracy-page',
    onclick: () => select(i),
  }, el('span', {}, ['Accuracy', 'Quality', 'Advanced'][i])));
  const rail = el('div', {class: 'acc-pager acc-navigation', role: 'tablist', 'aria-label': 'Accuracy pages',
    onkeydown: event => {
      const next = {ArrowRight: page + 1, ArrowLeft: page - 1, Home: 0, End: names.length - 1}[event.key];
      if (next == null) return;
      event.preventDefault(); event.stopPropagation(); select(next);
    }}, trail, current, ...buttons);
  const transform = (x, width, height = 1) => `translateX(${x}px) scale(${width},${height})`;
  const sync = (next = page) => {
    const button = buttons[next];
    if (!button) return;
    buttons.forEach((item, i) => {
      item.setAttribute('aria-selected', String(i === next));
      item.tabIndex = i === next ? 0 : -1;
    });
    if (focused?.isConnected) focused.focus({preventScroll: true});
    focused = null;
    const destination = {x: button.offsetLeft, width: button.offsetWidth, height: button.offsetHeight};
    const changed = page != null && page !== next;
    page = next;
    if (!destination.width || !rail.isConnected) return;
    if (target && !changed && Object.keys(destination).every(key => destination[key] === target[key])) {
      if (!motion()) { flow?.cancel(); wake?.cancel(); }
      return;
    }
    const bounds = rail.getBoundingClientRect(), painted = current.getBoundingClientRect();
    const scale = bounds.width / rail.offsetWidth || 1;
    const start = {x: (painted.left - bounds.left) / scale - rail.clientLeft, width: painted.width / scale,
      height: painted.height / scale / destination.height};
    flow?.cancel(); wake?.cancel(); flow = wake = null;
    target = destination;
    for (const layer of [current, trail]) Object.assign(layer.style, {
      width: destination.width + 'px', transform: transform(destination.x, 1),
    });
    rail.dataset.ready = 'true';
    if (!changed || !start.width || !motion() || typeof current.animate !== 'function') return;
    const right = destination.x > start.x, lerp = (a, b, t) => a + (b - a) * t;
    // The front edge leads, the back edge catches up; the meniscus compresses
    // across the middle, then rebounds as the water comes to rest.
    const frames = Array.from({length: 33}, (_, i) => {
      const t = i / 32, lead = 1 - (1 - t) ** 4, lag = t * t * (3 - 2 * t);
      const left = lerp(start.x, destination.x, right ? lag : lead);
      const end = lerp(start.x + start.width, destination.x + destination.width, right ? lead : lag);
      const swell = Math.sin(Math.PI * t);
      const height = lerp(start.height, 1, lag) - .2 * swell + .045 * Math.sin(3 * Math.PI * t) * swell;
      return {offset: t, transform: transform(left, (end - left) / destination.width, height),
        borderRadius: (10 + 14 * swell) + 'px'};
    });
    flow = current.animate(frames, {duration: 380, easing: 'linear'});
    wake = trail.animate(frames.map(frame => ({...frame, opacity: Math.sin(Math.PI * frame.offset) * .32})),
      {duration: 480, easing: 'linear'});
    const activeFlow = flow, activeWake = wake;
    activeFlow.onfinish = activeFlow.oncancel = () => { if (flow === activeFlow) flow = null; };
    activeWake.onfinish = activeWake.oncancel = () => { if (wake === activeWake) wake = null; };
  };
  const observer = doc.defaultView.ResizeObserver ? new doc.defaultView.ResizeObserver(() => sync()) : null;
  observer?.observe(rail);
  return {get element() {
    focused = rail.contains(doc.activeElement) ? doc.activeElement : null;
    return rail;
  }, sync};
}
