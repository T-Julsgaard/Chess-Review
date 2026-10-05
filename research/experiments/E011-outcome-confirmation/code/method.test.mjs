import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
import {selection,queryKey,outcomePlies} from './queries.mjs';
import {prepare} from './prepare.mjs';
import {curveFreeze,validateFreeze} from './models.mjs';
import {evaluate} from './method.mjs';
import {audit} from './audit.mjs';
// Authored positions repeated only to exercise the declared 300-game contract.
// These are mechanics tests, not calibration or independent human evidence.
function fixture(){
  const board=new Chess(),moves='e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7'.split(' ').map(san=>{const m=board.move(san);return m.from+m.to+(m.promotion||'');}),
    dataset=Array.from({length:300},(_,i)=>({id:'authored-'+String(i).padStart(3,'0'),split:'test',moves,result:'1-0',players:[{color:'w',rating:1500},{color:'b',rating:1500}]})),
    configs={'20k':{majorVersion:19,budget:{kind:'nodes',value:20000},synthetic:true},'80k':{majorVersion:19,budget:{kind:'nodes',value:80000},synthetic:true}},
    hashes=Object.fromEntries(Object.entries(configs).map(([k,c])=>[k,sha256(JSON.stringify(c))])),queries=new Map();
  const positions=selection(dataset).map(p=>({...p,roots:p.roots.map(r=>{
    const b=new Chess();for(const m of r.history)b.move({from:m.slice(0,2),to:m.slice(2,4)});
    const m=b.moves({verbose:true})[0],bestmove=m.from+m.to+(m.promotion||''),keys={};
    for(const mode of ['20k','80k']){const key=queryKey(hashes[mode],r.history,null),rawInfo=`info depth 10 score cp 100 wdl 400 400 200 nodes 100 pv ${bestmove}`;
      keys[mode]=key;queries.set(key,{key,configHash:hashes[mode],history:r.history,restricted:null,score:{cp:100,wdl:[400,400,200]},bestmove,pv:bestmove,nodes:100,depth:10,elapsedMs:1,rawInfo,finalSearchInfo:rawInfo,finalNodes:100});}
    return{...r,keys};})}));
  const source={schema:'E010-model-freeze-v1',models:{fixed:{curve:{schema:'E008-curve-v1',kind:'cp',coefficient:.368208,boundary:null}},cp:{curve:{schema:'E008-curve-v1',kind:'cp',coefficient:.22349935786891822,boundary:null}}},engineConfig:configs['20k'],configHash:hashes['20k'],modelsSha256:'authored'},freeze=curveFreeze(source),
    evidence={schema:'E011-root-observations-v1',complete:true,games:dataset,engineConfigs:configs,configHashes:hashes,protocol:{outcomePlies,roles:{test:300},budgets:[20000,80000]},positions,searches:[...queries.values()]};
  return{dataset,configs,evidence,source,freeze};
}
test('curve-only freeze rejects coefficient, kind and search configuration substitutions',()=>{
  const f=fixture();assert.equal(validateFreeze(f.freeze,f.source,f.configs['20k']),true);assert.equal(f.freeze.choiceModelIncluded,false);
  const altered=structuredClone(f.freeze);altered.curves.cp.coefficient=.3;assert.throws(()=>validateFreeze(altered,f.source,f.configs['20k']),/differs/);
  const source=structuredClone(f.source);source.models.cp.curve.kind='wdl';assert.throws(()=>curveFreeze(source),/differs/);
});
test('panel binds both unrestricted budgets, roles, history and legal principal variations',()=>{
  const f=fixture(),p=prepare(f.evidence,f.dataset,f.configs);assert.equal(p.rows.length,600);assert.equal(p.diagnostics.coveredGames,300);assert.deepEqual(p.rows.slice(0,2).map(r=>[r.color,r.target,r.weight]),[['b',0,.5],['w',1,.5]]);
  for(const mutate of [
    e=>{delete e.positions[0].roots[0].keys['80k'];},
    e=>{e.positions[0].split='train';},
    e=>{e.searches[0].score.mate=1;},
    e=>{e.searches[0].restricted=e.searches[0].bestmove;},
    e=>{const q=e.searches[0];q.pv=q.bestmove='a1a8';q.rawInfo=q.finalSearchInfo=q.rawInfo.replace(/pv .+$/,'pv a1a8');},
    e=>{e.positions[0].roots[0].history=[];}
  ]){const e=structuredClone(f.evidence);mutate(e);assert.throws(()=>prepare(e,f.dataset,f.configs));}
  assert.throws(()=>selection([{...f.dataset[0],split:'train'}]),/test-role/);
  const configs=structuredClone(f.configs);configs['80k'].synthetic=false;const e=structuredClone(f.evidence);e.engineConfigs=configs;e.configHashes['80k']=sha256(JSON.stringify(configs['80k']));assert.throws(()=>prepare(e,f.dataset,configs),/configuration/);
});
test('mate at either budget excludes the paired root from every comparator',()=>{
  const f=fixture(),q=f.evidence.searches.find(r=>r.configHash===f.evidence.configHashes['80k']);q.score={mate:2,wdl:[1000,0,0]};q.rawInfo=q.finalSearchInfo=q.rawInfo.replace('score cp 100 wdl 400 400 200','score mate 2 wdl 1000 0 0');
  const p=prepare(f.evidence,f.dataset,f.configs);assert.equal(p.exclusions.length,300);assert.equal(p.rows.length,300);assert.ok(p.rows.every(r=>r.weight===1));assert.deepEqual(p.diagnostics.matesByBudget,{'20k':0,'80k':300});
});
test('independent audit catches target, diagnostic, metric, interval and subgroup tampering',()=>{
  const f=fixture(),p=prepare(f.evidence,f.dataset,f.configs),r=evaluate(p,f.freeze);assert.equal(r.passed,false);assert.equal(r.gates.rootStability,true);assert.equal(r.gates.budget20k,false);assert.equal(audit(p,f.freeze,r,f.dataset).predictions,3600);
  for(const mutate of [
    x=>{x.records['20k'].cp[0].target=1;},
    x=>{x.records['80k'].fixed[0].fixedPoints=.9;},
    x=>{x.modes['20k'].metrics.cp.logLoss+=.1;},
    x=>{x.modes['80k'].fixedImprovement.lower+=.1;},
    x=>{x.modes['20k'].groups[0].cp.brier+=.1;},
    x=>{x.modes['80k'].groups[0].passed=!x.modes['80k'].groups[0].passed;}
  ]){const altered=structuredClone(r);mutate(altered);assert.throws(()=>audit(p,f.freeze,altered,f.dataset),/Independent/);}
  const wrong=structuredClone(p);wrong.rows[0].target=1;assert.throws(()=>audit(wrong,f.freeze,r,f.dataset),/perspective/);
  wrong.rows[0].split='validation';assert.throws(()=>evaluate(wrong,f.freeze),/reserved/);
});
