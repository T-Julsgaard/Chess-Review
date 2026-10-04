import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, positionCommand } from '../engine/uci.js';
import { Chess } from '../lib/chess.js';

class WorkerStub {
  commands=[];terminated=false;
  postMessage(cmd) { this.commands.push(cmd); }
  terminate() { this.terminated=true; }
  line(data) { this.onmessage({data}); }
}

test('search progress is throttled, exact-only and isolated from final results', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const eng=engine(t), updates=[];
  const pending=eng.analyse('position',12,1,null,snapshot=>{updates.push(snapshot);snapshot.score.cp=999;snapshot.lines[0].score.cp=999;});
  await Promise.resolve();
  eng.worker.line('info depth 3 score cp 5 pv e2e4');
  eng.worker.line('info depth 4 score cp 8 lowerbound pv e2e4');
  assert.equal(updates.length,0);
  eng.worker.line('info depth 4 score cp 10 pv e2e4');
  eng.worker.line('info depth 5 score cp 20 pv e2e4');
  assert.equal(updates.length,1);
  t.mock.timers.tick(121);
  eng.worker.line('info depth 6 score cp 30 pv e2e4');
  assert.equal(updates.length,2);
  eng.worker.line('bestmove e2e4');const result=await pending;
  assert.equal(result.score.cp,30);assert.equal(result.lines[0].score.cp,30);
  eng.worker.line('info depth 7 score cp 40 pv e2e4');assert.equal(updates.length,2);
});

function engine(t,options={}) {
  const previous=globalThis.Worker;globalThis.Worker=options.Worker||WorkerStub;
  const eng=new Engine(options.path);
  t.after(()=>{eng.terminate();globalThis.Worker=previous;});
  if(!options.noReady){eng.worker.line('uciok');eng.worker.line('readyok');}
  return eng;
}

test('failed Worker construction is safe to terminate',async t=>{
  const eng=engine(t,{noReady:true,Worker:class {constructor(){throw Error('blocked');}}});
  await assert.rejects(eng.setOptions(),/could not be created/);
  assert.doesNotThrow(()=>eng.terminate());
});

test('terminate rejects an unfinished handshake',async t=>{
  const eng=engine(t,{noReady:true});const ready=assert.rejects(eng.setOptions(),/terminated/);
  eng.terminate();await ready;assert.equal(eng.worker.terminated,true);
});

test('a crashed worker rejects the current and queued positions',async t=>{
  const eng=engine(t);const one=eng.analyse('position1'),two=eng.analyse('position2');
  const results=Promise.allSettled([one,two]);await Promise.resolve();
  eng.worker.onerror({message:'crash'});
  assert.ok((await results).every(r=>r.status==='rejected'));
  assert.equal(eng.dead,true);assert.equal(eng.worker.terminated,true);
});

test('stale queued searches can be cancelled and later searches still run',async t=>{
  const eng=engine(t);const one=eng.analyse('position1'),two=eng.analyse('position2');
  const cancelled=assert.rejects(two,/superseded/);await Promise.resolve();eng.cancelPending();
  eng.worker.line('info depth 4 score cp 32 pv e2e4 e7e5');eng.worker.line('bestmove e2e4');
  assert.equal((await one).score.cp,32);await cancelled;
  const three=eng.analyse('position3');await Promise.resolve();
  eng.worker.line('info depth 4 score mate 2 pv f7g7');eng.worker.line('bestmove f7g7');
  assert.equal((await three).score.mate,2);
  assert.ok(!eng.worker.commands.includes('position fen position2'));
});

test('a silent search fails instead of hanging forever',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const eng=engine(t);
  const failed=assert.rejects(eng.analyse('position'),/timed out/);await Promise.resolve();
  t.mock.timers.tick(120001);await failed;assert.equal(eng.dead,true);
});

test('ongoing engine output extends the search timeout',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const eng=engine(t);
  const result=eng.analyse('position');await Promise.resolve();
  t.mock.timers.tick(119000);eng.worker.line('info depth 4 score cp 12 pv e2e4');
  t.mock.timers.tick(119000);assert.equal(eng.dead,false);
  eng.worker.line('bestmove e2e4');assert.equal((await result).score.cp,12);
});

test('Stockfish 19 Lite fails cleanly if its startup is silent',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const eng=engine(t,{path:'engine/stockfish-19-lite-single.js',noReady:true});
  const failed=assert.rejects(eng.setOptions(),/timed out/);
  t.mock.timers.tick(60001);await failed;assert.equal(eng.dead,true);
});

test('slow cold startup has time to compile before the recovery deadline',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const eng=engine(t,{noReady:true}),ready=eng.setOptions({Hash:16});
  t.mock.timers.tick(20000);assert.equal(eng.dead,false);
  eng.worker.line('uciok');eng.worker.line('readyok');await ready;
  assert.ok(eng.worker.commands.includes('setoption name Hash value 16'));
});

test('MultiPV retains ranking, depth and score bounds without changing scalar evaluation', async t => {
  const eng = engine(t), result = eng.analyse('position', 16, 2);
  await Promise.resolve();
  eng.worker.line('info depth 15 multipv 2 score cp 20 upperbound pv d2d4 d7d5');
  eng.worker.line('info depth 16 multipv 1 score cp 600 lowerbound pv e2e4 e7e5');
  eng.worker.line('bestmove e2e4');
  const r = await result;
  assert.deepEqual(r.score, { cp: 600 });
  assert.deepEqual(r.lines, [
    { score: { cp: 600 }, pv: 'e2e4 e7e5', depth: 16, bound: 'lowerbound', multipv: 1 },
    { score: { cp: 20 }, pv: 'd2d4 d7d5', depth: 15, bound: 'upperbound', multipv: 2 },
  ]);
  const next = eng.analyse('next', 16, 2); await Promise.resolve();
  eng.worker.line('info depth 16 multipv 1 score mate 3 pv e2e4');
  eng.worker.line('info depth 16 multipv 2 score cp 0 pv d2d4');
  eng.worker.line('bestmove e2e4');
  assert.ok((await next).lines.every(l => l.bound === 'exact' && l.depth === 16));
});

test('history transport preserves repeated moves and snapshots queued context', async t => {
  const eng=engine(t),chess=new Chess(),initialFen=chess.fen();
  const moves=['g1f3','g8f6','f3g1','f6g8'];
  for(const uci of moves)chess.move({from:uci.slice(0,2),to:uci.slice(2,4)});
  const history={initialFen,moves},pending=eng.analyse(chess.fen(),4,1,history);
  moves.length=0;await Promise.resolve();
  assert.ok(eng.worker.commands.includes(`position fen ${initialFen} moves g1f3 g8f6 f3g1 f6g8`));
  eng.worker.line('info depth 4 score cp 0 pv g1f3');eng.worker.line('bestmove g1f3');await pending;
});

test('setup-FEN history retains underpromotion and rejects a mismatched or malformed prefix',()=>{
  const initialFen='7k/P7/8/8/8/8/8/7K w - - 0 1',chess=new Chess(initialFen);
  chess.move({from:'a7',to:'a8',promotion:'n'});
  assert.equal(positionCommand(chess.fen(),{initialFen,moves:['a7a8n']}),`position fen ${initialFen} moves a7a8n`);
  assert.throws(()=>positionCommand(chess.fen(),{initialFen,moves:['a7a8q']}),/does not reach/);
  assert.throws(()=>positionCommand(chess.fen(),{initialFen,moves:['a7a8n\ngo infinite']}),/Invalid history move/);
});

test('cold restricted scoring waits for readyok, retains exact WDL and honors the node budget', async t => {
  const eng = engine(t), fen = new Chess().fen();
  const pending = eng.analyse(fen, 16, 1, {initialFen: fen, moves: []}, null,
    {cold: true, requireExact: true, budget: {kind: 'nodes', value: 20000}, searchMove: 'e2e4'});
  await Promise.resolve();
  assert.ok(eng.worker.commands.includes('setoption name Clear Hash'));
  assert.ok(!eng.worker.commands.some(command => command.startsWith('go ')));
  eng.worker.line('readyok');
  assert.equal(eng.worker.commands.at(-1), 'go nodes 20000 searchmoves e2e4');
  eng.worker.line('info depth 12 score cp 20 wdl 200 600 200 pv e2e4');
  eng.worker.line('info depth 13 score cp 999 lowerbound wdl 900 100 0 pv e2e4');
  eng.worker.line('bestmove e2e4');
  assert.deepEqual((await pending).score, {cp: 20, wdl: [200, 600, 200]});
});

test('scoring rejects absent exact evidence and illegal restrictions', async t => {
  const eng = engine(t), fen = new Chess().fen();
  await assert.rejects(eng.analyse(fen, 16, 1, null, null, {searchMove: 'a1a8'}), /Invalid restricted/);
  const pending = eng.analyse(fen, 16, 1, null, null, {requireExact: true});
  await Promise.resolve();
  eng.worker.line('info depth 16 score cp 30 lowerbound pv e2e4');
  eng.worker.line('bestmove e2e4');
  await assert.rejects(pending, /exact completed/);
});

test('scoring cannot attach a stale exact PV score to a different completed best move', async t => {
  const eng = engine(t), fen = new Chess().fen();
  const pending = eng.analyse(fen, 16, 1, null, null, {requireExact: true});
  await Promise.resolve();
  eng.worker.line('info depth 12 score cp 30 pv e2e4');
  eng.worker.line('info depth 13 score cp 300 lowerbound pv d2d4');
  eng.worker.line('bestmove d2d4');
  await assert.rejects(pending, /exact completed/);
});
