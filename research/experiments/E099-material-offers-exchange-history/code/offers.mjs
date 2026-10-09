import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {explainMove as parent,priority as inherited} from '../../E098-audited-prophylaxis/code/prophylaxis.mjs';
const balance=(c,a)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===a?1:-1),0);
const rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
const victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
function offers(c,played,budget){
 budget.tick();const root=c.fen(),captures=c.moves({verbose:true}).filter(m=>m.captured&&victim(m)===played.to),rows=[];
 if(played.piece==='k'||played.promotion)return{root,captures:captures.map(rec),rows};
 const offset=played.captured?-VALUES[played.captured]:0;
 for(const capture of captures){budget.tick();const before=legalPosition(c.fen());c.move(capture);
  try{const terminal=c.isGameOver(),proof=terminal?null:certifyCapture(before,c,capture,budget);
   const minimum=proof?proof.minimumGain+offset:null,maximum=proof?Math.max(VALUES[capture.captured]+(capture.promotion?VALUES[capture.promotion]-1:0),...proof.witnesses.map(w=>w.gain))+offset:null;
   rows.push({capture:rec(capture),after:c.fen(),terminal,proof,offset,minimum,maximum,positive:minimum>0});
  }finally{c.undo();}
 }return{root,captures:captures.map(rec),rows};
}
export const priority=e=>e.evidence?.experiment==='E099'?107:inherited(e);
export function explainMove(input){
 const enabled=input.materialOfferTags===undefined?false:input.materialOfferTags;
 if(typeof enabled!=='boolean')throw Error('materialOfferTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxMaterialOfferNodes===undefined?50000:input.maxMaterialOfferNodes;
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxMaterialOfferNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',witness=null,events=base.events;
 const budget={tick(){if(++nodes>limit)throw Error('material-offer-budget');}};
 const done=()=>({...base,schema:'coach-concepts-E099-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,materialOfferAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{
  budget.tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);
  for(const code of h?.moves||[]){budget.tick();c.move(code);}if(c.isGameOver()){status='not-live';return done();}
  const actor=c.turn(),before=c.fen(),baseline=balance(c,actor);budget.tick();const m=c.move(input.move);
  if(c.fen()!==base.after)throw Error('Parent material offer differs');if(c.isGameOver()){status='not-live';return done();}
  const current=offers(c,m,budget),positive=current.rows.find(x=>x.positive),last=h?.records.at(-1),prior=h?.records.at(-2);
  witness={experiment:'E099',before,after:c.fen(),actor,baseline,history:h?{fen:h.start,moves:h.moves}:null,played:rec(m),current,incoming:null,returned:null,exchange:null,pawnPair:null,mass:null};
  const extra=[],add=(id,text,detail)=>{budget.tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness,detail}});};
  if(positive){
   add('certified-unrecovered-offer',`Material offer: after ${m.san}, accepting with ${positive.capture.uci} loses at least ${positive.minimum} net nominal points through every immediate counterreply.`,{acceptance:positive});
   if(m.piece==='r'&&m.captured==='p')add('certified-rook-for-pawn-offer',`Rook for pawn: ${m.san} captures a pawn; ${positive.capture.uci} accepts the rook with at least ${positive.minimum} net nominal points unrecovered immediately.`,{acceptance:positive});
   if(prior?.move.color===actor&&prior.move.captured==='p'&&prior.move.piece==='b'&&prior.move.to===m.from&&m.piece==='b'&&m.captured==='p'&&!prior.move.promotion){
    const pairOffset=baseline-balance(legalPosition(prior.before),actor),loss=positive.minimum-pairOffset;
    if(loss>0){witness.pawnPair={first:rec(prior.move),intervening:rec(last.move),baselineFen:prior.before,totalPawns:2,pairOffset,minimumLoss:loss};add('certified-bishop-for-two-pawns-offer',`Bishop for two pawns: recorded ${uci(prior.move)} then ${m.san} take two pawns; ${positive.capture.uci} leaves at least ${loss} net points unrecovered immediately.`,{acceptance:positive,pair:witness.pawnPair});}
   }
   if(last){const incomingBoard=legalPosition(h.start);for(const code of h.moves){budget.tick();incomingBoard.move(code);}const incoming=offers(incomingBoard,last.move,budget),selected=incoming.rows.find(x=>x.positive);
    if(selected){witness.incoming={played:rec(last.move),before:last.before,offers:incoming,selected};add('certified-counter-offer',`Counter-offer: recorded ${uci(last.move)} offered material; ${m.san} independently offers at least ${positive.minimum} net points on accepting with ${positive.capture.uci}.`,{incoming:witness.incoming,acceptance:positive});}
   }
   if(prior?.move.color===actor&&prior.move.captured){const gain=baseline-balance(legalPosition(prior.before),actor),safe=current.rows.find(x=>x.positive&&x.maximum<=gain);
    if(gain>0&&safe){witness.returned={capture:rec(prior.move),baselineFen:prior.before,gain,maximumReturned:safe.maximum,acceptance:safe};add('certified-return-of-recorded-gain',`Returning material: after a recorded ${gain}-point gain, ${safe.capture.uci} accepts ${m.san}; every immediate counterreply retains at least the pre-gain balance.`,{returned:witness.returned});
     if(m.piece==='r'&&['b','n'].includes(safe.capture.piece)&&safe.minimum===2&&safe.maximum===2)add('certified-give-back-exchange',`Giving back the exchange: ${safe.capture.uci} accepts your rook after ${m.san}; its two-point net return does not exceed the recorded gain.`,{returned:witness.returned});
    }
   }
  }
  if(last?.move.captured&&['b','n'].includes(last.move.captured)&&last.move.piece==='r'&&m.captured==='r'&&victim(m)===last.move.to){
   budget.tick();const proof=certifyCapture(legalPosition(before),c,m,budget),offset=baseline-balance(legalPosition(last.before),actor);
   if(proof&&proof.minimumGain+offset>=2){witness.exchange={previous:rec(last.move),baselineFen:last.before,proof,offset,minimumGain:proof.minimumGain+offset};add('recorded-winning-exchange',`Winning the exchange: recorded ${uci(last.move)} took your minor; ${m.san} takes that rook, retaining at least ${witness.exchange.minimumGain} net points through every immediate reply.`,{exchange:witness.exchange});}
  }
  const records=[...(h?.records||[]),{before,after:c.fen(),move:m}],suffix=[];
  for(let i=records.length-1;i>=0&&records[i].move.captured;i--){budget.tick();suffix.unshift(records[i]);}
  const pairs=[];for(let i=1;i<suffix.length;i++){const a=suffix[i-1].move,b=suffix[i].move;if(b.color!==a.color&&victim(b)===a.to&&b.captured===(a.promotion||a.piece))pairs.push({index:i,first:rec(a),second:rec(b),square:a.to});}
  if(suffix.length>=4&&new Set(pairs.map(p=>p.square)).size>=2){witness.mass={records:suffix.map(r=>({before:r.before,after:r.after,move:rec(r.move),actorBalance:balance(legalPosition(r.after),actor)})),pairs};add('recorded-mass-exchange-sequence',`Exchange sequence: ${suffix.length} consecutive recorded captures include ${new Set(pairs.map(p=>p.square)).size} distinct recapture squares; ${m.san} completes the current sequence.`,{mass:witness.mass});}
  if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='material-offer-budget')throw e;events=base.events;witness=null;status='exhausted';}return done();
}
