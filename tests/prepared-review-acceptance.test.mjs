import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from '../lib/chess.js';
import {Engine, positionCommand} from '../engine/uci.js';
import {analyseCalibratedPosition} from '../lib/calibrated-search.js';
import {PreparedReview, PreparedReviewEngine} from './helpers/prepared-review.mjs';

const calibration = JSON.parse(readFileSync(new URL('../data/calibration.json', import.meta.url)));
const cases = [
  {name: 'empty', moves: []},
  {name: 'castling', moves: 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 e1g1'.split(' ')},
  {name: 'en passant', moves: 'e2e4 a7a6 e4e5 d7d5 e5d6'.split(' ')},
  {name: 'repetition', moves: 'g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8'.split(' ')},
  {name: 'checkmate', moves: 'f2f3 e7e5 g2g4 d8h4'.split(' ')},
  {name: 'white underpromotion', initialFen: '7k/P7/8/8/8/8/8/7K w - - 0 1', moves: ['a7a8n']},
  {name: 'black underpromotion', initialFen: '7k/8/8/8/8/8/p7/7K b - - 0 1', moves: ['a2a1r']},
  {name: 'black to move with clocks', initialFen: '7k/8/8/8/8/8/r7/6K1 b - - 98 51', moves: ['a2a3', 'g1f1']},
  {name: 'stalemate', initialFen: '7k/5K2/6Q1/8/8/8/8/8 b - - 0 1', moves: []},
  {name: 'insufficient material', initialFen: '7k/8/8/8/8/8/8/7K w - - 0 1', moves: []},
];

for (const fixture of cases) test('prepared commands exactly match current validation: ' + fixture.name, () => {
  const prepared = new PreparedReview(fixture.moves, fixture);
  assert.equal(prepared.roots.length, fixture.moves.length + 1);
  for (const root of prepared.roots) assert.equal(prepared.command(root.fen, root.history), positionCommand(root.fen, root.history));
});

test('prepared terminal scores preserve repetition, fifty-move, mate and setup counters', () => {
  const repetition = new PreparedReview(cases.find(row => row.name === 'repetition').moves);
  assert.deepEqual(repetition.roots.at(-1).terminal, {cp: 0});
  assert.equal(new Chess(repetition.roots.at(-1).fen).isThreefoldRepetition(), false);
  assert.deepEqual(new PreparedReview(cases.find(row => row.name === 'checkmate').moves).roots.at(-1).terminal, {mate: -1});
  const fifty = new PreparedReview(['a2a3', 'g1f1'], cases.find(row => row.name === 'black to move with clocks'));
  assert.match(fifty.roots.at(-1).fen, / 100 52$/);
  assert.deepEqual(fifty.roots.at(-1).terminal, {cp: 0});
});

test('prepared commands survive input mutation and reject foreign, cloned and mismatched roots', () => {
  const moves = ['e2e4', 'e7e5'], prepared = new PreparedReview(moves), root = prepared.roots[1];
  moves[0] = 'd2d4'; moves.push('a1a8');
  assert.match(prepared.command(root.fen, root.history), /e2e4$/);
  assert.throws(() => {prepared.roots = [];}, TypeError);
  assert.throws(() => {root.history.initialFen = 'other';}, TypeError);
  assert.throws(() => root.history.moves.push('a1a8'), TypeError);
  assert.throws(() => prepared.command(root.fen, structuredClone(root.history)), /Unvalidated/);
  assert.throws(() => prepared.command(root.fen.replace(/ 1$/, ' 2'), root.history), /Unvalidated/);
  assert.throws(() => prepared.command(root.fen, new PreparedReview(['e2e4']).roots[1].history), /Unvalidated/);
  for (const moves of [[null], [undefined], [123], ['e2e4\ngo infinite'], ['e2e5'], ['e2e4', 'e2e4']]) {
    assert.throws(() => new PreparedReview(moves), /Illegal/);
  }
  assert.throws(() => new PreparedReview([], {initialFen: 'invalid'}));
  assert.throws(() => new PreparedReview(['e2e4'], {maxBytes: 1}), /memory budget/);
});

test('200 seeded authored legal lines preserve every exact prefix and last position', () => {
  let seed = 0x563170;
  const random = () => {seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0;};
  let checked = 0;
  for (let line = 0; line < 200; line++) {
    const chess = new Chess(), moves = [];
    while (moves.length < 24 && !chess.isGameOver()) {
      const legal = chess.moves({verbose: true}), move = legal[random() % legal.length];
      moves.push(move.lan); chess.move(move);
    }
    const prepared = new PreparedReview(moves);
    for (const root of prepared.roots) {
      assert.equal(prepared.command(root.fen, root.history), positionCommand(root.fen, root.history)); checked++;
    }
    assert.equal(prepared.roots.at(-1).fen, chess.fen());
  }
  assert.ok(checked > 4000);
});

class WorkerStub {
  commands = []; dead = false;
  postMessage(command) {this.commands.push(command);}
  terminate() {this.dead = true;}
  line(data) {this.onmessage({data});}
}
function engine(t, prepared, options) {
  const previous = globalThis.Worker; globalThis.Worker = WorkerStub;
  const instance = prepared ? new PreparedReviewEngine('engine/stockfish-nnue.js', prepared, options) : new Engine();
  t.after(() => {instance.terminate(); globalThis.Worker = previous;});
  instance.worker.line('uciok'); instance.worker.line('readyok');
  return instance;
}
async function answer(instance, promise, {move = 'e2e4', exact = true} = {}) {
  await Promise.resolve(); instance.worker.line('readyok');
  instance.worker.line('info depth 16 score cp 30' + (exact ? '' : ' lowerbound') + ' wdl 300 400 300 pv ' + move);
  instance.worker.line('bestmove ' + move);
  return promise;
}

test('prepared cold transport is byte-for-byte identical for queued, restricted and node searches', async t => {
  const prepared = new PreparedReview(['e2e4', 'e7e5']), baseline = engine(t), candidate = engine(t, prepared);
  for (const config of [{cold: true, requireExact: true}, {cold: true, requireExact: true, searchMove: 'e2e4', budget: {kind: 'nodes', value: 20000}}]) {
    const root = prepared.roots[0];
    await answer(baseline, baseline.analyse(root.fen, 16, 1, root.history, null, config));
    await answer(candidate, candidate.analyse(root.fen, 16, 1, root.history, null, config));
  }
  const roots = prepared.roots.slice(0, 2);
  const baselineJobs = roots.map(root => baseline.analyse(root.fen, 16, 1, root.history, null, {cold: true, requireExact: true}));
  const candidateJobs = roots.map(root => candidate.analyse(root.fen, 16, 1, root.history, null, {cold: true, requireExact: true}));
  for (const [i, move] of ['e2e4', 'e7e5'].entries()) {
    await answer(baseline, baselineJobs[i], {move}); await answer(candidate, candidateJobs[i], {move});
  }
  assert.deepEqual(candidate.worker.commands, baseline.worker.commands);
});

test('strict evidence, cancellation, engine failure and termination remain enforced', async t => {
  const prepared = new PreparedReview(['e2e4']), candidate = engine(t, prepared), root = prepared.roots[0];
  const invalid = candidate.analyse(root.fen, 16, 1, root.history, null, {cold: true, requireExact: true});
  await assert.rejects(answer(candidate, invalid, {exact: false}), /exact completed/);
  const active = candidate.analyse(root.fen, 16, 1, root.history);
  const queued = candidate.analyse(root.fen, 16, 1, root.history);
  const cancelled = assert.rejects(queued, /superseded/);
  await Promise.resolve(); candidate.cancelPending(); await cancelled;
  await answer(candidate, active);
  const pending = candidate.analyse(root.fen, 16, 1, root.history), stopped = assert.rejects(pending, /terminated/);
  await Promise.resolve(); candidate.terminate(); await stopped;
  assert.equal(candidate.worker.dead, true);
  const crashed = engine(t, prepared), waiting = crashed.analyse(root.fen, 16, 1, root.history);
  const failure = assert.rejects(waiting, /crash/);
  await Promise.resolve(); crashed.worker.onerror({message: 'test crash'}); await failure;
});

for (const build of ['nnue', 'sf19lite']) for (const needMovesOnly of [false, true]) {
  test(`${build}, moves-only evidence ${needMovesOnly}: coordinator observations and commands are unchanged`, async t => {
    const prepared = new PreparedReview(['e2e4']), root = prepared.roots[0];
    async function run(preparedMode) {
      const instance = engine(t, preparedMode ? prepared : null); instance.buildKey = build;
      instance.identity = build === 'nnue' ? 'Stockfish 18' : 'Stockfish 19 Lite';
      const original = instance.worker.postMessage.bind(instance.worker);
      instance.worker.postMessage = command => {
        original(command);
        if (command === 'isready') queueMicrotask(() => instance.worker.line('readyok'));
        if (command.startsWith('go ')) queueMicrotask(() => {
          const move = command.includes('searchmoves') ? 'e2e4' : 'd2d4';
          instance.worker.line('info depth 16 score cp 30 wdl 300 400 300 pv ' + move);
          instance.worker.line('bestmove ' + move);
        });
      };
      const result = await analyseCalibratedPosition(instance, {...root, settings: {enginePath: build, engineDepth: 16, engineHash: 16, engineSkill: 20}, calibration, needMovesOnly});
      return {result, commands: instance.worker.commands};
    }
    assert.deepEqual(await run(true), await run(false));
  });
}
