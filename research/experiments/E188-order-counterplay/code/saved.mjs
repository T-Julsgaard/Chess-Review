import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {dir} from './source.mjs';
export async function saved(){const data=await openResearchData(['D001'],{purpose:'test'}),rows=[],hashes={},sourceSets={};for(const name of ['smoke','focus']){const file=dir+'/evidence/'+name+'.json.gz',bytes=await readFile(file),archive=JSON.parse(gunzipSync(bytes));assert.equal(archive.receipt.registrySha256,data.receipt.registrySha256);hashes[file]=sha256(bytes);sourceSets[name]=archive.sourceHashes;for(const [p,h]of Object.entries(archive.sourceHashes))assert.equal(sha256((await readFile(p,'utf8')).replaceAll('\r\n','\n')),h,'Changed collection dependency '+p);const closure=await bindings([dir+'/code/collect-'+name+'.mjs']);assert.deepEqual(archive.sourceHashes,closure);for(const r of archive.rows){assert.ok(!r.error);rows.push({...r,archive:name});}}
 return{receipt:data.receipt,rows,hashes,sourceSets};}
