// Player profile — "Editorial" design. The panel stops being a slide: it is
// one scrolling page set like a magazine feature, with a chapter rail on the
// left. Whatever chapter you are reading, the board shows it, so scrolling is
// the only control you need. Each chapter gets a real chart in the column
// (months, time of day, you against a typical club player, your top
// opponents, how games end) while the board carries the big picture.
import {DesignWorkspace} from './base.js';
import {fmt} from '../deck.js';
import {classLabel, TERM_LABELS, WEEKDAYS} from '../insights.js';
import {scoreColor} from './board-viz.js';
import {monthShort, formats} from './season.js';

const RAIL = {cover: 'Cover', numbers: 'Numbers', season: 'Season', rating: 'Rating', openings: 'Openings', twin: 'Twin', signature: 'Signature', rival: 'Rivals', hits: 'Best wins', swings: 'Comebacks', habits: 'Habits', clock: 'Clock', trend: 'Accuracy', endings: 'Endings', mate1: 'Mate in one', share: 'Share'};

export class EditorialWorkspace extends DesignWorkspace {
  static design = 'editorial';
  static extraSlides = ['season'];

  sceneFor(slide, spec) {
    const R = this.report;
    switch (slide.id) {
      case 'rating': return this.ratingScene(slide) || spec;
      case 'endings': return this.endingsScene() || spec;
      case 'season': return spec;
      case 'numbers': return {...spec, scene: {type: 'badge', badge: {value: fmt.pct(R.totals.winRate), label: 'won', sub: `${fmt.int(R.totals.w)} of ${fmt.int(R.totals.games)}`}}};
      default: return spec;
    }
  }
  renderFrame() {
    super.renderFrame();
    this.slideHost.classList.add('pv-ed-host');
    this.slideHost.addEventListener('scroll', () => this.onScroll(), {passive: true});
  }
  close() { this.win.clearTimeout(this.scrollTimer); return super.close(); }
  dropRail() { this.built = null; this.rail?.remove(); this.rail = null; this.shell?.classList.remove('pv-ed-shell'); if (this.nav) this.nav.hidden = false; }
  reset() { this.dropRail(); return super.reset(); }
  renderSetup(options) { this.dropRail(); super.renderSetup(options); }
  renderError(error) { this.dropRail(); super.renderError(error); }

  /** Chapters are all on the page; `go` scrolls to one and the board follows. */
  go(index) {
    if (!this.deck.length) return;
    const next = Math.max(0, Math.min(this.deck.length - 1, index));
    const section = this.slideHost.querySelector(`[data-chapter-index="${next}"]`);
    if (!section) return super.go(next);
    this.lockUntil = this.win.performance.now() + 700;
    this.activate(next);
    if (typeof this.slideHost.scrollTo === 'function') this.slideHost.scrollTo({top: section.offsetTop - 8, behavior: this.motion() ? 'smooth' : 'auto'});
    else this.slideHost.scrollTop = section.offsetTop - 8;
  }
  renderSlide({preserveScroll = false} = {}) {
    if (this.closed || !this.deck.length) return;
    this.currentSlide();
    if (this.built !== this.deck) {
      const top = this.slideHost.scrollTop;
      this.countAnimations?.forEach(a => a.cancel?.()); this.countAnimations = [];
      this.counted = new Set();
      this.renderPage();
      this.built = this.deck;
      this.slideHost.scrollTop = preserveScroll ? top : 0;
      if (!preserveScroll && this.index > 0) { const s = this.slideHost.querySelector(`[data-chapter-index="${this.index}"]`); if (s) this.slideHost.scrollTop = s.offsetTop - 8; }
    }
    this.activate(this.index);
  }
  renderNav() { this.nav.hidden = true; }
  onScroll() {
    if (this.phase !== 'deck' || !this.built) return;
    this.win.clearTimeout(this.scrollTimer);
    this.scrollTimer = this.win.setTimeout(() => {
      if (this.closed || this.win.performance.now() < (this.lockUntil || 0)) return;
      const host = this.slideHost, line = host.scrollTop + host.clientHeight * .32;
      let best = 0;
      for (const section of host.querySelectorAll('[data-chapter-index]')) if (section.offsetTop <= line) best = Number(section.dataset.chapterIndex);
      if (host.scrollTop + host.clientHeight >= host.scrollHeight - 4) best = this.deck.length - 1;
      if (best !== this.index) this.activate(best);
    }, 90);
  }
  activate(index) {
    this.index = index;
    const slide = this.deck[index];
    for (const link of this.rail?.querySelectorAll('button') || []) { const on = Number(link.dataset.index) === index; link.classList.toggle('on', on); if (on) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); }
    const meter = this.rail?.querySelector('.pv-ed-meter i'); if (meter) meter.style.height = (100 * (index + 1) / this.deck.length) + '%';
    const section = this.slideHost.querySelector(`[data-chapter-index="${index}"]`);
    for (const s of this.slideHost.querySelectorAll('.pv-ed-chapter')) s.classList.toggle('is-current', s === section);
    if (section && !this.counted.has(index)) { this.counted.add(index); this.countUpNodes(section.querySelectorAll('[data-count="on"]')); }
    this.engineBlock = section?.querySelector('.profile-engine') || this.slideHost.querySelector('.profile-engine');
    this.renderEngineBlock();
    this.syncBoard(slide);
  }

  /* ---------- page ---------- */
  renderPage() {
    const {h} = this;
    this.rail?.remove();
    this.rail = h('nav', {class: 'pv-ed-rail', 'aria-label': 'Chapters'}, h('span', {class: 'pv-ed-meter', 'aria-hidden': 'true'}, h('i')),
      ...this.deck.map((slide, i) => h('button', {type: 'button', 'data-index': String(i), onclick: () => this.go(i)}, h('span', {class: 'pv-ed-no'}, String(i + 1).padStart(2, '0')), h('span', {class: 'pv-ed-name'}, RAIL[slide.id] || slide.eyebrow))));
    this.shell.classList.add('pv-ed-shell');
    this.slideHost.before(this.rail);
    const page = h('div', {class: 'pv-ed-page'}, ...this.deck.map((slide, i) => this.chapter(slide, i)));
    this.slideHost.replaceChildren(page);
  }
  chapter(slide, i) {
    const {h} = this;
    const section = h('section', {class: 'pv-ed-chapter', 'data-chapter-index': String(i), 'data-slide': slide.id, 'aria-label': slide.eyebrow});
    if (slide.id === 'cover') return this.cover(section, slide);
    const kicker = h('div', {class: 'pv-ed-kicker'}, h('span', {class: 'pv-ed-num'}, String(i + 1).padStart(2, '0')), h('span', {}, slide.eyebrow));
    const modes = slide.id === 'rating' ? this.ratingModes(slide, () => { this.index = i; this.built = null; this.renderSlide({preserveScroll: true}); }) : null;
    if (modes) kicker.append(modes);
    section.append(kicker, h('h2', {class: 'pv-ed-title'}, slide.title), h('p', {class: 'pv-ed-standfirst'}, slide.lead));
    const figures = (slide.stats || []).filter(s => !(slide.id === 'numbers' && ['Wins', 'Draws', 'Losses'].includes(s.label)));
    if (figures.length) section.append(h('div', {class: 'pv-ed-figures'}, ...figures.map(s => h('div', {class: 'pv-ed-figure' + (s.tone ? ' tone-' + s.tone : '')},
      h('strong', {'data-count': 'on'}, s.value), h('span', {}, s.label), s.sub ? h('small', {}, s.sub) : null))));
    const chart = this.chart(slide);
    if (chart) section.append(chart);
    const notes = slide.twin ? slide.twin.reasons : slide.bullets;
    if (notes?.length) section.append(h('ul', {class: 'pv-ed-notes'}, ...notes.map(t => h('li', {}, t))));
    if (slide.twin) section.append(h('p', {class: 'pv-quiet'}, `${slide.twin.era}. Runner-up: ${slide.twin.runnerUp}, ${slide.twin.runnerUpTagline.toLowerCase()}.`));
    if (slide.engineLine) section.append(h('p', {class: 'pv-quiet'}, slide.engineLine));
    if (slide.pending === 'engine' || slide.id === 'trend') section.append(h('div', {class: 'profile-engine'}));
    if (slide.id === 'share') section.append(this.renderShare());
    const link = this.evidenceLink(slide, 'pv-link pv-ed-link'); if (link) section.append(link);
    return section;
  }
  cover(section, slide) {
    const {h} = this, R = this.report, T = R.totals;
    const title = h('h1', {class: 'pv-ed-masthead'}, slide.title);
    if (slide.country) { const flag = this.o.flag?.(slide.country); if (flag) title.prepend(flag); }
    const toc = this.deck.slice(1, 7).map(s => RAIL[s.id] || s.eyebrow).join(' · ');
    section.append(h('div', {class: 'pv-ed-kicker'}, h('span', {}, `${R.periodLabel || ''} · Season review`)), title,
      h('p', {class: 'pv-ed-standfirst'}, slide.lead),
      h('div', {class: 'pv-ed-figures pv-ed-cover-figures'}, ...[[fmt.int(T.games), 'games'], [fmt.pct(T.winRate), 'won'], [fmt.hours(T.hours), 'played'], [fmt.int(R.opponents?.distinct), 'opponents']].map(([v, l]) => h('div', {class: 'pv-ed-figure'}, h('strong', {'data-count': 'on'}, v), h('span', {}, l)))),
      h('p', {class: 'pv-ed-inside'}, h('b', {}, 'Inside: '), toc, '…'),
      h('p', {class: 'pv-ed-scrollhint', 'aria-hidden': 'true'}, h('span', {}, 'Scroll to read'), h('i')));
    return section;
  }
  /* ---------- per-chapter charts ---------- */
  chart(slide) {
    const R = this.report;
    switch (slide.id) {
      case 'numbers': return this.numbersChart(R.totals);
      case 'season': return this.seasonChart(slide.season);
      case 'openings': return this.openingTable(slide);
      case 'signature': return this.versusChart(R.signature?.all || []);
      case 'rival': return this.opponentTable(R.opponents?.top || []);
      case 'habits': return this.bandsChart(R.habits?.bands || []);
      case 'endings': return this.endingBars(R.terminations, R.totals);
      default: return null;
    }
  }
  numbersChart(T) {
    const {h} = this;
    const bar = h('div', {class: 'pv-ed-wdl'});
    for (const [k, n, label] of [['w', T.w, 'Won'], ['d', T.d, 'Drawn'], ['l', T.l, 'Lost']]) if (n) { const seg = h('span', {class: k}, h('b', {}, fmt.int(n)), h('small', {}, label)); seg.style.flexGrow = String(n); bar.append(seg); }
    const rows = formats(this.report).map(f => this.barRow(f.label, `${fmt.int(f.games)} games`, f.winRate, fmt.pct(f.winRate) + ' won', f.rating ? `${f.rating}` : null));
    return h('figure', {class: 'pv-ed-chart'}, bar, h('div', {class: 'pv-ed-rows'}, ...rows), h('figcaption', {}, 'Win share by time control. The figure on the right is your latest rating.'));
  }
  barRow(label, sub, value, text, extra = null, color = null) {
    const {h} = this, fill = h('i'); fill.style.width = Math.max(0, Math.min(100, value || 0)) + '%'; if (color) fill.style.background = color;
    return h('div', {class: 'pv-ed-row'}, h('span', {class: 'pv-ed-row-label'}, label, sub ? h('small', {}, sub) : null), h('span', {class: 'pv-ed-row-bar'}, fill), h('span', {class: 'pv-ed-row-value'}, text), extra != null ? h('span', {class: 'pv-ed-row-extra'}, extra) : null);
  }
  seasonChart(season) {
    if (!season) return null;
    const {h} = this, months = season.months.slice(-12), max = Math.max(1, ...months.map(m => m.games));
    const cols = h('div', {class: 'pv-ed-months'}, ...months.map(m => {
      const bar = h('i'); bar.style.height = Math.max(3, 100 * m.games / max) + '%'; bar.style.background = m.games ? scoreColor(m.score) : 'var(--line)';
      return h('div', {class: 'pv-ed-month', title: `${fmt.month(m.key)}: ${fmt.plural(m.games, 'game')}${m.games ? `, ${fmt.pct(m.winRate)} won` : ''}`}, h('b', {}, m.games || ''), h('span', {class: 'pv-ed-month-bar'}, bar), h('small', {}, monthShort(m.key)));
    }));
    // A year of days, a column per week, Monday at the top.
    const days = season.calendar.slice(-53 * 7), dayMax = Math.max(1, ...days.map(d => d.games));
    const lead = (days[0]?.weekday + 6) % 7 || 0;
    const cal = h('div', {class: 'pv-ed-cal', 'aria-hidden': 'true'}, ...Array.from({length: lead}, () => h('i', {class: 'pad'})), ...days.map(d => {
      const cell = h('i', {title: `${d.key}: ${fmt.plural(d.games, 'game')}`}); if (d.games) cell.style.opacity = String(.25 + .75 * Math.sqrt(d.games / dayMax)); else cell.classList.add('off'); return cell;
    }));
    return h('figure', {class: 'pv-ed-chart'}, cols, h('figcaption', {}, 'Games per month; the colour runs from coral (fewer wins) to green (more wins).'), cal, h('figcaption', {}, 'Every day of your season, a column per week. Brighter days had more games.'));
  }
  openingTable(slide) {
    const {h} = this, list = [...(slide.openings?.w || []).map(o => ({...o, c: 'White'})), ...(slide.openings?.b || []).map(o => ({...o, c: 'Black'}))].sort((a, b) => b.games - a.games).slice(0, 8);
    if (!list.length) return null;
    return h('figure', {class: 'pv-ed-chart'}, h('div', {class: 'pv-ed-rows'}, ...list.map(o => this.barRow(o.name, `${o.c} · ${fmt.plural(o.games, 'game')}`, o.winRate, fmt.pct(o.winRate)))), h('figcaption', {}, 'Your openings by games played, with the share you won.'));
  }
  /** Every habit against the round club baseline from docs/PLAYER_PROFILE.md. */
  versusChart(all) {
    const {h} = this, list = all.filter(x => !x.number && x.id !== 'checks').slice(0, 6);
    if (!list.length) return null;
    const scale = Math.max(.5, ...list.map(x => Math.max(x.rate, x.baseline)));
    const rows = list.map(x => {
      const you = h('i', {class: 'you'}), them = h('i', {class: 'them'});
      you.style.width = (100 * x.rate / scale) + '%'; them.style.left = (100 * x.baseline / scale) + '%';
      return h('div', {class: 'pv-ed-vs'}, h('span', {class: 'pv-ed-vs-label'}, x.label), h('span', {class: 'pv-ed-vs-track'}, you, them), h('span', {class: 'pv-ed-vs-value'}, Math.round(100 * x.rate) + '%', h('small', {}, ` v. ${Math.round(100 * x.baseline)}%`)));
    });
    return h('figure', {class: 'pv-ed-chart'}, h('div', {class: 'pv-ed-vs-head'}, h('span', {}, h('i', {class: 'you'}), 'You'), h('span', {}, h('i', {class: 'them'}), 'Typical club player')), ...rows,
      h('figcaption', {}, 'The typical figures are round assumptions about club play, not measurements.'));
  }
  opponentTable(top) {
    const {h} = this;
    if (top.length < 2) return null;
    return h('figure', {class: 'pv-ed-chart'}, h('div', {class: 'pv-ed-rows'}, ...top.map(o => {
      const bar = h('span', {class: 'pv-ed-row-wdl'});
      for (const [k, n] of [['w', o.w], ['d', o.d], ['l', o.l]]) if (n) { const seg = h('i', {class: k}); seg.style.flexGrow = String(n); bar.append(seg); }
      return h('div', {class: 'pv-ed-row'}, h('span', {class: 'pv-ed-row-label'}, o.name, h('small', {}, `${fmt.plural(o.games, 'game')}${o.rating ? ` · about ${o.rating}` : ''}`)), bar, h('span', {class: 'pv-ed-row-value'}, `${o.w}–${o.l}–${o.d}`));
    })), h('figcaption', {}, 'Your five most frequent opponents: wins, draws and losses.'));
  }
  bandsChart(bands) {
    const {h} = this, played = bands.filter(b => b.games);
    if (played.length < 3) return null;
    const max = Math.max(1, ...bands.map(b => b.games));
    return h('figure', {class: 'pv-ed-chart'}, h('div', {class: 'pv-ed-bands'}, ...bands.map(b => {
      const bar = h('i'); bar.style.height = Math.max(3, 100 * b.games / max) + '%'; bar.style.background = b.games ? scoreColor(b.score) : 'var(--line)';
      return h('div', {class: 'pv-ed-band', title: `${b.label}: ${fmt.plural(b.games, 'game')}${b.games ? `, ${fmt.pct(b.winRate)} won` : ''}`}, h('b', {}, b.games ? fmt.pct(b.winRate) : ''), h('span', {class: 'pv-ed-month-bar'}, bar), h('small', {}, b.label.replace('–', '–​')));
    })), h('figcaption', {}, 'Games by time of day (height) and the share you won (label and colour). The board shows the same week by weekday.'));
  }
  endingBars(X, T) {
    if (!X) return null;
    const {h} = this;
    const group = (title, map, total, color) => {
      const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4);
      if (!entries.length || !total) return null;
      return h('div', {class: 'pv-ed-endgroup'}, h('span', {class: 'pv-ed-endtitle'}, title), ...entries.map(([term, n]) => this.barRow(TERM_LABELS[term] || term, null, 100 * n / total, fmt.pct(100 * n / total), fmt.int(n), color)));
    };
    return h('figure', {class: 'pv-ed-chart'}, group('Wins', X.wins, T.w, 'var(--q-best)'), group('Losses', X.losses, T.l, 'var(--q-miss)'), group('Draws', X.draws, T.d, 'color-mix(in srgb, var(--ink-2) 70%, var(--panel))'));
  }
}
