import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame } from './helpers/app.mjs';

function review(t) {
  const a = app(t);
  loadGame(a, '1. e4 e5 2. Nf3');
  a.state.accuracyPage = 1;
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('category labels are read-only across overview designs and preserve count navigation', t => {
  const a = review(t), doc = a.dom.window.document;
  const before = JSON.stringify({classif:a.state.classif,acc:a.state.acc,counts:a.state.counts});
  for (const design of ['original','pages','dials','reveal','phases','phases2','phases-modern']) {
    a.state.settings.accuracyDesign = design; a.state.qbreakExpanded = true; a.call('renderStats');
    for (const label of doc.querySelectorAll('[data-category]')) {
      assert.equal(label.tagName, 'SPAN');
      label.click();
      label.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key:'Enter',bubbles:true}));
      assert.equal(doc.querySelector('.category-name-input,.category-name-reset'), null);
    }
  }
  assert.equal(a.writes.length, 0);
  assert.equal(JSON.stringify({classif:a.state.classif,acc:a.state.acc,counts:a.state.counts}), before);
  a.state.classif[1] = 'book'; a.state.counts.w.book = 1; a.call('renderStats');
  let target; a.replace('gotoMainline', ply => { target = ply; });
  doc.querySelector('[data-category="book"]').closest('.qbreak-row').querySelector('.ct.left').click();
  assert.equal(target, 1);
});

test('legacy aliases still refresh badge labels, tooltips, and cached move commentary', t => {
  const a = review(t); a.state.idx = 1; a.state.classif[1] = 'brilliant';
  a.replace('categoryLabelPng', () => 'data:image/png;base64,custom');
  a.state.settings.badgeTooltip = true;
  a.state.moveGrades[1] = 10;
  a.call('renderReview'); a.call('renderMoves');
  a.call('setCategoryName', 'brilliant', 'Inspired');
  const badge = a.dom.window.document.querySelector('#movesBody .qb');
  assert.equal(badge.getAttribute('title'), null);
  assert.equal(badge.getAttribute('aria-label'), 'Inspired, score 10');
  assert.equal(a.call('makeBoardBadge', 'brilliant', 10).getAttribute('aria-label'), 'Inspired, score 10');
  a.call('showQTip', a.dom.window.document.querySelector('[data-category="brilliant"]'), 'brilliant');
  assert.equal(a.dom.window.document.querySelector('.q-tip-nm').textContent, 'Inspired');
  assert.match(a.run('_ipText'), /Inspired/);
  assert.doesNotMatch(a.run('_ipText'), /brilliant/i);
});

test('aliases remain plain text and do not recurse through coach names or tokens', t => {
  const a = review(t);
  a.state.settings.categoryNames = { brilliant: 'Blunder', blunder: '<b>{move}</b>' };
  assert.equal(a.call('coachFill', 'Brilliant! Blunder. {label}', { label: 'Blunder' }), 'Blunder! <b>{move}</b>. Blunder');
  a.call('renderStats');
  const label = a.dom.window.document.querySelector('[data-category="blunder"] .nm');
  assert.equal(label.textContent, '<b>{move}</b>');
  assert.equal(label.querySelector('b'), null);
  a.call('setCategoryName', 'blunder', 'x'.repeat(100));
  assert.equal(a.call('categoryName', 'blunder').length, 24);
  a.call('setCategoryName', 'blunder', '   ');
  assert.equal(a.call('categoryName', 'blunder'), 'Blunder');
});
