import {readFile,writeFile} from 'node:fs/promises';import {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {openResearchData,sha256} from '../../../data-policy.mjs';import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';import {dir} from './source.mjs';
await openResearchData(['D001'],{purpose:'test'});
// Exact six entrypoint source bytes at corrected collection: trace checkpoint
// source snapshot plus the two prospective fixture/output-name edits. Subsequent
// ordinary-data/default controls/admission checks did not recollect observations.
const old=JSON.parse(gunzipSync(await readFile(dir+'/evidence/traced-source.json.gz')));
for(const f of ['fixtures.mjs','smoke.mjs'])old[f]=await readFile(dir+'/code/'+f,'utf8');
const packed=gzipSync(JSON.stringify(old),{level:9});await writeFile(dir+'/evidence/corrected-collection-source.json.gz',packed);
const hashes=await bindings(Object.keys(old).map(f=>dir+'/code/'+f));
for(const [f,source] of Object.entries(old))hashes[dir+'/code/'+f]=createHash('sha256').update(source.replaceAll('\r\n','\n')).digest('hex');
const panels={};for(const f of ['initial-smoke.json.gz','traced-smoke.json.gz','corrected-smoke.json.gz','initial-source.json.gz','traced-source.json.gz','corrected-collection-source.json.gz'])panels[f]=sha256(await readFile(dir+'/evidence/'+f));
await writeFile(dir+'/evidence/raw-provenance.json',JSON.stringify({experiment:'E184',rootAmendment:'e313fa1',command:'node research/experiments/E184-king-route-conversion/code/smoke.mjs',sourceState:'Actual working source, not pristine HEAD; corrected collector source snapshot reconstructed exactly from retained traced six-file snapshot plus only registered fixture and output filename edits. Frozen recursive imports unchanged. Final stricter controls/admission replays saved queries without recollection.',sourceHashes:hashes,artifacts:panels,reuse:'Older compact E106 policies lack attempted-prefix search trace; changed authored roots do not match E184 earlier observations. Four corrected panels collected once, no further H6 collection.'},null,2)+'\n');
console.log(JSON.stringify({rawArtifacts:Object.keys(panels).length,collectionBindings:Object.keys(hashes).length,packed:packed.length}));
