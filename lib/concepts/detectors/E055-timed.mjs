import {Chess} from '../../chess.js';
import {explainMove as parent,priority as prior} from './E054-named.mjs';
const uci=m=>m.from+m.to+(m.promotion||'');
const victimSquare=m=>m.flags.includes('e')?m.to[0]+(m.color==='w'?'5':'4'):m.to;
const record=(c,m)=>{const before=c.fen();const played=c.move(uci(m));return{move:uci(played),san:played.san,from:played.from,to:played.to,piece:played.piece,color:played.color,captured:played.captured||null,promotion:played.promotion||null,before,after:c.fen()};};
export const priority=e=>e.id==='intermediate-sacrifice'?162:prior(e);
export function explainMove(input){
 const enabled=input.intermediateSacrificeTags??false,limit=input.maxIntermediateSacrificeNodes??50000;
 if(typeof enabled!=='boolean')throw Error('intermediateSacrificeTags must be boolean');
 if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxIntermediateSacrificeNodes must be an integer from 0 to 50000');
 const base=parent(input);if(!enabled)return base;
 let nodes=0,status='complete',reason='no-mating-offer';const extra=[];
 const tick=()=>{if(++nodes>limit)throw Error('intermediate-sacrifice-budget');};
 try{
  tick();const offer=base.events.find(e=>e.id==='mating-sacrifice');
  if(offer){
   reason='history-required';
   if(input.history?.moves.length){
    const c=new Chess(input.history.fen);let last,lastRaw;
    for(const move of input.history.moves){tick();lastRaw=c.moves({verbose:true}).find(m=>uci(m)===move);last=record(c,lastRaw);}
    if(c.fen()!==new Chess(input.fen).fen())throw Error('History mismatch');
    const color=c.turn();reason='no-capture';
    if(last.captured&&last.color!==color){
     const capturer=c.get(last.to),square=victimSquare(lastRaw),victim=new Chess(last.before).get(square);
     if(!victim||victim.color!==color||victim.type==='k'||!capturer||capturer.color!==last.color||capturer.type!==(last.promotion||last.piece))throw Error('Invalid last capture');
     const original=c.moves({verbose:true}),recaptures=[];let mates=false;
     for(const m of original){tick();const r=record(new Chess(c.fen()),m);if(r.san.includes('#'))mates=true;
      if(m.captured&&victimSquare(m)===last.to)recaptures.push(r);
     }
     reason='no-recapture';
     if(recaptures.length){
      const actual=original.find(m=>uci(m)===offer.evidence.played);reason='direct-recapture';
      if(!(actual.captured&&victimSquare(actual)===last.to)){
       reason='mate-one-available';
       if(!mates){
        const played=record(new Chess(c.fen()),actual);reason='proven';
        extra.push({id:'intermediate-sacrifice',qualityClaim:false,text:`Intermediate sacrifice: ${played.san} skips an available recapture on ${last.to} and forces mate within ${offer.evidence.mateIn} moves.`,
         evidence:{parentEvent:'mating-sacrifice',beforeFen:c.fen(),afterFen:base.after,played,color,lastCapture:last,victim:{square,...victim},capturer:{square:last.to,...capturer},recaptures,originalMoves:original.map(uci).sort(),nominalCost:offer.evidence.nominalLoss,mateIn:offer.evidence.mateIn,historyPlies:input.history.moves.length}});
       }
      }
     }
    }
   }
  }
 }catch(error){if(error.message!=='intermediate-sacrifice-budget')throw error;extra.length=0;status='exhausted';reason='budget-exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;
 if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v36',events,comment,intermediateSacrificeAnalysis:{limit,nodes,status,reason}};
}
