import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';import {Chess} from '../../../../lib/chess.js';
const make=(name,pieces,move,ids,extra={})=>({name,fen:boardFen(pieces),move,jointMateTags:true,jointMatePlies:2,expected:ids,...extra});
const generic='joint-mating-coordination';
export const hypotheses=[
 make('queen-knight',{h1:'K',d5:'Q',h6:'N',h8:'k',f8:'r',g7:'p',h7:'p'},'d5g8',[generic,'queen-knight-joint-mate']),
 make('queen-bishop',{a1:'K',g5:'Q',b1:'B',h8:'k',a7:'p'},'g5g6',[generic,'queen-bishop-joint-mate']),
 make('king-rook',{f5:'K',a7:'R',h8:'k'},'f5g6',[generic,'king-rook-joint-mate']),
 make('rook-versus-minor',{f5:'K',a7:'R',h8:'k',a1:'n'},'f5g6',[generic,'king-rook-joint-mate','rook-versus-minor-joint-mate']),
 make('rook-versus-two-minors',{f5:'K',a7:'R',h8:'k',a1:'n',b1:'n'},'f5g6',[generic,'king-rook-joint-mate','rook-versus-two-minors-joint-mate']),
 make('king-knight',{e7:'K',h6:'N',h8:'k',a7:'p',h7:'p'},'e7f8',[generic,'king-knight-joint-mate']),
 make('bishop-pair',{f6:'K',f7:'B',h6:'B',h8:'k',a1:'n',b1:'n',h7:'p'},'h6g7',[generic,'bishop-pair-comparative-mate','bishop-pair-versus-other-minors'],{jointMatePlies:0})
];
export function mirrored(f){const out=reflect(f);if(out.history){const c=new Chess(out.history.fen);for(const m of out.history.moves)c.move(m);out.fen=c.fen();}return out;}

const historyStart=boardFen({a2:'K',g5:'Q',b1:'B',h8:'k',a7:'p'}),historyMoves=['a2a1','a7a6'],hc=new Chess(historyStart);for(const m of historyMoves)hc.move(m);
export const controls=[
 make('rook-versus-bishop',{f5:'K',a7:'R',h8:'k',a1:'b'},'f5g6',[]),
 make('rook-versus-mixed-minors',{f5:'K',a7:'R',h8:'k',a1:'b',b1:'n'},'f5g6',[]),
 make('bishop-knight-enemy',{f6:'K',f7:'B',h6:'B',h8:'k',a1:'n',b1:'b',h7:'p'},'h6g7',hypotheses[6].expected,{jointMatePlies:0}),
 make('redundant-bishop',{f7:'K',g5:'Q',b1:'B',h8:'k',a7:'p'},'g5g6',[]),
 make('substitution-still-mates',{f7:'K',e8:'B',h6:'B',h8:'k',h7:'p',a1:'n',b1:'n'},'h6g7',[],{jointMatePlies:0}),
 make('same-color-bishops',{f6:'K',f8:'B',h6:'B',h8:'k',a1:'n',b1:'n',h7:'p'},'h6g7',[],{jointMatePlies:0}),
 make('enemy-bishop-pair',{f6:'K',f7:'B',h6:'B',h8:'k',a2:'b',b1:'b',h7:'p'},'h6g7',['joint-mating-coordination','bishop-pair-comparative-mate'],{jointMatePlies:0}),
 make('illegal-removal-control',{f6:'K',e7:'Q',g6:'B',h8:'k',h6:'r'},'e7g7',[],{jointMatePlies:0}),
 {...hypotheses[1],name:'recorded-history',fen:hc.fen(),history:{fen:historyStart,moves:historyMoves}},
 {...hypotheses[1],name:'fifty-move-draw',fen:hypotheses[1].fen.replace(' 0 1',' 99 1'),expected:[]},
 {...hypotheses[6],name:'mate-over-fifty-draw',fen:hypotheses[6].fen.replace(' 0 1',' 99 1')},
 {...hypotheses[0],name:'zero-horizon',jointMatePlies:0,expected:[]},
 {...hypotheses[0],name:'atomic-budget',maxJointMateNodes:36,expected:[]},
 {...hypotheses[0],name:'zero-budget',maxJointMateNodes:0,expected:[]},
 make('missing-partner',{a1:'K',g5:'Q',h8:'k',a7:'p'},'g5g6',[]),
 make('extra-own-pawn',{a1:'K',g5:'Q',b1:'B',h8:'k',a7:'p',h2:'P'},'g5g6',[]),
 {...hypotheses[2],name:'wrong-rook-entry',move:'a7a8',expected:[]},
 {...hypotheses[1],name:'wrong-king-entry',move:'a1a2',expected:[]},
 make('capturing-entry',{a1:'K',g5:'Q',b1:'B',h8:'k',g6:'p',a7:'p'},'g5g6',[])
];
export const fixtures=[...hypotheses,...controls].flatMap(f=>[f,{...mirrored(f),name:f.name+'-black'}]);
