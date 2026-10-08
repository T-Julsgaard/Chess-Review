// Presentation policy only: ranks every accepted finding without changing its proof.
const terminal = new Set(['checkmate', 'stalemate', 'insufficient-material']);
const forcing = /forced-mate|missed-mate|mate-in-one|unique-mate-defense|quiet-mating|mating-combination|mating-decoy|sacrifice|attraction-combination|decoy-combination|blocking-combination|pawn-shield-defense/;
const tactical = /fork|skewer|pin|overloaded|defender|saving-piece|defending-piece|eliminating-attacker|counterattack|intermediate|desperado|double-attack|double-check|discovered-check|square-clearance|interference-combination|trapped|dominated|octopus/;
const defense = /defensive|active-defense|luft|stalemate|promotion-route|safe-promotion|pawn-race|king-promotion|waiting-move|reserve-pawn-tempo/;
const activity = /outpost|invasion|penetration|rook-swing|battery|open-file|semi-open|rook-seventh|two-rooks-seventh|development|centralized|bishop/;
const structure = /pawn|chain|majority|space|stonewall|maroczy|carlsbad|hedgehog|scheveningen|closed-file|blocked-position/;

export function insightPriority(event) {
  if (terminal.has(event)) return {rank: 900, category: 'Game result'};
  if (['repetition-claim', 'fifty-move-claim'].includes(event)) return {rank: 850, category: 'Available draw claim'};
  if (forcing.test(event)) return {rank: 800, category: 'Forcing continuation'};
  if (tactical.test(event)) return {rank: 700, category: 'Tactical detail'};
  if (defense.test(event)) return {rank: 600, category: 'Defensive resource'};
  if (event === 'check') return {rank: 550, category: 'Check'};
  if (activity.test(event)) return {rank: 400, category: 'Piece activity'};
  if (structure.test(event)) return {rank: 300, category: 'Pawn structure'};
  return {rank: 100, category: 'Position fact'};
}

// Research templates address the mover as "you". On an opponent move, swap both
// sides in one pass. They/their preserves verb agreement and past-tense claims.
export function playerText(text, mover, player) {
  if (mover === player) return text;
  const swapped = text.replace(/\byour opponent(?:[’']s)?\b|\bthe opponent(?:[’']s)?\b|\bopponent(?:[’']s)?\b|\b(?:the )?enemy (?:king|queen|rook|bishop|knight|pawn|position)s?\b|\b(?:for|against|to|with|leave|leaves) you\b|\byou(?:[’']re|[’']ve|[’']ll)?\b|\byour\b/gi, phrase => {
    const lower = phrase.toLowerCase();
    let replacement;
    if (lower.includes('opponent')) replacement = /[’']s$/.test(lower) ? 'your' : 'you';
    else if (lower.includes('enemy ')) replacement = 'your ' + lower.replace(/^the /, '').slice(6);
    else if (/^(for|against|to|with|leave|leaves) you$/.test(lower)) replacement = lower.split(' ')[0] + ' them';
    else replacement = lower === 'your' ? 'their' : /[’']re$/.test(lower) ? 'they are' : /[’']ve$/.test(lower) ? 'they have' : /[’']ll$/.test(lower) ? 'they will' : 'they';
    return /^[A-Z]/.test(phrase) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
  });
  const verbs = {has: 'have', is: 'are', captures: 'capture', recaptures: 'recapture', attacks: 'attack', forks: 'fork', wins: 'win', loses: 'lose', plays: 'play', moves: 'move'};
  return swapped.replace(/\byou (has|is|captures|recaptures|attacks|forks|wins|loses|plays|moves)\b/gi,
    (phrase, verb) => (/^[A-Z]/.test(phrase) ? 'You ' : 'you ') + verbs[verb.toLowerCase()]);
}

export function coachInsights(findings, {mover, player}) {
  return findings.map((finding, index) => {
    const priority = insightPriority(finding.event), ours = mover === player;
    let perspective = ours ? 'Your move' : 'Opponent’s move';
    let text = playerText(finding.text, mover, player);
    if (finding.event === 'overloaded-defender' && finding.context?.defender) {
      const defender = finding.context.defender;
      const owner = defender.color === player ? 'Your' : 'Your opponent’s';
      const piece = {p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen'}[defender.type];
      if (piece && /^[a-h][1-8]$/.test(defender.square)) {
        text = finding.text.replace(/^Overloaded [^:]+:/, `${owner} ${piece} on ${defender.square} is overloaded:`);
        perspective = ours ? 'Conditional opportunity for you' : 'Conditional risk for you';
      }
    } else if (finding.event === 'missed-mate') {
      perspective = ours ? 'Your missed mating chance' : 'Opponent’s missed mating chance';
    } else if (/pawn-shield-defense|unique-mate-defense|saving-piece|defending-piece|active-defense|luft|conditional-stalemate/.test(finding.event)) {
      perspective = ours ? 'Your defensive resource' : 'Opponent’s defensive resource';
    } else if (priority.rank === 700 || finding.event === 'forced-mate') {
      perspective = ours ? 'Your tactical resource' : 'Opponent’s tactical resource';
    }
    return {...finding, text, sourceText: finding.text, perspective, ...priority, index};
  }).sort((a, b) => b.rank - a.rank || a.index - b.index);
}
