import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';
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

test('compact lines preserve the original scores and complete move order, including Black move numbers', t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.settings.engineLines = 2;
  a.call('renderEngine', [line(), line(-21, 'd2d4 d7d5')]);
  assert.equal(doc.querySelector('.engine-focus-token strong').textContent, 'e4');
  assert.equal(doc.querySelector('.engine-focus-variation').textContent.trim(), '1. e4 e5 2. Nf3 Nc6');
  assert.deepEqual([...doc.querySelectorAll('.engine-focus-eval')].map(n => n.textContent), ['+0.42', '-0.21']);
  assert.equal(doc.querySelector('.engine-focus-candidate').firstElementChild.textContent, '+0.42');
  let played;
  a.replace('playLine', pv => { played = pv; });
  doc.querySelectorAll('.engine-focus-candidate')[1].click();
  assert.equal(played, 'd2d4 d7d5');
  a.state.idx = 1;
  a.call('renderEngine', [{score: {mate: 3}, pv: 'e7e5'}]);
  assert.equal(doc.querySelector('.engine-focus-variation').textContent.trim(), '1… e5');
  assert.equal(doc.querySelector('.engine-focus-eval').textContent, '#-3');
  assert.match(doc.querySelector('.engine-focus-candidate').getAttribute('aria-label'), /Black can force mate in 3/);
});

test('line counts still use Engine settings without reanalyzing the game, and variations support keyboard focus', async t => {
  const a = review(t), doc = a.dom.window.document;
  a.replace('scheduleReanalyze', () => { throw Error('Line counts must not reanalyze'); });
  a.state.bests[0].lines = [line(), line(21, 'd2d4 d7d5'), line(10, 'g1f3 d7d5')];
  const baseline = JSON.stringify({positions: a.state.positions, evals: a.state.evals, bests: a.state.bests, idx: a.state.idx});
  await a.call('setEngineSetting', 'engineLines', 3);
  assert.equal(doc.querySelectorAll('.engine-focus-candidate').length, 3);
  assert.equal(a.store.settings.engineLines, 3);
  assert.equal(JSON.stringify({positions: a.state.positions, evals: a.state.evals, bests: a.state.bests, idx: a.state.idx}), baseline);
  const candidate = doc.querySelector('.engine-focus-candidate');
  candidate.focus();
  assert.equal(candidate.tabIndex, 0);
  const event = new a.dom.window.KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
  candidate.dispatchEvent(event);
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
