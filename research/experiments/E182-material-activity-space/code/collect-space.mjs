import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {savedPanels,key as oldKey} from '../../E152-causal-space-room/code/saved-panels.mjs';
import {spaceFixtures} from './fixtures.mjs';
import {collectPanel} from './space-panel.mjs';
import {verifyPanel} from './verify-space-panel.mjs';
import {projectSpace} from './project-space.mjs';
const dir='research/experiments/E182-material-activity-space',mode=process.argv[2]||'smoke';
assert.ok(['smoke','finish'].includes(mode));
const data=await openResearchData(['D001'],{purpose:'test'}),old=await savedPanels();
const sourceHashes=await bindings([dir+'/code/collect-space.mjs']),file=dir+'/evidence/space-panels.json.gz';
let saved;
try{saved=JSON.parse(gunzipSync(await readFile(file)));assert.deepEqual(saved.sourceHashes,sourceHashes);assert.deepEqual(saved.datasetReceipt,data.receipt);}catch(e){if(e.code!=='ENOENT')throw e;}
saved??={schema:'E182-space-panels-v1',sourceHashes,datasetReceipt:data.receipt,revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,engine:null,seed:null,limit:49997,oldOrigin:{file:'research/experiments/E152-causal-space-room/evidence/observations.json.gz',sha256:sha256(await readFile('research/experiments/E152-causal-space-room/evidence/observations.json.gz')),sourceHashes:old.sourceHashes,receipt:old.eligibilityReceipt},rows:[]};
await mkdir(dir+'/evidence',{recursive:true});
for(const input of spaceFixtures.slice(0,mode==='smoke'?1:10)){
  if(saved.rows.some(r=>r.input.id===input.id))continue;
  let panel,origin;
  if(input.id.startsWith('quiet-no-material-gain')){
    const key=oldKey({...input,spaceAlternative:input.materialAlternative}),row=old.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(key));assert.ok(row,'Missing exact old quiet panel');
    panel=projectSpace(input,row.panel);origin={kind:'E152-explicit-projection',key,originalPanelHash:sha256(JSON.stringify(row.panel)),recipe:'Preserve all fields/node counts; change schema and add reconstructed root/variant signed balances.'};
  }else{panel=collectPanel(input,49997);origin={kind:'fresh',limit:49997};}
  verifyPanel(input,panel);saved.rows.push({input,panel,origin});
  await writeFile(file,gzipSync(JSON.stringify(saved),{level:9}));
  console.log(JSON.stringify({id:input.id,nodes:panel.nodes,origin:origin.kind}));
}
