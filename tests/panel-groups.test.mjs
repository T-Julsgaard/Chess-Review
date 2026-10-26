import test from 'node:test';
import assert from 'node:assert/strict';
import {panelScale,panelGroupBounds,scalePanelGroup,movePanelGroup} from '../lib/panel-layout.js';
import {app,loadGame} from './helpers/app.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} must equal ${b}`);
function setup(t) {
  const a=app(t);Object.defineProperties(a.dom.window,{innerWidth:{value:2206,configurable:true},innerHeight:{value:1100,configurable:true}});loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  a.state.layoutMode='custom';a.call('applyLayoutMode');a.call('toggleReorganize');
  const doc=a.dom.window.document,mod=key=>doc.querySelector(`[data-mod=${key}]`);
  const event=(target,type,x,y,id=1)=>{const e=new a.dom.window.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:id});target.dispatchEvent(e);};
  return {...a,doc,mod,event,select:key=>mod(key).querySelector('.mod-select').click()};
}

test('group scaling preserves positions, shapes, content scale and unselected boxes',()=>{
  const layout={a:{x:100,y:50,w:300,h:200},b:{x:420,y:270,w:200,h:100,scale:.8},board:{x:0,y:0,w:90,h:90}};
  const scaled=scalePanelGroup(layout,['a','b'],1.5);
  assert.deepEqual(panelGroupBounds(scaled,['a','b']),{x:100,y:50,w:780,h:480});
  assert.equal(scaled.board,layout.board);
  for(const key of ['a','b']){
    near(scaled[key].w/layout[key].w,1.5);near(scaled[key].h/layout[key].h,1.5);
    near(scaled[key].w/panelScale(scaled[key]),layout[key].w/panelScale(layout[key]));
  }
  assert.equal(scalePanelGroup(layout,['a','b'],-1).a.scale,.3125);
  const moved=movePanelGroup(layout,['a','b'],-1000,-1000);
  assert.equal(moved.a.x,0);assert.equal(moved.a.y,0);assert.equal(moved.b.x-moved.a.x,320);
  assert.deepEqual(layout.a,{x:100,y:50,w:300,h:200});
});

test('selected panels move and resize together while content retains its original proportions',t=>{
  const a=setup(t),before=structuredClone(a.state.layout);a.select('moves');a.select('graph');
  assert.equal(a.mod('moves').querySelector('.mod-select').getAttribute('aria-pressed'),'true');
  assert.match(a.doc.querySelector('.reorg-count').textContent,/2 panels selected/);
  const handle=a.mod('moves').querySelector('.mod-handle');
  const origin=panelGroupBounds(before,['moves','graph']);
  const mx=a.call('snapGrid',origin.x+100)-origin.x,my=a.call('snapGrid',origin.y-20)-origin.y;
  a.event(handle,'pointerdown',0,0);a.event(a.dom.window,'pointermove',100,-20);a.event(a.dom.window,'pointerup',100,-20);
  for(const key of ['moves','graph']){near(a.state.layout[key].x,before[key].x+mx);near(a.state.layout[key].y,before[key].y+my);}
  const start=structuredClone(a.state.layout),bounds=panelGroupBounds(start,['moves','graph']),box=start.graph;
  const grip=a.mod('graph').querySelector('.mod-resize.se'),dx=-(box.x+box.w-bounds.x)/2,dy=-(box.y+box.h-bounds.y)/2;
  a.event(grip,'pointerdown',0,0);a.event(a.dom.window,'pointermove',dx,dy);a.event(a.dom.window,'pointerup',dx,dy);
  for(const key of ['moves','graph']){
    near(a.state.layout[key].w,start[key].w*.5);near(a.state.layout[key].h,start[key].h*.5);
    assert.equal(a.mod(key).querySelector('.mod-inner').style.transform,`scale(${panelScale(start[key])*.5})`);
    near(parseFloat(a.mod(key).querySelector('.mod-inner').style.width),start[key].w/panelScale(start[key]));
  }
  assert.deepEqual(a.state.layout.board,before.board);
});

test('right-panel scaling preserves the collapsed Accuracy baseline and engine content floor',t=>{
  const a=setup(t),defaults=a.run('JSON.stringify(DEFAULT_LAYOUT)');a.call('reflowAccuracy',false);
  const before=structuredClone(a.state.layout),delta=a.state._accReflow.delta;
  a.doc.querySelector('[data-reorg=right]').click();const keys=Array.from(a.call('selectedPanelKeys'));
  assert.ok(keys.includes('accuracy')&&keys.includes('engine'));assert.ok(!keys.includes('board'));
  const bounds=panelGroupBounds(before,keys),engine=before.engine,grip=a.mod('engine').querySelector('.mod-resize.se');
  const dx=-(engine.x+engine.w-bounds.x)*.25,dy=-(engine.y+engine.h-bounds.y)*.25;
  a.event(grip,'pointerdown',0,0);a.event(a.dom.window,'pointermove',dx,dy);a.event(a.dom.window,'pointerup',dx,dy);
  near(a.state._accReflow.delta,delta*.75);near(a.state.layout.engine.h,before.engine.h*.75);
  const exported=structuredClone(a.call('panelLayoutExport'));
  near(exported.layout.accuracy.h,exported.displayedLayout.accuracy.h+delta*.75);
  assert.equal(exported.schema,'chess-review-layout-v1');assert.equal(exported.layoutMode,'custom');
  near(exported.layout.engine.scale,panelScale(before.engine)*.75);assert.ok(!('pgn' in exported));
  assert.equal(a.run('JSON.stringify(DEFAULT_LAYOUT)'),defaults);
});

test('cancelled or blurred group gestures restore geometry and reset returns to unchanged defaults',async t=>{
  const a=setup(t),before=structuredClone(a.state.layout);a.select('moves');a.select('graph');
  const grip=a.mod('graph').querySelector('.mod-resize.se');
  for(const ending of ['pointercancel','blur']){
    a.event(grip,'pointerdown',0,0);a.event(a.dom.window,'pointermove',100,100);
    if(ending==='blur')a.dom.window.dispatchEvent(new a.dom.window.Event('blur'));else a.event(a.dom.window,'pointercancel',100,100);
    assert.deepEqual(a.state.layout,before);assert.equal(a.doc.querySelector('.mod.resizing'),null);
  }
  a.event(grip,'pointerdown',0,0);a.event(a.dom.window,'pointermove',100,100);await a.call('resetLayout');
  assert.equal(a.state.layoutMode,'auto');assert.equal(a.state.reorganize,false);assert.equal(a.doc.querySelector('.reorg-banner'),null);
  assert.equal(JSON.stringify(a.state.layout),a.run('JSON.stringify(DEFAULT_LAYOUT)'));
  const automatic=a.call('snapshotLayout');
  assert.equal(a.mod('moves').querySelector('.mod-inner').style.transform,`scale(${automatic.moves.scale})`);
});

test('completed panel scale is persisted and can be restored without drift',async t=>{
  const a=setup(t);a.select('moves');a.select('graph');const before=structuredClone(a.state.layout),grip=a.mod('graph').querySelector('.mod-resize.e');
  const dx=before.graph.w*.2;
  a.event(grip,'pointerdown',0,0);a.event(a.dom.window,'pointermove',dx,0);a.event(a.dom.window,'pointerup',dx,0);
  await new Promise(resolve=>setTimeout(resolve,300));
  const saved=structuredClone(a.store.layout);near(saved.moves.scale,panelScale(before.moves)*1.2);near(saved.graph.w,before.graph.w*1.2);
  a.state.layout=saved;a.call('applyLayoutMode');assert.equal(a.mod('moves').querySelector('.mod-inner').style.transform,`scale(${saved.moves.scale})`);
  assert.equal(a.state.layout.moves.w,saved.moves.w);
});
