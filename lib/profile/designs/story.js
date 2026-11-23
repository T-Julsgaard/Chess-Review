// Player profile — "Story" design, the default. Segmented progress at the top,
// one huge figure per chapter, a few hairline facts and a "Next: …" button that
// says what comes next. The charts leave the panel and are drawn on the board
// (results tiles, month columns, you-versus-typical pairs, move-time columns,
// habit dots, accuracy line). Each chapter has its own hue. Chapters about all
// your games can be narrowed to one time control with the switch at the top.
import {DesignWorkspace} from './base.js';
import {SITE_NAMES} from '../workspace.js';
import {fmt, rivalLine, resultsOverTime} from '../deck.js';
import {classLabel, byClassOrder, HABIT_BANDS, WEEKDAYS, TERM_LABELS, PIECE_NAMES} from '../insights.js';

// One hue per chapter (oklch degrees): enough contrast between neighbours.
export const HUES = {cover: 150, numbers: 145, season: 200, rating: 250, openings: 70, twin: 300, signature: 180, rival: 25, hits: 85, swings: 40, habits: 275, clock: 210, trend: 130, endings: 350, share: 150};
const SHORT = {cover: 'Intro', numbers: 'Numbers', season: 'Season', rating: 'Rating', openings: 'Openings', twin: 'Twin', signature: 'Comparison', rival: 'Rival', hits: 'Greatest hits', swings: 'Comebacks', habits: 'Habits', clock: 'Clock', trend: 'Then and now', endings: 'Endings', share: 'Recap'};
/** Chapters the time-control switch applies to. */
export const FILTERED = new Set(['numbers', 'season', 'openings', 'signature', 'hits', 'swings', 'habits', 'clock', 'trend', 'endings']);
/** Chapters that always show one time control (no "All"): they open on the one played most. */
export const SINGLE_CLASS = new Set(['swings']);
/** Short names for the you-versus-typical columns on the board. */
const SIG_SHORT = {knights4: 'Knights', castleEarly: 'Castle', noCastle: 'No castle', castleLong: 'O-O-O', opposite: 'Opp. sides', fian: 'Fianchetto', firstMove: '1st move', qtrade: 'Q trade', qEarly: 'Early Q',
  gambit: 'Gambits', storm: 'Storms', pair25: 'Bishops', endgame: 'Endgames', length: 'Length', shortWins: 'Fast wins', captures: 'Captures', checks: 'Checks', draws: 'Draws', fightOn: 'Plays on', promo: 'Promotes', ep: 'En passant', under: 'Under-promo'};
const sigValue = (v, number) => number ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(100 * v) + '%';
const OPENING_VIEWS = [['played', 'Most played'], ['best', 'Best win rate'], ['worst', 'Lowest win rate']];
const ENDING_VIEWS = [['w', 'Wins'], ['l', 'Losses'], ['d', 'Draws']];
/** How a game ended, as a legend row says it, and the shorter word beside the ring on the board. */
const ENDING_NAMES = {mate: ['Checkmate', 'Mate'], resign: ['Resignation', 'Resign'], time: ['On time', 'Time'], abandon: ['Abandoned', 'Left'], agree: ['Agreement', 'Agreed'],
  repetition: ['Repetition', 'Repeat'], stalemate: ['Stalemate', 'Stalemate'], insufficient: ['Insufficient material', 'Material'], fifty: ['Fifty-move rule', '50 moves'], other: ['Other', 'Other']};
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
  }
  reset() { this.progress?.replaceChildren(); return super.reset(); }
  close() { this.closeCompare(); return super.close(); }
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
    if (this.cls !== cls && !this.shared) { this.cls = cls; super.rebuild(); }
    super.go(this.deck.findIndex(slide => slide.id === id));
  }
  rebuild() {
    super.rebuild();
    // Landing on a one-time-control chapter another way (another player, a reopened profile) still shows one.
    const id = this.deck[this.index]?.id;
    if (this.shared || !SINGLE_CLASS.has(id) || this.classOptionsFor(id).includes(this.cls)) return;
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
    for (const r of this.periodRows()) if (bots || !r.bot) counts[r.cls] = (counts[r.cls] || 0) + 1;
    return options.reduce((best, cls) => (counts[cls] || 0) > (counts[best] || 0) ? cls : best, options[0]);
  }

  tint(slide, l = .76, c = .15) { return `oklch(${l} ${c} ${HUES[slide.id] ?? 150})`; }
  sceneFor(slide, spec) {
    const R = this.report;
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
      // "View your results over time": every game in order, drawn like Greatest hits.
      case 'numbers': return (this.overTime && resultsOverTime(R?.totals?.runs)) || spec;
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
        const m = slide.board?.habitMatrix; if (!m) return spec;
        return {kind: 'blank', me: 'w', caption: '', scene: {type: 'bubbles', matrix: m, days: WEEKDAYS, bands: HABIT_BANDS, color: this.tint(slide),
          legend: [['', 'Bigger dot: more games'], ['pv-legend-good', 'Greener: higher win rate']]}};
      }
      case 'endings': return this.endingsPie() || spec;
      default: return R ? spec : spec;
    }
  }

  /* ---------- panel ---------- */
  /** In the deck: a back button, the player's name, and the compare, share and settings buttons. */
  renderHead() {
    this.closeCompare(); this.closeSettings(); this.settingsGear = null;
    if (this.phase !== 'deck') { super.renderHead(); this.head.querySelector('.profile-head-title')?.remove(); return; }
    const {h} = this;
    const share = h('button', {type: 'button', class: 'pv-share', title: 'Copy a link to this profile', onclick: () => this.copyLink(share)}, 'Share');
    if (this.shared) { super.renderHead(); this.head.append(share); return; }
    // Focus and the names on screen before the redraw, so a switch keeps the focus and the new names glide in.
    const focused = this.head.contains(this.doc.activeElement) ? this.doc.activeElement.dataset.focus : null;
    const shownName = this.head.querySelector('.pv-head-name .profile-head-title')?.textContent, shownOther = this.head.querySelector('.pv-compare-swap')?.textContent;
    const other = this.compareOther();
    let compare;
    if (other) {
      // Comparing: the button names the other player. Pressing it shows them (and then names the one just left);
      // the × ends the comparison and goes back to the player the comparison started from.
      compare = h('div', {class: 'pv-compare is-pair', role: 'group', 'aria-label': 'Comparison'},
        h('button', {type: 'button', class: 'pv-compare-swap', 'data-focus': 'compare-swap', title: `Show ${other.name} on this chapter`, onclick: () => this.switchCompare(other)}, other.name),
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
      h('div', {class: 'pv-head-actions'}, compare, share, this.settingsButton()));
    this.markSettings();
    if (focused) (this.head.querySelector(`[data-focus="${focused}"]`) || this.head.querySelector('[data-focus^="compare"]'))?.focus({preventScroll: true});
    if (this.motion()) {
      const rise = node => node?.animate?.([{opacity: 0, transform: 'translateY(4px)'}, {opacity: 1, transform: 'none'}], {duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)'});
      if (shownName != null && shownName !== this.account) rise(name);
      const swap = compare.querySelector?.('.pv-compare-swap');
      if (swap && shownOther !== swap.textContent) rise(swap);
    }
    // Read the Compare list ahead, so the menu opens the moment it is pressed.
    const key = JSON.stringify(this.accounts);
    if (this.compareKey !== key || (!this.comparePlayersCache && !this.comparePending)) this.win.setTimeout(() => { if (!this.closed && this.phase === 'deck' && !this.shared) this.loadComparePlayers().catch(() => {}); }, 300);
  }
  /** Compare: a short menu of the other players read before; picking one swaps the data on this chapter. */
  /**
   * The players for the Compare menu, read once in the background after the deck
   * opens (reading saved games takes a moment) and kept until the player changes.
   */
  loadComparePlayers() {
    const key = JSON.stringify(this.accounts);
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
    const {h} = this, key = JSON.stringify(this.accounts);
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
  comparePlayer() { return {site: this.site, accounts: Object.fromEntries(this.sites().map(site => [site, this.accounts[site]])), name: this.account}; }
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
    return this.switchPlayer({site: player.site, account: player.name, name: player.name, accounts: player.accounts});
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
  evidenceLink(slide, cls = 'pv-link') { return this.linkButton(slide, slide.evidence, 'evidence', () => super.evidenceLink(slide, cls), cls); }
  alsoEvidenceLink(slide, cls = 'pv-link') { return this.linkButton(slide, slide.alsoEvidence, 'also', () => super.alsoEvidenceLink(slide, cls), cls); }
  linkButton(slide, ev, kind, make, cls) {
    const seen = this.linkedGame;
    const button = ev?.id && seen?.slide === slide.id && seen.id === ev.id && this.activeGame
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
    const own = slide.board?.kind === 'replay' && slide.board.id === ev?.id;
    this.linkedGame = ev?.id && !own && this.activeGame ? {slide: slide.id, id: ev.id} : null;
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
      if (!fresh) continue;
      node.replaceWith(fresh);
      if (this.motion() && typeof fresh.animate === 'function') fresh.animate([{opacity: 0, transform: 'translateX(-4px)'}, {opacity: 1, transform: 'none'}], {duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)'});
    }
  }
  syncBoard(slide, force = false) {
    if (force) this.boardSpecKey = null;
    super.syncBoard(slide);
  }
  boardKeyFor(slide) { return JSON.stringify([super.boardKeyFor(slide), slide.id === 'rival' ? this.rivalCls : null, slide.id === 'numbers' ? !!this.overTime : null, slide.id === 'endings' ? this.endingView || 'w' : null, slide.id === 'openings' ? this.openingPick : null, this.o.settings().profileSignatureBoard || null, slide.id === 'clock' && this.clockGrain && slide.fineBoard ? 'fine' : null]); }
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
    const updatingNumbers = previous?.dataset.slide === 'numbers' && slide.id === 'numbers';
    const oldFigure = updatingNumbers ? previous.querySelector('.pv-story-figure').textContent : null;
    this.countAnimations?.forEach(a => a.cancel?.()); this.countAnimations = [];
    this.shell.style.setProperty('--pv-hue', HUES[slide.id] ?? 150);
    const hero = this.hero(slide);
    const article = h('article', {class: 'pv-story', 'data-slide': slide.id, 'data-animate': animate && this.motion() ? 'on' : 'off', 'data-direction': this.direction > 0 ? 'next' : 'prev'});
    const top = h('div', {class: 'pv-story-top'});
    // The comparison's long heading drops its chapter number, so the time-control switch fits on the same line.
    if (slide.id !== 'cover') top.append(h('span', {class: 'pv-story-chapter'}, slide.id === 'signature' ? null : h('i', {class: 'pv-story-no'}, String(this.index + 1).padStart(2, '0')), slide.id === 'share' ? 'Your year in one card' : slide.eyebrow));
    const modes = slide.id === 'rating' ? this.ratingModes(slide, () => this.renderSlide({animate: false})) : this.classFilter(slide);
    if (modes) top.append(modes);
    if (top.childNodes.length) article.append(top);
    // "Increase granularity" sits beside the big figure, in the room it leaves on the right, so nothing below moves down.
    const grain = this.grainSwitch(slide);
    // A chapter without a hero (the comparison list) gives that room to its list.
    const heroNode = hero.value == null ? null : h('div', {class: 'pv-story-hero' + (hero.text ? ' is-text' : '') + (grain ? ' has-side' : '')},
      h('strong', {class: 'pv-story-figure', 'data-count': hero.text ? null : 'on'}, hero.value),
      hero.label ? h('span', {class: 'pv-story-label'}, hero.label) : null, grain);
    if (grain && !heroNode) top.append(grain);
    if (heroNode && slide.id === 'cover' && slide.country) { const flag = this.o.flag?.(slide.country); if (flag) heroNode.prepend(flag); }
    if (heroNode) article.append(heroNode);
    // A chapter without enough games keeps to its message: no tabs, bars, legends, links or engine block.
    const full = !slide.empty;
    if (full && slide.id === 'endings' && R?.terminations) article.append(this.endingTabs());
    const points = hero.points ?? slide.points, lead = 'lead' in hero ? hero.lead : slide.lead;
    if (points?.length) article.append(h('ul', {class: 'pv-points'}, ...points.map(t => h('li', {}, t))));
    else if (lead) article.append(h('p', {class: 'pv-story-lead'}, lead));
    if (full && slide.id === 'numbers' && R?.totals) article.append(this.wdlBar(R.totals));
    if (full && slide.id === 'endings') article.append(...this.endingsLegend());
    // The rival's record as the same bar, in shares: the sentence above already gives the counts.
    if (slide.id === 'rival') { const r = this.rivalRecord(slide); if (r?.games) article.append(this.wdlBar(r, {percent: true})); }
    if (slide.id === 'share') article.append(this.recap());
    else {
      const facts = this.facts(slide);
      if (facts.length) article.append(h('dl', {class: 'pv-facts' + (facts.length === 4 ? ' pv-facts-4' : '')}, ...facts.map(f => h('div', {class: 'pv-fact' + (f.tone ? ' tone-' + f.tone : '')}, h('dt', {}, f.label, f.sub ? h('small', {}, f.sub) : null), h('dd', {}, f.value)))));
    }
    if (slide.openings) article.append(this.openingsView(slide));
    if (slide.id === 'signature') article.append(...this.signatureView(slide));
    if (slide.twin?.reasons?.length) article.append(h('ul', {class: 'pv-reasons'}, ...slide.twin.reasons.slice(0, 3).map(t => h('li', {}, t))));
    // The endings tabs already say how losses and draws end.
    else if (!['share', 'signature', 'openings', 'endings'].includes(slide.id) && slide.bullets?.length) article.append(h('ul', {class: 'pv-reasons'}, ...slide.bullets.slice(0, slide.id === 'rival' ? 4 : slide.id === 'numbers' ? 1 : 2).map(t => h('li', {}, t))));
    const engine = full ? this.engineSlot(slide) : (this.engineBlock = null); if (engine) article.append(engine);
    if (slide.id === 'share') article.append(this.renderShare());
    // The numbers chapter charts your results over time where other chapters link a game.
    const link = !full ? null : slide.id === 'numbers' ? this.overTimeButton(slide) : this.evidenceLink(slide), also = full ? this.alsoEvidenceLink(slide) : null;
    if (link && also) article.append(h('div', {class: 'pv-links'}, link, also)); else if (link || also) article.append(link || also);
    const signatureState = slide.id === 'signature' ? this.signatureState() : null;
    this.slideHost.replaceChildren(article);
    if (signatureState) this.carrySignature(signatureState);
    this.renderEngineBlock();
    this.renderNav();
    this.renderProgress();
    this.syncBoard(slide);
    if (animate) this.countUpNodes(article.querySelectorAll('[data-count="on"], .pv-fact dd'));
    else if (updatingNumbers && heroNode && full && /^\d/.test(oldFigure)) this.tweenCount(heroNode.querySelector('strong'), oldFigure, R.totals.games);
    this.slideHost.scrollTop = 0;
  }
  /** The single figure a chapter is about. Text heroes (names) are set smaller. */
  hero(slide) {
    const R = this.report, T = R?.totals;
    if (slide.empty) return {value: slide.title, text: true, label: null};
    switch (slide.id) {
      case 'cover': return {value: slide.title, text: true, label: null};
      // The results bar says the rest; no sentence repeating it.
      case 'numbers': return {value: fmt.int(T.games), label: 'games played', lead: null};
      // "March was your busiest month"; the streak stays among the facts below.
      case 'season': return {value: slide.title, text: true};
      case 'rating': { const r = R.ratings?.[slide.ratingClass]; return r ? {value: fmt.signed(r.change), label: `${classLabel(slide.ratingClass)} rating, ${r.start} → ${r.end}`, lead: `Peaking at ${r.peak.rating} on ${fmt.date(r.peak.t)}.`} : {value: slide.title, text: true}; }
      case 'openings': return {value: slide.title, text: true, label: null, lead: null};
      // The most unusual habit already leads the list, with its sentence under it.
      case 'signature': return slide.compare?.length ? {value: null, label: null, lead: null} : {value: slide.title, text: true};
      case 'hits': { const s = R.opponents?.strongestBeaten; return s ? {value: String(s.rating), label: 'the highest-rated player you beat', lead: slide.lead} : {value: slide.title, text: true}; }
      case 'clock': return R.clock?.averageThink != null ? {value: fmt.seconds(R.clock.averageThink), label: 'per move, on average'} : {value: slide.title, text: true};
      case 'endings': { const lead = this.ending()?.lead ?? slide.lead; return R.terminations?.mates ? {value: fmt.int(R.terminations.mates), label: 'checkmates delivered', lead} : {value: slide.title, text: true, lead}; }
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
      [s.name, s.short] = ENDING_NAMES[s.key] || [TERM_LABELS[s.key] || s.key, s.key];
      s.share = raw[i]; s.pct = pcts[i];
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
  /** The chosen result's endings as a ring on the board, its total in the middle. */
  endingsPie() {
    const model = this.endingSlices(); if (!model?.slices.length) return null;
    const {noun, total, slices} = model;
    return {kind: 'blank', me: 'w', caption: '', scene: {type: 'pie', label: `How your ${noun} end.`, center: {value: fmt.int(total), label: noun},
      slices: slices.map(s => ({share: s.share, pct: s.pct, color: s.color, label: s.name, short: s.short, detail: `${s.name}: ${s.pct}% of your ${noun} (${fmt.plural(s.n, 'game')}).`}))}};
  }
  /** The legend beside the ring: one row per ending in the ring's colours, then how many games that was. */
  endingsLegend() {
    const model = this.endingSlices(); if (!model?.slices.length) return [];
    const {h} = this, {view, noun, total, slices} = model, X = this.report.terminations, T = this.report.totals;
    const list = h('ul', {class: 'pv-endings', 'aria-label': `How your ${noun} end`}, ...slices.map((s, i) => {
      const row = h('li', {}, h('i', {class: 'pv-endings-dot', 'aria-hidden': 'true'}), h('span', {class: 'pv-endings-name'}, s.name),
        h('span', {class: 'pv-endings-count'}, fmt.plural(s.n, 'game')), h('b', {class: 'pv-endings-share'}, s.pct + '%'));
      row.style.setProperty('--c', s.color); row.style.setProperty('--i', String(i));
      return row;
    }));
    const one = {w: 'win', l: 'loss', d: 'draw'}[view];
    const finisher = view === 'w' && X.favouritePiece && X.mates ? ` Your favourite finisher is the ${PIECE_NAMES[X.favouritePiece[0]] || 'piece'}, with ${Math.round(100 * X.favouritePiece[1] / X.mates)}% of your mates.` : '';
    return [list, h('p', {class: 'pv-endings-foot'}, `${fmt.plural(total, one, noun)}, ${Math.round(100 * total / Math.max(1, T.games))}% of all your games.${finisher}`)];
  }
  /** Won · drawn · lost as one bar, each part as wide as its share; `percent` labels the parts with their share instead of the count. */
  wdlBar(T, {percent = false} = {}) {
    const {h} = this;
    // The bar already on this chapter changes in place (a new time control); another chapter's bar is never reused.
    const existing = this.slideHost.querySelector(`.pv-story[data-slide="${this.deck[this.index]?.id}"] .pv-wdl`);
    const bar = existing || h('div', {class: 'pv-wdl', role: 'img'}, ...['w', 'd', 'l'].map(cls => h('span', {class: 'pv-wdl-seg ' + cls}, h('b'), h('small', {}, {w: 'won', d: 'drawn', l: 'lost'}[cls]))));
    const total = Math.max(1, T.games), share = cls => Math.round(100 * T[cls] / total);
    // Rounded shares that still add up to 100: the largest part takes the rounding.
    const shares = {w: share('w'), d: share('d'), l: share('l')};
    if (percent) { const top = ['w', 'd', 'l'].reduce((a, b) => T[b] > T[a] ? b : a); shares[top] += 100 - shares.w - shares.d - shares.l; }
    bar.setAttribute('aria-label', percent ? `Won ${shares.w}%, drew ${shares.d}%, lost ${shares.l}% of ${fmt.plural(T.games, 'game')}` : `${T.w} wins, ${T.d} draws, ${T.l} losses`);
    for (const cls of ['w', 'd', 'l']) {
      const seg = bar.querySelector('.' + cls), count = seg.querySelector('b'), value = percent ? shares[cls] : T[cls], format = percent ? n => Math.round(n) + '%' : fmt.int;
      seg.style.flexGrow = String(T[cls] / total);
      seg.classList.toggle('is-empty', !T[cls]); seg.title = `${seg.querySelector('small').textContent}: ${fmt.plural(T[cls], 'game')}${percent ? ` (${shares[cls]}%)` : ''}`;
      if (existing) this.tweenCount(count, count.textContent, value, format); else count.textContent = format(value);
    }
    return bar;
  }
  tweenCount(node, from, target, format = fmt.int) {
    const startValue = Number(String(from).replace(/[,%]/g, ''));
    node.textContent = format(target);
    if (!this.motion() || !Number.isFinite(startValue) || startValue === target) return;
    const start = this.win.performance.now(), duration = 420;
    let frame;
    const tick = now => {
      const p = Math.min(1, (now - start) / duration);
      node.textContent = format(startValue + (target - startValue) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = this.win.requestAnimationFrame(tick);
    };
    node.textContent = format(startValue);
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
    const pickOf = o => ({name: o.name, line: o.line || '', color: o.color});
    const same = (a, b) => !!a && !!b && a.name === b.name && a.color === b.color;
    // The board always plays one of the listed openings, and that row is marked:
    // the top one until the player picks another (also after switching the sort).
    if (!list.some(o => same(o, this.openingPick))) this.openingPick = list[0] ? pickOf(list[0]) : null;
    const choose = o => { this.dismissedGameSlide = null; this.boardSpecKey = null; this.openingPick = pickOf(o); this.renderSlide({animate: false}); };
    const tabs = h('div', {class: 'pv-tabs', role: 'tablist', 'aria-label': 'Sort openings'}, ...OPENING_VIEWS.map(([id, label]) =>
      h('button', {type: 'button', role: 'tab', class: id === view ? 'on' : '', 'aria-selected': String(id === view), onclick: () => { if (id === view) return; this.openingView = id; this.openingPick = null; this.dismissedGameSlide = null; this.renderSlide({animate: false}); }}, label)));
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
    const compare = [...texts.keys()].map(id => metrics.get(id)).filter(Boolean)
      .concat((slide.compare || []).filter(c => !texts.has(c.id)));
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
    const rows = new Map([...list.children].map(li => [li.dataset.id, {top: li.offsetTop, bars: [...li.querySelectorAll('.pv-cmp-bars i')].map(bar => bar.style.width)}]));
    return {rows, scroll: list.scrollTop};
  }
  /** The same rows after the switch: bars slide from their old length to the new one and rows glide to their new place. */
  carrySignature({rows, scroll}) {
    const list = this.slideHost.querySelector('.pv-cmp-list');
    if (!list) return;
    list.scrollTop = scroll;
    const motion = this.motion(), easing = 'cubic-bezier(.3,.8,.3,1)';
    for (const li of list.children) {
      const was = rows.get(li.dataset.id);
      if (!was) continue;
      li.classList.add('pv-cmp-kept');
      if (!motion) continue;
      li.querySelectorAll('.pv-cmp-bars i').forEach((bar, k) => { if (was.bars[k] && was.bars[k] !== bar.style.width) bar.animate([{width: was.bars[k]}, {width: bar.style.width}], {duration: 560, easing}); });
      const shift = was.top - li.offsetTop;
      if (Math.abs(shift) > 1) li.animate([{transform: `translateY(${shift}px)`}, {transform: 'none'}], {duration: 560, easing});
    }
    if (typeof this.win.Event === 'function') this.win.requestAnimationFrame(() => list.dispatchEvent(new this.win.Event('scroll')));
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
  /**
   * Equal-size chapter controls, with a quieter previous button. The buttons
   * stay in place from chapter to chapter (only their words change), so a press
   * can spring back and the new chapter name slides in from the side it came from.
   */
  renderNav() {
    const {h} = this, last = this.index === this.deck.length - 1, next = this.deck[this.index + 1], prev = this.deck[this.index - 1];
    this.nav.classList.add('pv-story-nav');
    const part = () => [h('span', {class: 'pv-next-kicker'}), h('span', {class: 'pv-next-title'}), h('span', {class: 'pv-next-arrow', 'aria-hidden': 'true'})];
    let back = this.nav.querySelector(':scope > .pv-prev'), forward = this.nav.querySelector(':scope > .pv-next');
    if (!back || !forward) {
      back = h('button', {type: 'button', class: 'pv-prev', 'aria-label': 'Previous chapter', onclick: event => { this.pressNav(back, -1, event); this.go(this.index - 1); }}, ...part());
      forward = h('button', {type: 'button', class: 'pv-next', onclick: event => { this.pressNav(forward, 1, event); this.go(this.index === this.deck.length - 1 ? 0 : this.index + 1); }}, ...part());
      this.nav.replaceChildren(back, forward);
    }
    const fill = (button, kicker, title, arrow) => {
      const [k, t, a] = button.children, changed = t.textContent && t.textContent !== title;
      k.textContent = kicker; t.textContent = title; a.textContent = arrow;
      if (changed && this.motion()) t.animate([{opacity: 0, transform: `translateX(${button === back ? -6 : 6}px)`}, {opacity: 1, transform: 'none'}], {duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)'});
    };
    back.disabled = this.index === 0;
    fill(back, 'Previous', prev ? SHORT[prev.id] || prev.eyebrow : 'Intro', '←');
    fill(forward, last ? 'Start again' : 'Next', last ? 'Back to the cover' : SHORT[next.id] || next.eyebrow, last ? '↺' : '→');
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
