// Shared Story workspace behavior for chart scenes, season data and chapter restoration.
import {ProfileWorkspace} from '../workspace.js';
import {fmt} from '../deck.js';
import {classLabel} from '../insights.js';
import {createViz} from './board-viz.js';
import {seasonStats, seasonSlide} from './season.js';
import {periodStart, customPeriodBounds} from '../collector.js';

const SITE_LABELS = {chesscom: 'Chess.com', lichess: 'Lichess'};
/** The second site's rating line: a warm amber that stands apart from every chapter hue's cool or green line. */
const OTHER_LINE = 'oklch(.74 .14 65)';
/** Board charts that can change in place when only the time control changes. */
const MORPHS = new Set(['columns', 'bubbles', 'pie']);
/** Of those, the charts that also change in place when the chapter's own view changes (the endings' Wins · Losses · Draws). */
const VIEW_MORPHS = new Set(['pie']);

export class DesignWorkspace extends ProfileWorkspace {
  static design = 'classic';
  /** Chapters added to the report's standard deck. */
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
    // Reopening goes straight back to the deck the player was reading;
    // a remembered deck is rebuilt in place, an older one loads again first.
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
  humanRows() { return this.deckRows().filter(r => this.o.settings().profileIncludeBots || !r.bot); }
  /** The chosen period's bounds in seconds, so the season shows every month of it. */
  periodBounds() {
    if (this.period === 'custom') { const b = customPeriodBounds(this.customPeriod); return b ? {from: b.start, to: b.end - 1} : {}; }
    const from = periodStart(this.period);
    return {from: from > 0 ? from : null, to: Math.floor(Date.now() / 1000)};
  }
  decorateDeck(deck) {
    const extras = this.constructor.extraSlides;
    if (!extras.length || deck.length < 2) return deck;
    this.season = this.shared ? null : seasonStats(this.humanRows(), this.periodBounds());
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
    const slide = this.deck[this.index];
    const drawn = !options?.game && !this.isGameMapView() && slide && spec ? this.sceneFor(slide, spec) : spec;
    // The same chapter redrawn with the same kind of chart (a new time control, or another player from Compare):
    // the dots and columns change in place instead of leaving and coming back.
    const who = this.selectionKey();
    const morph = !!(drawn?.scene && MORPHS.has(drawn.scene.type) && this.viz?.layer?.isConnected && this.vizSlide === slide?.id && (this.vizCls !== this.cls || this.vizWho !== who || VIEW_MORPHS.has(drawn.scene.type)) && this.viz.layer.dataset.scene === drawn.scene.type);
    // A regrouped chart (the clock's granularity switch) splits the columns already on the board.
    const regroup = !!(drawn?.scene?.regroup && drawn.scene.type === 'columns' && this.viz?.layer?.isConnected && this.vizSlide === slide?.id && this.viz.layer.dataset.scene === 'columns');
    // A running accuracy check redraws its line in place as games come in, without fading out and back.
    const live = !!(drawn?.scene?.type === 'line' && drawn.scene.live && this.viz?.layer?.isConnected && this.vizSlide === slide?.id && this.viz.layer.dataset.live === 'on');
    if (!morph && !regroup && !live) this.viz?.clear();
    this.vizSlide = null;
    if (this.isGameMapView() && !options?.game) { super.showBoard({kind: 'games'}, options); return; }
    super.showBoard(drawn && drawn.scene ? {...drawn, kind: drawn.kind || 'blank'} : drawn, options);
    if (!drawn?.scene || !this.boardEl) { this.viz?.clear(); return; }
    if (this.viz?.board !== this.boardEl) { this.viz = createViz(this.boardEl, {doc: this.doc, motion: this.motion}); this.viz.board = this.boardEl; }
    this.drawScene({...drawn.scene, regroup}, {morph: morph || live});
    this.vizSlide = slide?.id ?? null; this.vizCls = this.cls; this.vizWho = who;
    if (drawn.scene.legend) {
      const legend = this.sceneLegend(drawn.scene.legend);
      // A key naming lines takes the chart's own colour for its first dot.
      if (drawn.scene.color) legend.style.setProperty('--pv-c', drawn.scene.color);
      // Labels under the board (columns standing on its edge) push the key down below them.
      if (this.viz.layer?.outside?.classList.contains('pv-columns-below')) legend.classList.add('pv-legend-below');
      this.caption.append(legend);
    }
  }
  /** A key under the board: [dot class, text, colour?] items; a null class is a heading with no dot. */
  sceneLegend(items) {
    const {h} = this;
    const dot = (cls, color) => { const i = h('i', {class: 'pv-legend-dot' + (cls ? ' ' + cls : '')}); if (color) i.style.background = color; return i; };
    return h('p', {class: 'pv-legend'}, ...items.flatMap(([cls, text, color]) => cls === null ? [h('span', {class: 'pv-legend-head'}, text)] : [dot(cls, color), text]));
  }
  drawScene(scene, {morph = false} = {}) {
    const V = this.viz;
    switch (scene.type) {
      case 'columns': V.columns(scene.columns, {...scene, morph}); break;
      case 'pairs': V.pairs(scene.items, scene); break;
      case 'bubbles': V.bubbles(scene.matrix, {...scene, morph}); break;
      case 'results': V.results(scene.columns, scene); break;
      // Settings → Visual → Accuracy over time: "Average line" skips drawing every game first.
      case 'line': V.line(scene.series, {...scene, morph, games: this.o.settings().profileAccuracyAnimation === 'average' ? null : scene.games}); break;
      case 'pie': V.pie(scene.slices, {...scene, morph}); break;
    }
  }
  unmountBoard() { this.viz?.clear(); this.viz = null; super.unmountBoard(); }
  // Closing hands the squares back without unmounting them: the chart goes too, with its tags beside the board.
  close() { this.viz?.clear(); this.viz = null; return super.close(); }

  /* ---------- shared scene builders ---------- */
  /**
   * The rating line, with its values and months beside the board. A profile of
   * both sites draws the other site's rating in the same time control as a
   * second line, and a key under the board names the two.
   */
  ratingScene(slide) {
    const R = this.report, r = R?.ratings?.[slide.ratingClass];
    if (!r || r.series.length < 2) return null;
    const other = R.otherRatingSite && R.otherRatings?.[slide.ratingClass]?.series?.length >= 2 ? R.otherRatings[slide.ratingClass].series : null;
    const extra = other ? [{series: other, name: SITE_LABELS[R.otherRatingSite], color: OTHER_LINE}] : [];
    const first = Math.min(r.series[0].t, other?.[0].t ?? Infinity), last = Math.max(r.series.at(-1).t, other?.at(-1).t ?? -Infinity);
    return {kind: 'blank', me: 'w', caption: `${classLabel(slide.ratingClass)} rating${other ? ` on ${SITE_LABELS[R.ratingSite]} and ${SITE_LABELS[R.otherRatingSite]}` : ''} across the board: left is ${fmt.shortDate(first)}, right is ${fmt.shortDate(last)}.`,
      scene: {type: 'line', series: r.series, peak: {t: r.peak.t, r: r.peak.rating}, label: classLabel(slide.ratingClass), tag: false, extra, axes: true,
        legend: other ? [['pv-legend-line', SITE_LABELS[R.ratingSite]], ['pv-legend-line', SITE_LABELS[R.otherRatingSite], OTHER_LINE]] : null}};
  }
  /* ---------- helpers for design panels ---------- */
  countUpNodes(nodes) {
    if (!this.motion()) return;
    this.countAnimations ||= [];
    for (const node of nodes) {
      const text = node.textContent, match = /^([+−-]?)(\d[\d,]*)(\.\d+)?(.*)$/.exec(text);
      // Clock times ("18:00–21:00") are not amounts: they appear as they are.
      if (!match || /^\d+:\d\d/.test(text)) continue;
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
  /** The rating slide is rebuilt for the chosen mode. */
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
    if (!slide.ratingChoices?.length) return null;
    return h('div', {class: 'pv-modes', role: 'group', 'aria-label': 'Rating game mode'}, ...slide.ratingChoices.map(choice =>
      h('button', {type: 'button', class: choice.id === slide.ratingClass ? 'on' : '', 'aria-pressed': String(choice.id === slide.ratingClass),
        onclick: () => { this.ratingClass = choice.id; onPick(); }}, choice.label)));
  }
  evidenceLink(slide, cls = 'pv-link') {
    return super.evidenceLink(slide, cls);
  }
  engineSlot(slide) {
    if (slide.pending === 'engine' || slide.id === 'trend') { this.engineBlock = this.h('div', {class: 'profile-engine'}); return this.engineBlock; }
    this.engineBlock = null; return null;
  }
}
