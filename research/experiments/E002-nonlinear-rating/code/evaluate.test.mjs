import test from 'node:test';
import assert from 'node:assert/strict';
import {featuresFor,foldMaps,splitRows,metrics,pairedInterval,nonlinearNames} from './evaluate.mjs';

test('opponents and repeated players never cross outer or inner folds',()=>{
  const games=[{id:'a',players:[{id:'p'},{id:'q'}]},{id:'b',players:[{id:'q'},{id:'r'}]},{id:'c',players:[{id:'s'},{id:'t'}]}];
  const maps=foldMaps(games);
  assert.equal(maps.outer.get('a'),maps.outer.get('b'));
  assert.equal(maps.inner.get('a'),maps.inner.get('b'));
  assert.deepEqual([...maps.outer],[...foldMaps([...games].reverse()).outer]);
  assert.throws(()=>splitRows([{gameId:'a',playerId:'p'},{gameId:'c',playerId:'p'}],new Map([['a',0],['c',1]]),0),/leaking/);
});
test('target, identity and metadata cannot enter candidate predictors',()=>{
  const contextMoves=Array.from({length:10},(_,i)=>({ply:2*i+1,eligible:true,loss:i/100,top:i===0,bestExpected:.5,legalChoices:20}));
  const first=featuresFor({contextMoves,ratingTarget:700,playerId:'a',band:0});
  const second=featuresFor({contextMoves,ratingTarget:2900,playerId:'b',band:4,opponentRating:3000,result:'1-0'});
  assert.deepEqual(first,second);
  assert.deepEqual(Object.keys(first),nonlinearNames);
});
test('metrics and uncertainty preserve each game weight even with an omitted side',()=>{
  const rows=[{gameId:'a',ratingTarget:0},{gameId:'a',ratingTarget:0},{gameId:'b',ratingTarget:0}];
  assert.equal(metrics(rows,[10,10,100]).mae,55);
  const paired=pairedInterval(rows,[10,10,100],[0,0,0],1,1000);
  assert.equal(paired.estimate,55);
  assert.equal(paired.lower,10);
  assert.equal(paired.upper,100);
  assert.throws(()=>metrics(rows,[NaN,0,0]),/Invalid metric/);
});
