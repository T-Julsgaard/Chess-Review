import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, branch} from './helpers/app.mjs';

function review(t) {
  const a = app(t);
  a.replace('typeWrite', (node, text) => { node.textContent = text; });
  loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('practice appears above the starting hint, follows navigation, and stays out of every Accuracy design', t => {
  const a = review(t), doc = a.dom.window.document;
  const button = doc.querySelector('.insight-panel .practice-btn');
  assert.equal(button.textContent, 'Practice your mistakes');
  assert.equal(button.closest('.ip-head').nextElementSibling.textContent, 'Use ← and → to step through the game.');
  for (const design of ['original', 'reveal']) {
    a.state.settings.accuracyDesign = design; a.call('renderStats');
    assert.equal(doc.querySelector('.accuracy-panel .practice-btn'), null);
  }
  a.call('go', 1);
  assert.equal(doc.querySelector('.practice-btn'), null);
  a.call('go', 0);
  assert.equal(doc.querySelectorAll('.insight-panel .practice-btn').length, 1);
});

test('blank, analyzing, failed, variation and active practice states do not offer practice entry', t => {
  const a = review(t), S = a.state, doc = a.dom.window.document;
  const hidden = () => { a.call('renderReview'); assert.equal(doc.querySelector('.practice-btn'), null); };
  S.blank = true; hidden();
  S.blank = false; S.analyzing = true; hidden();
  S.analyzing = false; S.analysisError = 'Stopped'; hidden();
  S.analysisError = null; branch(a, 0, 0); hidden();
  S.analysisMode = false; S.variation = null;
  S.practice = {spots: [1], i: 0, rolling: true}; hidden();
  S.practice = null; a.call('renderReview');
  assert.ok(doc.querySelector('.insight-panel .practice-btn'));
});

test('the Insights action starts the existing mistake practice flow', t => {
  const a = review(t), S = a.state, doc = a.dom.window.document;
  S.classif[1] = 'mistake';
  S.bests[0].lines = [{moves: ['d2d4'], score: {cp: 20}}];
  let target;
  a.replace('practiceRoll', ply => { target = ply; a.call('renderReview'); });
  doc.querySelector('.practice-btn').click();
  assert.deepEqual(Array.from(S.practice.spots), [1]);
  assert.equal(target, 0);
  assert.ok(doc.querySelector('.practice-coach'));
  assert.equal(doc.querySelector('.practice-btn'), null);
});
