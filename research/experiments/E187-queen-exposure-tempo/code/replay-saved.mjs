import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {sha256} from '../../../data-policy.mjs';
import {loadSaved} from './saved.mjs';
import {checkResult} from './check-result.mjs';
import {dir,fullBindings} from './source.mjs';
const saved=await loadSaved(),bytes=await readFile(dir+'/evidence/pilot.json.gz'),payload=JSON.parse(gunzipSync(bytes)),run=JSON.parse(await readFile(dir+'/evidence/run.json','utf8')),build=JSON.parse(await readFile(dir+'/build.json','utf8')),current=await fullBindings();
assert.equal(payload.schema,'E187-pilot-v1');assert.equal(run.pilotSha256,sha256(bytes));assert.deepEqual(payload.sourceHashes,current);assert.deepEqual(run.sourceHashes,current);assert.deepEqual(build.inputHashes,current);assert.deepEqual(run.archiveHashes,payload.archiveHashes);assert.deepEqual(run.receipt,payload.receipt);assert.equal(run.receipt.registrySha256,saved.receipt.registrySha256);
for(const [file,h]of Object.entries(payload.archiveHashes))assert.equal(sha256(await readFile(file)),h);
const fbytes=await readFile(dir+'/evidence/focus.json.gz'),focus=JSON.parse(gunzipSync(fbytes));for(const [p,h]of Object.entries(focus.sourceHashes))assert.equal(sha256((await readFile(p,'utf8')).replaceAll('\r\n','\n')),h,'Changed focused collection source '+p);assert.equal(focus.receipt.registrySha256,saved.receipt.registrySha256);checkResult(focus.input,focus.options,focus.result.panel,focus.result);
const positives={C0724:0,C0758:0,C0759:0},unique=new Set();for(const r of payload.rows){const panel=r.ref?(r.ref.kind==='focus'?focus.result.panel:saved.resolve(r.ref).panel):undefined;if(r.ref){unique.add(JSON.stringify(r.ref));if(r.ref.kind!=='focus'){const source=saved.resolve(r.ref);assert.equal(source.key,JSON.stringify([r.input.fen,r.input.history??panel.history,r.options.plies??(r.options.family==='tempo'?2:3)]));}}
 const result={...r.result,panel:r.retainedPanel?panel:null};checkResult(r.input,r.options,panel,result);assert.deepEqual(result.ids,r.expected);for(const id of result.ids)positives[id]++;
}
assert.equal(payload.rows.length,run.cases);assert.deepEqual(positives,run.positives);const summary={passed:true,cases:payload.rows.length,decisions:payload.rows.length*3,positives,uniquePanelReferences:unique.size,sourceBindings:Object.keys(current).length,pilotSha256:sha256(bytes),fresh:0,limits:'Own checker imports no E187 runtime/context or collector. Frozen source replay and Chess shared; original failed49-halfmove raw was not retained and is not replayed.'};await writeFile(dir+'/evidence/replay.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
