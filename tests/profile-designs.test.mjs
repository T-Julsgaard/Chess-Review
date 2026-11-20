import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';
import {season} from './helpers/profile-season.mjs';
import {rowsKey} from '../lib/profile/store.js';
import {IDENTITY_KEY} from '../lib/identity.js';
import {PROFILE_DESIGNS, profileWorkspaceClass} from '../lib/profile/designs/index.js';
import {DesignWorkspace} from '../lib/profile/designs/base.js';
import {StoryWorkspace} from '../lib/profile/designs/story.js';
import {seasonStats, seasonSlide} from '../lib/profile/designs/season.js';

function review(t, design) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  if (design) a.state.settings.profileDesign = design;
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

test('profile designs: four designs, story by default and for unknown ids', () => {
  assert.deepEqual(PROFILE_DESIGNS.map(d => d.id), ['classic', 'story', 'bento', 'editorial']);
  assert.equal(profileWorkspaceClass('classic'), DesignWorkspace);
  assert.equal(profileWorkspaceClass('nope'), StoryWorkspace);
  assert.equal(profileWorkspaceClass(undefined), StoryWorkspace);
  for (const d of PROFILE_DESIGNS) assert.equal(profileWorkspaceClass(d.id).design, d.id);
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

test('profile designs: classic keeps the original deck', async t => {
  const a = review(t, 'classic'), doc = a.dom.window.document;
  seed(a);
  const w = await openDeck(a);
  assert.equal(doc.querySelector('.profile-shell').dataset.design, 'classic');
  assert.ok(!w.deck.some(s => s.id === 'season'), 'classic adds no chapters');
  assert.equal(doc.querySelector('.profile-slide').dataset.slide, 'cover');
});

test('profile designs: story shows one figure per chapter, progress segments and charts on the board', async t => {
  const a = review(t, 'story'), doc = a.dom.window.document;
  seed(a);
  const w = await openDeck(a);
  const shell = doc.querySelector('.profile-shell');
  assert.equal(shell.dataset.design, 'story');
  assert.ok(w.deck.some(s => s.id === 'season'), 'the season chapter is added');
  assert.equal(shell.querySelectorAll('.pv-seg').length, w.deck.length);
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'cover');
  assert.equal(shell.querySelector('.pv-story-chapter'), null, 'the cover has no chapter label');
  assert.equal(shell.querySelectorAll('.pv-points li').length, 3, 'period, games and hours as separate lines');
  assert.match(shell.querySelector('.pv-points').textContent, /hours? at the board/);
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
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'season');
  assert.ok(doc.querySelectorAll('.board .pv-layer .pv-tile').length > 8, 'months are columns of squares');
  assert.equal(shell.querySelectorAll('.pv-points li').length, 2);
  w.go(w.deck.findIndex(s => s.id === 'signature'));
  assert.ok(shell.querySelectorAll('.pv-cmp').length >= 6, 'every metric against a typical player');
  const signature = w.currentSlide();
  assert.equal(shell.querySelector('.pv-cmp-label').firstChild.textContent, signature.signatures[0].label, 'the strongest signature is first in the comparison');
  assert.equal(shell.querySelectorAll('.pv-cmp').length, signature.compare.length, 'the comparison includes every metric');
  assert.match(shell.querySelector('.pv-story-chapter').textContent, /You compared to a typical player/);
  assert.equal(shell.querySelector('.pv-story-hero'), null, 'no headline repeats the first habit; the list starts higher');
  assert.equal(shell.querySelector('.pv-story-lead'), null);
  assert.ok(doc.querySelector('.board .pv-pairs'), 'the board compares you with a typical player');
  w.go(w.deck.findIndex(s => s.id === 'rival'));
  assert.equal(doc.querySelector('.board .pv-badge'), null);
  assert.match(shell.querySelector('.pv-story-lead').textContent, /^You played \d+ games against rival_rick: won \d+, lost \d+, drew \d+\.$/);
  assert.equal(shell.querySelector('.pv-link'), null, 'no link to the latest decisive game');
  w.go(w.deck.findIndex(s => s.id === 'hits'));
  assert.equal(shell.querySelector('.pv-link'), null, 'the win already plays on the board: no link to view it');
  w.exitGame();
  assert.match(shell.querySelector('.pv-link')?.textContent || '', /^View the win against /, 'after exiting, the link brings it back');
  shell.querySelector('.pv-link').click();
  assert.equal(shell.querySelector('.pv-link'), null);
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
  assert.ok(shell.querySelector('.pv-recap'), 'the last chapter recaps the year');
  assert.ok(shell.querySelector('.profile-share button.primary'));
  assert.equal(shell.querySelector('.pv-autoplay'), null);
  let copied;
  Object.defineProperty(a.dom.window.navigator, 'clipboard', {value: {writeText: async text => { copied = text; }}, configurable: true});
  let sharing; const copy = w.copyLink.bind(w); w.copyLink = button => sharing = copy(button);
  shell.querySelector('.pv-share').click();
  await sharing;
  assert.match(copied, /^https:\/\/t-julsgaard\.github\.io\/Chess-Review\/profile\/#p=/);
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'share', 'sharing keeps the current chapter');
  w.close(); for (let i = 0; i < 4; i++) await settle();
  assert.equal(doc.querySelectorAll('.board .pv-layer').length, 0, 'closing removes the board charts');
});

test('story filters keep chapters stable and each chapter opens on All', async t => {
  const a = review(t, 'story'), doc = a.dom.window.document;
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

test('story keeps game mode buttons when only one time control is available', async t => {
  const a = review(t, 'story'), doc = a.dom.window.document;
  seed(a);
  const stored = a.store[rowsKey('chesscom', 'tester')];
  stored.rows = stored.rows.map(row => ({...row, cls: 'blitz'}));
  const w = await openDeck(a);
  for (const id of ['numbers', 'season', 'openings', 'signature', 'rival', 'hits', 'habits', 'clock', 'endings']) {
    w.go(w.deck.findIndex(slide => slide.id === id));
    assert.deepEqual([...doc.querySelectorAll('.pv-filter button')].map(button => button.textContent), ['All', 'Blitz'], id);
    doc.querySelector('.pv-filter button[data-value="blitz"]').click();
    assert.equal(doc.querySelector('.pv-filter button.on').textContent, 'Blitz', id);
  }
  w.go(w.deck.findIndex(slide => slide.id === 'rating'));
  assert.deepEqual([...doc.querySelectorAll('.pv-modes button')].map(button => button.textContent), ['Blitz']);
});

test('story time controls read Bullet, Blitz, Daily; habit dots and clock columns morph in place', async t => {
  const a = review(t, 'story'), doc = a.dom.window.document;
  seed(a);
  const stored = a.store[rowsKey('chesscom', 'tester')];
  // Blitz is played most, yet the switch keeps the usual order.
  stored.rows = stored.rows.map((row, i) => ({...row, cls: ['blitz', 'blitz', 'daily', 'bullet'][i % 4]}));
  const w = await openDeck(a);
  const labels = () => [...doc.querySelectorAll('.pv-filter button')].map(b => b.textContent);
  const pick = label => [...doc.querySelectorAll('.pv-filter button')].find(button => button.textContent === label).click();
  w.go(w.deck.findIndex(s => s.id === 'habits'));
  assert.deepEqual(labels(), ['All', 'Bullet', 'Blitz', 'Daily']);
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
  pick('All');
  assert.equal(dot.style.getPropertyValue('--s'), size, 'back on All the dots return to their sizes');
  w.go(w.deck.findIndex(s => s.id === 'clock'));
  assert.notEqual(doc.querySelector('.board .pv-layer'), layer, 'entering another chapter draws a new chart');
  assert.deepEqual(labels(), ['All', 'Bullet', 'Blitz'], 'no Daily on the move-time chapter');
  const clock = doc.querySelector('.board .pv-layer');
  assert.equal(clock.dataset.scene, 'columns');
  assert.deepEqual([...clock.querySelectorAll('.pv-col-label')].map(n => n.textContent), ['0–1s', '1–2s', '2–3s', '3–5s', '5–10s', '10–20s', '20–30s', '30s+'], 'move times in intervals, not "under"');
  pick('Blitz');
  assert.equal(doc.querySelector('.board .pv-layer'), clock, 'the columns grow and shrink in place');
  w.go(w.deck.findIndex(s => s.id === 'rating'));
  if (doc.querySelectorAll('.pv-modes button').length > 1) assert.deepEqual([...doc.querySelectorAll('.pv-modes button')].map(b => b.textContent), ['Bullet', 'Blitz', 'Daily'].filter(l => [...doc.querySelectorAll('.pv-modes button')].some(b => b.textContent === l)));
});

test('profile designs: dashboard opens on a grid, previews and opens chapters, Escape returns', async t => {
  const a = review(t, 'bento'), doc = a.dom.window.document;
  seed(a);
  const w = await openDeck(a);
  const shell = doc.querySelector('.profile-shell');
  assert.equal(w.deck[0].id, 'overview');
  assert.ok(!w.deck.some(s => s.id === 'cover'), 'the grid replaces the cover');
  const tiles = shell.querySelectorAll('.pv-tile-card');
  assert.ok(tiles.length >= 10, 'tiles: ' + tiles.length);
  assert.ok(doc.querySelector('.board .profile-game-map'), 'the board shows the entire game history');
  shell.querySelector('.pv-tile-card[data-chapter="rating"]').click();
  assert.equal(shell.querySelector('.pv-detail').dataset.slide, 'rating');
  assert.ok(doc.querySelector('.board .pv-line-path'));
  assert.ok(!w.nav.hidden);
  key(a, 'Escape');
  assert.ok(shell.querySelector('.pv-bento'), 'Escape goes back to the grid');
  assert.ok(a.run('profileWorkspace'), 'and keeps the profile open');
});

test('story rating inspection survives filtering and game Exit restores the selected chart', async t => {
  const a = review(t, 'story'), doc = a.dom.window.document;
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
  assert.equal(w.index, opening + 1, 'chapter navigation resumes after Exit');
  w.go(0);
  const opened = []; w.win.open = (...args) => opened.push(args);
  const mosaic = doc.querySelector('.profile-game-map');
  for (const key of ['Home', 'Enter']) mosaic.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}));
  assert.equal(opened.length, 1); assert.match(opened[0][0], /^https:\/\/(www\.)?(chess\.com|lichess\.org)\//);
  assert.equal(doc.querySelector('.profile-game-chrome'), null, 'mosaic games open on their platform');
});

test('profile designs: editorial is one page whose rail and board follow the chapter', async t => {
  const a = review(t, 'editorial'), doc = a.dom.window.document;
  seed(a);
  const w = await openDeck(a);
  const shell = doc.querySelector('.profile-shell');
  const sections = shell.querySelectorAll('.pv-ed-chapter');
  assert.equal(sections.length, w.deck.length, 'every chapter is on the page');
  assert.equal(shell.querySelectorAll('.pv-ed-rail button').length, w.deck.length);
  assert.ok(shell.querySelector('.pv-ed-vs'), 'habits are compared with a typical club player');
  const rival = w.deck.findIndex(s => s.id === 'rival');
  shell.querySelectorAll('.pv-ed-rail button')[rival].click();
  assert.equal(w.index, rival);
  assert.ok(shell.querySelectorAll('.pv-ed-rail button')[rival].classList.contains('on'));
  const endings = w.deck.findIndex(s => s.id === 'endings');
  key(a, 'End');
  assert.equal(w.index, w.deck.length - 1);
  w.go(endings);
  assert.ok(doc.querySelectorAll('.board .pv-layer .pv-tile').length > 4, 'endings are columns on the board');
  w.renderSetup();
  assert.equal(shell.querySelector('.pv-ed-rail'), null, 'the rail leaves with the deck');
});

test('profile designs: Settings → Visual offers the designs and switching reopens on the same chapter', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  a.call('toggleSettings'); a.call('selectSettingsCategory', 'visual');
  const text = doc.querySelector('#settings').textContent;
  assert.ok(text.includes('Player profile'));
  for (const setting of ['profileDesign', 'profilePortraitStyle', 'profileSignatureBoard']) assert.ok(doc.querySelector(`#settings .lib-dd-btn[data-setting="${setting}"]`), setting);
  assert.equal(a.state.settings.profileDesign, 'story');
  const w = await openDeck(a);
  w.go(w.deck.findIndex(s => s.id === 'rival'));
  await a.call('setSetting', 'profileDesign', 'classic'); for (let i = 0; i < 10; i++) await settle();
  const next = a.run('profileWorkspace');
  assert.notEqual(next, w);
  assert.equal(next.design, 'classic');
  assert.equal(next.deck[next.index]?.id, 'rival', 'the new design opens on the chapter you were reading');
  assert.equal(doc.querySelectorAll('.profile-shell').length, 1);
});

test('leaving the profile and coming back reopens the deck on the same chapter and filter, without loading', async t => {
  const a = review(t, 'story'), doc = a.dom.window.document;
  seed(a);
  const w = await openDeck(a);
  w.go(w.deck.findIndex(s => s.id === 'habits'));
  doc.querySelector('.pv-filter button[data-value="blitz"]')?.click();
  const cls = w.cls; assert.equal(cls, 'blitz');
  await a.call('toggleProfile'); for (let i = 0; i < 6; i++) await settle();
  assert.equal(a.run('profileWorkspace'), null, 'back on the game review');
  await a.call('openProfile');
  const next = a.run('profileWorkspace');
  assert.notEqual(next, w);
  assert.equal(next.phase, 'deck', 'no setup and no loader');
  assert.equal(next.deck[next.index]?.id, 'habits');
  assert.equal(next.cls, cls);
  assert.equal(doc.querySelector('.pv-story').dataset.slide, 'habits');
  assert.equal(doc.querySelector('.profile-setup'), null);
  // Back to the start, then leaving: the next visit starts at the setup again.
  next.renderSetup();
  await a.call('toggleProfile'); for (let i = 0; i < 6; i++) await settle();
  await a.call('openProfile'); for (let i = 0; i < 6; i++) await settle();
  assert.equal(a.run('profileWorkspace').phase, 'setup');
});
