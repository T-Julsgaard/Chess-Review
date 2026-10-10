import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {collectTree} from '../../E146-retrograde-calculation/code/tree.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {fixtures} from './fixtures.mjs';
import {conversionContext} from './contexts.mjs';
import {key} from './saved-graphs.mjs';
const dir='research/experiments/E155-recorded-advantage-conversion',data=await openResearchData(['D001'],{purpose:'test'}),smokeBytes=await readFile('research/runs/E155/smoke/results.json.gz'),smoke=JSON.parse(gunzipSync(smokeBytes)),kernelHashes=await bindings([dir+'/code/contexts.mjs',dir+'/code/fixtures.mjs','research/experiments/E146-retrograde-calculation/code/tree.mjs']);assert.deepEqual(smoke.eligibilityReceipt,data.receipt);for(const [p,h]of Object.entries(kernelHashes))assert.equal(smoke.sourceHashes[p],h,'Changed collection input '+p);const rows=[],reused=[];
for(const f of fixtures){if(!f.history||f.maxConversionNodes===0)continue;const ctx=conversionContext(f);if(ctx.status!=='ready')continue;if(rows.some(r=>JSON.stringify(r.key)===JSON.stringify(key(ctx))))continue;const previous=smoke.rows.find(r=>r.error===null&&JSON.stringify(key(conversionContext(r.fixture)))===JSON.stringify(key(ctx))),graph=previous?previous.result.conversionAnalysis.witness.graph:collectTree(ctx.context,ctx.context.retrogradeCalculationPlies,50000-ctx.work);verifyTree(ctx.context,graph);rows.push({key:key(ctx),graph});if(previous)reused.push(key(ctx));}
const sourceHashes=await bindings([dir+'/code/collect.mjs']),report={schema:'E155-saved-conversion-graphs-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,environment:{node:process.version,platform:process.platform,arch:process.arch},command:process.argv,engine:null,seed:null,eligibilityReceipt:data.receipt,reuseAudit:{smokeSha256:sha256(smokeBytes),kernelHashes,reused,originalSourceHashes:smoke.sourceHashes},rows},packed=gzipSync(Buffer.from(JSON.stringify(report)+'\n'),{level:9});await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/smoke.json.gz',smokeBytes);await writeFile(dir+'/evidence/observations.json.gz',packed);console.log(JSON.stringify({graphs:rows.length,reused:reused.length,costs:rows.map(r=>r.graph.nodes),bytes:packed.length,sourceInputs:Object.keys(sourceHashes).length}));
