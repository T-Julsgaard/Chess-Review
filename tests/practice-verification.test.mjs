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

for(const input of ['click','drag'])test(`correct practice ${input} clears legal move dots immediately while keeping the success badge`,t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const a=practice(t),doc=a.dom.window.document,board=doc.querySelector('.board'),view=a.dom.window;
  a.call('showPracticeHint');assert.ok(board.querySelector('.hint-from'));
  board.getBoundingClientRect=()=>({left:0,top:0,width:800,height:800});
  const pointer=(target,type,x,y)=>{
    const event=new view.MouseEvent(type,{bubbles:true,cancelable:true,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y});
    Object.defineProperty(event,'pointerId',{value:1});target.dispatchEvent(event);
  };
  pointer(a.run('sqByName.e2'),'pointerdown',450,650);
  assert.ok(board.querySelector('.legal'));
  if(input==='click'){
    pointer(view,'pointerup',450,650);
    pointer(a.run('sqByName.e4'),'pointerdown',450,450);
  }else{
    pointer(view,'pointermove',450,450);
    pointer(view,'pointerup',450,450);
  }
  assert.equal(a.state.practice.solving,false);
  assert.equal(a.state.selectedSq,null);
  assert.equal(board.querySelector('.sel, .legal, .legal-cap'),null);
  assert.equal(board.querySelector('.hint-from'),null);
  assert.ok(a.run('sqByName.e4').querySelector('.piece-img[data-piece=wP]'));
  assert.ok(a.run('sqByName.e4').querySelector('.puzzle-result-badge[data-result=correct]'));
  t.mock.timers.tick(680);
  assert.equal(board.querySelector('.flash-good, .hint-from'),null,'the hint must remain absent after the success flash fades');
  assert.ok(a.run('sqByName.e4').querySelector('.puzzle-result-badge[data-result=correct]'));
});

test('a solved hint stays cleared throughout the roll and demo for the next practice move',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const a=practice(t),board=a.dom.window.document.querySelector('.board');
  a.state.practice.spots=[1,2];
  a.call('showPracticeHint');
  a.call('practiceAttempt','e2','e4');
  for(const elapsed of [680,620,240,95,650,760,780]){
    t.mock.timers.tick(elapsed);
    assert.equal(board.querySelector('.hint-from'),null);
    assert.equal(a.state.practiceHint,null);
  }
  assert.equal(a.state.practice.i,1);assert.equal(a.state.practice.solving,true);
});

test('correct practice captures also clear legal capture rings',t=>{
  const a=app(t);loadGame(a,'[SetUp "1"]\n[FEN "7k/8/8/3p4/2P5/8/8/7K w - - 0 1"]\n\n1. cxd5');
  a.state.bests[0]={bestmove:'c4d5',score:{cp:0},lines:[]};
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  a.state.practice={spots:[1],i:0,solving:true,busy:false};a.state.selectedSq='c4';a.call('renderSelection');
  const board=a.dom.window.document.querySelector('.board');
  assert.ok(board.querySelector('.legal-cap'));
  a.call('practiceAttempt','c4','d5');
  assert.equal(a.state.selectedSq,null);
  assert.equal(board.querySelector('.sel, .legal, .legal-cap'),null);
  assert.ok(a.run('sqByName.d5').querySelector('.puzzle-result-badge[data-result=correct]'));
});

test('repeated incorrect attempts replay the full board shake and red flashes alongside the badge',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const a=practice(t),board=a.dom.window.document.querySelector('.board');
  const from=a.run('sqByName.d2'),to=a.run('sqByName.d4');
  a.call('practiceAttempt','d2','d4');
  assert.ok(board.classList.contains('buzz'));
  assert.ok(from.classList.contains('flash-bad'));assert.ok(to.classList.contains('flash-bad'));
  assert.ok(from.querySelector('.puzzle-result-badge[data-result=incorrect]'));
  t.mock.timers.tick(300);a.call('practiceAttempt','d2','d4');
  t.mock.timers.tick(120);
  assert.ok(board.classList.contains('buzz'),'the previous attempt must not cut the new shake short');
  t.mock.timers.tick(260);
  assert.ok(from.classList.contains('flash-bad'));assert.ok(to.classList.contains('flash-bad'));
  t.mock.timers.tick(40);assert.equal(board.classList.contains('buzz'),false);
  t.mock.timers.tick(260);
  assert.equal(from.classList.contains('flash-bad'),false);assert.equal(to.classList.contains('flash-bad'),false);
  assert.ok(from.querySelector('.puzzle-result-badge[data-result=incorrect]'));
  assert.ok(from.querySelector('.piece-img[data-piece=wP]'));
  assert.equal(a.state.practice.fails,2);assert.equal(a.state.practice.solving,true);
  t.mock.timers.tick(320);assert.equal(board.querySelector('.puzzle-result-badge'),null);
});

test('the Hint button sits beside Exit and works before any attempt; the coach asks for a stronger move',t=>{
  const a=practice(t),doc=a.dom.window.document;
  a.call('renderControls');a.call('renderReview');
  const coach=doc.querySelector('.practice-coach');
  assert.equal(a.state.practice.coachLine,'Find a stronger move');
  assert.equal(coach.querySelector('button'),null,'no hint button inside the insights panel');
  const hint=doc.querySelector('#controls .practice-hint');
  assert.ok(hint.nextElementSibling.classList.contains('exit-analysis'));
  hint.click();
  assert.equal(a.state.practice.hinted,true);
  assert.equal(a.run('sqByName.e2').classList.contains('hint-from'),true);
  assert.equal(doc.querySelectorAll('.sq.hint-from').length,1);
  assert.ok(hint.classList.contains('on'));
  a.call('practiceAttempt','g1','f3');
  assert.equal(doc.querySelector('.practice-coach .ip-text').textContent,'Find a stronger move');
  a.call('practiceAttempt','e2','e4');
  assert.equal(hint.classList.contains('on'),false);
  a.call('practiceEnterSolve');
  assert.equal(a.state.practice.fails,0);
  assert.equal(a.state.practice.hinted,false);
  assert.equal(doc.querySelector('.sq.hint-from'),null);
});

test('Hint pressed during the roll or mistake replay lights the piece once it is the player\'s turn',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const a=practice(t),doc=a.dom.window.document;
  a.state.practice.solving=false;a.state.idx=0;a.call('renderControls');
  a.call('practiceRoll',0,()=>a.call('practiceEnterSolve'));
  const hint=doc.querySelector('#controls .practice-hint');
  assert.equal(a.state.practice.demoing,true);
  hint.click();
  assert.equal(doc.querySelector('.sq.hint-from'),null);
  assert.ok(hint.classList.contains('on'),'queued hint shows as pressed');
  for(const ms of [650,760,780])t.mock.timers.tick(ms);
  assert.equal(a.state.practice.solving,true);
  assert.equal(a.run('sqByName.e2').classList.contains('hint-from'),true);
  assert.equal(a.state.practice.hintQueued,false);
});

test('long practice rolls speed up and arrive within 3 seconds; short ones keep the steady pace',t=>{
  const a=app(t);
  assert.deepEqual([...a.call('practiceRollTimes',10)],Array.from({length:11},(_,k)=>k*95));
  for(const n of [40,120,300]){
    const times=[...a.call('practiceRollTimes',n)],gaps=times.slice(1).map((v,k)=>v-times[k]);
    assert.equal(times.length,n+1);
    assert.ok(240+times[n]<=3000+1e-6,`${n} plies take ${240+times[n]} ms`);
    assert.ok(240+times[n]>2900,'the budget is used, not undershot');
    assert.equal(gaps[0],95,'starts at the normal pace');
    for(let k=1;k<gaps.length;k++)assert.ok(gaps[k]<=gaps[k-1]+1e-9,'never slows down');
  }
});

test('a long roll reaches the first mistake within 3 seconds and still lands on it',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const a=app(t);
  const moves=[];for(let i=0;i<30;i++)moves.push(i%4<2?['Nf3','Nf6'][i%2]:['Ng1','Ng8'][i%2]);
  let pgn='';moves.forEach((m,i)=>{if(i%2===0)pgn+=`${i/2+1}. `;pgn+=m+' ';});
  loadGame(a,pgn.trim());a.call('buildUI');a.call('renderAll');
  a.state.idx=a.state.total;a.state.practice={spots:[1],i:0,solving:false,busy:false};
  let arrived=null,elapsed=0;
  a.call('practiceRoll',0,()=>{arrived=elapsed;});
  while(arrived===null&&elapsed<5000){t.mock.timers.tick(1);elapsed+=1;}
  assert.equal(a.state.idx,0);
  assert.ok(arrived!==null&&arrived<=3000+16,`arrived after ${arrived} ms`);
  assert.ok(arrived>2500,'a 30-ply roll still uses most of the budget, not a jump cut');
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
