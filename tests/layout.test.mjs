import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {app,loadGame,settle} from './helpers/app.mjs';
const exportedLayout=JSON.parse(fs.readFileSync(new URL('./fixtures/default-panel-layout.json',import.meta.url),'utf8'));

function layout(t,initialZoom=1) {
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  let zoom=initialZoom,width=1920,height=920;
  const viewport=(w,h)=>{width=w;height=h;sync();};
  const sync=()=>{for(const [key,value]of [['innerWidth',Math.round(width/zoom)],['innerHeight',Math.round(height/zoom)]]){Object.defineProperty(a.dom.window,key,{value,configurable:true});a.context[key]=value;}};
  sync();const changes=[];
  a.context.browserAPI.tabs={getCurrent:async()=>({id:7}),setZoomSettings:async()=>{},getZoom:async()=>zoom,
    setZoom:async(id,value)=>{assert.equal(id,7);changes.push(value);zoom=value;sync();}};
  return {...a,viewport,changes,zoom:()=>zoom};
}

for(const [width,height]of [[1920,1080],[1366,768],[1536,864],[1280,720],[2560,1440],[1536,960],[1280,800],[1470,956],[1440,900],[1600,900],[3840,2160],[3440,1440],[820,1180],[390,844],[320,568]]) {
  test(width+' × '+height+' uses 100% browser zoom through open, resize and reset',async t=>{
    const a=layout(t,.87);
    for(const chromeHeight of [0,120,160]){
      a.viewport(width,height-chromeHeight);await a.call('initTabZoom');
      assert.equal(a.zoom(),1);assert.deepEqual(structuredClone(a.run('_fittedDip')),{w:width,h:height-chromeHeight});
      assert.equal(a.dom.window.document.querySelector('.stage').style.transform,'');
      a.call('fitViewport');await a.call('resetLayout');assert.equal(a.zoom(),1);
    }
    assert.deepEqual(a.changes,[1]);
  });
}

test('simultaneous startup shares zoom normalization and resizing respects manual zoom',async t=>{
  const a=layout(t,.85);let scopes=0;
  a.context.browserAPI.tabs.setZoomSettings=async()=>{scopes++;await settle();};
  await Promise.all([a.call('initTabZoom'),a.call('initTabZoom'),a.call('initTabZoom')]);
  assert.equal(scopes,1);assert.deepEqual(a.changes,[1]);
  await a.context.browserAPI.tabs.setZoom(7,1.25);
  a.viewport(1280,800);a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
  assert.equal(a.zoom(),1.25,'Window resize must preserve an accessibility zoom choice');
  await a.call('resetLayout');assert.equal(a.zoom(),1);
});

test('missing or failed tab zoom APIs do not prevent responsive layout or later retries',async t=>{
  const a=layout(t,.87),tabs=a.context.browserAPI.tabs;
  const setZoom=tabs.setZoom;tabs.setZoom=async()=>{throw Error('Temporary error');};
  await a.call('initTabZoom');assert.equal(a.dom.window.document.querySelector('.stage').style.minWidth,'');
  tabs.setZoom=setZoom;await a.call('initTabZoom');assert.equal(a.zoom(),1);
  a.context.browserAPI.tabs=undefined;a.viewport(390,844);await a.call('initTabZoom');
  assert.deepEqual(structuredClone(a.run('_fittedDip')),{w:390,h:844});
});

test('custom geometry fits inside its own canvas while browser zoom remains 100%',async t=>{
  const a=layout(t,.61);a.state.layoutMode='custom';const before=structuredClone(a.state.layout);
  for(const [width,height]of [[1920,920],[1366,648],[1280,560],[768,900],[390,844]]){
    a.viewport(width,height);a.call('applyLayoutMode');await a.call('initTabZoom');
    const size=a.call('layoutPageSize',a.state.layout),scale=a.run('canvasScale');
    assert.equal(a.zoom(),1);assert.ok(size.pageW*scale<=width);assert.ok((size.pageH-52)*scale<=height-52);
    assert.deepEqual(a.state.layout,before,'Fitting must never rewrite saved panel data');
  }
  await a.call('resetLayout');
  assert.equal(a.dom.window.document.querySelector('.stage').style.transform,'');
  assert.equal(a.dom.window.document.querySelector('.review-viewport').style.height,'');
});

test('custom drag converts screen deltas into canvas coordinates at the fitted scale',async t=>{
  const a=layout(t);a.viewport(1280,720);a.state.layoutMode='custom';a.call('applyLayoutMode');a.call('toggleReorganize');
  const scale=a.run('canvasScale'),start=a.state.layout.moves.x;
  const handle=a.dom.window.document.querySelector('[data-mod=moves] .mod-handle');
  const event=(target,type,x)=>{const e=new a.dom.window.MouseEvent(type,{bubbles:true,clientX:x,clientY:0,button:0});Object.defineProperty(e,'pointerId',{value:1});target.dispatchEvent(e);};
  event(handle,'pointerdown',0);event(a.dom.window,'pointermove',100*scale);event(a.dom.window,'pointerup',100*scale);
  assert.ok(Math.abs(a.state.layout.moves.x-a.call('snapGrid',start+100))<1e-8);
});

test('small saved canvases keep their own bounds and do not upscale',async t=>{
  const a=layout(t);a.state.layoutMode='custom';a.state.layout={board:{x:36,y:0,w:640,h:760}};
  a.viewport(1920,1080);a.call('applyLayoutMode');await a.call('initTabZoom');
  assert.equal(a.run('canvasScale'),1);assert.equal(a.dom.window.document.querySelector('.stage').style.width,'688px');
});

test('native Engine uses scrolling, and custom Engine respects its content scale and resize floor',async t=>{
  const a=layout(t);a.viewport(1366,768);await a.call('initTabZoom');const mod=a.dom.window.document.querySelector('[data-mod=engine]');
  Object.defineProperty(mod.querySelector('.engine-body'),'scrollHeight',{configurable:true,value:1000});
  const height=mod.style.height;
  a.call('fitEnginePanel');assert.equal(mod.style.minHeight,'');assert.equal(mod.style.height,height,'Long engine content scrolls without growing the fitted panel');
  a.state.layoutMode='custom';a.state.layout.engine.h=20;a.call('applyLayoutMode');
  assert.equal(a.state.layout.engine.h,120*a.state.layout.engine.scale);
});

test('settings remains right aligned through visual and layout resets',async t=>{
  const a=layout(t);a.viewport(1920,920);a.call('toggleSettings');
  const settings=a.dom.window.document.getElementById('settings');assert.equal(settings.style.right,'24px');
  await a.call('resetVisualSettings');await a.call('resetLayout');assert.equal(settings.style.right,'24px');
  a.viewport(390,844);a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));assert.equal(settings.style.right,'');
});

test('native commentary sizing migrates the old default once and preserves later choices',async t=>{
  const a=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease',async()=>{});
  a.store.settings={insightFont:18,depthBumped:true,coachPlain:true};
  await a.start();
  assert.equal(a.state.settings.insightFont,16);
  assert.equal(a.store.settings.nativeSizingVersion,1);
  a.store.settings.insightFont=18;
  await a.start();
  assert.equal(a.state.settings.insightFont,18,'A deliberate later font choice must survive reopening');
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

test('Reset starts saving defaults immediately and completes only after storage confirms them', async t => {
  const a = layout(t); a.viewport(1920, 920); await a.call('initTabZoom');
  a.state.layoutMode = 'custom';
  a.state.layout.board.x += 100;
  a.call('saveLayout'); // A pending drag save must not overwrite the reset later.
  let requested, confirm;
  const saved = new Promise(resolve => { confirm = resolve; });
  a.context.browserAPI.storage.local.set = values => { requested = structuredClone(values); return saved; };
  let completed = false;
  const reset = a.call('resetLayout').then(() => { completed = true; });
  assert.deepEqual(requested.layout, exportedLayout.layout, 'Reload must not race a debounced save');
  assert.equal(requested.layoutMode, 'auto');
  assert.equal(requested.layoutVersion, a.run('LAYOUT_VERSION'));
  await settle();
  assert.equal(completed, false, 'Reset must wait for durable storage');
  confirm(); await reset;
  assert.equal(completed, true);
});
