import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {reflect as parentReflect} from '../../E024-transitions/code/fixtures.mjs';
const ids=['pawn-skeleton','paired-bishop-armies','rook-minor-armies','passed-count-imbalance','flank-count-imbalance'];
const f=(id,pieces,move,expected=[],absent=[],options={})=>({id,fen:setup(pieces),move,inventoryTags:true,expected,absent,note:'Authored synthetic '+id.replaceAll('-',' '),...options});
export const reflect=fixture=>fixture.inputError&&fixture.expectedError!=='terminal position'?{...fixture,id:fixture.id+'-black'}:parentReflect(fixture);
export const fixtures=[
  f('pawn-advance',{},'h2h3',['pawn-skeleton']),
  f('quiet-king-no-change',{},'a1b1',[],ids),
  f('pawn-capture-creates-passer',{c4:'P',d5:'p'},'c4d5',['pawn-skeleton','passed-count-imbalance']),
  f('pawn-capture-own-majority',{b2:'P',c4:'P',d5:'p'},'c4d5',['pawn-skeleton','flank-count-imbalance']),
  f('pawn-capture-enemy-majority',{b7:'p',c4:'P',d5:'p'},'c4d5',['pawn-skeleton','flank-count-imbalance']),
  f('d-e-boundary-transfer',{d4:'P',e5:'p'},'d4e5',['pawn-skeleton','flank-count-imbalance']),
  f('bishop-captures-pawn',{c1:'B',e3:'p'},'c1e3',['pawn-skeleton']),
  f('piece-capture-no-pawn-change',{c1:'R',c3:'n'},'c1c3',[],['pawn-skeleton']),
  f('own-paired-bishops-bn',{c1:'B',f1:'B',e2:'n',d4:'n',e4:'b'},'f1e2',['paired-bishop-armies']),
  f('own-paired-bishops-nn',{c1:'B',f1:'B',e2:'b',d4:'n',f6:'n'},'f1e2',['paired-bishop-armies']),
  f('enemy-paired-bishops',{c1:'B',c3:'N',e4:'q',c8:'b',f8:'b'},'c3e4',['paired-bishop-armies']),
  f('enemy-paired-bishops-nn',{b1:'N',c3:'N',e4:'q',c8:'b',f8:'b'},'c3e4',['paired-bishop-armies']),
  f('same-color-bishops-refused',{c1:'B',e3:'B',d4:'n',e4:'n',f6:'n'},'e3d4',[],['paired-bishop-armies']),
  f('extra-rook-refuses-pair',{c1:'B',f1:'B',b1:'R',e2:'n',d4:'n',e4:'b'},'f1e2',[],['paired-bishop-armies']),
  f('already-paired-armies',{c1:'B',f1:'B',d4:'n',e4:'b'},'h2h3',[],['paired-bishop-armies']),
  f('rook-vs-bb',{c1:'R',c3:'n',e5:'b',f6:'b'},'c1c3',['rook-minor-armies'],['paired-bishop-armies']),
  f('rook-vs-bn',{c1:'R',c3:'n',e5:'b',f6:'n'},'c1c3',['rook-minor-armies']),
  f('rook-vs-nn',{c1:'R',c3:'n',d5:'n',f6:'n'},'c1c3',['rook-minor-armies']),
  f('enemy-rook-vs-bn',{c3:'N',e2:'B',c8:'r',e4:'q'},'c3e4',['rook-minor-armies']),
  f('enemy-rook-vs-bb',{c1:'B',f1:'B',c8:'r',e2:'q'},'f1e2',['rook-minor-armies']),
  f('enemy-rook-vs-nn',{b1:'N',c3:'N',c8:'r',e4:'q'},'c3e4',['rook-minor-armies']),
  f('extra-knight-refuses-rook',{c1:'R',b1:'N',c3:'n',e5:'b',f6:'n'},'c1c3',[],['rook-minor-armies']),
  f('already-rook-armies',{c1:'R',f5:'b',f6:'n'},'h2h3',[],['rook-minor-armies']),
  f('blocked-passer-geometry',{c4:'P',c5:'n'},'h2h3',['pawn-skeleton']),
  f('pinned-passer-geometry',{a1:null,b4:'K',c4:'P',h4:'r'},'h2h3',['pawn-skeleton']),
  f('adjacent-pawn-ahead',{c4:'P',d6:'p'},'h2h3',['pawn-skeleton'],['passed-count-imbalance']),
  f('same-file-pawn-ahead',{c4:'P',c6:'p'},'h2h3',['pawn-skeleton']),
  f('same-file-pawn-behind',{c4:'P',c3:'p'},'h2h3',['pawn-skeleton']),
  f('adjacent-pawn-same-rank',{c4:'P',d4:'p'},'h2h3',['pawn-skeleton']),
  f('adjacent-pawn-behind',{c4:'P',d3:'p'},'h2h3',['pawn-skeleton']),
  f('ep-vulnerable-double',{c2:'P',d4:'p'},'c2c4',['pawn-skeleton','passed-count-imbalance']),
  f('ep-illegal-pinned-double',{h8:null,f4:'k',a4:'R',c2:'P',d4:'p'},'c2c4',['pawn-skeleton']),
  f('promotion-pair',{h8:null,h7:'k',c1:'B',g7:'P',f5:'b',f6:'n'},'g7g8b',['pawn-skeleton','paired-bishop-armies']),
  f('promotion-rook',{c7:'P',f5:'b',f6:'n'},'c7c8r',['pawn-skeleton','rook-minor-armies']),
  f('empty-map-after-queen',{h2:null,a7:'P'},'a7a8q',['pawn-skeleton']),
  f('own-empty-map',{h2:null,c1:'R',c3:'p'},'c1c3',['pawn-skeleton']),
  f('enemy-empty-map',{a7:null,c4:'P',d5:'p'},'c4d5',['pawn-skeleton']),
  f('actual-pawn-check',{g6:'P'},'g6g7',['pawn-skeleton']),
  f('actual-mate',{a1:null,h2:null,a7:null,f6:'K',g6:'Q'},'g6g7',[],ids,{expectedStatus:'not-live'}),
  f('actual-stalemate',{a1:null,h2:null,a7:null,f7:'K',g6:'Q'},'g6f5',[],ids,{expectedStatus:'not-live'}),
  f('dead-promotion',{h2:null,a7:'P'},'a7a8n',[],ids,{expectedStatus:'not-live'}),
  f('disabled-profile',{},'h2h3',[],ids,{inventoryTags:false}),
  f('zero-budget',{},'h2h3',[],ids,{maxInventoryNodes:0,expectedStatus:'exhausted'}),
  f('foundation-rejected',{},'h2h5',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}),
  f('foundation-exhausted',{},'h2h3',[],ids,{foundationTags:true,maxFoundationNodes:0,expectedStatus:'not-applicable'}),
  f('foundation-terminal-root',{h2:null,a7:null},'a1b1',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}),
];
for(const type of['q','r','b','n']){
  fixtures.push(f('promotion-'+type,{c7:'P'},'c7c8'+type,['pawn-skeleton']));
  fixtures.push(f('capture-promotion-'+type,{a7:'P',b8:'r'},'a7b8'+type,['pawn-skeleton']));
}
const epStart=setup({e5:'P',d5:'p'}).replace(' - - ',' - d6 ');
fixtures.push({...f('ep-capture',{},'e5d6',['pawn-skeleton']),fen:epStart});
fixtures.push({...f('quiet-ep-expiry',{c5:'P',d5:'p',f2:'P',f3:'N'},'f3e1',['passed-count-imbalance'],['pawn-skeleton']),fen:setup({c5:'P',d5:'p',f2:'P',f3:'N'}).replace(' - - ',' - d6 ')});
const quiet=setup({}),historyMoves=['a1b1','h8g8'],board=new Chess(quiet);for(const code of historyMoves)board.move(code);
fixtures.push({...f('valid-history',{},'h2h3',['pawn-skeleton']),fen:board.fen(),history:{fen:quiet,moves:historyMoves}});
const repetition=['a1b1','h8g8','b1a1','g8h8','a1b1','h8g8','b1a1','g8h8'],repeated=new Chess(quiet);for(const code of repetition)repeated.move(code);
fixtures.push({...f('repetition-root',{},'h2h3',[],ids,{expectedStatus:'not-live'}),fen:repeated.fen(),history:{fen:quiet,moves:repetition}});
fixtures.push({...f('clock-root',{},'h2h3',[],ids,{inputError:true,expectedError:'terminal position'}),fen:quiet.replace('0 1','100 1')});
fixtures.push({...f('foundation-clock-root',{},'h2h3',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}),fen:quiet.replace('0 1','100 1')});
for(const [id,options]of[['bad-flag',{inventoryTags:1}],['bad-budget',{maxInventoryNodes:-1}],['history-mismatch',{history:{fen:quiet,moves:['a1b1']}}]])fixtures.push(f(id,{},'h2h3',[],[],{...options,inputError:true}));
