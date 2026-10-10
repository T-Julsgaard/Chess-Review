import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {sha256} from '../../../data-policy.mjs';
import {openResearchTablebases} from '../../../tablebase-data-policy.mjs';
export async function savedObservations(){
 const data=await openResearchTablebases(),saved=JSON.parse(gunzipSync(await readFile('research/experiments/E141-admitted-kqk-tablebases/evidence/observations.json.gz')));assert.equal(saved.schema,'E141-saved-observations-v1');
 for(const [name,hash]of Object.entries(saved.sourceHashes))assert.equal(sha256((await readFile(name,'utf8')).replaceAll('\r\n','\n')),hash,'Changed collection source '+name);
 for(const row of saved.rows){assert.equal(row.bundle.status,'complete');assert.deepEqual(row.bundle.tablebaseReceipt,data.receipt);}
 return saved;
}
