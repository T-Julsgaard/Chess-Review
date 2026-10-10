import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {checkWitness} from './check-witness.mjs';
// No detector, collector, context or derivation imports.
const eq=(a,b)=>assert.ok(isDeepStrictEqual(a,b)),data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E168-forced-pawn-weakness',run=JSON.parse(await readFile(dir+'/evidence/run.json','utf8')),build=JSON.parse(await readFile(dir+'/build.json','utf8'));eq(run.sourceHashes,build.inputHashes);eq(await bindings(Object.keys(run.sourceHashes)),run.sourceHashes);eq(run.datasetReceipt,data.receipt);
const outputs={};for(const name of ['observations','results']){const bytes=await readFile(dir+'/evidence/'+name+'.json.gz');assert.equal(createHash('sha256').update(bytes).digest('hex'),run.outputs[name]);outputs[name]=JSON.parse(gunzipSync(bytes));}
const raw=outputs.observations;eq(raw.datasetReceipt,data.receipt);eq(await bindings(Object.keys(raw.sourceHashes)),raw.sourceHashes);
const key=i=>JSON.stringify([i.fen,i.history,i.move,i.weaknessQuiet,i.weaknessPawn,i.weaknessMatePlies===undefined?2:i.weaknessMatePlies]),cache=new Map(raw.rows.map(r=>[key(r.input),r.panel])),used=new Set();let witnesses=0,positives=0;
for(const {input,result,inherited}of outputs.results.rows){const a=result.forcedWeaknessAnalysis;eq(result.events.filter(e=>e.evidence?.experiment==='E168').map(e=>e.id),input.expected);eq(result.events.filter(e=>e.evidence?.experiment!=='E168'),inherited.events);assert.equal(result.before,inherited.before);assert.equal(result.after,inherited.after);if(input.expected.length)positives++;if(a.witness){eq(cache.get(key(input)),a.witness.panel);checkWitness(input,result);witnesses++;used.add(key(input));}else if(input.history===undefined)assert.equal(a.status,'history-prerequisite');else if(input.weaknessPawn===undefined)assert.equal(a.status,'weaknessPawn-prerequisite');else if(input.maxForcedWeaknessNodes===0){assert.equal(a.status,'exhausted');assert.equal(a.nodes,1);}else assert.equal(a.status,'new-weakness-prerequisite');}
assert.equal(used.size,raw.rows.length);assert.equal(witnesses,run.witnesses);assert.equal(positives,run.positives);assert.equal(outputs.results.rows.length,run.cases);assert.equal(run.preregistration,'1b1a992');assert.match(run.revision,/^[a-f0-9]{40}$/);assert.match(run.argv.at(-1),/pilot\.mjs$/);assert.equal(run.engine,null);assert.equal(run.seed,null);assert.equal(typeof run.node,'string');assert.equal(typeof run.os,'string');
console.log(JSON.stringify({cases:run.cases,witnesses,positives,uniquePanels:used.size,sourceHashes:Object.keys(run.sourceHashes).length,independentReplay:'passed'}));
