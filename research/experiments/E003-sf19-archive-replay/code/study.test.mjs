import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
import {qualityObservations} from './study.mjs';

test('retrospective evaluator rejects missing alternatives and false played history',async()=>{
  const data=await openResearchData(['D001'],{purpose:'test'});
  const source=await data.readJson('research/experiments/E003-sf19-archive-replay/evidence/sf19-quality.json.gz');
  const missing=structuredClone(source);missing.positions[0].legalMoves.pop();
  assert.throws(()=>qualityObservations(missing),/Incomplete legal alternatives/);
  const rebound=structuredClone(source);rebound.positions[0].history=[];
  assert.throws(()=>qualityObservations(rebound),/Choice binding/);
  const bounded=structuredClone(source);bounded.searches[0].rawInfo+=' lowerbound';
  assert.throws(()=>qualityObservations(bounded),/Invalid search evidence/);
});
