import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.state.settings.accuracyDesign = 'phases-modern';
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Modern Advanced shares the overview header and provides sixteen comparisons without cut stats, meters or hover explanations', t => {
  const a = review(t), doc = a.dom.window.document;
  const header = doc.querySelector('.acc-players').outerHTML;
  const layout = JSON.stringify(a.state.layout);
  a.call('setAccuracyPage', 2);
  assert.equal(doc.querySelector('.acc-players').outerHTML, header);
  assert.ok(doc.querySelector('.acc-page-advanced'));
  assert.equal(doc.querySelectorAll('.advanced-row').length, 16);
  assert.deepEqual([...doc.querySelectorAll('.advanced-group-label')].map(n => n.textContent), ['Decision quality', 'On the clock']);
  assert.deepEqual([...doc.querySelectorAll('.advanced-row')].map(n => n.dataset.metric),
    ['loss', 'match', 'largest', 'streak', 'balanced', 'defending', 'winning', 'punish', 'bounce-back', 'only-moves',
      'clock', 'think-average', 'think-longest', 'pressure', 'quick', 'deep']);
  assert.equal(doc.querySelector('[data-metric=finish],[data-metric=active-piece],[data-metric=castling],[data-metric=captures],[data-metric=checks],[data-metric=clean],[data-metric=best-five],[data-metric=clock-lead]'), null);
  assert.ok([...doc.querySelectorAll('.advanced-pair')].every(n => n.children.length === 2));
  assert.equal(doc.querySelectorAll('.advanced-meter,[data-metric=comeback],.advanced-report [title]').length, 0);
  assert.equal(doc.querySelectorAll('.advanced-info').length, 16);
  assert.equal(doc.querySelectorAll('.advanced-star').length, 16);
  assert.equal(doc.querySelectorAll('.advanced-star.on,.advanced-group-starred').length, 0);
  assert.equal(doc.querySelectorAll('.advanced-explainer:not([hidden])').length, 0);
  assert.equal(JSON.stringify(a.state.layout), layout);
  assert.equal(doc.querySelector('[data-metric=clock] .advanced-detail'), null);
});

test('sample values step through their decisions on repeated clicks, per player, and wrap around', t => {
  const a = review(t), doc = a.dom.window.document;
  const empty = {accuracy: null, count: 0, plies: []};
  a.state.gameStats.w.insights = {balanced: {accuracy: 88, count: 3, plies: [1, 3, 5]}, winning: empty, defending: empty};
  a.state.gameStats.b.insights = {balanced: {accuracy: 70, count: 2, plies: [2, 4]}, winning: empty, defending: empty};
  a.state.gameStats.w.replies = {punished: {found: 1, total: 2, plies: [3, 5]}, recovery: {accuracy: 50, count: 1, plies: [5]}};
  a.state.gameStats.w.timing = {pressure: null, quick: {accuracy: 90, count: 2, plies: [1, 5]}, deep: {accuracy: null, count: 0, plies: []}};
  a.call('setAccuracyPage', 2);
  const visited = []; a.replace('gotoMainline', ply => { visited.push(ply); a.state.idx = ply; });
  const [white, black] = doc.querySelectorAll('[data-metric=balanced] .advanced-value');
  assert.equal(white.tagName, 'BUTTON'); assert.equal(black.tagName, 'BUTTON');
  assert.equal(white.querySelector('.advanced-detail').textContent, '3 decisions · revisit ↗');
  assert.match(white.getAttribute('aria-label'), /Cycle through moves.$/);
  white.click(); white.click(); white.click(); white.click();
  assert.deepEqual(visited, [1, 3, 5, 1], 'Each click moves on and wraps around');
  black.click(); black.click(); white.click();
  assert.deepEqual(visited.slice(4), [2, 4, 1], 'The other player and a different metric restart from their first decision');
  const punish = doc.querySelector('[data-metric=punish] .advanced-value');
  assert.equal(punish.tagName, 'BUTTON');
  assert.equal(punish.querySelector('.advanced-detail').textContent, '1 of 2 mistakes · revisit ↗');
  punish.click(); punish.click(); assert.deepEqual(visited.slice(7), [3, 5]);
  assert.equal(doc.querySelector('[data-metric=bounce-back] .advanced-detail').textContent, '1 decision · revisit ↗');
  assert.equal(doc.querySelector('[data-metric=deep] .advanced-value').tagName, 'DIV', 'An empty sample is not a link');
  assert.equal(doc.querySelector('[data-metric=deep] .advanced-detail').textContent, 'No such decisions');
  a.state.analyzing = true; a.call('renderStats');
  assert.equal(doc.querySelector('[data-metric=balanced] button.advanced-value'), null, 'Pending values are not links');
});

test('Modern streak and loss links use their own player evidence and remain keyboard buttons', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const [i, side] of ['w', 'b'].entries()) Object.assign(a.state.gameStats[side], {
    largestLoss: {ply: i + 3, loss: 85}, cleanStreak: {count: 2, startPly: i + 1, endPly: i + 3},
    clock: {advantage: {percent: i ? 25 : 75, ahead: i ? 1 : 3, samples: 4, total: 4}},
  });
  a.call('setAccuracyPage', 2);
  let ply; a.replace('gotoMainline', n => { ply = n; });
  const streaks = doc.querySelectorAll('[data-metric=streak] .advanced-value');
  streaks[0].click(); assert.equal(ply, 1);
  streaks[1].click(); assert.equal(ply, 2);
  doc.querySelector('[data-metric=largest] button.advanced-value').click(); assert.equal(ply, 3);
  assert.equal(doc.querySelector('[data-metric=clock] .acc-stat-value').textContent, '75%');
  assert.equal(doc.querySelector('[data-metric=clock] .advanced-detail'), null);
  a.state.meSide = 'b'; a.call('renderStats');
  assert.equal(doc.querySelector('[data-metric=clock] .acc-stat-value').textContent, '25%');
  assert.match(doc.querySelector('[data-metric=clock] .advanced-value').getAttribute('aria-label'), /Black/);
  a.state.analyzing = true; a.call('renderStats');
  assert.ok([...doc.querySelectorAll('.advanced-report .acc-stat-value')].every(n => n.querySelector('.ld')));
  assert.equal(doc.querySelector('.advanced-report button.advanced-value'), null);
  a.state.analyzing = false; a.call('renderStats');
  assert.ok(doc.querySelector('[data-metric=streak] button.advanced-value'));
});

test('starring a metric moves it into a Starred group at the top, persists the choice, and unstarring returns it home', async t => {
  const a = review(t), doc = a.dom.window.document;
  a.call('setAccuracyPage', 2);
  const star = id => doc.querySelector('[data-metric=' + id + '] .advanced-star');
  assert.equal(star('streak').getAttribute('aria-pressed'), 'false');
  assert.match(star('streak').getAttribute('aria-label'), /^Star Longest clean streak$/);
  star('streak').click();
  assert.deepEqual([...doc.querySelectorAll('.advanced-group-label')].map(n => n.textContent), ['Starred', 'Decision quality', 'On the clock']);
  assert.deepEqual([...doc.querySelectorAll('.advanced-group-starred .advanced-row')].map(n => n.dataset.metric), ['streak']);
  assert.equal(doc.querySelectorAll('[data-metric=streak]').length, 1, 'A starred metric appears once');
  assert.equal(star('streak').getAttribute('aria-pressed'), 'true');
  assert.equal(star('streak').textContent, '★');
  assert.equal(doc.activeElement, star('streak'));
  assert.deepEqual([...a.state.settings.starredStats], ['streak']);
  star('quick').click();
  assert.deepEqual([...doc.querySelectorAll('.advanced-group-starred .advanced-row')].map(n => n.dataset.metric), ['streak', 'quick'],
    'Starred rows keep report order, not click order');
  assert.equal(doc.querySelectorAll('.advanced-row').length, 16);
  assert.equal(doc.querySelectorAll('.advanced-info').length, 16);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual([...a.store.settings.starredStats], ['streak', 'quick']);
  star('streak').click();
  assert.deepEqual([...doc.querySelectorAll('.advanced-group-starred .advanced-row')].map(n => n.dataset.metric), ['quick']);
  assert.equal(doc.querySelector('.advanced-group:nth-of-type(2) [data-metric=streak]') != null, true, 'Unstarred metric returns to Decision quality');
  star('quick').click();
  assert.equal(doc.querySelector('.advanced-group-starred'), null, 'The Starred group disappears when empty');
  assert.deepEqual([...a.state.settings.starredStats], []);
  assert.equal(doc.querySelector('.advanced-report [title]'), null);
});

test('starred metrics load from settings, ignore unknown ids, and survive the analyzing state', t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.settings.starredStats = ['deep', 'bogus', 'loss'];
  a.call('setAccuracyPage', 2);
  assert.deepEqual([...doc.querySelectorAll('.advanced-group-starred .advanced-row')].map(n => n.dataset.metric), ['loss', 'deep']);
  assert.equal(doc.querySelectorAll('.advanced-row').length, 16);
  a.state.analyzing = true; a.call('renderStats');
  assert.deepEqual([...doc.querySelectorAll('.advanced-group-starred .advanced-row')].map(n => n.dataset.metric), ['loss', 'deep']);
  doc.querySelector('[data-metric=loss] .advanced-star').click();
  assert.deepEqual([...doc.querySelectorAll('.advanced-group-starred .advanced-row')].map(n => n.dataset.metric), ['deep']);
  assert.ok([...doc.querySelectorAll('.advanced-report .acc-stat-value')].every(n => n.querySelector('.ld')), 'Pending values stay pending');
});

test('new reply, critical and timing rows read their own evidence with honest unavailable states', t => {
  const a = review(t), doc = a.dom.window.document;
  Object.assign(a.state.gameStats.w, {
    replies: {punished: {found: 3, total: 4}, recovery: {accuracy: 77.5, count: 2}},
    critical: {found: 1, total: 1},
    timing: {pressure: null, quick: {accuracy: 91.25, count: 6}, deep: {accuracy: null, count: 0}},
  });
  Object.assign(a.state.gameStats.b, {replies: {punished: null, recovery: null}, critical: null, timing: null});
  a.call('setAccuracyPage', 2);
  const values = id => [...doc.querySelectorAll('[data-metric=' + id + '] .advanced-value')].map(n => [n.querySelector('.acc-stat-value').textContent, n.querySelector('.advanced-detail')?.textContent]);
  assert.deepEqual(values('punish'), [['75%', '3 of 4 mistakes'], ['—', 'Needs classified moves']]);
  assert.deepEqual(values('bounce-back'), [['77.5', '2 decisions'], ['—', 'Needs classified moves']]);
  assert.deepEqual(values('only-moves'), [['100%', '1 of 1 critical decisions'], ['—', 'Needs two analysis lines']]);
  assert.deepEqual(values('pressure'), [['—', 'Needs clocks and time control'], ['—', 'Needs clocks and time control']]);
  assert.deepEqual(values('quick'), [['91.3', '6 decisions'], ['—', 'Clock data needed']]);
  assert.equal(doc.querySelector('[data-metric=punish] button.advanced-value'), null, 'Samples without plies stay plain values');
  assert.deepEqual(values('deep'), [['—', 'No such decisions'], ['—', 'Clock data needed']]);
  a.state.gameStats.w.replies.punished = {found: 0, total: 0};
  a.call('renderStats');
  assert.deepEqual(values('punish')[0], ['—', 'No mistakes']);
});

test('each info button toggles a linked plain-language explainer, only one opens, and Escape closes with focus restored', t => {
  const a = review(t), doc = a.dom.window.document;
  a.call('setAccuracyPage', 2);
  const buttons = [...doc.querySelectorAll('.advanced-info')];
  for (const button of buttons) {
    const panel = doc.getElementById(button.getAttribute('aria-controls'));
    assert.ok(panel.textContent.length > 40);
    button.click();
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(panel.hidden, false);
    assert.equal(doc.querySelectorAll('.advanced-explainer:not([hidden])').length, 1);
  }
  buttons.at(-1).dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  assert.equal(doc.querySelectorAll('.advanced-explainer:not([hidden])').length, 0);
  assert.equal(doc.activeElement, buttons.at(-1));
  buttons[0].click(); buttons[0].click();
  assert.equal(buttons[0].getAttribute('aria-expanded'), 'false');
  assert.equal(doc.querySelector('.advanced-report [title]'), null);
  a.call('setAccuracyPage', 0); a.call('setAccuracyPage', 2);
  assert.equal(doc.querySelectorAll('.advanced-explainer:not([hidden])').length, 0);
});
