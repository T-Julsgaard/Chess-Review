import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle, deferred} from './helpers/app.mjs';
import {season} from './helpers/profile-season.mjs';
import {rowsKey} from '../lib/profile/store.js';
import {IDENTITY_KEY} from '../lib/identity.js';
import {DesignWorkspace} from '../lib/profile/designs/base.js';
import {StoryWorkspace} from '../lib/profile/designs/story.js';
import {signatureDiagram} from '../lib/profile/designs/signature-diagrams.js';
import {SIGNATURES} from '../lib/profile/insights.js';
import {seasonStats, seasonSlide} from '../lib/profile/designs/season.js';
import {Chess, DEFAULT_POSITION} from '../lib/chess.js';
import {squareNames} from '../lib/profile/board.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.state.settings.profileDepth = 'off';
  t.after(() => a.run('profileWorkspace')?.close());
  return a;
}
function seed(a, account = 'tester') {
  const rows = season().map(r => ({...r, opp: r.opp === 'tester' ? 'someone' : r.opp}));
  a.store[rowsKey('chesscom', account)] = {rows, months: [], since: 0, updatedAt: Date.now()};
  a.store[IDENTITY_KEY] = {chesscom: {accounts: [{name: account, seenAt: Date.now(), via: 'test'}]}};
}
async function openDeck(a) {
  await a.call('openProfile'); for (let i = 0; i < 6; i++) await settle();
  a.dom.window.document.querySelector('.profile-build').click(); for (let i = 0; i < 6; i++) await settle();
  return a.run('profileWorkspace');
}
const key = (a, k) => a.dom.window.document.querySelector('.profile-shell').dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: k, bubbles: true}));

test('profile count animations accept numeric signs and leave nonnumeric prefixes alone', () => {
  const frames = [], nodes = ['+1,234.5 wins', '-42', '−42', '42%', 'A42', '/42', '=42'].map(textContent => ({textContent}));
  const workspace = {
    motion: () => true,
    win: {performance: {now: () => 0}, requestAnimationFrame: tick => frames.push(tick)},
  };
  DesignWorkspace.prototype.countUpNodes.call(workspace, nodes);
  assert.equal(frames.length, 4, 'letters and punctuation cannot become numeric signs');
  for (const tick of frames.slice()) tick(500);
  assert.deepEqual(nodes.map(node => node.textContent), ['+1080.2 wins', '-37', '−37', '37%', 'A42', '/42', '=42']);
});

test('profile designs: the season counts months, fills gaps and finds the longest run of days', () => {
  const day = (y, m, d, h = 18) => new Date(y, m - 1, d, h).getTime() / 1000;
  const rows = [day(2026, 1, 3), day(2026, 1, 4), day(2026, 1, 5), day(2026, 1, 5, 20), day(2026, 3, 9)].map((t, i) => ({t, res: i % 2 ? 'l' : 'w'}));
  const s = seasonStats(rows);
  assert.deepEqual(s.months.map(m => [m.key, m.games]), [['2026-01', 4], ['2026-02', 0], ['2026-03', 1]]);
  assert.equal(s.dayStreak.length, 3);
  assert.equal(s.activeDays, 4);
  assert.equal(s.maxDay, 2);
  assert.equal(s.busiest.key, '2026-01');
  assert.equal(seasonStats([]), null);
  const slide = seasonSlide(s);
  assert.equal(slide.id, 'season');
  assert.equal(slide.board.scene.type, 'columns');
  assert.equal(slide.board.scene.columns.length, 3);
  assert.equal(seasonSlide(seasonStats(rows.slice(0, 2))), null, 'one month is not a season');
});

test('profile designs: a shared link brings the season back through JSON, and drops one that does not hold together', async () => {
  const {encodeProfile, decodeProfile} = await import('../lib/profile/share.js');
  const {sharedSeason} = await import('../lib/profile/designs/season.js');
  const day = (y, m, d, h = 18) => new Date(y, m - 1, d, h).getTime() / 1000;
  const rows = [day(2026, 1, 3), day(2026, 1, 4), day(2026, 1, 5), day(2026, 3, 9)].map((t, i) => ({t, res: i % 2 ? 'l' : 'w'}));
  const s = seasonStats(rows);
  const shared = (await decodeProfile((await encodeProfile({account: 'x', site: 'chesscom', season: s})))).season;
  const back = sharedSeason(shared);
  assert.deepEqual(back.months.map(m => [m.key, m.games, m.label]), s.months.map(m => [m.key, m.games, m.label]));
  assert.deepEqual(seasonSlide(back).board.scene.columns.map(c => c.value), seasonSlide(s).board.scene.columns.map(c => c.value));
  assert.equal(seasonSlide(back).title, seasonSlide(s).title);
  assert.equal(sharedSeason(null), null);
  assert.equal(sharedSeason({months: [{key: '<img>', games: 3}]}), null);
  assert.equal(sharedSeason({months: 'Jan'}), null);
});

test('profile designs: story shows one figure per chapter, progress segments and charts on the board', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const w = await openDeck(a);
  const shell = doc.querySelector('.profile-shell');
  assert.equal(shell.dataset.design, 'story');
  assert.ok(w.deck.some(s => s.id === 'season'), 'the season chapter is added');
  assert.equal(shell.querySelectorAll('.pv-seg').length, w.deck.length);
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'cover');
  assert.equal(shell.querySelector('.pv-story-chapter'), null, 'the cover has no chapter label');
  assert.match(shell.querySelector('.pv-intro-period').textContent, /Past 12 months.*on Chess.com/, 'the period and site on one line');
  assert.deepEqual([...shell.querySelectorAll('.pv-intro-stat dt')].map(n => n.textContent), ['games', 'hours at the board'], 'games and hours as two figures');
  assert.equal(shell.querySelector('.pv-points'), null);
  assert.ok(!shell.querySelector('.profile-head').textContent.includes('wrapped'));
  assert.ok(shell.querySelector('.profile-head .pv-back'), 'the header goes back to the start');
  assert.equal(shell.querySelectorAll('.profile-nav .pv-prev').length, 1, 'a full-width previous chapter button');
  shell.querySelector('.pv-next').click();
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'numbers');
  assert.equal(shell.querySelector('.pv-story-figure').textContent, String(w.report.totals.games));
  assert.ok(shell.querySelector('.pv-wdl'));
  assert.equal(doc.querySelector('.board .pv-badge'), null, 'nothing covers the result squares');
  assert.equal(doc.querySelectorAll('.board .sq.profile-fill').length, 64);
  assert.equal(shell.querySelectorAll('.pv-fact').length, 4, 'four facts, two by two');
  // View your results over time, in place of a link to the longest game: every game in runs, drawn like the best-wins chart.
  assert.equal(shell.querySelector('.pv-link[data-game-url]'), null, 'no link to the longest game');
  const overTime = shell.querySelector('.pv-link[aria-pressed]');
  assert.equal(overTime?.textContent, 'View your results over time');
  overTime.click();
  assert.ok(doc.querySelectorAll('.board .pv-results .pv-tile').length >= 16, 'the board charts your results over time');
  assert.match(doc.querySelector('.profile-board-caption .pv-legend').textContent, /Results over time:.*Won.*Drew.*Lost/);
  assert.equal(shell.querySelector('.pv-link[aria-pressed]').textContent, 'Back to your overall results');
  shell.querySelector('.pv-link[aria-pressed]').click();
  assert.equal(doc.querySelector('.board .pv-results'), null, 'back to the results squares');
  assert.equal(doc.querySelectorAll('.board .sq.profile-fill').length, 64);
  // The time-control switch narrows the chapter to one format.
  const filter = shell.querySelector('.pv-filter');
  const thumb = filter.querySelector('.pv-filter-thumb'), bar = shell.querySelector('.pv-wdl');
  const chapter = w.index;
  shell.querySelector('.pv-story-hero').click();
  assert.equal(w.index, chapter, 'only explicit navigation changes the chapter');
  const transform = thumb.style.transform;
  filter.querySelector('button:last-child').dispatchEvent(new a.dom.window.MouseEvent('pointerover', {bubbles: true}));
  assert.equal(thumb.style.transform, transform, 'hover leaves the selection marker alone');
  assert.ok(filter, 'a time-control switch');
  [...filter.querySelectorAll('button')].find(b => b.textContent === 'Bullet').click();
  assert.equal(w.cls, 'bullet');
  assert.equal(shell.querySelector('.pv-filter'), filter, 'the selected marker is retained across a click');
  assert.equal(shell.querySelector('.pv-wdl'), bar, 'the results bar transitions in place');
  assert.equal(shell.querySelector('.pv-story-figure').textContent, String(w.report.totals.games));
  assert.ok(w.report.totals.games < 300 && w.report.classOptions.includes('blitz'), 'the options stay while filtered');
  [...shell.querySelectorAll('.pv-filter button')].find(b => b.textContent === 'All').click();
  key(a, 'ArrowRight');
  key(a, 'ArrowLeft');
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'numbers');
  key(a, 'PageDown');
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'season');
  assert.ok(doc.querySelectorAll('.board .pv-layer .pv-tile').length > 8, 'months are columns of squares');
  assert.equal(shell.querySelectorAll('.pv-points li').length, 2);
  w.go(w.deck.findIndex(s => s.id === 'signature'));
  assert.ok(shell.querySelectorAll('.pv-cmp').length >= 6, 'every metric against a typical player');
  const signature = w.currentSlide();
  assert.equal(shell.querySelector('.pv-cmp-label').firstChild.textContent, signature.signatures[0].label, 'the strongest signature is first in the comparison');
  assert.equal(shell.querySelectorAll('.pv-cmp').length, signature.compare.length, 'the comparison includes every metric');
  assert.equal(shell.querySelector('.pv-story-chapter').textContent, 'You vs. a typical player', 'the chapter name alone, with no number');
  assert.equal(shell.querySelector('.pv-story-hero'), null, 'no headline repeats the first habit; the list starts higher');
  assert.equal(shell.querySelector('.pv-story-lead'), null);
  assert.deepEqual([...w.viz.layer.querySelectorAll('.pv-diff-row strong')].map(n => n.textContent), signature.signatures.slice(0, 4).map(s => s.label), 'the board highlights the strongest habits');
  assert.equal(w.viz.layer.querySelectorAll('.pv-diff-row').length, 4);
  assert.ok(w.viz.layer.querySelector('.pv-diff-gap'));
  const labels = signature.signatures.slice(0, 4).map(s => s.label);
  for (const [setting, mark] of [['centered', '.pv-sig-dot'], ['pieces', '.pv-sig-track .pv-sig-knight.pv-sig-you'], ['cards', '.pv-sig-illustration']]) {
    await a.call('setSetting', 'profileSignatureBoard', setting);
    assert.equal(a.store.settings.profileSignatureBoard, setting, 'the chart choice is saved');
    const layer = w.viz.layer;
    assert.equal(layer.dataset.scene, `signature-${setting}`, 'the active chapter redraws immediately');
    assert.equal(layer.querySelectorAll(mark).length, 4);
    assert.deepEqual([...layer.querySelectorAll('li strong')].map(n => n.textContent), labels);
    assert.equal(layer.querySelectorAll('.pv-sig-values b').length, 8, 'both values are shown for every habit');
  }
  a.state.settings.profileSignatureBoard = 'compare'; w.renderSlide({animate: false});
  assert.ok(doc.querySelector('.board .pv-pairs'), 'the original paired columns are still available');
  a.state.settings.profileSignatureBoard = 'heat'; w.renderSlide({animate: false});
  assert.ok(doc.querySelector('.board .profile-heat'), 'the heat map is still available');
  w.go(w.deck.findIndex(s => s.id === 'rival'));
  assert.equal(doc.querySelector('.board .pv-badge'), null);
  assert.match(shell.querySelector('.pv-story-lead').textContent, /^You played \d+ games against rival_rick: won \d+, lost \d+, drew \d+\.$/);
  assert.equal(shell.querySelector('.pv-link[data-game-url]'), null, 'no link to the latest decisive game');
  assert.equal(shell.querySelector('.pv-link[aria-pressed]'), null, 'results over time live on the numbers chapter');
  // The rival's record as a bar of shares that add up to 100.
  const shares = [...shell.querySelectorAll('.pv-wdl-seg b')].map(n => n.textContent);
  assert.ok(shares.every(s => /^\d+%$/.test(s)), shares.join());
  assert.equal(shares.reduce((s, v) => s + parseInt(v, 10), 0), 100);
  w.go(w.deck.findIndex(s => s.id === 'endings'));
  // Wins · Losses · Draws, like the openings sort: each draws a ring of how those games ended.
  const endingTabs = [...shell.querySelectorAll('.pv-tabs [role="tab"]')];
  assert.deepEqual(endingTabs.map(b => b.textContent), ['Wins', 'Losses', 'Draws']);
  assert.equal(shell.querySelector('.pv-tabs [aria-selected="true"]').textContent, 'Wins');
  assert.match(shell.querySelector('.pv-story-lead').textContent, /^Your wins most often (come by [a-z -]+|come on time|end in other ways): \d+% of them\.$/);
  assert.equal(shell.querySelector('.pv-reasons'), null, 'the tabs say how losses and draws end');
  assert.equal(shell.querySelector('.pv-fact'), null, 'the legend takes the place of the facts');
  const ring = w.viz.layer;
  assert.equal(ring.dataset.scene, 'pie', 'the board draws a ring of how your wins ended');
  const legend = () => [...shell.querySelectorAll('.pv-endings li')].map(li => [li.querySelector('.pv-endings-name').textContent, parseInt(li.querySelector('.pv-endings-share').textContent, 10)]);
  const sum = rows => rows.reduce((s, [, v]) => s + v, 0);
  assert.equal(ring.querySelectorAll('.pv-pie-slice').length, legend().length, 'one slice per legend row');
  assert.equal(sum(legend()), 100);
  assert.equal(ring.querySelector('.pv-pie-center strong').textContent, String(w.report.totals.w));
  assert.equal(shell.querySelector('.pv-story-figure').textContent, String(w.report.totals.w), 'the big figure is the wins, not the checkmates');
  assert.match(shell.querySelector('.pv-story-label').textContent, /^wins, \d+% of all your games$/);
  assert.equal(shell.querySelector('.pv-endings-foot'), null, 'no line under the legend');
  const pieLabels = () => [...ring.outside.querySelectorAll('.pv-pie-label')].map(n => parseInt(n.querySelector('b').textContent, 10));
  if (legend().length > 1) assert.deepEqual(pieLabels(), legend().map(([, v]) => v), 'every slice, however thin, is named on the board');
  // Another time control turns the ring to that control's endings, even when the chapter's own board stays the same.
  const control = shell.querySelector('.pv-filter button:not([data-value="all"])');
  if (control) {
    control.click();
    assert.equal(w.viz.layer.querySelector('.pv-pie-center strong').textContent, String(w.report.totals.w), 'the ring follows the time control');
    assert.deepEqual(pieLabels().length > 1 ? pieLabels() : legend().map(([, v]) => v), legend().map(([, v]) => v));
    shell.querySelector('.pv-filter button[data-value="all"]').click();
    assert.equal(w.viz.layer.querySelector('.pv-pie-center strong').textContent, String(w.report.totals.w), 'and back to All');
  }
  endingTabs[1].click();
  assert.equal(w.viz.layer, ring, 'the same ring turns to how your losses ended');
  assert.equal(shell.querySelector('.pv-tabs [aria-selected="true"]').textContent, 'Losses');
  assert.match(shell.querySelector('.pv-story-lead').textContent, /^Your losses most often /);
  assert.equal(ring.querySelector('.pv-pie-center strong').textContent, String(w.report.totals.l));
  assert.match(shell.querySelector('.pv-story-label').textContent, /^loss(es)?, \d+% of all your games$/, 'the big figure follows the tab');
  assert.equal(sum(legend()), 100);
  shell.querySelectorAll('.pv-tabs [role="tab"]')[2].click();
  assert.match(shell.querySelector('.pv-story-lead').textContent, w.report.totals.d ? /^Your draws most often / : /^No draws in this period\.$/);
  assert.equal(shell.querySelectorAll('.pv-endings li').length > 0, !!w.report.totals.d);
  shell.querySelectorAll('.pv-tabs [role="tab"]')[0].click();
  w.go(w.deck.findIndex(s => s.id === 'hits'));
  assert.ok(doc.querySelectorAll('.board .pv-results .pv-tile').length >= 16, 'the board charts results by opponent rating');
  assert.match(doc.querySelector('.profile-board-caption .pv-legend').textContent, /Results by opponent rating:.*Won.*Drew.*Lost/);
  assert.deepEqual([...w.viz.layer.outside.querySelectorAll('.pv-axis-tick')].map(n => n.textContent), ['0%', '25%', '50%', '75%', '100%'], 'a share axis beside the board');
  const replay = shell.querySelector('.pv-link');
  assert.equal(replay?.textContent, 'View your highest rated win');
  assert.match(replay.title, /^Your win against .+ \(\d+\), /);
  replay.click();
  assert.equal(doc.querySelector('.board .pv-results'), null, 'the best win replaces the chart');
  // While the game is up, its link is the way back to the chart.
  const back = shell.querySelector('.pv-link-back');
  assert.equal(back?.textContent, 'Back to the chart');
  back.click();
  assert.ok(doc.querySelector('.board .pv-results'), 'going back brings the chart back');
  assert.equal(shell.querySelector('.pv-link')?.textContent, 'View your highest rated win', 'and the link again');
  shell.querySelector('.pv-link').click();
  w.exitGame();
  assert.ok(doc.querySelector('.board .pv-results'), 'exiting the game brings the chart back');
  assert.equal(shell.querySelector('.pv-link-back'), null);
  w.go(w.deck.findIndex(s => s.id === 'habits'));
  assert.equal(doc.querySelectorAll('.board .pv-bubble').length, 49, 'seven days by seven blocks');
  assert.deepEqual([...doc.querySelectorAll('.board .pv-bubble-day')].map(n => n.textContent), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 'weekdays down the a-file');
  assert.equal(doc.querySelector('.board .pv-bubble-day').style.width, '12.5%');
  assert.deepEqual([...doc.querySelectorAll('.board .pv-bubble-band')].map(n => n.textContent), ['06:00–09:00', '09:00–12:00', '12:00–15:00', '15:00–18:00', '18:00–21:00', '21:00–24:00', '00:00–06:00'], 'the late night is the last column');
  assert.equal(doc.querySelectorAll('.board .pv-bubble')[6].style.left, '87.5%');
  w.go(w.deck.findIndex(s => s.id === 'rating'));
  assert.ok(doc.querySelector('.board .pv-layer .pv-line-path'), 'the rating line is drawn on the board');
  assert.match(shell.querySelector('.pv-story-figure').textContent, /^[+-]?\d+$/);
  w.go(w.deck.length - 1);
  assert.ok(w.boardEl.querySelector('.profile-overview'), 'the last chapter recaps the profile on the board');
  assert.ok(shell.querySelector('.profile-share button.primary'));
  assert.equal(shell.querySelector('.pv-autoplay'), null);
  let copied;
  Object.defineProperty(a.dom.window.navigator, 'clipboard', {value: {writeText: async text => { copied = text; }}, configurable: true});
  let sharing; const copy = w.copyLink.bind(w); w.copyLink = button => sharing = copy(button);
  assert.equal(shell.querySelectorAll('.profile-share button').length, 1, 'the overview offers a share link');
  assert.equal(shell.querySelector('.pv-share'), null, 'Share lives on the last chapter, not in the header');
  shell.querySelector('.profile-share button.primary').click();
  await sharing;
  assert.match(copied, /^https:\/\/t-julsgaard\.github\.io\/Chess-Review\/profile\/#p=/);
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'share', 'sharing keeps the current chapter');
  w.close(); for (let i = 0; i < 4; i++) await settle();
  assert.equal(doc.querySelectorAll('.board .pv-layer').length, 0, 'closing removes the board charts');
});

test('closing the profile on a line chart takes its tags outside the board with it', async t => {
  const a = review(t), doc = a.dom.window.document;
  // jsdom lays nothing out: give elements the offset parent a browser would, so the tags find their place beside the board.
  Object.defineProperty(a.dom.window.HTMLElement.prototype, 'offsetParent', {configurable: true, get() { return this.isConnected ? this.parentElement : null; }});
  seed(a);
  const w = await openDeck(a);
  w.go(w.deck.findIndex(s => s.id === 'rating'));
  assert.ok(doc.querySelector('.pv-outside .pv-line-tag'), 'the start and end tags sit outside the board');
  w.close(); for (let i = 0; i < 4; i++) await settle();
  await new Promise(resolve => a.dom.window.setTimeout(resolve, 500));
  assert.equal(doc.querySelectorAll('.pv-outside').length, 0, 'no tags are left over the review board or the next profile');
});

test('story filters keep chapters stable and each chapter opens on All', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const stored = a.store[rowsKey('chesscom', 'tester')];
  stored.rows = stored.rows.map((row, i) => ({...row, cls: i < 5 ? 'bullet' : 'blitz'}));
  const w = await openDeck(a);
  const chapters = w.deck.map(slide => slide.id);
  const pick = label => [...doc.querySelectorAll('.pv-filter button')].find(button => button.textContent === label).click();
  w.go(chapters.indexOf('season'));
  pick('Bullet');
  assert.equal(w.cls, 'bullet');
  assert.deepEqual(w.deck.map(slide => slide.id), chapters, 'sparse modes preserve chapter order and count');
  assert.equal(doc.querySelectorAll('.pv-seg').length, chapters.length);
  assert.equal(w.currentSlide().id, 'season');
  assert.equal(w.currentSlide().title, 'Not enough games', 'missing filtered chapters never reuse all-mode statistics');
  assert.equal(doc.querySelector('.pv-col-value'), null);
  w.go(chapters.indexOf('signature'));
  assert.equal(w.cls, 'all');
  assert.equal(w.report.cls, 'all');
  assert.equal(doc.querySelector('.pv-filter button.on').textContent, 'All');
  assert.ok(doc.querySelector('.pv-cmp'));
  pick('Blitz');
  doc.querySelectorAll('.pv-seg')[chapters.indexOf('rival')].click();
  assert.equal(w.cls, 'all', 'progress navigation also clears the chapter filter');
  pick('Blitz');
  assert.equal(w.rivalCls, 'blitz');
  doc.querySelector('.pv-next').click();
  doc.querySelector('.pv-prev').click();
  assert.equal(w.rivalCls, 'all');
  assert.equal(doc.querySelector('.pv-filter button.on').textContent, 'All', 'returning to the rival also starts on All');
});

test('a share link carries each time control, and the shared profile switches between them', async t => {
  const {decodeProfile} = await import('../lib/profile/share.js');
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const w = await openDeck(a);
  const pick = label => [...doc.querySelectorAll('.pv-filter button')].find(button => button.textContent === label).click();
  const numbers = () => w.deck.findIndex(slide => slide.id === 'numbers');
  w.go(numbers()); pick('Blitz');
  const blitz = {title: w.currentSlide().title, months: w.season.months.reduce((n, m) => n + m.games, 0)};
  w.cls = 'all'; w.rebuild();
  const all = {title: w.currentSlide().title, options: w.report.classOptions};
  pick('Blitz');
  let copied;
  Object.defineProperty(a.dom.window.navigator, 'clipboard', {value: {writeText: async text => { copied = text; }}, configurable: true});
  await w.copyLink();
  const report = await decodeProfile(copied.split('#p=')[1]);
  assert.deepEqual(report.classOptions, all.options);
  assert.deepEqual(Object.keys(report.byClass).sort(), [...all.options].sort());
  assert.equal(report.cls, 'all', 'a link copied with Blitz picked still starts on every game');
  w.close(); for (let i = 0; i < 4; i++) await settle();

  await a.call('openProfile', {shared: report});
  const s = a.run('profileWorkspace');
  s.go(numbers());
  assert.deepEqual([...doc.querySelectorAll('.pv-filter button')].map(b => b.textContent), ['All', 'Bullet', 'Blitz']);
  assert.equal(s.currentSlide().title, all.title);
  pick('Blitz');
  assert.equal(s.cls, 'blitz');
  assert.equal(s.currentSlide().title, blitz.title, 'the chapter shows what the extension showed for Blitz');
  assert.equal(s.season.months.reduce((n, m) => n + m.games, 0), blitz.months, 'the months follow the time control');
  assert.equal(s.report.account, 'tester');
  pick('All');
  assert.equal(s.currentSlide().title, all.title);
  s.close(); for (let i = 0; i < 4; i++) await settle();

  // A link from before the switch travelled has no slices: no switch, the whole profile as before.
  const {encodeProfile} = await import('../lib/profile/share.js');
  const {byClass: _byClass, ...older} = report;
  const legacy = await decodeProfile(await encodeProfile(older));
  assert.deepEqual(legacy.classOptions, [], 'without slices the link offers no time controls');
  await a.call('openProfile', {shared: legacy});
  const o = a.run('profileWorkspace');
  o.go(numbers());
  assert.equal(doc.querySelector('.pv-filter'), null);
  assert.equal(o.currentSlide().title, all.title);
});

test('story keeps game mode buttons when only one time control is available', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const stored = a.store[rowsKey('chesscom', 'tester')];
  stored.rows = stored.rows.map(row => ({...row, cls: 'blitz'}));
  const w = await openDeck(a);
  for (const id of ['numbers', 'season', 'openings', 'signature', 'rival', 'hits', 'habits', 'clock', 'endings']) {
    w.go(w.deck.findIndex(slide => slide.id === id));
    // Comebacks show one time control at a time: no All. Greatest hits has All again.
    const single = ['swings'].includes(id);
    assert.deepEqual([...doc.querySelectorAll('.pv-filter button')].map(button => button.textContent), single ? ['Blitz'] : ['All', 'Blitz'], id);
    if (single) assert.equal(w.cls, 'blitz', id);
    doc.querySelector('.pv-filter button[data-value="blitz"]').click();
    assert.equal(doc.querySelector('.pv-filter button.on').textContent, 'Blitz', id);
  }
  w.go(w.deck.findIndex(slide => slide.id === 'rating'));
  assert.deepEqual([...doc.querySelectorAll('.pv-modes button')].map(button => button.textContent), ['Blitz']);
});

test('story time controls read Bullet, Blitz, Daily; habit dots and clock columns morph in place', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const stored = a.store[rowsKey('chesscom', 'tester')];
  // Blitz is played most, yet the switch keeps the usual order.
  stored.rows = stored.rows.map((row, i) => ({...row, cls: ['blitz', 'blitz', 'daily', 'bullet'][i % 4]}));
  const w = await openDeck(a);
  const labels = () => [...doc.querySelectorAll('.pv-filter button')].map(b => b.textContent);
  const pick = label => [...doc.querySelectorAll('.pv-filter button')].find(button => button.textContent === label).click();
  w.go(w.deck.findIndex(s => s.id === 'habits'));
  assert.deepEqual(labels(), ['All', 'Bullet', 'Blitz', 'Daily'], 'the habits chapter offers All again');
  assert.equal(w.cls, 'all', 'it opens on All');
  pick('Blitz');
  assert.equal(doc.querySelector('.pv-filter button.on').textContent, 'Blitz');
  const layer = doc.querySelector('.board .pv-layer'), dot = layer.querySelector('.pv-bubble');
  assert.match(doc.querySelector('.profile-board-caption .pv-legend').textContent, /Bigger dot: more games.*Greener: higher win rate/);
  assert.equal(doc.querySelector('.pv-story .pv-legend'), null, 'the key sits under the board, not in the panel');
  const size = dot.style.getPropertyValue('--s');
  pick('Bullet');
  assert.equal(w.cls, 'bullet');
  assert.equal(doc.querySelector('.board .pv-layer'), layer, 'the dots stay on the board');
  assert.equal(layer.querySelector('.pv-bubble'), dot);
  assert.equal(doc.querySelectorAll('.board .pv-layer').length, 1, 'no second chart fades in');
  assert.ok(doc.querySelector('.profile-board-caption .pv-legend'), 'the key stays under the board');
  pick('Blitz');
  assert.equal(dot.style.getPropertyValue('--s'), size, 'back on Blitz the dots return to their sizes');
  pick('Daily');
  w.go(w.deck.findIndex(s => s.id === 'clock'));
  assert.notEqual(doc.querySelector('.board .pv-layer'), layer, 'entering another chapter draws a new chart');
  assert.deepEqual(labels(), ['All', 'Bullet', 'Blitz'], 'All, but no Daily, on the move-time chapter');
  assert.equal(w.cls, 'all', 'the clock opens on All');
  pick('Blitz');
  const clock = doc.querySelector('.board .pv-layer');
  assert.equal(clock.dataset.scene, 'columns');
  assert.deepEqual([...clock.outside.querySelectorAll('.pv-col-label')].map(n => n.textContent), ['0–1s', '1–2s', '2–3s', '3–5s', '5–10s', '10–20s', '20–30s', '30s+'], 'move times in intervals, not "under"');
  pick('Bullet');
  assert.equal(doc.querySelector('.board .pv-layer'), clock, 'the columns grow and shrink in place');
  // Increase granularity sits beside the big figure (so the chapter keeps its height) and splits the chart into narrow intervals.
  const grain = doc.querySelector('.pv-story-hero .pv-grain');
  assert.ok(grain && !grain.closest('.pv-story-top'), 'the switch sits beside the figure, not under the time-control pills');
  assert.equal(grain.getAttribute('role'), 'switch'); assert.equal(grain.getAttribute('aria-checked'), 'false');
  const columnLabels = () => [...doc.querySelector('.board .pv-layer:not(.pv-leaving)').outside.querySelectorAll('.pv-col-label')].map(n => n.textContent);
  grain.click();
  assert.equal(grain.getAttribute('aria-checked'), 'true');
  assert.equal(columnLabels().length, 20); assert.equal(columnLabels()[4], '4s');
  assert.equal(doc.querySelectorAll('.board .pv-layer').length, 1, 'the usual chart gives way to the split one');
  pick('Blitz');
  assert.equal(doc.querySelector('.pv-grain'), grain, 'the same switch stays on across time controls');
  assert.equal(grain.getAttribute('aria-checked'), 'true'); assert.equal(columnLabels().length, 20);
  grain.click();
  assert.deepEqual(columnLabels(), ['0–1s', '1–2s', '2–3s', '3–5s', '5–10s', '10–20s', '20–30s', '30s+']);
  pick('Bullet');
  w.go(w.deck.findIndex(s => s.id === 'habits'));
  assert.equal(w.cls, 'all', 'habits opens on All again');
  w.go(w.deck.findIndex(s => s.id === 'hits'));
  assert.equal(w.cls, 'all', 'greatest hits opens on All');
  assert.deepEqual(labels(), ['All', 'Bullet', 'Blitz', 'Daily'], 'greatest hits offers All again');
  if (w.deck.some(s => s.id === 'swings')) {
    w.go(w.deck.findIndex(s => s.id === 'swings'));
    assert.equal(w.cls, 'blitz', 'comebacks open on the time control played most');
    pick('Bullet');
    w.go(w.deck.findIndex(s => s.id === 'swings') + 1);
    w.go(w.deck.findIndex(s => s.id === 'swings'));
    assert.equal(w.cls, 'blitz', 'and again when entered from an All chapter');
  }
  w.go(w.deck.findIndex(s => s.id === 'trend'));
  assert.equal(w.cls, 'all', 'other chapters still open on All');
  w.go(w.deck.findIndex(s => s.id === 'rating'));
  if (doc.querySelectorAll('.pv-modes button').length > 1) assert.deepEqual([...doc.querySelectorAll('.pv-modes button')].map(b => b.textContent), ['Bullet', 'Blitz', 'Daily'].filter(l => [...doc.querySelectorAll('.pv-modes button')].some(b => b.textContent === l)));
});

test('View game shows the final position before rewinding, with or without a saved final position', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const w = await openDeck(a);
  w.go(w.deck.findIndex(s => s.id === 'rating'));
  const evidence = w.currentSlide().evidence, row = w.rows.find(r => r.id === evidence.id);
  const pgn = '1. e4 d5 2. exd5 Qxd5 *', chess = new Chess();
  chess.loadPgn(pgn);
  const finalFen = chess.fen(), squares = squareNames(row.me === 'b');
  const pieceAt = square => w.boardEl.children[squares.indexOf(square)].querySelector('img')?.dataset.piece;
  a.state.settings.uiAnim = true;
  w.win.Element.prototype.animate = () => ({cancel() {}, finished: Promise.resolve()});
  t.mock.method(w.win.HTMLImageElement.prototype, 'getClientRects', () => [{}]);
  t.mock.timers.enable({apis: ['setTimeout']});

  for (const end of [finalFen, '']) {
    row.fenEnd = end;
    w.board.setOrientation(row.me === 'b');
    w.board.fen(DEFAULT_POSITION);
    const loading = deferred();
    w.o.loadPgn = () => loading.promise;
    doc.querySelector('.pv-link[data-game-url]').click();
    assert.equal(w.boardEl.querySelector('.puzzle-piece-transition'), null, 'no glide from the previous position');
    assert.equal(pieceAt('e2'), undefined, 'the starting position never appears while loading');
    assert.equal(pieceAt('d5'), end ? 'bQ' : undefined);

    loading.resolve(pgn);
    await settle();
    assert.equal(pieceAt('d5'), 'bQ');
    assert.match(w.gameCounter.textContent, /Qxd5 · 4\/4/);
    t.mock.timers.tick(119);
    assert.equal(pieceAt('d5'), 'bQ');
    t.mock.timers.tick(1);
    assert.equal(pieceAt('d5'), 'wP', 'the first animated move undoes the final capture');
    for (let i = 0; i < 3; i++) t.mock.timers.tick(90);
    assert.equal(pieceAt('e2'), 'wP');
    assert.equal(w.gameCounter.textContent, 'Starting position');
    w.exitGame();
  }
});

test('story rating inspection survives filtering and game Exit restores the selected chart', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a); const w = await openDeck(a), reviewFen = a.state.positions[a.state.idx].fen;
  w.go(w.deck.findIndex(s => s.id === 'numbers'));
  [...doc.querySelectorAll('.pv-filter button')].find(b => b.textContent === 'Bullet').click();
  w.go(w.deck.findIndex(s => s.id === 'rating'));
  assert.equal(doc.querySelectorAll('.pv-modes button').length, 2, 'rating modes survive the chapter filter');
  [...doc.querySelectorAll('.pv-modes button')].find(b => b.textContent === 'Bullet').click();
  const chapter = w.index, chart = doc.querySelector('.pv-line');
  chart.focus();
  chart.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
  assert.equal(w.index, chapter); assert.match(chart.getAttribute('aria-label'), /Point 2 of/);
  chart.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'End', bubbles: true, cancelable: true}));
  assert.match(chart.getAttribute('aria-label'), new RegExp(`Point ${w.report.ratings.bullet.games} of`));
  assert.equal(chart.querySelector('.pv-line-path').getAttribute('d').split(' ')[0], 'M0.00');
  w.o.loadPgn = async () => '[White "Alice"]\n[Black "Bob"]\n[WhiteElo "1600"]\n[BlackElo "1700"]\n\n1. e4 d5 2. exd5 Qxd5 *';
  doc.querySelector('.pv-link').click();
  for (let i = 0; i < 8; i++) await settle();
  assert.equal(doc.querySelectorAll('.profile-game-chrome .player-strip').length, 2);
  assert.match(doc.querySelector('.profile-game-chrome').textContent, /Alice.*1600/);
  assert.equal(doc.querySelector('.profile-intro'), null, 'no names cover the board: the strips carry them');
  assert.ok(doc.querySelector('.profile-game-dock .profile-game-controls'), 'move controls sit in the bottom name strip');
  assert.equal(doc.querySelectorAll('.profile-game-controls button').length, 3, 'previous, exit and next only');
  assert.equal(doc.querySelector('.profile-game-controls [aria-label="Previous move"]').disabled, true, 'the game is rewound to the start');
  assert.equal(doc.querySelector('.profile-game-controls [aria-label="Next move"]').disabled, false);
  doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'End', bubbles: true, cancelable: true}));
  assert.equal(w.index, chapter, 'End jumps within the game, not the chapters');
  assert.equal(doc.querySelector('.profile-game-controls [aria-label="Next move"]').disabled, true);
  assert.equal(doc.querySelector('.profile-game-controls [aria-label="Previous move"]').disabled, false);
  assert.equal(doc.querySelectorAll('.profile-game-chrome .cap-pc').length, 2);
  assert.equal(a.state.positions[a.state.idx].fen, reviewFen, 'profile navigation leaves the review intact');
  doc.querySelector('.profile-game-controls .exit-analysis').click();
  assert.equal(w.index, chapter); assert.equal(w.currentSlide().ratingClass, 'bullet');
  assert.ok(doc.querySelector('.pv-line')); assert.equal(doc.querySelector('.profile-game-chrome'), null);
  let finish;
  w.o.loadPgn = () => new Promise(resolve => { finish = resolve; });
  doc.querySelector('.pv-link').click();
  doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}));
  finish('1. e4 e5 *'); for (let i = 0; i < 8; i++) await settle();
  assert.ok(doc.querySelector('.pv-line')); assert.equal(doc.querySelector('.profile-game-chrome'), null);
  w.go(w.deck.findIndex(s => s.id === 'openings'));
  doc.querySelector('.profile-game-controls .exit-analysis').click();
  assert.equal(doc.querySelector('.profile-game-controls'), null, 'Exit also dismisses an inline opening replay');
  const opening = w.index;
  doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
  assert.equal(w.index, opening, 'the arrow stays on the chapter after Exit');
  doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'PageDown', bubbles: true, cancelable: true}));
  assert.equal(w.index, opening + 1, 'Page Down still changes chapters after Exit');
  w.go(0);
  const opened = []; w.win.open = (...args) => opened.push(args);
  const mosaic = doc.querySelector('.profile-game-map');
  for (const key of ['Home', 'Enter']) mosaic.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}));
  assert.equal(opened.length, 1); assert.match(opened[0][0], /^https:\/\/(www\.)?(chess\.com|lichess\.org)\//);
  assert.equal(doc.querySelector('.profile-game-chrome'), null, 'mosaic games open on their platform');
});

test('every habit card has an illustration with a caption and accessible description', t => {
  const {document} = app(t).dom.window;
  for (const {id} of SIGNATURES) {
    const diagram = signatureDiagram(document, id);
    assert.ok(diagram?.querySelector('figcaption').textContent, id);
    assert.ok(diagram.querySelector('[role="img"]').getAttribute('aria-label'), id);
    assert.ok(diagram.querySelector('img, pre'), id);
  }
  const storm = signatureDiagram(document, 'storm');
  assert.equal(storm.querySelectorAll('img[src$="/wP.svg"]').length, 2);
  assert.ok(storm.querySelector('img[src$="/bK.svg"]'));
  assert.equal(storm.querySelectorAll('svg path').length, 2);
  assert.equal(signatureDiagram(document, 'opposite').querySelectorAll('.pv-sig-diagram-board').length, 2);
  assert.ok(signatureDiagram(document, 'length').querySelector('pre'));
});

test('profile settings keep Story even with a saved legacy design', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  a.call('toggleSettings'); a.call('selectSettingsCategory', 'visual');
  const text = doc.querySelector('#settings').textContent;
  assert.ok(text.includes('Player profile'));
  assert.equal(doc.querySelector('#settings [data-setting="profileDesign"]'), null);
  for (const setting of ['profilePortraitStyle', 'profileSignatureBoard']) assert.ok(doc.querySelector(`#settings .lib-dd-btn[data-setting="${setting}"]`), setting);
  const charts = [...doc.querySelectorAll('#settings [role="option"][data-setting="profileSignatureBoard"]')];
  assert.deepEqual(charts.map(chart => chart.dataset.value), ['differences', 'centered', 'pieces', 'cards', 'compare', 'heat']);
  a.state.settings.profileDesign = 'bento';
  const w = await openDeck(a);
  assert.ok(w instanceof StoryWorkspace);
  assert.equal(w.currentSlide().id, 'cover');
});

test('the final Story board summarizes the available chapters and opens them directly', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const w = await openDeck(a);
  const ids = w.deck.slice(0, -1).map(slide => slide.id);
  const tiles = () => [...w.boardEl.querySelectorAll('.profile-overview button')];
  key(a, 'End');
  assert.equal(w.currentSlide().eyebrow, 'Overview');
  assert.deepEqual(tiles().map(button => button.dataset.chapter), ids);
  const recap = id => tiles().find(button => button.dataset.chapter === id);
  const {games, w: wins, d: draws, l: losses} = w.report.totals;
  assert.match(recap('cover').querySelector('.profile-overview-most-played').textContent, /Most played Blitz/);
  assert.match(recap('numbers').textContent, new RegExp(String(games)));
  assert.deepEqual([...recap('numbers').querySelectorAll('.profile-overview-wdl b')].map(n => Number(n.textContent)), [wins, draws, losses]);
  assert.deepEqual([...recap('habits').querySelectorAll('svg text')].map(n => n.textContent), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.ok(tiles().every(button => button.type === 'button' && button.tabIndex === 0));
  for (const id of ids) {
    w.go(w.deck.length - 1);
    tiles().find(button => button.dataset.chapter === id).click();
    assert.equal(w.currentSlide().id, id);
    assert.equal(tiles().length, 0);
    assert.equal(doc.activeElement, w.slideHost.firstElementChild);
  }
  w.go(w.deck.length - 1);
  w.renderSetup();
  assert.equal(doc.querySelector('.profile-overview'), null);
});

test('returning to Game review resets Player Profile to username entry', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  a.store[rowsKey('chesscom', 'other')] = {...a.store[rowsKey('chesscom', 'tester')]};
  const w = await openDeck(a);
  w.go(w.deck.findIndex(s => s.id === 'habits'));
  doc.querySelector('.pv-filter button[data-value="blitz"]').click();
  assert.equal(w.cls, 'blitz');
  const toggle = doc.querySelector('#profileToggle');
  toggle.click();
  assert.equal(a.run('profileWorkspace'), null, 'back on the game review');
  toggle.click(); await settle();
  const next = a.run('profileWorkspace');
  assert.notEqual(next, w);
  assert.equal(next.phase, 'setup');
  assert.equal(doc.querySelector('.pv-story'), null);
  const username = doc.querySelector('.profile-setup input[type="text"]');
  assert.equal(username.value, 'tester');
  assert.equal(doc.activeElement, username);
  username.value = 'other';
  username.dispatchEvent(new a.dom.window.Event('input'));
  doc.querySelector('.profile-build').click(); for (let i = 0; i < 6; i++) await settle();
  assert.equal(next.phase, 'deck');
  assert.equal(next.account, 'other');
  assert.equal(next.deck[next.index]?.id, 'cover');
  assert.equal(next.cls, 'all');
});

test('story Compare keeps the chosen time control, on the rival chapter too', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  a.store[rowsKey('chesscom', 'other')] = {...a.store[rowsKey('chesscom', 'tester')], updatedAt: Date.now()};
  const w = await openDeck(a);
  for (const id of ['season', 'rival']) {
    w.go(w.deck.findIndex(slide => slide.id === id));
    doc.querySelector('.pv-filter button[data-value="blitz"]').click();
    const [other] = await w.comparablePlayers();
    assert.ok(await w.switchPlayer(other));
    assert.equal(w.deck[w.index].id, id);
    assert.equal(doc.querySelector('.pv-filter button.on').textContent, 'Blitz', id);
    assert.ok(await w.switchPlayer({site: 'chesscom', account: 'tester'}));
  }
});

test('story Compare turns into Switch: press to swap players, × to stop', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  a.store[rowsKey('chesscom', 'other')] = {...a.store[rowsKey('chesscom', 'tester')], updatedAt: Date.now()};
  const w = await openDeck(a);
  w.go(w.deck.findIndex(slide => slide.id === 'clock'));
  const title = () => doc.querySelector('.pv-head-name .profile-head-title').textContent;
  const swap = () => doc.querySelector('.pv-compare-swap');
  assert.equal(doc.querySelector('.pv-compare').textContent, 'Compare');
  const [other] = await w.comparablePlayers();
  const layer = doc.querySelector('.board .pv-layer');
  assert.ok(await w.pickCompare(other));
  assert.equal(title(), 'other');
  assert.equal(swap().textContent, 'Switch');
  assert.equal(swap().title, 'Switch to tester', 'it switches to the player the comparison started from');
  assert.ok(doc.querySelector('.pv-compare-stop'), 'with a × to stop');
  assert.equal(w.deck[w.index].id, 'clock', 'the same chapter stays');
  assert.equal(doc.querySelector('.board .pv-layer'), layer, 'the columns change in place instead of drawing again');
  swap().click(); for (let i = 0; i < 6; i++) await settle();
  assert.equal(title(), 'tester');
  assert.equal(swap().title, 'Switch to other', 'after the swap it switches back');
  swap().click(); for (let i = 0; i < 6; i++) await settle();
  assert.equal(title(), 'other');
  doc.querySelector('.pv-compare-stop').click(); for (let i = 0; i < 6; i++) await settle();
  assert.equal(title(), 'tester', 'stopping goes back to the player the comparison started from');
  assert.equal(doc.querySelector('.pv-compare-swap'), null);
  assert.equal(doc.querySelector('.pv-compare').textContent, 'Compare');
});

test('story chapters without enough games in a time control all say the same, and only that', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const stored = a.store[rowsKey('chesscom', 'tester')];
  // Six rapid games: the switch offers Rapid, but no chapter has enough of them.
  stored.rows = stored.rows.map((row, i) => ({...row, cls: i < 6 ? 'rapid' : 'blitz'}));
  const w = await openDeck(a);
  for (const id of ['numbers', 'openings', 'signature', 'hits', 'habits', 'clock', 'trend', 'endings']) {
    const at = w.deck.findIndex(slide => slide.id === id); if (at < 0) continue;
    w.go(at);
    const rapid = doc.querySelector('.pv-filter button[data-value="rapid"]'); if (!rapid) continue;
    rapid.click();
    const story = doc.querySelector('.pv-story');
    assert.equal(story.querySelector('.pv-story-figure').textContent, 'Not enough games', id);
    assert.equal(story.querySelector('.pv-story-label'), null, id + ': no figure label');
    for (const extra of ['.pv-tabs', '.pv-wdl', '.pv-endings', '.pv-link', '.profile-engine', '.pv-grain', '.pv-fact']) assert.equal(story.querySelector(extra), null, `${id}: ${extra}`);
    assert.equal(doc.querySelector('.board .pv-layer:not(.pv-leaving)'), null, id + ': no chart on the board');
  }
});

test('a profile of both sites draws the other site\'s rating as a second line, named in a key under the board', async () => {
  const {JSDOM} = await import('jsdom');
  const {createViz} = await import('../lib/profile/designs/board-viz.js');
  const series = (shift, base) => Array.from({length: 8}, (_, i) => ({t: 1.7e9 + (i + shift) * 86400 * 7, r: base + i * 12}));
  // The Lichess line peaks before its end, so it carries a peak of its own.
  const lichess = series(0, 1700).map((p, i) => i === 7 ? {...p, r: 1760} : p);
  const report = {ratingSite: 'chesscom', otherRatingSite: 'lichess', ratings: {blitz: {series: series(2, 1500), peak: {t: 1.7e9 + 9 * 86400 * 7, rating: 1584}}}, otherRatings: {blitz: {series: lichess}}};
  const spec = DesignWorkspace.prototype.ratingScene.call({report}, {ratingClass: 'blitz'});
  assert.deepEqual(spec.scene.extra.map(e => e.name), ['Lichess']);
  assert.deepEqual(spec.scene.legend.map(([cls, text]) => [cls, text]), [['pv-legend-line', 'Chess.com'], ['pv-legend-line', 'Lichess']], 'the key names both lines');
  assert.equal(spec.scene.axes, true);
  assert.match(spec.caption, /^Blitz rating on Chess\.com and Lichess across the board/);
  // Without the other site's line there is no key; the axes stay.
  const one = DesignWorkspace.prototype.ratingScene.call({report: {...report, otherRatings: {}}}, {ratingClass: 'blitz'});
  assert.deepEqual([one.scene.legend, one.scene.extra, one.scene.axes], [null, [], true]);
  const dom = new JSDOM('<div class="wrap"><div class="board"></div></div>'), board = dom.window.document.querySelector('.board');
  const viz = createViz(board, {motion: () => false});
  const layer = viz.line(spec.scene.series, spec.scene);
  // Drawn like the main line: its own area, glow and line.
  assert.equal(layer.querySelectorAll('.pv-line-alt').length, 2, 'the second line and its glow');
  assert.equal(layer.querySelectorAll('.pv-line-area').length, 2, 'each line shades its own area');
  // The end tags are plain ratings now that the key names the sites.
  const tags = [...layer.outside.querySelectorAll('.pv-end .pv-line-tag')].map(n => n.textContent);
  assert.deepEqual(tags, ['1584', '1760']);
  assert.deepEqual([...layer.outside.querySelectorAll('.pv-peak .pv-line-tag')].map(n => n.textContent), ['Peak 1772'], 'the Lichess line\'s own peak');
  // The axes span both lines: the earlier Lichess line starts at the left edge.
  assert.match(layer.querySelector('.pv-line-alt').getAttribute('d'), /^M0\.00 /);
  // Round ratings left of the board, months under it.
  const ticks = [...layer.outside.querySelectorAll('.pv-axis-tick')].map(n => Number(n.textContent));
  assert.ok(ticks.length >= 2 && ticks.every(v => v % 50 === 0), 'round values: ' + ticks);
  assert.ok(layer.outside.querySelectorAll('.pv-axis-x').length >= 1, 'months under the board');
  assert.ok(layer.outside.classList.contains('pv-columns-below'), 'so the key sits below the month names');
  layer.getBoundingClientRect = () => ({left: 0, width: 90});
  const readout = layer.outside.querySelector('.pv-line-readout');
  const ratingsShown = () => [...readout.querySelectorAll('b')].map(n => n.textContent);
  const dots = [...layer.outside.querySelectorAll('.pv-inspect')];
  assert.equal(readout.hidden, true);
  layer.dispatchEvent(new dom.window.MouseEvent('pointermove', {clientX: 10}));
  assert.deepEqual(ratingsShown(), ['1500', '1712'], 'each site uses its nearest point, including before the first Chess.com game');
  assert.match(readout.textContent, /Chess\.com.*Lichess/);
  assert.notEqual(dots[0].style.left, dots[1].style.left, 'each dot sits on its own date');
  assert.notEqual(...[...readout.querySelectorAll('small')].map(n => n.textContent), 'the dates of the two games are shown separately');
  assert.match(layer.getAttribute('aria-label'), /Chess\.com: 1500.*Lichess: 1712/);
  layer.dispatchEvent(new dom.window.MouseEvent('pointerleave'));
  assert.equal(readout.hidden, true);
  layer.focus();
  layer.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Home'}));
  assert.deepEqual(ratingsShown(), ['1500', '1700'], 'the keyboard can reach the first game on either site');
  layer.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'End'}));
  assert.deepEqual(ratingsShown(), ['1584', '1760']);
  layer.blur();
  assert.equal(readout.hidden, true);
});

test('accuracy opens with the game animation and time-control changes show the average immediately', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const rows = a.store[rowsKey('chesscom', 'tester')].rows;
  rows.slice(0, 10).forEach(row => { row.cls = 'rapid'; });
  const w = await openDeck(a);
  w.win.Element.prototype.animate = () => ({cancel() {}, finished: Promise.resolve()});
  w.motion = () => true;
  w.win.HTMLCanvasElement.prototype.getContext = () => ({});
  w.engine = Object.fromEntries(w.rows.filter(row => row.cls !== 'bullet').map((row, i) => [row.id, {acc: 65 + i % 27}]));
  w.rebuild();
  w.go(w.deck.findIndex(s => s.id === 'trend'));
  const chart = w.viz.layer;
  assert.ok(chart.querySelector('.pv-line-build'), 'entering the chapter draws the games');
  assert.equal(typeof chart.cancelLineBuild, 'function');
  const filter = mode => doc.querySelector(`.pv-filter [data-value="${mode}"]`).click();
  filter('blitz');
  assert.equal(w.viz.layer, chart, 'filtering retains the chart layer');
  assert.equal(chart.querySelector('.pv-line-build'), null);
  assert.equal(chart.cancelLineBuild, undefined, 'the interrupted draw is cancelled');
  assert.ok(chart.querySelector('.pv-line-path'));
  assert.ok(chart.classList.contains('pv-line-settled'));
  filter('bullet');
  assert.equal(w.viz.layer, null, 'bullet has no checked games');
  filter('all');
  assert.ok(w.viz.layer.classList.contains('pv-line-settled'), 'filtering from an empty chart also skips the animation');
});

test('the rating chart shows round ratings and calendar ticks for longer histories', async () => {
  const {ratingTicks, timeTicks} = await import('../lib/profile/designs/board-viz.js');
  assert.deepEqual(ratingTicks(1480, 1720), [1500, 1550, 1600, 1650, 1700]);
  assert.deepEqual(ratingTicks(1210, 1240), [1210, 1220, 1230, 1240]);
  assert.ok(ratingTicks(400, 2900).length <= 5);
  const at = (y, m, d = 15) => new Date(y, m, d).getTime() / 1000;
  const months = timeTicks(at(2025, 10), at(2026, 9));
  assert.ok(months.length >= 2 && months.length <= 7, 'a year of play: ' + months.map(t => t.label));
  assert.ok(months.every(t => /^[A-Z][a-z]{2}$/.test(t.label)), 'month names only');
  assert.deepEqual(timeTicks(at(2026, 0), at(2026, 3)).map(t => t.label), ['Feb', 'Mar', 'Apr'], 'every month of a short line');
  const years = timeTicks(at(2019, 4), at(2026, 9));
  assert.ok(years.length >= 2 && years.length <= 7 && years.every(t => /^\d{4}$/.test(t.label)), 'years only: ' + years.map(t => t.label));
});

test('the rating chart labels both ends when fewer than two calendar ticks fit', async () => {
  const {JSDOM} = await import('jsdom');
  const {createViz, timeTicks} = await import('../lib/profile/designs/board-viz.js');
  const at = (m, d, h = 12) => new Date(2026, m - 1, d, h).getTime() / 1000;
  const labels = (t0, t1) => timeTicks(t0, t1).map(tick => tick.label);
  assert.deepEqual(labels(at(11, 2), at(11, 24)), ['Nov 2', 'Nov 24']);
  assert.deepEqual(labels(at(10, 31), at(12, 1)), ['Oct 31', 'Dec 1'], 'calendar ticks too close to the edges are skipped');
  assert.deepEqual(labels(at(11, 24), at(11, 24, 13)), ['Nov 24, 12:00', 'Nov 24, 13:00']);
  assert.deepEqual(labels(at(11, 24), at(11, 24) + 20), ['Nov 24, 12:00:00', 'Nov 24, 12:00:20']);
  assert.deepEqual(labels(at(11, 24), at(11, 24)), ['Nov 24']);

  const dom = new JSDOM('<div class="board"></div>');
  const viz = createViz(dom.window.document.querySelector('.board'), {motion: () => false});
  const chart = viz.line([{t: at(10, 27), r: 1500}, {t: at(11, 16), r: 1570}], {axes: true});
  const ticks = [...chart.outside.querySelectorAll('.pv-axis-x')];
  assert.deepEqual(ticks.map(tick => [tick.textContent, tick.style.left, tick.style.getPropertyValue('--pv-axis-anchor')]), [
    ['Oct 27', '0%', '0%'], ['Nov 16', '100%', '100%'],
  ]);
  dom.window.close();
});

test('profile designs: the "When you play" headline names what stands out about the time of play', async () => {
  const {playTime} = await import('../lib/profile/deck.js');
  const H = (over = {}) => ({night: {games: 5}, early: {games: 5}, morning: {games: 20}, day: {games: 25}, evening: {games: 50},
    busiestWeekday: {day: 'Tue', games: 18}, weekdayGames: {Sun: 14, Mon: 14, Tue: 18, Wed: 14, Thu: 14, Fri: 14, Sat: 12}, ...over});
  assert.equal(playTime(H({night: {games: 40}}), 100).title, 'Night owl');
  assert.match(playTime(H({night: {games: 40}}), 100).label, /40% of your games between 23:00 and 05:00/);
  assert.equal(playTime(H({early: {games: 25}}), 100).title, 'Early bird');
  assert.equal(playTime(H({busiestWeekday: {day: 'Tue', games: 30}}), 100).title, 'Tuesday player');
  assert.equal(playTime(H({busiestWeekday: {day: 'Sat', games: 30}, weekdayGames: {Sat: 30, Sun: 20}}), 100).title, 'Weekend player');
  assert.equal(playTime(H(), 100).title, 'Evening player', 'otherwise the part of the day with the most games');
  assert.equal(playTime(H({day: {games: 60}}), 100).title, 'Afternoon player');
});
