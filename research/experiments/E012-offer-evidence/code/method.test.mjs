import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
import {cohort} from './cohort.mjs';
import {makePolicy,validatePolicy} from './policy.mjs';
import {loadBoard,extract} from './board.mjs';
import {queryKey} from './queries.mjs';
import {prepare} from './prepare.mjs';
import {properties,rank,evaluate} from './method.mjs';
import {exchange,audit} from './audit.mjs';
const board=await loadBoard();
function fixture(){
  const dataset=[],cases=[],keys=[],prefix=['d2d4','e7e5','d4e5','c7c6'];
  for(let i=0;i<24;i++){
    const stratum=i<8?'offer':i<16?'loss':'control',played=stratum==='offer'?'d1d5':'g1f3',id='authored-'+i,game={id,split:'train',moves:[...prefix,played]},b=new Chess(),history=[];
    for(const raw of prefix)history.push(b.move({from:raw.slice(0,2),to:raw.slice(2,4)}).san);const m=b.move({from:played.slice(0,2),to:played.slice(2,4)}),caseId='CR-'+sha256('E005-case-v1:'+id+':5').slice(0,12);
    dataset.push(game);cases.push({caseId,before:m.before,after:m.after,san:m.san,color:m.color,history,from:m.from,to:m.to});keys.push({caseId,gameId:id,ply:5,stratum,offered:stratum==='offer'});
  }
  const pack={schema:'E005-review-pack-v1',rubric:'v1',packId:sha256(JSON.stringify(cases)),cases},key={schema:'E005-private-selection-v1',packId:pack.packId,cases:keys},configs={'20k':{majorVersion:18,budget:{kind:'nodes',value:20000},synthetic:true},'80k':{majorVersion:18,budget:{kind:'nodes',value:80000},synthetic:true}},policy=makePolicy(configs,board.blockSha256),selected=cohort(pack,key,dataset),queries=new Map(),positions=[];
  for(const c of selected){const modes={};for(const mode of ['20k','80k']){
    const alternatives=[];let rootKey;for(const restricted of [null,...c.legalMoves]){const h=policy.configHashes[mode],key=queryKey(h,c.history,restricted),bestmove=restricted||c.legalMoves[0],rawInfo=`info depth 10 score cp 0 wdl 400 200 400 nodes 100 pv ${bestmove}`;
      queries.set(key,{key,configHash:h,history:c.history,restricted,score:{cp:0,wdl:[400,200,400]},bestmove,pv:bestmove,nodes:100,depth:10,finalNodes:100,elapsedMs:1,rawInfo,finalSearchInfo:rawInfo});if(restricted===null)rootKey=key;else alternatives.push({move:restricted,key});}
    modes[mode]={rootKey,alternatives};}positions.push({...c,keys:modes});}
  const evidence={schema:'E012-root-observations-v1',complete:true,packId:pack.packId,policySha256:sha256(JSON.stringify(policy)),engineConfigs:configs,configHashes:policy.configHashes,games:dataset,positions,searches:[...queries.values()]};return{dataset,pack,key,configs,policy,evidence};
}
test('source-bound policy and whole-cohort history reject substitutions and missing roots',()=>{
  const f=fixture();assert.equal(validatePolicy(f.policy,f.configs,board.blockSha256),true);assert.equal(prepare(f.evidence,f.pack,f.key,f.dataset,f.policy).cases.length,24);
  const p=structuredClone(f.policy);p.thresholds.nearBest=.03;assert.throws(()=>validatePolicy(p,f.configs,board.blockSha256),/differs/);
  assert.equal(extract('const SAC_VAL = 1;\r\nconst BRILLIANT_POLICY = 2;'),extract('const SAC_VAL = 1;\nconst BRILLIANT_POLICY = 2;'));
  for(const mutate of [e=>{e.positions[0].keys['80k'].alternatives.pop();},e=>{e.searches[0].score.mate=1;},e=>{e.positions[0].move.prior=e.positions[0].move.before;},e=>{e.searches[0].history=[];}]){const e=structuredClone(f.evidence);mutate(e);assert.throws(()=>prepare(e,f.pack,f.key,f.dataset,f.policy));}
  const data=structuredClone(f.dataset);data[0].split='test';assert.throws(()=>cohort(f.pack,f.key,data),/nontraining/);
});
test('complete alternatives expose falsely zero root-pair loss and exact policy boundaries',()=>{
  const t={nearBest:.02,minPlayedCp:-50,clearlyWinningCp:500},scores={root:{cp:0,wdl:[400,200,400]},playedIndex:0,alternatives:[{move:'a',score:{cp:0,wdl:[400,200,400]}},{move:'b',score:{cp:100,wdl:[500,200,300]}}]},r=properties(scores,t);
  assert.equal(r.rootPairLoss,0);assert.equal(r.rootPairNearBest,true);assert.equal(r.lowLoss,false);assert.equal(r.rootInconsistency,true);assert.ok(Math.abs(r.loss-.1)<1e-12);
  scores.alternatives[1].score={cp:100,wdl:[419,200,381]};assert.equal(properties(scores,t).lowLoss,true);scores.alternatives[0].score.cp=-50;assert.equal(properties(scores,t).sound,true);scores.alternatives[0].score.cp=-51;assert.equal(properties(scores,t).sound,false);
  scores.alternatives[0].score.cp=600;scores.alternatives[1].score.cp=500;assert.equal(properties(scores,t).competitive,false);scores.alternatives[1].score.cp=499;assert.equal(properties(scores,t).competitive,true);
});
test('mate ordering, mate delay and legal local exchange are explicit',()=>{
  assert.ok(rank({mate:2})[1]>rank({mate:3})[1]);assert.ok(rank({mate:-7})[1]>rank({mate:-2})[1]);
  const t={nearBest:.02,minPlayedCp:-50,clearlyWinningCp:500},s={root:{mate:3},playedIndex:0,alternatives:[{move:'a',score:{mate:4}},{move:'b',score:{mate:3}}]};assert.equal(properties(s,t).mateMaintained,false);
  s.alternatives=[{move:'a',score:{mate:3}},{move:'b',score:{cp:499,wdl:[900,100,0]}}];assert.equal(properties(s,t).eligible,true);
  const offer=new Chess('7k/8/4p3/3Q4/8/8/8/K7 b - - 0 1');assert.equal(exchange(offer,'d5'),9);assert.equal(board.exchangeGain(offer,'d5',{nodes:0,maxNodes:128}),9);assert.equal(exchange(offer,'d5',{nodes:0,maxNodes:0}),null);
});
test('frozen assessment and independent audit detect altered evidence and gates',()=>{
  const f=fixture(),p=prepare(f.evidence,f.pack,f.key,f.dataset,f.policy),r=evaluate(p,f.policy,board);assert.equal(r.passed,true);assert.equal(r.summary.offerSupport.successes,8);assert.equal(audit(p,f.policy,board,r,f.dataset).enginePropertyChecks,48);
  for(const mutate of [x=>{x.records[0].modes['20k'].loss=.3;},x=>{x.records[0].localOffer=false;},x=>{x.summary.offerSupport.lower=.99;},x=>{x.gates.offerEvidence=false;}]){const altered=structuredClone(r);mutate(altered);assert.throws(()=>audit(p,f.policy,board,altered,f.dataset),/Independent/);}
  const wrong=structuredClone(p);wrong.cases[0].color='b';assert.throws(()=>audit(wrong,f.policy,board,r,f.dataset),/perspective/);
  wrong.cases[0].split='test';assert.throws(()=>evaluate(wrong,f.policy,board),/cohort/);
});
