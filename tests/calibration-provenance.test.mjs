import test from 'node:test';
import assert from 'node:assert/strict';
import {provenanceSummary} from '../tools/calibration/io.mjs';
test('provenance summaries preserve immutable inputs and fail closed on unsupported scoring sources',()=>{
  const manifest={gamesSha256:'fixed',source:{url:'CC0'},fixtureCalibrationUsedForTraining:false,externalReviewScoresUsed:false};
  const summary=provenanceSummary(manifest);
  assert.equal(summary.independentlyDefinedScoring,true);assert.equal(summary.gamesSha256,'fixed');
  assert.deepEqual(summary.source,manifest.source);assert.equal(manifest.fixtureCalibrationUsedForTraining,false);
  assert.ok(!Object.hasOwn(summary,'fixtureCalibrationUsedForTraining'));
  assert.throws(()=>provenanceSummary({...manifest,fixtureCalibrationUsedForTraining:true}));
  assert.deepEqual(provenanceSummary({independentlyDefinedScoring:true}),{independentlyDefinedScoring:true});
});
