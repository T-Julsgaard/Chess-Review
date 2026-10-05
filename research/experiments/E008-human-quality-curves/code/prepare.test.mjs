import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
import {selection,queryKey,outcomePlies} from './queries.mjs';
import {prepare} from './prepare.mjs';

// Entirely authored legal history and fabricated engine output; no player evidence.
const board=new Chess();for(const san of ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Nb8','d4','Nbd7'])board.move(san);
const moves=board.history({verbose:true}).map(m=>m.from+m.to+(m.promotion||''));
const games=Array.from({length:600},(_,i)=>({id:'Synthetic'+i,split:i<450?'train':'validation',moves,result:'1-0',players:[{color:'w',rating:1500},{color:'b',rating:1500}]}));
const config={majorVersion:19,budget:{kind:'nodes',value:20000}},configHash=sha256(JSON.stringify(config)),cache=new Map();
function search(history,restricted=null){
  const key=queryKey(configHash,history,restricted);if(cache.has(key))return key;
  const board=new Chess();for(const move of history)board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
  const m=board.moves({verbose:true})[0],bestmove=restricted||m.from+m.to+(m.promotion||'');
  const rawInfo='info depth 10 score cp 20 wdl 100 850 50 nodes 20000 pv '+bestmove;
  cache.set(key,{key,history,restricted,bestmove,pv:bestmove,score:{cp:20,wdl:[100,850,50]},depth:10,nodes:20000,elapsedMs:1,rawInfo,finalSearchInfo:rawInfo,finalNodes:20000});return key;
}
const positions=selection(games).map(p=>({...p,rootKey:search(p.history),outcomes:p.outcomePlies.map(ply=>({ply,key:search(moves.slice(0,ply-1))})),alternatives:p.legalMoves.map(move=>({move,key:search(p.history,move)}))}));
const evidence={schema:'E008-engine-observations-v1',complete:true,smoke:false,engineConfig:config,configHash,protocol:{outcomePlies,choiceSeed:'E008-choice-v1:',choicesPerGame:1},games,positions,searches:[...cache.values()]};
test('complete legal evidence binds roles, alternatives, roots, score and game weights',()=>{
  const p=prepare(evidence,games,config);assert.equal(p.choices.length,600);assert.equal(p.outcomes.length,1200);
  const sums=new Map();for(const row of p.outcomes)sums.set(row.gameId,(sums.get(row.gameId)||0)+row.weight);assert.ok([...sums.values()].every(x=>x===1));
  assert.deepEqual(p.outcomes.slice(0,2).map(r=>r.target),[0,1]);
  const incomplete=structuredClone(evidence);incomplete.positions[0].alternatives.pop();assert.throws(()=>prepare(incomplete,games,config),/incomplete alternatives/);
  const reserved=structuredClone(evidence);reserved.games[0].split='test';assert.throws(()=>prepare(reserved,games,config),/reserved game cohort/);
  const wrong=structuredClone(evidence);wrong.searches[0].pv='e1e8';assert.throws(()=>prepare(wrong,games,config),/binding|diagnostics/);
  const bound=structuredClone(evidence);bound.searches[0].rawInfo+=' lowerbound';assert.throws(()=>prepare(bound,games,config),/exact/);
});
