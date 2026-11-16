// Player profile — "Story" design. Spotify-Wrapped pacing: segmented progress
// at the top, one huge figure per chapter with a single sentence under it, a
// few hairline facts, and a "Next: …" button that says what comes next. The
// charts leave the panel and are drawn on the board (rating line, month
// columns, results tiles with a badge, endings by type). Each chapter has its
// own hue. The last chapter is a one-glance recap with the share buttons.
import {DesignWorkspace} from './base.js';
import {fmt} from '../deck.js';
import {classLabel} from '../insights.js';

const AUTOPLAY_MS = 9000;
// One hue per chapter (oklch degrees): enough contrast between neighbours.
export const HUES = {cover: 150, numbers: 145, season: 200, rating: 250, openings: 70, twin: 300, signature: 180, rival: 25, hits: 85, swings: 40, habits: 275, clock: 210, trend: 130, endings: 350, share: 150};
const SHORT = {cover: 'Intro', numbers: 'Numbers', season: 'Season', rating: 'Rating', openings: 'Openings', twin: 'Twin', signature: 'Signature', rival: 'Rival', hits: 'Greatest hits', swings: 'Comebacks', habits: 'Habits', clock: 'Clock', trend: 'Then and now', endings: 'Endings', share: 'Recap'};

export class StoryWorkspace extends DesignWorkspace {
  static design = 'story';
  static extraSlides = ['season'];

  renderFrame() {
    super.renderFrame();
    this.progress = this.h('div', {class: 'pv-story-progress', 'aria-hidden': 'true'});
    this.head.after(this.progress);
    this.slideHost.classList.add('pv-story-host');
    // The card itself is the "next" button, as in a story; controls inside it opt out.
    this.slideHost.addEventListener('click', event => {
      if (this.phase !== 'deck' || event.target.closest('a,button,input,select,textarea,label,svg,.profile-engine,.pv-noadvance')) return;
      if (this.win.getSelection?.()?.toString()) return;
      const rect = this.slideHost.getBoundingClientRect();
      this.go(this.index + (event.clientX < rect.left + rect.width * .28 ? -1 : 1));
    });
  }
  close() { this.win.clearTimeout(this.autoTimer); return super.close(); }
  reset() { this.win.clearTimeout?.(this.autoTimer); this.playing = false; this.progress?.replaceChildren(); return super.reset(); }
  renderSetup(options) { this.progress?.replaceChildren(); this.shell.style.removeProperty('--pv-hue'); super.renderSetup(options); }

  tint(slide, l = .76, c = .15) { return `oklch(${l} ${c} ${HUES[slide.id] ?? 150})`; }
  sceneFor(slide, spec) {
    const R = this.report, T = R?.totals;
    const tinted = scene => scene ? {...scene, scene: {...scene.scene, color: this.tint(slide)}} : spec;
    switch (slide.id) {
      case 'numbers': return {...spec, scene: {type: 'badge', badge: {value: fmt.pct(T.winRate), label: 'of games won'}}};
      case 'rating': return tinted(this.ratingScene(slide));
      case 'rival': {
        const r = R.opponents?.rival; if (!r) return spec;
        return {kind: 'fill', total: r.games, wins: r.w, draws: r.d, caption: `Every game against ${r.name}: green squares are your wins, coral theirs.`, scene: {type: 'badge', badge: {value: `${r.w}–${r.l}`, label: `you v. ${r.name}`, sub: r.d ? `${fmt.plural(r.d, 'draw')}` : null}}};
      }
      case 'clock': {
        const C = R.clock; if (C?.snapShare == null) return spec;
        return {kind: 'blank', me: 'w', caption: `Each lit square is one sixty-fourth of your moves: the lit share took under five seconds.`, scene: {type: 'share', value: C.snapShare, color: this.tint(slide), badge: {value: fmt.pct(C.snapShare), label: 'of moves in under 5 s'}}};
      }
      case 'endings': return this.endingsScene() || spec;
      default: return spec;
    }
  }

  /* ---------- panel ---------- */
  renderHead() {
    super.renderHead();
    if (this.phase === 'deck' && !this.shared) this.head.querySelector('.profile-eyebrow')?.replaceChildren('Your chess, wrapped');
  }
  renderSlide({animate = true} = {}) {
    if (this.closed || !this.deck.length) return;
    const {h} = this, slide = this.currentSlide(), R = this.report;
    this.countAnimations?.forEach(a => a.cancel?.()); this.countAnimations = [];
    this.shell.style.setProperty('--pv-hue', HUES[slide.id] ?? 150);
    const hero = this.hero(slide);
    const article = h('article', {class: 'pv-story', 'data-slide': slide.id, 'data-animate': animate && this.motion() ? 'on' : 'off', 'data-direction': this.direction > 0 ? 'next' : 'prev'});
    const top = h('div', {class: 'pv-story-top'}, h('span', {class: 'pv-story-chapter'}, h('i', {class: 'pv-story-no'}, String(this.index + 1).padStart(2, '0')), slide.id === 'share' ? 'Your year in one card' : slide.eyebrow));
    const modes = slide.id === 'rating' ? this.ratingModes(slide, () => this.renderSlide({animate: false})) : null;
    if (modes) top.append(modes);
    article.append(top);
    const heroNode = h('div', {class: 'pv-story-hero' + (hero.text ? ' is-text' : '')},
      h('strong', {class: 'pv-story-figure', 'data-count': hero.text ? null : 'on'}, hero.value),
      hero.label ? h('span', {class: 'pv-story-label'}, hero.label) : null);
    if (slide.id === 'cover' && slide.country) { const flag = this.o.flag?.(slide.country); if (flag) heroNode.prepend(flag); }
    article.append(heroNode, h('p', {class: 'pv-story-lead'}, hero.lead ?? slide.lead));
    if (slide.id === 'numbers' && R?.totals) article.append(this.wdlBar(R.totals));
    if (slide.id === 'share') article.append(this.recap());
    else {
      const facts = this.facts(slide);
      if (facts.length) article.append(h('dl', {class: 'pv-facts'}, ...facts.map(f => h('div', {class: 'pv-fact' + (f.tone ? ' tone-' + f.tone : '')}, h('dt', {}, f.label, f.sub ? h('small', {}, f.sub) : null), h('dd', {}, f.value)))));
    }
    if (slide.openings) article.append(this.openingsMini(slide.openings));
    if (slide.twin?.reasons?.length) article.append(h('ul', {class: 'pv-reasons'}, ...slide.twin.reasons.slice(0, 3).map(t => h('li', {}, t))));
    else if (slide.id !== 'share' && slide.bullets?.length) article.append(h('ul', {class: 'pv-reasons'}, ...slide.bullets.slice(0, slide.id === 'signature' ? 3 : 2).map(t => h('li', {}, t))));
    if (slide.engineLine) article.append(h('p', {class: 'pv-quiet'}, slide.engineLine));
    const engine = this.engineSlot(slide); if (engine) article.append(engine);
    if (slide.id === 'share') article.append(this.renderShare());
    const link = this.evidenceLink(slide); if (link) article.append(link);
    this.slideHost.replaceChildren(article);
    this.renderEngineBlock();
    this.renderNav();
    this.renderProgress();
    this.syncBoard(slide);
    if (animate) this.countUpNodes(article.querySelectorAll('[data-count="on"], .pv-fact dd'));
    this.slideHost.scrollTop = 0;
    this.schedule();
  }
  /** The single figure a chapter is about. Text heroes (names) are set smaller. */
  hero(slide) {
    const R = this.report, T = R?.totals;
    switch (slide.id) {
      case 'cover': return {value: slide.title, text: true, label: null};
      case 'numbers': return {value: fmt.int(T.games), label: 'games played', lead: slide.lead};
      case 'season': return slide.season?.dayStreak?.length > 1 ? {value: String(slide.season.dayStreak.length), label: 'days in a row at the board', lead: slide.lead} : {value: slide.title, text: true};
      case 'rating': { const r = R.ratings?.[slide.ratingClass]; return r ? {value: fmt.signed(r.change), label: `${classLabel(slide.ratingClass)} rating, ${r.start} → ${r.end}`, lead: `Peaking at ${r.peak.rating} on ${fmt.date(r.peak.t)}.`} : {value: slide.title, text: true}; }
      case 'hits': { const s = R.opponents?.strongestBeaten; return s ? {value: String(s.rating), label: 'the highest-rated player you beat', lead: slide.lead} : {value: slide.title, text: true}; }
      case 'clock': return R.clock?.averageThink != null ? {value: fmt.seconds(R.clock.averageThink), label: 'per move, on average', lead: slide.lead} : {value: slide.title, text: true};
      case 'endings': return R.terminations?.mates ? {value: fmt.int(R.terminations.mates), label: 'checkmates delivered', lead: slide.lead} : {value: slide.title, text: true};
      case 'rival': { const r = R.opponents?.rival; return {value: slide.title, text: true, label: r ? `${r.w}–${r.l}–${r.d} across ${fmt.plural(r.games, 'game')}` : null}; }
      case 'share': return {value: 'That was your year', text: true, label: null, lead: `${this.account}, ${(R.periodLabel || '').toLowerCase()} in one card. Share it, or keep it for yourself.`};
      default: return {value: slide.title, text: true, label: null};
    }
  }
  facts(slide) {
    const stats = slide.stats || [];
    if (slide.id === 'numbers') return stats.filter(s => !['Wins', 'Draws', 'Losses'].includes(s.label));
    if (slide.id === 'rating') return stats.filter(s => s.label !== 'Rated games').concat(slide.bullets?.[0] ? [] : []);
    if (slide.id === 'hits') return stats;
    if (slide.id === 'clock') return stats;
    if (slide.id === 'endings') return stats;
    return stats.slice(0, 4);
  }
  wdlBar(T) {
    const {h} = this, total = Math.max(1, T.games);
    const seg = (cls, n, label) => n ? h('span', {class: 'pv-wdl-seg ' + cls, style: {flexGrow: String(n)}, title: `${label}: ${n}`}, h('b', {}, fmt.int(n)), h('small', {}, label)) : null;
    return h('div', {class: 'pv-wdl', role: 'img', 'aria-label': `${T.w} wins, ${T.d} draws, ${T.l} losses`},
      seg('w', T.w, 'won'), seg('d', T.d, 'drawn'), seg('l', T.l, 'lost'), h('i', {class: 'pv-wdl-total', hidden: true}, total));
  }
  openingsMini(openings) {
    const {h} = this;
    const meter = value => { const bar = h('i'); bar.style.width = (value || 0) + '%'; return h('span', {class: 'pv-rank-meter'}, bar); };
    const list = [...openings.w.map(o => ({...o, color: 'White'})), ...openings.b.map(o => ({...o, color: 'Black'}))].sort((a, b) => b.games - a.games).slice(0, 4);
    return h('ol', {class: 'pv-rank'}, ...list.map((o, i) => h('li', {}, h('span', {class: 'pv-rank-no'}, String(i + 1)),
      h('span', {class: 'pv-rank-name'}, o.name, h('small', {}, `${o.color} · ${fmt.plural(o.games, 'game')}`)),
      meter(o.winRate), h('span', {class: 'pv-rank-value'}, fmt.pct(o.winRate)))));
  }
  /** Wrapped's last card: the year in six lines. */
  recap() {
    const {h} = this, R = this.report, T = R.totals;
    const fav = [...(R.openings?.w?.top || []), ...(R.openings?.b?.top || [])].sort((a, b) => b.games - a.games)[0];
    const peak = Object.entries(R.ratings || {}).sort((a, b) => b[1].games - a[1].games)[0];
    const rows = [
      ['Games', `${fmt.int(T.games)} · ${fmt.pct(T.winRate)} won`],
      ['Hours', fmt.hours(T.hours)],
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
      h('i', {style: i === this.index && this.playing ? {animationDuration: AUTOPLAY_MS + 'ms'} : null}))));
    this.progress.dataset.playing = this.playing ? 'on' : 'off';
  }
  renderNav() {
    const {h} = this, last = this.index === this.deck.length - 1, next = this.deck[this.index + 1];
    this.nav.classList.add('pv-story-nav');
    this.nav.replaceChildren(
      h('button', {type: 'button', class: 'pv-round', 'aria-label': 'Previous chapter', disabled: this.index === 0, onclick: () => this.go(this.index - 1)}, h('span', {html: this.o.icon('prev')})),
      h('button', {type: 'button', class: 'pv-next', onclick: () => last ? this.go(0) : this.go(this.index + 1)},
        h('span', {class: 'pv-next-kicker'}, last ? 'Start again' : 'Next'), h('span', {class: 'pv-next-title'}, last ? 'Back to the cover' : SHORT[next.id] || next.eyebrow), h('span', {class: 'pv-next-arrow', 'aria-hidden': 'true'}, last ? '↺' : '→')),
      h('button', {type: 'button', class: 'pv-round pv-play', 'aria-label': this.playing ? 'Pause autoplay' : 'Play chapters automatically', 'aria-pressed': String(!!this.playing), title: this.playing ? 'Pause' : 'Autoplay', onclick: () => this.togglePlay()},
        h('span', {class: 'pv-play-icon', 'data-state': this.playing ? 'pause' : 'play'})));
  }
  togglePlay() {
    this.playing = !this.playing;
    if (this.playing && this.index === this.deck.length - 1) { this.go(0); return; }
    this.renderNav(); this.renderProgress(); this.schedule();
  }
  schedule() {
    this.win.clearTimeout(this.autoTimer);
    if (!this.playing || this.closed) return;
    if (this.index >= this.deck.length - 1) { this.playing = false; this.renderNav(); this.renderProgress(); return; }
    this.autoTimer = this.win.setTimeout(() => { if (this.playing && !this.closed) this.go(this.index + 1); }, AUTOPLAY_MS);
  }
}
