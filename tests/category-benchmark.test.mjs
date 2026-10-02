import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryBenchmark} from '../tools/calibration/category-benchmark.mjs';

test('annotation benchmark refuses proxy labels and exposes disagreements and abstentions',()=>{
  const record={id:'a',gameId:'g',labelSource:'human-review',provenance:{url:'https://example.test/review',license:'test-fixture'},
    reviews:[{reviewer:'one',label:'brilliant'},{reviewer:'two',label:'brilliant'}],prediction:null};
  assert.throws(()=>categoryBenchmark([{...record,labelSource:'engine'}]),/review/);
  const result=categoryBenchmark([record,{...record,id:'b',reviews:[{reviewer:'one',label:'brilliant'},{reviewer:'two',label:'best'}]}]);
  assert.equal(result.scored,1);assert.equal(result.coverage,0);assert.equal(result.exactAgreement,0);
  assert.deepEqual(result.ambiguous,['b']);assert.equal(result.perClass.find(r=>r.label==='brilliant').recall,0);
});
