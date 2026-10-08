import {Chess} from '../chess.js';
import {explainMove} from './detectors/E080-shield.mjs';
import {findingsFor} from './registry.js';
import {FLAGS, BUDGETS} from './profile.js';

export function conceptInput(input, detailed = true) {
  const options = {...input, scanReplies: detailed, maxNodes: detailed ? 4000 : 1,
    mateDepth: detailed ? 3 : 0, promotionDepth: detailed ? 6 : 0,
    kingSupportDepth: detailed ? 6 : 0, pawnRaceDepth: detailed ? 6 : 0,
    compareAlternatives: true};
  for (const key of FLAGS) options[key] = true;
  for (const key of BUDGETS) options[key] = detailed ? 4000 : 0;
  for (const key of ['maxTacticNodes', 'maxBroadNodes']) options[key] = detailed ? 4000 : 1;
  // Complete inexpensive inventories and geometric proofs before bounded searches.
  for (const key of ['maxFoundationNodes', 'maxInventoryNodes', 'maxOpenLineNodes', 'maxPlacementNodes']) options[key] = 4000;
  return options;
}

// The research comment selector sometimes suppresses basic rules at terminal moves.
// Retain its exact detectors; add only directly validated played-move rule facts.
export function ruleFacts(result, input) {
  const before = new Chess(input.fen), move = before.move(input.move);
  if (before.fen() !== result.after) throw Error('Concept resulting position differs');
  const events = [...result.events], add = (id, text, evidence) => {
    if (!events.some(e => e.id === id)) events.push({id, text, evidence, qualityClaim: false});
  };
  if (before.isCheck()) add('check', 'Check: the resulting position attacks the opponent’s king.', {});
  if (move.captured) add('capture', `Capture: the ${move.captured === 'p' ? 'pawn' : move.captured === 'n' ? 'knight' : move.captured === 'b' ? 'bishop' : move.captured === 'r' ? 'rook' : 'queen'} is removed from ${move.isEnPassant() ? move.to[0] + move.from[1] : move.to}.`, {});
  if (move.promotion) add('promotion', `Promotion: the pawn becomes a ${move.promotion === 'q' ? 'queen' : move.promotion === 'r' ? 'rook' : move.promotion === 'b' ? 'bishop' : 'knight'}.`,
    {piece: move.promotion, underpromotion: move.promotion !== 'q'});
  if (move.isKingsideCastle() || move.isQueensideCastle()) add('castling', `You castled ${move.isKingsideCastle() ? 'kingside' : 'queenside'}.`, {wing: move.isKingsideCastle() ? 'kingside' : 'queenside'});
  if (move.isEnPassant()) add('en-passant', `En passant: ${move.to} removes the pawn from ${move.to[0] + move.from[1]}.`, {from: move.from, to: move.to, capturedSquare: move.to[0] + move.from[1]});
  return {...result, events};
}

function diagnostics(result) {
  const issues = [];
  function visit(value, path) {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (key === 'events' || key === 'evidence' || key === 'tree' || key === 'actual' || key === 'alternatives') continue;
      if (key === 'exhausted' && item === true || typeof item === 'string' && /exhausted|unavailable|short-profile/.test(item)) issues.push(`${path}.${key}: ${item}`);
      else if (typeof item === 'object') visit(item, path + '.' + key);
    }
  }
  visit(result, 'detector');
  return [...new Set(issues)];
}

export function analyzeConcepts(input, verified, detailed = true) {
  const started = performance.now();
  try {
    const result = ruleFacts(explainMove(conceptInput(input, detailed)), input);
    const mapped = findingsFor(result, verified);
    // Retain only the ownership needed by coach presentation, not full search trees.
    const mover = new Chess(input.fen).turn();
    for (const finding of mapped.findings) {
      const evidence = result.events.find(e => e.id === finding.event && e.text === finding.text)?.evidence;
      finding.context = {mover};
      if (finding.event === 'overloaded-defender' && evidence?.defender) {
        const {color, type, square} = evidence.defender;
        finding.context.defender = {color, type, square};
      }
    }
    const unavailable = [...mapped.unavailable];
    if (!input.history) unavailable.push('Move history unavailable: history-dependent claims abstain.');
    if (input.history && input.history.fen !== new Chess().fen()) unavailable.push('Initial-position history unavailable: original-piece opening claims abstain.');
    return {...mapped, unavailable, issues: detailed ? diagnostics(result) : [], errors: [], timeMs: performance.now() - started};
  } catch (error) {
    return {findings: [], unavailable: [], issues: [], errors: [error.message], timeMs: performance.now() - started};
  }
}
