import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
export async function savedTrees(){const data=await openResearchData(['D001'],{purpose:'test'}),saved=JSON.parse(gunzipSync(await readFile('research/experiments/E146-retrograde-calculation/evidence/observations.json.gz')));assert.equal(saved.schema,'E146-saved-trees-v1');assert.deepEqual(saved.eligibilityReceipt,data.receipt);for(const [p,h]of Object.entries(saved.sourceHashes))assert.equal(sha256((await readFile(p,'utf8')).replaceAll('\r\n','\n')),h,'Changed collection source '+p);return saved;}
export function withSavedTree(f,saved){if(!f.history||f.maxRetrogradeCalculationNodes===0)return f;const key={fen:f.fen,history:f.history,move:f.move,plies:f.retrogradeCalculationPlies??2},row=saved.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(key));assert.ok(row,'Missing saved tree');return{...f,retrogradeCalculationGraph:row.graph};}
