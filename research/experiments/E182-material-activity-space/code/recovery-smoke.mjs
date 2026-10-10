import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {collectPanel} from '../../E143-forcing-tempo-initiative/code/panel.mjs';
import {explainMove} from '../../E165-comparative-sacrificial-attack/code/attack.mjs';
import {savedPanels,key} from '../../E165-comparative-sacrificial-attack/code/saved.mjs';
import {fixtures} from '../../E165-comparative-sacrificial-attack/code/fixtures.mjs';
import {inspectOffer} from './offer.mjs';
const color=process.argv[2]||'w';assert.ok(['w','b'].includes(color));
const data=await openResearchData(['D001'],{purpose:'test'}),base=fixtures[color==='w'?4:5],c=new Chess(base.fen);
c.put({type:'p',color},color==='w'?'h7':'h2');
const fen=c.fen(),input={...base,id:'recoverable-promotion-offer-'+color,fen,history:{fen,moves:[]}};
const dir='research/experiments/E182-material-activity-space/evidence';
await mkdir(dir,{recursive:true});
const sourceHashes=await bindings(['research/experiments/E143-forcing-tempo-initiative/code/panel.mjs']);
const file=dir+'/recovery-raw-'+color+'.json.gz';
let raw;
try{
  raw=JSON.parse(gunzipSync(await readFile(file)));
  assert.deepEqual(raw.input,input);assert.deepEqual(raw.sourceHashes,sourceHashes);
}catch(error){
  if(error.code!=='ENOENT')throw error;
  const saved=await savedPanels(),found=saved.cache.get(key(input));
  const panel=found?.panel||collectPanel(input,2,50000);
  raw={input,panel,reused:!!found,datasetReceipt:data.receipt,sourceHashes};
  await writeFile(file,gzipSync(JSON.stringify(raw),{level:9}));
}
const result=explainMove({...input,attackPolicyPanel:raw.panel});
const decision=inspectOffer(input,result);
const record={input,result,decision,datasetReceipt:data.receipt,sourceHashes:await bindings(['research/experiments/E182-material-activity-space/code/recovery-smoke.mjs'])};
await writeFile(dir+'/recovery-result-'+color+'.json.gz',gzipSync(JSON.stringify(record),{level:9}));
console.log(JSON.stringify({color,rawNodes:raw.panel.nodes,sourceStatus:result.attackPolicyAnalysis.status,claims:decision.claims,losses:decision.witness?.acceptances.map(a=>({nominal:a.nominalLoss,minimum:a.minimumUnrecoveredLoss}))}));
assert.deepEqual(decision.claims,{C0588:false,C0593:true});
assert.ok(decision.witness.acceptances.some(a=>a.replies.some(r=>r.promotion&&r.unrecoveredLoss<0)));
