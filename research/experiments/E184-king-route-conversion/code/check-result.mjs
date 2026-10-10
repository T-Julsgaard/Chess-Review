import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {checkConversion} from '../../E106-ending-conversion-policies/code/check-policy.mjs';
import {plain} from '../../E183-recorded-initiative-turnover/code/plain.mjs';
// No E184 runtime, context, policy, trace collector or proof-admission imports.
const pos=s=>[s.charCodeAt(0)-97,+s[1]-1],sq=(x,y)=>String.fromCharCode(97+x)+(y+1),dist=(a,b)=>Math.max(Math.abs(pos(a)[0]-pos(b)[0]),Math.abs(pos(a)[1]-pos(b)[1]));
function geometry(k,e,p,actor,tick){
 const forbidden=s=>dist(s,k)<=1||(pos(s)[1]===pos(p)[1]+(actor==='w'?1:-1)&&Math.abs(pos(s)[0]-pos(p)[0])===1);
 const neighbors=s=>{const ns=[];const [x,y]=pos(s);for(let a=x-1;a<=x+1;a++)for(let b=y-1;b<=y+1;b++){if(a===x&&b===y)continue;tick();if(a>=0&&a<=7&&b>=0&&b<=7)ns.push(sq(a,b));}return ns;};
 const distances={},todo=[];if(!forbidden(p)){distances[p]=0;todo.push(p);}
 while(todo.length){const s=todo.shift();tick();for(const n of neighbors(s))if(!forbidden(n)&&!Object.hasOwn(distances,n)){distances[n]=distances[s]+1;todo.push(n);}}
 const d=distances[e]??null,first=neighbors(e).filter(n=>!forbidden(n)&&d!==null&&distances[n]===d-1).sort();return{king:k,enemy:e,target:p,distance:d,shortestFirst:first,distances};
}
function proof(q,c,actor,pawn,H,baseline){
 assert.equal(q.actor,actor);assert.equal(q.pawn,pawn);assert.equal(q.plies,H);assert.equal(q.baselineFen,baseline);checkConversion(q,c);
 let cost=0,claims=false;
 function walk(n,left){
  assert.equal(n.fen,c.fen());cost++;claims||=c.isThreefoldRepetition()||c.isDrawByFiftyMoves();
  for(const r of n.probe?.responses||[]){cost++;c.move(r.move);claims||=c.isThreefoldRepetition()||c.isDrawByFiftyMoves();c.undo();}
  const prefix=n.child?n.tried:[];if(n.child){assert.ok(Array.isArray(prefix));assert.deepEqual(prefix.map(e=>e.move),n.moves.slice(0,n.moves.indexOf(n.move)));for(const e of prefix)assert.equal(e.child.win,!n.win);}else assert.equal(n.tried,undefined);
  for(const e of n.child?[...prefix,{move:n.move,child:n.child}]:(n.branches||[])){
   cost++;c.move(e.move);try{
    if(prefix.includes(e)){if(e.child.square===null){assert.ok(c.isInsufficientMaterial());assert.deepEqual(e.child,{fen:c.fen(),kind:'draw',win:false,square:null});}else checkConversion({...q,rootFen:c.fen(),pawn:e.child.square,plies:left-1,win:e.child.win,tree:e.child},c);}
    walk(e.child,left-1);
   }finally{c.undo();}
  }
 }
 walk(q.tree,H);return{cost,claims};
}
export function checkKingRoute(input,options,result){
 plain([input,options,result]);
 const H=options.plies===undefined?4:options.plies,limit=options.maxNodes===undefined?50000:options.maxNodes,enabled=options.enabled===undefined?false:options.enabled;
 assert.equal(typeof enabled,'boolean');assert.ok(Number.isSafeInteger(H)&&H>=0&&H<=6&&Number.isSafeInteger(limit)&&limit>=0&&limit<=50000);
 let nodes=0;const base={experiment:'E184',enabled,plies:H,limit,nodes:0,status:'disabled',claims:{C0622:false,C0639:false,C0623:false,C0638:false},witness:null},tick=(n=1)=>{nodes+=n;if(nodes>limit)throw Error('check-route-cap');},done=status=>({...base,nodes,status});
 function expected(){
  if(!enabled)return base;
  tick();const h=validateHistory(input);if(!h)return done('history-prerequisite');const c=legalPosition(h.start),isClaim=()=>c.isThreefoldRepetition()||c.isDrawByFiftyMoves();let claimed=isClaim();
  for(const move of h.moves){tick();c.move(move);claimed||=isClaim();}
  if(c.isGameOver())return done(claimed?'claim-rule-prerequisite':'not-live');if(claimed)return done('claim-rule-prerequisite');
  const before=c.fen(),actor=c.turn(),all=c.board().flat().filter(Boolean),p=all.find(p=>p.type==='p'&&p.color===actor);
  if(all.length!==3||!p||all.some(p=>!['p','k'].includes(p.type)))return done('material-prerequisite');
  if(options.alternative===undefined)return done('alternative-prerequisite');
  const ms=c.moves({verbose:true}),m=ms.find(m=>uci(m)===input.move),a=ms.find(m=>uci(m)===options.alternative);assert.ok(m&&a&&input.move!==options.alternative);
  if([m,a].some(m=>m.piece!=='k'||m.captured||m.promotion))return done('quiet-king-prerequisite');
  tick();c.move(input.move);const actual=c.fen(),alive=!c.isGameOver(),ac=isClaim();c.undo();tick();c.move(options.alternative);const alternative=c.fen(),altAlive=!c.isGameOver(),bc=isClaim();c.undo();
  if(ac||bc)return done('claim-rule-prerequisite');if(!alive||!altAlive)return done('not-live');
  if(!options.proofs&&!result.witness)return done('proof-prerequisite');
  const enemy=all.find(p=>p.type==='k'&&p.color!==actor).square,actualRoute=geometry(m.to,enemy,p.square,actor,tick),alternativeRoute=geometry(a.to,enemy,p.square,actor,tick),newlyBarred=alternativeRoute.shortestFirst.filter(s=>dist(s,m.to)<=1&&dist(s,a.to)>1),shoulder=actualRoute.distance!==null&&alternativeRoute.distance!==null&&actualRoute.distance>alternativeRoute.distance&&newlyBarred.length>0;
  const last=h.records.at(-1);let turning=false;const previous=last?{before:last.before,move:uci(last.move),after:last.after}:null;
  if(last?.move.piece==='k'&&!last.move.captured&&last.move.color!==actor){const old=legalPosition(last.before).board().flat().filter(Boolean).find(p=>p.type==='k'&&p.color===actor),[ox,oy]=pos(old.square),[ex,ey]=pos(last.move.from),[nx]=pos(last.move.to),[ax,ay]=pos(m.to),forward=actor==='w'?1:-1;turning=old.square===m.from&&ex===ox&&(ey-oy)*forward===2&&nx!==ex&&(ax-ox)*(nx-ex)<0&&Math.abs(ax-ox)===1&&(ay-oy)*forward===1;}
  const queries=options.proofs||result.witness.queries,audit={};
  for(const [key,move] of [['actual',input.move],['alternative',options.alternative]]){c.move(move);try{audit[key]=proof(queries[key],c,actor,p.square,H,before);tick(audit[key].cost);}finally{c.undo();}}
  if(Object.values(audit).some(a=>a.claims))return done('claim-rule-prerequisite');
  const comparative=queries.actual.win&&!queries.alternative.win,s=comparative&&shoulder,o=comparative&&turning;
  return{...base,nodes,status:s||o?'proven':'bounded-unresolved',claims:{C0622:s,C0639:s,C0623:o,C0638:o},witness:{before,actual,alternative,actor,pawn:p.square,history:input.history,played:input.move,alternativeMove:options.alternative,previous,turning,actualRoute,alternativeRoute,newlyBarred,shoulder,queries,audit}};
 }
 let wanted;try{wanted=expected();}catch(e){if(e.message!=='check-route-cap')throw e;wanted={...base,status:'exhausted',nodes:limit+1};}
 assert.deepEqual(result,wanted);return true;
}
