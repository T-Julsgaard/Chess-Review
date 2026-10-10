import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {checkWitness as checkFixation} from '../../E116-center-restraint-entry/code/check-witness.mjs';
import {checkWitness as checkInduction} from '../../E168-forced-pawn-weakness/code/check-witness.mjs';
import {checkWitness as checkSecondTarget} from '../../E153-second-target-defense/code/check-witness.mjs';
import {scopeFor} from './scopes.mjs';
// Independent admission: no detector, collector, context or derivation imports.
export function inspectScope(id,input,result) {
  const s=scopeFor(id),decision=(status,available=false)=>({id,origin:s.origin,status,available,scope:s.scope,limitations:s.limitations,proof:available?`${s.analysis}.witness`:null});
  if (input.history===undefined) return decision('history-prerequisite');
  const h=input.history;
  assert.ok(h && typeof h.fen==='string' && Array.isArray(h.moves),'Genuine history required');
  assert.equal(input[s.flag],true,'Selected source must be enabled');
  const limit=input[s.limit]??50000;
  assert.ok(Number.isSafeInteger(limit)&&limit>=0&&limit<=50000,'Invalid source budget');
  const c=legalPosition(h.fen);
  for (const move of h.moves) { assert.equal(typeof move,'string');assert.match(move,/^[a-h][1-8][a-h][1-8][qrbn]?$/);assert.ok(!c.isGameOver(),'Historical terminal position');c.move(move); }
  assert.equal(c.fen(),legalPosition(input.fen).fen(),'History does not reach root');
  const a=result[s.analysis];
  assert.ok(a,'Selected source analysis required');
  assert.equal(a.limit,input[s.limit]??50000,'Source budget mismatch');
  if (!a.witness) {
    assert.ok(!result.events.some(e=>e.evidence?.experiment===s.origin),'Unproved source event');
    assert.ok(a.nodes>=0 && a.nodes<=a.limit+1);
    return decision(a.status==='exhausted'?'source-exhausted':'source-prerequisite');
  }
  if(id==='C0541')checkFixation(a.witness,result,input);
  else if(id==='C0542')checkInduction(input,result);
  else checkSecondTarget(a.witness,result,input);
  const w=a.witness,available=id==='C0541'?!!(w.restraint?.fixed && w.restraint.bishops.some(b=>b.success)):
    id==='C0542'?!!w.forced:!!(w.newSecondTarget && w.multipleWeaknesses);
  return decision(available?'available':'scope-not-proven',available);
}
