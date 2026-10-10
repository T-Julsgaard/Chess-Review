import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
const material=(c,a)=>c.board().flat().filter(Boolean).reduce((s,p)=>s+({p:1,n:3,b:3,r:5,q:9,k:0}[p.type])*(p.color===a?1:-1),0);
export function checkQuery(q,c) {
  assert.equal(q.rootFen,c.fen());assert.ok(Number.isSafeInteger(q.plies)&&q.plies>=0&&q.plies<=6);let count=0;
  function visit(n,unit,left) {
    count++;assert.equal(n.fen,c.fen());assert.equal(n.unit,unit);assert.equal(n.left,left);
    if(c.isGameOver()){assert.equal(n.kind,'terminal');assert.equal(n.win,false);assert.equal(n.mate,c.isCheckmate());assert.equal(n.draw,c.isDraw());assert.equal(n.probe,null);return;}
    const piece=unit&&c.get(unit);let goal=false;
    if(piece?.type==='q'&&piece.color===q.actor&&c.turn()!==q.actor) {
      const probe=n.probe;assert.ok(probe);assert.equal(probe.gain,material(c,q.actor)-q.baseline);const moves=c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b))),goods=[];
      assert.deepEqual(probe.replies.map(r=>r.move),moves.map(code));
      for(const [i,m]of moves.entries()){c.move(code(m));const p=c.get(unit),gain=material(c,q.actor)-q.baseline,good=p?.type==='q'&&p.color===q.actor&&gain>=8&&!c.isGameOver();assert.deepEqual(probe.replies[i],{move:code(m),after:c.fen(),gain,good:!!good});goods.push(!!good);c.undo();}
      assert.equal(probe.win,goods.every(Boolean));goal=probe.gain>=8&&probe.win;
    }else assert.equal(n.probe,null);
    if(goal){assert.equal(n.kind,'queen');assert.equal(n.win,true);return;}
    if(!left){assert.equal(n.kind,'limit');assert.equal(n.win,false);return;}
    const own=c.turn()===q.actor,moves=c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b)));assert.deepEqual(n.moves,moves.map(code));
    const follow=(move,child)=>{const m=moves.find(m=>code(m)===move);assert.ok(m);let next=unit;if(m.color===q.actor&&m.from===unit)next=m.to;else if(m.color!==q.actor&&m.captured&&m.to===unit)next=null;c.move(move);try{visit(child,next,left-1);}finally{c.undo();}};
    if(n.kind==='choice'||n.kind==='counterchoice'){assert.equal(n.kind,own?'choice':'counterchoice');assert.equal(n.win,own);assert.equal(n.child.win,own);follow(n.move,n.child);}
    else{assert.equal(n.kind,own?'all-fail':'all');assert.equal(n.win,!own);assert.deepEqual(n.branches.map(b=>b.move),moves.map(code));for(const b of n.branches){assert.equal(b.child.win,!own);follow(b.move,b.child);}}
  }
  visit(q.tree,q.pawn,q.plies);assert.equal(c.fen(),q.rootFen);return count;
}
export function checkWitness(w,result,input) {
  assert.equal(w.experiment,'E135');assert.deepEqual(w.history,input.history??null);
  const c=legalPosition(w.history?.fen||input.fen),start=c.fen(),actor=w.actor,first=c.board().flat().filter(Boolean);let traced=first.find(p=>p.color===actor&&p.type==='r')?.square,quiet=true;
  for(const move of w.history?.moves||[]){assert.equal(c.isGameOver(),false);const m=c.move(move);if(m.piece==='p'||m.captured||m.promotion)quiet=false;if(m.color===actor&&m.from===traced)traced=m.to;}
  assert.equal(c.fen(),legalPosition(input.fen).fen());assert.equal(w.before,c.fen());assert.equal(w.actor,c.turn());assert.equal(c.isGameOver(),false);assert.equal(c.isCheck(),true);
  const pieces=c.board().flat().filter(Boolean);assert.equal(pieces.length,5);assert.equal(pieces.filter(p=>p.type==='k').length,2);assert.equal(pieces.filter(p=>p.type==='r').length,2);assert.equal(pieces.filter(p=>p.type==='p').length,1);
  for(const [s,t,a]of [[w.pawn,'p',w.actor],[w.rook,'r',w.actor],[w.king,'k',w.actor],[w.enemyRook,'r',w.actor==='w'?'b':'w']])assert.deepEqual({type:c.get(s)?.type,color:c.get(s)?.color},{type:t,color:a});
  const rr=s=>w.actor==='w'?Number(s[1]):9-Number(s[1]);assert.equal(rr(w.pawn),7);assert.ok(!['a','h'].includes(w.pawn[0]));
  const baseline=material(c,w.actor),m=c.move(input.move);assert.equal(m.piece,'r');assert.equal(m.from,w.rook);assert.equal(m.captured,undefined);assert.equal(w.played,code(m));assert.equal(w.san,m.san);assert.equal(w.after,c.fen());assert.equal(result.after,w.after);assert.equal(c.isGameOver(),false);
  for(const fen of [w.before,w.after])assert.deepEqual(fen.split(' ').slice(2,4),['-','-']);assert.equal(rr(m.to),4);assert.equal(m.to[0],w.pawn[0]);assert.equal(w.king[0],w.pawn[0]);assert.equal(w.enemyRook[0],w.pawn[0]);assert.equal(Math.abs(+w.king[1]-+m.to[1]),1);
  const lo=Math.min(+w.king[1],+w.enemyRook[1]),hi=Math.max(+w.king[1],+w.enemyRook[1]),ray=[];for(let r=lo+1;r<hi;r++)ray.push(w.pawn[0]+r);
  assert.deepEqual(w.ray,ray);assert.ok(ray.includes(m.to));for(const s of ray)assert.equal(c.get(s)?.type,s===m.to?'r':undefined);
  const initialPawn=first.find(p=>p.color===w.actor&&p.type==='p'),initialRook=first.find(p=>p.color===w.actor&&p.type==='r'),initialKing=first.find(p=>p.color===w.actor&&p.type==='k'),enemyKing=first.find(p=>p.color!==w.actor&&p.type==='k'),s=legalPosition(start);let initial=null;
  if(w.history?.moves.length&&quiet&&first.length===5&&initialPawn?.square===w.pawn&&initialRook&&traced===w.rook&&initialKing.square===w.pawn[0]+(w.actor==='w'?'8':'1')){
    const pf=w.pawn.charCodeAt(0),rf=initialRook.square.charCodeAt(0),ef=enemyKing.square.charCodeAt(0),cutoff=[];for(let r=1;r<=8;r++){const sq=initialRook.square[0]+r;if(sq!==initialRook.square)cutoff.push(sq);}
    if(Math.abs(ef-pf)>=2&&rf>Math.min(pf,ef)&&rf<Math.max(pf,ef)&&cutoff.every(sq=>!s.get(sq)))initial={start,pawn:w.pawn,king:initialKing.square,rook:initialRook.square,enemyKing:enemyKing.square,cutoff};
  }
  assert.deepEqual(w.initial,initial);assert.equal(w.query.actor,w.actor);assert.equal(w.query.pawn,w.pawn);assert.equal(w.query.baseline,baseline);assert.equal(w.query.plies,input.rookBridgePlies??4);checkQuery(w.query,c);
  const events=result.events.filter(e=>e.evidence?.experiment==='E135'),expected=w.query.tree.win?['completed-rook-bridge',...(initial?['recorded-lucena-bridge']:[])]:[];assert.deepEqual(events.map(e=>e.id),expected);assert.equal(result.rookBridgeAnalysis.status,w.query.tree.win?'proven':'no-promotion-policy');
  for(const e of events){assert.equal(e.qualityClaim,false);assert.deepEqual(e.evidence,{experiment:'E135',before:w.before,after:w.after,detail:{source:'rookBridgeAnalysis.witness'}});assert.equal(e.text,e.id==='completed-rook-bridge'?`Rook bridge: ${m.san} shields the king and guarantees a surviving queen promotion within ${w.query.plies} plies, with at least eight material points gained.`:`Recorded Lucena bridge: ${m.san} completes the king's shield and guarantees a surviving queen promotion within ${w.query.plies} plies.`);}
}
