import assert from 'node:assert/strict';
import {cases} from './fixtures.mjs';
import {loadSaved} from './saved.mjs';
import {inspectPairedChoices} from './choices.mjs';
import {checkResult} from './check-result.mjs';
const saved=await loadSaved(),summary=[];
for(const f of cases.filter(f=>f.id==='useful-0'||f.id==='wasted-0'||f.id==='queen-exposed-0')){const p=saved.find(f.input,f.options.plies??(f.options.family==='tempo'?2:3)).panel,r=inspectPairedChoices(f.input,f.options,p);checkResult(f.input,f.options,p,r);assert.deepEqual(r.ids,f.expected);summary.push({id:f.id,ids:r.ids,nodes:r.nodes,role:r.witness.role});}
console.log(JSON.stringify({passed:true,receipt:saved.receipt.registrySha256,cases:summary,fresh:0}));
