import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountFluidActions} from '../lib/fluid-actions.js';

function actions(t,{reducedMotion=false}={}) {
  const dom=new JSDOM('<div><span class="fluid-indicator"></span><button>Analyze</button><button>Open</button></div>');
  t.after(()=>dom.window.close());
  const group=dom.window.document.querySelector('div'),indicator=group.querySelector('span'),buttons=[...group.querySelectorAll('button')],animations=[];
  dom.window.matchMedia=()=>({matches:reducedMotion});
  for(const [index,button] of buttons.entries()){
    Object.defineProperties(button,{
      offsetLeft:{value:5},offsetTop:{value:5+index*69},offsetWidth:{value:310},offsetHeight:{value:64},
    });
    button.getBoundingClientRect=()=>({left:5,top:5+index*69,width:310,height:64});
  }
  indicator.getBoundingClientRect=()=>({left:parseFloat(indicator.style.left)||0,top:parseFloat(indicator.style.top)||0,
    width:parseFloat(indicator.style.width)||0,height:parseFloat(indicator.style.height)||0});
  indicator.animate=(frames,options)=>{const animation={frames,options,canceled:false,cancel(){this.canceled=true;}};animations.push(animation);return animation;};
  const dispose=mountFluidActions(group);t.after(dispose);
  const pointer=(target,type,point={clientX:160,clientY:70})=>target.dispatchEvent(new dom.window.MouseEvent(type,point));
  const highlighted=()=>buttons.filter(button=>button.dataset.highlighted==='true');
  return {dom,group,buttons,animations,pointer,highlighted,dispose};
}

test('popup highlight only appears on hover and hides after its exit finishes',t=>{
  const {dom,group,buttons,animations,pointer,highlighted}=actions(t);
  assert.equal(group.dataset.ready,'false');assert.deepEqual(highlighted(),[]);
  buttons[0].focus();assert.deepEqual(highlighted(),[]);
  dom.window.dispatchEvent(new dom.window.Event('resize'));assert.equal(group.dataset.ready,'false');
  pointer(buttons[0],'pointerenter');assert.deepEqual(highlighted(),[buttons[0]]);
  pointer(buttons[0],'pointerleave');assert.equal(group.dataset.ready,'true');assert.deepEqual(highlighted(),[]);
  pointer(group,'pointerleave');assert.equal(animations.length,2,'Leaving the group must not cancel the button exit');
  animations.at(-1).onfinish();assert.equal(group.dataset.ready,'false');
  pointer(group,'pointerleave');dom.window.dispatchEvent(new dom.window.Event('resize'));
  assert.equal(group.dataset.ready,'false');assert.deepEqual(highlighted(),[]);
});

test('highlight flows in both directions across the gap and cancels the pending exit',t=>{
  const {group,buttons,animations,pointer,highlighted}=actions(t);
  pointer(buttons[0],'pointerenter');assert.equal(animations.length,1);
  pointer(buttons[0],'pointerleave');pointer(buttons[1],'pointerenter');
  assert.equal(animations.length,3);assert.deepEqual(highlighted(),[buttons[1]]);
  assert.equal(animations[1].canceled,true);
  assert.equal(animations[2].frames[0].top,'5px');assert.equal(animations[2].frames.at(-1).top,'74px');
  pointer(buttons[1],'pointerleave');pointer(buttons[0],'pointerenter');
  assert.equal(animations.length,5);assert.equal(animations[4].frames[0].top,'74px');assert.equal(animations[4].frames.at(-1).top,'5px');
  pointer(buttons[0],'pointerleave');pointer(group,'pointerleave');animations[5].onfinish();assert.equal(group.dataset.ready,'false');
  pointer(buttons[1],'pointerenter');assert.equal(animations.length,7);
  assert.equal(animations.at(-1).frames[0].opacity,0,'A fresh entry starts at its edge instead of a stale button');
});

test('fresh entries reverse the scoop from each incoming edge, including fast pointer moves',t=>{
  const {dom,group,buttons,animations,pointer}=actions(t);
  for(const [point,axis,start] of [
    [{clientX:4,clientY:37},'left','5px'],[{clientX:316,clientY:37},'left','315px'],
    [{clientX:160,clientY:4},'top','5px'],[{clientX:160,clientY:70},'top','69px'],
  ]){
    pointer(dom.window.document,'pointermove',point);
    pointer(buttons[0],'pointerenter',{clientX:160,clientY:37});
    const entrance=animations.at(-1),frames=entrance.frames;
    assert.equal(group.dataset.ready,'true');assert.equal(frames[0].opacity,0);
    assert.equal(frames[0][axis],start);assert.equal(frames[0][axis==='left'?'width':'height'],'0px');
    assert.ok(frames[12].opacity>0&&frames[12].opacity<1);
    assert.equal(frames.at(-1).opacity,1);assert.equal(frames.at(-1).width,'310px');assert.equal(frames.at(-1).height,'64px');
    pointer(buttons[0],'pointerleave',point);assert.equal(entrance.canceled,true);
    animations.at(-1).onfinish();assert.equal(group.dataset.ready,'false');
  }
});

test('exit scoops toward each pointer edge and fades before hiding',t=>{
  const {group,buttons,animations,pointer}=actions(t);
  for(const [point,axis,end] of [
    [{clientX:4,clientY:37},'left','5px'],[{clientX:316,clientY:37},'left','315px'],
    [{clientX:160,clientY:4},'top','5px'],[{clientX:160,clientY:70},'top','69px'],
    [{clientX:900,clientY:37},'left','315px'],
  ]){
    pointer(buttons[0],'pointerenter');pointer(buttons[0],'pointerleave',point);
    const exit=animations.at(-1),frames=exit.frames;
    assert.equal(group.dataset.ready,'true');assert.equal(frames[0].opacity,1);
    assert.ok(frames[12].opacity>0&&frames[12].opacity<1);
    assert.equal(frames.at(-1)[axis],end);assert.equal(frames.at(-1).opacity,0);
    assert.equal(frames.at(-1)[axis==='left'?'width':'height'],'0px');
    exit.onfinish();assert.equal(group.dataset.ready,'false');
  }
});

test('re-entering the same button resumes the visible shape and ignores a stale exit callback',t=>{
  const {group,buttons,animations,pointer}=actions(t);
  const indicator=group.querySelector('span');
  pointer(buttons[0],'pointerenter');pointer(buttons[0],'pointerleave');const exit=animations.at(-1);
  indicator.getBoundingClientRect=()=>({left:90,top:20,width:200,height:35});indicator.style.opacity='.6';
  pointer(buttons[0],'pointerenter');assert.equal(exit.canceled,true);
  assert.equal(animations.at(-1).frames[0].left,'90px');assert.equal(animations.at(-1).frames[0].width,'200px');
  assert.equal(animations.at(-1).frames[0].opacity,.6);assert.equal(animations.at(-1).frames.at(-1).opacity,1);
  exit.onfinish();assert.equal(group.dataset.ready,'true');
});

test('reduced motion, disabled buttons, lost focus and disposal keep the highlight correct',t=>{
  const {dom,group,buttons,animations,pointer,dispose}=actions(t,{reducedMotion:true});
  buttons[0].disabled=true;pointer(buttons[0],'pointerenter');assert.equal(group.dataset.ready,'false');
  pointer(buttons[1],'pointerenter');buttons[0].disabled=false;pointer(buttons[0],'pointerenter');assert.equal(animations.length,0);
  pointer(buttons[0],'pointerleave');assert.equal(group.dataset.ready,'false');assert.equal(animations.length,0);
  pointer(buttons[0],'pointerenter');
  dom.window.dispatchEvent(new dom.window.Event('blur'));assert.equal(group.dataset.ready,'false');
  dispose();pointer(buttons[1],'pointerenter');assert.equal(group.dataset.ready,'false');
});
