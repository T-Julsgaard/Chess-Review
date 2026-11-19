import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';

async function review(t) {
  const a = app(t);
  loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  Object.defineProperties(a.dom.window, {
    innerWidth: {value: 1920, configurable: true},
    innerHeight: {value: 919, configurable: true},
  });
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  await a.call('applyUiSetup', 'modern');
  // jsdom has no layout measurements; supply the height a rendered panel needs.
  a.replace('engineContentHeight', () => 40 + a.state.settings.engineLines * 22);
  return a;
}

test('Engine keeps its original slot by default and fitting can be switched on and off live', async t => {
  const a = await review(t), S = a.state;
  const original = a.call('referenceLayout');
  a.replace('scheduleReanalyze', () => { throw Error('Panel sizing must not reanalyze'); });
  for (const count of [1, 2, 3]) {
    S.settings.engineLines = count;
    a.call('renderEngineCurrent');
    assert.deepEqual(a.call('referenceLayout'), original);
  }
  S.settings.engineLines = 1;
  a.call('renderEngineCurrent');
  await a.call('setSetting', 'engineAutoHeight', true);
  const fitted = a.call('referenceLayout');
  assert.ok(fitted.engine.h < original.engine.h);
  assert.ok(fitted.accuracy.h > original.accuracy.h);
  assert.equal(fitted.engine.y + fitted.engine.h, original.engine.y + original.engine.h);
  assert.equal(a.store.settings.engineAutoHeight, true);
  S.settings.engineLines = 3;
  a.call('renderEngineCurrent');
  assert.ok(a.call('referenceLayout').engine.h > fitted.engine.h);
  await a.call('setSetting', 'engineAutoHeight', false);
  assert.deepEqual(a.call('referenceLayout'), original);
  assert.equal(S._engineFit, 0);
  assert.equal(a.store.settings.engineAutoHeight, false);
});

test('Tabs places the default-off fitting control directly below Engine and visual reset restores it', async t => {
  const a = await review(t), doc = a.dom.window.document;
  a.call('toggleSettings');
  const tabs = [...doc.querySelectorAll('.set-section')].find(n => n.querySelector('.set-sect-head').textContent === 'Tabs');
  const off = tabs.querySelector('[data-setting="engineAutoHeight"][data-value="false"]');
  assert.ok(off.classList.contains('on'));
  assert.match(off.closest('.set-row').previousElementSibling.textContent, /Engine/);
  tabs.querySelector('[data-setting="engineAutoHeight"][data-value="true"]').click();
  await settle(); await a.run('_settingsWriteQueue');
  assert.equal(a.state.settings.engineAutoHeight, true);
  await a.call('resetVisualSettings');
  assert.equal(a.state.settings.engineAutoHeight, false);
  assert.equal(a.store.settings.engineAutoHeight, false);
  assert.equal(a.state._engineFit, 0);
});

test('existing settings use fixed height and an explicit fitting choice survives reload', async t => {
  for (const saved of [undefined, true, false]) {
    const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
    a.replace('resetSettingsForRelease', async () => {});
    a.store.settings = {engineLines: 2, ...(saved === undefined ? {} : {engineAutoHeight: saved})};
    await a.start();
    assert.equal(a.state.settings.engineAutoHeight, saved === true);
  }
});

test('custom canvases use the old minimum by default and only borrow from Accuracy when fitting is enabled', async t => {
  const a = await review(t), S = a.state;
  S.layout.engine.x += 24;
  S.layout.engine.h = 50;
  const custom = structuredClone(S.layout);
  a.call('fitEnginePanel');
  assert.equal(S.layout.engine.h, 128 * S.layout.engine.scale);
  assert.deepEqual(S.layout.accuracy, custom.accuracy);
  assert.equal(S.layout.engine.y, custom.engine.y);

  S.layout = structuredClone(custom);
  S.settings.engineAutoHeight = true;
  const bottom = S.layout.engine.y + S.layout.engine.h;
  a.call('fitEnginePanel');
  assert.ok(S.layout.engine.h < 128 * S.layout.engine.scale);
  assert.ok(S.layout.accuracy.h < custom.accuracy.h);
  assert.equal(S.layout.engine.y + S.layout.engine.h, bottom);
});
