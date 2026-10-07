import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
const ids=['pawn-skeleton','paired-bishop-armies','rook-minor-armies','passed-count-imbalance','flank-count-imbalance'];
const key=m=>m.from+m.to+(m.promotion||'');
function record(c,code){const before=c.fen(),m=c.move(code);return{uci:key(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags,before,after:c.fen()};}
function extract(fen){const pieces=[];fen.split(' ')[0].split('/').forEach((row,index)=>{let file=0;for(const ch of row){if(/\d/.test(ch))file+=Number(ch);else pieces.push({square:'abcdefgh'[file++]+(8-index),type:ch.toLowerCase(),color:ch===ch.toUpperCase()?'w':'b'});}assert.equal(file,8);});return pieces.sort((a,b)=>a.square.localeCompare(b.square));}
function frame(c,actor){
  const fen=c.fen(),pieces=extract(fen),ep=[];
  if(fen.split(' ')[3]!=='-')for(const move of c.moves({verbose:true}).filter(m=>m.flags.includes('e'))){const victim=move.to[0]+(Number(move.to[1])+(move.color==='w'?-1:1));ep.push({...record(c,key(move)),victim});c.undo();}
  ep.sort((a,b)=>a.uci.localeCompare(b.uci));
  const own=pieces.filter(p=>p.color===actor&&p.type==='p').map(p=>p.square),enemy=pieces.filter(p=>p.color!==actor&&p.type==='p').map(p=>p.square);
  const map={own,enemy,files:{},ranks:{}},armies={},classification={},passers={};
  for(const side of['own','enemy']){
    const squares=side==='own'?own:enemy,opposing=side==='own'?enemy:own,color=side==='own'?actor:actor==='w'?'b':'w';
    map.files[side]=[...'abcdefgh'].map(file=>({file,squares:squares.filter(s=>s[0]===file)}));
    map.ranks[side]=[1,2,3,4,5,6,7,8].map(rank=>({rank,squares:squares.filter(s=>Number(s[1])===rank)}));
    const men=pieces.filter(p=>p.color===color),bishops=men.filter(p=>p.type==='b').map(p=>p.square);
    armies[side]={signature:men.filter(p=>!['k','p'].includes(p.type)).map(p=>p.type).sort().join(''),bishops,
      oppositeBishopColors:bishops.some(a=>bishops.some(b=>('abcdefgh'.indexOf(a[0])+Number(a[1]))%2!==('abcdefgh'.indexOf(b[0])+Number(b[1]))%2))};
    classification[side]=squares.map(square=>{
      const blockers=opposing.filter(target=>['abcdefgh'['abcdefgh'.indexOf(square[0])-1],square[0],'abcdefgh'['abcdefgh'.indexOf(square[0])+1]].includes(target[0])&&(color==='w'?Number(target[1])>Number(square[1]):Number(target[1])<Number(square[1])));
      const epCaptures=ep.filter(move=>move.color!==color&&move.victim===square).map(move=>move.uci);
      return{square,blockers,epCaptures,passed:blockers.length===0&&epCaptures.length===0};
    });
    passers[side]=classification[side].filter(p=>p.passed).map(p=>p.square);
  }
  const wings=[['queenside','abcd'],['kingside','efgh']].map(([wing,files])=>({wing,files,own:own.filter(s=>files.includes(s[0])),enemy:enemy.filter(s=>files.includes(s[0]))}));
  return{fen,pieces,map,armies,classification,passers,wings,ep};
}
const list=squares=>squares.length?squares.join('/'):'none';
function matches(s,type){
  for(const side of['own','enemy']){const other=side==='own'?'enemy':'own',a=s.armies[side],b=s.armies[other];
    if(type==='bishop'&&a.signature==='bb'&&a.oppositeBishopColors&&(b.signature==='bn'||b.signature==='nn'))return{side,opposing:b.signature};
    if(type==='rook'&&a.signature==='r'&&['bb','bn','nn'].includes(b.signature))return{side,opposing:b.signature};
  }return null;
}
function derive(input){
  assert.equal(input.inventoryTags,true);
  const c=new Chess(input.history?.fen||input.fen),history=input.history?{fen:input.history.fen,moves:[...input.history.moves]}:null;
  for(const code of history?.moves||[]){assert.ok(!c.isGameOver());assert.ok(c.moves({verbose:true}).some(m=>key(m)===code));c.move(code);}
  assert.equal(c.fen(),new Chess(input.fen).fen());
  const legalMoves=c.moves({verbose:true}).map(key).sort(),actor=c.turn(),before=frame(c,actor);
  if(input.foundationTags===true){
    if(c.isGameOver()||!legalMoves.includes(input.move))return{status:'not-applicable',nodes:0,events:[]};
    const afterCopy=new Chess(c.fen());afterCopy.move(input.move);
    const afterPieces=extract(afterCopy.fen()),counts=color=>['p','n','b','r','q','k'].map(t=>afterPieces.filter(p=>p.type===t&&p.color===color).length);
    const different=counts(actor).some((n,index)=>n!==counts(actor==='w'?'b':'w')[index]);
    if((input.maxFoundationNodes??50000)<8+Number(different))return{status:'not-applicable',nodes:0,events:[]};
  }
  const baseNodes=1+(history?.moves.length||0);
  if(c.isGameOver())return{status:'not-live',nodes:baseNodes,events:[]};
  assert.ok(legalMoves.includes(input.move));
  const played=record(c,input.move),beforeNodes=baseNodes+1+Number(before.fen.split(' ')[3]!=='-');
  if(c.isGameOver())return{status:'not-live',nodes:beforeNodes,events:[]};
  const after=frame(c,actor),events=[],evidence={actor,history,legalMoves,played,before,after};
  const add=(id,text,claim)=>events.push({id,text,qualityClaim:false,evidence:{...evidence,claim}});
  if(before.map.own.join(',')!==after.map.own.join(',')||before.map.enemy.join(',')!==after.map.enemy.join(','))add('pawn-skeleton',`Pawn skeleton: your pawns are on ${list(after.map.own)}; your opponent's on ${list(after.map.enemy)}.`,{own:after.map.own,enemy:after.map.enemy});
  const bishop=matches(after,'bishop');
  if(bishop&&!matches(before,'bishop'))add('paired-bishop-armies',bishop.side==='own'?`Bishop pair versus ${bishop.opposing==='bn'?'bishop and knight':'two knights'}: your bishops occupy opposite square colors.`:`Your ${bishop.opposing==='bn'?'bishop and knight':'two knights'} face a bishop pair on opposite square colors.`,bishop);
  const rook=matches(after,'rook');
  if(rook&&!matches(before,'rook'))add('rook-minor-armies',rook.side==='own'?`Rook versus two minor pieces: your rook faces ${rook.opposing==='bb'?'two bishops':rook.opposing==='bn'?'a bishop and knight':'two knights'}.`:`Your ${rook.opposing==='bb'?'two bishops':rook.opposing==='bn'?'bishop and knight':'two knights'} face one rook.`,rook);
  if(after.passers.own.length!==after.passers.enemy.length&&(before.passers.own.length!==after.passers.own.length||before.passers.enemy.length!==after.passers.enemy.length))add('passed-count-imbalance',`Passed-pawn imbalance: you have ${after.passers.own.length} (${list(after.passers.own)}) versus ${after.passers.enemy.length} (${list(after.passers.enemy)}).`,{own:after.passers.own,enemy:after.passers.enemy});
  after.wings.forEach((wing,index)=>{const earlier=before.wings[index];if(wing.own.length!==wing.enemy.length&&(wing.own.length!==earlier.own.length||wing.enemy.length!==earlier.enemy.length))add('flank-count-imbalance',`${wing.wing==='queenside'?'Queenside':'Kingside'} pawn-count imbalance (${wing.files==='abcd'?'a–d':'e–h'} files): you have ${wing.own.length} pawns versus ${wing.enemy.length}.`,wing);});
  return{status:events.length?'proven':'no-new-fact',nodes:beforeNodes+1+Number(after.fen.split(' ')[3]!=='-')+events.length,events};
}
export function replay(input,event){const proof=derive(input),expected=proof.events.find(e=>e.id===event.id&&JSON.stringify(e.evidence.claim)===JSON.stringify(event.evidence.claim));assert.ok(expected,'ineligible fact');assert.deepEqual(event,expected);assert.ok(event.text.split(/\s+/).length<=24);return{kind:event.id,replies:0,leaves:0,classificationPawns:event.evidence.after.classification.own.length+event.evidence.after.classification.enemy.length,epMoves:event.evidence.before.ep.length+event.evidence.after.ep.length};}
export function replayResult(input,result){
  const expected=derive(input),limit=input.maxInventoryNodes??50000;
  const exhausted=expected.status!=='not-applicable'&&limit<expected.nodes;
  assert.deepEqual(result.inventoryAnalysis,{limit,nodes:exhausted?limit+1:expected.nodes,status:exhausted?'exhausted':expected.status});
  const own=result.events.filter(e=>ids.includes(e.id));
  assert.deepEqual(own,exhausted?[]:expected.events);
  return{state:result.inventoryAnalysis.status,certificates:own.length};
}
