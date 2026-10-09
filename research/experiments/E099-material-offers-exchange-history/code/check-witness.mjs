import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
const value={p:1,n:3,b:3,r:5,q:9,k:0},points=(c,a)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+value[p.type]*(p.color===a?1:-1),0);
const rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
const victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
function proof(c,m,p){
 assert.ok(p);assert.deepEqual(p.materialValues,value);assert.equal(p.horizonPliesAfterCapture,1);const initial=points(c,m.color);c.move(m);
 try{assert.ok(!c.isGameOver());const replies=c.moves({verbose:true});assert.deepEqual(p.witnesses.map(w=>w.reply),replies.map(uci));let minimum=points(c,m.color)-initial,maximum=minimum;
  for(let i=0;i<replies.length;i++){c.move(replies[i]);try{assert.ok(!c.isGameOver());const gain=points(c,m.color)-initial;assert.equal(p.witnesses[i].gain,gain);assert.ok(gain>0);minimum=Math.min(minimum,gain);maximum=Math.max(maximum,gain);}finally{c.undo();}}
  assert.equal(p.minimumGain,minimum);return{minimum,maximum};
 }finally{c.undo();}
}
function checkOffers(c,played,o){
 assert.equal(o.root,c.fen());const captures=c.moves({verbose:true}).filter(m=>m.captured&&victim(m)===played.to);assert.deepEqual(o.captures,captures.map(rec));
 if(played.piece==='k'||played.promotion){assert.deepEqual(o.rows,[]);return;}
 assert.deepEqual(o.rows.map(r=>r.capture),captures.map(rec));
 for(const [i,row] of o.rows.entries()){const m=captures[i];c.move(m);assert.equal(row.after,c.fen());assert.equal(row.terminal,c.isGameOver());c.undo();assert.equal(row.offset,played.captured?-value[played.captured]:0);
  if(row.proof){const p=proof(c,m,row.proof);assert.equal(row.minimum,p.minimum+row.offset);assert.equal(row.maximum,p.maximum+row.offset);assert.equal(row.positive,row.minimum>0);}else{assert.equal(row.minimum,null);assert.equal(row.maximum,null);assert.equal(row.positive,false);}
 }
}
export function checkWitness(w,r,f){
 assert.equal(w.experiment,'E099');assert.equal(w.before,f.fen);assert.deepEqual(w.history,f.history||null);const c=legalPosition(w.history?.fen||w.before),records=[];
 for(const code of w.history?.moves||[]){const before=c.fen(),m=c.move(code);records.push({before,after:c.fen(),move:m});}
 assert.equal(c.fen(),w.before);assert.equal(w.actor,c.turn());assert.equal(w.baseline,points(c,w.actor));const m=c.move(f.move);assert.deepEqual(w.played,rec(m));assert.equal(c.fen(),w.after);assert.equal(r.after,w.after);checkOffers(c,m,w.current);
 const ids=[];if(w.current.rows.some(x=>x.positive))ids.push('certified-unrecovered-offer');if(m.piece==='r'&&m.captured==='p'&&ids.length)ids.push('certified-rook-for-pawn-offer');
 const last=records.at(-1),prior=records.at(-2);
 if(w.pawnPair){assert.ok(prior&&last);assert.equal(prior.move.color,w.actor);assert.equal(prior.move.captured,'p');assert.equal(prior.move.piece,'b');assert.equal(prior.move.to,m.from);assert.equal(m.piece,'b');assert.equal(m.captured,'p');assert.deepEqual(w.pawnPair.first,rec(prior.move));assert.deepEqual(w.pawnPair.intervening,rec(last.move));assert.equal(w.pawnPair.baselineFen,prior.before);assert.equal(w.pawnPair.totalPawns,2);const offset=w.baseline-points(legalPosition(prior.before),w.actor);assert.equal(w.pawnPair.pairOffset,offset);assert.equal(w.pawnPair.minimumLoss,w.current.rows.find(x=>x.positive).minimum-offset);assert.ok(w.pawnPair.minimumLoss>0);ids.push('certified-bishop-for-two-pawns-offer');}
 if(w.incoming){assert.ok(last);const b=legalPosition(w.history.fen);for(const code of w.history.moves)b.move(code);assert.deepEqual(w.incoming.played,rec(last.move));assert.equal(w.incoming.before,last.before);checkOffers(b,last.move,w.incoming.offers);assert.deepEqual(w.incoming.selected,w.incoming.offers.rows.find(x=>x.positive));assert.ok(w.incoming.selected.positive);assert.ok(ids.includes('certified-unrecovered-offer'));ids.push('certified-counter-offer');}
 if(w.returned){assert.ok(prior?.move.captured);const t=w.returned;assert.deepEqual(t.capture,rec(prior.move));assert.equal(t.baselineFen,prior.before);assert.equal(t.gain,w.baseline-points(legalPosition(prior.before),w.actor));assert.ok(t.gain>0);assert.deepEqual(t.acceptance,w.current.rows.find(x=>x.positive&&x.maximum<=t.gain));assert.equal(t.maximumReturned,t.acceptance.maximum);assert.ok(t.maximumReturned<=t.gain);ids.push('certified-return-of-recorded-gain');if(m.piece==='r'&&['b','n'].includes(t.acceptance.capture.piece)&&t.acceptance.minimum===2&&t.acceptance.maximum===2)ids.push('certified-give-back-exchange');}
 if(w.exchange){assert.ok(last);const e=w.exchange;assert.equal(last.move.piece,'r');assert.ok(['b','n'].includes(last.move.captured));assert.equal(victim(m),last.move.to);assert.equal(m.captured,'r');assert.deepEqual(e.previous,rec(last.move));assert.equal(e.baselineFen,last.before);c.undo();const p=proof(c,m,e.proof);c.move(f.move);assert.equal(e.offset,w.baseline-points(legalPosition(last.before),w.actor));assert.equal(e.minimumGain,p.minimum+e.offset);assert.ok(e.minimumGain>=2);ids.push('recorded-winning-exchange');}
 if(w.mass){const all=[...records,{before:w.before,after:w.after,move:m}],suffix=[];for(let i=all.length-1;i>=0&&all[i].move.captured;i--)suffix.unshift(all[i]);assert.ok(suffix.length>=4);assert.deepEqual(w.mass.records,suffix.map(x=>({before:x.before,after:x.after,move:rec(x.move),actorBalance:points(legalPosition(x.after),w.actor)})));const pairs=[];for(let i=1;i<suffix.length;i++){const a=suffix[i-1].move,b=suffix[i].move;if(b.color!==a.color&&victim(b)===a.to&&b.captured===(a.promotion||a.piece))pairs.push({index:i,first:rec(a),second:rec(b),square:a.to});}assert.deepEqual(w.mass.pairs,pairs);assert.ok(new Set(pairs.map(x=>x.square)).size>=2);ids.push('recorded-mass-exchange-sequence');}
 const events=r.events.filter(e=>e.evidence?.experiment==='E099');assert.deepEqual(events.map(e=>e.id),ids);for(const e of events){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
}
