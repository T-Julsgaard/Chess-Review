import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {escapePosition,escapeTiming,evasiveNoticeButton} from '../lib/learning/notice-dodge.js';

test('the first sixteen escapes stay fast before fatigue gradually opens a catch window',()=>{
  let previous=escapeTiming(0);
  assert.deepEqual(previous,{reaction:0,duration:75,rest:40});
  for(let i=1;i<=16;i++)assert.deepEqual(escapeTiming(i),previous,'No early slowdown');
  for(let i=17;i<=40;i++) {
    const next=escapeTiming(i);
    assert.ok(next.reaction>previous.reaction);assert.ok(next.duration>previous.duration);assert.ok(next.rest>previous.rest);
    previous=next;
  }
  assert.deepEqual(escapeTiming(24),{reaction:24,duration:131,rest:136});
  assert.deepEqual(escapeTiming(100),{reaction:150,duration:360,rest:600});
});

test('the escape halo permits positions outside the compact box without approaching screen edges',()=>{
  const target=escapePosition({width:456,height:144,minX:-72,minY:-12,buttonWidth:110,buttonHeight:42,
    current:{x:274,y:0},pointer:{x:330,y:20},safe:{left:0,top:0,right:110,bottom:44},random:()=>0});
  assert.ok(target.x>=-72&&target.x+110<=456&&target.y>=-12&&target.y+42<=144);
  assert.ok(target.x<0||target.x+110>384||target.y+42>44,'Use the bounded space outside the actions');
});

test('escape destinations stay inside the dialog and leave the dismiss button a wide berth',()=>{
  for(const width of [248,318,468])for(const pointer of [{x:0,y:0},{x:width,y:140},{x:width/2,y:70}]) {
    const safe={left:0,top:98,right:94,bottom:140};
    const target=escapePosition({width,height:140,buttonWidth:110,buttonHeight:42,current:{x:width-110,y:98},pointer,safe,random:()=>.5});
    assert.ok(target);assert.ok(target.x>=0&&target.x+110<=width);assert.ok(target.y>=0&&target.y+42<=140);
    assert.ok(target.x>=safe.right+40||target.y+42<=safe.top-40,'Never cross the safe button’s exclusion zone');
    assert.ok(Math.hypot(target.x+55-pointer.x,target.y+21-pointer.y)>80,'Escape must meaningfully clear the pointer');
  }
});

test('escapes vary beyond opposite corners and avoid recently visited spots',()=>{
  let seed=42;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(const width of [248,318,468]) {
    const safe={left:0,top:0,right:94,bottom:42},recent=[],visited=new Set();
    let current={x:width-110,y:0},interior=0;
    for(let i=0;i<30;i++) {
      const target=escapePosition({width,height:150,minX:-16,minY:-12,buttonWidth:110,buttonHeight:42,
        current,pointer:{x:current.x+55,y:current.y+21},safe,recent,random});
      assert.ok(target);
      assert.ok(target.x>=-16&&target.x+110<=width&&target.y>=-12&&target.y+42<=150);
      assert.ok(target.x>=safe.right+40||target.y>=safe.bottom+40);
      assert.ok(target.travel>=60&&target.clearance>=64,'Each escape clears the pointer and travels a meaningful distance');
      visited.add(`${Math.round(target.x)},${Math.round(target.y)}`);
      if(target.x>0&&target.x<width-120&&target.y>0&&target.y<98)interior++;
      recent.push(current);if(recent.length>4)recent.shift();current=target;
    }
    assert.ok(visited.size>=15,'Repeated chases should have many distinct destinations');
    assert.ok(interior>=3,'Destinations should include the interior, not just edges');
  }
  const options={width:600,height:300,buttonWidth:110,buttonHeight:42,current:{x:450,y:100},
    pointer:{x:505,y:121},safe:{left:0,top:0,right:94,bottom:42},random};
  const recent=[];
  for(let i=0;i<12;i++) {
    const target=escapePosition({...options,recent});
    assert.ok(recent.every(p=>Math.hypot(target.x-p.x,target.y-p.y)>=48),'Avoid recent destinations when space permits');
    recent.push(target);if(recent.length>4)recent.shift();
  }
});

test('the evasive button reacts before hover, respects a catch window, resets on resize and cleans up',t=>{
  const dom=new JSDOM('<div id="arena"><button id="safe">Fair enough</button><button id="runner">Unacceptable</button></div>');
  t.after(()=>dom.window.close());
  const view=dom.window,arena=view.document.querySelector('#arena'),button=view.document.querySelector('#runner'),safeButton=view.document.querySelector('#safe');
  let nextFrame=0,nextTimer=0,clock=0;const frames=new Map(),timers=new Map();
  view.requestAnimationFrame=fn=>{frames.set(++nextFrame,fn);return nextFrame;};view.cancelAnimationFrame=id=>frames.delete(id);
  view.setTimeout=fn=>{timers.set(++nextTimer,fn);return nextTimer;};view.clearTimeout=id=>timers.delete(id);
  t.mock.method(view.performance,'now',()=>clock);
  const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
  arena.getBoundingClientRect=()=>rect(100,200,468,140);
  safeButton.getBoundingClientRect=()=>rect(100,298,110,42);
  button.getBoundingClientRect=()=>rect(100+(button.style.left?parseFloat(button.style.left):338),200+(button.style.top?parseFloat(button.style.top):0),130,42);
  const move=(x,y,type='pointermove')=>arena.dispatchEvent(new view.MouseEvent(type,{bubbles:true,clientX:x,clientY:y}));
  const flush=()=>{for(const [id,fn] of frames){frames.delete(id);fn();}};
  const dispose=evasiveNoticeButton({arena,button,safeButton,view});
  move(155,315);assert.equal(frames.size,0,'Approaching Fair enough never starts the game');
  move(340,220);assert.equal(frames.size,0,'Crossing toward the dismiss button should not start a chase');
  move(421,220);assert.equal(frames.size,1,'The first dodge requires a close approach');
  move(155,315);assert.equal(frames.size,0,'Moving toward Fair enough cancels a queued dodge');
  move(421,220);assert.equal(frames.size,1);flush();
  assert.equal(button.dataset.dodges,'1');assert.ok(Math.hypot(parseFloat(button.style.left)-338,parseFloat(button.style.top))>=60);
  const escaped=button.getBoundingClientRect();
  assert.ok(Math.hypot(Math.max(escaped.left-421,0,421-escaped.right),Math.max(escaped.top-220,0,220-escaped.bottom))>=64,'Choose a destination away from the latest pointer position');
  const now=button.getBoundingClientRect();
  // Follow the escaped button itself. A fixed offset can randomly land in the
  // protected dismiss-button zone and correctly cancel the pending dodge.
  const near={x:now.left+now.width/2,y:now.top+now.height/2};
  move(near.x,near.y);flush();assert.equal(button.dataset.dodges,'1','A brief reaction window permits a real catch');
  assert.equal(timers.size,1);clock=120;for(const [id,fn] of timers){timers.delete(id);fn();}flush();
  assert.equal(button.dataset.dodges,'2','A pointer that stays close triggers another escape after the catch window');
  view.dispatchEvent(new view.Event('resize'));assert.equal(button.style.left,'');assert.equal(button.style.top,'');
  button.dataset.dodges='17';clock=500;move(440,220);assert.equal(timers.size,1);dispose();assert.equal(frames.size,0);assert.equal(timers.size,0);
  move(440,220);assert.equal(frames.size,0,'Closing the dialog removes every dodge listener');
});

test('a quick pointer click cannot beat a queued dodge, while recovery and keyboard catches work',t=>{
  const dom=new JSDOM('<div><button>Fair enough</button><button>Unacceptable</button></div>');t.after(()=>dom.window.close());
  const view=dom.window,arena=view.document.querySelector('div'),[safeButton,button]=arena.children;let frame;
  view.requestAnimationFrame=fn=>{frame=fn;return 1;};view.cancelAnimationFrame=()=>{frame=null;};view.matchMedia=()=>({matches:true});
  const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
  arena.getBoundingClientRect=()=>rect(0,0,300,170);safeButton.getBoundingClientRect=()=>rect(0,128,94,42);button.getBoundingClientRect=()=>rect(190,128,110,42);
  let animations=0,catches=0;button.animate=()=>{animations++;};button.addEventListener('click',()=>catches++);
  t.mock.method(view.performance,'now',()=>0);
  const dispose=evasiveNoticeButton({arena,button,safeButton,view});
  const press=()=>button.dispatchEvent(new view.MouseEvent('pointerdown',{clientX:230,clientY:145}));
  const click=()=>button.dispatchEvent(new view.MouseEvent('click',{detail:1,cancelable:true}));
  press();assert.ok(frame);click();assert.equal(catches,0,'A pointer press that triggers a dodge cannot also catch it');
  press();click();assert.equal(catches,0,'A pending animation frame must not permit a click-through');frame();
  assert.equal(button.dataset.dodges,'1');assert.equal(animations,0,'Reduced motion skips animation');
  press();click();assert.equal(catches,1,'An actual recovery window still permits a pointer catch');
  button.dispatchEvent(new view.MouseEvent('click',{detail:0}));assert.equal(catches,2,'Keyboard activation stays available');
  dispose();press();click();assert.equal(catches,3,'Disposal removes the click guard');
});

test('escape coordinates account for the review’s CSS zoom',t=>{
  // Destinations are random, so seed Math.random and compare with escapePosition's on-screen choice.
  const seeded=seed=>()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  let random;t.mock.method(Math,'random',()=>random());
  const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
  const safe={left:0,top:128,right:94,bottom:170},pointer={x:20,y:20};
  for(let seed=1;seed<=40;seed++) {
    const dom=new JSDOM('<div><button>Fair enough</button><button>Unacceptable</button></div>');
    const view=dom.window,arena=view.document.querySelector('div'),[safeButton,button]=arena.children;let frame;
    view.requestAnimationFrame=fn=>{frame=fn;return 1;};view.cancelAnimationFrame=()=>{};
    Object.defineProperties(arena,{offsetWidth:{value:600},offsetHeight:{value:340}});
    arena.getBoundingClientRect=()=>rect(0,0,300,170);safeButton.getBoundingClientRect=()=>rect(0,128,94,42);button.getBoundingClientRect=()=>rect(0,0,110,42);
    const dispose=evasiveNoticeButton({arena,button,safeButton,view});
    random=seeded(seed);button.dispatchEvent(new view.MouseEvent('pointerenter',{clientX:pointer.x,clientY:pointer.y}));frame();
    const target=escapePosition({width:300,height:170,buttonWidth:110,buttonHeight:42,current:{x:0,y:0},pointer,safe,random:seeded(seed)});
    // left/top are unscaled CSS pixels: twice the on-screen offset at 50% zoom.
    assert.equal(button.style.left,target.x/.5+'px');assert.equal(button.style.top,target.y/.5+'px');
    assert.ok(target.x>=0&&target.y>=0&&target.x+110<=300&&target.y+42<=170,'Stays inside the arena');
    assert.ok(Math.hypot(Math.max(target.x-pointer.x,0,pointer.x-target.x-110),Math.max(target.y-pointer.y,0,pointer.y-target.y-42))>=64,'Leaves the pointer');
    assert.ok(target.x>=safe.right+40||target.y+42<=safe.top-40,'Keeps clear of the dismiss button');
    dispose();dom.window.close();
  }
});
