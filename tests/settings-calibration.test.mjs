import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function settings(t) {
  const a = app(t); loadGame(a, '1. e4 e5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.state.settings.engineDepth = 16;
  let searches = 0;
  for (const name of ['resetLiveEngine', 'invalidateVariationEvals', 'renderEngineCurrent']) a.replace(name, () => {});
  a.replace('scheduleReanalyze', () => { searches++; });
  return {...a, searches: () => searches};
}
function choice(a, text) {
  [...a.dom.window.document.querySelectorAll('.calibration-warning button')].find(button => (button.querySelector('.calibration-warning-choice-label')?.textContent || button.textContent) === text).click();
}

test('SF19 selection waits for a warning choice before saving or reanalyzing', async t => {
  const a = settings(t);
  const pending = a.call('setEngineSetting', 'enginePath', 'sf19lite');
  assert.equal(a.state.settings.enginePath, 'nnue'); assert.equal(a.writes.length, 0); assert.equal(a.searches(), 0);
  const dialog = a.dom.window.document.querySelector('[role="alertdialog"]');
  assert.equal(dialog.querySelector('h3').textContent, 'Warning');
  assert.match(dialog.textContent, /less validation/);
  assert.doesNotMatch(dialog.textContent, /moves alone|moves.only/);
  assert.equal(dialog.querySelector('button.recommended .calibration-warning-choice-label').textContent, 'Remain on Stockfish 18');
  assert.equal(dialog.querySelector('button.recommended small').textContent, 'Recommended');
  choice(a, 'Remain on Stockfish 18'); await pending;
  assert.equal(a.state.settings.enginePath, 'nnue'); assert.equal(a.writes.length, 0);
  const accepted = a.call('setEngineSetting', 'enginePath', 'sf19lite');
  choice(a, 'Continue'); await accepted;
  assert.equal(a.store.settings.enginePath, 'sf19lite'); assert.equal(a.searches(), 1);
  assert.equal(a.dom.window.document.querySelector('[role="alertdialog"]'), null);
});

test('SF18 depth warning supports keeping calibration; SF19 depth changes need no warning', async t => {
  const a = settings(t);
  let pending = a.call('setEngineSetting', 'engineDepth', 18);
  const dialog = a.dom.window.document.querySelector('[role="alertdialog"]');
  assert.equal(dialog.querySelector('h3').textContent, 'Warning');
  assert.match(dialog.textContent, /Stockfish 18 NNUE at depth 16/);
  assert.match(dialog.textContent, /less validation/);
  assert.match(dialog.textContent, /less reliable results/);
  assert.doesNotMatch(dialog.textContent, /scores become unavailable|moves.only/);
  assert.equal(dialog.querySelector('button.recommended .calibration-warning-choice-label').textContent, 'Keep depth 16');
  assert.equal(dialog.querySelector('button.recommended small').textContent, 'Recommended');
  assert.equal(a.state.settings.engineDepth, 16); assert.equal(a.writes.length, 0); assert.equal(a.searches(), 0);
  choice(a, 'Keep depth 16'); await pending;
  assert.equal(a.state.settings.engineDepth, 16); assert.equal(a.searches(), 0);
  pending = a.call('setEngineSetting', 'engineDepth', 18); choice(a, 'Continue'); await pending;
  assert.equal(a.store.settings.engineDepth, 18);
  a.state.settings.enginePath = 'sf19lite'; a.state.settings.engineDepth = 16;
  await a.call('setEngineSetting', 'engineDepth', 20);
  assert.equal(a.state.settings.engineDepth, 20); assert.equal(a.dom.window.document.querySelector('.calibration-warning'), null);
});

test('depth dragging previews values and warns only on release', async t => {
  const a = settings(t), doc = a.dom.window.document;
  a.state.settingsTab = 'engine'; a.call('renderSettings');
  const slider = [...doc.querySelectorAll('.set-ctrl')].find(node => node.textContent.includes('Depth')).querySelector('input');
  slider.value = 18; slider.dispatchEvent(new a.dom.window.Event('input'));
  assert.equal(a.state.settings.engineDepth, 16); assert.equal(doc.querySelector('.calibration-warning'), null);
  slider.dispatchEvent(new a.dom.window.Event('change'));
  choice(a, 'Keep depth 16'); await Promise.resolve(); await Promise.resolve();
  assert.equal(Number(slider.value), 16); assert.equal(a.writes.length, 0);
});

test('SF19 explains its effective mode while preserving the SF18 preference', t => {
  const a = settings(t); a.state.settingsTab = 'engine'; a.state.settings.enginePath = 'sf19lite';
  a.state.settings.ratingMode = 'context'; a.call('renderSettings');
  const section = [...a.dom.window.document.querySelectorAll('.set-section')].find(node => node.textContent.includes('Estimated rating'));
  assert.match(section.textContent, /always estimates rating from moves alone/);
  assert.equal(section.querySelector('.dd'), null); assert.equal(a.state.settings.ratingMode, 'context');
});

test('moves-only rating is displayed independently of unavailable accuracy', t => {
  const a = settings(t); a.state.calibrated = {w: {rating: 1624, ratingMethod: 'moves'}};
  assert.equal(a.call('estimateElo', null, null, 'w'), 1600);
});

test('engine settings omit classification controls and preserve existing classification preferences', t => {
  const a = settings(t); a.state.settingsTab = 'engine';
  Object.assign(a.state.settings, {clsClearAdv: 3, clsMistakeLoss: 1.5, clsMissTol: 0.7});
  const before = JSON.stringify({settings: a.state.settings, classif: a.state.classif, grades: a.state.moveGrades});
  a.call('renderSettings');
  assert.deepEqual([...a.dom.window.document.querySelectorAll('#settings .set-sect-head')].map(node => node.textContent), ['Search', 'Estimated rating', 'Engine']);
  assert.equal(JSON.stringify({settings: a.state.settings, classif: a.state.classif, grades: a.state.moveGrades}), before);
});

test('warning traps keyboard focus and Escape reverts without navigating the game', async t => {
  const a = settings(t), doc = a.dom.window.document;
  const pending = a.call('setEngineSetting', 'enginePath', 'sf19lite');
  assert.equal(doc.activeElement.querySelector('.calibration-warning-choice-label').textContent, 'Remain on Stockfish 18');
  doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Tab', bubbles: true}));
  assert.equal(doc.activeElement.textContent, 'Continue');
  const before = a.state.idx;
  doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
  assert.equal(a.state.idx, before);
  doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  await pending; assert.equal(a.state.settings.enginePath, 'nnue');
});
