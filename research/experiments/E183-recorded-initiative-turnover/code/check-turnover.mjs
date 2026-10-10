import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {Chess} from '../../../../lib/chess.js';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {checkWitness as tempoCheck} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
import {checkWitness as defenseCheck} from '../../E169-passive-defense-counterplay/code/check-witness.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {plain} from './plain.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
const flags=c=>({mate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient:c.isInsufficientMaterial(),fifty:c.isDrawByFiftyMoves(),threefold:c.isThreefoldRepetition()});
const desc=m=>({move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,enPassant:m.isEnPassant(),victim:m.captured?(m.isEnPassant()?m.to[0]+m.from[1]:m.to):null});
const cache=[];
// Independent gates, history, policy solving and work; no new runtime, context,
// collector or policy solver imported. Plain-data shape is the neutral helper.
export function checkTurnover(source,input,result,options,decision,mode='inspect'){
  assert.ok(['inspect','evaluate'].includes(mode));assert.ok(['tempo','defense'].includes(source));
  assert.ok(options&&typeof options==='object'&&!Array.isArray(options));assert.ok(Object.keys(options).every(k=>['priorAlternative','priorPlies','priorTree','maxTurnoverNodes'].includes(k)));
  const H=options.priorPlies===undefined?0:options.priorPlies,limit=options.maxTurnoverNodes===undefined?50000:options.maxTurnoverNodes;
  assert.ok(Number.isSafeInteger(H)&&H>=0&&H<=3);assert.ok(Number.isSafeInteger(limit)&&limit>=0&&limit<=50000);
  if(options.priorAlternative!==undefined)assert.match(options.priorAlternative,/^[a-h][1-8][a-h][1-8][qrbn]?$/);
  if(options.priorTree!==undefined)assert.ok(options.priorTree&&typeof options.priorTree==='object'&&!Array.isArray(options.priorTree));
  const enabled=source==='tempo'?'forcingTempoTags':'defenseComparisonTags',capKey=source==='tempo'?'maxForcingTempoNodes':'maxDefenseComparisonNodes';assert.equal(input[enabled],true);
  const cap=input[capKey]===undefined?50000:input[capKey];assert.ok(Number.isSafeInteger(cap)&&cap>=0&&cap<=50000);
  for(const [key,fallback,max]of source==='tempo'?[['forcingTempoPlies',2,2]]:[['counterplayPlies',2,3],['passiveLossPlies',3,3]]){const value=input[key]===undefined?fallback:input[key];assert.ok(Number.isSafeInteger(value)&&value>=0&&value<=max);}
  const expected={experiment:'E183',source,status:'history-prerequisite',limit,nodes:0,claims:{C0595:false,C0596:false,C0597:false},witness:null};
  const done=status=>{expected.status=status;assert.deepEqual(decision,expected);return true;},exhausted=()=>{expected.nodes=limit+1;return done('exhausted');};
  expected.nodes=2;if(expected.nodes>limit)return exhausted();
  const history=validateHistory(input);if(!history)return done('history-prerequisite');if(!history.moves.length)return done('history-span-prerequisite');
  const analysis=result?.[source==='tempo'?'forcingTempoAnalysis':'defenseComparisonAnalysis'],w=analysis?.witness;if(!w)return done('source-prerequisite');
  assert.ok(Number.isSafeInteger(analysis.nodes)&&analysis.nodes>=0&&analysis.nodes<=cap,'Source proof exceeds declared source cap');
  const entry=[source,input,result];plain(entry);
  if(!cache.some(old=>isDeepStrictEqual(old,entry))){if(source==='tempo')tempoCheck(w,result,input);else defenseCheck(input,result);cache.push(structuredClone(entry));}
  expected.nodes+=analysis.nodes;if(expected.nodes>limit)return exhausted();
  const prefix=history.moves.slice(0,-1),last=history.moves.at(-1),priorBoard=new Chess(input.history.fen);for(const move of prefix)priorBoard.move(move);
  const previousActor=priorBoard.turn(),prior={fen:priorBoard.fen(),actor:previousActor,flags:flags(priorBoard)};
  const priorInput={fen:priorBoard.fen(),history:{fen:input.history.fen,moves:prefix},move:options.priorAlternative,retrogradeCalculationPlies:H};
  const previous=desc(priorBoard.moves({verbose:true}).find(m=>code(m)===last));priorBoard.move(last);
  const actor=priorBoard.turn(),king=priorBoard.board().flat().find(p=>p?.color===actor&&p.type==='k').square;
  const currentBefore={fen:priorBoard.fen(),actor,checked:priorBoard.isCheck(),flags:flags(priorBoard),checkers:priorBoard.attackers(king,previousActor).sort().map(square=>({square,...priorBoard.get(square)}))};
  const actual=priorBoard.moves({verbose:true}).find(m=>code(m)===input.move);assert.ok(actual);const current=desc(actual);priorBoard.move(input.move);
  const currentAfter={fen:priorBoard.fen(),turn:priorBoard.turn(),flags:flags(priorBoard),checked:priorBoard.isCheck()};
  expected.nodes+=history.moves.length+1;if(expected.nodes>limit)return exhausted();
  if(options.priorAlternative===undefined)return done('prior-alternative-prerequisite');if(options.priorAlternative===last)return done('prior-contrast-prerequisite');
  const before=new Chess(input.history.fen);for(const move of prefix)before.move(move);
  const oldMove=before.moves({verbose:true}).find(m=>code(m)===options.priorAlternative);assert.ok(oldMove);const priorAlternative=desc(oldMove);before.move(options.priorAlternative);if(!before.isCheck())return done('prior-checking-prerequisite');
  if(source==='tempo'?w.panel.claimContext:w.claim)return done('claim-rule-prerequisite');
  const graph=options.priorTree===undefined&&mode==='evaluate'?decision.witness?.priorTree:options.priorTree;
  if(graph===undefined)return done('prior-tree-prerequisite');
  verifyTree(priorInput,graph);expected.nodes+=graph.nodes;if(expected.nodes>limit)return exhausted();
  const values=Array(graph.tree.length);
  function solve(id){
    const n=graph.tree[id];const children=n.edges.map(e=>({edge:e,value:solve(e.child)}));
    let win=n.kind==='mate'&&n.outcome===previousActor,checkingWin=win,rank=win?0:null;
    if(n.kind==='branch'){
      if(n.turn===previousActor){win=children.some(c=>c.value.win);const good=children.filter(c=>c.value.checkingWin&&new Chess(graph.tree[c.edge.child].fen).isCheck());checkingWin=good.length>0;if(checkingWin)rank=1+Math.min(...good.map(c=>c.value.rank));}
      else{win=children.every(c=>c.value.win);checkingWin=children.every(c=>c.value.checkingWin);if(checkingWin)rank=1+Math.max(...children.map(c=>c.value.rank));}
    }
    return values[id]={win,checkingWin,rank};
  }
  solve(0);expected.nodes+=values.length;if(expected.nodes>limit)return exhausted();
  if(graph.claimNodes.length)return done('claim-rule-prerequisite');
  const policy=[];
  function witness(id){if(!values[id].checkingWin)return;const n=graph.tree[id],selected=[];for(const edge of n.edges)if(n.turn!==previousActor||values[edge.child].checkingWin&&new Chess(graph.tree[edge.child].fen).isCheck())selected.push(edge);policy.push({node:id,fen:n.fen,turn:n.turn,rank:values[id].rank,moves:selected.map(e=>e.move)});for(const edge of selected)witness(edge.child);}
  witness(0);
  const query=source==='tempo'?w.panel.rows.find(r=>r.move===input.move).actor:w.panel.variants.find(v=>v.move===input.move).own;
  function checks(n){
    if(!n.win)return false;if(n.kind==='mate')return priorBoard.isCheckmate()&&priorBoard.turn()!==actor;
    const own=priorBoard.turn()===actor;if(own&&n.kind!=='choice'||!own&&n.kind!=='all')return false;
    const branches=own?[{move:n.move,child:n.child}]:n.branches;let valid=branches.length>0;
    for(const branch of branches){priorBoard.move(branch.move);try{if(own&&!priorBoard.isCheck()||!checks(branch.child))valid=false;}finally{priorBoard.undo();}}
    return valid;
  }
  const earlierChecking=values[0].checkingWin,currentChecking=currentAfter.checked&&checks(query.tree),loss=earlierChecking&&currentChecking,live=Object.values(currentAfter.flags).every(v=>!v);
  expected.claims={C0595:loss,C0596:loss&&live,C0597:loss&&live&&currentBefore.checked};
  expected.witness={source,priorInput,priorTree:graph,priorValues:values,priorPolicy:policy,frames:{prior,currentBefore,currentAfter},previous,current,priorAlternative,actors:{lost:previousActor,seized:actor},earlierBound:H+1,currentBound:query.plies+1,earlierChecking,currentChecking};
  return done(loss?'proven':'bounded-unresolved');
}
