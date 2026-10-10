import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {collectTree} from '../../E146-retrograde-calculation/code/tree.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {savedTrees} from '../../E146-retrograde-calculation/code/saved-trees.mjs';
import {savedGraphs} from '../../E155-recorded-advantage-conversion/code/saved-graphs.mjs';
import {quietArchive} from '../../E180-position-texture-forcing/code/saved.mjs';
import {historyContext} from './context.mjs';
import {sourceArchive,dir} from './saved.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),sources=await sourceArchive(),legacy=await savedTrees(),conversion=await savedGraphs(),quiet=await quietArchive();
const sourceHashes=await bindings([dir+'/code/collect-prior.mjs']),file=dir+'/evidence/prior-trees.json.gz';let report;
try{report=JSON.parse(gunzipSync(await readFile(file)));assert.deepEqual(report.sourceHashes,sourceHashes);assert.deepEqual(report.datasetReceipt,data.receipt);}catch(e){if(e.code!=='ENOENT')throw e;}
report??={schema:'E183-prior-trees-v1',sourceHashes,datasetReceipt:data.receipt,revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,engine:null,seed:null,limit:50000,archives:await Promise.all(['E146-retrograde-calculation','E155-recorded-advantage-conversion','E180-position-texture-forcing'].map(async id=>{const path='research/experiments/'+id+'/evidence/observations.json.gz';return{path,sha256:sha256(await readFile(path))};})),rows:[]};
for(const row of sources.rows){
  const input=historyContext(row.input,row.options.priorPlies,row.options.priorAlternative).priorInput;
  if(report.rows.some(r=>JSON.stringify(r.input)===JSON.stringify(input)))continue;
  const found=[...legacy.rows,...conversion.rows,...quiet.rows].find(r=>r.graph.before===input.fen&&r.graph.played===input.move&&r.graph.plies===input.retrogradeCalculationPlies&&JSON.stringify(r.graph.history)===JSON.stringify(input.history));
  const graph=found?.graph||collectTree(input,input.retrogradeCalculationPlies,50000);verifyTree(input,graph);
  report.rows.push({source:row.source,color:row.color,input,graph,reused:!!found});await writeFile(file,gzipSync(JSON.stringify(report),{level:9}));
  console.log(JSON.stringify({source:row.source,color:row.color,nodes:graph.nodes,reused:!!found}));
}
