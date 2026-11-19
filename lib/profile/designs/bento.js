// Player profile — "Dashboard" design. Everything at a glance: the panel is a
// grid of quiet tiles, each one number, one label and one small chart. The
// board is a live companion: while you look at the grid it shows your last 64
// days (one square per day); hovering a tile previews that chapter on the
// board; clicking opens the chapter as a calm detail page with its own
// previous/next and a way back to the grid.
import {DesignWorkspace} from './base.js';
import {fmt} from '../deck.js';
import {classLabel, WEEKDAYS} from '../insights.js';
import {scoreColor} from './board-viz.js';
import {monthShort, formats} from './season.js';

const SVG = 'http://www.w3.org/2000/svg';
const PREVIEW_MS = 140;

export class BentoWorkspace extends DesignWorkspace {
  static design = 'bento';
  static extraSlides = ['season'];

  decorateDeck(deck) {
    const out = super.decorateDeck(deck);
    if (out.length < 2) return out;
    // The grid replaces the cover; it is chapter 0 and the place every chapter returns to.
    const cover = out.find(s => s.id === 'cover');
    return [{id: 'overview', eyebrow: 'Overview', title: this.account, lead: cover?.lead || '', country: cover?.country, board: {kind: 'blank', me: 'w', overview: true, caption: ''}}, ...out.filter(s => s.id !== 'cover')];
  }
  sceneFor(slide, spec) {
    const R = this.report;
    switch (slide.id) {
      case 'overview': return this.daysScene() || {kind: 'cover', white: null, black: null, caption: 'Your games, one board.'};
      case 'numbers': return {...spec, scene: {type: 'badge', badge: {value: fmt.int(R.totals.games), label: 'games', sub: `${fmt.pct(R.totals.winRate)} won`}}};
      case 'rating': return this.ratingScene(slide) || spec;
      case 'endings': return this.endingsScene() || spec;
      case 'rival': { const r = R.opponents?.rival; return r ? {kind: 'fill', total: r.games, wins: r.w, draws: r.d, caption: `Every game against ${r.name}, one slice per square: green wins, coral losses.`, scene: {type: 'badge', badge: {value: `${r.w}–${r.l}`, label: r.name}}} : spec; }
      case 'clock': { const C = R.clock; return C?.snapShare != null ? {kind: 'blank', me: 'w', caption: 'Lit squares are the share of your moves made in under five seconds.', scene: {type: 'share', value: C.snapShare, badge: {value: fmt.pct(C.snapShare), label: 'moves under 5 s'}}} : spec; }
      default: return spec;
    }
  }
  /** One square per day for the last 64 days, oldest top-left: brightness is games, colour is results. */
  daysScene() {
    const cal = this.season?.calendar;
    if (!cal?.length) return null;
    const days = cal.slice(-64), max = Math.max(1, ...days.map(d => d.games));
    return {kind: 'blank', me: 'w', caption: 'Your last 64 days, one square each, oldest at the top left. Brighter squares had more games; greener ones more wins.',
      scene: {type: 'days', days: days.map(d => ({key: d.key, games: d.games, level: d.games ? .35 + .65 * Math.sqrt(d.games / max) : 0, color: d.games ? scoreColor(100 * d.w / d.games) : null,
        detail: `${new Date(d.key + 'T12:00:00').toLocaleDateString('en-US', {weekday: 'short', day: 'numeric', month: 'short'})}: ${d.games ? fmt.plural(d.games, 'game') + `, ${d.w} won` : 'no games'}`}))}};
  }
  drawScene(scene) {
    if (scene.type !== 'days') return super.drawScene(scene);
    const L = this.viz.share(0); L.classList.add('pv-days');
    [...L.querySelectorAll('.pv-tile')].forEach((tile, i) => {
      const day = scene.days[i + scene.days.length - 64] || null;
      if (!day) { tile.remove(); return; }
      tile.style.setProperty('--f', day.games ? '1' : '0');
      tile.style.setProperty('--c', day.color || 'transparent');
      tile.style.setProperty('--o', String(day.level));
      tile.title = day.detail;
      const date = new Date(day.key + 'T12:00:00'), no = this.doc.createElement('span');
      no.className = 'pv-day-no'; no.textContent = date.getDate() === 1 ? date.toLocaleDateString('en-US', {month: 'short'}) : String(date.getDate());
      tile.append(no); if (day.games) tile.dataset.lit = '';
    });
  }
  /** Show another chapter on the board while the grid stays the current view. */
  previewBoard(slide) {
    const index = this.index; this.index = this.deck.indexOf(slide);
    try { this.showBoard(slide.board); } finally { this.index = index; }
  }
  onKey(event) {
    if (event.key === 'Escape' && this.gameCounter?.isConnected) { super.onKey(event); return; }
    if (event.key === 'Escape' && this.index > 0 && this.phase === 'deck' && !event.defaultPrevented && this.shell.contains(event.target)) { event.preventDefault(); this.go(0); return; }
    super.onKey(event);
  }

  /* ---------- panel ---------- */
  renderSlide({animate = true, preserveScroll = false} = {}) {
    if (this.closed || !this.deck.length) return;
    this.win.clearTimeout(this.previewTimer);
    const slide = this.currentSlide();
    this.countAnimations?.forEach(a => a.cancel?.()); this.countAnimations = [];
    const scrollTop = this.slideHost.scrollTop;
    if (slide.id === 'overview') this.engineBlock = null;
    const view = slide.id === 'overview' ? this.grid(animate) : this.detail(slide, animate);
    this.slideHost.replaceChildren(view);
    this.renderEngineBlock();
    this.renderNav();
    this.syncBoard(slide);
    if (animate) this.countUpNodes(view.querySelectorAll('[data-count="on"]'));
    this.slideHost.scrollTop = slide.id === 'overview' && this.gridScroll != null ? this.gridScroll : preserveScroll ? scrollTop : 0;
  }
  go(index) {
    if (this.deck[this.index]?.id === 'overview') this.gridScroll = this.slideHost.scrollTop;
    super.go(index);
  }
  renderNav() {
    const {h} = this, slide = this.deck[this.index];
    this.nav.classList.add('pv-bento-nav');
    if (!slide || slide.id === 'overview') { this.nav.hidden = true; return; }
    this.nav.hidden = false;
    const prev = this.deck[this.index - 1], next = this.deck[this.index + 1];
    this.nav.replaceChildren(
      h('button', {type: 'button', class: 'pv-bento-step', disabled: !prev || prev.id === 'overview', onclick: () => this.go(this.index - 1)}, h('span', {html: this.o.icon('prev')}), h('span', {}, prev && prev.id !== 'overview' ? prev.eyebrow : '')),
      h('span', {class: 'pv-bento-count'}, `${this.index} of ${this.deck.length - 1}`),
      h('button', {type: 'button', class: 'pv-bento-step next', disabled: !next, onclick: () => this.go(this.index + 1)}, h('span', {}, next ? next.eyebrow : ''), h('span', {html: this.o.icon('next')})));
  }
  /* The grid: tiles in a fixed reading order; each one previews and opens its chapter. */
  grid(animate) {
    const {h} = this, R = this.report, T = R.totals, S = this.season;
    const find = id => this.deck.findIndex(s => s.id === id);
    const tiles = [];
    const tile = (id, size, ...content) => {
      const index = find(id);
      if (index < 0) return;
      const slide = this.deck[index];
      const node = h('button', {type: 'button', class: `pv-tile-card size-${size}`, 'data-chapter': id, 'aria-label': `${slide.eyebrow}: open chapter`,
        onclick: () => this.go(index),
        onpointerenter: () => this.preview(index), onfocus: () => this.preview(index)},
        ...content, h('span', {class: 'pv-tile-open', 'aria-hidden': 'true'}, '↗'));
      node.style.setProperty('--i', String(tiles.length));
      tiles.push(node);
    };
    const kicker = text => h('span', {class: 'pv-k'}, text);
    const big = (value, cls = '') => h('strong', {class: 'pv-big ' + cls, 'data-count': 'on'}, value);
    const note = text => h('span', {class: 'pv-note'}, text);

    tile('numbers', 'hero', kicker('Games'), h('div', {class: 'pv-hero-row'}, big(fmt.int(T.games)), h('span', {class: 'pv-hero-side'}, h('b', {}, fmt.pct(T.winRate)), ' won')),
      this.wdl(T), this.formatRows(T), note(`${fmt.hours(T.hours)} at the board · ${fmt.int(T.moves)} moves`));
    const ratingSlide = this.deck[find('rating')];
    const r = ratingSlide ? R.ratings?.[ratingSlide.ratingClass] : null;
    if (r) tile('rating', 'wide', kicker(`${classLabel(ratingSlide.ratingClass)} rating`), h('div', {class: 'pv-hero-row'}, big(String(r.end), 'md'),
      h('span', {class: 'pv-chip ' + (r.change >= 0 ? 'up' : 'down')}, fmt.signed(r.change))), this.spark(r.series), note(`Peak ${r.peak.rating} · ${fmt.shortDate(r.peak.t)}`));
    if (S) tile('season', 'wide', kicker('Season'), this.monthBars(S.months.slice(-12)), note(S.dayStreak?.length > 1 ? `${S.dayStreak.length} days in a row · ${fmt.int(S.activeDays)} active days` : `${fmt.int(S.activeDays)} active days`));
    if (R.twin) tile('twin', 'wide', kicker('Historical twin'), h('strong', {class: 'pv-name'}, R.twin.winner.name), note(R.twin.winner.tagline));
    const fav = [...(R.openings?.w?.top || []).map(o => ({...o, c: 'White'})), ...(R.openings?.b?.top || []).map(o => ({...o, c: 'Black'}))].sort((a, b) => b.games - a.games)[0];
    if (fav) tile('openings', 'wide', kicker('Favourite opening'), h('div', {class: 'pv-ring-row'}, this.ring(fav.winRate), h('div', {class: 'pv-ring-text'}, h('strong', {class: 'pv-name sm'}, fav.name), note(`${fav.c} · ${fmt.plural(fav.games, 'game')}`))));
    const rival = R.opponents?.rival;
    if (rival) tile('rival', 'wide', kicker('Rival'), h('strong', {class: 'pv-name sm'}, rival.name), this.wdl(rival, true), note(`${rival.w}–${rival.l}–${rival.d} in ${fmt.plural(rival.games, 'game')}`));
    const strongest = R.opponents?.strongestBeaten, streak = R.streaks?.win;
    if (strongest || streak) tile('hits', 'small', kicker(strongest ? 'Best win' : 'Win streak'), big(strongest ? String(strongest.rating) : String(streak.length), 'sm'), note(strongest ? `v. ${strongest.opp}${streak ? ` · ${streak.length} wins in a row` : ''}` : 'in a row'));
    if (R.signature?.habits?.length) tile('signature', 'small', kicker('Signature'), h('strong', {class: 'pv-name xs'}, R.signature.habits[0].label), note(R.signature.habits[0].id === 'checks' ? `${R.signature.habits[0].rate.toFixed(1)} per game` : `${Math.round(100 * R.signature.habits[0].rate)}% of games`));
    if (R.habits?.activeDays >= 5) tile('habits', 'wide', kicker('Your week'), this.heat(R.habits.matrix), note(R.habits.bestBand ? `Best hours ${R.habits.bestBand.label} · ${fmt.pct(R.habits.bestBand.winRate)} won` : `${fmt.int(R.habits.activeDays)} active days`));
    if (R.clock?.averageThink != null) tile('clock', 'small', kicker('Per move'), big(fmt.seconds(R.clock.averageThink), 'sm'), note(`${fmt.pct(R.clock.snapShare)} under 5 s`));
    if (R.terminations) tile('endings', 'small', kicker('Checkmates'), big(fmt.int(R.terminations.mates), 'sm'), note(`${R.terminations.flagWins} wins on time`));
    const E = R.engine;
    tile('trend', 'wide', kicker('Accuracy'), E ? h('div', {class: 'pv-hero-row'}, big(fmt.pct(E.average), 'md'), E.trend ? h('span', {class: 'pv-chip ' + (E.trend.late >= E.trend.early ? 'up' : 'down')}, `${fmt.pct(E.trend.early)} → ${fmt.pct(E.trend.late)}`) : null)
      : h('strong', {class: 'pv-name xs'}, 'Not checked yet'), note(E ? `Depth-8 estimate over ${fmt.plural(E.games, 'game')}` : 'Run a local engine check from this tile'));
    tile('swings', 'small', kicker('Comebacks'), big(fmt.int(R.material?.comebacks || 0), 'sm'), note('wins from 3+ down'));
    tile('share', 'small', kicker('Share'), h('strong', {class: 'pv-name xs'}, 'Your card'), note('Link or image'));

    const grid = h('div', {class: 'pv-bento' + (animate && this.motion() ? ' is-entering' : ''), onpointerleave: () => this.preview(0)}, ...tiles);
    const intro = h('div', {class: 'pv-bento-intro'}, h('p', {class: 'pv-quiet'}, R.periodLabel ? `${R.periodLabel} · hover a tile to see it on the board, click to open it.` : 'Hover a tile to see it on the board, click to open it.'));
    return h('div', {class: 'pv-bento-wrap'}, intro, grid);
  }
  preview(index) {
    this.win.clearTimeout(this.previewTimer);
    if (this.deck[this.index]?.id !== 'overview') return;
    this.previewTimer = this.win.setTimeout(() => {
      if (this.closed || this.deck[this.index]?.id !== 'overview') return;
      const slide = this.deck[index]; if (!slide) return;
      for (const card of this.slideHost.querySelectorAll('.pv-tile-card')) card.classList.toggle('previewing', card.dataset.chapter === slide.id && index > 0);
      const key = this.boardKeyFor(slide);
      if (key === this.boardSpecKey) return;
      this.boardSpecKey = key; this.previewBoard(slide);
    }, index ? PREVIEW_MS : PREVIEW_MS * 2);
  }
  /* Detail page: a calm column — kicker, figure, sentence, facts, the chapter's own widget. */
  detail(slide, animate) {
    const {h} = this;
    const article = h('article', {class: 'pv-detail', 'data-slide': slide.id, 'data-animate': animate && this.motion() ? 'on' : 'off'});
    const back = h('button', {type: 'button', class: 'pv-back', onclick: () => this.go(0)}, h('span', {class: 'pv-back-grid', 'aria-hidden': 'true'}, h('i'), h('i'), h('i'), h('i')), 'All stats');
    const top = h('div', {class: 'pv-detail-top'}, back);
    const modes = slide.id === 'rating' ? this.ratingModes(slide, () => this.renderSlide({animate: false, preserveScroll: true})) : null;
    if (modes) top.append(modes);
    article.append(top, h('span', {class: 'pv-k'}, slide.eyebrow));
    article.append(h('h2', {class: 'pv-detail-title'}, slide.title), h('p', {class: 'pv-detail-lead'}, slide.lead));
    if (slide.stats?.length) article.append(h('div', {class: 'pv-detail-stats'}, ...slide.stats.map(s => h('div', {class: 'pv-detail-stat' + (s.tone ? ' tone-' + s.tone : '')},
      h('strong', {'data-count': 'on'}, s.value), h('span', {}, s.label), s.sub ? h('small', {}, s.sub) : null))));
    if (slide.openings) article.append(this.renderOpenings(slide.openings));
    if (slide.twin) article.append(h('p', {class: 'pv-quiet'}, `${slide.twin.era}. Runner-up: ${slide.twin.runnerUp}.`));
    if (slide.bullets?.length) article.append(h('ul', {class: 'pv-detail-list'}, ...slide.bullets.map(t => h('li', {}, t))));
    if (slide.engineLine) article.append(h('p', {class: 'pv-quiet'}, slide.engineLine));
    const engine = this.engineSlot(slide); if (engine) article.append(engine);
    if (slide.id === 'share') article.append(this.renderShare());
    const link = this.evidenceLink(slide); if (link) article.append(link);
    return article;
  }

  /** Per time control and per colour, one quiet row each: name, games, win share as a bar. */
  formatRows(T) {
    const {h} = this;
    const rows = [...formats(this.report, 3).map(f => [f.label, f.games, f.winRate]),
      ...(T.byColor.w.games && T.byColor.b.games ? [['As White', T.byColor.w.games, T.byColor.w.winRate], ['As Black', T.byColor.b.games, T.byColor.b.winRate]] : [])];
    return h('div', {class: 'pv-format-rows'}, ...rows.map(([label, games, rate]) => {
      const bar = h('i'); bar.style.width = (rate || 0) + '%';
      return h('div', {class: 'pv-format-row'}, h('span', {}, label), h('small', {}, fmt.int(games)), h('span', {class: 'pv-format-bar'}, bar), h('b', {}, fmt.pct(rate)));
    }));
  }

  /* ---------- micro charts ---------- */
  svg(tag, attrs = {}) { const n = this.doc.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; }
  wdl(s, thin = false) {
    const {h} = this, bar = h('span', {class: 'pv-mini-wdl' + (thin ? ' thin' : ''), 'aria-hidden': 'true'});
    for (const [k, n] of [['w', s.w], ['d', s.d], ['l', s.l]]) if (n) { const seg = h('i', {class: k}); seg.style.flexGrow = String(n); bar.append(seg); }
    return bar;
  }
  spark(series) {
    const w = 220, hgt = 44, rs = series.map(p => p.r), lo = Math.min(...rs), hi = Math.max(...rs), t0 = series[0].t, t1 = series.at(-1).t;
    const x = t => 2 + (w - 4) * (t1 > t0 ? (t - t0) / (t1 - t0) : .5), y = r => hgt - 4 - (hgt - 8) * (hi > lo ? (r - lo) / (hi - lo) : .5);
    const d = series.map((p, i) => (i ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.r).toFixed(1)).join(' ');
    const svg = this.svg('svg', {viewBox: `0 0 ${w} ${hgt}`, class: 'pv-spark', preserveAspectRatio: 'none', 'aria-hidden': 'true'});
    svg.append(this.svg('path', {d: `${d} L${x(t1)} ${hgt} L${x(t0)} ${hgt} Z`, class: 'pv-spark-area'}), this.svg('path', {d, class: 'pv-spark-line'}));
    return svg;
  }
  monthBars(months) {
    const {h} = this, max = Math.max(1, ...months.map(m => m.games));
    return h('span', {class: 'pv-months', 'aria-hidden': 'true'}, ...months.map(m => {
      const bar = h('i', {title: `${monthShort(m.key)}: ${m.games}`}); bar.style.height = Math.max(4, 100 * m.games / max) + '%'; bar.style.background = m.games ? scoreColor(m.score) : 'var(--line)';
      return h('span', {class: 'pv-month'}, bar, h('small', {}, monthShort(m.key)[0]));
    }));
  }
  ring(value) {
    const svg = this.svg('svg', {viewBox: '0 0 44 44', class: 'pv-ring', 'aria-hidden': 'true'}), c = 2 * Math.PI * 18;
    const arc = this.svg('circle', {cx: 22, cy: 22, r: 18, class: 'pv-ring-arc', 'stroke-dasharray': `${(c * (value || 0) / 100).toFixed(1)} ${c.toFixed(1)}`});
    const text = this.svg('text', {x: 22, y: 26, 'text-anchor': 'middle', class: 'pv-ring-text-svg'}); text.textContent = Math.round(value || 0) + '%';
    svg.append(this.svg('circle', {cx: 22, cy: 22, r: 18, class: 'pv-ring-track'}), arc, text);
    return svg;
  }
  heat(matrix) {
    const {h} = this, order = [1, 2, 3, 4, 5, 6, 0], max = Math.max(1, ...matrix.flat().map(c => c.g));
    return h('span', {class: 'pv-heat', 'aria-hidden': 'true'}, ...order.flatMap(day => [h('small', {}, WEEKDAYS[day][0]), ...matrix[day].map(cell => {
      const i = h('i'); i.style.opacity = cell.g ? String(.18 + .82 * Math.sqrt(cell.g / max)) : '.06'; return i;
    })]));
  }
}
