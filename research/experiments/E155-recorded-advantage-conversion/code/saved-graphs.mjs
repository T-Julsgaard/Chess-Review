import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {conversionContext} from './contexts.mjs';
export const key=ctx=>({...ctx.context,graphLimit:50000-ctx.work});
export async function savedGraphs(){const data=await openResearchData(['D001'],{purpose:'test'}),bytes=await readFile('research/experiments/E155-recorded-advantage-conversion/evidence/observations.json.gz'),saved=JSON.parse(gunzipSync(bytes));assert.equal(saved.schema,'E155-saved-conversion-graphs-v1');assert.deepEqual(saved.eligibilityReceipt,data.receipt);for(const [p,h]of Object.entries(saved.sourceHashes))assert.equal(sha256(normalized(p,await readFile(p))),h,'Changed collection source '+p);return saved;}
export function withSavedGraph(f,saved){if(!f.history||f.maxConversionNodes===0)return f;const ctx=conversionContext(f);if(ctx.status!=='ready')return f;const row=saved.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(key(ctx)));assert.ok(row,'Missing saved graph '+f.id);return{...f,conversionGraph:row.graph};}
