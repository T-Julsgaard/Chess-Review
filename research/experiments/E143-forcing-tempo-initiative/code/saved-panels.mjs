import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
export async function savedPanels(){
  await openResearchData(['D001'],{purpose:'test'});const saved=JSON.parse(gunzipSync(await readFile('research/experiments/E143-forcing-tempo-initiative/evidence/observations.json.gz')));assert.equal(saved.schema,'E143-saved-panels-v2');
  for(const [p,hash]of Object.entries(saved.sourceHashes))assert.equal(sha256((await readFile(p,'utf8')).replaceAll('\r\n','\n')),hash,'Changed panel source '+p);return saved;
}
export const keyFor=f=>({fen:f.fen,history:f.history,plies:f.forcingTempoPlies??2});
export function withSavedPanel(f,saved){if(!f.history||f.maxForcingTempoNodes===0)return f;const key=keyFor(f),row=saved.panels.find(r=>JSON.stringify(r.key)===JSON.stringify(key));assert.ok(row,'Missing saved panel');return{...f,forcingTempoPanel:row.panel};}
