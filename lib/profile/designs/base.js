// Player profile designs — the shared base. Every design is the same workspace
// (data, engine job, share, board ownership) with its own panel and its own
// board scenes. Classic is this base unchanged; the others override
// renderFrame/renderSlide/renderNav and `sceneFor`. Switching design while the
// profile is open reopens it on the same chapter (`options.resume`).
import {ProfileWorkspace} from '../workspace.js';
import {fmt} from '../deck.js';
import {classLabel, TERM_LABELS} from '../insights.js';
import {createViz} from './board-viz.js';
import {seasonStats, seasonSlide} from './season.js';

export class DesignWorkspace extends ProfileWorkspace {
  static design = 'classic';
  /** Chapters this design adds to the classic deck (see decorateDeck). */
  static extraSlides = [];
  constructor(options) {
    super(options);
    this.design = this.constructor.design;
    this.resumeSlide = options.resume?.slideId || null;
  }
  renderFrame() {
    this.shell.dataset.design = this.design;
    this.caption.dataset.design = this.design;
    super.renderFrame();
  }
  async open() {
    await super.open();
    // A design switch reopens straight into the deck the player was reading.
    if (this.resumeSlide && !this.shared && this.ready()) this.load();
  }
  rebuild() {
    super.rebuild();
    if (this.resumeSlide && this.deck.length) {
      const index = this.deck.findIndex(slide => slide.id === this.resumeSlide);
      this.resumeSlide = null;
      if (index > 0) { this.direction = 1; this.index = index; this.renderSlide({animate: false}); }
    }
  }
  /** Rows of the current period with the same bot rule as the insights. */
  humanRows() { return this.periodRows().filter(r => this.o.settings().profileIncludeBots || !r.bot); }
  decorateDeck(deck) {
    const extras = this.constructor.extraSlides;
    if (!extras.length || deck.length < 2) return deck;
    this.season = this.shared ? null : seasonStats(this.humanRows());
    const days = {Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday'};
    const out = deck.map(slide => slide.id === 'habits' && /^(Mon|Tue|Wed|Thu|Fri) player$/.test(slide.title) ? {...slide, title: days[slide.title.slice(0, 3)] + ' player'} : slide);
    if (extras.includes('season')) {
      const slide = seasonSlide(this.season);
      if (slide) out.splice(Math.max(1, out.findIndex(s => s.id === 'numbers') + 1), 0, slide);
    }
    return out;
  }

  /* ---------- board scenes ---------- */
  /** The spec the board draws for a slide; designs return {kind, scene} to chart on the squares. */
  sceneFor(slide, spec) { return spec?.scene ? spec : spec; }
  /** `options` belong to the workspace (for example the twin portrait) and pass through untouched. */
  showBoard(spec, options) {
    this.viz?.clear();
    const slide = this.deck[this.index];
    const drawn = slide && spec ? this.sceneFor(slide, spec) : spec;
    super.showBoard(drawn && drawn.scene ? {...drawn, kind: drawn.kind || 'blank'} : drawn, options);
    if (!drawn?.scene || !this.boardEl) return;
    if (this.viz?.board !== this.boardEl) { this.viz = createViz(this.boardEl, {doc: this.doc, motion: this.motion}); this.viz.board = this.boardEl; }
    this.drawScene(drawn.scene);
  }
  drawScene(scene) {
    const V = this.viz;
    switch (scene.type) {
      case 'columns': V.columns(scene.columns, scene); break;
      case 'line': V.line(scene.series, scene); break;
      case 'share': V.share(scene.value, scene); break;
      case 'badge': break;
    }
    if (scene.badge) V.badge(scene.badge);
  }
  unmountBoard() { this.viz?.clear(); this.viz = null; super.unmountBoard(); }

  /* ---------- shared scene builders ---------- */
  ratingScene(slide) {
    const r = this.report?.ratings?.[slide.ratingClass];
    if (!r || r.series.length < 2) return null;
    return {kind: 'blank', me: 'w', caption: `${classLabel(slide.ratingClass)} rating across the board: left is ${fmt.shortDate(r.series[0].t)}, right is ${fmt.shortDate(r.series.at(-1).t)}.`,
      scene: {type: 'line', series: r.series, peak: {t: r.peak.t, r: r.peak.rating}, label: classLabel(slide.ratingClass)}};
  }
  endingsScene() {
    const X = this.report?.terminations;
    if (!X) return null;
    const groups = (m, keys) => keys.map(k => m[k] || 0);
    const other = (m, keys) => Object.entries(m).filter(([k]) => !keys.includes(k)).reduce((s, [, n]) => s + n, 0);
    const keys = ['mate', 'resign', 'time'];
    const wins = [...groups(X.wins, keys), other(X.wins, keys)], losses = [...groups(X.losses, keys), other(X.losses, keys)];
    const labels = ['Mate', 'Resign', 'Time', 'Other'];
    const columns = [...wins.map((n, i) => ({value: n, label: labels[i], color: 'var(--q-best)', detail: `Won by ${i < 3 ? TERM_LABELS[keys[i]] : 'other means'}: ${n}`})),
      ...losses.map((n, i) => ({value: n, label: labels[i], color: 'var(--q-miss)', detail: `Lost by ${i < 3 ? TERM_LABELS[keys[i]] : 'other means'}: ${n}`}))];
    return {kind: 'blank', me: 'w', caption: 'How your games end: wins on the left (green), losses on the right (coral), by checkmate, resignation, time and the rest.', scene: {type: 'columns', columns}};
  }
  formatsScene() {
    const byClass = Object.entries(this.report?.totals?.byClass || {}).sort((a, b) => b[1].games - a[1].games).slice(0, 4);
    if (byClass.length < 2) return null;
    return {kind: 'blank', me: 'w', caption: 'Each column pair is a time control: games played, and the share of them you won.', scene: {type: 'columns', columns: byClass.flatMap(([cls, s]) => [
      {value: s.games, label: classLabel(cls).slice(0, 5), tone: s.score, detail: `${classLabel(cls)}: ${fmt.plural(s.games, 'game')}`},
    ])}};
  }

  /* ---------- helpers for design panels ---------- */
  countUpNodes(nodes) {
    if (!this.motion()) return;
    this.countAnimations ||= [];
    for (const node of nodes) {
      const text = node.textContent, match = /^([+-−]?)(\d[\d,]*)(\.\d+)?(.*)$/.exec(text);
      if (!match) continue;
      const target = Number(match[2].replace(/,/g, '')) + Number(match[3] || 0), decimals = match[3] ? match[3].length - 1 : 0, prefix = match[1], suffix = match[4];
      const start = this.win.performance.now(), duration = 1000;
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
  /** Board key that also follows the rating mode, so switching mode redraws the chart. */
  boardKeyFor(slide) { return JSON.stringify([slide.id, slide.board, slide.ratingClass || null, slide.id === 'share' ? this.report : null]); }
  syncBoard(slide) {
    const key = this.boardKeyFor(slide);
    if (key !== this.boardSpecKey) { this.boardSpecKey = key; this.showBoard(slide.board); }
  }
  /** The rating slide is rebuilt for the chosen mode, as in the classic deck. */
  currentSlide() {
    const slide = this.deck[this.index];
    if (slide?.id === 'rating' && this.report && this.ratingClass && slide.ratingClass !== this.ratingClass) {
      const fresh = this.decorateRating(slide);
      if (fresh) this.deck[this.index] = fresh;
    }
    return this.deck[this.index];
  }
  decorateRating(slide) {
    const cls = this.ratingClass, r = this.report.ratings?.[cls];
    if (!r) return null;
    return {...slide, ratingClass: cls, title: `${classLabel(cls)}: ${fmt.signed(r.change)}`, lead: `From ${r.start} to ${r.end}, peaking at ${r.peak.rating} on ${fmt.date(r.peak.t)}.`,
      stats: [{label: 'Current rating', value: String(r.end)}, {label: 'Peak rating', value: String(r.peak.rating)}, {label: 'Rated games', value: fmt.int(r.games)}],
      bullets: [r.bestMonth && r.bestMonth.delta > 0 ? `Best month: ${fmt.month(r.bestMonth.month)}, ${fmt.signed(r.bestMonth.delta)} over ${r.bestMonth.games} games.` : null].filter(Boolean),
      series: {[cls]: r.series}, evidence: r.peak ? {label: 'Open the game that set your peak', url: r.peak.url, id: r.peak.id, t: r.peak.t} : null,
      board: {kind: 'fen', fen: r.peak.fen, me: r.peak.me, caption: 'The final position of your peak-rating game.'}};
  }
  /** Mode switcher for the rating chapter, shared by the designs. */
  ratingModes(slide, onPick) {
    const {h} = this;
    if (!slide.ratingChoices || slide.ratingChoices.length < 2) return null;
    return h('div', {class: 'pv-modes', role: 'group', 'aria-label': 'Rating game mode'}, ...slide.ratingChoices.map(choice =>
      h('button', {type: 'button', class: choice.id === slide.ratingClass ? 'on' : '', 'aria-pressed': String(choice.id === slide.ratingClass),
        onclick: () => { this.ratingClass = choice.id; onPick(); }}, choice.label)));
  }
  evidenceLink(slide, cls = 'pv-link') {
    if (!slide.evidence?.url) return null;
    return this.h('a', {class: cls, href: slide.evidence.url, target: '_blank', rel: 'noopener noreferrer'}, slide.evidence.label, this.h('span', {'aria-hidden': 'true'}, ' ↗'));
  }
  engineSlot(slide) {
    if (slide.pending === 'engine' || slide.id === 'trend') { this.engineBlock = this.h('div', {class: 'profile-engine'}); return this.engineBlock; }
    this.engineBlock = null; return null;
  }
}
