import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {reflect as parentReflect} from '../../E024-transitions/code/fixtures.mjs';
const ids=['connected-passer-proof','open-pawn-file-proof','open-rank-proof'];
const f=(id,pieces,move,expected=[],absent=[],options={})=>({id,fen:setup(pieces),move,openLineTags:true,expected,absent,note:'Authored synthetic '+id.replaceAll('-',' '),...options});
export const reflect=fixture=>fixture.inputError&&!['terminal position','Illegal move'].includes(fixture.expectedError)?{...fixture,id:fixture.id+'-black'}:parentReflect(fixture);
export const fixtures=[
 f('connected-new-same-rank',{c4:'P',d2:'P'},'d2d4',['connected-passer-proof']),
 f('connected-new-diagonal',{c4:'P',d2:'P'},'d2d3',['connected-passer-proof']),
 f('connected-advance',{c4:'P',d4:'P'},'c4c5',['connected-passer-proof']),
 f('connected-chain-three',{a7:null,h7:'p',b4:'P',c2:'P',d4:'P'},'c2c4',['connected-passer-proof']),
 f('connected-unchanged-king',{c4:'P',d4:'P'},'a1b1',[],['connected-passer-proof']),
 f('connected-nonadjacent',{b4:'P',d2:'P'},'d2d4',[],['connected-passer-proof']),
 f('connected-rank-gap',{c5:'P',d2:'P'},'d2d3',[],['connected-passer-proof']),
 f('connected-front-same-file',{c4:'P',d2:'P',c6:'p'},'d2d4',[],['connected-passer-proof']),
 f('connected-front-adjacent',{c4:'P',d2:'P',e6:'p'},'d2d4',[],['connected-passer-proof']),
 f('connected-front-same-rank',{c4:'P',d3:'P',e4:'p'},'d3d4',['connected-passer-proof']),
 f('connected-front-behind',{c4:'P',d2:'P',e3:'p'},'d2d4',['connected-passer-proof']),
 f('connected-own-blockade',{c4:'P',c5:'P',d3:'P'},'d3d4',['connected-passer-proof']),
 f('connected-extra-knight',{c4:'P',d2:'P',f3:'N'},'d2d4',[],['connected-passer-proof']),
 f('connected-extra-enemy-rook',{a7:null,h7:'p',g6:'r',c4:'P',d2:'P'},'d2d4',[],['connected-passer-proof']),
 f('connected-empty-enemy',{a7:null,c4:'P',d2:'P'},'d2d4',[],['connected-passer-proof']),
 f('connected-ep-vulnerable',{b4:'P',c2:'P',d4:'p'},'c2c4',[],['connected-passer-proof']),
 f('connected-ep-pinned-extra-rook',{h8:null,d8:'k',d1:'R',b4:'P',c2:'P',d4:'p'},'c2c4',[],['connected-passer-proof']),
 f('connected-capture-new',{c4:'P',e3:'P',d4:'p'},'e3d4',['connected-passer-proof','open-pawn-file-proof']),
 f('connected-capture-advance',{c4:'P',d4:'P',e5:'p'},'d4e5',[],['connected-passer-proof']),
 f('open-file-pawn-transfer',{c4:'P',d5:'p'},'c4d5',['open-pawn-file-proof']),
 f('open-file-pawn-remains',{c2:'P',c4:'P',d5:'p'},'c4d5',[],['open-pawn-file-proof']),
 f('open-file-enemy-remains',{c6:'p',c4:'P',d5:'p'},'c4d5',[],['open-pawn-file-proof']),
 f('open-file-bishop-capture',{b3:'B',c4:'p'},'b3c4',['open-pawn-file-proof']),
 f('open-file-remaining-rook',{c1:'R',c4:'P',d5:'p'},'c4d5',['open-pawn-file-proof']),
 f('open-file-already-open',{c1:'R'},'c1c3',[],['open-pawn-file-proof']),
 f('open-file-no-transfer',{},'h2h3',[],['open-pawn-file-proof']),
 f('rank-rook-four',{d4:'R'},'d4a4',['open-rank-proof']),
 f('rank-queen-four',{d4:'Q',h8:null,g8:'k'},'d4h4',['open-rank-proof']),
 f('rank-own-pawn-blocker',{d4:'R',h4:'P'},'d4a4',[],['open-rank-proof']),
 f('rank-enemy-pawn-blocker',{d4:'R',h4:'p'},'d4a4',[],['open-rank-proof']),
 f('rank-own-piece-blocker',{d4:'R',h4:'N'},'d4a4',[],['open-rank-proof']),
 f('rank-enemy-piece-blocker',{d4:'R',h4:'n'},'d4a4',[],['open-rank-proof']),
 f('rank-capture-blocker',{d4:'R',a4:'n'},'d4a4',[],['open-rank-proof']),
 f('rank-vertical',{d4:'R'},'d4d5',[],['open-rank-proof']),
 f('rank-queen-diagonal',{d4:'Q',h8:null,g8:'k'},'d4e5',[],['open-rank-proof']),
 f('rank-restricted-check-evasion',{a7:null,h7:'p',a8:'r',d4:'R'},'d4a4',[],['open-rank-proof']),
 f('rank-absolute-pin',{a1:null,d1:'K',d4:'R',d8:'r'},'d4d5',[],['open-rank-proof']),
 f('actual-check',{d4:'R'},'d4h4',['open-rank-proof']),
 f('actual-mate',{a1:null,h2:null,a7:null,f6:'K',g6:'Q'},'g6g7',[],ids,{expectedStatus:'not-live'}),
 f('actual-stalemate',{a1:null,h2:null,a7:null,f7:'K',g6:'Q'},'g6f5',[],ids,{expectedStatus:'not-live'}),
 f('dead-promotion',{h2:null,a7:'P'},'a7a8n',[],ids,{expectedStatus:'not-live'}),
 f('disabled-profile',{},'h2h3',[],ids,{openLineTags:false}),
 f('zero-budget',{},'h2h3',[],ids,{maxOpenLineNodes:0,expectedStatus:'exhausted'}),
 f('foundation-rejected',{},'h2h5',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}),
 f('foundation-exhausted',{},'h2h3',[],ids,{foundationTags:true,maxFoundationNodes:0,expectedStatus:'not-applicable'}),
 f('foundation-terminal-root',{h2:null,a7:null},'a1b1',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}),
];
for(const type of ['q','r','b','n']){
 fixtures.push(f('promotion-'+type,{a7:'P'},'a7a8'+type,['open-pawn-file-proof'],['connected-passer-proof','open-rank-proof']));
 fixtures.push(f('capture-promotion-'+type,{a7:'P',b8:'r'},'a7b8'+type,['open-pawn-file-proof'],['connected-passer-proof','open-rank-proof']));
}
for(let rank=1;rank<=8;rank++)for(const piece of ['R','Q']){
 const pieces={d4:null,['d'+rank]:piece};
 if(rank===1){pieces.a1=null;pieces.b2='K';}
 if(rank===2){pieces.h2=null;pieces.h3='P';}
 if(rank===7){pieces.a7=null;pieces.h6='p';}
 if(rank===8){pieces.h8=null;pieces.g7='k';}
 if(rank===4&&piece==='Q'){pieces.h8=null;pieces.g8='k';}
 // Queen on d8 must not attack g7 before the actual move; the diagonal differs.
 fixtures.push(f('rank-'+piece.toLowerCase()+'-'+rank,pieces,'d'+rank+'b'+rank,['open-rank-proof']));
}
fixtures.push({...f('ep-capture',{c6:'P',e5:'P',d5:'p'},'e5d6',['connected-passer-proof','open-pawn-file-proof']),fen:setup({c6:'P',e5:'P',d5:'p'}).replace(' - - ',' - d6 ')});
const quiet=setup({}),moves=['a1b1','h8g8'],history=new Chess(quiet);for(const code of moves)history.move(code);fixtures.push({...f('valid-history',{},'h2h3',[],ids),fen:history.fen(),history:{fen:quiet,moves}});
const repetition=['a1b1','h8g8','b1a1','g8h8','a1b1','h8g8','b1a1','g8h8'],repeated=new Chess(quiet);for(const code of repetition)repeated.move(code);fixtures.push({...f('repetition-root',{},'h2h3',[],ids,{expectedStatus:'not-live'}),fen:repeated.fen(),history:{fen:quiet,moves:repetition}});
fixtures.push({...f('clock-root',{},'h2h3',[],ids,{inputError:true,expectedError:'terminal position'}),fen:quiet.replace('0 1','100 1')});
fixtures.push({...f('foundation-clock-root',{},'h2h3',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}),fen:quiet.replace('0 1','100 1')});
for(const [id,options]of [['bad-flag',{openLineTags:1}],['bad-budget-negative',{maxOpenLineNodes:-1}],['bad-budget-fraction',{maxOpenLineNodes:1.5}],['bad-budget-large',{maxOpenLineNodes:50001}],['history-mismatch',{history:{fen:quiet,moves:['a1b1']}}]])fixtures.push(f(id,{},'h2h3',[],[],{...options,inputError:true}));

fixtures.push({...f('malformed-fen',{},'h2h3',[],[],{inputError:true}),fen:'invalid'});
fixtures.push(f('malformed-uci',{},'h2-h3',[],[],{inputError:true}));
fixtures.push(f('ordinary-illegal',{},'h2h5',[],[],{inputError:true}));
fixtures.push({...f('default-dead-root',{h2:null,a7:null},'a1b1',[],[],{inputError:true,expectedError:'terminal position'})});

fixtures.push(f('actual-dead-capture',{h2:null,a7:null,b3:'B',d5:'n'},'b3d5',[],ids,{expectedStatus:'not-live'}));
fixtures.push({...f('castle',{a1:null,h8:null,e1:'K',e8:'k',h1:'R'},'e1g1',[],ids),fen:setup({a1:null,h8:null,e1:'K',e8:'k',h1:'R'}).replace(' - - ',' K - ')});
for(const [id,queen]of [['root-mate','b2'],['root-stalemate','c2']]){const pieces={h2:null,a7:null,h8:null,c3:'k',[queen]:'q'};fixtures.push(f(id,pieces,'a1a2',[],ids,{inputError:true,expectedError:'Illegal move'}));fixtures.push(f('foundation-'+id,pieces,'a1a2',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}));}
