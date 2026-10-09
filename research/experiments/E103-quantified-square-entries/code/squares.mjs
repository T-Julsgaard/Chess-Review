import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as outpost} from '../../E070-knight-outposts/code/outpost.mjs';import {explainMove as parent,priority as inherited} from '../../E102-king-pawn-turn-policies/code/policies.mjs';
const points=(c,a)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===a?1:-1),0),record=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null});
const legal=(c,tick)=>{tick();const moves=c.moves({verbose:true});for(const m of moves)tick();return moves;};
export function squareCapturePolicy(c,actor,square,type,baseline,tick){
 const p={root:c.fen(),actor,square,type,baseline,threshold:1,replies:[],branches:[],win:false};if(c.isGameOver()||c.turn()===actor){p.terminal=true;return p;}
 const replies=legal(c,tick);p.replies=replies.map(uci);
 for(const reply of replies){tick();c.move(reply);let b;try{b={reply:uci(reply),fen:c.fen(),terminal:c.isGameOver(),options:[],attempts:[],chosen:null};const unit=c.get(square);
  if(!b.terminal&&unit?.color===actor&&unit.type===type){const options=legal(c,tick).filter(m=>m.from===square&&m.captured);b.options=options.map(uci);
   for(const capture of options){tick();c.move(capture);let a;try{a={move:uci(capture),fen:c.fen(),terminal:c.isGameOver(),counterMoves:[],counters:[],passed:false};if(!a.terminal){const counters=legal(c,tick);a.counterMoves=counters.map(uci);let passed=!!counters.length;for(const counter of counters){tick();c.move(counter);let leaf;try{leaf={move:uci(counter),fen:c.fen(),gain:points(c,actor)-baseline,terminal:c.isGameOver()};}finally{c.undo();}a.counters.push(leaf);if(leaf.terminal||leaf.gain<1){passed=false;break;}}a.passed=passed;}}finally{c.undo();}b.attempts.push(a);if(a.passed){b.chosen=a.move;break;}
   }
  }
 }finally{c.undo();}p.branches.push(b);if(!b.chosen)return p;
 }p.win=!!replies.length;return p;
}
export const priority=e=>e.evidence?.experiment==='E103'?160:inherited(e);
export function explainMove(input){
 const enabled=input.squarePolicyTags===undefined?false:input.squarePolicyTags;if(typeof enabled!=='boolean')throw Error('squarePolicyTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxSquarePolicyNodes===undefined?50000:input.maxSquarePolicyNodes;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxSquarePolicyNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',witness=null,events=base.events;const tick=()=>{if(++nodes>limit)throw Error('square-policy-budget');},done=()=>({...base,schema:'coach-concepts-E103-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,squarePolicyAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const code of h?.moves||[]){tick();c.move(code);}if(c.isGameOver()){status='not-live';return done();}const before=c.fen(),actor=c.turn(),baseline=points(c,actor),m=c.move(input.move);tick();if(c.fen()!==base.after)throw Error('Parent square policy differs');if(['p','k'].includes(m.piece)||m.captured||c.isGameOver()){status='not-live-piece-entry';return done();}
  const actual=squareCapturePolicy(c,actor,m.to,m.piece,baseline,tick);witness={experiment:'E103',before,after:c.fen(),actor,history:h?{fen:h.start,moves:h.moves}:null,played:record(m),baseline,actual,restored:null,outpost:null};if(!actual.win)return done();
  const extra=[],add=(id,text,detail)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{experiment:'E103',before,after:c.fen(),detail}});};
  add('quantified-occupied-square',`Occupied-square benefit: after ${m.san}, every defense permits this piece to capture with positive nominal gain through every immediate counterreply.`,{policy:'actual',square:m.to});
  const relative=actor==='w'?+m.to[1]:9-+m.to[1];if(relative>=5){let restored;try{const copy=legalPosition(c.fen());copy.remove(m.to);copy.put({type:m.piece,color:actor},m.from);const fields=copy.fen().split(' ');fields[3]='-';restored=legalPosition(fields.join(' '));}catch{}if(restored){witness.restored=squareCapturePolicy(restored,actor,m.from,m.piece,baseline,tick);if(!witness.restored.win)add('causal-tactical-entry-square',`Entry-square benefit: ${m.to} admits this piece's all-defense material policy; restoring only the piece to ${m.from} removes that finite capture route.`,{policy:'actual',counterfactual:'restored',square:m.to});}}
  if(m.piece==='n'&&relative>=4&&relative<=6){const source=outpost({...input,outpostTags:true,maxOutpostNodes:limit-nodes});nodes+=source.outpostAnalysis.nodes;if(source.outpostAnalysis.status==='exhausted'||nodes>limit)throw Error('square-policy-budget');witness.outpost={analysis:source.outpostAnalysis,event:source.events.find(e=>e.id==='knight-outpost-proof')||null};if(witness.outpost.event){add('profitable-pawn-resistant-square',`Pawn-resistant square: ${m.to} has legal pawn support and no pre-promotion enemy pawn access; its knight has an all-defense material policy.`,{policy:'actual',source:'outpost'});add('quantified-protected-knight-outpost',`Protected knight outpost: ${m.to} has a certified all-defense capture policy and legal pawn support; safety beyond the stated continuations remains unproved.`,{policy:'actual',source:'outpost'});}}
  events=[...base.events,...extra];status='proven';
 }catch(e){if(e.message!=='square-policy-budget')throw e;events=base.events;witness=null;status='exhausted';}return done();
}
