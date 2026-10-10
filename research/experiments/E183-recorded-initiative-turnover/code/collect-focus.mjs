import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {savedPanels as oldTempo,key as tempoKey} from '../../E165-comparative-sacrificial-attack/code/saved.mjs';
import {savedPanels as oldDefense,key as defenseKey} from '../../E169-passive-defense-counterplay/code/saved.mjs';
import {collectPanel as tempoCollect} from '../../E143-forcing-tempo-initiative/code/panel.mjs';
import {collectPanel as defenseCollect} from '../../E169-passive-defense-counterplay/code/panel.mjs';
import {context as defenseContext} from '../../E169-passive-defense-counterplay/code/context.mjs';
import {explainMove as tempoExplain} from '../../E143-forcing-tempo-initiative/code/tempo.mjs';
import {explainMove as defenseExplain} from '../../E169-passive-defense-counterplay/code/defense.mjs';
import {savedTrees} from '../../E146-retrograde-calculation/code/saved-trees.mjs';
import {savedGraphs} from '../../E155-recorded-advantage-conversion/code/saved-graphs.mjs';
import {quietArchive} from '../../E180-position-texture-forcing/code/saved.mjs';
import {collectTree} from '../../E146-retrograde-calculation/code/tree.mjs';
import {sourceArchive,dir} from './saved.mjs';
import {historyContext} from './context.mjs';
import {inspectTurnover} from './turnover.mjs';
import {checkTurnover} from './check-turnover.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),sources=await sourceArchive(),tempo=sources.rows[0],defense=sources.rows[2],previous=JSON.parse(gunzipSync(await readFile(dir+'/evidence/prior-trees.json.gz')));
const earlier=new Chess(tempo.input.history.fen);earlier.remove('d4');earlier.put({type:'p',color:'w'},'d3');
const prefixStart=earlier.fen().replace(' b ',' w '),prefixHistory={fen:prefixStart,moves:['d3d4',...tempo.input.history.moves]},prefixBoard=new Chess(prefixStart);for(const move of prefixHistory.moves)prefixBoard.move(move);
const clockStart=tempo.input.history.fen.replace(' 0 1',' 99 1'),clockHistory={fen:clockStart,moves:tempo.input.history.moves},clockBoard=new Chess(clockStart);for(const move of clockHistory.moves)clockBoard.move(move);
const cases=[{id:'longer-irreversible-prefix',source:'tempo',input:{...tempo.input,fen:prefixBoard.fen(),history:prefixHistory},options:tempo.options,expected:{C0595:true,C0596:true,C0597:false}},
  {id:'short-current-bound',source:'defense',input:{...defense.input,counterplayPlies:0},options:defense.options,expected:{C0595:false,C0596:false,C0597:false}},
  {id:'recorded-fifty-claim-root',source:'tempo',input:{...tempo.input,fen:clockBoard.fen(),history:clockHistory},options:tempo.options,expected:{C0595:false,C0596:false,C0597:false}}];
const legacyTempo=await oldTempo(),legacyDefense=await oldDefense(),legacy=await savedTrees(),conversion=await savedGraphs(),quiet=await quietArchive(),kernelHashes=await bindings(['research/experiments/E143-forcing-tempo-initiative/code/panel.mjs','research/experiments/E169-passive-defense-counterplay/code/panel.mjs','research/experiments/E169-passive-defense-counterplay/code/context.mjs','research/experiments/E146-retrograde-calculation/code/tree.mjs']);
const rawFile=dir+'/evidence/focus-raw.json.gz';let raw;
try{raw=JSON.parse(gunzipSync(await readFile(rawFile)));assert.deepEqual(raw.kernelHashes,kernelHashes);assert.deepEqual(raw.datasetReceipt,data.receipt);}catch(e){if(e.code!=='ENOENT')throw e;}
raw??={datasetReceipt:data.receipt,kernelHashes,sourceLimit:50000,priorLimit:50000,rows:[]};
for(const f of cases){
  let r=raw.rows.find(r=>r.id===f.id);
  if(!r){
    let panel=null,graph=null,sourceReused=false,priorReused=false;
    if(f.id!=='recorded-fifty-claim-root'){
      if(f.source==='tempo'){panel=legacyTempo.cache.get(tempoKey({...f.input,attackPolicyPlies:2}))?.panel;sourceReused=!!panel;if(!panel)panel=tempoCollect(f.input,2,50000);}
      else{panel=legacyDefense.get(f.input);sourceReused=!!panel;if(!panel)panel=defenseCollect(defenseContext(f.input,0,3),49996);}
      const p=historyContext(f.input,0,f.options.priorAlternative).priorInput;
      const found=[...previous.rows,...legacy.rows,...conversion.rows,...quiet.rows].find(r=>r.graph.before===p.fen&&r.graph.played===p.move&&r.graph.plies===0&&JSON.stringify(r.graph.history)===JSON.stringify(p.history));
      graph=found?.graph;priorReused=!!graph;if(!graph)graph=collectTree(p,0,50000);
    }
    r={...f,panel,graph,sourceReused,priorReused};raw.rows.push(r);await writeFile(rawFile,gzipSync(JSON.stringify(raw),{level:9}));
  }
  assert.deepEqual(r.input,f.input);assert.deepEqual(r.options,f.options);
}
const rows=[];
for(const r of raw.rows){
  let result,sourceError=null;
  try{result=r.source==='tempo'?tempoExplain({...r.input,...(r.panel?{forcingTempoPanel:r.panel}:{})}):defenseExplain({...r.input,defenseComparisonPanel:r.panel});}
  catch(error){if(r.id!=='recorded-fifty-claim-root')throw error;assert.equal(error.message,'Cannot explain a move from a terminal position');sourceError={message:error.message};result={};}
  if(r.id==='recorded-fifty-claim-root')assert.ok(sourceError,'Terminal root must not acquire a source certificate');
  const options={...r.options,...(r.graph?{priorTree:r.graph}:{})},decision=inspectTurnover(r.source,r.input,result,options);
  assert.deepEqual(decision.claims,r.expected,r.id);checkTurnover(r.source,r.input,result,options,decision);
  rows.push({id:r.id,source:r.source,input:r.input,options,result,sourceError,decision});console.log(JSON.stringify({id:r.id,claims:decision.claims,sourceNodes:r.panel?.nodes,priorNodes:r.graph?.nodes,sourceReused:r.sourceReused,priorReused:r.priorReused,sourceError}));
}
await writeFile(dir+'/evidence/focus-results.json.gz',gzipSync(JSON.stringify({datasetReceipt:data.receipt,sourceHashes:await bindings([dir+'/code/collect-focus.mjs']),rows}),{level:9}));
