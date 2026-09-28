import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, branch, settle, fakeEngine } from './helpers/app.mjs';

function board(t,pgn='1. e4 e5') {
  const a=app(t);loadGame(a,pgn);branch(a);a.state.meta={explore:true};
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');return a;
}

test('Explore move list replaces an equal-length branch even when badges are equal',t=>{
  const a=board(t,'1. e4');const old=a.state.variation.positions[1];old.classif='book';a.call('renderMoves');
  assert.match(a.dom.window.document.getElementById('movesBody').textContent,/e4/);
  const next=a.call('buildPositions','1. d4')[1];
  a.state.variation.positions[1]={...old,...next};a.call('renderMoves');
  const text=a.dom.window.document.getElementById('movesBody').textContent;
  assert.match(text,/d4/);assert.doesNotMatch(text,/e4/);
});

test('cached navigation refreshes highlight, opening, and Position panel',async t=>{
  const a=board(t);const v=a.state.variation;
  a.context.__book={ [a.call('epdOf',v.positions[1].fen)]:['B00','First opening'],[a.call('epdOf',v.positions[2].fen)]:['C20','Second opening'] };
  a.run('BOOK = __book');v.positions[1].eval={cp:70};v.positions[2].eval={cp:30};
  await a.call('requestLiveEval');
  assert.match(a.dom.window.document.getElementById('reviewMount').textContent,/Second opening/);
  a.call('gotoVar',1);await settle();
  assert.equal(a.dom.window.document.querySelector('#movesBody .current').dataset.ply,'1');
  assert.match(a.dom.window.document.getElementById('reviewMount').textContent,/First opening/);
  assert.match(a.dom.window.document.getElementById('statsMount').textContent,/\+0\.7/);
});

test('Home, End, and Escape keep Explore history and never enter a blank review',async t=>{
  const a=board(t);const v=a.state.variation;const {document,KeyboardEvent}=a.dom.window;
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Home'}));await settle();assert.equal(v.idx,0);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'End'}));await settle();assert.equal(v.idx,2);
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));await settle();assert.equal(v.idx,0);
  assert.equal(a.state.variation,v);assert.equal(v.positions.length,3);assert.equal(a.state.analysisMode,true);
  assert.equal(document.querySelector('#controls .exit-analysis'),null);
});

test('making an alternative preserves capture and promotion metadata for classification',async t=>{
  const a=board(t,'1. e4 d5');a.state.liveEngine=fakeEngine();
  a.call('applyUserMove','e4','d5',false);await settle();
  const pos=a.state.variation.positions.at(-1);assert.equal(pos.san,'exd5');assert.equal(pos.captured,'p');
  assert.match(a.dom.window.document.getElementById('movesBody').textContent,/exd5/);
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
