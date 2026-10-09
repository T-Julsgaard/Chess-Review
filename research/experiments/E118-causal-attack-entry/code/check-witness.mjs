import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const near = (a,b) => Math.abs(a.charCodeAt(0)-b.charCodeAt(0)) <= 2 && Math.abs(+a[1]-+b[1]) <= 2;
const wing = s => /^[a-c]/.test(s) ? 'queenside' : /^[f-h]/.test(s) ? 'kingside' : null;
export function checkWitness(w,result,input) {
  const a = result.attackEntryAnalysis,H = input.attackEntryPlies ?? 2;
  assert.equal(a.plies,H); assert.equal(a.limit,input.maxAttackEntryNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  assert.equal(w.experiment,'E118'); assert.deepEqual(w.history,input.history || null);
  const c = legalPosition(input.history?.fen || input.fen);
  for (const code of input.history?.moves || []) { assert.ok(!c.isGameOver()); c.move(code); }
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.ok(!c.isGameOver());
  assert.equal(c.fen().split(' ')[2],'-'); assert.ok(units(c).length <= 10);
  const old = legalPosition(c.fen()),actor = c.turn(),m = c.move(input.move),after = c.fen(),army = units(c);
  assert.equal(w.after,after); assert.equal(result.after,after); assert.ok(!c.isGameOver()); assert.ok(!m.captured && !m.promotion && !['k','p'].includes(m.piece));
  assert.deepEqual(w.played,{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san}); assert.deepEqual(w.inventory,army);
  const king = army.find(p => p.type === 'k' && p.color !== actor).square;
  assert.equal(w.king,king); assert.ok(!near(m.from,king) && near(m.to,king));
  const partners = army.filter(p => p.color === actor && p.type !== 'k' && p.type !== 'p' && p.square !== m.to && near(p.square,king));
  assert.ok(partners.length); assert.deepEqual(w.partners,partners);
  const contacts = units(old).filter(p => p.color !== actor && p.type !== 'k' && wing(p.square) === wing(m.from) && old.attackers(p.square,actor).includes(m.from));
  assert.deepEqual(w.contacts,contacts);
  const audit = (position,p) => { assert.equal(p.winner,actor); assert.equal(p.plies,H); return replayQuery(position,p).win; };
  const actual = audit(c,w.actual); let causal = false;
  if (!actual) { assert.equal(w.fresh,null); assert.equal(w.restored,null); assert.equal(w.removed,null); }
  else {
    assert.ok(w.fresh);
    if (!audit(legalPosition(after),w.fresh)) { assert.equal(w.restored,null); assert.equal(w.removed,null); }
    else {
      const checkFrame = (x,restore) => {
        assert.ok(x); const changed = legalPosition(after); changed.remove(m.to);
        if (restore) changed.put({type:m.piece,color:actor},m.from);
        const fields = changed.fen().split(' '); fields[3] = '-'; assert.equal(x.fen,fields.join(' '));
        let p; try { p = legalPosition(x.fen); } catch { /* Independently refuse illegal control. */ }
        assert.equal(x.legal,!!p); if (!p) { assert.equal(x.proof,null); return false; }
        return !audit(p,x.proof);
      };
      const restored = checkFrame(w.restored,true),removed = checkFrame(w.removed,false); causal = restored && removed;
    }
  }
  const expected = [],add = (id,text) => expected.push({id,text,qualityClaim:false,evidence:{experiment:'E118',before:w.before,after,detail:{source:'attackEntryAnalysis.witness'}}});
  if (causal) {
    add('causal-mating-reinforcement',`Reinforcement: ${m.san} joins ${partners.map(p => p.square).join('/')} near the enemy king; restoring or removing the arrival separately stops this ${H}-ply mate.`);
    const rank = s => actor === 'w' ? +s[1] : 9-+s[1];
    if (m.piece === 'q' && rank(m.from) <= 4 && rank(m.to) >= 5) add('causal-queen-infiltration',`Queen infiltration: ${m.san} enters the enemy half near its king; restoring or removing only your queen separately stops this ${H}-ply mate.`);
    if (wing(m.from) && wing(m.to) && wing(m.from) !== wing(m.to)) {
      add('causal-mating-wing-switch',`Wing switch: ${m.san} crosses from ${wing(m.from)} to ${wing(m.to)}; restoring or removing only that piece separately stops this ${H}-ply mate.`);
      if (contacts.length) add('causal-attack-switch-with-prior-contact',`Attack switch: ${m.san} leaves geometric contact with ${contacts.map(p => p.square).join('/')} on the other wing and becomes necessary for this ${H}-ply mate.`);
    }
  }
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E118'),expected);
  assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact'); assert.ok(expected.every(e => e.text.split(/\s+/).length <= 24)); return true;
}
