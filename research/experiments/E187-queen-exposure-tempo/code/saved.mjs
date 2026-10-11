import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {sha256,openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const archives=['research/experiments/E143-forcing-tempo-initiative/evidence/observations.json.gz','research/experiments/E164-king-hunt-shelter/evidence/observations.json.gz'];
export const key=(i,H)=>JSON.stringify([i.fen,i.history,H]);
export async function loadSaved(){
 const data=await openResearchData(['D001'],{purpose:'test'}),rows=[],hashes={};
 const closure=await bindings(['research/experiments/E143-forcing-tempo-initiative/code/panel.mjs']);
 for(const file of archives){const bytes=await readFile(file),obj=JSON.parse(gunzipSync(bytes));hashes[file]=sha256(bytes);for(const [p,h]of Object.entries(obj.sourceHashes)){const b=await readFile(p);assert.equal(sha256(b.toString('utf8').replaceAll('\r\n','\n')),h,'Changed archived source '+p);}for(const [p,h]of Object.entries(closure))assert.equal(obj.sourceHashes[p],h,'Incomplete collector binding '+p);
  if(obj.panels){for(const [index,r]of obj.panels.entries())rows.push({key:key({fen:r.key.fen,history:r.key.history},r.key.plies),panel:r.panel,ref:{file,index,kind:'panels'}});}else for(const [index,r]of obj.rows.entries()){const panel=r.panel||r.result?.kingChaseAnalysis?.witness?.panel;if(panel)rows.push({key:key(r.input,panel.plies),panel,ref:{file,index,kind:'rows'}});}
 }
 return{receipt:data.receipt,hashes,rows,find(input,H){const r=rows.find(r=>r.key===key(input,H));assert.ok(r,'No exact saved source/history/horizon panel');return r;},resolve(ref){const r=rows.find(r=>r.ref.file===ref.file&&r.ref.index===ref.index&&r.ref.kind===ref.kind);assert.ok(r,'Unknown saved reference');return r;}};
}
