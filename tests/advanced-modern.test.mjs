import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.state.settings.accuracyDesign = 'phases-modern';
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Modern Advanced shares the overview header and provides eighteen larger comparisons without meters or hover explanations', t => {
  const a = review(t), doc = a.dom.window.document;
  const header = doc.querySelector('.acc-players').outerHTML;
  const layout = JSON.stringify(a.state.layout);
  a.call('setAccuracyPage', 2);
  assert.equal(doc.querySelector('.acc-players').outerHTML, header);
  assert.ok(doc.querySelector('.acc-page-advanced'));
  assert.equal(doc.querySelectorAll('.advanced-row').length, 18);
  assert.ok([...doc.querySelectorAll('.advanced-pair')].every(n => n.children.length === 2));
  assert.equal(doc.querySelectorAll('.advanced-meter,[data-metric=comeback],.advanced-report [title]').length, 0);
  assert.equal(doc.querySelectorAll('.advanced-info').length, 18);
  assert.equal(doc.querySelectorAll('.advanced-explainer:not([hidden])').length, 0);
  assert.equal(JSON.stringify(a.state.layout), layout);
  assert.match(doc.querySelector('[data-metric=clock]').textContent, /Clock data needed/);
  assert.equal(doc.querySelector('[data-metric=best-five] .acc-stat-value').textContent, '—');
});

test('Modern streak and loss links use their own player evidence and remain keyboard buttons', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const [i, side] of ['w', 'b'].entries()) Object.assign(a.state.gameStats[side], {
    largestLoss: {ply: i + 3, loss: 85}, cleanStreak: {count: 2, startPly: i + 1, endPly: i + 3},
    clock: {advantage: {percent: i ? 25 : 75, ahead: i ? 1 : 3, samples: 4, total: 4}},
  });
  a.call('setAccuracyPage', 2);
  let ply; a.replace('gotoMainline', n => { ply = n; });
  const streaks = doc.querySelectorAll('[data-metric=streak] .advanced-value');
  streaks[0].click(); assert.equal(ply, 1);
  streaks[1].click(); assert.equal(ply, 2);
  doc.querySelector('[data-metric=largest] button.advanced-value').click(); assert.equal(ply, 3);
  assert.equal(doc.querySelector('[data-metric=clock] .acc-stat-value').textContent, '75%');
  a.state.meSide = 'b'; a.call('renderStats');
  assert.equal(doc.querySelector('[data-metric=clock] .acc-stat-value').textContent, '25%');
  assert.match(doc.querySelector('[data-metric=clock] .advanced-value').getAttribute('aria-label'), /Black/);
  a.state.analyzing = true; a.call('renderStats');
  assert.ok([...doc.querySelectorAll('.advanced-report .acc-stat-value')].every(n => n.querySelector('.ld')));
  assert.equal(doc.querySelector('.advanced-report button.advanced-value'), null);
  a.state.analyzing = false; a.call('renderStats');
  assert.ok(doc.querySelector('[data-metric=streak] button.advanced-value'));
});

test('each info button toggles a linked plain-language explainer, only one opens, and Escape closes with focus restored', t => {
  const a = review(t), doc = a.dom.window.document;
  a.call('setAccuracyPage', 2);
  const buttons = [...doc.querySelectorAll('.advanced-info')];
  for (const button of buttons) {
    const panel = doc.getElementById(button.getAttribute('aria-controls'));
    assert.ok(panel.textContent.length > 40);
    button.click();
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(panel.hidden, false);
    assert.equal(doc.querySelectorAll('.advanced-explainer:not([hidden])').length, 1);
  }
  buttons.at(-1).dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  assert.equal(doc.querySelectorAll('.advanced-explainer:not([hidden])').length, 0);
  assert.equal(doc.activeElement, buttons.at(-1));
  buttons[0].click(); buttons[0].click();
  assert.equal(buttons[0].getAttribute('aria-expanded'), 'false');
  assert.equal(doc.querySelector('.advanced-report [title]'), null);
  a.call('setAccuracyPage', 0); a.call('setAccuracyPage', 2);
  assert.equal(doc.querySelectorAll('.advanced-explainer:not([hidden])').length, 0);
});
