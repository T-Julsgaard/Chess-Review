import {Chess} from '../../../../lib/chess.js';import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const opening=(id,moves,move,expected)=>{const c=new Chess(),fen=c.fen();for(const m of moves)c.move(m);return{id,fen:c.fen(),history:{fen,moves},move,expected,absent:[]};};
const f=(id,pieces,move,expected=[],absent=[])=>({id,fen:boardFen(pieces),move,expected,absent});
export const fixtures=[
 opening('caro',['e2e4','c7c6','d2d4','d7d5','e4e5','c8f5'],'c2c4',['caro-kann-tracked-center','active-recorded-pawn-center','active-classical-center','recorded-classical-opening-center']),
 opening('slav',['d2d4','d7d5','g1f3','c7c6'],'c2c4',['slav-tracked-center']),
 opening('queens-gambit',['d2d4','d7d5','g1f3','e7e6'],'c2c4',['queens-gambit-tracked-center']),
 opening('benko',['d2d4','g8f6','c2c4','c7c5','d4d5','b7b5','c4b5','a7a6','b5a6','c8a6','b1c3','d7d6'],'e2e4',['benko-tracked-center']),
 opening('kings-indian',['d2d4','g8f6','c2c4','g7g6','b1c3','f8g7','g1f3','d7d6','g2g3','e7e5'],'e2e4',['kings-indian-tracked-center']),
 opening('grunfeld',['d2d4','g8f6','c2c4','g7g6','b1c3','d7d5','c4d5','f6d5','e2e4','d5c3','b2c3','f8g7','c1e3','c7c5'],'g1f3',['grunfeld-tracked-center']),
 opening('najdorf',['e2e4','c7c5','g1f3','d7d6','d2d4','c5d4','f3d4','g8f6','b1c3','a7a6'],'c1e3',['najdorf-tracked-center']),
 opening('home-countercapture-negative',['g2g3','d7d5','g1f3','d8d6','b1c3','d6a6','f3g1','h7h6'],'f1g2',[]),
 opening('hypermodern',['g2g3','d7d5','b1c3','c7c5','h2h4','a7a6','a2a3','d8b6','b2b3','b6a7'],'f1g2',['certified-remote-center-contact','recorded-hypermodern-center-contact']),
 f('remote-contact',{g1:'K',h8:'k',f1:'B',d5:'p',a7:'p',a2:'P',h2:'P'},'f1g2',['certified-remote-center-contact']),
 f('remote-defended',{g1:'K',h8:'k',f1:'B',d5:'p',c6:'p',a7:'p',a2:'P',h2:'P'},'f1g2',[],['certified-remote-center-contact']),
 f('center-without-activity',{a1:'K',h8:'k',d4:'P',e4:'P'},'a1b1',[],['active-recorded-pawn-center','active-classical-center']),
 f('ordinary',{a1:'K',h8:'k',e2:'P'},'e2e4',[],['active-recorded-pawn-center']),
];
function mirrored(f){const strip=fen=>fen.replace(/ ([KQkq]+) /,' - '),swap=rights=>{const flipped=rights.split('').map(ch=>ch===ch.toUpperCase()?ch.toLowerCase():ch.toUpperCase()).join('');return [...'KQkq'].filter(ch=>flipped.includes(ch)).join('')||'-';};const out=reflect({...f,fen:strip(f.fen),history:f.history?{...f.history,fen:strip(f.history.fen)}:undefined});if(f.history){const fields=out.history.fen.split(' ');fields[2]=swap(f.history.fen.split(' ')[2]);out.history.fen=fields.join(' ');const c=new Chess(out.history.fen);for(const code of out.history.moves)c.move(code);out.fen=c.fen();}else{const fields=out.fen.split(' ');fields[2]=swap(f.fen.split(' ')[2]);out.fen=fields.join(' ');delete out.history;}return out;}
export const bothColors=fixtures.flatMap(f=>[f,mirrored(f)]);
