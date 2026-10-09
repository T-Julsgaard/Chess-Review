import {Chess} from '../../../../lib/chess.js';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {explainMove as parent,priority as inherited} from '../../E089-causal-pawn-breakthrough/code/breakthrough.mjs';
const core=['d4','e4','d5','e5'];
const men=c=>c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color}));
const rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null});
function snapshot(c,color,tick){
 tick();const b=turnBoard(c,color),pieces=men(c),moves=b.moves({verbose:true}).map(rec);for(const m of moves)tick();
 const pawns=pieces.filter(p=>p.type==='p'&&p.color===color&&core.includes(p.square));
 const pairs=[];for(let i=0;i<pawns.length;i++)for(let j=i+1;j<pawns.length;j++)if(Math.abs(pawns[i].square.charCodeAt(0)-pawns[j].square.charCodeAt(0))===1&&Math.abs(+pawns[i].square[1]-+pawns[j].square[1])<=1)pairs.push([pawns[i].square,pawns[j].square]);
 const rams=pieces.filter(p=>p.type==='p'&&p.color===color&&'cdef'.includes(p.square[0])).flatMap(p=>{const ahead=p.square[0]+(+p.square[1]+(color==='w'?1:-1)),enemy=c.get(ahead);return enemy?.type==='p'&&enemy.color!==color?[{own:p.square,enemy:ahead}]:[];});
 return {fen:b.fen(),pieces,moves,pawns,pairs,rams,pawnFreeDE:!pieces.some(p=>p.type==='p'&&'de'.includes(p.square[0]))};
}
const crosses=m=>{let x=m.from.charCodeAt(0),y=+m.from[1],dx=Math.sign(m.to.charCodeAt(0)-x),dy=Math.sign(+m.to[1]-y);while(x!==m.to.charCodeAt(0)||y!==+m.to[1]){x+=dx;y+=dy;if(core.includes(String.fromCharCode(x)+y))return true;}return false;};
export const priority=e=>e.evidence?.experiment==='E090'?60:inherited(e);
export function explainMove(input){
 const enabled=input.centerTags===undefined?false:input.centerTags;if(typeof enabled!=='boolean')throw Error('centerTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxCenterNodes===undefined?50000:input.maxCenterNodes;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxCenterNodes must be integer0..50000');
 const base=parent(input);let events=base.events,status='no-new-fact',nodes=0,witness=null;
 const done=()=>({...base,schema:'coach-concepts-E090-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,centerAnalysis:{status,limit,nodes,witness}});
 const tick=()=>{if(++nodes>limit)throw Error('center-budget');};
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{
 tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const m of h?.moves||[]){tick();c.move(m);}if(c.isGameOver()){status='not-live';return done();}
 const actor=c.turn(),enemy=actor==='w'?'b':'w',before=c.fen();const old=snapshot(c,actor,tick),oldEnemy=snapshot(c,enemy,tick);tick();const played=c.move(input.move);
 if(c.fen()!==base.after)throw Error('Parent center position differs');if(c.isGameOver()){status='not-live';return done();}
 const fresh=snapshot(c,actor,tick),freshEnemy=snapshot(c,enemy,tick),added=fresh.moves.filter(m=>m.captured&&!old.moves.some(o=>o.from===m.from&&o.to===m.to&&o.promotion===m.promotion));
 witness={experiment:'E090',actor,before,after:c.fen(),history:h?{fen:h.start,moves:h.moves}:null,played:rec(played),old,oldEnemy,fresh,freshEnemy,added,openingPair:null};
 const extra=[],add=(id,text,detail)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness,detail}});};
 if(h?.start===new Chess().fen()&&h.moves.length===1){const codes=[...h.moves,uci(played)],first=codes[0],second=codes[1];let label=null;
 if(first==='e2e4')label=second==='e7e5'?'open-game':'semi-open-game';if(first==='d2d4')label=second==='d7d5'?'closed-game':'semi-closed-game';
 if(label){witness.openingPair={codes,label};add('recorded-'+label,`Recorded ${label} opening pair: ${h.records[0].move.san} ${played.san}; this identifies the opening origin, not the current center structure.`,witness.openingPair);}}
 const contacts=added.filter(m=>core.includes(m.to));if(contacts.length)add('new-legal-center-control',`New legal center capture: ${contacts.slice(0,3).map(m=>m.uci).join(', ')}. These occupied central targets are legally capturable on your turn.`,{contacts});
 const active=added.filter(m=>m.from===played.to);if(played.piece!=='p'&&played.piece!=='k'&&core.includes(played.to)&&(active.length||c.isCheck()))add('active-piece-center',`${played.san} places a piece in the center with ${c.isCheck()?'actual check':'a newly legal capture'}; this gives a concrete activity witness.`,{contacts:active,check:c.isCheck()});
 const sliders=added.filter(m=>'brq'.includes(m.piece)&&crosses(m));if(fresh.pawnFreeDE&&sliders.length)add('legal-open-center-access',`Open-center access: d/e files contain no pawns and ${sliders[0].uci} is a newly legal slider capture through a central square.`,{contacts:sliders});
 const newRams=fresh.rams.filter(r=>!old.rams.some(o=>o.own===r.own&&o.enemy===r.enemy));
 if(newRams.length&&fresh.rams.every(r=>!fresh.moves.some(m=>m.from===r.own)&&!freshEnemy.moves.some(m=>m.from===r.enemy)))add('currently-fixed-center',`Fixed center now: ${newRams.map(r=>r.own+'/'+r.enemy).join(', ')} forms a pawn ram; neither participating side has a legal pawn move.`,{rams:fresh.rams});
 const mobile=fresh.pairs.filter(pair=>!old.pairs.some(o=>JSON.stringify(o)===JSON.stringify(pair))&&pair.every(s=>fresh.moves.some(m=>m.from===s&&m.from[0]===m.to[0])));
 if(mobile.length)add('legal-mobile-center',`Mobile pawn center: ${mobile[0].join(' and ')} each has a legal forward move now; this does not establish safe or sustained advancement.`,{pairs:mobile});
 if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='center-budget')throw e;status='exhausted';events=base.events;witness=null;}return done();
}

