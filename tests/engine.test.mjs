import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../engine/uci.js';

class WorkerStub {
  commands=[];terminated=false;
  postMessage(cmd) { this.commands.push(cmd); }
  terminate() { this.terminated=true; }
  line(data) { this.onmessage({data}); }
}

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

test('a supplied move history is replayed so Stockfish sees repetitions',async t=>{
  const eng=engine(t);
  const result=eng.analyse('somefen',4,1,{initialFen:'startfen',moves:['e2e4','e7e5']});
  await Promise.resolve();
  assert.ok(eng.worker.commands.includes('position fen startfen moves e2e4 e7e5'));
  assert.ok(!eng.worker.commands.includes('position fen somefen'));
  eng.worker.line('info depth 4 score cp 10 pv g1f3');eng.worker.line('bestmove g1f3');
  assert.equal((await result).score.cp,10);
});

test('without a history the bare FEN is searched (unchanged behaviour)',async t=>{
  const eng=engine(t);
  const result=eng.analyse('barefen',4,1);
  await Promise.resolve();
  assert.ok(eng.worker.commands.includes('position fen barefen'));
  eng.worker.line('info depth 4 score cp 5 pv e2e4');eng.worker.line('bestmove e2e4');
  assert.equal((await result).score.cp,5);
});

test('Stockfish 19 Lite fails cleanly if its startup is silent',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const eng=engine(t,{path:'engine/stockfish-19-lite-single.js',noReady:true});
  const failed=assert.rejects(eng.setOptions(),/timed out/);
  t.mock.timers.tick(10001);await failed;assert.equal(eng.dead,true);
});
