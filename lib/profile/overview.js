import {fmt, mateInOneShares} from './deck.js';
import {classLabel} from './insights.js';

export const CHAPTER_NAMES = {cover: 'Intro', numbers: 'Results', season: 'Months', rating: 'Rating', openings: 'Openings', twin: 'Legend twin', signature: 'You vs. typical', rival: 'Top opponent', hits: 'Best wins', swings: 'Comebacks', habits: 'Play times', clock: 'Move time', trend: 'Accuracy', endings: 'Endings', mate1: 'Mate in one', share: 'Overview'};
export const CHAPTER_HUES = {cover: 150, numbers: 145, season: 200, rating: 250, openings: 70, twin: 300, signature: 180, rival: 25, hits: 85, swings: 40, habits: 275, clock: 210, trend: 130, endings: 350, mate1: 320, share: 150};

/** Use the current deck for navigation and the full-period report for its highlights. */
export function renderOverview({h, deck, report, onOpen}) {
  const {totals, ratings, opponents, streaks, habits, clock, engine, material, terminations, mateInOne} = report;
  const rating = deck.find(slide => slide.id === 'rating');
  const ratingClass = rating?.ratingClass;
  const rated = ratings?.[ratingClass];
  const rival = opponents?.rival;
  const strongest = opponents?.strongestBeaten;
  const streak = streaks?.win;
  const summaries = {
    numbers: [fmt.int(totals.games), `${fmt.pct(totals.winRate)} won`],
    rating: rated && [fmt.int(rated.end), `${classLabel(ratingClass)} · ${fmt.signed(rated.change)}`],
    clock: clock?.averageThink != null && [fmt.seconds(clock.averageThink), 'per move'],
    hits: strongest ? [fmt.int(strongest.rating), 'highest-rated win'] : streak && [fmt.int(streak.length), 'wins in a row'],
    swings: material && [fmt.int(material.comebacks), 'wins from 3+ down'],
    habits: habits && [fmt.int(habits.activeDays), 'active days'],
    trend: engine ? [fmt.pct(engine.average), 'average accuracy'] : ['Pending', 'accuracy check'],
    endings: terminations && [fmt.int(terminations.mates), 'checkmates'],
    mate1: mateInOne?.chances && [`${mateInOneShares(mateInOne).found}%`, 'mates found'],
  };
  const results = record => h('span', {class: 'profile-overview-results', 'aria-hidden': 'true'},
    ...['w', 'd', 'l'].filter(key => record[key] > 0).map(key => {
      const bar = h('i', {class: key});
      bar.style.flexGrow = String(record[key]);
      return bar;
    }));

  const tiles = deck.flatMap((slide, index) => {
    const {id, title, stats} = slide;
    if (id === 'share') return [];
    const name = CHAPTER_NAMES[id] || slide.eyebrow;
    const record = id === 'numbers' ? totals : id === 'rival' ? rival : null;
    const fallback = id === 'season' && stats?.length ? [stats[0].value, stats[0].label] : [title];
    const [value, detail] = summaries[id] || fallback;
    const button = h('button', {type: 'button', class: 'profile-overview-tile', 'data-chapter': id,
      title: [slide.eyebrow, value, detail].filter(Boolean).join(' · '), onclick: () => onOpen(index)},
      h('span', {class: 'profile-overview-label'}, name),
      h('strong', {class: 'profile-overview-value' + (detail ? ' has-detail' : '')}, value),
      detail ? h('span', {class: 'profile-overview-detail'}, detail) : null,
      record ? results(record) : null);
    button.style.setProperty('--chapter-hue', String(CHAPTER_HUES[id] ?? CHAPTER_HUES.share));
    return [button];
  });
  return h('nav', {class: 'profile-overview', 'aria-label': 'Profile chapters'}, ...tiles);
}
