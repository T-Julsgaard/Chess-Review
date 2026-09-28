import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, settle } from './helpers/app.mjs';

function layout(t) {
  const a = app(t); loadGame(a, '1. e4 e5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  let zoom = 1;
  const changes = [];
  a.context.browserAPI.tabs = {
    getCurrent: async () => ({ id: 7 }),
    getZoomSettings: async () => ({ defaultZoomFactor: 1 }),
    setZoomSettings: async () => {},
    getZoom: async () => zoom,
    setZoom: async (id, value) => { assert.equal(id, 7); changes.push(value); zoom = value; },
  };
  const viewport = (w, h) => {
    a.context.innerWidth = Math.round(w / zoom);
    a.context.innerHeight = Math.round(h / zoom);
  };
  return { ...a, viewport, changes, zoom: () => zoom,
    desktop: () => a.dom.window.document.querySelector('.stage').classList.contains('desktop-layout') };
}

test('Full HD retains the original scale without drifting on reopen or a zoom resize event', async t => {
  const a = layout(t); a.viewport(1920, 920);
  await a.call('initTabZoom');
  assert.equal(a.zoom(), .9); assert.equal(a.desktop(), true);
  a.viewport(1920, 920); await a.call('fitTabZoom');
  await a.call('initTabZoom');
  assert.deepEqual(a.changes, [.9]);
});

test('desktop fits laptop windows, then restores the responsive layout when narrowed', async t => {
  const a = layout(t); a.viewport(1920, 920); await a.call('initTabZoom');
  for (const [w,h] of [[1366,648], [1536,744], [1280,600], [2560,1320]]) {
    a.viewport(w,h); await a.call('fitTabZoom');
    assert.equal(a.desktop(), true);
    assert.ok(1832 * a.zoom() <= w && 1020 * a.zoom() <= h);
  }
  a.viewport(768,900); await a.call('fitTabZoom');
  assert.equal(a.desktop(), false); assert.equal(a.zoom(),1);
  a.viewport(1920,920); await a.call('fitTabZoom');
  assert.equal(a.desktop(),true); assert.equal(a.zoom(),.9);
});

test('custom layouts keep their own geometry and fitting', async t => {
  const a=layout(t); a.state.layoutMode='custom';
  a.state.layout={board:{x:40,y:0,w:800,h:920},moves:{x:880,y:60,w:320,h:500}};
  const before=structuredClone(a.state.layout);
  a.call('applyLayoutMode'); a.viewport(1280,720); await a.call('initTabZoom');
  assert.equal(a.desktop(),false); assert.deepEqual(a.state.layout,before);
  assert.equal(a.zoom(),a.call('targetZoomFor',1280,720));
});

test('Stockfish 18 NNUE is selected by default and listed first', t => {
  const a=layout(t); assert.equal(a.state.settings.enginePath,'nnue');
  a.state.settingsTab='engine'; a.call('renderSettings');
  const buttons=[...a.dom.window.document.querySelectorAll('#settings .set-seg button')];
  const first=buttons.findIndex(b=>b.textContent==='Stockfish 18 NNUE');
  assert.ok(first>=0); assert.equal(buttons[first].classList.contains('on'),true);
  assert.equal(buttons[first+1].textContent,'Stockfish 19');
});

test('desktop matches the saved canvas geometry and preserves the gap when accuracy collapses', async t => {
  const a = layout(t);
  // Model the rendered category rows; jsdom has no layout engine.
  Object.defineProperty(a.dom.window.HTMLElement.prototype, 'offsetHeight', {
    configurable: true, get() { return this.classList.contains('qbreak-row') ? 22 : 0; },
  });
  a.context.getComputedStyle = () => ({ rowGap: '7px' });
  const mod = key => a.dom.window.document.querySelector(`[data-mod="${key}"]`).style;
  const geometry = () => Object.fromEntries(['accuracy', 'engine', 'graph', 'evalbar'].map(key => {
    const s = mod(key); return [key, [s.left, s.top, s.width, s.height]];
  }));
  a.state.layoutMode = 'custom'; a.call('applyLayoutMode'); a.call('reflowAccuracy', false);
  const savedCanvas = geometry();
  assert.deepEqual(savedCanvas.engine, ['1512px', '622px', '294px', '158px']);
  assert.deepEqual(savedCanvas.accuracy, ['1510px', '216px', '294px', '390px']);
  a.state.layoutMode = 'auto'; a.call('applyLayoutMode');
  a.viewport(1920, 920); await a.call('initTabZoom');
  assert.deepEqual(geometry(), savedCanvas);
  for (let i = 0; i < 3; i++) {
    a.state.qbreakExpanded = true; a.call('renderStats');
    assert.equal(mod('accuracy').height, '506px'); assert.equal(mod('engine').top, '738px');
    a.state.qbreakExpanded = false; a.call('renderStats');
    assert.deepEqual(geometry(), savedCanvas);
  }
  a.viewport(768, 900); await a.call('fitTabZoom');
  assert.equal(mod('engine').top, ''); assert.equal(mod('accuracy').height, '');
  a.viewport(1920, 920); await a.call('fitTabZoom');
  assert.deepEqual(geometry(), savedCanvas);
});

test('Reorganize preserves exact desktop boxes and zoom through repeated resets', async t => {
  const a = layout(t);
  Object.defineProperty(a.dom.window.HTMLElement.prototype, 'offsetHeight', {
    configurable: true, get() { return this.classList.contains('qbreak-row') ? 22 : 0; },
  });
  a.context.getComputedStyle = () => ({ rowGap: '7px' });
  const stage = a.dom.window.document.querySelector('.stage');
  stage.getBoundingClientRect = () => ({ left: 0, top: 60 });
  const mods = [...stage.querySelectorAll('.mod')];
  // Real browser zoom rounds rendered boxes slightly below their CSS dimensions.
  for (const mod of mods) mod.getBoundingClientRect = () => ({
    left: parseFloat(mod.style.left) - .007,
    top: 60 + parseFloat(mod.style.top) - .007,
    width: parseFloat(mod.style.width) - .007,
    height: parseFloat(mod.style.height) - .007,
  });
  const geometry = () => mods.map(m => [m.style.left, m.style.top, m.style.width, m.style.height]);
  a.viewport(1920, 920); await a.call('initTabZoom'); a.viewport(1920, 920);
  const defaults = structuredClone(a.state.layout);
  for (const expanded of [false, true, false]) {
    a.state.qbreakExpanded = expanded; a.call('renderStats');
    const before = geometry();
    a.call('toggleReorganize'); await settle();
    assert.deepEqual(geometry(), before);
    assert.equal(a.zoom(), .9);
    assert.deepEqual(structuredClone(a.call('layoutForSave')), defaults);
    a.call('resetLayout'); await settle();
    assert.deepEqual(geometry(), before);
    assert.equal(a.zoom(), .9);
    assert.equal(a.state.reorganize, false);
  }
  assert.deepEqual(a.changes, [.9]);
});

test('settings follows the panels after reset and stays within narrow windows', async t => {
  const a = layout(t);
  const settings = a.dom.window.document.getElementById('settings');
  const panel = a.dom.window.document.querySelector('[data-mod="engine"]');
  let edge = 1700;
  panel.getBoundingClientRect = () => ({ right: edge, width: 294, height: 158 });
  settings.getBoundingClientRect = () => ({ width: 286 });
  a.dom.window.innerWidth = 2200;
  a.call('toggleSettings');
  assert.equal(settings.style.right, '198px');
  edge = 1806;
  await a.call('resetVisualSettings');
  assert.equal(settings.style.right, '92px');
  a.dom.window.innerWidth = 1920;
  a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
  assert.equal(settings.style.right, '8px');
  a.dom.window.innerWidth = 500;
  a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
  assert.equal(settings.style.right, '');
});
