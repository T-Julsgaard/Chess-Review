// Supplement metadata without running any chess or engine searches.
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {sha256} from '../../../data-policy.mjs';
import {normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {verifySourceAudit} from './source-audit.mjs';
const dir='research/experiments/E147-opening-pressure-estimates/evidence',observations=await readFile(dir+'/observations.json.gz'),saved=JSON.parse(gunzipSync(observations)),path='tools/calibration/engine-host.cjs',audit={schema:'E147-supplementary-source-audit-v1',reason:'Initial pilot retention refused missing vendor/dependency hashes; dynamic engine-host launch was absent from static collection closure',path,sourceSha256:sha256(normalized(path,await readFile(path))),revision:saved.revision,observationsSha256:sha256(observations),method:'unchanged committed host bytes at collection revision; supplementary audit, not contemporaneous snapshot',observationsChanged:false,queriesRepeated:0};await verifySourceAudit(audit,observations);await writeFile(dir+'/source-audit.json',JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({passed:true,path,queriesRepeated:0}));
