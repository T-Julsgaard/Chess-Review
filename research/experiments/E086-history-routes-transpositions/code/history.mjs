import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E085-immediate-mate-review/code/review.mjs';
const record=m=>({uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
export const priority=e=>e.evidence?.experiment==='E086'?45:inherited(e);
export function explainMove(input){
 const enabled=input.routeTags===undefined?false:input.routeTags;
 if(typeof enabled!=='boolean')throw Error('routeTags must be boolean');
 if(!enabled)return parent(input);
 const limit=input.maxHistoryRouteNodes===undefined?50000:input.maxHistoryRouteNodes;
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxHistoryRouteNodes must be integer0..50000');
 const comparison=input.comparisonHistory;
 if(comparison!==undefined&&(!comparison||typeof comparison.fen!=='string'||!Array.isArray(comparison.moves)||comparison.moves.length>1000))throw Error('Invalid comparisonHistory');
 const base=parent(input);let nodes=0,status='no-new-fact',events=base.events,witness=null;
 const done=()=>({...base,schema:'coach-concepts-E086-prototype',events,
  comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,
  historyRouteAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 const tick=()=>{if(++nodes>limit)throw Error('history-route-budget');};
 try{
  tick();const h=validateHistory(input);if(!h){status='unavailable';return done();}
  const c=legalPosition(h.start),units=c.board().flat().filter(Boolean).map(p=>({id:p.color+p.type+p.square,type:p.type,color:p.color,square:p.square,alive:true,moves:[]})),states=[c.fen()],records=[];
  let unit=null,played=null;
  for(const code of [...h.moves,input.move]){
   tick();if(c.isGameOver())throw Error('History route cannot continue terminal position');
   const legal=c.moves({verbose:true}).find(m=>uci(m)===code);if(!legal)throw Error('Illegal history route move');
   unit=units.find(p=>p.alive&&p.square===legal.from);if(!unit)throw Error('Tracked piece missing');
   const victim=legal.isEnPassant()?legal.to[0]+legal.from[1]:legal.to;
   for(const p of units)if(p.alive&&p.color!==legal.color&&p.square===victim)p.alive=false;
   const row=record(legal);unit.moves.push(row);unit.square=legal.to;unit.type=legal.promotion||unit.type;
   if(legal.isKingsideCastle()||legal.isQueensideCastle()){
    const rank=legal.from[1],from=(legal.isKingsideCastle()?'h':'a')+rank,to=(legal.isKingsideCastle()?'f':'d')+rank;
    const rook=units.find(p=>p.alive&&p.square===from&&p.color===legal.color&&p.type==='r');if(!rook)throw Error('Castling rook missing');rook.square=to;
   }
   played=c.move(code);records.push({...row,after:c.fen()});states.push(c.fen());
  }
  if(c.fen()!==base.after)throw Error('Parent route differs');
  if(c.isGameOver()){status='not-live';return done();}
  witness={experiment:'E086',history:{fen:h.start,moves:h.moves},played:record(played),after:c.fen(),states,records,units,
   selectedUnit:unit.id,route:null,checkingReplies:[],comparison:null};
  const extra=[],add=(id,text)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness}});};
  const relevant=unit.moves.filter(m=>m.piece===played.piece),path=[relevant[0].from,...relevant.map(m=>m.to)],distinct=[...new Set(path)];
  if(played.piece==='n'&&relevant.length>=2&&distinct.length>=3&&c.isCheck()){
   const king=c.board().flat().find(p=>p?.type==='k'&&p.color!==played.color);
   if(c.attackers(king.square,played.color).includes(played.to)){
    tick();for(const m of c.moves({verbose:true})){tick();c.move(uci(m));witness.checkingReplies.push({...record(m),after:c.fen(),terminal:c.isGameOver()});c.undo();}
    witness.route={kind:'knight-checking-route',unit:unit.id,path,moves:relevant,distinct,king:king.square};
    add('recorded-knight-maneuver',`Knight maneuver: the recorded knight route ends ${path.slice(-4).join('–')}, ending with check on ${played.to}.`);
    add('recorded-knight-rerouting',`Knight rerouting: ${relevant.length} recorded knight moves reach ${played.to} with actual check.`);
    if(relevant.length>=3&&distinct.length>=4)add('recorded-knight-tour',`Knight tour: ${relevant.length} moves visit ${distinct.length} distinct squares, ending with check on ${played.to}.`);
   }
  }
  if(played.piece==='k'&&relevant.length>=3&&distinct.length>=4&&played.captured){witness.route={kind:'king-capturing-walk',unit:unit.id,path,moves:relevant,distinct};
   add('recorded-king-walk',`King walk: the recorded king route ends ${path.slice(-4).join('–')}, ending with a capture on ${played.to}.`);}
  if(comparison!==undefined){
   tick();const other=legalPosition(comparison.fen),otherStates=[other.fen()];
   if(other.fen()!==legalPosition(h.start).fen())throw Error('comparisonHistory must start at identical FEN');
   for(const code of comparison.moves){tick();if(other.isGameOver())throw Error('Invalid comparisonHistory: terminal continuation');
    if(typeof code!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(code))throw Error('Invalid comparisonHistory UCI');
    const move=other.moves({verbose:true}).find(m=>uci(m)===code);if(!move)throw Error('Invalid comparisonHistory: illegal move');other.move(code);otherStates.push(other.fen());}
   const actualMoves=[...h.moves,input.move],different=JSON.stringify(actualMoves)!==JSON.stringify(comparison.moves),sameEndpoint=other.fen()===c.fen();
   const keys=states=>states.map(f=>f.split(' ').slice(0,4).join(' '));
   witness.comparison={history:comparison,states:otherStates,actualKeys:keys(states),comparisonKeys:keys(otherStates),different,sameEndpoint,terminal:other.isGameOver(),
    sameMoveMultiset:JSON.stringify([...actualMoves].sort())===JSON.stringify([...comparison.moves].sort())};
   if(different&&sameEndpoint&&!other.isGameOver()){
    add('exact-history-transposition','Transposition: two different legal routes reach the same full FEN; repetition histories remain separate.');
    if(witness.comparison.sameMoveMultiset)add('transposed-move-order','Move order: the same moves in different orders reach the same live position and rule counters.');
   }
  }
  if(extra.length){events=[...base.events,...extra];status='proven';}
  else if(!comparison)status='unavailable';else if(!witness.comparison.sameEndpoint)status='different-position';
 }catch(e){if(e.message!=='history-route-budget')throw e;status='exhausted';events=base.events;witness=null;}
 return done();
}
