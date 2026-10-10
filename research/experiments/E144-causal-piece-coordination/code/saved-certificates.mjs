import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
export async function savedCertificates(){
  const data=await openResearchData(['D001'],{purpose:'test'}),saved=JSON.parse(gunzipSync(await readFile('research/experiments/E144-causal-piece-coordination/evidence/observations.json.gz')));assert.equal(saved.schema,'E144-saved-certificates-v1');assert.deepEqual(saved.eligibilityReceipt,data.receipt);
  for(const [p,h]of Object.entries(saved.sourceHashes))assert.equal(sha256((await readFile(p,'utf8')).replaceAll('\r\n','\n')),h,'Changed collection source '+p);
  for(const b of saved.borrowed){assert.equal(b.source,'E143');assert.equal(sha256(await readFile(b.sourceObservation)),b.sourceObservationSha256);for(const [p,h]of Object.entries(b.sourceHashes))assert.equal(sha256((await readFile(p,'utf8')).replaceAll('\r\n','\n')),h,'Changed borrowed source '+p);const row=saved.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(b.key));assert.ok(row);assert.equal(sha256(JSON.stringify(row.certificate.actual)),b.querySha256);}
  return saved;
}
export function withSavedCertificate(f,saved){if(!f.history||f.maxCoordinationNodes===0)return f;const key={fen:f.fen,history:f.history,move:f.move,plies:f.coordinationPlies??2},row=saved.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(key));assert.ok(row,'Missing saved certificate');return{...f,coordinationCertificate:row.certificate};}
