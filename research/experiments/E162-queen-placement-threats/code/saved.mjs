import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const dir='research/experiments/E162-queen-placement-threats',seeds=[dir+'/code/context.mjs',dir+'/code/collect.mjs'];
export const key=i=>JSON.stringify([i.fen,i.history,i.move,i.queenPlacementMode,i.queenPlacementAlternative,i.queenAttack||null,i.queenEntries||null]);
export async function savedPanels(){const hashes=await bindings(seeds),cache=new Map();for(const name of ['smoke','observations']){let p;try{p=JSON.parse(gunzipSync(await readFile(dir+'/evidence/'+name+'.json.gz')));}catch(e){if(e.code==='ENOENT')continue;throw e;}for(const [name,hash] of Object.entries(hashes))assert.equal(p.sourceHashes[name],hash,'Incompatible collection source '+name);for(const row of p.rows){const panels=row.panels||row.result?.queenPlacementAnalysis.witness?.panels;if(panels)cache.set(key(row.input),{input:row.input,panels});}}return{hashes,cache};}
