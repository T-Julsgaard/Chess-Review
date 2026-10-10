import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {tradeContext} from './contexts.mjs';
export const key=f=>({fen:f.fen,history:f.history,move:f.move,decline:f.strategicDecline,alternative:f.strategicAlternative});
export async function savedPanels(){const data=await openResearchData(['D001'],{purpose:'test'}),bytes=await readFile('research/experiments/E158-positional-exchange-objective/evidence/observations.json.gz'),saved=JSON.parse(gunzipSync(bytes));assert.equal(saved.schema,'E158-saved-comparison-panels-v1');assert.deepEqual(saved.eligibilityReceipt,data.receipt);for(const [p,h]of Object.entries(saved.sourceHashes))assert.equal(sha256(normalized(p,await readFile(p))),h,'Changed collection source '+p);return saved;}
export function withSavedPanels(f,saved){if(!f.history||f.strategicDecline===undefined||f.strategicAlternative===undefined||f.maxStrategicTradeNodes===0)return f;const context=tradeContext(f);if(context.status!=='ready')return f;const row=saved.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(key(f)));assert.ok(row,'Missing saved comparison '+f.id);return{...f,strategicTradePanels:row.panels};}
