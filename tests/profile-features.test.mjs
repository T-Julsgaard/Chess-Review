import test from 'node:test';
import assert from 'node:assert/strict';
import {gameFeatures, parseTimeControl, decodeHeat, squareIndex, matePattern, validRow, needsThinkBuckets, needsReplay, hasMateInOne, grainBucket} from '../lib/profile/features.js';
import {normalizeChesscom, normalizeLichess, parseMovetext} from '../lib/profile/sources.js';
import {createProfileStore, rowsKey, ENGINE_INDEX_KEY, MAX_ENGINE_ENTRIES} from '../lib/profile/store.js';
import {periodRows, periodStart, periodLabel, customPeriodBounds, PERIODS} from '../lib/profile/collector.js';
import {Chess} from '../lib/chess.js';

const OPERA = ['e4','e5','Nf3','d6','d4','Bg4','dxe5','Bxf3','Qxf3','dxe5','Bc4','Nf6','Qb3','Qe7','Nc3','c6','Bg5','b5','Nxb5','cxb5','Bxb5+','Nbd7','O-O-O','Rd8','Rxd7','Rxd7','Rd1','Qe6','Bxd7+','Nxd7','Qb8+','Nxb8','Rd8#'];
const game = (over = {}) => ({site: 'chesscom', id: '1', url: 'https://www.chess.com/game/live/1', moves: OPERA, clocks: [],
  endTime: 1_700_000_000, startTime: 1_699_999_700, timeClass: 'blitz', timeControl: '180+2', rated: true,
  white: {name: 'Morphy', rating: 2500}, black: {name: 'Duke', rating: 2000}, result: 'w', termination: 'mate', eco: 'C41', opening: 'Philidor Defense', bot: false, variant: 'standard', ...over});

test('features: Opera game from the winner and the loser', () => {
  const w = gameFeatures(game(), 'morphy');
  assert.equal(w.me, 'w'); assert.equal(w.res, 'w'); assert.equal(w.term, 'mate'); assert.equal(w.opp, 'Duke');
  assert.equal(w.n, 33); assert.equal(w.myMoves, 17);
  assert.equal(w.mateBy, 'r'); assert.equal(w.matePattern, 'other');
  assert.equal(w.castle, 12); assert.equal(w.castleSide, 'q');
  assert.ok(w.matMin < 0, 'Morphy invested material'); assert.equal(w.fenEnd.split(' ')[1], 'b');
  assert.equal(w.dur, 300); assert.equal(w.first, 'e4 Nf3'); assert.equal(w.line.split(' ').length, 12);
  assert.equal(decodeHeat(w.heat).reduce((a, b) => a + b, 0), 17);
  assert.equal(decodeHeat(w.heat)[squareIndex('d8')], 1); assert.equal(decodeHeat(w.heat)[squareIndex('d7')], 2);
  const b = gameFeatures(game(), 'duke');
  assert.equal(b.me, 'b'); assert.equal(b.res, 'l'); assert.equal(b.matedBy, 'r'); assert.equal(b.mateBy, null);
  assert.ok(b.matMax > 0);
  assert.ok(validRow(w) && validRow(b));
});

test('features: rejects variants, strangers and illegal moves', () => {
  assert.equal(gameFeatures(game({variant: 'chess960'}), 'morphy'), null);
  assert.equal(gameFeatures(game(), 'someoneelse'), null);
  assert.equal(gameFeatures(game({moves: ['e4', 'e5', 'Ke3']}), 'morphy'), null);
  assert.equal(gameFeatures(game({moves: ['e4']}), 'morphy'), null);
});

test('features: clocks give thinking time, snap moves and time trouble', () => {
  const moves = ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7'];
  const clocks = [178, 179, 170, 177, 169, 160, 100, 150, 8, 140];
  const row = gameFeatures(game({moves, clocks, timeControl: '180+0', result: 'd', termination: 'agree', startTime: null, endTime: 1_700_000_000}), 'morphy');
  assert.equal(row.res, 'd'); assert.equal(row.thinkN, 5);
  assert.equal(row.snap, 2); assert.equal(row.longThink, 92); assert.equal(row.longPly, 9);
  assert.equal(row.trouble, false); // time trouble is judged before the move: 100 s is still ample
  assert.ok(Math.abs(row.ahead - 0.2) < 1e-9);
  assert.equal(row.dur, 360 - 8 - 140);
  assert.equal(row.knights4, false, 'only one knight out by move 4');
});

test('features: signature flags', () => {
  const fian = gameFeatures(game({moves: ['Nf3','d5','g3','Nf6','Bg2','e6','O-O','Be7'], result: 'd', termination: 'agree'}), 'morphy');
  assert.equal(fian.fian, true); assert.equal(fian.castle, 4); assert.equal(fian.castleSide, 'k');
  const queens = gameFeatures(game({moves: ['e4','d5','exd5','Qxd5','Nc3','Qe5+','Qe2','Qxe2+','Bxe2'], result: 'd', termination: 'agree'}), 'morphy');
  assert.equal(queens.qtrade, 5);
  assert.equal(queens.qEarly, true);
  const gambit = gameFeatures(game({moves: ['e4','e5','f4','exf4','Nf3','g5','h4','g4','Ne5','Nf6','Bc4','d5','exd5','Bd6','d4','Nh5','Bb5+','Kf8','O-O','Qxh4'], result: 'd', termination: 'agree'}), 'morphy');
  assert.equal(gambit.gambit, true);
  const storm = gameFeatures(game({moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','d3','Nf6','Nc3','O-O','h4','d6','g4','Be6','g5'], result: 'd', termination: 'agree'}), 'morphy');
  assert.equal(storm.storm, true); assert.equal(storm.oppCastleSide, 'k');
});

test('features: mate patterns', () => {
  const back = new Chess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'); const m1 = back.move('Ra8#');
  assert.equal(matePattern(back, m1), 'back-rank');
  const smother = new Chess('6rk/5Npp/8/8/8/8/8/6K1 w - - 0 1'); const m2 = smother.move('Nh6');
  assert.equal(smother.isCheckmate(), false);
  const smother2 = new Chess('6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1');
  const m3 = smother2.move('Nf7#');
  assert.equal(smother2.isCheckmate(), true); assert.equal(matePattern(smother2, m3), 'smothered');
  const ladder = new Chess('7k/R7/8/8/8/8/8/1R4K1 w - - 0 1'); const m4 = ladder.move('Rb8#');
  assert.equal(ladder.isCheckmate(), true); assert.equal(matePattern(ladder, m4), 'ladder');
  const kiss = new Chess('7k/8/6K1/8/8/8/8/3Q4 w - - 0 1'); const m5 = kiss.move('Qh5+');
  assert.equal(kiss.isCheckmate(), false);
  const kiss2 = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'); const m6 = kiss2.move('Qg7#');
  assert.equal(kiss2.isCheckmate(), true); assert.equal(matePattern(kiss2, m6), 'queen-kiss');
});

test('sources: chess.com PGN movetext, results and openings', () => {
  const pgn = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.03.04"]
[White "alice"]
[Black "bob"]
[Result "1-0"]
[ECO "C50"]
[ECOUrl "https://www.chess.com/openings/Italian-Game-Giuoco-Pianissimo-4.d3"]
[UTCDate "2026.03.04"]
[UTCTime "23:58:00"]
[TimeControl "180+2"]
[StartTime "23:58:00"]
[EndDate "2026.03.05"]
[EndTime "00:03:10"]
[Link "https://www.chess.com/game/live/123456789"]

1. e4 {[%clk 0:03:01.9]} 1... e5 {[%clk 0:03:00]} 2. Nf3 {[%clk 0:02:59]} 2... Nc6 $1 {[%clk 0:02:58]} 3. Bc4 (3. Bb5) 3... Bc5 {[%clk 0:02:50]} 4. d3 {comment} 1-0`;
  const parsed = parseMovetext(pgn);
  assert.deepEqual(parsed.moves, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3']);
  assert.deepEqual(parsed.clocks, [181.9, 180, 179, 178, null, 170, null]);
  const g = normalizeChesscom({url: 'https://www.chess.com/game/live/123456789', pgn, time_class: 'blitz', time_control: '180+2', rated: true, end_time: 1772668990, rules: 'chess',
    white: {username: 'alice', rating: 1500, result: 'win'}, black: {username: 'bob', rating: 1480, result: 'resigned'}});
  assert.equal(g.id, '123456789'); assert.equal(g.result, 'w'); assert.equal(g.termination, 'resign');
  assert.equal(g.opening, 'Italian Game Giuoco Pianissimo'); assert.equal(g.eco, 'C50');
  assert.ok(g.startTime < g.endTime && g.endTime - g.startTime === 310, 'midnight crossing handled');
  assert.equal(normalizeChesscom({...{url: 'x', pgn}, rules: 'chess960'}), null);
  const draw = normalizeChesscom({url: 'https://www.chess.com/game/live/5', pgn, white: {username: 'alice', result: 'repetition'}, black: {username: 'bob', result: 'repetition'}});
  assert.equal(draw.result, 'd'); assert.equal(draw.termination, 'repetition');
  const timeout = normalizeChesscom({url: 'https://www.chess.com/game/live/6', pgn, white: {username: 'alice', result: 'timeout'}, black: {username: 'bob', result: 'win'}});
  assert.equal(timeout.result, 'b'); assert.equal(timeout.termination, 'time');
});

test('sources: lichess NDJSON lines', () => {
  const g = normalizeLichess({id: 'abcd1234', rated: true, variant: 'standard', speed: 'rapid', status: 'outoftime', winner: 'black',
    createdAt: 1_700_000_000_000, lastMoveAt: 1_700_000_600_000, players: {white: {user: {name: 'Carol'}, rating: 1800}, black: {aiLevel: 3}},
    opening: {eco: 'B20', name: 'Sicilian Defense'}, moves: 'e4 c5 Nf3', clocks: [60000, 59900, 59000], clock: {initial: 600, increment: 0}});
  assert.equal(g.result, 'b'); assert.equal(g.termination, 'time'); assert.equal(g.bot, true);
  assert.deepEqual(g.clocks, [600, 599, 590]); assert.equal(g.timeControl, '600+0'); assert.equal(g.timeClass, 'rapid');
  assert.equal(g.black.name, 'Stockfish level 3'); assert.equal(g.startTime, 1_700_000_000);
  assert.equal(normalizeLichess({id: 'x', status: 'aborted', moves: 'e4'}), null);
  assert.equal(normalizeLichess({id: 'x', variant: 'atomic', moves: 'e4 e5'}), null);
});

function memoryStorage() {
  const data = {};
  return {data,
    async get(key) { if (key == null) return {...data}; const keys = Array.isArray(key) ? key : [key]; return Object.fromEntries(keys.filter(k => k in data).map(k => [k, structuredClone(data[k])])); },
    async set(values) { Object.assign(data, structuredClone(values)); },
    async remove(key) { for (const k of Array.isArray(key) ? key : [key]) delete data[k]; }};
}

test('store: merges rows by id, bounds the engine index and deletes everything', async () => {
  const storage = memoryStorage(), store = createProfileStore(storage);
  const row = gameFeatures(game(), 'morphy');
  await store.mergeRows('chesscom', 'Morphy', [row, {...row, id: '2', t: row.t + 10}], {months: ['m1'], since: 5});
  await store.mergeRows('chesscom', 'morphy', [{...row, res: 'd'}], {months: ['m1', 'm2']});
  const data = await store.loadRows('chesscom', 'MORPHY');
  assert.equal(data.rows.length, 2); assert.equal(data.rows[0].res, 'd'); assert.deepEqual(data.months, ['m1', 'm2']); assert.equal(data.since, 5);
  assert.ok(rowsKey('chesscom', 'Morphy') in storage.data);
  for (let i = 0; i < MAX_ENGINE_ENTRIES + 3; i++) await store.saveEngine('chesscom', String(i), {acc: i});
  assert.equal(storage.data[ENGINE_INDEX_KEY].length, MAX_ENGINE_ENTRIES);
  assert.equal(Object.keys(await store.loadEngine('chesscom', ['0', '1', '2', '3'])).join(), '3');
  await store.saveJob({status: 'running'});
  assert.deepEqual(await store.loadJob(), {status: 'running'});
  const removed = await store.deleteAll();
  assert.ok(removed > 1);
  assert.deepEqual(Object.keys(storage.data), []);
});

test('store: the Compare list reads small summaries, not every saved game', async () => {
  const storage = memoryStorage(), store = createProfileStore(storage);
  const row = gameFeatures(game(), 'morphy');
  await store.mergeRows('chesscom', 'Morphy', [row, {...row, id: '2', t: row.t + 10}]);
  // A player saved before summaries existed (rows only).
  storage.data[rowsKey('lichess', 'old_one')] = {rows: [row], months: [], since: 0, updatedAt: 5};
  const reads = [];
  storage.getKeys = async () => Object.keys(storage.data);
  const get = storage.get; storage.get = async key => { reads.push(key); return get(key); };
  const list = await store.listAccounts();
  assert.deepEqual(list.map(e => [e.site, e.account, e.games]), [['chesscom', 'morphy', 2], ['lichess', 'old_one', 1]]);
  assert.ok(reads.every(key => key !== null), 'never the whole storage');
  assert.ok(!reads.flat().includes(rowsKey('chesscom', 'morphy')), 'a summarised player is not read in full');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(storage.data['profile:v1:summary:lichess:old_one'].games, 1, 'the missing summary is saved for next time');
  await store.forgetAccount('chesscom', 'morphy');
  assert.ok(!('profile:v1:summary:chesscom:morphy' in storage.data));
  // Without getKeys (older browsers) the full read still works.
  delete storage.getKeys;
  assert.deepEqual((await store.listAccounts()).map(e => e.account), ['old_one']);
});

test('collector: period filters', () => {
  const now = new Date(Date.UTC(2026, 10, 16));
  const rows = [];
  for (let i = 0; i < 400; i++) rows.push({id: String(i), t: now.getTime() / 1000 - i * 86400 * 2});
  assert.equal(periodRows(rows, 'all', now).length, 400);
  assert.ok(periodRows(rows, 'year', now).length > 180 && periodRows(rows, 'year', now).length < 200);
  assert.equal(periodStart('calendar', now), Date.UTC(2026, 0, 1) / 1000);
  assert.equal(PERIODS[0].id, 'year');
  assert.ok(PERIODS.some(p => p.id === 'custom'));
  assert.ok(!PERIODS.some(p => p.id === 'last100'));
  assert.deepEqual(parseTimeControl('1/86400'), null);
  assert.deepEqual(parseTimeControl('180+2'), {base: 180, inc: 2});
});

test('collector: custom periods include both UTC dates, sort games and reject invalid ranges', () => {
  const now = new Date('2026-11-18T12:00:00Z'), range = {start: '2026-02-28', end: '2026-03-01'};
  const stamp = iso => Date.parse(iso) / 1000;
  const rows = ['2026-03-02T00:00:00Z', '2026-03-01T23:59:59Z', '2026-02-28T00:00:00Z', '2026-02-27T23:59:59Z'].map(t => ({t: stamp(t)}));
  assert.deepEqual(periodRows(rows, 'custom', now, range), [rows[2], rows[1]]);
  assert.equal(periodStart('custom', now, range), rows[2].t);
  assert.equal(periodRows(rows, 'custom', now, {...range, end: range.start}).length, 1, 'a single day is allowed');
  assert.ok(periodLabel('custom', range).includes('2026'));
  for (const bad of [undefined, {}, {start: '', end: range.end}, {start: '2026-02-30', end: range.end}, {start: range.end, end: range.start}]) {
    assert.equal(customPeriodBounds(bad), null);
    assert.deepEqual(periodRows(rows, 'custom', now, bad), []);
    assert.ok(Number.isNaN(periodStart('custom', now, bad)));
  }
});

test('features: bullet games split move times into premoves, half seconds and up to ten seconds', () => {
  const moves = ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5'];
  // White's own moves take 0 (premove), 0.1 (premove), 0.4, 0.8, 2.5 and 12 seconds.
  const clocks = [60, 60, 59.9, 59, 59.5, 58, 58.7, 57, 56.2, 56, 44.2, 55];
  const row = gameFeatures(game({moves, clocks, timeClass: 'bullet', timeControl: '60+0', result: 'd', termination: 'agree'}), 'morphy');
  assert.deepEqual(row.tf, [2, 1, 1, 0, 1, 0, 0, 1]);
  // The fine histogram: two premoves, 0.4 s, 0.8 s, 2.5 s and 12 s, trimmed after the slowest move.
  const tg = new Array(29).fill(0); tg[0] = 2; tg[4] = 1; tg[8] = 1; tg[20] = 1; tg[28] = 1;
  assert.deepEqual(row.tg, tg);
  assert.deepEqual([0.1, 60 - 59.8, 0.2 - 1e-9, 1, 119.99, 600].map(grainBucket), [0, 2, 2, 10, 36, 37], 'clock float noise lands in the right tenth');
  assert.equal(row.tb.length, 8);
  const blitz = gameFeatures(game({moves, clocks}), 'morphy');
  assert.equal(blitz.tf, null, 'only bullet keeps the finer split');
  assert.equal(needsThinkBuckets({...row, tf: undefined}), true, 'old bullet rows are replayed once');
  assert.equal(needsThinkBuckets({...blitz, tg: undefined}), true, 'rows without the fine histogram are replayed once');
  assert.ok(Array.isArray(blitz.tg), 'every time control keeps the fine histogram');
  assert.equal(needsThinkBuckets(blitz), false);
});

test('features: mates in one on the board, played and missed', () => {
  const scholar = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6'];
  const g = (moves, over = {}) => game({moves, white: {name: 'A'}, black: {name: 'B'}, result: 'b', termination: 'resign', ...over});
  const chess = new Chess(); for (const san of scholar) chess.move(san);
  assert.equal(hasMateInOne(chess), true, 'Qxf7# is there');
  assert.equal(chess.fen(), (() => { const c = new Chess(); for (const san of scholar) c.move(san); return c.fen(); })(), 'the search leaves the position as it was');
  chess.move('Qf3'); chess.move('Nd4');
  assert.equal(hasMateInOne(chess), false, 'Qxf7+ is no longer mate');
  const missed = gameFeatures(g([...scholar, 'Qf3', 'Nd4']), 'a');
  assert.deepEqual([missed.m1, missed.m1Missed, missed.m1Ply], [1, 1, 7]);
  assert.equal(missed.m1Fen, (() => { const c = new Chess(); for (const san of scholar) c.move(san); return c.fen(); })(), 'the missed position is kept for the puzzles');
  assert.equal(needsReplay({...missed, m1Fen: ''}), true, 'a miss without its position is replayed once');
  const found = gameFeatures(g([...scholar, 'Qxf7#'], {result: 'w', termination: 'mate'}), 'a');
  assert.deepEqual([found.m1, found.m1Missed], [1, 0]);
  assert.deepEqual([gameFeatures(g(scholar), 'a').m1Missed, gameFeatures(g(scholar), 'b').m1], [1, 0], 'a game that stops with the mate on the board missed it; the other side had none');
  const opera = gameFeatures(game(), 'morphy');
  assert.ok(opera.m1 >= 1 && opera.m1Missed === 0, 'Morphy played his mate');
  assert.equal(needsReplay({...found, m1: undefined}), true, 'rows from before the count are replayed once');
  assert.equal(needsReplay(found), false);
});
