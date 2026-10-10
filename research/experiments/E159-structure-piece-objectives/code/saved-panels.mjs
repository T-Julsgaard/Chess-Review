import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {structureContext} from './contexts.mjs';
export const key=f=>({fen:f.fen,history:f.history,move:f.move,mode:f.structurePieceMode,units:f.structurePieceUnits,targets:f.structurePieceTargets,alternative:f.structurePieceAlternative});
export async function savedPanels(){const data=await openResearchData(['D001'],{purpose:'test'}),bytes=await readFile('research/experiments/E159-structure-piece-objectives/evidence/observations.json.gz'),saved=JSON.parse(gunzipSync(bytes));assert.equal(saved.schema,'E159-saved-comparison-panels-v1');assert.deepEqual(saved.eligibilityReceipt,data.receipt);for(const [p,h]of Object.entries(saved.sourceHashes))assert.equal(sha256(normalized(p,await readFile(p))),h,'Changed collection source '+p);return saved;}
export function withSavedPanels(f,saved){if(!f.history||f.structurePieceMode===undefined||f.structurePieceUnits===undefined||f.structurePieceTargets===undefined||f.maxStructurePieceNodes===0)return f;const context=structureContext(f);if(context.status!=='ready')return f;const row=saved.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(key(f)));assert.ok(row,'Missing saved comparison '+f.id);return{...f,structurePiecePanels:row.panels};}
