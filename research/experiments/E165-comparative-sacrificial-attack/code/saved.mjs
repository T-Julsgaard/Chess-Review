import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const dir='research/experiments/E165-comparative-sacrificial-attack',seeds=['research/experiments/E143-forcing-tempo-initiative/code/panel.mjs'];
export const key=i=>JSON.stringify([i.fen,i.history,i.attackPolicyPlies??2]);
export async function savedPanels(){const hashes=await bindings(seeds),cache=new Map();for(const [directory,name]of [['research/experiments/E143-forcing-tempo-initiative','observations'],['research/experiments/E164-king-hunt-shelter','observations'],[dir,'smoke'],[dir,'observations']]){let p;try{p=JSON.parse(gunzipSync(await readFile(directory+'/evidence/'+name+'.json.gz')));}catch(e){if(e.code==='ENOENT')continue;throw e;}for(const [name,hash]of Object.entries(hashes))assert.equal(p.sourceHashes[name],hash,'Incompatible collection source '+name);for(const r of p.panels||p.rows){const panel=r.panel||r.result?.attackPolicyAnalysis.witness?.panel;if(!panel)continue;const k=r.key?JSON.stringify([r.key.fen,r.key.history,r.key.plies]):JSON.stringify([r.input.fen,r.input.history,panel.plies]);cache.set(k,{input:r.input||{fen:r.key.fen,history:r.key.history,attackPolicyPlies:r.key.plies},panel});}}return{hashes,cache};}
