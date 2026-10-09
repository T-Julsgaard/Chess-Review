import {Chess} from '../../../../lib/chess.js';
const start = new Chess().fen();
const white = ['e2e4','e7e5','g1f3','d7d6','f1c4','c8g4','b1c3','g7g6'];
const black = ['a2a3','e7e5','e2e4','g8f6','d2d3','f8c5','c1g5','b8c6','g2g3'];
const offer = ['opening-mating-compensation-offer'],accepted = ['accepted-opening-mate-offer'],untaken = ['untaken-opening-mate-offer'];
const f = (id,moves,move,H,expected=[],extra={}) => {
  const c = new Chess(start); for (const code of moves) c.move(code);
  return {id,fen:c.fen(),move,history:{fen:start,moves},openingMateOfferTags:true,openingOfferMatePlies:H,scanReplies:false,expected,...extra};
};
export const fixtures = [
  f('white-offer',white,'f3e5',3,offer),
  f('white-offer-accepted',[...white,'f3e5'],'g4d1',3,accepted),
  f('white-offer-untaken',[...white,'f3e5'],'d6e5',3,untaken),
  f('white-quiet-decline',[...white,'f3e5'],'g8f6',3,untaken),
  f('black-offer',black,'f6e4',3,offer),
  f('black-offer-accepted',[...black,'f6e4'],'g5d8',3,accepted),
  f('black-offer-untaken',[...black,'f6e4'],'d3e4',3,untaken),
  f('short-white',white,'f3e5',1),
  f('short-black',black,'f6e4',1),
  f('zero-horizon',white,'f3e5',0),
  f('wrong-entry',white,'f3g1',3),
  f('ordinary-opening',[],'e2e4',3),
  f('missing-history',white,'f3e5',3,[],{history:undefined}),
  f('nonstandard-history',white,'f3e5',3,[],{history:{fen:new Chess().fen().replace(' 0 1',' 0 2'),moves:white},fen:(() => {const c = new Chess(start.replace(' 0 1',' 0 2')); for (const code of white) c.move(code); return c.fen();})()}),
  f('late-history',[...white,'a2a3','a7a6','b2b3','b7b6','h2h3','h7h6','a3a4','a6a5','h3h4','h6h5','b3b4','b6b5'],'f3e5',3),
  f('zero-budget',white,'f3e5',3,[],{maxOpeningMateOfferNodes:0}),
  f('atomic-budget',white,'f3e5',3,[],{maxOpeningMateOfferNodes:210}),
];
