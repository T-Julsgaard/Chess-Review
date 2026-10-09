import assert from 'node:assert/strict';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const central = s => /^[c-f][3-6]$/.test(s);
const profile = c => units(c).filter(p => p.type === 'p' && central(p.square));
const victim = m => m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
function material(c,move,certificate) {
  const actor = c.turn(),points = () => units(c).reduce((sum,p) => sum+VALUES[p.type]*(p.color === actor ? 1 : -1),0),baseline = points();
  c.move(move);
  try {
    let minimum = points()-baseline,valid = !c.isDraw() && minimum > 0; const witnesses = [];
    for (const reply of c.moves({verbose:true})) {
      c.move(reply); try { const gain = points()-baseline; witnesses.push({reply:uci(reply),gain}); minimum = Math.min(minimum,gain); if (gain <= 0 || c.isCheckmate() || c.isDraw()) valid = false; }
      finally { c.undo(); }
    }
    if (valid) assert.deepEqual(certificate,{horizonPliesAfterCapture:1,materialValues:VALUES,minimumGain:minimum,witnesses});
    else assert.equal(certificate,null);
    return {post:c.fen(),success:valid};
  } finally { c.undo(); }
}
export function checkWitness(w,result,input) {
  const a = result.centerRestraintAnalysis;
  assert.equal(a.limit,input.maxCenterRestraintNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  assert.equal(w.experiment,'E116'); assert.deepEqual(w.history,input.history || null);
  const c = legalPosition(w.history?.fen || input.fen);
  for (const code of w.history?.moves || []) { assert.ok(!c.isGameOver()); c.move(code); }
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.ok(!c.isGameOver());
  const actor = c.turn(),m = c.move(input.move),after = c.fen(),army = units(c),replies = ordered(c);
  assert.equal(w.after,after); assert.equal(result.after,after); assert.ok(!c.isGameOver());
  assert.deepEqual(w.played,{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san,captured:m.captured || null,promotion:m.promotion || null});
  assert.deepEqual(w.inventory,army); assert.deepEqual(w.rootMoves,replies.map(uci));
  const checkFrame = (saved,remove,put) => {
    const changed = legalPosition(after); for (const square of remove) changed.remove(square);
    if (put) changed.put({type:put.type,color:put.color},put.square);
    const fields = changed.fen().split(' '); fields[3] = '-'; assert.equal(saved.fen,fields.join(' '));
    let frame; try { frame = legalPosition(saved.fen); } catch { assert.equal(saved.legal,false); assert.deepEqual(saved.moves,[]); return; }
    assert.equal(saved.legal,true); assert.deepEqual(saved.moves,ordered(frame).map(uci));
  };
  let targets = [];
  if (!m.captured && !m.promotion && m.piece !== 'k' && w.before.split(' ')[2] === '-' && after.split(' ')[2] === '-') targets = ['d4','e4','d5','e5'].filter(s => c.attackers(s,actor).includes(m.to));
  if (targets.length) {
    const x = w.control; assert.ok(x); assert.deepEqual(x.targets,targets);
    checkFrame(x.removed,[m.to],null); checkFrame(x.restored,[m.to],{square:m.from,type:m.piece,color:actor});
    const king = army.find(p => p.type === 'k' && p.color !== actor).square; assert.equal(x.king,king);
    assert.deepEqual(x.denied,targets.map(square => ({square,move:king+square})).filter(x => !w.rootMoves.includes(x.move) && w.control.removed.legal && w.control.restored.legal && w.control.removed.moves.includes(x.move) && w.control.restored.moves.includes(x.move)));
  } else assert.equal(w.control,null);
  const oldProfile = profile(c),fluid = [];
  for (const reply of replies.filter(m => m.piece === 'p')) {
    c.move(reply); let p; try { p = profile(c); } finally { c.undo(); }
    if ((central(reply.from) || central(reply.to)) && JSON.stringify(p) !== JSON.stringify(oldProfile)) fluid.push({move:uci(reply),from:reply.from,profile:p});
  }
  assert.deepEqual(w.fluid,fluid); let pair = null;
  for (let i = 0; i < fluid.length && pair === null; i++) for (let j = i+1; j < fluid.length; j++) if (fluid[i].from !== fluid[j].from && JSON.stringify(fluid[i].profile) !== JSON.stringify(fluid[j].profile)) { pair = [i,j]; break; }
  assert.deepEqual(w.selectedFluid,pair);
  const advance = m.piece === 'p' && !m.captured && !m.promotion && m.from[0] === m.to[0];
  let fixed = false,bishopSuccess = false;
  const target = m.to[0]+(+m.to[1]+(actor === 'w' ? 1 : -1)),pawn = c.get(target);
  if (advance && pawn?.type === 'p' && pawn.color !== actor && !replies.some(r => r.from === target)) {
    const x = w.restraint; assert.ok(x); assert.equal(x.target,target); checkFrame(x.removed,[m.to],null);
    const released = x.removed.legal ? x.removed.moves.filter(code => code.slice(0,2) === target) : []; assert.deepEqual(x.released,released);
    assert.equal(x.rows.length,replies.length);
    for (const [i,row] of x.rows.entries()) {
      assert.equal(row.move,uci(replies[i])); c.move(replies[i]);
      try { assert.equal(row.fen,c.fen()); assert.equal(row.retained,c.get(target)?.type === 'p' && c.get(target)?.color !== actor && c.get(m.to)?.type === 'p' && c.get(m.to)?.color === actor); }
      finally { c.undo(); }
    }
    fixed = released.length > 0 && x.rows.every(r => r.retained); assert.equal(x.fixed,fixed);
    const bishops = fixed ? army.filter(p => p.color === actor && p.type === 'b' && (p.square.charCodeAt(0)+ +p.square[1])%2 === (target.charCodeAt(0)+ +target[1])%2) : [];
    assert.ok(x.bishops.length <= bishops.length);
    for (const [index,trial] of x.bishops.entries()) {
      assert.equal(trial.square,bishops[index].square); let success = true;
      assert.ok(trial.branches.length > 0 && trial.branches.length <= replies.length);
      for (const [i,b] of trial.branches.entries()) {
        assert.equal(b.reply,uci(replies[i])); c.move(replies[i]);
        try {
          const terminal = c.isGameOver(),capture = terminal ? null : c.moves({verbose:true}).find(x => x.from === trial.square && x.to === target && x.captured === 'p');
          assert.equal(b.terminal,terminal); assert.equal(b.capture,capture ? uci(capture) : null);
          if (capture) { const audit = material(c,capture,b.proof); assert.equal(b.post,audit.post); if (!audit.success) success = false; }
          else { assert.equal(b.post,null); assert.equal(b.proof,null); success = false; }
          if (!success) assert.equal(i,trial.branches.length-1);
        } finally { c.undo(); }
      }
      if (success) { assert.equal(trial.branches.length,replies.length); assert.equal(index,x.bishops.length-1); bishopSuccess = true; }
      assert.equal(trial.success,success);
    }
    if (!bishopSuccess) assert.equal(x.bishops.length,bishops.length);
  } else assert.equal(w.restraint,null);
  const entrants = advance && central(m.from) ? army.filter(p => p.color === actor && !['k','p'].includes(p.type)) : [];
  let selectedEntry = null; assert.ok(w.entries.length <= entrants.length);
  for (const [index,trial] of w.entries.entries()) {
    assert.equal(trial.square,entrants[index].square); assert.equal(trial.type,entrants[index].type); assert.equal(trial.target,m.from);
    assert.ok(trial.branches.length > 0 && trial.branches.length <= replies.length); let success = true;
    for (const [i,b] of trial.branches.entries()) {
      assert.equal(b.reply,uci(replies[i])); c.move(replies[i]);
      try {
        const terminal = c.isGameOver(),entry = terminal ? null : c.moves({verbose:true}).find(x => x.from === trial.square && x.to === m.from && !x.captured);
        assert.equal(b.terminal,terminal); assert.equal(b.entry,entry ? uci(entry) : null); let safe = false;
        if (entry) { c.move(entry); try { assert.equal(b.post,c.fen()); const responses = ordered(c).map(x => ({move:uci(x),victim:victim(x)})); assert.deepEqual(b.responses,responses); safe = !c.isGameOver() && responses.every(x => x.victim !== m.from); } finally { c.undo(); } }
        else { assert.equal(b.post,null); assert.deepEqual(b.responses,[]); }
        assert.equal(b.safe,safe); if (!safe) { success = false; assert.equal(i,trial.branches.length-1); }
      } finally { c.undo(); }
    }
    assert.equal(trial.success,success); if (success) { assert.equal(trial.branches.length,replies.length); assert.equal(index,w.entries.length-1); selectedEntry = index; }
  }
  if (selectedEntry === null) assert.equal(w.entries.length,entrants.length); assert.equal(w.selectedEntry,selectedEntry);
  const expected = [],add = (id,text) => expected.push({id,text,qualityClaim:false,evidence:{experiment:'E116',before:w.before,after,detail:{source:'centerRestraintAnalysis.witness'}}});
  if (w.control?.denied.length) add('causal-central-king-flight-control',`Central control: ${m.san} denies king entry to ${w.control.denied.map(x => x.square).join('/')}; removing or restoring only the moved piece permits those entries.`);
  if (pair) add('fluid-legal-central-pawn-choices',`Fluid center: ${fluid[pair[0]].move} and ${fluid[pair[1]].move} are legal choices leaving different central pawn placements; their strategic quality remains unassessed.`);
  if (fixed) add('causal-enemy-pawn-restraint',`Pawn restraint: ${m.san} blocks ${target} for the opponent's current turn; every reply preserves the lock, while removing your blocker releases that pawn.`);
  if (bishopSuccess) add('bishop-color-pawn-fixation',`Bishop-color fixation: ${m.san} restrains ${target}; after every opponent reply, your same-color bishop can capture that pawn with positive immediate net material gain.`);
  if (selectedEntry !== null) add('new-all-reply-piece-entry',`Entry square: ${m.san} vacates ${m.from}; after every opponent reply, the recorded piece can enter there without any immediate legal enemy capture of it.`);
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E116'),expected); assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact');
  for (const e of expected) assert.ok(e.text.split(/\s+/).length <= 24);
}
