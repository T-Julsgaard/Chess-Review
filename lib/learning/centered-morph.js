// Enlarge from the review board's bottom-left handle, keeping its top-right fixed.
// Reserve Settings before it opens; only constrain the anchor when resizing needs it.
export function fullSizeLearningLayout({width, height, board, boardSize, top = 52, settingsWidth = 286}) {
  const edge = width < 760 ? 16 : 24, gap = width < 1100 ? 24 : 32;
  // Wide desktops reserve Settings; on laptops it overlays the scene without
  // reflowing it. A permanent 334px gutter otherwise forces learning below the board.
  const usableRight = Math.max(edge + 1, width - (width >= 1600 ? settingsWidth + 48 : edge));
  const original = board?.width || boardSize || 560;
  const alongside = width >= 980;
  const right = Math.min((board?.x ?? edge) + original, alongside ? usableRight - gap - 340 : width - edge);
  const boardY = Math.max(0, Math.min(board ? board.y - top : 20, height - top - 220));
  const size = Math.max(1, Math.min(original + Math.min(80, original * .10), right - edge, height - top - boardY - 24));
  const boardX = Math.max(edge, right - size);
  const stacked = !alongside;
  const panelWidth = Math.max(1, Math.min(720, stacked ? usableRight - edge : usableRight - right - gap));
  const panelX = stacked ? Math.max(edge, Math.min(boardX, usableRight - panelWidth)) : right + gap;
  return {boardX, boardY, boardSize:size, panelX,
    panelY:stacked ? boardY + size + 76 : boardY, panelWidth,
    panelHeight:stacked ? Math.max(240, height - top - 52) : size, stacked};
}

// One uniform scale and a straight path: no lift, arc or overshoot.
export function boardExpansionFrames(from, to, coordinateScale = 1) {
  return [
    {transform:`translate(${(from.x-to.x)/coordinateScale}px, ${(from.y-to.y)/coordinateScale}px) scale(${from.width/to.width})`},
    {transform:'translate(0px, 0px) scale(1)'},
  ];
}

function canAnimate(view, reduced) {
  return !reduced && !view.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !!view.Element.prototype.animate;
}

function finishMotion(view, animations, {signal, cleanup = () => {}} = {}) {
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let stop, timer, disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true; animations.forEach(a => a.cancel()); cleanup();
    view.clearTimeout(timer); view.removeEventListener('resize', stop);
    media?.removeEventListener('change', stop); signal?.removeEventListener('abort', stop);
  };
  // An interrupted animation must release its transforms synchronously, before
  // a settings reflow measures and animates the same real board again.
  const interrupted = new Promise(resolve => {stop = () => {dispose(); resolve();};});
  view.addEventListener('resize', stop, {once:true});
  media?.addEventListener('change', stop, {once:true});
  signal?.addEventListener('abort', stop, {once:true});
  timer = view.setTimeout(stop, 1600);
  if (signal?.aborted) stop();
  return Promise.race([Promise.allSettled(animations.map(a => a.finished)), interrupted]).finally(dispose);
}

const easing = 'cubic-bezier(.28, .06, .18, 1)';

export function centeredMorph(document, sources, targets, {board, fromBoard, reduced = false, exiting = false, signal} = {}) {
  const view = document.defaultView;
  if (!canAnimate(view, reduced)) return Promise.resolve();
  const toBoard = board?.getBoundingClientRect();
  if (!fromBoard?.width || !toBoard?.width) return Promise.resolve();
  const duration = exiting ? 720 : 1150, animations = [];
  // Animate the actual surfaces in their existing style/scroll context. Cloning
  // the study panel outside .learning-workspace exposed unstyled native ranges.
  const surfaces = new Set([...sources.map(({node})=>node), ...targets]);
  for (const node of surfaces) node.classList.add('learn-transition-surface');
  for (const {node, opacity = 1} of sources) {
    const player = node.matches('#playerTop, #playerBot');
    animations.push(node.animate([
      {opacity, visibility:'visible', translate:'0 0'},
      {opacity:0, visibility:'hidden', translate:player?'0 0':'0 -6px'},
    ], {duration:180, easing, fill:'both'}));
  }
  const anchor = board.closest('.mod') || board;
  const origin = board.style.transformOrigin;
  anchor.classList.add('learn-swoop-anchor');
  board.style.transformOrigin = '0 0';
  const coordinateScale=board.offsetWidth?toBoard.width/board.offsetWidth:1;
  animations.push(board.animate(boardExpansionFrames(fromBoard, toBoard, coordinateScale), {duration, easing, fill:'both'}));
  for (const [index, node] of [...targets].entries()) {
    const player = node.matches('#playerTop, #playerBot');
    animations.push(node.animate( [{opacity:0, translate:player?'0 0':'0 8px'},
         {opacity:1, translate:'0 0'}],
      {duration:exiting ? 340 : 440,
       delay:200 + Math.min(index*24,48), easing:'cubic-bezier(.16, 1, .3, 1)', fill:'both'}));
  }
  return finishMotion(view, animations, {signal, cleanup:() => {
    for (const node of surfaces) node.classList.remove('learn-transition-surface');
    anchor.classList.remove('learn-swoop-anchor'); board.style.transformOrigin = origin;
  }});
}
