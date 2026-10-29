import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {app,loadGame,settle} from './helpers/app.mjs';
const exportedLayout=JSON.parse(fs.readFileSync(new URL('./fixtures/default-panel-layout.json',import.meta.url),'utf8'));

function layout(t,initialZoom=1,effectiveZoom=z=>z) {
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  let zoom=initialZoom,width=1920,height=920;
  const viewport=(w,h)=>{width=w;height=h;sync();};
  const sync=()=>{const scale=effectiveZoom(zoom);for(const [key,value]of [['innerWidth',Math.round(width/scale)],['innerHeight',Math.round(height/scale)],['devicePixelRatio',scale]]){Object.defineProperty(a.dom.window,key,{value,configurable:true});a.context[key]=value;}};
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

test('Firefox quantized zoom stays stable through refits, viewport changes and reset',async t=>{
  const effectiveZoom=z=>60/Math.round(60/z);
  const a=layout(t,.59,effectiveZoom);
  a.viewport(1100,635);await a.call('initTabZoom');
  assert.equal(a.zoom(),1);assert.deepEqual(a.changes,[1]);
  await a.context.browserAPI.tabs.setZoom(7,.59);
  for(const [width,height]of [[1100,635],[1200,700]]){
    a.viewport(width,height);
    for(let i=0;i<6;i++){
      a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
      a.call('fitViewport');
    }
    assert.equal(a.zoom(),.59);
    assert.deepEqual(a.changes,[1,.59]);
    assert.deepEqual(structuredClone(a.run('_fittedDip')),
      {w:Math.round(width/effectiveZoom(.59)),h:Math.round(height/effectiveZoom(.59))});
  }
  await a.call('resetLayout');
  for(let i=0;i<3;i++)await a.call('initTabZoom');
  assert.equal(a.zoom(),1);assert.deepEqual(a.changes,[1,.59,1]);
  assert.deepEqual(structuredClone(a.run('_fittedDip')),{w:1200,h:700});
});

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

test('opening or reloading at 100% does not reapply tab zoom settings',async t=>{
  const a=layout(t);let scopes=0;
  a.context.browserAPI.tabs.setZoomSettings=async()=>{
    scopes++;
    // Reapplying Chrome's zoom scope can reintroduce an inherited zoom before
    // setZoom restores 100%, producing a notice and two viewport changes.
    await a.context.browserAPI.tabs.setZoom(7,.87);
  };
  for(let i=0;i<3;i++)await a.call('initTabZoom');
  assert.equal(scopes,0,'A native-size tab needs no zoom settings mutation');
  assert.deepEqual(a.changes,[]);
  assert.equal(a.zoom(),1);
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

test('growing a saved canvas reserves the actual toolbar height',t=>{
  const a=layout(t);a.viewport(1920,1080);a.state.layoutMode='custom';
  a.state.layout={board:{x:100,y:0,w:800,h:1000}};
  a.dom.window.document.querySelector('.review-viewport').getBoundingClientRect=()=>({top:62});
  a.call('applyLayoutMode');
  const {pageH}=a.call('layoutPageSize',a.state.layout);
  assert.ok((pageH-52)*a.run('canvasScale')<=1080-62);
});

test('small saved canvases keep their bounds and grow only with extra viewport height',async t=>{
  const a=layout(t);a.state.layoutMode='custom';a.state.layout={board:{x:36,y:0,w:640,h:760}};
  a.viewport(1920,919);a.call('applyLayoutMode');await a.call('initTabZoom');
  assert.equal(a.run('canvasScale'),1);assert.equal(a.dom.window.document.querySelector('.stage').style.width,'688px');
  a.viewport(1920,949);a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
  assert.ok(a.run('canvasScale')>1);assert.equal(a.state.layout.board.w,640);
});

test('live height changes grow and restore both setups without changing saved geometry or browser zoom',async t=>{
  const a=layout(t);await a.call('initTabZoom');
  for(const setup of ['old','modern']){
    a.viewport(1920,919);await a.call('applyUiSetup',setup);
    const saved=JSON.stringify(a.state.layout),stored=JSON.stringify(a.store.layout),writes=a.writes.length;
    const size=()=>{
      const mod=a.dom.window.document.querySelector('[data-mod=board]');
      return parseFloat(mod.style.width)*(setup==='modern'?a.run('canvasScale'):1);
    };
    const before=size();
    for(const [width,height]of [[1920,949],[1920,979],[1600,979],[1920,919]]){
      a.viewport(width,height);a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
      if(width===1920&&height>919)assert.ok(size()>before,'Extra height enlarges '+setup);
      if(height===919)assert.ok(Math.abs(size()-before)<1e-8,'Showing the bar restores the original fit');
      assert.equal(JSON.stringify(a.state.layout),saved);assert.equal(JSON.stringify(a.store.layout),stored);
      assert.equal(a.writes.length,writes);assert.equal(a.zoom(),1);
    }
  }
});

test('native Engine uses scrolling, and custom Engine respects its content scale and resize floor',async t=>{
  const a=layout(t);a.viewport(1366,768);await a.call('initTabZoom');const mod=a.dom.window.document.querySelector('[data-mod=engine]');
  Object.defineProperty(mod.querySelector('.engine-body'),'scrollHeight',{configurable:true,value:1000});
  const height=mod.style.height;
  a.call('fitEnginePanel');assert.equal(mod.style.minHeight,'');assert.equal(mod.style.height,height,'Long engine content scrolls without growing the fitted panel');
  a.state.layoutMode='custom';a.state.layout.engine.h=20;a.call('applyLayoutMode');
  assert.equal(a.state.layout.engine.h,120*a.state.layout.engine.scale);
});

test('Modern adapts to laptop viewports without shrinking the whole canvas or rewriting saved preferences',async t=>{
  const a=layout(t);await a.call('applyUiSetup','modern');
  const saved=JSON.stringify(a.state.layout),stored=JSON.stringify(a.store.layout),writes=a.writes.length;
  for(const [width,height]of [[1920,919],[1920,800],[1536,704],[1280,560],[960,600]]){
    a.viewport(width,height);a.call('fitViewport');
    const canvas=a.dom.window.document.querySelector('.stage');
    assert.equal(a.call('isResponsiveModern'),true);
    assert.equal(canvas.classList.contains('auto'),true);assert.equal(canvas.classList.contains('canvas'),false);
    assert.equal(canvas.style.transform,'');assert.equal(a.run('canvasScale'),1);
    assert.equal(JSON.stringify(a.state.layout),saved);assert.equal(JSON.stringify(a.store.layout),stored);
    assert.equal(a.writes.length,writes);assert.equal(a.zoom(),1);
  }
  a.state.layout.moves.x+=16;a.call('applyLayoutMode');
  assert.equal(a.call('isResponsiveModern'),false,'An edited arrangement retains the free-canvas behavior');
  assert.equal(a.dom.window.document.querySelector('.stage').classList.contains('canvas'),true);
});

test('editing a laptop Modern layout freezes its displayed geometry only for a completed gesture',async t=>{
  const a=layout(t);a.viewport(1536,704);await a.call('applyUiSetup','modern');a.call('toggleReorganize');
  const before=structuredClone(a.state.layout),doc=a.dom.window.document,win=a.dom.window;
  const mod=doc.querySelector('[data-mod=moves]'),handle=mod.querySelector('.mod-handle');
  const left=parseFloat(mod.style.left);
  const event=(target,type,x,y)=>{const e=new win.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});Object.defineProperty(e,'pointerId',{value:7});target.dispatchEvent(e);};
  for(const end of ['pointerup','pointercancel']){
    event(handle,'pointerdown',0,0);
    if(end==='pointercancel')event(win,'pointermove',48,32);
    event(win,end,0,0);
    assert.deepEqual(a.state.layout,before);assert.equal(a.state.settings.uiSetup,'modern');
    assert.equal(a.call('isResponsiveModern'),true);
    assert.equal(parseFloat(mod.style.left),left);
  }
  event(handle,'pointerdown',0,0);event(win,'pointermove',48,32);event(win,'pointerup',48,32);
  await a.run('_settingsWriteQueue');await a.call('saveLayout',true);
  assert.equal(a.state.settings.uiSetup,'custom');assert.equal(a.state.settings.uiSetupBase,'modern');
  assert.equal(a.call('isResponsiveModern'),false);
  assert.equal(parseFloat(mod.style.left),a.call('snapGrid',left+48));
  assert.equal(a.store.layout.moves.x,a.state.layout.moves.x);
});

test('settings remains right aligned through visual and layout resets',async t=>{
  const a=layout(t);a.viewport(1920,920);a.call('toggleSettings');
  const settings=a.dom.window.document.getElementById('settings');
  const inset=()=>parseFloat(settings.style.right)*parseFloat(settings.style.getPropertyValue('--settings-scale'));
  assert.equal(inset(),24);
  await a.call('resetVisualSettings');await a.call('resetLayout');assert.equal(inset(),24);
  a.viewport(390,844);a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));assert.equal(settings.style.right,'');
});

test('settings fits the remaining panel gutter when the bookmarks bar is hidden',t=>{
  const a=layout(t),document=a.dom.window.document,settings=document.getElementById('settings');
  // Simulate the browser's zoom-aware popover measurements. The production panel
  // geometry still comes from the real layout and custom-canvas fitting code.
  const scale=()=>parseFloat(settings.style.getPropertyValue('--settings-scale'))||1;
  settings.getBoundingClientRect=()=>({width:256*scale()});
  const computed=a.context.getComputedStyle;
  a.context.getComputedStyle=node=>node===settings?{zoom:String(scale())}:computed(node);
  for(const mod of document.querySelectorAll('.stage .mod'))mod.getBoundingClientRect=()=>({
    right:parseFloat(mod.style.left)+parseFloat(mod.style.width),
  });
  a.call('toggleSettings');
  for(const height of [919,949,979,919]){
    a.viewport(1920,height);a.call('applyLayoutMode');a.call('positionSettings');
    const right=Math.max(...[...document.querySelectorAll('.stage .mod')].map(mod=>mod.getBoundingClientRect().right));
    assert.ok(1920-24-256*scale()>=right+11.99,'Settings stays clear of the review panels');
    if(height>919)assert.ok(scale()<1,'Settings shrinks as the review panels grow');
    else assert.equal(scale(),1,'Showing bookmarks restores the original settings size');
  }
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
