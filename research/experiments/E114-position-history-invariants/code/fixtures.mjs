import {Chess} from '../../../../lib/chess.js';
import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const pawn = 'irreversible-pawn-move',hole = 'permanent-pawn-control-hole',loss = 'irreversible-captured-unit-loss',rights = 'irreversible-castling-rights-loss';
const f = (id,pieces,move,expected=[],extra={}) => ({id,fen:boardFen(pieces),move,
  positionInvariantTags:true,scanReplies:false,expected,...extra});
const core = {a1:'K',h8:'k',e3:'P',b5:'P'};
const authored = [
  f('pawn-holes',core,'e3e4',[pawn,hole,hole]),
  f('behind-pawn-prevents-permanence',{...core,b5:undefined,b2:'P'},'e3e4',[pawn]),
  f('occupied-hole',{...core,d4:'N'},'e3e4',[pawn,hole]),
  f('pawn-capture',{...core,d4:'n'},'e3d4',[pawn,loss,hole]),
  f('nonpawn-capture',{a1:'K',h8:'k',e3:'R',e6:'n'},'e3e6',[loss]),
  f('promotion',{a1:'K',h8:'k',e7:'P',b5:'P'},'e7e8q',[pawn]),
  f('already-asymmetric-quiet',core,'a1b1'),
  f('zero-budget',core,'e3e4',[],{maxPositionInvariantNodes:0}),
  f('atomic-budget',core,'e3e4',[],{maxPositionInvariantNodes:8}),
  f('lost-rights',{},'h1h2',[rights],{fen:'4k3/8/8/8/8/8/8/4K2R w K - 0 1'}),
  f('returned-rook-no-new-rights',{},'h2h1',[],{fen:'4k3/8/8/8/8/8/7R/4K3 w - - 0 1'}),
  f('en-passant',{},'e5d6',[pawn,loss,hole],{fen:'7k/8/8/3pP3/8/8/8/K7 w - d6 0 1'}),
  f('clock-terminal',{},'e3e4',[],{fen:boardFen(core).replace(' 0 1',' 100 1'),inputError:'Cannot explain a move from a terminal position'}),
];
// The shared reflector rejects rights/EP states; explicit Black cases follow.
const paired = [];
for (const x of authored) {
  paired.push(x);
  if (x.fen.split(' ')[2] === '-' && x.fen.split(' ')[3] === '-') paired.push(reflect(x));
}
const start = new Chess().fen();
const standardCase = (id,moves,move,expected) => {
  const c = new Chess(start); for (const code of moves) c.move(code);
  return {id,fen:c.fen(),move,history:{fen:start,moves},positionInvariantTags:true,scanReplies:false,expected};
};
paired.push(standardCase('standard-white',[],'e2e4',['created-full-board-asymmetry','history-confirmed-uncastled-king',pawn]));
paired.push(standardCase('standard-black',['e2e4'],'e7e5',['history-confirmed-uncastled-king',pawn]));
paired.push(standardCase('already-castled',['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6','e1g1','a7a6'],'d1e2',[]));
paired.push(standardCase('actual-castle',['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6'],'e1g1',[rights]));
paired.push({...standardCase('missing-history',[],'e2e4',['created-full-board-asymmetry',pawn]),history:undefined});
paired.push(f('black-rights',{},'h8h7',[rights],{fen:'4k2r/8/8/8/8/8/8/4K3 b k - 0 1'}));
paired.push(f('black-en-passant',{},'e4d3',[pawn,loss,hole],{fen:'k7/8/8/8/3Pp3/8/8/7K b - d3 0 1'}));
export const fixtures = paired;
