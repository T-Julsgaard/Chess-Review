import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {mirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const id='desperado-capture';
const f=(name,pieces,move,positive=true,options={})=>({id:name,fen:setup({a7:null,h2:null,...pieces}),move,expected:positive?[id]:[],absent:positive?[]:[id],desperadoTags:true,...options,note:'Authored finite desperado capture comparison: '+name});
const knight={h8:null,c6:'k',a6:'N',b6:'r',c8:'r',c7:'p'};
const corner={a1:null,a7:'K',h8:null,c6:'k',b8:'r',c8:'r',b7:'n',d7:'n'};
const cases=[
 f('knight-pawn-salvage',knight,'a6c7'),
 f('queen-maximal-capture',{...corner,a8:'Q'},'a8b8'),
 f('rook-equal-capture',{...corner,a8:'R'},'a8b8'),
 f('bishop-equal-capture',{...corner,a8:'B'},'a8b7'),
 f('safe-knight-retreat',{...knight,b6:null,b7:'b'},'a6c7',false),
 f('quiet-response-recovers',{...knight,b1:'R'},'a6c7',false),
 f('initial-attack-missing',{...knight,b6:null},'a6c7',false),
 f('lower-capture-not-maximal',{...corner,a8:'Q'},'a8b7',false),
 f('actual-recapture-missing',{...knight,c6:null,h8:'k',c8:null},'a6c7',false),
 f('no-quiet-alternatives',{...corner,a8:'Q',b4:'n'},'a8b8',false),
 f('actual-response-draw',{...corner,a8:'Q',d7:null},'a8b8',false),
 f('actual-dead-position',{a6:'N',c7:'n'},'a6c7',false),
 f('castle-saves-rook',{a1:null,e1:'K',h1:'R',h8:'r',a7:'k',g6:'n'},'h1h8',false,{fen:setup({a1:null,e1:'K',h1:'R',h8:'r',a7:'k',h2:null,g6:'n'}).replace(' w - -',' w K -')}),
 f('disabled-profile',knight,'a6c7',false,{desperadoTags:false}),
 f('zero-budget',knight,'a6c7',false,{maxDesperadoNodes:0})
];
// File reflection is not orthodox castling: keep that explicit case unmirrored.
export const fixtures=cases.flatMap(f=>f.id==='castle-saves-rook'?[f]:[f,mirror(f)]);
