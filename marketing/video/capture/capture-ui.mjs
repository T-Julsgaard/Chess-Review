// Captures the real Chess Review UI for the intro video: 4K stills and 60 fps
// frame-accurate sequences (see virtual-time.js), plus element positions for overlays.
// Output goes to public/captures, which is not committed. The review is deterministic
// (single-threaded Stockfish at fixed depth), so a re-run reproduces the same numbers.
//
//   node capture/capture-ui.mjs                 every shot
//   node capture/capture-ui.mjs --only=practice  named shots only (manifest is merged)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startSession, closeSession, tmpWorkDir } from './chrome.mjs';
import { installVirtualTime } from './virtual-time.js';

const VIDEO = fileURLToPath(new URL('../', import.meta.url));
const OUT = path.join(VIDEO, 'public', 'captures');
const W = 1920, H = 1080, DSF = 2, FPS = 60;
const hero = JSON.parse(fs.readFileSync(new URL('./hero-game.json', import.meta.url), 'utf8'));
// The opponent is a private player, so the video shows them as "Opponent" without a flag.
// The moves, and so the whole analysis, are unchanged.
const OPPONENT = 'Opponent';
const job = {
  pgn: hero.pgn.replaceAll(hero.meta.black.user, OPPONENT),
  meta: { ...hero.meta, black: { user: OPPONENT, result: hero.meta.black.result } },
  source: 'url',
};
const arg = process.argv.find((a) => a.startsWith('--only='));
const only = new Set(arg ? arg.slice(7).split(',') : []);
const want = (name) => !only.size || only.has(name);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// What a new user sees, except: no sound (the video has its own mix) and a 320 ms piece
// slide instead of 160 ms, so moves read on video. Both are ordinary settings.
const LOOK = { sound: false, animSpeed: 3, bestArrow: true, boardTheme: 'maple', pieceStyle: 'image',
  coach: 'old_soviet', coachPlain: true, badgeTooltip: false };

const manifestFile = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manifestFile) && only.size
  ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { stills: {}, sequences: {} };
manifest.viewport = { width: W, height: H, scale: DSF, fps: FPS };
manifest.game = { white: hero.meta.white.user, black: OPPONENT, url: hero.meta.url };
const save = () => fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));

fs.mkdirSync(OUT, { recursive: true });
const workDir = await tmpWorkDir();
const { browser, session } = await startSession({ workDir, width: W, height: H, scale: DSF });
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const base = `chrome-extension://${session.extId}`;
await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DSF, mobile: false });

// The mouse is tracked so the video can draw a cursor exactly where the real one was.
const mouse = {
  x: null, y: null, down: false,
  async move(x, y) { this.x = x; this.y = y; await page.mouse.move(x, y); },
  async press() { this.down = true; await page.mouse.down(); },
  async release() { this.down = false; await page.mouse.up(); },
  state() { return this.x == null ? null : [+this.x.toFixed(1), +this.y.toFixed(1), this.down ? 1 : 0]; },
  async park() { await this.move(W - 40, H - 30); this.x = null; },
};

async function paint() {
  await page.evaluate(() => new Promise((r) => {
    const raf = window.__vt ? window.__vt.real.raf : requestAnimationFrame;
    raf(() => raf(r));
  }));
}
async function grab(file, { clip, format = 'png', quality } = {}) {
  await paint();
  const opts = { format, fromSurface: true, captureBeyondViewport: false };
  if (quality) opts.quality = quality;
  if (clip) opts.clip = { ...clip, scale: 1 };
  const { data } = await cdp.send('Page.captureScreenshot', opts);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}

// Element rectangles in CSS pixels: every module plus the controls the video points at.
async function layout() {
  return page.evaluate(() => {
    const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    // The text itself rather than its block, for rings around words.
    const text = (e) => { if (!e) return null; const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const out = {};
    for (const m of document.querySelectorAll('[id$="Mount"]')) out[m.id.replace(/Mount$/, '')] = box(m.closest('.mod') || m);
    Object.assign(out, {
      board: box(document.querySelector('.board')),
      graphSvg: box(document.querySelector('#graphMount svg')),
      practiceBtn: box(document.querySelector('.practice-btn')),
      qbreakToggle: box(document.querySelector('.qbreak-toggle')),
      accuracy: box(document.querySelector('.acc-val')?.closest('.mod')),
      topbar: box(document.querySelector('.topbar, header')),
      coach: box(document.querySelector('.coach-frame')?.closest('.mod')),
      players: [...document.querySelectorAll('.player-strip')].map(box),
      ipHead: text(document.querySelector('.ip-head')),
      ipText: text(document.querySelector('.ip-text')),
      ipAnalyzing: text(document.querySelector('.ip-analyzing')),
      currentMove: box(document.querySelector('.ml-move.current')),
      accVals: [...document.querySelectorAll('.acc-val')].map(text),
      estRatings: [...document.querySelectorAll('.est-rating')].map(text),
    });
    return out;
  });
}
function square(lay, sq) {
  const c = lay.board.w / 8;
  return { x: lay.board.x + ('abcdefgh'.indexOf(sq[0]) + 0.5) * c, y: lay.board.y + (8 - Number(sq[1]) + 0.5) * c };
}

// Any extension page can write storage; leaving the review page also makes the next open a real load.
async function storage(values) {
  await page.goto(`${base}/popup.html`);
  await page.evaluate(async (v) => {
    const cur = (await chrome.storage.local.get('settings')).settings || {};
    await chrome.storage.local.set({ ...v, settings: { ...cur, ...(v.settings || {}) } });
  }, values);
}

// Opens the hero game. The first open runs the real analysis; later opens load the saved one.
async function openGame(look = {}, onProgress) {
  await storage({ username: hero.username, settings: { ...LOOK, ...look },
    'job:hero': job });
  await page.goto(`${base}/analysis.html#hero`);
  const key = 'analysis:' + hero.meta.gameId;
  for (let i = 0; i < 600; i++) {
    const saved = await page.evaluate(async (k) => !!(await chrome.storage.local.get(k))[k], key);
    if (saved && await page.$('.acc-val')) break;
    if (onProgress) await onProgress();
    await sleep(500);
  }
  await page.waitForSelector('.acc-val');
  await sleep(1500);
  // The review page zooms its own tab to fit the window, so page (CSS) pixels differ from
  // screen pixels. Layouts and cursor positions are stored in CSS pixels; cssScale converts.
  const vp = await page.evaluate(() => [innerWidth, innerHeight]);
  const cssScale = W / vp[0];
  if (Math.abs(H / vp[1] - cssScale) > 0.01) throw Error(`viewport ${vp} is not a uniform zoom of ${W}x${H}`);
  manifest.viewport.css = vp;
  manifest.viewport.cssScale = cssScale;
  await mouse.park();
}

async function goPly(n) {
  await page.keyboard.press('Home');
  if (n > 0) await page.evaluate((n) => document.querySelector(`.ml-move[data-ply="${n}"]`).click(), n);
  await sleep(700);
}

async function still(name, extra = {}) {
  const file = `${name}.png`;
  await grab(path.join(OUT, file), extra);
  manifest.stills[name] = { file: `captures/${file}`, layout: await layout(), ...(extra.clip ? { clip: extra.clip } : {}) };
  save();
  console.log('still', name);
}

// --- virtual time across the page and its frames (the coach portrait is an iframe) ---
async function vt(method, value) {
  for (const f of page.frames()) {
    try {
      if (method === 'enter') await f.evaluate(installVirtualTime);
      await f.evaluate(([m, v]) => window.__vt && window.__vt[m](v), [method, value]);
    } catch { /* detached or navigating frame */ }
  }
}

// Records `frames` frames at FPS. actions[i] (functions) run just before frame i.
async function record(name, frames, actions = {}, { quality = 92, probe } = {}) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cursor = [], probes = [];
  const startLayout = await layout();
  await vt('enter');
  for (let i = 0; i < frames; i++) {
    for (const fn of actions[i] || []) await fn();
    await vt(i ? 'step' : 'sync', 1000 / FPS);
    await grab(path.join(dir, `${String(i).padStart(4, '0')}.jpg`), { format: 'jpeg', quality });
    cursor.push(mouse.state());
    if (probe) probes.push(await page.evaluate(probe));
  }
  await vt('exit');
  manifest.sequences[name] = { dir: `captures/${name}`, frames, fps: FPS, cursor, layout: startLayout, ...(probe ? { probes } : {}) };
  save();
  console.log('sequence', name, frames);
}
const at = (actions, i, fn) => { (actions[i] ||= []).push(fn); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// Cursor travel from a to b over n frames starting at frame f.
function glide(actions, f, n, a, b) {
  for (let k = 1; k <= n; k++) {
    const t = ease(k / n);
    at(actions, f + k, () => mouse.move(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
  }
}

try {
  // 1. First open: the real analysis runs. Capture the loading state on the way.
  let loadingShot = !want('loading');
  await openGame({}, async () => {
    if (loadingShot) return;
    const text = await page.evaluate(() => document.querySelector('#reviewMount')?.innerText || '');
    const m = text.match(/(\d+)\/(\d+)/);
    if (m && Number(m[1]) >= 18) { loadingShot = true; await still('loading'); }
  });

  // The engine's evaluations and move classes, for the video's own graph.
  if (want('data')) {
    const data = await page.evaluate(async (k) => {
      const saved = (await chrome.storage.local.get(k))[k];
      let classif = null;
      try { classif = JSON.parse(JSON.stringify(S.classif)); } catch { /* S is the review page's state */ }
      return { evals: saved.evals, engineBuild: saved.engineBuild, settingsKey: saved.settingsKey, classif };
    }, 'analysis:' + hero.meta.gameId);
    fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(data));
    console.log('data', data.evals.length, 'evals');
  }

  // 2. Hook: the game replayed on a clean board (no best-move arrow, which would give the answer away).
  if (want('hook')) {
    await openGame({ bestArrow: false });
    const lay = await layout();
    const pad = 16;
    const top = Math.min(...lay.players.map((p) => p.y)), bottom = Math.max(...lay.players.map((p) => p.y + p.h));
    const x0 = lay.evalbar.x - pad, y0 = top - pad;
    const clip = { x: x0, y: y0, width: lay.board.x + lay.board.w + pad - x0, height: bottom + pad - y0 };
    // Screenshot clips are in screen pixels; layouts are in the zoomed page's pixels.
    const k = manifest.viewport.cssScale;
    const shot = { x: clip.x * k, y: clip.y * k, width: clip.width * k, height: clip.height * k };
    const dir = path.join(OUT, 'hook-replay');
    fs.rmSync(dir, { recursive: true, force: true });
    for (let p = 0; p <= 56; p++) {
      await goPly(p);
      await grab(path.join(dir, `${String(p).padStart(4, '0')}.jpg`), { format: 'jpeg', quality: 93, clip: shot });
    }
    manifest.sequences['hook-replay'] = { dir: 'captures/hook-replay', frames: 57, perPly: true, clip, layout: lay };
    save();
    console.log('replay stills 57');

    await goPly(54);
    await record('hook-qxd4', 75, { 2: [() => page.keyboard.press('ArrowRight')] });
    await record('hook-qxg2', 90, { 2: [() => page.keyboard.press('ArrowRight')] });
  }

  // 3. The review itself, with the default look.
  if (want('review')) {
    await openGame();
    for (const p of [0, 33, 54, 55, 56]) { await goPly(p); await still(`review-${p}`); }
    await goPly(55);
    await page.click('.qbreak-toggle');
    await mouse.park(); // a row under the pointer would show its tooltip
    await sleep(900);
    await still('review-55-allcats');
  }

  // 4. Jump from the evaluation graph's cliff to move 28.
  if (want('graph')) {
    await openGame();
    await goPly(40);
    const lay = await layout();
    const g = lay.graphSvg;
    const a = { x: lay.board.x + lay.board.w * 0.75, y: lay.board.y + lay.board.h * 0.55 };
    const b = { x: g.x + g.w * (55 / 56), y: g.y + g.h * 0.55 };
    const actions = {};
    at(actions, 0, () => mouse.move(a.x, a.y));
    glide(actions, 4, 44, a, b);
    at(actions, 56, () => mouse.press());
    at(actions, 61, () => mouse.release());
    await record('graph-jump', 110, actions);
    await mouse.park();
  }

  // 5. Rated alternative: 28.h3 instead of 28.Qxd4. Qxg2 is still mate, and the badge says so.
  if (want('alt')) {
    await openGame();
    await goPly(54);
    const lay = await layout();
    const from = square(lay, 'h2'), to = square(lay, 'h3');
    const start = { x: from.x + 140, y: from.y + 170 };
    const actions = {};
    at(actions, 0, () => mouse.move(start.x, start.y));
    glide(actions, 4, 30, start, from);
    at(actions, 40, () => mouse.press());
    glide(actions, 42, 24, from, to);
    at(actions, 70, () => mouse.release());
    glide(actions, 76, 40, to, { x: to.x - 220, y: to.y + 190 });
    // The rating needs a real engine reply; the probe logs real time so the edit can hold
    // the frame for as long as the reply really took.
    await record('alt-h3', 150, actions, { probe: () => [document.querySelectorAll('.board .sq-badge').length, Math.round(window.__vt ? __vt.real.perfNow() : performance.now())] });
    await mouse.park();
  }

  // 6. Practice: replay to the mistake, watch it replayed, then find 28.Rg1.
  if (want('practice')) {
    await openGame();
    await goPly(50);
    const lay = await layout();
    const btn = { x: lay.practiceBtn.x + lay.practiceBtn.w / 2, y: lay.practiceBtn.y + lay.practiceBtn.h / 2 };
    const start = { x: btn.x - 120, y: btn.y + 260 };
    const rook = square(lay, 'd1'), g1 = square(lay, 'g1');
    const actions = {};
    at(actions, 0, () => mouse.move(start.x, start.y));
    glide(actions, 4, 36, start, btn);
    at(actions, 46, () => mouse.press());
    at(actions, 51, () => mouse.release());
    // About 2.8 s of roll + replay after the click; the board accepts moves from ~frame 220.
    glide(actions, 226, 44, btn, rook);
    at(actions, 280, () => mouse.press());
    glide(actions, 283, 40, rook, g1);
    at(actions, 330, () => mouse.release());
    glide(actions, 340, 50, g1, { x: g1.x + 150, y: g1.y + 60 });
    await record('practice', 520, actions);
    await mouse.park();
  }

  // 7. Make it yours: board themes and piece sets on the same moment.
  if (want('themes')) {
    for (const [theme, pieces] of [['green', 'image'], ['ocean', 'merida'], ['ink', 'image'], ['coral', 'merida'], ['lavender', 'image']]) {
      await openGame({ boardTheme: theme, pieceStyle: pieces });
      await goPly(55);
      await still(`theme-${theme}-${pieces}`);
    }
    await openGame();
    await goPly(55);
    await page.click('button[aria-label="Settings"]');
    await sleep(900);
    await still('settings');
  }

  // 8. The ten coaches, rendered on transparent backgrounds from their own portrait rigs.
  if (want('coaches')) {
    const list = {
      old_soviet: 'old_soviet_rework_rig.html', professor: 'animated_professor_rig.html', hustler: 'animated_hustler_rig.html',
      wise_grandma: 'animated_grandma_rig.html', drunk_uncle: 'animated_drunk_uncle_rig.html',
      conspiracy_theorist: 'animated_conspiracy_rig.html', kid_prodigy: 'animated_kid_rig.html', mentor: 'animated_mentor_rig.html',
      life_coach: 'animated_lifecoach_rig.html', nature_documentarian: 'animated_naturalist_rig.html',
    };
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 680, height: 760, deviceScaleFactor: 2, mobile: false });
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    for (const [id, file] of Object.entries(list)) {
      await page.goto(`${base}/data/coaches-anim/rigs/${file}`);
      await page.addStyleTag({ content: 'html,body{margin:0;padding:0;background:transparent!important}.coach-ctrl,.sr-only,h2{display:none!important}.coach-wrap{padding:0!important}.coach-svg{max-width:none!important;width:680px!important}' });
      await page.evaluate(() => { try { window.coach && window.coach.setEmotion && window.coach.setEmotion('happy'); } catch {} });
      await sleep(1200);
      await grab(path.join(OUT, 'coaches', `${id}.png`));
      console.log('coach', id);
    }
    manifest.coaches = Object.keys(list).map((id) => `captures/coaches/${id}.png`);
    save();
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', {});
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DSF, mobile: false });
  }

  // 9. The toolbar popup, with a game link pasted into Manual setup.
  if (want('popup')) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 318, height: 600, deviceScaleFactor: 3, mobile: false });
    await page.goto(`${base}/popup.html`);
    await sleep(800);
    const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollHeight]);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: size[0], height: Math.ceil(size[1]), deviceScaleFactor: 3, mobile: false });
    await sleep(300);
    await grab(path.join(OUT, 'popup.png'));
    await page.evaluate(() => { document.getElementById('manual').open = true; });
    await page.fill('#manualInput', hero.meta.url);
    await page.evaluate(() => document.activeElement.blur());
    const size2 = await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollHeight]);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: size2[0], height: Math.ceil(size2[1]), deviceScaleFactor: 3, mobile: false });
    await sleep(400);
    await grab(path.join(OUT, 'popup-pasted.png'));
    manifest.popup = { closed: { file: 'captures/popup.png', size }, pasted: { file: 'captures/popup-pasted.png', size: size2 } };
    save();
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DSF, mobile: false });
    console.log('popup');
  }
} finally {
  await closeSession(browser).catch(() => {});
  await sleep(1500);
  fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
console.log('done ->', OUT);
process.exit(0);
