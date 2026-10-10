import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {fixtures} from './fixtures.mjs';
import {collectPanel} from './collect.mjs';
import {explainMove} from './engine-panel.mjs';
import {checkPanel} from './check-panel.mjs';
import {bindings,collectionSeeds,directory,normalized,digest} from './source-bindings.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),rows=[],sourceHashes=await bindings(collectionSeeds),revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
// Reuse the first smoke only after verifying its snapshot AND all transitive sources.
const saved=JSON.parse(await readFile('research/runs/E138/smoke/source.json','utf8'));
assert.equal(saved.schema,'E138-collection-source-v1');const audit={};
for(const [name,hash]of Object.entries(sourceHashes)){
 if(saved.sourceHashes[name])assert.equal(hash,saved.sourceHashes[name],'Changed smoke source '+name);
 else assert.equal(hash,digest(normalized(name,execFileSync('git',['show',saved.revision+':'+name],{maxBuffer:64*1024*1024}))),'Changed smoke dependency '+name);
 audit[name]=saved.sourceHashes[name]?'contemporaneous smoke snapshot':'unchanged committed bytes at smoke revision';
}
for(let i=0;i<fixtures.length;i++){
 const fixture=fixtures[i],started=Date.now(),bundle=i===0?JSON.parse(await readFile('research/runs/E138/smoke/observations.json','utf8')):await collectPanel(fixture);
 const source={schema:'E138-collection-source-v1',revision:i===0?saved.revision:revision,sourceHashes,reused:i===0,
  ...(i===0?{snapshot:saved,dependencyAudit:audit}:{}),elapsedMs:i===0?null:Date.now()-started};
 assert.equal(bundle.status,'complete',bundle.error);assert.equal(bundle.observationKind,'local-stockfish');
 assert.equal(bundle.config.loaderSha256,digest(await readFile('engine/stockfish-19-lite-single.js')));assert.equal(bundle.config.wasmSha256,sourceHashes['engine/stockfish-19-lite-single.wasm']);
 const result=explainMove({...fixture,enginePanel:bundle});checkPanel(fixture,bundle,result);assert.equal(result.enginePanelAnalysis.status,'observed');rows.push({fixture,bundle,result,collectionSource:source});
}
const inputHashes=JSON.parse(await readFile(directory+'/build.json','utf8')).inputHashes;
for(const [name,hash]of Object.entries(inputHashes))assert.equal(hash,digest(normalized(name,await readFile(name))));
const engine=rows[0].bundle.config;for(const row of rows)assert.deepEqual(row.bundle.config,engine);
const report={schema:'E138-focused-pilot-v1',revision,source:'authored synthetic only; real local Stockfish opinions',environment:{node:process.version,platform:process.platform,arch:process.arch},command:process.argv,engine,seed:null,inputHashes,workingTreeStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,rows};
const plain=Buffer.from(JSON.stringify(report)+'\n'),packed=gzipSync(plain,{level:9}),out=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'research/runs/E138/pilot';
await mkdir(out,{recursive:true});await writeFile(out+'/results.json.gz',packed);
await writeFile(out+'/run.json',JSON.stringify({schema:'E138-focused-retention-v1',sourceRevision:revision,environment:report.environment,command:report.command,engine,seed:null,inputHashes,outputHashes:{'results.json.gz':sha256(packed)},uncompressedSha256:sha256(plain),uncompressedBytes:plain.length,compressedBytes:packed.length,cases:rows.length,scope:'Provisional bounded engine analysis tooling; combined acceptance deferred'},null,2)+'\n');
console.log(JSON.stringify({passed:true,cases:rows.length,sourceInputs:Object.keys(inputHashes).length,plainBytes:plain.length,compressedBytes:packed.length,out,roots:rows.map(r=>({id:r.fixture.id,reused:r.collectionSource.reused,searches:r.bundle.searchCount,requestedNodes:r.bundle.ledger.reduce((n,s)=>n+s.budget.value,0),observedNodes:r.bundle.ledger.reduce((n,s)=>n+s.result.nodes,0),topAgreement:r.result.enginePanelAnalysis.view.topAgreement,panels:r.result.enginePanelAnalysis.view.panels.map(p=>({budget:p.budget,top:p.top,depth:p.depthRange,pvLength:p.actual.pvLength,endpoint:p.endpoint.score}))}))}));
