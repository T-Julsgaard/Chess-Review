import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const dir='research/experiments/E164-king-hunt-shelter',seeds=['research/experiments/E143-forcing-tempo-initiative/code/panel.mjs'];
export const horizon=i=>i.kingChasePlies??(i.kingChaseMode==='hunt'?2:3),key=i=>JSON.stringify([i.fen,i.history,horizon(i)]);
export async function savedPanels(){const hashes=await bindings(seeds),cache=new Map();for(const name of ['smoke','observations']){let p;try{p=JSON.parse(gunzipSync(await readFile(dir+'/evidence/'+name+'.json.gz')));}catch(e){if(e.code==='ENOENT')continue;throw e;}for(const [name,hash] of Object.entries(hashes))assert.equal(p.sourceHashes[name],hash,'Incompatible collection source '+name);for(const r of p.rows){const panel=r.panel||r.result?.kingChaseAnalysis.witness?.panel;if(panel)cache.set(key(r.input),{input:r.input,panel});}}return{hashes,cache};}
