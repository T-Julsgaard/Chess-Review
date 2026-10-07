import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code=m=>m.from+m.to+(m.promotion||''), values={p:1,n:3,b:3,r:5,q:9,k:0};
const material=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+(p.color===color?1:-1)*values[p.type],0);
const sorted=moves=>moves.sort((a,b)=>code(a).localeCompare(code(b)));
const row=m=>({move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before:m.before,after:m.after});
export function replay(f,event) {
 assert.equal(event.id,'desperado-capture');assert.equal(event.qualityClaim,false);
 const before=legalPosition(f.history?.fen||f.fen),c=legalPosition(f.history?.fen||f.fen);
 if(f.history)for(const move of f.history.moves){assert.ok(!c.isGameOver());before.move(move);c.move(move);}
 assert.equal(c.fen(),legalPosition(f.fen).fen());assert.ok(!c.isGameOver());
 const e=event.evidence,played=c.move(f.move),color=played.color,enemy=c.turn();
 assert.deepEqual(e.played,row(played));assert.equal(e.before,before.fen());assert.equal(e.after,c.fen());assert.equal(e.color,color);
 assert.deepEqual(e.unit,{square:played.from,type:played.piece,color});assert.ok('nbrq'.includes(played.piece));
 assert.equal(e.cost,values[played.piece]);assert.equal(e.capturedValue,values[played.captured]);assert.ok(e.capturedValue>0&&e.capturedValue<=e.cost);
 const label={n:'knight',b:'bishop',r:'rook',q:'queen'}[played.piece];
 assert.equal(event.text,`Desperado ${label}: captures ${e.capturedValue} points before recapture; every quiet alternative loses at least ${e.cost}.`);
 assert.equal(e.initialBalance,material(before,color));assert.equal(e.horizonPlies,3);assert.ok(!c.isGameOver());
 assert.deepEqual(e.initialAttackers,before.attackers(played.from,enemy).sort());assert.ok(e.initialAttackers.length);
 const originals=sorted(before.moves({verbose:true})),captures=originals.filter(m=>m.from===played.from&&m.captured);
 assert.deepEqual(e.unitCaptures,captures.map(m=>({move:code(m),value:values[m.captured]})));
 assert.equal(e.maximumCaptureValue,Math.max(...captures.map(m=>values[m.captured])));assert.equal(e.capturedValue,e.maximumCaptureValue);
 const quiet=originals.filter(m=>!m.captured);assert.ok(quiet.length);
 assert.deepEqual(e.quietBranches.map(b=>b.alternative.move),quiet.map(code));let leaves=0;
 for(let i=0;i<quiet.length;i++) {
  const alternative=before.move(code(quiet[i])),b=e.quietBranches[i];assert.deepEqual(b.alternative,row(alternative));assert.ok(!before.isGameOver());
  let square=alternative.from===played.from?alternative.to:played.from;
  if(played.piece==='r'&&alternative.piece==='k'&&Math.abs(alternative.to.charCodeAt(0)-alternative.from.charCodeAt(0))===2) {
   const right=alternative.to[0]==='g',old=(right?'h':'a')+alternative.from[1];
   if(played.from===old) square=(right?'f':'d')+alternative.from[1];
  }
  assert.deepEqual(b.unit,{square,type:played.piece,color});assert.deepEqual(before.get(square),{type:played.piece,color});
  const capture=before.move(b.capture.move);assert.deepEqual(b.capture,row(capture));assert.equal(capture.to,square);assert.equal(capture.captured,played.piece);
  assert.ok(!before.isDraw());assert.equal(b.terminal,before.isCheckmate()?'mate':'live');
  let greatest=material(before,color)-e.initialBalance;assert.ok(greatest<=-e.cost);
  const responses=sorted(before.moves({verbose:true}));assert.deepEqual(b.responses.map(r=>r.move),responses.map(code));
  for(let j=0;j<responses.length;j++) {
   const response=before.move(code(responses[j])),gain=material(before,color)-e.initialBalance;
   assert.deepEqual(b.responses[j],{...row(response),gain});assert.ok(!before.isGameOver());assert.ok(gain<=-e.cost);greatest=Math.max(greatest,gain);leaves++;before.undo();
  }
  assert.equal(b.greatestGain,greatest);before.undo();before.undo();
 }
 const recaptures=sorted(c.moves({verbose:true}).filter(m=>m.to===played.to&&m.captured===played.piece));assert.ok(recaptures.length);
 assert.deepEqual(e.acceptances.map(b=>b.capture.move),recaptures.map(code));let minimum=Infinity;
 for(let i=0;i<recaptures.length;i++) {
  const capture=c.move(code(recaptures[i])),b=e.acceptances[i];assert.deepEqual(b.capture,row(capture));assert.ok(!c.isGameOver());
  let worst=material(c,color)-e.initialBalance;assert.equal(worst,e.capturedValue-e.cost);assert.equal(b.acceptedGain,worst);
  const responses=sorted(c.moves({verbose:true}));assert.deepEqual(b.responses.map(r=>r.move),responses.map(code));
  for(let j=0;j<responses.length;j++) {
   const response=c.move(code(responses[j])),gain=material(c,color)-e.initialBalance;
   assert.deepEqual(b.responses[j],{...row(response),gain});assert.ok(!c.isGameOver());assert.ok(gain>=e.capturedValue-e.cost);worst=Math.min(worst,gain);leaves++;c.undo();
  }
  assert.equal(b.minimumGain,worst);minimum=Math.min(minimum,worst);c.undo();
 }
 assert.equal(e.minimumGain,minimum);
 return {passed:true,replies:quiet.length+recaptures.length,leaves,minimumGain:minimum};
}
