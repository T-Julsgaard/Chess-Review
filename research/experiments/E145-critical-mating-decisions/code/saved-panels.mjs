import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {panelContexts} from './contexts.mjs';
export async function savedPanels(){
  const data=await openResearchData(['D001'],{purpose:'test'}),saved=JSON.parse(gunzipSync(await readFile('research/experiments/E145-critical-mating-decisions/evidence/observations.json.gz')));assert.equal(saved.schema,'E145-saved-panels-v1');assert.deepEqual(saved.eligibilityReceipt,data.receipt);
  for(const [p,h]of Object.entries(saved.sourceHashes))assert.equal(sha256((await readFile(p,'utf8')).replaceAll('\r\n','\n')),h,'Changed panel source '+p);
  for(const b of saved.borrowed){assert.equal(b.source,'E143');assert.equal(sha256(await readFile(b.sourceObservation)),b.sourceObservationSha256);for(const [p,h]of Object.entries(b.sourceHashes))assert.equal(sha256((await readFile(p,'utf8')).replaceAll('\r\n','\n')),h,'Changed borrowed source '+p);const row=saved.panels.find(p=>JSON.stringify(p.key)===JSON.stringify(b.key));assert.ok(row);assert.equal(sha256(JSON.stringify(row.panel)),b.panelSha256);}
  return saved;
}
export function withSavedPanels(f,saved){
  if(!f.history||f.maxCriticalDecisionNodes===0)return f;const contexts=panelContexts(f,f.criticalDecisionPlies??1),find=ctx=>{if(!ctx)return null;const key={fen:ctx.fen,history:ctx.history,plies:ctx.forcingTempoPlies},row=saved.panels.find(p=>JSON.stringify(p.key)===JSON.stringify(key));assert.ok(row,'Missing panel');return row.panel;};return{...f,criticalDecisionPanels:{current:find(contexts.current),previous:find(contexts.previous)}};
}
