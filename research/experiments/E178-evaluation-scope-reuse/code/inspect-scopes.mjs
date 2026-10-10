import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';
import {checkWitness as initiative} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
import {checkWitness as outpost} from '../../E174-comparative-piece-improvement/code/check-witness.mjs';
import {checkWitness as minor} from '../../E156-piece-objective-effectiveness/code/check-witness.mjs';
import {groupFor,scopes} from './scopes.mjs';
// One independent semantic replay per same-origin group; no detector imports.
export function inspectScopes(ids,input,result){
 const s=groupFor(ids),decisions=(status,available=false)=>ids.map(id=>({id,context:scopes[id].context,origin:s.origin,status,available,scope:scopes[id].scope,limitations:scopes[id].limitations,proof:available?s.analysis+'.witness':null}));
 if(input.history===undefined)return decisions('history-prerequisite');
 const h=input.history;assert.ok(h&&typeof h.fen==='string'&&Array.isArray(h.moves),'Genuine history required');assert.equal(input[s.flag],true,'Selected source must be enabled');
 const limit=input[s.limit]===undefined?50000:input[s.limit];assert.ok(Number.isSafeInteger(limit)&&limit>=0&&limit<=50000,'Invalid source budget');
 const c=new Chess(h.fen);for(const move of h.moves){assert.equal(typeof move,'string');assert.match(move,/^[a-h][1-8][a-h][1-8][qrbn]?$/);assert.ok(!c.isGameOver(),'Historical terminal position');c.move(move);}assert.equal(c.fen(),new Chess(input.fen).fen(),'History endpoint mismatch');assert.ok(!c.isGameOver(),'Terminal root');
 const kings=c.board().flat().filter(p=>p?.type==='k');assert.equal(kings.length,2);const enemy=kings.find(k=>k.color!==c.turn());assert.ok(enemy&&!c.isAttacked(enemy.square,c.turn()),'Opponent king already checked');
 const a=result[s.analysis];assert.ok(a,'Selected source analysis required');assert.equal(a.limit,limit);assert.ok(a.nodes>=0&&a.nodes<=limit+1);
 if(!a.witness){assert.ok(!result.events.some(e=>e.evidence?.experiment===s.origin),'Unproved source event');return decisions(a.status==='exhausted'?'source-exhausted':'source-prerequisite');}
 const w=a.witness;
 if(s.origin==='E143')initiative(w,result,input);else if(s.origin==='E174')outpost(input,result);else minor(w,result,input);
 if(s.origin==='E156'&&!w.panel.units.every(u=>['b','n'].includes(u.type)&&u.value===3))return decisions('minor-piece-prerequisite');
 const available=s.origin==='E143'?w.quietLosses.length>0&&w.defenses.length>0:s.origin==='E174'?w.improved&&w.outpost:!!w.effectiveness;
 return decisions(available?'available':'scope-not-proven',available);
}
export const inspectScope=(id,input,result)=>inspectScopes([id],input,result)[0];
