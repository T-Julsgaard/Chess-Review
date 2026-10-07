import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {mirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const ids = ['stonewall-structure','maroczy-bind'], stone = {c3:'P',d3:'P',e3:'P',f4:'P'};
const f = (id, pieces = {}, move = 'd3d4', expected = ['stonewall-structure'], opts = {}) => ({id,fen:setup({...stone,...pieces}),move,formationTags:true,expected,absent:ids.filter(x => !expected.includes(x)),...opts});
function recorded(id, pieces, moves, move='c2c4', expected=['maroczy-bind'], opts={}) {
  const history = {fen:setup(pieces,'b'),moves}, c = new Chess(history.fen);
  for (const m of moves) c.move(m);
  return {...f(id,{},move,expected,opts),fen:c.fen(),history};
}
const maroczy = {c2:'P',d2:'P',e4:'P',f3:'N',c7:'p'}, steps = ['c7c5','d2d4','c5d4','f3d4','h8g8'];
const cases = [
  f('stone-d-completes'),
  f('stone-c-completes',{c3:null,c2:'P',d3:null,d4:'P'},'c2c3'),
  f('stone-e-completes',{e3:null,e2:'P',d3:null,d4:'P'},'e2e3'),
  f('stone-f-double-completes',{f4:null,f2:'P',d3:null,d4:'P'},'f2f4'),
  f('stone-capture-completes',{c3:'n',b2:'P',d3:null,d4:'P'},'b2c3'),
  f('stone-supporter-pinned',{a1:null,c1:'K',c8:'r'},'d3d4',[]),
  f('stone-e-supporter-pinned',{a1:null,e1:'K',e8:'r'},'d3d4',[]),
  f('stone-missing-c',{c3:null},'d3d4',[]),
  f('stone-missing-e',{e3:null},'d3d4',[]),
  f('stone-missing-f',{f4:null},'d3d4',[]),
  f('stone-wrong-color',{c3:'p'},'d3d4',[]),
  f('stone-wrong-rank',{c3:null,c2:'P'},'d3d4',[]),
  f('stone-quiet-unrelated',{d3:null,d4:'P'},'a1b1',[]),
  f('stone-preexisting-pawn-move',{d3:null,d4:'P'},'h2h3',[]),
  f('stone-capturable-pawn',{c5:'p'}),
  f('stone-promotion-replies',{h2:'p'}),
  f('stone-terminal-promotion-replies',{h2:'p',a2:'P',b2:'P'}),
  f('stone-en-passant-reply',{f4:null,f2:'P',d3:null,d4:'P',e4:'p'},'f2f4'),
  f('stone-check-actual-counterframe-refused',{h8:null,g5:'k',f4:null,f2:'P',d3:null,d4:'P'},'f2f4',[]),
  f('stone-actual-stalemate',{a1:null,g6:'K',a7:null,f7:'Q'},'d3d4',[]),
  f('stone-disabled',{},'d3d4',[],{formationTags:false}),
  f('stone-zero-budget',{},'d3d4',[],{maxFormationNodes:0}),
  f('stone-illegal-step',{},'d3d5',[],{invalid:true}),
  recorded('maroczy-recorded-exchange',maroczy,steps),
  recorded('maroczy-own-d-captures',{...maroczy,c8:'r'},['c7c5','d2d4','h8g8','d4c5','c8c5']),
  recorded('maroczy-original-exchange-en-passant',{...maroczy,b8:'n'},['h8g8','d2d4','g8h8','d4d5','c7c5','d5c6','b8c6']),
  recorded('maroczy-e-completes',{...maroczy,e4:null,e2:'P',c2:null,c4:'P'},steps,'e2e4'),
  recorded('maroczy-single-step',{...maroczy,c2:null,c3:'P'},steps,'c3c4'),
  recorded('maroczy-capture-completes',{...maroczy,c2:null,b3:'P',c4:'n'},steps,'b3c4'),
  recorded('maroczy-control-pinned',{...maroczy,a1:null,e1:'K',e8:'r'},steps,'c2c4',[]),
  recorded('maroczy-extra-d-file-pawn',{...maroczy,d3:'P'},['c7c5','d3d4','c5d4','f3d4','h8g8'],'c2c4',[]),
  recorded('maroczy-extra-enemy-c-file-pawn',{...maroczy,c6:'p'},['c6c5','d2d4','c5d4','f3d4','h8g8'],'c2c4',[]),
  recorded('maroczy-wrong-root-d-pawn',{...maroczy,d2:null,d3:'P'},['c7c5','d3d4','c5d4','f3d4','h8g8'],'c2c4',[]),
  recorded('maroczy-wrong-root-c-pawn',{...maroczy,c7:null,c6:'p'},['c6c5','d2d4','c5d4','f3d4','h8g8'],'c2c4',[]),
  recorded('maroczy-promotion-replies',{...maroczy,h2:'p'},steps),
  recorded('maroczy-terminal-promotion-replies',{...maroczy,h2:'p',a2:'P',b2:'P'},steps),
  recorded('maroczy-pawn-loss-reply',{...maroczy,b5:'p'},steps),
  recorded('maroczy-en-passant-reply',{...maroczy,b4:'p'},steps),
  recorded('maroczy-delayed-recapture',maroczy,['c7c5','d2d4','c5d4','a1b1','h8g8','f3d4','g8h8'],'c2c4',[]),
];
const legal = cases.find(f => f.id === 'maroczy-recorded-exchange');
cases.push({...legal,id:'maroczy-no-history',history:undefined,expected:[],absent:ids});
const clock = f('stone-pawn-clock-reset'); clock.fen=clock.fen.replace(' 0 1',' 99 1'); cases.push(clock);
// Full legal history returns to a nearly repeated shape; actual pawn move resets
// the fifty-move clock and irreversibly changes placement, preventing repetition.
const hist = {fen:setup(stone),moves:['a1b1','h8g8','b1a1','g8h8','a1b1','h8g8']}, c=new Chess(hist.fen);
for(const m of hist.moves)c.move(m);
cases.push({...f('stone-reversible-history'),fen:c.fen(),history:hist});
// Horizontal reflection changes fixed files; it must not retain the named label.
export const fixtures = cases.flatMap(row => [row,{...mirror(row),expected:[],absent:ids}]);
