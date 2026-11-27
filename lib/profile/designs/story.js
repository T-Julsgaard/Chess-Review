// Player profile Story. Segmented progress at the top,
// one huge figure per chapter, a few hairline facts and a "Next: …" button that
// says what comes next. The charts leave the panel and are drawn on the board
// (results tiles, month columns, you-versus-typical pairs, move-time columns,
// habit dots, accuracy line). Each chapter has its own hue. Chapters about all
// your games can be narrowed to one time control with the switch at the top.
import {DesignWorkspace} from './base.js';
import {SITE_NAMES} from '../workspace.js';
import {fmt, rivalLine, resultsOverTime, mateInOneShares} from '../deck.js';
import {classLabel, byClassOrder, HABIT_BANDS, WEEKDAYS, TERM_LABELS} from '../insights.js';
import {CHAPTER_HUES, CHAPTER_NAMES, SIG_SHORT, renderOverview} from '../overview.js';
/** Chapters the time-control switch applies to. */
export const FILTERED = new Set(['numbers', 'season', 'openings', 'signature', 'hits', 'swings', 'habits', 'clock', 'trend', 'endings', 'mate1']);
/** Chapters that always show one time control (no "All"): they open on the one played most. */
export const SINGLE_CLASS = new Set(['swings']);
const sigValue = (v, number) => number ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(100 * v) + '%';
const OPENING_VIEWS = [['played', 'Most played'], ['best', 'Highest win rate'], ['worst', 'Lowest win rate']];
const ENDING_VIEWS = [['w', 'Wins'], ['l', 'Losses'], ['d', 'Draws']];
/** A whole percent, except where games there were rounds to 0%: then one decimal (0.4%), and never below 0.1%. */
export const smallShare = (n, total, whole) => whole === 0 && n > 0 && total > 0 ? Math.max(.1, Math.round(1000 * n / total) / 10).toFixed(1) : String(whole);
/** How a game ended: the same word in the legend and beside the ring on the board, so the two always match. */
const ENDING_NAMES = {mate: 'Checkmate', resign: 'Resignation', time: 'On time', abandon: 'Abandoned', agree: 'Agreement',
  repetition: 'Repetition', stalemate: 'Stalemate', insufficient: 'Insufficient material', fifty: '50-move rule', other: 'Other'};
/** Each result's colour; its endings are shades of it, the most common the strongest. */
const ENDING_TONES = {w: 'var(--q-best)', l: 'var(--q-miss)', d: 'color-mix(in srgb, var(--ink-2) 75%, var(--panel))'};
const ENDING_SHADES = [100, 70, 48, 32];
/** What a game link turns into while its game is on the board, by chapter: the way back to the chapter's own board. */
const BACK_TO = {rating: 'Back to your rating chart', twin: 'Back to your twin', hits: 'Back to the chart', swings: 'Back to the comeback', trend: 'Back to the chart'};

export class StoryWorkspace extends DesignWorkspace {
  static design = 'story';
  static extraSlides = ['season'];

  renderFrame() {
    super.renderFrame();
    this.progress = this.h('div', {class: 'pv-story-progress', 'aria-hidden': 'true'});
    this.head.after(this.progress);
    this.slideHost.classList.add('pv-story-host');
    if (this.win.ResizeObserver) {
      this.filterResizeObserver = new this.win.ResizeObserver(() => {
        const filter = this.slideHost.querySelector('.pv-story-top > .pv-filter');
        if (filter) this.placeClassFilterThumb(filter);
      });
      this.filterResizeObserver.observe(this.slideHost);
    }
  }
  reset() { this.comparePair = null; this.progress?.replaceChildren(); return super.reset(); }
  close(options) {
    this.filterResizeObserver?.disconnect();
    this.closeCompare();
    return super.close(options);
  }
  renderSetup(options) { this.comparePair = null; this.progress?.replaceChildren(); this.shell.style.removeProperty('--pv-hue'); super.renderSetup(options); }

  decorateDeck(deck) {
    const decorated = super.decorateDeck(deck);
    if (this.cls === 'all' || !this.allModeDeck) { this.allModeDeck = decorated; return decorated; }
    // A local filter changes the chapter's contents, never the chapter count or order.
    // A chapter the time control has too few games for says so, and only that, on every chapter alike:
    // `empty` keeps the report's own figures (an average think, a checkmate count) off it.
    const filtered = new Map(decorated.map(slide => [slide.id, slide]));
    return this.allModeDeck.map(slide => !FILTERED.has(slide.id) ? slide : filtered.get(slide.id) || {
      id: slide.id, eyebrow: slide.eyebrow, title: 'Not enough games', empty: true,
      lead: SINGLE_CLASS.has(slide.id) ? 'Try another time control to see this chapter.' : 'Try All or another time control to see this chapter.',
      stats: [], board: {kind: 'blank', caption: ''},
    });
  }
  go(index) {
    if (!this.deck.length) return;
    const next = Math.max(0, Math.min(this.deck.length - 1, index));
    if (next === this.index) return;
    const id = this.deck[next].id, from = this.deck[this.index]?.id;
    this.rivalCls = 'all'; this.overTime = false; this.linkedGame = null;
    // Each chapter opens on All, except those that show one time control at a time: they open
    // on the one played most, or keep the one picked on the chapter just left when they have it.
    let cls = 'all';
    if (SINGLE_CLASS.has(id)) cls = SINGLE_CLASS.has(from) && this.classOptionsFor(id).includes(this.cls) ? this.cls : this.mainClass(id);
    // super.rebuild: the chapter on screen is still the one being left, so no settling here.
    if (this.cls !== cls) { this.cls = cls; super.rebuild(); }
    super.go(this.deck.findIndex(slide => slide.id === id));
  }
  rebuild() {
    super.rebuild();
    // Switching players on a single-time-control chapter still shows one time control.
    const id = this.deck[this.index]?.id;
    if (!SINGLE_CLASS.has(id) || this.classOptionsFor(id).includes(this.cls)) return;
    const cls = this.mainClass(id);
    if (cls !== this.cls) { this.cls = cls; super.rebuild(); }
  }
  /** The time controls the switch offers on chapter `id`. Daily moves take hours, so a move-time chart has nothing to say about them. */
  classOptionsFor(id) { return (this.report?.classOptions || []).filter(cls => id !== 'clock' || cls !== 'daily'); }
  /** The time control with the most games in the period among those chapter `id` offers ('all' when it offers none). */
  mainClass(id) {
    const options = this.classOptionsFor(id);
    if (!options.length) return 'all';
    const bots = !!this.o.settings().profileIncludeBots, counts = {};
    // A shared link has no games, only each time control's chapters and how many games they cover.
    if (this.shared) for (const cls of options) counts[cls] = this.shared.byClass?.[cls]?.humanGames || 0;
    else for (const r of this.periodRows()) if (bots || !r.bot) counts[r.cls] = (counts[r.cls] || 0) + 1;
    return options.reduce((best, cls) => (counts[cls] || 0) > (counts[best] || 0) ? cls : best, options[0]);
  }

  tint(slide, l = .76, c = .15) { return `oklch(${l} ${c} ${CHAPTER_HUES[slide.id] ?? 150})`; }
  sceneFor(slide, spec) {
    if (slide.empty) return spec;
    const tinted = drawn => drawn ? {...drawn, scene: {...drawn.scene, color: this.tint(slide)}} : spec;
    switch (slide.id) {
      case 'rating': return tinted(this.ratingScene(slide));
      case 'season': case 'trend': return spec?.scene ? tinted(spec) : spec;
      case 'clock': {
        // "Increase granularity" swaps in the fine chart; flipping the switch splits (or closes) the one on the board.
        const drawn = (this.clockGrain && slide.fineBoard) || spec;
        if (!drawn?.scene) return spec;
        const out = tinted(drawn);
        if (this.grainSwitched) { out.scene.regroup = true; this.grainSwitched = false; }
        return out;
      }
      // "View your results over time": every game in order, drawn like the best-wins chart.
      case 'numbers': return (this.overTime && resultsOverTime(this.report?.totals?.runs)) || spec;
      case 'rival': {
        const r = this.rivalRecord(slide); if (!r) return spec;
        return {kind: 'fill', total: r.games, wins: r.w, draws: r.d, caption: ''};
      }
      case 'signature': {
        // Without typical-player figures to compare with, the board keeps its heat map of where the pieces land.
        if (!slide.compare?.length) return spec;
        // Four habit cards: the player's own signatures, the most unusual first.
        const ids = (slide.signatures || []).map(s => s.id);
        const chosen = [...slide.compare.filter(c => ids.includes(c.id)), ...slide.compare.filter(c => !ids.includes(c.id))];
        const items = chosen.slice(0, 4).map(c => ({id: c.id, label: c.label, short: SIG_SHORT[c.id] || c.label, you: c.rate, typical: c.baseline,
          number: c.number, youText: sigValue(c.rate, c.number), typicalText: sigValue(c.baseline, c.number)}));
        return {kind: 'blank', me: 'w', caption: '', scene: {type: 'signature-cards', items, color: this.tint(slide)}};
      }
      case 'habits': {
        const m = slide.board?.habitMatrix; if (!m) return spec;
        return {kind: 'blank', me: 'w', caption: '', scene: {type: 'bubbles', matrix: m, days: WEEKDAYS, bands: HABIT_BANDS, color: this.tint(slide),
          legend: [['', 'Bigger dot: more games'], ['pv-legend-good', 'Greener: higher win rate']]}};
      }
      case 'endings': return this.endingsPie() || spec;
      case 'share': return {...spec, scene: {type: 'overview'}};
      default: return spec;
    }
  }
  drawScene(scene, options) {
    if (scene.type === 'signature-cards') { this.viz.signatureCards(scene.items, scene); return; }
    if (scene.type !== 'overview') { super.drawScene(scene, options); return; }
    this.viz.overview(renderOverview({h: this.h, deck: this.deck, report: this.report, flag: country => this.o.flag?.(country), onOpen: index => {
      this.go(index);
      this.slideHost.firstElementChild?.focus({preventScroll: true});
    }}));
  }

  /* ---------- panel ---------- */
  /** In the deck: a back button, the player's name, and the compare and settings buttons (sharing is the last chapter's). */
  renderHead() {
    this.closeCompare(); this.closeSettings(); this.settingsGear = null;
    if (this.phase !== 'deck' || (this.shared && this.o.buildOwn)) {
      super.renderHead(); this.head.querySelector('.profile-head-title')?.remove(); return;
    }
    const {h} = this;
    // Focus and the names on screen before the redraw, so a switch keeps the focus and the new names glide in.
    const focused = this.head.contains(this.doc.activeElement) ? this.doc.activeElement.dataset.focus : null;
    const shownName = this.head.querySelector('.pv-head-name .profile-head-title')?.textContent, shownOther = this.head.querySelector('.pv-compare-swap')?.textContent;
    const other = this.compareOther();
    let compare;
    if (other) {
      // Comparing: Switch shows the other player, their name sliding up into the header as this one's slides into the button;
      // the × ends the comparison and goes back to the player the comparison started from.
      compare = h('div', {class: 'pv-compare is-pair', role: 'group', 'aria-label': 'Comparison'},
        h('button', {type: 'button', class: 'pv-compare-swap', 'data-focus': 'compare-swap', title: `Switch to ${other.name}`, 'aria-label': `Switch to ${other.name}`, onclick: event => this.slideSwitch(other, event.currentTarget)}, 'Switch'),
        h('button', {type: 'button', class: 'pv-compare-stop', 'data-focus': 'compare-stop', title: 'Stop comparing', 'aria-label': `Stop comparing with ${other.name}`, onclick: () => this.stopCompare()}, h('span', {'aria-hidden': 'true'}, '×')));
    } else {
      compare = h('button', {type: 'button', class: 'pv-compare', 'data-focus': 'compare', title: 'Show another player you built a profile for, on this chapter',
        'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: () => this.toggleCompare(compare)}, 'Compare');
    }
    const name = h('strong', {class: 'profile-head-title'}, this.account);
    this.head.replaceChildren(
      h('div', {class: 'pv-head-main'},
        h('button', {type: 'button', class: 'pv-back', title: 'Back to the start', 'aria-label': 'Back to the start: change player, site or period', onclick: () => this.renderSetup()}, h('span', {html: this.o.icon('prev')})),
        h('div', {class: 'pv-head-name'}, name)),
      h('div', {class: 'pv-head-actions'}, compare, this.settingsButton()));
    this.markSettings();
    if (focused) (this.head.querySelector(`[data-focus="${focused}"]`) || this.head.querySelector('[data-focus^="compare"]'))?.focus({preventScroll: true});
    // Mid-Switch the sliding name stands in for the new one until it lands.
    if (this.nameSlide) name.style.opacity = '0';
    else if (this.motion()) {
      const rise = node => node?.animate?.([{opacity: 0, transform: 'translateY(4px)'}, {opacity: 1, transform: 'none'}], {duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)'});
      if (shownName != null && shownName !== this.account) rise(name);
      const swap = compare.querySelector?.('.pv-compare-swap');
      if (swap && shownOther !== swap.textContent) rise(swap);
    }
    // Read the Compare list ahead, so the menu opens the moment it is pressed.
    const key = this.selectionKey();
    if (this.compareKey !== key || (!this.comparePlayersCache && !this.comparePending)) this.win.setTimeout(() => { if (!this.closed && this.phase === 'deck') this.loadComparePlayers().catch(() => {}); }, 300);
  }
  /** Compare: a short menu of the other players read before; picking one swaps the data on this chapter. */
  /**
   * The players for the Compare menu, read once in the background after the deck
   * opens (reading saved games takes a moment) and kept until the player changes.
   */
  loadComparePlayers() {
    const key = this.selectionKey();
    if (this.compareKey !== key) { this.compareKey = key; this.comparePlayersCache = null; this.comparePending = null; }
    if (this.comparePending) return this.comparePending;
    const pending = this.comparePending = this.comparablePlayers().then(list => {
      if (this.comparePending === pending) { this.comparePlayersCache = list; this.comparePending = null; }
      return list;
    });
    return pending;
  }
  /** Compare: a short menu of the other players read before; picking one swaps the data on this chapter. It opens at once, from the list read ahead. */
  async toggleCompare(button) {
    if (this.compareMenu) { this.closeCompare({focus: true}); return; }
    this.closeSettings();
    const {h} = this, key = this.selectionKey();
    const cached = this.compareKey === key ? this.comparePlayersCache : null;
    const menu = h('div', {class: 'pv-compare-menu', role: 'menu', tabindex: '-1', 'aria-label': 'Compare with another player', 'aria-busy': cached ? 'false' : 'true'});
    const items = () => [...menu.querySelectorAll('.pv-compare-item')];
    const fill = players => {
      const list = players.map(p => h('button', {type: 'button', role: 'menuitem', class: 'pv-compare-item', tabindex: '-1', onclick: () => { this.closeCompare(); this.pickCompare(p); }},
        h('strong', {}, p.name), h('small', {}, `${SITE_NAMES[p.site]} · ${fmt.plural(p.games, 'game')}`)));
      menu.replaceChildren(list.length ? h('span', {class: 'pv-compare-head', 'aria-hidden': 'true'}, 'Switch to') : h('p', {class: 'pv-compare-empty'}, 'No other players yet. Build a profile for someone else and they will appear here.'), ...list);
      menu.setAttribute('aria-busy', 'false');
    };
    if (cached) fill(cached);
    else menu.append(h('span', {class: 'pv-compare-head', 'aria-hidden': 'true'}, 'Switch to'), h('p', {class: 'pv-compare-empty pv-compare-loading'}, 'Finding your other players…'));
    menu.addEventListener('keydown', event => {
      const all = items(), at = all.indexOf(this.doc.activeElement);
      if (event.key === 'Escape' || event.key === 'Tab') { if (event.key === 'Escape') event.preventDefault(); this.closeCompare({focus: event.key === 'Escape'}); }
      else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && all.length) { event.preventDefault(); all[(at + (event.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length].focus(); }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault();
    });
    const outside = event => { if (!menu.contains(event.target) && !button.contains(event.target)) this.closeCompare(); };
    this.doc.addEventListener('pointerdown', outside, true);
    const open = this.compareMenu = {menu, button, release: () => this.doc.removeEventListener('pointerdown', outside, true)};
    button.setAttribute('aria-expanded', 'true'); button.classList.add('on');
    button.parentNode.append(menu);
    if (this.motion()) menu.animate([{opacity: 0, transform: 'translateY(-4px) scale(.98)'}, {opacity: 1, transform: 'none'}], {duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)'});
    (items()[0] || menu).focus({preventScroll: true});
    // Fresh names follow quietly (a player read in another tab, or the first open before the read-ahead finished).
    let players;
    try { players = await this.loadComparePlayers(); } catch { players = cached || []; }
    if (this.closed || this.compareMenu !== open) return;
    if (cached && JSON.stringify(players) === JSON.stringify(cached)) return;
    const focused = menu.contains(this.doc.activeElement);
    fill(players);
    if (focused) (items()[0] || menu).focus({preventScroll: true});
  }
  /* ---------- comparing two players ---------- */
  /** A player as Compare remembers them: the site (or 'both'), the accounts and the name on the header. */
  comparePlayer() { return {site: this.site, accounts: Object.fromEntries(this.sites().map(site => [site, this.accounts[site]])), name: this.account, shared: this.shared}; }
  static compareKey(p) { return JSON.stringify([p.site, (p.site === 'both' ? ['chesscom', 'lichess'] : [p.site]).map(site => (p.accounts?.[site] || '').toLowerCase())]); }
  /** While comparing, the player of the two who is not on screen; null when not comparing. */
  compareOther() {
    const pair = this.comparePair; if (!pair) return null;
    const now = StoryWorkspace.compareKey(this.comparePlayer());
    if (now === StoryWorkspace.compareKey(pair.home)) return pair.other;
    if (now === StoryWorkspace.compareKey(pair.other)) return pair.home;
    this.comparePair = null; return null;
  }
  /** A player picked in the Compare menu: shown at once, and the button now names the player the comparison started from. */
  async pickCompare(p) {
    const other = {site: p.site, accounts: {[p.site]: p.name}, name: p.name}, pair = this.comparePair = {home: this.comparePlayer(), other};
    const ok = await this.switchCompare(other);
    if (!ok && this.comparePair === pair && !this.closed) { this.comparePair = null; if (this.phase === 'deck') this.renderHead(); }
    return ok;
  }
  switchCompare(player) {
    return this.switchPlayer({site: player.site, name: player.name, accounts: player.accounts, shared: player.shared});
  }
  /**
   * Switch, with the two names trading places: the other player's slides from the
   * button up to the header while this one's slides down into the button and fades.
   * Copies of the name do the moving (the header is redrawn under them), so the
   * real name stays hidden until the copy has landed.
   */
  async slideSwitch(player, button) {
    const name = this.head.querySelector('.pv-head-name .profile-head-title');
    if (this.nameSlide) return false;
    if (!this.motion() || !button || typeof name?.animate !== 'function') return this.switchCompare(player);
    const outgoing = name.textContent, from = name.getBoundingClientRect(), control = button.getBoundingClientRect();
    // Measure the incoming title in the header before the browser paints the switch.
    name.textContent = player.name;
    const to = name.getBoundingClientRect();
    name.textContent = outgoing;
    const css = this.win.getComputedStyle(name), buttonCss = this.win.getComputedStyle(button);
    const scale = (parseFloat(buttonCss.fontSize) / parseFloat(css.fontSize)) || .75;
    const buttonLeft = control.left + (parseFloat(buttonCss.paddingLeft) || 0), buttonMiddle = control.top + control.height / 2;
    const ghost = (text, box) => {
      const node = this.doc.createElement('span');
      node.textContent = text; node.setAttribute('aria-hidden', 'true');
      Object.assign(node.style, {position: 'fixed', left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px', margin: '0', zIndex: '1000', pointerEvents: 'none',
        font: css.font, letterSpacing: css.letterSpacing, lineHeight: css.lineHeight, color: css.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transformOrigin: 'left center'});
      this.doc.body.append(node); return node;
    };
    // Halfway, one name passes a little below the other instead of through it.
    const towardButton = (box, progress, lift = 0) => {
      const x = (buttonLeft - box.left) * progress, y = (buttonMiddle - box.top - box.height / 2) * progress + lift;
      return `translate(${x}px, ${y}px) scale(${1 + (scale - 1) * progress})`;
    };
    const timing = {duration: 340, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'};
    const leaving = ghost(outgoing, from), arriving = ghost(player.name, to);
    this.nameSlide = true; name.style.opacity = '0';
    const slides = [leaving.animate([{transform: 'none', opacity: 1}, {transform: towardButton(from, .5, 7), opacity: .55}, {transform: towardButton(from, 1), opacity: 0}], timing),
      arriving.animate([{transform: towardButton(to, 1), opacity: 0}, {transform: towardButton(to, .5, -7), opacity: .8}, {transform: 'none', opacity: 1}], timing)];
    try {
      // A paused animation clock (a hidden tab) never finishes the slide: give up waiting shortly after it should have ended.
      const landed = Promise.race([Promise.all(slides.map(a => a.finished.catch(() => {}))), new Promise(resolve => this.win.setTimeout(resolve, 600))]);
      const [ok] = await Promise.all([this.switchCompare(player), landed]);
      return ok;
    } finally {
      this.nameSlide = false; leaving.remove(); arriving.remove();
      this.head.querySelector('.pv-head-name .profile-head-title')?.style.removeProperty('opacity');
    }
  }
  /** The ×: no more comparing. On the compared player's profile it goes back to the one the comparison started from. */
  async stopCompare() {
    const pair = this.comparePair; if (!pair) return;
    const away = StoryWorkspace.compareKey(this.comparePlayer()) !== StoryWorkspace.compareKey(pair.home);
    this.comparePair = null;
    if (away && await this.switchCompare(pair.home)) { this.head.querySelector('.pv-compare')?.focus({preventScroll: true}); return; }
    const focus = this.head.contains(this.doc.activeElement);
    this.renderHead();
    if (focus) this.head.querySelector('.pv-compare')?.focus({preventScroll: true});
  }
  toggleSettings(button) { this.closeCompare(); super.toggleSettings(button); }
  closeCompare({focus = false} = {}) {
    const open = this.compareMenu; if (!open) return;
    this.compareMenu = null; open.release();
    open.button.setAttribute('aria-expanded', 'false'); open.button.classList.remove('on');
    open.menu.remove();
    if (focus && open.button.isConnected) open.button.focus({preventScroll: true});
  }
  /** All · Bullet · Blitz …: narrows the current chapter to one time control. Chapters in SINGLE_CLASS have no All. */
  classFilter(slide) {
    const {h} = this;
    let options, current, pick;
    if (slide.id === 'rival') {
      options = byClassOrder(Object.keys(slide.rival?.byClass || {})); current = this.rivalCls;
      pick = cls => { this.rivalCls = cls; this.renderSlide({animate: false}); this.syncBoard(this.currentSlide(), true); };
    } else if (FILTERED.has(slide.id)) {
      options = this.classOptionsFor(slide.id); current = this.cls;
      pick = cls => { this.cls = cls; this.rebuild(); };
    } else return null;
    if (!options.length) return null;
    const single = SINGLE_CLASS.has(slide.id);
    if (!options.includes(current)) current = single ? options[0] : 'all';
    const choices = [...(single ? [] : [['all', 'All']]), ...options.map(cls => [cls, classLabel(cls)])];
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
    this.win.requestAnimationFrame(() => {
      if (!group.isConnected) return;
      if (group !== previous) { group.firstChild.style.transition = 'none'; this.placeClassFilterThumb(group); void group.offsetWidth; group.firstChild.style.transition = ''; }
      else this.placeClassFilterThumb(group);
    });
    return group;
  }
  placeClassFilterThumb(group) {
    const thumb = group.firstChild, button = group.querySelector('button.on');
    if (!button || !thumb) return;
    thumb.style.width = button.offsetWidth + 'px';
    thumb.style.transform = `translateX(${button.offsetLeft - 3}px)`;
  }
  rivalRecord(slide) {
    const r = slide.rival; if (!r) return null;
    return this.rivalCls !== 'all' && r.byClass?.[this.rivalCls] ? {...r.byClass[this.rivalCls], name: r.name} : r;
  }
  /** On the numbers chapter, in place of a game link: flips the board between the results squares and the results over time. */
  overTimeButton(slide) {
    if (slide.id !== 'numbers' || !this.report?.totals?.runs?.length) return null;
    const on = !!this.overTime;
    return this.h('button', {type: 'button', class: 'pv-link', 'aria-pressed': String(on), title: on ? 'Show all your results as one board of squares' : 'Chart how your games went, oldest first',
      onclick: () => { this.overTime = !on; this.renderSlide({animate: false}); this.syncBoard(this.currentSlide(), true); this.slideHost.querySelector('.pv-link[aria-pressed]')?.focus({preventScroll: true}); }},
    on ? 'Back to your overall results' : 'View your results over time');
  }
  /**
   * A game link shows that game in place of the chapter's own board (a chart, the
   * twin's portrait, the comeback). While that game is up, the link turns into the
   * way back: "Back to the chart" puts the chapter's board back as it was.
   */
  evidenceLink(slide, cls = 'pv-link') {
    return this.linkButton(slide, slide.evidence, 'evidence', () => this.gameInFacts(slide, 'evidence') ? null : super.evidenceLink(slide, cls), cls);
  }
  // If both links open the same game, the main link already offers the way back.
  // If the fact opens the second game, give it a separate link only for the way back.
  alsoEvidenceLink(slide, cls = 'pv-link') {
    const ev = slide.alsoEvidence;
    if (ev?.url && ev.id === slide.evidence?.id && ev.url === slide.evidence?.url && this.gameInFacts(slide, 'also')) return null;
    return this.linkButton(slide, ev, 'also', () => this.gameInFacts(slide, 'also') ? null : super.alsoEvidenceLink(slide, cls), cls);
  }
  gameInFacts(slide, kind) { return this.facts(slide).some(f => f.game === kind); }
  /** A fact's name that opens its game on the board. */
  factName(slide, f) {
    const ev = f.game === 'also' ? slide.alsoEvidence : f.game === 'evidence' ? slide.evidence : null;
    if (!ev?.url) return f.label;
    return this.h('button', {type: 'button', class: 'pv-fact-link', 'data-game-url': ev.url, title: ev.title || null,
      onclick: () => { this.viewGame(ev); if (!this.closed) this.shell.focus({preventScroll: true}); }}, f.label);
  }
  linkButton(slide, ev, kind, make, cls) {
    const seen = this.linkedGame;
    const button = ev?.id && seen?.slide === slide.id && seen.id === ev.id && seen.url === ev.url && this.activeGame
      ? this.h('button', {type: 'button', class: cls + ' pv-link-back', title: 'Close this game and show the chapter again (Esc)', onclick: () => this.backToChapter()}, BACK_TO[slide.id] || 'Back to the chapter')
      : make();
    if (button) button.dataset.link = kind;
    return button;
  }
  viewGame(ev) {
    const slide = this.deck[this.index];
    super.viewGame(ev);
    if (this.closed || !slide) return;
    // A chapter whose own board already plays this game has nothing to go back to: the game's Exit button stays the way out.
    const own = slide.board?.kind === 'replay' && slide.board.id === ev?.id && slide.board.url === ev?.url;
    this.linkedGame = ev?.id && !own && this.activeGame ? {slide: slide.id, id: ev.id, url: ev.url} : null;
    this.refreshLinks(slide);
  }
  exitGame() { this.linkedGame = null; super.exitGame(); }
  /** "Back to the chart": the chapter's own board again, exactly as it opened. */
  backToChapter() {
    this.linkedGame = null; this.dismissedGameSlide = null; this.boardSpecKey = null;
    this.renderSlide({animate: false});
    this.shell.focus({preventScroll: true});
  }
  /** Swap the chapter's game links for their current form (a link, or the way back) without redrawing the panel. */
  refreshLinks(slide) {
    for (const node of this.slideHost.querySelectorAll(`.pv-story[data-slide="${slide.id}"] [data-link]`)) {
      const fresh = node.dataset.link === 'also' ? this.alsoEvidenceLink(slide) : this.evidenceLink(slide);
      if (!fresh) { node.remove(); continue; }
      node.replaceWith(fresh);
      this.slideLinkIn(fresh);
    }
    // A game opened from its fact's name needs a way back in the chapter's links.
    const article = this.slideHost.querySelector(`.pv-story[data-slide="${slide.id}"]`);
    if (!article) return;
    let link = article.querySelector('[data-link="evidence"]');
    if (!link && this.gameInFacts(slide, 'evidence')) {
      link = this.evidenceLink(slide);
      if (link) { article.append(link); this.slideLinkIn(link); }
    }
    if (article.querySelector('[data-link="also"]')) return;
    const back = this.alsoEvidenceLink(slide);
    if (!back) return;
    if (link && !link.parentNode.classList.contains('pv-links')) { const row = this.h('div', {class: 'pv-links'}); link.before(row); row.append(link, back); }
    else if (link) link.after(back);
    else article.append(back);
    this.slideLinkIn(back);
  }
  slideLinkIn(node) {
    if (this.motion() && typeof node.animate === 'function') node.animate([{opacity: 0, transform: 'translateX(-4px)'}, {opacity: 1, transform: 'none'}], {duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)'});
  }
  syncBoard(slide, force = false) {
    if (force) this.boardSpecKey = null;
    super.syncBoard(slide);
  }
  boardKeyFor(slide) { return JSON.stringify([super.boardKeyFor(slide), slide.id === 'rival' ? this.rivalCls : null, slide.id === 'numbers' ? !!this.overTime : null, slide.id === 'endings' ? this.endingsKey() : null, slide.id === 'openings' ? this.openingPick : null, slide.id === 'clock' && this.clockGrain && slide.fineBoard ? 'fine' : null]); }
  /**
   * "Increase granularity" under the time-control switch on the clock chapter:
   * the move-time chart in narrow intervals (tenths of a second in bullet). The
   * same control lives across renders, so its thumb slides when flipped.
   */
  grainSwitch(slide) {
    if (slide.id !== 'clock' || !slide.fineBoard) return null;
    const {h} = this;
    this.grainButton ||= h('button', {type: 'button', class: 'pv-grain', role: 'switch', 'aria-label': 'Increase granularity', title: 'Split the chart into narrower move times',
      onclick: () => {
        this.clockGrain = !this.clockGrain;
        this.grainButton.setAttribute('aria-checked', String(this.clockGrain));
        this.grainSwitched = true;
        this.syncBoard(this.currentSlide());
        this.grainSwitched = false;
      }},
      h('span', {class: 'pv-grain-label'}, 'Increase granularity'),
      h('span', {class: 'pv-grain-track', 'aria-hidden': 'true'}, h('span', {class: 'pv-grain-thumb'}, h('span', {class: 'pv-grain-tick'}))));
    this.grainButton.setAttribute('aria-checked', String(!!this.clockGrain));
    return this.grainButton;
  }
  renderSlide({animate = true} = {}) {
    if (this.closed || !this.deck.length) return;
    const {h} = this, slide = this.currentSlide(), R = this.report;
    const previous = this.slideHost.querySelector('.pv-story');
    // Accuracy updates and comparison mode changes keep the article and its top row
    // in place. The accuracy check also keeps Stop between press and release.
    const sameChapter = previous?.dataset.slide === slide.id;
    const inPlace = !animate && sameChapter && ['trend', 'signature'].includes(slide.id);
    const keptTop = inPlace ? previous.querySelector(':scope > .pv-story-top') : null;
    const keptEngine = inPlace && this.engineBlock?.parentNode === previous ? this.engineBlock : null;
    const kept = new Map(), keep = node => { const mark = this.doc.createComment(''); kept.set(mark, node); return mark; };
    // Read the visible state before moving a retained switch or cancelling a tween.
    const oldFigure = sameChapter ? previous.querySelector('.pv-story-figure')?.pvCountValues?.slice() : null;
    const openingState = sameChapter && slide.id === 'openings' ? this.openingState() : null;
    const signatureState = sameChapter && slide.id === 'signature' ? this.signatureState() : null;
    const keptComparison = inPlace && slide.id === 'signature' ? previous.querySelector('.pv-cmp-wrap') : null;
    this.countAnimations?.forEach(a => a.cancel?.()); this.countAnimations = [];
    this.shell.style.setProperty('--pv-hue', CHAPTER_HUES[slide.id] ?? 150);
    const hero = this.hero(slide);
    const article = h('article', {class: 'pv-story', tabindex: '-1', 'aria-label': slide.eyebrow, 'data-slide': slide.id, 'data-animate': animate && this.motion() ? 'on' : 'off', 'data-direction': this.direction > 0 ? 'next' : 'prev'});
    const top = h('div', {class: 'pv-story-top'});
    // The overview has no heading: "Share your results" stands centred at the top of the panel instead.
    if (slide.id !== 'cover' && slide.id !== 'share') top.append(h('span', {class: 'pv-story-chapter'}, slide.eyebrow));
    if (slide.id === 'share') { const results = this.shareResultsButton(); if (results) article.append(h('div', {class: 'pv-share-results'}, results)); }
    const modes = slide.id === 'rating' ? this.ratingModes(slide, () => this.renderSlide({animate: false})) : this.classFilter(slide);
    // The switch already on screen has been set to the new choice where it stands (classFilter): keep its row as it is.
    if (keptTop && modes && keptTop.contains(modes) && keptTop.querySelector('.pv-story-chapter')?.textContent === slide.eyebrow) article.append(keep(keptTop));
    else {
      if (modes) top.append(modes);
      if (top.childNodes.length) article.append(top);
    }
    // "Increase granularity" sits beside the big figure, in the room it leaves on the right, so nothing below moves down.
    const grain = this.grainSwitch(slide);
    // A chapter without a hero (the comparison list) gives that room to its list.
    // A text hero's longest word (a long username on the cover or the rival chapter) shrinks to fit the panel instead of breaking mid-word (designs.css).
    const longestWord = hero.text ? Math.max(0, ...(hero.phrases || String(hero.value).split(/\s+/)).map(word => word.length)) : 0;
    const flag = slide.id === 'cover' && slide.country ? this.o.flag?.(slide.country) : null;
    const heroNode = hero.value == null ? null : h('div', {class: 'pv-story-hero' + (hero.text ? ' is-text' : '') + (grain ? ' has-side' : '')},
      h('strong', {class: 'pv-story-figure', 'data-count': hero.text ? null : 'on', style: longestWord > 6 ? `--pv-word: ${longestWord}` : null},
        hero.phrases ? hero.phrases.flatMap((phrase, i) => [i ? ' ' : '', h('span', {class: 'pv-story-phrase'}, phrase)]) : flag ? h('span', {}, hero.value) : hero.value, flag),
      hero.label ? h('span', {class: 'pv-story-label'}, hero.label) : null, grain);
    if (grain && !heroNode) top.append(grain);
    if (heroNode) article.append(heroNode);
    // A chapter without enough games keeps to its message: no tabs, bars, legends, links or engine block.
    const full = !slide.empty;
    if (full && slide.id === 'endings' && R?.terminations) article.append(this.endingTabs());
    const points = hero.points ?? slide.points, lead = 'lead' in hero ? hero.lead : slide.lead;
    if (slide.intro) article.append(this.introFacts(slide.intro));
    else if (points?.length) article.append(h('ul', {class: 'pv-points'}, ...points.map(t => h('li', {}, t))));
    else if (lead) article.append(h('p', {class: 'pv-story-lead'}, lead));
    if (full && slide.id === 'numbers' && R?.totals) article.append(this.wdlBar(R.totals));
    if (full && slide.id === 'endings') article.append(...this.endingsLegend());
    // Played against missed, in shares, like the results bar on the numbers chapter.
    if (full && slide.id === 'mate1' && R?.mateInOne?.chances) article.append(this.mateBar(R.mateInOne));
    // The rival's record as the same bar, in shares: the sentence above already gives the counts.
    if (slide.id === 'rival') { const r = this.rivalRecord(slide); if (r?.games) article.append(this.wdlBar(r, {percent: true})); }
    const facts = this.facts(slide);
    if (facts.length) article.append(h('dl', {class: 'pv-facts' + (facts.length === 4 ? ' pv-facts-4' : '')}, ...facts.map(f => h('div', {class: 'pv-fact'}, h('dt', {}, this.factName(slide, f), f.sub ? h('small', {}, f.sub) : null), h('dd', {}, f.value)))));
    if (slide.openings) article.append(this.openingsView(slide));
    if (slide.id === 'signature') {
      const comparison = this.signatureView(slide);
      if (keptComparison && comparison.length) {
        this.patchSignature(keptComparison, comparison[0]);
        article.append(keep(keptComparison));
      } else article.append(...comparison);
    }
    if (slide.twin?.reasons?.length) article.append(h('ul', {class: 'pv-reasons'}, ...slide.twin.reasons.slice(0, 3).map(t => h('li', {}, t))));
    // The endings tabs already say how losses and draws end.
    else if (!['share', 'signature', 'openings', 'endings'].includes(slide.id) && slide.bullets?.length) article.append(h('ul', {class: 'pv-reasons'}, ...slide.bullets.slice(0, slide.id === 'rival' || slide.id === 'habits' ? 4 : slide.id === 'numbers' ? 1 : 2).map(t => h('li', {}, t))));
    const engine = !full ? (this.engineBlock = null) : keptEngine && (slide.pending === 'engine' || slide.id === 'trend') ? keptEngine : this.engineSlot(slide);
    if (engine) article.append(engine === keptEngine ? keep(engine) : engine);
    if (slide.id === 'share') article.append(this.renderShare({animate}));
    // The numbers chapter charts your results over time where other chapters link a game.
    let link = !full ? null : slide.id === 'numbers' ? this.overTimeButton(slide) : this.evidenceLink(slide), also = full ? this.alsoEvidenceLink(slide) : null;
    // The missed mate's game, on one line with a nudge to go and look (the line hides with the link when the game has no address).
    if (link && slide.board?.kind === 'puzzle') link = h('p', {class: 'pv-link-line'}, h('span', {}, "Don't believe you missed that? Check for yourself:"), ' ', link);
    if (link && also) article.append(h('div', {class: 'pv-links'}, link, also)); else if (link || also) article.append(link || also);
    if (kept.size) this.patchArticle(previous, article, kept); else this.slideHost.replaceChildren(article);
    if (openingState) this.carryOpenings(openingState);
    if (signatureState) this.carrySignature(signatureState);
    this.renderEngineBlock();
    this.renderNav();
    this.renderProgress();
    this.syncBoard(slide);
    if (animate) this.countUpNodes(article.querySelectorAll('.pv-fact dd, .pv-intro-stat dd'));
    if (hero.count && heroNode) {
      const {values, format} = hero.count;
      const from = animate ? values.map(() => 0) : oldFigure?.length === values.length ? oldFigure : values;
      this.tweenValues(heroNode.querySelector('strong'), from, values, format, animate ? 1000 : 420);
    }
    if (!kept.size) this.slideHost.scrollTop = 0;
  }
  /**
   * Turn the chapter on screen into `fresh` without taking out the nodes kept
   * (`kept` maps each placeholder in `fresh` to the node on screen it stands for):
   * the other parts are swapped around them, and the kept ones never leave the page.
   */
  patchArticle(article, fresh, kept) {
    const wanted = [...fresh.childNodes].map(node => kept.get(node) || node);
    for (const child of [...article.childNodes]) if (!wanted.includes(child)) child.remove();
    let at = article.firstChild;
    for (const node of wanted) {
      if (node === at) { at = at.nextSibling; continue; }
      article.insertBefore(node, at);
    }
    article.dataset.animate = 'off';
    article.setAttribute('aria-label', fresh.getAttribute('aria-label') || '');
  }
  /** The intro's facts: the period and site on one line, then the games and the hours at the board as two figures. */
  introFacts(intro) {
    const {h} = this, hours = intro.hours ?? 0;
    const figure = (value, label) => h('div', {class: 'pv-intro-stat'}, h('dt', {}, label), h('dd', {}, value));
    const hoursLabel = hours >= 1 && hours < 10 && Math.round(hours * 10) === 10 ? 'hour at the board' : hours < 1 ? 'minutes at the board' : 'hours at the board';
    return h('div', {class: 'pv-intro'},
      h('p', {class: 'pv-intro-period'}, h('span', {}, intro.period), h('i', {'aria-hidden': 'true'}), h('span', {}, 'on ' + intro.site)),
      h('dl', {class: 'pv-intro-stats'},
        figure(fmt.int(intro.games), intro.games === 1 ? 'game' : 'games'),
        figure(hours < 1 ? String(Math.max(1, Math.round(hours * 60))) : fmt.hoursNum(hours), hoursLabel)));
  }
  /** The single figure a chapter is about. Text heroes (names) are set smaller. */
  hero(slide) {
    const R = this.report, T = R?.totals;
    const count = (value, format = fmt.int) => ({values: [value], format: ([n]) => format(n)});
    if (slide.empty) return {value: slide.title, text: true, label: null};
    switch (slide.id) {
      case 'cover': return {value: slide.title, text: true, label: null};
      // The results bar says the rest; no sentence repeating it.
      case 'numbers': return {value: fmt.int(T.games), count: count(T.games), label: 'games played', lead: null};
      // "March was your busiest month"; the streak stays among the facts below.
      case 'season': return {value: slide.title, text: true};
      case 'rating': { const r = R.ratings?.[slide.ratingClass]; return r ? {value: fmt.signed(r.change), count: count(r.change, fmt.signed), label: `${R.otherRatings?.[slide.ratingClass] ? SITE_NAMES[R.ratingSite] + ' ' + classLabel(slide.ratingClass).toLowerCase() : classLabel(slide.ratingClass)} rating, ${r.start} → ${r.end}`, lead: `Peaking at ${r.peak.rating} on ${fmt.date(r.peak.t)}.`} : {value: slide.title, text: true}; }
      case 'openings': return {value: slide.title, text: true, label: null, lead: null};
      // The most unusual habit already leads the list, with its sentence under it.
      case 'signature': return slide.compare?.length ? {value: null, label: null, lead: null} : {value: slide.title, text: true};
      case 'hits': {
        const s = R.opponents?.strongestBeaten, streak = R.streaks?.win?.length;
        return s ? {value: String(s.rating), count: count(s.rating, n => String(Math.round(n))), label: 'the highest-rated player you beat', lead: slide.lead}
          : {value: slide.title, text: true, count: streak ? count(streak, n => `${Math.round(n)} wins in a row`) : null};
      }
      case 'swings': { const parts = /^(Down .+ points,) (still won)$/.exec(slide.title); return {value: slide.title, text: true, phrases: parts ? parts.slice(1) : null}; }
      // "Night owl", "Tuesday player": the share of games behind it under the name.
      case 'habits': return {value: slide.title, text: true, label: slide.heroLabel || null};
      case 'clock': return R.clock?.averageThink != null ? {value: fmt.seconds(Math.round(R.clock.averageThink)), count: count(R.clock.averageThink, n => fmt.seconds(Math.round(n))), label: 'per move, on average'} : {value: slide.title, text: true};
      case 'mate1': { const M = R.mateInOne; return M?.chances ? {value: mateInOneShares(M).missed + '%', count: count(mateInOneShares(M).missed, n => Math.round(n) + '%'), label: 'of your mates in one missed'} : {value: slide.title, text: true}; }
      case 'trend': {
        // The deck's headline already uses the exact ends of the chart's smoothed line.
        const values = [...slide.title.matchAll(/([\d,.]+)%/g)].map(m => Number(m[1].replace(/,/g, '')));
        const format = values.length === 2 ? ([a, b]) => `${fmt.pct(a)} → ${fmt.pct(b)}` : ([n]) => `${fmt.pct(n)} accuracy`;
        return {value: slide.title, text: true, count: values.length ? {values, format} : null};
      }
      // The chosen tab's games ("1,369 wins") and their share of all your games.
      case 'endings': { const lead = this.ending()?.lead ?? slide.lead, model = this.endingSlices();
        return model ? {value: fmt.int(model.total), count: count(model.total), label: `${model.total === 1 ? {w: 'win', l: 'loss', d: 'draw'}[model.view] : model.noun}, ${smallShare(model.total, T.games, Math.round(100 * model.total / Math.max(1, T.games)))}% of all your games`, lead} : {value: slide.title, text: true, lead}; }
      // "Overview" and one line on the board; the developer's note and the figure say the rest.
      case 'share': return {value: null, label: null};
      case 'rival': { const r = this.rivalRecord(slide); return {value: slide.title, text: true, label: 'your most-played opponent', lead: r ? rivalLine(r, slide.title) : slide.lead}; }
      default: return {value: slide.title, text: true, label: null};
    }
  }
  facts(slide) {
    const stats = slide.stats || [];
    if (slide.id === 'numbers') return stats.filter(s => !['Wins', 'Draws', 'Losses'].includes(s.label));
    if (slide.id === 'rating') return stats.filter(s => s.label !== 'Rated games');
    if (slide.id === 'rival') return [];
    // The endings legend says what the facts would: one row per way the games ended.
    if (slide.id === 'endings' && this.report?.terminations) return [];
    return stats.slice(0, 4);
  }
  /** Wins · Losses · Draws on the endings chapter, like the openings sort: each shows how those games ended. */
  endingTabs() {
    const {h} = this, view = this.endingView || 'w';
    return h('div', {class: 'pv-tabs', role: 'tablist', 'aria-label': 'How your games end'}, ...ENDING_VIEWS.map(([id, label]) =>
      h('button', {type: 'button', role: 'tab', class: id === view ? 'on' : '', 'aria-selected': String(id === view), onclick: () => {
        if (id === view) return;
        this.endingView = id; this.renderSlide({animate: false});
        this.slideHost.querySelector(`.pv-tabs [role="tab"][aria-selected="true"]`)?.focus({preventScroll: true});
      }}, label)));
  }
  /**
   * How the chosen result's games ended, largest first: the four most common
   * endings, and the rest (with games whose ending is not known) as "Other". Every
   * share is of all those games, rounded to whole percents that add up to 100, so
   * the ring on the board, the legend and the sentence always agree.
   */
  endingSlices() {
    const X = this.report?.terminations, T = this.report?.totals; if (!X || !T) return null;
    const view = this.endingView || 'w', m = {w: X.wins, l: X.losses, d: X.draws}[view] || {}, total = T[view] || 0;
    const noun = {w: 'wins', l: 'losses', d: 'draws'}[view];
    if (!total) return {view, noun, total, slices: []};
    const named = Object.entries(m).filter(([key, n]) => n > 0 && key !== 'other').sort((a, b) => b[1] - a[1]).slice(0, 4);
    const rest = total - named.reduce((s, [, n]) => s + n, 0);
    const slices = [...named.map(([key, n]) => ({key, n})), ...(rest > 0 ? [{key: 'other', n: rest}] : [])];
    // Largest remainder: whole percents that still add up to 100.
    const raw = slices.map(s => 100 * s.n / total), pcts = raw.map(Math.floor);
    raw.map((v, i) => [v - pcts[i], i]).sort((a, b) => b[0] - a[0]).slice(0, 100 - pcts.reduce((s, v) => s + v, 0)).forEach(([, i]) => pcts[i]++);
    let shade = 0;
    slices.forEach((s, i) => {
      s.name = s.short = ENDING_NAMES[s.key] || TERM_LABELS[s.key] || s.key;
      s.share = raw[i]; s.pct = pcts[i]; s.text = smallShare(s.n, total, s.pct);
      s.color = s.key === 'other' ? 'color-mix(in srgb, var(--ink) 26%, var(--panel))' : `color-mix(in srgb, ${ENDING_TONES[view]} ${ENDING_SHADES[shade++]}%, var(--panel))`;
    });
    return {view, noun, total, slices};
  }
  /** The sentence for the chosen tab: the ending that comes up most, in plain words. */
  ending() {
    const model = this.endingSlices(); if (!model) return null;
    const {noun, total, slices} = model;
    if (!total) return {lead: `No ${noun} in this period.`};
    const top = slices.find(s => s.key !== 'other') || slices[0];
    const how = top.key === 'other' ? 'end in other ways' : top.key === 'time' ? 'come on time' : top.key === 'abandon' ? 'come when your opponent leaves' : `come by ${TERM_LABELS[top.key] || top.key}`;
    return {lead: `Your ${noun} most often ${how}: ${top.pct}% of them.`};
  }
  /**
   * What the endings ring shows: the tab and every slice. The deck's own board for
   * the chapter (a mating position) can be the same for All and for one time
   * control, so the ring's data is what tells the board to turn to the new shares.
   */
  endingsKey() {
    const model = this.endingSlices();
    return [this.endingView || 'w', model ? model.total : 0, ...(model?.slices || []).map(s => s.key + ':' + s.n)].join(' ');
  }
  /** The chosen result's endings as a ring on the board, its total in the middle. */
  endingsPie() {
    const model = this.endingSlices(); if (!model?.slices.length) return null;
    const {noun, total, slices} = model;
    return {kind: 'blank', me: 'w', caption: '', scene: {type: 'pie', label: `How your ${noun} end.`, center: {value: fmt.int(total), label: noun},
      slices: slices.map(s => ({share: s.share, pct: s.pct, text: s.text, color: s.color, label: s.name, short: s.short, detail: `${s.name}: ${s.text}% of your ${noun} (${fmt.plural(s.n, 'game')}).`}))}};
  }
  /** The legend beside the ring: one row per ending in the ring's colours (how many games that was is the big figure above). */
  endingsLegend() {
    const model = this.endingSlices(); if (!model?.slices.length) return [];
    const {h} = this, {noun, slices} = model;
    const list = h('ul', {class: 'pv-endings', 'aria-label': `How your ${noun} end`}, ...slices.map((s, i) => {
      const row = h('li', {}, h('i', {class: 'pv-endings-dot', 'aria-hidden': 'true'}), h('span', {class: 'pv-endings-name'}, s.name),
        h('span', {class: 'pv-endings-count'}, fmt.plural(s.n, 'game')), h('b', {class: 'pv-endings-share'}, s.text + '%'));
      row.style.setProperty('--c', s.color); row.style.setProperty('--i', String(i));
      return row;
    }));
    return [list];
  }
  /** Mates in one found against missed, as the results bar in shares. */
  mateBar(M) {
    const {found, missed} = mateInOneShares(M);
    return this.wdlBar({games: M.chances, w: M.found, d: 0, l: M.missed}, {percent: true, labels: {w: 'found', d: '', l: 'missed'}, noun: 'mate',
      describe: () => `Found ${found}%, missed ${missed}% of ${fmt.plural(M.chances, 'mate')} in one`});
  }
  /**
   * Won · drawn · lost as one bar, each part as wide as its share; `percent` labels the parts with their share instead of the count.
   * `labels`, `noun` and `describe` reword it for other two- or three-way splits (mates played and missed).
   */
  wdlBar(T, {percent = false, labels = {w: 'won', d: 'drawn', l: 'lost'}, noun = 'game', describe = null} = {}) {
    const {h} = this;
    // The bar already on this chapter changes in place (a new time control); another chapter's bar is never reused.
    const existing = this.slideHost.querySelector(`.pv-story[data-slide="${this.deck[this.index]?.id}"] .pv-wdl`);
    const bar = existing || h('div', {class: 'pv-wdl', role: 'img'}, ...['w', 'd', 'l'].map(cls => h('span', {class: 'pv-wdl-seg ' + cls}, h('b'), h('small', {}, labels[cls]))));
    const total = Math.max(1, T.games), share = cls => Math.round(100 * T[cls] / total);
    // Rounded shares that still add up to 100: the largest part takes the rounding.
    const shares = {w: share('w'), d: share('d'), l: share('l')};
    if (percent) { const top = ['w', 'd', 'l'].reduce((a, b) => T[b] > T[a] ? b : a); shares[top] += 100 - shares.w - shares.d - shares.l; }
    bar.setAttribute('aria-label', describe ? describe(shares) : percent ? `Won ${shares.w}%, drew ${shares.d}%, lost ${shares.l}% of ${fmt.plural(T.games, 'game')}` : `${T.w} wins, ${T.d} draws, ${T.l} losses`);
    for (const cls of ['w', 'd', 'l']) {
      const seg = bar.querySelector('.' + cls), count = seg.querySelector('b'), value = percent ? shares[cls] : T[cls], format = percent ? n => Math.round(n) + '%' : fmt.int;
      seg.style.flexGrow = String(T[cls] / total);
      seg.classList.toggle('is-empty', !T[cls]); seg.title = `${seg.querySelector('small').textContent}: ${fmt.plural(T[cls], noun)}${percent ? ` (${shares[cls]}%)` : ''}`;
      if (existing) this.tweenCount(count, count.textContent, value, format); else count.textContent = format(value);
    }
    return bar;
  }
  tweenCount(node, from, target, format = fmt.int) {
    const startValue = Number(String(from).replace(/[,%]/g, ''));
    this.tweenValues(node, [startValue], [target], ([n]) => format(n));
  }
  /** Keep the displayed values, including mid-tween values, for the next mode change. */
  tweenValues(node, from, target, format, duration = 420) {
    const show = values => { node.pvCountValues = values; node.textContent = format(values); };
    show(target);
    if (!this.motion() || from.some(n => !Number.isFinite(n)) || from.every((n, i) => n === target[i])) return;
    const start = this.win.performance.now();
    let frame;
    const tick = now => {
      const p = Math.min(1, (now - start) / duration);
      show(p === 1 ? target : target.map((n, i) => from[i] + (n - from[i]) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = this.win.requestAnimationFrame(tick);
    };
    show(from);
    frame = this.win.requestAnimationFrame(tick);
    this.countAnimations.push({cancel: () => this.win.cancelAnimationFrame(frame)});
  }
  /** Sample the visible width, so a quick second switch continues an unfinished bar glide. */
  shownBarWidth(bar) {
    const width = bar.parentNode.getBoundingClientRect().width;
    return width ? 100 * bar.getBoundingClientRect().width / width + '%' : bar.style.width;
  }
  glideBar(bar, from, {duration = 420} = {}) {
    if (!this.motion() || !bar.animate || !from || Math.abs(parseFloat(from) - parseFloat(bar.style.width)) < .01) return;
    this.countAnimations.push(bar.animate([{width: from}, {width: bar.style.width}], {duration, easing: 'cubic-bezier(.2,.8,.2,1)'}));
  }
  openingState() {
    return [...this.slideHost.querySelectorAll('.pv-rank-row')].map(row => ({
      width: this.shownBarWidth(row.querySelector('.pv-rank-meter i')), value: row.querySelector('.pv-rank-value').textContent,
    }));
  }
  /** Each rank's meter and percentage travel together when its opening changes. */
  carryOpenings(state) {
    this.slideHost.querySelectorAll('.pv-rank-row').forEach((row, i) => {
      if (!state[i]) return;
      const bar = row.querySelector('.pv-rank-meter i'), value = row.querySelector('.pv-rank-value');
      this.glideBar(bar, state[i].width);
      this.tweenCount(value, state[i].value, Number(value.textContent.replace('%', '')), fmt.pct);
    });
  }
  /** Openings by games played, highest or lowest win rate; picking one shows its usual line on the board. */
  openingsView(slide) {
    const {h} = this, all = slide.openings.all || [...slide.openings.w.map(o => ({...o, color: 'w'})), ...slide.openings.b.map(o => ({...o, color: 'b'}))];
    const view = this.openingView || 'played';
    const enough = all.filter(o => o.games >= 5);
    const list = (view === 'played' ? [...all].sort((a, b) => b.games - a.games)
      : view === 'best' ? [...(enough.length >= 3 ? enough : all)].sort((a, b) => b.score - a.score || b.games - a.games)
      : [...(enough.length >= 3 ? enough : all)].sort((a, b) => a.score - b.score || b.games - a.games)).slice(0, 4);
    const meter = value => { const bar = h('i'); bar.style.width = (value || 0) + '%'; return h('span', {class: 'pv-rank-meter'}, bar); };
    const pickOf = o => ({name: o.name, line: o.line || '', color: o.color});
    const same = (a, b) => !!a && !!b && a.name === b.name && a.color === b.color;
    // The board always plays one of the listed openings, and that row is marked:
    // the top one until the player picks another (also after switching the sort).
    if (!list.some(o => same(o, this.openingPick))) this.openingPick = list[0] ? pickOf(list[0]) : null;
    const choose = o => { this.dismissedGameSlide = null; this.boardSpecKey = null; this.openingPick = pickOf(o); this.renderSlide({animate: false}); };
    const tabs = h('div', {class: 'pv-tabs', role: 'tablist', 'aria-label': 'Sort openings'}, ...OPENING_VIEWS.map(([id, label]) =>
      h('button', {type: 'button', role: 'tab', class: id === view ? 'on' : '', 'aria-selected': String(id === view), onclick: () => {
        if (id === view) return;
        this.openingView = id; this.openingPick = null; this.dismissedGameSlide = null; this.renderSlide({animate: false});
        this.slideHost.querySelector('.pv-tabs [aria-selected="true"]')?.focus({preventScroll: true});
      }}, label)));
    return h('div', {class: 'pv-openings'}, tabs,
      h('div', {class: 'pv-rank-head', 'aria-hidden': 'true'}, h('span', {}, 'Opening'), h('span', {}, 'Win rate')),
      h('ol', {class: 'pv-rank'}, ...list.map((o, i) => h('li', {class: same(o, this.openingPick) ? 'on' : ''},
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
    let compare = [...texts.keys()].map(id => metrics.get(id)).filter(Boolean)
      .concat((slide.compare || []).filter(c => !texts.has(c.id)));
    // Another time control redraws the list in place: the rows keep the order they had on screen, so only
    // their bars and figures change (rows the new time control lacks drop out, new ones join at the end).
    const shown = this.slideHost?.querySelector('.pv-story[data-slide="signature"] .pv-cmp-list');
    if (shown) {
      const rank = new Map([...shown.children].map((li, i) => [li.dataset.id, i]));
      compare = compare.map((c, i) => [c, rank.get(c.id) ?? rank.size + i]).sort((a, b) => a[1] - b[1]).map(([c]) => c);
    }
    if (compare.length) {
      const row = c => {
        const top = Math.max(c.rate, c.baseline, 1e-9) * 1.1;
        const bar = (v, cls) => { const i = h('i', {class: cls}); i.style.width = Math.min(100, 100 * v / top) + '%'; return i; };
        return h('li', {class: 'pv-cmp' + (texts.has(c.id) ? ' is-signature' : ''), 'data-id': c.id}, h('span', {class: 'pv-cmp-label'}, c.label, texts.has(c.id) ? h('small', {}, texts.get(c.id)) : null),
          h('span', {class: 'pv-cmp-bars'}, bar(c.rate, 'you'), bar(c.baseline, 'typical')),
          h('span', {class: 'pv-cmp-values'}, h('b', {}, sigValue(c.rate, c.number)), h('small', {}, sigValue(c.baseline, c.number))));
      };
      const list = h('ol', {class: 'pv-cmp-list', tabindex: '0', 'aria-label': 'Your rates against a typical player, most unusual first'}, ...compare.map(row));
      // The bottom edge fades only while more rows wait below; the last row, once reached, reads like the rest.
      const edge = () => list.classList.toggle('pv-more', list.scrollTop + list.clientHeight < list.scrollHeight - 2);
      list.addEventListener('scroll', edge, {passive: true});
      this.win.requestAnimationFrame(edge);
      out.push(h('div', {class: 'pv-cmp-wrap pv-noadvance'},
        h('div', {class: 'pv-cmp-head'}, h('span', {}, 'You against a typical player'), h('span', {class: 'pv-cmp-key'}, h('i', {class: 'you'}), 'You', h('i', {class: 'typical'}), 'Typical')), list));
    }
    return out;
  }
  /** Where the comparison rows and their bars stand now, so a new time control moves them instead of drawing them again. */
  signatureState() {
    const list = this.slideHost.querySelector('.pv-story[data-slide="signature"] .pv-cmp-list');
    if (!list) return null;
    const rows = new Map([...list.children].map(li => [li.dataset.id, {height: li.offsetHeight,
      bars: [...li.querySelectorAll('.pv-cmp-bars i')].map(bar => this.shownBarWidth(bar)), values: [...li.querySelectorAll('.pv-cmp-values > *')].map(node => node.textContent)}]));
    return {rows, scroll: list.scrollTop};
  }
  /** Retain the list, rows and bars: unchanged content never leaves the layout or loses focus. */
  patchSignature(shown, fresh) {
    const list = shown.querySelector('.pv-cmp-list'), next = fresh.querySelector('.pv-cmp-list');
    const rows = new Map([...list.children].map(li => [li.dataset.id, li]));
    const wanted = [...next.children].map(row => {
      const kept = rows.get(row.dataset.id);
      if (!kept) return row;
      kept.className = row.className;
      const label = kept.querySelector('.pv-cmp-label'), nextLabel = row.querySelector('.pv-cmp-label');
      if (label.textContent !== nextLabel.textContent) label.replaceChildren(...nextLabel.childNodes);
      kept.querySelectorAll('.pv-cmp-bars i').forEach((bar, i) => { bar.style.width = row.querySelectorAll('.pv-cmp-bars i')[i].style.width; });
      kept.querySelectorAll('.pv-cmp-values > *').forEach((value, i) => { value.textContent = row.querySelectorAll('.pv-cmp-values > *')[i].textContent; });
      return kept;
    });
    for (const row of [...list.children]) if (!wanted.includes(row)) row.remove();
    let at = list.firstChild;
    for (const row of wanted) {
      if (row === at) at = at.nextSibling;
      else list.insertBefore(row, at);
    }
  }
  /**
   * Only changed bars and figures animate. A changed description resizes its own
   * row in normal flow, so rows below follow together without a stagger or jump.
   */
  carrySignature({rows, scroll}) {
    const list = this.slideHost.querySelector('.pv-cmp-list');
    if (!list) return;
    const items = [...list.children];
    // Rows already on screen skip their bars' first growth; marked before anything is measured, so no bar starts it.
    for (const li of items) if (rows.has(li.dataset.id)) li.classList.add('pv-cmp-kept');
    list.scrollTop = scroll;
    const settle = () => { if (typeof this.win.Event === 'function') this.win.requestAnimationFrame(() => list.dispatchEvent(new this.win.Event('scroll'))); };
    if (!this.motion()) { settle(); return; }
    const easing = 'cubic-bezier(.22,.8,.24,1)', duration = 420;
    items.forEach(li => {
      const was = rows.get(li.dataset.id);
      if (!li.animate) return;
      if (!was) { this.countAnimations.push(li.animate([{opacity: 0}, {opacity: 1}], {duration, easing})); return; }
      li.querySelectorAll('.pv-cmp-bars i').forEach((bar, k) => this.glideBar(bar, was.bars[k]));
      // A changed figure is swapped for the new one as its bar moves, never counted through the values in between.
      li.querySelectorAll('.pv-cmp-values > *').forEach((node, k) => {
        const from = was.values[k];
        if (from == null || from === node.textContent) return;
        this.countAnimations.push(node.animate([{opacity: .35}, {opacity: 1}], {duration, easing}));
      });
      const height = li.offsetHeight; // layout px: a fitted (zoomed) chapter animates in its own units
      if (was.height && Math.abs(was.height - height) > 1) this.countAnimations.push(li.animate([
        {height: was.height + 'px'}, {height: height + 'px'},
      ], {duration, easing}));
    });
    settle();
  }
  showBoard(spec, options) {
    const slide = this.deck[this.index];
    if (slide?.id === 'openings' && this.openingPick?.line && spec?.kind === 'moves') spec = {...spec, moves: this.openingPick.line.split(' ').filter(Boolean), me: this.openingPick.color};
    super.showBoard(spec, options);
  }
  renderProgress() {
    const {h} = this;
    this.progress.replaceChildren(...this.deck.map((slide, i) => h('button', {type: 'button', class: 'pv-seg' + (i < this.index ? ' done' : i === this.index ? ' on' : ''), title: slide.eyebrow, 'aria-label': slide.eyebrow, tabindex: '-1', onclick: () => this.go(i)},
      h('i'))));
  }
  /**
   * Equal-size chapter controls, with a quieter previous button. The buttons
   * stay in place from chapter to chapter (only their words change), so a press
   * can spring back and the new chapter name slides in from the side it came from.
   * The last chapter has nowhere further to go: the next button folds away and
   * the previous one slides over to fill the row (designs.css), and back again.
   */
  renderNav() {
    const {h} = this, last = this.index === this.deck.length - 1, next = this.deck[this.index + 1], prev = this.deck[this.index - 1];
    this.nav.classList.add('pv-story-nav');
    const part = () => [h('span', {class: 'pv-next-kicker'}), h('span', {class: 'pv-next-title'}), h('span', {class: 'pv-next-arrow', 'aria-hidden': 'true'})];
    let back = this.nav.querySelector(':scope > .pv-prev'), forward = this.nav.querySelector(':scope > .pv-next');
    if (!back || !forward) {
      back = h('button', {type: 'button', class: 'pv-prev', 'aria-label': 'Previous chapter', onclick: event => { this.pressNav(back, -1, event); this.go(this.index - 1); }}, ...part());
      forward = h('button', {type: 'button', class: 'pv-next', onclick: event => { if (this.index >= this.deck.length - 1) return; this.pressNav(forward, 1, event); this.go(this.index + 1); }}, ...part());
      this.nav.replaceChildren(back, forward);
    }
    const fill = (button, kicker, title, arrow) => {
      const [k, t, a] = button.children, changed = t.textContent && t.textContent !== title;
      k.textContent = kicker; t.textContent = title; a.textContent = arrow;
      if (changed && this.motion()) t.animate([{opacity: 0, transform: `translateX(${button === back ? -6 : 6}px)`}, {opacity: 1, transform: 'none'}], {duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)'});
    };
    back.disabled = this.index === 0;
    fill(back, 'Previous', prev ? CHAPTER_NAMES[prev.id] || prev.eyebrow : 'Intro', '←');
    // Folding away, the next button keeps the words it had, so it never shows a chapter it cannot go to.
    if (!last) fill(forward, 'Next', CHAPTER_NAMES[next.id] || next.eyebrow, '→');
    // Reached from the keyboard, focus moves to the button that is left rather than falling off the page.
    const refocus = last && this.doc.activeElement === forward;
    this.nav.classList.toggle('is-last', last);
    forward.disabled = last; forward.toggleAttribute('inert', last);
    forward.setAttribute('aria-hidden', String(last));
    if (refocus) back.focus({preventScroll: true});
  }
  /**
   * The release after a press: a small spring back to size and a nudge of the arrow the way it points.
   * A mouse click hands focus back to the panel, so the arrow keys afterwards never ring the button.
   */
  pressNav(button, direction, event) {
    if (event?.detail > 0 && this.doc.activeElement === button) this.shell.focus({preventScroll: true});
    if (!this.motion() || !button?.isConnected) return;
    button.getAnimations().forEach(a => a.cancel());
    button.animate([{transform: 'scale(.97)'}, {transform: 'scale(1.012)', offset: .55}, {transform: 'scale(1)'}], {duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)'});
    button.querySelector('.pv-next-arrow')?.animate([{transform: 'translateX(0)'}, {transform: `translateX(${direction * 5}px)`, offset: .4}, {transform: 'translateX(0)'}], {duration: 360, easing: 'cubic-bezier(.3,.7,.3,1)'});
  }
}
