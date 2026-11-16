// Player profile — the workspace. Fades the review panels out, mounts one profile
// panel over their footprint, drives the review board as the visualization for
// each slide, runs collection and the optional engine job, and shares the result.
// Opening snapshots nothing about the game: the caller restores the review.
import {createProfileStore, JOB_KEY} from './store.js';
import {collectProfile, PERIODS, periodRows, periodStart} from './collector.js';
import {buildInsights} from './insights.js';
import {buildDeck, buildReport, fmt} from './deck.js';
import {selectSample, BUDGETS, budgetById, ENGINE_ENTRY_VERSION} from './engine-sample.js';
import {encodeProfile, profileLink, drawCard, STORE_URLS} from './share.js';
import {createProfileBoard} from './board.js';

export async function deleteProfileData(storage) { return createProfileStore(storage).deleteAll(); }
export async function profileStorageUsage(storage) { return createProfileStore(storage).usage(); }

const STALE_JOB_MS = 3 * 60 * 1000;
const REFRESH_MIN_MS = 10 * 60 * 1000;

export class ProfileWorkspace {
  constructor(options) {
    this.o = options;
    this.doc = options.document; this.win = this.doc.defaultView;
    this.store = createProfileStore(options.storage);
    this.site = options.shared?.site || options.identity?.site || 'chesscom';
    this.account = options.shared?.account || options.identity?.accounts?.[0] || '';
    this.period = options.settings().profilePeriod || 'year';
    this.budget = options.settings().profileBudget || 'standard';
    this.shared = options.shared || null;
    this.rows = []; this.engine = {}; this.deck = []; this.index = 0; this.job = null; this.closed = false; this.loading = null;
    this.motion = () => options.settings().uiAnim !== false && !this.win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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

  /* ---------- lifecycle ---------- */
  async open() {
    const {stage, boardWrap, makePiece} = this.o;
    this.boardEl = boardWrap.querySelector('.board');
    this.board = createProfileBoard({board: this.boardEl, makePiece, motion: this.motion, doc: this.doc});
    this.board.setOrientation(!!this.o.flipped);
    this.inertNodes = [...stage.querySelectorAll('.mod'), this.doc.querySelector('.library-rail')].filter(Boolean).map(node => ({node, inert: node.inert}));
    for (const {node} of this.inertNodes) if (node.dataset?.mod !== 'board') node.inert = true;
    stage.classList.add('profile-active'); this.doc.body.classList.add('has-profile');
    this.boardEl.classList.add('profile-board');
    this.shell = this.h('section', {class: 'profile-shell', 'aria-label': 'Player profile', tabindex: '-1', 'data-motion': this.motion() ? 'on' : 'off'});
    this.caption = this.h('div', {class: 'profile-board-caption', 'aria-live': 'polite'});
    this.doc.body.append(this.shell, this.caption);
    this.reposition = () => this.positionShell();
    this.win.addEventListener('resize', this.reposition); this.win.addEventListener('scroll', this.reposition, true);
    this.observer = this.win.ResizeObserver ? new this.win.ResizeObserver(this.reposition) : null; this.observer?.observe(stage);
    this.keyHandler = event => this.onKey(event); this.doc.addEventListener('keydown', this.keyHandler);
    this.storageListener = (changes, area) => { if (area === 'local' && changes[JOB_KEY]) this.onJobChange(changes[JOB_KEY].newValue || null); };
    this.o.storageEvents?.addListener?.(this.storageListener);
    this.positionShell();
    this.renderFrame();
    this.shell.focus({preventScroll: true});
    if (this.shared) { this.rows = []; this.report = this.shared; this.deck = buildDeck(this.shared, {account: this.shared.account, site: this.shared.site, periodLabel: this.shared.periodLabel, engineStatus: 'unavailable'}); this.renderSlide(); return; }
    await this.load();
  }
  close() {
    if (this.closed) return; this.closed = true;
    this.abort?.abort();
    this.win.removeEventListener('resize', this.reposition); this.win.removeEventListener('scroll', this.reposition, true); this.observer?.disconnect();
    this.doc.removeEventListener('keydown', this.keyHandler);
    this.o.storageEvents?.removeListener?.(this.storageListener);
    this.countAnimations?.forEach(a => a.cancel?.());
    this.board.clear(); this.boardEl.classList.remove('profile-board');
    for (const {node, inert} of this.inertNodes) node.inert = inert || false;
    this.o.stage.classList.remove('profile-active'); this.doc.body.classList.remove('has-profile');
    const shell = this.shell, caption = this.caption;
    const finish = () => { shell.remove(); caption.remove(); this.o.restoreBoard?.(); this.o.onClose?.(); };
    if (this.motion()) { shell.classList.add('profile-leaving'); caption.classList.add('profile-leaving'); this.win.setTimeout(finish, 240); } else finish();
  }
  positionShell() {
    if (this.closed) return;
    const {stage, boardWrap} = this.o;
    const mods = [...stage.querySelectorAll('.mod')].filter(mod => !['board', 'evalbar'].includes(mod.dataset.mod) && mod.getBoundingClientRect().width > 1 && this.win.getComputedStyle(mod).display !== 'none');
    const board = boardWrap.getBoundingClientRect();
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const mod of mods) { const r = mod.getBoundingClientRect(); left = Math.min(left, r.left); top = Math.min(top, r.top); right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom); }
    if (!mods.length || right - left < 220) { left = board.right + 16; top = board.top; right = Math.max(left + 360, this.win.innerWidth - 24); bottom = Math.max(board.bottom, top + 480); }
    const stacked = top >= board.bottom - 8 || left < board.left + 8 && right > board.right - 8 && top > board.top;
    // Beside the board, the deck spans the panel columns (the tabs, not the
    // bare controls row or the floating coach) and never rises above or drops
    // below the squares; the player bars sit outside.
    const squares = this.boardEl.getBoundingClientRect();
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
    if (!this.shell.contains(target) && target !== this.doc.body) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); this.go(this.index + 1); }
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); this.go(this.index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); this.go(0); }
    else if (event.key === 'End') { event.preventDefault(); this.go(this.deck.length - 1); }
    else if (event.key === 'Escape' && this.shell.contains(target)) { event.preventDefault(); this.o.requestClose?.(); }
  }

  /* ---------- data ---------- */
  async load() {
    if (!this.account) { this.renderChooser(); return; }
    this.abort?.abort(); this.abort = new AbortController();
    const signal = this.abort.signal;
    this.setStatus('Opening your games…');
    try {
      const data = await this.store.loadRows(this.site, this.account);
      if (signal.aborted) return;
      this.rows = data.rows; this.updatedAt = data.updatedAt; this.storedSince = data.since || 0;
      await this.loadEngine();
      if (signal.aborted) return;
      this.job = await this.store.loadJob();
      if (this.rows.length) this.rebuild();
      const since = periodStart(this.period);
      const fresh = this.updatedAt && Date.now() - this.updatedAt < REFRESH_MIN_MS && since >= this.storedSince;
      if (!fresh) await this.refresh(signal); else this.setStatus(null);
    } catch (error) {
      if (signal.aborted) return;
      this.rows.length ? this.setStatus(null) : this.renderError(error);
    }
  }
  async refresh(signal = this.abort?.signal) {
    const since = periodStart(this.period);
    this.refreshing = true;
    try {
      const data = await collectProfile({site: this.site, account: this.account, since, store: this.store, signal,
        onProgress: info => this.onCollectProgress(info)});
      if (signal?.aborted) return;
      this.rows = data.rows; this.updatedAt = data.updatedAt; this.storedSince = data.since || 0;
      await this.loadEngine();
      this.rebuild();
      this.setStatus(null);
    } catch (error) {
      if (signal?.aborted) return;
      if (this.rows.length) { this.setStatus(null); this.o.toast?.('Could not refresh: ' + error.message); } else this.renderError(error);
    } finally { this.refreshing = false; }
  }
  onCollectProgress(info) {
    if (info.phase === 'archives') this.setStatus('Looking up the archive…');
    else if (info.phase === 'month') this.setStatus(`Reading your games… ${info.done} of ${info.total} months${info.kept ? ` · ${fmt.int(info.kept)} games so far` : ''}`, info.total ? info.done / info.total : null);
    else if (info.phase === 'replay') this.setStatus(`Replaying your games… ${fmt.int(info.kept)} so far`);
    else if (info.phase === 'done') this.setStatus(null);
  }
  periodRows() { return periodRows(this.rows, this.period); }
  async loadEngine() {
    const ids = this.periodRows().map(r => r.id);
    const entries = await this.store.loadEngine(this.site, ids);
    this.engine = Object.fromEntries(Object.entries(entries).filter(([, e]) => e?.v === ENGINE_ENTRY_VERSION && e.acc != null));
  }
  engineStatus() {
    const job = this.job;
    if (job && job.site === this.site && job.account?.toLowerCase() === this.account.toLowerCase()) {
      if (job.status === 'running') return Date.now() - (job.updatedAt || 0) > STALE_JOB_MS ? 'stale' : 'running';
      if (job.status === 'done' && Object.keys(this.engine).length) return 'done';
    }
    return Object.keys(this.engine).length ? 'partial' : 'idle';
  }
  rebuild() {
    const rows = this.periodRows();
    const periodLabel = (PERIODS.find(p => p.id === this.period) || PERIODS[0]).label;
    const insights = buildInsights(rows, {engine: this.engine, includeBots: !!this.o.settings().profileIncludeBots});
    this.report = buildReport(rows, insights, {account: this.account, site: this.site, period: this.period, periodLabel, country: this.o.identity?.country || null});
    const budget = budgetById(this.budget);
    this.deck = buildDeck(this.report, {account: this.account, site: this.site, periodLabel, country: this.report.country, engineStatus: this.engineStatus(),
      engineBudgetLabel: `The ${budget.label.toLowerCase()} check looks at about ${budget.games} games and takes roughly ${budget.minutes} minutes.`});
    this.index = Math.min(this.index, this.deck.length - 1);
    this.renderSlide();
  }
  async onJobChange(job) {
    this.job = job;
    const mine = job && job.site === this.site && job.account?.toLowerCase() === this.account.toLowerCase();
    if (!mine) { this.renderEngineBlock(); return; }
    if (job.status === 'done' || job.status === 'cancelled' || job.status === 'error' || (job.done && job.done % 10 === 0)) { await this.loadEngine(); this.rebuild(); }
    else this.renderEngineBlock();
  }
  async startEngine() {
    const rows = this.periodRows();
    const budget = budgetById(this.budget);
    const ids = selectSample(rows, {games: budget.games, cached: new Set(Object.keys(this.engine)), rivalName: this.report?.opponents?.rival?.name || null});
    if (!ids.length) { this.o.toast?.('Every sampled game is already analysed.'); return; }
    const byId = new Map(rows.map(r => [r.id, r]));
    const workers = Math.max(1, Math.min(4, Number(this.o.settings().engineWorkers) || 1));
    const job = {site: this.site, account: this.account, budget: budget.id, workers, rows: ids.map(id => ({id, t: byId.get(id).t, me: byId.get(id).me}))};
    this.engineStarting = true; this.renderEngineBlock();
    let result;
    try { result = await this.o.sendMessage({type: 'profileEngine', action: 'start', job}); } catch (error) { result = {ok: false, reason: error?.message}; }
    this.engineStarting = false;
    if (!result?.ok) { this.o.toast?.(result?.reason === 'busy' ? 'An engine check is already running.' : 'The engine check could not start.'); this.renderEngineBlock(); return; }
    this.job = {status: 'running', site: this.site, account: this.account, total: ids.length, done: 0, startedAt: Date.now(), updatedAt: Date.now(), workers};
    this.renderEngineBlock();
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
    const accounts = [...new Set([...(this.o.identity?.accounts || []), this.account].filter(Boolean))];
    const accountSelect = h('select', {class: 'profile-select', 'aria-label': 'Player', onchange: e => { if (e.target.value === '__other') this.renderChooser(); else { this.account = e.target.value; this.index = 0; this.load(); } }},
      ...accounts.map(name => h('option', {value: name, selected: name === this.account}, name)), h('option', {value: '__other'}, 'Another player…'));
    const periodSelect = h('select', {class: 'profile-select', 'aria-label': 'Period', onchange: e => { this.period = e.target.value; this.o.writeSettings?.({profilePeriod: this.period}); this.index = 0; if (periodStart(this.period) < this.storedSince) this.load(); else { this.loadEngine().then(() => this.rebuild()); } }},
      ...PERIODS.map(p => h('option', {value: p.id, selected: p.id === this.period}, p.label)));
    const siteSeg = h('div', {class: 'profile-seg', role: 'group', 'aria-label': 'Site'},
      ...[['chesscom', 'Chess.com'], ['lichess', 'Lichess']].map(([id, label]) => h('button', {type: 'button', class: id === this.site ? 'on' : '', 'aria-pressed': String(id === this.site), onclick: () => { if (this.site === id) return; this.site = id; this.account = this.o.identity?.accountsBySite?.[id]?.[0] || ''; this.index = 0; this.renderHead(); this.load(); }}, label)));
    this.head.append(h('div', {class: 'profile-head-main'}, h('span', {class: 'profile-eyebrow'}, 'Player profile'), h('div', {class: 'profile-controls'}, accountSelect, periodSelect, siteSeg)),
      h('button', {type: 'button', class: 'profile-icon-button', 'aria-label': 'Refresh games', title: 'Refresh', onclick: () => { if (!this.refreshing && this.account) { this.abort?.abort(); this.abort = new AbortController(); this.refresh(this.abort.signal); } }}, h('span', {html: this.o.icon('flip')})));
  }
  setStatus(text, fraction = null) {
    if (this.closed) return;
    this.statusBar.hidden = !text;
    if (!text) return;
    this.statusBar.querySelector('.profile-status-text').textContent = text;
    const bar = this.statusBar.querySelector('.profile-status-bar i');
    bar.style.width = fraction == null ? '' : Math.round(100 * fraction) + '%';
    this.statusBar.classList.toggle('indeterminate', fraction == null);
    if (!this.deck.length) this.slideHost.replaceChildren(this.h('div', {class: 'profile-empty'}, this.h('div', {class: 'profile-spinner', 'aria-hidden': 'true'}), this.h('p', {}, text), this.h('p', {class: 'profile-muted'}, 'Finished months are kept locally, so the next visit is instant.')));
  }
  renderChooser() {
    const {h} = this;
    this.deck = []; this.board.cover(null, null); this.caption.textContent = '';
    this.nav.replaceChildren();
    const input = h('input', {type: 'text', class: 'profile-input', placeholder: this.site === 'lichess' ? 'Lichess username' : 'Chess.com username', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Username', maxlength: '30'});
    const go = () => { const name = input.value.trim(); if (!/^[\w-]{2,30}$/.test(name)) { input.focus(); input.classList.add('invalid'); return; } this.account = name; this.index = 0; this.renderHead(); this.load(); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    this.slideHost.replaceChildren(h('div', {class: 'profile-empty profile-chooser'}, h('span', {class: 'profile-eyebrow'}, 'Whose profile?'), h('h2', {}, 'Choose a player'),
      h('p', {}, `Any public ${this.site === 'lichess' ? 'Lichess' : 'Chess.com'} account works. Your own account is detected automatically once you open one of your games.`),
      h('div', {class: 'profile-chooser-row'}, input, h('button', {type: 'button', class: 'profile-button primary', onclick: go}, 'Build profile')),
      h('p', {class: 'profile-muted'}, 'Games are fetched from the public API straight to this browser and kept locally. Nothing is sent anywhere else.')));
    this.statusBar.hidden = true;
    input.focus();
  }
  renderError(error) {
    const {h} = this;
    this.deck = []; this.nav.replaceChildren(); this.statusBar.hidden = true;
    this.slideHost.replaceChildren(h('div', {class: 'profile-empty'}, h('h2', {}, 'Could not load this profile'), h('p', {}, error?.message || String(error)),
      h('div', {class: 'profile-chooser-row'}, h('button', {type: 'button', class: 'profile-button primary', onclick: () => this.load()}, 'Try again'), h('button', {type: 'button', class: 'profile-button', onclick: () => this.renderChooser()}, 'Choose another player'))));
  }

  /* ---------- slides ---------- */
  go(index) {
    if (!this.deck.length) return;
    const next = Math.max(0, Math.min(this.deck.length - 1, index));
    if (next === this.index) return;
    this.direction = next > this.index ? 1 : -1;
    this.index = next; this.renderSlide();
  }
  renderSlide() {
    if (this.closed || !this.deck.length) return;
    const {h} = this, slide = this.deck[this.index];
    this.countAnimations?.forEach(a => a.cancel?.()); this.countAnimations = [];
    const article = h('article', {class: 'profile-slide', 'data-slide': slide.id, 'data-direction': this.direction > 0 ? 'next' : 'prev'});
    article.append(h('span', {class: 'profile-eyebrow'}, slide.eyebrow));
    const title = h('h2', {class: 'profile-title'}, slide.title);
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
    this.showBoard(slide.board);
    this.countUp(article);
    this.slideHost.scrollTop = 0;
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
    const ns = 'http://www.w3.org/2000/svg', svg = this.doc.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 320 90'); svg.setAttribute('class', 'profile-series'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Rating over time');
    const all = entries.flatMap(([, s]) => s.map(p => p.r)), min = Math.min(...all), max = Math.max(...all), t0 = Math.min(...entries.flatMap(([, s]) => s.map(p => p.t))), t1 = Math.max(...entries.flatMap(([, s]) => s.map(p => p.t)));
    const x = t => 6 + 308 * (t1 > t0 ? (t - t0) / (t1 - t0) : 0.5), y = r => 80 - 70 * (max > min ? (r - min) / (max - min) : 0.5);
    entries.forEach(([cls, s], i) => {
      const path = this.doc.createElementNS(ns, 'path');
      path.setAttribute('d', s.map((p, j) => (j ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.r).toFixed(1)).join(' '));
      path.setAttribute('class', 'profile-series-line series-' + i); path.setAttribute('data-class', cls);
      svg.append(path);
    });
    const legend = h('div', {class: 'profile-series-legend'}, ...entries.map(([cls], i) => h('span', {class: 'series-' + i}, cls)), h('span', {class: 'profile-muted'}, `${min} – ${max}`));
    return h('div', {class: 'profile-series-wrap'}, svg, legend);
  }
  renderOpenings(openings) {
    const {h} = this;
    const column = (label, list) => h('div', {class: 'profile-openings-col'}, h('span', {class: 'profile-openings-head'}, label), ...(list.length ? list.map(o => h('div', {class: 'profile-opening'},
      h('span', {class: 'profile-opening-name'}, o.name), h('span', {class: 'profile-opening-meta'}, `${o.games} · ${fmt.pct(o.winRate)}`), h('i', {class: 'profile-opening-bar', style: {'--win': (o.winRate || 0) + '%'}}))) : [h('p', {class: 'profile-muted'}, 'No games.')]));
    return h('div', {class: 'profile-openings'}, column('As White', openings.w), column('As Black', openings.b));
  }
  renderEngineBlock() {
    if (!this.engineBlock || this.closed || this.shared) return;
    const {h} = this, status = this.engineStatus(), job = this.job, budget = budgetById(this.budget);
    const block = this.engineBlock; block.replaceChildren();
    if (status === 'running' || this.engineStarting) {
      const done = job?.done || 0, total = job?.total || 0, perGame = job?.perGameMs;
      const left = perGame && total ? Math.max(0, Math.round((total - done) * perGame / 60000)) : null;
      block.append(h('div', {class: 'profile-engine-progress'}, h('div', {class: 'profile-status-bar'}, h('i', {style: {width: total ? Math.round(100 * done / total) + '%' : '0%'}})),
        h('span', {}, this.engineStarting ? 'Starting the engine…' : `Engine check ${done} of ${total} games${left != null ? ` · about ${left} min left` : ''}${job?.failed ? ` · ${job.failed} skipped` : ''}`)),
        h('button', {type: 'button', class: 'profile-button', onclick: () => this.cancelEngine()}, 'Cancel'));
      return;
    }
    if (status === 'done' && this.deck[this.index]?.id !== 'trend') return;
    const label = status === 'stale' ? 'Resume engine check' : status === 'partial' || status === 'done' ? 'Run another engine check' : 'Run engine check';
    const seg = h('div', {class: 'profile-seg', role: 'group', 'aria-label': 'Engine budget'}, ...BUDGETS.map(b => h('button', {type: 'button', class: b.id === this.budget ? 'on' : '', 'aria-pressed': String(b.id === this.budget), onclick: () => { this.budget = b.id; this.o.writeSettings?.({profileBudget: b.id}); this.renderEngineBlock(); }}, `${b.label} · ≈${b.minutes} min`)));
    block.append(h('div', {class: 'profile-engine-row'}, h('button', {type: 'button', class: 'profile-button primary', onclick: () => this.startEngine()}, label), seg),
      h('p', {class: 'profile-muted'}, `${status === 'stale' ? 'The last check stopped early; finished games are kept. ' : ''}Runs the bundled Stockfish at depth 8 on about ${budget.games} games, locally, while you keep using the browser. Results are estimates and are cached per game.${job?.status === 'error' && job.site === this.site ? ' The previous run hit an error: ' + (job.error || 'unknown') + '.' : ''}`));
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
  cardCanvas() {
    const r = this.report, canvas = this.doc.createElement('canvas');
    const classes = Object.entries(r.ratings || {}).sort((a, b) => b[1].games - a[1].games)[0];
    const fav = [...(r.openings?.w?.top || []), ...(r.openings?.b?.top || [])].sort((a, b) => b.games - a.games)[0];
    const pieceImages = {};
    for (const img of this.boardEl.querySelectorAll('.sq .profile-piece')) { const name = this.board.nameOf(img.closest('.sq')); if (name && img.complete && img.naturalWidth) pieceImages[name] = img; }
    drawCard(canvas, {account: r.account, periodLabel: r.periodLabel, site: r.site, totals: r.totals, twin: r.twin ? `${r.twin.winner.name}, ${r.twin.winner.tagline.toLowerCase()}` : null,
      opening: fav ? `${fav.name} (${fmt.pct(fav.winRate)} wins)` : null, rival: r.opponents?.rival ? `${r.opponents.rival.name}, ${r.opponents.rival.w}–${r.opponents.rival.l}–${r.opponents.rival.d}` : null,
      rating: classes ? `${classes[0]} ${classes[1].end} (peak ${classes[1].peak.rating})` : null, theme: this.o.settings().theme === 'light' ? 'light' : 'dark', pieceImages});
    return canvas;
  }
  downloadCard() {
    if (!this.report) return;
    try {
      const canvas = this.cardCanvas();
      const a = this.doc.createElement('a'); a.download = `chess-review-profile-${this.report.account}.png`; a.href = canvas.toDataURL('image/png');
      this.doc.body.append(a); a.click(); a.remove();
    } catch { this.o.toast?.('Could not create the card'); }
  }

  /* ---------- board ---------- */
  showBoard(spec) {
    if (!spec) { this.board.clear(); this.caption.textContent = ''; return; }
    const B = this.board;
    this.caption.replaceChildren(this.h('span', {}, spec.caption || ''));
    switch (spec.kind) {
      case 'cover': B.cover(spec.white, spec.black); break;
      case 'fen': B.fen(spec.fen, {mate: !!spec.mate}); break;
      case 'moves': {
        const replay = this.h('button', {type: 'button', class: 'profile-caption-button', onclick: () => B.moves(spec.moves, {from: spec.from || 0, onStep: step})}, 'Replay');
        const step = (move, i, total) => { counter.textContent = `${Math.ceil(i / 2)}${i % 2 ? '.' : '…'} ${move.san}`; if (i === total) replay.hidden = false; };
        const counter = this.h('span', {class: 'profile-caption-move tnum'});
        replay.hidden = true; this.caption.append(counter, replay);
        B.moves(spec.moves, {from: spec.from || 0, onStep: step});
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
      case 'card': try { B.card(this.cardCanvas()); } catch { B.cover(null, null); } break;
      default: B.clear();
    }
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
