import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function board(t, pgn='1. e4 e5') {
  const a=app(t);loadGame(a,pgn);a.call('computeDerived');a.call('buildUI');a.call('renderAll');return a;
}

test('progress repaints retain unchanged pieces and their active animation', t=>{
  const a=board(t),sq=a.run('sqByName');
  const pawn=sq.e2.querySelector('.piece-img'),king=sq.e1.querySelector('.piece-img');
  a.state.idx=1;a.call('paintBoard');
  assert.equal(sq.e2.querySelector('.piece-img'),null);
  const moved=sq.e4.querySelector('.piece-img');assert.notEqual(moved,pawn);
  moved.style.transform='translate(0px, 30px)';moved.style.transition='transform 160ms';
  a.call('paintBoard');
  assert.equal(sq.e4.querySelector('.piece-img'),moved);
  assert.equal(moved.style.transform,'translate(0px, 30px)');
  assert.equal(sq.e1.querySelector('.piece-img'),king);
  a.state.idx=2;a.call('paintBoard');
  assert.equal(sq.e4.querySelector('.piece-img'),moved);
  assert.equal(sq.e5.querySelector('.piece-img').dataset.piece,'bP');
});

test('piece retention still handles captures, promotions and set changes', t=>{
  const a=board(t,'1. e4 d5 2. exd5'),sq=a.run('sqByName');
  a.state.idx=2;a.call('paintBoard');const black=sq.d5.querySelector('.piece-img');
  a.state.idx=3;a.call('paintBoard');const white=sq.d5.querySelector('.piece-img');
  assert.notEqual(white,black);assert.equal(white.dataset.piece,'wP');
  a.state.settings.pieceStyle='merida';a.call('paintBoard');
  assert.notEqual(sq.d5.querySelector('.piece-img'),white);
  assert.match(sq.d5.querySelector('.piece-img').src,/merida/);
  loadGame(a,'[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=Q+');
  a.state.idx=0;a.call('paintBoard');a.state.idx=1;a.call('paintBoard');
  assert.equal(sq.a7.querySelector('.piece-img'),null);
  assert.equal(sq.a8.querySelector('.piece-img').dataset.piece,'wQ');
});

test('cached SAN is bounded, isolated from callers, and keyed by position and displayed moves',t=>{
  const a=app(t),fen=a.call('buildPositions','1. e4')[0].fen;
  const format=(position,moves,max=6)=>Array.from(a.call('uciLineToSan',position,moves,max));
  assert.deepEqual(format(fen,['e2e4','e7e5']),['1. e4','e5']);
  const cached=a.call('uciLineToSan',fen,['e2e4','e7e5']);cached.push('corrupt');
  assert.deepEqual(format(fen,['e2e4','e7e5']),['1. e4','e5']);
  assert.deepEqual(format(fen,['e2e4','e7e5'],1),['1. e4']);
  assert.deepEqual(format(fen,['d2d4']),['1. d4']);
  for(let n=1;n<=150;n++)format(fen.replace(/ 1$/,' '+n),['e2e4']);
  assert.equal(a.run('sanLineCache.size'),128);
  assert.deepEqual(format(fen.replace(/ 1$/,' 151'),['e2e4']),['151. e4']);
});

test('retained pieces stay correct when reversing special moves and flipping the board',t=>{
  const a=board(t,'1. e4 a6 2. e5 d5 3. exd6'),sq=a.run('sqByName');
  a.state.idx=4;a.call('paintBoard');
  const king=sq.e1.querySelector('.piece-img');
  a.state.idx=5;a.call('paintBoard');
  assert.equal(sq.d5.querySelector('.piece-img'),null);
  assert.equal(sq.e5.querySelector('.piece-img'),null);
  assert.equal(sq.d6.querySelector('.piece-img').dataset.piece,'wP');
  a.state.idx=4;a.call('paintBoard');
  assert.equal(sq.d6.querySelector('.piece-img'),null);
  assert.equal(sq.d5.querySelector('.piece-img').dataset.piece,'bP');
  assert.equal(sq.e5.querySelector('.piece-img').dataset.piece,'wP');
  assert.equal(sq.e1.querySelector('.piece-img'),king);
  loadGame(a,'1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O');
  a.state.idx=7;a.call('paintBoard');
  assert.equal(sq.e1.querySelector('.piece-img'),null);
  assert.equal(sq.h1.querySelector('.piece-img'),null);
  assert.equal(sq.g1.querySelector('.piece-img').dataset.piece,'wK');
  assert.equal(sq.f1.querySelector('.piece-img').dataset.piece,'wR');
  a.state.flipped=true;a.call('buildBoard');
  const flipped=a.run('sqByName');
  assert.equal(flipped.g1.querySelector('.piece-img').dataset.piece,'wK');
  a.state.idx=6;a.call('paintBoard');
  assert.equal(flipped.e1.querySelector('.piece-img').dataset.piece,'wK');
  assert.equal(flipped.h1.querySelector('.piece-img').dataset.piece,'wR');
});
