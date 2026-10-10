import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {explainMove as tempoExplain} from '../../E143-forcing-tempo-initiative/code/tempo.mjs';
import {explainMove as defenseExplain} from '../../E169-passive-defense-counterplay/code/defense.mjs';
import {sourceArchive} from './saved.mjs';
import {dir,fullBindings} from './source.mjs';
import {makeCase} from './cases.mjs';
import {inspectTurnover} from './turnover.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),saved=await sourceArchive(),prior=JSON.parse(gunzipSync(await readFile(dir+'/evidence/prior-trees.json.gz'))),focus=JSON.parse(gunzipSync(await readFile(dir+'/evidence/focus-results.json.gz')));
assert.deepEqual(prior.datasetReceipt,data.receipt);assert.deepEqual(prior.sourceHashes,await bindings([dir+'/code/collect-prior.mjs']));
assert.deepEqual(focus.datasetReceipt,data.receipt);assert.deepEqual(focus.sourceHashes,await bindings([dir+'/code/collect-focus.mjs']));
const sources={};for(const name of ['smoke-manifest.json','prior-trees.json.gz','focus-raw.json.gz','focus-results.json.gz','development-failure.json','initial-fixtures.mjs.gz','initial-smoke-root.mjs.gz','initial-tempo-w-result.json.gz','initial-tempo-b-result.json.gz','focus-development-failure.json','initial-focus-collector.mjs.gz',...saved.rows.flatMap(r=>[r.locator.file.split('/').at(-1),r.locator.rawFile.split('/').at(-1)])])sources[dir+'/evidence/'+name]=sha256(await readFile(dir+'/evidence/'+name));
const rows=[];
sources[dir+'/evidence/turnover-smoke.json.gz']=sha256(await readFile(dir+'/evidence/turnover-smoke.json.gz'));
for(const name of ['initial-budget-results.json.gz','initial-budget-run.json.gz','initial-budget-replay.json.gz','initial-budget-focus-results.json.gz','initial-budget-smoke.json.gz','initial-budget-runtime.mjs.gz','initial-budget-checker.mjs.gz','initial-budget-tests.mjs.gz','initial-budget-record-build.mjs.gz','initial-budget-pilot.mjs.gz','initial-budget-replayer.mjs.gz'])sources[dir+'/evidence/'+name]=sha256(await readFile(dir+'/evidence/'+name));
for(const row of saved.rows){
  const graph=prior.rows.find(r=>r.source===row.source&&r.color===row.color).graph;
  for(let index=0;index<8;index++){
    const c=makeCase(row,index);let result=row.result;
    if(c.sourceRole==='quiet')result=c.source==='tempo'?tempoExplain({...c.input,forcingTempoPanel:row.result.forcingTempoAnalysis.witness.panel}):defenseExplain({...c.input,defenseComparisonPanel:row.result.defenseComparisonAnalysis.witness.panel});
    const options={...c.options,priorTree:graph},decision=inspectTurnover(c.source,c.input,result,options);assert.deepEqual(decision.claims,c.expected,c.id);
    rows.push({id:c.id,source:c.source,input:c.input,options,result,decision,origin:row.locator,sourceRole:c.sourceRole});
  }
}
assert.equal(rows.length,32);
const sourceHashes=await fullBindings(),packed=gzipSync(JSON.stringify({schema:'E183-main-pilot-v1',datasetReceipt:data.receipt,sourceHashes,sources,rows}),{level:9});
await writeFile(dir+'/evidence/results.json.gz',packed);
const positives=Object.fromEntries(['C0595','C0596','C0597'].map(id=>[id,rows.filter(r=>r.decision.claims[id]).length]));
await writeFile(dir+'/evidence/run.json',JSON.stringify({experiment:'E183',preregistration:'ede1053272e99f23cc558feb3c6751fc68767e70',amendment:'24def14f0319f4906a783d5df70367721f1d351d',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,os:os.release(),engine:null,seed:null,datasetReceipt:data.receipt,sourceHashes,sources,outputs:{results:sha256(packed)},cases:32,decisions:96,positives,extraFocused:{cases:focus.rows.length,decisions:focus.rows.length*3},scope:'Exposed synthetic development, bounded checking-mate resource turnover; combined acceptance and broad strategic/human validity remain open.'},null,2)+'\n');
console.log(JSON.stringify({cases:32,decisions:96,positives,extraFocused:focus.rows.length,sourceInputs:Object.keys(sourceHashes).length,bytes:packed.length}));
