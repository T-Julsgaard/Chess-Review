import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {collectPanel} from './panel.mjs';
import {fixtures} from './fixtures.mjs';
import {key} from './saved-panels.mjs';
const dir='research/experiments/E149-minority-structure',data=await openResearchData(['D001'],{purpose:'test'}),rows=[],seen=new Set();for(const f of fixtures){if(!f.history||f.maxMinorityStructureNodes===0)continue;const k=key(f),id=JSON.stringify(k);if(seen.has(id))continue;seen.add(id);rows.push({key:k,panel:collectPanel(f,49997)});}
const sourceHashes=await bindings([dir+'/code/collect.mjs',dir+'/code/verify-panel.mjs']),report={schema:'E149-saved-structure-panels-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,environment:{node:process.version,platform:process.platform,arch:process.arch},command:process.argv,engine:null,seed:null,eligibilityReceipt:data.receipt,rows},packed=gzipSync(Buffer.from(JSON.stringify(report)+'\n'),{level:9});await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/observations.json.gz',packed);console.log(JSON.stringify({panels:rows.length,costs:rows.map(r=>r.panel.nodes),bytes:packed.length,sourceInputs:Object.keys(sourceHashes).length}));
