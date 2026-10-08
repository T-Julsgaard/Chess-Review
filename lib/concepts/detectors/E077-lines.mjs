import {pawnFeatures,structuralEvents} from './E021-features.mjs';
import {legalPosition,uci} from './E020-concepts.mjs';
import {validateHistory} from './E024-transitions.mjs';
import {explainMove as parent,priority as prior} from './E076-inventories.mjs';
const ids=['connected-passer-proof','open-pawn-file-proof','open-rank-proof'];
const sorted=a=>[...a].sort(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function record(c,code){const before=c.fen(),m=c.move(code);return{uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags,before,after:c.fen()};}
function frame(c,actor,tick){
  tick();const fen=c.fen(),ep=[];
  if(fen.split(' ')[3]!=='-'){tick();for(const m of c.moves({verbose:true}).filter(m=>m.isEnPassant())){ep.push({...record(c,uci(m)),victim:m.to[0]+m.from[1]});c.undo();}ep.sort((a,b)=>a.uci.localeCompare(b.uci));}
  const pieces=c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color})).sort((a,b)=>a.square.localeCompare(b.square)),map={},classification={},passers={};
  for(const side of ['own','enemy']){const color=side==='own'?actor:actor==='w'?'b':'w',own=pieces.filter(p=>p.color===color&&p.type==='p').map(p=>p.square),enemy=pieces.filter(p=>p.color!==color&&p.type==='p').map(p=>p.square),feature=pawnFeatures(c,color);map[side]=own;classification[side]=own.map(square=>({square,blockers:enemy.filter(s=>Math.abs(s.charCodeAt(0)-square.charCodeAt(0))<=1&&(Number(s[1])-Number(square[1]))*(color==='w'?1:-1)>0),epCaptures:ep.filter(m=>m.victim===square&&m.color!==color).map(m=>m.uci),passed:feature.passed.includes(square)}));passers[side]=classification[side].filter(p=>p.passed).map(p=>p.square);}
  const files=[...'abcdefgh'].map(file=>({file,own:map.own.filter(s=>s[0]===file),enemy:map.enemy.filter(s=>s[0]===file),otherPieces:pieces.filter(p=>p.type!=='p'&&p.square[0]===file)}));
  return{fen,pieces,map,classification,passers,files,ep};
}
export const priority=e=>ids.includes(e.id)?4.1:prior(e);
export function explainMove(input){
  const enabled=input.openLineTags??false;if(typeof enabled!=='boolean')throw Error('openLineTags must be boolean');if(!enabled)return parent(input);
  const limit=input.maxOpenLineNodes??50000;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxOpenLineNodes must be integer 0..50000');
  const base=parent(input),extra=[];let nodes=0,status='no-new-fact';const finish=()=>{const events=[...base.events,...extra];return{...base,schema:'coach-concepts-v58',events,comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,openLineAnalysis:{limit,nodes,status}};};
  if(base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return finish();}
  const tick=()=>{if(++nodes>limit)throw Error('open-line-budget');};
  try{
    tick();const validated=validateHistory(input),history=validated?{fen:validated.start,moves:validated.moves}:null,c=legalPosition(history?.fen||input.fen);
    for(const code of history?.moves||[]){tick();c.move(code);}if(c.isGameOver()){status='not-live';return finish();}
    const actor=c.turn();tick();const legalMoves=c.moves({verbose:true}).map(uci).sort(),before=frame(c,actor,tick),root=legalPosition(c.fen()),played=record(c,input.move);
    if(played.after!==base.after)throw Error('Parent played position differs');if(c.isGameOver()){status='not-live';return finish();}
    const after=frame(c,actor,tick),evidence={actor,history,legalMoves,played,before,after};
    const add=(id,text,claim)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');extra.push({id,text,qualityClaim:false,evidence:{...evidence,claim}});status='proven';};
    const inherited=structuralEvents(root,c,{...played});
    if(played.piece==='p'&&!played.promotion&&after.map.own.length&&after.map.enemy.length&&after.pieces.every(p=>['k','p'].includes(p.type))){
      const beforePairs=pawnFeatures(root,actor).connected;
      for(const pair of pawnFeatures(c,actor).connected.filter(pair=>pair.includes(played.to)).sort((a,b)=>sorted(a).join('/').localeCompare(sorted(b).join('/')))){const mapped=sorted(pair.map(s=>s===played.to?played.from:s)),featureNew=inherited.some(e=>e.id==='connected-passed-pawns'&&same(sorted(e.evidence.squares),sorted(pair))),advanced=beforePairs.some(old=>same(sorted(old),mapped));
        if(featureNew||advanced){const support=[];for(const from of pair)for(const to of pair)if(Math.abs(from.charCodeAt(0)-to.charCodeAt(0))===1&&(Number(to[1])-Number(from[1]))*(actor==='w'?1:-1)===1)support.push({from,to});add('connected-passer-proof',`Connected passers: your passed pawns on ${sorted(pair).join('/')} occupy neighboring files.`,{squares:sorted(pair),eligibility:featureNew?'new':'advanced',support});}}
    }
    for(const e of inherited.filter(e=>e.id==='file-opening')){const file=e.evidence.file,prior=before.files.find(f=>f.file===file),current=after.files.find(f=>f.file===file);if(current.own.length+current.enemy.length||!prior.own.length&&!prior.enemy.length)throw Error('Reused open-file predicate differs');add('open-pawn-file-proof',`Open-file pawn structure: the ${file}-file now has no pawns of either color.`,{file,removed:{own:prior.own,enemy:prior.enemy},remainingPieces:current.otherPieces});}
    if(['r','q'].includes(played.piece)&&!played.promotion&&played.from[1]===played.to[1]){const rank=Number(played.from[1]),beforeRank=before.pieces.filter(p=>Number(p.square[1])===rank),afterRank=after.pieces.filter(p=>Number(p.square[1])===rank),destinations=[...'abcdefgh'].filter(file=>file!==played.from[0]).map(file=>file+rank);if(beforeRank.length===1&&afterRank.length===1&&destinations.every(to=>legalMoves.includes(played.from+to))){const alternatives=[];for(const to of destinations){tick();alternatives.push(record(root,played.from+to));root.undo();}const cells=[...'abcdefgh'].map(file=>({square:file+rank,before:before.pieces.find(p=>p.square===file+rank)||null,after:after.pieces.find(p=>p.square===file+rank)||null}));add('open-rank-proof',`Open rank: your ${played.piece==='r'?'rook':'queen'} moves horizontally along rank ${rank}, which contains no other piece.`,{rank,cells,alternatives});}}
  }catch(error){if(error.message!=='open-line-budget')throw error;extra.length=0;status='exhausted';}
  return finish();
}
