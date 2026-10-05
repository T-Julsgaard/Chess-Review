import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {qualityObservations} from './study.mjs';

test('retrospective evaluator rejects missing alternatives and false played history',async()=>{
  const source=JSON.parse(gunzipSync(await readFile(new URL('../evidence/sf19-quality.json.gz',import.meta.url))));
  const missing=structuredClone(source);missing.positions[0].legalMoves.pop();
  assert.throws(()=>qualityObservations(missing),/Incomplete legal alternatives/);
  const rebound=structuredClone(source);rebound.positions[0].history=[];
  assert.throws(()=>qualityObservations(rebound),/Choice binding/);
  const bounded=structuredClone(source);bounded.searches[0].rawInfo+=' lowerbound';
  assert.throws(()=>qualityObservations(bounded),/Invalid search evidence/);
});
