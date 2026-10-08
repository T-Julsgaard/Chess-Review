// Explicit event-to-canonical-scope routing. A shared name never broadens a claim.
const rules = [];
const add = (event, names, test = () => true) => rules.push({event, names: names.split('|'), test});
add('piece-movement', 'Piece movement');
add('legal-input', 'Legal move');
add('material-inventory', 'Material');
add('capture', 'Capture');
add('check', 'Check');
add('checkmate', 'Checkmate');
add('stalemate', 'Stalemate');
add('castling', 'Castling|Castled king');
add('castling', 'Kingside castling', e => e.wing === 'kingside');
add('castling', 'Queenside castling', e => e.wing === 'queenside');
add('en-passant', 'En passant');
add('promotion', 'Promotion');
add('promotion', 'Underpromotion', e => e.underpromotion);
add('double-check', 'Double check|Check');
add('discovered-check', 'Discovered check|Check');
add('absolute-pin', 'Absolute pin');
add('fork', 'Fork');
add('fork', 'Knight fork', e => e.piece === 'n');
add('fork', 'Pawn fork', e => e.piece === 'p');
add('fork', 'Royal fork', e => e.targets.some(t => t.type === 'k') && e.targets.some(t => t.type === 'q'));
add('broad-fork', 'Fork');
add('broad-fork', 'Royal fork', e => e.royal);
add('triple-attack', 'Triple attack');
add('discovered-double-attack', 'Double attack with discovered attack');
add('passed-pawn', 'Passed pawn|Passed pawns|Creating a passed pawn|Passed pawn creation');
add('passed-pawn-advance', 'Passed pawn|Passed pawns');
add('passed-pawn-promotion', 'Passed pawn promotion');
add('protected-passed-pawn', 'Protected passed pawn');
add('connected-passer-proof', 'Connected passers');
add('isolated-pawn', 'Isolated pawn');
add('isolated-pawn', "Isolated queen's pawn / IQP|Isolated queen's pawn structure", e => e.iqp.length > 0);
add('doubled-pawns', 'Doubled pawns');
add('tripled-pawns', 'Tripled pawns');
add('pawn-islands', 'Pawn island');
add('pawn-chain', 'Pawn chain|Base of the pawn chain|Head of the pawn chain');
add('pawn-duo', 'Pawn duo');
add('pawn-phalanx', 'Pawn phalanx');
add('pawn-ram', 'Ram');
add('pawn-tension', 'Pawn tension');
add('resolves-pawn-tension', 'Releasing tension');
add('pawn-majority', 'Pawn majority|Pawn majorities');
add('pawn-majority', 'Queenside majority', e => e.wing === 'queenside');
add('pawn-majority', 'Kingside majority', e => e.wing === 'kingside');
add('pawn-majority', 'Three-versus-two queenside majority', e => e.wing === 'queenside' && e.own === 3 && e.enemy === 2);
add('pawn-majority', 'Four-versus-three kingside structure', e => e.wing === 'kingside' && e.own === 4 && e.enemy === 3);
add('opposite-wing-majorities', 'Opposite-wing pawn majorities');
add('file-opening', 'Open file|Open files');
add('open-file', 'Open file|Open files|Occupying an open file');
add('open-file', 'Rook on an open file', e => e.piece === 'r');
add('semi-open-file', 'Semi-open file');
add('semi-open-file', 'Rook on a semi-open file', e => e.piece === 'r');
add('connected-rooks', 'Connected rooks|Connect the rooks');
add('connected-rooks', 'Doubling rooks', e => e.file);
add('queen-rook-battery', 'Queen-rook battery');
add('queen-bishop-battery', 'Queen-bishop battery');
add('tripling-file', 'Tripling on a file');
add('rook-behind-passer', 'Rook behind a passed pawn|Rook behind the passed pawn');
add('passed-pawn-blockade', 'Knight blockade of passed pawn', e => e.piece === 'n');
add('passed-pawn-blockade', 'Rook blockade', e => e.piece === 'r');
add('rook-seventh', 'Rook on the seventh rank|Seventh-rank rook');
add('rook-seventh', 'Rook on the second rank');
add('two-rooks-seventh', 'Two rooks on the seventh|Rook on the seventh rank|Rook on the second rank|Seventh-rank rook');
add('bishop-pair', 'Bishop pair');
add('opposite-bishop-ending', 'Opposite-colored bishops|Opposite-colored bishop ending');
add('same-bishop-ending', 'Same-colored bishops|Same-colored bishop ending');
add('centralized-knight', 'Centralized knight');
add('rim-knight', 'Rim knight');
add('advanced-knight', 'Knight on the fifth rank', e => e.relativeRank === 5);
add('advanced-knight', 'Knight on the sixth rank', e => e.relativeRank === 6);
add('piece-simplification', 'Piece simplification');
add('king-escape', 'King escape');
add('interposition', 'Interposition');
add('line-interposition', 'Interposition');
add('blocking-file', 'Blocking files|Blocking');
add('blocking-diagonal', 'Blocking diagonals|Blocking');
add('closing-line', 'Closing lines|Blocking');
add('insufficient-material', 'Insufficient mating material');
add('discovered-attack', 'Discovered attack');
add('loose-piece', 'Loose piece');
add('en-prise', 'En prise');
add('absolute-skewer', 'Absolute skewer');
add('relative-pin', 'Relative pin');
add('cross-pin', 'Cross-pin');
add('certified-removal', 'Removal of the defender|Removing protection');
add('saving-piece', 'Defense');
add('defending-piece', 'Defense');
add('defensive-pawn-move', 'Defensive pawn move');
add('eliminating-attacker', 'Eliminating attacking pieces');
add('active-defense', 'Active defense');
add('luft', 'Air / luft|Creating luft');
add('exchange', 'Exchange|The exchange');
add('equal-trade', 'Equal trade');
add('unequal-trade', 'Unequal trade');
add('queen-trade', 'Queen trade');
add('rook-trade', 'Rook trade');
add('minor-trade', 'Minor-piece trade');
add('rook-trade-pawn-ending', 'Rook trade into pawn ending');
add('queen-check', 'Queen check');
add('queen-behind-passer', 'Queen behind passed pawn');
add('hanging-pawns', 'Hanging pawns|Hanging-pawn structure');
add('pawn-lever', 'Pawn lever');
add('central-break', 'Central break');
add('undermining-center', 'Undermining the center');
add('locked-pawn-chains', 'Locked pawn chains');
add('closed-center', 'Closed center');
add('symmetric-pawns', 'Symmetrical pawn structure');
add('prepared-fianchetto', 'Fianchetto');
add('open-bishop-diagonal', 'Open diagonal|Open diagonals|Diagonal control');
add('opened-bishop-diagonal', 'Opening diagonals|Diagonal opening');
add('open-bishop-diagonal', 'Long-diagonal bishop');
add('open-bishop-diagonal', 'Long diagonal', e => e.long);
add('bishop-color-pattern', 'Good bishop', e => e.pattern.kind === 'good');
add('bishop-color-pattern', 'Bad bishop', e => e.pattern.kind === 'bad');
add('minor-development', 'Development|Develop minor pieces');
add('minor-development-complete', 'Develop minor pieces');
add('development-check', 'Opening tempo|Developing with tempo');
add('repeated-opening-piece', 'Moving the same piece repeatedly in the opening');
add('early-queen-move', 'Early queen development');
add('outside-passer', 'Outside passed pawn|Distant passed pawn');
add('king-escort', 'King escorting a passed pawn');
add('safe-promotion-tactic', 'Promotion tactics|Promotion tactic');
add('promotion-route', 'Promotion tactics|Promotion tactic');
add('rule-of-square', 'Rule of the square');
add('underpromotion-avoids-stalemate', 'Underpromotion tactic');
add('conditional-stalemate', 'Stalemate defense|Stalemate resource|Stalemate tactic');
add('king-promotion-support', 'Active king in the endgame|Activating the king|King activity');
add('king-promotion-support', 'King centralization|Centralization', e => e.attributes.central);
add('king-promotion-support', 'King penetration', e => e.attributes.penetration);
add('king-promotion-support', 'King opposition|Opposition', e => e.attributes.opposition);
add('king-promotion-support', 'Distant opposition', e => e.attributes.opposition?.kind === 'distant');
add('king-promotion-support', 'Diagonal opposition', e => e.attributes.opposition?.kind === 'diagonal');
add('king-promotion-support', 'King in the center', (_e, result) => result.kingCenterAnalysis?.status === 'proven');
add('pawn-shield-defense', 'Pawn shield');
add('mobility-reduction', 'Mobility|Restriction|Restricting a piece');
add('dominated-piece', 'Domination');
add('dominated-piece', 'Knight domination', e => e.target.type === 'n');
add('mobility-reduction', 'Restricting the knight', e => e.target.type === 'n');
add('dominated-piece', 'Bishop domination', e => e.target.type === 'b');
add('trapped-piece', 'Trapping a piece');
add('trapped-piece', 'Trapped queen|Queen trap', e => e.target.type === 'q');
add('repetition-claim', 'Draw by repetition');
add('fifty-move-claim', 'Fifty-move rule');
add('draw-position', 'Drawn position');
add('irreversible-move', 'Irreversible move');
add('mate-in-one', 'Mate in one');
add('forced-mate', 'Forced mate');
add('forced-mate', 'Mate in two', e => e.mateIn === 2);
add('forced-mate', 'Mate in three', e => e.mateIn === 3);
add('missed-mate', 'Missing mate');
add('promotion-mate', 'Promotion mate');
add('underpromotion-mate', 'Underpromotion mate');
add('discovered-mate', 'Discovered mate|Discovered check');
add('double-check-mate', 'Double-check mate|Double check');
add('pawn-supported-mate', 'Pawn-supported mate');
for (const [id, name] of Object.entries({
  'smothered-mate': 'Smothered mate', 'back-rank-mate': 'Back-rank mate',
  'arabian-mate': 'Arabian mate', 'anastasia-mate': "Anastasia's mate", 'boden-mate': "Boden's mate",
  'opera-mate': 'Opera mate', 'ladder-mate': 'Ladder mate|Rook roller mate', 'morphy-mate': "Morphy's mate",
  'epaulette-mate': 'Epaulette mate', 'dovetail-mate': 'Dovetail mate', 'swallow-tail-mate': "Swallow's-tail mate",
  'damiano-mate': "Damiano's mate", 'lolli-mate': 'Lolli mate', 'greco-mate': 'Greco mate',
  'blackburne-mate': "Blackburne's mate", 'legal-mate': "Legal's mate", 'hook-mate': 'Hook mate',
  'corner-mate': 'Corner mate', 'box-mate': 'Box mate', 'kill-box-mate': 'Kill box',
  'king-queen-mate': 'King-and-queen mate', 'king-rook-mate': 'King-and-rook mate',
  'king-bishops-mate': 'King and two bishops mate', 'bishop-knight-mate': 'Bishop-and-knight mate|Bishop and knight checkmate',
  'queen-rook-mate': 'Queen-and-rook mate', 'mate-pair-qr': 'Queen-and-rook mate',
  'mate-pair-nq': 'Queen-and-knight mating pattern', 'mate-pair-bq': 'Queen-and-bishop mating pattern',
  'mate-pair-br': 'Bishop-and-rook mating pattern', 'mate-pair-nr': 'Rook-and-knight mating pattern',
  'mate-pair-bb': 'Double-bishop mate',
})) add(id, name);
add('mating-sacrifice', 'Sacrifice');
add('mating-sacrifice', 'Queen sacrifice', e => e.offered.type === 'q');
add('mating-sacrifice', 'Bishop sacrifice', e => e.offered.type === 'b');
add('mating-sacrifice', 'Pawn sacrifice', e => e.offered.type === 'p');
add('exchange-sacrifice', 'Exchange sacrifice');
add('clearance-sacrifice', 'Clearance sacrifice|Sacrifice for open lines');
add('intermediate-check', 'Zwischenzug|Intermediate check');
add('intermediate-capture', 'Zwischenzug|Intermediate capture');
add('intermediate-mate', 'Zwischenzug|zwischenmatt / intermediate mate');
add('quiet-mating-net', 'Mating net|Mating attack|Forcing moves|Forcing move|Quiet tactical move');
add('unique-mate-defense', 'Only move|Forced move');
add('defensive-counterattack', 'Active defense|Counterattack');
add('defensive-counterattack', 'Defensive sacrifice', e => e.conditionalAcceptance);
add('mating-decoy', 'Deflection|Distraction|Deflection sacrifice', e => e.roles.some(r => r.kind === 'deflection'));
add('mating-decoy', 'Decoy', e => e.roles.some(r => ['king-attraction', 'self-blocking-decoy'].includes(r.kind)));
add('mating-decoy', 'Attraction', e => e.roles.some(r => r.kind === 'king-attraction'));
add('coordinate-sacrifice', 'Rook sacrifice on h7/h2', e => e.kind === 'h-rook');
add('coordinate-sacrifice', 'Rook sacrifice on g7/g2', e => e.kind === 'g-rook');
add('coordinate-sacrifice', 'Exchange sacrifice on c3/c6', e => e.kind === 'c-exchange');
add('mating-combination', 'Tactic|Combination');
add('mating-combination', 'Smothered mate combination', e => e.kind === 'smothered');
add('mating-combination', 'Back-rank tactic', e => e.kind === 'backRank');
add('legal-defense-count', 'Counting attackers and defenders');
add('pinned-recapture', 'Counting attackers and defenders');
add('xray-recapture-defense', 'X-ray defense');
add('overloaded-defender', 'Overloading|Overworked defender|Deflection combination');
add('mating-square-clearance', 'Square clearance|Clearance combination');
add('temporary-sacrifice', 'Temporary sacrifice');
add('interference-combination', 'Interference|Interference combination');
add('desperado-capture', 'Desperado|Desperado combination');
add('cross-check', 'Cross-check');
add('attraction-combination', 'Attraction combination');
add('decoy-combination', 'Decoy combination');
add('blocking-combination', 'Blocking combination');
add('intermediate-sacrifice', 'Intermediate sacrifice');
add('pawn-blockade', 'Blockade|Blockade square');
add('pawn-blockade', 'Knight blockade', e => e.played?.piece === 'n');
add('pawn-blockade', 'King blockade', e => e.played?.piece === 'k');
add('rook-checking-distance', 'Rook checking distance|Checking distance');
add('rear-rook-check', 'Checking from behind');
add('side-rook-check', 'Checking from the side');
add('wrong-colored-bishop', 'Wrong-colored bishop');
add('wrong-rook-pawn-corner', 'Wrong rook pawn');
add('self-blocking-pawn', 'Self-blocking pawns');
add('fixed-pawn-next-turn', 'Pawn fixation');
add('pawn-break', 'Pawn break');
add('closed-file', 'Closed file');
add('pawn-space', 'Space');
add('pawn-storm', 'Pawn storm');
add('blocked-position', 'Blocked position');
add('king-triangulation', 'Triangulation');
add('pawn-race', 'Pawn race');
add('waiting-move', 'Waiting move');
add('reserve-pawn-tempo', 'Reserve tempo');
add('rook-swing', 'Rook swing');
add('rook-invasion', 'Rook invasion|Rook penetration');
add('queen-invasion', 'Queen invasion');
add('knight-outpost-proof', 'Outpost|Outposts');
add('advanced-knight-outpost', 'Advanced outpost');
add('octopus-knight', 'Octopus knight');
add('stonewall-structure', 'Stonewall structure');
add('maroczy-bind', 'Maroczy Bind');
add('carlsbad-structure', 'Carlsbad structure');
add('hedgehog-structure', 'Hedgehog structure');
add('french-pawn-chain', 'French pawn chain');
add('scheveningen-structure', 'Sicilian Scheveningen structure');
add('pawn-skeleton', 'Pawn structure|Pawn skeleton');
add('paired-bishop-armies', 'Bishop pair');
add('open-pawn-file-proof', 'Open-file pawn structure');
add('open-rank-proof', 'Open rank');
add('outside-chain-proof', 'Outside the pawn chain');
add('slider-battery-proof', 'Battery');
add('slider-battery-proof', 'Queen battery', e => e.claim.group.hasQueen);
const endings = {
  'king-pawn-king': 'King and pawn versus king', 'rook-pawn-rook': 'Rook and pawn versus rook',
  'bishop-pawn-bishop': 'Bishop and pawn versus bishop', 'knight-pawn-knight': 'Knight and pawn versus knight',
  'queen-rook': 'Queen versus rook', 'queen-minor': 'Queen versus minor piece', 'queen-pawn': 'Queen-versus-pawn endings',
  'queen-rook-pawn': 'Queen versus rook and pawn', 'rook-bishop-rook': 'Rook and bishop versus rook',
  'rook-knight-rook': 'Rook and knight versus rook', 'two-bishops-knight': 'Two bishops versus knight',
  'queen-advanced-pawn': 'Queen versus advanced pawn', 'rook-passed-pawns': 'Rook versus passed pawns',
  'rook-connected-pawns': 'Rook versus connected pawns', 'knight-connected-pawns': 'Knight versus connected pawns',
};
for (const [id, name] of Object.entries(endings)) add('ending-' + id, name);

// These emitted facts only implement partial catalog claims, or are support/notation.
export const excludedEvents = new Set(('board-coordinates illegal-input nominal-balance material-imbalance material-balance asymmetric-pawns '
  + 'connected-passed-pawns fianchetto central-king king-opposition central-pawn-control pawn-center rook-two-minors '
  + 'queen-two-rooks queen-rook-minor rook-minor bishop-knight winning-exchange profitable-capture allows-capture '
  + 'allows-fork avoids-fork allows-mate hanging-piece fifty-move-threshold x-ray-attack x-ray-defense interference '
  + 'removal-defender pawn-cover-capture fixed-center open-center pawn-cover bishop-pawn-color bishop-behind-chain '
  + 'queen-centralization passed-pawn-check rook-lift-preparation rook-lift protected-knight-outpost exchange-difference '
  + 'double-fianchetto only-legal-move king-check-evasion capture-checker long-diagonal-bishop escape-square endgame-transition pawn-ending-transition '
  + 'ending-pawn-ending ending-r-ending ending-b-ending ending-n-ending ending-q-ending '
  + 'behind-chain-proof rook-minor-armies passed-count-imbalance flank-count-imbalance').split(/\s+/));

export function findingsFor(result, verified) {
  const findings = [], unavailable = [], seen = new Set();
  for (const event of result.events) {
    const matching = rules.filter(r => r.event === event.id);
    if (!matching.length && !excludedEvents.has(event.id)) unavailable.push('Unmapped event: ' + event.id);
    for (const rule of matching) {
      if (!rule.test(event.evidence, result)) continue;
      for (const name of rule.names) {
        const scopes = verified.filter(v => v.name === name);
        if (!scopes.length) throw Error('Routing references unverified name: ' + name);
        const key = JSON.stringify([name, event.text]);
        if (seen.has(key)) continue; seen.add(key);
        const bounded = /fork|skewer|relative-pin|cross-pin|certified-removal|saving-piece|defending-piece|defensive-pawn|eliminating-attacker|active-defense|luft|safe-promotion|promotion-route|rule-of-square|stalemate|king-promotion|dominated|trapped|forced-mate|missed-mate|sacrifice|intermediate|quiet-mating|unique-mate|counterattack|mating-decoy|mating-combination|overloaded|square-clearance|temporary|interference-combination|desperado|attraction-combination|decoy-combination|blocking-combination|pawn-race|octopus|waiting-move|reserve-pawn-tempo|pawn-shield/.test(event.id);
        findings.push({name, text: event.text, event: event.id, kind: bounded ? 'Bounded proof — see scope' : 'Factual observation', scopes});
      }
    }
  }
  return {findings, unavailable};
}

export const routedNames = [...new Set(rules.flatMap(r => r.names))];
