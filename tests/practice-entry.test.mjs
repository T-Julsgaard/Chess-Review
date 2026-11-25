import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, branch, settle} from './helpers/app.mjs';

function review(t) {
  const a = app(t);
  a.replace('typeWrite', (node, text) => { node.textContent = text; });
  loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('the review puzzle button matches the existing entry and appears above the starting hint', t => {
  const a = review(t), doc = a.dom.window.document;
  const button = doc.querySelector('.insight-panel .learn-entry-button');
  const existing = doc.querySelector('.learn-entry .learn-entry-button');
  assert.equal(button.textContent, 'Solve Puzzles');
  assert.equal(button.outerHTML, existing.outerHTML);
  assert.equal(button.closest('.ip-head').nextElementSibling.textContent, 'Use ← and → to step through the game.');
  for (const enabled of [true, false]) {
    a.state.settings.uiAnim = enabled;
    a.call('applySettings');
    assert.equal(button.dataset.motion, enabled ? 'on' : 'off');
    assert.equal(existing.dataset.motion, button.dataset.motion);
  }
  const tab = new a.dom.window.KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
  button.dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, false);
  a.call('go', 1);
  assert.equal(doc.querySelector('.insight-panel .learn-entry-button'), null);
  a.call('go', 0);
  assert.equal(doc.querySelectorAll('.insight-panel .learn-entry-button').length, 1);
});

test('the review puzzle button is limited to the completed game at its starting position', t => {
  const a = review(t), S = a.state, doc = a.dom.window.document;
  const button = () => doc.querySelector('.insight-panel .learn-entry-button');
  const hidden = () => { a.call('renderReview'); assert.equal(button(), null); };
  S.blank = true; hidden();
  S.blank = false; S.analyzing = true; hidden();
  S.analyzing = false; S.analysisError = 'Stopped'; hidden();
  S.analysisError = null; branch(a, 0, 0); hidden();
  S.analysisMode = false; S.variation = null;
  S.practice = {spots: [1], i: 0, rolling: true}; hidden();
  S.practice = null; a.call('renderReview');
  assert.ok(button());
});

test('the review puzzle button activates and opens the Puzzles page', async t => {
  const a = review(t), doc = a.dom.window.document;
  t.mock.method(globalThis, 'fetch', async () => ({ok: true, json: async () => ({schema: 1, puzzles: []})}));
  const button = doc.querySelector('.insight-panel .learn-entry-button');
  button.focus();
  button.click();
  assert.ok(button.classList.contains('is-activating'));
  await settle();
  const workspace = a.run('learningWorkspace');
  assert.equal(workspace?.page, 'puzzles');
  assert.equal(a.state.practice, null);
  await workspace.close();
  assert.equal(doc.activeElement, button);
});

test('mistake practice still replays to the first mistake when started', t => {
  const a = review(t), S = a.state, doc = a.dom.window.document;
  S.classif[1] = 'mistake';
  S.bests[0].lines = [{moves: ['d2d4'], score: {cp: 20}}];
  let target;
  a.replace('practiceRoll', ply => { target = ply; a.call('renderReview'); });
  a.call('startPractice');
  assert.deepEqual(Array.from(S.practice.spots), [1]);
  assert.equal(target, 0);
  assert.ok(doc.querySelector('.practice-coach'));
});
