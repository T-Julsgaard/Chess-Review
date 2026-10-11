import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {plain} from '../../E183-recorded-initiative-turnover/code/plain.mjs';
export const quiet=m=>m&&!m.captured&&!m.promotion&&m.piece!=='p'&&!/[kq]/.test(m.flags);
export function controls(input,options={}){
 plain(input);plain(options);if(!input||typeof input!=='object'||Array.isArray(input)||!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['enabled','tailPlies','maxNodes'].includes(k)))throw Error('Invalid order-resource controls');
 const enabled=options.enabled===undefined?false:options.enabled,H=options.tailPlies===undefined?0:options.tailPlies,limit=options.maxNodes===undefined?50000:options.maxNodes;
 if(typeof enabled!=='boolean'||!Number.isSafeInteger(H)||H<0||H>2||!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('Invalid order-resource controls');return{enabled,H,limit};
}
export function prepare(input){
 if(typeof input.fen!=='string'||typeof input.move!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input.move))throw Error('Require FEN and actual UCI');
 if(input.followup!==undefined&&(typeof input.followup!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input.followup)))throw Error('Require followup UCI');
 const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const m of h?.moves||[])c.move(m);if(c.isGameOver())return{status:'not-live'};
 const root=c.moves({verbose:true}),a=root.find(m=>uci(m)===input.move),b=root.find(m=>uci(m)===input.followup);if(!a)throw Error('Actual must be legal');if(input.followup!==undefined&&!b)throw Error('Followup must be legal at root');
 if(!h)return{status:'history-prerequisite'};if(!b)return{status:'followup-prerequisite'};
 if(c.board().flat().filter(Boolean).length>10||!quiet(a)||!quiet(b)||a.from===b.from)return{status:'not-comparable'};
 c.move(input.move);const live=!c.isGameOver();c.undo();if(!live)return{status:'not-live'};
 return{status:'ready',c,h,a,b,setup:2+h.moves.length};
}
