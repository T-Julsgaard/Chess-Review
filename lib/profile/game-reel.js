// Film roll: every game found flashes past on the board, one frame per game,
// with both players' names. Frames come from the middle or the end of each
// game (the end for short games). A strip of film under the board shows the
// frames already played on the left and the ones waiting on the right.
// Pacing spreads each batch out so every game is seen, up to 30 frames a second;
// once the queue is empty the reel keeps turning slowly through the history
// while more games may come. After the last game has been found (`finish`), the
// reel holds its final frame a moment and hands over (`onFinished`) instead.
const MAX_RATE = 30, MIN_RATE = 2.5, DRAIN_S = 2.2, IDLE_MS = 1100, IDLE_AFTER = 1500, THUMBS = 160, HOLD_MS = 650, LEAVE_MS = 420;
const keyOf = row => `${row.site}:${row.id}`;
function hash(text) { let x = 2166136261; for (const ch of String(text)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }
const plyOf = fen => { const parts = String(fen || '').split(' '); return (Number(parts[5]) - 1) * 2 + (parts[1] === 'b' ? 1 : 0); };

/** The position a game is shown with: its end when short, else the middle or the end. */
export function reelFen(row) {
  const end = row?.fenEnd || '';
  const n = Number(row?.n) || 0;
  if (!end || n <= 30) return end;
  const middle = [row.fenMid, row.fenHigh, row.fenLow].filter(fen => fen && plyOf(fen) >= n * .3 && plyOf(fen) <= n * .85);
  const pick = hash(keyOf(row)) % 5;
  return pick < 2 || !middle.length ? end : middle[pick % middle.length];
}
/** Frames per second for a queue of `backlog` games. */
export function reelRate(backlog) { return Math.max(MIN_RATE, Math.min(MAX_RATE, backlog / DRAIN_S)); }

function pieces(fen) {
  const out = [], rows = String(fen || '').split(' ')[0].split('/');
  if (rows.length !== 8) return out;
  rows.forEach((row, r) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += Number(ch); else { out.push({ch, f, r}); f++; } } });
  return out;
}

export function createGameReel({h, doc, makePiece, motion = () => true, account = () => '', orient = () => {}, onFinished = () => {}}) {
  const win = doc.defaultView;
  const element = h('div', {class: 'profile-reel', role: 'img', 'aria-label': 'Your games, one after another'});
  const frame = doc.createElement('canvas'); frame.setAttribute('aria-hidden', 'true'); element.append(frame);
  const strip = doc.createElement('canvas'); strip.className = 'profile-reel-strip'; strip.setAttribute('aria-hidden', 'true');
  const caption = h('div', {class: 'profile-reel-caption'}, strip);
  const bar = side => {
    const name = h('strong', {}), rating = h('span', {class: 'profile-reel-rating'}), aside = h('span', {class: 'profile-reel-aside'});
    return {node: h('div', {class: 'profile-reel-player profile-reel-' + side}, name, rating, aside), name, rating, aside};
  };
  const top = bar('top'), bottom = bar('bottom');
  const chrome = h('div', {class: 'profile-reel-chrome'}, top.node, bottom.node);
  doc.body.append(chrome);

  const images = {};
  for (const color of ['w', 'b']) for (const type of 'pnbrqk') {
    const img = makePiece?.(type, color), src = img?.getAttribute?.('src') || img?.src;
    if (src && typeof win.Image === 'function') { const image = new win.Image(); image.onload = () => { painted = null; }; image.src = src; images[color + type] = image; }
  }
  const imageOf = ch => images[(ch === ch.toUpperCase() ? 'w' : 'b') + ch.toLowerCase()];
  // reel[i] is the i-th frame: {row, n, fen}; frames past `cur` are waiting.
  let reel = [], seen = new Map(), cur = -1, pos = 0, nextAt = 0, idleSince = 0, loop = 0, raf = 0, last = 0;
  let switchAt = 0, transition = 0, prev = null, flipped = null, colors = null, destroyed = false, painted = null, sized = '';
  // finished: no more games are coming; handed: onFinished has run; leaving: fading out.
  let finished = false, handed = false, leaving = false;
  function handOver() { if (handed || destroyed || leaving) return; handed = true; onFinished(); }
  const size = () => `${element.clientWidth}:${strip.clientWidth}x${strip.clientHeight}`;
  const thumbs = new Map();

  function palette() {
    const style = win.getComputedStyle(element);
    const pick = (name, fallback) => (style.getPropertyValue(name) || '').trim() || fallback;
    colors = {light: pick('--sq-light', '#f0d9b5'), dark: pick('--sq-dark', '#b58863'),
      w: pick('--q-best', '#81b58b'), d: pick('--ink-2', '#b6b9b2'), l: pick('--q-miss', '#db8c7a'), accent: pick('--accent', '#81b64c')};
  }
  function fit(canvas, width, height) {
    const dpr = win.devicePixelRatio || 1, w = Math.round(width * dpr), hh = Math.round(height * dpr);
    if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
    const g = canvas.getContext?.('2d'); if (!g) return null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, width, height);
    return g;
  }
  function drawPieces(g, fen, size, flip, {alpha = 1, dy = 0, inset = .03} = {}) {
    const sq = size / 8;
    g.globalAlpha = alpha;
    for (const {ch, f, r} of pieces(fen)) {
      const img = imageOf(ch); if (!img?.complete || !img.naturalWidth) continue;
      const x = (flip ? 7 - f : f) * sq, y = (flip ? 7 - r : r) * sq + dy;
      g.drawImage(img, x + sq * inset, y + sq * inset, sq * (1 - 2 * inset), sq * (1 - 2 * inset));
    }
    g.globalAlpha = 1;
  }
  function drawFrame(now) {
    const size = element.clientWidth; if (!size) return;
    const g = fit(frame, size, size); if (!g) return;
    const item = reel[cur]; if (!item) return;
    const t = transition ? Math.min(1, (now - switchAt) / transition) : 1, ease = 1 - (1 - t) ** 3;
    // Like a projector gate: the old frame lifts away as the next one settles in.
    if (prev && t < 1) drawPieces(g, prev.fen, size, prev.row.me === 'b', {alpha: 1 - ease, dy: -size * .025 * ease});
    drawPieces(g, item.fen, size, item.row.me === 'b', {alpha: t < 1 ? ease : 1, dy: size * .025 * (1 - ease)});
  }
  function thumb(item, px) {
    const key = keyOf(item.row) + ':' + px;
    let canvas = thumbs.get(key);
    if (canvas && canvas.ready) return canvas;
    const dpr = win.devicePixelRatio || 1;
    canvas ||= doc.createElement('canvas');
    canvas.width = canvas.height = Math.round(px * dpr);
    const g = canvas.getContext?.('2d'); if (!g) return null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sq = px / 8;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { g.fillStyle = (r + f) % 2 ? colors.dark : colors.light; g.fillRect(f * sq, r * sq, sq + .02, sq + .02); }
    drawPieces(g, item.fen, px, item.row.me === 'b', {inset: 0});
    canvas.ready = Object.values(images).every(img => img.complete);
    thumbs.set(key, canvas);
    if (thumbs.size > THUMBS) thumbs.delete(thumbs.keys().next().value);
    return canvas;
  }
  function drawStrip() {
    const width = strip.clientWidth, height = strip.clientHeight; if (!width || !height) return;
    const g = fit(strip, width, height); if (!g) return;
    const film = Math.min(height, 46), y0 = (height - film) / 2, px = Math.round(film * .62), pitch = px + 12, mid = width / 2;
    // The film base fades out at both ends.
    const fade = g.createLinearGradient(0, 0, width, 0);
    fade.addColorStop(0, 'rgba(12,12,11,0)'); fade.addColorStop(.18, 'rgba(12,12,11,.88)'); fade.addColorStop(.82, 'rgba(12,12,11,.88)'); fade.addColorStop(1, 'rgba(12,12,11,0)');
    g.fillStyle = fade; g.fillRect(0, y0, width, film);
    // Sprocket holes travel with the film.
    const hole = 4.5, step = pitch / 3, shift = ((-pos * pitch) % step + step) % step;
    for (let x = shift - step; x < width + step; x += step) {
      const a = Math.max(0, 1 - Math.abs(x - mid) / (width * .5)) * .28;
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.fillRect(x, y0 + 2.5, hole, 3); g.fillRect(x, y0 + film - 5.5, hole, 3);
    }
    const ty = y0 + (film - px) / 2;
    const first = Math.max(0, Math.floor(pos - mid / pitch) - 1), lastIndex = Math.min(reel.length - 1, Math.ceil(pos + mid / pitch) + 1);
    for (let i = first; i <= lastIndex; i++) {
      const item = reel[i], x = mid + (i - pos) * pitch - px / 2;
      const distance = Math.abs(x + px / 2 - mid) / mid, a = Math.max(0, 1 - distance ** 1.6);
      const image = thumb(item, px); if (!image) continue;
      g.globalAlpha = a * (i > cur ? .5 : i === cur ? 1 : .78);
      g.drawImage(image, x, ty, px, px);
      g.fillStyle = colors[item.row.res in {w: 1, d: 1, l: 1} ? item.row.res : 'd'];
      g.fillRect(x, ty + px + 2, px, 2);
      g.globalAlpha = 1;
    }
    // The gate: the frame on the board right now.
    g.strokeStyle = colors.accent; g.lineWidth = 1.5;
    g.strokeRect(mid - px / 2 - 2.5, ty - 2.5, px + 5, px + 5);
  }
  const date = row => row.t ? new Date(row.t * 1000).toLocaleDateString(undefined, {month: 'short', year: 'numeric'}) : '';
  function label(item) {
    const row = item.row, mine = account(row.site) || 'You';
    // The player sits at the bottom, as on their own board.
    top.name.textContent = row.opp || 'Opponent'; top.rating.textContent = row.oppRating ? String(row.oppRating) : '';
    top.aside.replaceChildren(h('b', {class: 'profile-reel-count'}, '#' + item.n.toLocaleString()), ` of ${seen.size.toLocaleString()}`);
    bottom.name.textContent = mine; bottom.rating.textContent = row.myRating ? String(row.myRating) : '';
    bottom.aside.replaceChildren(h('b', {class: 'profile-reel-result ' + (row.res || 'd')}, {w: 'Won', d: 'Drew', l: 'Lost'}[row.res] || 'Drew'), [date(row), row.cls].filter(Boolean).join(' · '));
    const isFlipped = row.me === 'b';
    if (isFlipped !== flipped) { flipped = isFlipped; orient(flipped); }
  }
  function summary() {
    element.setAttribute('aria-label', `${seen.size.toLocaleString()} ${seen.size === 1 ? 'game' : 'games'} found so far, shown one after another`);
  }
  function advance(now, interval) {
    prev = reel[cur] || null; cur++;
    switchAt = now; transition = interval >= 220 ? Math.min(240, interval * .45) : 0;
    label(reel[cur]); summary();
  }
  function position() {
    const board = element.parentElement?.getBoundingClientRect?.(); if (!board?.width) return;
    Object.assign(chrome.style, {left: board.left + 'px', top: board.top + 'px', width: board.width + 'px', height: board.height + 'px'});
    // The strip takes what is left below the board, up to its full height.
    const room = Math.round(Math.max(26, Math.min(44, win.innerHeight - strip.getBoundingClientRect().top - 4)));
    if (strip.style.height !== room + 'px') strip.style.height = room + 'px';
  }
  function tick(now) {
    raf = 0; if (destroyed || leaving || !element.isConnected) return;
    const dt = Math.min(64, last ? now - last : 16); last = now;
    if (!colors) palette();
    const waiting = reel.length - 1 - cur;
    if (finished && waiting <= 0) {
      // Every game has played: hold the last frame a moment, then hand over.
      if (!reel.length || now - switchAt >= HOLD_MS) { handOver(); if (leaving || destroyed) return; }
    } else if (waiting > 0) {
      idleSince = 0;
      if (now >= nextAt) {
        const interval = 1000 / reelRate(waiting);
        advance(now, interval); nextAt = Math.max(nextAt + interval, now - interval);
      }
    } else if (reel.length) {
      // Caught up: the reel keeps turning through the history, slowly.
      idleSince ||= now;
      if (now - idleSince > IDLE_AFTER && now >= nextAt) {
        const pool = [...seen.values()];
        reel.push(pool[loop++ % pool.length]);
        advance(now, IDLE_MS); nextAt = now + IDLE_MS;
      }
    }
    const target = Math.max(0, cur), gliding = Math.abs(target - pos) > .002;
    pos = gliding ? pos + (target - pos) * (1 - Math.exp(-dt / 110)) : target;
    position();
    // Draw only while something changes; an idle reel costs nothing between frames.
    const painting = gliding || cur !== painted || (transition && now - switchAt < transition + 32) || size() !== sized;
    if (painting) { drawFrame(now); drawStrip(); painted = cur; sized = size(); }
    raf = win.requestAnimationFrame(tick);
  }
  function start() { if (!raf && !destroyed && typeof win.requestAnimationFrame === 'function') raf = win.requestAnimationFrame(tick); }

  return {
    element, caption, chrome,
    /** Queue the games not yet on the reel, in the order they were found. */
    update(rows) {
      if (destroyed) return;
      const keys = new Set(rows.map(keyOf));
      if ([...seen.keys()].some(key => !keys.has(key))) { reel = []; seen = new Map(); cur = -1; pos = 0; prev = null; loop = 0; thumbs.clear(); }
      for (const row of rows) {
        const key = keyOf(row);
        if (seen.has(key)) { seen.get(key).row = row; continue; }
        const fen = reelFen(row); if (!fen) continue;
        const item = {row, n: seen.size + 1, fen};
        seen.set(key, item); reel.push(item);
      }
      // Without motion (or before the first frame) the latest game simply shows.
      if (!motion() && reel.length) { cur = reel.length - 1; label(reel[cur]); }
      summary(); start();
    },
    /** No more games are coming: play out the queue, then call onFinished instead of idling. */
    finish() {
      if (destroyed || finished) return;
      finished = true;
      if (!motion() || typeof win.requestAnimationFrame !== 'function') { Promise.resolve().then(handOver); return; }
      start();
    },
    /**
     * Fade away over whatever takes the board next: the pieces lift off like
     * the next frame in the gate, the names and the strip fade out.
     */
    leave() {
      if (destroyed || leaving) return;
      leaving = true; if (raf) win.cancelAnimationFrame(raf); raf = 0;
      const done = () => this.destroy();
      if (!motion() || typeof element.animate !== 'function') { done(); return; }
      const ease = 'cubic-bezier(.4,0,.2,1)';
      element.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-2.5%) scale(.985)'}], {duration: LEAVE_MS, easing: ease, fill: 'forwards'});
      chrome.animate([{opacity: 1}, {opacity: 0}], {duration: LEAVE_MS * .7, easing: ease, fill: 'forwards'});
      caption.animate([{opacity: 1}, {opacity: 0}], {duration: LEAVE_MS * .6, easing: ease, fill: 'forwards'});
      win.setTimeout(done, LEAVE_MS + 40);
    },
    destroy() {
      destroyed = true; if (raf) win.cancelAnimationFrame(raf); raf = 0;
      element.remove(); caption.remove(); chrome.remove(); thumbs.clear();
    },
  };
}
