import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';import {checkWitness} from '../../E169-passive-defense-counterplay/code/check-witness.mjs';import {scopes,validateIds,validateView} from './scopes.mjs';
// Independent source admission; no detector/context/collector/derive imports.
function admit(input,result){
 if(input.history===undefined)return{status:'history-prerequisite'};
 const h=input.history;assert.ok(h&&typeof h.fen==='string'&&Array.isArray(h.moves));assert.equal(input.defenseComparisonTags,true);const limit=input.maxDefenseComparisonNodes===undefined?50000:input.maxDefenseComparisonNodes;assert.ok(Number.isSafeInteger(limit)&&limit>=0&&limit<=50000);
 const c=new Chess(h.fen);for(const m of h.moves){assert.equal(typeof m,'string');assert.match(m,/^[a-h][1-8][a-h][1-8][qrbn]?$/);assert.ok(!c.isGameOver());c.move(m);}assert.equal(c.fen(),new Chess(input.fen).fen());assert.ok(!c.isGameOver());
 const a=result.defenseComparisonAnalysis;assert.ok(a);assert.equal(a.limit,limit);assert.ok(a.nodes>=0&&a.nodes<=limit+1);for(const [key,out,defaultValue]of [['counterplayPlies','counterplayPlies',2],['passiveLossPlies','passiveLossPlies',3]]){const v=input[key]===undefined?defaultValue:input[key];assert.ok(Number.isSafeInteger(v)&&v>=0&&v<=3);assert.equal(a[out],v);}
 if(!a.witness){assert.ok(!result.events.some(e=>e.evidence?.experiment==='E169'));return{status:a.status==='exhausted'?'source-exhausted':'source-prerequisite'};}
 checkWitness(input,result);const w=a.witness,p=w.panel,actual=p.variants.find(v=>v.move===input.move),active=p.variants.find(v=>v.role==='active');assert.ok(!(actual.own.tree.win&&actual.enemy.tree.win));assert.ok(!(active.own.tree.win&&active.enemy.tree.win));
 return{status:w.claim?'claim-rule-prerequisite':'admitted',p,actual,active};
}
function decide(ids,input,view,admitted){return ids.map(id=>{
 const s=scopes[id],d={id,context:s.context,origin:'E169',scope:s.scope,limitations:s.limitations,status:admitted.status,available:false,frame:id==='C0566'?'before-actual':'after-actual',evaluation:null,proof:null};
 if(s.view&&view===undefined){d.status='perspective-prerequisite';return d;}if(admitted.status!=='admitted')return d;
 const {p,actual,active}=admitted,actor=p.actor,enemy=actor==='w'?'b':'w',index=v=>p.variants.indexOf(v),path=(v,key)=>`defenseComparisonAnalysis.witness.panel.variants[${index(v)}].${key}`;
 const certificate=(v,key,frame,side,firstMove=null)=>({source:path(v,key),frame,frameFen:frame==='before-actual'?p.root.fen:v.state.fen,side,winner:v[key].winner,plies:v[key].plies+(firstMove?1:0),firstMove,certificateFen:v.state.fen,certificatePlies:v[key].plies});
 if(id==='C0566'){d.available=active.own.tree.win&&!active.enemy.tree.win;d.status=d.available?'available':'scope-not-proven';if(d.available)d.proof=certificate(active,'own','before-actual',actor,active.move);return d;}
 if(id==='C0568'){d.available=actual.role==='quiet'&&actual.enemy.tree.win&&!actual.own.tree.win;d.status=d.available?'available':'scope-not-proven';if(d.available)d.proof=certificate(actual,'enemy','after-actual',enemy);return d;}
 const key=actual.own.tree.win?'own':actual.enemy.tree.win?'enemy':null;
 if(!key){d.status='bounded-unresolved';return d;}
 const winner=actual[key].winner,outcome=winner===view.perspective?'winning':'losing';d.evaluation={frame:'after-actual',fen:actual.state.fen,perspective:view.perspective,winner,outcome,plies:actual[key].plies};d.available=id==='C0570'||(id==='C0575'?outcome==='losing':outcome==='winning');d.status=d.available?'available':'opposite-outcome';if(d.available)d.proof=certificate(actual,key,'after-actual',view.perspective);return d;
});}
export function inspectViews(ids,input,result,views){validateIds(ids);if(!Array.isArray(views)||!views.length)throw Error('Require at least one view');for(const view of views)validateView(view);const admitted=admit(input,result);return views.map(view=>decide(ids,input,view,admitted));}
export const inspectScopes=(ids,input,result,view)=>inspectViews(ids,input,result,[view])[0];
export const inspectScope=(id,input,result,view)=>inspectScopes([id],input,result,view)[0];
