// The developer's "mini-me": the small ASCII figure that waves hello on julsgaard.dev,
// brought to the profile's last chapter. The grid, the glyph size and the wave are the
// portfolio's own (its MINIME2 figure and "friendly" wave). As there, he is one thin, flat
// sheet of characters in 3D: drag him and he turns any way round, edge-on he is a line,
// and from behind he is seen mirrored. The characters are drawn in the panel's ink colour
// on a transparent canvas, so he sits on either theme without a background.

// Head to just below the hands (the portfolio's figure carries on down to the feet).
const GRID = [
  '          ---==-          ',
  '         ==:.--=-         ',
  '        :==-==---:        ',
  '        :==***=-::        ',
  '         =+=+---:.        ',
  '         ++++=+==:        ',
  '         =*++-+=-         ',
  '         :=--:--:         ',
  '          =*+==:          ',
  '       ...:==-::...:      ',
  '       :.::=-::-.:.:      ',
  '      :-::+*+=---::-.     ',
  '     :-:-:#*++=++:::-:    ',
  '   :----:-=%%#%#-:::---.  ',
  '   -----::-#%%#+-::----:  ',
  '  .------::+%##-::::::::  ',
  '  :-:----::-##+:::::::::  ',
  '  --:----:-:=*::-:::::::: ',
  '  --::------:-:--:::::::: ',
  '  ---.---:----::::::.:::: ',
  ' :--:.:--:--:-::::::.:::: ',
  ' :-::.:-----:-::::::.:::-.',
  ' --::.:-:---:-::::::.:::-:',
  ' -:::.::---::-::::::.:::::',
  '.-:::.::----:-::::::..::::',
  ':-:::.:-------:-::::..::::',
  ':--:..----------::::..::-:',
  '--::..:--------:::::..::::',
  ':-::.:--------::::::..::::',
  '--::.::-------::::::..::::',
  '--::.::-------::::::..::-:',
  '--:. ::----:--::::::. ::::',
  ':::. :::::::--::::::. ::::',
  ':-:. .:--:::-:::::::. :::.',
  '-=-. ......:::......  :-:.',
  '=*+- ..:..............+*+-',
  '+*+= .:::::..........-**+:',
  '+*=+ .:::............==++-',
  '=*==:.:::... ........+=+=:',
  '.+=- .::.... ...:....:-+- ',
  '  -: .::....  ..:.... =:  ',
  '     .::....  .......     ',
  '     .::....  .......     ',
  '     :::....  .......     '
];
const RAMP = ' .:-=+*#%@';
const COLS = 26, ROWS = GRID.length;
// The portfolio's cell pitch and glyph size (layout units); everything below is measured in these.
// Its glyphs are font outlines one glyph-size tall and squeezed to 60% width, so they stay thin
// with air between them.
const CW = 0.130, CH = 0.144, GLYPH = 0.13, SQUEEZE = 0.6;
// Rows from here down fade out, so the figure ends softly at the waist.
const FADE_FROM = 38;
// Viewer distance for the perspective, in layout units.
const VIEW = 24;
// The portfolio draws its figure in Helvetica-style outlines (three.js's helvetiker).
const GLYPH_FONT = 'Helvetica, Arial, "Liberation Sans", sans-serif';
// How he is drawn (Settings → Player profile → Developer figure). Thin is the portfolio's own sheet;
// Bold sets heavier, wider, larger characters with the faint ones lifted, so he reads from further off.
// `floor` is the opacity of the faintest character, `edge` how much he dims when turned edge-on.
export const LOOKS = {
  thin: {weight: [400, 700], squeeze: SQUEEZE, size: 1.25, floor: [.42, .7], edge: .45},
  bold: {weight: [800, 800], squeeze: .92, size: 1.5, floor: [.72, .85], edge: .3}
};
// Let go of him and he turns back to face you this long after (ms), however he was spun.
export const RESET_AFTER = 2500;
// He stands this share of the canvas's height lower than the fitted front view, a touch nearer the buttons.
const DROP = .04;

// The wave, as on the portfolio: the viewer-left arm is a two-part limb. The upper arm
// turns about the shoulder, the forearm and hand about the elbow (carried by the shoulder).
const ARM = {up: {c0: 0, c1: 4, r0: 19, r1: 26}, lo: {c0: 0, c1: 4, r0: 27, r1: 40},
  sc: 3.5, sr: 18.2, ec: 2.5, er: 27, b1: -0.5, b2: -1.9};
// The portfolio's "friendly" wave: rise, a beat at the top, a wiggle, then the arm comes down.
const WAVE = {rise: 340, preHold: 90, wig: 1500, fall: 380, amp: 0.26, freq: 2.7, decay: 0.5};
const WAVE_WIGK = 0.55, WAVE_ARMSHARE = 0.35, WAVE_LAG = 110;
const WAVE_LEN = WAVE.rise + WAVE.preHold + WAVE.wig + WAVE.fall;

const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const backOut = t => { const s = 1.35; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const inBox = (b, c, r) => c >= b.c0 && c <= b.c1 && r >= b.r0 && r <= b.r1;

/** How far the arm is raised, 0 → 1 → 0 over one wave. */
export function waveLift(t) {
  if (t < 0 || t >= WAVE_LEN) return 0;
  if (t < WAVE.rise) return backOut(t / WAVE.rise);
  const down = t - WAVE.rise - WAVE.preHold - WAVE.wig;
  return down < 0 ? 1 : 1 - easeInOut(down / WAVE.fall);
}
/** The side-to-side swing of the hand (radians), only while the arm is up. */
export function waveSwing(t) {
  const c = t - WAVE.rise - WAVE.preHold;
  if (c < 0 || c >= WAVE.wig) return 0;
  const u = c / WAVE.wig, e = .14, win = u < e ? easeInOut(u / e) : u > 1 - e ? easeInOut((1 - u) / e) : 1;
  return WAVE.amp * win * Math.exp(-WAVE.decay * u) * Math.sin(2 * Math.PI * WAVE.freq * c / 1000);
}

// The body's middle: the figure turns about it and sits centred on it.
const MID_X = (COLS - 1) / 2 * CW, MID_Y = -(ROWS - 1) / 2 * CH;
const at = (c, r) => ({x: c * CW - MID_X, y: -r * CH - MID_Y});
const SHOULDER = at(ARM.sc, ARM.sr), ELBOW = at(ARM.ec, ARM.er);

/** The figure as one flat sheet of characters, centred on its middle (layout units, y up). */
export function figurePoints() {
  const points = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = GRID[r][c]; if (ch === ' ') continue;
    const arm = inBox(ARM.up, c, r) ? 1 : inBox(ARM.lo, c, r) ? 2 : 0;
    const fade = r < FADE_FROM ? 1 : Math.max(0, 1 - (r - FADE_FROM + 1) / (ROWS - FADE_FROM + 1));
    points.push({...at(c, r), glyph: RAMP.indexOf(ch), arm, fade});
  }
  return points;
}

/** Where every character sits for an arm pose (a1 at the shoulder, aT for the forearm and hand). */
function posed(points, a1, aT, out) {
  const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(aT), s2 = Math.sin(aT), S = SHOULDER, E = ELBOW;
  const ex = S.x + (E.x - S.x) * c1 - (E.y - S.y) * s1, ey = S.y + (E.x - S.x) * s1 + (E.y - S.y) * c1;
  points.forEach((p, i) => {
    let x = p.x, y = p.y;
    if (p.arm === 2) { const dx = x - E.x, dy = y - E.y; x = ex + dx * c2 - dy * s2; y = ey + dx * s2 + dy * c2; }
    else if (p.arm === 1) { const dx = x - S.x, dy = y - S.y; x = S.x + dx * c1 - dy * s1; y = S.y + dx * s1 + dy * c1; }
    out[i * 2] = x; out[i * 2 + 1] = y;
  });
  return out;
}

/* ---------- rotations, as unit quaternions [w, x, y, z] ---------- */
const qMul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
const qAxis = (x, y, angle) => { const s = Math.sin(angle / 2); return [Math.cos(angle / 2), x * s, y * s, 0]; };
const qNorm = q => { const l = Math.hypot(...q) || 1; return q.map(v => v / l); };
/** The rotation as a matrix, row by row. */
function qMatrix([w, x, y, z]) {
  return [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)];
}

/**
 * The mini-me, ready to place on the page: `element` is a focusable canvas.
 * Drag (or use the arrow keys) to turn him any way round; click (or Enter) and he waves again.
 * He keeps his fitted size: the wheel scrolls the page as usual.
 */
export function createMiniMe({doc, win, motion = () => true, look = () => 'thin', label = 'The developer, as a small waving figure made of ASCII characters. Drag to turn him around.'}) {
  const canvas = doc.createElement('canvas');
  canvas.className = 'profile-minime';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  const points = figurePoints(), xy = new Float64Array(points.length * 2);
  const now = () => win.performance?.now() || Date.now();
  let ctx = null, sprites = null, spriteKey = '', ink = '', inkCheck = 0, darkInk = false, L = LOOKS.thin, fit = null;
  let turn = [1, 0, 0, 0], spin = {x: 0, y: 0}, dragging = null, released = -1e9, gain = 1;
  let waveAt = null, frame = 0, last = 0, lastInput = now();
  const started = now();

  function context() {
    if (ctx) return ctx;
    if (!canvas.clientWidth || typeof canvas.getContext !== 'function') return null;
    try { ctx = canvas.getContext('2d'); } catch { ctx = null; }
    return ctx;
  }
  // Each ramp character drawn once, centred on its own outline as the portfolio's glyphs are.
  function glyphs(px) {
    const weight = L.weight[darkInk ? 1 : 0], key = `${ink}|${px}|${weight}`;
    if (key === spriteKey) return sprites;
    sprites = [...RAMP].map((ch, i) => {
      if (!i) return null;
      const c = doc.createElement('canvas'); c.width = c.height = px;
      const g = c.getContext('2d'); if (!g) return null;
      g.fillStyle = ink; g.font = `${weight} ${px / 1.25}px ${GLYPH_FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const m = g.measureText(ch), up = m.actualBoundingBoxAscent || px * .4, down = m.actualBoundingBoxDescent || 0;
      g.fillText(ch, px / 2, px / 2 + (up - down) / 2);
      return c;
    });
    spriteKey = key;
    return sprites;
  }
  // Fit the front view, with the arm raised: the raised hand at the top, the waist on the bottom edge, so
  // no empty band is left under him (his last, faintest rows may run off it). Any spare height goes
  // above him. Only the width keeps room for a turned sheet's nearer side; he still turns about his middle.
  function layout(w, h) {
    const pose = posed(points, ARM.b1, ARM.b1 + ARM.b2, new Float64Array(points.length * 2));
    let reachX = 0, top = -Infinity, bottom = Infinity;
    for (let i = 0; i < pose.length; i += 2) {
      reachX = Math.max(reachX, Math.abs(pose[i])); top = Math.max(top, pose[i + 1]);
      if (points[i / 2].fade >= .4) bottom = Math.min(bottom, pose[i + 1]);
    }
    const pad = GLYPH * 1.5;
    top += pad; bottom -= GLYPH * .5;
    const scale = Math.min(w / 2 / (reachX + pad) / (VIEW / (VIEW - reachX)), h / (top - bottom));
    return {scale, lift: h / 2 + bottom * scale + h * DROP};
  }

  function draw(t) {
    const g = context(); if (!g) return;
    L = LOOKS[look?.()] || LOOKS.thin;
    if (!ink || t - inkCheck > 500) {
      ink = win.getComputedStyle?.(canvas).color || '#ccc'; inkCheck = t;
      // Dark ink on a light panel: thin dark glyphs read fainter than light ones on dark, so the dim end is lifted.
      const [r = 200, gr = 200, b = 200] = (ink.match(/\d+(\.\d+)?/g) || []).map(Number);
      darkInk = (.2126 * r + .7152 * gr + .0722 * b) / 255 < .5;
    }
    const floor = L.floor[darkInk ? 1 : 0];
    const dpr = win.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    if (fit?.w !== w || fit.h !== h) fit = {w, h, ...layout(w, h)};
    const S = fit.scale, ox = w / 2, oy = h / 2 + fit.lift, box = GLYPH * L.size;
    const sp = glyphs(Math.max(8, Math.ceil(box * S * dpr * 1.2)));
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
    // The arm's pose this frame.
    const wt = waveAt == null ? -1 : t - waveAt, lift = waveLift(wt) * gain;
    posed(points, ARM.b1 * lift + WAVE_ARMSHARE * WAVE_WIGK * waveSwing(wt) * gain,
      (ARM.b1 + ARM.b2) * lift + WAVE_WIGK * waveSwing(wt - WAVE_LAG) * gain, xy);
    // A slow sway while nobody is turning him, so he reads as something you can turn.
    const sway = motion() && !dragging ? .22 * Math.sin((t - started) / 1700) * smooth(0, 1500, t - released) * (1 - smooth(18000, 21000, t - lastInput)) : 0;
    const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = qMatrix(qMul(qAxis(0, 1, sway), turn));
    // The sheet's own axes on screen: every glyph is drawn flat on it, so edge-on he is a thin line
    // and from behind he is seen mirrored, as a real sheet of letters would be.
    const facing = Math.abs(m8), shade = 1 - L.edge + L.edge * facing;
    for (let i = 0; i < points.length; i++) {
      const p = points[i], img = sp[p.glyph]; if (!img || p.fade <= 0) continue;
      const x = xy[i * 2], y = xy[i * 2 + 1];
      const X = m0 * x + m1 * y, Y = m3 * x + m4 * y, Z = m6 * x + m7 * y, k = VIEW / (VIEW - Z) * S * dpr;
      const gw = box * L.squeeze * k, gh = box * k;
      g.globalAlpha = Math.min(1, (floor + (1 - floor) * p.glyph / 9) * shade * p.fade);
      g.setTransform(m0 * gw, -m3 * gw, -m1 * gh, m4 * gh, ox * dpr + X * k, oy * dpr - Y * k);
      g.drawImage(img, -.5, -.5, 1, 1);
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  }

  function tick(t) {
    frame = 0;
    if (!canvas.isConnected) return;
    const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    let still = true;
    if (!dragging) {
      // RESET_AFTER a release he turns home, even if he is still coasting.
      const goHome = t - released > RESET_AFTER;
      if (goHome) spin = {x: 0, y: 0};
      if (spin.x || spin.y) {
        turn = qNorm(qMul(qMul(qAxis(0, 1, spin.y * dt), qAxis(1, 0, spin.x * dt)), turn));
        const decay = Math.exp(-dt * 2.2); spin.x *= decay; spin.y *= decay;
        if (Math.hypot(spin.x, spin.y) < .05) spin = {x: 0, y: 0};
        still = false;
      } else if (goHome && turn[0] < 1 - 1e-7) {
        // Settle back to facing you, the shorter way round.
        const home = turn[0] < 0 ? -1 : 1, ease = 1 - Math.exp(-dt * 3.2);
        turn = qNorm(turn.map((v, i) => v + ((i ? 0 : home) - v) * ease));
        if (Math.abs(turn[0]) > 1 - 1e-7) turn = [1, 0, 0, 0]; else still = false;
      } else if (turn[0] < 1 - 1e-7) still = false;
    }
    // Turning him lowers the arm; it comes back up for the rest of the wave on release.
    gain += ((dragging ? 0 : 1) - gain) * (1 - Math.exp(-dt * 10));
    draw(t);
    const waving = waveAt != null && t - waveAt < WAVE_LEN + 2 * WAVE_LAG;
    if (!waving) waveAt = null;
    if (dragging || !still || waving || (motion() && t - lastInput < 21500)) schedule();
  }
  function schedule() {
    if (!frame && win.requestAnimationFrame) frame = win.requestAnimationFrame(tick);
  }
  function wave(delay = 0) {
    if (!motion()) return;
    waveAt = now() + delay;
    schedule();
  }
  function poke() { lastInput = now(); schedule(); }
  // Dragging turns him about the screen's axes, so he goes all the way round in any direction.
  const RATE = .013;
  function turnBy(dx, dy) { turn = qNorm(qMul(qMul(qAxis(0, 1, dx * RATE), qAxis(1, 0, dy * RATE)), turn)); }
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = {x: e.clientX, y: e.clientY, moved: 0, t: now()};
    try { canvas.setPointerCapture?.(e.pointerId); } catch { /* a pointer the browser no longer tracks */ }
    spin = {x: 0, y: 0}; poke();
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) { if (e.pointerType === 'mouse') poke(); return; }
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y, t = now(), dt = Math.max(.008, (t - dragging.t) / 1000);
    dragging.moved += Math.abs(dx) + Math.abs(dy);
    turnBy(dx, dy);
    spin = {x: spin.x * .5 + dy * RATE / dt * .5, y: spin.y * .5 + dx * RATE / dt * .5};
    Object.assign(dragging, {x: e.clientX, y: e.clientY, t});
    poke();
  });
  const release = e => {
    if (!dragging) return;
    const click = dragging.moved < 5, stale = now() - dragging.t > 90;
    dragging = null; released = now();
    try { canvas.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
    const speed = Math.hypot(spin.x, spin.y);
    if (click || stale) spin = {x: 0, y: 0};
    else if (speed > 10) spin = {x: spin.x * 10 / speed, y: spin.y * 10 / speed};
    if (click) wave();
    poke();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('keydown', e => {
    const keys = {ArrowLeft: [0, -4], ArrowRight: [0, 4], ArrowUp: [-4, 0], ArrowDown: [4, 0]};
    if (keys[e.key]) { spin = {x: spin.x + keys[e.key][0], y: spin.y + keys[e.key][1]}; released = now(); e.preventDefault(); poke(); }
    else if (e.key === 'Enter' || e.key === ' ') { wave(); e.preventDefault(); }
  });

  /** Draw once he is on the page and, on arrival, wave hello after a short beat. */
  function start({wave: hello = true} = {}) {
    lastInput = now();
    schedule();
    if (hello) wave(700);
  }
  // `redraw` repaints him once, as after a change of look in Settings.
  return {element: canvas, start, wave, redraw: schedule};
}

/**
 * The developer's note as a typewriter: each line is typed, held long enough to read, erased,
 * and the next one typed; the last stays. As on the portfolio, a line sits where it will end up
 * (the untyped rest is laid out but unseen), so centred text never shifts as it is typed.
 * A "\n" in a line is a line break that stays put. Arriving, the cursor blinks on its own for a
 * moment before the first key. Screen readers get every line at once. Without motion the lines
 * simply stand together.
 * `onCue` is called the moment the typed text reaches the end of `cue` (at once without motion),
 * so what the note asks for can show up just as it is said.
 */
export function createTypewriter({doc, win, lines, motion = () => true, cue = '', onCue = () => {}}) {
  const span = cls => { const s = doc.createElement('span'); s.className = cls; return s; };
  const element = doc.createElement('div');
  element.className = 'profile-type';
  const said = doc.createElement('p'); said.className = 'profile-type-sr'; said.textContent = lines.join(' ').replace(/\s*\n\s*/g, ' ');
  const screen = doc.createElement('div'); screen.className = 'profile-type-screen'; screen.setAttribute('aria-hidden', 'true');
  const text = span('profile-type-text'), typed = span('profile-type-typed'), caret = span('profile-type-caret'), rest = span('profile-type-rest');
  text.append(typed, caret, rest); screen.append(text); element.append(said, screen);
  let timer = 0, run = 0;
  const wait = (ms, id) => new Promise(resolve => { timer = win.setTimeout(() => resolve(id === run && element.isConnected), ms); });
  const show = (line, n) => { typed.textContent = line.slice(0, n); rest.textContent = line.slice(n); };
  // A key per character, slower on the greeting (the portfolio's pace) and after punctuation, as a person types.
  const keyMs = (ch, greeting) => (greeting ? 105 : 34) + (/[.,!?]/.test(ch) ? 200 : 0) + Math.random() * 22;

  function still() {
    run++; win.clearTimeout?.(timer);
    element.classList.remove('is-typing');
    element.classList.add('is-still');
    const block = doc.createElement('span'); block.className = 'profile-type-all';
    block.append(...lines.map(line => { const p = doc.createElement('span'); p.textContent = line; return p; }));
    text.replaceChildren(block);
    if (cue) onCue();
  }
  async function play() {
    const id = ++run;
    let cued = !cue;
    element.classList.remove('is-still');
    text.replaceChildren(typed, caret, rest);
    show('', 0);
    // Just the blinking cursor at first, while the reader takes in the chapter.
    if (!(await wait(1800, id))) return;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      element.classList.add('is-typing');
      for (let n = 1; n <= line.length; n++) {
        show(line, n);
        if (!cued && line.slice(0, n).endsWith(cue)) { cued = true; onCue(); }
        if (!(await wait(keyMs(line[n - 1], i === 0), id))) return;
      }
      element.classList.remove('is-typing');
      if (i === lines.length - 1) return;
      // Held long enough to read, then rubbed out from the end, quickly.
      if (!(await wait(Math.min(4800, 1500 + line.length * 32), id))) return;
      element.classList.add('is-typing');
      for (let n = line.length - 1; n >= 0; n--) {
        show(line, n);
        if (!(await wait(n > 8 ? 9 : 22, id))) return;
      }
      // A beat on the empty line before the next one.
      if (!(await wait(700, id))) return;
    }
  }
  /** Begin again from the first line (or, without motion, show them all). */
  function start() { if (motion() && win.setTimeout) play(); else still(); }
  return {element, start};
}