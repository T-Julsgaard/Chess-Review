import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectSample, analyseProfileGame, createProfileEngineHost, BUDGETS, budgetById, ENGINE_ENTRY_VERSION} from '../lib/profile/engine-sample.js';
import {createProfileStore, JOB_KEY} from '../lib/profile/store.js';
import {season} from './helpers/profile-season.mjs';

const calibration = JSON.parse(fs.readFileSync(new URL('../data/calibration.json', import.meta.url), 'utf8'));
const PGN = '[White "a"]\n[Black "b"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 1-0';

function fakeEngine(scoreFor = () => ({cp: 20})) {
  return prepared => ({
    prepared, dead: false,
    async setOptions() {},
    async analyse(fen, depth, multipv, history, onProgress, options) {
      const score = scoreFor(fen, options);
      return {bestmove: options?.searchMove || 'e2e4', score, lines: []};
    },
    terminate() { this.dead = true; },
  });
}

test('sample: candidates first, cached games skipped, stratified fill covers the period', () => {
  const rows = season();
  const ids = selectSample(rows, {games: 40, rivalName: 'rival_rick'});
  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, 40);
  const byId = new Map(rows.map(r => [r.id, r]));
  const comeback = rows.filter(r => r.res === 'w' && r.matMin <= -3).sort((a, b) => a.matMin - b.matMin)[0];
  assert.ok(ids.includes(comeback.id), 'biggest comeback is sampled');
  assert.ok(ids.some(id => byId.get(id).opp === 'rival_rick'));
  const times = ids.map(id => byId.get(id).t);
  assert.ok(Math.max(...times) - Math.min(...times) > 86400 * 200, 'sample spans the season');
  const cached = new Set(ids.slice(0, 10));
  const again = selectSample(rows, {games: 40, rivalName: 'rival_rick', cached});
  assert.ok(again.every(id => !cached.has(id)));
  assert.equal(selectSample(rows, {games: 1000}).length, 300);
  assert.equal(budgetById('nope').id, 'standard');
  assert.deepEqual(BUDGETS.map(b => b.id), ['quick', 'standard', 'deep']);
});

test('analyse: a game becomes an estimate entry with a winning-chance curve', async () => {
  let calls = 0;
  const entry = await analyseProfileGame(PGN, 'w', {createEngine: fakeEngine((fen, options) => { calls++; return options?.searchMove ? {cp: -400} : {cp: 60}; }), loadCalibration: async () => calibration});
  assert.equal(entry.v, ENGINE_ENTRY_VERSION); assert.equal(entry.estimated, true);
  assert.ok(entry.acc != null && entry.acc < 100 && entry.oppAcc != null);
  assert.ok(entry.curve.length > 0 && entry.curve.every(([ply, win]) => ply > 0 && win >= 0 && win <= 100));
  assert.ok(entry.minWin <= entry.maxWin && entry.fenMin && entry.fenMax);
  assert.ok(entry.blunders >= 1, 'every played move lost a lot in this fake');
  assert.ok(calls > 16);
  const black = await analyseProfileGame(PGN, 'b', {createEngine: fakeEngine(() => ({cp: 60})), loadCalibration: async () => calibration});
  assert.ok(black.minWin > 50, 'extremes are taken at the player own decisions, from their side');
  await assert.rejects(analyseProfileGame('1. e4 *', 'w', {createEngine: fakeEngine(), loadCalibration: async () => calibration}));
});

function memoryStorage() {
  const data = {};
  return {data,
    async get(key) { if (key == null) return {...data}; const keys = Array.isArray(key) ? key : [key]; return Object.fromEntries(keys.filter(k => k in data).map(k => [k, structuredClone(data[k])])); },
    async set(values) { Object.assign(data, structuredClone(values)); },
    async remove(key) { for (const k of Array.isArray(key) ? key : [key]) delete data[k]; }};
}

test('host: runs a job with workers, caches entries, reports progress, skips cached games and cancels', async () => {
  const storage = memoryStorage(), store = createProfileStore(storage);
  const busy = [];
  const loads = [];
  const host = createProfileEngineHost({store, workers: 2, onBusy: b => busy.push(b),
    loadPgn: async (site, row) => { loads.push(row.id); return row.id === 'bad' ? null : PGN; },
    analyse: async (pgn, me, {signal}) => { await new Promise(r => setTimeout(r, 5)); if (signal.aborted) throw Error('aborted'); return {v: ENGINE_ENTRY_VERSION, acc: 80, estimated: true}; }});
  await store.saveEngine('chesscom', 'cached', {v: ENGINE_ENTRY_VERSION, acc: 70});
  const rows = [{id: '1', me: 'w', t: 1}, {id: 'cached', me: 'b', t: 2}, {id: 'bad', me: 'w', t: 3}, {id: '4', me: 'b', t: 4}];
  const started = await host.start({site: 'chesscom', account: 'me', budget: 'quick', rows});
  assert.deepEqual(started, {ok: true, total: 4});
  assert.equal((await host.start({site: 'chesscom', account: 'me', rows})).reason, 'busy');
  assert.equal(host.status().active, true);
  const final = await host.finished();
  assert.equal(final.status, 'done'); assert.equal(final.done, 4); assert.equal(final.skipped, 1); assert.equal(final.failed, 1);
  assert.ok(final.perGameMs >= 0);
  assert.deepEqual(busy, [true, false]);
  assert.ok(!loads.includes('cached'));
  const job = storage.data[JOB_KEY];
  assert.equal(job.status, 'done'); assert.equal(job.total, 4);
  const entries = await store.loadEngine('chesscom', ['1', '4', 'bad']);
  assert.equal(Object.keys(entries).length, 2); assert.equal(entries['1'].t, 1);
  // Cancel mid-run.
  const slow = createProfileEngineHost({store, workers: 1, loadPgn: async () => PGN,
    analyse: async (pgn, me, {signal}) => new Promise((resolve, reject) => { const t = setTimeout(() => resolve({v: 1, acc: 1}), 200); signal.addEventListener('abort', () => { clearTimeout(t); reject(Error('aborted')); }); })});
  await slow.start({site: 'chesscom', account: 'me', rows: [{id: 'x', me: 'w'}, {id: 'y', me: 'w'}]});
  await new Promise(r => setTimeout(r, 20));
  assert.equal(slow.cancel().ok, true);
  const cancelled = await slow.finished();
  assert.equal(cancelled.status, 'cancelled');
  assert.equal((await host.start({site: 'chesscom', account: 'me', rows: []})).reason, 'empty');
});

test('Chrome offscreen host initializes with runtime only and proxies storage and PGN access', async () => {
  const messages = []; let options; let fail = false;
  const context = vm.createContext({
    browserAPI: {runtime: {id: 'review', onMessage: {addListener() {}}, async sendMessage(message) {
      messages.push(message); return fail ? {ok: false, reason: 'Storage unavailable'} : {ok: true, value: message.action === 'loadPgn' ? PGN : {cached: {acc: 90}}};
    }}},
    createProfileEngineHost: opts => {options = opts; return {};},
  });
  vm.runInContext(fs.readFileSync(new URL('../preview.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, ''), context);
  const loaded = await options.store.loadEngine('chesscom', ['cached']);
  assert.equal(loaded.cached.acc, 90);
  await options.store.saveEngine('chesscom', 'new', {acc: 80});
  await options.store.saveJob({status: 'running'});
  assert.equal(await options.loadPgn('chesscom', {id: '1'}, null, 'tester'), PGN);
  assert.deepEqual(messages.map(message => message.action), ['loadEngine', 'saveEngine', 'saveJob', 'loadPgn']);
  assert.equal(messages.at(-1).args[2], 'tester');
  fail = true; await assert.rejects(options.store.loadEngine('chesscom', []), /Storage unavailable/);
});

test('sample: spread order covers the period early; every n-th and auto selections', async () => {
  const {spreadOrder, SAMPLES, DEPTHS, depthById, estimateMinutes, AUTO_MINUTES} = await import('../lib/profile/engine-sample.js');
  assert.deepEqual(spreadOrder(8), [0, 4, 2, 6, 1, 3, 5, 7]);
  assert.deepEqual([...spreadOrder(13)].sort((a, b) => a - b), [...Array(13).keys()], 'every index exactly once');
  const rows = season();
  const usable = rows.filter(r => !r.bot && r.n >= 10).sort((a, b) => a.t - b.t);
  const every5 = selectSample(rows, {every: 5, games: 2000});
  assert.equal(every5.length, Math.ceil(usable.length / 5));
  assert.ok(every5.every(id => usable.findIndex(r => r.id === id) % 5 === 0), 'only every fifth game');
  const auto = selectSample(rows, {every: null, games: 1000, cached: new Set([usable[0].id])});
  assert.equal(new Set(auto).size, auto.length);
  assert.ok(!auto.includes(usable[0].id), 'cached and library games are skipped');
  // The first quarter of the queue already spans the whole period.
  const quarter = auto.slice(0, Math.ceil(auto.length / 4)).map(id => usable.find(r => r.id === id).t);
  const span = usable.at(-1).t - usable[0].t;
  assert.ok(Math.max(...quarter) - Math.min(...quarter) > span * .9);
  assert.equal(SAMPLES[0].id, 'auto'); assert.equal(depthById('fast').depth, 6); assert.equal(depthById('nope').depth, 8);
  assert.equal(DEPTHS.length, 3);
  assert.equal(estimateMinutes(1000, 6000, {workers: 2}), AUTO_MINUTES, 'auto is capped');
  assert.equal(estimateMinutes(100, 6000, {workers: 2, every: 1}), 5);
});

test('host: passes the chosen depth to the analysis and stops at an auto deadline', async () => {
  const store = createProfileStore(memoryStorage());
  let clock = 0;
  const depths = [];
  const host = createProfileEngineHost({store, workers: 1, now: () => clock, loadPgn: async () => PGN,
    analyse: async (pgn, me, {depth}) => { depths.push(depth); clock += 60000; return {v: ENGINE_ENTRY_VERSION, acc: 80}; }});
  const rows = Array.from({length: 10}, (_, i) => ({id: String(i), me: 'w', t: i}));
  await host.start({site: 'chesscom', account: 'me', depth: 6, deadlineMs: 3 * 60000, rows});
  const final = await host.finished();
  assert.equal(final.status, 'done');
  assert.ok(depths.length >= 3 && depths.length < 10, 'stopped at the deadline: ' + depths.length);
  assert.ok(depths.every(d => d === 6));
  assert.equal(final.total, final.done, 'the finished count becomes the total');
});
