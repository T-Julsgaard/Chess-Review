import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const key=f=>({fen:f.fen,history:f.history,move:f.move,alternative:f.advantageAlternative??null});
export async function savedPanels(){const data=await openResearchData(['D001'],{purpose:'test'}),bytes=await readFile('research/experiments/E150-static-dynamic-resources/evidence/observations.json.gz'),saved=JSON.parse(gunzipSync(bytes));assert.equal(saved.schema,'E150-saved-resource-panels-v1');assert.deepEqual(saved.eligibilityReceipt,data.receipt);for(const [p,h]of Object.entries(saved.sourceHashes))assert.equal(sha256(normalized(p,await readFile(p))),h,'Changed collection source '+p);return saved;}
export function withSavedPanel(f,saved){if(!f.history||f.maxAdvantageResourceNodes===0)return f;const row=saved.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(key(f)));assert.ok(row,'Missing saved panel '+f.id);return{...f,advantageResourcePanel:row.panel};}
