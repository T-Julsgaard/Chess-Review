import {Chess} from '../../../../lib/chess.js';import assert from 'node:assert/strict';
const values={p:1,n:3,b:3,r:5,q:9,k:0},uci=m=>m.from+m.to+(m.promotion||'');
const record=m=>({uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
const balance=(c,actor)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===actor?1:-1),0);
function captureProof(before,code){
 const c=new Chess(before),move=c.moves({verbose:true}).find(m=>uci(m)===code);assert.ok(move?.captured);const actor=move.color,start=balance(c,actor);c.move(code);
 if(c.isDraw())return null;let minimum=balance(c,actor)-start;const witnesses=[];
 for(const reply of c.moves({verbose:true})){c.move(uci(reply));const gain=c.isCheckmate()||c.isDraw()?-Infinity:balance(c,actor)-start;c.undo();if(gain<=0)return null;minimum=Math.min(minimum,gain);witnesses.push({reply:uci(reply),gain});}
 return minimum>0?{horizonPliesAfterCapture:1,materialValues:values,minimumGain:minimum,witnesses}:null;
}
function checkPressure(p){
 const before=new Chess(p.before),actor=before.turn(),c=new Chess(p.before),played=c.move(p.played.uci);assert.deepEqual(record(played),p.played);assert.equal(c.fen(),p.after);assert.ok(!c.isGameOver());assert.equal(balance(c,actor),p.baseline);
 const fields=c.fen().split(' ');fields[1]=actor;fields[3]='-';assert.equal(fields.join(' '),p.hypotheticalActorFen);
 const initial=new Chess(p.hypotheticalActorFen).moves({verbose:true}).filter(m=>m.from===played.to&&m.captured==='q'&&!before.attackers(m.to,actor).includes(played.from));
 assert.deepEqual(initial.map(uci),p.initialCaptures);assert.equal(initial[0].to,p.queen);
 assert.deepEqual(c.moves({verbose:true}).map(uci),p.branches.map(b=>b.reply.uci));let responses=0,losses=0,refutations=0;
 for(const b of p.branches){const reply=c.move(b.reply.uci);assert.deepEqual(record(reply),b.reply);assert.equal(c.fen(),b.after);assert.equal(c.isGameOver(),b.terminal);
  const queenMoved=reply.from===p.queen&&reply.piece==='q';assert.equal(b.queenMoved,queenMoved);
  const target=queenMoved?reply.to:p.queen,attacker=c.get(played.to),queenPresent=c.get(target)?.type==='q'&&c.get(target)?.color!==actor;
  const captures=c.isGameOver()?[]:c.moves({verbose:true}).filter(m=>m.from===played.to&&m.to===target&&m.captured==='q');let expected,proof=null;
  if(c.isGameOver())expected='refutation-terminal';
  else if(captures.length){proof=captureProof(c.fen(),uci(captures[0]));expected=proof?(proof.minimumGain+balance(c,actor)-p.baseline>0?'certified-queen-loss':'refutation-net-gain'):'refutation-capture-gain';}
  else if(queenMoved||attacker?.color!==actor||!queenPresent||!c.attackers(target,actor).includes(played.to))expected='capture-threat-removed';
  else expected='refutation-nondefensive-check-or-pin';
  assert.equal(b.kind,expected);assert.deepEqual(b.proof,proof);assert.equal(b.materialOffset,balance(c,actor)-p.baseline);assert.equal(b.minimumGainFromThreat,proof?proof.minimumGain+b.materialOffset:null);
  if(proof){assert.deepEqual(record(captures[0]),b.capture);if(expected==='certified-queen-loss')losses++;else refutations++;}else{assert.equal(b.capture,null);if(expected==='capture-threat-removed')responses++;else refutations++;}
  c.undo();
 }
 assert.equal(p.responses,responses);assert.equal(p.losses,losses);assert.equal(p.refutations,refutations);assert.equal(p.proven,p.branches.length>0&&responses>0&&losses>0&&!refutations);return true;
}
export function checkWitness(w,result){
 const root=new Chess(w.history?.fen||w.before);for(const move of w.history?.moves||[]){assert.ok(!root.isGameOver());root.move(move);}
 assert.equal(root.fen(),w.before);const played=root.move(w.played.uci);assert.deepEqual(record(played),w.played);assert.equal(root.fen(),w.after);
 if(w.current)checkPressure(w.current);if(w.previous)checkPressure(w.previous);
 if(w.harassment){assert.ok(w.current.proven&&w.previous.proven);assert.equal(w.previous.played.to,w.played.from);
  assert.equal(w.previous.queen,w.harassment.queenFrom);assert.equal(w.current.queen,w.harassment.queenTo);
  const h=new Chess(w.history.fen);for(const m of w.history.moves)h.move(m);const last=h.history({verbose:true}).at(-1);
  assert.equal(last.piece,'q');assert.equal(last.from,w.harassment.queenFrom);assert.equal(last.to,w.harassment.queenTo);}
 for(const reuse of w.reusedHanging){const proof=captureProof(w.after,reuse.capture);assert.deepEqual(proof,reuse.proof);
  if(result){const e=result.events[reuse.eventIndex];assert.equal(e.id,'hanging-piece');assert.equal(e.evidence.capture,reuse.capture);assert.deepEqual(e.evidence.proof,proof);}}
 return true;
}
