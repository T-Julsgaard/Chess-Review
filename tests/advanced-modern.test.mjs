import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.state.settings.accuracyDesign = 'phases-modern';
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Modern Advanced reuses the exact overview player markup and keeps all six metrics aligned by player', t => {
  const a = review(t), doc = a.dom.window.document;
  const header = doc.querySelector('.acc-players').outerHTML;
  const layout = JSON.stringify(a.state.layout);
  a.call('setAccuracyPage', 2);
  assert.equal(doc.querySelector('.acc-players').outerHTML, header);
  assert.ok(doc.querySelector('.acc-page-advanced'));
  assert.deepEqual([...doc.querySelectorAll('.advanced-row')].map(n => n.dataset.metric), ['loss', 'match', 'largest', 'clock', 'streak', 'comeback']);
  assert.ok([...doc.querySelectorAll('.advanced-pair')].every(n => n.children.length === 2));
  assert.equal(doc.querySelectorAll('.advanced-meter').length, 6);
  assert.equal(JSON.stringify(a.state.layout), layout);
  assert.match(doc.querySelector('[data-metric=clock]').textContent, /Clock data needed/);
  assert.equal(doc.querySelector('[data-metric=comeback] .acc-stat-value').textContent, '—');
});

test('Modern streak and loss links use their own player evidence and remain keyboard buttons', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const [i, side] of ['w', 'b'].entries()) Object.assign(a.state.gameStats[side], {
    largestLoss: {ply: i + 3, loss: 85}, cleanStreak: {count: 2, startPly: i + 1, endPly: i + 3},
    timeAhead: {percent: i ? 25 : 75, seconds: 80, turns: 6, totalTurns: 6},
    comeback: {score: i ? 0 : 65, worst: .15, finish: .8, hadDeficit: true, finalResult: false},
  });
  a.call('setAccuracyPage', 2);
  let ply; a.replace('gotoMainline', n => { ply = n; });
  const streaks = doc.querySelectorAll('[data-metric=streak] button');
  streaks[0].click(); assert.equal(ply, 1);
  streaks[1].click(); assert.equal(ply, 2);
  doc.querySelector('[data-metric=largest] button').click(); assert.equal(ply, 3);
  assert.equal(doc.querySelector('[data-metric=clock] .acc-stat-value').textContent, '75%');
  assert.equal(doc.querySelector('[data-metric=comeback] .advanced-meter i').style.width, '65%');
  a.state.meSide = 'b'; a.call('renderStats');
  assert.equal(doc.querySelector('[data-metric=clock] .acc-stat-value').textContent, '25%');
  assert.match(doc.querySelector('[data-metric=clock] .advanced-value').getAttribute('aria-label'), /Black/);
  a.state.analyzing = true; a.call('renderStats');
  assert.ok([...doc.querySelectorAll('.advanced-report .acc-stat-value')].every(n => n.textContent === '···'));
  assert.equal(doc.querySelector('.advanced-report button'), null);
  a.state.analyzing = false; a.call('renderStats');
  assert.ok(doc.querySelector('[data-metric=streak] button'));
});
