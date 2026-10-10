import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E136-exact-mate-distance/code/distance.mjs';
import {assess,variation} from './panels.mjs';
export const priority=e=>e.evidence?.experiment==='E137'?184+({'mating-candidate-comparison':0,'shortest-mate-filter':0.1,'longest-mating-defense':0.2,'mating-principal-variation':0.3}[e.id]||0):inherited(e);
export function explainMove(input){
  const enabled=input.candidatePanelTags===undefined?false:input.candidatePanelTags;if(typeof enabled!=='boolean')throw Error('candidatePanelTags must be boolean');if(!enabled)return parent(input);
  const limit=input.maxCandidatePanelNodes===undefined?50000:input.maxCandidatePanelNodes,H=input.candidateMatePlies===undefined?2:input.candidateMatePlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxCandidatePanelNodes must be integer0..50000');if(!Number.isSafeInteger(H)||H<0||H>4)throw Error('candidateMatePlies must be integer0..4');
  const base=parent(input);let nodes=0,status='no-new-fact',witness=null,events=base.events;const tick=()=>{if(++nodes>limit)throw Error('candidate-panel-budget');},budget={tick};
  const done=()=>({...base,schema:'coach-concepts-E137-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,candidatePanelAnalysis:{limit,plies:H,nodes,status,witness}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
  try{
    tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const move of h?.moves||[]){tick();c.move(move);}if(c.isGameOver()){status='not-live';return done();}
    const before=c.fen(),actor=c.turn(),m=c.move(input.move),after=c.fen();if(after!==base.after)throw Error('Parent candidate differs');c.undo();const legal=c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));
    witness={experiment:'E137',before,after,actor,history:h?{fen:h.start,moves:h.moves}:null,played:uci(m),san:m.san,moves:legal.map(uci),candidates:[],fastest:null,best:[],eliminated:[],variation:[],claimContext:null};
    for(const option of legal){tick();c.move(uci(option));let a;try{a=assess(c,actor,H,budget);witness.candidates.push({move:uci(option),san:option.san,after:c.fen(),assessment:a});}finally{c.undo();}if(a.claimLeaves){witness.claimContext={kind:'candidate',index:witness.candidates.length-1};status='claim-rule-prerequisite';return done();}}
    const wins=witness.candidates.filter(r=>r.assessment.distance!==null);if(!wins.length){status='no-certified-mating-candidate';return done();}
    const fastest=Math.min(...wins.map(r=>r.assessment.distance));witness.fastest=fastest;witness.best=wins.filter(r=>r.assessment.distance===fastest).map(r=>r.move);witness.eliminated=witness.moves.filter(move=>!witness.best.includes(move));
    const actual=witness.candidates.find(r=>r.move===witness.played);if(actual.assessment.distance!==null){c.move(witness.played);const pv=variation(c,actor,actual.assessment,budget);witness.variation=pv.steps;if(pv.claim){witness.claimContext={kind:'variation',...pv.claim};status='claim-rule-prerequisite';return done();}}
    tick();const e=(id,text)=>({id,text,qualityClaim:false,evidence:{experiment:'E137',before,after,detail:{source:'candidatePanelAnalysis.witness'}}}),best=witness.candidates.find(r=>r.move===witness.best[0]),total=witness.moves.length;
    const added=[e('mating-candidate-comparison',`Fastest certified mate: ${best.san}; ${fastest} plies remain after it. All ${total} legal candidates were checked.`)];
    if(witness.eliminated.length)added.push(e('shortest-mate-filter',`Shortest-mate filter: ${witness.best.length} of ${total} legal candidates meet the ${fastest}-ply continuation bound; the others have complete refutations.`));
    if(witness.variation.length){const pv=witness.variation,root=pv[0],line=pv.filter(s=>s.move).map(s=>s.san).join(' ');if(root.distance>0)added.push(e('longest-mating-defense',`Longest mating defense: ${root.defenses.find(r=>r.move===root.move).san} leaves ${root.distance-1} plies; every legal reply has a verified mate-distance bound.`));added.push(e('mating-principal-variation',line?`Mating principal variation: ${line}. Shortest mating moves and longest defenses end in checkmate after ${root.distance} plies.`:'Mating principal variation: the actual move already delivered checkmate; zero plies remain.'));}
    if(added.some(e=>e.text.split(/\s+/).length>24))throw Error('Comment exceeds24words');events=[...events,...added];status='proven';
  }catch(e){if(e.message!=='candidate-panel-budget')throw e;witness=null;events=base.events;status='exhausted';}
  return done();
}
