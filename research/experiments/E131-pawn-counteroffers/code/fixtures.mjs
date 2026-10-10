import {DEFAULT_POSITION} from '../../../../lib/chess.js';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const offer = ['opening-pawn-concession'],accept = ['accepted-pawn-concession'],untaken = ['untaken-pawn-concession'],counter = [...offer,...untaken,'retained-pawn-counteroffer'];
function f(id,moves,move,expected=[],extra={}) {
  const c = legalPosition(DEFAULT_POSITION); for (const code of moves) c.move(code);
  return {id,fen:c.fen(),history:{fen:DEFAULT_POSITION,moves},move,expected,pawnOfferTags:true,scanReplies:false,...extra};
}
const queen = ['d2d4','d7d5'],king = ['e2e4','e7e5'],black = ['d2d4','d7d5','a2a3'],ep = ['a2a3','h7h5','a3a4','h5h4','a4a5'];
const safeEp = ['a2a4','a7a6','h2h3','c7c6','g2g3','d8a5','g1f3','a5d5','a4a5'];
export const fixtures = [
  f('queens-pawn-offer',queen,'c2c4',offer),
  f('queens-accepted',[...queen,'c2c4'],'d5c4',accept),
  f('queens-untaken',[...queen,'c2c4'],'e7e6',untaken),
  f('albin-counteroffer',[...queen,'c2c4'],'e7e5',counter),
  f('albin-accepted',[...queen,'c2c4','e7e5'],'d4e5',accept),
  f('kings-pawn-offer',king,'f2f4',offer),
  f('kings-accepted',[...king,'f2f4'],'e5f4',accept),
  f('immediate-recapture-not-certified',[...king,'f2f4'],'d7d5',untaken),
  f('black-pawn-offer',black,'c7c5',offer),
  f('black-accepted',[...black,'c7c5'],'d4c5',accept),
  f('white-counteroffer',[...black,'c7c5'],'e2e4',counter),
  f('white-counter-accepted',[...black,'c7c5','e2e4'],'d5e4',accept),
  f('ordinary-opening',[],'e2e4'),
  f('ordinary-defended-exchange',['e2e4','e7e6'],'d2d4'),
  f('ep-recapturable',ep,'b7b5'),
  f('ep-recapturable-accepted',[...ep,'b7b5'],'a5b6'),
  f('ep-offer',safeEp,'b7b5',offer),
  f('ep-accepted',[...safeEp,'b7b5'],'a5b6',accept),
  f('actual-terminal',['e2e4','e7e5','f1c4','b8c6','d1h5','g8f6'],'h5f7'),
  f('promotion',['a2a4','h7h5','a4a5','h5h4','a5a6','g7g5','a6b7','g5g4'],'b7a8q'),
  f('missing-history',queen,'c2c4',[],{history:undefined}),
  f('nonstandard-history',queen,'c2c4',[],{history:{fen:legalPosition(DEFAULT_POSITION).fen().replace(' 0 1',' 0 2'),moves:queen},fen:(() => { const c = legalPosition(DEFAULT_POSITION.replace(' 0 1',' 0 2')); for (const m of queen) c.move(m); return c.fen(); })()}),
  f('late-history',[...queen,'a2a3','a7a6','b2b3','b7b6','h2h3','h7h6','g2g3','g7g6','f2f3','f7f6','a3a4','a6a5','b3b4','b6b5','h3h4','h6h5','g3g4','g6g5'],'c2c4'),
  f('zero-budget',[...queen,'c2c4'],'e7e5',[],{maxPawnOfferNodes:0}),
  f('tiny-budget',[...queen,'c2c4'],'e7e5',[],{maxPawnOfferNodes:5}),
];
