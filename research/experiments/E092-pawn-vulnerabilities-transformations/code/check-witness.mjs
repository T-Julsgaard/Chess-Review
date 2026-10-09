import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {pawnFeatures} from '../../E021-structural-concepts/code/features.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {checkWitness as checkRouteWitness} from '../../E089-causal-pawn-breakthrough/code/check-witness.mjs';
import {replay as replayWedge} from '../../FRIEND-03-pawn-wedge/code/replay.mjs';
const values={p:1,n:3,b:3,r:5,q:9,k:0},men=c=>c.board().flat().filter(Boolean);
const points=(c,color)=>men(c).reduce((n,p)=>n+values[p.type]*(p.color===color?1:-1),0);
const rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null});
const victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
function withMove(c,m,fn){c.move(m);try{return fn();}finally{c.undo();}}
function proof(c,m){const color=m.color,start=points(c,color);return withMove(c,uci(m),()=>{
 if(c.isDraw())return null;const replies=c.moves({verbose:true}),witnesses=[];let minimum=points(c,color)-start;
 for(const reply of replies){const gain=withMove(c,uci(reply),()=>c.isCheckmate()||c.isDraw()?-Infinity:points(c,color)-start);if(gain<=0)return null;minimum=Math.min(minimum,gain);witnesses.push({reply:uci(reply),gain});}
 return minimum>0?{horizonPliesAfterCapture:1,materialValues:values,minimumGain:minimum,witnesses}:null;
 });}
function checkTargets(c,color,s){const b=turnBoard(c,color);assert.equal(s.fen,b.fen());assert.deepEqual(s.features,pawnFeatures(c,color));const captures=b.moves({verbose:true}).filter(m=>m.captured==='p');assert.deepEqual(s.captures.map(x=>x.move),captures.map(rec));
 for(let i=0;i<captures.length;i++){assert.equal(s.captures[i].pawn,victim(captures[i]));assert.deepEqual(s.captures[i].proof,proof(b,captures[i]));}}
function checkBackward(c,color,s){const b=turnBoard(c,color),pawns=men(b).filter(p=>p.type==='p'&&p.color===color),relative=q=>color==='w'?+q[1]:9-+q[1],moves=b.moves({verbose:true}),eligible=[];
 for(const p of pawns){const neighbors=pawns.filter(q=>Math.abs(q.square.charCodeAt(0)-p.square.charCodeAt(0))===1),advances=moves.filter(m=>m.from===p.square);
 if(neighbors.length&&neighbors.every(q=>relative(q.square)>relative(p.square))&&advances.length&&advances.every(m=>!m.captured&&!m.promotion))eligible.push({p,neighbors,advances});}
 assert.equal(s.fen,b.fen());assert.deepEqual(s.rows.map(r=>r.pawn),eligible.map(x=>x.p.square));for(let i=0;i<eligible.length;i++){const e=eligible[i],row=s.rows[i];assert.deepEqual(row.neighbors,e.neighbors.map(p=>p.square));assert.deepEqual(row.advances.map(a=>a.move),e.advances.map(rec));for(let j=0;j<e.advances.length;j++)withMove(b,uci(e.advances[j]),()=>{
 const losses=b.moves({verbose:true}).filter(m=>m.captured==='p'&&victim(m)===e.advances[j].to).map(m=>({move:rec(m),proof:proof(b,m)})).filter(l=>l.proof);assert.deepEqual(row.advances[j].losses,losses);
 });assert.equal(row.weak,row.advances.every(a=>a.losses.length>0));}}
const shape=s=>({isolated:s.features.isolated.length,doubled:s.features.doubled.length,islands:s.features.islands.length,passed:s.features.passed.length});
export function checkWitness(w,result,fixture){
 const c=legalPosition(w.history?.fen||w.before);for(const m of w.history?.moves||[])c.move(m);assert.equal(c.fen(),w.before);const actor=w.actor,enemy=actor==='w'?'b':'w';assert.equal(c.turn(),actor);checkTargets(c,actor,w.old.own);checkTargets(c,enemy,w.old.enemy);checkBackward(c,enemy,w.oldBackward);
 const played=c.move(w.played.uci);assert.deepEqual(rec(played),w.played);assert.equal(c.fen(),w.after);checkTargets(c,actor,w.fresh.own);checkTargets(c,enemy,w.fresh.enemy);checkBackward(c,enemy,w.newBackward);
 for(const repeated of w.repeated){assert.ok(w.history?.moves.length>=2);const prior=legalPosition(w.history.fen);for(const m of w.history.moves.slice(0,-2))prior.move(m);assert.equal(prior.fen(),repeated.earlier.before);const earlier=prior.move(w.history.moves.at(-2));assert.equal(uci(earlier),repeated.earlier.move);assert.equal(prior.fen(),repeated.earlier.after);assert.equal(earlier.to,played.from);assert.equal(earlier.piece,played.piece);const target=repeated.earlier.target;
 const capture=turnBoard(prior,actor).moves({verbose:true}).find(m=>uci(m)===target.move.uci);assert.ok(capture&&capture.from===earlier.to&&victim(capture)===repeated.pawn);assert.deepEqual(proof(turnBoard(prior,actor),capture),target.proof);assert.ok(target.proof);const reply=prior.move(w.history.moves.at(-1));assert.ok(reply.from!==repeated.pawn);assert.equal(prior.get(repeated.pawn)?.color,enemy);assert.equal(c.get(repeated.pawn)?.type,'p');assert.ok(w.fresh.own.captures.some(x=>x.pawn===repeated.pawn&&x.move.from===played.to&&x.proof));}
 if(w.route){const r=w.route;assert.equal(r.ownCount,w.fresh.own.features.passed.length);assert.equal(r.enemyCount,w.fresh.enemy.features.passed.length);assert.equal(r.newPassed,!w.old.own.features.passed.includes(played.from));assert.deepEqual(r.undoubled,w.old.own.features.doubled.filter(f=>!w.fresh.own.features.doubled.includes(f)));assert.deepEqual(r.majority,w.old.own.features.majorities.find(m=>m.files.includes(played.from[0])));assert.equal(r.depth,result.structureAnalysis.depth);assert.equal(r.afterProof.depth,r.depth);
 const inventory=board=>men(board).map(({square,type,color})=>({square,type,color})),prior=legalPosition(w.before),beforePieces=inventory(prior),afterPieces=inventory(c);
 checkRouteWitness({history:w.history,before:w.before,after:w.after,actor,played:w.played,afterProof:r.afterProof,beforeProof:r.beforeProof,beforePieces,afterPieces,purePawnEnding:[...beforePieces,...afterPieces].every(p=>'kp'.includes(p.type)),pawnCounts:{own:beforePieces.filter(p=>p.type==='p'&&p.color===actor).length,enemy:beforePieces.filter(p=>p.type==='p'&&p.color!==actor).length},breakthrough:false,reusedRouteEvent:null},result);
 }
 for(const e of result.events.filter(e=>e.evidence?.experiment==='E092')){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);const d=e.evidence.detail;
 if(e.id==='certified-backward-pawn')assert.ok(d.pawns.length&&d.pawns.every(p=>p.weak&&!w.oldBackward.rows.some(o=>o.pawn===p.pawn&&o.weak)));
 if(e.id==='certified-pawn-target-selection')assert.ok(d.selected.length&&d.selected.every(x=>x.proof&&w.fresh.own.captures.some(o=>o.move.uci===x.move.uci)));
 if(e.id==='repeated-certified-pawn-target')assert.deepEqual(d.contacts,w.repeated);
 if(e.id==='legal-pawn-structure-imbalance'){assert.deepEqual(d.shapes,{own:shape(w.fresh.own),enemy:shape(w.fresh.enemy)});assert.notDeepEqual(d.shapes.own,d.shapes.enemy);assert.notDeepEqual(d.shapes,{own:shape(w.old.own),enemy:shape(w.old.enemy)});const targets=s=>[...new Set(s.captures.filter(x=>x.proof).map(x=>x.pawn))].sort();assert.deepEqual(d.vulnerable,{own:targets(w.fresh.enemy),enemy:targets(w.fresh.own)});assert.notEqual(d.vulnerable.own.length,d.vulnerable.enemy.length);}
 if(e.id==='certified-passed-pawn-imbalance')assert.ok(w.route.ownCount>w.route.enemyCount&&w.route.afterProof.win);
 if(['certified-structural-transformation','majority-to-certified-passer'].includes(e.id)){assert.ok(played.captured==='p'&&w.route.newPassed&&w.route.afterProof.win&&!w.route.beforeProof.win);if(e.id==='certified-structural-transformation')assert.ok(w.route.undoubled.length);else assert.ok(w.route.majority.own>w.route.majority.enemy);}
 }
 if(result.structureAnalysis.wedgeAnalysis&&fixture?.extra?.wedgeTags)replayWedge(fixture,{...result,wedgeAnalysis:result.structureAnalysis.wedgeAnalysis});return true;
}

