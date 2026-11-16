import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';
import {season} from './helpers/profile-season.mjs';
import {rowsKey, JOB_KEY} from '../lib/profile/store.js';
import {IDENTITY_KEY} from '../lib/identity.js';
import {encodeProfile, decodeProfile, trimReport, profileLink} from '../lib/profile/share.js';
import {buildInsights} from '../lib/profile/insights.js';
import {buildReport, buildDeck} from '../lib/profile/deck.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}
async function open(a) { await a.call('openProfile'); for (let i = 0; i < 6; i++) await settle(); }
function seed(a, rows = season(), account = 'tester') {
  const seeded = rows.map(r => ({...r, opp: r.opp === 'tester' ? 'someone' : r.opp}));
  a.store[rowsKey('chesscom', account)] = {rows: seeded, months: [], since: 0, updatedAt: Date.now()};
  a.store[IDENTITY_KEY] = {chesscom: {accounts: [{name: account, seenAt: Date.now(), via: 'test'}]}};
}

test('profile: the toggle opens a chooser when nobody is known, hides the review panels and restores on close', async t => {
  const a = review(t), doc = a.dom.window.document;
  const toggle = doc.querySelector('#profileToggle');
  assert.equal(toggle.textContent, 'Player profile');
  await open(a);
  assert.equal(toggle.textContent, 'Return to Game review');
  assert.ok(doc.querySelector('#canvas').classList.contains('profile-active'));
  assert.ok(doc.querySelector('.mod[data-mod="accuracy"]').inert);
  assert.ok(!doc.querySelector('.mod[data-mod="board"]').inert);
  const shell = doc.querySelector('.profile-shell');
  assert.ok(shell && shell.querySelector('.profile-chooser input'));
  assert.ok(doc.querySelector('.board').classList.contains('profile-board'));
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
  assert.equal(shell.querySelector('.profile-select').value, 'tester');
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
