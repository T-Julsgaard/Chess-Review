import {VALUES,legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {collectCertificate} from './collect.mjs';
import {verifyCertificate} from './check-witness.mjs';
import {explainMove as parent,priority as inherited} from '../../E143-forcing-tempo-initiative/code/tempo.mjs';
export const priority=e=>e.evidence?.experiment==='E144'?186.5:inherited(e);
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen'},nominalValues=Object.fromEntries(['p','n','b','r','q'].map(t=>[t,VALUES[t]]));
export function explainMove(input){
  const enabled=input.coordinationTags===undefined?false:input.coordinationTags;if(typeof enabled!=='boolean')throw Error('coordinationTags must be boolean');if(!enabled)return parent(input);
  const limit=input.maxCoordinationNodes===undefined?50000:input.maxCoordinationNodes,H=input.coordinationPlies===undefined?2:input.coordinationPlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxCoordinationNodes must be integer0..50000');if(!Number.isSafeInteger(H)||H<0||H>2)throw Error('coordinationPlies must be integer0..2');
  const base=parent(input);let nodes=0,status='history-prerequisite',witness=null,events=base.events;
  const done=()=>({...base,schema:'coach-concepts-E144-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,coordinationAnalysis:{limit,plies:H,nodes,status,witness,nominalValues}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
  try{
    if(limit===0)throw Error('coordination-budget');nodes=1;const h=validateHistory(input);if(!h)return done();const c=legalPosition(h.start);for(const m of h.moves)c.move(m);if(c.isGameOver()){status='not-live';return done();}
    const cert=input.coordinationCertificate===undefined?collectCertificate(input,H,limit):input.coordinationCertificate;if(!cert||typeof cert!=='object')throw Error('Expected coordination certificate');if(cert.nodes>limit)throw Error('coordination-budget');const checked=verifyCertificate(input,cert);nodes=checked.nodes;if(nodes>limit)throw Error('coordination-budget');witness=cert;if(cert.after!==base.after)throw Error('Parent coordination differs');
    if(checked.context){status='claim-rule-prerequisite';return done();}if(!cert.actual.tree.win){status='no-certified-mate';return done();}
    const extra=[],add=(id,text)=>{if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{experiment:'E144',before:cert.before,after:cert.after,detail:{source:'coordinationAnalysis.witness'}}});},necessary=cert.removals.filter(r=>r.necessary),helpers=necessary.filter(r=>r.square!==input.move.slice(2,4));
    if(necessary.some(r=>r.square===input.move.slice(2,4))&&helpers.length>=2&&cert.core?.query?.tree.win)add('cooperating-mating-core',`Cooperating mating core: ${cert.core.kept.length} units plus the king suffice; each was independently necessary in the full position’s ${H}-ply mate policy.`);
    const failed=cert.relocations.find(r=>r.query&&!r.query.tree.win);if(failed)add('placement-dependent-piece-quality',`Piece activity: ${names[failed.type]} ${failed.square} enables the ${H}-ply mate; relocating it to ${failed.destination} preserves nominal material but fails that bound.`);
    const redundant=cert.removals.filter(r=>r.query?.tree.win);let pair=null;for(const low of helpers){const high=redundant.find(r=>VALUES[r.type]>VALUES[low.type]);if(high){pair={low,high};break;}}
    if(pair)add('nominal-versus-role',`Approximate nominal values: pawn1, knight3, bishop3, rook5, queen9. Here ${names[pair.low.type]} ${pair.low.square} is necessary; ${names[pair.high.type]} ${pair.high.square} is dispensable within the mating bound.`);
    if(extra.length)events=[...base.events,...extra];status=extra.length?'proven':'compared';
  }catch(e){if(e.message!=='coordination-budget')throw e;nodes=limit+1;witness=null;events=base.events;status='exhausted';}return done();
}
