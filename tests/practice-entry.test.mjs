import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function review(t) {
  const a = app(t);
  a.replace('typeWrite', (node, text) => { node.textContent = text; });
  loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Insights shows the starting hint and practice appears in the standalone slot', t => {
  const a = review(t), doc = a.dom.window.document;
  const practice = doc.querySelector('[data-mod="learn"] .practice-btn');
  assert.equal(practice.textContent, 'Practice your mistakes');
  assert.equal(doc.querySelector('.insight-panel .ip-text').textContent, 'Use ← and → to step through the game.');
  assert.equal(doc.querySelector('.learn-entry-button'), null);
  for (const enabled of [true, false]) {
    a.state.settings.uiAnim = enabled;
    a.call('applySettings');
    assert.equal(practice.dataset.motion, enabled ? 'on' : 'off');
  }
  const tab = new a.dom.window.KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
  practice.dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, false);
  a.call('go', 1);
  assert.equal(practice.isConnected, true);
  a.call('go', 0);
  assert.equal(doc.querySelector('.learn-entry-button'), null);
});

test('the standalone entry offers puzzles in the blank workspace and practice after analysis', t => {
  const a = review(t), S = a.state, doc = a.dom.window.document;
  const practice = () => doc.querySelector('[data-mod="learn"] .practice-btn');
  S.blank = true; a.call('renderReview');
  assert.equal(practice(), null);
  assert.equal(doc.querySelector('[data-mod="learn"] .learn-entry-button').textContent, 'Solve Puzzles');
  S.blank = false; S.analyzing = true; a.call('renderReview');
  assert.equal(practice().disabled, true);
  S.analyzing = false; S.analysisError = 'Stopped'; a.call('renderReview');
  assert.equal(practice().disabled, true);
  S.analysisError = null; S.practice = {spots: [1], i: 0, rolling: true}; a.call('renderReview');
  assert.equal(practice().disabled, true);
  S.practice = null; a.call('renderReview');
  assert.equal(practice().disabled, false);
});

test('the standalone practice button replays to the first mistake from a later move', t => {
  const a = review(t), S = a.state, doc = a.dom.window.document;
  S.classif[1] = 'mistake';
  S.bests[0].lines = [{moves: ['d2d4'], score: {cp: 20}}];
  a.call('go', 2);
  let target;
  a.replace('practiceRoll', ply => { target = ply; a.call('renderReview'); });
  doc.querySelector('[data-mod="learn"] .practice-btn').click();
  assert.deepEqual(Array.from(S.practice.spots), [1]);
  assert.equal(target, 0);
  assert.ok(doc.querySelector('.practice-coach'));
});
