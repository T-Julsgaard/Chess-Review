import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,expected=[],absent=[])=>({id,fen:setup({a1:null,h8:null,a7:null,h2:null,...extra}),move,expected,absent,note:'Authored underpromotion/stalemate: '+id});
export const fixtures=[
 f('rook-avoids-queen-stalemate',{c6:'K',c7:'P',a7:'k'},'c7c8r',['underpromotion-avoids-stalemate']),
 f('knight-avoids-queen-stalemate',{c6:'K',c7:'P',a7:'k',h2:'P'},'c7c8n',['underpromotion-avoids-stalemate']),
 f('bishop-avoids-queen-stalemate',{c6:'K',c7:'P',a7:'k',h2:'P'},'c7c8b',['underpromotion-avoids-stalemate']),
 f('knight-mate-instead-of-stalemate',{c6:'K',c7:'P',a7:'k',b6:'N',b5:'B',h2:'B'},'c7c8n',['underpromotion-avoids-stalemate']),
 f('queen-actually-stalemates',{c6:'K',c7:'P',a7:'k'},'c7c8q',[],['underpromotion-avoids-stalemate']),
 f('queen-would-not-stalemate',{c6:'K',c7:'P',a8:'k'},'c7c8r',[],['underpromotion-avoids-stalemate']),
 f('underpromotion-is-dead-material',{c6:'K',c7:'P',a7:'k'},'c7c8b',[],['underpromotion-avoids-stalemate']),
 f('rook-offer-stalemate-resource',{h1:'K',a3:'R',f2:'k',g3:'b',b4:'q'},'a3a4',['conditional-stalemate']),
 f('king-has-escape-after-capture',{h1:'K',a3:'R',f2:'k',b4:'q'},'a3a4',[],['conditional-stalemate']),
 f('queen-offer-stalemate-resource',{h1:'K',a3:'Q',f2:'k',g3:'b',b4:'q'},'a3a4',['conditional-stalemate']),
];
