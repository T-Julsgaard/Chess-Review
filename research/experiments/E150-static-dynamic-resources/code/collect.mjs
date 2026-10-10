import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {fixtures} from './fixtures.mjs';
import {collectPanel} from './panel.mjs';
import {verifyPanel} from './verify-panel.mjs';
import {key} from './saved-panels.mjs';
const dir='research/experiments/E150-static-dynamic-resources',data=await openResearchData(['D001'],{purpose:'test'}),smokeBytes=await readFile(dir+'/evidence/smoke.json.gz'),smoke=JSON.parse(gunzipSync(smokeBytes)),amendmentBytes=await readFile(dir+'/evidence/smoke-source-amendment.json'),amendment=JSON.parse(amendmentBytes),kernelHashes=await bindings([dir+'/code/panel.mjs']);assert.equal(sha256(smokeBytes),amendment.originalSmokeSha256);assert.deepEqual(smoke.eligibilityReceipt,data.receipt);for(const [p,h]of Object.entries(kernelHashes))assert.equal(smoke.sourceHashes[p],h,'Changed collection kernel '+p);for(const [p,s]of Object.entries(amendment.sources)){assert.equal(sha256(s.source.replaceAll('\r\n','\n')),s.sha256);assert.equal(smoke.sourceHashes[p],s.sha256);}const rows=[],reused=[];
for(const f of fixtures){if(!f.history||f.maxAdvantageResourceNodes===0)continue;const previous=smoke.rows.find(r=>r.error===null&&JSON.stringify(key(r.fixture))===JSON.stringify(key(f)));const panel=previous?previous.result.advantageResourceAnalysis.witness.panel:collectPanel(f,49997);verifyPanel(f,panel);rows.push({key:key(f),panel});if(previous)reused.push(key(f));}
const sourceHashes=await bindings([dir+'/code/collect.mjs']),report={schema:'E150-saved-resource-panels-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,environment:{node:process.version,platform:process.platform,arch:process.arch},command:process.argv,engine:null,seed:null,eligibilityReceipt:data.receipt,reuseAudit:{smokeSha256:sha256(smokeBytes),amendmentSha256:sha256(amendmentBytes),kernelHashes,reused,originalSourceHashes:smoke.sourceHashes},rows},packed=gzipSync(Buffer.from(JSON.stringify(report)+'\n'),{level:9});await writeFile(dir+'/evidence/observations.json.gz',packed);console.log(JSON.stringify({panels:rows.length,reused:reused.length,costs:rows.map(r=>r.panel.nodes),bytes:packed.length,sourceInputs:Object.keys(sourceHashes).length}));
