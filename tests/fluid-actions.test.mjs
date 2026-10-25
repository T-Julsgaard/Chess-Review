import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountFluidActions} from '../lib/fluid-actions.js';

function actions(t,{reducedMotion=false}={}) {
  const dom=new JSDOM('<div><span class="fluid-indicator"></span><button>Analyze</button><button>Open</button></div>');
  t.after(()=>dom.window.close());
  const group=dom.window.document.querySelector('div'),indicator=group.querySelector('span'),buttons=[...group.querySelectorAll('button')],animations=[];
  dom.window.matchMedia=()=>({matches:reducedMotion});
  for(const [index,button] of buttons.entries())Object.defineProperties(button,{
    offsetLeft:{value:5},offsetTop:{value:5+index*69},offsetWidth:{value:310},offsetHeight:{value:64},
  });
  indicator.getBoundingClientRect=()=>({left:parseFloat(indicator.style.left)||0,top:parseFloat(indicator.style.top)||0,
    width:parseFloat(indicator.style.width)||0,height:parseFloat(indicator.style.height)||0});
  indicator.animate=(frames,options)=>{const animation={frames,options,canceled:false,cancel(){this.canceled=true;}};animations.push(animation);return animation;};
  const dispose=mountFluidActions(group);t.after(dispose);
  const pointer=(target,type)=>target.dispatchEvent(new dom.window.Event(type));
  const highlighted=()=>buttons.filter(button=>button.dataset.highlighted==='true');
  return {dom,group,buttons,animations,pointer,highlighted,dispose};
}

test('popup highlight only appears on hover and stays hidden after leaving or resizing',t=>{
  const {dom,group,buttons,pointer,highlighted}=actions(t);
  assert.equal(group.dataset.ready,'false');assert.deepEqual(highlighted(),[]);
  buttons[0].focus();assert.deepEqual(highlighted(),[]);
  dom.window.dispatchEvent(new dom.window.Event('resize'));assert.equal(group.dataset.ready,'false');
  pointer(buttons[0],'pointerenter');assert.deepEqual(highlighted(),[buttons[0]]);
  pointer(buttons[0],'pointerleave');assert.equal(group.dataset.ready,'false');assert.deepEqual(highlighted(),[]);
  pointer(group,'pointerleave');dom.window.dispatchEvent(new dom.window.Event('resize'));
  assert.equal(group.dataset.ready,'false');assert.deepEqual(highlighted(),[]);
});

test('highlight flows in both directions, including across the gap, and cancels when leaving',t=>{
  const {group,buttons,animations,pointer,highlighted}=actions(t);
  pointer(buttons[0],'pointerenter');assert.equal(animations.length,0);
  pointer(buttons[0],'pointerleave');pointer(buttons[1],'pointerenter');
  assert.equal(animations.length,1);assert.deepEqual(highlighted(),[buttons[1]]);
  assert.equal(animations[0].frames[0].top,'5px');assert.equal(animations[0].frames.at(-1).top,'74px');
  pointer(buttons[1],'pointerleave');pointer(buttons[0],'pointerenter');
  assert.equal(animations.length,2);assert.equal(animations[1].frames[0].top,'74px');assert.equal(animations[1].frames.at(-1).top,'5px');
  pointer(group,'pointerleave');assert.equal(animations[1].canceled,true);assert.equal(group.dataset.ready,'false');
  pointer(buttons[1],'pointerenter');assert.equal(animations.length,2,'Re-entering from outside does not animate from a stale button');
});

test('reduced motion, disabled buttons, lost focus and disposal keep the highlight correct',t=>{
  const {dom,group,buttons,animations,pointer,dispose}=actions(t,{reducedMotion:true});
  buttons[0].disabled=true;pointer(buttons[0],'pointerenter');assert.equal(group.dataset.ready,'false');
  pointer(buttons[1],'pointerenter');buttons[0].disabled=false;pointer(buttons[0],'pointerenter');assert.equal(animations.length,0);
  dom.window.dispatchEvent(new dom.window.Event('blur'));assert.equal(group.dataset.ready,'false');
  dispose();pointer(buttons[1],'pointerenter');assert.equal(group.dataset.ready,'false');
});
