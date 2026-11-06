import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {START_FEN,setupFromFen,setupFen,validateSetup,importPosition,lineToSan} from '../lib/position-setup.js';

test('position setup round-trips all FEN fields without inferring castling rights',()=>{
  for(const fen of [START_FEN,'r3k2r/8/8/3pP3/8/8/8/R3K2R w Kq d6 17 32','8/8/8/8/8/8/4k3/7K b - - 0 45']) {
    const setup=setupFromFen(fen);assert.equal(setupFen(setup),fen);assert.equal(validateSetup(setup).error,undefined);
  }
  assert.equal(importPosition('8/8/8/8/8/8/4k3/7K').setup.castling,'-');
});

test('unsafe positions are rejected before they reach Stockfish',()=>{
  const cases=[
    ['8/8/8/8/8/8/8/K7 w - - 0 1',/missing black king/],
    ['k7/8/8/8/8/8/8/KK6 w - - 0 1',/too many white kings/],
    ['k7/8/8/8/8/8/8/K6P w - - 0 1',/pawns.*edge/],
    ['8/8/8/8/8/8/4k3/4K3 w - - 0 1',/just moved/],
    ['4k3/8/8/8/8/8/8/4R1K1 w - - 0 1',/just moved/],
    ['4k3/8/8/8/8/8/8/4K3 w K - 0 1',/castling/],
    ['4k3/8/8/8/8/8/8/4K3 w - d6 0 1',/en-passant/],
    ['4k3/8/8/8/8/8/8/4K3 w - - 0oops 1',/whole-number/],
    ['4k3/8/8/8/8/8/8/4K3 w - - 0 1oops',/whole-number/],
    ['4k3/pppppppp/p7/8/8/8/8/4K3 w - - 0 1',/too many pieces or pawns/],
  ];
  for(const [fen,error]of cases)assert.throws(()=>importPosition(fen),error,fen);
});

test('check, mate and stalemate are valid starting positions',()=>{
  for(const fen of ['4k3/8/8/8/8/8/4r3/4K3 w - - 0 1','7k/6Q1/5K2/8/8/8/8/8 b - - 0 1','7k/5K2/6Q1/8/8/8/8/8 b - - 0 1'])
    assert.equal(validateSetup(setupFromFen(fen)).error,undefined);
});

test('PGN import retains its actual initial position and repetition history',()=>{
  const pgn='1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8';
  const result=importPosition(pgn),chess=new Chess(result.history.initialFen);
  for(const uci of result.history.moves)chess.move({from:uci.slice(0,2),to:uci.slice(2,4)});
  assert.equal(chess.isThreefoldRepetition(),true);assert.equal(chess.fen(),setupFen(result.setup));
  const custom='[SetUp "1"]\n[FEN "7k/8/8/8/8/8/8/K7 b - - 0 20"]\n\n20... Kg8 *';
  assert.equal(importPosition(custom).history.initialFen,'7k/8/8/8/8/8/8/K7 b - - 0 20');
  assert.throws(()=>importPosition('*'),/no moves/);assert.throws(()=>importPosition('hello'),/Could not read/);
});

test('candidate formatting stops at an illegal suffix and preserves Black move numbers and underpromotions',()=>{
  assert.deepEqual(lineToSan(START_FEN,'e2e4 e7e5 e4e7').map(m=>m.san),['1. e4','e5']);
  assert.equal(lineToSan('7k/8/8/8/8/8/8/K7 b - - 0 20','h8g8')[0].san,'20… Kg8');
  assert.equal(lineToSan('7k/P7/8/8/8/8/8/K7 w - - 0 1','a7a8n')[0].uci,'a7a8n');
});
