import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}
test('Modern Phase report saves independently, reuses arcs and phase evidence, and preserves the layout', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('applyUiSetup', 'modern');
  const before = JSON.stringify({acc: a.state.acc, stats: a.state.gameStats, layout: a.state.layout, idx: a.state.idx});
  await a.call('setSetting', 'accuracyDesign', 'phases-modern');
  assert.equal(a.store.settings.accuracyDesign, 'phases-modern');
  assert.ok(doc.querySelector('.accuracy-phase-modern'));
  assert.equal(doc.querySelectorAll('.phase-summary .acc-dial-fill').length, 2);
  assert.equal(doc.querySelectorAll('.phase-report-cell').length, 6);
  assert.equal(doc.querySelector('.phase-overview').lastElementChild.className, 'phase-rating');
  assert.doesNotMatch(doc.querySelector('.acc-page').textContent, /%/);
  assert.equal(JSON.stringify({acc: a.state.acc, stats: a.state.gameStats, layout: a.state.layout, idx: a.state.idx}), before);
  a.state.acc.w = null; a.state.gameStats.w.phases.endgame.accuracy = null; a.call('renderStats');
  assert.equal(doc.querySelector('.acc-dial-fill').getAttribute('stroke-dasharray'), '0 100');
  assert.equal(doc.querySelector('[data-phase="endgame"] .phase-report-score').textContent, '—');
  a.state.analyzing = true; a.call('renderStats');
  assert.ok(doc.querySelector('.acc-val.ld'));
  assert.ok([...doc.querySelectorAll('.phase-report-score')].every(n => n.textContent === '···'));
});

test('one retained liquid rail replaces both old controls across all shared pages', async t => {
  const a = review(t), doc = a.dom.window.document;
  const before = JSON.stringify({idx: a.state.idx, layout: a.state.layout, acc: a.state.acc});
  const rail = doc.querySelector('.acc-navigation');
  for (const design of ['pages', 'dials', 'reveal', 'phases', 'phases2', 'phases-modern']) {
    await a.call('setSetting', 'accuracyDesign', design); a.call('setAccuracyPage', 0);
    for (const next of [1, 2, 0]) {
      doc.querySelector('#accuracy-tab-' + next).click();
      assert.equal(a.state.accuracyPage, next);
      assert.equal(doc.activeElement.id, 'accuracy-tab-' + next);
      assert.equal(doc.querySelector('.acc-navigation'), rail);
      assert.equal(rail.querySelector('[aria-selected="true"]').id, 'accuracy-tab-' + next);
      assert.equal(doc.querySelector('.acc-page-corner,.acc-page-prev,.acc-page-next,.acc-pager-steps,.acc-tabs'), null);
      assert.equal(rail.querySelectorAll('button').length, 3);
      assert.equal(doc.querySelector('.accuracy-panel').lastElementChild, rail);
    }
    for (const [key, next] of [['ArrowLeft', 2], ['Home', 0], ['End', 2]]) {
      rail.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key, bubbles: true}));
      assert.equal(a.state.accuracyPage, next);
      assert.equal(doc.activeElement.id, 'accuracy-tab-' + next);
    }
  }
  assert.equal(JSON.stringify({idx: a.state.idx, layout: a.state.layout, acc: a.state.acc}), before);
});

test('page dissolve is decorative, cleans up, and respects disabled and reduced motion', t => {
  const a = review(t), doc = a.dom.window.document;
  const animations = [];
  a.dom.window.HTMLElement.prototype.animate = function() { const result = {}; animations.push(result); return result; };
  a.state.settings.accuracyDesign = 'phases2'; a.call('renderStats');
  a.state.settings.moveAnim = true;
  a.call('setAccuracyPage', 1);
  const leaf = doc.querySelector('.acc-turn-leaf');
  assert.ok(leaf); assert.equal(leaf.getAttribute('aria-hidden'), 'true'); assert.equal(leaf.inert, true);
  assert.ok(leaf.classList.contains('accuracy-phase-report-2'), 'Outgoing comparison columns retain their style scope');
  assert.equal(leaf.querySelector('[id]'), null);
  assert.equal(doc.querySelectorAll('#accuracy-page').length, 1);
  animations[0].onfinish(); assert.equal(doc.querySelector('.acc-turn-leaf'), null);
  a.state.settings.moveAnim = false; a.call('setAccuracyPage', 2); assert.equal(animations.length, 2);
  a.state.settings.moveAnim = true; a.dom.window.matchMedia = () => ({matches: true});
  a.call('setAccuracyPage', 0); assert.equal(animations.length, 2);
});
