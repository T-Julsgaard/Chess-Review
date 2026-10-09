import {boardFen, reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const f=(id,men,move,expected=[])=>({id,fen:boardFen({a1:'K',h8:'k',...men}),move,expected});
export const fixtures=[
 {...f('queen-double',{b2:'N',d7:'q',f7:'p'},'b2e4',[]),inputError:'Illegal move'},
 f('knight-double',{b2:'N',d7:'q',f7:'p'},'b2d3',[]),
 f('regional-double',{e1:'R',c4:'n',g4:'p'},'e1e4',['double-legal-contact','queenside-attack-contact','kingside-attack-contact','light-square-contact']),
 f('f-pawn',{b1:'R',f7:'p'},'b1b7',['attack-f-pawn']),
 f('h-pawn',{b1:'R',h7:'p'},'b1b7',['attack-h-pawn']),
 f('g-pawn',{b1:'R',g7:'p'},'b1b7',['attack-g-pawn']),
 f('central-contact',{b1:'R',e4:'n'},'b1b4',['central-attack-contact','light-square-contact']),
 f('pinned-contact',{a1:null,d1:'K',d2:'R',d8:'r',f3:'n'},'d2d3',[]),
 f('unchanged-contact',{b4:'R',g4:'p'},'b4c4',[]),
 f('ordinary-pawn',{e2:'P'},'e2e4',['pawn-structure-change','central-pawn-expansion','majority-pawn-advance']),
 f('queenside-pawn',{b2:'P'},'b2b4',['pawn-structure-change','queenside-pawn-expansion']),
 f('kingside-pawn',{g2:'P'},'g2g4',['pawn-structure-change','kingside-pawn-expansion']),
 {id:'ep',fen:'7k/8/8/3pP3/8/8/8/K7 w - d6 0 1',move:'e5d6',expected:['pawn-structure-change']},
 f('promotion',{a7:'P',b8:'r'},'a7a8q',['pawn-structure-change']),
 f('unchanged-pawns',{b1:'R',e2:'P'},'b1b2',[]),
];
const start=boardFen({a1:'K',h8:'k',d1:'Q',d8:'q',e2:'R',b2:'P',h7:'p'},'b');
const c=legalPosition(start);c.move('d8d1');
fixtures.push({id:'queen-exchange',fen:c.fen(),move:'e2d2',history:{fen:start,moves:['d8d1']},expected:[],inputError:'Illegal move'});
// The recapturing rook needs the same square as the captured checking queen.
const qs=boardFen({a1:'K',h8:'k',d1:'Q',d8:'q',e1:'R',b2:'P',h7:'p'},'b');
const qc=legalPosition(qs);qc.move('d8d1');
fixtures.push({id:'queen-recapture',fen:qc.fen(),move:'e1d1',history:{fen:qs,moves:['d8d1']},
 expected:['trading-queens-fact','trading-checking-attacker','exchange-simplification','exchange-liquidation','endgame-exchange-simplification']});
export const bothColors=fixtures.filter(f=>f.id!=='ep').flatMap(f=>{
 const mirrored=reflect(f);
 mirrored.expected=mirrored.expected.map(id=>id==='light-square-contact'?'dark-square-contact':id==='dark-square-contact'?'light-square-contact':id);
 if(mirrored.history){const h=legalPosition(mirrored.history.fen);for(const m of mirrored.history.moves)h.move(m);mirrored.fen=h.fen();}
 return [f,mirrored];
});
bothColors.push(fixtures.find(f=>f.id==='ep'));
