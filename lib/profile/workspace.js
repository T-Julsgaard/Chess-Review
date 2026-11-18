// Player profile — the workspace. The review board stays exactly where it is:
// the review panels fade out in place, one profile panel settles in over their
// footprint and asks whose games to read. Only when the deck is ready does the
// board become the picture, its pieces gliding from the reviewed position into
// each slide. Runs collection and the optional engine job, and shares the result.
// Opening snapshots nothing about the game: the caller restores the review.
import {createProfileStore, JOB_KEY} from './store.js';
import {collectProfile, PERIODS, periodRows, periodStart, periodLabel, customPeriodBounds} from './collector.js';
import {buildInsights, ratings} from './insights.js';
import {buildDeck, buildReport, fmt} from './deck.js';
import {selectSample, budgetById, ENGINE_ENTRY_VERSION, DEPTHS, SAMPLES, depthById, estimateMinutes, AUTO_MINUTES} from './engine-sample.js';
import {encodeProfile, profileLink, drawProfileCard, STORE_URLS} from './share.js';
import {createProfileBoard} from './board.js';
import {hasPortrait, portraitCredit, PORTRAIT_DELAY} from './portrait.js';
import {reviewSurfaces, fadeOut, fadeIn, boardPieces, glidePieces, motionGroup, EASE, EASE_OUT} from './transition.js';
import {createTourLoader} from './loader.js';
import {Chess} from '../chess.js';
import {loadProfilePgn} from './pgn-source.js';

export async function deleteProfileData(storage) { return createProfileStore(storage).deleteAll(); }
export async function profileStorageUsage(storage) { return createProfileStore(storage).usage(); }

const STALE_JOB_MS = 3 * 60 * 1000;
const REFRESH_MIN_MS = 10 * 60 * 1000;
// A loader that would only flash is never shown; cached profiles open directly.
const LOADER_DELAY_MS = 220;
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
    const rows = this.periodRows(), lichess = rows.filter(r => r.site === 'lichess').length;
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
    else this.renderSetup({focus: false});
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
    if (this.closed) return this.closing; this.closed = true;
    this.abort?.abort();
    this.win.removeEventListener('resize', this.reposition); this.win.removeEventListener('scroll', this.reposition, true); this.observer?.disconnect();
    this.doc.removeEventListener('keydown', this.keyHandler);
    this.o.storageEvents?.removeListener?.(this.storageListener);
    this.countAnimations?.forEach(a => a.cancel?.());
    this.loader?.stop(); this.win.clearTimeout(this.loaderTimer);
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
  positionShell() {
    if (this.closed) return;
    const {stage, boardWrap} = this.o;
    if (this.win.innerWidth <= 900) {
      // A stacked review can extend well below the viewport. Keep the profile
      // board and a scrollable slide visible together in the available space.
      if (!this.boardSurface) {
        this.boardSurface = this.h('div', {class: 'profile-board-surface'});
        this.doc.body.append(this.boardSurface); this.boardSurface.append(this.liveBoard);
      }
      const top = Math.max(8, this.doc.querySelector('.topbar')?.getBoundingClientRect().bottom || 0) + 8;
      const available = Math.max(280, this.win.innerHeight - top - 8);
      const size = Math.min(this.win.innerWidth - 24, Math.max(120, (available - 64) * .46));
      Object.assign(this.boardSurface.style, {left: (this.win.innerWidth - size) / 2 + 'px', top: top + 'px', width: size + 'px', height: size + 'px'});
      Object.assign(this.caption.style, {left: '12px', top: top + size + 4 + 'px', width: this.win.innerWidth - 24 + 'px'});
      const panelTop = top + size + 64;
      Object.assign(this.shell.style, {left: '12px', top: panelTop + 'px', width: this.win.innerWidth - 24 + 'px', height: Math.max(160, this.win.innerHeight - panelTop - 8) + 'px'});
      this.shell.classList.add('profile-stacked');
      return;
    }
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
    Object.assign(this.shell.style, {left: left + 'px', top: top + 'px', width: width + 'px', height: Math.min(height, this.win.innerHeight - top - 8) + 'px'});
    this.shell.classList.toggle('profile-stacked', stacked);
    Object.assign(this.caption.style, {left: board.left + 'px', top: (board.bottom + 6) + 'px', width: board.width + 'px'});
  }
  onKey(event) {
    if (this.closed || event.defaultPrevented) return;
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (target?.closest?.('#settings,[role="dialog"],[role="alertdialog"]')) return;
    const game = this.deck[this.index]?.board;
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
    this.abort?.abort(); this.abort = new AbortController();
    this.setupMotion?.cancel();
    this.refreshing = false;
    this.loader?.stop(); this.loader = null; this.win.clearTimeout(this.loaderTimer);
    this.rows = []; this.engine = {}; this.job = null; this.report = null; this.deck = []; this.engineBlock = null;
    this.boardSpecKey = null; this.boardView = (this.boardView || 0) + 1;
    this.caption.replaceChildren(); this.nav.replaceChildren();
    this.unmountBoard();
    return this.abort.signal;
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
      const since = periodStart(this.period, new Date(), this.customPeriod);
      const stale = force || parts.some(part => !(part.updatedAt && Date.now() - part.updatedAt < REFRESH_MIN_MS && since >= (part.since || 0)));
      if (this.rows.length) {
        // Saved games open at once; anything newer arrives in the background.
        await this.loadEngine(signal);
        if (signal.aborted) return;
        const job = await this.store.loadJob();
        if (signal.aborted) return;
        this.job = job;
        this.reveal();
        if (stale) await this.refresh(signal); else this.setStatus(null);
      } else {
        await this.refresh(signal);
      }
    } catch (error) {
      if (signal.aborted) return;
      if (this.rows.length) { this.reveal(); this.setStatus(null); }
      else this.renderError(error);
    }
  }
  async refresh(signal = this.abort?.signal) {
    const since = periodStart(this.period, new Date(), this.customPeriod), sites = this.sites(), key = this.selectionKey();
    this.refreshing = true;
    try {
      const parts = [];
      for (const [n, site] of sites.entries()) {
        parts.push(await collectProfile({site, account: this.accounts[site], since, store: this.store, signal,
          onProgress: info => { if (!signal?.aborted && !this.closed) this.onCollectProgress(info, {site, n, of: sites.length, before: parts.reduce((sum, p) => sum + p.rows.length, 0)}); }}));
        if (signal?.aborted) return;
      }
      if (signal?.aborted || key !== this.selectionKey()) return;
      this.rows = mergeSites(parts, sites);
      await this.loadEngine(signal);
      if (signal?.aborted || this.closed) return;
      if (this.phase !== 'deck') {
        const job = await this.store.loadJob();
        if (signal?.aborted) return;
        this.job = job;
        await this.loader?.finish();
        if (signal?.aborted || this.closed) return;
        this.reveal();
      } else this.rebuild();
      this.setStatus(null);
    } catch (error) {
      if (signal?.aborted) return;
      if (this.rows.length) { if (this.phase !== 'deck') this.reveal(); this.setStatus(null); this.o.toast?.('Could not refresh: ' + error.message); } else this.renderError(error);
    } finally { if (signal === this.abort?.signal) this.refreshing = false; }
  }
  onCollectProgress(info, {site, n, of, before}) {
    const where = of > 1 ? SITE_NAMES[site] + ': ' : '';
    let text = null, fraction = null;
    if (info.phase === 'archives') text = `${where}Looking up the archive…`;
    else if (info.phase === 'month') {
      fraction = info.total ? info.done / info.total : null;
      text = site === 'lichess' ? `${where}Reading your games…` : `${where}Reading month ${fmt.int(info.done)} of ${fmt.int(info.total)}…`;
    } else if (info.phase === 'replay') text = `${where}Replaying your games…`;
    else if (info.phase === 'done') { if (this.phase === 'deck') this.setStatus(null); return; }
    const overall = fraction == null ? null : (n + fraction) / of;
    if (this.phase === 'deck') { this.setStatus(text, overall); return; }
    this.loader?.update({text, fraction: overall, games: before + (info.kept || 0)});
  }
  periodRows() { return periodRows(this.rows, this.period, new Date(), this.customPeriod); }
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
    const key = this.selectionKey(), rows = this.periodRows();
    const parts = await Promise.all(this.sites().map(site => this.store.loadEngine(site, rows.filter(r => (r.site || site) === site).map(r => r.id))));
    if (this.closed || signal?.aborted || key !== this.selectionKey()) return;
    this.engine = Object.fromEntries(parts.flatMap(entries => Object.entries(entries)).filter(([, e]) => e?.v === ENGINE_ENTRY_VERSION && e.acc != null));
  }
  /** Depth and game selection for the accuracy pass, from the setup choices. */
  accuracySettings() {
    const s = this.o.settings();
    return {depth: depthById(s.profileDepth), sample: SAMPLES.find(x => x.id === s.profileSample) || SAMPLES[0], off: s.profileDepth === 'off'};
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
    this.autoEngine();
  }
  /** The accuracy pass starts by itself once the deck is showing; it runs in the background. */
  autoEngine() {
    if (this.shared || this.closed || this.accuracySettings().off) return;
    const key = this.selectionKey();
    if (this.autoEngineKey === key || ['running'].includes(this.engineStatus())) return;
    this.autoEngineKey = key;
    this.startEngine({auto: true});
  }
  rebuild() {
    if (this.closed) return;
    const slideId = this.deck[this.index]?.id;
    const rows = this.periodRows();
    const label = periodLabel(this.period, this.customPeriod);
    const all = rows;
    (this.knownGames ||= {})[this.selectionKey()] = rows.filter(r => !r.bot && r.n >= 10).length;
    const deckRows = this.deckRows();
    const insights = buildInsights(deckRows, {engine: this.engine, includeBots: !!this.o.settings().profileIncludeBots, library: this.libraryPoints().filter(p => this.cls === 'all' || deckRows.some(r => r.id === p.id))});
    // Ratings are not comparable across sites; with both, the journey follows the site played most.
    let ratingSite = null;
    if (this.site === 'both') { ratingSite = this.engineSite(); insights.ratings = ratings(rows.filter(r => r.site === ratingSite && (this.o.settings().profileIncludeBots || !r.bot))); }
    this.report = buildReport(rows, insights, {account: this.account, site: this.site, period: this.period, periodLabel: label, country: this.o.identity?.country || null});
    if (ratingSite) this.report.ratingSite = ratingSite;
    // The time controls the filter offers come from the whole period, so the choice never shrinks itself.
    const counts = {};
    for (const r of all) if (this.o.settings().profileIncludeBots || !r.bot) counts[r.cls] = (counts[r.cls] || 0) + 1;
    this.report.classOptions = Object.entries(counts).filter(([cls, n]) => n >= 5 && cls !== 'unknown').sort((a, b) => b[1] - a[1]).map(([cls]) => cls);
    this.report.cls = this.cls;
    const budget = budgetById(this.budget);
    this.deck = this.decorateDeck(buildDeck(this.report, {account: this.account, site: this.site, periodLabel: label, country: this.report.country, engineStatus: this.engineStatus(),
      ratingClass: this.ratingClass, engineBudgetLabel: `The ${budget.label.toLowerCase()} check looks at about ${budget.games} ${this.site === 'both' ? SITE_NAMES[this.engineSite()] + ' ' : ''}games and takes roughly ${budget.minutes} minutes.`}));
    const next = this.deck.findIndex(slide => slide.id === slideId);
    this.index = next >= 0 ? next : Math.max(0, Math.min(this.index, this.deck.length - 1));
    this.renderSlide({animate: !slideId, preserveScroll: !!slideId});
  }
  /** Designs (lib/profile/designs) may add, drop or reorder slides; the classic deck is used as built. */
  decorateDeck(deck) { return deck; }
  async onJobChange(job) {
    if (this.closed || this.shared) return;
    const signal = this.abort?.signal;
    this.job = job;
    const mine = job && job.site === this.engineSite() && job.account?.toLowerCase() === this.engineAccount().toLowerCase();
    if (!mine) { this.renderEngineBlock(); return; }
    if (job.status === 'done' && job.perGameMs && job.depth) {
      // Remember how fast this computer is, so the setup can estimate the next run.
      const speed = {...(this.o.settings().profileEngineSpeed || {}), [job.depth]: job.perGameMs};
      this.o.writeSettings?.({profileEngineSpeed: speed});
    }
    if (job.status === 'done' || job.status === 'cancelled' || job.status === 'error' || (job.done && job.done % 10 === 0)) { await this.loadEngine(signal); if (!signal?.aborted && this.report) this.rebuild(); }
    else this.renderEngineBlock();
  }
  async startEngine({auto = false} = {}) {
    if (this.closed || this.engineStarting) return;
    const signal = this.abort?.signal;
    const site = this.engineSite(), account = this.engineAccount();
    const rows = this.periodRows().filter(r => (r.site || site) === site);
    const {depth, sample} = this.accuracySettings();
    // Reviewed library games already have an accuracy; the engine skips them.
    const known = new Set([...Object.keys(this.engine), ...this.libraryAccuracy.map(p => p.id)]);
    const ids = selectSample(rows, {every: sample.every, games: sample.every ? 2000 : 1000, cached: known, rivalName: this.report?.opponents?.rival?.name || null});
    if (!ids.length) { if (!auto) this.o.toast?.('Every selected game is already checked.'); return; }
    const byId = new Map(rows.map(r => [r.id, r]));
    const workers = Math.max(1, Math.min(4, Number(this.o.settings().engineWorkers) || 1));
    // Auto stops after a few minutes; the order spreads the checked games over the whole period.
    const job = {site, account, budget: sample.id, depth: depth.depth, deadlineMs: sample.every ? null : AUTO_MINUTES * 60000, workers, rows: ids.map(id => ({id, t: byId.get(id).t, me: byId.get(id).me}))};
    this.engineStarting = true; this.renderEngineBlock();
    let result;
    try { result = await this.o.sendMessage({type: 'profileEngine', action: 'start', job}); } catch (error) { result = {ok: false, reason: error?.message}; }
    this.engineStarting = false;
    if (this.closed || signal?.aborted) return;
    if (!result?.ok) { if (!auto || result?.reason !== 'busy') this.o.toast?.(result?.reason === 'busy' ? 'An accuracy check is already running.' : `The accuracy check could not start${result?.reason ? ': ' + result.reason : '. Try reloading the extension.'}`); this.renderEngineBlock(); return; }
    this.job = {status: 'running', site, account, total: ids.length, done: 0, startedAt: Date.now(), updatedAt: Date.now(), workers, depth: depth.depth, deadlineMs: job.deadlineMs};
    this.renderEngineBlock();
    if (this.deck[this.index]?.id === 'trend') this.rebuild();
  }
  async cancelEngine() { try { await this.o.sendMessage({type: 'profileEngine', action: 'cancel'}); } catch {} }

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
    if (this.phase === 'deck') actions.append(
      h('button', {type: 'button', class: 'profile-button ghost profile-edit', title: 'Change player, site or period', onclick: () => this.renderSetup()}, h('span', {class: 'profile-button-icon', html: this.o.icon('gear')}), 'Change'));
    this.head.append(h('div', {class: 'profile-head-main'}, h('span', {class: 'profile-eyebrow'}, 'Player profile'),
      h('strong', {class: 'profile-head-title'}, this.account), h('span', {class: 'profile-head-meta'}, `${label} · ${SITE_NAMES[this.site]}`)), actions);
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
      const dx = previous ? previous.left - after.left : 0, dy = previous ? previous.top - after.top : 8;
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
    const field = site => {
      if (fields[site]) return fields[site];
      const suggestions = [...new Set([...(identity.accountsBySite?.[site] || []), this.accounts[site]].filter(Boolean))].slice(0, 4);
      const input = inputs[site] = h('input', {type: 'text', class: 'profile-input', value: this.accounts[site] || '', placeholder: `${SITE_NAMES[site]} username`,
        autocomplete: 'off', spellcheck: 'false', 'aria-label': `${SITE_NAMES[site]} username`, maxlength: '30', 'data-autofocus': true});
      input.addEventListener('input', () => { this.accounts = {...this.accounts, [site]: input.value.trim()}; input.classList.remove('invalid'); error.hidden = true; });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); build(); } });
      const chips = suggestions.filter(name => name !== input.value).length ? h('div', {class: 'profile-chips'}, ...suggestions.map(name =>
        h('button', {type: 'button', class: 'profile-chip', onclick: () => { input.value = name; input.dispatchEvent(new this.win.Event('input')); input.focus(); }}, name))) : null;
      return fields[site] = h('label', {class: 'profile-field', 'data-setup-layout': true}, h('span', {class: 'profile-field-label'}, `${SITE_NAMES[site]} username`), input, chips);
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
    const bots = h('input', {type: 'checkbox', checked: !!this.o.settings().profileIncludeBots});
    // Accuracy check: depth and which games, with an estimate from this computer's measured speed.
    const settings = this.o.settings();
    const accuracy = {depth: settings.profileDepth || 'balanced', sample: settings.profileSample || 'auto'};
    const estimate = h('p', {class: 'profile-period-note profile-accuracy-note'});
    const sampleField = segment('Games to check', SAMPLES.map(s => [s.id, s.label]), accuracy.sample, id => { accuracy.sample = id; updateEstimate(); });
    sampleField.classList.add('profile-accuracy-games');
    const updateEstimate = () => {
      sampleField.hidden = accuracy.depth === 'off';
      if (accuracy.depth === 'off') { estimate.textContent = 'No engine. The accuracy chapter uses only games you reviewed in your library.'; return; }
      const depth = depthById(accuracy.depth), sample = SAMPLES.find(s => s.id === accuracy.sample) || SAMPLES[0];
      const ms = settings.profileEngineSpeed?.[depth.depth] || depth.ms, workers = Math.max(1, Math.min(4, Number(settings.engineWorkers) || 1));
      const perGame = ms / workers / 1000;
      const cached = this.knownGames?.[this.selectionKey()];
      if (!sample.every) estimate.textContent = `Checks as many games as fit in about ${AUTO_MINUTES} minutes (≈ ${perGame < 10 ? perGame.toFixed(1) : Math.round(perGame)} s per game on this computer), spread across the period. Runs in the background while you read.`;
      else if (cached) { const games = Math.ceil(cached / sample.every), minutes = estimateMinutes(games, ms, {workers, every: sample.every}); estimate.textContent = `About ${fmt.int(games)} games, roughly ${minutes < 1 ? 'a minute' : fmt.plural(Math.round(minutes), 'minute')}. Runs in the background while you read.`; }
      else estimate.textContent = `About ${perGame < 10 ? perGame.toFixed(1) : Math.round(perGame)} s per game on this computer. Runs in the background while you read.`;
    };
    const depthField = segment('Accuracy check', [['off', 'Off'], ...DEPTHS.map(d => [d.id, d.label])], accuracy.depth, id => this.moveSetup(() => { accuracy.depth = id; updateEstimate(); }));
    updateEstimate();
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
      this.o.writeSettings?.({profilePeriod: this.period, profileCustomPeriod: {...this.customPeriod}, profileSite: this.site, profileAccounts: {...this.accounts}, profileIncludeBots: bots.checked,
        profileDepth: accuracy.depth, profileSample: accuracy.sample});
      this.cls = 'all'; this.rivalCls = 'all'; this.autoEngineKey = null;
      this.index = 0; this.load();
    };
    const accountFields = h('div', {class: 'profile-account-fields'}, ...this.sites().map(field));
    const periods = segment('Period', PERIODS.map(p => [p.id, p.label]), this.period, id => this.moveSetup(() => {
      this.period = id; custom.hidden = id !== 'custom'; error.hidden = true;
      customButton.setAttribute('aria-expanded', String(id === 'custom'));
    }));
    const customButton = periods.querySelector('button:last-child');
    customButton.setAttribute('aria-controls', custom.id); customButton.setAttribute('aria-expanded', String(this.period === 'custom'));
    this.slideHost.replaceChildren(h('form', {class: 'profile-setup', novalidate: true, onsubmit: e => { e.preventDefault(); build(); }},
      h('div', {class: 'profile-setup-intro', 'data-setup-layout': true}, h('h2', {class: 'profile-setup-title'}, 'Build a player profile'),
        h('p', {class: 'profile-lead'}, 'A short story of your games, told on the board. Choose whose games to read and how far back to go.')),
      segment('Site', SITE_CHOICES, this.site, id => { if (id !== this.site) this.moveSetup(() => { this.site = id; accountFields.replaceChildren(...this.sites().map(field)); error.hidden = true; }); }),
      accountFields,
      periods, custom,
      h('div', {class: 'profile-accuracy', 'data-setup-layout': true}, depthField, sampleField, estimate),
      error,
      h('div', {class: 'profile-setup-actions', 'data-setup-layout': true}, h('button', {type: 'submit', class: 'profile-button primary profile-build'}, 'Build profile', h('span', {class: 'profile-button-arrow', 'aria-hidden': 'true'}, '→')),
        h('label', {class: 'profile-switch', title: 'Off keeps every figure to human opponents.'}, bots, h('span', {class: 'profile-switch-track', 'aria-hidden': 'true'}), h('span', {}, 'Include bot games')))));
    if (focus) {
      const first = this.sites().map(site => inputs[site]).find(input => !USERNAME.test(input.value)) || this.slideHost.querySelector('.profile-build');
      first?.focus({preventScroll: true});
    }
  }
  renderChooser() { this.renderSetup(); }
  renderError(error) {
    if (this.closed) return;
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
    if (slide.evidence?.url) article.append(h('a', {class: 'profile-evidence', href: slide.evidence.url, target: '_blank', rel: 'noopener noreferrer'}, slide.evidence.label, h('span', {'aria-hidden': 'true'}, ' ↗')));
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
  /** Only progress: the accuracy pass starts by itself, so there is nothing to press. */
  renderEngineBlock() {
    if (!this.engineBlock || this.closed || this.shared) return;
    const {h} = this, status = this.engineStatus(), job = this.job;
    const block = this.engineBlock; block.replaceChildren();
    if (status !== 'running' && !this.engineStarting) return;
    const done = job?.done || 0, total = job?.total || 0, perGame = job?.perGameMs;
    const elapsed = job?.startedAt ? Date.now() - job.startedAt : 0;
    let left = perGame && total ? Math.max(0, Math.round((total - done) * perGame / 60000)) : null;
    if (left != null && job?.deadlineMs) left = Math.min(left, Math.max(0, Math.round((job.deadlineMs - elapsed) / 60000)));
    block.append(h('div', {class: 'profile-engine-progress'}, h('div', {class: 'profile-status-bar'}, h('i', {style: {width: total ? Math.round(100 * done / total) + '%' : '0%'}})),
      h('span', {}, this.engineStarting ? 'Starting the accuracy check…' : `Checking accuracy: ${done} of ${total} games${left != null ? ` · about ${left} min left` : ''}`)),
      h('button', {type: 'button', class: 'profile-button ghost', onclick: () => this.cancelEngine()}, 'Stop'));
  }
  renderShare() {
    const {h} = this;
    const linkButton = h('button', {type: 'button', class: 'profile-button primary', onclick: () => this.copyLink(linkButton)}, 'Copy share link');
    const cardButton = h('button', {type: 'button', class: 'profile-button', onclick: () => this.downloadCard()}, 'Download card');
    const chrome = h('a', {href: STORE_URLS.chrome, target: '_blank', rel: 'noopener noreferrer'}, 'Chrome Web Store'), firefox = h('a', {href: STORE_URLS.firefox, target: '_blank', rel: 'noopener noreferrer'}, 'Firefox Add-ons');
    return h('div', {class: 'profile-share'}, h('div', {class: 'profile-chooser-row'}, linkButton, cardButton),
      h('p', {class: 'profile-muted'}, 'The link opens a read-only version of these slides on the Chess Review page on GitHub Pages, decoded entirely in the reader\'s browser; with the extension installed it opens here, on the board. It contains your username, the numbers on these slides and links to the games they mention. GitHub serves the page and sees the page request, never the data.'),
      h('p', {class: 'profile-muted'}, 'Get the extension: ', chrome, ' · ', firefox, '.'));
  }
  async copyLink(button) {
    if (!this.report) return;
    try {
      const encoded = await encodeProfile(this.report);
      await this.win.navigator.clipboard.writeText(profileLink(encoded));
      this.o.toast?.('Share link copied', button);
    } catch { this.o.toast?.('Could not copy the link'); }
  }
  async cardCanvas() {
    const canvas = this.doc.createElement('canvas');
    drawProfileCard(canvas, this.report, {theme: this.o.settings().theme === 'light' ? 'light' : 'dark', flag: this.report.country || null});
    return canvas;
  }
  async downloadCard() {
    if (!this.report) return;
    const account = this.report.account;
    try {
      const canvas = await this.cardCanvas();
      const a = this.doc.createElement('a'); a.download = `chess-review-profile-${account}.png`; a.href = canvas.toDataURL('image/png');
      this.doc.body.append(a); a.click(); a.remove();
    } catch { this.o.toast?.('Could not create the card'); }
  }

  /* ---------- board ---------- */
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
    return {moves: chess.history(), startFen: chess.getHeaders().FEN || null};
  }
  /**
   * Greatest hits and comebacks: names on each side, the halves part, then the
   * whole game plays from move one in about eight seconds, fast at first and
   * slowing towards the end. Any step by the player takes over.
   */
  playReplay(spec, view) {
    const B = this.board;
    B.fen(spec.startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    this.caption.append(this.gameControls());
    const loading = this.gameMoves(spec).catch(() => null);
    const me = this.account.split(' / ')[0] || 'You';
    B.intro({top: spec.opp || 'Opponent', bottom: spec.account || me, ready: loading}).then(() => loading).then(game => {
      if (this.closed || view !== this.boardView || this.board !== B) return;
      if (!game?.moves?.length) { B.fen(spec.fen); if (this.gameCounter) this.gameCounter.textContent = 'Final position'; return; }
      const total = 8000, n = game.moves.length;
      const at = i => total * Math.pow(i / n, 1.8);
      B.moves(game.moves, {from: 0, startFen: game.startFen, delay: 250, timing: i => Math.max(45, at(i + 1) - at(i)),
        onStep: (move, i) => { if (this.gameCounter) this.gameCounter.textContent = move ? `${Math.ceil(i / 2)}${i % 2 ? '.' : '…'} ${move.san}` : 'Starting position'; }});
    });
  }
  async stepGame(delta) {
    if (this.portrait) { this.leavePortrait(); return; }
    if (this.board?.step(delta)) return;
    const slide = this.deck[this.index], ev = slide?.board?.kind === 'replay' ? slide.board : slide?.evidence;
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
      board.moves(moves, {from: moves.length, startFen, autoplay: false, onStep: (move, i, total) => {
        this.gameCounter.textContent = i ? `${Math.ceil(i / 2)}${i % 2 ? '.' : '…'} ${move.san} · ${i}/${total}` : 'Starting position';
      }});
      board.step(delta);
    } catch { if (!this.closed && view === this.boardView) { this.gameCounter.textContent = 'Moves unavailable'; this.o.toast?.('Could not load the moves for this game. Try again or open the game link.'); } }
    finally { if (this.gameLoading === view) this.gameLoading = null; }
  }
  gameControls() {
    this.gameCounter = this.h('span', {class: 'profile-caption-move tnum', 'aria-live': 'polite'});
    return this.h('span', {class: 'profile-game-controls'},
      this.h('button', {type: 'button', class: 'profile-caption-button', 'aria-label': 'Previous move', title: 'Previous move (←)', onclick: () => this.stepGame(-1)}, '←'),
      this.gameCounter,
      this.h('button', {type: 'button', class: 'profile-caption-button', 'aria-label': 'Next move', title: 'Next move (→)', onclick: () => this.stepGame(1)}, '→'),
      this.h('span', {class: 'profile-move-hint'}, '← → moves · PgUp / PgDn sections'));
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
    this.board = createProfileBoard({board: this.boardEl, makePiece, motion: this.motion, doc: this.doc});
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
    if (!this.boardEl) return;
    const attached = this.liveBoard === this.boardEl;
    const before = attached && this.motion() ? boardPieces(this.boardEl) : null;
    this.board.clear();
    if (attached) { this.liveBoard.replaceWith(this.reviewBoard); this.liveBoard = this.reviewBoard; }
    this.boardEl = null; this.board = null;
    if (before) this.glide = glidePieces(this.reviewBoard, before);
  }
  /** Historical twin: the position appears, then its pieces assemble into the twin's face. */
  showPortrait(spec) {
    const B = this.board;
    if (spec.kind === 'moves') {
      const chess = new Chess();
      for (const san of spec.moves.slice(0, spec.from || 0)) { try { chess.move(san); } catch { break; } }
      B.fen(chess.fen());
    } else if (spec.kind === 'fen') B.fen(spec.fen);
    else B.cover(spec.white, spec.black);
    this.portraitSpec = spec;
    this.portrait = B.portrait(spec.portrait, {delay: PORTRAIT_DELAY, style: this.o.settings().profilePortraitStyle || 'assemble', label: `Portrait of ${spec.name}, made of chess pieces`});
  }
  portraitCaption(spec) {
    const {h} = this, credit = portraitCredit(spec.portrait);
    const replay = h('button', {type: 'button', class: 'profile-caption-button', onclick: () => this.portrait?.replay()}, 'Replay');
    const game = h('button', {type: 'button', class: 'profile-caption-button', onclick: () => this.leavePortrait()}, spec.kind === 'moves' ? 'Play the game' : 'Show the position');
    // Only CC BY photographs require a credit next to the picture; the rest are listed in ATTRIBUTIONS.md.
    const needsCredit = credit && /CC BY/i.test(credit.credit);
    this.caption.replaceChildren(...[replay, game,
      needsCredit ? h('span', {class: 'profile-portrait-credit'}, 'Photo: ', h('a', {href: credit.source, target: '_blank', rel: 'noopener noreferrer'}, credit.credit)) : null].filter(Boolean));
  }
  /** Fade the face away and show the twin's game (or position) on the board. */
  leavePortrait() {
    const portrait = this.portrait, spec = this.portraitSpec, board = this.board;
    if (!portrait || !spec) return;
    this.portrait = null;
    portrait.dismiss().then(() => { if (!this.closed && this.board === board && this.deck[this.index]?.board === spec) this.showBoard(spec, {portrait: false}); });
  }
  showBoard(spec, {portrait = true} = {}) {
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
        case 'replay': this.playReplay(spec, view); break;
        case 'cover': B.cover(spec.white, spec.black); break;
        case 'fen': B.fen(spec.fen, {mate: !!spec.mate}); break;
        case 'moves': {
          const replay = this.h('button', {type: 'button', class: 'profile-caption-button', onclick: () => { replay.hidden = true; B.moves(spec.moves, {from: spec.from || 0, onStep: step, onDone: done}); }}, 'Replay');
          const done = () => { replay.hidden = false; };
          const step = (move, i) => { this.gameCounter.textContent = move ? `${Math.ceil(i / 2)}${i % 2 ? '.' : '…'} ${move.san}` : 'Starting position'; };
          replay.hidden = true; this.caption.append(this.gameControls(), replay);
          B.moves(spec.moves, {from: spec.from || 0, delay: 1100, onStep: step, onDone: done});
          break;
        }
        case 'journey': {
          B.journey(spec.fenFrom, spec.fenTo);
          this.caption.append(this.h('button', {type: 'button', class: 'profile-caption-button', onclick: () => B.journey(spec.fenFrom, spec.fenTo)}, 'Replay'));
          break;
        }
        case 'heat': B.heat(spec.counts); break;
        case 'fill': B.fill(spec.total, spec.wins, spec.draws); break;
        case 'schedule': B.schedule(spec.matrix); break;
        case 'split': B.split(spec.left, spec.right); break;
        case 'card': {
          B.clear();
          this.cardCanvas().then(canvas => { if (!this.closed && view === this.boardView) this.board?.card(canvas); })
            .catch(() => { if (!this.closed && view === this.boardView) this.board?.cover(null, null); });
          break;
        }
        default: B.clear();
      }
      if (['fen', 'journey'].includes(spec.kind) && this.deck[this.index]?.evidence?.id) this.caption.append(this.gameControls());
    }
    // The twin's face owns the caption; once the game is showing, the face is one click away.
    if (this.portrait) this.portraitCaption(spec);
    else if (hasPortrait(spec?.portrait)) this.caption.append(this.h('button', {type: 'button', class: 'profile-caption-button', onclick: () => this.showBoard(spec)}, 'Show the portrait'));
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
