import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {reflect as priorReflect} from '../../E077-connected-passers-open-lines/code/fixtures.mjs';
const ids=['outside-chain-proof','behind-chain-proof','slider-battery-proof'];
const f=(id,pieces,move,expected=[],absent=[],options={})=>({id,fen:setup(pieces),move,placementTags:true,expected,absent,note:'Authored synthetic '+id.replaceAll('-',' '),...options});
export const reflect=priorReflect;
export const fixtures=[
 f('outside-chain',{d2:'B',c3:'P',d4:'P'},'d2g5',['outside-chain-proof']),
 f('outside-chain-capture',{d2:'B',c3:'P',d4:'P',g5:'n'},'d2g5',['outside-chain-proof']),
 f('outside-branched-chain',{d2:'B',c3:'P',d4:'P',c5:'P',e5:'P'},'d2h6',['outside-chain-proof']),
 f('outside-separate-chains',{d2:'B',c3:'P',d4:'P',g2:'P',h3:'P'},'d2g5',['outside-chain-proof']),
 f('outside-still-not-beyond',{d2:'B',c3:'P',d4:'P'},'d2e3',[],['outside-chain-proof']),
 f('outside-nonchain-pawn',{d2:'B',c3:'P'},'d2g5',[],['outside-chain-proof']),
 f('outside-enemy-pawns',{d2:'B',c3:'p',d4:'p'},'d2g5',[],['outside-chain-proof']),
 f('outside-other-first-blocker',{d2:'B',c3:'N',d4:'P',c5:'P'},'d2g5',[],['outside-chain-proof']),
 f('outside-no-root-restriction',{d2:'B',c4:'P',d5:'P'},'d2h6',[],['outside-chain-proof']),
 f('outside-wrong-bishop-color',{e2:'B',c3:'P',d4:'P'},'e2h5',[],['outside-chain-proof']),
 f('outside-beyond-but-backward-chain',{b1:'B',g4:'P',h3:'P'},'b1f5',[],['outside-chain-proof']),
 f('outside-unchanged-bishop',{d2:'B',c3:'P',d4:'P'},'a1b1',[],['outside-chain-proof','behind-chain-proof']),
 f('outside-chain-pawn-move',{d2:'B',c3:'P',d4:'P'},'d4d5',[],['outside-chain-proof','behind-chain-proof']),
 f('behind-chain',{e3:'B',c3:'P',d4:'P'},'e3d2',['behind-chain-proof']),
 f('behind-branched-chain',{e3:'B',c3:'P',d4:'P',c5:'P',e5:'P'},'e3d2',['behind-chain-proof']),
 f('behind-already',{d2:'B',c3:'P',d4:'P'},'d2e1',[],['behind-chain-proof']),
 f('behind-nonrestrictive',{e3:'B',b3:'P',c4:'P'},'e3d2',[],['behind-chain-proof']),
 f('qr-file',{d1:'Q',a4:'R'},'a4d4',['slider-battery-proof']),
 f('qr-rank',{a4:'Q',d1:'R'},'d1d4',['slider-battery-proof']),
 f('qb-rising',{d1:'Q',f1:'B'},'f1e2',['slider-battery-proof']),
 f('qb-falling',{d5:'Q',e2:'B'},'e2f3',['slider-battery-proof']),
 f('qq-file',{d1:'Q',a4:'Q'},'a4d4',['slider-battery-proof']),
 f('qq-rising',{d1:'Q',e3:'Q'},'e3f3',['slider-battery-proof']),
 f('qq-falling',{d5:'Q',e2:'Q'},'e2f3',['slider-battery-proof']),
 f('rr-file',{d1:'R',a4:'R'},'a4d4',['slider-battery-proof']),
 f('bb-rising',{d1:'B',g2:'B'},'g2f3',['slider-battery-proof']),
 f('triple-queen-middle',{a7:'R',d1:'R',d4:'Q',h8:null,g8:'k',b6:'p'},'a7d7',['slider-battery-proof']),
 f('triple-queen-front',{d7:'Q',d1:'R',a4:'R'},'a4d4',['slider-battery-proof']),
 f('triple-queen-rear',{d1:'Q',d4:'R',a7:'R'},'a7d7',['slider-battery-proof']),
 f('four-sliders',{d1:'R',d3:'Q',d5:'R',a7:'R'},'a7d7',['slider-battery-proof']),
 f('capture-compatible-blocker',{d1:'R',d5:'Q',d3:'n',a3:'R'},'a3d3',['slider-battery-proof']),
 f('move-noncompatible-blocker',{d1:'R',d5:'Q',d3:'N'},'d3f4',['slider-battery-proof']),
 f('battery-knight-blocker',{d1:'R',d5:'Q',d3:'N'},'d5d6',[],['slider-battery-proof']),
 f('battery-pawn-blocker',{d1:'R',d5:'Q',d3:'P'},'d5d6',[],['slider-battery-proof']),
 f('battery-bishop-orth-blocker',{d1:'R',d5:'Q',d3:'B'},'d5d6',[],['slider-battery-proof']),
 f('battery-king-blocker',{a1:null,d3:'K',d1:'R',d5:'Q'},'d5d6',[],['slider-battery-proof']),
 f('battery-enemy-rook-blocker',{d1:'R',d5:'Q',d3:'r'},'d5d6',[],['slider-battery-proof']),
 f('battery-enemy-endpoint',{d1:'Q',d5:'r'},'d1d2',[],['slider-battery-proof']),
 f('battery-singleton',{d1:'Q'},'d1d2',[],['slider-battery-proof']),
 f('battery-rook-bishop-incompatible',{d1:'R',e3:'B'},'e3f2',[],['slider-battery-proof']),
 f('battery-existing-advance',{d1:'Q',d4:'R'},'d4d5',[],['slider-battery-proof']),
 f('battery-existing-quiet',{d1:'Q',d4:'R'},'a1b1',[],['slider-battery-proof']),
 f('battery-queen-with-enemy-bound',{d1:'Q',a4:'R',d6:'r'},'a4d4',['slider-battery-proof']),
 f('battery-diagonal-own-rook-blocker',{d1:'Q',e2:'R',f3:'B'},'f3g4',[],['slider-battery-proof']),
 f('disabled-profile',{},'h2h3',[],ids,{placementTags:false}),
 f('zero-budget',{},'h2h3',[],ids,{maxPlacementNodes:0,expectedStatus:'exhausted'}),
 f('foundation-rejected',{},'h2h5',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}),
 f('foundation-exhausted',{},'h2h3',[],ids,{foundationTags:true,maxFoundationNodes:0,expectedStatus:'not-applicable'}),
 f('foundation-terminal-root',{h2:null,a7:null},'a1b1',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}),
 f('actual-mate',{a1:null,h2:null,a7:null,f6:'K',g6:'Q'},'g6g7',[],ids,{expectedStatus:'not-live'}),
 f('actual-stalemate',{a1:null,h2:null,a7:null,f7:'K',g6:'Q'},'g6f5',[],ids,{expectedStatus:'not-live'}),
 f('dead-promotion',{h2:null,a7:'P'},'a7a8n',[],ids,{expectedStatus:'not-live'}),
];
fixtures.push({...f('ep-removes-two-blockers',{a5:'R',f5:'R',e5:'P',d5:'p'},'e5d6',['slider-battery-proof']),fen:setup({a5:'R',f5:'R',e5:'P',d5:'p'}).replace(' - - ',' - d6 ')});
const quiet=setup({}),moves=['a1b1','h8g8'],history=new Chess(quiet);for(const key of moves)history.move(key);fixtures.push({...f('valid-history',{},'h2h3',[],ids),fen:history.fen(),history:{fen:quiet,moves}});
const repetition=['a1b1','h8g8','b1a1','g8h8','a1b1','h8g8','b1a1','g8h8'],repeated=new Chess(quiet);for(const key of repetition)repeated.move(key);fixtures.push({...f('repetition-root',{},'h2h3',[],ids,{expectedStatus:'not-live'}),fen:repeated.fen(),history:{fen:quiet,moves:repetition}});
fixtures.push({...f('clock-root',{},'h2h3',[],ids,{inputError:true,expectedError:'terminal position'}),fen:quiet.replace('0 1','100 1')});
fixtures.push({...f('foundation-clock-root',{},'h2h3',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}),fen:quiet.replace('0 1','100 1')});
for(const [id,options]of [['bad-flag',{placementTags:1}],['bad-budget-negative',{maxPlacementNodes:-1}],['bad-budget-fraction',{maxPlacementNodes:1.5}],['bad-budget-large',{maxPlacementNodes:50001}],['history-mismatch',{history:{fen:quiet,moves:['a1b1']}}]])fixtures.push(f(id,{},'h2h3',[],[],{...options,inputError:true}));

fixtures.push(f('behind-two-blockers-already',{e1:'B',c3:'P',e3:'P',d4:'P'},'e1d2',[],['behind-chain-proof']));
fixtures.push(f('rr-rank',{a4:'R',d1:'R'},'d1d4',['slider-battery-proof']));
fixtures.push(f('qq-rank',{a4:'Q',d1:'Q'},'d1d4',['slider-battery-proof']));
fixtures.push(f('bb-falling',{d5:'B',e2:'B'},'e2f3',['slider-battery-proof']));
fixtures.push(f('triple-queens',{d1:'Q',d3:'Q',a6:'Q'},'a6d6',['slider-battery-proof']));
fixtures.push(f('four-bishops',{d1:'B',e2:'B',f3:'B',h3:'B'},'h3g4',['slider-battery-proof']));
fixtures.push(f('merge-maximal-groups',{d1:'R',d3:'Q',d4:'N',d5:'R',d7:'Q'},'d4f5',['slider-battery-proof']));
fixtures.push(f('split-triple-to-pair',{d1:'R',d4:'Q',d7:'R',h8:null,g8:'k'},'d4e4',['slider-battery-proof']));
fixtures.push(f('split-pair-to-singletons',{d1:'Q',d4:'R'},'d4e4',[],['slider-battery-proof']));
for(const type of ['q','r','b','n']){const pieces=type==='q'?{a7:'P',c7:'P',f5:'Q'}:type==='r'?{c7:'P',c4:'R'}:type==='b'?{c7:'P',f5:'B'}:{c7:'P',f5:'Q'};fixtures.push(f('promotion-'+type,pieces,'c7c8'+type,type==='n'?[]:['slider-battery-proof'],['outside-chain-proof','behind-chain-proof',...(type==='n'?['slider-battery-proof']:[])]));const capturePieces=type==='q'?{c7:'P',d8:'r',d4:'Q',h8:null,g8:'k'}:type==='r'?{c7:'P',d8:'r',d4:'R'}:type==='b'?{c7:'P',d8:'r',f6:'B',h8:null,g8:'k'}:{c7:'P',d8:'r',d4:'Q',h8:null,g8:'k'};fixtures.push(f('capture-promotion-'+type,capturePieces,'c7d8'+type,type==='n'?[]:['slider-battery-proof'],['outside-chain-proof','behind-chain-proof',...(type==='n'?['slider-battery-proof']:[])]));}

fixtures.push(f('bb-falling-existing',{d5:'B',g2:'B'},'g2f3',[],['slider-battery-proof']));

fixtures.push({...f('malformed-fen',{},'h2h3',[],[],{inputError:true}),fen:'invalid'});
fixtures.push(f('malformed-uci',{},'h2-h3',[],[],{inputError:true}));
fixtures.push(f('ordinary-illegal',{},'h2h5',[],[],{inputError:true}));
fixtures.push(f('default-dead-root',{h2:null,a7:null},'a1b1',[],[],{inputError:true,expectedError:'terminal position'}));
fixtures.push(f('actual-dead-capture',{h2:null,a7:null,b3:'B',d5:'n'},'b3d5',[],ids,{expectedStatus:'not-live'}));
fixtures.push(f('combined-profiles',{d1:'Q',a4:'R'},'a4d4',['slider-battery-proof'],[],{foundationTags:true,inventoryTags:true,openLineTags:true}));
for(const [id,queen]of [['root-mate','b2'],['root-stalemate','c2']]){const pieces={h2:null,a7:null,h8:null,c3:'k',[queen]:'q'};fixtures.push(f(id,pieces,'a1a2',[],ids,{inputError:true,expectedError:'Illegal move'}));fixtures.push(f('foundation-'+id,pieces,'a1a2',[],ids,{foundationTags:true,expectedStatus:'not-applicable'}));}

fixtures.push(f('two-new-batteries',{d1:'R',a4:'R',e3:'Q',h8:null,g8:'k'},'e3d4',['slider-battery-proof']));

const mirrorBase={a1:null,h8:null,h1:'K',a8:'k',h2:null,a7:null,a2:'P',h7:'p'};
fixtures.push(f('outside-chain-reversed-file',{...mirrorBase,e2:'B',f3:'P',e4:'P'},'e2b5',['outside-chain-proof']));
fixtures.push(f('outside-capture-reversed-file',{...mirrorBase,e2:'B',f3:'P',e4:'P',b5:'n'},'e2b5',['outside-chain-proof']));
fixtures.push(f('outside-branch-reversed-file',{...mirrorBase,e2:'B',f3:'P',e4:'P',f5:'P',d5:'P'},'e2a6',['outside-chain-proof']));
fixtures.push(f('behind-chain-reversed-file',{...mirrorBase,d3:'B',f3:'P',e4:'P'},'d3e2',['behind-chain-proof']));
fixtures.push(f('quiet-qq-display',{d1:'Q',e3:'Q',f2:'P'},'e3f3',['slider-battery-proof']));
