import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority} from '../../E078-bishop-chains-batteries/code/placements.mjs';
export {priority};
const inventory=c=>c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color})).sort((a,b)=>a.square.localeCompare(b.square));
const ownKing=(pieces,actor)=>pieces.find(p=>p.type==='k'&&p.color===actor).square;
export function explainMove(input){
 const enabled=input.kingCenterTags??false;if(typeof enabled!=='boolean')throw Error('kingCenterTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxKingCenterNodes??50000;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxKingCenterNodes must be integer 0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',witness=null,events=base.events;
 const finish=()=>({...base,schema:'coach-concepts-v60',events,comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,kingCenterAnalysis:{limit,nodes,status,witness}});
 if(base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return finish();}
 if(!(input.kingSupportDepth>0)){status='unavailable';return finish();}
 const tick=()=>{if(++nodes>limit)throw Error('king-center-budget');};
 try{tick();const h=validateHistory(input),history=h?{fen:h.start,moves:h.moves}:null,c=legalPosition(history?.fen||input.fen);for(const code of history?.moves||[]){tick();c.move(code);}if(c.isGameOver()){status='not-live';return finish();}const actor=c.turn();tick();const legalMoves=c.moves({verbose:true}).map(uci).sort();tick();const beforeFen=c.fen(),m=c.move(input.move),played={uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags,before:beforeFen,after:c.fen()};if(played.after!==base.after)throw Error('Parent played position differs');if(c.isGameOver()){status='not-live';return finish();}
  tick();const afterPieces=inventory(c);c.undo();tick();const beforePieces=inventory(c);tick();const beforeKing=ownKing(beforePieces,actor),beforeAttackers=c.attackers(beforeKing,actor==='w'?'b':'w').sort();c.move(input.move);tick();const afterKing=ownKing(afterPieces,actor),afterAttackers=c.attackers(afterKing,actor==='w'?'b':'w').sort();
  const sourceEvent=base.events.findIndex(e=>e.id==='king-promotion-support');if(m.piece!=='k'||m.captured||!['d4','e4','d5','e5'].includes(m.to)||beforePieces.length!==3||beforePieces.filter(p=>p.type==='k').length!==2||beforePieces.filter(p=>p.type==='p'&&p.color===actor).length!==1||sourceEvent<0||afterAttackers.length)return finish();
  const source=base.events[sourceEvent];if(source.evidence.beforeFen!==beforeFen||source.evidence.afterFen!==played.after||source.evidence.played!==played.uci)throw Error('Support certificate differs');tick();witness={actor,history,legalMoves,played,before:{pieces:beforePieces,king:beforeKing,attackers:beforeAttackers},after:{pieces:afterPieces,king:afterKing,attackers:afterAttackers},sourceEvent,sourceId:source.id,centerSquare:m.to};const text='King in the center: '+m.to+' secures a safe queening route for pawn '+source.evidence.pawn+'.';if(text.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');events=base.events.map((e,i)=>i===sourceEvent?{...e,text}:e);status='proven';
 }catch(e){if(e.message!=='king-center-budget')throw e;events=base.events;witness=null;status='exhausted';}return finish();
}
