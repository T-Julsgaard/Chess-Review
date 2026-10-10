import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings,normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {collectPanel as collectEngine} from '../../E138-bounded-engine-panels/code/collect.mjs';
import {explainMove as engineExplain} from '../../E138-bounded-engine-panels/code/engine-panel.mjs';
import {checkPanel} from '../../E138-bounded-engine-panels/code/check-panel.mjs';
import {collectPanel} from '../../E143-forcing-tempo-initiative/code/panel.mjs';
import {verifyPanel} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
import {fixtures} from './fixtures.mjs';
import {openingFrame,pressureContext,engineFixture} from './frames.mjs';
import {receiptCompatibility} from './receipt-compatibility.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E147-opening-pressure-estimates',sourceObservation='research/experiments/E138-bounded-engine-panels/evidence/results.json.gz',sourceBytes=await readFile(sourceObservation),old=JSON.parse(gunzipSync(sourceBytes)),oldRun=JSON.parse(await readFile('research/experiments/E138-bounded-engine-panels/evidence/run.json','utf8'));
assert.equal(sha256(sourceBytes),oldRun.outputHashes['results.json.gz']);const policyCompatibility=await receiptCompatibility(old,data.receipt);for(const [p,h]of Object.entries(old.inputHashes))assert.equal(sha256(normalized(p,await readFile(p))),h,'Changed borrowed source '+p);
const sourceHashes=await bindings([dir+'/code/frames.mjs',dir+'/code/fixtures.mjs','research/experiments/E143-forcing-tempo-initiative/code/panel.mjs','research/experiments/E138-bounded-engine-panels/code/collect.mjs','engine/stockfish-19-lite-single.js','engine/stockfish-19-lite-single.wasm']),smoke=JSON.parse(await readFile('research/runs/E147/smoke/observations.json','utf8'));assert.deepEqual(smoke.sourceHashes,sourceHashes);const pressure=[],engines=[],borrowed=[];let reusedSmoke=0,newPressure=0,newEngines=0;const engineKey=f=>({fen:f.fen,history:f.history,move:f.move});
await mkdir('research/runs/E147',{recursive:true});
for(const f of fixtures){if(f.mode==='none')continue;if(f.mode==='pressure'){const ctx=pressureContext(f,openingFrame(f)),key={fen:ctx.fen,history:ctx.history,plies:1};if(pressure.some(r=>JSON.stringify(r.key)===JSON.stringify(key)))continue;const initial=smoke.pressure.find(r=>JSON.stringify(r.key)===JSON.stringify(key)),panel=initial?initial.panel:collectPanel(ctx,1,50000);initial?reusedSmoke++:newPressure++;verifyPanel(ctx,panel);pressure.push({key,panel});}
  else{const key=engineKey(f);if(engines.some(r=>JSON.stringify(r.key)===JSON.stringify(key)))continue;const prior=old.rows.find(r=>JSON.stringify(engineKey(r.fixture))===JSON.stringify(key)),initial=smoke.engines.find(r=>JSON.stringify(r.key)===JSON.stringify(key));let bundle;
    if(prior){checkPanel(prior.fixture,prior.bundle,prior.result);bundle=prior.bundle;borrowed.push({source:'E138',sourceObservation,sourceObservationSha256:sha256(sourceBytes),sourceHashes:old.inputHashes,key,bundleSha256:sha256(JSON.stringify(bundle)),collectionSource:prior.collectionSource,policyCompatibility});}else if(initial){bundle=initial.bundle;reusedSmoke++;}else{bundle=await collectEngine(engineFixture(f));newEngines++;}
    engines.push({key,bundle});await writeFile('research/runs/E147/collection-partial.json',JSON.stringify({sourceHashes,pressure,engines,borrowed}));assert.equal(bundle.status,'complete',bundle.error);const fixture=engineFixture(f),result=engineExplain({...fixture,enginePanel:bundle});checkPanel(fixture,bundle,result);
  }
}
await mkdir(dir+'/evidence',{recursive:true});const packed=gzipSync(Buffer.from(JSON.stringify({schema:'E147-opening-observations-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,sourceHashes,pressure,engines,borrowed,reusedSmoke})+'\n'),{level:9});await writeFile(dir+'/evidence/observations.json.gz',packed);console.log(JSON.stringify({pressure:pressure.length,engines:engines.length,borrowed:borrowed.length,reusedSmoke,newPressure,newEngines,sourceInputs:Object.keys(sourceHashes).length,compressedBytes:packed.length,pressureCosts:pressure.map(r=>r.panel.nodes),engineCalls:engines.map(r=>r.bundle.searchCount),newRequestedNodes:engines.filter(r=>!borrowed.some(b=>JSON.stringify(b.key)===JSON.stringify(r.key))).reduce((n,r)=>n+r.bundle.ledger.reduce((a,s)=>a+s.budget.value,0),0),newObservedNodes:engines.filter(r=>!borrowed.some(b=>JSON.stringify(b.key)===JSON.stringify(r.key))).reduce((n,r)=>n+r.bundle.ledger.reduce((a,s)=>a+s.result.nodes,0),0)}));
