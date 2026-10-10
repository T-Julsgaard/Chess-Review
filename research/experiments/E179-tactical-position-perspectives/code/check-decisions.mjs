import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';import {checkWitness} from '../../E169-passive-defense-counterplay/code/check-witness.mjs';import {scopes} from './scopes.mjs';
// Independent selector/frame implementation; never imports inspect or evaluator.
export function checkViews(ids,input,result,views,groups){
 assert.equal(groups.length,views.length);const a=result.defenseComparisonAnalysis,w=a?.witness;let actor,p,current,active;
 if(w){checkWitness(input,result);const c=new Chess(input.history.fen);for(const m of input.history.moves)c.move(m);actor=c.turn();p=w.panel;assert.equal(actor,p.actor);assert.equal(c.fen(),p.root.fen);c.move(input.move);assert.equal(c.fen(),result.after);current=p.variants.find(v=>v.state.fen===c.fen()&&v.move===input.move);active=p.variants.find(v=>v.role==='active');assert.ok(current&&active);}
 for(const [vi,view]of views.entries()){
  assert.equal(groups[vi].length,ids.length);
  for(const [di,id]of ids.entries()){
   const s=scopes[id],expected={id,context:s.context,origin:'E169',scope:s.scope,limitations:s.limitations,status:'source-prerequisite',available:false,frame:id==='C0566'?'before-actual':'after-actual',evaluation:null,proof:null};
   if(s.view&&view===undefined)expected.status='perspective-prerequisite';
   else if(!input.history)expected.status='history-prerequisite';
   else if(!w)expected.status=a.status==='exhausted'?'source-exhausted':'source-prerequisite';
   else if(w.claim)expected.status='claim-rule-prerequisite';
   else{
    const choices=[['own',current.own],['enemy',current.enemy]].filter(([,q])=>q.tree.win);assert.ok(choices.length<=1);let variant=current,key,side,firstMove=null;
    if(id==='C0566'){expected.available=active.own.tree.win&&!active.enemy.tree.win;expected.status=expected.available?'available':'scope-not-proven';variant=active;key='own';side=actor;firstMove=active.move;}
    else if(id==='C0568'){expected.available=current.role==='quiet'&&choices.length===1&&choices[0][1].winner!==actor;expected.status=expected.available?'available':'scope-not-proven';key='enemy';side=actor==='w'?'b':'w';}
    else if(!choices.length)expected.status='bounded-unresolved';
    else{[key]=choices[0];side=view.perspective;const q=choices[0][1],outcome=q.winner===side?'winning':'losing';expected.evaluation={frame:'after-actual',fen:result.after,perspective:side,winner:q.winner,outcome,plies:q.plies};expected.available=id==='C0570'||id==='C0575'&&outcome==='losing'||['C0574','C0978'].includes(id)&&outcome==='winning';expected.status=expected.available?'available':'opposite-outcome';}
    if(expected.available){const q=variant[key];assert.equal(q.rootFen,variant.state.fen);expected.proof={source:`defenseComparisonAnalysis.witness.panel.variants[${p.variants.indexOf(variant)}].${key}`,frame:expected.frame,frameFen:expected.frame==='before-actual'?p.root.fen:result.after,side,winner:q.winner,plies:q.plies+(firstMove?1:0),firstMove,certificateFen:q.rootFen,certificatePlies:q.plies};if(firstMove){const root=new Chess(input.history.fen);for(const m of input.history.moves)root.move(m);root.move(firstMove);assert.equal(root.fen(),q.rootFen);}}
   }
   assert.deepEqual(groups[vi][di],expected,'Altered position decision '+id);
  }
 }
 return true;
}
