import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {sha256} from '../../../data-policy.mjs';
import {cases} from './fixtures.mjs';
import {loadSaved} from './saved.mjs';
import {inspectPairedChoices} from './choices.mjs';
import {dir,fullBindings} from './source.mjs';
const saved=await loadSaved(),rows=[];
function add(id,input,options,raw,expected){const result=inspectPairedChoices(input,options,raw?.panel);assert.deepEqual(result.ids,expected,id);const {panel,...decision}=result;rows.push({id,input,options,ref:raw?.ref??null,retainedPanel:panel!==null,result:decision,expected});}
for(const f of cases)add(f.id,f.input,f.options,saved.find(f.input,f.options.plies??(f.options.family==='tempo'?2:3)),f.expected);
for(const id of ['useful-0','wasted-0','queen-exposed-0']){const f=cases.find(f=>f.id===id),raw=saved.find(f.input,f.options.family==='tempo'?2:3);add(id+'-missing-history',{...f.input,history:undefined},f.options,raw,[]);add(id+'-missing-alternative',{...f.input,alternative:undefined},f.options,raw,[]);add(id+'-disabled',f.input,{...f.options,enabled:false},raw,[]);add(id+'-zero',f.input,{...f.options,maxNodes:0},raw,[]);add(id+'-missing-panel',f.input,f.options,null,[]);}
const focusBytes=await readFile(dir+'/evidence/focus.json.gz'),focus=JSON.parse(gunzipSync(focusBytes));add('visited-fifty',focus.input,focus.options,{panel:focus.result.panel,ref:{file:dir+'/evidence/focus.json.gz',kind:'focus',index:0}},[]);
const sourceHashes=await fullBindings(),archiveHashes={...saved.hashes,[dir+'/evidence/focus.json.gz']:sha256(focusBytes)},positives={C0724:0,C0758:0,C0759:0};for(const r of rows)for(const id of r.result.ids)positives[id]++;
const payload={schema:'E187-pilot-v1',receipt:saved.receipt,sourceHashes,archiveHashes,rows},bytes=gzipSync(JSON.stringify(payload),{level:9});await writeFile(dir+'/evidence/pilot.json.gz',bytes);
await writeFile(dir+'/evidence/run.json',JSON.stringify({experiment:'E187',preregistration:'991babe',reuseAudit:'0604eb5',focusedControls:'38ac948',clockCorrection:'0a1482f',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,engine:null,seed:null,receipt:saved.receipt,sourceHashes,archiveHashes,pilotSha256:sha256(bytes),cases:rows.length,positives,freshSourcePanels:0,reuse:'Every main panel references exact E143/E164 source-bound archive keys; one corrected tiny focus panel reused. Initial mistaken clock panel unavailable and not claimed replayed.',limits:'Finite concrete same-unit comparisons only; no optimality, global safety, human precision or broad strategic validity.'},null,2)+'\n');console.log(JSON.stringify({passed:true,cases:rows.length,positives,sourceBindings:Object.keys(sourceHashes).length,bytes:bytes.length,fresh:0}));
