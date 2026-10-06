import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove, legalPosition, uci} from './concepts.mjs';
import {replayCertificate} from './certificate.mjs';

await openResearchData(['D001'], {purpose:'test'});
const {fixtures, reflect} = await import('./fixtures.mjs');

function verify(f, r) {
  const labels = r.events.map(e => e.id);
  assert.deepEqual([...labels].sort(), [...f.expected].sort(), f.id);
  for (const id of f.absent) assert.ok(!labels.includes(id), `${f.id}: unexpected ${id}`);
  assert.equal(r.diagnostics.tactics, 'complete');
  const chess = new Chess(f.fen); chess.move(f.move);
  assert.equal(r.after, chess.fen(), 'All simulations must undo, preserving rule state');
  for (const e of r.events) {
    assert.equal(e.qualityClaim, false);
    if (e.id === 'fork') replayCertificate(f.fen, f.move, e.evidence);
    if (e.id === 'allows-fork') replayCertificate(r.after, e.evidence.threat.move, e.evidence.threat);
    if (e.id === 'avoids-fork') {
      const alternative = new Chess(f.fen); alternative.move(f.alternative);
      replayCertificate(alternative.fen(), e.evidence.threat.move, e.evidence.threat);
      assert.ok(!labels.includes('allows-fork'));
    }
    if (e.id === 'absolute-pin') {
      const reply = new Chess(r.after), {blocker, slider, line} = e.evidence;
      for (const m of reply.moves({verbose:true}).filter(m => m.from === blocker)) {
        assert.ok(m.to === slider || line.includes(m.to), 'Pinned piece cannot leave line');
      }
    }
    if (e.id === 'double-check') assert.ok(chess.moves({verbose:true}).every(m => m.piece === 'k'));
  }
}

for (const f of fixtures.flatMap(f => [f, reflect(f)])) {
  test(`synthetic ${f.id}`, () => {
    if (f.invalid) assert.throws(() => explainMove(f), /Illegal move/);
    else verify(f, explainMove(f));
  });
}

test('budget exhaustion discards every tactical claim but retains known facts', () => {
  const f = fixtures.find(f => f.id === 'royal-knight');
  const r = explainMove({...f, maxNodes: 1});
  assert.deepEqual(r.events.map(e => e.id), ['check']);
  assert.equal(r.diagnostics.tactics, 'budget-exhausted');
  const c = new Chess(f.fen); c.move(f.move); assert.equal(r.after, c.fen());
});
test('avoidance requires a legal, distinct comparison and complete reply scan', () => {
  const f = fixtures.find(f => f.id === 'fork-avoidance');
  for (const options of [{alternative:null}, {alternative:f.move}, {scanReplies:false}, {maxNodes:1}]) {
    assert.ok(!explainMove({...f,...options}).events.some(e => e.id === 'avoids-fork'));
  }
  assert.throws(() => explainMove({...f, alternative:'f2f8'}), /Illegal move/);
});
test('pin description permits moves along the pin line', () => {
  const f = fixtures.find(f => f.id === 'pin-line-movement'), r = explainMove(f);
  assert.ok(new Chess(r.after).moves({verbose:true}).some(m => uci(m) === 'e7e1'));
  assert.match(r.comment, /off that line/);
});
test('invalid FEN, impossible previous king state, notation and budget fail explicitly', () => {
  assert.throws(() => legalPosition('bad'), /Invalid FEN/);
  assert.throws(() => legalPosition('4k3/8/8/8/8/8/8/K3R3 w - - 0 1'), /non-moving king/);
  const f = fixtures.find(f => f.id === 'ordinary-move');
  assert.throws(() => explainMove({...f, move:'e4'}), /UCI/);
  assert.throws(() => explainMove({...f, maxNodes:0}), /positive safe integer/);
});
test('certificates reject missing replies and altered gain rather than trusting labels', () => {
  const f = fixtures.find(f => f.id === 'royal-knight'), evidence = explainMove(f).events.find(e => e.id === 'fork').evidence;
  const missing = structuredClone(evidence); missing.proof.witnesses.pop();
  assert.throws(() => replayCertificate(f.fen, f.move, missing));
  const altered = structuredClone(evidence); altered.proof.witnesses[0].worstGain++;
  assert.throws(() => replayCertificate(f.fen, f.move, altered));
});
test('setup rights and counters cannot invent a rook, a pawn or a last double pawn move', () => {
  assert.throws(() => legalPosition('4k3/8/8/8/8/8/8/4K3 w K - 0 1'), /castling rights/);
  assert.throws(() => legalPosition('4k3/8/8/8/8/8/8/3K3R w K - 0 1'), /castling rights/);
  assert.throws(() => legalPosition('7k/8/8/4P3/8/8/8/K7 w - d6 0 1'), /en-passant state/);
  assert.throws(() => legalPosition('7k/3p4/8/3pP3/8/8/8/K7 w - d6 0 1'), /en-passant state/);
  assert.throws(() => legalPosition('7k/8/8/3pP3/8/8/8/K7 w - d6 4 1'), /en-passant state/);
  assert.throws(() => legalPosition('7k/8/8/3pP3/8/8/8/K7 w - - 2junk 1'), /counters/);
});
