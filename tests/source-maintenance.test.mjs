import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {verifySource} from '../scripts/verify-source.mjs';
import {verifyHistoryBlob} from '../scripts/verify-history.mjs';

test('older fork contributions cannot restore unsupported models or retired tooling', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chess-review-source-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(path.join(root, 'data'));
  const current = await readFile(new URL('../data/calibration.json', import.meta.url), 'utf8');
  const modelPath = path.join(root, 'data/calibration.json');
  const analysisPath = path.join(root, 'analysis.js');
  await writeFile(modelPath, current); await writeFile(analysisPath, '');
  await verifySource(root);
  await writeFile(modelPath, JSON.stringify({version: 'unsupported', display: 'winpct'}));
  await assert.rejects(verifySource(root), /model schema/);
  await writeFile(modelPath, JSON.stringify({...JSON.parse(current), agg: {mode: 'unsupported'}}));
  await assert.rejects(verifySource(root), /model field: agg/);
  await writeFile(modelPath, current); await writeFile(analysisPath, 'function calWinK() {}');
  await assert.rejects(verifySource(root), /scoring implementation/);
  await writeFile(analysisPath, '');
  await mkdir(path.join(root, 'tools/calibration'), {recursive: true});
  await writeFile(path.join(root, 'tools/calibration/obsolete-experiment.mjs'), '');
  await assert.rejects(verifySource(root), /Unmaintained calibration tool/);
});

test('history checks reject retired models even when the current tree is clean', () => {
  assert.doesNotThrow(() => verifyHistoryBlob('data/calibration.json', '{}'));
  assert.throws(() => verifyHistoryBlob('data/calibration.json', '{"winK":1}'), /reachable history/);
  assert.throws(() => verifyHistoryBlob('tools/dataset/restored.mjs', ''), /reachable history/);
  assert.throws(() => verifyHistoryBlob('analysis.js', 'function calWinK() { return 1; }'), /scoring body/);
  assert.doesNotThrow(() => verifyHistoryBlob('analysis.js', 'function calWinK() { return NaN; }'));
});
