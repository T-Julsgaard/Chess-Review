// Shared Chess Review player profiles on the web (GitHub Pages). The link carries the whole
// profile in its fragment (#p=…), which never reaches a server: this page decodes it in the
// browser and opens the extension's own Story workspace on it (lib/profile/designs/story.js),
// with the extension's stylesheets, so the deck, its board charts and its animations are the
// ones Chess Review shows. Only the page around it is web-specific: the top bar's store links,
// the install dialog, board sounds and a small board stage standing in for the review layout.
// Network: this page's own files; opening a game on the board fetches its moves directly from
// Chess.com or Lichess (lib/profile/pgn-source.js), and Stockfish loads only for a viewed game.
import {StoryWorkspace} from '../lib/profile/designs/story.js';
import {decodeProfile} from '../lib/profile/share.js';

const ASSETS = new URL('../', import.meta.url);
const asset = path => new URL(path, ASSETS).href;
const $ = id => document.getElementById(id);
const STORE = {
  chrome: {href: 'https://chromewebstore.google.com/detail/chess-review/pdbffcjdmcadihmnmenkadndbdbigfam', name: 'Chrome'},
  firefox: {href: 'https://addons.mozilla.org/en-US/firefox/addon/chess-review/', name: 'Firefox'},
};
const UA = navigator.userAgent || '';
const BROWSER = /firefox|fxios/i.test(UA) ? 'firefox' : /edg\//i.test(UA) ? 'edge' : 'chrome';
/** The store this browser installs from (Edge, Brave and Opera install from the Chrome Web Store). */
const primaryStore = () => BROWSER === 'firefox' ? STORE.firefox : STORE.chrome;
const otherStore = () => BROWSER === 'firefox' ? STORE.chrome : STORE.firefox;
/** Install links name the store they open, as the top bar's do. */
const storeLabel = store => store === STORE.firefox ? 'Visit Firefox Add-ons' : 'Visit Chrome Web Store';

const h = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value; else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null && child !== false) node.append(child.nodeType ? child : document.createTextNode(String(child)));
  return node;
};
const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONS = {
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  prev: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 5l-9 7 9 7z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l9 7-9 7z"/></svg>',
  external: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  twin: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  review: svg('<path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/>'),
  puzzle: svg('<path d="M8 3h3v3a2 2 0 1 0 4 0V3h3a2 2 0 0 1 2 2v3h-3a2 2 0 1 0 0 4h3v7a2 2 0 0 1-2 2h-3v-3a2 2 0 1 0-4 0v3H8a2 2 0 0 1-2-2v-7h3a2 2 0 1 0 0-4H6V5a2 2 0 0 1 2-2z"/>'),
  link: svg('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>'),
  knight: `<img src="${asset('pieces-img/cburnett/wN.svg')}" alt="" />`,
};

/* ---------- the extension's surroundings, for the web ---------- */
// What Chess Review's settings hold by default for everything the profile reads.
const SETTINGS = {uiAnim: true, moveAnim: true, animSpeed: 7, pieceStyle: 'image', barStyle: 'flat2', engineDepth: 12,
  profilePortraitStyle: 'relief', profileSignatureBoard: 'differences', profileStream: 'film',
  profileIncludeBots: false, profileColor: 'all', profileRatedOnly: false, profileSkipShort: false, profileExcludedOpponents: {},
  profilePeriod: 'year', profileBudget: 'standard', profileDepth: 'off', profileSample: 'all'};
const STARTUP_OPEN_DELAY = 40;
/** In-memory stand-in for extension storage: a shared profile keeps nothing between visits. */
function memoryStorage() {
  const data = new Map();
  return {
    async get(keys) {
      const out = {};
      if (keys == null) { for (const [k, v] of data) out[k] = structuredClone(v); return out; }
      const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      for (const k of list) if (data.has(k)) out[k] = structuredClone(data.get(k)); else if (keys && typeof keys === 'object' && !Array.isArray(keys)) out[k] = keys[k];
      return out;
    },
    async set(items) { for (const [k, v] of Object.entries(items)) data.set(k, structuredClone(v)); },
    async remove(keys) { for (const k of [].concat(keys)) data.delete(k); },
  };
}
function makePiece(type, side) {
  const code = (side === 'w' ? 'w' : 'b') + String(type).toUpperCase();
  return h('img', {class: 'piece-img', 'data-piece': code, 'data-set': 'cburnett', src: asset(`pieces-img/cburnett/${code}.svg`), alt: '', draggable: 'false'});
}
const FILES = 'abcdefgh';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
/** The review board's squares, as analysis.js builds them: the profile clones them when it takes the board. */
function buildBoard(board, fen = START) {
  board.replaceChildren();
  const rows = fen.split(' ')[0].split('/'), at = {};
  rows.forEach((row, r) => { let c = 0; for (const ch of row) { if (/\d/.test(ch)) c += Number(ch); else { at[FILES[c] + (8 - r)] = ch; c++; } } });
  for (let rank = 8, ri = 0; rank >= 1; rank--, ri++) for (let ci = 0; ci < 8; ci++) {
    const light = (ri + ci) % 2 === 0, name = FILES[ci] + rank;
    const sq = h('div', {class: 'sq ' + (light ? 'light' : 'dark') + (ri === 0 ? ' top-row' : '') + (ci === 7 ? ' right-col' : '')});
    if (ci === 0) sq.append(h('span', {class: 'coord rank'}, rank));
    if (ri === 7) sq.append(h('span', {class: 'coord file'}, FILES[ci]));
    const ch = at[name];
    if (ch) sq.append(makePiece(ch.toLowerCase(), ch === ch.toUpperCase() ? 'w' : 'b'));
    board.append(sq);
  }
}
const VALUES = {p: 1, n: 3, b: 3, r: 5, q: 9}, FULL = {p: 8, n: 2, b: 2, r: 2, q: 1};
/** The review's name strip for a viewed game: avatar, name and rating, and the pieces each side has taken. */
function playerStrip(side, player, fen) {
  const board = String(fen || START).split(' ')[0], count = ch => [...board].filter(c => c === ch).length;
  const lost = color => Object.keys(FULL).flatMap(t => Array(Math.max(0, FULL[t] - count(color === 'w' ? t.toUpperCase() : t))).fill(color + t.toUpperCase()));
  const material = color => Object.keys(VALUES).reduce((sum, t) => sum + VALUES[t] * count(color === 'w' ? t.toUpperCase() : t), 0);
  const caps = lost(side === 'w' ? 'b' : 'w'), diff = material('w') - material('b');
  const ahead = side === 'w' ? diff > 0 : diff < 0;
  const toMove = String(fen || '').split(' ')[1] === side;
  const name = player?.name || 'Unknown player';
  return h('div', {class: 'player-strip' + (toMove ? ' active' : '')},
    h('span', {class: 'avatar', style: {background: side === 'w' ? '#3f7d3a' : '#5a5a5a'}}, (name[0] || '?').toUpperCase()),
    h('div', {class: 'who'},
      h('span', {class: 'name'}, name, player?.rating ? h('span', {class: 'elo'}, ` (${player.rating})`) : null),
      h('div', {class: 'captured'},
        h('div', {class: 'cap-tray cap-tray-' + (side === 'w' ? 'light' : 'dark') + (caps.length ? '' : ' is-empty')}, ...caps.map(code => h('img', {class: 'cap-pc', src: asset(`pieces-img/cburnett/${code}.svg`), alt: ''}))),
        ahead ? h('span', {class: 'adv'}, '+' + Math.abs(diff)) : null)));
}
let toastTimer = 0;
function toast(text) {
  let node = document.querySelector('.web-toast');
  if (!node) { node = h('div', {class: 'web-toast', role: 'status', 'aria-live': 'polite'}); document.body.append(node); }
  node.textContent = text; node.classList.add('is-shown');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('is-shown'), 2200);
}
const scale = () => window.innerWidth <= 900 ? 1 : Math.max(1, Math.min(3, window.innerWidth / 1920, window.innerHeight / 1080));
async function createEngine() {
  const {Engine} = await import('../engine/uci.js');
  const engine = new Engine(asset('engine/stockfish-19-lite-single.js'), asset('engine/stockfish-19-lite-single.wasm'));
  await engine.setOptions({Threads: 1, Hash: 16});
  return engine;
}
/* Board sounds: the files and volume Chess Review plays by default (analysis.js), through Web Audio.
   Browsers keep audio silent until the reader first clicks or presses a key on the page. */
const SOUNDS = {move: 'sounds/move-self.mp3', capture: 'sounds/capture.mp3', check: 'sounds/Check.mp3', castle: 'sounds/Castling.mp3', wrong: 'sounds/Wrong/Incorrect.mp3'};
const SOUND_VOLUME = .5, SOUND_GAP = 55;
/** The sound a move makes, by its notation, as in the review. */
const moveSound = (san = '') => /x/.test(san) ? 'capture' : /[+#]/.test(san) ? 'check' : /^[O0]-[O0]/.test(san) ? 'castle' : 'move';
let audio = null, lastSound = 0;
const soundBuffers = new Map();
function playSound(name) {
  const now = performance.now();
  // Held arrow keys repeat fast; one click per step is enough.
  if (!SOUNDS[name] || now - lastSound < SOUND_GAP) return;
  lastSound = now;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  if (!soundBuffers.has(name)) soundBuffers.set(name, fetch(asset(SOUNDS[name])).then(r => r.arrayBuffer()).then(data => audio.decodeAudioData(data)));
  soundBuffers.get(name).then(buffer => {
    const source = audio.createBufferSource(), gain = audio.createGain();
    source.buffer = buffer; gain.gain.value = SOUND_VOLUME;
    source.connect(gain).connect(audio.destination); source.start();
  }).catch(() => soundBuffers.delete(name));
}
async function copyLink(button) {
  try { await navigator.clipboard.writeText(location.href); toast('Link copied'); button?.classList.add('is-done'); setTimeout(() => button?.classList.remove('is-done'), 1600); }
  catch { toast('Could not copy the link'); }
}

/* ---------- install nudges ---------- */
function installButton({cls = 'profile-button primary web-install', store = primaryStore(), where = ''} = {}) {
  return h('a', {class: cls, href: store.href, target: '_blank', rel: 'noopener', 'data-install': where},
    h('span', {class: 'web-install-icon', html: ICONS.external}), h('span', {}, storeLabel(store)));
}
/** This browser's store in green, the other beside it in plain. */
const installButtons = where => [installButton({where}), installButton({cls: 'profile-button web-install web-install-other', store: otherStore(), where: where + '-other'})];
let dialog = null, dialogReturn = null;
function openInstall(account) {
  if (!dialog) {
    const features = [
      [ICONS.twin, 'Your own profile', 'Your historical twin, rating journey, openings, rivals and habits, drawn on the board like this one.'],
      [ICONS.review, 'One-click game review', 'Every Chess.com or Lichess game reviewed move by move, with Stockfish running on your own computer.'],
      [ICONS.puzzle, 'Learn as you play', 'Over 50,000 puzzles and opening lessons built in.'],
    ];
    dialog = h('div', {class: 'web-dialog-backdrop', hidden: true, onclick: e => { if (e.target === dialog) closeInstall(); }},
      h('div', {class: 'web-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'installTitle', tabindex: '-1',
        onkeydown: e => { if (e.key === 'Escape') { e.preventDefault(); closeInstall(); } else if (e.key === 'Tab') trapFocus(e); }},
        h('button', {type: 'button', class: 'web-dialog-close', 'aria-label': 'Close', html: ICONS.close, onclick: () => closeInstall()}),
        h('span', {class: 'brand-mark web-dialog-mark', html: ICONS.knight}),
        h('span', {class: 'web-dialog-eyebrow'}, 'Chess Review'),
        h('h2', {id: 'installTitle'}, 'Build your own player profile'),
        h('p', {class: 'web-dialog-lead', id: 'installLead'}),
        h('ul', {class: 'web-features'}, ...features.map(([icon, title, text]) => h('li', {}, h('span', {class: 'web-feature-icon', html: icon}), h('div', {}, h('strong', {}, title), h('span', {}, text))))),
        h('div', {class: 'web-dialog-actions'}, ...installButtons('dialog'))));
    document.body.append(dialog);
  }
  $('installLead').textContent = account
    ? `Free and open source. Type your Chess.com or Lichess username and get a story like ${account}'s.`
    : 'Free and open source. Type your Chess.com or Lichess username and get a story you can share.';
  dialogReturn = document.activeElement;
  dialog.hidden = false; requestAnimationFrame(() => dialog.classList.add('is-open'));
  dialog.querySelector('.web-install').focus({preventScroll: true});
}
function closeInstall() {
  if (!dialog || dialog.hidden) return;
  dialog.classList.remove('is-open');
  setTimeout(() => { if (!dialog.classList.contains('is-open')) dialog.hidden = true; }, 180);
  dialogReturn?.focus?.({preventScroll: true});
}
function trapFocus(event) {
  const items = [...dialog.querySelectorAll('a[href], button')].filter(n => !n.disabled);
  const first = items[0], last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

/* ---------- the extension's Story deck, with the web's last chapter ---------- */
class WebStoryWorkspace extends StoryWorkspace {
  hero(slide) {
    const hero = super.hero(slide);
    return slide.id === 'share' && !slide.empty ? {value: 'The whole story at a glance', text: true, label: null} : hero;
  }
  /** The last chapter: where the extension offers its share link, the web offers a profile of your own. */
  renderShare() {
    const {h} = this, account = this.shared?.account || '';
    const copy = h('button', {type: 'button', class: 'profile-button ghost web-copy', onclick: () => copyLink(copy)}, h('span', {class: 'profile-button-icon', html: ICONS.link}), 'Copy this link');
    return h('div', {class: 'profile-share web-share'},
      h('div', {class: 'web-share-card'},
        h('span', {class: 'web-share-eyebrow'}, 'Your turn'),
        h('strong', {class: 'web-share-title'}, 'What would your games say?'),
        h('p', {}, `Chess Review builds this story from any Chess.com or Lichess account in your browser: your own twin, rating journey, openings and habits${account ? `, ready to compare with ${account}'s` : ''}.`),
        h('div', {class: 'web-share-actions'}, installButton({where: 'share'}), h('button', {type: 'button', class: 'profile-button ghost', onclick: () => openInstall(account)}, 'What you get'))),
      h('div', {class: 'profile-chooser-row web-share-row'}, copy));
  }
  /** The panel's "Build your own" gets the knight and the accent, so it reads as the page's way in. */
  renderHead() {
    super.renderHead();
    const build = this.shared && [...this.head.querySelectorAll(':scope > .profile-button')].find(b => /build your own/i.test(b.textContent));
    if (build) { build.classList.add('web-build'); build.prepend(this.h('span', {class: 'web-build-mark', html: ICONS.knight})); }
  }
}

/* ---------- page ---------- */
/** The top bar's two store links: this browser's store first and in green, the other beside it in plain. */
function syncStoreLinks() {
  const stores = $('stores'), mine = BROWSER === 'firefox' ? 'firefox' : 'chrome';
  for (const link of stores.querySelectorAll('[data-store]')) {
    link.href = STORE[link.dataset.store].href;
    link.classList.toggle('is-other', link.dataset.store !== mine);
  }
  stores.prepend(stores.querySelector(`[data-store="${mine}"]`));
}
function watchExtension() {
  const root = document.documentElement;
  const sync = () => {
    const installed = root.dataset.chessReview === 'installed';
    document.body.classList.toggle('web-has-extension', installed);
    $('installed').hidden = !installed;
    $('installed').lastChild.textContent = root.dataset.chessReviewOpened === 'true' ? 'Opened in Chess Review' : 'Chess Review is installed';
  };
  new MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['data-chess-review', 'data-chess-review-opened']});
  sync();
}
function reveal() {
  document.body.removeAttribute('data-starting');
  const startup = $('startup');
  // The timer lets the closed shutters paint and also runs when the tab is in the background.
  return new Promise(resolve => setTimeout(() => {
    const shutter = startup.querySelector('.startup-top');
    const finish = event => {
      if (event && (event.target !== shutter || event.propertyName !== 'transform')) return;
      clearTimeout(timer);
      startup.remove();
      resolve();
    };
    const timer = setTimeout(finish, 650);
    shutter.addEventListener('transitionend', finish);
    startup.classList.add('opening');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
  }, STARTUP_OPEN_DELAY));
}
/** No profile in the link (or a broken one): the page introduces player profiles instead. */
function showLanding({title, text, error = false}) {
  buildBoard($('board'));
  const landing = $('landing');
  landing.hidden = false; landing.classList.toggle('is-error', error);
  landing.replaceChildren(
    h('span', {class: 'profile-eyebrow'}, error ? 'Shared player profile' : 'Player profile'),
    h('h1', {id: 'landingTitle'}, title),
    h('p', {class: 'web-landing-lead'}, text),
    h('ul', {class: 'web-landing-list'}, ...['Your historical twin, and why', 'Rating journey, openings and rivals', 'Habits by hour, weekday and clock', 'One link to share it all'].map(t => h('li', {}, t))),
    h('div', {class: 'web-share-actions'}, ...installButtons('landing')),
    h('p', {class: 'web-dialog-foot'}, 'Free and open source · No account, no sign-up'));
  reveal();
}

async function main() {
  syncStoreLinks(); watchExtension();
  const m = location.hash.match(/[#&]p=([^&]+)/);
  if (!m) {
    showLanding({title: 'Your chess games, told as a story', text: 'Chess Review turns any Chess.com or Lichess account into a player profile drawn on the board. Profiles shared from the extension open on this page.'});
    return;
  }
  let report;
  try { report = await decodeProfile(m[1]); }
  catch (error) {
    // decodeProfile's own messages read well; anything else (a cut-off stream, bad JSON) gets the plain explanation.
    const known = /different version/i.test(error?.message || '');
    showLanding({error: true, title: known ? 'This profile link is from another version' : 'This profile link looks incomplete',
      text: known ? 'It was made by a different version of Chess Review. Ask for a fresh link, or build your own profile in the extension.'
        : 'The link could not be read. It may have been cut short when it was pasted, so ask for the link again.'});
    return;
  }
  const account = report.account || 'This player';
  document.title = `${account} · Chess Review player profile`;
  $('tagline').textContent = `${account}'s player profile`;
  buildBoard($('board'), '8/8/8/8/8/8/8/8');
  const workspace = new WebStoryWorkspace({
    document, storage: memoryStorage(), storageEvents: null, sendMessage: async () => ({ok: false}),
    stage: $('canvas'), boardWrap: $('boardWrap'), makePiece, flipped: false, gameMapReady: reveal(),
    settings: () => SETTINGS, writeSettings: patch => { Object.assign(SETTINGS, patch); },
    identity: {}, shared: report, toast, icon: name => ICONS[name] || '',
    flag: code => /^[A-Z]{2}$/i.test(code || '') ? h('img', {class: 'avatar avatar-flag', src: asset(`flags/${code.toUpperCase()}.svg`), alt: '', draggable: 'false', onerror: e => e.target.remove()}) : null,
    url: asset, uiScale: scale,
    renderGamePlayer: (side, player, fen) => playerStrip(side, player, fen),
    renderGameEvaluation: (bar, score, flipped) => { bar.className = 'profile-game-eval evalbar eb-' + SETTINGS.barStyle + (flipped ? ' flipped' : ''); },
    createAnalysisEngine: createEngine,
    buildOwn: () => openInstall(account), requestClose: () => {}, restoreBoard: () => {}, onClose: () => {},
    playGameMove: move => { if (move) playSound(moveSound(move.san)); }, playPuzzleWrong: () => playSound('wrong'),
  });
  document.body.classList.add('web-has-profile');
  await workspace.open();
}
main();
window.addEventListener('hashchange', () => location.reload());
