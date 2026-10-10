import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {savedPanels} from '../../E143-forcing-tempo-initiative/code/saved-panels.mjs';
import {fixtures} from './fixtures.mjs';
import {collectCertificate} from './collect.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),old=await savedPanels(),dir='research/experiments/E144-causal-piece-coordination',sourceHashes=await bindings([dir+'/code/collect.mjs',dir+'/code/fixtures.mjs']),sourceObservation='research/experiments/E143-forcing-tempo-initiative/evidence/observations.json.gz',sourceObservationSha256=sha256(await readFile(sourceObservation));let previous=null;try{previous=JSON.parse(gunzipSync(await readFile(dir+'/evidence/observations.json.gz')));}catch(e){if(e.code!=='ENOENT')throw e;}const matched=previous&&JSON.stringify(previous.sourceHashes)===JSON.stringify(sourceHashes),rows=matched?[...previous.rows]:[],borrowed=matched?[...previous.borrowed]:[];let collected=0;
for(const f of fixtures){
  if(!f.history||f.maxCoordinationNodes===0)continue;const key={fen:f.fen,history:f.history,move:f.move,plies:f.coordinationPlies??2};if(rows.some(r=>JSON.stringify(r.key)===JSON.stringify(key)))continue;
  const match=old.panels.find(r=>r.key.fen===key.fen&&JSON.stringify(r.key.history)===JSON.stringify(key.history)&&r.key.plies===key.plies),reuse=match?.panel.rows.find(r=>r.move===key.move)?.actor||null;
  if(reuse)borrowed.push({key,source:'E143',sourceObservation,sourceObservationSha256,sourceHashes:old.sourceHashes,querySha256:sha256(JSON.stringify(reuse))});rows.push({key,certificate:collectCertificate(f,key.plies,50000,reuse)});collected++;
}
await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/observations.json.gz',gzipSync(Buffer.from(JSON.stringify({schema:'E144-saved-certificates-v1',revision:matched?previous.revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,sourceHashes,borrowed,rows})+'\n'),{level:9}));console.log(JSON.stringify({certificates:rows.length,newlyCollected:collected,borrowedActualQueries:borrowed.length,sourceInputs:Object.keys(sourceHashes).length,nodes:rows.map(r=>r.certificate.nodes)}));
