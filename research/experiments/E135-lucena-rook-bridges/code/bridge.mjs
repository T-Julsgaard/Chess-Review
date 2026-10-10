import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E134-dual-purpose-king-races/code/race.mjs';
import {promotionQuery} from './promotion-query.mjs';
const balance=(c,a)=>c.board().flat().filter(Boolean).reduce((s,p)=>s+VALUES[p.type]*(p.color===a?1:-1),0);
const rank=(s,a)=>a==='w'?+s[1]:9-+s[1];
export const priority=e=>e.evidence?.experiment==='E135'?180+(e.id==='recorded-lucena-bridge'?1:0):inherited(e);
function lucena(h,actor,pawn,rook) {
  if(!h?.moves.length)return null;const c=legalPosition(h.start),army=c.board().flat().filter(Boolean),p=army.find(p=>p.color===actor&&p.type==='p'),r=army.find(p=>p.color===actor&&p.type==='r'),k=army.find(p=>p.color===actor&&p.type==='k'),enemy=army.find(p=>p.color!==actor&&p.type==='k');
  if(army.length!==5 || !p || !r || p.square!==pawn || rank(p.square,actor)!==7 || ['a','h'].includes(p.square[0]) || k.square!==p.square[0]+(actor==='w'?'8':'1'))return null;
  const f=s=>s.charCodeAt(0),pf=f(p.square),rf=f(r.square),ef=f(enemy.square);
  if(Math.abs(ef-pf)<2 || !(Math.min(pf,ef)<rf&&rf<Math.max(pf,ef)))return null;
  const cutoff=Array.from({length:8},(_,i)=>r.square[0]+(i+1)).filter(s=>s!==r.square);
  if(cutoff.some(s=>c.get(s)))return null;
  let tracked=r.square;for(const move of h.moves){const m=c.move(move);if(m.piece==='p'||m.captured||m.promotion)return null;if(m.color===actor&&m.from===tracked)tracked=m.to;}
  if(tracked!==rook)return null;return {start:h.start,pawn:p.square,king:k.square,rook:r.square,enemyKing:enemy.square,cutoff};
}
export function explainMove(input) {
  const enabled=input.rookBridgeTags===undefined?false:input.rookBridgeTags;if(typeof enabled!=='boolean')throw Error('rookBridgeTags must be boolean');if(!enabled)return parent(input);
  const limit=input.maxRookBridgeNodes===undefined?50000:input.maxRookBridgeNodes,H=input.rookBridgePlies===undefined?4:input.rookBridgePlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxRookBridgeNodes must be integer0..50000');if(!Number.isSafeInteger(H)||H<0||H>6)throw Error('rookBridgePlies must be integer0..6');
  const base=parent(input);let nodes=0,status='no-new-fact',witness=null,events=base.events;const tick=()=>{if(++nodes>limit)throw Error('rook-bridge-budget');};
  const done=()=>({...base,schema:'coach-concepts-E135-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,rookBridgeAnalysis:{limit,plies:H,nodes,status,witness}});
  if(base.error || base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
  try {
    tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const move of h?.moves||[]){tick();c.move(move);}if(c.isGameOver()){status='not-live';return done();}
    const before=c.fen(),actor=c.turn(),army=c.board().flat().filter(Boolean),p=army.find(p=>p.color===actor&&p.type==='p'),r=army.find(p=>p.color===actor&&p.type==='r'),k=army.find(p=>p.color===actor&&p.type==='k'),enemy=army.find(p=>p.color!==actor&&p.type==='r'),checked=c.isCheck(),baseline=balance(c,actor),m=c.move(input.move),after=c.fen();
    if(after!==base.after)throw Error('Parent bridge differs');if(c.isGameOver()){status='not-live';return done();}
    if(army.length!==5||!p||!r||!enemy||army.some(p=>!['k','r','p'].includes(p.type))||army.filter(p=>p.type==='p').length!==1||army.filter(p=>p.type==='r').length!==2||[before,after].some(f=>f.split(' ')[2]!=='-'||f.split(' ')[3]!=='-')){status='not-rook-ending-profile';return done();}
    if(m.piece!=='r'||m.captured||m.from!==r.square||!checked||rank(m.to,actor)!==4||rank(p.square,actor)!==7||['a','h'].includes(p.square[0])||m.to[0]!==p.square[0]||k.square[0]!==p.square[0]||enemy.square[0]!==p.square[0]||Math.abs(+k.square[1]-+m.to[1])!==1||!((+enemy.square[1]<+m.to[1]&&+m.to[1]<+k.square[1])||(+k.square[1]<+m.to[1]&&+m.to[1]<+enemy.square[1]))){status='not-completed-bridge';return done();}
    const low=Math.min(+enemy.square[1],+k.square[1]),high=Math.max(+enemy.square[1],+k.square[1]),ray=Array.from({length:high-low-1},(_,i)=>p.square[0]+(low+i+1));
    const initial=lucena(h,actor,p.square,r.square),query=promotionQuery(c,actor,p.square,H,{tick},baseline);
    witness={experiment:'E135',before,after,actor,history:h?{fen:h.start,moves:h.moves}:null,played:uci(m),san:m.san,pawn:p.square,rook:r.square,king:k.square,enemyRook:enemy.square,ray,initial,query};
    if(!query.tree.win){status='no-promotion-policy';return done();}tick();
    const e=(id,text)=>({id,text,qualityClaim:false,evidence:{experiment:'E135',before,after,detail:{source:'rookBridgeAnalysis.witness'}}});
    const added=[e('completed-rook-bridge',`Rook bridge: ${m.san} shields the king and guarantees a surviving queen promotion within ${H} plies, with at least eight material points gained.`)];
    if(initial)added.push(e('recorded-lucena-bridge',`Recorded Lucena bridge: ${m.san} completes the king's shield and guarantees a surviving queen promotion within ${H} plies.`));
    if(added.some(e=>e.text.split(/\s+/).length>24))throw Error('Comment exceeds24words');events=[...events,...added];status='proven';
  }catch(e){if(e.message!=='rook-bridge-budget')throw e;witness=null;events=base.events;status='exhausted';}
  return done();
}
