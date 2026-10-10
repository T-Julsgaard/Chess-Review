import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {savedPanels as tempoSaved,key} from '../../E165-comparative-sacrificial-attack/code/saved.mjs';
import {savedPanels as defenseSaved} from '../../E169-passive-defense-counterplay/code/saved.mjs';
import {collectPanel as tempoCollect} from '../../E143-forcing-tempo-initiative/code/panel.mjs';
import {collectPanel as defenseCollect} from '../../E169-passive-defense-counterplay/code/panel.mjs';
import {context} from '../../E169-passive-defense-counterplay/code/context.mjs';
import {explainMove as tempoExplain} from '../../E143-forcing-tempo-initiative/code/tempo.mjs';
import {explainMove as defenseExplain} from '../../E169-passive-defense-counterplay/code/defense.mjs';
import {checkWitness as tempoCheck} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
import {checkWitness as defenseCheck} from '../../E169-passive-defense-counterplay/code/check-witness.mjs';
import {positiveFixtures} from './fixtures.mjs';
const source=process.argv[2],color=process.argv[3]||'w';assert.ok(['tempo','defense'].includes(source)&&['w','b'].includes(color));
const data=await openResearchData(['D001'],{purpose:'test'}),f=positiveFixtures.find(f=>f.source===source&&new Chess(f.input.fen).turn()===color),{input,options}=f;
const dir='research/experiments/E183-recorded-initiative-turnover',prefix=dir+'/evidence/'+source+'-'+color;
await mkdir(dir+'/evidence',{recursive:true});
const earlier=new Chess(input.history.fen);assert.equal(earlier.isGameOver(),false);earlier.move(options.priorAlternative);
const earlierMate={fen:earlier.fen(),mate:earlier.isCheckmate(),winner:earlier.turn()==='w'?'b':'w'};
assert.equal(earlierMate.mate,true,'Registered earlier checkmate hypothesis failed');
const seeds=source==='tempo'?['research/experiments/E143-forcing-tempo-initiative/code/panel.mjs']:['research/experiments/E169-passive-defense-counterplay/code/panel.mjs','research/experiments/E169-passive-defense-counterplay/code/context.mjs'];
const kernelHashes=await bindings(seeds);let raw;
try{raw=JSON.parse(gunzipSync(await readFile(prefix+'-raw.json.gz')));assert.deepEqual(raw.input,input);assert.deepEqual(raw.kernelHashes,kernelHashes);assert.deepEqual(raw.datasetReceipt,data.receipt);}catch(e){if(e.code!=='ENOENT')throw e;}
if(!raw){
  let panel,reused;
  if(source==='tempo'){const saved=await tempoSaved(),found=saved.cache.get(key({...input,attackPolicyPlies:2}));panel=found?.panel;reused=!!panel;if(!panel)panel=tempoCollect(input,2,50000);}
  else{const saved=await defenseSaved();panel=saved.get(input);reused=!!panel;if(!panel)panel=defenseCollect(context(input,2,3),49996);}
  raw={source,input,options,earlierMate,panel,reused,kernelHashes,datasetReceipt:data.receipt,revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,engine:null,seed:null};
  await writeFile(prefix+'-raw.json.gz',gzipSync(JSON.stringify(raw),{level:9}));
}
const result=source==='tempo'?tempoExplain({...input,forcingTempoPanel:raw.panel}):defenseExplain({...input,defenseComparisonPanel:raw.panel});
const analysis=source==='tempo'?result.forcingTempoAnalysis:result.defenseComparisonAnalysis;
// Frozen source semantic admission, independent of either source detector.
if(source==='tempo')tempoCheck(analysis.witness,result,input);else defenseCheck(input,result);
const query=source==='tempo'?analysis.witness.panel.rows.find(r=>r.move===input.move).actor:analysis.witness.panel.variants.find(v=>v.move===input.move).own;
await writeFile(prefix+'-result.json.gz',gzipSync(JSON.stringify({source,input,options,result,earlierMate,sourceHashes:await bindings([dir+'/code/smoke-root.mjs']),datasetReceipt:data.receipt}),{level:9}));
assert.equal(query.tree.win,true);
console.log(JSON.stringify({source,color,earlierMate:earlierMate.mate,currentStatus:analysis.status,currentWin:query.tree.win,rawNodes:raw.panel.nodes,reused:raw.reused}));
