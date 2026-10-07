import {Chess} from '../../../../lib/chess.js';
import {reflect as parentReflect} from '../../E024-transitions/code/fixtures.mjs';
const all = ['piece-movement','board-coordinates','legal-input','material-inventory','nominal-balance'];
const quiet = '7k/7p/8/8/8/8/P7/K7 w - - 0 1';
const caseOf = (id, fen, move, status = 'accepted', more = {}) => ({id, fen, move,
  foundationTags: true, expected: status === 'accepted' ? all : status === 'rejected' ? ['illegal-input'] : [],
  absent: status === 'accepted' ? ['illegal-input'] : all, expectedStatus: status,
  note: 'Authored synthetic ' + id.replaceAll('-', ' '), ...more});
export function reflect(fixture) {
  if (fixture.inputError) return {...fixture, id: fixture.id + '-black'};
  return parentReflect(fixture);
}
export const fixtures = [
  caseOf('pawn-double-edge',quiet,'a2a4'),
  caseOf('king-edge',quiet,'a1b1'),
  caseOf('knight-movement','7k/7p/8/8/8/5N2/P7/K7 w - - 0 1','f3d4'),
  caseOf('bishop-movement','6k1/7p/8/8/8/2B5/P7/K7 w - - 0 1','c3d4'),
  caseOf('rook-movement','7k/7p/8/8/8/2R5/P7/K7 w - - 0 1','c3d3'),
  caseOf('queen-movement','6k1/7p/8/8/8/2Q5/P7/K7 w - - 0 1','c3d4'),
  caseOf('capture-bishop','6k1/7p/8/8/3n4/2B5/P7/K7 w - - 0 1','c3d4'),
  caseOf('capture-rook','7k/7p/8/8/8/2Rn4/P7/K7 w - - 0 1','c3d3'),
  caseOf('equal-points-unequal-armies','7k/6np/8/8/8/2B5/P7/K7 w - - 0 1','a2a3','accepted',{expected:[...all,'material-imbalance']}),
  caseOf('equal-armies',quiet,'a2a3','accepted',{absent:['illegal-input','material-imbalance']}),
  caseOf('own-capture',quiet,'a1a2','rejected'),
  caseOf('empty-origin',quiet,'c3c4','rejected'),
  caseOf('enemy-origin',quiet,'h7h6','rejected'),
  caseOf('pawn-three-squares',quiet,'a2a5','rejected'),
  caseOf('pawn-backward',quiet,'a2a1','rejected'),
  caseOf('pawn-double-after-start','7k/7p/8/8/8/P7/8/K7 w - - 0 1','a3a5','rejected'),
  caseOf('extra-promotion-suffix',quiet,'a2a4q','rejected'),
  caseOf('blocked-rook','7k/7p/8/8/8/2RP4/P7/K7 w - - 0 1','c3e3','rejected'),
  caseOf('bishop-wrong-geometry','6k1/7p/8/8/8/2B5/P7/K7 w - - 0 1','c3c4','rejected'),
  caseOf('knight-wrong-geometry','7k/7p/8/8/8/5N2/P7/K7 w - - 0 1','f3f4','rejected'),
  caseOf('pinned-rook','4r2k/7p/8/8/8/8/4R3/4K3 w - - 0 1','e2d2','rejected'),
  caseOf('check-escape','4r2k/7p/8/8/8/8/8/4K3 w - - 0 1','e1f1'),
  caseOf('check-unresolved','4r2k/7p/8/8/8/8/P7/4K3 w - - 0 1','a2a3','rejected'),
  caseOf('castle-kingside','r3k2r/pp5p/8/8/8/8/PP5P/R3K2R w KQkq - 0 1','e1g1'),
  caseOf('castle-queenside','r3k2r/pp5p/8/8/8/8/PP5P/R3K2R w KQkq - 0 1','e1c1'),
  caseOf('castle-no-rights','r3k2r/pp5p/8/8/8/8/PP5P/R3K2R w - - 0 1','e1g1','rejected'),
  caseOf('castle-through-attack','k4r2/p7/8/8/8/8/P7/4K2R w K - 0 1','e1g1','rejected'),
  caseOf('ep-legal','7k/8/8/3pP3/8/8/P7/K7 w - d6 0 1','e5d6'),
  caseOf('ep-no-right','7k/8/8/3pP3/8/8/P7/K7 w - - 0 1','e5d6','rejected'),
  caseOf('ep-pinned-file','4r2k/8/8/3pP3/8/8/P7/4K3 w - d6 0 1','e5d6','rejected'),
  caseOf('ep-discovered-rank-check','8/7p/8/r4pPK/8/8/P7/k7 w - f6 0 1','g5f6','rejected'),
  caseOf('promotion-missing','7k/P6p/8/8/8/8/8/K7 w - - 0 1','a7a8','rejected'),
  ...['q','r','b','n'].flatMap(type=>[
    caseOf('promotion-'+type,'7k/P6p/8/8/8/8/8/K7 w - - 0 1','a7a8'+type),
    caseOf('capture-promotion-'+type,'1r5k/P6p/8/8/8/8/8/K7 w - - 0 1','a7b8'+type),
    caseOf('dead-promotion-'+type,'7k/P7/8/8/8/8/8/K7 w - - 0 1','a7a8'+type),
  ]),
  caseOf('actual-check','6k1/7p/8/8/8/2R5/P7/K7 w - - 0 1','c3g3'),
  caseOf('actual-mate','7k/8/5KQ1/8/8/8/8/8 w - - 0 1','g6g7'),
  caseOf('actual-stalemate','7k/5K2/6Q1/8/8/8/8/8 w - - 0 1','g6f5'),
  caseOf('actual-dead-capture','7k/8/8/8/8/1N6/n7/K7 w - - 0 1','a1a2'),
  caseOf('root-dead','7k/8/8/8/8/8/8/K7 w - - 0 1','a1b1','unavailable'),
  caseOf('root-mate','7k/6Q1/5K2/8/8/8/8/8 b - - 0 1','h8h7','unavailable'),
  caseOf('root-stalemate','7k/5K2/6Q1/8/8/8/8/8 b - - 0 1','h8h7','unavailable'),
  caseOf('root-clock-draw',quiet.replace('0 1','100 1'),'a2a3','unavailable'),
  caseOf('long-origin-alternatives','6k1/7p/8/8/8/2Q5/P7/K7 w - - 0 1','c3c3','rejected'),
  caseOf('no-origin-alternatives','4r2k/7p/8/8/8/8/P7/4K3 w - - 0 1','a2a4','rejected'),
  caseOf('disabled-basic',quiet,'a2a4',null,{foundationTags:false,expected:[],absent:all,expectedStatus:null}),
  caseOf('zero-budget-accepted',quiet,'a2a4','exhausted',{maxFoundationNodes:0,expected:[],absent:all}),
  caseOf('zero-budget-rejected',quiet,'a2a5','exhausted',{maxFoundationNodes:0,expected:[],absent:[...all,'illegal-input']}),
];
function historyCase(id, start, moves, move, status='accepted') {
  const chess = new Chess(start);
  for(const value of moves) chess.move(value);
  return caseOf(id,chess.fen(),move,status,{history:{fen:start,moves}});
}
fixtures.push(historyCase('valid-history',quiet,['a1b1','h8g8'],'a2a3'));
fixtures.push(historyCase('root-repetition',quiet,['a1b1','h8g8','b1a1','g8h8','a1b1','h8g8','b1a1','g8h8'],'a2a3','unavailable'));
for(const [id,more]of[
  ['malformed-uci',{move:'a4'}],['invalid-fen',{fen:'bad'}],
  ['nonmoving-king-attacked',{fen:'7k/7p/8/8/8/2B5/P7/K7 w - - 0 1'}],
  ['bad-option',{foundationTags:1}],['bad-budget',{maxFoundationNodes:-1}],
  ['invalid-history',{history:{fen:quiet,moves:['a2a5']}}],
  ['history-mismatch',{history:{fen:quiet,moves:['a1b1']}}],
  ['history-after-terminal',{fen:'7k/8/8/8/8/8/8/K7 w - - 0 1',history:{fen:'7k/8/8/8/8/8/8/K7 w - - 0 1',moves:['a1b1']}}],
])fixtures.push(caseOf(id,quiet,'a2a3',null,{...more,inputError:true,expected:[],expectedStatus:null}));
