import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {replay as replayDecoy} from '../../E043-mating-decoys/code/replay.mjs';
const code=m=>m.from+m.to+(m.promotion||''),roleKey=r=>[r.kind,r.accept,r.mate].join('/');
export function replay(f,event,result){
 assert.ok(['attraction-combination','decoy-combination','blocking-combination'].includes(event.id));assert.equal(event.qualityClaim,false);
 assert.ok(result&&Array.isArray(result.events),'Full same-row result is required to resolve the certificate');
 const e=event.evidence;assert.equal(e.parentEvent,'mating-decoy');
 const parents=result.events.filter(p=>p.id===e.parentEvent);assert.equal(parents.length,1);
 const c=legalPosition(f.history?.fen||f.fen);
 if(f.history){assert.ok(Array.isArray(f.history.moves)&&f.history.moves.length<=1000);for(const m of f.history.moves){assert.ok(!c.isGameOver());c.move(m);}}
 assert.equal(c.fen(),legalPosition(f.fen).fen());assert.ok(!c.isGameOver());assert.equal(e.beforeFen,c.fen());
 const played=c.move(f.move);assert.equal(e.played,code(played));assert.equal(e.color,played.color);assert.equal(e.afterFen,c.fen());assert.equal(result.after,c.fen());
 const certificate=parents[0],counts=replayDecoy(f,certificate),proof=certificate.evidence;
 assert.equal(proof.sacrifice.mateIn,2);assert.equal(e.nominalCost,proof.sacrifice.nominalLoss);assert.ok(e.nominalCost>0);
 const allowed=event.id==='attraction-combination'?['king-attraction']:event.id==='blocking-combination'?['self-blocking-decoy']:['king-attraction','self-blocking-decoy'];
 const eligible=proof.roles.filter(r=>allowed.includes(r.kind)).sort((a,b)=>roleKey(a).localeCompare(roleKey(b)));
 assert.ok(eligible.length);assert.deepEqual(e.roleKeys,eligible.map(roleKey));assert.equal(e.selectedRole,roleKey(eligible[0]));
 const role=eligible[0],branches=proof.sacrifice.proof.tree.branches;
 assert.deepEqual(e.defenses,branches.map(b=>b.move).sort());assert.ok(branches.some(b=>b.move===role.accept&&b.child.win));
 const label=event.id==='attraction-combination'?'Attraction combination':event.id==='blocking-combination'?'Blocking combination':'Decoy combination';
 const prefix=played.color==='w'?'...':'';
 const line=event.id==='blocking-combination'?`${role.mateSan} mates with ${role.blocker.square} blocked`:role.mateSan;
 assert.equal(event.text,`${label}: if ${prefix}${role.acceptSan}, ${line}; every legal defense permits mate next move.`);
 assert.ok(event.text.split(/\s+/).length<=24);
 return{passed:true,replies:counts.replies,leaves:counts.leaves,eligibleRoles:eligible.length};
}
