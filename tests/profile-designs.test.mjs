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
  assert.ok(doc.querySelector('.board .pv-pairs'), 'the board compares you with a typical player');
  w.go(w.deck.findIndex(s => s.id === 'rival'));
  assert.equal(doc.querySelector('.board .pv-badge'), null);
  assert.match(shell.querySelector('.pv-story-lead').textContent, /^You played \d+ games against rival_rick: won \d+, lost \d+, drew \d+\.$/);
  assert.equal(shell.querySelector('.pv-link'), null, 'no link to the latest decisive game');
  w.go(w.deck.findIndex(s => s.id === 'habits'));
  assert.equal(doc.querySelectorAll('.board .pv-bubble').length, 42, 'seven days by six blocks of four hours');
  w.go(w.deck.findIndex(s => s.id === 'rating'));
  assert.ok(doc.querySelector('.board .pv-layer .pv-line-path'), 'the rating line is drawn on the board');
  assert.match(shell.querySelector('.pv-story-figure').textContent, /^[+-]?\d+$/);
  w.go(w.deck.length - 1);
  assert.ok(shell.querySelector('.pv-recap'), 'the last chapter recaps the year');
  assert.ok(shell.querySelector('.profile-share button.primary'));
  shell.querySelector('.pv-autoplay').click();
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'cover', 'play from the end starts again');
  assert.equal(w.playing, true);
  w.close(); for (let i = 0; i < 4; i++) await settle();
  assert.equal(doc.querySelectorAll('.board .pv-layer').length, 0, 'closing removes the board charts');
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
