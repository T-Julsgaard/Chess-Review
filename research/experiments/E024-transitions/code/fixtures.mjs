import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {reflect as baseReflect} from '../../E020-coach-concepts/code/fixtures.mjs';
const pure=extra=>setup({a7:null,h2:null,...extra});
const f=(id,extra,move,expected=[],absent=[])=>({id,fen:pure(extra),move,expected,absent,note:id.replaceAll('-',' ')});
function trade(id,extra,first,move,expected){const start=pure(extra).replace(' w ',' b '),c=new Chess(start);c.move(first);return{id,fen:c.fen(),move,expected,absent:[],note:id.replaceAll('-',' '),history:{fen:start,moves:[first]}};}
export function reflect(f){const r=baseReflect(f);if(f.history){const start=baseReflect({...f,fen:f.history.fen}).fen,moves=f.history.moves.map(m=>m[0]+(9- +m[1])+m[2]+(9- +m[3])+(m[4]||'')),c=new Chess(start);for(const m of moves)c.move(m);r.history={fen:start,moves};r.fen=c.fen();}return r;}
export const fixtures=[
 f('king-pawn-king',{c2:'P'},'c2c3',['ending-king-pawn-king']),
 f('rook-pawn-rook',{d1:'R',h7:'r',d4:'P'},'d4d5',['ending-rook-pawn-rook']),
 f('bishop-pawn-bishop',{c1:'B',f8:'b',d2:'P'},'d2d3',['ending-bishop-pawn-bishop']),
 f('knight-pawn-knight',{c1:'N',f8:'n',d2:'P'},'d2d3',['ending-knight-pawn-knight']),
 f('queen-rook',{e1:'Q',b8:'r',e4:'b'},'e1e4',['ending-queen-rook']),
 f('queen-bishop',{e1:'Q',b8:'b',e4:'n'},'e1e4',['ending-queen-minor']),
 f('queen-knight',{e1:'Q',b8:'n',e4:'b'},'e1e4',['ending-queen-minor']),
 f('queen-rook-pawn',{e1:'Q',b8:'r',b6:'p',e4:'b'},'e1e4',['ending-queen-rook-pawn']),
 f('queen-advanced-pawn',{e1:'Q',d2:'p',e4:'b'},'e1e4',['ending-queen-advanced-pawn']),
 f('rook-bishop-rook',{d1:'R',c1:'B',b8:'r',d4:'n'},'d1d4',['ending-rook-bishop-rook']),
 f('rook-knight-rook',{d1:'R',c1:'N',b8:'r',d4:'b'},'d1d4',['ending-rook-knight-rook']),
 f('two-bishops-knight',{c1:'B',f1:'B',c8:'n',e2:'r'},'f1e2',['ending-two-bishops-knight']),
 f('same-color-bishops-not-pair',{c1:'B',e3:'B',c8:'n',d2:'r'},'c1d2',[],['ending-two-bishops-knight']),
 f('rook-connected-pawns',{e1:'R',c6:'p',d6:'p',e4:'b'},'e1e4',['ending-rook-connected-pawns','ending-rook-passed-pawns']),
 f('rook-passed-pawn',{e1:'R',c6:'p',e4:'b'},'e1e4',['ending-rook-passed-pawns']),
 f('knight-connected-pawns',{c1:'N',c6:'p',d6:'p',d3:'b'},'c1d3',['ending-knight-connected-pawns']),
 f('king-pawn-extra-pawn',{c2:'P',d2:'P'},'c2c3',[],['ending-king-pawn-king']),
 f('rook-ending-extra-bishop',{d1:'R',h7:'r',d4:'P',f8:'b'},'d4d5',[],['ending-rook-pawn-rook','ending-r-ending']),
 f('old-ending-king-move',{c2:'P'},'a1b1',[],['ending-king-pawn-king','ending-pawn-ending']),
 f('queen-centralization',{d1:'Q'},'d1d4',['queen-centralization']),
 f('old-central-queen',{h8:null,h7:'k',d4:'Q'},'d4e4',[],['queen-centralization']),
 f('queen-check',{d1:'Q'},'d1h5',['queen-check']),
 f('passed-pawn-promotion-check',{e7:'P'},'e7e8q',['queen-check','passed-pawn-check']),
 f('queen-behind-own-passer',{e1:'Q',d4:'P'},'e1d1',['queen-behind-passer']),
 f('queen-behind-enemy-passer',{h8:null,h7:'k',e8:'Q',d4:'p'},'e8d8',['queen-behind-passer']),
 f('blocked-queen-passer',{e1:'Q',d5:'P',d3:'B'},'e1d1',[],['queen-behind-passer']),
 f('rook-lift-preparation',{h1:'R',h7:'p'},'h1h3',['rook-lift-preparation']),
 f('rook-lift-horizontal',{h8:null,g8:'k',h3:'R'},'h3d3',['rook-lift']),
 f('knight-outpost',{f3:'N',c3:'P'},'f3d4',['protected-knight-outpost']),
 f('pawn-challenged-outpost',{f3:'N',c3:'P',e6:'p'},'f3d4',[],['protected-knight-outpost']),
 f('pawn-past-outpost',{f4:'N',c4:'P',e4:'p'},'f4d5',['protected-knight-outpost']),
 f('unsupported-knight',{f3:'N',h2:'P'},'f3d4',[],['protected-knight-outpost']),
 trade('queen-trade',{d1:'Q',d7:'q',c1:'R',h2:'P',a7:'p'},'d7d1','c1d1',['queen-trade']),
 trade('rook-trade-pawn-ending',{d4:'R',e4:'r',c3:'P',h2:'P',a7:'p'},'e4d4','c3d4',['rook-trade','rook-trade-pawn-ending','pawn-ending-transition']),
 trade('minor-equal-trade',{d4:'N',e5:'b',c3:'P',h2:'P',a7:'p'},'e5d4','c3d4',['minor-trade','equal-trade']),
 trade('unequal-exchange',{d4:'R',e5:'b',c3:'P',h2:'P',a7:'p'},'e5d4','c3d4',['exchange-difference','unequal-trade']),
 {...trade('promotion-history',{a1:null,g1:'K',c1:'R',d1:'R',b2:'p'},'b2c1q','d1c1',[]),absent:['exchange','unequal-trade']},
 {...trade('capture-other-piece',{d1:'R',d7:'q',c1:'R',f1:'Q',g2:'b',h2:'P',a7:'p'},'d7d1','f1g2',[]),absent:['exchange']},
 f('king-rook-mate',{g6:'K',a1:'R'},'a1a8',['king-rook-mate']),
 f('king-queen-mate',{a1:null,f6:'K',g6:'Q'},'g6g7',['king-queen-mate']),
 f('king-two-bishops-mate',{a1:null,g6:'K',g5:'B',f7:'B'},'g5f6',['king-bishops-mate']),
 f('bishop-knight-mate',{a1:null,g6:'K',g5:'B',e7:'N'},'g5f6',['bishop-knight-mate']),
 f('queen-rook-supported-mate',{g6:'Q',a7:'R'},'g6g7',['queen-rook-mate']),
 f('inert-rook-not-team-mate',{a1:null,f6:'K',g6:'Q',e1:'R'},'g6g7',[],['queen-rook-mate','king-queen-mate']),
];
const epStart='7k/8/8/8/2Pp4/8/3B4/K7 b - c3 0 1',ep=new Chess(epStart);ep.move('d4c3');
fixtures.push({id:'en-passant-history-exchange',fen:ep.fen(),move:'d2c3',expected:['exchange','equal-trade'],absent:[],note:'Verified pawn exchange following en passant',history:{fen:epStart,moves:['d4c3']}});
