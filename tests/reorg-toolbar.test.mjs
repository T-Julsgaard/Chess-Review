import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame} from './helpers/app.mjs';

function setup(t) {
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  Object.defineProperties(a.dom.window,{innerWidth:{value:800,configurable:true},innerHeight:{value:600,configurable:true}});
  a.call('toggleReorganize');
  const doc=a.dom.window.document,banner=doc.querySelector('.reorg-banner'),handle=banner.querySelector('.reorg-drag');
  banner.getBoundingClientRect=()=>{
    const width=banner.classList.contains('is-minimized')?170:360,height=banner.classList.contains('is-minimized')?42:74;
    return {left:banner.style.left?parseFloat(banner.style.left):220,top:banner.style.top?parseFloat(banner.style.top):514,width,height};
  };
  const pointer=(target,type,x,y,id=1)=>{
    const event=new a.dom.window.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});
    Object.defineProperty(event,'pointerId',{value:id});target.dispatchEvent(event);
  };
  return {...a,doc,banner,handle,pointer};
}

test('toolbar drags independently, clamps to the viewport, and supports keyboard movement',t=>{
  const a=setup(t),layout=structuredClone(a.state.layout);
  a.pointer(a.handle,'pointerdown',230,524);a.pointer(a.dom.window,'pointermove',100,200);
  assert.equal(a.banner.style.left,'90px');assert.equal(a.banner.style.top,'190px');
  a.pointer(a.dom.window,'pointerup',100,200);
  a.handle.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',shiftKey:true,bubbles:true}));
  assert.equal(a.banner.style.left,'100px');
  a.pointer(a.handle,'pointerdown',110,200);a.pointer(a.dom.window,'pointerup',10000,-10000);
  assert.equal(a.banner.style.left,'432px');assert.equal(a.banner.style.top,'8px');
  assert.deepEqual(structuredClone(a.state.layout),layout);
});

test('minimizing preserves editing and Done, while expansion and resize keep controls reachable',t=>{
  const a=setup(t),toggle=a.banner.querySelector('.reorg-minimize');
  toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'false');
  assert.equal(toggle.getAttribute('aria-label'),'Expand layout toolbar');
  assert.equal(a.banner.querySelector('.reorg-grid').hidden,true);
  assert.equal(a.banner.querySelector('.reorg-actions').hidden,true);
  assert.equal(a.banner.querySelector('.reorg-done').hidden,false);assert.equal(a.state.reorganize,true);
  a.pointer(a.handle,'pointerdown',230,524);a.pointer(a.dom.window,'pointerup',10000,10000);
  assert.equal(a.banner.style.left,'622px');assert.equal(a.banner.style.top,'550px');
  toggle.click();assert.equal(a.banner.style.left,'432px');assert.equal(a.banner.style.top,'518px');
  assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(a.banner.querySelector('.reorg-actions').hidden,false);
  Object.defineProperties(a.dom.window,{innerWidth:{value:390,configurable:true},innerHeight:{value:300,configurable:true}});
  a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
  assert.equal(a.banner.style.left,'22px');assert.equal(a.banner.style.top,'218px');
  a.banner.querySelector('.reorg-done').click();assert.equal(a.state.reorganize,false);assert.equal(a.doc.querySelector('.reorg-banner'),null);
});

test('cancel, blur and closing the toolbar clean up active drag gestures',t=>{
  const a=setup(t);
  for(const ending of ['pointercancel','blur']){
    a.pointer(a.handle,'pointerdown',230,524);a.pointer(a.dom.window,'pointermove',100,200);
    if(ending==='blur')a.dom.window.dispatchEvent(new a.dom.window.Event('blur'));
    else a.pointer(a.dom.window,ending,100,200);
    assert.equal(a.banner.style.left,'');assert.equal(a.banner.style.top,'');
    assert.equal(a.banner.classList.contains('toolbar-dragging'),false);
  }
  a.pointer(a.handle,'pointerdown',230,524);a.pointer(a.dom.window,'pointermove',100,200);
  a.call('toggleReorganize');a.pointer(a.dom.window,'pointermove',300,300);
  assert.equal(a.banner.style.left,'');assert.equal(a.doc.querySelector('.reorg-banner'),null);
});
