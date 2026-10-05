import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
import {selection,queryKey} from '../../E008-human-quality-curves/code/queries.mjs';
import {selectGames} from './method.mjs';
import {evaluate} from './evaluate.mjs';
// Authored legal history/fabricated searches, independent of player data.
const board=new Chess();for(const san of ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Nb8','d4','Nbd7'])board.move(san);
const moves=board.history({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')),all=Array.from({length:600},(_,i)=>({id:'synthetic-'+i,split:i<450?'train':'validation',moves,players:[{color:'w',rating:1500},{color:'b',rating:1500}]}));
const lowConfig={majorVersion:19,budget:{kind:'nodes',value:20000}},config={majorVersion:19,budget:{kind:'nodes',value:80000}},baseHash=sha256(JSON.stringify(lowConfig)),configHash=sha256(JSON.stringify(config)),low=new Map(),high=new Map();
function query(cache,hash,history,restricted=null,nodes=20000){
  const key=queryKey(hash,history,restricted);if(cache.has(key))return key;
  const board=new Chess();for(const move of history)board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
  const m=board.moves({verbose:true})[0],bestmove=restricted||m.from+m.to+(m.promotion||''),rawInfo='info depth 10 score cp 20 wdl 100 850 50 nodes '+nodes+' pv '+bestmove;
  cache.set(key,{key,history,restricted,bestmove,pv:bestmove,score:{cp:20,wdl:[100,850,50]},depth:10,nodes,elapsedMs:1,rawInfo,finalSearchInfo:rawInfo,finalNodes:nodes});return key;
}
const games=selectGames(all),basePositions=selection(games).map(p=>({...p,rootKey:query(low,baseHash,p.history),alternatives:p.legalMoves.map(move=>({move,key:query(low,baseHash,p.history,move)}))})),
  baseline={games:all,configHash:baseHash,positions:basePositions,searches:[...low.values()]},positions=basePositions.map(p=>({gameId:p.gameId,split:p.split,ply:p.ply,history:p.history,color:p.color,played:p.played,legalMoves:p.legalMoves,
    baselineRootKey:p.rootKey,rootKey:query(high,configHash,p.history,null,80000),alternatives:p.alternatives.map(a=>({move:a.move,baselineKey:a.key,key:query(high,configHash,p.history,a.move,80000)}))})),
  evidence={schema:'E009-search-observations-v1',complete:true,engineConfig:config,configHash,baselineConfigHash:baseHash,games,positions,searches:[...high.values()]};
test('fixed45-game assessment reconstructs legal choices and rejects evidence swaps',()=>{
  const report=evaluate(evidence,baseline,config);assert.equal(report.records.length,45);assert.equal(report.summary.passed,true);assert.equal(report.summary.quality.maximum,0);
  const missing=structuredClone(evidence);missing.positions[0].alternatives.pop();assert.throws(()=>evaluate(missing,baseline,config),/alternatives/);
  const changed=structuredClone(evidence);changed.positions[0].alternatives[0].baselineKey='a'.repeat(64);assert.throws(()=>evaluate(changed,baseline,config),/alternatives/);
  const invalid=structuredClone(evidence);invalid.searches[0].score.cp=21;assert.throws(()=>evaluate(invalid,baseline,config),/score/);
  const reserved=structuredClone(evidence);reserved.games[0].split='test';assert.throws(()=>evaluate(reserved,baseline,config),/cohort/);
});
