import {fmt, mateInOneShares} from './deck.js';
import {CLASS_ORDER, WEEKDAYS, classLabel} from './insights.js';

export const CHAPTER_NAMES = {cover: 'Intro', numbers: 'Results', season: 'Months', rating: 'Rating', openings: 'Openings', twin: 'Legend twin', signature: 'You vs. typical', rival: 'Top opponent', hits: 'Best wins', swings: 'Comebacks', habits: 'Play times', clock: 'Move time', trend: 'Accuracy', endings: 'Endings', mate1: 'Mate in one', share: 'Overview'};
export const CHAPTER_HUES = {cover: 150, numbers: 145, season: 200, rating: 250, openings: 70, twin: 300, signature: 180, rival: 25, hits: 85, swings: 40, habits: 275, clock: 210, trend: 130, endings: 350, mate1: 320, share: 150};
/** Short names for the you-versus-typical habits, on the board's columns and the overview's bars. */
export const SIG_SHORT = {knights4: 'Knights', castleEarly: 'Castle', noCastle: 'No castle', castleLong: 'O-O-O', opposite: 'Opp. sides', fian: 'Fianchetto', firstMove: '1st move', qtrade: 'Q trade', qEarly: 'Early Q',
  gambit: 'Gambits', storm: 'Storms', pair25: 'Bishops', endgame: 'Endgames', length: 'Length', shortWins: 'Fast wins', captures: 'Captures', checks: 'Checks', draws: 'Draws', fightOn: 'Plays on', promo: 'Promotes', ep: 'En passant', under: 'Under-promo'};

/*
 * The overview is a bento of the chapters: the board is cut into rows and
 * columns (each cut splits one box in two, so the pieces always fill the square
 * exactly) and each chapter takes a piece sized to what it shows. A chapter the
 * deck lacks leaves its piece to its neighbours; a box left with one chapter
 * hands that chapter its whole room. Reading order is the deck's order.
 */
const row = (grow, ...children) => ({dir: 'row', grow, children});
const col = (grow, ...children) => ({dir: 'col', grow, children});
const tile = (id, grow) => ({id, grow});
const LAYOUT = col(1,
  row(3.5, tile('cover', 4.8), tile('numbers', 3.2), col(4, tile('season', 1), tile('rating', 1))),
  row(2.6, tile('openings', 4.3), tile('twin', 3.2), tile('signature', 4.5)),
  row(5.9,
    col(8, row(1, tile('rival', 2.8), tile('hits', 2.6), tile('swings', 2.6)), row(1.15, tile('habits', 2.9), tile('clock', 2.3), tile('trend', 2.8))),
    col(4, tile('endings', 1.35), tile('mate1', 1))));

const n2 = v => Math.round(v * 100) / 100;
const svg = (viewBox, body, {fit = 'none', cls = ''} = {}) => `<svg class="${cls}" viewBox="${viewBox}" preserveAspectRatio="${fit === 'none' ? 'none' : fit}" focusable="false">${body}</svg>`;
const esc = text => String(text).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

/** A line through `values` (oldest first), its area shaded, a dot on the last point. */
function sparkline(values, {times = null} = {}) {
  if (values.length < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const t0 = times?.[0], t1 = times?.at(-1);
  const x = i => n2(times && t1 > t0 ? 100 * (times[i] - t0) / (t1 - t0) : 100 * i / (values.length - 1));
  const y = v => n2(36 - 32 * (v - lo) / span);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join('');
  const area = `${line}L${x(values.length - 1)} 40L${x(0)} 40Z`;
  const end = values.length - 1;
  return `<span class="profile-overview-spark">${svg('0 0 100 40', `<path class="area" d="${area}"/><path class="line" d="${line}"/>`)}`
    + `<i class="profile-overview-dot" style="left:${x(end)}%;top:${n2(100 * y(values[end]) / 40)}%"></i></span>`;
}
/** Thin moving average, so a mini line keeps the shape of the chapter's chart without its day-to-day noise. */
function smooth(values) {
  const k = Math.max(1, Math.round(values.length / 14));
  return values.map((_, i) => { const part = values.slice(Math.max(0, i - k), i + k + 1); return part.reduce((a, b) => a + b, 0) / part.length; });
}
/** Every `step`-th point and always the last, so long series stay a light path. */
const thin = (list, most = 80) => { const step = Math.ceil(list.length / most); return list.filter((_, i) => i % step === 0 || i === list.length - 1); };

/** Columns standing on the bottom edge; the tallest one (or `peak`) in full colour. */
function columns(values, {peak = null} = {}) {
  if (!values.length) return null;
  const max = Math.max(...values, 0) || 1, top = peak ?? values.indexOf(Math.max(...values));
  const w = 10, body = values.map((v, i) => {
    const hgt = Math.max(v > 0 ? 1.2 : .4, n2(38 * v / max));
    return `<rect class="${i === top ? 'peak' : ''}" x="${i * w + 1.6}" y="${n2(40 - hgt)}" width="${w - 3.2}" height="${hgt}" style="--k:${i}"/>`;
  }).join('');
  return svg(`0 0 ${values.length * w} 40`, body, {cls: 'profile-overview-cols'});
}
/** Results stacked per column (losses at the bottom), fainter where the column has few games. */
function stacked(cols) {
  if (!cols?.length) return null;
  const w = 10, body = cols.map((c, i) => {
    let y = 40;
    const seg = (share, cls) => { const hgt = n2(40 * share); y = n2(y - hgt); return hgt > 0 ? `<rect class="${cls}" x="${i * w + 1.2}" y="${y}" width="${w - 2.4}" height="${hgt}"/>` : ''; };
    const faint = !c.games ? ' empty' : c.games < 5 ? ' faint' : '';
    return `<g class="col${faint}" style="--k:${i}">${c.games ? seg(c.l, 'l') + seg(c.d, 'd') + seg(c.w, 'w') : `<rect class="none" x="${i * w + 1.2}" y="38.6" width="${w - 2.4}" height="1.4"/>`}</g>`;
  }).join('');
  return svg(`0 0 ${cols.length * w} 40`, body, {cls: 'profile-overview-stack'});
}
/** Sixty-four squares in the results' proportions: wins, then draws, then losses, as on the chapter's board. */
function waffle({w = 0, d = 0, l = 0}) {
  const total = w + d + l;
  if (!total) return null;
  const raw = [w, d, l].map(n => 64 * n / total), counts = raw.map(Math.floor);
  raw.map((v, i) => [v - counts[i], i]).sort((a, b) => b[0] - a[0]).slice(0, 64 - counts.reduce((a, b) => a + b, 0)).forEach(([, i]) => counts[i]++);
  const kinds = counts.flatMap((n, i) => Array(n).fill(['w', 'd', 'l'][i]));
  const body = kinds.map((kind, i) => `<rect class="${kind}" x="${i % 8 + .09}" y="${Math.floor(i / 8) + .09}" width=".82" height=".82" rx=".14" style="--k:${i}"/>`).join('');
  return svg('0 0 8 8', body, {fit: 'xMidYMid meet', cls: 'profile-overview-waffle'});
}
/** The week as squares: weekdays down (Monday first), times of day across, brighter for more games. */
function heatmap(matrix) {
  if (!matrix?.length) return null;
  const order = [1, 2, 3, 4, 5, 6, 0].filter(i => matrix[i]), max = Math.max(1, ...matrix.flat().map(c => c?.g || 0));
  const cols = matrix[0].length, labelWidth = 1.9;
  const labels = order.map((day, r) => `<text x="0" y="${r + .5}" dominant-baseline="central">${WEEKDAYS[day]}</text>`).join('');
  const cells = order.flatMap((day, r) => matrix[day].map((cell, c) => {
    const share = (cell?.g || 0) / max;
    return `<rect x="${n2(labelWidth + c + .08)}" y="${r + .08}" width=".84" height=".84" rx=".16" style="--a:${n2(share ? .16 + .84 * Math.sqrt(share) : .06)};--k:${r + c}"/>`;
  })).join('');
  return svg(`0 0 ${cols + labelWidth} ${order.length}`, labels + `<g style="--label-width:${labelWidth}px">${cells}</g>`, {fit: 'xMidYMax meet', cls: 'profile-overview-heat'});
}
/** A ring cut into `parts` ({share 0–100, cls}), starting at twelve o'clock. */
function ring(parts, {track = true} = {}) {
  let at = 0;
  const arcs = parts.filter(p => p.share > 0).map(p => {
    const gap = parts.length > 1 && p.share < 100 ? Math.min(1.2, p.share / 3) : 0;
    const out = `<circle class="${p.cls}" r="15.9155" cx="20" cy="20" pathLength="100" stroke-dasharray="${n2(p.share - gap)} ${n2(100 - p.share + gap)}" stroke-dashoffset="${n2(-at)}"/>`;
    at += p.share;
    return out;
  }).join('');
  return svg('0 0 40 40', `${track ? '<circle class="track" r="15.9155" cx="20" cy="20"/>' : ''}<g transform="rotate(-90 20 20)">${arcs}</g>`, {fit: 'xMidYMid meet', cls: 'profile-overview-ring'});
}
/** Labelled meters: [label, share 0–100, text, cls]. */
function meters(list) {
  const rows = list.filter(([, share]) => share != null);
  if (!rows.length) return null;
  return `<span class="profile-overview-meters">${rows.map(([label, share, text, cls = '']) =>
    `<span class="m ${cls}"><b>${esc(label)}</b><i><s style="width:${n2(Math.max(2, Math.min(100, share)))}%"></s></i><em>${esc(text)}</em></span>`).join('')}</span>`;
}
/** You (in colour) over a typical player (grey), one pair of bars per habit. */
function pairs(items) {
  if (!items.length) return null;
  return `<span class="profile-overview-pairs">${items.map(c => {
    const max = Math.max(c.rate, c.baseline) * 1.08 || 1;
    return `<span class="p"><b>${esc(SIG_SHORT[c.id] || c.label)}</b><i><s class="you" style="width:${n2(100 * c.rate / max)}%"></s><s class="them" style="width:${n2(100 * c.baseline / max)}%"></s></i></span>`;
  }).join('')}</span>`;
}
const initials = name => String(name).split(/\s+/).filter(Boolean).map(part => part[0]).filter(c => /\p{Lu}/u.test(c)).slice(0, 2).join('') || String(name).slice(0, 1);

/**
 * What each chapter's piece shows: a name, its key figure, one line under it,
 * and a small drawing of the chapter's own chart (or another trait of it).
 * `text`: the figure is words (a name), set smaller and allowed two lines.
 */
function describe(slide, report, flag) {
  const {totals, ratings, opponents, streaks, habits, clock, engine, material, terminations, mateInOne} = report;
  const scene = slide.board?.scene;
  switch (slide.id) {
    case 'cover': {
      const intro = slide.intro;
      const byClass = totals?.byClass;
      const mostPlayed = CLASS_ORDER.filter(cls => cls !== 'unknown' && byClass?.[cls]?.games > 0)
        .sort((a, b) => byClass[b].games - byClass[a].games)[0];
      return {value: slide.title, text: true, hero: true, flag: slide.country ? flag?.(slide.country) : null,
        detail: intro ? `${intro.period} · ${intro.site}` : null,
        figures: intro ? [[fmt.int(intro.games), intro.games === 1 ? 'game' : 'games'], [fmt.hoursNum(intro.hours), 'hours']] : null,
        mostPlayed: intro && mostPlayed ? classLabel(mostPlayed) : null};
    }
    case 'numbers': {
      const chart = waffle(totals);
      const results = [['w', 'win', 'wins'], ['d', 'draw', 'draws'], ['l', 'loss', 'losses']].map(([key, one, many]) =>
        `<span><b class="${key}">${fmt.int(totals[key])}</b> ${totals[key] === 1 ? one : many}</span>`).join('');
      return {value: fmt.int(totals.games), detail: `${fmt.pct(totals.winRate)} won`,
        viz: chart ? chart + `<span class="profile-overview-wdl is-stacked">${results}</span>` : null};
    }
    case 'season': {
      const busiest = slide.season?.busiest, cols = scene?.columns || [];
      return busiest ? {value: fmt.month(busiest.key).split(' ')[0], text: true, detail: `busiest month: ${fmt.plural(busiest.games, 'game')}`, viz: columns(cols.map(c => c.value)), wide: true}
        : {value: slide.stats?.[0]?.value || slide.title, detail: slide.stats?.[0]?.label, viz: columns(cols.map(c => c.value)), wide: true};
    }
    case 'rating': {
      const rated = ratings?.[slide.ratingClass], series = thin(slide.series?.[slide.ratingClass] || []);
      if (!rated) return null;
      return {value: fmt.int(rated.end), detail: `${classLabel(slide.ratingClass)} · ${fmt.signed(rated.change)}`, tone: rated.change > 0 ? 'up' : rated.change < 0 ? 'down' : null,
        viz: sparkline(series.map(p => p.r), {times: series.map(p => p.t)}), wide: true};
    }
    case 'openings': {
      const fav = slide.openings?.all?.find(o => o.name === slide.title);
      const moves = (slide.board?.moves || []).slice(0, 6);
      const line = moves.map((m, i) => (i % 2 ? '' : `<em>${i / 2 + 1}.</em>`) + `<b>${esc(m)}</b>`).join(' ');
      const me = slide.board?.me === 'b' ? 'b' : 'w';
      return {value: slide.title, text: true, detail: fav ? `${fmt.plural(fav.games, 'game')} · ${fmt.pct(fav.winRate)} won` : null,
        viz: moves.length ? `<span class="profile-overview-moves"><i class="side ${me}" title="${me === 'w' ? 'As White' : 'As Black'}"></i>${line}</span>` : null, compact: true};
    }
    case 'twin':
      return {value: slide.title, text: true, detail: slide.twin?.era || null, mark: initials(slide.title)};
    case 'signature': {
      const ids = (slide.signatures || []).map(s => s.id), compare = slide.compare || [];
      const chosen = [...compare.filter(c => ids.includes(c.id)), ...compare.filter(c => !ids.includes(c.id))].slice(0, 3);
      return {value: slide.title, text: true, detail: 'you vs. a typical player', viz: pairs(chosen), compact: true};
    }
    case 'rival': {
      const r = slide.rival || opponents?.rival;
      if (!r) return null;
      return {value: r.name, text: true, detail: fmt.plural(r.games, 'game'),
        viz: `<span class="profile-overview-results">${['w', 'd', 'l'].filter(k => r[k] > 0).map(k => `<i class="${k}" style="flex-grow:${r[k]}"></i>`).join('')}</span>`
          + `<span class="profile-overview-wdl"><b class="w">${fmt.int(r.w)}</b> W <b class="d">${fmt.int(r.d)}</b> D <b class="l">${fmt.int(r.l)}</b> L</span>`, compact: true};
    }
    case 'hits': {
      const strongest = opponents?.strongestBeaten, streak = streaks?.win;
      const head = strongest ? {value: fmt.int(strongest.rating), detail: 'highest-rated win'} : streak ? {value: fmt.int(streak.length), detail: 'wins in a row'} : {value: slide.title, text: true};
      return {...head, viz: scene?.type === 'results' ? stacked(scene.columns) : null};
    }
    case 'swings':
      return {value: fmt.int(material?.comebacks ?? 0), detail: 'wins from 3+ down',
        viz: meters([['Converted', material?.conversion, fmt.pct(material?.conversion), 'good'], ['Saved', material?.resilience, fmt.pct(material?.resilience)]]), compact: true};
    case 'habits':
      return {value: slide.title, text: true, detail: habits ? fmt.plural(habits.activeDays, 'active day') : null, viz: heatmap(slide.board?.habitMatrix)};
    case 'clock':
      return {value: clock?.averageThink != null ? fmt.seconds(clock.averageThink) : slide.title, text: clock?.averageThink == null, detail: clock?.averageThink != null ? 'per move' : null,
        viz: scene?.type === 'columns' ? columns(scene.columns.map(c => c.value)) : null};
    case 'trend': {
      if (!engine) return {value: 'Pending', detail: 'accuracy check', pending: true,
        viz: `<span class="profile-overview-spark is-pending">${svg('0 0 100 40', '<path class="line" d="M0 30C18 30 22 16 40 18S64 26 78 14 92 12 100 10"/>')}</span>`};
      const series = scene?.type === 'line' ? thin(scene.series) : null;
      const split = slide.board?.kind === 'split' ? slide.board : null;
      return {value: fmt.pct(engine.average), detail: 'average accuracy',
        viz: series?.length >= 2 ? sparkline(smooth(series.map(p => p.r)), {times: series.map(p => p.t)})
          : split ? meters([[split.left.label, parseFloat(split.left.value), split.left.value], [split.right.label, parseFloat(split.right.value), split.right.value, 'good']]) : null};
    }
    case 'endings': {
      const wins = terminations?.wins || {}, total = Object.values(wins).reduce((a, b) => a + b, 0);
      const named = {mate: 'Mate', resign: 'Resign', time: 'Time'};
      const parts = Object.keys(named).map(key => ({key, n: wins[key] || 0}));
      parts.push({key: 'other', n: total - parts.reduce((a, p) => a + p.n, 0)});
      const shown = parts.filter(p => p.n > 0).map((p, i) => ({...p, share: 100 * p.n / total, cls: 'e' + Math.min(i, 3)}));
      const legend = shown.filter(p => p.key !== 'other').slice(0, 3).map(p => `<span class="${p.cls}"><i></i>${named[p.key]} <b>${Math.round(p.share)}%</b></span>`).join('');
      return {value: fmt.int(terminations?.mates ?? 0), detail: 'checkmates delivered',
        viz: total ? `<span class="profile-overview-donut">${ring(shown, {track: false})}<span class="legend"><small>Your wins by</small>${legend}</span></span>` : null};
    }
    case 'mate1': {
      if (!mateInOne?.chances) return null;
      const shares = mateInOneShares(mateInOne);
      return {value: `${shares.found}%`, detail: `mates found, ${fmt.int(mateInOne.found)} of ${fmt.int(mateInOne.chances)}`,
        viz: ring([{share: shares.found, cls: 'found'}, {share: shares.missed, cls: 'missed'}]), side: true};
    }
    default: return null;
  }
}

/** Use the current deck for navigation and the full-period report for its highlights. */
export function renderOverview({h, deck, report, onOpen, flag = null}) {
  const tiles = new Map();
  deck.forEach((slide, index) => {
    const {id, title, stats} = slide;
    if (id === 'share') return;
    const name = CHAPTER_NAMES[id] || slide.eyebrow;
    let info = null;
    try { info = slide.empty ? null : describe(slide, report, flag); } catch { info = null; }
    if (!info) {
      const fallback = id === 'season' && stats?.length ? [stats[0].value, stats[0].label] : [title];
      info = {value: fallback[0], detail: fallback[1] || null, text: !fallback[1]};
    }
    const kinds = ['profile-overview-tile', info.hero && 'is-hero', info.text && 'is-text', info.viz && 'has-viz', info.wide && 'is-wide',
      info.compact && 'is-compact', info.side && 'is-side', info.pending && 'is-pending', info.mark && 'has-mark'].filter(Boolean).join(' ');
    const value = h('strong', {class: 'profile-overview-value' + (info.tone ? ' is-' + info.tone : ''), style: info.hero ? `--len: ${String(info.value).length}` : null}, info.value);
    const button = h('button', {type: 'button', class: kinds, 'data-chapter': id,
      title: [slide.eyebrow, info.value, info.detail].filter(Boolean).join(' · '), onclick: () => onOpen(index)},
      h('span', {class: 'profile-overview-text'},
        h('span', {class: 'profile-overview-label'}, name),
        info.flag ? h('span', {class: 'profile-overview-identity'}, value, h('span', {class: 'profile-overview-flag'}, info.flag)) : value,
        info.detail ? h('span', {class: 'profile-overview-detail'}, info.detail) : null),
      info.figures ? h('span', {class: 'profile-overview-intro-stats'},
        h('span', {class: 'profile-overview-figures'}, ...info.figures.map(([value, label]) => h('span', {}, h('b', {}, value), ' ', label))),
        info.mostPlayed ? h('span', {class: 'profile-overview-most-played'}, h('span', {}, 'Most played'), ' ', h('b', {}, info.mostPlayed)) : null) : null,
      info.viz ? h('span', {class: 'profile-overview-viz', 'aria-hidden': 'true', html: info.viz}) : null,
      info.mark ? h('span', {class: 'profile-overview-mark', 'aria-hidden': 'true'}, h('span', {}, info.mark)) : null,
      info.hero ? h('span', {class: 'profile-overview-checks', 'aria-hidden': 'true'}) : null,
      h('span', {class: 'profile-overview-go', 'aria-hidden': 'true'}, '→'));
    button.style.setProperty('--chapter-hue', String(CHAPTER_HUES[id] ?? CHAPTER_HUES.share));
    tiles.set(id, button);
  });

  // Lay the pieces out; any chapter the layout does not know gets a row of its own at the end.
  let order = 0;
  const place = node => {
    if (node.id) {
      const button = tiles.get(node.id);
      if (!button) return null;
      tiles.delete(node.id);
      return {el: button, grow: node.grow};
    }
    const kids = node.children.map(place).filter(Boolean);
    if (!kids.length) return null;
    if (kids.length === 1) return {el: kids[0].el, grow: node.grow};
    const box = h('div', {class: 'profile-overview-' + node.dir});
    for (const kid of kids) { kid.el.style.flexGrow = String(kid.grow); box.append(kid.el); }
    return {el: box, grow: node.grow};
  };
  const root = place(LAYOUT);
  const nav = h('nav', {class: 'profile-overview', 'aria-label': 'Profile chapters'});
  if (root) {
    if (root.el.classList.contains('profile-overview-col')) nav.append(...root.el.childNodes);
    else { root.el.style.flexGrow = '1'; nav.append(root.el); }
  }
  if (tiles.size) {
    const extra = h('div', {class: 'profile-overview-row'});
    for (const button of tiles.values()) { button.style.flexGrow = '1'; extra.append(button); }
    extra.style.flexGrow = '2.4';
    nav.append(extra);
  }
  nav.querySelectorAll('.profile-overview-tile').forEach(button => button.style.setProperty('--i', String(order++)));
  return nav;
}
