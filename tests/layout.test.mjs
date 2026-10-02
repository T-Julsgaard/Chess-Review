import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, settle } from './helpers/app.mjs';

function layout(t, initialZoom = 1, defaultZoom = 1) {
  const a = app(t); loadGame(a, '1. e4 e5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  let zoom = initialZoom, size;
  const syncViewport = () => {
    if (!size) return;
    a.context.innerWidth = Math.round(size.w / zoom);
    a.context.innerHeight = Math.round(size.h / zoom);
  };
  const changes = [];
  a.context.browserAPI.tabs = {
    getCurrent: async () => ({ id: 7 }),
    getZoomSettings: async () => ({ defaultZoomFactor: defaultZoom }),
    setZoomSettings: async () => {},
    getZoom: async () => zoom,
    setZoom: async (id, value) => { assert.equal(id, 7); changes.push(value); zoom = value; syncViewport(); },
  };
  const viewport = (w, h) => {
    size = {w, h}; syncViewport();
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

// Reported display resolutions, including 16:9, 16:10, and 1470 × 956.
// Display resolution is not the page viewport: reserve space for browser chrome.
const REPORTED_DISPLAYS = [
  [1920, 1080], [1366, 768], [1536, 864], [1280, 720], [2560, 1440],
  [1536, 960], [1280, 800], [1470, 956], [1440, 900], [1600, 900],
];

for (const [width, height] of REPORTED_DISPLAYS) {
  test(`${width} × ${height} fits automatic and saved layouts with browser chrome`, async t => {
    for (const chromeHeight of [0, 120, 160]) {
      for (const mode of ['auto', 'custom']) {
        const a = layout(t, mode === 'custom' ? 1.25 : .9);
        a.state.layoutMode = mode;
        a.call('applyLayoutMode');
        const viewportHeight = height - chromeHeight;
        a.viewport(width, viewportHeight);
        await a.call('initTabZoom');
        const zoom = a.zoom();
        const page = a.call('layoutPageSize', a.state.layout);
        assert.equal(a.desktop(), mode === 'auto');
        assert.ok(page.pageW * zoom <= width, `${mode}: horizontal overflow`);
        assert.ok(page.pageH * zoom <= viewportHeight, `${mode}: vertical overflow`);
        assert.ok(zoom >= .5 && zoom <= 2, `${mode}: readable zoom bounds`);
        for (let i = 0; i < 2; i++) {
          await a.call('initTabZoom');
          await a.call('resetLayout');
          assert.equal(a.zoom(), zoom, `${mode}: reopen/reset must preserve scale`);
          assert.equal(a.desktop(), true);
        }
      }
    }
  });
}

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
  assert.equal(buttons[first+1].textContent,'Stockfish 19 Lite');
});

test('Honeywood is the default board theme', t => {
  const a = layout(t);
  assert.equal(a.state.settings.boardTheme, 'maple');
});

test('desktop matches the saved canvas geometry and preserves the gap when accuracy collapses', async t => {
  const a = layout(t);
  // Model the rendered category rows; jsdom has no layout engine.
  Object.defineProperty(a.dom.window.HTMLElement.prototype, 'offsetHeight', {
    configurable: true, get() { return this.classList.contains('qbreak-row') ? 22 : 0; },
  });
  a.context.getComputedStyle = () => ({ rowGap: '7px' });
  const mod = key => a.dom.window.document.querySelector(`[data-mod="${key}"]`).style;
  const geometry = () => Object.fromEntries(['accuracy', 'engine', 'graph', 'evalbar', 'review', 'moves', 'controls'].map(key => {
    const s = mod(key); return [key, [s.left, s.top, s.width, s.height]];
  }));
  a.state.layoutMode = 'custom'; a.call('applyLayoutMode'); a.call('reflowAccuracy', false);
  const savedCanvas = geometry();
  assert.deepEqual(savedCanvas.engine, ['1510px', '620px', '294px', '178px']);
  assert.deepEqual(savedCanvas.accuracy, ['1510px', '216px', '294px', '390px']);
  assert.deepEqual(savedCanvas.graph, ['1200px', '620px', '300px', '178px']);
  assert.deepEqual(savedCanvas.review, ['1200px', '60px', '604px', '136px']);
  assert.deepEqual(savedCanvas.moves, ['1200px', '216px', '300px', '390px']);
  assert.deepEqual(savedCanvas.controls, ['1194px', '812px', '310px', '54px']);
  a.state.layoutMode = 'auto'; a.call('applyLayoutMode');
  a.viewport(1920, 920); await a.call('initTabZoom');
  assert.deepEqual(geometry(), savedCanvas);
  for (let i = 0; i < 3; i++) {
    a.state.qbreakExpanded = true; a.call('renderStats');
    assert.equal(mod('accuracy').height, '506px'); assert.equal(mod('engine').top, '736px');
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

test('settings stays right-aligned through visual and layout resets', async t => {
  const a = layout(t);
  const settings = a.dom.window.document.getElementById('settings');
  a.dom.window.innerWidth = 2200;
  a.call('toggleSettings');
  assert.equal(settings.style.right, '24px');
  await a.call('resetVisualSettings');
  assert.equal(settings.style.right, '24px');
  a.call('resetLayout');
  assert.equal(settings.style.right, '24px');
  a.dom.window.innerWidth = 1920;
  a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
  assert.equal(settings.style.right, '24px');
  a.dom.window.innerWidth = 500;
  a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
  assert.equal(settings.style.right, '');
});

test('saved desktop layouts reopen at the reset scale across typical screen sizes', async t => {
  for (const [w, h, initial, expected] of [
    [1280, 600, 1.25, .58], [1366, 648, .91, .63], [1536, 744, 1, .72],
    [1920, 916, .91, .89], [1920, 920, .89, .90],
    [2560, 1320, 1.25, 1.29], [3840, 2040, 2, 1.99],
  ]) {
    const a = layout(t, initial);
    a.state.layoutMode = 'custom'; a.call('applyLayoutMode');
    a.viewport(w, h); await a.call('initTabZoom');
    assert.equal(a.zoom(), expected, `${w} × ${h} saved layout`);
    for (let i = 0; i < 3; i++) {
      await a.call('initTabZoom');
      await a.call('resetLayout');
      assert.equal(a.zoom(), expected, `${w} × ${h} reopen/reset ${i}`);
      assert.equal(a.desktop(), true);
    }
    assert.deepEqual(a.changes, [expected]);
  }
});

test('reset refits automatic layout after manual zoom and concurrent initialization', async t => {
  const a = layout(t, .91); a.viewport(1920, 916);
  let scopes = 0, active = 0;
  const tabs = a.context.browserAPI.tabs;
  const setZoom = tabs.setZoom;
  tabs.setZoomSettings = async () => { scopes++; };
  tabs.setZoom = async (...args) => {
    assert.equal(active++, 0, 'zoom writes must not overlap');
    await settle(); await setZoom(...args); active--;
  };
  await Promise.all([a.call('initTabZoom'), a.call('initTabZoom'), a.call('fitTabZoom')]);
  assert.equal(scopes, 1); assert.deepEqual(a.changes, [.89]);
  await tabs.setZoom(7, .91);
  await a.call('fitTabZoom'); assert.equal(a.zoom(), .91);
  await a.call('resetLayout');
  assert.equal(a.zoom(), .89); assert.equal(scopes, 1);
});

test('failed zoom writes can be retried at the same window size', async t => {
  const a = layout(t); a.viewport(1920, 916);
  const tabs = a.context.browserAPI.tabs, setZoom = tabs.setZoom;
  tabs.setZoom = async () => { throw Error('Temporary tab error'); };
  await a.call('initTabZoom');
  tabs.setZoom = setZoom;
  await a.call('fitTabZoom');
  assert.equal(a.zoom(), .89);
});

test('narrow windows use the browser default zoom, even with a nonstandard default', async t => {
  const a = layout(t, .89, 1.25); a.viewport(1000, 800);
  await a.call('initTabZoom');
  assert.equal(a.desktop(), false); assert.equal(a.zoom(), 1.25);
  a.viewport(1920, 916); await a.call('fitTabZoom');
  assert.equal(a.desktop(), true); assert.equal(a.zoom(), .89);
});

test('small custom canvases retain their own bounds instead of inheriting desktop width', async t => {
  const a = layout(t);
  a.state.layoutMode = 'custom';
  a.state.layout = { board: { x: 36, y: 0, w: 640, h: 760 } };
  a.call('applyLayoutMode'); a.viewport(768, 900);
  await a.call('initTabZoom');
  const stage = a.dom.window.document.querySelector('.stage');
  assert.equal(stage.style.minWidth, '688px');
  assert.equal(stage.style.minHeight, '772px');
  assert.equal(a.zoom(), 1.07);
});

test('Engine grows downward for its contents and cannot be resized below them', async t => {
  const a = layout(t); a.viewport(1920, 916); await a.call('initTabZoom');
  const mod = a.dom.window.document.querySelector('[data-mod="engine"]');
  const head = mod.querySelector('.panel-head'), body = mod.querySelector('.engine-body');
  head.getBoundingClientRect = () => ({ height: 40.5 });
  Object.defineProperty(body, 'scrollHeight', { configurable: true, value: 250 });
  const top = mod.style.top;
  a.call('fitEnginePanel');
  assert.equal(mod.style.height, '296px'); assert.equal(mod.style.top, top);
  a.call('toggleReorganize');
  assert.equal(a.state.layout.engine.h, 296);
  const grip = mod.querySelector('.mod-resize.s');
  const event = (type, y) => new a.dom.window.MouseEvent(type, { clientY: y, bubbles: true });
  grip.dispatchEvent(event('pointerdown', 300));
  grip.dispatchEvent(event('pointermove', 0));
  grip.dispatchEvent(event('pointerup', 0));
  assert.equal(a.state.layout.engine.h, 296);
  assert.equal(mod.style.height, '296px'); assert.equal(mod.style.top, top);
});
