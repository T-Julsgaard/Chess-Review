// Shared Chess Review player profiles on the web (GitHub Pages). The link carries the whole
// profile in its fragment (#p=…), which never reaches a server: this page decodes it in the
// browser and opens the extension's own Story workspace on it (lib/profile/designs/story.js),
// with the extension's stylesheets, so the deck, its board charts and its animations are the
// ones Chess Review shows. Only the page around it is web-specific: the top bar, the install
// nudges and a small board stage standing in for the review layout.
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
const primaryLabel = () => BROWSER === 'firefox' ? 'Add to Firefox' : BROWSER === 'edge' ? 'Add to Edge' : 'Add to Chrome';
const NUDGE_KEY = 'chess-review-viewer-nudge';

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
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
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
  profilePortraitStyle: 'relief', profileSignatureBoard: 'differences', profileAccuracyAnimation: 'games', profileStream: 'film',
  profileIncludeBots: false, profileColor: 'all', profileRatedOnly: false, profileSkipShort: false, profileExcludedOpponents: {},
  profilePeriod: 'year', profileBudget: 'standard', profileDepth: 'off', profileSample: 'all'};
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
async function copyLink(button) {
  try { await navigator.clipboard.writeText(location.href); toast('Link copied'); button?.classList.add('is-done'); setTimeout(() => button?.classList.remove('is-done'), 1600); }
  catch { toast('Could not copy the link'); }
}

/* ---------- install nudges ---------- */
function installButton({cls = 'profile-button primary web-install', store = primaryStore(), label = primaryLabel(), where = ''} = {}) {
  return h('a', {class: cls, href: store.href, target: '_blank', rel: 'noopener', 'data-install': where},
    h('span', {class: 'web-install-icon', html: ICONS.download}), h('span', {}, label), h('small', {}, 'free'));
}
let dialog = null, dialogReturn = null;
function openInstall(account) {
  closePopover();
  if (!dialog) {
    const features = [
      [ICONS.twin, 'Your own profile', 'Your historical twin, rating journey, openings, rivals and habits, drawn on the board like this one.'],
      [ICONS.review, 'One-click game review', 'Every Chess.com or Lichess game reviewed move by move, with Stockfish running on your own computer.'],
      [ICONS.puzzle, 'Learn as you play', 'Puzzles and opening lessons built in.'],
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
        h('div', {class: 'web-dialog-actions'}, installButton({where: 'dialog'}),
          installButton({cls: 'profile-button web-install web-install-other', store: otherStore(), label: 'Get it for ' + otherStore().name, where: 'dialog-other'})),
        h('p', {class: 'web-dialog-foot'}, 'Free and open source · No account, no sign-up · Analysis runs on your machine')));
    document.body.append(dialog);
  }
  $('installLead').textContent = account
    ? `Type your Chess.com or Lichess username and Chess Review turns your games into a story like ${account}'s.`
    : 'Type your Chess.com or Lichess username and Chess Review turns your games into a story you can share.';
  dialogReturn = document.activeElement;
  dialog.hidden = false; requestAnimationFrame(() => dialog.classList.add('is-open'));
  dialog.querySelector('.web-install').focus({preventScroll: true});
  collapseNudge();
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
let popover = null;
function togglePopover() {
  const button = $('infoButton');
  if (popover && !popover.hidden) { closePopover(); return; }
  if (!popover) {
    popover = h('div', {class: 'web-popover', role: 'dialog', 'aria-label': 'How this page works', hidden: true,
      onkeydown: e => { if (e.key === 'Escape') { e.preventDefault(); closePopover(); button.focus(); } }},
      h('strong', {}, 'How this page works'),
      h('p', {}, 'The whole profile travels inside the link. The part after # never reaches a server: your browser decodes it and draws every chapter here. GitHub serves this page and sees only the page request.'),
      h('p', {}, 'Opening a game on the board fetches its moves directly from Chess.com or Lichess.'),
      h('p', {}, h('a', {href: 'https://github.com/T-Julsgaard/Chess-Review', target: '_blank', rel: 'noopener'}, 'Chess Review is open source ↗')));
    document.body.append(popover);
    document.addEventListener('pointerdown', e => { if (popover && !popover.hidden && !popover.contains(e.target) && !button.contains(e.target)) closePopover(); });
  }
  const r = button.getBoundingClientRect();
  Object.assign(popover.style, {top: r.bottom + 10 + 'px', right: Math.max(12, window.innerWidth - r.right) + 'px'});
  popover.hidden = false; button.setAttribute('aria-expanded', 'true');
  popover.querySelector('a').focus({preventScroll: true});
}
function closePopover() { if (popover) popover.hidden = true; $('infoButton').setAttribute('aria-expanded', 'false'); }

/**
 * Under the deck's panel: a small pill that opens the install dialog, which widens into
 * a one-line card once the reader is a few chapters in. It sits in the room below the
 * panel, so it never covers the deck or its Next button.
 */
let nudge = null;
function mountNudge(account) {
  const card = h('div', {class: 'web-nudge-card'},
    h('span', {class: 'web-nudge-mark', html: ICONS.knight}),
    h('div', {class: 'web-nudge-text'}, h('strong', {}, `Enjoying ${account}'s story?`), h('span', {}, 'Build yours from your own Chess.com or Lichess games.')),
    installButton({where: 'nudge'}),
    h('button', {type: 'button', class: 'web-nudge-close', 'aria-label': 'Hide', html: ICONS.close, onclick: () => collapseNudge()}));
  const pill = h('button', {type: 'button', class: 'web-nudge-pill', onclick: () => openInstall(account)},
    h('span', {class: 'web-nudge-mark', html: ICONS.knight}), 'Build your own profile');
  nudge = h('aside', {class: 'web-nudge', 'aria-label': 'Get Chess Review'}, card, pill);
  document.body.append(nudge);
  const shell = document.querySelector('.profile-shell');
  new MutationObserver(positionNudge).observe(shell, {attributes: true, attributeFilter: ['style', 'class']});
  window.addEventListener('resize', positionNudge);
  positionNudge();
}
function positionNudge() {
  const shell = document.querySelector('.profile-shell');
  if (!nudge || !shell) return;
  const r = shell.getBoundingClientRect(), room = window.innerHeight - r.bottom;
  nudge.hidden = shell.classList.contains('profile-stacked') || room < 56;
  Object.assign(nudge.style, {left: r.left + 'px', width: r.width + 'px', top: r.bottom + 12 + 'px'});
}
const seen = new Set();
function onChapter(id) {
  if (!nudge || !id) return;
  seen.add(id);
  let shown = false; try { shown = sessionStorage.getItem(NUDGE_KEY) === 'shown'; } catch {}
  if (shown || (seen.size < 5 && id !== 'share')) return;
  try { sessionStorage.setItem(NUDGE_KEY, 'shown'); } catch {}
  nudge.classList.add('is-open');
}
function collapseNudge() { nudge?.classList.remove('is-open'); }

/* ---------- the extension's Story deck, with the web's last chapter ---------- */
class WebStoryWorkspace extends StoryWorkspace {
  /** A shared link carries the report, not the games, so a time control could only ever show "Not enough games". */
  classFilter() { return null; }
  hero(slide) {
    const hero = super.hero(slide);
    return slide.id === 'share' && !slide.empty ? {...hero, value: 'The whole story at a glance'} : hero;
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
  go(index) { super.go(index); this.o.onChapter?.(this.deck[this.index]?.id); }
}

/* ---------- page ---------- */
function syncInstallLinks() {
  for (const link of document.querySelectorAll('#topInstall')) link.href = primaryStore().href;
  const label = document.querySelector('[data-install-label]');
  if (label) label.textContent = primaryLabel();
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
  // The shutters part once the deck has laid out (a timer, not animation frames: a link opened in a background tab still reveals).
  const startup = $('startup');
  setTimeout(() => { startup.classList.add('opening'); setTimeout(() => startup.remove(), 700); }, 40);
}
/** No profile in the link (or a broken one): the page introduces player profiles instead. */
function showLanding({title, text, error = false}) {
  const landing = $('landing');
  landing.hidden = false; landing.classList.toggle('is-error', error);
  landing.replaceChildren(
    h('span', {class: 'profile-eyebrow'}, error ? 'Shared player profile' : 'Player profile'),
    h('h1', {id: 'landingTitle'}, title),
    h('p', {class: 'web-landing-lead'}, text),
    h('ul', {class: 'web-landing-list'}, ...['Your historical twin, and why', 'Rating journey, openings and rivals', 'Habits by hour, weekday and clock', 'One link to share it all'].map(t => h('li', {}, t))),
    h('div', {class: 'web-share-actions'}, installButton({where: 'landing'}), installButton({cls: 'profile-button web-install web-install-other', store: otherStore(), label: 'Get it for ' + otherStore().name, where: 'landing-other'})),
    h('p', {class: 'web-dialog-foot'}, 'Free and open source · No account, no sign-up'));
  reveal();
}

async function main() {
  syncInstallLinks(); watchExtension();
  $('infoButton').addEventListener('click', togglePopover);
  buildBoard($('board'));
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
  const workspace = new WebStoryWorkspace({
    document, storage: memoryStorage(), storageEvents: null, sendMessage: async () => ({ok: false}),
    stage: $('canvas'), boardWrap: $('boardWrap'), makePiece, flipped: false,
    settings: () => SETTINGS, writeSettings: patch => { Object.assign(SETTINGS, patch); },
    identity: {}, shared: report, toast, icon: name => ICONS[name] || '',
    flag: code => /^[A-Z]{2}$/i.test(code || '') ? h('img', {class: 'avatar avatar-flag', src: asset(`flags/${code.toUpperCase()}.svg`), alt: '', draggable: 'false', onerror: e => e.target.remove()}) : null,
    url: asset, uiScale: scale,
    renderGamePlayer: (side, player, fen) => playerStrip(side, player, fen),
    renderGameEvaluation: (bar, score, flipped) => { bar.className = 'profile-game-eval evalbar eb-' + SETTINGS.barStyle + (flipped ? ' flipped' : ''); },
    createAnalysisEngine: createEngine,
    buildOwn: () => document.body.classList.contains('web-has-extension') ? toast('Open Chess Review and choose Player profile to build your own') : openInstall(account), requestClose: () => {}, remember: () => {}, restoreBoard: () => {}, onClose: () => {},
    onChapter,
  });
  document.body.classList.add('web-has-profile');
  await workspace.open();
  mountNudge(account);
  reveal();
}
main();
window.addEventListener('hashchange', () => location.reload());
