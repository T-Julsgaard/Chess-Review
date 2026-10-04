import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryBenchmark,compareCategories} from '../tools/calibration/category-benchmark.mjs';

test('annotation benchmark refuses proxy labels and exposes disagreements and abstentions',()=>{
  const record={id:'a',gameId:'g',labelSource:'human-review',provenance:{url:'https://example.test/review',license:'test-fixture'},
    reviews:[{reviewer:'one',label:'brilliant'},{reviewer:'two',label:'brilliant'}],prediction:null};
  assert.throws(()=>categoryBenchmark([{...record,labelSource:'engine'}]),/review/);
  const result=categoryBenchmark([record,{...record,id:'b',reviews:[{reviewer:'one',label:'brilliant'},{reviewer:'two',label:'best'}]}]);
  assert.equal(result.scored,1);assert.equal(result.coverage,0);assert.equal(result.exactAgreement,0);
  assert.deepEqual(result.ambiguous,['b']);assert.equal(result.perClass.find(r=>r.label==='brilliant').recall,0);
});

test('paired category assessment measures rare classes, abstentions and uncertainty by game',()=>{
  const row={labelSource:'human-review',provenance:{url:'https://example.test/review',license:'test-fixture'},
    reviews:[{reviewer:'one',label:'blunder'},{reviewer:'two',label:'blunder'}],prediction:'blunder',baselinePrediction:'best'};
  const records=Array.from({length:12},(_,i)=>({...row,id:String(i),gameId:'g'+i}));
  const result=compareCategories(records);
  assert.equal(result.candidate.macroF1,1);assert.equal(result.baseline.macroF1,0);
  assert.equal(result.pairedAgreementDifference.lower,1);assert.equal(result.passed,true);
  assert.equal(compareCategories(records.map(row=>({...row,prediction:null}))).passed,false);
  assert.throws(()=>compareCategories(records.map(({baselinePrediction,...row})=>row)),/paired baseline/);
  assert.equal(compareCategories(records.map(row=>({...row,gameId:'one-game'}))).passed,false);
});
