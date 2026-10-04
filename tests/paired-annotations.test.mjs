import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame,branch} from './helpers/app.mjs';

for (const engine of ['nnue','sf19lite']) for (const color of ['w','b']) {
  test(`${engine} ${color}: completed categories ignore later search drift and stale candidate lines`, t=>{
    const a=app(t), white=color==='w', S=loadGame(a,white?'1. e4':'1. e4 e5');
    S.settings.enginePath=engine;
    const ply=white?1:2, move=white?'e2e4':'e7e5';
    S.bests[ply-1]={bestmove:white?'d2d4':'c7c5',score:{cp:300},playedScore:{cp:-300},
      calibration:{build:engine},lines:[{score:{cp:300},pv:move,depth:8,bound:'upperbound',multipv:1}]};
    a.call('computeDerived'); const category=S.classif[ply], grade=S.moveGrades[ply];
    assert.ok(['mistake','blunder'].includes(category));
    for(const score of [{cp:1000},{cp:-1000},{mate:3},{mate:-3}]) {
      S.evals[ply]=score; a.call('computeDerived');
      assert.equal(S.classif[ply],category); assert.equal(S.moveGrades[ply],grade);
      const v=branch(a);a.call('classifyVariationMoves');assert.equal(v.positions[ply].classif,category);
    }
  });
  test(`${engine} ${color}: paired mate reversals and lost mates survive contradictory position searches`, t=>{
    const a=app(t),white=color==='w',S=loadGame(a,white?'1. e4':'1. e4 e5');
    S.settings.enginePath=engine; const ply=white?1:2;
    S.bests[ply-1]={bestmove:'different',score:{mate:3},playedScore:{mate:-3},calibration:{build:engine},lines:[]};
    a.call('computeDerived');assert.equal(S.classif[ply],'blunder');
    S.bests[ply-1].playedScore={cp:0};a.call('computeDerived');assert.equal(S.classif[ply],'miss');
    S.bests[ply-1].playedScore={mate:0};a.call('computeDerived');assert.equal(S.classif[ply],null);
  });
}

test('completed top decisions and grades are independent of after-position mate distance',t=>{
  const a=app(t),S=loadGame(a,'1. e4',[{mate:2},{mate:9}]);
  S.bests[0]={bestmove:'e2e4',score:{mate:2},playedScore:{mate:9},lines:[]};
  a.call('computeDerived');assert.equal(S.classif[1],'best');assert.equal(S.moveGrades[1],9);
});
