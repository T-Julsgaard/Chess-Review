import test from 'node:test';
import assert from 'node:assert/strict';
import {phasePerformance} from '../lib/phase-performance.js';
import {app, loadGame} from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.state.settings.accuracyDesign = 'phases';
  a.call('computeDerived');
  for (const side of ['w','b']) for (const phase of ['opening','middlegame','endgame']) {
    Object.assign(a.state.gameStats[side].phases[phase], {accuracy: 94, decisions: 8});
  }
  a.state.gameStats.w.phases.middlegame.accuracy = 42.5;
  a.state.gameStats.b.phases.middlegame.accuracy = 72;
  a.state.acc = {w: 89, b: 83};
  a.call('buildUI'); a.call('renderAll');
  return a;
}

test('phase display bands have precise boundaries and reject unavailable or invalid scores', () => {
  for (const [accuracy, category] of [[100,'excellent'],[90,'excellent'],[89.99,'good'],[80,'good'],[79.99,'inacc'],[65,'inacc'],[64.99,'mistake'],[50,'mistake'],[49.99,'blunder'],[0,'blunder']]) {
    assert.equal(phasePerformance(accuracy).category, category);
  }
  for (const missing of [null, undefined, NaN, Infinity, -1, 101, '90']) assert.equal(phasePerformance(missing), null);
});

test('the phase report shows compact colored scores with estimated ratings below all phases', t => {
  const a = review(t), doc = a.dom.window.document;
  assert.equal(doc.querySelector('.accuracy-panel').dataset.design, 'phases');
  assert.equal(doc.querySelectorAll('.phase-report-row').length, 3);
  assert.equal(doc.querySelectorAll('.phase-report-cell').length, 6);
  const middle = doc.querySelector('[data-phase="middlegame"]');
  const mine = middle.querySelector('.phase-report-cell'), theirs = middle.querySelector('.phase-report-cell:last-child');
  assert.equal(mine.dataset.phaseCategory, 'blunder');
  assert.equal(mine.style.getPropertyValue('--phase-color'), 'var(--q-blunder)');
  assert.equal(mine.querySelector('.phase-category,.phase-category-label,.phase-category-mark'), null);
  assert.equal(mine.children.length, 1);
  assert.equal(mine.querySelector('.phase-report-score').textContent, '42.5%');
  assert.equal(theirs.dataset.phaseCategory, 'inacc');
  assert.equal(theirs.style.getPropertyValue('--phase-color'), 'var(--q-inacc)');
  assert.match(mine.getAttribute('aria-label'), /White, Middlegame.*42.5% accuracy, Blunder, 8 scored decisions/);
  assert.match(doc.querySelector('.phase-summary').textContent, /89\.0%83\.0%/);
  const overview = doc.querySelector('.phase-overview');
  assert.deepEqual([...overview.children].map(n => n.className), ['phase-summary','phase-report','phase-rating']);
  assert.match(overview.lastElementChild.textContent, /Estimated rating/);
  assert.equal(doc.querySelector('.phase-summary .acc-elo'), null);
  assert.equal(doc.querySelector('.accuracy-panel .panel-head,.accuracy-panel .acc-note,.accuracy-panel .acc-dial'), null);
});

test('unreached and unscored phases stay neutral instead of appearing as bad play', t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.gameStats.w.phases.endgame.accuracy = null;
  a.state.gameStats.w.phases.endgame.decisions = 0;
  a.call('renderStats');
  const empty = doc.querySelector('[data-phase="endgame"] .phase-report-cell');
  assert.equal(empty.dataset.phaseCategory, ''); assert.ok(empty.classList.contains('unavailable'));
  assert.equal(empty.querySelector('.phase-report-score').textContent, '—');
  assert.equal(empty.querySelector('.phase-category-mark'), null);
  assert.match(empty.getAttribute('aria-label'), /not scored/);
  a.state.analyzing = true; a.call('renderStats');
  assert.equal(doc.querySelectorAll('[data-phase-category="blunder"]').length, 0);
  assert.ok([...doc.querySelectorAll('.phase-report-score')].every(n => n.textContent === '···'));
});

test('category summaries are independent of annotations, board orientation and selected player side', t => {
  const a = review(t), doc = a.dom.window.document;
  const before = JSON.stringify({stats: a.state.gameStats, acc: a.state.acc, classif: a.state.classif, grades: a.state.moveGrades, evals: a.state.evals});
  a.state.flipped = true; a.state.meSide = 'b'; a.call('renderStats');
  const left = doc.querySelector('[data-phase="middlegame"] .phase-report-cell');
  assert.equal(left.dataset.phaseCategory, 'inacc');
  assert.match(left.getAttribute('aria-label'), /^Black/);
  assert.equal(JSON.stringify({stats: a.state.gameStats, acc: a.state.acc, classif: a.state.classif, grades: a.state.moveGrades, evals: a.state.evals}), before);
  assert.equal(doc.querySelector('.phase-report [data-category]'), null, 'Performance badges must not be move-category edit buttons');
});

test('phase scores retain the reveal animation and finish with the exact score and category color', t => {
  const a = review(t), doc = a.dom.window.document, frames = new Map(); let id = 0;
  a.context.requestAnimationFrame = callback => {frames.set(++id,callback);return id;};
  a.context.cancelAnimationFrame = key => frames.delete(key);
  const tick = time => {const calls=[...frames.values()];frames.clear();calls.forEach(fn=>fn(time));};
  a.state.settings.moveAnim = true; a.state.batchGen++; a.call('renderStats');
  const cell = doc.querySelector('[data-phase="middlegame"] .phase-report-cell');
  assert.equal(cell.dataset.phaseCategory, 'blunder');
  assert.equal(cell.querySelector('.phase-report-score .acc-reveal-ink').textContent, '0.0%');
  assert.equal(cell.querySelector('.phase-category-label'), null);
  tick(0); tick(300);
  const halfway = parseFloat(cell.querySelector('.phase-report-score .acc-reveal-ink').textContent);
  assert.ok(halfway > 0 && halfway < 42.5);
  tick(1200);
  assert.equal(cell.querySelector('.phase-report-score').textContent, '42.5%');
  assert.equal(cell.dataset.phaseCategory, 'blunder');
});
