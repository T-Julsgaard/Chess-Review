import {Chess} from '../../../../lib/chess.js';import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,pieces,move,expected=[],absent=[])=>({id,fen:boardFen(pieces),move,expected,absent});
const shelter={g1:'K',h8:'k',f1:'B',f2:'P',g2:'P',h2:'P'};
const opening=(id,moves,move,expected)=>{const c=new Chess(),fen=c.fen();for(const code of moves)c.move(code);return{id,fen:c.fen(),history:{fen,moves},move,expected,absent:[]};};
export const fixtures=[
 f('rook-relative-pin',{...shelter,c2:'B',g4:'n',h5:'r'},'c2d1',['certified-nonqueen-relative-pin','functional-conditional-xray']),
 f('nonking-skewer',{...shelter,g3:'P',c2:'B',g4:'q',h5:'r'},'c2d1',['certified-nonking-skewer','functional-conditional-xray']),
 f('underprotected',{h1:'K',h8:'k',a1:'R',a2:'Q',a8:'r',h2:'P'},'a2a7',['certified-underprotection-warning'],['new-tactical-vulnerability-warning']),
 f('longer-hanging',{h1:'K',h8:'k',a1:'R',a2:'Q',a8:'r',b7:'r',b2:'P',b3:'P',h2:'P'},'a2a7',['four-ply-hanging-warning']),
 f('self-pin',{e1:'K',h8:'k',d3:'R',d8:'r',h2:'P'},'e1d1',['profitable-self-pin-warning']),
 f('loose-capture',{a1:'K',h8:'k',c3:'B',d4:'r',h2:'P'},'c3d4',['certified-loose-piece-opportunity']),
 f('quiet-fork-countermate',{h1:'K',a8:'k',g1:'N',e5:'r',h4:'q',a2:'P',h2:'P'},'g1f3',[],['quiet-forced-material-sequence']),
 f('quiet-fork',{g1:'K',a8:'k',g5:'N',f1:'B',f2:'P',g2:'P',h2:'P',e5:'r',h4:'q',a2:'P'},'g5f3',['quiet-forced-material-sequence']),
 opening('opening-pitfall',['e2e4','e7e5','f1c4','g8f6'],'d1g4',['new-tactical-vulnerability-warning','recorded-opening-pitfall-warning']),
 f('ordinary',{a1:'K',h8:'k',e2:'P'},'e2e4'),
 f('defended-loose-target',{a1:'K',h8:'k',c3:'B',d4:'r',e5:'p',h2:'P'},'c3d4',[],['certified-loose-piece-opportunity']),
 f('refuted-pin',{a1:'K',h8:'k',c2:'Q',g4:'n',h5:'r',h2:'P'},'c2d1',[],['certified-nonqueen-relative-pin','functional-conditional-xray']),
 f('skewer-countercheck',{g1:'K',h8:'k',c2:'B',g4:'q',h5:'r',f2:'P',g2:'P',h2:'P'},'c2d1',[],['certified-nonking-skewer']),
];
fixtures.push(f('captured-queen-offset',{h1:'K',h8:'k',e1:'Q',e7:'q',d7:'r',h2:'P'},'e1e7',[],['new-tactical-vulnerability-warning','four-ply-hanging-warning','certified-underprotection-warning']),f('promotion-old-pawn-threat',{h1:'K',h7:'k',a7:'P',a6:'r',h2:'P'},'a7a8q',[],['new-tactical-vulnerability-warning']));
function mirrored(f){const strip=fen=>fen.replace(/ ([KQkq]+) /,' - '),swap=rights=>{const flipped=rights.split('').map(ch=>ch===ch.toUpperCase()?ch.toLowerCase():ch.toUpperCase()).join('');return [...'KQkq'].filter(ch=>flipped.includes(ch)).join('')||'-';};const out=reflect({...f,fen:strip(f.fen),history:f.history?{...f.history,fen:strip(f.history.fen)}:undefined});if(f.history){const fields=out.history.fen.split(' ');fields[2]=swap(f.history.fen.split(' ')[2]);out.history.fen=fields.join(' ');const c=new Chess(out.history.fen);for(const code of out.history.moves)c.move(code);out.fen=c.fen();}else{const fields=out.fen.split(' ');fields[2]=swap(f.fen.split(' ')[2]);out.fen=fields.join(' ');delete out.history;}return out;}
export const bothColors=fixtures.flatMap(f=>[f,mirrored(f)]);
