import test from 'node:test';
import assert from 'node:assert/strict';
import {previewGameKey, savedButtonSummary} from '../lib/button-preview.js';
import {finishedPreviewGame, PreviewPositions, analyseButtonPreview} from '../lib/preview-analysis.js';
import {createButtonPreviewService} from '../lib/button-preview-service.js';
import {createPreviewRunner} from '../lib/preview-runner.js';

const pgn = '[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0';
const key = 'chesscom:12345678', url = 'https://www.chess.com/game/live/12345678';
const payload = {pgn,meta:{url}};
const summary = {version:1,estimated:true,accuracy:{w:90,b:80}};
const deferred = () => {let resolve; const promise = new Promise(r => {resolve = r;}); return {promise,resolve};};
const tick = () => new Promise(resolve => setImmediate(resolve));

test('preview keys cover both platforms and player tokens without cross-platform collisions', () => {
  for (const path of ['/game/12345678','/game/daily/12345678','/analysis/game/live/12345678/review?flip=1']) {
    assert.equal(previewGameKey('https://www.chess.com'+path),key);
  }
  for (const path of ['/12345678','/game/12345678abcd/black/analysis']) {
    assert.equal(previewGameKey('https://lichess.org'+path),'lichess:12345678');
  }
  for (const bad of ['http://lichess.org/12345678','https://lichess.org.example.com/12345678',
    'https://lichess.org/analysis','https://lichess.org/study/12345678','https://www.chess.com/member/12345678','no URL']) {
    assert.equal(previewGameKey(bad),null);
  }
});

test('only complete standard games can enter the preview engine', () => {
  assert.deepEqual(finishedPreviewGame(pgn),{moves:['e2e4','e7e5','g1f3','b8c6'],players:{w:'Alice',b:'Bob'}});
  for (const bad of [pgn.replaceAll('1-0','*'), '1. e4 e5', pgn.replace('e4','e9'),
    '[Variant "Chess960"]\n'+pgn, '[SetUp "1"]\n'+pgn, ' '.repeat(150001)]) {
    assert.throws(() => finishedPreviewGame(bad));
  }
});

test('preview histories retain legal move prefixes and reject mutated or foreign histories', () => {
  const prepared = new PreviewPositions(finishedPreviewGame(pgn).moves);
  assert.equal(prepared.roots.length,4);
  for (let i=0;i<4;i++) {
    const root = prepared.roots[i];
    assert.equal(root.history.moves.length,i);
    assert.ok(prepared.command(root.fen,root.history).endsWith(i ? root.history.moves.join(' ') : root.history.initialFen));
    assert.throws(() => prepared.command(root.fen,{...root.history}));
    assert.throws(() => root.history.moves.push('a2a3'));
  }
  assert.throws(() => prepared.command('wrong FEN',prepared.roots[0].history));
  assert.throws(() => new PreviewPositions(['e2e5']));
});

function fakeEngine() {
  return {calls:[],stopped:0, async setOptions(options){this.options=options;},
    async analyse(fen,depth,lines,history,progress,options) {
      this.calls.push({fen,depth,lines,history,options});
      return {bestmove:options.searchMove || 'a2a3',score:{cp:options.searchMove ? -50 : 50}};
    },terminate(){this.stopped++;}};
}
const calibration = {quality:{outcome:{slopePerPawn:1},choice:{temperature:5}}};
test('preview covers both sides at depth 8, scores played moves at the same root and returns no full-review evidence', async () => {
  const engine=fakeEngine();
  const result=await analyseButtonPreview(pgn,{createEngine:()=>engine,loadCalibration:async()=>calibration});
  assert.equal(result.estimated,true); assert.equal(result.version,1);
  assert.deepEqual(result.players,{w:'Alice',b:'Bob'});
  assert.ok(result.accuracy.w>0 && result.accuracy.w<100);
  assert.equal(result.accuracy.w,result.accuracy.b);
  assert.equal(engine.calls.length,8); assert.equal(engine.stopped,1);
  assert.equal(engine.options.Hash,16);
  for (let i=0;i<8;i+=2) {
    const best=engine.calls[i], played=engine.calls[i+1];
    assert.equal(best.fen,played.fen); assert.equal(best.history,played.history);
    assert.equal(best.depth,8); assert.equal(best.options.requireExact,true); assert.equal(best.options.cold,false);
    assert.equal(played.options.searchMove,finishedPreviewGame(pgn).moves[i/2]);
  }
  assert.deepEqual(Object.keys(result).sort(),['accuracy','estimated','players','version']);
});

for (const stage of ['calibration','options','analysis']) test(`preview cancels a stalled ${stage} and terminates its worker`,async () => {
  const engine=fakeEngine();
  if(stage==='options') engine.setOptions=()=>new Promise(()=>{});
  if(stage==='analysis') engine.analyse=()=>new Promise(()=>{});
  await assert.rejects(analyseButtonPreview(pgn,{budgetMs:30,createEngine:()=>engine,
    loadCalibration:()=>stage==='calibration' ? new Promise(()=>{}) : Promise.resolve(calibration)}));
  assert.ok(engine.stopped>=1);
});

test('preview rejects live games and already canceled requests before creating a worker', async () => {
  let workers=0; const createEngine=()=>{workers++;return fakeEngine();};
  const controller=new AbortController();controller.abort();
  await assert.rejects(analyseButtonPreview(pgn,{signal:controller.signal,createEngine}));
  await assert.rejects(analyseButtonPreview(pgn.replaceAll('1-0','*'),{createEngine}));
  assert.equal(workers,0);
});

test('saved summaries require the exact game, PGN and valid scores; legacy records omit counts', () => {
  const record={url,pgn,meSide:'b',myAcc:80,opAcc:90};
  assert.deepEqual(savedButtonSummary(record,payload,key),{version:1,key,estimated:false,accuracy:{b:80,w:90},counts:null});
  assert.equal(savedButtonSummary({...record,pgn:pgn+' '},payload,key),null);
  assert.equal(savedButtonSummary({...record,url:'https://lichess.org/12345678'},payload,key),null);
  assert.equal(savedButtonSummary({...record,myAcc:NaN},payload,key),null);
  const counts={w:{brilliant:1,great:2},b:{brilliant:0,great:1}};
  assert.deepEqual(savedButtonSummary({...record,buttonSummary:{version:1,accuracy:{w:90,b:80},counts}},payload,key).counts,counts);
  assert.equal(savedButtonSummary({...record,buttonSummary:{version:1,accuracy:{w:90,b:80},counts:{...counts,w:{brilliant:-1,great:2}}}},payload,key).counts,null);
});

function service(overrides={}) {
  const reads=[],loads=[],runs=[];
  const api={storage:{local:{async get(name){reads.push(name);return {library:[]};}}}};
  const instance=createButtonPreviewService({api,
    loadGame:async(...args)=>{loads.push(args);return payload;},
    runPreview:async(...args)=>{runs.push(args);return summary;},...overrides});
  return {...instance,reads,loads,runs};
}
test('all button placements in a tab share one import; completed previews are cached across tabs without writes',async () => {
  const s=service();const results=await Promise.all([s.get(1,key),s.get(1,key)]);
  assert.deepEqual(results[0],results[1]); assert.equal(s.loads.length,1); assert.equal(s.runs.length,1);
  assert.equal((await s.get(2,key)).ok,true);assert.equal(s.runs.length,1);
  assert.deepEqual(s.reads,['library','library']);
});
test('saved full-review summaries bypass the preview worker',async () => {
  const counts={w:{brilliant:1,great:2},b:{brilliant:0,great:0}};
  const s=service({api:{storage:{local:{get:async()=>({library:[{url,pgn,buttonSummary:{version:1,accuracy:summary.accuracy,counts}}]})}}}});
  const result=await s.get(1,key);
  assert.equal(result.estimated,false);assert.deepEqual(result.counts,counts);assert.equal(s.runs.length,0);
});
test('live PGNs and game-identity mismatches never start a preview worker',async () => {
  for(const loaded of [{...payload,pgn:pgn.replaceAll('1-0','*')},{...payload,meta:{url:'https://lichess.org/12345678'}}]) {
    const s=service({loadGame:async()=>loaded});assert.equal((await s.get(1,key)).ok,false);assert.equal(s.runs.length,0);
  }
});
test('navigation cancels pending lookup and never starts its stale worker',async () => {
  const gate=deferred(),signals=[];
  const s=service({loadGame:async(id,{signal})=>{signals.push(signal);return gate.promise;}});
  const first=s.get(1,key);await tick();
  const next=s.get(1,'chesscom:99999999');await tick();
  assert.equal(signals[0].aborted,true);
  gate.resolve(payload);
  assert.equal((await first).ok,false);assert.equal((await next).ok,false);assert.equal(s.runs.length,0);
});
test('canceling a running preview stops its signal and cannot populate the cache',async () => {
  const gate=deferred();let signal;
  const s=service({runPreview:async(pgn,s)=>{signal=s;return gate.promise;}});
  const first=s.get(1,key);await tick();s.cancel(1,key);assert.equal(signal.aborted,true);
  gate.resolve(summary);assert.equal((await first).ok,false);
});

test('Firefox preview runner serializes workers, including after a failed game',async () => {
  let active=0,maximum=0;
  const run=createPreviewRunner({},async text=>{active++;maximum=Math.max(maximum,active);await tick();active--;if(text==='bad')throw Error('bad');return text;});
  const values=await Promise.allSettled([run('a'),run('bad'),run('b')]);
  assert.equal(maximum,1);assert.deepEqual(values.map(x=>x.status),['fulfilled','rejected','fulfilled']);
});
test('Chrome runner reuses one offscreen document for a queue and closes it when idle',async () => {
  let created=0,closed=0,active=0,maximum=0;
  const api={runtime:{getURL:p=>'chrome-extension://test/'+p,getContexts:async()=>created ? [{}] : [],
    async sendMessage(message){assert.equal(message.target,'button-preview-host');active++;maximum=Math.max(maximum,active);await tick();active--;return {ok:true,summary};}},
    offscreen:{async createDocument(options){assert.deepEqual(options.reasons,['WORKERS']);created++;},async closeDocument(){closed++;}}};
  const run=createPreviewRunner(api);await Promise.all([run(pgn),run(pgn)]);
  assert.equal(created,1);assert.equal(closed,1);assert.equal(maximum,1);
});
test('a canceled queued Chrome preview cannot create an offscreen worker',async () => {
  const gate=deferred();let analysed=0;
  const api={runtime:{getURL:p=>p,getContexts:async()=>[{}],sendMessage:async message=>{if(message.type==='analyse'){analysed++;return gate.promise;}}},
    offscreen:{createDocument:async()=>{},closeDocument:async()=>{}}};
  const run=createPreviewRunner(api),controller=new AbortController();
  const first=run(pgn),second=run(pgn,controller.signal);controller.abort();
  gate.resolve({ok:true,summary});await first;await assert.rejects(second);assert.equal(analysed,1);
});
