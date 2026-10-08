import {Chess} from '../../chess.js';
import {uci, VALUES} from './E020-concepts.mjs';
import {explainMove as parent, priority as prior} from './E051-interference.mjs';

const names = {n:'knight', b:'bishop', r:'rook', q:'queen'};
const ordered = moves => moves.sort((a,b) => uci(a).localeCompare(uci(b)));
const record = m => ({move:uci(m), san:m.san, from:m.from, to:m.to, piece:m.piece,
 color:m.color, captured:m.captured||null, promotion:m.promotion||null, before:m.before, after:m.after});
const balance = (c,color) => c.board().flat().filter(Boolean).reduce((n,p) => n+(p.color===color?1:-1)*VALUES[p.type],0);
export const desperadoIds = new Set(['desperado-capture']);
export const priority = e => desperadoIds.has(e.id)?157.5:prior(e);

// A quiet king castle can move the threatened rook without moving from its square.
function relocated(unit, move) {
 if(move.from===unit.square) return {...unit,square:move.to};
 if(unit.type==='r' && move.piece==='k' && (move.flags.includes('k')||move.flags.includes('q'))) {
  const rank=move.from[1], kingside=move.flags.includes('k');
  if(unit.square===(kingside?'h':'a')+rank) return {...unit,square:(kingside?'f':'d')+rank};
 }
 return {...unit};
}

export function explainMove(input) {
 const enabled=input.desperadoTags??false, limit=input.maxDesperadoNodes??50000;
 if(typeof enabled!=='boolean') throw Error('desperadoTags must be boolean');
 if(!Number.isInteger(limit)||limit<0||limit>50000) throw Error('maxDesperadoNodes must be an integer from 0 to 50000');
 const base=parent(input);
 if(!enabled) return base;
 const before=new Chess(input.history?.fen||input.fen), c=new Chess(input.history?.fen||input.fen);
 if(input.history) for(const move of input.history.moves){before.move(move);c.move(move);}
 const played=c.move(input.move), color=played.color, enemy=c.turn(), initialBalance=balance(before,color);
 const unit={square:played.from,type:played.piece,color}, cost=VALUES[unit.type], capturedValue=VALUES[played.captured]||0;
 const initialAttackers=before.attackers(unit.square,enemy).sort(), extra=[];
 let nodes=0,status='complete';
 const tick=()=>{if(++nodes>limit) throw Error('desperado-budget');};
 try {
  tick();
  if(names[unit.type]&&initialAttackers.length&&capturedValue>0&&capturedValue<=cost&&!c.isGameOver()) {
   const legal=ordered(before.moves({verbose:true})), captures=legal.filter(m=>m.from===unit.square&&m.captured);
   const maximumCaptureValue=Math.max(...captures.map(m=>VALUES[m.captured]));
   const alternatives=legal.filter(m=>!m.captured), quietBranches=[];
   let valid=capturedValue===maximumCaptureValue&&alternatives.length>0;
   for(const alternative of valid?alternatives:[]) {
    tick();before.move(uci(alternative));
    try {
     const tracked=relocated(unit,alternative);
     if(before.isGameOver()||before.get(tracked.square)?.type!==unit.type||before.get(tracked.square)?.color!==color){valid=false;break;}
     let witness=null;
     for(const capture of ordered(before.moves({verbose:true}).filter(m=>m.to===tracked.square&&m.captured===unit.type))) {
      tick();before.move(uci(capture));
      try {
       let greatestGain=balance(before,color)-initialBalance;
       if(greatestGain>-cost||before.isDraw()) continue;
       const terminal=before.isCheckmate()?'mate':'live', responses=[];
       let loses=true;
       for(const response of ordered(before.moves({verbose:true}))) {
        tick();before.move(uci(response));
        try {
         const gain=balance(before,color)-initialBalance;
         responses.push({...record(response),gain});greatestGain=Math.max(greatestGain,gain);
         if(before.isGameOver()||gain>-cost){loses=false;break;}
        } finally {before.undo();}
       }
       if(loses){witness={alternative:record(alternative),unit:tracked,capture:record(capture),terminal,responses,greatestGain};break;}
      } finally {before.undo();}
     }
     if(!witness){valid=false;break;}quietBranches.push(witness);
    } finally {before.undo();}
   }
   const acceptances=[];
   if(valid) {
    const recaptures=ordered(c.moves({verbose:true}).filter(m=>m.to===played.to&&m.captured===unit.type));
    if(!recaptures.length) valid=false;
    for(const capture of recaptures) {
     tick();c.move(uci(capture));
     try {
      let minimumGain=balance(c,color)-initialBalance;
      if(c.isGameOver()||minimumGain!==capturedValue-cost){valid=false;break;}
      const acceptedGain=minimumGain,responses=[];
      for(const response of ordered(c.moves({verbose:true}))) {
       tick();c.move(uci(response));
       try {
        const gain=balance(c,color)-initialBalance;
        responses.push({...record(response),gain});minimumGain=Math.min(minimumGain,gain);
        if(c.isGameOver()||gain<capturedValue-cost){valid=false;break;}
       } finally {c.undo();}
      }
      if(!valid) break;
      acceptances.push({capture:record(capture),acceptedGain,responses,minimumGain});
     } finally {c.undo();}
    }
   }
   if(valid) extra.push({id:'desperado-capture',qualityClaim:false,
    text:`Desperado ${names[unit.type]}: captures ${capturedValue} points before recapture; every quiet alternative loses at least ${cost}.`,
    evidence:{before:before.fen(),after:c.fen(),played:record(played),color,unit,initialAttackers,initialBalance,cost,capturedValue,
     maximumCaptureValue,unitCaptures:captures.map(m=>({move:uci(m),value:VALUES[m.captured]})),horizonPlies:3,
     quietBranches,acceptances,minimumGain:Math.min(...acceptances.map(b=>b.minimumGain))}});
  }
 } catch(error) {if(error.message!=='desperado-budget') throw error;extra.length=0;status='exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;
 if(comment&&comment.split(/\s+/).length>24) throw Error('Comment exceeds 24 words');
 return {...base,schema:'coach-concepts-v33',events,comment,desperadoAnalysis:{limit,nodes,status}};
}
