import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';
import {panelDesign} from '../lib/panel-designs.js';

const line = (cp = 42, pv = 'e2e4 e7e5 g1f3 b8c6') => ({score: {cp}, pv, depth: 12, multipv: 1});
function review(t) {
  const a = app(t);
  loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI');
  a.state.settings.engineDesign = 'focus';
  a.state.bests[0].lines = [line()];
  a.replace('requestPanelLines', () => {});
  a.call('renderEngineCurrent');
  return a;
}

test('Focus is selectable under Visual > Tabs, saves, and switches without changing analysis', async t => {
  const a = review(t), doc = a.dom.window.document, S = a.state;
  const before = JSON.stringify({positions: S.positions, bests: S.bests, evals: S.evals, idx: S.idx, layout: S.layout});
  a.replace('scheduleReanalyze', () => { throw Error('Design changes must not reanalyze'); });
  await a.call('toggleSettings');
  [...doc.querySelectorAll('.set-sect-head')].find(n => n.textContent === 'Tabs').click();
  assert.deepEqual([...doc.querySelectorAll('[data-setting="engineDesign"]')].map(n => n.textContent), ['Original', 'Focus']);
  await a.call('setSetting', 'engineDesign', 'original');
  assert.equal(doc.querySelector('.engine-focus'), null);
  await a.call('setSetting', 'engineDesign', 'focus');
  assert.ok(doc.querySelector('.engine-focus'));
  assert.equal(a.store.settings.engineDesign, 'focus');
  assert.equal(JSON.stringify({positions: S.positions, bests: S.bests, evals: S.evals, idx: S.idx, layout: S.layout}), before);
  assert.equal(panelDesign('engine', {engineDesign: 'unknown'}), 'original');
});

test('recommended move, continuation, White-relative scores and variation actions stay aligned', t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.settings.engineLines = 2;
  a.call('renderEngine', [line(), line(-21, 'd2d4 d7d5')]);
  assert.equal(doc.querySelector('.engine-focus-move strong').textContent, 'e4');
  assert.equal(doc.querySelector('.engine-focus-continuation').textContent, 'e5 2. Nf3 Nc6');
  assert.deepEqual([...doc.querySelectorAll('.engine-focus-eval')].map(n => n.textContent), ['+0.42', '-0.21']);
  assert.equal(doc.querySelectorAll('.recommended').length, 1);
  let played;
  a.replace('playLine', pv => { played = pv; });
  doc.querySelectorAll('.engine-focus-candidate')[1].click();
  assert.equal(played, 'd2d4 d7d5');
  a.state.idx = 1;
  a.call('renderEngine', [{score: {mate: 3}, pv: 'e7e5'}]);
  assert.match(doc.querySelector('.engine-focus-turn').textContent, /Black/);
  assert.equal(doc.querySelector('.engine-focus-eval').textContent, '#-3');
  assert.match(doc.querySelector('.engine-focus-candidate').getAttribute('aria-label'), /Black can force mate in 3/);
});

test('inline line count uses the existing on-demand setting and keeps focus without reanalyzing', async t => {
  const a = review(t), doc = a.dom.window.document;
  let requested;
  a.replace('setEngineSetting', async (key, value) => {
    requested = [key, value]; a.state.settings[key] = value; a.call('renderEngineCurrent');
  });
  doc.querySelector('[aria-label="Show 3 engine lines"]').click(); await settle();
  assert.deepEqual(requested, ['engineLines', 3]);
  assert.equal(doc.querySelector('[aria-pressed="true"]').textContent, '3');
  assert.equal(doc.activeElement.getAttribute('aria-label'), 'Show 3 engine lines');
  const event = new a.dom.window.KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
  doc.activeElement.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
});

test('loading, terminal, error and practice states do not expose an actionable stale variation', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const input of [null, []]) {
    a.state._lastEngineLines = null; a.call('renderEngine', input);
    assert.equal(doc.querySelector('.engine-focus-play').disabled, true);
    assert.equal(doc.querySelector('.engine-focus-candidate'), null);
  }
  a.call('renderEngine', [line()]);
  a.call('renderEngine', []);
  assert.equal(doc.querySelector('.engine-focus-play').disabled, true);
  a.state.analysisMode = true; a.state.liveError = 'Engine unavailable';
  a.call('renderEngine', null);
  assert.match(doc.querySelector('.engine-focus').textContent, /Engine unavailable/);
  assert.equal(doc.querySelector('.engine-focus-play').disabled, true);
  a.call('renderEnginePractice');
  assert.equal(doc.querySelector('.engine-focus-candidate'), null);
  assert.ok([...doc.querySelectorAll('.engine-focus button')].every(n => n.disabled));
  assert.match(doc.querySelector('.engine-focus').textContent, /hidden until you solve/);
});

test('auto-play can start and stop, and saved Focus survives startup in an empty workspace', async t => {
  const a = review(t), doc = a.dom.window.document;
  let starts = 0, stops = 0;
  a.replace('playBestMoves', () => { starts++; });
  a.replace('stopBestWalk', () => { stops++; a.state.bestWalking = false; });
  doc.querySelector('.engine-focus-play').click(); assert.equal(starts, 1);
  a.state.bestWalking = true; a.call('renderEngine', null);
  assert.equal(doc.querySelector('.engine-focus-play').disabled, false);
  doc.querySelector('.engine-focus-play').click(); assert.equal(stops, 1);
  const b = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  b.replace('resetSettingsForRelease', async () => {});
  b.store.settings = {engineDesign: 'focus'};
  await b.start();
  assert.ok(b.dom.window.document.querySelector('.engine-focus'));
  assert.match(b.dom.window.document.querySelector('.engine-focus').textContent, /Load a game/);
  assert.equal(b.dom.window.document.querySelector('.engine-focus-play').disabled, true);
  await b.call('resetVisualSettings');
  assert.equal(b.store.settings.engineDesign, 'original');
  assert.equal(b.dom.window.document.querySelector('.engine-focus'), null);
});
