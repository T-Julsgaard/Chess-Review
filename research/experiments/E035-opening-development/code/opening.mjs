import {Chess} from '../../../../lib/chess.js';
import {uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as previous} from '../../E034-bishop-patterns/code/bishops.mjs';
export const openingIds=new Set(['minor-development','development-check','repeated-opening-piece','early-queen-move','minor-development-complete']);
const initial=new Chess().fen().split(' ')[0];
export function inspect(input){const h=validateHistory(input);if(!h)return null;const fields=h.start.split(' ');if(fields[0]!==initial||fields[2]!=='KQkq'||fields[3]!=='-'||fields[4]!=='0'||fields[5]!=='1')return null;
 const c=new Chess(h.start),units=c.board().flat().filter(p=>p&&['n','b','q'].includes(p.type)).map(p=>({origin:p.square,type:p.type,color:p.color,square:p.square,moves:0,developed:false,alive:true})),counts={w:0,b:0};let moving,prior;
 for(const code of [...h.moves,input.move]){const m=c.moves({verbose:true}).find(m=>uci(m)===code);if(!m)throw Error('Illegal move');moving=units.find(p=>p.alive&&p.square===m.from);prior=moving?{...moving}:null;const captured=m.isEnPassant()?m.to[0]+m.from[1]:m.to;for(const p of units)if(p.alive&&p.square===captured&&p.color!==m.color)p.alive=false;
  if(moving){moving.square=m.to;moving.moves++;if(['b','n'].includes(moving.type)&&m.to[1]!==(m.color==='w'?'1':'8'))moving.developed=true;}counts[m.color]++;c.move(code);
 }
 const played=c.history({verbose:true}).at(-1),color=played.color,own=units.filter(p=>p.color===color),minors=own.filter(p=>['b','n'].includes(p.type)),developed=minors.filter(p=>p.alive&&p.developed&&p.square[1]!==(color==='w'?'1':'8')),unmoved=minors.filter(p=>p.alive&&p.moves===0);
 return{afterFen:c.fen(),start:h.start,history:h.moves,played:uci(played),color,turnNumber:counts[color],units:own,prior,developed:developed.map(p=>p.origin).sort(),unmoved:unmoved.map(p=>p.origin).sort(),check:c.isCheck(),terminal:c.isGameOver()};}
export function priority(e){return({'minor-development':93,'development-check':129,'repeated-opening-piece':75,'early-queen-move':80,'minor-development-complete':95}[e.id]??previous(e));}
export function selectComment(events){return [...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;}
export function explainMove(input){const base=parent(input),s=inspect(input);if(!s||s.terminal||s.turnNumber>10)return base;const p=s.prior,extra=[],add=(id,text)=>extra.push({id,text,evidence:s,qualityClaim:false});
 if(p&&['b','n'].includes(p.type)){const moved=s.units.find(u=>u.origin===p.origin),first=p.moves===0&&moved.developed;if(first){add('minor-development',`Development: your ${p.type==='n'?'knight':'bishop'} leaves ${p.origin} for ${moved.square}.`);if(s.check)add('development-check','Developing with tempo: your first minor-piece move also gives check.');if(s.developed.length===4)add('minor-development-complete','All four original minor pieces are developed off the back rank.');}else if(p.moves>0&&s.unmoved.length)add('repeated-opening-piece',`You move this ${p.type==='n'?'knight':'bishop'} again; ${s.unmoved.length} original minor ${s.unmoved.length===1?'piece remains':'pieces remain'} unmoved.`);}
 if(p?.type==='q'&&p.moves===0&&s.turnNumber<=8&&s.developed.length<2)add('early-queen-move',`Early queen move: only ${s.developed.length} original minor ${s.developed.length===1?'piece is':'pieces are'} developed.`);
 if(!extra.length)return base;const events=[...base.events,...extra],comment=selectComment(events);if(comment?.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');return{...base,schema:'coach-concepts-v16',events,comment};}
