import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame} from './helpers/app.mjs';
function practice(t,build='nnue'){
  const a=app(t);loadGame(a,'1. e4 e5');Object.assign(a.state.settings,{enginePath:build,engineDepth:16,engineHash:16,engineSkill:20,engineLines:1,classifyLines:1});
  a.state.bests[0]={bestmove:'e2e4',score:{cp:40},lines:[{multipv:1,score:{cp:40},pv:'e2e4'}]};a.call('computeDerived');a.call('buildUI');a.call('renderAll');a.state.practice={spots:[1],i:0,solving:true,busy:false};return a;
}
for(const build of ['nnue','sf19lite'])test(build+': practice accepts only the stored best move immediately without engine work',t=>{
  const a=practice(t,build),root=a.state.bests[0],original=JSON.stringify(root);
  a.replace('createEngine',()=>{assert.fail('Practice must not start an engine');});
  a.call('practiceAttempt','d2','d4');assert.equal(a.state.practice.fails,1);assert.equal(a.state.practice.busy,false);
  root.lines.push({score:{cp:40},pv:'g1f3'});
  a.call('practiceAttempt','g1','f3');assert.equal(a.state.practice.fails,2);assert.equal(a.state.practice.solving,true);
  root.lines.pop();assert.equal(JSON.stringify(root),original);
  a.call('practiceAttempt','e2','e4');assert.equal(a.state.practice.solving,false);
  assert.equal(a.state.practice.busy,false);assert.equal(JSON.stringify(root),original);
});

test('illegal practice input remains uncounted and does not lock the board',t=>{
  const a=practice(t);a.call('practiceAttempt','e2','e5');
  assert.equal(a.state.practice.fails||0,0);assert.equal(a.state.practice.solving,true);assert.equal(a.state.practice.busy,false);
});

test('the first wrong practice move offers one working Hint button inside the coach message',t=>{
  const a=practice(t),doc=a.dom.window.document;
  a.call('renderReview');
  assert.equal(doc.querySelector('.practice-coach .ip-hint-btn'),null);
  a.call('practiceAttempt','e2','e5');
  assert.equal(doc.querySelector('.practice-coach .ip-hint-btn'),null);
  a.call('practiceAttempt','d2','d4');
  const coach=doc.querySelector('.practice-coach');
  assert.equal(coach.querySelector('.ip-text').textContent,'Click to get a Hint');
  assert.equal(coach.querySelector('.ip-head button'),null);
  assert.equal(coach.querySelectorAll('.ip-hint-btn').length,1);
  coach.querySelector('.ip-text button').click();
  assert.equal(a.state.practice.hinted,true);
  assert.equal(a.run('sqByName.e2').classList.contains('hint-from'),true);
  assert.equal(doc.querySelectorAll('.sq.hint-from').length,1);
  assert.ok(doc.querySelector('.practice-coach .ip-text .ip-hint-btn.on'));
  a.call('practiceAttempt','g1','f3');
  assert.equal(doc.querySelectorAll('.practice-coach .ip-hint-btn').length,1);
  a.call('practiceAttempt','e2','e4');
  assert.equal(doc.querySelector('.practice-coach .ip-hint-btn'),null);
  a.call('practiceEnterSolve');
  assert.equal(a.state.practice.fails,0);
  assert.equal(a.state.practice.hinted,false);
  assert.equal(doc.querySelector('.practice-coach .ip-hint-btn'),null);
  assert.equal(doc.querySelector('.sq.hint-from'),null);
});

test('an alternative checkmate is rejected unless it is the stored answer',t=>{
  const a=app(t);loadGame(a,'[SetUp "1"]\n[FEN "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1"]\n\n1. Qg7#');
  a.state.bests[0]={bestmove:'f7g7',score:{mate:1},lines:[{score:{mate:1},pv:'f7g7'}]};
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');a.state.practice={spots:[1],i:0,solving:true,busy:false};
  a.call('practiceAttempt','f7','h7');assert.equal(a.state.practice.solving,true);assert.equal(a.state.practice.fails,1);
  a.call('practiceAttempt','f7','g7');assert.equal(a.state.practice.solving,false);
});

test('queen stalemate fails and rook promotion is accepted as a distinct move',async t=>{
  const a=app(t);loadGame(a,'[SetUp "1"]\n[FEN "8/k1P5/2K5/8/8/8/8/8 w - - 0 1"]\n\n1. Kb5');a.state.bests[0]={bestmove:'c7c8r',score:{mate:2},lines:[{score:{mate:2},pv:'c7c8r'}]};a.call('computeDerived');a.call('buildUI');a.call('renderAll');a.state.practice={spots:[1],i:0,solving:true,busy:false};
  await a.call('practiceAttempt','c7','c8','q');assert.equal(a.state.practice.solving,true);assert.equal(a.state.practice.fails,1);
  await a.call('practiceAttempt','c7','c8','r');assert.equal(a.state.practice.solving,false);assert.equal(a.run('sqByName.c8').querySelector('.piece-img').dataset.piece,'wR');
});
