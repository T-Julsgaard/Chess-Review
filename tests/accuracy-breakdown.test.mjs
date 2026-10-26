import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Accuracy opens on overview, with phase scores and Elo and no practice or explanation controls', t => {
  const a = review(t), panel = a.dom.window.document.querySelector('.accuracy-panel');
  assert.equal(panel.querySelector('[aria-selected="true"]').textContent, 'Overview');
  assert.equal(panel.querySelectorAll('.acc-phase-row').length, 3);
  assert.match(panel.textContent, /Estimated Elo/);
  assert.equal(panel.querySelector('.practice-btn,.qbreak-toggle,.qbreak'), null);
  panel.querySelector('.acc-val').dispatchEvent(new a.dom.window.MouseEvent('mouseenter'));
  assert.equal(a.dom.window.document.querySelector('.q-tip.show'), null);
});

test('move quality shows all ten categories and count buttons jump to the correct player move', t => {
  const a = review(t), S = a.state, doc = a.dom.window.document;
  S.meSide = 'b'; S.classif = [null, 'best', 'best', 'inacc', 'best', 'inacc', 'blunder'];
  Object.assign(S.counts.w, {best: 1, inacc: 2}); Object.assign(S.counts.b, {best: 2, blunder: 1});
  a.call('setAccuracyPage', 1);
  const rows = [...doc.querySelectorAll('.qbreak [data-category]')].map(n => n.dataset.category);
  assert.deepEqual(rows, ['brilliant', 'great', 'best', 'excellent', 'good', 'inacc', 'mistake', 'miss', 'blunder', 'book']);
  const row = doc.querySelector('[data-category="inacc"]').closest('.qbreak-row');
  assert.equal(row.querySelector('.ct.left').textContent, '0');
  assert.equal(row.querySelector('.ct.left').disabled, true);
  let target; a.replace('gotoMainline', ply => { target = ply; });
  row.querySelector('.ct:not(.left)').click(); assert.equal(target, 3);
  row.querySelector('.qlabel').dispatchEvent(new a.dom.window.MouseEvent('mouseenter'));
  row.querySelector('.qlabel').focus();
  assert.equal(doc.querySelector('.q-tip.show'), null);
});

test('page navigation supports keyboard arrows, Home and End without changing the board or saved layout', t => {
  const a = review(t), doc = a.dom.window.document;
  const before = JSON.stringify({layout: a.state.layout, idx: a.state.idx, flipped: a.state.flipped});
  for (const [key, page] of [['ArrowRight', 1], ['End', 2], ['ArrowRight', 0], ['ArrowLeft', 2], ['Home', 0]]) {
    doc.querySelector('[role="tablist"]').dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key, bubbles: true}));
    assert.equal(a.state.accuracyPage, page);
    assert.equal(doc.activeElement.id, 'accuracy-tab-' + page);
    assert.equal(doc.querySelectorAll('[role="tab"][tabindex="0"]').length, 1);
  }
  assert.equal(JSON.stringify({layout: a.state.layout, idx: a.state.idx, flipped: a.state.flipped}), before);
});

test('analyzing can change pages and update counts without restarting loaders or stealing focus', t => {
  const a = review(t), doc = a.dom.window.document; a.state.analyzing = true;
  a.call('renderStats'); const loader = doc.querySelector('.acc-val');
  a.call('renderStats'); assert.equal(doc.querySelector('.acc-val'), loader);
  a.call('setAccuracyPage', 1, true); a.state.counts.w.blunder = 2; a.call('renderStats');
  assert.equal(doc.querySelector('[data-category="blunder"]').closest('.qbreak-row').querySelector('.ct.left').textContent, '2');
  assert.equal(doc.activeElement.id, 'accuracy-tab-1');
  a.call('setAccuracyPage', 2); assert.match(doc.querySelector('.acc-advanced').textContent, /Stats appear when analysis finishes/);
  a.state.analyzing = false; a.call('renderStats'); assert.doesNotMatch(doc.querySelector('.acc-advanced').textContent, /···/);
});

test('advanced loss links navigate using the mainline and retain the selected page on rerender', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const side of ['w', 'b']) a.state.gameStats[side] = {averageCpLoss: 20, topMatch: 50, cpMoves: 3, largestLoss: {ply: side === 'w' ? 3 : 6, loss: 60}};
  a.call('setAccuracyPage', 2); let ply; a.replace('gotoMainline', n => { ply = n; });
  const links = doc.querySelectorAll('.acc-loss'); links[0].click(); assert.equal(ply, 3);
  links[1].click(); assert.equal(ply, 6);
  a.call('renderStats'); assert.equal(doc.querySelector('[aria-selected="true"]').textContent, 'Advanced');
});
