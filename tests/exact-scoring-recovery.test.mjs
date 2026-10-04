import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Chess} from '../lib/chess.js';
import {analyseCalibratedPosition} from '../lib/calibrated-search.js';
import {Engine} from '../engine/uci.js';
const calibration=JSON.parse(await readFile(new URL('../data/calibration.json',import.meta.url)));
for(const build of ['nnue','sf19lite']) {
  test(`${build} recovers a mismatched final PV with a cold exact search of the reported move`,async()=>{
    const calls=[],fen=new Chess().fen(),history={initialFen:fen,moves:[]};
    const engine={buildKey:build,async setOptions(){},async analyse(fen,depth,lines,h,progress,config){
      calls.push({fen,depth,lines,h,config});
      if(calls.length===1) {const error=Error('Missing exact completed scoring evidence');error.scoringMove='e2e4';throw error;}
      return {bestmove:config.searchMove,score:{cp:40,wdl:[100,800,100]},pv:config.searchMove};
    }};
    const root=await analyseCalibratedPosition(engine,{fen,history,played:'e2e4',calibration,
      settings:{enginePath:build,engineDepth:16,engineHash:16,engineSkill:20,classifyLines:1}});
    assert.equal(calls.length,2);assert.equal(root.exactRecovery,true);assert.equal(root.bestmove,'e2e4');
    assert.deepEqual(root.playedScore,root.score);
    assert.equal(calls[1].config.searchMove,'e2e4');assert.equal(calls[1].config.cold,true);
    assert.equal(calls[1].config.requireExact,true);assert.deepEqual(calls[1].config.budget,calls[0].config.budget);
    assert.equal(calls[1].h,history);
  });
}
test('unrelated search failures are not masked or retried',async()=>{
  let calls=0;const engine={async setOptions(){},async analyse(){calls++;throw Error('Engine crashed');}};
  await assert.rejects(analyseCalibratedPosition(engine,{fen:new Chess().fen(),settings:{enginePath:'nnue',engineDepth:16},calibration}),/crashed/);
  assert.equal(calls,1);
});

test('actual browser scoring coordinator recovers a bundled SF19 bounded final PV',async t=>{
  const previous=globalThis.Worker;
  globalThis.Worker=class {
    commands=[];
    constructor(url) {
      this.child=spawn(process.execPath,[fileURLToPath(new URL('../tools/calibration/engine-host.cjs',import.meta.url)),path.resolve(url.split('#')[0])],
        {windowsHide:true,stdio:['pipe','pipe','pipe']});
      createInterface({input:this.child.stdout}).on('line',line=>this.onmessage?.({data:line}));
      this.child.on('error',error=>this.onerror?.({message:error.message}));
    }
    postMessage(command) {this.commands.push(command);this.child.stdin.write(command+'\n');}
    terminate() {this.child.kill();}
  };
  const engine=new Engine('engine/stockfish-19-lite-single.js');engine.buildKey='sf19lite';
  t.after(()=>{engine.terminate();globalThis.Worker=previous;});
  const moves='e2e4 c7c5 g1f3 e7e6 d2d4 c5d4 f3d4 g8f6 b1c3 b8c6'.split(' '),chess=new Chess(),initialFen=chess.fen();
  for(const move of moves)chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
  const root=await analyseCalibratedPosition(engine,{fen:chess.fen(),history:{initialFen,moves},played:'c1f4',calibration,
    settings:{enginePath:'sf19lite',engineDepth:16,engineHash:32,engineSkill:20,classifyLines:1}});
  assert.equal(root.bestmove,root.pv.split(' ')[0]);assert.equal(root.exactRecovery,true);
  assert.ok(engine.worker.commands.includes('go nodes 20000 searchmoves c1f4'));
  assert.ok(root.lines.every(line=>line.bound==='exact'));
  assert.equal(root.playedScore,root.score);
});
