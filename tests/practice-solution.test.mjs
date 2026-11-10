import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame} from './helpers/app.mjs';
import {explainBetterMove} from '../lib/move-explanation.js';
import {Chess} from '../lib/chess.js';

function practice(t,{pgn='1. e4 e5',mode='normal',spots=[1]}={}) {
  const a=app(t);a.replace('typeWrite',(node,text)=>{node.textContent=text;});
  t.mock.timers.enable({apis:['setTimeout']});
  loadGame(a,pgn);
  Object.assign(a.state.settings,{reviewMode:mode,engineDepth:16,engineHash:16,engineSkill:20,engineLines:1,classifyLines:1,sound:false,moveAnim:false});
  a.state.bests[0]={bestmove:'d2d4',score:{cp:40},pv:'d2d4 d7d5 c2c4',lines:[{multipv:1,score:{cp:40},pv:'d2d4 d7d5 c2c4'}]};
  a.state.evals[0]={cp:40};a.state.evals[1]={cp:-120};
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  a.state.practice={spots,i:0,solving:true,busy:false,rolling:false,rollT:null,demoT:[],fails:0};
  return a;
}
const solve=a=>a.call('practiceAttempt','d2','d4');

test('the practice button is in the same place on every move, in Normal and Dopamine',t=>{
  for(const mode of ['normal','dopamine']) {
    const a=app(t);a.replace('typeWrite',(node,text)=>{node.textContent=text;});
    loadGame(a,'1. e4 e5 2. Nf3 Nc6');a.state.settings.reviewMode=mode;a.call('computeDerived');a.call('buildUI');a.call('renderAll');
    const doc=a.dom.window.document;
    for(const ply of [0,1,2,3,4]) {
      a.call('go',ply);
      assert.equal(doc.querySelectorAll('.insight-panel .ip-opening .practice-btn').length,1,`${mode} ply ${ply}`);
    }
  }
});

test('the button starts practice from a later move',t=>{
  const a=app(t);a.replace('typeWrite',(node,text)=>{node.textContent=text;});let started=0;
  loadGame(a,'1. e4 e5 2. Nf3 Nc6');a.replace('startPractice',()=>{started++;});
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');a.call('go',3);
  a.dom.window.document.querySelector('.practice-btn').click();
  assert.equal(started,1);
});

test('a long jump takes at most six strides and a short one still plays every move',t=>{
  const moves=Array.from({length:60},(_,i)=>`${i+1}. ${i%2?'Ng1 Ng8':'Nf3 Nf6'}`).join(' ');
  t.mock.timers.enable({apis:['setTimeout']});
  const a=app(t);loadGame(a,moves);a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const seen=[];let arrived=false;a.replace('paintBoard',()=>{seen.push(a.state.idx);});
  a.state.practice={spots:[100],i:0,demoT:[]};a.state.idx=0;
  a.call('practiceRoll',100,()=>{arrived=true;});
  for(let i=0;i<8;i++)t.mock.timers.tick(i?70:120);
  assert.equal(arrived,true);assert.equal(a.state.idx,100);assert.ok(new Set(seen).size<=7,JSON.stringify(seen));
  seen.length=0;arrived=false;a.state.practice={spots:[103],i:0,demoT:[]};
  a.call('practiceRoll',103,()=>{arrived=true;});for(let i=0;i<5;i++)t.mock.timers.tick(i?95:240);
  assert.equal(arrived,true);assert.deepEqual([...new Set(seen)],[100,101,102,103]);
});

test('a correct answer explains itself and waits for Next instead of skipping on',t=>{
  for(const mode of ['normal','dopamine']) {
    const a=practice(t,{mode,spots:[1,2]}),doc=a.dom.window.document;let advanced=0;
    a.replace('practiceRoll',()=>{advanced++;});
    solve(a);
    t.mock.timers.tick(10000);
    assert.equal(advanced,0);assert.ok(a.state.practice.solved);
    assert.match(doc.querySelector('.practice-solved .ip-good').textContent,/Correct/);
    assert.match(doc.querySelector('.practice-why').textContent,/^Your e4:/);
    assert.equal(a.call('activePos').san,'d4');
    doc.querySelector('.practice-next').click();
    assert.equal(advanced,1);assert.equal(a.state.practice.solved,null);assert.equal(a.state.practice.preview,null);
    t.mock.timers.reset();
  }
});

test('a repaint keeps the solved move on the board',t=>{
  const a=practice(t),doc=a.dom.window.document;
  solve(a);a.call('paintBoard');
  assert.equal(a.call('activePos').fen.split(' ')[0],'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR');
  assert.equal(doc.querySelectorAll('.puzzle-result-badge').length,1);
});

test('Enter and the right arrow move on, but only once the answer is solved',t=>{
  const a=practice(t,{spots:[1,2]}),{KeyboardEvent}=a.dom.window;let advanced=0;
  a.replace('practiceAdvance',()=>{advanced++;});
  const press=key=>a.dom.window.document.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));
  press('Enter');assert.equal(advanced,0);
  solve(a);press('Enter');assert.equal(advanced,1);
  a.state.practice.solved={};press('ArrowRight');assert.equal(advanced,2);
});

test('the last mistake finishes from its button',t=>{
  const a=practice(t),doc=a.dom.window.document;let finished=0;
  a.replace('finishPractice',()=>{finished++;});
  solve(a);
  assert.equal(doc.querySelector('.practice-next').textContent,'Finish');assert.match(doc.querySelector('.practice-solved .ip-good').textContent,/last one/);
  doc.querySelector('.practice-next').click();assert.equal(finished,1);
});

test('Show line plays the engine reply on the board, and Next cancels it',t=>{
  const a=practice(t,{spots:[1,2]}),doc=a.dom.window.document;
  a.replace('practiceRoll',()=>{});
  solve(a);
  [...doc.querySelectorAll('.practice-actions button')].find(button=>button.textContent==='Show line').click();
  t.mock.timers.tick(300);assert.equal(a.call('activePos').san,'d5');
  t.mock.timers.tick(800);assert.equal(a.call('activePos').san,'c4');
  doc.querySelector('.practice-next').click();t.mock.timers.tick(5000);
  assert.equal(a.state.practice.preview,null);
});

test('solving starts no engine work',t=>{
  const a=practice(t);a.replace('createEngine',()=>{assert.fail('Practice must not start an engine');});
  solve(a);t.mock.timers.tick(5000);assert.ok(a.state.practice.solved);
});

test('explanations name what the better move actually does',()=>{
  const explain=(fen,answer,bestPv,played,playedFen,scores)=>explainBetterMove({fen,answer,played,playedFen,category:'blunder',bestPv,replyPv:'',...scores});
  const after=(fen,san)=>{const chess=new Chess(fen);chess.move(san);return chess.fen();};
  const mate='r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 4';
  assert.match(explain(mate,'f3f7','f3f7','a3',after(mate,'a3'),{bestScore:{mate:1},playedScore:{cp:50}}).summary,/^Qxf7# is checkmate\.$/);
  const forced='6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
  assert.match(explain(forced,'a1a8','a1a8','h3',after(forced,'h3'),{bestScore:{mate:1},playedScore:{cp:500}}).summary,/checkmate/);
  const hanging='rnb1kbnr/pppp1ppp/8/4p3/4P1q1/8/PPPPQPPP/RNB1KBNR w KQkq - 0 3';
  const win=explain(hanging,'e2g4','e2g4 g8f6','d3',after(hanging,'d3'),{bestScore:{cp:900},playedScore:{cp:-100}});
  assert.equal(win.summary,'Qxg4 wins the queen on g4.');assert.match(win.mistake,/^Your d3:/);assert.match(win.evaluation,/Qxg4: \+9\.0 · d3: -1\.0/);
  const quiet=new Chess().fen();
  const better=explain(quiet,'e2e4','e2e4 e7e5','a3',after(quiet,'a3'),{bestScore:{cp:40},playedScore:{cp:-80}});
  assert.equal(better.summary,'e4 is 1.2 pawns better than a3.');
  assert.equal(explain(quiet,'e2e4','e2e4','e3',after(quiet,'e3'),{bestScore:{cp:30},playedScore:{cp:20}}).summary,"e4 is Stockfish's first choice here.");
  assert.equal(explain(quiet,'e2e4','e2e4','f3',after(quiet,'f3'),{bestScore:{cp:-500},playedScore:{mate:-1}}).summary,'e4 avoids the forced mate.');
});

test('a broken engine line never invents an explanation',()=>{
  assert.equal(explainBetterMove({fen:new Chess().fen(),answer:'e2e5',played:'e4',playedFen:new Chess().fen(),bestPv:'e2e5'}),null);
});
