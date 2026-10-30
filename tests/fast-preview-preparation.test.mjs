import test from 'node:test';
import assert from 'node:assert/strict';
import {PreparedGame, PreviewEngine} from '../scripts/bench/fast-preview-browser.mjs';

test('experimental preparation accepts only exact immutable legal game histories', () => {
  const moves = ['e2e4', 'e7e5', 'g1f3'], prepared = new PreparedGame(moves);
  assert.equal(prepared.roots.length, 3);
  const root = prepared.roots[2];
  assert.match(prepared.command(root.fen, root.history), / moves e2e4 e7e5$/);
  moves[0] = 'd2d4';
  assert.match(prepared.command(root.fen, root.history), / moves e2e4 e7e5$/);
  assert.throws(() => root.history.moves.push('b8c6'), TypeError);
  assert.throws(() => prepared.command(root.fen, {...root.history, moves: ['d2d4', 'e7e5']}), /not validated/);
  assert.throws(() => prepared.command(prepared.roots[0].fen, root.history), /not validated/);
  assert.throws(() => prepared.command(root.fen, {...root.history, initialFen: 'other'}), /not validated/);
  for (const invalid of [[], ['e2e5'], ['e2e4\ngo infinite'], ['e2e4', 'e2e4']]) assert.throws(() => new PreparedGame(invalid));
});

test('experimental worker keeps state between validated roots and still demands exact scores', async t => {
  class WorkerStub {
    commands = [];
    postMessage(command) {this.commands.push(command);}
    terminate() {}
    line(data) {this.onmessage({data});}
  }
  const previous = globalThis.Worker; globalThis.Worker = WorkerStub;
  const prepared = new PreparedGame(['e2e4', 'e7e5', 'g1f3']);
  const engine = new PreviewEngine('engine/stockfish-nnue.js', prepared);
  t.after(() => {engine.terminate(); globalThis.Worker = previous;});
  engine.worker.line('uciok'); engine.worker.line('readyok');
  for (const [i, move] of ['e2e4', 'e7e5'].entries()) {
    const root = prepared.roots[i];
    const pending = engine.analyse(root.fen, 8, 1, root.history, null, {requireExact: true});
    await Promise.resolve();
    engine.worker.line('info depth 8 score cp 20 pv ' + move);
    engine.worker.line('bestmove ' + move);
    assert.equal((await pending).bestmove, move);
  }
  const root = prepared.roots[2];
  const pending = engine.analyse(root.fen, 8, 1, root.history, null, {requireExact: true});
  await Promise.resolve();
  engine.worker.line('info depth 8 score cp 300 lowerbound pv g1f3');
  engine.worker.line('bestmove g1f3');
  await assert.rejects(pending, /exact completed/);
  assert.equal(engine.worker.commands.filter(command => command === 'ucinewgame').length, 1);
  assert.equal(engine.worker.commands.filter(command => command.includes('Clear Hash')).length, 0);
  await assert.rejects(engine.analyse(root.fen, 8, 1, prepared.roots[0].history), /not validated/);
});
