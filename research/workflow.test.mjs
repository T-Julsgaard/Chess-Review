import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseTracker, latestCoachStatus, coachTestFiles} from './workflow.mjs';

const original = '- ** Fork** — definition\n- Fork\n- Pin\n';
const tracker = '3 entries; 1 verified occurrences across 1 names; 1 partial occurrences.\n' +
  '- [x] C0001 **Fork** — Mechanics verified: bounded proof.\n' +
  '- [ ] C0002 **Fork** — Partial: another scope.\n' +
  '- [ ] C0003 **Pin** — Not implemented.\n';

test('progress distinguishes repeated occurrences and refuses stale or mismatched counts', () => {
  assert.equal(parseTracker(tracker, original).remainingEntries, 2);
  assert.equal(parseTracker(tracker, original).verifiedConcepts, 1);
  assert.throws(() => parseTracker(tracker.replace('1 verified occurrences', '2 verified occurrences'), original), /headline/);
  assert.throws(() => parseTracker(tracker.replace('C0003', 'C0002'), original), /Duplicate/);
  assert.throws(() => parseTracker(tracker.replace('**Pin**', '**Skewer**'), original), /mismatched/);
  assert.throws(() => parseTracker(tracker.replace('Not implemented.', 'Possibly done.'), original), /Unrecognized/);
});

test('status reports completed evidence rather than a newer draft; test selection never silently runs nothing', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chess-review-workflow-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const put = async (name, contents = '') => {
    const target = path.join(root, name); await mkdir(path.dirname(target), {recursive: true}); await writeFile(target, contents);
  };
  await put('research/INDEX.md', '| E020 | [Concepts](experiments/E020-coach-concepts/RESULT.md) | complete | evidence |\n' +
    '| E021 | [Draft](experiments/E021-draft/RESULT.md) | running | pending |\n');
  await put('research/experiments/E020-coach-concepts/CONCEPTS.md', original);
  await put('research/experiments/E020-coach-concepts/RESULT.md', 'Completed.');
  await put('research/experiments/E020-coach-concepts/evidence/concept-status.md', tracker);
  await put('research/experiments/E020-coach-concepts/code/old.test.mjs');
  await put('research/experiments/E021-draft/code/new.test.mjs');
  await put('research/experiments/E019-numerical/code/numeric.test.mjs');
  assert.equal((await latestCoachStatus(root)).experiment, 'E020');
  assert.equal((await coachTestFiles(root)).length, 2);
  assert.deepEqual(await coachTestFiles(root, ['E021']), [path.join(root, 'research/experiments/E021-draft/code/new.test.mjs')]);
  await assert.rejects(coachTestFiles(root, ['E022']), /Missing/);
  await assert.rejects(coachTestFiles(root, ['../E020']), /experiment IDs/);
  await put('research/experiments/E022-empty/plan.md');
  await assert.rejects(coachTestFiles(root, ['E022']), /No tests/);
  await put('research/INDEX.md', '| E022 | [Missing](experiments/E022-empty/RESULT.md) | complete | evidence |\n');
  await assert.rejects(latestCoachStatus(root), /ENOENT/);
});
