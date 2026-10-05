import test from 'node:test';
import assert from 'node:assert/strict';
import {selection,queryKey,validateSearch} from './queries.mjs';
import {Chess} from '../../../../lib/chess.js';
// Authored mechanics fixture; no human ground-truth labels.
const board=new Chess();for(const san of ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Nb8','d4','Nbd7'])board.move(san);
const game={id:'Synthetic',split:'train',moves:board.history({verbose:true}).map(m=>m.from+m.to+(m.promotion||''))};
test('score-blind choice selection is deterministic, legal and excludes reserved roles',()=>{
  const a=selection([game])[0];assert.deepEqual(a,selection([{...game,result:'changed',players:[{rating:3500}]}])[0]);assert.ok(a.ply>=11&&a.ply<=20);assert.ok(a.legalMoves.includes(a.played));assert.deepEqual(a.history,game.moves.slice(0,a.ply-1));
  assert.throws(()=>selection([{...game,split:'test'}]),/Reserved/);
});
test('cache keys bind full history, build and restricted move',()=>{
  const a='a'.repeat(64),b='b'.repeat(64);assert.notEqual(queryKey(a,[]),queryKey(b,[]));assert.notEqual(queryKey(a,[]),queryKey(a,[],'e2e4'));assert.notEqual(queryKey(a,['e2e4']),queryKey(a,[]));assert.throws(()=>queryKey(a,['e2e4\nquit']),/Invalid/);
});
test('exact score evidence rejects bounds, missing WDL and wrong move binding',()=>{
  const r={restricted:'e2e4',bestmove:'e2e4',pv:'e2e4 e7e5',score:{cp:20,wdl:[100,850,50]},rawInfo:'info depth 10 score cp 20 wdl 100 850 50 nodes 20000 pv e2e4 e7e5',finalSearchInfo:'info depth 11 nodes 20031',nodes:20000,elapsedMs:50};assert.equal(validateSearch(r),true);
  assert.throws(()=>validateSearch({...r,rawInfo:r.rawInfo+' lowerbound'}),/exact/);assert.throws(()=>validateSearch({...r,score:{cp:21,wdl:r.score.wdl}}),/Raw score/);assert.throws(()=>validateSearch({...r,restricted:'d2d4'}),/binding/);assert.throws(()=>validateSearch({...r,score:{cp:20,wdl:[100,800,50]}}),/WDL/);
});
