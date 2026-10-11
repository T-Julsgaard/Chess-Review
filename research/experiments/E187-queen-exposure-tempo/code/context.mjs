import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {plain} from '../../E183-recorded-initiative-turnover/code/plain.mjs';
export function controls(input,options={}){
 plain(input);plain(options);
 if(!input||typeof input!=='object'||Array.isArray(input)||!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['enabled','family','plies','maxNodes'].includes(k)))throw Error('Invalid paired-choice controls');
 const enabled=options.enabled===undefined?false:options.enabled,family=options.family===undefined?'tempo':options.family,H=options.plies===undefined?(family==='tempo'?2:3):options.plies,limit=options.maxNodes===undefined?50000:options.maxNodes;
 if(typeof enabled!=='boolean'||!['tempo','exposure'].includes(family)||!Number.isSafeInteger(H)||H<0||H>3||!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('Invalid paired-choice controls');
 return{enabled,family,H,limit};
}
export function context(input){
 if(typeof input.fen!=='string'||typeof input.move!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input.move))throw Error('Require FEN and actual UCI');
 if(input.alternative!==undefined&&(typeof input.alternative!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input.alternative)))throw Error('Require alternative UCI');
 const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const m of h?.moves||[])c.move(m);
 if(c.isGameOver())return{status:'not-live'};
 const legal=c.moves({verbose:true}),actual=legal.find(m=>uci(m)===input.move);if(!actual)throw Error('Actual move must be legal');
 let alternative=null;if(input.alternative!==undefined){alternative=legal.find(m=>uci(m)===input.alternative);if(!alternative)throw Error('Alternative must be legal');if(input.move===input.alternative)throw Error('Require distinct alternatives');}
 if(!h)return{status:'history-prerequisite'};if(!alternative)return{status:'alternative-prerequisite'};
 return{status:'ready',c,h,setup:4+h.moves.length,actual,alternative};
}
