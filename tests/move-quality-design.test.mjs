import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.state.meSide = 'b';
  a.call('computeDerived'); a.call('buildUI');
  for (const side of ['w', 'b']) for (const key of Object.keys(a.state.counts[side])) a.state.counts[side][key] = 0;
  Object.assign(a.state.counts.b, {best: 2, blunder: 1});
  Object.assign(a.state.counts.w, {best: 1, inacc: 2});
  a.state.classif = [null, 'best', 'best', 'inacc', 'best', 'inacc', 'blunder'];
  a.call('setAccuracyPage', 1);
  return a;
}

test('distribution uses each player’s classified total and preserves category navigation', t => {
  const a = review(t), doc = a.dom.window.document;
  assert.equal(doc.querySelector('.acc-quality').dataset.qualityDesign, 'distribution');
  assert.deepEqual([...doc.querySelectorAll('[data-quality-total]')].map(node => [node.dataset.qualityTotal, node.textContent]), [['b', '3'], ['w', '3']]);
  assert.equal(doc.querySelectorAll('.quality-spectrum i').length, 20);
  assert.ok(Math.abs(parseFloat(doc.querySelector('[data-quality-segment="b-best"]').style.width) - 200 / 3) < .0001);
  const row = doc.querySelector('[data-category="inacc"]').closest('.qbreak-row');
  assert.ok(Math.abs(parseFloat(row.style.getPropertyValue('--share-right')) - 200 / 3) < .0001);
  assert.equal(row.style.getPropertyValue('--share-left'), '0%');
  assert.equal(row.querySelector('.ct.left').disabled, true);
  let ply; a.replace('gotoMainline', value => { ply = value; });
  row.querySelector('.ct:not(.left)').click(); assert.equal(ply, 3);
});

test('live counts, distribution and totals update in place while focus and aliases survive', t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.analyzing = true; a.call('renderStats');
  const count = doc.querySelector('[data-category="best"]').closest('.qbreak-row').querySelector('.ct.left');
  count.focus();
  a.state.counts.b.best = 5; a.call('renderStats');
  assert.equal(doc.activeElement, count); assert.equal(count.textContent, '5');
  assert.equal(doc.querySelector('[data-quality-total="b"]').textContent, '6');
  assert.match(doc.querySelector('[data-quality-total="b"]').getAttribute('aria-label'), /so far/);
  assert.ok(Math.abs(parseFloat(doc.querySelector('[data-quality-segment="b-best"]').style.width) - 500 / 6) < .0001);
  a.call('setCategoryName', 'best', 'Top choice');
  assert.equal(doc.querySelector('[data-category="best"] .nm').textContent, 'Top choice');
  a.call('renderStats'); assert.match(count.getAttribute('aria-label'), /Top choice/);
});

test('page design choices save independently, restore on startup and reset with Visual settings', async t => {
  const a = review(t), doc = a.dom.window.document;
  const before = JSON.stringify({acc: a.state.acc, classif: a.state.classif, idx: a.state.idx, layout: a.state.layout});
  a.replace('scheduleReanalyze', () => { throw Error('Visual changes must not reanalyze'); });
  await a.call('setSetting', 'accuracyQualityDesign', 'original');
  assert.equal(doc.querySelector('.quality-summary'), null);
  assert.equal(doc.querySelectorAll('.qbreak-row').length, 10);
  assert.equal(a.state.settings.accuracyDesign, 'phases');
  await a.call('setSetting', 'accuracyDesign', 'pages');
  assert.equal(doc.querySelector('.acc-quality').dataset.qualityDesign, 'original');
  await a.call('setSetting', 'accuracyQualityDesign', 'distribution');
  assert.ok(doc.querySelector('.quality-summary'));
  assert.equal(a.store.settings.accuracyDesign, 'pages');
  assert.equal(a.store.settings.accuracyQualityDesign, 'distribution');
  assert.equal(JSON.stringify({acc: a.state.acc, classif: a.state.classif, idx: a.state.idx, layout: a.state.layout}), before);
  const restored = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease', async () => {});
  restored.store.settings = {accuracyDesign: 'phases', accuracyQualityDesign: 'original', accuracyAdvancedDesign: 'original'};
  await restored.start(); restored.call('setAccuracyPage', 1);
  assert.equal(restored.dom.window.document.querySelector('.acc-quality').dataset.qualityDesign, 'original');
  await restored.call('resetVisualSettings');
  assert.equal(restored.store.settings.accuracyQualityDesign, 'distribution');
  assert.equal(restored.store.settings.accuracyAdvancedDesign, 'original');
  assert.ok(restored.dom.window.document.querySelector('.quality-summary'));
});

test('empty distributions show zero totals and no fabricated category shares', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const side of ['w', 'b']) for (const key of Object.keys(a.state.counts[side])) a.state.counts[side][key] = 0;
  a.call('renderStats');
  assert.deepEqual([...doc.querySelectorAll('[data-quality-total]')].map(node => node.textContent), ['0', '0']);
  assert.ok([...doc.querySelectorAll('.quality-spectrum i')].every(node => node.style.width === '0%'));
  assert.ok([...doc.querySelectorAll('.qbreak-row .ct')].every(node => node.disabled));
});
