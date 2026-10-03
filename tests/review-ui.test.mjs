import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, branch, settle, fakeEngine } from './helpers/app.mjs';

function board(t,pgn='1. e4 e5') {
  const a=app(t);loadGame(a,pgn);branch(a);
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');return a;
}

test('making an alternative preserves capture and promotion metadata for classification',async t=>{
  const a=board(t,'1. e4 d5');a.state.liveEngine=fakeEngine();
  a.call('applyUserMove','e4','d5',false);await settle();
  const pos=a.state.variation.positions.at(-1);assert.equal(pos.san,'exd5');assert.equal(pos.captured,'p');
  assert.ok(a.dom.window.document.querySelector('#controls .exit-analysis'));
  a.call('exitAnalysis');assert.equal(a.state.analysisMode,false);assert.equal(a.state.variation,null);
});

test('both live and batch failures offer a Retry button',async t=>{
  const a=board(t);const S=a.state;
  S.liveError='Engine failed';a.call('renderReview');
  assert.match(a.dom.window.document.getElementById('reviewMount').textContent,/Retry analysis/);
  S.analysisMode=false;S.analysisError='Engine failed';a.call('renderReview');
  assert.match(a.dom.window.document.getElementById('reviewMount').textContent,/Retry analysis/);
});

test('credits include Stockfish 19, upstream source and contributors',t=>{
  const a=board(t);a.call('openCredits');const overlay=a.dom.window.document.querySelector('.credits-overlay');
  assert.match(overlay.textContent,/Stockfish 19/);assert.match(overlay.textContent,/aciokie/);assert.match(overlay.textContent,/neuroflowinfinix/);
  assert.ok(overlay.querySelector('a[href="https://github.com/nmrugg/stockfish.js/tree/v19.0.0"]'));
  assert.ok(overlay.querySelector('a[href="https://github.com/T-Julsgaard/Chess-Review"]'));
  assert.ok(overlay.querySelector('a[href="https://github.com/neuroflowinfinix"]'));
});

test('arrow settings remain attributes and cannot inject SVG markup', t => {
  const a = board(t);
  a.state.settings.arrowOpacity = '1"><script>bad()</script><g opacity="1';
  a.state.settings.arrowShaft = '0.2" onload="bad()';
  const node = a.call('arrowNode', [{x:0,y:0},{x:1,y:1}], [{x:1,y:1},{x:0.8,y:1}], '#85ae4a');
  assert.equal(node.querySelector('script'), null);
  assert.equal(node.querySelector('[onload]'), null);
  assert.equal(node.querySelectorAll('polyline').length, 1);
  assert.equal(node.querySelectorAll('polygon').length, 1);
  assert.equal(node.getAttribute('opacity'), a.state.settings.arrowOpacity);
});

test('engine panel does not reuse lines from the same FEN reached through different histories',t=>{
  const a=board(t,'1. Nf3 Nf6 2. Nc3 Nc6'),S=a.state;S.settings.engineLines=1;
  const fen=S.variation.positions[4].fen;
  a.call('renderEngine',[{score:{cp:42},pv:'e2e4',depth:12,bound:'exact',multipv:1}]);
  const firstKey=S._lastEngineLines.historyKey;
  S.positions=a.call('buildPositions','1. Nc3 Nc6 2. Nf3 Nf6');branch(a);
  assert.equal(S.variation.positions[4].fen,fen);
  assert.notEqual(JSON.stringify(a.call('activeSearchHistory')),firstKey);
  a.call('renderEngine',null);
  assert.match(a.dom.window.document.querySelector('.engine-body').textContent,/Analyzing/);
});

test('engine loading, ready and terminal states reserve identical candidate space above Stop', t => {
  const a = board(t), doc = a.dom.window.document;
  a.state.bestWalking = true;
  for (let count = 1; count <= 4; count++) {
    a.state.settings.engineLines = count;
    for (const lines of [null, Array.from({length: count}, () => ({score: {cp: 12}, pv: '', depth: 16})), []]) {
      a.state._lastEngineLines = null; a.call('renderEngine', lines);
      const candidates = doc.querySelector('.engine-candidates');
      assert.equal(candidates.style.minHeight, `${count * 46}px`);
      assert.equal(candidates.nextElementSibling.textContent, '■ Stop');
    }
  }
});


test('the retired standalone URL requires a stored game job',async t=>{
  const a=app(t);a.dom.window.location.hash='#explore';
  await assert.rejects(a.call('loadJob'),/Analysis data not found/);
  a.dom.window.location.hash='#test-game';
  a.store['job:test-game']={pgn:'1. e4 e5',meta:{},source:'pgn'};
  assert.equal((await a.call('loadJob')).pgn,'1. e4 e5');
});

test('position-only input is rejected before disturbing the current review',async t=>{
  const a=board(t), S=a.state, original=S.pgn, v=S.variation;
  let searches=0;a.replace('startAnalysis',()=>{searches++;});a.replace('requestLiveEval',()=>{searches++;});
  for(const pgn of ['*','[Event "Position"]\n\n*', '[SetUp "1"]\n[FEN "7k/8/8/8/8/8/8/K7 w - - 0 1"]\n\n*']) {
    await assert.rejects(a.call('applyGame',{pgn,meta:{},analysis:null}),/Load a game with moves/);
  }
  assert.equal(S.pgn,original);assert.equal(S.variation,v);assert.equal(searches,0);
});

test('legacy metadata cannot restore a standalone board for a game',async t=>{
  const a=board(t),S=a.state;let batches=0,live=0;
  a.replace('startAnalysis',()=>{batches++;});a.replace('requestLiveEval',()=>{live++;});
  await a.call('applyGame',{pgn:'1. d4 d5',meta:{explore:true},analysis:null});
  assert.equal(S.analysisMode,false);assert.equal(S.variation,null);
  assert.equal(batches,1);assert.equal(live,0);
  assert.ok(a.dom.window.document.querySelector('.player-strip'));
  assert.match(a.dom.window.document.getElementById('movesBody').textContent,/d4/);
  assert.doesNotMatch(a.dom.window.document.title,/Explore/);
});

test('Home, End, and Escape navigate a review variation and return to the game',async t=>{
  const a=board(t),v=a.state.variation,{document,KeyboardEvent}=a.dom.window;
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Home'}));await settle();assert.equal(v.idx,0);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'End'}));await settle();assert.equal(v.idx,2);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));await settle();
  assert.equal(a.state.analysisMode,false);assert.equal(a.state.variation,null);
  assert.equal(a.state.total,2);assert.match(document.getElementById('movesBody').textContent,/e4/);
});
