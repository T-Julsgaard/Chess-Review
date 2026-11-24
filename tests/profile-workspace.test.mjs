import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle, deferred} from './helpers/app.mjs';
import {season} from './helpers/profile-season.mjs';
import {rowsKey, JOB_KEY} from '../lib/profile/store.js';
import {IDENTITY_KEY} from '../lib/identity.js';
import {encodeProfile, decodeProfile, trimReport, profileLink} from '../lib/profile/share.js';
import {buildInsights} from '../lib/profile/insights.js';
import {buildReport, buildDeck} from '../lib/profile/deck.js';
import {ProfileWorkspace} from '../lib/profile/workspace.js';
import {gameFeatures} from '../lib/profile/features.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.state.settings.profileDepth = 'off';
  t.after(() => a.run('profileWorkspace')?.close());
  return a;
}
async function open(a) { await a.call('openProfile'); for (let i = 0; i < 6; i++) await settle(); }
// Opening asks first; nothing loads until the player presses Build profile.
async function build(a) { a.dom.window.document.querySelector('.profile-build').click(); for (let i = 0; i < 6; i++) await settle(); }
async function openDeck(a) { await open(a); await build(a); }
function seed(a, rows = season(), account = 'tester') {
  const seeded = rows.map(r => ({...r, opp: r.opp === 'tester' ? 'someone' : r.opp}));
  a.store[rowsKey('chesscom', account)] = {rows: seeded, months: [], since: 0, updatedAt: Date.now()};
  a.store[IDENTITY_KEY] = {chesscom: {accounts: [{name: account, seenAt: Date.now(), via: 'test'}]}};
}

test('profile: the toggle opens the setup, hides the review panels, keeps the review board and restores on close', async t => {
  const a = review(t), doc = a.dom.window.document;
  const toggle = doc.querySelector('#profileToggle'), reviewBoard = doc.querySelector('.board');
  assert.equal(toggle.textContent, 'Player profile');
  await open(a);
  assert.equal(toggle.textContent, 'Return to Game review');
  assert.ok(doc.querySelector('#canvas').classList.contains('profile-active'));
  assert.ok(doc.querySelector('.mod[data-mod="accuracy"]').inert);
  assert.ok(!doc.querySelector('.mod[data-mod="board"]').inert);
  const shell = doc.querySelector('.profile-shell');
  assert.ok(shell && shell.querySelector('.profile-setup input'));
  assert.equal(doc.querySelector('.board'), reviewBoard, 'the review board stays as it is while choosing');
  assert.ok(!reviewBoard.classList.contains('profile-board'));
  assert.equal(reviewBoard.querySelectorAll('.piece-img').length, 32);
  a.call('toggleProfile'); for (let i = 0; i < 4; i++) await settle();
  assert.equal(doc.querySelector('.profile-shell'), null);
  assert.ok(!doc.querySelector('#canvas').classList.contains('profile-active'));
  assert.ok(!doc.querySelector('.mod[data-mod="accuracy"]').inert);
  assert.equal(toggle.textContent, 'Player profile');
  assert.equal(doc.querySelectorAll('.board .profile-piece').length, 0);
  assert.ok(doc.querySelectorAll('.board .piece-img').length >= 32, 'the review board is painted again');
});

test('profile: seeded games render the deck on the board with navigation, stats and evidence', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  await open(a);
  const shell = doc.querySelector('.profile-shell');
  assert.ok(shell, 'shell mounted');
  assert.equal(shell.querySelector('.profile-setup input').value, 'tester', 'the known account is prefilled');
  assert.equal(shell.querySelector('.pv-story'), null, 'nothing loads before Build profile');
  await build(a);
  assert.equal(shell.querySelector('.profile-head-title').textContent, 'tester');
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'cover');
  assert.equal(shell.querySelector('.pv-story-figure').textContent, 'tester');
  const dots = shell.querySelectorAll('.pv-seg');
  assert.ok(dots.length >= 12, 'most slides are available: ' + dots.length);
  assert.ok(doc.querySelector('.board .profile-game-map'), 'cover shows every game on the board');
  assert.equal(doc.querySelector('.profile-map-summary').textContent, `${a.run('profileWorkspace').periodRows().length} games`);
  shell.querySelector('.pv-next').click();
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'numbers');
  assert.ok(shell.querySelectorAll('.pv-fact').length >= 4);
  assert.ok(doc.querySelectorAll('.board .sq.profile-fill').length === 64, 'the fill shows every game on the board');
  assert.equal(doc.querySelector('.profile-board-caption').textContent, '', 'no explanatory text under the board');
  [...shell.querySelectorAll('.pv-seg')].find(dot => dot.title.startsWith('Rating over time')).click();
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'rating');
  assert.ok(doc.querySelector('.board .pv-line'));
  shell.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'End', bubbles: true}));
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'share');
  assert.ok(shell.querySelector('.profile-share button.primary').textContent.includes('Share with a friend'));
  shell.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'cover');
  const goTo = title => [...shell.querySelectorAll('.pv-seg')].find(dot => dot.title === title).click();
  goTo('You vs. a typical player');
  assert.equal(shell.querySelector('.pv-story').dataset.slide, 'signature');
  assert.ok(doc.querySelector('.board .pv-differences'));
  for (const link of shell.querySelectorAll('.pv-link[data-game-url]')) assert.match(link.dataset.gameUrl, /^https:\/\/www\.chess\.com\//);
  // Nothing runs by itself: the trend slide offers the check, with an estimate, until it is started.
  goTo('Accuracy over time');
  assert.equal(shell.querySelector('.profile-engine .profile-button.primary').textContent, 'Check accuracy');
  assert.match(shell.querySelector('.profile-engine-estimate').textContent, /^Estimated time(Under 1 min|About .+) · \d+ games?$/);
  assert.equal(a.store[JOB_KEY], undefined);
  // A running job for this account shows progress instead of the button.
  a.store[JOB_KEY] = {status: 'running', site: 'chesscom', account: 'tester', done: 3, total: 40, updatedAt: Date.now(), perGameMs: 5000};
  await a.run('profileWorkspace').onJobChange(a.store[JOB_KEY]);
  assert.ok(shell.querySelector('.profile-engine-progress').textContent.includes('3 of 40'));
  // Progress and live redraws change the chapter in place: Stop and the time-control switch stay the same nodes, never re-inserted.
  const w = a.run('profileWorkspace'), stop = shell.querySelector('[data-engine="stop"]'), filter = shell.querySelector('.pv-story .pv-filter');
  a.store[JOB_KEY] = {...a.store[JOB_KEY], done: 4, updatedAt: Date.now()};
  await w.onJobChange(a.store[JOB_KEY]);
  assert.ok(shell.querySelector('.profile-engine-progress').textContent.includes('4 of 40'));
  assert.equal(shell.querySelector('[data-engine="stop"]'), stop, 'a progress update keeps the Stop button');
  w.rebuild();
  assert.equal(shell.querySelector('[data-engine="stop"]'), stop, 'a live redraw keeps the Stop button');
  if (filter) assert.equal(shell.querySelector('.pv-story .pv-filter'), filter, 'and the time-control switch');
});

test('profile: learning and profile are mutually exclusive', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  await open(a);
  assert.ok(doc.querySelector('.profile-shell'));
  await a.call('openLearning'); for (let i = 0; i < 6; i++) await settle();
  assert.equal(doc.querySelector('.profile-shell'), null);
  assert.ok(a.run('learningWorkspace'));
});

test('profile setup: earlier usernames open as suggestions on click, and Both puts the boxes side by side', async t => {
  const a = review(t), doc = a.dom.window.document, win = a.dom.window;
  a.store[IDENTITY_KEY] = {chesscom: {accounts: [{name: 'tester', seenAt: Date.now(), via: 'test'}, {name: 'other-me', seenAt: Date.now() - 1e3, via: 'test'}]}};
  await open(a);
  const shell = doc.querySelector('.profile-shell'), input = shell.querySelector('.profile-setup input[type="text"]');
  const list = shell.querySelector('.profile-suggest');
  assert.ok(list.hidden, 'no list until the box is clicked');
  assert.equal(shell.querySelector('.profile-chip'), null, 'no chips under the box');
  input.focus(); input.click();
  assert.ok(!list.hidden);
  assert.deepEqual([...list.querySelectorAll('[role="option"]')].map(o => o.textContent), ['tester', 'other-me']);
  list.querySelectorAll('[role="option"]')[1].click();
  assert.equal(input.value, 'other-me');
  assert.ok(list.hidden, 'choosing closes the list');
  input.value = 'tes'; input.dispatchEvent(new win.Event('input'));
  assert.deepEqual([...list.querySelectorAll('[role="option"]')].map(o => o.textContent), ['tester'], 'typing narrows the list');
  input.dispatchEvent(new win.KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
  input.dispatchEvent(new win.KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
  assert.equal(input.value, 'tester');
  assert.equal(shell.querySelector('.pv-story'), null, 'Enter on a suggestion picks it instead of building');
  const fields = shell.querySelector('.profile-account-fields');
  [...shell.querySelectorAll('.profile-setup [role="radio"]')].find(b => b.textContent === 'Lichess').click();
  assert.deepEqual([...fields.children].map(f => f.dataset.site), ['lichess']);
  [...shell.querySelectorAll('.profile-setup [role="radio"]')].find(b => b.textContent === 'Both').click();
  assert.ok(fields.hasAttribute('data-both'));
  assert.deepEqual([...fields.children].map(f => f.dataset.site), ['chesscom', 'lichess'], 'Chess.com and Lichess sit in one row');
  assert.equal(fields.querySelector('[data-site="chesscom"] input').value, 'tester', 'each box keeps its username');
});

test('profile setup: both sites merge their games and a missing username is refused', async t => {
  const a = review(t), doc = a.dom.window.document, rows = season();
  a.store[rowsKey('chesscom', 'tester')] = {rows: rows.slice(0, 120).map(r => ({...r, site: 'chesscom'})), months: [], since: 0, updatedAt: Date.now()};
  a.store[rowsKey('lichess', 'tester-li')] = {rows: rows.slice(120).map(r => ({...r, id: 'li' + r.id, site: 'lichess', url: 'https://lichess.org/' + r.id})), months: [], since: 0, updatedAt: Date.now()};
  await open(a);
  const shell = doc.querySelector('.profile-shell');
  [...shell.querySelectorAll('.profile-setup [role="radio"]')].find(b => b.textContent === 'Both').click();
  const inputs = shell.querySelectorAll('.profile-setup input[type="text"]');
  assert.equal(inputs.length, 2, 'one username per site');
  inputs[0].value = 'tester'; inputs[0].dispatchEvent(new a.dom.window.Event('input'));
  inputs[1].value = ''; inputs[1].dispatchEvent(new a.dom.window.Event('input'));
  shell.querySelector('.profile-build').click(); await settle();
  assert.ok(!shell.querySelector('.profile-setup-error').hidden, 'a missing Lichess username is refused');
  assert.equal(shell.querySelector('.pv-story'), null);
  inputs[1].value = 'tester-li'; inputs[1].dispatchEvent(new a.dom.window.Event('input'));
  await build(a);
  const w = a.run('profileWorkspace');
  assert.equal(w.rows.length, rows.length, 'games from both sites are combined');
  assert.ok(shell.querySelector('.pv-intro-period').textContent.includes('Chess.com and Lichess'));
  assert.equal(a.state.settings.profileSite, 'both');
  assert.deepEqual(a.state.settings.profileAccounts, {chesscom: 'tester', lichess: 'tester-li'});
});

test('profile setup: custom dates validate, filter the report and survive reopening', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a); await open(a);
  const w = a.run('profileWorkspace'), shell = doc.querySelector('.profile-shell');
  const choose = text => [...shell.querySelectorAll('[role="radio"]')].find(b => b.textContent === text).click();
  choose('Custom period');
  const panel = shell.querySelector('.profile-custom-period'), inputs = panel.querySelectorAll('input');
  assert.equal(panel.hidden, false);
  assert.equal(shell.querySelector('[aria-controls="profile-custom-period"]').getAttribute('aria-expanded'), 'true');
  const date = (i, value) => { inputs[i].value = value; inputs[i].dispatchEvent(new a.dom.window.Event('input')); };
  date(0, '2026-03-01'); date(1, '2026-02-28');
  shell.querySelector('.profile-build').click(); await settle();
  assert.match(shell.querySelector('[role="alert"]').textContent, /end date must be on or after/);
  assert.equal(w.phase, 'setup');
  date(1, ''); shell.querySelector('.profile-build').click();
  assert.match(shell.querySelector('[role="alert"]').textContent, /Choose a start and end date/);
  date(1, '2026-03-31');
  choose('This year'); assert.equal(panel.hidden, true);
  choose('Custom period'); assert.equal(inputs[0].value, '2026-03-01');
  await build(a);
  const expected = season().filter(r => r.t >= Date.UTC(2026, 2, 1) / 1000 && r.t < Date.UTC(2026, 3, 1) / 1000);
  assert.equal(w.report.period, 'custom');
  assert.equal(w.report.totals.games, expected.length);
  assert.deepEqual(a.state.settings.profileCustomPeriod, {start: '2026-03-01', end: '2026-03-31'});
  assert.ok(shell.querySelector('.pv-intro-period').textContent.includes(w.report.periodLabel));
  await w.close(); await open(a);
  const back = a.run('profileWorkspace');
  assert.equal(back.phase, 'setup');
  assert.equal(doc.querySelector('.profile-custom-period').hidden, false);
  assert.deepEqual([...doc.querySelectorAll('input[type="date"]')].map(i => i.value), ['2026-03-01', '2026-03-31']);
  await build(a);
  assert.equal(back.report.totals.games, expected.length);
});

test('profile setup: changing a custom range invalidates pending reads', async t => {
  const a = review(t); seed(a); await open(a);
  const w = a.run('profileWorkspace'), pending = deferred();
  w.period = 'custom'; w.customPeriod = {start: '2026-01-01', end: '2026-02-01'};
  w.store.loadRows = () => pending.promise;
  const loading = w.load();
  w.customPeriod = {start: '2026-03-01', end: '2026-03-31'};
  pending.resolve({rows: season(), updatedAt: Date.now(), since: 0});
  await loading;
  assert.equal(w.report, null);
  assert.deepEqual(w.rows, []);
});

test('profile: share payload round-trips, sanitises links and opens from a shared job', async t => {
  const rows = season();
  const report = buildReport(rows, buildInsights(rows), {account: 'tester', site: 'chesscom', period: 'year', periodLabel: 'Past 12 months'});
  const encoded = await encodeProfile(report);
  assert.ok(encoded.length < 12000, 'payload stays small: ' + encoded.length);
  assert.ok(profileLink(encoded).startsWith('https://t-julsgaard.github.io/Chess-Review/profile/#p='));
  const decoded = await decodeProfile(encoded);
  assert.equal(decoded.account, 'tester');
  assert.deepEqual(buildDeck(decoded, {account: 'tester', engineStatus: 'unavailable'}).map(s => s.id), buildDeck(trimReport(report), {account: 'tester', engineStatus: 'unavailable'}).map(s => s.id));
  const hostile = structuredClone(trimReport(report));
  hostile.opponents.rival.decisive.url = 'javascript:alert(1)';
  hostile.account = 'x'.repeat(500);
  const cleaned = await decodeProfile(await encodeProfile(hostile));
  assert.equal(cleaned.opponents.rival.decisive.url, '');
  assert.equal(cleaned.account.length, 40);
  await assert.rejects(decodeProfile('zabc'));
  await assert.rejects(decodeProfile('r' + Buffer.from('{"v":99}').toString('base64url')));

  const a = app(t, {url: 'https://extension.test/analysis.html#shared-job'});
  a.store['job:shared-job'] = {source: 'profile', profile: decoded};
  a.replace('resetSettingsForRelease', async () => {}); a.replace('loadBook', async () => {}); a.replace('loadCalibration', async () => {}); a.replace('startAnalysis', () => {});
  await a.start(); for (let i = 0; i < 12; i++) await settle();
  const doc = a.dom.window.document;
  assert.ok(a.state.blank, 'a shared profile opens the blank workspace');
  const shell = doc.querySelector('.profile-shell');
  assert.ok(shell, 'the shared deck is shown');
  assert.equal(shell.querySelector('.profile-head-title').textContent, 'tester');
  assert.equal(shell.querySelector('.pv-compare').textContent, 'Compare');
  assert.equal(shell.querySelector('.pv-settings').getAttribute('aria-label'), 'Settings');
  assert.doesNotMatch(shell.querySelector('.profile-head').textContent, /Build your own/);
  assert.equal(shell.querySelector('.profile-title, .pv-story-figure').textContent, 'tester');
  assert.equal(shell.querySelector('.profile-engine'), null, 'no engine controls for a shared profile');
  assert.equal(a.store['job:shared-job'], undefined, 'the one-shot job is removed');
  a.run('profileWorkspace').close(); for (let i = 0; i < 4; i++) await settle();
});

test('profile settings: category renders the period, budget, bot toggle and delete action', t => {
  const a = review(t), doc = a.dom.window.document;
  a.call('toggleSettings'); a.call('selectSettingsCategory', 'profile');
  const text = doc.querySelector('#settings').textContent;
  for (const label of ['Default period', 'Accuracy check', 'Games to check', 'Count games against bots', 'Delete all profile data']) assert.ok(text.includes(label), label);
  assert.equal(a.state.settings.profileDepth, 'off'); assert.equal(a.state.settings.profileSample, 'all');
  assert.equal(a.state.settings.profilePeriod, 'year'); assert.equal(a.state.settings.profileBudget, 'standard'); assert.equal(a.state.settings.profileIncludeBots, false);
});

test('profile owns a clean board and shortcuts without changing the reviewed game', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a); a.call('go', 3);
  const original = doc.querySelector('.board'), idx = a.state.idx;
  await open(a);
  assert.equal(doc.querySelector('.board'), original, 'opening alone leaves the review board in place');
  await build(a);
  const board = doc.querySelector('.board'), pieces = [...board.querySelectorAll('.profile-piece')];
  assert.notEqual(board, original);
  assert.equal(pieces.length, 0);
  const map = board.querySelector('.profile-game-map'); assert.ok(map);
  assert.equal(board.querySelectorAll('.piece-img:not(.profile-piece),.sq-badge,.best-arrow,.mate-badge-layer').length, 0);
  assert.ok([...board.querySelectorAll('.sq')].every(sq => sq.querySelectorAll('.piece-img').length <= 1));
  a.call('paintBoard'); a.call('buildBoard'); a.call('renderBestArrow'); a.call('toggleFlip'); a.call('toggleAuto');
  assert.equal(doc.querySelector('.board'), board);
  assert.equal(board.querySelector('.profile-game-map'), map);
  assert.equal(a.state.autoTimer, null);
  for (const key of ['ArrowRight', 'End', 'Home']) {
    doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key, bubbles: true}));
    assert.equal(a.state.idx, idx, 'profile shortcuts leave the review position intact');
  }
  assert.equal(doc.querySelector('.pv-story').dataset.slide, 'cover');
  a.run('profileWorkspace').close();
  assert.equal(a.state.idx, idx);
  assert.equal(doc.querySelectorAll('.board .profile-piece').length, 0);
  assert.equal(doc.querySelectorAll('.board .piece-img').length, 32);
});

test('choosing another player aborts pending storage reads and clears the previous report', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a); await openDeck(a);
  const w = a.run('profileWorkspace'), pending = deferred(), loadRows = w.store.loadRows;
  w.store.loadRows = () => pending.promise;
  w.account = 'other'; const loading = w.load();
  assert.equal(w.report, null); assert.equal(w.rows.length, 0);
  assert.equal(doc.querySelector('.profile-nav').children.length, 0);
  w.renderChooser();
  pending.resolve({rows: season(), updatedAt: Date.now(), since: 0});
  await loading;
  assert.ok(doc.querySelector('.profile-setup'));
  assert.equal(w.report, null);
  w.store.loadRows = loadRows;
});

test('an old engine read cannot replace a new account or repaint after closing', async t => {
  const a = review(t); seed(a); await openDeck(a);
  const w = a.run('profileWorkspace'), pending = deferred();
  w.store.loadEngine = () => pending.promise;
  const load = w.loadEngine();
  w.account = 'other'; w.engine = {current: {acc: 90}};
  pending.resolve({old: {v: 1, acc: 20}}); await load;
  assert.deepEqual(w.engine, {current: {acc: 90}});
  await w.close();
  await w.onJobChange({site: w.site, account: w.account, status: 'done'});
  assert.equal(a.dom.window.document.querySelector('.profile-shell'), null);
});

test('engine progress preserves the current slide and does not restart its board playback', async t => {
  const a = review(t); seed(a); await openDeck(a);
  const w = a.run('profileWorkspace');
  w.go(w.deck.findIndex(s => s.board?.kind === 'moves'));
  const piece = w.boardEl.querySelector('.profile-piece'), id = w.deck[w.index].id;
  await w.onJobChange({site: w.site, account: w.account, status: 'running', done: 10, total: 40, updatedAt: Date.now()});
  assert.equal(w.deck[w.index].id, id);
  assert.equal(w.boardEl.querySelector('.profile-piece'), piece);
});

test('closing with motion releases the board before opening another workspace', async t => {
  const a = review(t), {document: doc} = a.dom.window;
  seed(a); await openDeck(a);
  const old = a.run('profileWorkspace'), fade = deferred();
  a.state.settings.uiAnim = true;
  a.dom.window.Element.prototype.animate = () => ({finished: Promise.resolve(), cancel() {}});
  old.shell.animate = () => ({finished: fade.promise, cancel() {}});
  const closing = old.close();
  assert.equal(a.run('profileWorkspace'), null);
  assert.ok(old.shell.isConnected, 'the old shell is still fading');
  const board = doc.querySelector('.board');
  await open(a);
  const next = a.run('profileWorkspace');
  fade.resolve();
  await closing;
  assert.equal(next.phase, 'setup');
  assert.equal(a.run('profileWorkspace'), next);
  assert.equal(doc.querySelector('.profile-shell'), next.shell);
  assert.equal(doc.querySelector('.board'), board);
  a.state.settings.uiAnim = false;
});

test('setup choices preserve the form and typed names; bot games are chosen in the gear, not here', async t => {
  const a = review(t); await open(a);
  const doc = a.dom.window.document, form = doc.querySelector('.profile-setup'), title = form.querySelector('h2');
  const input = form.querySelector('input[type="text"]');
  assert.equal(form.querySelector('input[type="checkbox"]'), null, 'no bot switch on the start screen');
  input.value = 'new-player'; input.dispatchEvent(new a.dom.window.Event('input'));
  [...form.querySelectorAll('[role="radio"]')].find(button => button.textContent === 'Both').click();
  [...form.querySelectorAll('[role="radio"]')].find(button => button.textContent === 'All time').click();
  assert.equal(doc.querySelector('.profile-setup'), form);
  assert.equal(form.querySelector('h2'), title, 'choosing a setting cannot replay the form entry fade');
  assert.equal(form.querySelector('input[type="text"]').value, 'new-player');
  assert.ok(!form.textContent.includes('Games come from'));
});

test('rating mode changes the headline, chart, evidence and board together; chart points can be inspected', async t => {
  const a = review(t); seed(a); await openDeck(a);
  const w = a.run('profileWorkspace'), doc = a.dom.window.document;
  w.go(w.deck.findIndex(slide => slide.id === 'rating'));
  [...doc.querySelectorAll('.pv-modes button')].find(button => button.textContent === 'Bullet').click();
  assert.equal(w.deck[w.index].ratingClass, 'bullet');
  assert.match(doc.querySelector('.pv-story-label').textContent, /Bullet rating/);
  assert.equal(doc.querySelector('.pv-link').dataset.gameUrl, w.report.ratings.bullet.peak.url);
  const chart = doc.querySelector('.board .pv-line');
  chart.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Home', bubbles: true, cancelable: true}));
  assert.match(chart.getAttribute('aria-label'), new RegExp(String(w.report.ratings.bullet.series[0].r)));
  const slide = w.index;
  chart.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
  assert.equal(w.index, slide, 'chart inspection cannot turn a page or replay a game');
  assert.equal(doc.querySelector('[aria-label="Refresh games"]'), null);
});

test('arrow keys navigate illustrated games while PageDown advances the profile', async t => {
  const a = review(t); seed(a); await openDeck(a);
  const w = a.run('profileWorkspace'), doc = a.dom.window.document;
  w.go(w.deck.findIndex(slide => slide.id === 'openings'));
  const index = w.index, original = a.state.idx;
  doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, cancelable: true}));
  assert.equal(w.index, index); assert.ok(doc.querySelector('.profile-game-status').textContent);
  doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
  assert.equal(w.index, index); assert.equal(a.state.idx, original);
  doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'PageDown', bubbles: true, cancelable: true}));
  assert.equal(w.index, index + 1);
});

test('profile game navigation identifies Lichess by its HTTPS hostname', async () => {
  const cases = [
    ['https://lichess.org/abcdefgh', 'lichess'],
    ['https://www.lichess.org/abcdefgh', 'lichess'],
    ['https://LICHESS.ORG/abcdefgh', 'lichess'],
    ['https://www.chess.com/game/live/123?ref=lichess.org', 'chesscom'],
    ['https://lichess.org.evil.example/abcdefgh', 'chesscom'],
    ['https://evil.example/lichess.org/abcdefgh', 'chesscom'],
    ['https://lichess.org@evil.example/abcdefgh', 'chesscom'],
    ['http://lichess.org/abcdefgh', 'chesscom'],
    ['not a URL', 'chesscom'],
    [undefined, 'chesscom'],
  ];
  for (const [url, expected] of cases) {
    const calls = [], evidence = {id: 'abcdefgh', url};
    const workspace = {
      board: {step: () => false, moves: () => {}}, boardView: {}, gameCounter: {},
      deck: [{evidence}], index: 0, rows: [], shared: true, account: 'chess-player / li-player',
      o: {loadPgn: async (...args) => { calls.push(args); return '1. e4 e5 *'; }},
    };
    await ProfileWorkspace.prototype.stepGame.call(workspace, -1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], expected, String(url));
    assert.equal(calls[0][3], expected === 'lichess' ? 'li-player' : 'chess-player', String(url));
  }
});

test('a rating game loads for arrow navigation and ignores a stale load', async t => {
  const a = review(t); seed(a); await openDeck(a);
  const w = a.run('profileWorkspace'), doc = a.dom.window.document;
  const rating = w.deck.findIndex(slide => slide.id === 'rating');
  w.o.loadPgn = async () => '1. e4 e5 2. Nf3 Nc6 *'; w.go(rating);
  doc.querySelector('.pv-link').click();
  await w.stepGame(-1);
  assert.ok(doc.querySelector('.profile-game-status').textContent.includes('Nf3'));
  await w.stepGame(-1); assert.ok(doc.querySelector('.profile-game-status').textContent.includes('e5'));
  w.go(0); w.go(rating);
  const pending = deferred(); w.o.loadPgn = () => pending.promise;
  doc.querySelector('.pv-link').click();
  const load = w.stepGame(-1); w.go(1);
  pending.resolve('1. e4 e5 *'); await load;
  assert.equal(doc.querySelectorAll('.profile-piece').length, 0, 'late game moves cannot replace the results board');
});

test('profile: the accuracy check starts from the accuracy chapter, with the chosen depth and games, and reviewed library games count', async t => {
  const a = review(t), doc = a.dom.window.document;
  seed(a);
  const rows = season();
  a.store.library = [{id: 'lib1', myName: 'Tester', myAcc: 88.5, date: new Date(rows.at(-2).t * 1000).toISOString().slice(0, 10).replace(/-/g, '.'), meta: {gameId: rows.at(-2).id}},
    {id: 'lib2', myName: 'someone-else', myAcc: 50, date: '2026.03.01', meta: {}}];
  Object.assign(a.state.settings, {profileDepth: 'fast', profileSample: '5'});
  await open(a);
  assert.equal(doc.querySelector('.profile-setup').textContent.includes('Accuracy check'), false, 'the setup no longer asks about accuracy');
  const sent = [], w = a.run('profileWorkspace');
  w.o.sendMessage = async message => {
    sent.push(message);
    if (message.action === 'start') {
      assert.equal(w.phase, 'deck', 'the deck is already open');
      for (const row of message.job.rows) await w.store.saveEngine(message.job.site, row.id, {v: 1, acc: 80, t: row.t});
      await w.store.saveJob({...message.job, status: 'done', done: message.job.rows.length, total: message.job.rows.length, failed: 0, startedAt: Date.now(), finishedAt: Date.now()});
    }
    return {ok: true};
  };
  await build(a);
  assert.equal(w.phase, 'deck');
  assert.equal(sent.filter(m => m.action === 'start').length, 0, 'building the profile runs no engine');
  assert.equal(w.report.engine.libraryGames, 1, 'only the same player\'s reviewed games count');
  w.go(w.deck.findIndex(slide => slide.id === 'trend'));
  const engine = () => doc.querySelector('.profile-engine');
  // The remembered depth and games are preselected; changing them updates the estimate.
  assert.equal(engine().querySelector('[data-engine="depth:fast"]').getAttribute('aria-checked'), 'true');
  const before = engine().querySelector('.profile-engine-estimate').textContent;
  engine().querySelector('[data-engine="depth:deep"]').click();
  engine().querySelector('[data-engine="sample:all"]').click();
  assert.notEqual(engine().querySelector('.profile-engine-estimate').textContent, before);
  assert.match(engine().querySelector('.profile-engine-estimate').textContent, /^Estimated time(Under 1 min|About \d+ (min|h)( \d+ min)?) · \d+ games$/);
  engine().querySelector('[data-engine="start"]').click();
  for (let i = 0; i < 6; i++) await settle();
  const start = sent.find(m => m.type === 'profileEngine' && m.action === 'start');
  assert.ok(start, 'the button starts the check');
  assert.equal(start.job.depth, 12);
  assert.equal(start.job.deadlineMs, null, 'every game has no time budget');
  assert.ok(!start.job.rows.some(r => r.id === rows.at(-2).id), 'the reviewed library game is not checked again');
  assert.equal(a.state.settings.profileDepth, 'deep', 'the choice is remembered');
  let savedJob = null;
  for (let i = 0; i < 1000 && savedJob?.status !== 'done'; i++) { await settle(); savedJob = await w.store.loadJob(); }
  await w.onJobChange(savedJob);
  assert.ok(w.report.engine.games > 1);
  assert.equal(engine().querySelector('[data-engine="start"]').textContent, 'Check more games');
  assert.ok(engine().querySelector('[data-engine="start"]').disabled, 'every chosen game is already checked');
  // Games checked at a shallower depth can be checked again deeper, never shallower.
  for (const id of Object.keys(w.engine)) w.engine[id] = {...w.engine[id], depth: 6};
  engine().querySelector('[data-engine="depth:balanced"]').click();
  assert.equal(engine().querySelector('[data-engine="start"]').disabled, false, 'a deeper check is offered');
  assert.equal(engine().querySelector('[data-engine="start"]').textContent, 'Check again, deeper');
  engine().querySelector('[data-engine="depth:fast"]').click();
  assert.ok(engine().querySelector('[data-engine="start"]').disabled, 'the same depth has nothing new to check');
  assert.match(engine().querySelector('.profile-engine-estimate').textContent, /at this depth or deeper/);
});

test('mate in one: the chapter opens on the newest puzzle not solved yet, and Next skips solved ones', async () => {
  const {ProfileWorkspace} = await import('../lib/profile/workspace.js');
  const solved = new Set(['chesscom:a', 'chesscom:c']);
  const w = {site: 'chesscom', solvedMates: solved, solvedKey: ProfileWorkspace.prototype.solvedKey, isSolved: ProfileWorkspace.prototype.isSolved};
  const list = ['a', 'b', 'c', 'd'].map(id => ({id, site: 'chesscom'}));
  const from = start => ProfileWorkspace.prototype.unsolvedFrom.call(w, list, start);
  assert.equal(from(0), 1); assert.equal(from(2), 3); assert.equal(from(4), 1, 'wraps round');
  solved.add('chesscom:b'); solved.add('chesscom:d');
  assert.equal(from(2), 2, 'with every one solved, Next simply moves on');
});

test('mate in one opens at the puzzle, replays the recorded game, and lets the player solve it', async t => {
  const a = review(t), {document: doc, PointerEvent} = a.dom.window;
  Object.assign(a.state.settings, {profileDesign: 'story', uiAnim: false});
  const scholar = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qf3'];
  const newer = gameFeatures({site: 'chesscom', id: '901', url: 'https://www.chess.com/game/live/901', endTime: 3, moves: scholar,
    white: {name: 'tester', rating: 1500}, black: {name: 'Defender', rating: 1600}}, 'tester');
  const older = gameFeatures({site: 'lichess', id: 'PVmate01', url: 'https://lichess.org/PVmate01', endTime: 1, moves: ['f3', 'e5', 'g4', 'Nc6'],
    white: {name: 'Challenger', rating: 1700}, black: {name: 'tester-li', rating: 1800}}, 'tester-li');
  const saved = {...newer, id: '902', url: 'https://www.chess.com/game/live/902', t: 2};
  delete older.m1Setup;
  const rows = [...season(), newer, saved, older];
  const account = 'tester / tester-li', site = 'both';
  const report = buildReport(rows, buildInsights(rows), {account, site});
  await a.call('openProfile', {shared: report});
  const w = a.run('profileWorkspace');
  const loaded = [];
  w.o.loadPgn = async (site, row) => {
    loaded.push(row.id);
    return site === 'lichess' ? '1. f3 e5 2. g4 Nc6 *' : '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qf3 Be7 *';
  };
  w.o.createAnalysisEngine = null;
  w.solvedMates = new Set(['chesscom:902']);
  w.go(w.deck.findIndex(slide => slide.id === 'mate1'));

  const button = label => [...doc.querySelectorAll('.profile-puzzle-button')].find(node => node.textContent === label);
  const moveButton = label => doc.querySelector(`.profile-puzzle [aria-label="${label}"]`);
  const key = key => doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}));
  const link = () => doc.querySelector('.pv-story .profile-open-puzzle-game');
  const evalBar = () => doc.querySelector('.profile-game-eval');
  const square = name => [...w.boardEl.querySelectorAll('.sq')].find(node => w.board.nameOf(node) === name);
  const clickSquare = name => {
    for (const type of ['pointerdown', 'pointerup']) square(name).dispatchEvent(new PointerEvent(type, {bubbles: true, pointerId: 1}));
  };
  assert.equal(link().textContent, 'View this game');
  assert.ok(link().classList.contains('pv-link'), 'styled like the game links on other chapters');
  assert.equal(link().href, newer.url);
  assert.equal(link().target, '_blank');
  assert.match(doc.querySelector('.profile-game-player-top').textContent, /Defender.*1600/);
  assert.match(doc.querySelector('.profile-game-player-bottom').textContent, /tester.*1500/);
  assert.match(evalBar().getAttribute('aria-label'), /White.*mate.*1/i);
  assert.ok(square('f6').classList.contains('profile-hl'));
  assert.ok(button('Previous').disabled);
  assert.deepEqual(loaded, [], 'the saved setup opens without fetching the game');

  const chapter = w.index;
  key('ArrowRight');
  await settle();
  assert.equal(w.index, chapter);
  assert.ok(square('f3').classList.contains('profile-hl'), 'the first forward step plays the actual missed move');
  assert.ok(button('Hint').disabled);
  clickSquare('f3'); clickSquare('f7');
  assert.equal(square('f7').querySelector('[data-result="correct"]'), null, 'review positions are read-only');
  moveButton('Next move').click();
  assert.ok(square('e7').classList.contains('profile-hl'), 'can also play moves after the miss');
  assert.ok(moveButton('Next move').disabled);
  key('ArrowRight');
  assert.equal(w.index, chapter);
  key('ArrowLeft'); key('ArrowLeft');
  assert.ok(square('h5').querySelector('.profile-piece'));
  assert.match(evalBar().getAttribute('aria-label'), /White.*mate.*1/i);
  assert.equal(button('Hint').disabled, false, 'returning to the puzzle makes it playable');
  moveButton('Previous move').click();
  assert.ok(square('g8').querySelector('.profile-piece'), 'move controls can also rewind before the puzzle');
  for (let i = 0; i < 5; i++) key('ArrowLeft');
  assert.ok(moveButton('Previous move').disabled);
  key('ArrowLeft');
  assert.equal(w.index, chapter);
  for (let i = 0; i < 6; i++) key('ArrowRight');
  assert.ok(square('f6').classList.contains('profile-hl'));
  assert.deepEqual(loaded, ['901'], 'stepping reuses the game already loaded');

  clickSquare('h5'); clickSquare('f3');
  assert.ok(square('h5').querySelector('[data-result="incorrect"]'));
  assert.equal(doc.querySelector('.profile-puzzle').textContent.includes('Not mate. Try again.'), false);
  await new Promise(resolve => setTimeout(resolve, 750));
  assert.ok(square('h5').querySelector('.profile-piece'));
  clickSquare('h5'); clickSquare('f7');
  assert.ok(square('f7').querySelector('[data-result="correct"]'));
  assert.ok(w.boardEl.querySelector('[data-mated-square="e8"] .mate-badge'));
  assert.equal(evalBar().getAttribute('aria-label'), 'Checkmate');

  button('Next').click();
  assert.equal(link().href, older.url, 'Next skips the solved game in between');
  for (let i = 0; i < 4; i++) await settle();
  assert.ok(square('g4').classList.contains('profile-hl'), 'older cached positions recover the previous move from the PGN');
  assert.ok(evalBar().classList.contains('flipped'));
  assert.match(doc.querySelector('.profile-game-player-top').textContent, /Challenger.*1700/);
  assert.match(doc.querySelector('.profile-game-player-bottom').textContent, /tester-li.*1800/);
  key('ArrowLeft'); key('ArrowRight');
  assert.ok(square('g4').classList.contains('profile-hl'));
  assert.deepEqual(loaded, ['901', 'PVmate01'], 'the legacy intro and its replay share one load');
  button('Previous').click();
  assert.equal(link().href, newer.url);
  assert.equal(w.boardEl.querySelector('.puzzle-result-badge, .mate-badge'), null);
  clickSquare('h5'); clickSquare('f7');
  assert.ok(square('f7').querySelector('[data-result="correct"]'), 'Previous lets the user solve the same puzzle again');
});
