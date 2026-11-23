import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';
import {season} from './helpers/profile-season.mjs';
import {rowsKey} from '../lib/profile/store.js';
import {IDENTITY_KEY} from '../lib/identity.js';
import {filterRows, activeFilters, filterCount, opponentList, toggleExcluded, excludedFor, accountKey} from '../lib/profile/filters.js';

const row = (over = {}) => ({site: 'chesscom', opp: 'Someone', me: 'w', rated: true, n: 60, t: 1, ...over});

test('profile filters: colour, rated, short games and left-out players', () => {
  const rows = [row({id: 1}), row({id: 2, me: 'b'}), row({id: 3, rated: false}), row({id: 4, n: 19}), row({id: 5, opp: 'FriendFrank'}), row({id: 6, site: 'lichess', opp: 'friendfrank'})];
  const accounts = {chesscom: 'Tester', lichess: 'tester'};
  const ids = settings => filterRows(rows, settings, accounts).map(r => r.id);
  assert.deepEqual(ids({}), [1, 2, 3, 4, 5, 6], 'nothing chosen keeps every game');
  assert.deepEqual(ids({profileColor: 'b'}), [2]);
  assert.deepEqual(ids({profileRatedOnly: true}), [1, 2, 4, 5, 6]);
  assert.deepEqual(ids({profileSkipShort: true}), [1, 2, 3, 5, 6], 'under 10 moves is under 20 plies');
  const out = toggleExcluded({}, 'chesscom', 'Tester', 'FriendFrank', true);
  assert.deepEqual(out, {profileExcludedOpponents: {'chesscom:tester': ['friendfrank']}});
  assert.deepEqual(ids(out), [1, 2, 3, 4, 6], 'left out on one site only, any spelling');
  assert.equal(filterCount(activeFilters({...out, profileColor: 'w', profileSkipShort: true}, accounts)), 3);
  assert.equal(filterCount(activeFilters(out, {chesscom: 'someone-else'})), 0, 'each account keeps its own list');
  assert.deepEqual(toggleExcluded(out, 'chesscom', 'tester', 'friendfrank', false), {profileExcludedOpponents: {}});
  assert.deepEqual(excludedFor(out, 'chesscom', 'TESTER'), ['friendfrank']);
  assert.equal(accountKey('lichess', ' Bob '), 'lichess:bob');
});

test('profile filters: opponents are counted per site, latest spelling first', () => {
  const list = opponentList([row({opp: 'ann', t: 1}), row({opp: 'Ann', t: 5}), row({opp: 'bob', t: 2}), row({site: 'lichess', opp: 'ann', t: 3}), row({opp: ''})]);
  assert.deepEqual(list, [{site: 'chesscom', key: 'ann', name: 'Ann', games: 2}, {site: 'lichess', key: 'ann', name: 'ann', games: 1}, {site: 'chesscom', key: 'bob', name: 'bob', games: 1}]);
});

async function storyDeck(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.state.settings.profileDesign = 'story'; a.state.settings.profileDepth = 'off';
  t.after(() => a.run('profileWorkspace')?.close());
  const rows = season().map((r, i) => ({...r, opp: r.opp === 'tester' ? 'someone' : r.opp, rated: i % 5 !== 0}));
  a.store[rowsKey('chesscom', 'tester')] = {rows, months: [], since: 0, updatedAt: Date.now()};
  a.store[IDENTITY_KEY] = {chesscom: {accounts: [{name: 'tester', seenAt: Date.now(), via: 'test'}]}};
  await a.call('openProfile'); for (let i = 0; i < 6; i++) await settle();
  a.dom.window.document.querySelector('.profile-build').click(); for (let i = 0; i < 6; i++) await settle();
  return {a, doc: a.dom.window.document, w: a.run('profileWorkspace')};
}

test('profile gear: leaves a player out, says so in the menu and brings them back', async t => {
  const {a, doc, w} = await storyDeck(t);
  const gear = doc.querySelector('.pv-head-actions .pv-settings');
  assert.ok(gear, 'the gear sits with Compare and Share');
  assert.deepEqual([...doc.querySelector('.pv-head-actions').children].map(n => n.className.split(' ')[0]), ['pv-compare', 'pv-share', 'pv-settings'], 'the gear is right of Share');
  assert.equal(doc.querySelector('.pv-head-note'), null, 'nothing under the name');
  const total = w.periodRows().length;
  w.go(w.deck.findIndex(slide => slide.id === 'rival'));
  assert.equal(w.currentSlide().rival?.name, 'rival_rick');
  gear.click();
  const menu = doc.querySelector('.pv-settings-menu');
  assert.ok(menu && gear.getAttribute('aria-expanded') === 'true');
  assert.equal(menu.querySelector('.pv-set-note'), null, 'no games left out yet');
  const rick = [...menu.querySelectorAll('.pv-set-opp')].find(b => b.querySelector('strong').textContent === 'rival_rick');
  assert.ok(rick, 'the most-played opponents are listed');
  const games = total - w.periodRows().filter(r => r.opp !== 'rival_rick').length;
  rick.focus(); rick.click();
  assert.equal(w.periodRows().length, total - games);
  assert.equal(w.deck[w.index].id, 'rival', 'the same chapter stays on screen');
  assert.notEqual(w.currentSlide().rival?.name, 'rival_rick', 'the rival is the next most-played opponent');
  assert.deepEqual(a.state.settings.profileExcludedOpponents, {'chesscom:tester': ['rival_rick']});
  assert.ok(gear.classList.contains('active'));
  const note = doc.querySelector('.pv-settings-menu .pv-set-note');
  assert.equal(note.textContent, `${games} games left out`);
  assert.equal(note.previousElementSibling.textContent, 'Games to count', 'the note sits on the heading line, after it');
  assert.ok(note.parentElement.classList.contains('pv-set-top') && note.parentElement.nextElementSibling.classList.contains('pv-set-row'), 'and that line is above Colour');
  assert.ok(doc.querySelector('.pv-settings-menu'), 'the menu stays open after a choice');
  assert.ok(doc.activeElement.classList.contains('pv-set-opp'), 'the next player in the list takes the focus, not the search');
  const chip = doc.querySelector('.pv-set-chip');
  assert.equal(chip.textContent.replace('×', ''), 'rival_rick');
  // The search finds opponents beyond the first few.
  const search = doc.querySelector('.pv-set-search');
  search.value = 'nina'; search.dispatchEvent(new a.dom.window.Event('input'));
  assert.deepEqual([...doc.querySelectorAll('.pv-set-opp strong')].map(n => n.textContent), ['nemesis_nina']);
  search.value = ''; search.dispatchEvent(new a.dom.window.Event('input'));
  chip.focus(); chip.click();
  assert.equal(w.periodRows().length, total);
  assert.equal(doc.querySelector('.pv-settings-menu .pv-set-note'), null);
  assert.notEqual(doc.activeElement, doc.querySelector('.pv-set-search'), 'bringing a player back does not focus the search');
  assert.ok(!gear.classList.contains('active'));
  doc.querySelector('.pv-settings-menu').dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  assert.equal(doc.querySelector('.pv-settings-menu'), null);
  assert.equal(w.deck[w.index].id, 'rival', 'Escape in the menu does not leave the chapter');
});

test('profile gear: colour, rated and short-game switches narrow every chapter, Reset clears them', async t => {
  const {a, doc, w} = await storyDeck(t);
  const total = w.periodRows().length;
  doc.querySelector('.pv-settings').click();
  const pick = selector => doc.querySelector('.pv-settings-menu ' + selector);
  pick('.pv-set-seg button[data-focus="colour-b"]').click();
  assert.equal(a.state.settings.profileColor, 'b');
  assert.ok(w.periodRows().every(r => r.me === 'b'));
  assert.equal(w.report.totals.byColor.w.games ?? 0, 0, 'the report has only black games');
  pick('[data-focus="profileRatedOnly"]').click();
  assert.equal(pick('[data-focus="profileRatedOnly"]').getAttribute('aria-checked'), 'true');
  assert.ok(w.periodRows().every(r => r.me === 'b' && r.rated));
  pick('[data-focus="profileIncludeBots"]').click();
  assert.equal(a.state.settings.profileIncludeBots, true, 'the bots switch is the one from Settings → Recap');
  const kept = w.periodRows().length;
  assert.match(pick('.pv-set-foot span').textContent, new RegExp(`^${kept} of ${total} games count$`));
  pick('.pv-set-reset').click();
  assert.equal(a.state.settings.profileColor, 'all');
  assert.equal(a.state.settings.profileRatedOnly, false);
  assert.equal(w.periodRows().length, total);
  assert.equal(pick('.pv-set-reset'), null, 'nothing left to reset');
});
