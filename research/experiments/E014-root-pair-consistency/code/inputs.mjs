import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Chess} from '../../../../lib/chess.js';
import {engineConfig} from '../../../../tools/calibration/engine.mjs';
import {sha256} from '../../../data-policy.mjs';
import {loadInputs as loadOriginal} from '../../E012-offer-evidence/code/inputs.mjs';
import {loadInputs as loadNet} from '../../E013-net-offer-pack/code/inputs.mjs';
import {prepare} from '../../E008-human-quality-curves/code/prepare.mjs';
import {evaluate as validateHigh} from '../../E009-search-stability/code/evaluate.mjs';
import {validateQuery,queryKey} from '../../E012-offer-evidence/code/queries.mjs';
export const prefix='research/experiments/E014-root-pair-consistency/';
export const parents=[
  'tools/calibration/public/dataset.json.gz',
  'tools/calibration/public/sf18-rating-evidence.json.gz',
  'research/experiments/E005-category-review/evidence/cases.json',
  'research/experiments/E005-category-review/evidence/selection-key.json',
  ...['E012-offer-evidence','E013-net-offer-pack'].flatMap(e=>['policy.json','sf18-observations.json.gz'].map(f=>'research/experiments/'+e+'/evidence/'+f)),
  ...['cases.json','selection-key.json'].map(f=>'research/experiments/E013-net-offer-pack/evidence/'+f),
  'research/datasets/D002-fresh-prefix/games.json.gz',
  'research/experiments/E008-human-quality-curves/evidence/sf19-observations.json.gz',
  'research/experiments/E009-search-stability/evidence/sf19-observations.json.gz'
];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function bindBudget(position,keys,queries,configHash){
  const board=new Chess();for(const m of position.history)board.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]});
  if(position.ply!==position.history.length+1||!same(board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')).sort(),position.legalMoves)||!position.legalMoves.includes(position.played)||position.legalMoves.length<2)throw Error('Changed legal history/choice');
  if(!same(keys.alternatives.map(a=>a.move),position.legalMoves))throw Error('Incomplete alternative bindings');
  const lookup=(key,restricted)=>{const q=queries.get(key);if(!q||q.configHash!==configHash||key!==queryKey(configHash,position.history,restricted)||!same(q.history,position.history)||q.restricted!==restricted)throw Error('Changed restricted chosen-move binding');validateQuery(q);
    const copy=new Chess(board.fen());for(const m of q.pv.split(' '))copy.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]});return q;};
  const root=lookup(keys.rootKey,null),alternatives=keys.alternatives.map(a=>({move:a.move,query:lookup(a.key,a.move)}));
  if(!position.legalMoves.includes(root.bestmove))throw Error('Root chose unavailable move');
  return{root,alternatives};
}
export function makeFreeze(rows,receipt){return{schema:'E014-freeze-v1',candidate:'restrict-final-chosen-move-v1',pointMapping:'engine-WDL-with-mate-boundaries',budgets:['20k','80k'],
  cohorts:Object.fromEntries(['SF18','SF19'].map(e=>[e,rows.filter(r=>r.engine===e).map(r=>({gameId:r.gameId,split:r.split,ply:r.ply,panel:r.panel}))])),
  inputSha256:Object.fromEntries(parents.map(p=>{if(!receipt.inputHashes[p])throw Error('Missing registered parent');return[p,receipt.inputHashes[p]];})),
  gates:{minimumRelativeReduction:.25,intervalLevel:.9875,bootstrapIterations:10000,seeds:[20261051,20261052,20261053,20261054],nearBestThreshold:.02,maxFalseNearBestIncrease:.025,maxMeanDriftIncrease:.01,driftTolerance:.05,minStableFraction:.9,minWilsonLower:.8,maxQueries:3},
  engineConfigHashes:Object.fromEntries(['SF18','SF19'].map(e=>[e,Object.fromEntries(['20k','80k'].map(m=>[m,rows.find(r=>r.engine===e).budgets[m].root.configHash]))])),confirmation:false};}
export async function loadParents(access){
  const original=await loadOriginal(access),net=await loadNet(access),rows=[];
  function append18(input,raw,panel){const queries=new Map(raw.searches.map(q=>[q.key,q]));for(const p of raw.positions)rows.push({engine:'SF18',panel,gameId:p.gameId,split:p.split,ply:p.ply,history:p.history,played:p.played,legalMoves:p.legalMoves,
    budgets:Object.fromEntries(['20k','80k'].map(m=>[m,bindBudget(p,p.keys[m],queries,input.policy.configHashes[m])]))});}
  append18(original,original.evidence,'E012');append18(net,net.raw,'E013');
  const dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),low=await access.readJson(parents.at(-2)),high=await access.readJson(parents.at(-1)),
    root=fileURLToPath(new URL('../../../../',import.meta.url)),file=path.join(root,'engine/stockfish-19-lite-single.js');
  prepare(low,dataset,await engineConfig(file,{kind:'nodes',value:20000}));validateHigh(high,low,await engineConfig(file,{kind:'nodes',value:80000}));
  // SF19's retained format binds configuration on the enclosing artifact,
  // unlike later SF18 rows. Add that already-validated header to local views.
  const qLow=new Map(low.searches.map(q=>[q.key,{...q,configHash:low.configHash}])),qHigh=new Map(high.searches.map(q=>[q.key,{...q,configHash:high.configHash}]));
  for(const p of high.positions)rows.push({engine:'SF19',panel:'E009',gameId:p.gameId,split:p.split,ply:p.ply,history:p.history,played:p.played,legalMoves:p.legalMoves,
    budgets:{'20k':bindBudget(p,{rootKey:p.baselineRootKey,alternatives:p.alternatives.map(a=>({move:a.move,key:a.baselineKey}))},qLow,low.configHash),'80k':bindBudget(p,p,qHigh,high.configHash)}});
  if(rows.length!==85||new Set(rows.map(r=>r.gameId)).size!==85||rows.filter(r=>r.engine==='SF18'&&r.split==='train').length!==40||rows.filter(r=>r.engine==='SF19'&&r.split==='train').length!==30||rows.filter(r=>r.engine==='SF19'&&r.split==='validation').length!==15)throw Error('Changed fixed cohort/roles');
  return{rows,freeze:makeFreeze(rows,access.receipt)};
}
export const parentsFor=engine=>engine==='SF18'?parents.slice(0,-3):parents.slice(-3);
export function partitionFreeze(freeze,engine){return{...freeze,cohorts:{[engine]:freeze.cohorts[engine]},inputSha256:Object.fromEntries(parentsFor(engine).map(p=>[p,freeze.inputSha256[p]])),engineConfigHashes:{[engine]:freeze.engineConfigHashes[engine]}};}
export async function loadInputs(access){const input=await loadParents(access);for(const engine of ['SF18','SF19']){const saved=await access.readJson(prefix+'evidence/freeze-'+engine+'.json');if(!same(saved,partitionFreeze(input.freeze,engine)))throw Error('Changed registered candidate/cohort/input hashes/gates');}return input;}
