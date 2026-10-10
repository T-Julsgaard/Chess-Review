import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {plain} from '../../E183-recorded-initiative-turnover/code/plain.mjs';
export const ids=['C0622','C0639','C0623','C0638'];
const code=x=>typeof x==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(x);
const object=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k));
export function controls(input,options){
 plain([input,options]);
 if(!object(options,['enabled','alternative','plies','maxNodes','proofs']))throw Error('Invalid king-route options');
 const enabled=options.enabled??false,H=options.plies??4,limit=options.maxNodes??50000;
 if(typeof enabled!=='boolean'||!Number.isSafeInteger(H)||H<0||H>6||!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('Invalid king-route controls');
 if(options.alternative!==undefined&&!code(options.alternative))throw Error('Expected alternative UCI');
 if(options.proofs!==undefined&&(!object(options.proofs,['actual','alternative'])||!options.proofs.actual||!options.proofs.alternative))throw Error('Expected paired proofs');
 if(!object(input,['fen','move','history'])||typeof input.fen!=='string'||!code(input.move))throw Error('Invalid king-route input');
 if(input.history!==undefined&&(!object(input.history,['fen','moves'])||typeof input.history.fen!=='string'||!Array.isArray(input.history.moves)))throw Error('Invalid king-route history');
 return{enabled,H,limit};
}
export const xy=s=>[s.charCodeAt(0)-97,+s[1]-1];
export const square=(x,y)=>String.fromCharCode(x+97)+(y+1);
export const distance=(a,b)=>Math.max(...xy(a).map((n,i)=>Math.abs(n-xy(b)[i])));
export const claim=c=>c.isThreefoldRepetition()||c.isDrawByFiftyMoves();
export function context(input,alternative,tick){
 tick();const h=validateHistory(input);if(!h)return{status:'history-prerequisite'};
 const c=legalPosition(h.start);let observedClaim=claim(c);
 for(const move of h.moves){tick();c.move(move);observedClaim||=claim(c);}
 if(c.isGameOver())return{status:observedClaim?'claim-rule-prerequisite':'not-live'};
 if(observedClaim)return{status:'claim-rule-prerequisite'};
 const actor=c.turn(),units=c.board().flat().filter(Boolean),pawn=units.find(p=>p.type==='p'&&p.color===actor);
 if(units.length!==3||!pawn||units.some(p=>!['k','p'].includes(p.type)))return{status:'material-prerequisite'};
 if(alternative===undefined)return{status:'alternative-prerequisite'};
 const moves=c.moves({verbose:true}),played=moves.find(m=>uci(m)===input.move),alt=moves.find(m=>uci(m)===alternative);
 if(!played||!alt||alternative===input.move)throw Error('Expected distinct legal actual/alternative');
 if([played,alt].some(m=>m.piece!=='k'||m.captured||m.promotion))return{status:'quiet-king-prerequisite'};
 const before=c.fen(),king=played.from,enemy=units.find(p=>p.type==='k'&&p.color!==actor).square;
 tick();c.move(input.move);const actual=c.fen(),actualLive=!c.isGameOver(),actualClaim=claim(c);c.undo();
 tick();c.move(alternative);const alternate=c.fen(),alternateLive=!c.isGameOver(),alternateClaim=claim(c);c.undo();
 if(actualClaim||alternateClaim)return{status:'claim-rule-prerequisite'};
 if(!actualLive||!alternateLive)return{status:'not-live'};
 const previous=h.records.at(-1)||null;let turning=false;
 if(previous&&previous.move.piece==='k'&&!previous.move.captured&&previous.move.color!==actor){
  const prior=legalPosition(previous.before),own=prior.board().flat().filter(Boolean).find(p=>p.type==='k'&&p.color===actor),[kx,ky]=xy(own.square),[ex,ey]=xy(previous.move.from),[tx]=xy(previous.move.to),[ax,ay]=xy(played.to),dir=actor==='w'?1:-1;
  turning=own.square===king&&ex===kx&&(ey-ky)*dir===2&&tx!==ex&&(ax-kx)*(tx-ex)<0&&Math.abs(ax-kx)===1&&(ay-ky)*dir===1;
 }
 return{status:'ready',c,h,actor,pawn:pawn.square,king,enemy,played:uci(played),alternative:uci(alt),before,actual,alternate,turning,previous:previous?{before:previous.before,move:uci(previous.move),after:previous.after}:null};
}
// Frozen-board interception geometry, not timed legal play.
export function route(king,enemy,pawn,actor,tick){
 const [px,py]=xy(pawn),dir=actor==='w'?1:-1;
 const allowed=s=>distance(s,king)>1&&!(xy(s)[1]===py+dir&&Math.abs(xy(s)[0]-px)===1);
 const adjacent=s=>{const [x,y]=xy(s),out=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;tick();const a=x+dx,b=y+dy;if(a>=0&&a<8&&b>=0&&b<8)out.push(square(a,b));}return out;};
 const distances={},queue=[];
 if(allowed(pawn)){distances[pawn]=0;queue.push(pawn);}
 for(let i=0;i<queue.length;i++){tick();const s=queue[i];for(const n of adjacent(s))if(allowed(n)&&distances[n]===undefined){distances[n]=distances[s]+1;queue.push(n);}}
 const d=distances[enemy]??null,first=adjacent(enemy).filter(s=>allowed(s)&&d!==null&&distances[s]===d-1).sort();
 return{king,enemy,target:pawn,distance:d,shortestFirst:first,distances};
}
