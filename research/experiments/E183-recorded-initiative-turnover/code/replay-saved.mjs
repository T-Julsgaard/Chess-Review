import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings,normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {sourceArchive} from './saved.mjs';
import {dir,fullBindings} from './source.mjs';
import {makeCase} from './cases.mjs';
import {checkTurnover} from './check-turnover.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),read=async file=>{const b=await readFile(file);return JSON.parse(file.endsWith('.gz')?gunzipSync(b):b.toString());};
const run=await read(dir+'/evidence/run.json'),bytes=await readFile(dir+'/evidence/results.json.gz'),saved=JSON.parse(gunzipSync(bytes));
assert.equal(sha256(bytes),run.outputs.results);assert.deepEqual(saved.sourceHashes,await fullBindings());assert.deepEqual(saved.sourceHashes,run.sourceHashes);assert.deepEqual(saved.datasetReceipt,data.receipt);assert.deepEqual(run.datasetReceipt,data.receipt);assert.deepEqual(saved.sources,run.sources);
for(const [file,hash]of Object.entries(saved.sources))assert.equal(sha256(await readFile(file)),hash);
const sources=await sourceArchive(),prior=await read(dir+'/evidence/prior-trees.json.gz');
assert.deepEqual(prior.datasetReceipt,data.receipt);assert.deepEqual(prior.sourceHashes,await bindings([dir+'/code/collect-prior.mjs']));assert.equal(prior.rows.length,4);
const archives=[];
for(const origin of prior.archives){
  const b=await readFile(origin.path);assert.equal(sha256(b),origin.sha256);const old=JSON.parse(gunzipSync(b));assert.deepEqual(old.eligibilityReceipt||old.datasetReceipt,data.receipt);
  for(const [file,hash]of Object.entries(old.sourceHashes))assert.equal(sha256(normalized(file,await readFile(file))),hash);
  archives.push(...old.rows);
}
for(const row of prior.rows){
  verifyTree(row.input,row.graph);
  const existing=archives.find(r=>r.graph.before===row.input.fen&&r.graph.played===row.input.move&&r.graph.plies===row.input.retrogradeCalculationPlies&&JSON.stringify(r.graph.history)===JSON.stringify(row.input.history));
  assert.equal(row.reused,!!existing);if(existing)assert.deepEqual(row.graph,existing.graph);
}
assert.equal(saved.rows.length,32);let index=0;
for(const original of sources.rows){
  const graph=prior.rows.find(r=>r.source===original.source&&r.color===original.color).graph;
  for(let family=0;family<8;family++){
    const c=makeCase(original,family),row=saved.rows[index++];
    assert.equal(row.id,c.id);assert.equal(row.source,c.source);assert.deepEqual(row.input,c.input);assert.deepEqual(row.options,{...c.options,priorTree:graph});assert.deepEqual(row.origin,original.locator);assert.equal(row.sourceRole,c.sourceRole);
    if(c.sourceRole==='original')assert.deepEqual(row.result,original.result);
    else{
      const actual=row.source==='tempo'?row.result.forcingTempoAnalysis.witness.panel:row.result.defenseComparisonAnalysis.witness.panel,expected=original.source==='tempo'?original.result.forcingTempoAnalysis.witness.panel:original.result.defenseComparisonAnalysis.witness.panel;assert.deepEqual(actual,expected);
    }
    checkTurnover(row.source,row.input,row.result,row.options,row.decision);assert.deepEqual(row.decision.claims,c.expected);
  }
}
const focus=await read(dir+'/evidence/focus-results.json.gz'),rawFocus=await read(dir+'/evidence/focus-raw.json.gz');
assert.deepEqual(focus.datasetReceipt,data.receipt);assert.deepEqual(rawFocus.datasetReceipt,data.receipt);assert.deepEqual(focus.sourceHashes,await bindings([dir+'/code/collect-focus.mjs']));assert.deepEqual(rawFocus.kernelHashes,await bindings(Object.keys(rawFocus.kernelHashes)));assert.equal(focus.rows.length,3);assert.equal(rawFocus.rows.length,3);
for(const row of focus.rows){
  const raw=rawFocus.rows.find(r=>r.id===row.id);assert.ok(raw);assert.equal(row.source,raw.source);assert.deepEqual(row.input,raw.input);assert.deepEqual(row.options,{...raw.options,...(raw.graph?{priorTree:raw.graph}:{})});
  if(row.sourceError){assert.equal(row.id,'recorded-fifty-claim-root');assert.equal(row.sourceError.message,'Cannot explain a move from a terminal position');assert.equal(new Chess(row.input.fen).isDrawByFiftyMoves(),true);assert.deepEqual(row.result,{});assert.equal(raw.panel,null);assert.equal(raw.graph,null);}
  else{const panel=row.source==='tempo'?row.result.forcingTempoAnalysis.witness.panel:row.result.defenseComparisonAnalysis.witness.panel;assert.deepEqual(panel,raw.panel);}
  checkTurnover(row.source,row.input,row.result,row.options,row.decision);assert.deepEqual(row.decision.claims,raw.expected);
}
const initialWhite=await read(dir+'/evidence/initial-tempo-w-result.json.gz'),initialBlack=await read(dir+'/evidence/initial-tempo-b-result.json.gz');
const oldFixtureBytes=gunzipSync(await readFile(dir+'/evidence/initial-fixtures.mjs.gz')),oldEntryBytes=gunzipSync(await readFile(dir+'/evidence/initial-smoke-root.mjs.gz'));
for(const [old,current]of [[initialWhite,sources.rows[0]],[initialBlack,sources.rows[1]]]){
  assert.deepEqual(old.input,current.input);assert.deepEqual(old.result,current.result);
  assert.equal(sha256(normalized('fixture.mjs',oldFixtureBytes)),old.sourceHashes[dir+'/code/fixtures.mjs']);assert.equal(sha256(normalized('entry.mjs',oldEntryBytes)),old.sourceHashes[dir+'/code/smoke-root.mjs']);
  const changed=Object.keys(current.sourceHashes).filter(f=>current.sourceHashes[f]!==old.sourceHashes[f]);assert.deepEqual(changed,[dir+'/code/fixtures.mjs']);
}
const rootFailure=await read(dir+'/evidence/development-failure.json'),focusFailure=await read(dir+'/evidence/focus-development-failure.json');assert.equal(rootFailure.error,'Invalid move: h5h1');
const rejected=new Chess(sources.rows[2].input.history.fen);rejected.put({type:'n',color:'w'},'h3');assert.equal(rejected.moves({verbose:true}).some(m=>m.from+m.to==='h5h1'),false);
assert.equal(focusFailure.collectorHash,sha256(normalized('focus.mjs',gunzipSync(await readFile(dir+'/evidence/initial-focus-collector.mjs.gz')))));assert.equal(focusFailure.rawHash,sha256(await readFile(dir+'/evidence/focus-raw.json.gz')));
const positives=Object.fromEntries(['C0595','C0596','C0597'].map(id=>[id,saved.rows.filter(r=>r.decision.claims[id]).length]));assert.deepEqual(positives,run.positives);assert.equal(run.cases,32);assert.equal(run.decisions,96);assert.deepEqual(run.extraFocused,{cases:3,decisions:9});
// Preserve and audit the already passing default-cap evidence before the strict
// source-cap correction; no chess observation or ordinary decision changed.
const initialBytes=await readFile(dir+'/evidence/initial-budget-results.json.gz'),initial=JSON.parse(gunzipSync(initialBytes)),initialRun=await read(dir+'/evidence/initial-budget-run.json.gz'),initialReplay=await read(dir+'/evidence/initial-budget-replay.json.gz');
assert.equal(sha256(initialBytes),initialRun.outputs.results);assert.equal(initialReplay.resultsHash,sha256(initialBytes));assert.equal(initialReplay.runHash,sha256(gunzipSync(await readFile(dir+'/evidence/initial-budget-run.json.gz'))));assert.equal(initialReplay.status,'passed');assert.deepEqual(initial.sourceHashes,initialRun.sourceHashes);assert.deepEqual(initialReplay.sourceHashes,initial.sourceHashes);assert.deepEqual(initial.rows,saved.rows);
const changed=Object.keys(initial.sourceHashes).filter(file=>initial.sourceHashes[file]!==saved.sourceHashes[file]);
const retained={'check-turnover':'checker','turnover.test':'tests','turnover':'runtime','record-build':'record-build','pilot':'pilot','replay-saved':'replayer'};
assert.deepEqual(changed.sort(),Object.keys(retained).map(name=>dir+'/code/'+name+'.mjs').sort());
assert.deepEqual(Object.keys(saved.sourceHashes).filter(file=>!Object.hasOwn(initial.sourceHashes,file)),[dir+'/BUDGET-AUDIT.md']);
for(const [name,archive]of Object.entries(retained))assert.equal(sha256(normalized('source.mjs',gunzipSync(await readFile(dir+'/evidence/initial-budget-'+archive+'.mjs.gz')))),initial.sourceHashes[dir+'/code/'+name+'.mjs']);
const initialFocus=await read(dir+'/evidence/initial-budget-focus-results.json.gz'),initialSmoke=await read(dir+'/evidence/initial-budget-smoke.json.gz'),currentSmoke=await read(dir+'/evidence/turnover-smoke.json.gz');assert.deepEqual(initialFocus.rows,focus.rows);assert.deepEqual(initialSmoke.rows,currentSmoke.rows);
assert.deepEqual(initial.datasetReceipt,data.receipt);assert.deepEqual(initialRun.datasetReceipt,data.receipt);assert.deepEqual(initialReplay.datasetReceipt,data.receipt);assert.deepEqual(currentSmoke.datasetReceipt,data.receipt);assert.deepEqual(currentSmoke.sourceHashes,await bindings([dir+'/code/smoke.mjs']));
await writeFile(dir+'/evidence/replay.json',JSON.stringify({experiment:'E183',status:'passed',cases:32,decisions:96,positives,extraFocused:{cases:3,decisions:9},datasetReceipt:data.receipt,resultsHash:sha256(bytes),runHash:sha256(await readFile(dir+'/evidence/run.json')),sourceHashes:saved.sourceHashes,limitations:['Frozen E143/E169/E146 independent source/legal admission and Chess shared','Ordinary-data shape helper shared; independent caches/gates/history/policy solving','Exposed synthetic development; combined acceptance and broad strategic/human validity open']},null,2)+'\n');
console.log(JSON.stringify({status:'passed',cases:32,decisions:96,positives,extraFocused:3,sourceInputs:Object.keys(saved.sourceHashes).length}));
