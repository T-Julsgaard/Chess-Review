import {Chess} from '../../../../lib/chess.js';
import {checkWitness} from '../../E165-comparative-sacrificial-attack/code/check-witness.mjs';
import {flags,describe} from '../../E152-causal-space-room/code/panel.mjs';

const code=m=>m.from+m.to+(m.promotion||'');
const values={p:1,n:3,b:3,r:5,q:9,k:0};
const balance=(c,actor)=>c.board().flat().reduce((sum,p)=>sum+(p?values[p.type]*(p.color===actor?1:-1):0),0);
const legal=c=>c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b)));

// Frozen source admission proves the complete policy. This traversal adds the
// stronger requirement that every selected attacking continuation checks.
function checkingPolicy(c,node,actor){
  if(!node.win)return false;
  if(node.kind==='mate')return c.isCheckmate()&&c.turn()!==actor;
  if(c.turn()===actor){
    if(node.kind!=='choice')return false;
    c.move(node.move);
    try{return c.isCheck()&&checkingPolicy(c,node.child,actor);}finally{c.undo();}
  }
  if(node.kind!=='all')return false;
  return node.branches.length>0&&node.branches.every(branch=>{
    c.move(branch.move);
    try{return checkingPolicy(c,branch.child,actor);}finally{c.undo();}
  });
}

export function inspectOffer(input,result,options={}){
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).length)throw Error('Unsupported offer options');
  if(input.attackPolicyTags!==true)throw Error('Enabled E165 source required');
  const horizon=input.attackPolicyPlies===undefined?2:input.attackPolicyPlies;
  const cap=input.maxAttackPolicyNodes===undefined?50000:input.maxAttackPolicyNodes;
  if(!Number.isSafeInteger(horizon)||horizon<0||horizon>3)throw Error('Invalid source horizon');
  if(!Number.isSafeInteger(cap)||cap<0||cap>50000)throw Error('Invalid source cap');
  const answer={experiment:'E182',status:'source-prerequisite',claims:{C0588:false,C0593:false},witness:null};
  if(!result?.attackPolicyAnalysis?.witness)return answer;
  checkWitness(input,result);
  const source=result.attackPolicyAnalysis.witness;
  if(source.panel.claimContext)return {...answer,status:'claim-rule-prerequisite'};
  const c=new Chess(input.history.fen);
  for(const move of input.history.moves)c.move(move);
  const actor=c.turn(),before=c.fen(),baseline=balance(c,actor),actual=legal(c).find(m=>code(m)===input.move);
  c.move(input.move);
  const after=c.fen(),offerBalance=balance(c,actor),row=source.panel.rows.find(r=>r.move===input.move);
  const checking=checkingPolicy(c,row.actor.tree,actor),acceptances=[];
  for(const acceptance of legal(c).filter(m=>m.captured===actual.piece&&describe(m).victim===actual.to)){
    c.move(code(acceptance));
    try{
      const acceptedBalance=balance(c,actor),replies=[];
      for(const reply of c.isGameOver()?[]:legal(c)){
        c.move(code(reply));
        try{replies.push({...describe(reply),fen:c.fen(),flags:flags(c),balance:balance(c,actor),unrecoveredLoss:offerBalance-balance(c,actor)});}finally{c.undo();}
      }
      acceptances.push({...describe(acceptance),fen:c.fen(),flags:flags(c),balance:acceptedBalance,nominalLoss:offerBalance-acceptedBalance,replies,minimumUnrecoveredLoss:replies.length?Math.min(...replies.map(r=>r.unrecoveredLoss)):offerBalance-acceptedBalance});
    }finally{c.undo();}
  }
  const concession=acceptances.some(a=>a.nominalLoss>0);
  const initiative=checking&&concession;
  const quiet=source.panel.rows.find(r=>r.move===input.attackPolicyAlternative);
  const compensation=initiative&&!quiet.actor.tree.win&&acceptances.some(a=>a.nominalLoss>0&&a.minimumUnrecoveredLoss>0);
  return {...answer,status:initiative?'proven':'compared',claims:{C0588:compensation,C0593:initiative},witness:{before,after,actor,baseline,offerBalance,horizon,checkingPolicy:checking,quietAlternative:input.attackPolicyAlternative,quietMate:quiet.actor.tree.win,acceptances}};
}
