import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame } from './helpers/app.mjs';

test('missing clock tags and annotated variations cannot shift the mainline clocks', t => {
  const a = app(t);
  const pgn = '[TimeControl "600+5"]\n\n1. e4 e5 {Reply [%clk 0:09:58.5]} '
    + '2. Nf3 {[%clk 0:09:55]} (2. Bc4 {[%clk 0:08:00]}) Nc6 *';
  loadGame(a, pgn); a.state.headers = a.call('parseHeaders', pgn);
  a.state.clocks = a.call('parseClocks', pgn);
  assert.deepEqual(Array.from(a.state.clocks), [null, null, '9:58', '9:55', null]);
  a.state.idx = 1;
  assert.equal(a.call('clockFor', 'w'), '10:00');
  assert.equal(a.call('clockFor', 'b'), '10:00');
  a.state.idx = 2;
  assert.equal(a.call('clockFor', 'w'), '10:00');
  assert.equal(a.call('clockFor', 'b'), '9:58');
  a.state.idx = 4;
  assert.equal(a.call('clockFor', 'w'), '9:55');
  assert.equal(a.call('clockFor', 'b'), '9:58');
});

test('clockless games and black-to-move excerpts retain the correct clock owner', t => {
  const a = app(t);
  assert.deepEqual(Array.from(a.call('parseClocks', '1. e4 e5')), [null, null, null]);
  const pgn = '[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n\n'
    + '1... e5 {[%clk 0:04:50]} 2. Nf3 {[%clk 0:04:48]} *';
  loadGame(a, pgn); a.state.clocks = a.call('parseClocks', pgn); a.state.idx = 2;
  assert.equal(a.call('clockFor', 'b'), '4:50');
  assert.equal(a.call('clockFor', 'w'), '4:48');
});
