// Independent witness replay: does not import the detector, its material
// helpers, target selector or budget code. Uses the shared legal-move library.
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';

const notation = m => m.from + m.to + (m.promotion || '');
const material = (c, color) => c.board().flat().filter(Boolean).reduce((v,p) =>
  v + ({p:1,n:3,b:3,r:5,q:9,k:0}[p.type]) * (p.color === color ? 1 : -1), 0);
const apply = (c, value) => {
  const move = c.moves({verbose:true}).find(m => notation(m) === value);
  assert.ok(move, `Witness contains illegal move ${value}`); c.move(move); return move;
};

export function replayCertificate(fen, forkMove, evidence) {
  const root = new Chess(fen), color = root.turn(), baseline = material(root, color);
  const moved = apply(root, forkMove);
  assert.equal(evidence.attacker, moved.to);
  assert.equal(evidence.piece, moved.piece);
  assert.ok(evidence.targets.length >= 2);
  // Independent knight/pawn geometry, including all identified target squares.
  for (const target of evidence.targets) {
    const actual = root.get(target.square);
    assert.ok(actual && actual.color !== color && actual.type === target.type);
    const dx = Math.abs(target.square.charCodeAt(0) - moved.to.charCodeAt(0));
    const dy = +target.square[1] - +moved.to[1];
    assert.ok(moved.piece === 'n' ? (dx === 1 && Math.abs(dy) === 2) || (dx === 2 && Math.abs(dy) === 1)
      : dx === 1 && dy === (color === 'w' ? 1 : -1));
  }
  const replies = root.moves({verbose:true}).map(notation).sort();
  assert.deepEqual(evidence.proof.witnesses.map(w => w.reply).sort(), replies);
  assert.equal(evidence.proof.horizonPliesAfterFork, 3);
  let minimum = Infinity, leaves = 0;
  for (const witness of evidence.proof.witnesses) {
    const branch = new Chess(root.fen()); apply(branch, witness.reply);
    assert.equal(branch.isGameOver(), false);
    const capture = apply(branch, witness.capture);
    assert.equal(capture.from, moved.to);
    assert.ok(evidence.targets.some(t => t.square === capture.to && t.type === capture.captured && t.type !== 'k'));
    assert.equal(capture.color, color);
    assert.equal(capture.piece, moved.piece);
    assert.equal(witness.target, capture.to);
    assert.ok(branch.isCheckmate() || !branch.isDraw());
    let worst = material(branch, color) - baseline;
    const counters = branch.moves({verbose:true});
    assert.equal(witness.responses, counters.length);
    for (const counter of counters) {
      branch.move(counter); leaves++;
      assert.equal(branch.isCheckmate(), false);
      assert.equal(branch.isDraw(), false);
      worst = Math.min(worst, material(branch, color) - baseline);
      branch.undo();
    }
    assert.equal(witness.worstGain, worst);
    if (witness.worstReply) {
      apply(branch, witness.worstReply);
      assert.equal(material(branch, color) - baseline, worst);
    }
    assert.ok(worst > 0);
    minimum = Math.min(minimum, worst);
  }
  assert.equal(evidence.proof.minimumGain, minimum);
  return {defenderReplies: replies.length, counterreplyLeaves: leaves, minimumGain: minimum};
}
