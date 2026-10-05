import test from 'node:test';
import assert from 'node:assert/strict';
import {selectGames,wilson,decision,drift,summary} from './method.mjs';
// Authored selection/probability mechanics, no human game evidence.
test('fixed role selection is score blind and excludes reserved games',()=>{
  const games=Array.from({length:100},(_,i)=>({id:'synthetic-'+i,split:i<60?'train':'validation'})),a=selectGames(games);
  assert.equal(a.length,45);assert.equal(a.filter(g=>g.split==='train').length,30);assert.deepEqual(a.map(g=>g.id),selectGames([...games].reverse()).map(g=>g.id));
  assert.throws(()=>selectGames([...games,{id:'reserved',split:'test'}]),/Reserved/);
});
test('Wilson counts and frozen gates expose inadequate stability',()=>{
  assert.ok(wilson(45,45).lower>.9);assert.ok(wilson(41,45).lower<.8);assert.throws(()=>wilson(46,45),/counts/);
  const low={cpLoss:.1,quality:90,wdlLoss:.1,cpResidual:.1,wdlResidual:.1,best:['a2a4'],bestmove:'a2a4',rootMate:null,playedMate:null,fixedPoints:.5},game={id:'synthetic',split:'train',players:[{color:'w',rating:1500}]};
  const row=drift(game,{ply:30,color:'w'},low,low);assert.equal(summary(Array.from({length:45},(_,i)=>({...row,gameId:'synthetic-'+i}))).passed,true);
  assert.equal(summary([{...row,qualityDrift:6}]).gates.displayedQuality,false);
});
test('mate sign, top move and constrained best sets are explicit',()=>{
  const root={bestmove:'a2a4',score:{cp:100,wdl:[600,300,100]}},alternatives=[{move:'a2a4',score:{cp:90,wdl:[550,350,100]}},{move:'b2b4',score:{mate:-2}}];
  const top=decision(root,alternatives,'a2a4');assert.equal(top.cpLoss,0);assert.equal(top.wdlLoss,0);assert.deepEqual(top.best,['a2a4']);
  assert.ok(decision(root,alternatives,'b2b4').cpLoss>.5);assert.throws(()=>decision(root,alternatives,'c2c4'),/Missing/);
});
