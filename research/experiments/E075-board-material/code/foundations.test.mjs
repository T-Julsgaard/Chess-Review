import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove} from './foundations.mjs';
import {replay} from './replay.mjs';
import {explainMove as parent} from '../../E074-french-scheveningen/code/centers.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const basic = {fen: '7k/7p/8/8/8/8/P7/K7 w - - 0 1', move: 'a2a4', foundationTags: true};
const fixtures = [
  basic,
  {...basic, move: 'a2a5'},
  {...basic, move: 'h7h6'},
  {...basic, move: 'c3c4'},
  {fen: '7k/7p/8/8/8/5N2/P7/K7 w - - 0 1', move: 'f3d4'},
  {fen: '6k1/7p/8/8/8/2B5/P7/K7 w - - 0 1', move: 'c3d4'},
  {fen: '7k/7p/8/8/8/2R5/P7/K7 w - - 0 1', move: 'c3d3'},
  {fen: '6k1/7p/8/8/8/2Q5/P7/K7 w - - 0 1', move: 'c3d4'},
  {fen: '7k/7p/8/8/8/8/P7/K7 w - - 0 1', move: 'a1b1'},
  {fen: 'r3k2r/pp5p/8/8/8/8/PP5P/R3K2R w KQkq - 0 1', move: 'e1g1'},
  {fen: 'r3k2r/pp5p/8/8/8/8/PP5P/R3K2R w KQkq - 0 1', move: 'e1c1'},
  {fen: '7k/8/8/3pP3/8/8/P7/K7 w - d6 0 1', move: 'e5d6'},
  {fen: '7k/8/8/3pP3/8/8/P7/K7 w - - 0 1', move: 'e5d6'},
  {fen: '4r2k/7p/8/8/8/8/4R3/4K3 w - - 0 1', move: 'e2d2'},
  {fen: '7k/7p/8/8/8/8/P7/K7 w - - 0 1', move: 'a2a4q'},
  ...['q', 'r', 'b', 'n'].map(promotion => ({fen: '7k/P6p/8/8/8/8/8/K7 w - - 0 1', move: 'a7a8' + promotion})),
  {fen: '7k/P6p/8/8/8/8/8/K7 w - - 0 1', move: 'a7a8'},
].map(f => ({...f, foundationTags: true}));
for (const [index, fixture] of fixtures.entries()) test('synthetic input proof ' + index, () => {
  const result = explainMove(fixture);
  const rejected = [1, 2, 3, 12, 13, 14, 19].includes(index);
  assert.equal(result.foundationAnalysis.status, rejected ? 'rejected' : 'accepted');
  const ownEvents = result.events.filter(event => ['piece-movement', 'board-coordinates', 'legal-input', 'illegal-input', 'material-inventory', 'nominal-balance', 'material-imbalance'].includes(event.id));
  assert.ok(ownEvents.length);
  for (const event of ownEvents) replay(fixture, event);
  if (rejected) {
    assert.deepEqual(ownEvents.map(event => event.id), ['illegal-input']);
    assert.equal(ownEvents[0].evidence.played, null);
    assert.equal(ownEvents[0].evidence.after, null);
  } else assert.ok(ownEvents.some(event => event.id === 'piece-movement'));
});
test('default exact parent and atomic budget boundary', () => {
  assert.deepEqual(explainMove({...basic, foundationTags: undefined}), parent(basic));
  const result = explainMove(basic), nodes = result.foundationAnalysis.nodes;
  assert.equal(explainMove({...basic, maxFoundationNodes: nodes}).foundationAnalysis.status, 'accepted');
  for (const limit of [0, nodes - 1]) {
    const limited = explainMove({...basic, maxFoundationNodes: limit});
    assert.equal(limited.foundationAnalysis.status, 'exhausted');
    assert.deepEqual(limited.events, parent(basic).events);
    assert.equal(limited.comment, parent(basic).comment);
  }
  for (const limit of [-1, 0.5, NaN, 50001]) assert.throws(() => explainMove({...basic, maxFoundationNodes: limit}));
  assert.throws(() => explainMove({...basic, foundationTags: 1}));
  assert.throws(() => explainMove({...basic, move: 'a4'}), /UCI/);
});
test('terminal root unavailable, not a fabricated illegal move', () => {
  const result = explainMove({fen: '7k/8/8/8/8/8/8/K7 w - - 0 1', move: 'a1b1', foundationTags: true});
  assert.equal(result.foundationAnalysis.status, 'unavailable');
  assert.deepEqual(result.events, []);
});
test('tampered proof fields and comments fail independent replay', () => {
  const event = explainMove(basic).events.find(event => event.id === 'nominal-balance');
  for (const mutate of [e => e.from.rank++, e => e.legalMoves.pop(), e => e.originMoves.pop(),
    e => e.accepted = false, e => e.after.balance++, e => e.after.counts.own.p++,
    e => e.values.p = 2, e => e.after.pieces.pop(), e => e.played.to = 'a5']) {
    const forged = structuredClone(event); mutate(forged.evidence);
    assert.throws(() => replay(basic, forged));
  }
  assert.throws(() => replay(basic, {...event, qualityClaim: true}));
  assert.throws(() => replay(basic, {...event, text: event.text + ' Winning.'}));
});
test('equal nominal points do not erase different bishop and knight armies', () => {
  const input = {fen: '7k/6np/8/8/8/2B5/P7/K7 w - - 0 1', move: 'a2a3', foundationTags: true};
  const result = explainMove(input), imbalance = result.events.find(event => event.id === 'material-imbalance');
  assert.ok(imbalance);
  assert.equal(imbalance.evidence.after.balance, 0);
  assert.equal(imbalance.evidence.after.unequalArmies, true);
  replay(input, imbalance);
});
test('en-passant delta removes the off-destination enemy pawn and adds one nominal point', () => {
  const input = fixtures[11], result = explainMove(input);
  const event = result.events.find(event => event.id === 'nominal-balance');
  assert.equal(event.evidence.after.balance - event.evidence.before.balance, 1);
  assert.ok(event.evidence.before.pieces.some(piece => piece.square === 'd5' && piece.color === 'b'));
  assert.ok(!event.evidence.after.pieces.some(piece => piece.square === 'd5'));
});
test('black actor uses absolute coordinates and its own nominal balance', () => {
  const input = {fen: '7k/7p/8/8/8/8/P7/K7 b - - 0 1', move: 'h7h5', foundationTags: true};
  const result = explainMove(input), event = result.events.find(event => event.id === 'board-coordinates');
  assert.deepEqual(event.evidence.to, {square: 'h5', file: 'h', rank: 5});
  assert.equal(event.evidence.actor, 'b');
  for (const e of result.events.filter(e => e.evidence?.legalMoves)) replay(input, e);
});
test('history must match and terminal repetition returns unavailable', () => {
  const input = {...basic, fen: '6k1/7p/8/8/8/8/P7/K7 w - - 2 2',
    history: {fen: basic.fen, moves: ['a1b1', 'h8g8']}, move: 'a2a3'};
  assert.throws(() => explainMove(input), /History does not match/);
  input.fen = '6k1/7p/8/8/8/8/P7/1K6 w - - 2 2';
  const result = explainMove(input);
  for (const event of result.events.filter(event => event.evidence?.legalMoves)) replay(input, event);
  const repetition = {...basic, fen: '7k/7p/8/8/8/8/P7/K7 w - - 8 5',
    history: {fen: basic.fen, moves: ['a1b1', 'h8g8', 'b1a1', 'g8h8', 'a1b1', 'h8g8', 'b1a1', 'g8h8']}};
  assert.equal(explainMove(repetition).foundationAnalysis.status, 'unavailable');
});
test('disabled illegal input still throws, exhausted enabled input abstains', () => {
  const input = {...basic, move: 'a2a5'};
  assert.throws(() => explainMove({...input, foundationTags: false}), /Illegal move/);
  const result = explainMove({...input, maxFoundationNodes: 0});
  assert.equal(result.foundationAnalysis.status, 'exhausted');
  assert.equal(result.foundationAnalysis.accepted, false);
  assert.deepEqual(result.events, []);
  assert.equal(result.comment, null);
});
