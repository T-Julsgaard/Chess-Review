import {controls,context} from './context.mjs';
import {verifyPanel} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
import {collectPanel} from '../../E143-forcing-tempo-initiative/code/panel.mjs';
import {plain} from '../../E183-recorded-initiative-turnover/code/plain.mjs';
import {isDeepStrictEqual} from 'node:util';
const admissions=[];
function admit(input,H,panel){
 const key=[input.fen,input.history,H,panel];let entry=admissions.find(e=>isDeepStrictEqual(e.key,key));
 if(!entry){const r=verifyPanel({...input,forcingTempoPlies:H},panel);entry={key:structuredClone(key),nodes:r.nodes,claimContext:r.claimContext};admissions.push(entry);}
 const actual=panel.rows.find(r=>r.move===input.move);if(!actual&&!entry.claimContext)throw Error('Missing selected row');return{nodes:entry.nodes,claimContext:entry.claimContext,actual};
}
const ids={useful:'C0758',wasted:'C0759',exposure:'C0724'};
function run(input,options,panel,collect){
 const o=controls(input,options),out={schema:'E187-paired-choice-v1',family:o.family,plies:o.H,limit:o.limit,nodes:0,status:'disabled',ids:[],qualityClaim:false,witness:null,panel:null};
 if(!o.enabled)return out;const x=context(input);out.status=x.status;if(x.status!=='ready')return out;
 const exhausted=()=>({...out,nodes:o.limit+1,status:'exhausted',ids:[],witness:null,panel:null});if(x.setup>o.limit)return exhausted();
 if(panel===undefined){if(!collect)return{...out,nodes:x.setup,status:'panel-prerequisite'};try{panel=collectPanel(input,o.H,o.limit-x.setup);}catch(e){if(e.message==='forcing-tempo-budget')return exhausted();throw e;}}
 plain(panel);if(!panel||!Number.isSafeInteger(panel.nodes)||panel.nodes<0)throw Error('Invalid complete panel');if(panel.nodes+x.setup>o.limit)return exhausted();
 const admitted=admit(input,o.H,panel);out.nodes=x.setup+admitted.nodes;out.panel=structuredClone(panel);
 if(admitted.claimContext)return{...out,status:'claim-rule-prerequisite'};
 const a=admitted.actual,b=panel.rows.find(r=>r.move===input.alternative);if(!a||!b)throw Error('Missing selected root rows');
 out.status='compared';out.witness={actor:panel.actor,before:panel.before,actual:input.move,alternative:input.alternative,after:a.after,alternativeAfter:b.after,values:{actualOwn:a.actor.tree.win,actualEnemy:a.opponent.tree.win,alternativeOwn:b.actor.tree.win,alternativeEnemy:b.opponent.tree.win},role:null};
 const quiet=r=>!r.capture&&!r.promotion&&!r.mate,common=quiet(a)&&quiet(b)&&a.from===b.from&&a.piece===b.piece;
 if(!common)return out;
 if(o.family==='tempo'){
  const good=a.check?a:b,bad=a.check?b:a,t=good.actor.tree;
  if(!good.check||bad.check||!good.actor.tree.win||good.opponent.tree.win||bad.actor.tree.win||!bad.opponent.tree.win||t.kind!=='all'||!t.branches.length||!t.branches.every(k=>k.child.kind==='choice'&&k.child.child.kind==='mate'&&k.child.child.win))return out;
  out.witness.role={checking:good.move,quiet:bad.move,defenses:t.branches.map(k=>({reply:k.move,mating:k.child.move,mateFen:k.child.child.fen}))};out.ids=[a===good?ids.useful:ids.wasted];
 }else{
  const pieces=x.c.board().flat().filter(Boolean);if(a.piece!=='k'||a.check||b.check||pieces.some(p=>!['k','q','p'].includes(p.type))||!['w','b'].every(color=>pieces.some(p=>p.type==='q'&&p.color===color))||!a.opponent.tree.win||b.opponent.tree.win)return out;
  const t=a.opponent.tree;if(t.kind!=='choice')return out;const c=x.c;c.move(a.move);const m=c.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion||'')===t.move);if(!m||m.piece!=='q')return out;c.move(t.move);if(!c.isCheck())return out;
  const king=c.board().flat().find(p=>p?.type==='k'&&p.color===panel.actor);if(!c.attackers(king.square,c.turn()==='w'?'b':'w').includes(m.to))return out;
  out.witness.role={queenFrom:m.from,queenTo:m.to,checking:t.move,king:king.square,matingPolicy:true};out.ids=[ids.exposure];
 }
 out.status='proven';return out;
}
export const inspectPairedChoices=(input,options={},panel)=>run(input,options,panel,false);
export const evaluatePairedChoices=(input,options={})=>run(input,options,undefined,true);
