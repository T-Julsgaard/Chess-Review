import {Chess} from '../../../../lib/chess.js';import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const opening=(id,moves,move,expected)=>{const c=new Chess(),fen=c.fen();for(const m of moves)c.move(m);return{id,fen:c.fen(),move,history:{fen,moves},expected,absent:[]};};
const f=(id,pieces,move,expected=[],absent=[])=>({id,fen:boardFen(pieces),move,expected,absent});
export const fixtures=[
 opening('benoni',['d2d4','g8f6','c2c4','c7c5','d4d5','e7e6','b1c3','e6d5','c4d5','d7d6'],'e2e4',['benoni-history-activity']),
 opening('dragon',['e2e4','c7c5','g1f3','d7d6','d2d4','c5d4','f3d4','g7g6','b1c3'],'f8g7',['dragon-history-activity']),
 opening('closed',['e2e4','c7c5','b1c3','d7d6','g2g3','g7g6','f1g2','f8g7'],'d2d3',['closed-sicilian-history-activity']),
 opening('botvinnik',['c2c4','e7e5','b1c3','d7d6','g2g3','g7g6','f1g2','f8g7','d2d3','g8f6'],'e2e4',['botvinnik-history-activity']),
 opening('panov',['e2e4','c7c6','d2d4','d7d5','e4d5','c6d5'],'c2c4',['panov-history-activity']),
 f('preparation',{h1:'K',h8:'k',f2:'P',f3:'N',e5:'p'},'f3d4',['new-potential-pawn-break','legal-pawn-break-preparation']),
 f('prevention',{h1:'K',b8:'k',a1:'R',b7:'p',c4:'P',h2:'P'},'a1b1',['causal-pawn-break-prevention']),
 f('break-loss',{a1:'K',h8:'k',c2:'P',d5:'p'},'c2c4',['pawn-break-loss-warning']),
 f('recapture-refutes-loss',{a1:'K',h8:'k',c2:'P',d5:'p',f1:'B'},'c2c4',[],['pawn-break-loss-warning']),
 f('ordinary',{a1:'K',h8:'k',b2:'P',b7:'p'},'b2b3',[]),
];
function mirrored(f){const strip=fen=>fen.replace(/ ([KQkq]+) /,' - '),swap=rights=>{const flipped=rights.split('').map(ch=>ch===ch.toUpperCase()?ch.toLowerCase():ch.toUpperCase()).join('');return [...'KQkq'].filter(ch=>flipped.includes(ch)).join('')||'-';};const out=reflect({...f,fen:strip(f.fen),history:f.history?{...f.history,fen:strip(f.history.fen)}:undefined});if(f.history){const fields=out.history.fen.split(' ');fields[2]=swap(f.history.fen.split(' ')[2]);out.history.fen=fields.join(' ');const c=new Chess(out.history.fen);for(const m of out.history.moves)c.move(m);out.fen=c.fen();}else{const fields=out.fen.split(' ');fields[2]=swap(f.fen.split(' ')[2]);out.fen=fields.join(' ');}return out;}
export const bothColors=fixtures.flatMap(f=>[f,mirrored(f)]);
