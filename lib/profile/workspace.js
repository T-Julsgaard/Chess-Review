// Player profile — the workspace. The review board stays exactly where it is:
// the review panels fade out in place, one profile panel settles in over their
// footprint and asks whose games to read. Only when the deck is ready does the
// board become the picture, its pieces gliding from the reviewed position into
// each slide. Runs collection and the optional engine job, and shares the result.
// Opening snapshots nothing about the game: the caller restores the review.
import {createProfileStore, JOB_KEY} from './store.js';
import {collectProfile, PERIODS, periodRows, periodStart, periodLabel, customPeriodBounds} from './collector.js';
import {buildInsights, ratings, byClassOrder} from './insights.js';
import {buildDeck, buildReport, fmt} from './deck.js';
import {budgetById, ENGINE_ENTRY_VERSION, DEPTHS, SAMPLES, depthById, estimateMinutes, selectSample} from './engine-sample.js';
import {encodeProfile, profileLink} from './share.js';
import {createProfileBoard} from './board.js';
import {hasPortrait, portraitCredit, PORTRAIT_DELAY} from './portrait.js';
import {reviewSurfaces, fadeOut, fadeIn, boardPieces, glidePieces, motionGroup, EASE, EASE_OUT} from './transition.js';
import {createTourLoader} from './loader.js';
import {createGameMap, gameUrl} from './game-map.js';
import {createGameReel} from './game-reel.js';
import {createPreparation} from './preparation.js';
import {Chess, DEFAULT_POSITION} from '../chess.js';
import {loadProfilePgn} from './pgn-source.js';
import {createProfileGameView} from './game-view.js';
import {filterRows, activeFilters, filterCount, opponentList, toggleExcluded, COLOURS, SHORT_GAME_MOVES} from './filters.js';

export async function deleteProfileData(storage) { return createProfileStore(storage).deleteAll(); }
export async function profileStorageUsage(storage) { return createProfileStore(storage).usage(); }

const STALE_JOB_MS = 3 * 60 * 1000;
/** While an accuracy check runs on its own chapter, the chart redraws at most this often (ms). */
const LIVE_REFRESH_MS = 350;
const REFRESH_MIN_MS = 10 * 60 * 1000;
// A loader that would only flash is never shown; cached profiles open directly.
const LOADER_DELAY_MS = 220;
/** The longest the deck waits for the film roll's last games (it plays them out in about three seconds). */
const REEL_WAIT_MS = 6000;
/** The mate-in-one buttons' icons: a light bulb for Hint, an arrow for Next. */
const HINT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/></svg>';
const NEXT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
export const SITE_NAMES = {chesscom: 'Chess.com', lichess: 'Lichess', both: 'Chess.com and Lichess'};
const SITE_CHOICES = [['chesscom', 'Chess.com'], ['lichess', 'Lichess'], ['both', 'Both']];
const USERNAME = /^[\w-]{2,30}$/;

export class ProfileWorkspace {
  constructor(options) {
    this.o = options;
    this.doc = options.document; this.win = this.doc.defaultView;
    this.store = createProfileStore(options.storage);
    const settings = options.settings(), identity = options.identity || {};
    const known = site => identity.accountsBySite?.[site] || (identity.site === site ? identity.accounts || [] : []);
    const saved = settings.profileAccounts && typeof settings.profileAccounts === 'object' ? settings.profileAccounts : {};
    this.accounts = {chesscom: saved.chesscom || known('chesscom')[0] || '', lichess: saved.lichess || known('lichess')[0] || ''};
    this.site = options.shared?.site || (SITE_NAMES[settings.profileSite] ? settings.profileSite : identity.site || 'chesscom');
    if (options.shared) this.accounts[options.shared.site === 'lichess' ? 'lichess' : 'chesscom'] = options.shared.account;
    this.period = PERIODS.some(p => p.id === settings.profilePeriod) ? settings.profilePeriod : 'year';
    this.customPeriod = {...(settings.profileCustomPeriod || {
      start: new Date(periodStart('year') * 1000).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10),
    })};
    this.budget = settings.profileBudget || 'standard';
    // Time-control filter for the deck ('all' or a class such as 'bullet'), and its own one for the rival chapter.
    this.cls = 'all'; this.rivalCls = 'all'; this.libraryAccuracy = [];
    this.shared = options.shared || null;
    this.rows = []; this.engine = {}; this.deck = []; this.index = 0; this.job = null; this.closed = false; this.loading = null;
    this.phase = 'setup';
    this.motion = () => options.settings().uiAnim !== false && typeof this.win.Element?.prototype.animate === 'function' && !this.win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.h = (tag, attrs = {}, ...children) => {
      const node = this.doc.createElement(tag);
      for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === false) continue;
        if (key === 'class') node.className = value; else if (key === 'html') node.innerHTML = value; else if (key.startsWith('on')) node.addEventListener(key.slice(2), value); else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value); else node.setAttribute(key, value === true ? '' : String(value));
      }
      for (const child of children.flat()) if (child != null && child !== false) node.append(child.nodeType ? child : this.doc.createTextNode(String(child)));
      return node;
    };
  }

  /* ---------- selection ---------- */
  sites() { return this.site === 'both' ? ['chesscom', 'lichess'] : [this.site]; }
  /** The name shown on the deck: one account, or both when they differ. */
  get account() {
    if (this.site !== 'both') return this.accounts[this.site] || '';
    const {chesscom: a, lichess: b} = this.accounts;
    if (!a || !b) return a || b || '';
    return a.toLowerCase() === b.toLowerCase() ? a : `${a} / ${b}`;
  }
  set account(name) {
    if (this.site === 'both') this.accounts = {chesscom: name, lichess: name};
    else this.accounts = {...this.accounts, [this.site]: name};
  }
  selectionKey() { return JSON.stringify([this.site, this.sites().map(site => this.accounts[site]), this.period, this.period === 'custom' ? this.customPeriod : null]); }
  ready() { return this.sites().every(site => USERNAME.test(this.accounts[site] || '')) && (this.period !== 'custom' || !!customPeriodBounds(this.customPeriod)); }
  /** The engine check runs per site; with both, it reads the site you played most on. */
  engineSite() {
    if (this.site !== 'both') return this.site;
    const rows = this.allPeriodRows(), lichess = rows.filter(r => r.site === 'lichess').length;
    return lichess > rows.length - lichess ? 'lichess' : 'chesscom';
  }
  engineAccount() { return this.accounts[this.engineSite()] || ''; }

  /* ---------- lifecycle ---------- */
  async open() {
    const {stage, boardWrap} = this.o;
    // The review board is left untouched until the deck needs the board.
    this.reviewBoard = boardWrap.querySelector('.board');
    this.liveBoard = this.reviewBoard; this.boardEl = null; this.board = null;
    this.boardAnchor = this.doc.createComment('Player profile board');
    this.reviewBoard.before(this.boardAnchor);
    this.inertNodes = [...stage.querySelectorAll('.mod'), this.doc.querySelector('.library-rail')].filter(Boolean).map(node => ({node, inert: node.inert}));
    for (const {node} of this.inertNodes) if (node.dataset?.mod !== 'board') node.inert = true;
    const motion = this.motion();
    // Measure the review surfaces before the profile hides them.
    const surfaces = motion ? reviewSurfaces(this.doc, stage) : [];
    this.shell = this.h('section', {class: 'profile-shell', 'aria-label': 'Player profile', tabindex: '-1', 'data-motion': motion ? 'on' : 'off'});
    this.caption = this.h('div', {class: 'profile-board-caption', 'data-motion': motion ? 'on' : 'off', 'aria-live': 'polite'});
    this.doc.body.append(this.shell, this.caption);
    this.reposition = () => this.positionShell();
    this.win.addEventListener('resize', this.reposition); this.win.addEventListener('scroll', this.reposition, true);
    this.observer = this.win.ResizeObserver ? new this.win.ResizeObserver(this.reposition) : null; this.observer?.observe(stage);
    this.keyHandler = event => this.onKey(event); this.doc.addEventListener('keydown', this.keyHandler);
    this.storageListener = (changes, area) => { if (area === 'local' && changes[JOB_KEY]) this.onJobChange(changes[JOB_KEY].newValue || null); };
    this.o.storageEvents?.addListener?.(this.storageListener);
    this.renderFrame();
    if (this.shared) { this.rows = []; this.report = this.shared; this.deck = this.decorateDeck(buildDeck(this.shared, {account: this.shared.account, site: this.shared.site, periodLabel: this.shared.periodLabel, engineStatus: 'unavailable'})); this.phase = 'deck'; this.renderSlide({animate: false}); }
    else if (!this.restore(this.o.resume?.state)) this.renderSetup({focus: false});
    if (motion) {
      this.surfacesOut = fadeOut(surfaces);
      stage.classList.add('profile-active'); this.doc.body.classList.add('has-profile');
      this.positionShell();
      this.enterMotion = this.enterShell();
    } else {
      stage.classList.add('profile-active'); this.doc.body.classList.add('has-profile');
      this.positionShell();
    }
    this.shell.focus({preventScroll: true});
    if (!this.shared) this.shell.querySelector('.profile-setup [data-autofocus]')?.focus({preventScroll: true});
  }
  /** The panel settles in once the review panels have mostly faded: a short rise, content a beat later. */
  enterShell() {
    const rise = (node, delay, distance = 8, duration = 520) => node.animate([{opacity: 0, translate: `0 ${distance}px`}, {opacity: 1, translate: '0 0'}], {duration, delay, easing: EASE_OUT, fill: 'both'});
    return motionGroup([
      this.shell.animate([{opacity: 0, translate: '0 12px', scale: '.992'}, {opacity: 1, translate: '0 0', scale: '1'}], {duration: 560, delay: 150, easing: EASE_OUT, fill: 'both'}),
      rise(this.head, 240, 6, 480), rise(this.slideHost, 300, 6, 520), rise(this.nav, 360, 4, 480),
      this.caption.animate([{opacity: 0}, {opacity: 1}], {duration: 400, delay: 320, easing: EASE, fill: 'both'}),
    ]);
  }
  /** Return the board to the review: the review squares come back with their own pieces. */
  close() {
    if (this.closed) return this.closing;
    // Leaving the profile keeps the deck being read, so coming back opens it again.
    if (!this.shared) this.o.remember?.(this.snapshot());
    this.closeSettings();
    this.closed = true;
    this.abort?.abort();
    this.win.clearTimeout(this.liveTimer); this.liveTimer = null;
    this.streamPgns?.clear();
    this.win.removeEventListener('resize', this.reposition); this.win.removeEventListener('scroll', this.reposition, true); this.observer?.disconnect();
    this.doc.removeEventListener('keydown', this.keyHandler);
    this.o.storageEvents?.removeListener?.(this.storageListener);
    this.countAnimations?.forEach(a => a.cancel?.());
    this.gameView?.destroy(); this.gameView = null;
    this.reel?.destroy(); this.reel = null; this.leavingReel?.destroy(); this.leavingReel = null;
    this.loader?.stop(); this.win.clearTimeout(this.loaderTimer);
    this.win.clearTimeout(this.mapTimer);
    this.enterMotion?.cancel(); this.surfacesOut?.cancel(); this.glide?.cancel(); this.setupMotion?.cancel();
    const motion = this.motion();
    const before = motion && this.boardEl ? boardPieces(this.boardEl) : null;
    this.board?.clear(); this.boardEl?.classList.remove('profile-board');
    if (this.liveBoard !== this.reviewBoard) this.liveBoard.remove();
    this.boardAnchor.replaceWith(this.reviewBoard); this.boardSurface?.remove();
    for (const {node, inert} of this.inertNodes) node.inert = inert || false;
    this.o.stage.classList.remove('profile-active'); this.doc.body.classList.remove('has-profile');
    const shell = this.shell, caption = this.caption;
    // Release board ownership immediately; a fading shell must never restore
    // an old board over a newly opened workspace.
    this.o.restoreBoard?.(); this.o.onClose?.();
    const finish = () => { shell.remove(); caption.remove(); };
    if (!motion) { finish(); this.closing = Promise.resolve(); return this.closing; }
    shell.inert = true;
    const out = motionGroup([
      shell.animate([{opacity: 1, translate: '0 0'}, {opacity: 0, translate: '0 -6px'}], {duration: 200, easing: EASE, fill: 'both'}),
      caption.animate([{opacity: 1}, {opacity: 0}], {duration: 160, easing: EASE, fill: 'both'}),
    ], finish);
    const back = fadeIn(reviewSurfaces(this.doc, this.o.stage), {delay: 150, duration: 400});
    const board = this.o.boardWrap.querySelector('.board');
    const glide = before && board ? glidePieces(board, before) : motionGroup([]);
    this.closing = Promise.all([out.finished, back.finished, glide.finished]).then(() => {});
    return this.closing;
  }
  /** Height of the review's name strips; game names take the same room, so the board never resizes. */
  stripHeight() {
    const strip = this.doc.querySelector('#playerBot')?.getBoundingClientRect().height;
    return strip > 20 ? strip : 48;
  }
  /**
   * How much larger than at 1920x1080 the review is drawn (1440p, 4K). The panel,
   * the caption under the board and the labels on it grow by the same amount, so
   * the profile reads the same next to the board on every screen.
   */
  uiScale() {
    if (this.win.innerWidth <= 900) return 1;
    const s = Number(this.o.uiScale?.());
    return Number.isFinite(s) && s > 1 ? Math.min(3, s) : 1;
  }
  /** Place a fixed box at its on-screen size: laid out at 1/s and scaled up by s from its top-left corner. */
  placeScaled(node, s, {left, top, width, height}) {
    const box = {left: left + 'px', top: top + 'px', width: width / s + 'px', transform: s === 1 ? '' : `scale(${s})`, transformOrigin: s === 1 ? '' : '0 0'};
    if (height != null) box.height = height / s + 'px';
    Object.assign(node.style, box);
  }
  positionShell() {
    if (this.closed) return;
    const s = this.scale = this.uiScale();
    if (s === 1) this.doc.documentElement.style.removeProperty('--pv-s'); else this.doc.documentElement.style.setProperty('--pv-s', String(s));
    const strip = this.stripHeight();
    const stackedViewport = this.win.innerWidth <= 900;
    const puzzleControls = this.puzzle?.view === this.boardView ? this.puzzle?.controls : null;
    if (puzzleControls && this.gameView) {
      if (stackedViewport && puzzleControls.parentNode !== this.caption) {
        this.gameView.dock();
        this.caption.replaceChildren(puzzleControls);
      } else if (!stackedViewport && !puzzleControls.parentNode?.classList.contains('profile-game-dock')) this.gameView.dock(puzzleControls);
    }
    if (this.gameView && this.liveBoard) this.gameView.position(this.liveBoard.getBoundingClientRect(), {strip});
    const {stage, boardWrap} = this.o;
    if (stackedViewport) {
      // A stacked review can extend well below the viewport. Keep the profile
      // board and a scrollable slide visible together in the available space.
      if (!this.boardSurface) {
        this.boardSurface = this.h('div', {class: 'profile-board-surface'});
        this.doc.body.append(this.boardSurface); this.boardSurface.append(this.liveBoard);
      }
      const named = this.gameView || this.reel;
      const top = Math.max(8, this.doc.querySelector('.topbar')?.getBoundingClientRect().bottom || 0) + (this.gameView ? strip : named ? 60 : 8);
      const available = Math.max(280, this.win.innerHeight - top - 8);
      const captionSpace = this.gameView ? strip + 8 : this.reel ? 104 : this.gameMap ? 40 : 64;
      const size = Math.min(this.win.innerWidth - 24, Math.max(120, (available - captionSpace) * .46));
      Object.assign(this.boardSurface.style, {left: (this.win.innerWidth - size) / 2 + 'px', top: top + 'px', width: size + 'px', height: size + 'px'});
      this.gameView?.position({left: (this.win.innerWidth - size) / 2, top, width: size, height: size}, {strip});
      this.placeScaled(this.caption, 1, {left: 12, top: top + size + (this.gameView ? strip + 4 : named ? 28 : 4), width: this.win.innerWidth - 24});
      const puzzleCaptionHeight = puzzleControls && this.gameView ? this.caption.offsetHeight : 0;
      const panelTop = top + size + captionSpace + puzzleCaptionHeight;
      this.placeScaled(this.shell, 1, {left: 12, top: panelTop, width: this.win.innerWidth - 24, height: Math.max(160, this.win.innerHeight - panelTop - 8)});
      this.shell.classList.add('profile-stacked');
      return;
    }
    // A viewed game keeps the board exactly where the review put it: the names
    // use the review's own strips and the move controls sit in the bottom one.
    if (this.boardSurface) {
      this.boardAnchor.after(this.liveBoard); this.boardSurface.remove(); this.boardSurface = null;
    }
    const mods = [...stage.querySelectorAll('.mod')].filter(mod => !['board', 'evalbar'].includes(mod.dataset.mod) && mod.getBoundingClientRect().width > 1 && this.win.getComputedStyle(mod).display !== 'none');
    const board = boardWrap.getBoundingClientRect();
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const mod of mods) { const r = mod.getBoundingClientRect(); left = Math.min(left, r.left); top = Math.min(top, r.top); right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom); }
    if (!mods.length || right - left < 220) { left = board.right + 16; top = board.top; right = Math.max(left + 360, this.win.innerWidth - 24); bottom = Math.max(board.bottom, top + 480); }
    const stacked = top >= board.bottom - 8 || left < board.left + 8 && right > board.right - 8 && top > board.top;
    // Beside the board, the deck spans the panel columns (the tabs, not the
    // bare controls row or the floating coach) and never rises above or drops
    // below the squares; the player bars sit outside.
    const squares = this.liveBoard.getBoundingClientRect();
    if (!stacked && squares.height > 1) {
      const beside = mods.filter(mod => !['controls', 'coach'].includes(mod.dataset.mod)).map(mod => mod.getBoundingClientRect()).filter(r => r.left >= squares.right);
      if (beside.length) { left = Math.min(...beside.map(r => r.left)); right = Math.max(...beside.map(r => r.right)); }
      top = squares.top; bottom = squares.bottom;
    }
    const width = Math.max(280, right - left), height = Math.max(stacked ? 360 : 240, bottom - top);
    this.placeScaled(this.shell, s, {left, top, width, height: Math.min(height, this.win.innerHeight - top - 8)});
    this.shell.classList.toggle('profile-stacked', stacked);
    if (this.gameView) this.gameView.position(this.liveBoard.getBoundingClientRect(), {strip});
    // The film roll's bottom name sits between the board and the caption.
    this.placeScaled(this.caption, s, {left: this.gameView ? squares.left : board.left, top: (this.gameView ? squares.bottom : board.bottom) + (this.gameView ? strip + 4 : (this.reel ? 30 : 6) * s), width: this.gameView ? squares.width : board.width});
  }
  onKey(event) {
    if (this.closed || event.defaultPrevented) return;
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (target?.closest?.('#settings,[role="dialog"],[role="alertdialog"]')) return;
    const game = this.dismissedGameSlide === this.deck[this.index]?.id ? null : this.activeGame || this.deck[this.index]?.board;
    if (event.key === 'Escape' && this.gameCounter?.isConnected) { event.preventDefault(); this.exitGame(); return; }
    // A viewed game has no start/end buttons; Home and End jump there instead.
    if ((event.key === 'Home' || event.key === 'End') && game?.kind === 'replay' && this.gameCounter?.isConnected) { event.preventDefault(); this.stepGame(event.key === 'End' ? Infinity : -Infinity); return; }
    if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && (game?.kind === 'moves' || game?.kind === 'replay' || this.deck[this.index]?.evidence?.id && ['fen', 'journey'].includes(game?.kind))) {
      event.preventDefault(); this.stepGame(event.key === 'ArrowRight' ? 1 : -1); return;
    }
    if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); this.go(this.index + 1); }
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); this.go(this.index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); this.go(0); }
    else if (event.key === 'End') { event.preventDefault(); this.go(this.deck.length - 1); }
    else if (event.key === 'Escape' && this.shell.contains(target)) { event.preventDefault(); this.o.requestClose?.(); }
  }

  /* ---------- data ---------- */
  /** Forget the current report. The board goes back to the reviewed position. */
  reset() {
    this.closeSettings();
    this.abort?.abort(); this.abort = new AbortController();
    this.setupMotion?.cancel();
    this.refreshing = false;
    this.win.clearTimeout(this.mapTimer); this.mapTimer = null; this.preparation = null; this.preparing = false; this.loadProgress = null;
    this.collectionDone = false; this.reelDone = false; this.analysisProgress = null; this.collectText = null; this.streamPgns = new Map();
    this.loader?.stop(); this.loader = null; this.win.clearTimeout(this.loaderTimer);
    this.rows = []; this.engine = {}; this.job = null; this.report = null; this.deck = []; this.engineBlock = null;
    this.dismissedGameSlide = null;
    this.boardSpecKey = null; this.boardView = (this.boardView || 0) + 1;
    this.caption.replaceChildren(); this.nav.replaceChildren();
    this.unmountBoard();
    return this.abort.signal;
  }
  /** The built deck as it stands, or null when no deck is open (setup, loading, an error). */
  snapshot() {
    if (this.phase !== 'deck' || !this.report || !this.deck.length) return null;
    return {key: this.selectionKey(), at: Date.now(), slideId: this.deck[this.index]?.id || null, cls: this.cls, rivalCls: this.rivalCls, ratingClass: this.ratingClass,
      rows: this.rows, engine: this.engine, libraryAccuracy: this.libraryAccuracy, job: this.job, knownGames: this.knownGames};
  }
  /**
   * Open straight into a remembered deck on the chapter it was left on, without
   * fetching or the loader. Older than the refresh window it loads again (still
   * landing on that chapter); for another player, site or period it is dropped.
   */
  restore(state) {
    if (!state || this.shared) return false;
    if (state.key !== this.selectionKey()) { this.resumeSlide = null; return false; }
    if (!(Date.now() - state.at < REFRESH_MIN_MS)) { this.resumeSlide = state.slideId; return false; }
    const signal = this.reset();
    Object.assign(this, {rows: state.rows, engine: {...state.engine}, libraryAccuracy: state.libraryAccuracy, job: state.job, ratingClass: state.ratingClass, knownGames: state.knownGames, rivalCls: state.rivalCls || 'all', cls: 'all'});
    this.collectionDone = true; this.reelDone = true; this.resumeSlide = null; this.restored = true;
    this.phase = 'deck'; this.renderHead();
    // rebuild() keeps the chapter it finds at the current index; the full deck comes first, then its time-control filter.
    this.deck = state.slideId ? [{id: state.slideId}] : []; this.index = 0;
    this.rebuild();
    if (state.cls && state.cls !== 'all') { this.cls = state.cls; this.rebuild(); }
    // Accuracy checked while the profile was closed joins in quietly.
    const known = Object.keys(this.engine).length, before = this.engine;
    Promise.all([this.loadEngine(signal), this.store.loadJob()]).then(([, job]) => {
      if (signal.aborted || this.closed) return;
      this.engine = {...before, ...this.engine}; this.job = job;
      if (Object.keys(this.engine).length !== known) this.rebuild(); else this.renderEngineBlock();
    }).catch(() => {});
    return true;
  }
  /** Players read before, other than the one showing, for the Compare menu. Names keep the casing they were typed with. */
  async comparablePlayers() {
    const known = new Map();
    const identity = this.o.identity || {};
    for (const site of ['chesscom', 'lichess']) for (const name of [this.accounts[site], this.o.settings().profileAccounts?.[site], ...(identity.accountsBySite?.[site] || [])]) if (name) known.set(`${site}:${name.toLowerCase()}`, name);
    const showing = new Set(this.sites().map(site => `${site}:${(this.accounts[site] || '').toLowerCase()}`));
    let list = [];
    try { list = await this.store.listAccounts(); } catch {}
    return list.filter(entry => SITE_NAMES[entry.site] && USERNAME.test(entry.account) && !showing.has(`${entry.site}:${entry.account}`))
      .map(entry => ({...entry, name: known.get(`${entry.site}:${entry.account}`) || entry.account}));
  }
  /**
   * Show another player's saved games in place of these, on the same chapter.
   * Nothing is fetched: the deck is rebuilt from what was read before, in place,
   * the way a new time control is: figures count to their new values, columns
   * and dots grow or shrink from where they stand and the mosaic reshapes.
   * `accounts` (with site 'both') switches to a profile of both sites.
   */
  async switchPlayer({site, account, name = account, accounts = null}) {
    if (this.closed || this.shared || this.phase !== 'deck' || !SITE_NAMES[site]) return false;
    const sites = site === 'both' ? ['chesscom', 'lichess'] : [site];
    const nextAccounts = accounts ? {...this.accounts, ...accounts} : {...this.accounts, [site]: name};
    if (!sites.every(s => nextAccounts[s])) return false;
    const parts = await Promise.all(sites.map(s => this.store.loadRows(s, nextAccounts[s])));
    if (this.closed || this.phase !== 'deck') return false;
    const rows = mergeSites(parts, sites);
    if (!rows.length) { this.o.toast?.(`No saved games for ${name || sites.map(s => nextAccounts[s]).join(' / ')}.`); return false; }
    this.abort?.abort(); this.abort = new AbortController();
    const signal = this.abort.signal, slideId = this.deck[this.index]?.id, cls = this.cls, rivalCls = this.rivalCls || 'all';
    this.streamPgns?.clear(); this.win.clearTimeout(this.mapTimer); this.mapTimer = null;
    this.site = site; this.accounts = nextAccounts; this.rows = rows; this.engine = {};
    try {
      await Promise.all([this.loadLibraryAccuracy(), this.loadEngine(signal), this.store.loadJob().then(job => { if (!signal.aborted) this.job = job; })]);
    } catch {}
    if (signal.aborted || this.closed) return false;
    this.dismissedGameSlide = null; this.openingPick = null; this.rivalCls = 'all'; this.linkedGame = null;
    this.collectionDone = true; this.reelDone = true;
    this.renderHead();
    // rebuild() keeps the chapter found at the current index; the time-control filter follows when the new player has it.
    // The full deck is built first without drawing (the chapters and their "not enough games" stand-ins come from it),
    // then the deck for the time control on screen is drawn once. The board redraws even when the chapter's picture
    // looks the same (another player's chart).
    this.cls = 'all'; this.deck = slideId ? [{id: slideId}] : []; this.index = 0; this.boardSpecKey = null;
    this.quietRebuild = true; try { this.rebuild(); } finally { this.quietRebuild = false; }
    if (cls !== 'all' && this.report?.classOptions?.includes(cls)) this.cls = cls;
    // The rival chapter has its own time-control filter: it stays when the new player's rival has games in it.
    const rival = this.deck.find(slide => slide.id === 'rival')?.rival;
    if (rivalCls !== 'all' && rival?.byClass?.[rivalCls]) this.rivalCls = rivalCls;
    this.rebuild();
    this.updateGameMap({reshape: true});
    return true;
  }
  async load({force = false} = {}) {
    if (this.closed) return;
    const signal = this.reset();
    if (!this.ready()) { this.renderSetup(); return; }
    this.phase = 'loading'; this.renderHead();
    this.renderLoading(signal);
    const key = this.selectionKey();
    try {
      const sites = this.sites();
      const parts = await Promise.all(sites.map(site => this.store.loadRows(site, this.accounts[site])));
      if (signal.aborted || key !== this.selectionKey()) return;
      this.rows = mergeSites(parts, sites);
      await this.loadLibraryAccuracy();
      if (signal.aborted || key !== this.selectionKey()) return;
      this.beginPreparation(signal);
      this.updateGameMap();
      this.preparation.notify();
      const since = periodStart(this.period, new Date(), this.customPeriod);
      const stale = force || parts.some(part => part.complete === false || !(part.updatedAt && Date.now() - part.updatedAt < REFRESH_MIN_MS && since >= (part.since || 0)));
      if (stale || !this.rows.length) await this.refresh(signal);
      else await this.finishPreparation(signal);
    } catch (error) {
      if (signal.aborted) return;
      this.renderError(error);
    }
  }
  async refresh(signal = this.abort?.signal) {
    const since = periodStart(this.period, new Date(), this.customPeriod), sites = this.sites(), key = this.selectionKey();
    this.refreshing = true;
    try {
      const parts = [];
      const streamed = new Map(this.rows.map(row => [`${row.site}:${row.id}`, row]));
      for (const [n, site] of sites.entries()) {
        parts.push(await collectProfile({site, account: this.accounts[site], since, store: this.store, signal,
          onRows: rows => {
            if (signal?.aborted || this.closed) return;
            for (const row of rows) streamed.set(`${site}:${row.id}`, {...row, site});
            this.rows = [...streamed.values()];
            this.preparation?.notify();
            if (!this.mapTimer) this.mapTimer = this.win.setTimeout(() => { this.mapTimer = null; if (!signal?.aborted) this.updateGameMap(); }, 100);
          },
          onProgress: info => { if (!signal?.aborted && !this.closed) this.onCollectProgress(info, {site, n, of: sites.length, before: parts.reduce((sum, p) => sum + p.rows.length, 0)}); }}));
        if (signal?.aborted) return;
      }
      if (signal?.aborted || key !== this.selectionKey()) return;
      this.rows = mergeSites(parts, sites);
      this.updateGameMap({final: true});
      await this.finishPreparation(signal);
    } catch (error) {
      if (signal?.aborted) return;
      this.renderError(error);
    } finally { if (signal === this.abort?.signal) this.refreshing = false; }
  }
  beginPreparation(signal) {
    this.preparing = true; this.collectStarted = Date.now(); this.collectFraction = null;
    // Loading never runs the engine: the accuracy check is started from its own chapter.
    const {depth, sample} = this.accuracySettings(), workers = Math.max(1, Math.min(4, Number(this.o.settings().engineWorkers) || 1));
    const speed = this.o.settings().profileEngineSpeed?.[depth.depth];
    this.preparation = createPreparation({store: this.store, sendMessage: this.o.sendMessage, sites: this.sites(), accounts: {...this.accounts},
      rows: () => this.allPeriodRows(), settings: {depth, sample, off: true, workers, ms: speed || depth.ms}, library: this.libraryAccuracy.map(p => p.id), pgns: this.streamPgns, signal,
      onProgress: info => { if (!signal.aborted && !this.closed) {
        this.analysisProgress = info; this.updateLoadingProgress();
        const job = info.job;
        if (job?.status === 'done' && job.perGameMs && this.speedJob !== job.id) {
          this.speedJob = job.id;
          this.o.writeSettings?.({profileEngineSpeed: {...this.o.settings().profileEngineSpeed, [job.depth]: job.perGameMs * (job.workers || 1)}});
        }
      } }});
  }
  async finishPreparation(signal) {
    this.collectionDone = true; this.updateLoadingProgress();
    // Every game is in: the film roll plays out what it has, then makes way for the mosaic.
    this.reel?.finish();
    const result = await this.preparation.finish();
    if (signal?.aborted || this.closed) return;
    await this.loadEngine(signal);
    if (signal?.aborted || this.closed) return;
    Object.assign(this.engine, result.entries);
    this.streamPgns.clear();
    this.job = await this.store.loadJob();
    if (signal?.aborted || this.closed) return;
    this.preparing = false;
    if (result.failed) this.o.toast?.(`${fmt.plural(result.failed, 'game')} could not be checked. The profile includes the available results.`);
    await this.loader?.finish();
    // The film roll plays its last games before the deck takes the board, so its count reaches the total.
    await this.reelPlayed();
    if (!signal?.aborted && !this.closed) { this.reveal(); this.setStatus(null); }
  }
  updateLoadingProgress() {
    const analysis = this.analysisProgress;
    const fraction = this.collectionDone ? 1 : this.collectFraction;
    const elapsed = Date.now() - this.collectStarted;
    // Archive fractions are measured work; Lichess has no total until EOF.
    const fetchingMs = !this.collectionDone && fraction > 0 ? elapsed * (1 - fraction) / fraction : null;
    const etaMs = this.collectionDone ? analysis?.etaMs : fetchingMs == null ? null : Math.max(fetchingMs, analysis?.etaMs || 0);
    const checked = analysis?.done || 0;
    const text = analysis?.waiting ? 'Waiting for the accuracy engine…' : this.collectionDone ? (analysis?.remaining ? `Checking accuracy · ${fmt.int(checked)} checked` : 'Finishing your profile…') : `${this.collectText || 'Finding your games…'}${checked ? ` · ${fmt.int(checked)} checked` : ''}`;
    const engineFraction = analysis ? (analysis.done + analysis.remaining ? analysis.done / (analysis.done + analysis.remaining) : 1) : 0;
    this.loadProgress = {text, games: this.periodRows().length, fraction: fraction == null ? null : Math.min(.99, fraction * .45 + engineFraction * .55), etaMs};
    this.loader?.update(this.loadProgress);
  }
  onCollectProgress(info, {site, n, of, before}) {
    const where = of > 1 ? SITE_NAMES[site] + ': ' : '';
    let text = null, fraction = null;
    if (info.phase === 'archives') text = `${where}Looking up the archive…`;
    else if (info.phase === 'month') {
      fraction = info.total ? info.done / info.total : null;
      text = site === 'lichess' ? `${where}Reading your games…` : `${where}Reading month ${fmt.int(info.done)} of ${fmt.int(info.total)}…`;
    } else if (info.phase === 'replay') text = `${where}Replaying your games…`;
    else if (info.phase === 'done') { fraction = 1; }
    const overall = fraction == null ? null : (n + fraction) / of;
    if (this.phase === 'deck') { this.setStatus(text, overall); return; }
    if (info.phase !== 'replay') this.collectFraction = overall;
    if (text) this.collectText = text;
    this.updateLoadingProgress();
  }
  /** Every game of the period, before the header's gear narrows them. */
  allPeriodRows() { return periodRows(this.rows, this.period, new Date(), this.customPeriod); }
  /** The accounts on screen, by site: whose left-out players apply. */
  filterAccounts() { return Object.fromEntries(this.sites().map(site => [site, this.accounts[site] || ''])); }
  /** The period's games that count: the gear's colour, rated, short-game and left-out-player choices applied. */
  periodRows() { return filterRows(this.allPeriodRows(), this.o.settings(), this.filterAccounts()); }
  /** The period's rows narrowed to the chosen time control. */
  deckRows() { const rows = this.periodRows(); return this.cls === 'all' ? rows : rows.filter(r => r.cls === this.cls); }
  /**
   * Accuracy of the player's own reviewed games in the library: full reviews,
   * so they count without another engine pass. Matched by username.
   */
  async loadLibraryAccuracy() {
    this.libraryAccuracy = [];
    let library = [];
    try { library = (await this.o.storage?.get?.('library'))?.library || []; } catch {}
    if (!Array.isArray(library) || !library.length) return;
    const names = new Set(this.sites().map(site => (this.accounts[site] || '').toLowerCase()).filter(Boolean));
    const when = rec => { const m = /^(\d{4})[.-](\d{2})[.-](\d{2})/.exec(rec.date || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) / 1000 : rec.meta?.endTime || (rec.savedAt ? Math.floor(rec.savedAt / 1000) : null); };
    this.libraryAccuracy = library.filter(rec => rec && Number.isFinite(rec.myAcc) && names.has(String(rec.myName || '').toLowerCase()))
      .map(rec => ({id: String(rec.meta?.gameId || rec.id), t: when(rec), acc: rec.myAcc})).filter(p => p.t);
  }
  /** Library points inside the chosen period. */
  libraryPoints() {
    const start = periodStart(this.period, new Date(), this.customPeriod), end = this.period === 'custom' ? (customPeriodBounds(this.customPeriod)?.end ?? Infinity) : Infinity;
    return this.libraryAccuracy.filter(p => p.t >= (start || 0) && p.t < end);
  }
  async loadEngine(signal = this.abort?.signal) {
    const key = this.selectionKey(), rows = this.allPeriodRows();
    const parts = await Promise.all(this.sites().map(site => this.store.loadEngine(site, rows.filter(r => (r.site || site) === site).map(r => r.id))));
    if (this.closed || signal?.aborted || key !== this.selectionKey()) return;
    this.engine = Object.fromEntries(parts.flatMap(entries => Object.entries(entries)).filter(([, e]) => e?.v === ENGINE_ENTRY_VERSION && e.acc != null));
  }
  /** Depth and game selection for the accuracy check: picked in its chapter, remembered in Settings. */
  accuracySettings() {
    const s = this.o.settings(), pick = this.engineChoice || {};
    return {depth: depthById(pick.depth || s.profileDepth), sample: SAMPLES.find(x => x.id === (pick.sample || s.profileSample)) || SAMPLES[0]};
  }
  /** The games a check with `sample` would look at: the engine site's games in the period, minus those already checked or reviewed. */
  engineCandidates(sample) {
    const site = this.engineSite(), rows = this.periodRows().filter(r => (r.site || site) === site);
    const cached = new Set([...Object.keys(this.engine), ...this.libraryPoints().map(p => p.id)]);
    return selectSample(rows, {every: sample.every, games: Infinity, cached});
  }
  /** How many games a check takes and roughly how long, from this computer's measured speed when known. */
  engineEstimate() {
    const {depth, sample} = this.accuracySettings(), s = this.o.settings();
    const workers = Math.max(1, Math.min(4, Number(s.engineWorkers) || 1)), measured = s.profileEngineSpeed?.[depth.depth], ms = measured || depth.ms;
    const ids = this.engineCandidates(sample);
    return {ids, games: ids.length, minutes: estimateMinutes(ids.length, ms, {workers, every: sample.every}), measured: !!measured, workers, depth, sample};
  }
  /** Start the accuracy check in the background. The chart fills in as games finish; the rest of the profile stays usable. */
  async startEngine() {
    if (this.engineStarting || this.shared || this.closed || this.phase !== 'deck') return false;
    const {ids, workers, depth, sample} = this.engineEstimate();
    if (!ids.length) { this.renderEngineBlock(); return false; }
    const site = this.engineSite(), account = this.engineAccount(), source = new Map(this.allPeriodRows().filter(r => (r.site || site) === site).map(r => [r.id, r]));
    const job = {id: `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`, site, account, depth: depth.depth, budget: sample.id,
      deadlineMs: null, workers, rows: ids.map(id => { const r = source.get(id); return {id: r.id, t: r.t, me: r.me}; })};
    this.o.writeSettings?.({profileDepth: depth.id, profileSample: sample.id});
    this.engineStarting = true; this.renderEngineBlock();
    let result;
    try { result = await this.o.sendMessage({type: 'profileEngine', action: 'start', job}); } catch (error) { result = {ok: false, reason: error?.message}; }
    this.engineStarting = false;
    if (this.closed) return false;
    if (!result?.ok) {
      this.o.toast?.(result?.reason === 'busy' ? 'The engine is busy with another accuracy check. Try again when it finishes.' : 'The accuracy check could not start. Try again.');
      this.renderEngineBlock(); return false;
    }
    // Shown as running at once; the host's own progress replaces this as soon as it is saved.
    const now = Date.now();
    if (this.job?.id !== job.id) this.job = {id: job.id, status: 'running', site, account, depth: job.depth, budget: job.budget, deadlineMs: job.deadlineMs, total: ids.length, done: 0, failed: 0, startedAt: now, updatedAt: now, perGameMs: null, workers};
    this.renderEngineBlock();
    return true;
  }
  engineStatus() {
    const job = this.job;
    if (job && job.site === this.engineSite() && job.account?.toLowerCase() === this.engineAccount().toLowerCase()) {
      if (job.status === 'running') return Date.now() - (job.updatedAt || 0) > STALE_JOB_MS ? 'stale' : 'running';
      if (job.status === 'done' && Object.keys(this.engine).length) return 'done';
    }
    return Object.keys(this.engine).length ? 'partial' : 'idle';
  }
  /** First appearance of the deck: the loader steps aside and the board takes the cover. */
  reveal() {
    if (this.closed) return;
    this.loader?.stop(); this.loader = null; this.win.clearTimeout(this.loaderTimer);
    this.phase = 'deck'; this.renderHead();
    this.rebuild();
  }
  rebuild() {
    if (this.closed) return;
    const slideId = this.deck[this.index]?.id;
    const rows = this.periodRows();
    const label = periodLabel(this.period, this.customPeriod);
    const all = rows;
    (this.knownGames ||= {})[this.selectionKey()] = this.allPeriodRows().filter(r => !r.bot && r.n >= 10).length;
    const deckRows = this.deckRows();
    const insights = buildInsights(deckRows, {engine: this.engine, includeBots: !!this.o.settings().profileIncludeBots, library: this.libraryPoints().filter(p => this.cls === 'all' || deckRows.some(r => r.id === p.id))});
    // Ratings are not comparable across sites; with both, the journey's figures follow the site played most
    // and the other site's rating is drawn as a second line beside it (otherRatings).
    const ratingSite = this.site === 'both' ? this.engineSite() : null;
    const siteRatings = site => ratings(rows.filter(r => (!site || r.site === site) && (this.o.settings().profileIncludeBots || !r.bot)));
    insights.ratings = siteRatings(ratingSite);
    this.report = buildReport(rows, insights, {account: this.account, site: this.site, period: this.period, periodLabel: label, country: this.o.identity?.country || null});
    if (ratingSite) {
      this.report.ratingSite = ratingSite;
      const otherSite = ratingSite === 'lichess' ? 'chesscom' : 'lichess', other = siteRatings(otherSite);
      if (Object.keys(other).length) { this.report.otherRatingSite = otherSite; this.report.otherRatings = other; }
    }
    // The time controls the filter offers come from the whole period, so the choice never shrinks itself.
    const counts = {};
    for (const r of all) if (this.o.settings().profileIncludeBots || !r.bot) counts[r.cls] = (counts[r.cls] || 0) + 1;
    this.report.classOptions = byClassOrder(Object.entries(counts).filter(([cls, n]) => n >= 5 && cls !== 'unknown').map(([cls]) => cls));
    this.report.cls = this.cls;
    const budget = budgetById(this.budget);
    this.deck = this.decorateDeck(buildDeck(this.report, {account: this.account, site: this.site, periodLabel: label, country: this.report.country, engineStatus: this.engineStatus(),
      ratingClass: this.ratingClass, engineBudgetLabel: `The ${budget.label.toLowerCase()} check looks at about ${budget.games} ${this.site === 'both' ? SITE_NAMES[this.engineSite()] + ' ' : ''}games and takes roughly ${budget.minutes} minutes.`}));
    const next = this.deck.findIndex(slide => slide.id === slideId);
    this.index = next >= 0 ? next : Math.max(0, Math.min(this.index, this.deck.length - 1));
    // A quiet rebuild only prepares the deck; the caller draws it after one more step (switchPlayer).
    if (this.quietRebuild) return;
    this.renderSlide({animate: !slideId, preserveScroll: !!slideId});
    this.markSettings();
  }
  /** Designs (lib/profile/designs) may add, drop or reorder slides; the classic deck is used as built. */
  decorateDeck(deck) { return deck; }
  async onJobChange(job) {
    if (this.closed || this.shared) return;
    if (this.preparing) return; // The preparation queue owns progress until the deck is ready.
    const signal = this.abort?.signal;
    this.job = job;
    const mine = job && job.site === this.engineSite() && job.account?.toLowerCase() === this.engineAccount().toLowerCase();
    if (!mine) { this.renderEngineBlock(); return; }
    if (job.status === 'done' && job.perGameMs && job.depth) {
      // Remember how fast this computer is, so the setup can estimate the next run.
      const speed = {...(this.o.settings().profileEngineSpeed || {}), [job.depth]: job.perGameMs * (job.workers || 1)};
      this.o.writeSettings?.({profileEngineSpeed: speed});
    }
    const finished = job.status === 'done' || job.status === 'cancelled' || job.status === 'error';
    if (finished) { this.win.clearTimeout(this.liveTimer); this.liveTimer = null; }
    if (finished || (job.done && job.done % 10 === 0)) { await this.loadEngine(signal); if (!signal?.aborted && this.report) this.rebuild(); }
    // On the accuracy chapter the chart follows every game, a few times a second at most.
    else if (job.status === 'running' && this.deck[this.index]?.id === 'trend') { this.renderEngineBlock(); this.scheduleLiveRefresh(); }
    else this.renderEngineBlock();
  }
  /** Reload the checked games and redraw, at most every LIVE_REFRESH_MS while a check runs. */
  scheduleLiveRefresh() {
    if (this.liveTimer) return;
    const wait = Math.max(0, (this.liveAt || 0) + LIVE_REFRESH_MS - Date.now());
    this.liveTimer = this.win.setTimeout(async () => {
      this.liveTimer = null; this.liveAt = Date.now();
      const signal = this.abort?.signal;
      if (this.closed || this.engineStatus() !== 'running' || this.deck[this.index]?.id !== 'trend') return;
      await this.loadEngine(signal);
      if (!signal?.aborted && !this.closed && this.report && this.engineStatus() === 'running') this.rebuild();
    }, wait);
  }
  async cancelEngine() { try { await this.o.sendMessage({type: 'profileEngine', action: 'cancel', id: this.job?.id}); } catch {} }

  /* ---------- frame ---------- */
  renderFrame() {
    const {h} = this;
    this.statusBar = h('div', {class: 'profile-status', hidden: true}, h('div', {class: 'profile-status-bar'}, h('i')), h('span', {class: 'profile-status-text'}));
    this.head = h('header', {class: 'profile-head'});
    this.slideHost = h('div', {class: 'profile-slide-host'});
    this.nav = h('nav', {class: 'profile-nav', 'aria-label': 'Slides'});
    this.shell.append(this.head, this.statusBar, this.slideHost, this.nav);
    this.renderHead();
  }
  renderHead() {
    const {h} = this;
    this.head.replaceChildren();
    if (this.shared) {
      this.head.append(h('div', {class: 'profile-head-main'}, h('span', {class: 'profile-eyebrow'}, 'Shared player profile'), h('strong', {}, `${this.shared.account} · ${this.shared.periodLabel || ''}`)),
        h('button', {type: 'button', class: 'profile-button', onclick: () => this.o.buildOwn?.()}, 'Build your own'));
      return;
    }
    if (this.phase === 'setup') {
      this.head.append(h('div', {class: 'profile-head-main'}, h('span', {class: 'profile-eyebrow'}, 'Player profile'), h('strong', {class: 'profile-head-title'}, 'Your games, one story')));
      return;
    }
    const label = periodLabel(this.period, this.customPeriod);
    const actions = h('div', {class: 'profile-head-actions'});
    this.closeSettings(); this.settingsGear = null;
    if (this.phase === 'deck') actions.append(this.settingsButton(),
      h('button', {type: 'button', class: 'profile-button ghost profile-edit', title: 'Change player, site or period', onclick: () => this.renderSetup()}, h('span', {class: 'profile-button-icon', html: this.o.icon('gear')}), 'Change'));
    this.head.append(h('div', {class: 'profile-head-main'}, h('span', {class: 'profile-eyebrow'}, 'Player profile'),
      h('strong', {class: 'profile-head-title'}, this.account), h('span', {class: 'profile-head-meta'}, `${label} · ${SITE_NAMES[this.site]}`)), actions);
    this.markSettings();
  }

  /* ---------- the gear: which games count (filters.js) ---------- */
  /** The header's gear. A dot marks it while any choice leaves games out. */
  settingsButton() {
    const button = this.h('button', {type: 'button', class: 'pv-settings', title: 'Choose which games count', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
      html: this.o.icon('gear'), onclick: () => this.toggleSettings(button)});
    this.settingsGear = button;
    return button;
  }
  /** Brings the gear's dot and its label up to date; the open menu itself says how many games are left out. */
  markSettings() {
    const count = filterCount(activeFilters(this.o.settings(), this.filterAccounts()));
    const left = count ? this.allPeriodRows().length - this.periodRows().length : 0;
    if (this.settingsGear) {
      this.settingsGear.classList.toggle('active', count > 0);
      this.settingsGear.setAttribute('aria-label', count ? `Settings: ${fmt.plural(left, 'game')} left out` : 'Settings');
    }
  }
  /**
   * Writes one choice, redraws the deck on the same chapter and keeps the menu
   * open. The mosaic on the cover follows: squares that leave shrink away and the
   * rest glide to their new places, oldest still first.
   */
  applySettings(patch) {
    this.o.writeSettings?.(patch);
    if (this.phase === 'deck' && this.report && !this.shared) { this.rebuild(); this.updateGameMap({reshape: true}); }
    this.markSettings();
    this.fillSettings();
  }
  toggleSettings(button) {
    if (this.settingsMenu) { this.closeSettings({focus: true}); return; }
    const menu = this.h('div', {class: 'pv-settings-menu', role: 'dialog', 'aria-label': 'Which games count', tabindex: '-1'});
    const outside = event => { if (!menu.contains(event.target) && !button.contains(event.target)) this.closeSettings(); };
    this.doc.addEventListener('pointerdown', outside, true);
    menu.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); this.closeSettings({focus: true}); } });
    menu.addEventListener('focusout', event => { const to = event.relatedTarget; if (to && !menu.contains(to) && !button.contains(to)) this.closeSettings(); });
    this.settingsMenu = {menu, button, query: '', release: () => this.doc.removeEventListener('pointerdown', outside, true)};
    button.setAttribute('aria-expanded', 'true'); button.classList.add('on');
    button.parentNode.append(menu);
    this.fillSettings();
    if (this.motion()) menu.animate([{opacity: 0, transform: 'translateY(-4px) scale(.98)'}, {opacity: 1, transform: 'none'}], {duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)'});
    (menu.querySelector('[data-focus]') || menu).focus({preventScroll: true});
  }
  closeSettings({focus = false} = {}) {
    const open = this.settingsMenu; if (!open) return;
    this.settingsMenu = null; open.release();
    open.button.setAttribute('aria-expanded', 'false'); open.button.classList.remove('on');
    open.menu.remove();
    if (focus && open.button.isConnected) open.button.focus({preventScroll: true});
  }
  /** The menu: colour, three switches, the players left out and a search for more. Redrawn after each choice, focus kept. */
  fillSettings() {
    const open = this.settingsMenu; if (!open || this.closed) return;
    const {h} = this, s = this.o.settings(), f = activeFilters(s, this.filterAccounts());
    const active = open.menu.contains(this.doc.activeElement) ? this.doc.activeElement : null, focused = active?.dataset.focus || null;
    // Where the focused control stood among the menu's controls, for when it leaves (a player left out or brought back).
    const place = active ? [...open.menu.querySelectorAll('[data-focus]')].indexOf(active) : -1;
    const write = patch => this.applySettings(patch);
    const head = text => h('span', {class: 'pv-compare-head', 'aria-hidden': 'true'}, text);
    const toggle = (key, label, hint) => {
      const on = !!s[key];
      return h('button', {type: 'button', role: 'switch', class: 'pv-set-switch', 'aria-checked': String(on), 'data-focus': key, title: hint, onclick: () => write({[key]: !on})},
        h('span', {class: 'pv-set-label'}, label), h('span', {class: 'pv-set-track', 'aria-hidden': 'true'}, h('span', {class: 'pv-set-thumb'})));
    };
    const colour = h('div', {class: 'pv-set-row'}, h('span', {class: 'pv-set-label', id: 'pv-set-colour'}, 'Colour'),
      h('div', {class: 'pv-set-seg', role: 'radiogroup', 'aria-labelledby': 'pv-set-colour'}, ...COLOURS.map(([id, label]) =>
        h('button', {type: 'button', role: 'radio', class: f.colour === id ? 'on' : '', 'aria-checked': String(f.colour === id), 'data-focus': 'colour-' + id,
          onclick: () => { if (f.colour !== id) write({profileColor: id}); }}, label))));
    // Players left out: a chip each, clicked to bring them back.
    const opponents = opponentList(this.allPeriodRows().filter(r => s.profileIncludeBots || !r.bot));
    const named = new Map(opponents.map(o => [`${o.site}:${o.key}`, o]));
    const both = this.site === 'both';
    const chips = Object.entries(f.excluded).flatMap(([site, set]) => [...set].map(key => {
      const name = named.get(`${site}:${key}`)?.name || key;
      return h('button', {type: 'button', class: 'pv-set-chip', 'data-focus': `chip-${site}:${key}`, title: `Count your games against ${name} again`, 'aria-label': `Bring back ${name}`,
        onclick: () => write(toggleExcluded(this.o.settings(), site, this.accounts[site], key, false))}, h('span', {}, name), h('i', {'aria-hidden': 'true'}, '×'));
    }));
    const search = h('input', {type: 'search', class: 'pv-set-search', placeholder: 'Find an opponent', 'aria-label': 'Find an opponent to leave out', 'data-focus': 'search', autocomplete: 'off', spellcheck: 'false'});
    search.value = open.query;
    const list = h('div', {class: 'pv-set-opps', role: 'group', 'aria-label': 'Opponents to leave out'});
    const drawList = () => {
      const q = open.query.trim().toLowerCase();
      const shown = opponents.filter(o => !f.excluded[o.site]?.has(o.key) && (!q || o.key.includes(q))).slice(0, q ? 20 : 5);
      list.replaceChildren(...(shown.length ? shown.map(o => h('button', {type: 'button', class: 'pv-set-opp', 'data-focus': `opp-${o.site}:${o.key}`, title: `Leave out your games against ${o.name}`,
        onclick: () => write(toggleExcluded(this.o.settings(), o.site, this.accounts[o.site], o.key, true))},
        h('strong', {}, o.name), h('small', {}, (both ? SITE_NAMES[o.site] + ' · ' : '') + fmt.plural(o.games, 'game')), h('i', {'aria-hidden': 'true'}, 'Leave out')))
        : [h('p', {class: 'pv-compare-empty'}, q ? 'No opponent by that name in this period.' : 'No opponents in this period.')]));
    };
    search.addEventListener('input', () => { open.query = search.value; drawList(); });
    drawList();
    const total = this.allPeriodRows().length, kept = this.periodRows().length, count = filterCount(f);
    // Reset clears the gear's choices for the accounts on screen; other accounts keep theirs.
    const reset = () => {
      let next = this.o.settings();
      for (const [site, set] of Object.entries(f.excluded)) for (const key of set) next = {...next, ...toggleExcluded(next, site, this.accounts[site], key, false)};
      write({profileColor: 'all', profileRatedOnly: false, profileSkipShort: false, profileExcludedOpponents: next.profileExcludedOpponents || {}});
    };
    open.menu.replaceChildren(...[
      // How many games the choices leave out sits on the heading's line, at its right.
      h('div', {class: 'pv-set-top'}, head('Games to count'),
        count ? h('p', {class: 'pv-set-note', role: 'status'}, `${fmt.plural(total - kept, 'game')} left out`) : null),
      colour,
      toggle('profileRatedOnly', 'Rated games only', 'Leave out casual and unrated games'),
      toggle('profileSkipShort', `Skip games under ${SHORT_GAME_MOVES} moves`, 'Leave out games that ended almost at once: abandoned, early resignations, disconnects'),
      toggle('profileIncludeBots', 'Count games against bots', 'Include computer opponents where the site marks them'),
      head('Leave out players'),
      chips.length ? h('div', {class: 'pv-set-chips'}, ...chips) : null,
      search, list,
      h('div', {class: 'pv-set-foot'}, h('span', {}, count ? `${fmt.int(kept)} of ${fmt.plural(total, 'game')} count` : `All ${fmt.plural(total, 'game')} count`),
        count ? h('button', {type: 'button', class: 'pv-set-reset', 'data-focus': 'reset', onclick: reset}, 'Reset') : null),
    ].filter(Boolean));
    const controls = [...open.menu.querySelectorAll('[data-focus]')];
    const target = focused && controls.find(node => node.dataset.focus === focused);
    if (target) { target.focus({preventScroll: true}); if (target === search) search.setSelectionRange(search.value.length, search.value.length); }
    // The pressed chip or row is gone: the next control of the same kind takes the focus (the next
    // player in the list), else the menu itself. Never the search field, which would put a caret in it.
    else if (focused) {
      const kind = focused.replace(/-.*/, ''), same = controls.filter(node => node.dataset.focus.startsWith(kind + '-'));
      (same.find(node => controls.indexOf(node) >= place) || same.at(-1) || open.menu).focus({preventScroll: true});
    }
  }
  /** Thin status line for background refreshes while a deck is already showing. */
  setStatus(text, fraction = null) {
    if (this.closed) return;
    this.statusBar.hidden = !text || this.phase !== 'deck';
    if (!text || this.phase !== 'deck') return;
    this.statusBar.querySelector('.profile-status-text').textContent = text;
    const bar = this.statusBar.querySelector('.profile-status-bar i');
    bar.style.width = fraction == null ? '' : Math.round(100 * fraction) + '%';
    this.statusBar.classList.toggle('indeterminate', fraction == null);
  }
  renderLoading(signal) {
    // Saved profiles usually open before the loader would have been seen.
    this.slideHost.replaceChildren(this.h('div', {class: 'profile-loader-wait', 'aria-busy': 'true'}));
    this.statusBar.hidden = true;
    this.loaderTimer = this.win.setTimeout(() => {
      if (signal.aborted || this.closed || this.phase !== 'loading' || this.loader) return;
      this.loader = createTourLoader({h: this.h, win: this.win, makePiece: this.o.makePiece, motion: this.motion, onCancel: () => this.renderSetup()});
      this.slideHost.replaceChildren(this.loader.element);
      this.loader.update(this.loadProgress || {});
    }, LOADER_DELAY_MS);
  }
  /** Glide stable fields from their current positions as optional sections open or close. */
  moveSetup(change) {
    const nodes = () => [...this.slideHost.querySelectorAll('[data-setup-layout]')].filter(node => !node.hidden && !node.closest('[hidden]'));
    const before = this.motion() ? new Map(nodes().map(node => [node, node.getBoundingClientRect()])) : null;
    // Capture the current visual positions before releasing an interrupted move.
    this.setupMotion?.cancel();
    change();
    if (!before) return;
    const animations = [];
    for (const node of nodes()) {
      const after = node.getBoundingClientRect(), previous = before.get(node);
      if (!after.width || !after.height) continue;
      // Rects are on screen; the panel is laid out at 1/scale.
      const k = this.scale || 1, dx = previous ? (previous.left - after.left) / k : 0, dy = previous ? (previous.top - after.top) / k : 8;
      if (previous && Math.abs(dx) < .5 && Math.abs(dy) < .5) continue;
      animations.push(node.animate([
        {translate: `${dx}px ${dy}px`, opacity: previous ? 1 : 0},
        {translate: '0 0', opacity: 1},
      ], {duration: 360, easing: EASE_OUT}));
    }
    this.setupMotion = motionGroup(animations);
  }
  /** Whose games, which sites and how far back. Nothing is fetched until the player asks. */
  renderSetup({focus = true} = {}) {
    if (this.closed) return;
    this.setupMotion?.cancel();
    if (this.phase !== 'setup' || this.deck.length || this.loader) this.reset();
    this.phase = 'setup'; this.statusBar.hidden = true;
    this.renderHead();
    const {h} = this, identity = this.o.identity || {};
    const error = h('p', {class: 'profile-setup-error', role: 'alert', hidden: true});
    const segment = (label, choices, current, pick) => h('div', {class: 'profile-field', 'data-setup-layout': true}, h('span', {class: 'profile-field-label'}, label),
      h('div', {class: 'profile-seg profile-seg-lg', role: 'radiogroup', 'aria-label': label}, ...choices.map(([id, text]) =>
        h('button', {type: 'button', role: 'radio', class: id === current ? 'on' : '', 'aria-checked': String(id === current), onclick: event => {
          for (const button of event.currentTarget.parentNode.children) { const selected = button === event.currentTarget; button.classList.toggle('on', selected); button.setAttribute('aria-checked', String(selected)); }
          pick(id);
        }}, text))));
    const inputs = {}, fields = {};
    // Earlier usernames open as suggestions under the box when it is clicked, or as you type.
    const field = site => {
      if (fields[site]) return fields[site];
      const known = [...new Set([...(identity.accountsBySite?.[site] || []), this.accounts[site]].filter(Boolean))].slice(0, 6);
      const listId = `profile-suggest-${site}`;
      const input = inputs[site] = h('input', {type: 'text', class: 'profile-input', value: this.accounts[site] || '', placeholder: `${SITE_NAMES[site]} username`,
        autocomplete: 'off', spellcheck: 'false', 'aria-label': `${SITE_NAMES[site]} username`, maxlength: '30', 'data-autofocus': true,
        ...(known.length ? {role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': listId} : {})});
      const list = h('ul', {id: listId, class: 'profile-suggest', role: 'listbox', 'aria-label': `Earlier ${SITE_NAMES[site]} usernames`, hidden: true});
      let shown = [], active = -1;
      const highlight = index => {
        active = index;
        [...list.children].forEach((option, i) => { option.classList.toggle('on', i === index); option.setAttribute('aria-selected', String(i === index)); });
        if (index >= 0) input.setAttribute('aria-activedescendant', `${listId}-${index}`); else input.removeAttribute('aria-activedescendant');
      };
      const close = () => { if (list.hidden) return; list.hidden = true; input.setAttribute('aria-expanded', 'false'); highlight(-1); };
      const choose = name => { input.value = name; input.dispatchEvent(new this.win.Event('input')); close(); };
      const open = ({all = false} = {}) => {
        const typed = input.value.trim().toLowerCase();
        shown = all || !typed ? known : known.filter(name => name.toLowerCase().includes(typed));
        if (!shown.length || (!all && shown.length === 1 && shown[0].toLowerCase() === typed)) { close(); return; }
        list.replaceChildren(...shown.map((name, i) => h('li', {id: `${listId}-${i}`, role: 'option', class: 'profile-suggest-option', 'aria-selected': 'false',
          onmousedown: e => e.preventDefault(), onclick: () => choose(name)}, name)));
        list.hidden = false; input.setAttribute('aria-expanded', 'true');
        highlight(shown.findIndex(name => name.toLowerCase() === typed));
      };
      input.addEventListener('input', () => {
        this.accounts = {...this.accounts, [site]: input.value.trim()}; input.classList.remove('invalid'); error.hidden = true;
        if (known.length && this.doc.activeElement === input) open();
      });
      input.addEventListener('click', () => { if (known.length) open({all: true}); });
      input.addEventListener('blur', close);
      input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          if (!known.length) return;
          e.preventDefault();
          if (list.hidden) { open({all: true}); return; }
          const last = shown.length - 1;
          highlight(e.key === 'ArrowDown' ? (active >= last ? 0 : active + 1) : (active <= 0 ? last : active - 1));
        } else if (e.key === 'Escape' && !list.hidden) { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          if (!list.hidden && active >= 0) choose(shown[active]); else { close(); build(); }
        }
      });
      // A div, not a label: a click on a suggestion must not bounce back to the input and reopen the list.
      input.id = `profile-account-${site}`;
      return fields[site] = h('div', {class: 'profile-field profile-account-field', 'data-site': site}, h('label', {class: 'profile-field-label', for: input.id}, `${SITE_NAMES[site]} username`),
        h('div', {class: 'profile-input-wrap'}, input, list));
    };
    const today = new Date().toISOString().slice(0, 10), dates = {};
    const custom = h('div', {id: 'profile-custom-period', class: 'profile-custom-period', hidden: this.period !== 'custom', 'data-setup-layout': true},
      ...[['start', 'From'], ['end', 'To']].map(([key, label]) => {
        const input = dates[key] = h('input', {type: 'date', class: 'profile-input', value: this.customPeriod[key] || '', max: today, 'aria-label': label});
        input.addEventListener('input', () => {
          this.customPeriod = {...this.customPeriod, [key]: input.value};
          for (const date of Object.values(dates)) { date.classList.remove('invalid'); date.removeAttribute('aria-invalid'); }
          error.hidden = true;
        });
        return h('label', {class: 'profile-field'}, h('span', {class: 'profile-field-label'}, label), input);
      }), h('p', {class: 'profile-period-note'}, 'Include games from both dates.'));
    // Bot games are counted or not from the gear's menu in the deck (profileIncludeBots), not here.
    // The accuracy check is started from the accuracy over time chapter, not here.
    const build = () => {
      const missing = this.sites().find(site => !USERNAME.test(this.accounts[site] || ''));
      if (missing) {
        inputs[missing]?.classList.add('invalid'); inputs[missing]?.focus();
        error.textContent = this.accounts[missing] ? `That doesn't look like a ${SITE_NAMES[missing]} username.` : `Enter a ${SITE_NAMES[missing]} username.`;
        error.hidden = false; return;
      }
      if (this.period === 'custom' && (!customPeriodBounds(this.customPeriod) || this.customPeriod.end > today)) {
        const key = !this.customPeriod.start ? 'start' : 'end';
        dates[key].classList.add('invalid'); dates[key].setAttribute('aria-invalid', 'true'); dates[key].focus();
        error.textContent = !this.customPeriod.start || !this.customPeriod.end ? 'Choose a start and end date.'
          : this.customPeriod.start > this.customPeriod.end ? 'The end date must be on or after the start date.'
          : 'Choose valid dates on or before today.';
        error.hidden = false; return;
      }
      this.o.writeSettings?.({profilePeriod: this.period, profileCustomPeriod: {...this.customPeriod}, profileSite: this.site, profileAccounts: {...this.accounts}});
      this.cls = 'all'; this.rivalCls = 'all';
      this.index = 0; this.load();
    };
    // One box, or Chess.com and Lichess side by side: the row keeps its height, so nothing below it moves.
    const accountFields = h('div', {class: 'profile-account-fields', 'data-setup-layout': true, 'data-both': this.site === 'both'}, ...this.sites().map(field));
    const showSites = () => {
      const next = this.sites().map(field), was = [...accountFields.children];
      const rects = new Map(was.map(node => [node, node.getBoundingClientRect()]));
      accountFields.toggleAttribute('data-both', next.length > 1);
      accountFields.replaceChildren(...next);
      // Drop an unfinished move first, or it would hold a box at its old place while we measure the new one.
      for (const node of next) node.getAnimations?.().forEach(a => a.cancel());
      if (!this.motion()) return;
      // A box that was already there glides and resizes to its new place (Lichess moving over for
      // Chess.com, or widening when it is alone again). A box taking another's place keeps that
      // box's frame and crossfades its label; a box that is new slides in beside the others.
      const kept = next.some(node => rects.has(node));
      next.forEach((node, i) => {
        const now = node.getBoundingClientRect(), from = rects.get(node) || (!kept && i === 0 ? rects.get(was[0]) : null);
        if (!from) { node.animate([{opacity: 0, translate: '-12px 0'}, {opacity: 1, translate: '0 0'}], {duration: 340, delay: 110, easing: EASE_OUT, fill: 'backwards'}); return; }
        const k = this.scale || 1, dx = (from.left - now.left) / k;
        if (Math.abs(dx) > .5 || Math.abs(from.width - now.width) > .5) node.animate([{translate: `${dx}px 0`, width: `${from.width / k}px`}, {translate: '0 0', width: `${now.width / k}px`}], {duration: 380, easing: EASE_OUT});
        if (!rects.has(node)) node.querySelector('.profile-field-label').animate([{opacity: .15}, {opacity: 1}], {duration: 240, easing: EASE});
      });
    };
    /**
     * The custom dates fold open and shut: the box grows from nothing (and its gap with it) so
     * everything below moves with it, in step. Picking again mid-way turns the same motion around.
     */
    let customMotion = null, customOpen = this.period === 'custom';
    const settle = () => { customMotion?.cancel(); customMotion = null; custom.hidden = !customOpen; custom.style.removeProperty('overflow'); };
    const foldCustom = open => {
      customOpen = open;
      if (customMotion) { customMotion.reverse(); return; }
      if (!this.motion() || typeof custom.animate !== 'function' || custom.hidden === !open) { settle(); return; }
      custom.hidden = false;
      const style = this.win.getComputedStyle(custom), gap = this.win.getComputedStyle(custom.parentNode).rowGap || '0px';
      const shut = {height: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', marginTop: `-${gap}`, opacity: 0};
      const full = {height: style.height, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, borderTopWidth: style.borderTopWidth, borderBottomWidth: style.borderBottomWidth, marginTop: '0px', opacity: 1};
      custom.style.overflow = 'hidden';
      const motion = customMotion = custom.animate([shut, full], {duration: 320, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'both'});
      if (!open) motion.reverse();
      motion.onfinish = () => { if (customMotion === motion) settle(); };
      // A hidden tab may never advance the timeline: the box still ends up where it belongs.
      this.win.setTimeout(() => { if (customMotion === motion) settle(); }, 1200);
    };
    const periods = segment('Period', PERIODS.map(p => [p.id, p.label]), this.period, id => {
      const was = this.period === 'custom';
      this.period = id; error.hidden = true;
      customButton.setAttribute('aria-expanded', String(id === 'custom'));
      if (was !== (id === 'custom')) foldCustom(id === 'custom');
    });
    const customButton = periods.querySelector('button:last-child');
    customButton.setAttribute('aria-controls', custom.id); customButton.setAttribute('aria-expanded', String(this.period === 'custom'));
    this.slideHost.replaceChildren(h('form', {class: 'profile-setup', novalidate: true, onsubmit: e => { e.preventDefault(); build(); }},
      h('div', {class: 'profile-setup-intro', 'data-setup-layout': true}, h('h2', {class: 'profile-setup-title'}, 'Build a player profile'),
        h('p', {class: 'profile-lead'}, 'A short story of your games, told on the board. Choose whose games to read and how far back to go.')),
      segment('Site', SITE_CHOICES, this.site, id => { if (id !== this.site) this.moveSetup(() => { this.site = id; showSites(); error.hidden = true; }); }),
      accountFields,
      periods, custom,
      error,
      h('div', {class: 'profile-setup-actions', 'data-setup-layout': true}, h('button', {type: 'submit', class: 'profile-button primary profile-build'}, 'Build profile', h('span', {class: 'profile-button-arrow', 'aria-hidden': 'true'}, '→')))));
    if (focus) {
      const first = this.sites().map(site => inputs[site]).find(input => !USERNAME.test(input.value)) || this.slideHost.querySelector('.profile-build');
      first?.focus({preventScroll: true});
    }
  }
  renderChooser() { this.renderSetup(); }
  renderError(error) {
    if (this.closed) return;
    this.abort?.abort(); this.preparing = false;
    this.streamPgns?.clear();
    const {h} = this;
    this.loader?.stop(); this.loader = null; this.win.clearTimeout(this.loaderTimer);
    this.phase = 'error'; this.renderHead();
    this.unmountBoard();
    this.caption.replaceChildren(); this.engineBlock = null;
    this.deck = []; this.nav.replaceChildren(); this.statusBar.hidden = true;
    this.slideHost.replaceChildren(h('div', {class: 'profile-empty'}, h('h2', {}, 'Could not load this profile'), h('p', {}, error?.message || String(error)),
      h('div', {class: 'profile-chooser-row'}, h('button', {type: 'button', class: 'profile-button primary', onclick: () => this.load()}, 'Try again'), h('button', {type: 'button', class: 'profile-button', onclick: () => this.renderSetup()}, 'Change player'))));
  }

  /* ---------- slides ---------- */
  go(index) {
    if (!this.deck.length) return;
    const next = Math.max(0, Math.min(this.deck.length - 1, index));
    if (next === this.index) return;
    this.dismissedGameSlide = null;
    this.direction = next > this.index ? 1 : -1;
    this.index = next; this.renderSlide();
  }
  renderSlide({animate = true, preserveScroll = false} = {}) {
    if (this.closed || !this.deck.length) return;
    const {h} = this;
    if (this.deck[this.index].id === 'rating' && this.report) this.deck[this.index] = buildDeck(this.report, {site: this.site, ratingClass: this.ratingClass}).find(slide => slide.id === 'rating');
    const slide = this.deck[this.index];
    const scrollTop = this.slideHost.scrollTop;
    this.countAnimations?.forEach(a => a.cancel?.()); this.countAnimations = [];
    const article = h('article', {class: 'profile-slide', 'data-animate': animate ? 'on' : 'off', 'data-slide': slide.id, 'data-direction': this.direction > 0 ? 'next' : 'prev'});
    const heading = h('div', {class: 'profile-section-heading'}, h('h2', {class: 'profile-section-title'}, slide.eyebrow));
    article.append(heading);
    if (slide.ratingChoices) heading.append(h('div', {class: 'profile-seg profile-rating-modes', role: 'group', 'aria-label': 'Rating game mode'}, ...slide.ratingChoices.map(choice =>
      h('button', {type: 'button', class: choice.id === slide.ratingClass ? 'on' : '', 'aria-pressed': String(choice.id === slide.ratingClass), onclick: () => { this.ratingClass = choice.id; this.renderSlide({animate: false, preserveScroll: true}); this.slideHost.querySelector(`.profile-rating-modes button.on`)?.focus({preventScroll: true}); }}, choice.label))));
    const title = h('h3', {class: 'profile-title'}, slide.title);
    if (slide.id === 'cover' && slide.country) { const flag = this.o.flag?.(slide.country); if (flag) title.prepend(flag); }
    article.append(title, h('p', {class: 'profile-lead'}, slide.lead));
    if (slide.stats?.length) article.append(h('div', {class: 'profile-stats'}, ...slide.stats.map(stat => h('div', {class: 'profile-stat' + (stat.tone ? ' tone-' + stat.tone : '')},
      h('strong', {class: 'profile-stat-value', 'data-value': stat.value}, stat.value), h('span', {class: 'profile-stat-label'}, stat.label), stat.sub ? h('span', {class: 'profile-stat-sub'}, stat.sub) : null))));
    if (slide.series) article.append(this.renderSeries(slide.series));
    if (slide.openings) article.append(this.renderOpenings(slide.openings));
    if (slide.twin) article.append(h('div', {class: 'profile-twin'}, h('span', {class: 'profile-twin-era'}, slide.twin.era), h('span', {class: 'profile-twin-runner'}, `Runner-up: ${slide.twin.runnerUp}, ${slide.twin.runnerUpTagline.toLowerCase()}.`)));
    if (slide.bullets?.length) article.append(h('ul', {class: 'profile-bullets'}, ...slide.bullets.map(text => h('li', {}, text))));
    if (slide.engineLine) article.append(h('p', {class: 'profile-engine-line'}, slide.engineLine));
    if (slide.pending === 'engine' || slide.id === 'trend') { this.engineBlock = h('div', {class: 'profile-engine'}); article.append(this.engineBlock); }
    else this.engineBlock = null;
    if (slide.id === 'share') article.append(this.renderShare());
    const evidence = this.evidenceLink(slide, 'profile-evidence'); if (evidence) article.append(evidence);
    const also = this.alsoEvidenceLink(slide, 'profile-evidence'); if (also) article.append(also);
    this.slideHost.replaceChildren(article);
    this.renderEngineBlock();
    this.renderNav();
    const boardKey = JSON.stringify([slide.id, slide.board, slide.id === 'share' ? this.report : null]);
    if (boardKey !== this.boardSpecKey) { this.boardSpecKey = boardKey; this.showBoard(slide.board); }
    if (animate) this.countUp(article);
    this.slideHost.scrollTop = preserveScroll ? scrollTop : 0;
  }
  renderNav() {
    const {h} = this;
    this.nav.replaceChildren(
      h('button', {type: 'button', class: 'profile-nav-button', 'aria-label': 'Previous slide', disabled: this.index === 0, onclick: () => this.go(this.index - 1)}, h('span', {html: this.o.icon('prev')})),
      h('div', {class: 'profile-dots', role: 'tablist'}, ...this.deck.map((slide, i) => h('button', {type: 'button', role: 'tab', class: 'profile-dot' + (i === this.index ? ' on' : ''), 'aria-selected': String(i === this.index), 'aria-label': slide.eyebrow, title: slide.eyebrow, onclick: () => this.go(i)}))),
      h('span', {class: 'profile-counter'}, `${this.index + 1} / ${this.deck.length}`),
      h('button', {type: 'button', class: 'profile-nav-button', 'aria-label': 'Next slide', disabled: this.index === this.deck.length - 1, onclick: () => this.go(this.index + 1)}, h('span', {html: this.o.icon('next')})));
  }
  renderSeries(series) {
    const {h} = this, entries = Object.entries(series).filter(([, s]) => s.length > 1);
    if (!entries.length) return h('div');
    const ns = 'http://www.w3.org/2000/svg';
    const node = (tag, attrs, text) => { const el = this.doc.createElementNS(ns, tag); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); if (text != null) el.textContent = text; return el; };
    const svg = node('svg', {viewBox: '0 0 480 178', class: 'profile-series', role: 'img', tabindex: '0', 'aria-label': 'Rating over time. Hover or use left and right arrows to inspect points.'});
    const all = entries.flatMap(([, s]) => s.map(p => p.r)), low = Math.min(...all), high = Math.max(...all);
    const pad = Math.max(10, (high - low) * .12), min = Math.floor((low - pad) / 10) * 10, max = Math.ceil((high + pad) / 10) * 10;
    const t0 = Math.min(...entries.flatMap(([, s]) => s.map(p => p.t))), t1 = Math.max(...entries.flatMap(([, s]) => s.map(p => p.t)));
    const x = t => 42 + 426 * (t1 > t0 ? (t - t0) / (t1 - t0) : .5), y = r => 140 - 122 * (r - min) / (max - min);
    for (let i = 0; i <= 3; i++) {
      const value = Math.round(min + (max - min) * i / 3), at = y(value);
      svg.append(node('line', {x1: 42, x2: 468, y1: at, y2: at, class: 'profile-series-grid'}), node('text', {x: 35, y: at + 4, 'text-anchor': 'end', class: 'profile-series-label'}, value));
    }
    entries.forEach(([cls, s], i) => {
      const d = s.map((p, j) => (j ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.r).toFixed(1)).join(' ');
      svg.append(node('path', {d: `${d} L${x(s.at(-1).t)} 140 L${x(s[0].t)} 140 Z`, class: 'profile-series-area'}), node('path', {d, class: 'profile-series-line series-' + i, 'data-class': cls}));
    });
    svg.append(node('text', {x: 42, y: 164, class: 'profile-series-label'}, fmt.shortDate(t0)), node('text', {x: 468, y: 164, 'text-anchor': 'end', class: 'profile-series-label'}, fmt.shortDate(t1)));
    const guide = node('line', {y1: 14, y2: 140, class: 'profile-series-guide', visibility: 'hidden'}), dot = node('circle', {r: 4.5, class: 'profile-series-point', visibility: 'hidden'});
    svg.append(guide, dot);
    const points = entries.flatMap(([cls, s]) => s.map(p => ({...p, cls}))).sort((a, b) => a.t - b.t);
    const detail = h('output', {class: 'profile-series-detail', 'aria-live': 'polite'}, 'Hover over the chart to see a date and rating.');
    let selected = points.length - 1;
    const inspect = index => {
      selected = Math.max(0, Math.min(points.length - 1, index)); const p = points[selected];
      guide.setAttribute('x1', x(p.t)); guide.setAttribute('x2', x(p.t)); guide.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', x(p.t)); dot.setAttribute('cy', y(p.r)); dot.setAttribute('visibility', 'visible');
      detail.textContent = `${fmt.date(p.t)} · ${p.cls[0].toUpperCase() + p.cls.slice(1)} · ${p.r} rating`;
    };
    svg.addEventListener('pointermove', event => {
      const rect = svg.getBoundingClientRect(), px = (event.clientX - rect.left) / rect.width * 480;
      let closest = 0;
      for (let i = 1; i < points.length; i++) if (Math.abs(x(points[i].t) - px) < Math.abs(x(points[closest].t) - px)) closest = i;
      inspect(closest);
    });
    svg.addEventListener('focus', () => inspect(selected));
    svg.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); inspect(event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1)); } });
    return h('div', {class: 'profile-series-wrap'}, svg, detail);
  }
  renderOpenings(openings) {
    const {h} = this;
    const column = (label, list) => h('div', {class: 'profile-openings-col'}, h('span', {class: 'profile-openings-head'}, label), ...(list.length ? list.map(o => h('div', {class: 'profile-opening'},
      h('span', {class: 'profile-opening-name'}, o.name), h('span', {class: 'profile-opening-meta'}, `${o.games} · ${fmt.pct(o.winRate)}`), h('i', {class: 'profile-opening-bar', style: {'--win': (o.winRate || 0) + '%'}}))) : [h('p', {class: 'profile-muted'}, 'No games.')]));
    return h('div', {class: 'profile-openings'}, column('As White', openings.w), column('As Black', openings.b));
  }
  /**
   * The accuracy check, in the accuracy over time chapter: choose a depth and
   * which games, read how long it will take, and start it. While it runs, its
   * progress and a Stop button take the place of the choices.
   */
  renderEngineBlock() {
    if (!this.engineBlock || this.closed || this.shared) return;
    const {h} = this, status = this.engineStatus(), job = this.job;
    const block = this.engineBlock, focused = block.contains(this.doc.activeElement) ? this.doc.activeElement.dataset.engine : null;
    block.replaceChildren();
    if (status === 'running' || this.engineStarting) {
      const done = job?.done || 0, total = job?.total || 0, perGame = job?.perGameMs;
      const elapsed = job?.startedAt ? Date.now() - job.startedAt : 0;
      let left = perGame && total ? (total - done) * perGame : null;
      // An older time-capped check stops at its deadline, so its bar follows the clock as well as the games.
      if (job?.deadlineMs) left = Math.min(left ?? Infinity, Math.max(0, job.deadlineMs - elapsed));
      const fraction = Math.min(1, Math.max(total ? done / total : 0, job?.deadlineMs ? elapsed / job.deadlineMs : 0));
      const leftText = left == null || !Number.isFinite(left) ? null : left < 60000 ? 'under a minute left' : `about ${fmt.plural(Math.round(left / 60000), 'minute')} left`;
      block.append(h('div', {class: 'profile-engine-progress'}, h('div', {class: 'profile-status-bar'}, h('i', {style: {width: Math.round(100 * fraction) + '%'}})),
        h('span', {}, this.engineStarting ? 'Starting the accuracy check…' : `Checking accuracy: ${fmt.int(done)} of ${fmt.int(total)} games`,
          !this.engineStarting && leftText ? [' · ', h('b', {class: 'profile-engine-time'}, leftText)] : null),
        h('span', {class: 'profile-engine-note'}, 'Runs in the background. The chart fills in as games finish.')),
        h('div', {class: 'profile-engine-row'}, h('button', {type: 'button', class: 'profile-button ghost', 'data-engine': 'stop', onclick: () => this.cancelEngine()}, 'Stop')));
      if (focused) block.querySelector(`[data-engine="${focused}"]`)?.focus({preventScroll: true});
      return;
    }
    const estimate = this.engineEstimate(), {depth, sample} = estimate, checked = Object.keys(this.engine).length;
    const choose = (key, id) => { this.engineChoice = {depth: depth.id, sample: sample.id, [key]: id}; this.renderEngineBlock(); };
    // Choices are [id, text, tooltip]; the depth buttons name the engine depth they search to.
    const field = (key, label, choices, current) => h('div', {class: 'profile-engine-field'}, h('span', {class: 'profile-field-label'}, label),
      h('div', {class: 'profile-seg', role: 'radiogroup', 'aria-label': label}, ...choices.map(([id, text, tip]) =>
        h('button', {type: 'button', role: 'radio', class: id === current ? 'on' : '', 'aria-checked': String(id === current), 'data-engine': `${key}:${id}`, title: tip || null,
          onclick: () => { if (id !== current) choose(key, id); }}, text))));
    // "12 min", "1 h 20 min": short enough to read at a glance beside the button.
    const time = minutes => { const m = Math.round(minutes); return minutes < 1 ? 'Under 1 min' : m < 60 ? `About ${m} min` : `About ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`; };
    // The estimate sits right of the button: what it takes, and for how many games. Games already checked are skipped without saying so.
    const estimateNode = !estimate.ids.length
      ? h('span', {class: 'profile-engine-estimate is-note', 'aria-live': 'polite'}, checked ? 'Every game this choice would look at is already checked. Pick more games to check more.' : 'No games to check in this period yet.')
      : h('span', {class: 'profile-engine-estimate', 'aria-live': 'polite', title: estimate.measured ? 'Measured on this computer' : null},
        h('small', {class: 'profile-engine-estimate-label'}, 'Estimated time'),
        h('span', {class: 'profile-engine-estimate-value'}, h('b', {class: 'profile-engine-time'}, time(estimate.minutes)), ` · ${fmt.plural(estimate.games, 'game')}`));
    block.append(field('depth', 'Depth', DEPTHS.map(d => [d.id, d.label, `Depth ${d.depth}`]), depth.id),
      field('sample', 'Games to check', SAMPLES.map(s => [s.id, s.label]), sample.id),
      h('div', {class: 'profile-engine-row profile-engine-go'},
        h('button', {type: 'button', class: 'profile-button primary', 'data-engine': 'start', disabled: !estimate.ids.length, onclick: () => this.startEngine()}, checked ? 'Check more games' : 'Check accuracy'),
        estimateNode));
    if (focused) block.querySelector(`[data-engine="${focused}"]`)?.focus({preventScroll: true});
  }
  renderShare() {
    const {h} = this;
    const linkButton = h('button', {type: 'button', class: 'profile-button primary', onclick: () => this.copyLink(linkButton)}, 'Copy share link');
    return h('div', {class: 'profile-share'}, h('div', {class: 'profile-chooser-row'}, linkButton));
  }
  async copyLink(button) {
    if (!this.report) return;
    try {
      const encoded = await encodeProfile(this.report);
      await this.win.navigator.clipboard.writeText(profileLink(encoded));
      this.o.toast?.('Share link copied', button);
    } catch { this.o.toast?.('Could not copy the link'); }
  }
  /* ---------- board ---------- */
  isGameMapView() { return !this.shared && (this.phase === 'loading' || this.deck[this.index]?.id === 'cover'); }
  /**
   * While loading, the film roll replaces the mosaic when chosen in Settings (it
   * needs motion). Once every game has been found and played, the mosaic takes
   * over while the accuracy check finishes.
   */
  useReel() { return this.phase === 'loading' && !this.reelDone && this.o.settings().profileStream === 'film' && this.motion(); }
  /** The film roll has played every game: hand the board to the mosaic. */
  reelFinished() {
    if (this.closed || this.reelDone) return;
    this.reelDone = true;
    // The profile is ready and was only waiting for the reel: the deck takes the board, with no mosaic in between.
    const waiting = this.reelWaiters; this.reelWaiters = null;
    if (waiting?.length) { waiting.forEach(resolve => resolve()); return; }
    this.updateGameMap({final: true});
  }
  /** Resolves once the film roll has played every game: at once without one, and after REEL_WAIT_MS at the latest (a hidden tab never draws). */
  reelPlayed() {
    if (!this.reel || this.reelDone || !this.reel.element.isConnected) return Promise.resolve();
    return new Promise(resolve => {
      (this.reelWaiters ||= []).push(resolve);
      this.win.setTimeout(resolve, REEL_WAIT_MS);
    });
  }
  /**
   * The film roll fades out over the mosaic. Its strip leaves the caption (the
   * mosaic's legend takes it) and fades where it stood; the layout eases to
   * the mosaic's smaller caption instead of jumping.
   */
  retireReel(reel) {
    this.leavingReel?.destroy(); this.leavingReel = reel;
    if (this.motion() && reel.caption.isConnected) {
      const r = reel.caption.getBoundingClientRect();
      Object.assign(reel.caption.style, {position: 'fixed', zIndex: '54', pointerEvents: 'none'});
      this.placeScaled(reel.caption, this.scale || 1, {left: r.left, top: r.top, width: r.width});
      this.doc.body.append(reel.caption);
      this.easeLayout();
    }
    reel.leave();
  }
  /** Let the board, its caption and the deck glide to their next positions for a moment. */
  easeLayout(ms = 600) {
    const nodes = [this.boardSurface, this.caption, this.shell].filter(Boolean);
    for (const node of nodes) node.classList.add('profile-layout-easing');
    this.win.clearTimeout(this.easeTimer);
    this.easeTimer = this.win.setTimeout(() => { for (const node of nodes) node.classList.remove('profile-layout-easing'); }, ms);
  }
  updateGameMap(options) {
    if (!this.isGameMapView() || this.closed || this.activeGame || this.shared) return;
    if (this.useReel()) {
      if (!this.reel || !this.reel.element.isConnected) this.showBoard({kind: 'reel'}); else this.reel.update(this.periodRows());
      return;
    }
    if (!this.gameMap || !this.gameMap.element.isConnected) this.showBoard({kind: 'games'});
    else this.gameMap.update(this.periodRows(), options);
  }
  /** The moves of a profile game, fetched from the site's cache or archive. */
  async gameMoves(ev) {
    const row = this.rows.find(row => row.id === ev.id && (!ev.url || row.url === ev.url)) || ev;
    let lichessUrl = false;
    try { const url = new URL(ev.url); lichessUrl = url.protocol === 'https:' && ['lichess.org', 'www.lichess.org'].includes(url.hostname); } catch {}
    const site = row.site || (lichessUrl ? 'lichess' : 'chesscom');
    const account = this.shared ? this.account.split(' / ')[site === 'lichess' ? 1 : 0] || this.account : this.accounts[site];
    const pgn = await (this.o.loadPgn || loadProfilePgn)(site, row, this.abort?.signal, account);
    if (!pgn) throw Error('No moves available');
    const chess = new Chess(); chess.loadPgn(pgn);
    return {moves: chess.history(), startFen: chess.getHeaders().FEN || null, headers: chess.getHeaders()};
  }
  evidenceLink(slide, cls = 'pv-link') {
    if (slide.board?.kind === 'puzzle') {
      const list = slide.board.puzzles;
      const puzzle = this.puzzle?.list === list ? this.puzzle.p : list[this.unsolvedFrom(list, 0)];
      const url = gameUrl(puzzle);
      return this.h('a', {class: cls + ' profile-button profile-open-puzzle-game', href: url, hidden: !url, target: '_blank', rel: 'noopener noreferrer'}, 'Open game');
    }
    if (!slide.evidence?.url) return null;
    // Greatest hits and Comebacks already play this game on the board: the link
    // only comes back after the player exits it.
    const playing = slide.board?.kind === 'replay' && slide.board.id === slide.evidence.id;
    if (playing && this.dismissedGameSlide !== slide.id) return null;
    const label = (slide.evidence.label || 'View game').replace(/^Open\b/, 'View');
    // The arrow keys then step through the game; focus leaves the link so stepping never marks it.
    const button = this.h('button', {type: 'button', class: cls, 'data-game-url': slide.evidence.url, title: slide.evidence.title || null, onclick: () => { this.viewGame(slide.evidence); if (playing) button.remove(); if (!this.closed) this.shell.focus({preventScroll: true}); }}, label);
    return button;
  }
  /** A second game a chapter links to (Comebacks: the one that got away), whatever the board is showing. */
  alsoEvidenceLink(slide, cls = 'pv-link') {
    const ev = slide.alsoEvidence;
    if (!ev?.url) return null;
    return this.h('button', {type: 'button', class: cls, 'data-game-url': ev.url, title: ev.title || null, onclick: () => { this.viewGame(ev); if (!this.closed) this.shell.focus({preventScroll: true}); }},
      (ev.label || 'View game').replace(/^Open\b/, 'View'));
  }
  viewGame(ev) {
    if (!ev?.id) return;
    const row = this.rows.find(r => r.id === ev.id && (!ev.url || r.url === ev.url)) || ev;
    this.dismissedGameSlide = null;
    this.showBoard({...row, ...ev, kind: 'replay'}, {game: true, portrait: false});
  }
  /* ---------- Mate in one: the missed mates, solved on the board ---------- */
  showPuzzle(spec, view = this.boardView, navigated = false) {
    const list = spec.puzzles || [];
    const key = list.map(p => this.solvedKey(p)).join();
    // Solved puzzles are remembered between visits: the chapter opens on the newest one not solved yet.
    if (!this.solvedMates) {
      this.solvedMates = new Set();
      this.store.loadSolvedMates().then(keys => {
        keys.forEach(k => this.solvedMates.add(k));
        const P = this.puzzle;
        if (this.closed || !P || P.moved || P.navigated || this.boardView !== P.view || !keys.length) return;
        const first = this.unsolvedFrom(P.list, 0);
        if (this.puzzleIndex !== first) { this.puzzleIndex = first; this.showPuzzle(P.spec, P.view); }
        else this.puzzleCaption();
      }).catch(() => {});
    }
    if (key !== this.puzzleKey) { this.puzzleKey = key; this.puzzleIndex = this.unsolvedFrom(list, 0); this.puzzleTrail = []; }
    if (!list.length) { this.board.clear(); return; }
    this.puzzleIndex = Math.max(0, Math.min(list.length - 1, this.puzzleIndex || 0));
    const p = list[this.puzzleIndex];
    const P = this.puzzle = {list, p, spec, view, navigated, hint: 0, done: false, moved: false, ready: false};
    this.board.setOrientation(p.me === 'b');
    this.showGamePlayers(p);
    this.gameView.dock();
    this.puzzleCaption();
    this.positionShell();
    const url = gameUrl(p);
    for (const link of this.slideHost.querySelectorAll('.profile-open-puzzle-game')) {
      link.hidden = !url;
      if (url) link.href = url; else link.removeAttribute('href');
    }
    try { if (p.setup) P.previous = new Chess(p.setup.fen).move(p.setup.move); } catch {}
    if (P.previous?.after === new Chess(p.fen).fen()) { this.playPuzzle({intro: true}); return; }
    P.previous = null;
    if (!(p.ply > 1 && p.id && url)) { this.playPuzzle(); return; }
    // Older rows only kept the puzzle FEN. Recover the lead-in when the game is available.
    this.board.fen(p.fen);
    this.loadPuzzlePrevious(P);
  }
  async loadPuzzlePrevious(P) {
    let timer, previous;
    try {
      const game = await Promise.race([this.gameMoves(P.p), new Promise(resolve => { timer = this.win.setTimeout(resolve, 1200); })]);
      if (game && this.puzzle === P && this.boardView === P.view) {
        const chess = new Chess(game.startFen || DEFAULT_POSITION);
        for (const san of game.moves.slice(0, P.p.ply - 1)) previous = chess.move(san);
        if (previous?.after !== new Chess(P.p.fen).fen()) previous = null;
      }
    } catch { previous = null; }
    finally { this.win.clearTimeout(timer); }
    if (this.closed || this.puzzle !== P || this.boardView !== P.view) return;
    P.previous = previous;
    this.glide?.cancel();
    this.playPuzzle({intro: true});
  }
  playPuzzle({back = null, intro = false} = {}) {
    const P = this.puzzle;
    if (intro && P.previous && this.motion()) this.gameView.update(P.previous.before);
    this.puzzlePlay = this.board.play(P.p.fen, {onMove: move => this.tryPuzzle(move), previous: P.previous, intro, back, waitForGlide: () => this.glide?.finished, onReady: () => {
      this.gameView.update(P.p.fen, null, {mate: P.p.me === 'b' ? -1 : 1});
      P.ready = true; this.puzzleCaption();
    }});
  }
  puzzleCaption() {
    const P = this.puzzle; if (!P) return;
    const {h} = this, {list, p} = P, solved = this.isSolved(p), side = p.me === 'b' ? 'Black' : 'White';
    if (!P.count) {
      const icon = (svg, cls = '') => h('span', {class: `profile-puzzle-icon ${cls}`.trim(), 'aria-hidden': 'true', html: svg});
      P.hintButton = h('button', {type: 'button', class: 'profile-puzzle-button', onclick: () => this.puzzleHint()}, icon(HINT_ICON), 'Hint');
      const previous = list.length > 1 ? h('button', {type: 'button', class: 'profile-puzzle-button', disabled: !this.puzzleIndex && !this.puzzleTrail.length, onclick: () => this.nextPuzzle(-1)}, icon(NEXT_ICON, 'is-previous'), 'Previous') : null;
      const next = h('button', {type: 'button', class: 'profile-puzzle-button is-next', onclick: () => this.nextPuzzle()}, list.length > 1 ? 'Next' : 'Again', icon(NEXT_ICON));
      P.count = h('span', {class: 'profile-puzzle-count'}, `${fmt.int(this.puzzleIndex + 1)} / ${fmt.int(list.length)}`);
      P.status = h('span', {class: 'profile-puzzle-status', role: 'status'});
      const row = P.controls = h('div', {class: 'profile-puzzle'}, P.count, P.status, h('span', {class: 'profile-puzzle-actions'}, P.hintButton, previous, next));
      const hue = this.shell?.style.getPropertyValue('--pv-hue');
      if (hue) { row.style.setProperty('--pv-hue', hue); row.classList.add('is-tinted'); }
    }
    P.count.classList.toggle('is-solved', solved);
    P.count.title = `${side} to play and mate${solved ? ' (solved before)' : ''}`;
    P.hintButton.disabled = !P.ready || P.done || P.hint >= 2;
  }
  solvedKey(p) { return `${p.site || this.site}:${p.id}`; }
  isSolved(p) { return !!this.solvedMates?.has(this.solvedKey(p)); }
  /** The first puzzle from `start` on (wrapping round) not solved yet; `start` itself when every one is. */
  unsolvedFrom(list, start) {
    for (let i = 0; i < list.length; i++) { const at = (start + i) % list.length; if (!this.isSolved(list[at])) return at; }
    return list.length ? start % list.length : 0;
  }
  /** The moves that mate at once in the puzzle's position. */
  puzzleMates() {
    const fen = this.puzzle?.p.fen; if (!fen) return [];
    return new Chess(fen).moves({verbose: true}).filter(m => { const c = new Chess(fen); c.move(m); return c.isCheckmate(); });
  }
  tryPuzzle({from, to, promotion, dragged = false}) {
    const P = this.puzzle; if (!P?.ready || P.done || this.closed) return;
    const chess = new Chess(P.p.fen);
    let move; try { move = chess.move({from, to, promotion}); } catch { move = null; }
    if (!move) { this.playPuzzle(); return; }
    P.moved = true; P.ready = false;
    const mate = chess.isCheckmate();
    // A mate sounds like the move it is; anything else gets Solve a puzzle's wrong cue.
    if (mate) this.o.playGameMove?.(move); else this.o.playPuzzleWrong?.();
    // A dragged piece is already on its square: it stays there instead of starting over from home.
    this.board.settle(chess.fen(), move.from, move.to, {mate, slide: !dragged});
    this.gameView.update(chess.fen());
    if (mate) {
      P.done = true;
      const key = this.solvedKey(P.p);
      if (!this.solvedMates.has(key)) { this.solvedMates.add(key); this.store.addSolvedMate(key).catch(() => {}); }
      const last = P.list.every(q => this.isSolved(q));
      P.status.textContent = last ? `Checkmate. All ${fmt.int(P.list.length)} puzzles solved.` : 'Checkmate';
      this.puzzleCaption();
      if (!last) this.win.setTimeout(() => { if (!this.closed && this.puzzle === P && this.boardView === P.view) this.nextPuzzle(); }, 1500);
      return;
    }
    P.status.textContent = 'Incorrect';
    this.puzzleCaption();
    this.win.setTimeout(() => {
      if (this.closed || this.puzzle !== P || this.boardView !== P.view) return;
      this.playPuzzle({back: move});
      // Whatever hint was showing comes back with the position.
      if (P.hint) this.showPuzzleHint({caption: false});
    }, 700);
  }
  /** First the piece to move, then the move itself (as in Solve a puzzle). */
  puzzleHint() {
    const P = this.puzzle; if (!P?.ready || P.done) return;
    P.hint = Math.min(2, P.hint + 1); P.moved = true;
    this.showPuzzleHint();
  }
  showPuzzleHint({caption = true} = {}) {
    const P = this.puzzle, mate = this.puzzleMates()[0]; if (!P || !mate) return;
    this.puzzlePlay?.hint(mate.from, P.hint >= 2 ? mate.to : null);
    // The lit piece and the arrow say it; the caption only updates its buttons.
    if (caption) this.puzzleCaption();
  }
  nextPuzzle(direction = 1) {
    const P = this.puzzle; if (!P) return;
    // The next position assembles from the last one, as the board does between chapters.
    const before = this.motion() && this.boardEl && this.liveBoard === this.boardEl ? boardPieces(this.boardEl) : null;
    this.glide?.cancel();
    if (direction < 0) this.puzzleIndex = this.puzzleTrail.pop() ?? Math.max(0, this.puzzleIndex - 1);
    else {
      const next = this.unsolvedFrom(P.list, this.puzzleIndex + 1);
      if (next !== this.puzzleIndex) this.puzzleTrail.push(this.puzzleIndex);
      this.puzzleIndex = next;
    }
    this.showPuzzle(P.spec, P.view, true);
    if (before && this.boardEl) this.glide = glidePieces(this.boardEl, before);
  }
  exitGame() {
    this.dismissedGameSlide = this.deck[this.index]?.id;
    this.boardSpecKey = null;
    this.renderSlide({animate: false});
    this.shell.focus({preventScroll: true});
  }
  showGamePlayers(spec, headers = {}) {
    // A game straight after another keeps the same names and bar (no slide back and out again).
    if (!this.gameView && this.spareGameView) { this.gameView = this.spareGameView; this.spareGameView = null; }
    if (!this.gameView) this.gameView = createProfileGameView({h: this.h, doc: this.doc, settings: this.o.settings, createEngine: this.o.createAnalysisEngine, motion: this.motion,
      renderPlayer: this.o.renderGamePlayer, renderEvaluation: this.o.renderGameEvaluation, geometry: this.o.gameGeometry});
    const row = this.rows.find(r => r.id === spec.id && (!spec.url || r.url === spec.url)) || spec;
    const mine = spec.account || (this.shared ? this.account.split(' / ')[row.site === 'lichess' ? 1 : 0] : this.accounts[row.site || this.site]) || this.account;
    const me = row.me || spec.me || 'w';
    this.gameView.players({me, white: headers.White || (me === 'w' ? mine : row.opp), black: headers.Black || (me === 'b' ? mine : row.opp),
      whiteRating: headers.WhiteElo || (me === 'w' ? row.myRating : row.oppRating), blackRating: headers.BlackElo || (me === 'b' ? row.myRating : row.oppRating)});
    this.positionShell();
  }
  gameStep(game) {
    const chess = game.startFen ? new Chess(game.startFen) : new Chess(), initialFen = chess.fen();
    const positions = [initialFen], moves = [];
    for (const san of game.moves) { const move = chess.move(san); moves.push(move.lan); positions.push(chess.fen()); }
    return (move, i, total = game.moves.length) => {
      this.updateGameControls(move, i, total);
      this.gameView?.update(positions[i], {initialFen, moves: moves.slice(0, i)});
    };
  }
  updateGameControls(move, i, total) {
    if (this.gameCounter) this.gameCounter.textContent = move ? `${Math.ceil(i / 2)}${i % 2 ? '.' : '…'} ${move.san} · ${i}/${total}` : 'Starting position';
    for (const button of this.gameCounter?.parentNode?.querySelectorAll('button') || []) {
      const label = button.getAttribute('aria-label');
      if (label === 'Exit game') continue;
      button.disabled = ['Start', 'Previous move'].includes(label) ? i === 0 : i >= total;
    }
  }
  /**
   * A viewed game (and the greatest hits and comebacks boards): the pieces
   * glide into the final position, then the game runs backwards to move one
   * in under two seconds, ready to step through. Any step by the player takes over.
   */
  playReplay(spec, view) {
    const B = this.board;
    this.showGamePlayers(spec);
    const end = spec.fenEnd || spec.fen;
    B.fen(end || spec.startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    this.gameView.dock(this.gameControls({ends: false}));
    if (this.gameCounter) this.gameCounter.textContent = 'Loading moves…';
    const loading = this.gameMoves(spec).catch(() => null);
    // showBoard starts the glide into the final position after this returns.
    const settle = Promise.resolve().then(() => Promise.race([this.glide?.finished?.catch(() => {}), new Promise(resolve => this.win.setTimeout(resolve, 900))]));
    Promise.all([loading, settle]).then(([game]) => {
      if (this.closed || view !== this.boardView || this.board !== B || this.steppedView === view) return;
      if (!game?.moves?.length) {
        if (end) { B.fen(end); this.gameView?.update(end); }
        else this.gameView?.unavailable();
        if (this.gameCounter) this.gameCounter.textContent = 'Moves unavailable';
        return;
      }
      this.showGamePlayers(spec, game.headers);
      const onStep = this.gameStep(game), n = game.moves.length;
      // About a second in all, so the start is reached within two; short games never crawl.
      const each = Math.max(8, Math.min(90, 1100 / n));
      B.moves(game.moves, {from: n, startFen: game.startFen, rewind: true, delay: 120, timing: () => each, onStep});
    });
  }
  async stepGame(delta) {
    if (this.portrait) { this.leavePortrait(); return; }
    this.steppedView = this.boardView;
    if (this.board?.step(delta)) return;
    const slide = this.deck[this.index], ev = this.activeGame || (slide?.board?.kind === 'replay' ? slide.board : slide?.evidence);
    if (!ev?.id || this.gameLoading === this.boardView) return;
    const view = this.boardView, board = this.board;
    const row = this.rows.find(row => row.id === ev.id && (!ev.url || row.url === ev.url)) || ev;
    let lichessUrl = false;
    try {
      const url = new URL(ev.url);
      lichessUrl = url.protocol === 'https:' && ['lichess.org', 'www.lichess.org'].includes(url.hostname);
    } catch {}
    const site = row.site || (lichessUrl ? 'lichess' : 'chesscom');
    const account = this.shared ? this.account.split(' / ')[site === 'lichess' ? 1 : 0] || this.account : this.accounts[site];
    this.gameLoading = view;
    if (this.gameCounter) this.gameCounter.textContent = 'Loading moves…';
    try {
      const pgn = await (this.o.loadPgn || loadProfilePgn)(site, row, this.abort?.signal, account);
      if (this.closed || view !== this.boardView) return;
      if (!pgn) throw Error('No moves available');
      const chess = new Chess(); chess.loadPgn(pgn);
      const moves = chess.history(), startFen = chess.getHeaders().FEN || null;
      this.showGamePlayers(ev, chess.getHeaders());
      board.moves(moves, {from: moves.length, startFen, autoplay: false, onStep: this.gameStep({moves, startFen})});
      board.step(delta);
    } catch { if (!this.closed && view === this.boardView) { this.gameCounter.textContent = 'Moves unavailable'; this.o.toast?.('Could not load the moves for this game. Try again or open the game link.'); } }
    finally { if (this.gameLoading === view) this.gameLoading = null; }
  }
  /** Move controls. Docked beside the names (`ends: false`) there is room for previous, exit and next only; Home and End still jump. */
  gameControls({ends = true} = {}) {
    const {h} = this;
    this.gameCounter = h('span', {class: 'profile-game-status', 'aria-live': 'polite'});
    const nav = (name, label, delta, title = label) => h('button', {type: 'button', 'aria-label': label, title, onclick: () => this.stepGame(delta)}, h('span', {html: this.o.icon(name)}));
    return h('div', {class: 'profile-game-controls controls'},
      ends ? nav('first', 'Start', -Infinity) : null, nav('prev', 'Previous move', -1, ends ? 'Previous move' : 'Previous move (Home: start)'),
      h('button', {type: 'button', class: 'exit-analysis', title: 'Exit game (Esc)', 'aria-label': 'Exit game', onclick: () => this.exitGame()}, h('span', {class: 'ea-x'}, '✕'), 'Exit'),
      nav('next', 'Next move', 1, ends ? 'Next move' : 'Next move (End: last move)'), ends ? nav('last', 'End', Infinity) : null, this.gameCounter);
  }
  /** Build the profile's own squares, still detached. Review renders keep their own board. */
  createBoard() {
    if (this.boardEl || this.closed) return false;
    const {makePiece} = this.o, source = this.reviewBoard;
    this.boardEl = this.h('div', {class: source.className});
    this.boardEl.classList.remove('buzz');
    // Preserve the source board's colour treatment across the swap.
    for (const original of source.querySelectorAll(':scope > .sq')) {
      const sq = this.h('div', {class: [...original.classList].filter(c => ['sq', 'light', 'dark', 'top-row', 'right-col'].includes(c)).join(' ')});
      for (const coord of original.querySelectorAll('.coord')) sq.append(coord.cloneNode(true));
      this.boardEl.append(sq);
    }
    this.board = createProfileBoard({board: this.boardEl, makePiece, motion: this.motion, doc: this.doc, onMove: this.o.playGameMove, settings: this.o.settings});
    this.board.setOrientation(!!this.o.flipped);
    this.boardEl.classList.add('profile-board');
    return true;
  }
  /** Put the profile squares where the review board stands, then glide from `before`. */
  attachBoard(board, before) {
    if (this.closed || this.boardEl !== board || this.liveBoard === board) return;
    this.liveBoard.replaceWith(board); this.liveBoard = board;
    if (before) this.glide = glidePieces(board, before);
  }
  /** Give the squares back to the reviewed position, gliding the pieces home. */
  unmountBoard() {
    this.glide?.cancel();
    this.gameView?.destroy(); this.gameView = null; this.activeGame = null;
    if (!this.boardEl) return;
    const attached = this.liveBoard === this.boardEl;
    const before = attached && this.motion() ? boardPieces(this.boardEl) : null;
    this.board.clear();
    this.gameMap?.destroy(); this.gameMap = null;
    this.reel?.destroy(); this.reel = null; this.leavingReel?.destroy(); this.leavingReel = null;
    if (attached) { this.liveBoard.replaceWith(this.reviewBoard); this.liveBoard = this.reviewBoard; }
    this.boardEl = null; this.board = null;
    if (this.boardSurface && this.win.innerWidth > 900) {
      this.boardAnchor.after(this.liveBoard); this.boardSurface.remove(); this.boardSurface = null;
    }
    if (before) this.glide = glidePieces(this.reviewBoard, before);
  }
  /** Historical twin: a full starting army assembles into the twin's face. */
  showPortrait(spec) {
    const B = this.board;
    B.fen(DEFAULT_POSITION);
    this.portraitSpec = spec;
    this.portrait = B.portrait(spec.portrait, {delay: PORTRAIT_DELAY, style: this.o.settings().profilePortraitStyle || 'relief', label: `Portrait of ${spec.name}, made of chess pieces`});
  }
  portraitCaption(spec) {
    const {h} = this, credit = portraitCredit(spec.portrait);
    // The face needs no buttons: the arrow keys or the game link move on from it.
    // Only CC BY photographs require a credit next to the picture; the rest are listed in ATTRIBUTIONS.md.
    const needsCredit = credit && /CC BY/i.test(credit.credit);
    this.caption.replaceChildren(...[
      needsCredit ? h('span', {class: 'profile-portrait-credit'}, 'Photo: ', h('a', {href: credit.source, target: '_blank', rel: 'noopener noreferrer'}, credit.credit)) : null].filter(Boolean));
  }
  /** Fade the face away and show the twin's game (or position) on the board. */
  leavePortrait() {
    const portrait = this.portrait, spec = this.portraitSpec, board = this.board;
    if (!portrait || !spec) return;
    this.portrait = null;
    portrait.dismiss().then(() => { if (!this.closed && this.board === board && this.deck[this.index]?.board === spec) this.showBoard(spec, {portrait: false}); });
  }
  showBoard(spec, {portrait = true, game = false} = {}) {
    // The current game view is kept aside: a new game takes it over, otherwise
    // its bar slides back under the board once this board is set up.
    this.spareGameView?.destroy(); this.spareGameView = this.gameView; this.gameView = null;
    try { this.drawBoard(spec, {portrait, game}); } finally { this.spareGameView?.destroy({animate: true}); this.spareGameView = null; }
  }
  drawBoard(spec, {portrait, game}) {
    // Leaving a viewed game clears the board, except for the twin: its face assembles again.
    if (!game && this.dismissedGameSlide === this.deck[this.index]?.id && !spec?.scene && ['moves', 'replay', 'fen', 'journey'].includes(spec?.kind) && !(portrait && hasPortrait(spec?.portrait))) spec = {kind: 'blank'};
    this.activeGame = spec?.kind === 'replay' ? spec : null;
    if (!game && this.isGameMapView()) spec = {kind: this.useReel() ? 'reel' : 'games'};
    if (spec?.kind !== 'games') { this.gameMap?.destroy(); this.gameMap = null; }
    if (spec?.kind !== 'reel' && this.reel) { this.retireReel(this.reel); this.reel = null; }
    const view = this.boardView = (this.boardView || 0) + 1;
    this.portrait = null;
    this.glide?.cancel();
    const motion = this.motion();
    const before = motion ? boardPieces(this.liveBoard) : null;
    const fresh = this.createBoard();
    const B = this.board;
    if (!B) return;
    if (!spec) { B.clear(); this.caption.textContent = ''; }
    else {
      B.setOrientation(spec.me === 'b');
      // The board speaks for itself: no explanatory line under it, only controls.
      this.caption.replaceChildren();
      if (portrait && hasPortrait(spec.portrait)) this.showPortrait(spec);
      else switch (spec.kind) {
        case 'games': {
          B.clear();
          const handoff = !this.gameMap && !!this.leavingReel && motion;
          this.gameMap ||= createGameMap({h: this.h, doc: this.doc, motion: this.motion, onOpen: url => this.win.open(url, '_blank', 'noopener,noreferrer')});
          this.boardEl.append(this.gameMap.element); this.caption.append(this.gameMap.caption);
          // After the film roll, the mosaic surfaces as the roll fades and its squares begin a beat later.
          if (handoff) this.gameMap.element.animate([{opacity: 0}, {opacity: 1}], {duration: 520, delay: 140, easing: EASE, fill: 'backwards'});
          // In the deck a new set of games (a choice in the gear, another player) reshapes the mosaic in place.
          this.gameMap.update(this.periodRows(), {delay: handoff ? 300 : 0, reshape: this.phase === 'deck'});
          this.positionShell();
          break;
        }
        case 'reel': {
          B.clear();
          this.reel ||= createGameReel({h: this.h, doc: this.doc, makePiece: this.o.makePiece, motion: this.motion,
            account: site => this.accounts?.[site] || this.account, orient: flipped => this.board?.setOrientation(flipped), onFinished: () => this.reelFinished()});
          this.boardEl.append(this.reel.element); this.caption.append(this.reel.caption);
          this.reel.update(this.periodRows());
          if (this.collectionDone) this.reel.finish();
          this.positionShell();
          break;
        }
        case 'replay': this.playReplay(spec, view); break;
        case 'cover': B.cover(spec.white, spec.black); break;
        case 'fen': B.fen(spec.fen, {mate: !!spec.mate}); break;
        case 'puzzle': this.showPuzzle(spec, view); break;
        case 'moves': {
          // Plays once; the move buttons step through it afterwards.
          const step = (move, i, total) => this.updateGameControls(move, i, total);
          this.caption.append(this.gameControls());
          B.moves(spec.moves, {from: spec.from || 0, delay: 1100, onStep: step});
          break;
        }
        case 'journey': {
          B.journey(spec.fenFrom, spec.fenTo);
          if (!this.deck[this.index]?.evidence?.id) this.caption.append(this.h('button', {type: 'button', class: 'profile-caption-button', onclick: () => B.journey(spec.fenFrom, spec.fenTo)}, 'Replay'));
          break;
        }
        case 'heat': B.heat(spec.counts); break;
        case 'fill': B.fill(spec.total, spec.wins, spec.draws); break;
        case 'schedule': B.schedule(spec.matrix); break;
        case 'split': B.split(spec.left, spec.right); break;
        default: B.clear();
      }
      if (!this.portrait && ['fen', 'journey'].includes(spec.kind) && this.deck[this.index]?.evidence?.id) {
        this.showGamePlayers({...this.deck[this.index].evidence, ...spec});
        this.gameView.dock(this.gameControls({ends: false}));
        const fen = spec.fen || spec.fenTo; if (fen) this.gameView.update(fen);
      }
    }
    // The twin's face owns the caption; once the game is showing, the face is one click away.
    if (this.portrait) this.portraitCaption(spec);
    else if (hasPortrait(spec?.portrait)) {
      const face = this.h('button', {type: 'button', class: 'profile-caption-button', onclick: () => this.showBoard(spec)}, 'Show the portrait');
      // Beside a game's names there is no caption row, so the button joins the move controls.
      const controls = this.gameView && this.gameCounter?.closest('.profile-game-dock') ? this.gameCounter.parentNode : null;
      if (controls) this.gameView.dock(face, controls); else this.caption.append(face);
    }
    this.positionShell();
    // Pieces travel from whatever the board showed a moment ago. The first
    // time, the new pieces decode off-screen so the swap never shows a gap.
    if (fresh) {
      const board = this.boardEl;
      if (!motion) { this.attachBoard(board, null); return; }
      const images = [...board.querySelectorAll('img')].map(img => img.decode?.().catch(() => {}));
      Promise.race([Promise.all(images), new Promise(resolve => this.win.setTimeout(resolve, 200))]).then(() => this.attachBoard(board, before));
    } else if (before && this.liveBoard === this.boardEl) this.glide = glidePieces(this.boardEl, before);
  }
  countUp(article) {
    if (!this.motion()) return;
    for (const node of article.querySelectorAll('.profile-stat-value, .profile-title')) {
      const text = node.textContent, match = /^([+-]?)(\d[\d,]*)(\.\d+)?(.*)$/.exec(text);
      if (!match) continue;
      const target = Number(match[2].replace(/,/g, '')) + Number(match[3] || 0), decimals = match[3] ? match[3].length - 1 : 0, prefix = match[1], suffix = match[4];
      const start = this.win.performance.now(), duration = 900;
      let frame = 0;
      const tick = now => {
        const p = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - p, 3), value = target * eased;
        node.textContent = prefix + (decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-US')) + suffix;
        if (p < 1) frame = this.win.requestAnimationFrame(tick); else node.textContent = text;
      };
      frame = this.win.requestAnimationFrame(tick);
      this.countAnimations.push({cancel: () => { this.win.cancelAnimationFrame(frame); node.textContent = text; }});
    }
  }
}

function mergeSites(parts, sites) {
  return parts.flatMap((part, i) => part.rows.map(row => row.site ? row : {...row, site: sites[i]})).sort((a, b) => (a.t || 0) - (b.t || 0));
}
