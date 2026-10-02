import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame } from './helpers/app.mjs';

function review(t) {
  const a = app(t);
  loadGame(a, '1. e4 e5 2. Nf3');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

function edit(a, key) {
  a.dom.window.document.querySelector(`[data-category="${key}"]`).click();
  return a.dom.window.document.querySelector('.category-name-input');
}
function key(a, input, value) {
  input.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', { key: value, bubbles: true }));
}

test('click-to-rename persists a display alias without altering classification or scores', t => {
  const a = review(t);
  const before = JSON.stringify({ classif: a.state.classif, acc: a.state.acc, counts: a.state.counts });
  const input = edit(a, 'brilliant');
  assert.equal(a.dom.window.document.activeElement, input);
  input.value = '  Inspired   move  ';
  key(a, input, 'Enter');
  assert.equal(a.store.settings.categoryNames.brilliant, 'Inspired move');
  assert.equal(a.dom.window.document.querySelector('[data-category="brilliant"] .nm').textContent, 'Inspired move');
  assert.equal(JSON.stringify({ classif: a.state.classif, acc: a.state.acc, counts: a.state.counts }), before);
  const reopened = review(t);
  reopened.state.settings = { ...reopened.state.settings, ...structuredClone(a.store.settings) };
  reopened.call('renderStats');
  assert.equal(reopened.dom.window.document.querySelector('[data-category="brilliant"] .nm').textContent, 'Inspired move');
});

test('Escape cancels, blur saves, and the reset control restores the default', t => {
  const a = review(t);
  let input = edit(a, 'blunder'); input.value = 'Oops'; key(a, input, 'Escape');
  assert.equal(a.call('categoryName', 'blunder'), 'Blunder');
  assert.equal(a.writes.length, 0);
  input = edit(a, 'blunder'); input.value = 'Oops'; input.blur();
  assert.equal(a.call('categoryName', 'blunder'), 'Oops');
  input = edit(a, 'blunder');
  const reset = a.dom.window.document.querySelector('.category-name-reset');
  reset.focus();
  assert.equal(a.dom.window.document.activeElement, reset);
  assert.equal(a.call('categoryName', 'blunder'), 'Oops');
  reset.click();
  assert.equal(a.call('categoryName', 'blunder'), 'Blunder');
  assert.equal(Object.hasOwn(a.store.settings.categoryNames, 'blunder'), false);
});

test('expanded categories are editable and renaming preserves count navigation', t => {
  const a = review(t); a.state.qbreakExpanded = true; a.call('renderStats');
  assert.equal(a.dom.window.document.querySelectorAll('[data-category]').length, 10);
  const input = edit(a, 'book'); input.value = 'Opening'; key(a, input, 'Enter');
  a.state.classif[1] = 'book'; a.state.counts.w.book = 1; a.call('renderStats');
  let target;
  a.replace('gotoMainline', ply => { target = ply; });
  a.dom.window.document.querySelector('[data-category="book"]').closest('.qbreak-row').querySelector('.ct.left').click();
  assert.equal(target, 1);
});

test('renaming refreshes badge labels, tooltips, and cached move commentary', t => {
  const a = review(t); a.state.idx = 1; a.state.classif[1] = 'brilliant';
  a.state.settings.badgeTooltip = true;
  a.state.moveGrades[1] = 10;
  a.call('renderReview'); a.call('renderMoves');
  const input = edit(a, 'brilliant'); input.value = 'Inspired'; key(a, input, 'Enter');
  const badge = a.dom.window.document.querySelector('#movesBody .qb');
  assert.equal(badge.getAttribute('title'), 'Inspired, score 10');
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
