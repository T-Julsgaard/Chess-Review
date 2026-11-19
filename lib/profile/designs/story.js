// Player profile — "Story" design, the default. Segmented progress at the top,
// one huge figure per chapter, a few hairline facts and a "Next: …" button that
// says what comes next. The charts leave the panel and are drawn on the board
// (results tiles, month columns, you-versus-typical pairs, move-time columns,
// habit dots, accuracy line). Each chapter has its own hue. Chapters about all
// your games can be narrowed to one time control with the switch at the top.
import {DesignWorkspace} from './base.js';
import {fmt, rivalLine} from '../deck.js';
import {classLabel, byClassOrder, BANDS6, WEEKDAYS} from '../insights.js';

// One hue per chapter (oklch degrees): enough contrast between neighbours.
export const HUES = {cover: 150, numbers: 145, season: 200, rating: 250, openings: 70, twin: 300, signature: 180, rival: 25, hits: 85, swings: 40, habits: 275, clock: 210, trend: 130, endings: 350, share: 150};
const SHORT = {cover: 'Intro', numbers: 'Numbers', season: 'Season', rating: 'Rating', openings: 'Openings', twin: 'Twin', signature: 'Comparison', rival: 'Rival', hits: 'Greatest hits', swings: 'Comebacks', habits: 'Habits', clock: 'Clock', trend: 'Then and now', endings: 'Endings', share: 'Recap'};
/** Chapters the time-control switch applies to. */
export const FILTERED = new Set(['numbers', 'season', 'openings', 'signature', 'hits', 'swings', 'habits', 'clock', 'trend', 'endings']);
/** Short names for the you-versus-typical columns on the board. */
const SIG_SHORT = {knights4: 'Knights', castleEarly: 'Castle', noCastle: 'No castle', castleLong: 'O-O-O', opposite: 'Opp. sides', fian: 'Fianchetto', firstMove: '1st move', qtrade: 'Q trade', qEarly: 'Early Q',
  gambit: 'Gambits', storm: 'Storms', pair25: 'Bishops', endgame: 'Endgames', length: 'Length', shortWins: 'Fast wins', captures: 'Captures', checks: 'Checks', draws: 'Draws', fightOn: 'Plays on', promo: 'Promotes', ep: 'En passant', under: 'Under-promo'};
const sigValue = (v, number) => number ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(100 * v) + '%';
const OPENING_VIEWS = [['played', 'Most played'], ['best', 'Best win rate'], ['worst', 'Lowest win rate']];

export class StoryWorkspace extends DesignWorkspace {
  static design = 'story';
  static extraSlides = ['season'];

  renderFrame() {
    super.renderFrame();
    this.progress = this.h('div', {class: 'pv-story-progress', 'aria-hidden': 'true'});
    this.head.after(this.progress);
    this.slideHost.classList.add('pv-story-host');
  }
  reset() { this.progress?.replaceChildren(); return super.reset(); }
  renderSetup(options) { this.progress?.replaceChildren(); this.shell.style.removeProperty('--pv-hue'); super.renderSetup(options); }

  decorateDeck(deck) {
    const decorated = super.decorateDeck(deck);
    if (this.cls === 'all' || !this.allModeDeck) { this.allModeDeck = decorated; return decorated; }
    // A local filter changes the chapter's contents, never the chapter count or order.
    const filtered = new Map(decorated.map(slide => [slide.id, slide]));
    return this.allModeDeck.map(slide => !FILTERED.has(slide.id) ? slide : filtered.get(slide.id) || {
      id: slide.id, eyebrow: slide.eyebrow, title: 'Not enough games',
      lead: `Try All or another time control to see this chapter.`,
      stats: [], board: {kind: 'blank', caption: ''},
    });
  }
  go(index) {
    if (!this.deck.length) return;
    const next = Math.max(0, Math.min(this.deck.length - 1, index));
    if (next === this.index) return;
    const id = this.deck[next].id;
    this.rivalCls = 'all';
    if (this.cls !== 'all' && !this.shared) { this.cls = 'all'; this.rebuild(); }
    super.go(this.deck.findIndex(slide => slide.id === id));
  }

  tint(slide, l = .76, c = .15) { return `oklch(${l} ${c} ${HUES[slide.id] ?? 150})`; }
  sceneFor(slide, spec) {
    const R = this.report;
    const tinted = drawn => drawn ? {...drawn, scene: {...drawn.scene, color: this.tint(slide)}} : spec;
    switch (slide.id) {
      case 'rating': return tinted(this.ratingScene(slide));
      case 'season': case 'clock': case 'trend': return spec?.scene ? tinted(spec) : spec;
      case 'rival': {
        const r = this.rivalRecord(slide); if (!r) return spec;
        return {kind: 'fill', total: r.games, wins: r.w, draws: r.d, caption: ''};
      }
      case 'signature': {
        if ((this.o.settings().profileSignatureBoard || 'compare') === 'heat' || !slide.compare?.length) return spec;
        // The board shows the player's own signatures, the most unusual first.
        const ids = (slide.signatures || []).map(s => s.id);
        const chosen = [...slide.compare.filter(c => ids.includes(c.id)), ...slide.compare.filter(c => !ids.includes(c.id))];
        const items = chosen.slice(0, 4).map(c => ({label: c.label, short: SIG_SHORT[c.id] || c.label, you: c.rate, typical: c.baseline, youText: sigValue(c.rate, c.number), typicalText: sigValue(c.baseline, c.number)}));
        return {kind: 'blank', me: 'w', caption: '', scene: {type: 'pairs', items, color: this.tint(slide)}};
      }
      case 'habits': {
        const m = slide.board?.matrix6; if (!m) return spec;
        return {kind: 'blank', me: 'w', caption: '', scene: {type: 'bubbles', matrix: m, days: WEEKDAYS, bands: BANDS6, color: this.tint(slide),
          legend: [['', 'Bigger dot: more games'], ['pv-legend-good', 'Greener: higher win rate']]}};
      }
      case 'endings': return this.endingsScene() || spec;
      default: return R ? spec : spec;
    }
  }

  /* ---------- panel ---------- */
  /** In the deck: a back button, the player's name, and a share link. */
  renderHead() {
    if (this.phase !== 'deck') { super.renderHead(); this.head.querySelector('.profile-head-title')?.remove(); return; }
    const {h} = this;
    const share = h('button', {type: 'button', class: 'pv-share', title: 'Copy a link to this profile', onclick: () => this.copyLink(share)}, 'Share');
    if (this.shared) { super.renderHead(); this.head.append(share); return; }
    this.head.replaceChildren(
      h('div', {class: 'pv-head-main'},
        h('button', {type: 'button', class: 'pv-back', title: 'Back to the start', 'aria-label': 'Back to the start: change player, site or period', onclick: () => this.renderSetup()}, h('span', {html: this.o.icon('prev')})),
        h('strong', {class: 'profile-head-title'}, this.account)),
      share);
  }
  /** All · Bullet · Blitz …: narrows the current chapter to one time control. */
  classFilter(slide) {
    const {h} = this, R = this.report;
    let options, current, pick;
    if (slide.id === 'rival') {
      options = byClassOrder(Object.keys(slide.rival?.byClass || {})); current = this.rivalCls;
      pick = cls => { this.rivalCls = cls; this.renderSlide({animate: false}); this.syncBoard(this.currentSlide(), true); };
    } else if (FILTERED.has(slide.id)) {
      // Daily moves take hours, so a move-time chart has nothing to say about them.
      options = (R?.classOptions || []).filter(cls => slide.id !== 'clock' || cls !== 'daily'); current = this.cls;
      pick = cls => { this.cls = cls; this.rebuild(); };
    } else return null;
    if (!options.length) return null;
    if (!options.includes(current)) current = 'all';
    const choices = [['all', 'All'], ...options.map(cls => [cls, classLabel(cls)])];
    const key = JSON.stringify([slide.id, choices]);
    const previous = this.slideHost.querySelector('.pv-filter');
    const group = previous?.dataset.key === key ? previous : h('div', {class: 'pv-filter', 'data-key': key, role: 'radiogroup', 'aria-label': 'Time control'}, h('i', {class: 'pv-filter-thumb', 'aria-hidden': 'true'}),
      ...choices.map(([id, label]) => h('button', {type: 'button', role: 'radio', 'data-value': id, onclick: () => { if (id !== group.dataset.current) group.pick(id); }}, label)));
    group.pick = pick; group.dataset.current = current;
    for (const button of group.querySelectorAll('button')) {
      const selected = button.dataset.value === current;
      button.classList.toggle('on', selected); button.setAttribute('aria-checked', String(selected));
    }
    // Keep the same thumb across renders so it travels from the selected pill.
    const place = button => { const thumb = group.firstChild; if (!button || !thumb) return; thumb.style.width = button.offsetWidth + 'px'; thumb.style.transform = `translateX(${button.offsetLeft - 3}px)`; };
    this.win.requestAnimationFrame(() => {
      if (!group.isConnected) return;
      if (group !== previous) { group.firstChild.style.transition = 'none'; place(group.querySelector('button.on')); void group.offsetWidth; group.firstChild.style.transition = ''; }
      else place(group.querySelector('button.on'));
    });
    return group;
  }
  rivalRecord(slide) {
    const r = slide.rival; if (!r) return null;
    return this.rivalCls !== 'all' && r.byClass?.[this.rivalCls] ? {...r.byClass[this.rivalCls], name: r.name} : r;
  }
  syncBoard(slide, force = false) {
    if (force) this.boardSpecKey = null;
    super.syncBoard(slide);
  }
  boardKeyFor(slide) { return JSON.stringify([super.boardKeyFor(slide), slide.id === 'rival' ? this.rivalCls : null, slide.id === 'openings' ? this.openingPick : null, this.o.settings().profileSignatureBoard || null]); }
  renderSlide({animate = true} = {}) {
    if (this.closed || !this.deck.length) return;
    const {h} = this, slide = this.currentSlide(), R = this.report;
    const previous = this.slideHost.querySelector('.pv-story');
    const updatingNumbers = previous?.dataset.slide === 'numbers' && slide.id === 'numbers';
    const oldFigure = updatingNumbers ? previous.querySelector('.pv-story-figure').textContent : null;
    this.countAnimations?.forEach(a => a.cancel?.()); this.countAnimations = [];
    this.shell.style.setProperty('--pv-hue', HUES[slide.id] ?? 150);
    const hero = this.hero(slide);
    const article = h('article', {class: 'pv-story', 'data-slide': slide.id, 'data-animate': animate && this.motion() ? 'on' : 'off', 'data-direction': this.direction > 0 ? 'next' : 'prev'});
    const top = h('div', {class: 'pv-story-top'});
    if (slide.id !== 'cover') top.append(h('span', {class: 'pv-story-chapter'}, h('i', {class: 'pv-story-no'}, String(this.index + 1).padStart(2, '0')), slide.id === 'share' ? 'Your year in one card' : slide.eyebrow));
    const modes = slide.id === 'rating' ? this.ratingModes(slide, () => this.renderSlide({animate: false})) : this.classFilter(slide);
    if (modes) top.append(modes);
    if (top.childNodes.length) article.append(top);
    const heroNode = h('div', {class: 'pv-story-hero' + (hero.text ? ' is-text' : '')},
      h('strong', {class: 'pv-story-figure', 'data-count': hero.text ? null : 'on'}, hero.value),
      hero.label ? h('span', {class: 'pv-story-label'}, hero.label) : null);
    if (slide.id === 'cover' && slide.country) { const flag = this.o.flag?.(slide.country); if (flag) heroNode.prepend(flag); }
    article.append(heroNode);
    const points = hero.points ?? slide.points, lead = 'lead' in hero ? hero.lead : slide.lead;
    if (points?.length) article.append(h('ul', {class: 'pv-points'}, ...points.map(t => h('li', {}, t))));
    else if (lead) article.append(h('p', {class: 'pv-story-lead'}, lead));
    if (slide.id === 'numbers' && R?.totals) article.append(this.wdlBar(R.totals));
    if (slide.id === 'share') article.append(this.recap());
    else {
      const facts = this.facts(slide);
      if (facts.length) article.append(h('dl', {class: 'pv-facts' + (facts.length === 4 ? ' pv-facts-4' : '')}, ...facts.map(f => h('div', {class: 'pv-fact' + (f.tone ? ' tone-' + f.tone : '')}, h('dt', {}, f.label, f.sub ? h('small', {}, f.sub) : null), h('dd', {}, f.value)))));
    }
    if (slide.openings) article.append(this.openingsView(slide));
    if (slide.id === 'signature') article.append(...this.signatureView(slide));
    if (slide.twin?.reasons?.length) article.append(h('ul', {class: 'pv-reasons'}, ...slide.twin.reasons.slice(0, 3).map(t => h('li', {}, t))));
    else if (!['share', 'signature', 'openings'].includes(slide.id) && slide.bullets?.length) article.append(h('ul', {class: 'pv-reasons'}, ...slide.bullets.slice(0, slide.id === 'rival' ? 4 : ['numbers', 'endings'].includes(slide.id) ? 1 : 2).map(t => h('li', {}, t))));
    const engine = this.engineSlot(slide); if (engine) article.append(engine);
    if (slide.id === 'share') article.append(this.renderShare());
    const link = this.evidenceLink(slide); if (link) article.append(link);
    this.slideHost.replaceChildren(article);
    this.renderEngineBlock();
    this.renderNav();
    this.renderProgress();
    this.syncBoard(slide);
    if (animate) this.countUpNodes(article.querySelectorAll('[data-count="on"], .pv-fact dd'));
    else if (updatingNumbers) this.tweenCount(heroNode.querySelector('strong'), oldFigure, R.totals.games);
    this.slideHost.scrollTop = 0;
  }
  /** The single figure a chapter is about. Text heroes (names) are set smaller. */
  hero(slide) {
    const R = this.report, T = R?.totals;
    switch (slide.id) {
      case 'cover': return {value: slide.title, text: true, label: null};
      // The results bar says the rest; no sentence repeating it.
      case 'numbers': return {value: fmt.int(T.games), label: 'games played', lead: null};
      case 'season': return slide.season?.dayStreak?.length > 1 ? {value: String(slide.season.dayStreak.length), label: 'days in a row at the board'} : {value: slide.title, text: true};
      case 'rating': { const r = R.ratings?.[slide.ratingClass]; return r ? {value: fmt.signed(r.change), label: `${classLabel(slide.ratingClass)} rating, ${r.start} → ${r.end}`, lead: `Peaking at ${r.peak.rating} on ${fmt.date(r.peak.t)}.`} : {value: slide.title, text: true}; }
      case 'openings': return {value: slide.title, text: true, label: null, lead: null};
      case 'hits': { const s = R.opponents?.strongestBeaten; return s ? {value: String(s.rating), label: 'the highest-rated player you beat', lead: slide.lead} : {value: slide.title, text: true}; }
      case 'clock': return R.clock?.averageThink != null ? {value: fmt.seconds(R.clock.averageThink), label: 'per move, on average'} : {value: slide.title, text: true};
      case 'endings': return R.terminations?.mates ? {value: fmt.int(R.terminations.mates), label: 'checkmates delivered', lead: slide.lead} : {value: slide.title, text: true};
      case 'rival': { const r = this.rivalRecord(slide); return {value: slide.title, text: true, label: 'your most-played opponent', lead: r ? rivalLine(r, slide.title) : slide.lead}; }
      case 'share': return {value: 'That was your year', text: true, label: null, lead: `${(R.periodLabel || '')} in one card.`};
      default: return {value: slide.title, text: true, label: null};
    }
  }
  facts(slide) {
    const stats = slide.stats || [];
    if (slide.id === 'numbers') return stats.filter(s => !['Wins', 'Draws', 'Losses'].includes(s.label));
    if (slide.id === 'rating') return stats.filter(s => s.label !== 'Rated games');
    if (slide.id === 'rival') return [];
    return stats.slice(0, 4);
  }
  wdlBar(T) {
    const {h} = this;
    const existing = this.slideHost.querySelector('.pv-wdl');
    const bar = existing || h('div', {class: 'pv-wdl', role: 'img'}, ...['w', 'd', 'l'].map(cls => h('span', {class: 'pv-wdl-seg ' + cls}, h('b'), h('small', {}, {w: 'won', d: 'drawn', l: 'lost'}[cls]))));
    bar.setAttribute('aria-label', `${T.w} wins, ${T.d} draws, ${T.l} losses`);
    for (const cls of ['w', 'd', 'l']) {
      const seg = bar.querySelector('.' + cls), count = seg.querySelector('b');
      seg.style.flexGrow = String(T[cls] / Math.max(1, T.games));
      seg.classList.toggle('is-empty', !T[cls]); seg.title = `${seg.querySelector('small').textContent}: ${T[cls]}`;
      if (existing) this.tweenCount(count, count.textContent, T[cls]); else count.textContent = fmt.int(T[cls]);
    }
    return bar;
  }
  tweenCount(node, from, target) {
    const startValue = Number(String(from).replace(/,/g, ''));
    node.textContent = fmt.int(target);
    if (!this.motion() || !Number.isFinite(startValue) || startValue === target) return;
    const start = this.win.performance.now(), duration = 420;
    let frame;
    const tick = now => {
      const p = Math.min(1, (now - start) / duration);
      node.textContent = fmt.int(startValue + (target - startValue) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = this.win.requestAnimationFrame(tick);
    };
    node.textContent = fmt.int(startValue);
    frame = this.win.requestAnimationFrame(tick);
    this.countAnimations.push({cancel: () => this.win.cancelAnimationFrame(frame)});
  }
  /** Openings by games played, best or lowest win rate; picking one shows its usual line on the board. */
  openingsView(slide) {
    const {h} = this, all = slide.openings.all || [...slide.openings.w.map(o => ({...o, color: 'w'})), ...slide.openings.b.map(o => ({...o, color: 'b'}))];
    const view = this.openingView || 'played';
    const enough = all.filter(o => o.games >= 5);
    const list = (view === 'played' ? [...all].sort((a, b) => b.games - a.games)
      : view === 'best' ? [...(enough.length >= 3 ? enough : all)].sort((a, b) => b.score - a.score || b.games - a.games)
      : [...(enough.length >= 3 ? enough : all)].sort((a, b) => a.score - b.score || b.games - a.games)).slice(0, 4);
    const meter = value => { const bar = h('i'); bar.style.width = (value || 0) + '%'; return h('span', {class: 'pv-rank-meter'}, bar); };
    const choose = o => { this.dismissedGameSlide = null; this.boardSpecKey = null; this.openingPick = o.line ? {name: o.name, line: o.line, color: o.color} : null; this.renderSlide({animate: false}); };
    const tabs = h('div', {class: 'pv-tabs', role: 'tablist', 'aria-label': 'Sort openings'}, ...OPENING_VIEWS.map(([id, label]) =>
      h('button', {type: 'button', role: 'tab', class: id === view ? 'on' : '', 'aria-selected': String(id === view), onclick: () => { this.openingView = id; this.openingPick = null; this.renderSlide({animate: false}); }}, label)));
    const picked = this.openingPick?.name;
    return h('div', {class: 'pv-openings'}, tabs,
      h('div', {class: 'pv-rank-head', 'aria-hidden': 'true'}, h('span', {}, 'Opening'), h('span', {}, 'Win rate')),
      h('ol', {class: 'pv-rank'}, ...list.map((o, i) => h('li', {class: picked === o.name ? 'on' : ''},
        h('button', {type: 'button', class: 'pv-rank-row', title: o.line ? 'Show this line on the board' : o.name, onclick: () => choose(o)},
          h('span', {class: 'pv-rank-no'}, String(i + 1)),
          h('span', {class: 'pv-rank-name'}, o.name, h('small', {}, `${o.color === 'w' ? 'White' : 'Black'} · ${fmt.plural(o.games, 'game')}`)),
          meter(o.winRate), h('span', {class: 'pv-rank-value'}, fmt.pct(o.winRate)))))));
  }
  /**
   * One scrollable list: every metric against a typical player, most unusual
   * first. The player's signatures carry their sentence under the name.
   */
  signatureView(slide) {
    const {h} = this, out = [];
    const texts = new Map((slide.signatures || []).map(s => [s.id, s.text]));
    const metrics = new Map((slide.compare || []).map(c => [c.id, c]));
    const compare = [...texts.keys()].map(id => metrics.get(id)).filter(Boolean)
      .concat((slide.compare || []).filter(c => !texts.has(c.id)));
    if (compare.length) {
      const row = c => {
        const top = Math.max(c.rate, c.baseline, 1e-9) * 1.1;
        const bar = (v, cls) => { const i = h('i', {class: cls}); i.style.width = Math.min(100, 100 * v / top) + '%'; return i; };
        return h('li', {class: 'pv-cmp' + (texts.has(c.id) ? ' is-signature' : '')}, h('span', {class: 'pv-cmp-label'}, c.label, texts.has(c.id) ? h('small', {}, texts.get(c.id)) : null),
          h('span', {class: 'pv-cmp-bars'}, bar(c.rate, 'you'), bar(c.baseline, 'typical')),
          h('span', {class: 'pv-cmp-values'}, h('b', {}, sigValue(c.rate, c.number)), h('small', {}, sigValue(c.baseline, c.number))));
      };
      out.push(h('div', {class: 'pv-cmp-wrap pv-noadvance'},
        h('div', {class: 'pv-cmp-head'}, h('span', {}, 'You against a typical player'), h('span', {class: 'pv-cmp-key'}, h('i', {class: 'you'}), 'You', h('i', {class: 'typical'}), 'Typical')),
        h('ol', {class: 'pv-cmp-list', tabindex: '0', 'aria-label': 'Your rates against a typical player, most unusual first'}, ...compare.map(row))));
    }
    return out;
  }
  showBoard(spec, options) {
    const slide = this.deck[this.index];
    if (slide?.id === 'openings' && this.openingPick?.line && spec?.kind === 'moves') spec = {...spec, moves: this.openingPick.line.split(' ').filter(Boolean), me: this.openingPick.color};
    super.showBoard(spec, options);
  }
  /** Wrapped's last card: the year in a few lines. */
  recap() {
    const {h} = this, R = this.report, T = R.totals;
    const fav = [...(R.openings?.w?.top || []), ...(R.openings?.b?.top || [])].sort((a, b) => b.games - a.games)[0];
    const peak = Object.entries(R.ratings || {}).sort((a, b) => b[1].games - a[1].games)[0];
    const rows = [
      ['Games', `${fmt.int(T.games)} · ${fmt.pct(T.winRate)} win rate`],
      ['Hours', fmt.hoursNum(T.hours)],
      peak ? ['Peak', `${peak[1].peak.rating} ${classLabel(peak[0]).toLowerCase()}`] : null,
      fav ? ['Opening', fav.name] : null,
      R.twin ? ['Twin', R.twin.winner.name] : null,
      R.opponents?.rival ? ['Rival', `${R.opponents.rival.name} (${R.opponents.rival.w}–${R.opponents.rival.l})`] : null,
      this.season?.dayStreak?.length > 1 ? ['Streak', `${this.season.dayStreak.length} days in a row`] : null,
    ].filter(Boolean);
    return h('dl', {class: 'pv-recap'}, ...rows.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))));
  }
  renderProgress() {
    const {h} = this;
    this.progress.replaceChildren(...this.deck.map((slide, i) => h('button', {type: 'button', class: 'pv-seg' + (i < this.index ? ' done' : i === this.index ? ' on' : ''), title: slide.eyebrow, 'aria-label': slide.eyebrow, tabindex: '-1', onclick: () => this.go(i)},
      h('i'))));
  }
  /** Equal-size chapter controls, with a quieter previous button. */
  renderNav() {
    const {h} = this, last = this.index === this.deck.length - 1, next = this.deck[this.index + 1], prev = this.deck[this.index - 1];
    this.nav.classList.add('pv-story-nav');
    this.nav.replaceChildren(
      h('button', {type: 'button', class: 'pv-prev', 'aria-label': 'Previous chapter', disabled: this.index === 0, onclick: () => this.go(this.index - 1)},
        h('span', {class: 'pv-next-kicker'}, 'Previous'), h('span', {class: 'pv-next-title'}, prev ? SHORT[prev.id] || prev.eyebrow : 'Intro'), h('span', {class: 'pv-next-arrow', 'aria-hidden': 'true'}, '←')),
      h('button', {type: 'button', class: 'pv-next', onclick: () => last ? this.go(0) : this.go(this.index + 1)},
        h('span', {class: 'pv-next-kicker'}, last ? 'Start again' : 'Next'), h('span', {class: 'pv-next-title'}, last ? 'Back to the cover' : SHORT[next.id] || next.eyebrow), h('span', {class: 'pv-next-arrow', 'aria-hidden': 'true'}, last ? '↺' : '→')));
  }
}
