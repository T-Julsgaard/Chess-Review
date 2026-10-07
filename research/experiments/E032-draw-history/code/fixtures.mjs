import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {fixtures as pins} from '../../E026-pin-proofs/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,expected=[],absent=[])=>({id,fen:setup({a7:null,h2:null,...extra}),move,expected,absent,note:id.replaceAll('-',' ')});
function h(id,start,moves,move,expected=[],absent=[]){const c=new Chess(start);for(const m of moves)c.move(m);return{id,fen:c.fen(),move,history:{fen:start,moves},expected,absent,note:id.replaceAll('-',' ')};}
const known=pins.find(f=>f.id==='known-history-repetition');
export const fixtures=[
 {...known,id:'threefold-known',expected:['repetition-claim'],absent:[]},
 {...known,id:'fen-without-history',history:undefined,expected:[],absent:['repetition-claim']},
 h('twofold-only',known.history.fen,known.history.moves.slice(0,3),'e1d1',[],['repetition-claim']),
 f('pawn-reset',{b2:'P'},'b2b3',['irreversible-move'],['fifty-move-claim']),
 f('capture-reset',{b1:'R',b7:'n'},'b1b7',['irreversible-move']),
 f('draw-bare-kings',{b2:'p'},'a1b2',['draw-position']),
 f('draw-lone-bishop',{b2:'n',c4:'B'},'a1b2',['draw-position']),
 f('draw-same-color-bishops',{c4:'B',f7:'b',d5:'p'},'c4d5',['draw-position']),
 f('opposite-bishops-not-dead',{c4:'B',f8:'b'},'c4d5',[],['draw-position']),
 f('two-knights-not-dead',{c4:'N',d4:'N'},'c4b6',[],['draw-position']),
 f('stalemate-position',{a1:null,c6:'K',b6:'Q',h8:null,a8:'k'},'b6c7',['draw-position']),
 f('mate-before-clock',{a1:null,g6:'K',f7:'Q'},'f7h7',['checkmate'],['draw-position','fifty-move-claim']),
];
fixtures.at(-1).fen=fixtures.at(-1).fen.replace(' 0 1',' 99 1');
const counter=f('counter-only',{b1:'R'},'b1b2',[],['fifty-move-claim']);counter.fen=counter.fen.replace(' 0 1',' 99 1');fixtures.push(counter);
// Authored deterministic quiet walk; no source game or position sequence is imported.
const quietStart=setup({a7:null,h2:null,b1:'R',g8:'r'}),c=new Chess(quietStart),walk=[];let seed=3207;
for(let i=0;i<100;i++){const legal=c.moves({verbose:true}).filter(m=>m.piece!=='p'&&!m.captured&&!m.promotion).sort((a,b)=>(a.from+a.to).localeCompare(b.from+b.to));let chosen=null;seed=(Math.imul(seed,1664525)+1013904223)>>>0;for(let j=0;j<legal.length;j++){const m=legal[(seed+j)%legal.length];c.move(m);const good=!c.isCheckmate()&&!c.isStalemate()&&!c.isInsufficientMaterial()&&!c.isThreefoldRepetition();c.undo();if(good){chosen=m;break;}}if(!chosen)throw Error('Authored quiet walk exhausted');walk.push(chosen.from+chosen.to);c.move(chosen);}
fixtures.push(h('verified-fifty-move',quietStart,walk.slice(0,99),walk[99],['fifty-move-claim']));
const castleStart='4k2r/8/8/8/8/8/8/4K2R w Kk - 0 1';
fixtures.push(h('rights-loss-first-cycle',castleStart,['h1h2','h8h7','h2h1'],'h7h8',[],['repetition-claim']));
fixtures.push(f('king-rights-loss',{a1:null,e1:'K',h1:'R',h8:null,e8:'k'},'e1d1',['irreversible-move']));fixtures.at(-1).fen=fixtures.at(-1).fen.replace(' w - - ',' w K - ');
