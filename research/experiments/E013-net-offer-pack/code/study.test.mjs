import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
import {validatePanel} from '../../../root-panel.mjs';
import {loadBoard} from '../../E012-offer-evidence/code/board.mjs';
import {makePolicy as parentPolicy} from '../../E012-offer-evidence/code/policy.mjs';
import {queryKey} from '../../E012-offer-evidence/code/queries.mjs';
import {htmlFor} from '../../E005-category-review/code/build.mjs';
import {makePolicy,validatePolicy} from './policy.mjs';
import {select,verifyPack} from './selection.mjs';
import {evaluate} from './method.mjs';
import {audit,witness} from './audit.mjs';
const board=await loadBoard();
function fixture(){
  const dataset=[],rows=[],prefix=['d2d4','e7e5','d4e5','c7c6'];
  for(let i=0;i<16;i++){const b=new Chess();for(const m of prefix)b.move({from:m.slice(0,2),to:m.slice(2,4)});const id='authored-'+i,played=i<8?'d1d5':'g1f3';dataset.push({id,split:'train',moves:[...prefix,played]});rows.push({gameId:id,split:'train',contextMoves:[{ply:5,color:'w',legalChoices:b.moves().length,bestMate:null,playedMate:null,loss:0,playedExpected:.6}]});}
  const context={rows},excluded=new Set(),configs={'20k':{majorVersion:18,budget:{kind:'nodes',value:20000},synthetic:true},'80k':{majorVersion:18,budget:{kind:'nodes',value:80000},synthetic:true}},parent=parentPolicy(configs,board.blockSha256),policy=makePolicy(parent),selected=select(dataset,context,excluded,board).selected,
    cases=selected.map(c=>c.presentation),pack={schema:'E013-review-pack-v1',rubric:'v1',packId:sha256(JSON.stringify(cases)),cases},key={schema:'E013-private-selection-v1',packId:pack.packId,cases:selected},queries=new Map(),positions=[];
  for(const c of selected){const modes={};for(const mode of ['20k','80k']){let rootKey;const alternatives=[];for(const restricted of [null,...c.legalMoves]){const h=policy.configHashes[mode],k=queryKey(h,c.history,restricted),bestmove=restricted||c.legalMoves[0],rawInfo=`info depth 10 score cp 0 wdl 400 200 400 nodes 100 pv ${bestmove}`;queries.set(k,{key:k,configHash:h,history:c.history,restricted,score:{cp:0,wdl:[400,200,400]},bestmove,pv:bestmove,nodes:100,depth:10,finalNodes:100,elapsedMs:1,rawInfo,finalSearchInfo:rawInfo});if(restricted===null)rootKey=k;else alternatives.push({move:restricted,key:k});}modes[mode]={rootKey,alternatives};}positions.push({...c,keys:modes});}
  const raw={schema:'research-root-panel-v1',complete:true,packId:pack.packId,policySha256:sha256(JSON.stringify(policy)),engineConfigs:configs,configHashes:policy.configHashes,games:selected.map(c=>dataset.find(g=>g.id===c.gameId)),positions,searches:[...queries.values()]};return{dataset,context,excluded,configs,parent,policy,selected,pack,key,raw};
}
test('deterministic net selection matches controls and leaves inadequate pools incomplete',()=>{
  const f=fixture(),a=select(f.dataset,f.context,f.excluded,board),b=select(f.dataset,f.context,f.excluded,board);assert.equal(a.complete,true);assert.deepEqual(a.selected,b.selected);assert.equal(a.diagnostics.completePoolNetOfferCount,null);assert.equal(new Set(a.selected.map(c=>c.gameId)).size,16);
  assert.equal(select(f.dataset,f.context,new Set(['authored-0']),board).complete,false);assert.throws(()=>select(f.dataset,f.context,f.excluded,board,{maxMs:0}),/cap/);
  const changed=structuredClone(f.context);changed.rows[0].contextMoves[0].playedExpected=.4;assert.equal(select(f.dataset,changed,f.excluded,board).complete,false);
});
test('pack, source filters, policy and complete legal panel reject tampering',()=>{
  const f=fixture();assert.deepEqual(verifyPack(f.pack,f.key,f.dataset,f.context,f.excluded,board),f.selected);validatePolicy(f.policy,f.parent);
  const policy=structuredClone(f.policy);policy.gates.stableCasesRequired=14;assert.throws(()=>validatePolicy(policy,f.parent),/differs/);
  const p=structuredClone(f.pack);p.cases[0].rating=1500;p.packId=sha256(JSON.stringify(p.cases));const k=structuredClone(f.key);k.packId=p.packId;assert.throws(()=>verifyPack(p,k,f.dataset,f.context,f.excluded,board),/blinding/);
  for(const mutate of [r=>r.positions[0].keys['80k'].alternatives.pop(),r=>{r.searches[0].score.mate=1;},r=>{r.positions[0].move.prior=r.positions[0].move.before;},r=>{r.positions[0].injected=true;}]){const r=structuredClone(f.raw);mutate(r);assert.throws(()=>validatePanel(r,f.selected,f.raw.games,f.policy,f.pack.packId));}
});
test('positive voluntary net-cost witnesses and independent screen checks are meaningful',()=>{
  const f=fixture(),p=validatePanel(f.raw,f.selected,f.raw.games,f.policy,f.pack.packId),r=evaluate(p,f.policy,board),check=audit(p,f.policy,board,r,f.dataset);assert.equal(r.passed,true);assert.equal(check.independentNetOfferWitnesses,8);assert.ok(check.certificates.every(c=>c.witness.netCost>0));
  const control=f.selected.find(c=>c.stratum==='nonoffer');assert.equal(witness(control.move).witness,null);
  for(const mutate of [x=>{x.records[0].modes['20k'].loss=.3;},x=>{x.summary.offerSupport.upper=.1;},x=>{x.gates.offerEvidence=false;}]){const changed=structuredClone(r);mutate(changed);assert.throws(()=>audit(p,f.policy,board,changed,f.dataset),/Independent/);}
});
test('new reviewer namespace supports partial progress and bound export without old storage',async()=>{
  const f=fixture(),template=(await readFile(new URL('../../E005-category-review/code/review.html',import.meta.url),'utf8')).replaceAll('E005','E013'),script=(await readFile(new URL('../../E005-category-review/code/review.js',import.meta.url),'utf8')).replaceAll('E005','E013');let exported;
  const dom=new JSDOM(htmlFor(f.pack,template,script),{runScripts:'dangerously',url:'https://authored.invalid/',beforeParse(w){w.URL.createObjectURL=blob=>{exported=blob;return'blob:authored';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};}}),w=dom.window,$=id=>w.document.getElementById(id);
  try{for(const [field,value] of Object.entries({reviewer:'Authored test',consequence:'sound',exceptional:'notable',confidence:'medium',usefulness:'high',reason:'Mechanics only'})){$(field).value=value;$(field).dispatchEvent(new w.Event('input'));}assert.ok(w.localStorage.key(0).startsWith('ChessReview.E013.'));$('next').click();$('previous').click();assert.equal($('reason').value,'Mechanics only');$('export').click();const text=await new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(exported);}),review=JSON.parse(text);assert.equal(review.schema,'E013-human-review-v1');assert.equal(review.packId,f.pack.packId);assert.deepEqual(review.caseIds,f.pack.cases.map(c=>c.caseId));assert.equal(review.index,undefined);}finally{w.close();}
});
