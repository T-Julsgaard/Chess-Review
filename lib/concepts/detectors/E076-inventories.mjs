import {Chess} from '../../chess.js';
import {legalPosition,uci} from './E020-concepts.mjs';
import {positionFeatures} from './E021-features.mjs';
import {validateHistory} from './E024-transitions.mjs';
import {explainMove as parent,priority as prior} from './E075-foundations.mjs';
const ids=['pawn-skeleton','paired-bishop-armies','rook-minor-armies','passed-count-imbalance','flank-count-imbalance'];
const list=squares=>squares.join('/')||'none';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function record(c,code){const before=c.fen(),m=c.move(code);return{uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags,before,after:c.fen()};}
function snapshot(c,actor,tick){
  tick();const fen=c.fen(),fields=fen.split(' '),ep=[];
  if(fields[3]!=='-'){
    tick();for(const m of c.moves({verbose:true}).filter(m=>m.isEnPassant())){
      ep.push({...record(c,uci(m)),victim:m.to[0]+m.from[1]});c.undo();
    }ep.sort((a,b)=>a.uci.localeCompare(b.uci));
  }
  fields[3]='-';const geometric=new Chess(fields.join(' ')),ownFeature=positionFeatures(geometric,actor),enemyFeature=positionFeatures(geometric,actor==='w'?'b':'w');
  const pieces=c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color})).sort((a,b)=>a.square.localeCompare(b.square));
  const own=pieces.filter(p=>p.type==='p'&&p.color===actor).map(p=>p.square),enemy=pieces.filter(p=>p.type==='p'&&p.color!==actor).map(p=>p.square);
  const map={own,enemy,files:Object.fromEntries(['own','enemy'].map(side=>[side,[...'abcdefgh'].map(file=>({file,squares:(side==='own'?own:enemy).filter(s=>s[0]===file)}))])),ranks:Object.fromEntries(['own','enemy'].map(side=>[side,Array.from({length:8},(_,i)=>({rank:i+1,squares:(side==='own'?own:enemy).filter(s=>Number(s[1])===i+1)}))]))};
  const army=(feature)=>({signature:feature.ownArmy,bishops:[...feature.bishops].sort(),oppositeBishopColors:feature.bishopPair});
  const armies={own:army(ownFeature),enemy:army(enemyFeature)};
  const classify=(side)=>{
    const squares=side==='own'?own:enemy,opponent=side==='own'?enemy:own,color=side==='own'?actor:actor==='w'?'b':'w',feature=side==='own'?ownFeature:enemyFeature;
    return squares.map(square=>{const blockers=opponent.filter(target=>Math.abs(target.charCodeAt(0)-square.charCodeAt(0))<=1&&(Number(target[1])-Number(square[1]))*(color==='w'?1:-1)>0),captures=ep.filter(m=>m.victim===square&&m.color!==color);return{square,blockers,epCaptures:captures.map(m=>m.uci),passed:feature.pawns.passed.includes(square)&&captures.length===0};});
  };
  const classification={own:classify('own'),enemy:classify('enemy')};
  const passers={own:classification.own.filter(p=>p.passed).map(p=>p.square),enemy:classification.enemy.filter(p=>p.passed).map(p=>p.square)};
  const wings=ownFeature.pawns.majorities.map(({wing,files})=>({wing,files,own:own.filter(s=>files.includes(s[0])),enemy:enemy.filter(s=>files.includes(s[0]))}));
  return{fen,pieces,map,armies,classification,passers,wings,ep};
}
function bishopMatch(s){for(const side of['own','enemy']){const other=side==='own'?'enemy':'own';if(s.armies[side].signature==='bb'&&s.armies[side].oppositeBishopColors&&['bn','nn'].includes(s.armies[other].signature))return{side,opposing:s.armies[other].signature};}return null;}
function rookMatch(s){for(const side of['own','enemy']){const other=side==='own'?'enemy':'own';if(s.armies[side].signature==='r'&&['bb','bn','nn'].includes(s.armies[other].signature))return{side,opposing:s.armies[other].signature};}return null;}
export const priority=e=>ids.includes(e.id)?4.2:prior(e);
export function explainMove(input){
  const enabled=input.inventoryTags??false;
  if(typeof enabled!=='boolean')throw Error('inventoryTags must be boolean');
  if(!enabled)return parent(input);
  const limit=input.maxInventoryNodes??50000;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxInventoryNodes must be integer 0..50000');
  const base=parent(input),extra=[];let nodes=0,status='no-new-fact';
  const finish=()=>{const events=[...base.events,...extra];return{...base,schema:'coach-concepts-v57',events,comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,inventoryAnalysis:{limit,nodes,status}};};
  if(base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return finish();}
  const tick=()=>{if(++nodes>limit)throw Error('inventory-budget');};
  try{
    tick();const validated=validateHistory(input),history=validated?{fen:validated.start,moves:validated.moves}:null,c=legalPosition(history?.fen||input.fen);
    for(const code of history?.moves||[]){tick();c.move(code);}
    if(c.isGameOver()){status='not-live';return finish();}
    const actor=c.turn(),legalMoves=c.moves({verbose:true}).map(uci).sort(),before=snapshot(c,actor,tick),played=record(c,input.move);
    if(played.after!==base.after)throw Error('Parent played position differs');
    if(c.isGameOver()){status='not-live';return finish();}
    const after=snapshot(c,actor,tick),evidence={actor,history,legalMoves,played,before,after};
    const add=(id,text,claim)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');extra.push({id,text,qualityClaim:false,evidence:{...evidence,claim}});status='proven';};
    if(!same(before.map.own,after.map.own)||!same(before.map.enemy,after.map.enemy))add('pawn-skeleton',`Pawn skeleton: your pawns are on ${list(after.map.own)}; your opponent's on ${list(after.map.enemy)}.`,{own:after.map.own,enemy:after.map.enemy});
    const pair=bishopMatch(after);
    if(pair&&!bishopMatch(before))add('paired-bishop-armies',pair.side==='own'?`Bishop pair versus ${pair.opposing==='bn'?'bishop and knight':'two knights'}: your bishops occupy opposite square colors.`:`Your ${pair.opposing==='bn'?'bishop and knight':'two knights'} face a bishop pair on opposite square colors.`,pair);
    const rook=rookMatch(after);
    if(rook&&!rookMatch(before))add('rook-minor-armies',rook.side==='own'?`Rook versus two minor pieces: your rook faces ${rook.opposing==='bb'?'two bishops':rook.opposing==='bn'?'a bishop and knight':'two knights'}.`:`Your ${rook.opposing==='bb'?'two bishops':rook.opposing==='bn'?'bishop and knight':'two knights'} face one rook.`,rook);
    const counts=s=>[s.passers.own.length,s.passers.enemy.length];
    if(after.passers.own.length!==after.passers.enemy.length&&!same(counts(before),counts(after)))add('passed-count-imbalance',`Passed-pawn imbalance: you have ${after.passers.own.length} (${list(after.passers.own)}) versus ${after.passers.enemy.length} (${list(after.passers.enemy)}).`,{own:after.passers.own,enemy:after.passers.enemy});
    for(const wing of after.wings){const previous=before.wings.find(w=>w.wing===wing.wing);if(wing.own.length!==wing.enemy.length&&!same([previous.own.length,previous.enemy.length],[wing.own.length,wing.enemy.length]))add('flank-count-imbalance',`${wing.wing==='queenside'?'Queenside':'Kingside'} pawn-count imbalance (${wing.files==='abcd'?'a–d':'e–h'} files): you have ${wing.own.length} pawns versus ${wing.enemy.length}.`,wing);}
  }catch(error){if(error.message!=='inventory-budget')throw error;extra.length=0;status='exhausted';}
  return finish();
}
