// No E187 runtime, context, derivation or collector imports.
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {verifyPanel} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
import {plain} from '../../E183-recorded-initiative-turnover/code/plain.mjs';
import {isDeepStrictEqual} from 'node:util';
const checkedSources=[];
function source(input,H,panel){
 const key=[input.fen,input.history,H,panel],previous=checkedSources.find(x=>isDeepStrictEqual(x.key,key));
 if(previous)return previous;
 const r=verifyPanel({...input,forcingTempoPlies:H},panel),entry={key:structuredClone(key),nodes:r.nodes,claimContext:r.claimContext};checkedSources.push(entry);return entry;
}
const code=m=>m.from+m.to+(m.promotion||'');
export function checkResult(input,options,panel,result){
 plain([input,options,panel,result]);
 const enabled=options.enabled===undefined?false:options.enabled,family=options.family===undefined?'tempo':options.family,H=options.plies===undefined?(family==='tempo'?2:3):options.plies,limit=options.maxNodes===undefined?50000:options.maxNodes;
 assert.ok(typeof enabled==='boolean'&&['tempo','exposure'].includes(family)&&Number.isSafeInteger(H)&&H>=0&&H<=3&&Number.isSafeInteger(limit)&&limit>=0&&limit<=50000);assert.ok(Object.keys(options).every(k=>['enabled','family','plies','maxNodes'].includes(k)));
 const e={schema:'E187-paired-choice-v1',family,plies:H,limit,nodes:0,status:'disabled',ids:[],qualityClaim:false,witness:null,panel:null},done=()=>{assert.deepEqual(result,e);return true;};
 if(!enabled)return done();
 assert.match(input.move,/^[a-h][1-8][a-h][1-8][qrbn]?$/);if(input.alternative!==undefined)assert.match(input.alternative,/^[a-h][1-8][a-h][1-8][qrbn]?$/);
 const h=input.history;let c=legalPosition(h?.fen||input.fen);
 if(h!==undefined){assert.ok(h&&typeof h.fen==='string'&&Array.isArray(h.moves)&&h.moves.length<=1000);for(const m of h.moves){assert.match(m,/^[a-h][1-8][a-h][1-8][qrbn]?$/);assert.equal(c.isGameOver(),false);c.move(m);}assert.equal(c.fen(),legalPosition(input.fen).fen());}
 if(c.isGameOver()){e.status='not-live';return done();}
 const legal=c.moves({verbose:true});assert.ok(legal.some(m=>code(m)===input.move));if(input.alternative!==undefined){assert.notEqual(input.alternative,input.move);assert.ok(legal.some(m=>code(m)===input.alternative));}
 if(h===undefined){e.status='history-prerequisite';return done();}if(input.alternative===undefined){e.status='alternative-prerequisite';return done();}
 const setup=4+h.moves.length;
 if(setup>limit||panel&&panel.nodes+setup>limit){e.nodes=limit+1;e.status='exhausted';return done();}
 if(panel===undefined){e.nodes=setup;e.status='panel-prerequisite';return done();}
 assert.ok(Number.isSafeInteger(panel.nodes)&&panel.nodes>=0);const checked=source(input,H,panel);e.nodes=setup+checked.nodes;e.panel=structuredClone(panel);
 if(checked.claimContext){e.status='claim-rule-prerequisite';return done();}
 const a=panel.rows.find(r=>r.move===input.move),b=panel.rows.find(r=>r.move===input.alternative);assert.ok(a&&b);e.status='compared';e.witness={actor:c.turn(),before:c.fen(),actual:a.move,alternative:b.move,after:a.after,alternativeAfter:b.after,values:{actualOwn:a.actor.tree.win,actualEnemy:a.opponent.tree.win,alternativeOwn:b.actor.tree.win,alternativeEnemy:b.opponent.tree.win},role:null};
 if(a.capture||b.capture||a.promotion||b.promotion||a.mate||b.mate||a.from!==b.from||a.piece!==b.piece)return done();
 if(family==='tempo'){
  let g,l,id;if(a.check&&!b.check){g=a;l=b;id='C0758';}else if(!a.check&&b.check){g=b;l=a;id='C0759';}else return done();
  if(!g.actor.tree.win||g.opponent.tree.win||l.actor.tree.win||!l.opponent.tree.win)return done();
  const t=g.actor.tree;if(t.kind!=='all'||!t.branches.length||t.branches.some(k=>k.child.kind!=='choice'||k.child.child.kind!=='mate'||k.child.child.win!==true))return done();
  // Explicit full legal reply inventory is independently reconstructed here.
  const gc=new Chess(h.fen);for(const m of h.moves)gc.move(m);gc.move(g.move);assert.deepEqual(t.branches.map(k=>k.move).sort(),gc.moves({verbose:true}).map(code).sort());
  e.witness.role={checking:g.move,quiet:l.move,defenses:t.branches.map(k=>({reply:k.move,mating:k.child.move,mateFen:k.child.child.fen}))};e.ids=[id];
 }else{
  const army=c.board().flat().filter(Boolean);if(a.piece!=='k'||a.check||b.check||army.some(p=>!['k','q','p'].includes(p.type))||['w','b'].some(color=>!army.some(p=>p.type==='q'&&p.color===color)))return done();
  if(a.opponent.tree.win!==true||b.opponent.tree.win!==false)return done();const t=a.opponent.tree;if(t.kind!=='choice')return done();c.move(a.move);const q=c.moves({verbose:true}).find(m=>code(m)===t.move);if(!q||q.piece!=='q')return done();const enemy=c.turn();c.move(t.move);const king=c.board().flat().find(p=>p?.type==='k'&&p.color===panel.actor);if(!c.isCheck()||!c.attackers(king.square,enemy).includes(q.to))return done();
  e.witness.role={queenFrom:q.from,queenTo:q.to,checking:t.move,king:king.square,matingPolicy:true};e.ids=['C0724'];
 }
 e.status='proven';return done();
}
