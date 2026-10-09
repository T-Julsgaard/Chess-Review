import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {xRays} from '../../E023-broad-tactics/code/tactics.mjs';
import {offLineMoves} from '../../E026-pin-proofs/code/proofs.mjs';
import {materialPolicy} from '../../E091-forced-material-sequences/code/sequences.mjs';
import {inspect} from '../../E035-opening-development/code/opening.mjs';
import {explainMove as parent,priority as inherited} from '../../E100-tracked-center-formations/code/centers.mjs';
const points=(c,a)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===a?1:-1),0),other=a=>a==='w'?'b':'w';
const rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags}),victim=m=>m.flags.includes('e')?m.to[0]+m.from[1]:m.to;
const same=(a,b,m)=>(a.slider===b.slider||a.slider===m.from&&b.slider===m.to)&&a.blocker.square===b.blocker.square&&a.target.square===b.target.square;
function captureProof(c,m,budget){const before=legalPosition(c.fen());budget.tick();c.move(m);try{return certifyCapture(before,c,m,budget);}finally{c.undo();}}
export function rayPolicy(c,ray,actor,budget){
 budget.tick();const root=c.fen(),baseline=points(c,actor),moves=offLineMoves(c,ray),rows=[],p={root,baseline,actor,ray,moves:moves.map(rec),rows,proven:false};if(!moves.length||c.isGameOver())return p;
 for(const reply of moves){budget.tick();c.move(reply);try{const row={reply:rec(reply),after:c.fen(),terminal:c.isGameOver(),capture:null,proof:null,offset:points(c,actor)-baseline,net:null};rows.push(row);if(row.terminal)return p;
  budget.tick();const capture=c.moves({verbose:true}).find(m=>m.from===ray.slider&&victim(m)===ray.target.square&&m.captured===ray.target.type);if(!capture)return p;row.capture=rec(capture);row.proof=captureProof(c,capture,budget);if(!row.proof)return p;row.net=row.proof.minimumGain+row.offset;if(row.net<=0)return p;
 }finally{c.undo();}}
 p.proven=true;return p;
}
export const priority=e=>e.evidence?.experiment==='E101'?(e.id.includes('warning')?118:109):inherited(e);
export function explainMove(input){
 const enabled=input.tacticalConstraintTags===undefined?false:input.tacticalConstraintTags;if(typeof enabled!=='boolean')throw Error('tacticalConstraintTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxConstraintNodes===undefined?50000:input.maxConstraintNodes;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxConstraintNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',witness=null,events=base.events;const budget={tick(){if(++nodes>limit)throw Error('constraint-budget');}},done=()=>({...base,schema:'coach-concepts-E101-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,tacticalConstraintAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{
  budget.tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const code of h?.moves||[]){budget.tick();c.move(code);}if(c.isGameOver()){status='not-live';return done();}
  const before=c.fen(),actor=c.turn(),enemy=other(actor),rootBalance=points(c,actor),rootCheck=c.isCheck(),oldOwn=xRays(c,actor),oldEnemy=xRays(c,enemy),oldMoves=c.moves({verbose:true});budget.tick();const m=c.move(input.move);if(c.fen()!==base.after)throw Error('Parent tactical constraint differs');if(c.isGameOver()){status='not-live';return done();}
  witness={experiment:'E101',actor,before,after:c.fen(),history:h?{fen:h.start,moves:h.moves}:null,played:rec(m),rootBalance,rootCheck,rays:[],captures:[],selfPins:[],loose:null,quiet:null,opening:inspect(input)};
  const extra=[],add=(id,text,detail)=>{budget.tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness,detail}});};
  if(!rootCheck&&!c.isCheck())for(const ray of xRays(c,actor).filter(r=>r.slider===m.to&&r.blocker.color===enemy&&r.target.color===enemy&&r.target.type!=='k'&&!oldOwn.some(o=>same(o,r,m)))){
   const pin=ray.target.type!=='q'&&VALUES[ray.target.type]>VALUES[ray.blocker.type],skewer=VALUES[ray.blocker.type]>VALUES[ray.target.type];if(!pin&&!skewer)continue;
   const p=rayPolicy(c,ray,actor,budget),item={ray,policy:p,kind:pin?'pin':'skewer',front:null};witness.rays.push(item);if(!p.proven)continue;
   if(skewer){const frame=turnBoard(c,actor);budget.tick();const capture=frame.moves({verbose:true}).find(x=>x.from===ray.slider&&victim(x)===ray.blocker.square&&x.captured===ray.blocker.type);if(!capture)continue;const proof=captureProof(frame,capture,budget);if(!proof)continue;item.front={frameFen:frame.fen(),capture:rec(capture),proof};}
   add(pin?'certified-nonqueen-relative-pin':'certified-nonking-skewer',`${pin?'Relative pin':'Nonking skewer'}: every legal off-line move from ${ray.blocker.square} permits ${ray.slider} to capture ${ray.target.square} with positive net gain through every immediate counterreply.`,{item});
   add('functional-conditional-xray',`Functional x-ray: ${ray.blocker.square} blocks ${ray.slider}; every legal off-line move permits profitable capture on ${ray.target.square}, with all immediate counterreplies checked.`,{item});
  }
  budget.tick();const enemyCaptures=c.moves({verbose:true}).filter(x=>x.captured&&!['p','k'].includes(x.captured)),enemyOffset=points(c,enemy)+rootBalance;
  for(const capture of enemyCaptures){const proof=captureProof(c,capture,budget);if(!proof)continue;const net=proof.minimumGain+enemyOffset;if(net<=0)continue;
   budget.tick();c.move(capture);let recaptures,longer;try{budget.tick();recaptures=c.moves({verbose:true}).filter(x=>x.captured&&victim(x)===capture.to).map(rec);longer=materialPolicy(c,enemy,0-rootBalance,1,false,()=>budget.tick());}finally{c.undo();}
   let old=null,oldCode=null;if(!rootCheck&&!c.isCheck()){const frame=turnBoard(legalPosition(before),enemy),target=victim(capture)===m.to?m.from:victim(capture);budget.tick();const mapped=frame.moves({verbose:true}).find(x=>x.from===capture.from&&victim(x)===target&&x.captured===frame.get(target)?.type);if(mapped){oldCode=uci(mapped);old=captureProof(frame,mapped,budget);}}
   const row={capture:rec(capture),proof,enemyOffset,net,recaptures,longer,oldCode,old,newLoss:!rootCheck&&!c.isCheck()&&(!old||old.minimumGain<=0)};witness.captures.push(row);
   if(recaptures.length)add('certified-underprotection-warning',`Underprotection: ${capture.san} wins at least ${net} net nominal points despite legal recapture ${recaptures[0].uci}; every immediate response is covered.`,{loss:row});
   if(longer.win)add('four-ply-hanging-warning',`Hanging-piece sequence: ${capture.san} permits further capture after every response, retaining net enemy gain through every following counterreply; immediate-only recovery is insufficient.`,{loss:row});
   if(row.newLoss){add('new-tactical-vulnerability-warning',`Tactical vulnerability: ${m.san} newly permits ${capture.san}, losing at least ${net} net nominal points through every immediate counterreply.`,{loss:row});if(witness.opening&&witness.opening.turnNumber<=10)add('recorded-opening-pitfall-warning',`Opening pitfall: home-board history places ${m.san} within ten own turns; ${capture.san} newly wins at least ${net} net points through every immediate counterreply.`,{loss:row,opening:witness.opening});}
  }
  for(const ray of xRays(c,enemy).filter(r=>r.blocker.color===actor&&r.target.color===actor&&r.target.type==='k'&&!oldEnemy.some(o=>same(o,r,m)))){
   const oldBlock=ray.blocker.square===m.to?m.from:ray.blocker.square,oldLine=new Set([ray.slider,...ray.line,ray.target.square]);budget.tick();const frame=turnBoard(c,actor),remaining=offLineMoves(frame,ray).map(rec),previous=oldMoves.filter(x=>x.from===oldBlock&&!oldLine.has(x.to)).map(rec),loss=witness.captures.find(x=>victim(x.capture)===ray.blocker.square);
   if(previous.length&&!remaining.length&&loss){const item={ray,oldBlock,previous,remaining,frameFen:frame.fen(),loss};witness.selfPins.push(item);add('profitable-self-pin-warning',`Self-pin: ${m.san} pins ${ray.blocker.square} to your king; ${loss.capture.uci} has certified immediate net material gain, though capture may already be available.`,{selfPin:item});}
  }
  if(m.captured&&!['p','k'].includes(m.captured)&&!legalPosition(before).attackers(victim(m),enemy).length){c.undo();const proof=captureProof(c,m,budget);c.move(input.move);if(proof){witness.loose={victim:victim(m),defenders:[],proof};add('certified-loose-piece-opportunity',`Loose-piece opportunity: ${m.san} captures an undefended nonpawn unit and retains at least ${proof.minimumGain} nominal points through every immediate reply.`,{loose:witness.loose});}}
  if(m.piece!=='k'&&!m.captured&&!m.promotion&&!/[kq]/.test(m.flags)&&!c.isCheck()&&!rootCheck){witness.quiet=materialPolicy(c,actor,rootBalance,1,false,()=>budget.tick());if(witness.quiet.win)add('quiet-forced-material-sequence',`Quiet material sequence: ${m.san} gives no check or capture; every legal defense permits a capture retaining positive net gain through every counterreply.`,{policy:witness.quiet});}
  if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='constraint-budget')throw e;events=base.events;witness=null;status='exhausted';}return done();
}
