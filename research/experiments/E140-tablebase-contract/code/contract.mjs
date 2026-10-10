import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export const categories=['win','loss','draw','cursed-win','blessed-loss','maybe-win','maybe-loss','syzygy-win','syzygy-loss','unknown'];
const reverse={win:'loss',loss:'win',draw:'draw','cursed-win':'blessed-loss','blessed-loss':'cursed-win','maybe-win':'maybe-loss','maybe-loss':'maybe-win','syzygy-win':'syzygy-loss','syzygy-loss':'syzygy-win',unknown:'unknown'};
export function context(c,historyKnown){return {halfmoveClock:Number(c.fen().split(' ')[4]),fiftyEligible:c.isDrawByFiftyMoves(),threefoldEligible:historyKnown?c.isThreefoldRepetition():null,repetitionKnown:historyKnown};}
export function normalizeSynthetic(input,envelope,budget){
 // This tag never authenticates real data. Only fabricated contract data may be inspected here.
 assert.equal(envelope?.kind,'synthetic-contract','Real tablebase data needs registered format admission before inspection');
 assert.equal(envelope.schema,'E140-synthetic-tablebase-v1');assert.equal(envelope.source,'authored mock contract; not a probe');budget.tick();
 const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const m of h?.moves||[]){budget.tick();c.move(m);}assert.equal(envelope.queriedFen,c.fen());assert.ok(c.board().flat().filter(Boolean).length<=7,'At most seven units');assert.equal(c.fen().split(' ')[2],'-','Castling is unsupported');
 assert.equal(typeof envelope.responseText,'string');assert.ok(Buffer.byteLength(envelope.responseText,'utf8')<=1024*1024,'Response byte cap');const raw=JSON.parse(envelope.responseText);assert.ok(raw&&typeof raw==='object'&&!Array.isArray(raw));assert.ok(Array.isArray(raw.moves));
 const inspect=(r,board,zeroing)=>{budget.tick();assert.ok(r&&typeof r==='object'&&!Array.isArray(r));assert.ok(categories.includes(r.category),'Unknown category');for(const k of ['dtz','precise_dtz'])assert.ok(r[k]===null||Number.isSafeInteger(r[k]),'Invalid '+k);for(const k of ['dtm','dtc','dtw'])assert.equal(r[k],null,'Syzygy-only metric contract');
  if(r.precise_dtz!==null)assert.equal(r.precise_dtz,r.dtz,'Precise DTZ differs');if(r.category==='unknown')assert.equal(r.dtz,null);else if(r.dtz!==null){const sign=r.category==='draw'?0:/win$/.test(r.category)?1:-1;assert.equal(Math.sign(r.dtz),sign,'Category/DTZ sign differs');}
  const mechanics={checkmate:board.isCheckmate(),stalemate:board.isStalemate(),insufficientMaterial:board.isInsufficientMaterial()};for(const [k,v]of Object.entries({checkmate:mechanics.checkmate,stalemate:mechanics.stalemate,insufficient_material:mechanics.insufficientMaterial,variant_win:false,variant_loss:false}))assert.equal(r[k],v,'Wrong mechanical '+k);
  if(mechanics.checkmate)assert.equal(r.category,'loss','Mate category differs');else if(mechanics.stalemate||mechanics.insufficientMaterial)assert.equal(r.category,'draw','Mechanical draw category differs');
  if(zeroing!==undefined)assert.equal(r.zeroing,zeroing,'Wrong zeroing flag');const rootSide={category:r.category,dtz:r.dtz,preciseDtz:r.precise_dtz,precision:r.dtz===null?'unavailable':r.precise_dtz===null?'rounding-not-excluded':'reported-exact'};
  return {rootSide,mechanics,ruleContext:context(board,!!h)};
 };
 const root=inspect(raw,c),actor=c.turn(),legal=c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))),seen=new Set();assert.equal(raw.moves.length,legal.length,'Incomplete legal inventory');const rows=[];
 for(const row of raw.moves){budget.tick();assert.equal(typeof row.uci,'string');assert.ok(!seen.has(row.uci),'Duplicate legal move');seen.add(row.uci);const move=legal.find(m=>uci(m)===row.uci);assert.ok(move,'Illegal row move');assert.equal(row.san,move.san,'Wrong SAN');c.move(move);try{const parsed=inspect(row,c,move.piece==='p'||!!move.captured),s=parsed.rootSide;rows.push({uci:row.uci,san:row.san,fen:c.fen(),zeroing:row.zeroing,...parsed,actorSide:{category:reverse[s.category],dtz:s.dtz===null?null:s.dtz===0?0:-s.dtz,preciseDtz:s.preciseDtz===null?null:s.preciseDtz===0?0:-s.preciseDtz,precision:s.precision}});}finally{c.undo();}}
 assert.deepEqual([...seen].sort(),legal.map(uci));return {kind:'synthetic-contract-only',verifiedOutcome:false,fen:c.fen(),actor,history:h?{fen:h.start,moves:h.moves}:null,...root,legal:legal.map(uci),sourceOrder:rows.map(r=>r.uci),rows};
}
