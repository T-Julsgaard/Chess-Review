import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle, deferred} from './helpers/app.mjs';
import {season} from './helpers/profile-season.mjs';
import {rowsKey, JOB_KEY} from '../lib/profile/store.js';
import {IDENTITY_KEY} from '../lib/identity.js';
import {encodeProfile, decodeProfile, trimReport, profileLink} from '../lib/profile/share.js';
import {buildInsights} from '../lib/profile/insights.js';
import {buildReport, buildDeck} from '../lib/profile/deck.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
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
  assert.equal(shell.querySelector('.profile-slide'), null, 'nothing loads before Build profile');
  await build(a);
  assert.equal(shell.querySelector('.profile-head-title').textContent, 'tester');
  assert.equal(shell.querySelector('.profile-slide').dataset.slide, 'cover');
  assert.equal(shell.querySelector('.profile-title').textContent, 'tester');
  const dots = shell.querySelectorAll('.profile-dot');
  assert.ok(dots.length >= 12, 'most slides are available: ' + dots.length);
  assert.ok(doc.querySelectorAll('.board .profile-piece').length >= 32, 'cover shows the first moves on the board');
  shell.querySelector('.profile-nav-button:last-child').click();
  assert.equal(shell.querySelector('.profile-slide').dataset.slide, 'numbers');
  assert.ok(shell.querySelectorAll('.profile-stat').length >= 5);
  assert.ok(doc.querySelectorAll('.board .sq.profile-fill').length === 64, 'the fill shows every game on the board');
  assert.ok(doc.querySelector('.profile-board-caption').textContent.includes('Green squares'));
  shell.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
  assert.equal(shell.querySelector('.profile-slide').dataset.slide, 'rating');
  assert.ok(shell.querySelector('.profile-series'));
  shell.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'End', bubbles: true}));
  assert.equal(shell.querySelector('.profile-slide').dataset.slide, 'share');
  assert.ok(shell.querySelector('.profile-share button.primary').textContent.includes('Copy share link'));
  shell.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
  assert.equal(shell.querySelector('.profile-slide').dataset.slide, 'cover');
  dots[5].click();
  const slide = shell.querySelector('.profile-slide');
  assert.ok(['signature', 'twin'].includes(slide.dataset.slide));
  if (slide.dataset.slide === 'signature') assert.ok(doc.querySelectorAll('.board .sq.profile-heat').length > 0);
  const evidence = [...shell.querySelectorAll('.profile-evidence')];
  for (const link of evidence) assert.ok(link.href.startsWith('https://www.chess.com/'));
  // Engine block offers the budgeted check on the trend slide and nothing runs by itself.
  dots[dots.length - 3].click();
  const trend = [...dots].findIndex(d => d.title === 'Then and now');
  dots[trend].click();
  assert.ok(shell.querySelector('.profile-engine .profile-button.primary').textContent.includes('Run engine check'));
  assert.equal(a.store[JOB_KEY], undefined);
  // A running job for this account shows progress instead of the button.
  a.store[JOB_KEY] = {status: 'running', site: 'chesscom', account: 'tester', done: 3, total: 40, updatedAt: Date.now(), perGameMs: 5000};
  await a.run('profileWorkspace').onJobChange(a.store[JOB_KEY]);
  assert.ok(shell.querySelector('.profile-engine-progress').textContent.includes('3 of 40'));
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
  assert.equal(shell.querySelector('.profile-slide'), null);
  inputs[1].value = 'tester-li'; inputs[1].dispatchEvent(new a.dom.window.Event('input'));
  await build(a);
  const w = a.run('profileWorkspace');
  assert.equal(w.rows.length, rows.length, 'games from both sites are combined');
  assert.ok(shell.querySelector('.profile-lead').textContent.includes('Chess.com and Lichess'));
  assert.equal(a.state.settings.profileSite, 'both');
  assert.deepEqual(a.state.settings.profileAccounts, {chesscom: 'tester', lichess: 'tester-li'});
});

test('profile: share payload round-trips, sanitises links and opens read-only from a shared job', async t => {
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
  assert.ok(shell.querySelector('.profile-head').textContent.includes('Shared player profile'));
  assert.equal(shell.querySelector('.profile-title').textContent, 'tester');
  assert.equal(shell.querySelector('.profile-engine'), null, 'no engine controls for a shared profile');
  assert.equal(a.store['job:shared-job'], undefined, 'the one-shot job is removed');
  a.run('profileWorkspace').close(); for (let i = 0; i < 4; i++) await settle();
});

test('profile settings: category renders the period, budget, bot toggle and delete action', t => {
  const a = review(t), doc = a.dom.window.document;
  a.call('toggleSettings'); a.call('selectSettingsCategory', 'profile');
  const text = doc.querySelector('#settings').textContent;
  for (const label of ['Default period', 'Engine check', 'Count games against bots', 'Delete all profile data']) assert.ok(text.includes(label), label);
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
  assert.equal(pieces.length, 32);
  assert.equal(board.querySelectorAll('.piece-img:not(.profile-piece),.sq-badge,.best-arrow,.mate-badge-layer').length, 0);
  assert.ok([...board.querySelectorAll('.sq')].every(sq => sq.querySelectorAll('.piece-img').length <= 1));
  a.call('paintBoard'); a.call('buildBoard'); a.call('renderBestArrow'); a.call('toggleFlip'); a.call('toggleAuto');
  assert.equal(doc.querySelector('.board'), board);
  assert.equal(board.querySelector('.profile-piece'), pieces[0]);
  assert.equal(a.state.autoTimer, null);
  for (const key of ['ArrowRight', 'End', 'Home']) {
    doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key, bubbles: true}));
    assert.equal(a.state.idx, idx, 'profile shortcuts leave the review position intact');
  }
  assert.equal(doc.querySelector('.profile-slide').dataset.slide, 'cover');
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
  const a = review(t); seed(a); await openDeck(a);
  const old = a.run('profileWorkspace'); a.state.settings.uiAnim = true;
  const closing = old.close();
  assert.equal(a.run('profileWorkspace'), null);
  await openDeck(a);
  const next = a.run('profileWorkspace'), board = next.boardEl;
  assert.ok(board);
  await closing;
  assert.equal(a.run('profileWorkspace'), next);
  assert.equal(a.dom.window.document.querySelector('.board'), board);
  a.state.settings.uiAnim = false;
});

test('a delayed share preview cannot repaint a new slide or player', async t => {
  const a = review(t); seed(a); await openDeck(a);
  const w = a.run('profileWorkspace'), pending = deferred(); let previews = 0;
  w.cardCanvas = () => pending.promise;
  w.board.card = () => { previews++; };
  w.go(w.deck.findIndex(s => s.id === 'share'));
  w.renderChooser();
  pending.resolve({}); await settle();
  assert.equal(previews, 0);
  assert.ok(a.dom.window.document.querySelector('.profile-setup'));
});

test('setup choices preserve the form, typed names and bot selection', async t => {
  const a = review(t); await open(a);
  const doc = a.dom.window.document, form = doc.querySelector('.profile-setup'), title = form.querySelector('h2');
  const input = form.querySelector('input[type="text"]'), bots = form.querySelector('input[type="checkbox"]');
  input.value = 'new-player'; input.dispatchEvent(new a.dom.window.Event('input')); bots.checked = true;
  [...form.querySelectorAll('[role="radio"]')].find(button => button.textContent === 'Both').click();
  [...form.querySelectorAll('[role="radio"]')].find(button => button.textContent === 'All time').click();
  assert.equal(doc.querySelector('.profile-setup'), form);
  assert.equal(form.querySelector('h2'), title, 'choosing a setting cannot replay the form entry fade');
  assert.equal(form.querySelector('input[type="text"]').value, 'new-player');
  assert.equal(form.querySelector('input[type="checkbox"]'), bots); assert.equal(bots.checked, true);
  assert.ok(!form.textContent.includes('Games come from'));
});

test('rating mode changes the headline, chart, evidence and board together; chart points can be inspected', async t => {
  const a = review(t); seed(a); await openDeck(a);
  const w = a.run('profileWorkspace'), doc = a.dom.window.document;
  w.go(w.deck.findIndex(slide => slide.id === 'rating'));
  [...doc.querySelectorAll('.profile-rating-modes button')].find(button => button.textContent === 'Bullet').click();
  assert.equal(w.deck[w.index].ratingClass, 'bullet');
  assert.ok(doc.querySelector('.profile-title').textContent.startsWith('Bullet:'));
  assert.equal(doc.querySelector('.profile-series-line').dataset.class, 'bullet');
  assert.equal(doc.querySelector('.profile-evidence').href, w.report.ratings.bullet.peak.url);
  const chart = doc.querySelector('.profile-series');
  chart.getBoundingClientRect = () => ({left: 0, width: 480});
  chart.dispatchEvent(new a.dom.window.MouseEvent('pointermove', {clientX: 42}));
  assert.ok(doc.querySelector('.profile-series-detail').textContent.includes(`${w.report.ratings.bullet.series[0].r} rating`));
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
  assert.equal(w.index, index); assert.ok(doc.querySelector('.profile-caption-move').textContent);
  doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
  assert.equal(w.index, index); assert.equal(a.state.idx, original);
  doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'PageDown', bubbles: true, cancelable: true}));
  assert.equal(w.index, index + 1);
});

test('a final position loads its full game for arrow navigation and ignores a stale load', async t => {
  const a = review(t); seed(a); await openDeck(a);
  const w = a.run('profileWorkspace'), doc = a.dom.window.document;
  const rating = w.deck.findIndex(slide => slide.id === 'rating');
  w.o.loadPgn = async () => '1. e4 e5 2. Nf3 Nc6 *'; w.go(rating);
  await w.stepGame(-1);
  assert.ok(doc.querySelector('.profile-caption-move').textContent.includes('Nf3'));
  await w.stepGame(-1); assert.ok(doc.querySelector('.profile-caption-move').textContent.includes('e5'));
  w.go(0); w.go(rating);
  const pending = deferred(); w.o.loadPgn = () => pending.promise;
  const load = w.stepGame(-1); w.go(1);
  pending.resolve('1. e4 e5 *'); await load;
  assert.equal(doc.querySelectorAll('.profile-piece').length, 0, 'late game moves cannot replace the results board');
});
