import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame,settle} from './helpers/app.mjs';

function review(t){const a=app(t);loadGame(a,'1. e4 d5 2. exd5 Qxd5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');return a;}
test('navigation retains graph/player nodes and updates turns, clocks and captured material',t=>{
  const a=review(t),S=a.state,doc=a.dom.window.document;S.clocks=['','9:59','9:58','9:55','9:54'];S.headers.TimeControl='600';a.call('renderPlayers');
  const top=doc.querySelector('#playerTop .player-strip'),bottom=doc.querySelector('#playerBot .player-strip'),name=bottom.querySelector('.name');
  const svg=doc.querySelector('#graphMount svg');let alignments=0;a.replace('alignPlayers',()=>alignments++);
  a.call('go',1);assert.equal(doc.querySelector('#playerBot .player-strip'),bottom);assert.equal(bottom.querySelector('.name'),name);
  assert.equal(top.classList.contains('active'),true);assert.equal(bottom.querySelector('.clock').textContent,'9:59');
  a.call('go',3);assert.equal(bottom.querySelectorAll('.cap-pc').length,1);assert.equal(bottom.querySelector('.adv').textContent,'+1');
  a.call('go',4);assert.equal(top.querySelectorAll('.cap-pc').length,1);assert.equal(bottom.querySelector('.adv'),null);
  a.call('go',0);assert.equal(top.querySelectorAll('.cap-pc').length,0);assert.equal(bottom.querySelector('.clock').textContent,'10:00');
  assert.equal(doc.querySelector('#graphMount svg'),svg);assert.equal(alignments,0,'navigation must not force board alignment layout');
  S.players.w.name='Updated';a.call('renderPlayers');assert.equal(doc.querySelector('#playerBot .name').textContent,'Updated');assert.equal(alignments,1);
});
test('every graph style retains its hover targets and changes geometry when evidence changes',t=>{
  const a=review(t),S=a.state,doc=a.dom.window.document;
  for(const style of ['area','line','minimal','color']){
    S.settings.graphStyle=style;a.call('renderGraph');const svg=doc.querySelector('#graphMount svg'),hover=svg.querySelector('.eval-hover');
    a.call('go',1);assert.equal(doc.querySelector('#graphMount svg'),svg);assert.equal(svg.querySelector('.eval-hover'),hover);
    assert.equal(+svg.querySelector('.eval-position').getAttribute('x1'),384/S.total);
    S.evals[1]={cp:(S.evals[1]?.cp||0)+100};a.call('renderGraph');assert.notEqual(doc.querySelector('#graphMount svg'),svg);
  }
  S.settings.evalView='bar';a.call('renderGraph');assert.equal(doc.querySelector('#graphMount svg'),null);
  S.settings.evalView='both';a.call('renderGraph');assert.ok(doc.querySelector('#graphMount svg'));
});

test('every graph style hides the position marker at both game endpoints, including after redraws',t=>{
  const a=review(t),S=a.state,doc=a.dom.window.document;
  for(const style of ['area','line','minimal','color']){
    S.settings.graphStyle=style;S.idx=0;a.call('renderGraph');
    const svg=doc.querySelector('#graphMount svg'),marker=svg.querySelector('.eval-position');
    assert.equal(marker.style.display,'none');
    for(const ply of [1,S.total,2,0]){
      a.call('go',ply);
      assert.equal(doc.querySelector('#graphMount svg'),svg);
      assert.equal(marker.style.display,ply===0||ply===S.total?'none':'');
    }
    S.idx=S.total;S.evals[1]={cp:(S.evals[1]?.cp||0)+100};a.call('renderGraph');
    assert.equal(doc.querySelector('.eval-position').style.display,'none');
  }
  loadGame(a,'1. e4');a.call('computeDerived');
  for(const ply of [0,1]){a.call('go',ply);assert.equal(doc.querySelector('.eval-position').style.display,'none');}
});
test('unchanged engine panels stay mounted and returning from practice restores the real lines',t=>{
  const a=review(t),doc=a.dom.window.document,lines=[{score:{cp:30},pv:'e2e4',depth:16}];
  a.call('renderEngine',lines);const panel=doc.querySelector('#engineMount .panel');a.call('renderEngine',lines);
  assert.equal(doc.querySelector('#engineMount .panel'),panel);
  a.call('renderEnginePractice');a.call('renderEngine',lines);assert.notEqual(doc.querySelector('#engineMount .panel'),panel);
  assert.match(doc.querySelector('#engineMount').textContent,/0.30/);
});
test('library keeps unchanged cards and controls, updates payloads and bounds retained cards',async t=>{
  const a=review(t),S=a.state,doc=a.dom.window.document;S.library=Array.from({length:300},(_,i)=>({id:'game-'+i,opName:'Opponent '+i,myAcc:80,result:'win',savedAt:i,type:'blitz',pgn:'1. e4 e5',meta:{}}));
  a.call('renderLibrary');const cards=[...doc.querySelectorAll('.lib-card')],control=doc.querySelector('.lib-dd-btn');a.call('renderLibrary');
  assert.deepEqual([...doc.querySelectorAll('.lib-card')],cards);assert.equal(doc.querySelector('.lib-dd-btn'),control);
  S.library=S.library.map(r=>r.id==='game-299'?{...r,pgn:'1. d4 d5',fav:true}:r);a.call('renderLibrary');
  assert.notEqual(doc.querySelector('.lib-card'),cards[0]);assert.equal(doc.querySelectorAll('.lib-card')[1],cards[1]);
  let selected;a.replace('openLibraryGame',rec=>{selected=rec;});doc.querySelector('.lc-open').click();assert.equal(selected.pgn,'1. d4 d5');
  S.libResult='loss';a.call('renderLibrary');assert.equal(doc.querySelectorAll('.lib-card').length,0);
  S.libResult='all';a.call('renderLibrary');assert.equal(doc.querySelectorAll('.lib-card').length,300);
  S.library=S.library.slice(0,1);a.call('renderLibrary');assert.equal(a.run('UI.libraryCards.size'),1);
  await settle();
});
