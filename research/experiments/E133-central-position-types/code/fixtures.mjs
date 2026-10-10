import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const base = {a1:'K',h8:'k',a2:'P',h7:'p'},closed = {d4:'P',e5:'P',d5:'p',e6:'p'},fluid = {d3:'P',e4:'P',d5:'p',e5:'p'};
const f = (id,p,expected=[],extra={}) => ({id,fen:boardFen({...base,...p}),move:'a1b1',expected,centralPositionTags:true,scanReplies:false,...extra});
const authored = [
  f('open-no-slider',{},['open-pawn-center']),
  f('open-legal-slider',{a5:'r'},['open-pawn-center']),
  f('closed',closed,['closed-pawn-center']),
  f('split-semi-open',{e4:'P',d6:'p'},['split-semi-open-pawn-center']),
  f('fluid',fluid,['fluid-central-structure-choice']),
  f('pinned-fluid',{...fluid,h8:undefined,e6:'k',c4:'B'}),
  f('checked-fluid',{...fluid,f8:'B'},[],{move:'f8g7'}),
  f('one-fixed-file',{d4:'P',d5:'p'}),
  f('doubled-mobile-pawn',{...closed,e2:'P'}),
  f('piece-block-not-pawn-lock',{d4:'P',d5:'p',e4:'P',e5:'n',e6:'p'}),
  f('mobile-unresolved',{d4:'P',e4:'P',d7:'p',e7:'p'}),
  f('actual-en-passant',{e5:'P',f5:'p'},['open-pawn-center'],{fen:boardFen({...base,e5:'P',f5:'p'}).replace(' - - ',' - f6 '),move:'e5f6'}),
  f('actual-promotion',{e7:'P'},['open-pawn-center'],{move:'e7e8q'}),
  f('clock-terminal',{},[],{fen:boardFen(base).replace(' 0 1',' 99 1')}),
  f('zero-budget',fluid,[],{maxCentralPositionNodes:0}),
  f('tiny-budget',fluid,[],{maxCentralPositionNodes:5}),
];
function mirror(x) {
  const fields = x.fen.split(' '),ep = fields[3]; fields[3] = '-'; const out = reflect({...x,fen:fields.join(' ')});
  if (ep !== '-') { const ff = out.fen.split(' '); ff[3] = ep[0]+(9-+ep[1]); out.fen = ff.join(' '); }
  return out;
}
export const fixtures = authored.flatMap(x => [x,mirror(x)]);
