import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {savedPanels} from '../../E143-forcing-tempo-initiative/code/saved-panels.mjs';
import {collectPanel} from '../../E143-forcing-tempo-initiative/code/panel.mjs';
import {verifyPanel} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
import {panelContexts} from './contexts.mjs';
import {fixtures} from './fixtures.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),old=await savedPanels(),dir='research/experiments/E145-critical-mating-decisions',sourceHashes=await bindings([dir+'/code/contexts.mjs',dir+'/code/fixtures.mjs','research/experiments/E143-forcing-tempo-initiative/code/panel.mjs']),smoke=JSON.parse(await readFile('research/runs/E145/smoke/observations.json','utf8'));assert.deepEqual(smoke.sourceHashes,sourceHashes);
const sourceObservation='research/experiments/E143-forcing-tempo-initiative/evidence/observations.json.gz',sourceObservationSha256=sha256(await readFile(sourceObservation)),panels=[],borrowed=[];let reusedSmoke=0,collected=0;
for(const f of fixtures){
  if(!f.history||f.maxCriticalDecisionNodes===0)continue;const contexts=panelContexts(f,f.criticalDecisionPlies??1);
  for(const ctx of [contexts.current,contexts.previous].filter(Boolean)){
    const key={fen:ctx.fen,history:ctx.history,plies:ctx.forcingTempoPlies};if(panels.some(p=>JSON.stringify(p.key)===JSON.stringify(key)))continue;
    const prior=old.panels.find(p=>JSON.stringify(p.key)===JSON.stringify(key)),initial=smoke.panels.find(p=>JSON.stringify(p.key)===JSON.stringify(key));let panel;
    if(prior){panel=prior.panel;if(initial)assert.deepEqual(initial.panel,panel);borrowed.push({key,source:'E143',sourceObservation,sourceObservationSha256,sourceHashes:old.sourceHashes,panelSha256:sha256(JSON.stringify(panel))});}else if(initial){panel=initial.panel;reusedSmoke++;}else{panel=collectPanel(ctx,key.plies,50000);collected++;}
    verifyPanel(ctx,panel);panels.push({key,panel});
  }
}
await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/observations.json.gz',gzipSync(Buffer.from(JSON.stringify({schema:'E145-saved-panels-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,sourceHashes,borrowed,reusedSmoke,panels})+'\n'),{level:9}));console.log(JSON.stringify({panels:panels.length,borrowed:borrowed.length,reusedSmoke,newlyCollected:collected,sourceInputs:Object.keys(sourceHashes).length,nodes:panels.map(p=>p.panel.nodes)}));
