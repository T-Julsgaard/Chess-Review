import test from 'node:test';
import assert from 'node:assert/strict';
import {provenanceSummary} from '../tools/calibration/io.mjs';
test('provenance summaries preserve immutable inputs and fail closed on unsupported scoring sources',()=>{
  const manifest={gamesSha256:'fixed',source:{url:'CC0'},independentlyDefinedScoring:true,externalReviewScoresUsed:false};
  const summary=provenanceSummary(manifest);
  assert.deepEqual(summary,manifest);
  summary.source.url='changed';
  assert.equal(manifest.source.url,'CC0');
  assert.throws(()=>provenanceSummary({...manifest,independentlyDefinedScoring:false}));
  assert.throws(()=>provenanceSummary({...manifest,externalReviewScoresUsed:true}));
  assert.deepEqual(provenanceSummary({independentlyDefinedScoring:true}),{independentlyDefinedScoring:true});
  assert.equal(provenanceSummary(null),null);
});
