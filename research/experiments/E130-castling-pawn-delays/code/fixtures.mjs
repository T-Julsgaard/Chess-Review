import {DEFAULT_POSITION} from '../../../../lib/chess.js';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {boardFen} from '../../FRIEND-shared/lib.mjs';
const route = ['e2e4','e7e5','g1f3','b8c6','f1e2','f8c5','b1c3','d8h4'];
const castle = ['early-castle-removes-immediate-mate'],delay = ['opening-pawn-delay-retains-mate','pawn-delay-retains-avoidable-mate'];
function f(id,moves,move,expected=[],extra={}) {
  const c = legalPosition(DEFAULT_POSITION); for (const code of moves) c.move(code);
  return {id,fen:c.fen(),history:{fen:DEFAULT_POSITION,moves},move,expected,scanReplies:false,castlingTimingTags:true,...extra};
}
const c = legalPosition(DEFAULT_POSITION); for (const code of route) c.move(code);
const blackRoute = ['e2e4','e7e5','b1c3','g8f6','f1c4','f8e7','d1h5','b8c6','a2a3'];
const prefix = ['g1f3','g8f6','f3g1','f6g8','h2h3','h7h6','b1c3','b8c6','c3b1','c6b8','b2b3','b7b6'];
const captureBoard = legalPosition(c.fen()); captureBoard.remove('g2'); captureBoard.put({type:'p',color:'w'},'g3');
export const fixtures = [
  f('early-castle',route,'e1g1',castle),
  f('early-pawn-delay',route,'a2a3',delay),
  f('double-pawn-delay',route,'a2a4',delay),
  f('pawn-stops-threat',route,'g2g3'),
  f('capture-stops-threat',route,'f3h4'),
  f('quiet-nonpawn',route,'c3b1'),
  f('no-prior-threat',route.slice(0,-1).concat('d8e7'),'e1g1'),
  f('missing-opening-castle',route,'e1g1',[],{history:undefined}),
  f('missing-opening-pawn',route,'a2a3',['pawn-delay-retains-avoidable-mate'],{history:undefined}),
  f('nonstandard-opening',route,'a2a3',['pawn-delay-retains-avoidable-mate'],{history:{fen:c.fen(),moves:[]}}),
  f('black-castle',blackRoute,'e8g8',castle),
  f('black-pawn-delay',blackRoute,'a7a6',delay),
  f('black-pawn-stops-threat',blackRoute,'g7g6'),
  f('early-window-boundary',[...prefix,...route],'a2a3',delay),
  f('late-castle',[...prefix,'a2a3','a7a6',...route],'e1g1'),
  f('late-pawn-delay',[...prefix,'a2a3','a7a6',...route],'a3a4',['pawn-delay-retains-avoidable-mate']),
  {id:'actual-terminal',fen:boardFen({f7:'K',g6:'P',f5:'B',h8:'k'}),move:'g6g7',castlingTimingTags:true,scanReplies:false,expected:[]},
  {id:'promotion',fen:boardFen({a1:'K',g7:'P',h6:'k'}),move:'g7g8q',castlingTimingTags:true,scanReplies:false,expected:[]},
  {id:'pawn-capture',fen:captureBoard.fen(),move:'g3h4',castlingTimingTags:true,scanReplies:false,expected:[]},
  f('zero-budget',route,'a2a3',[],{maxCastlingTimingNodes:0}),
  f('tiny-budget',route,'a2a3',[],{maxCastlingTimingNodes:10}),
  f('no-castle',route,'a2a3',[],{history:undefined,fen:c.fen().replace(' KQkq ',' Qkq ')}),
];
