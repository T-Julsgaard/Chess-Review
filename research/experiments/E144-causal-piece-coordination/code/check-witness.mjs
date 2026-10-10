import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {replayTrace} from './trace-check.mjs';
const code=m=>m.from+m.to+(m.promotion||''),values={p:1,n:3,b:3,r:5,q:9},names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen'};
const units=(c,actor)=>c.board().flat().filter(p=>p&&p.color===actor&&p.type!=='k').map(p=>({square:p.square,type:p.type})).sort((a,b)=>a.square.localeCompare(b.square));
function frame(fen){
  const c=new Chess(fen),fields=fen.split(' '),turn=c.turn(),enemy=turn==='w'?'b':'w',king=c.board().flat().find(p=>p?.type==='k'&&p.color===enemy);assert.ok(king);assert.equal(c.isAttacked(king.square,turn),false);
  for(const [right,color,rank,file]of [['K','w','1','h'],['Q','w','1','a'],['k','b','8','h'],['q','b','8','a']])if(fields[2].includes(right)){assert.deepEqual(c.get('e'+rank),{type:'k',color});assert.deepEqual(c.get(file+rank),{type:'r',color});}
  if(fields[3]!=='-'){const ep=fields[3];assert.equal(c.get(ep),undefined);assert.equal(c.get(ep[0]+(turn==='w'?'7':'2')),undefined);assert.deepEqual(c.get(ep[0]+(turn==='w'?'5':'4')),{type:'p',color:enemy});assert.equal(+fields[4],0);}
  return c;
}
const maybe=fen=>{try{return frame(fen);}catch{return null;}};
function edited(fen,fn){const c=new Chess(fen);fn(c);return[c.fen().split(' ')[0],...fen.split(' ').slice(1)].join(' ');}
export function verifyCertificate(input,w){
  assert.equal(w.schema,'E144-coordination-certificate-v1');assert.equal(w.controlModel,'fresh-board-frame-preserve-turn-clock; not played history');assert.deepEqual(w.history,input.history);assert.ok(input.history);
  const c=frame(input.history.fen);for(const move of input.history.moves){assert.equal(c.isGameOver(),false);c.move(move);}assert.equal(c.fen(),new Chess(input.fen).fen());assert.equal(c.isGameOver(),false);
  const before=c.fen(),actor=c.turn(),legal=c.moves({verbose:true}),played=c.move(input.move),after=c.fen(),H=input.coordinationPlies??2;assert.equal(w.before,before);assert.equal(w.after,after);assert.equal(w.actor,actor);assert.equal(w.played,code(played));assert.equal(w.san,played.san);assert.equal(w.plies,H);assert.deepEqual(w.units,units(c,actor));
  let nodes=3+input.history.moves.length+w.removals.length+w.relocations.length+Number(w.core!==null),context=null;
  const check=(board,q,where)=>{const replay=replayTrace(board,q,actor,H);nodes+=replay.nodes;if(replay.claim)context=where;};check(c,w.actual,{kind:'actual'});
  const checkEmpty=()=>{assert.deepEqual(w.removals,[]);assert.deepEqual(w.relocations,[]);assert.equal(w.core,null);};
  if(context||!w.actual.tree.win)checkEmpty();
  else{
    assert.deepEqual(w.removals.map(r=>({square:r.square,type:r.type})),w.units.slice(0,w.removals.length));
    for(const [i,row]of w.removals.entries()){
      assert.equal(row.fen,edited(after,c=>c.remove(row.square)));const board=maybe(row.fen);
      if(!board){assert.equal(row.status,'illegal-frame');assert.equal(row.query,null);assert.equal(row.necessary,null);}else{assert.equal(row.status,'queried');check(board,row.query,{kind:'removal',index:i});assert.equal(row.necessary,!row.query.tree.win);}
      if(context){assert.equal(i,w.removals.length-1);break;}
    }
    if(context){assert.deepEqual(w.relocations,[]);assert.equal(w.core,null);}
    else{
      assert.equal(w.removals.length,w.units.length);const expected=w.removals.filter(r=>r.necessary&&r.square!==played.to).flatMap(role=>legal.filter(m=>m.from===role.square&&!m.captured&&!m.promotion&&!/[+#]/.test(m.san)).sort((a,b)=>code(a).localeCompare(code(b))).map(m=>({square:role.square,type:role.type,move:code(m),destination:m.to})));
      assert.deepEqual(w.relocations.map(r=>({square:r.square,type:r.type,move:r.move,destination:r.destination})),expected.slice(0,w.relocations.length));
      for(const [i,row]of w.relocations.entries()){
        assert.equal(row.before,edited(before,c=>{const unit=c.remove(row.square);c.put(unit,row.destination);}));const board=maybe(row.before);
        if(!board){assert.equal(row.status,'illegal-frame');assert.equal(row.after,null);assert.equal(row.query,null);continue;}
        let moved=true;try{board.move(input.move);}catch{moved=false;}
        if(!moved){assert.equal(row.status,'actual-move-unavailable');assert.equal(row.after,null);assert.equal(row.query,null);continue;}
        assert.equal(row.status,'queried');assert.equal(row.after,board.fen());check(frame(row.after),row.query,{kind:'relocation',index:i});if(context){assert.equal(i,w.relocations.length-1);break;}
      }
      if(context)assert.equal(w.core,null);
      else{
        assert.equal(w.relocations.length,expected.length);assert.ok(w.core);const kept=w.removals.filter(r=>r.necessary).map(r=>r.square),removed=w.units.filter(u=>!kept.includes(u.square)).map(u=>u.square);assert.deepEqual(w.core.kept,kept);assert.deepEqual(w.core.removed,removed);assert.equal(w.core.fen,edited(after,c=>{for(const sq of removed)c.remove(sq);}));const board=maybe(w.core.fen);
        if(!board){assert.equal(w.core.status,'illegal-frame');assert.equal(w.core.query,null);}else{assert.equal(w.core.status,'queried');check(board,w.core.query,{kind:'core'});}
      }
    }
  }
  assert.deepEqual(w.claimContext,context);assert.equal(w.nodes,nodes);return{nodes,context};
}
export function checkWitness(w,result,input){
  const verified=verifyCertificate(input,w),a=result.coordinationAnalysis;assert.equal(result.after,w.after);assert.equal(a.nodes,verified.nodes);assert.equal(a.limit,input.maxCoordinationNodes??50000);assert.equal(a.plies,input.coordinationPlies??2);assert.ok(a.nodes<=a.limit);assert.deepEqual(a.nominalValues,values);
  const expected=[],add=(id,text)=>expected.push({id,text,qualityClaim:false,evidence:{experiment:'E144',before:w.before,after:w.after,detail:{source:'coordinationAnalysis.witness'}}});
  if(!verified.context&&w.actual.tree.win){
    const necessary=w.removals.filter(r=>r.necessary),helpers=necessary.filter(r=>r.square!==input.move.slice(2,4));
    if(necessary.some(r=>r.square===input.move.slice(2,4))&&helpers.length>=2&&w.core?.query?.tree.win)add('cooperating-mating-core',`Cooperating mating core: ${w.core.kept.length} units plus the king suffice; each was independently necessary in the full position’s ${w.plies}-ply mate policy.`);
    const failed=w.relocations.find(r=>r.query&&!r.query.tree.win);if(failed)add('placement-dependent-piece-quality',`Piece activity: ${names[failed.type]} ${failed.square} enables the ${w.plies}-ply mate; relocating it to ${failed.destination} preserves nominal material but fails that bound.`);
    const redundant=w.removals.filter(r=>r.query?.tree.win);let pair=null;for(const low of helpers){const high=redundant.find(r=>values[r.type]>values[low.type]);if(high){pair={low,high};break;}}
    if(pair)add('nominal-versus-role',`Approximate nominal values: pawn1, knight3, bishop3, rook5, queen9. Here ${names[pair.low.type]} ${pair.low.square} is necessary; ${names[pair.high.type]} ${pair.high.square} is dispensable within the mating bound.`);
  }
  assert.deepEqual(result.events.filter(e=>e.evidence?.experiment==='E144'),expected);assert.equal(a.status,verified.context?'claim-rule-prerequisite':!w.actual.tree.win?'no-certified-mate':expected.length?'proven':'compared');
}
