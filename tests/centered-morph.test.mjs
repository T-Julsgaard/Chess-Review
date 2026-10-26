import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {fullSizeLearningLayout, boardExpansionFrames, centeredMorph} from '../lib/learning/centered-morph.js';
import {capturePanels} from '../lib/learning/morph.js';
import {app, loadGame} from './helpers/app.mjs';
import {LearningWorkspace} from '../lib/learning/workspace.js';

test('learning adapts its Settings gutter without moving and bounds the square board at all window sizes',()=>{
  for(const width of [320,390,600,760,960,1280,1440,1920,2560]){
    const board={x:80,y:140,width:Math.min(width-48,700)};
    const closed=fullSizeLearningLayout({width,height:1080,board,settingsOpen:false});
    const open=fullSizeLearningLayout({width,height:1080,board,settingsOpen:true});
    assert.deepEqual(open,closed);const p=open;
    assert.ok(p.boardX>=0&&p.boardX+p.boardSize<=width);
    assert.ok(p.panelX>=0&&p.panelX+p.panelWidth<=width);
    if(width>=1600)assert.ok(p.panelX+p.panelWidth<=width-334);
    if(p.stacked)assert.ok(p.panelY>p.boardY+p.boardSize);
    else {
      assert.ok(p.panelX>=p.boardX+p.boardSize+24);
      assert.equal(p.panelY,p.boardY);assert.equal(p.panelHeight,p.boardSize);
    }
  }
  const board={x:92,y:142,width:700};const p=fullSizeLearningLayout({width:1920,height:1080,board});
  assert.ok(p.boardSize>board.width);assert.ok(p.boardX<board.x);assert.equal(p.boardY+52,board.y);
  assert.equal(p.boardX+p.boardSize,board.x+board.width);
  assert.ok(board.x-p.boardX>32&&board.x-p.boardX<=80);assert.equal(p.panelX,board.x+board.width+32);
  const tight=fullSizeLearningLayout({width:1366,height:1080,board:{x:350,y:70,width:800}});
  assert.ok(tight.boardX+tight.boardSize<=1366-24-24-340);assert.equal(tight.stacked,false);assert.equal(tight.boardY+52,70);
});

test('board expands uniformly on a straight path with no upward arc or overshoot',()=>{
  assert.deepEqual(boardExpansionFrames({x:80,y:130,width:600},{x:24,y:130,width:660}),[
    {transform:'translate(56px, 0px) scale('+600/660+')'},
    {transform:'translate(0px, 0px) scale(1)'},
  ]);
});

test('Full HD learning balances its vertical margins without changing board size or horizontal placement',()=>{
  const board={x:309.36,y:107.8,width:734.85};
  for(const height of [919,920,960,1080]){
    const input={width:1920,height,top:52.2,board};
    const before=fullSizeLearningLayout(input),centered=fullSizeLearningLayout({...input,balanceVertically:true});
    assert.equal(centered.boardSize,before.boardSize);assert.equal(centered.boardX,before.boardX);assert.equal(centered.panelX,before.panelX);
    const bottom=height-input.top-centered.boardY-centered.boardSize;
    assert.ok(Math.abs(centered.boardY-bottom)<1e-8);
    assert.equal(centered.panelY,centered.boardY);assert.equal(centered.panelHeight,centered.boardSize);
    if(height===920)assert.ok(centered.boardY<before.boardY,'Normal Full HD browser window should move up');
  }
  const tablet={width:820,height:1180,board};
  assert.deepEqual(fullSizeLearningLayout({...tablet,balanceVertically:true}),fullSizeLearningLayout(tablet),'Stacked layouts keep their existing placement');
});

test('return animation converts screen movement through a scaled review ancestor',()=>{
  assert.deepEqual(boardExpansionFrames({x:80,y:130,width:600},{x:100,y:150,width:500},.8),[
    {transform:'translate(-25px, -25px) scale(1.2)'},
    {transform:'translate(0px, 0px) scale(1)'},
  ]);
});

test('panel fades preserve existing content transforms in both directions',async t=>{
  const {dom,doc,source,board,target,animations}=scene(t);
  source.style.transform='scale(0.8847)';target.style.transform='scale(0.9038)';
  const controller=new dom.window.AbortController();
  const pending=centeredMorph(doc,capturePanels([source]),[target],{board,fromBoard:board.getBoundingClientRect(),signal:controller.signal});
  for(const animation of animations.filter(a=>a.target===source||a.target===target)){
    assert.ok(animation.frames.every(frame=>!('transform'in frame)));
    assert.ok(animation.frames.every(frame=>'translate'in frame));
  }
  controller.abort();await pending;
  assert.equal(source.style.transform,'scale(0.8847)');assert.equal(target.style.transform,'scale(0.9038)');
});

test('Morph 3 clears outgoing text before revealing its single live destination and cancels cleanly',async t=>{
  const {dom,doc,source,board,target,animations}=scene(t);
  const controller=new dom.window.AbortController();
  const pending=centeredMorph(doc,capturePanels([source]),[target],{board,fromBoard:board.getBoundingClientRect(),variant:'morph3',signal:controller.signal});
  const outgoing=animations.find(a=>a.target===source);
  const incoming=animations.find(a=>a.target===target);
  assert.ok(outgoing.options.duration<=incoming.options.delay);
  assert.equal(incoming.options.fill,'both');
  assert.equal(doc.querySelectorAll('#target').length,1);
  assert.equal(doc.querySelector('.learn-scene-ghost'),null);
  controller.abort();await pending;
  assert.equal(doc.querySelector('.learn-scene-layer'),null);
  assert.ok(animations.every(a=>a.cancelled));
  assert.equal(doc.querySelector('.learn-transition-surface'),null);
});

test('both transitions preserve the real slider controls, their values and scroll context',async t=>{
  const {dom,doc,source,board,target,animations}=scene(t);
  source.className='learning-workspace';source.innerHTML='<div class="learn-dual-range"><input type="range" min="350" max="3050" value="350"><input type="range" min="350" max="3050" value="3050"></div>';
  const sliders=[...source.querySelectorAll('input')];sliders[0].value='1000';sliders[1].value='2200';source.scrollTop=120;
  for(const exiting of [false,true]){
    const controller=new dom.window.AbortController();
    const pending=centeredMorph(doc,capturePanels([source]),[target],{board,fromBoard:board.getBoundingClientRect(),exiting,signal:controller.signal});
    assert.deepEqual([...doc.querySelectorAll('input')],sliders);
    assert.deepEqual(sliders.map(n=>n.value),['1000','2200']);assert.equal(source.scrollTop,120);
    assert.ok(sliders.every(n=>n.closest('.learning-workspace')===source));
    assert.ok(animations.some(a=>a.target===source));controller.abort();await pending;
    assert.equal(doc.querySelector('.learn-transition-surface'),null);
  }
});

function scene(t) {
  const dom=new JSDOM('<div id="source">Review</div><div id="boardWrap"><div class="board"><div class="sq">Piece</div></div></div><div id="target">Learning</div>');
  t.after(()=>dom.window.close());
  const doc=dom.window.document,source=doc.querySelector('#source'),board=doc.querySelector('#boardWrap'),target=doc.querySelector('#target');
  for(const node of [source,board,target])node.getBoundingClientRect=()=>({x:334,y:112,width:560,height:560});
  dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  const animations=[];
  dom.window.Element.prototype.animate=function(frames,options){const a={target:this,frames,options,cancelled:false,finished:new Promise(()=>{}),cancel(){this.cancelled=true;}};animations.push(a);return a;};
  return {dom,doc,source,board,target,animations};
}

test('the scene moves the real board as one surface and releases it synchronously on interruption',async t=>{
  const {dom,doc,source,board,target,animations}=scene(t),child=board.firstChild,square=child.firstChild;
  const controller=new dom.window.AbortController();
  const pending=centeredMorph(doc,capturePanels([source]),[target],{board,fromBoard:{x:80,y:132,width:700},signal:controller.signal});
  assert.equal(doc.querySelector('.learn-scene-layer .board'),null);
  assert.equal(board.firstChild,child);assert.equal(child.firstChild,square);
  assert.ok(animations.some(a=>a.target===board&&a.options.duration===1150));
  controller.abort();
  assert.ok(animations.every(a=>a.cancelled));assert.equal(board.style.transformOrigin,'');
  assert.equal(doc.querySelector('.learn-scene-layer'),null);
  await pending;
  const resize=centeredMorph(doc,capturePanels([source]),[target],{board,fromBoard:{x:80,y:132,width:700},exiting:true});
  assert.ok(animations.some(a=>a.target===board&&a.options.duration===720));
  dom.window.dispatchEvent(new dom.window.Event('resize'));await resize;
  assert.equal(doc.querySelector('.learn-scene-layer'),null);
});

test('workspace transitions measure and animate the square grid rather than its wider review wrapper',async t=>{
  const {dom,doc,source,board,target,animations}=scene(t),grid=board.querySelector('.board');
  grid.getBoundingClientRect=()=>({x:344,y:112,width:540,height:540});
  const w=new LearningWorkspace({document:doc,storage:{},settings:()=>({moveAnim:true}),embedded:{boardWrap:board}});
  w.boardElement=grid;
  const pending=w.transitionPanels(capturePanels([source]),[target],{fromBoard:grid.getBoundingClientRect()});
  const effect=animations.find(a=>a.target===grid);
  assert.ok(effect);assert.equal(effect.frames[0].transform,'translate(0px, 0px) scale(1)');
  assert.equal(animations.some(a=>a.target===board),false);
  w.motionController.abort();await pending;
});

test('reduced motion skips board and panel movement',async t=>{
  const {dom,doc,source,board,target,animations}=scene(t),rect=board.getBoundingClientRect();
  dom.window.matchMedia=()=>({matches:true});
  await centeredMorph(doc,capturePanels([source]),[target],{board,fromBoard:rect});
  assert.equal(animations.length,0);assert.equal(doc.querySelector('.learn-scene-layer'),null);
});

test('Morph in place 3 keeps settings and learning open together and Escape closes settings first',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  a.state.settings.learningTransition='morph3';
  const originalFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({schema:1,puzzles:[{rating:1200,themes:['fork']}]})});
  t.after(()=>{globalThis.fetch=originalFetch;});
  await a.call('openLearning');const w=a.run('learningWorkspace'),doc=a.dom.window.document,board=doc.querySelector('.board');
  await a.call('toggleSettings');assert.equal(a.run('learningWorkspace'),w);
  assert.equal(doc.querySelector('#settings').hidden,false);assert.equal(doc.querySelector('.board'),board);
  doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(doc.querySelector('#settings').hidden,true);assert.equal(a.run('learningWorkspace'),w);
  await w.close();assert.equal(a.run('learningWorkspace'),null);assert.equal(doc.body.style.overflow,'');
  assert.equal(doc.querySelector('.has-learning-morph3'),null);assert.equal(doc.querySelector('.board'),board);
});
