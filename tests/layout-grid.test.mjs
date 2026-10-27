import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame,settle} from './helpers/app.mjs';

function setup(t) {
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  a.state.layoutMode='custom';
  a.state.layout.moves={x:37.5,y:43.5,w:310.5,h:290.5};
  a.call('applyLayoutMode');a.call('toggleReorganize');
  const doc=a.dom.window.document,mod=doc.querySelector('[data-mod=moves]');
  const event=(target,type,x,y)=>{
    const e=new a.dom.window.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});
    Object.defineProperty(e,'pointerId',{value:1});target.dispatchEvent(e);
  };
  const drag=(selector,x,y,ending='pointerup')=>{
    const scale=a.run('canvasScale');event(mod.querySelector(selector),'pointerdown',0,0);
    event(a.dom.window,'pointermove',x*scale,y*scale);event(a.dom.window,ending,x*scale,y*scale);
  };
  return {...a,doc,mod,drag};
}

test('grid controls remember spacing without rearranging panels and disappear when done',async t=>{
  const a=setup(t),before=structuredClone(a.state.layout),canvas=a.doc.querySelector('.stage');
  const select=a.doc.querySelector('[aria-label="Layout grid spacing"]');
  assert.deepEqual([...select.options].map(n=>n.value),['16','8','2']);
  assert.equal(select.value,'16');assert.equal(canvas.style.getPropertyValue('--layout-grid-size'),'16px');
  for(const spacing of [8,2,16]){
    select.value=String(spacing);select.dispatchEvent(new a.dom.window.Event('change',{bubbles:true}));await settle();
    assert.equal(a.store.settings.layoutGridSize,spacing);
    assert.equal(canvas.style.getPropertyValue('--layout-grid-size'),spacing+'px');
    assert.equal(canvas.style.getPropertyValue('--layout-grid-major'),spacing*4+'px');
    assert.deepEqual(a.state.layout,before);
  }
  a.call('toggleReorganize');assert.equal(canvas.classList.contains('reorganizing'),false);
  assert.equal(a.doc.querySelector('.reorg-banner'),null);
  a.call('toggleReorganize');assert.equal(a.doc.querySelector('.reorg-grid select').value,'16');
  a.state.settings.layoutGridSize=-4;assert.equal(a.call('layoutGridSize'),16);
});

for(const spacing of [16,8,2])test(spacing+' px grid aligns absolute panel edges at fitted canvas scale',async t=>{
  const a=setup(t);await a.call('setLayoutGridSize',spacing);
  a.drag('.mod-handle',27,19);
  assert.equal(a.state.layout.moves.x%spacing,0);assert.equal(a.state.layout.moves.y%spacing,0);
  a.drag('.mod-resize.se',23,17);
  let b=a.state.layout.moves;
  assert.equal((b.x+b.w)%spacing,0);assert.equal((b.y+b.h)%spacing,0);
  a.drag('.mod-resize.se',-1000,-1000);b=a.state.layout.moves;
  assert.ok(b.w>=170);assert.ok(b.h>=56);
  assert.equal((b.x+b.w)%spacing,0);assert.equal((b.y+b.h)%spacing,0);
});

test('single-axis gestures leave the other axis intact and cancelled gestures restore geometry',t=>{
  const a=setup(t),before=structuredClone(a.state.layout);
  a.drag('.mod-handle',0,0);assert.deepEqual(structuredClone(a.state.layout),before);
  a.drag('.mod-resize.se',0,0);assert.deepEqual(structuredClone(a.state.layout),before);
  a.drag('.mod-handle',29,0);assert.equal(a.state.layout.moves.y,before.moves.y);
  a.drag('.mod-resize.e',23,0);assert.equal(a.state.layout.moves.h,before.moves.h);
  const moved=structuredClone(a.state.layout);
  a.drag('.mod-handle',23,31,'pointercancel');assert.deepEqual(structuredClone(a.state.layout),moved);
});

test('group movement aligns its outer origin and preserves fractional internal spacing',t=>{
  const a=setup(t);a.state.layout.graph={x:372.25,y:370.25,w:300,h:100};
  a.call('selectPanels',['moves','graph']);const before=structuredClone(a.state.layout);
  a.drag('.mod-handle',27,19);
  assert.equal(a.state.layout.moves.x%16,0);assert.equal(a.state.layout.moves.y%16,0);
  assert.equal(a.state.layout.graph.x-a.state.layout.moves.x,before.graph.x-before.moves.x);
  assert.equal(a.state.layout.graph.y-a.state.layout.moves.y,before.graph.y-before.moves.y);
  a.drag('.mod-handle',-10000,-10000);
  assert.equal(a.state.layout.moves.x,0);assert.equal(a.state.layout.moves.y,0);
});
