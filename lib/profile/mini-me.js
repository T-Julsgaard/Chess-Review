// The developer's "mini-me": the small ASCII figure that waves hello on julsgaard.dev,
// brought to the profile's last chapter. The grid and the wave are the portfolio's own
// (its MINIME2 figure and "friendly" wave); here the figure is drawn on a transparent
// canvas as a little solid you can drag around in 3D.
//
// Each character becomes two points, one on the front of the body and one on its back.
// Every row's run of characters is treated as an ellipse seen from above, so the figure
// turns like a statue rather than a sheet of paper. Points facing away fade out, and the
// characters are drawn in the panel's ink colour, so the figure sits on either theme
// without a background.

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
  '     :::....  .......     ',
  '     .:.....  ..:....     ',
  '     .:.....  .......     ',
  '     .:.....  .......     '
];
const RAMP = ' .:-=+*#%@';
const COLS = 26, ROWS = GRID.length;
// The portfolio's cell pitch (layout units); everything below is measured in these units.
const CW = 0.130, CH = 0.144;
// Rows from here down fade out, so the figure ends softly at the waist.
const FADE_FROM = 40;
// How deep the body is for its width (an ellipse, flatter than round).
const DEPTH = 0.55;
// Viewer distance for the perspective, in layout units.
const VIEW = 14;

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

/** The figure as points: two per character (front and back), centred on its middle. */
export function figurePoints() {
  const points = [], cx = (COLS - 1) / 2 * CW, cy = -(ROWS - 1) / 2 * CH;
  for (let r = 0; r < ROWS; r++) {
    const row = GRID[r];
    for (let a = 0; a < COLS;) {
      if (row[a] === ' ') { a++; continue; }
      let b = a; while (b + 1 < COLS && row[b + 1] !== ' ') b++;
      const half = (b - a + 1) / 2, mid = (a + b) / 2, rx = half * CW, rz = rx * DEPTH;
      let sum = 0; for (let c = a; c <= b; c++) sum += RAMP.indexOf(row[c]);
      // The back is one even tone per run: no face on the back of the head.
      const back = Math.max(1, Math.round(sum / (b - a + 1) * .8));
      for (let c = a; c <= b; c++) {
        const u = Math.max(-1, Math.min(1, (c - mid) / Math.max(half, .5))), w = Math.sqrt(1 - u * u);
        const arm = inBox(ARM.up, c, r) ? 1 : inBox(ARM.lo, c, r) ? 2 : 0;
        const fade = r < FADE_FROM ? 1 : Math.max(0, 1 - (r - FADE_FROM + 1) / (ROWS - FADE_FROM + 1));
        // The surface normal of the ellipse at this point, for shading and for hiding the far side.
        const nx = u / rx, nz = w / rz, nl = Math.hypot(nx, nz) || 1;
        const base = {x: c * CW - cx, y: -r * CH - cy, arm, fade};
        points.push({...base, z: rz * w, nx: nx / nl, nz: nz / nl, glyph: RAMP.indexOf(row[c])});
        points.push({...base, z: -rz * w, nx: nx / nl, nz: -nz / nl, glyph: back});
      }
      a = b + 1;
    }
  }
  return points;
}

/**
 * The mini-me, ready to place on the page: `element` is a focusable canvas.
 * Drag (or use the arrow keys) to turn him; click (or Enter) and he waves again.
 */
export function createMiniMe({doc, win, motion = () => true, label = 'Thomas, the developer, as a small waving ASCII figure. Drag to turn him around.'}) {
  const canvas = doc.createElement('canvas');
  canvas.className = 'profile-minime';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  const points = figurePoints();
  const S = {x: (ARM.sc - (COLS - 1) / 2) * CW, y: -ARM.sr * CH + (ROWS - 1) / 2 * CH};
  const E = {x: (ARM.ec - (COLS - 1) / 2) * CW, y: -ARM.er * CH + (ROWS - 1) / 2 * CH};
  const now = () => win.performance?.now() || Date.now();
  let ctx = null, sprites = null, spriteKey = '', ink = '', inkCheck = 0, floor = .22;
  let yaw = 0, pitch = 0, spin = 0, dragging = null, released = -1e9, gain = 1;
  let waveAt = null, frame = 0, last = 0, lastInput = now(), fit = null;
  const started = now();

  function context() {
    if (ctx) return ctx;
    if (!canvas.clientWidth || typeof canvas.getContext !== 'function') return null;
    try { ctx = canvas.getContext('2d'); } catch { ctx = null; }
    return ctx;
  }
  // Each ramp character drawn once in the ink colour; the figure is drawn from these.
  function glyphs(size, dpr) {
    const key = `${ink}|${size}|${dpr}`;
    if (key === spriteKey) return sprites;
    const px = Math.max(4, Math.ceil(size * dpr * 1.4));
    sprites = [...RAMP].map((ch, i) => {
      if (!i) return null;
      const c = doc.createElement('canvas'); c.width = c.height = px;
      const g = c.getContext('2d'); if (!g) return null;
      g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 ${size * dpr}px ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace`;
      g.fillText(ch, px / 2, px / 2);
      return c;
    });
    spriteKey = key;
    return sprites;
  }
  // Fit: the body as it turns, and the raised hand on the left when he faces you.
  function layout(w, h) {
    let reach = 0, left = 0;
    for (const p of points) reach = Math.max(reach, Math.hypot(p.x, p.z));
    const lift = (ARM.b1 + ARM.b2), c1 = Math.cos(ARM.b1), s1 = Math.sin(ARM.b1), c2 = Math.cos(lift), s2 = Math.sin(lift);
    const ex = S.x + (E.x - S.x) * c1 - (E.y - S.y) * s1, ey = S.y + (E.x - S.x) * s1 + (E.y - S.y) * c1;
    for (const p of points) if (p.arm === 2) left = Math.min(left, ex + (p.x - E.x) * c2 - (p.y - E.y) * s2);
    const persp = VIEW / (VIEW - reach), west = Math.max(reach, -left), spanX = (west + reach) * persp + CW * 2, spanY = ROWS * CH * persp + CH * 2;
    const scale = Math.min(w / spanX, h / spanY);
    // Centre the body, leaving the left side room for the wave.
    return {scale, ox: w / 2 + (west - reach) * persp * scale / 2, oy: h / 2};
  }

  function draw(t) {
    const g = context(); if (!g) return;
    if (!ink || t - inkCheck > 500) {
      ink = win.getComputedStyle?.(canvas).color || '#ccc'; inkCheck = t;
      // Dark ink on a light panel: small dark glyphs read fainter than light ones on dark, so the dim end is lifted.
      const [r = 200, gr = 200, b = 200] = (ink.match(/\d+(\.\d+)?/g) || []).map(Number);
      floor = (.2126 * r + .7152 * gr + .0722 * b) / 255 < .5 ? .52 : .22;
    }
    const dpr = win.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    if (fit?.w !== w || fit.h !== h) fit = {w, h, ...layout(w, h)};
    const {scale, ox, oy} = fit, size = CH * scale * 1.3, sp = glyphs(Math.round(size * 2) / 2, dpr);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
    // The arm's pose this frame.
    const wt = waveAt == null ? -1 : t - waveAt, lift = waveLift(wt) * gain;
    const a1 = ARM.b1 * lift + WAVE_ARMSHARE * WAVE_WIGK * waveSwing(wt) * gain;
    const aT = (ARM.b1 + ARM.b2) * lift + WAVE_WIGK * waveSwing(wt - WAVE_LAG) * gain;
    const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(aT), s2 = Math.sin(aT);
    const ex = S.x + (E.x - S.x) * c1 - (E.y - S.y) * s1, ey = S.y + (E.x - S.x) * s1 + (E.y - S.y) * c1;
    // A slow sway while nobody is turning him, so he reads as something you can turn.
    const sway = motion() && !dragging && t - lastInput < 20000 ? .16 * Math.sin((t - started) / 1600) * smooth(0, 1500, t - released) : 0;
    const cy = Math.cos(yaw + sway), sy = Math.sin(yaw + sway), cp = Math.cos(pitch), sp2 = Math.sin(pitch);
    for (const p of points) {
      let x = p.x, y = p.y;
      if (p.arm === 2) { const dx = x - E.x, dy = y - E.y; x = ex + dx * c2 - dy * s2; y = ey + dx * s2 + dy * c2; }
      else if (p.arm === 1) { const dx = x - S.x, dy = y - S.y; x = S.x + dx * c1 - dy * s1; y = S.y + dx * s1 + dy * c1; }
      const x1 = x * cy + p.z * sy, z1 = -x * sy + p.z * cy;
      const y2 = y * cp - z1 * sp2, z2 = y * sp2 + z1 * cp;
      const facing = (-p.nx * sy + p.nz * cy) * cp;
      const show = smooth(-.12, .3, facing);
      if (show <= 0.01 || p.fade <= 0) continue;
      const img = sp[p.glyph]; if (!img) continue;
      const k = VIEW / (VIEW - z2), d = size * k * dpr * 1.4;
      g.globalAlpha = Math.min(1, (floor + (1 - floor) * p.glyph / 9) * (.62 + .38 * Math.max(0, facing)) * show * p.fade);
      g.drawImage(img, (ox + x1 * k * scale) * dpr - d / 2, (oy - y2 * k * scale) * dpr - d / 2, d, d);
    }
    g.globalAlpha = 1;
  }

  function tick(t) {
    frame = 0;
    if (!canvas.isConnected) return;
    const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    if (!dragging) {
      yaw += spin * dt; spin *= Math.exp(-dt * 2.4);
      if (Math.abs(spin) < .05) spin = 0;
      // Settle back to facing you, the shorter way round, once he has stopped turning.
      if (!spin && t - released > 1400) {
        const home = Math.round(yaw / (2 * Math.PI)) * 2 * Math.PI, ease = 1 - Math.exp(-dt * 3.2);
        yaw += (home - yaw) * ease; pitch -= pitch * ease;
        if (Math.abs(home - yaw) < 1e-3 && Math.abs(pitch) < 1e-3) { yaw = 0; pitch = 0; }
      }
    }
    // Turning him lowers the arm; it comes back up for the rest of the wave on release.
    gain += ((dragging ? 0 : 1) - gain) * (1 - Math.exp(-dt * 10));
    draw(t);
    const waving = waveAt != null && t - waveAt < WAVE_LEN + 2 * WAVE_LAG;
    if (!waving) waveAt = null;
    const busy = dragging || spin || yaw || pitch || waving || (motion() && t - lastInput < 21500);
    if (busy) schedule();
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

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = {x: e.clientX, y: e.clientY, moved: 0, t: now()};
    try { canvas.setPointerCapture?.(e.pointerId); } catch { /* a pointer the browser no longer tracks */ }
    spin = 0; poke();
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) { if (e.pointerType === 'mouse') poke(); return; }
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y, t = now(), dt = Math.max(.008, (t - dragging.t) / 1000);
    dragging.moved += Math.abs(dx) + Math.abs(dy);
    yaw += dx * .014; pitch = Math.max(-.5, Math.min(.5, pitch + dy * .008));
    spin = spin * .5 + (dx * .014 / dt) * .5;
    Object.assign(dragging, {x: e.clientX, y: e.clientY, t});
    poke();
  });
  const release = e => {
    if (!dragging) return;
    const click = dragging.moved < 5, stale = now() - dragging.t > 90;
    dragging = null; released = now();
    try { canvas.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
    if (click) { spin = 0; wave(); }
    else if (stale) spin = 0;
    spin = Math.max(-10, Math.min(10, spin));
    poke();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { spin += e.key === 'ArrowLeft' ? -4 : 4; released = now(); e.preventDefault(); poke(); }
    else if (e.key === 'Enter' || e.key === ' ') { wave(); e.preventDefault(); }
  });

  /** Draw once he is on the page and, on arrival, wave hello after a short beat. */
  function start({wave: hello = true} = {}) {
    lastInput = now();
    schedule();
    if (hello) wave(700);
  }
  return {element: canvas, start, wave};
}
