import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {mirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const ids=['carlsbad-structure','hedgehog-structure'];
const carlsbad={a1:null,g1:'K',h8:null,g8:'k',a2:'P',b2:'P',d4:'P',e2:'P',f2:'P',g2:'P',h2:'P',a7:'p',b7:'p',c6:'p',d5:'p',f7:'p',g7:'p',h7:'p'};
const hedgehog={a3:'P',b3:'P',d3:'P',e2:'P',c5:'p',e5:'p'};
const f=(id,root,pieces={},move='e2e3',expected=[],opts={})=>({id,fen:setup({...root,...pieces}),move,structureTags:true,expected,absent:ids.filter(x=>!expected.includes(x)),...opts});
const cf=(id,pieces={},move='e2e3',yes=true,opts={})=>f(id,carlsbad,pieces,move,yes?['carlsbad-structure']:[],opts);
const hf=(id,pieces={},move='e2e3',yes=true,opts={})=>f(id,hedgehog,pieces,move,yes?['hedgehog-structure']:[],opts);
const cases=[
 cf('carlsbad-e-completes'),cf('carlsbad-d-completes',{d4:null,d3:'P',e2:null,e3:'P'},'d3d4'),
 cf('carlsbad-e-capture-completes',{e2:null,d2:'P',e3:'b'},'d2e3'),
 cf('carlsbad-flank-capture-completes',{b2:null,c2:'P',b3:'n',e2:null,e3:'P'},'c2b3'),
 cf('carlsbad-flank-pawns-advanced',{a2:null,a4:'P',b2:null,b3:'P',a7:null,a6:'p',b7:null,b5:'p'}),
 cf('carlsbad-own-support-pinned',{g1:null,e1:'K',e8:'r'},'e2e3',false),
 cf('carlsbad-enemy-support-pinned',{g8:null,c8:'k',c1:'R'},'e2e3',false),
 cf('carlsbad-no-enemy-support',{c6:null},'e2e3',false),
 cf('carlsbad-wrong-ram',{d5:null,d6:'p'},'e2e3',false),
 cf('carlsbad-own-c-file-pawn',{c2:'P'},'e2e3',false),
 cf('carlsbad-enemy-e-file-pawn',{e7:'p'},'e2e3',false),
 cf('carlsbad-doubled-flank',{a3:'P'},'e2e3',false),
 cf('carlsbad-flank-too-far',{a2:null,a5:'P'},'e2e3',false),
 cf('carlsbad-missing-flank',{b2:null},'e2e3',false),
 cf('carlsbad-wrong-core-color',{d4:'p'},'e2e3',false),
 cf('carlsbad-preexisting-quiet',{e2:null,e3:'P'},'g1h1',false),
 cf('carlsbad-preexisting-flank-move',{e2:null,e3:'P'},'a2a3',false),
 cf('carlsbad-enemy-central-capture-reply',{e4:'N'}),
 cf('carlsbad-enemy-piece-pawn-capture',{b4:'b'}),
 cf('carlsbad-terminal-mating-reply',{h4:'q',g4:'n',c4:'b'}),
 cf('carlsbad-disabled',{},'e2e3',false,{structureTags:false}),
 cf('carlsbad-zero-budget',{},'e2e3',false,{maxStructureNodes:0}),
 cf('carlsbad-illegal-pawn-jump',{},'e2e5',false,{invalid:true}),
 hf('hedgehog-e-completes'),hf('hedgehog-a-completes',{a3:null,a2:'P',e2:null,e3:'P'},'a2a3'),
 hf('hedgehog-b-completes',{b3:null,b2:'P',e2:null,e3:'P'},'b2b3'),
 hf('hedgehog-d-completes',{d3:null,d2:'P',e2:null,e3:'P'},'d2d3'),
 hf('hedgehog-capture-completes',{b3:'n',c2:'P',e2:null,e3:'P'},'c2b3'),
 hf('hedgehog-extra-control-captures',{f3:'P',g3:'P'}),
 hf('hedgehog-no-c-context',{c5:null},'e2e3',false),
 hf('hedgehog-no-e-context',{e5:null},'e2e3',false),
 hf('hedgehog-own-c-file-pawn',{c2:'P'},'e2e3',false),
 hf('hedgehog-enemy-d-file-pawn',{d7:'p'},'e2e3',false),
 hf('hedgehog-wrong-rank',{b3:null,b2:'P'},'e2e3',false),
 hf('hedgehog-wrong-color',{b3:'p'},'e2e3',false),
 hf('hedgehog-occupied-target',{f4:'N'},'e2e3',false),
 hf('hedgehog-controller-pinned',{a1:null,b1:'K',b8:'r'},'e2e3',false),
 hf('hedgehog-a-controller-pinned',{a7:null,a8:'r'},'e2e3',false),
 hf('hedgehog-promotion-replies',{h2:'p'}),
 hf('hedgehog-terminal-promotion-replies',{h2:'p',a2:'P',b2:'P'}),
 hf('hedgehog-pawn-loss-reply',{b5:'b'}),
 hf('hedgehog-preexisting-unrelated',{e2:null,e3:'P'},'a1b1',false),
 hf('hedgehog-actual-mate',{a1:null,g2:'K',h8:null,f4:'k',g1:'Q',g5:'R',h4:'B'},'e2e3',false),
 hf('hedgehog-double-push-en-passant-negative',{e2:null,e3:'P',b3:null,b2:'P',a4:'p'},'b2b4',false),
 hf('hedgehog-disabled',{},'e2e3',false,{structureTags:false}),
 hf('hedgehog-zero-budget',{},'e2e3',false,{maxStructureNodes:0}),
 hf('hedgehog-illegal-pawn-jump',{},'e2e5',false,{invalid:true}),
];
// Completing the structure with a pawn move resets a high reversible clock.
for(const build of [cf,hf]){const row=build((build===cf?'carlsbad':'hedgehog')+'-clock-reset');row.fen=row.fen.replace(' 0 1',' 99 1');cases.push(row);}
for(const build of [cf,hf]){const row=build((build===cf?'carlsbad':'hedgehog')+'-legal-history'),root=row.fen.replace(' w ',' b '),c=new Chess(root),move=build===cf?'g8h8':'h8g8';c.move(move);cases.push({...row,fen:c.fen(),history:{fen:root,moves:[move]}});}
export const fixtures=cases.flatMap(row=>[row,{...mirror(row),expected:[],absent:ids}]);
