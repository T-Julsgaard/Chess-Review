import {Chess} from '../../../../lib/chess.js';
import {uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {explainMove as parent,priority as parentPriority} from '../../E028-mating-patterns/code/patterns.mjs';
const board=input=>{const c=new Chess(input.history?.fen||input.fen);if(input.history)for(const m of input.history.moves)c.move(m);return c;};
const order=m=>m.san.includes('#')?0:m.san.includes('+')?1:m.captured?2:3;
function solve(c,winner,plies,budget){
 budget.tick();if(c.isCheckmate())return{win:c.turn()!==winner,kind:'mate',fen:c.fen()};if(c.isDraw())return{win:false,kind:'draw',fen:c.fen()};if(!plies)return{win:false,kind:'limit',fen:c.fen()};
 budget.tick();const moves=c.moves({verbose:true}).sort((a,b)=>order(a)-order(b)||uci(a).localeCompare(uci(b))),attacker=c.turn()===winner,branches=[];
 for(const m of moves){budget.tick();c.move(m);let child;try{child=solve(c,winner,plies-1,budget);}finally{c.undo();}
  if(child.win===attacker)return{win:attacker,kind:attacker?'choice':'counterchoice',move:uci(m),child};branches.push({move:uci(m),child});
 }
 if(!moves.length)throw Error('Unclassified terminal board');return{win:!attacker,kind:attacker?'all-fail':'all',branches};
}
export function query(c,winner,plies,budget){const rootFen=c.fen(),tree=solve(c,winner,plies,budget);return{rootFen,winner,plies,tree};}
export function priority(e){return e.id==='missed-mate'?188:e.id==='forced-mate'?158:parentPriority(e);}
export function selectComment(events){return [...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;}
function continuation(after,proof){
 const c=new Chess(after.fen()),moves=[];let node=proof.tree;
 while(node.kind==='all'&&node.branches.length===1||node.kind==='choice'){
  const edge=node.kind==='all'?node.branches[0]:{move:node.move,child:node.child},turn=c.turn(),m=c.move(edge.move);moves.push({move:edge.move,san:m.san,turn});node=edge.child;
 }
 if(node.kind==='mate'&&node.win)return{kind:'unique',moves};
 const branches=proof.tree.branches;if(proof.plies===2&&branches?.length&&branches.every(b=>b.child.kind==='choice'&&b.child.child.kind==='mate'&&b.child.child.win)&&new Set(branches.map(b=>b.child.move)).size===1){
  const sans=branches.map(b=>{const c=new Chess(after.fen());c.move(b.move);return c.move(b.child.move).san;});if(new Set(sans).size===1)return{kind:'shared-mate',move:branches[0].child.move,san:sans[0],replies:branches.length};
 }
 return{kind:'branching',replies:branches?.length||0};
}
export function explainMove(input){
 const depth=input.mateDepth??0,limit=input.maxMateNodes??50000,compare=input.compareAlternatives??true;
 if(![0,2,3].includes(depth))throw Error('mateDepth must be 0, 2 or 3');if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxMateNodes must be an integer from 0 to 50000');if(typeof compare!=='boolean')throw Error('compareAlternatives must be boolean');
 const base=parent(input);if(!depth)return base;const before=board(input);if(before.isGameOver())throw Error('History-terminal position cannot continue');const after=board(input),played=after.move(input.move),winner=played.color,budget={nodes:0,tick(){if(++this.nodes>limit)throw Error('mate-budget');}},actual=[],alternatives=[],extra=[];let status='complete';
 try{if(!after.isCheckmate()){
  let actualDepth=null;for(let n=2;n<=depth;n++){const proof=query(after,winner,2*n-2,budget);actual.push({mateIn:n,proof});if(proof.tree.win){actualDepth=n;const line=continuation(after,proof),number=n===2?'two':'three',text=line.kind==='unique'?`${played.san} forces mate in ${number}: ${line.moves.map(m=>(m.turn==='b'?'...':'')+m.san).join(' ')}.`:line.kind==='shared-mate'?`${played.san} forces mate in ${number}: all ${line.replies} legal replies allow ${line.san}.`:`Forced mate in ${number}: every legal defense can be met by a mating continuation.`;extra.push({id:'forced-mate',text,evidence:{mateIn:n,proof,continuation:line,shorterFailures:actual.filter(a=>a.mateIn<n)},qualityClaim:false});break;}}
  if(compare)for(let n=1;n<=depth&&(!actualDepth||n<actualDepth);n++){
   const proof=query(before,winner,2*n-1,budget);alternatives.push({mateIn:n,proof});if(!proof.tree.win)continue;
   const failure=n===1?{rootFen:after.fen(),winner,plies:0,tree:{win:false,kind:after.isDraw()?'draw':'limit',fen:after.fen()}}:actual.find(a=>a.mateIn===n)?.proof;
   if(!failure||failure.tree.win)throw Error('Missing played-move counterstrategy');const alternative=proof.tree.move;if(alternative===uci(played))throw Error('Counterfactual selected played move');const c=board(input),m=c.move(alternative),number=n===1?'one':n===2?'two':'three';
   const text=n===1&&after.isStalemate()?`Mate in one was available with ${m.san}; your move causes stalemate.`:`You had mate in ${number} with ${m.san}; this move does not force mate within ${number}.`;
   extra.push({id:'missed-mate',text,evidence:{mateIn:n,alternative,san:m.san,proof,playedFailure:failure,played:uci(played),stalemate:after.isStalemate()},qualityClaim:false});break;
  }
 }}catch(error){if(error.message!=='mate-budget')throw error;status='exhausted';extra.length=0;actual.length=0;alternatives.length=0;}
 const events=[...base.events,...extra],comment=selectComment(events);if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v10',events,comment,mateAnalysis:{profile:depth,compareAlternatives:compare,maxMateNodes:limit,nodes:budget.nodes,status,actual,alternatives}};
}
