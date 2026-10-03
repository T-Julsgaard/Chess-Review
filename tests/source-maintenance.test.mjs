import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {verifySource, verifyClaims} from '../scripts/verify-source.mjs';
import {verifyHistoryBlob, verifyHistory} from '../scripts/verify-history.mjs';
import {execFileSync} from 'node:child_process';

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

test('agreement claims are rejected while scientific intervals remain valid', () => {
  const percent = '9' + '5%';
  const service = 'Chess' + '.com';
  const claim = `Accuracy scores within ~${percent} of ${service}'s.`;
  assert.throws(() => verifyClaims(claim), /numerical-agreement/);
  assert.throws(() => verifyHistoryBlob('README.md', claim), /numerical-agreement/);
  assert.doesNotThrow(() => verifyClaims(`${service} game sample: ${percent} confidence interval.`));
});

test('history checks catch deleted commit-message claims and identical blobs under retired paths', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chess-review-history-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', windowsHide: true});
  git(['init', '-q']); git(['config', 'user.name', 'Maintenance test']); git(['config', 'user.email', 'test@example.invalid']);
  await writeFile(path.join(root, 'README.md'), 'Current documentation.\n');
  git(['add', '.']); git(['commit', '-qm', 'Accuracy within ' + '9' + '5% of Chess' + '.com']);
  git(['commit', '--allow-empty', '-qm', 'Maintain documentation']);
  assert.throws(() => verifyHistory(['HEAD'], root), /numerical-agreement/);
  assert.doesNotThrow(() => verifyHistory(['HEAD', '^HEAD~1'], root));
  await mkdir(path.join(root, 'backup'));
  await writeFile(path.join(root, 'backup', 'copied.md'), 'Current documentation.\n');
  git(['add', '.']); git(['commit', '-qm', 'Add copied file']);
  assert.throws(() => verifyHistory(['HEAD', '^HEAD~2'], root), /Retired or generated directory/);
});

test('history checks reject retired models even when the current tree is clean', () => {
  assert.doesNotThrow(() => verifyHistoryBlob('data/calibration.json', '{}'));
  assert.throws(() => verifyHistoryBlob('data/calibration.json', '{"winK":1}'), /reachable history/);
  assert.throws(() => verifyHistoryBlob('tools/dataset/restored.mjs', ''), /reachable history/);
  assert.throws(() => verifyHistoryBlob('analysis.js', 'function calWinK() { return 1; }'), /scoring body/);
  assert.doesNotThrow(() => verifyHistoryBlob('analysis.js', 'function calWinK() { return NaN; }'));
  assert.throws(() => verifyHistoryBlob('tests/helpers/app.mjs', 'CALIB = {winK: 1};'), /numerical test fixture/);
});
