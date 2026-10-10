import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';import {validateHistory} from '../../E024-transitions/code/transitions.mjs';import {plain} from '../../E183-recorded-initiative-turnover/code/plain.mjs';
export const ids=['C0711','C0712','C0714'],queryKeys=['actual','fresh','replaced','context','contextReplaced'];
const object=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k)),sq=x=>typeof x==='string'&&/^[a-h][1-8]$/.test(x),uciCode=x=>typeof x==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(x);
export function controls(input,options){
 plain([input,options]);if(!object(options,['enabled','pawn','contextMoves','plies','maxNodes','proofs']))throw Error('Invalid minor-context options');
 const enabled=options.enabled===undefined?false:options.enabled,H=options.plies===undefined?2:options.plies,limit=options.maxNodes===undefined?50000:options.maxNodes;
 if(typeof enabled!=='boolean'||!Number.isSafeInteger(H)||H<0||H>4||!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('Invalid minor-context controls');
 if(options.pawn!==undefined&&!sq(options.pawn))throw Error('Expected pawn square');
 if(options.contextMoves!==undefined&&(!Array.isArray(options.contextMoves)||options.contextMoves.length<1||options.contextMoves.length>6||options.contextMoves.some(m=>!object(m,['from','to'])||!sq(m.from)||!sq(m.to)||m.from===m.to)))throw Error('Expected context pawn relocations');
 if(options.proofs!==undefined&&(!object(options.proofs,queryKeys)||queryKeys.some(k=>!options.proofs[k])))throw Error('Expected five complete proofs');
 if(!object(input,['fen','move','history'])||typeof input.fen!=='string'||!uciCode(input.move))throw Error('Invalid minor-context input');
 if(input.history!==undefined&&(!object(input.history,['fen','moves'])||typeof input.history.fen!=='string'||!Array.isArray(input.history.moves)))throw Error('Invalid minor-context history');
 return{enabled,H,limit};
}
export const claim=c=>c.isThreefoldRepetition()||c.isDrawByFiftyMoves();
// Exact E133 operational rule; frozen implementation is private, not modified.
export function taxonomy(c,tick){
 const pawns=c.board().flat().filter(p=>p?.type==='p').map(({square,color})=>({square,color})).sort((a,b)=>a.square.localeCompare(b.square));for(let i=0;i<8;i++)tick();
 const fronts=pawns.filter(p=>'de'.includes(p.square[0])).map(p=>{tick();const to=p.square[0]+(+p.square[1]+(p.color==='w'?1:-1)),q=c.get(to);return{pawn:p,to,blocked:q?.type==='p'&&q.color!==p.color};});
 const locks=fronts.filter(p=>p.pawn.color==='w'&&p.blocked).map(p=>({file:p.pawn.square[0],w:p.pawn.square,b:p.to}));
 return{pawns,fronts,locks,type:!fronts.length?'open':locks.some(x=>x.file==='d')&&locks.some(x=>x.file==='e')&&fronts.every(x=>x.blocked)?'closed':'other'};
}
export function prepare(input,options,tick){
 tick();const h=validateHistory(input);if(!h)return{status:'history-prerequisite'};const c=legalPosition(h.start);let claimed=claim(c);for(const move of h.moves){tick();c.move(move);claimed||=claim(c);}if(claimed)return{status:'claim-rule-prerequisite'};if(c.isGameOver())return{status:'not-live'};
 if(!options.pawn)return{status:'pawn-prerequisite'};if(!options.contextMoves)return{status:'context-prerequisite'};
 const before=c.fen(),actor=c.turn(),units=c.board().flat().filter(Boolean),pawns=units.filter(p=>p.type==='p'),own=units.filter(p=>p.color===actor&&['b','n'].includes(p.type)),enemy=units.filter(p=>p.color!==actor&&['b','n'].includes(p.type));
 if(before.split(' ')[2]!=='-'||before.split(' ')[3]!=='-'||units.length>10||pawns.length<1||pawns.length>6||own.length!==1||enemy.length!==1||units.some(p=>!['k','p','b','n'].includes(p.type)))return{status:'material-prerequisite'};
 if(c.get(options.pawn)?.type!=='p'||c.get(options.pawn).color!==actor)throw Error('Tracked pawn must belong to actor');
 const m=c.moves({verbose:true}).find(m=>uci(m)===input.move);if(!m)throw Error('Illegal actual move');if(c.isCheck()||m.from!==own[0].square||m.captured||m.promotion)return{status:'quiet-minor-prerequisite'};
 const changed=legalPosition(before),sources=new Set(),targets=new Set(),relocations=[];
 for(const r of options.contextMoves){if(sources.has(r.from)||targets.has(r.to)||r.from===options.pawn||!sq(r.to)||'18'.includes(r.to[1]))throw Error('Invalid context identity/target');const p=changed.get(r.from);if(p?.type!=='p')throw Error('Context relocates pawns only');sources.add(r.from);targets.add(r.to);relocations.push({...r,color:p.color});}
 for(const r of relocations){tick();changed.remove(r.from);}for(const r of relocations){tick();if(changed.get(r.to))throw Error('Occupied context target');if(!changed.put({type:'p',color:r.color},r.to))throw Error('Invalid context pawn');}
 let contextBefore;try{contextBefore=legalPosition(changed.fen());}catch{return{status:'context-legality-prerequisite'};}
 if(contextBefore.isGameOver()||contextBefore.isCheck())return{status:'context-legality-prerequisite'};
 const cm=contextBefore.moves({verbose:true}).find(x=>uci(x)===input.move);if(!cm||cm.captured||cm.piece!==m.piece)return{status:'context-move-prerequisite'};
 tick();c.move(input.move);const after=c.fen();if(c.isGameOver()||claim(c))return{status:claim(c)?'claim-rule-prerequisite':'not-live'};if(c.isCheck())return{status:'quiet-minor-prerequisite'};
 tick();const contextRoot=contextBefore.fen();contextBefore.move(input.move);if(contextBefore.isGameOver()||contextBefore.isCheck())return{status:'context-move-prerequisite'};const contextAfter=contextBefore.fen();
 const replace=fen=>{const f=legalPosition(fen);f.remove(m.to);if(!f.put({type:m.piece==='b'?'n':'b',color:actor},m.to))return null;try{const out=legalPosition(f.fen());return out.isGameOver()?null:out;}catch{return null;}};
 const replaced=replace(after),contextReplaced=replace(contextAfter);if(!replaced||!contextReplaced)return{status:'replacement-legality-prerequisite'};
 const actualType=taxonomy(c,tick),counterType=taxonomy(contextBefore,tick);if(!['open','closed'].includes(actualType.type)||!['open','closed'].includes(counterType.type)||actualType.type===counterType.type)return{status:'opposite-context-prerequisite'};
 return{status:'ready',before,after,actor,pawn:options.pawn,piece:{type:m.piece,from:m.from,to:m.to},history:input.history,relocations,contextRoot,contextAfter,actualType,counterType,frames:{actual:c,fresh:legalPosition(after),replaced,context:legalPosition(contextAfter),contextReplaced}};
}
