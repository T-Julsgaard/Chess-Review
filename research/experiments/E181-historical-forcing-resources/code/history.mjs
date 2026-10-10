import {createHash} from 'node:crypto';
import {Chess} from '../../../../lib/chess.js';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {checkWitness as checkConversion} from '../../E155-recorded-advantage-conversion/code/check-witness.mjs';
import {checkWitness as checkHunt} from '../../E164-king-hunt-shelter/code/check-witness.mjs';
import {collectTree} from '../../E146-retrograde-calculation/code/tree.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {decisions,sameStatus} from './scopes.mjs';
const admitted=new Set(),types={conversion:['conversionAnalysis','conversionTags','maxConversionNodes','conversionPlies',2,4],hunt:['kingChaseAnalysis','kingChaseTags','maxKingChaseNodes','kingChasePlies',2,3]};
function controls(source,input,options){
 if(typeof source!=='string'||!Object.hasOwn(types,source))throw Error('Expected conversion or hunt source');
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['continuation','maxMomentumNodes'].includes(k)))throw Error('Expected declared momentum options');
 const [key,flag,cap,horizon,defaultH,maxH]=types[source],limit=options.maxMomentumNodes===undefined?50000:options.maxMomentumNodes,H=input[horizon]===undefined?(source==='hunt'&&input.kingChaseMode==='shelter'?3:defaultH):input[horizon],sourceLimit=input[cap]===undefined?50000:input[cap];
 if(input[flag]!==true)throw Error('Explicit enabled source required');
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000||!Number.isSafeInteger(sourceLimit)||sourceLimit<0||sourceLimit>50000||!Number.isSafeInteger(H)||H<0||H>maxH)throw Error('Invalid momentum/source controls');
 if(source==='conversion'){const start=input.conversionStartPly===undefined?0:input.conversionStartPly;if(!Number.isSafeInteger(start)||start<0||start>1000)throw Error('Invalid source start ply');}
 if(source==='hunt'&&!['hunt','shelter'].includes(input.kingChaseMode))throw Error('Invalid hunt mode');
 if(source==='hunt'&&options.continuation!==undefined)throw Error('Hunt already contains its current policy');
 return{key,limit,H,sourceLimit};
}
function admit(source,input,result,w){const fingerprint=createHash('sha256').update(JSON.stringify(structuredClone([source,input,result]))).digest('hex');if(!admitted.has(fingerprint)){source==='conversion'?checkConversion(w,result,input):checkHunt(input,result);admitted.add(fingerprint);}}
function solve(g,actor,tick){
 const values=Array(g.tree.length);for(let i=g.tree.length-1;i>=0;i--){tick();const n=g.tree[i];let win=n.kind==='mate'&&n.outcome===actor,rank=win?0:null;if(n.kind==='branch'){const child=n.edges.map(e=>values[e.child]),good=child.filter(v=>v.win);win=n.turn===actor?good.length>0:good.length===child.length;if(win)rank=1+(n.turn===actor?Math.min(...good.map(v=>v.rank)):Math.max(...good.map(v=>v.rank)));}values[i]={win,rank};}
 const policy=[];function walk(id){if(!values[id].win)return;const n=g.tree[id],selected=n.edges.filter(e=>n.turn!==actor||values[e.child].win);policy.push({node:id,rank:values[id].rank,moves:selected.map(e=>e.move)});for(const e of selected)walk(e.child);}walk(0);return{values,policy};
}
const queryRank=t=>t.kind==='mate'?0:t.child?1+queryRank(t.child):1+Math.max(...t.branches.map(b=>queryRank(b.child)));
function run(source,input,result,options,collect){
 const {key,limit,H,sourceLimit}=controls(source,input,options);let nodes=0,status='history-prerequisite',continuation=null,values=null,policy=[],out=decisions(sameStatus(status));
 const done=()=>({analysis:{source,limit,nodes,status,continuation,values,policy},decisions:out}),tick=()=>{if(++nodes>limit)throw Error('momentum-budget');},unavailable=s=>{status=s;out=decisions(sameStatus(s));return done();};
 try{
  tick();if(!validateHistory(input))return unavailable('history-prerequisite');const a=result?.[key];if(!a)return unavailable('source-unavailable');
  if(!Number.isSafeInteger(a.nodes)||a.nodes<0||a.nodes>sourceLimit+1||a.witness&&a.nodes>sourceLimit)throw Error('Invalid source budget');
  nodes=2+a.nodes+input.history.moves.length+1;if(nodes>limit)throw Error('momentum-budget');const w=a.witness;if(!w)return unavailable('source-unavailable');admit(source,input,result,w);
  if(source==='hunt'&&input.kingChaseMode!=='hunt')return unavailable('historical-mode-prerequisite');
  if(source==='conversion'?w.graph.claimNodes.length:w.panel.claimContext||w.context.prior.flags.fifty||w.context.prior.flags.threefold)return unavailable('claim-rule-prerequisite');
  const actor=source==='conversion'?w.actor:w.context.actor,c=new Chess(input.history.fen);for(const move of input.history.moves)c.move(move);c.move(input.move);const after=c.fen(),live=!c.isGameOver(),checking=c.isCheck();let positive=c.isCheckmate()&&c.turn()!==actor,rank=positive?0:null,defenses=[],history=false,historyChecks=false,span=[],firstBefore,firstAfter,earlierContinuationPlies,certificate='actual-checkmate';
  if(source==='conversion'){
   const own=w.span.filter(r=>r.turn===actor),prefix=w.span.length-2;historyChecks=own.length>=2&&own.every(r=>/[+#]/.test(r.san));history=w.values[0].win&&w.trace.steps.length>=prefix&&w.trace.steps.slice(0,prefix).every(s=>s.winningBefore&&s.winningAfter);span=w.span.map(r=>r.move);firstBefore=w.context.fen;firstAfter=w.graph.after;earlierContinuationPlies=w.graph.plies;
   if(options.continuation!==undefined||live&&checking){
    if(options.continuation===undefined&&!collect)return unavailable('continuation-prerequisite');const g=options.continuation===undefined?collectTree(input,2,limit-nodes):options.continuation;
    if(!g||typeof g!=='object'||!Number.isSafeInteger(g.nodes)||g.nodes<0)throw Error('Expected complete current continuation');if(g.nodes>limit-nodes)throw Error('momentum-budget');nodes+=verifyTree({...input,retrogradeCalculationPlies:2},g).nodes;continuation=g;({values,policy}=solve(g,actor,tick));if(g.claimNodes.length)return unavailable('claim-rule-prerequisite');positive=values[0].win;rank=values[0].rank;defenses=g.tree[0].edges.map(e=>e.move);certificate='continuation.tree[0]';
   }
  }else{
   const p=w.context.prior,row=w.panel.rows.find(r=>r.move===input.move);positive=row.actor.tree.win;rank=positive?queryRank(row.actor.tree):null;defenses=row.actor.tree.kind==='all'?row.actor.tree.branches.map(b=>b.move):[];historyChecks=p.checking&&row.check;history=p.legal.length===1&&p.legal[0].move===p.reply.move&&p.replyAfter===w.before;span=[p.move.move,p.reply.move,input.move];firstBefore=p.before;firstAfter=p.after;earlierContinuationPlies=H+2;certificate='panel.rows['+input.move+'].actor';
  }
  const momentum=historyChecks&&history&&positive,pressure=momentum&&live&&checking,defensive=live&&checking&&positive;
  const historyProof={source,actor,firstBefore,firstAfter,firstMove:span[0],recordedSpan:span,earlierContinuationPlies,extendedTotalPlies:Math.max(earlierContinuationPlies+1,span.length+(rank??0)),current:{frame:'after-actual',fen:after,winner:actor,plies:rank,certificate},branching:source==='conversion'?'complete-earlier-policy':'unique-prior-defense'},defenseProof={source,frame:'after-actual',fen:after,actor,played:input.move,plies:rank,certificate,defenses};
  out=decisions({C0583:momentum?'available':!historyChecks?'historical-check-prerequisite':!history?'historical-policy-prerequisite':'current-policy-unresolved',C0594:pressure?'available':!live?'terminal-prerequisite':!historyChecks?'historical-check-prerequisite':!history?'historical-policy-prerequisite':'current-policy-unresolved',C0598:defensive?'available':!live?'terminal-prerequisite':!checking?'checking-prerequisite':'bounded-unresolved'},{C0583:historyProof,C0594:{...historyProof,defenses},C0598:defenseProof});status=out.some(d=>d.available)?'available':'compared';return done();
 }catch(e){if(!['momentum-budget','retrograde-budget'].includes(e.message))throw e;nodes=limit+1;continuation=null;values=null;policy=[];return unavailable('exhausted');}
}
export const evaluateHistory=(source,input,result,options={})=>run(source,input,result,options,true);
export const inspectHistory=(source,input,result,options={})=>run(source,input,result,options,false);
