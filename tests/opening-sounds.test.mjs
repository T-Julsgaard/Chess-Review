import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

async function setup(t) {
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const sounds=[];a.state.settings.sound=true;
  a.replace('playEvent',event=>sounds.push(event));
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[{
    id:'opening-sound-fixture',fen:a.state.positions[0].fen,solution:['e2e4'],rating:1200,themes:[],
  }]})}));
  await a.call('openLearning');const w=a.run('learningWorkspace');
  t.after(()=>w.close());
  const key=name=>a.dom.window.document.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true}));
  return {a,w,sounds,key};
}

test('opening buttons, keyboard and move list play move and castling sounds in both directions',async t=>{
  const {w,sounds,key}=await setup(t);await w.startOpening('italian');
  assert.deepEqual(sounds,[]);
  w.root.querySelector('[data-focus="opening-next"]').click();
  key('ArrowRight');
  w.root.querySelector('[data-focus="opening-move-8"]').click();
  key('ArrowLeft');
  w.root.querySelector('[data-focus="opening-prev"]').click();
  assert.deepEqual(sounds,['move','move','castle','castle','move']);
});

test('opening checks override captures, including when undoing a checking capture',async t=>{
  const {w,sounds}=await setup(t);await w.startOpening('nimzo',{line:1,ply:7,color:'b'});
  assert.deepEqual(sounds,[]);
  w.stepOpening(8); // Bxc3+
  w.stepOpening(7); // Undo Bxc3+, rather than sounding the quiet a3.
  w.stepOpening(9); // bxc3
  assert.deepEqual(sounds,['check','check','capture']);
});

test('opening sounds respect mute changes while navigation still advances',async t=>{
  const {a,w,sounds}=await setup(t);await w.startOpening('italian');
  a.state.settings.sound=false;w.stepOpening(1);assert.equal(w.activity.ply,1);
  a.state.settings.sound=true;w.stepOpening(2);
  a.state.settings.sound=false;w.stepOpening(1);
  assert.deepEqual(sounds,['move']);
});

test('opening boundaries and repeated selections stay silent; returning to the start sounds the undone move',async t=>{
  const {w,sounds,key}=await setup(t);await w.startOpening('italian');
  w.stepOpening(-1);w.stepOpening(0);assert.deepEqual(sounds,[]);
  key('ArrowRight');key('ArrowLeft');
  assert.deepEqual(sounds,['move','move']);
  key('End');const count=sounds.length;
  w.stepOpening(w.openingState.moves.length+1);key('End');
  w.root.querySelector('[aria-current="step"]').click();
  assert.equal(sounds.length,count);
  await w.navigate('openings');w.stepOpening(1);assert.equal(sounds.length,count);
});
