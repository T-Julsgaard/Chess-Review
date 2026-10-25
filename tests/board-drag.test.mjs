import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame} from './helpers/app.mjs';
import {Chess} from '../lib/chess.js';

async function setup(t,mode,flipped=false) {
  const standalone=mode==='standalone puzzle';
  const a=app(t,standalone?{url:'https://extension.test/analysis.html?workspace=blank'}:{});
  a.replace('startAnalysis',()=>{});
  if(standalone){a.replace('resetSettingsForRelease',async()=>{});await a.start();}
  else {loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');}
  let w;
  if(['puzzle','opening library','standalone puzzle'].includes(mode)) {
    const puzzle={id:'drag-bounds',fen:new Chess().fen(),solution:['e2e4','e7e5','g1f3'],rating:1200,themes:[]};
    t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
    await a.call('openLearning');w=a.run('learningWorkspace');
    if(mode==='opening library')await w.navigate('openings');
    else {w.puzzles=[puzzle];await w.startPuzzleSelection([puzzle]);}
    if(flipped)w.flipBoard();
  } else {
    if(mode==='practice')a.state.practice={spots:[1],i:0,solving:true,busy:false};
    if(flipped)a.call('toggleFlip');
  }
  const doc=a.dom.window.document,view=a.dom.window,board=doc.querySelector(standalone?'.learn-board':'.board');
  let rect={left:123.5,top:87.25,width:480,height:480};
  board.getBoundingClientRect=()=>rect;
  const pointer=(target,type,x,y,id=1)=>{
    const e=new view.MouseEvent(type,{bubbles:true,cancelable:true,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y});
    Object.defineProperty(e,'pointerId',{value:id});target.dispatchEvent(e);
  };
  const point=sq=>({x:rect.left+((flipped?7-(sq.charCodeAt(0)-97):sq.charCodeAt(0)-97)+.5)*rect.width/8,
    y:rect.top+((flipped?Number(sq[1])-1:8-Number(sq[1]))+.5)*rect.height/8});
  const origin=w?board.querySelector('[data-square=e2]'):a.run('sqByName.e2');
  const down=()=>{const {x,y}=point('e2');pointer(origin,'pointerdown',x,y);};
  return {a,w,doc,board,origin,down,point,pointer,view,get rect(){return rect;},resize:()=>{rect={left:40,top:60,width:320,height:320};}};
}

for(const mode of ['review','practice','puzzle','opening library','standalone puzzle'])for(const flipped of [false,true]) {
  test(`${mode} drag stops halfway outside every board edge${flipped?' when flipped':''}`,async t=>{
    const s=await setup(t,mode,flipped),{a,w,doc,down,pointer,view}=s;
    const before=w?w.currentFen():a.call('activePos').fen;
    down();const ghost=doc.querySelector('.drag-piece'),original=s.origin.querySelector('img');
    assert.ok(ghost);assert.equal(original.style.visibility,'hidden');assert.equal(original.draggable,false);
    const position=()=>[parseFloat(ghost.style.left),parseFloat(ghost.style.top)];
    const r=s.rect,right=r.left+r.width,bottom=r.top+r.height,middleX=r.left+r.width/2,middleY=r.top+r.height/2;
    assert.deepEqual(position(),[s.point('e2').x,s.point('e2').y]);
    for(const [x,y,expectedX,expectedY] of [
      [r.left-500,middleY,r.left,middleY],[right+500,middleY,right,middleY],
      [middleX,r.top-500,middleX,r.top],[middleX,bottom+500,middleX,bottom],
      [r.left-500,r.top-500,r.left,r.top],[right+500,bottom+500,right,bottom],
      [r.left-500,bottom+500,r.left,bottom],[right+500,r.top-500,right,r.top],
      [middleX,middleY,middleX,middleY],
    ]) {pointer(view,'pointermove',x,y);assert.deepEqual(position(),[expectedX,expectedY]);}
    pointer(view,'pointermove',right+500,bottom+500,2);assert.deepEqual(position(),[middleX,middleY],'Other pointers cannot move the piece');
    s.resize();pointer(view,'pointermove',-1000,2000);assert.deepEqual(position(),[40,380],'Bounds follow a resized or repositioned board');
    pointer(view,'pointerup',-1000,2000);
    assert.equal(doc.querySelector('.drag-piece'),null);assert.equal(original.style.visibility,'');
    assert.equal(w?w.currentFen():a.call('activePos').fen,before,'Releasing outside does not play an edge-square move');
    if(w)await w.close();
  });
}

test('a piece can return from the boundary and drop on a legal square',async t=>{
  const s=await setup(t,'review'),{a,doc,down,pointer,view}=s;
  down();pointer(view,'pointermove',-1000,-1000);
  const {x,y}=s.point('e4');pointer(view,'pointermove',x,y);
  const ghost=doc.querySelector('.drag-piece');assert.equal(parseFloat(ghost.style.left),x);assert.equal(parseFloat(ghost.style.top),y);
  pointer(view,'pointerup',x,y);
  assert.equal(doc.querySelector('.drag-piece'),null);assert.equal(new Chess(a.call('activePos').fen).get('e4')?.type,'p');
});

test('a standalone puzzle pickup follows a repainted board and clears its selection on outside release',async t=>{
  const {w,doc,board,down,pointer,view}=await setup(t,'standalone puzzle');
  down();const ghost=doc.querySelector('.drag-piece');
  w.render({preservePickup:true});const replacement=doc.querySelector('.learn-board');
  assert.notEqual(replacement,board);assert.equal(doc.querySelector('.drag-piece'),ghost);
  replacement.getBoundingClientRect=()=>({left:30,top:80,width:320,height:320});
  const original=replacement.querySelector('[data-square=e2] img');assert.equal(original.style.visibility,'hidden');
  pointer(view,'pointermove',10000,10000);
  assert.equal(ghost.style.left,'350px');assert.equal(ghost.style.top,'400px');
  pointer(view,'pointerup',10000,10000);
  assert.equal(doc.querySelector('.drag-piece'),null);assert.equal(original.style.visibility,'');
  assert.equal(w.selected,null);assert.equal(replacement.querySelector('.sel, .legal, .legal-cap'),null);
  await w.close();
});
