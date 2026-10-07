// Scheduling metadata only. No games or candidate evaluations are loaded.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {latestCoachStatus, parseTracker} from '../workflow.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = name => readFile(path.join(root, name), 'utf8');
const hash = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');

export async function auditQueue() {
  const latest = await latestCoachStatus(root);
  const [catalogText, original, tracker] = await Promise.all([
    read('research/concepts/catalog.json'),
    read('research/experiments/E020-coach-concepts/CONCEPTS.md'),
    readFile(latest.trackerPath, 'utf8'),
  ]);
  const catalog = JSON.parse(catalogText);
  parseTracker(tracker, original);
  const texts = [...original.matchAll(/^- (.+)$/gm)].map(match => match[1]);
  const live = new Map([...tracker.matchAll(/^- \[([ x])\] (C\d{4}) \*\*([^*]+)\*\* — (.+)$/gm)]
    .map(match => [match[2], {name: match[3], status: match[1] === 'x' ? 'verified' :
      match[4].startsWith('Partial:') ? 'partial' : 'unimplemented', scope: match[4]}]));
  const seen = new Set(), duplicates = [], queue = [];
  for (const record of catalog.records) {
    assert.ok(record.occurrences.length);
    const occurrences = record.occurrences.map(occurrence => {
      assert.ok(!seen.has(occurrence.id), 'duplicate original occurrence');
      seen.add(occurrence.id);
      assert.equal(occurrence.text, texts[Number(occurrence.id.slice(1)) - 1]);
      assert.equal(occurrence.text, record.text, 'nonexact merge');
      const current = live.get(occurrence.id);
      assert.ok(current, 'missing tracker occurrence');
      assert.equal(current.name, occurrence.name);
      return {...occurrence, ...current};
    });
    const verified = occurrences.filter(row => row.status === 'verified');
    const pending = occurrences.filter(row => row.status !== 'verified');
    if (occurrences.length > 1) duplicates.push({id: record.id, name: record.name,
      occurrences, disposition: !pending.length ? 'all-verified' :
        !verified.length ? 'all-pending' : 'mixed-scope-audit-required'});
    if (pending.length) {
      assert.ok(Number.isSafeInteger(record.proposedWork?.rank), 'unscheduled pending row');
      queue.push({rank: record.proposedWork.rank, phase: record.proposedWork.phase,
        id: record.id, name: record.name, pendingIds: pending.map(row => row.id),
        supportOnly: record.proposedWork.phase === 6});
    }
  }
  assert.equal(seen.size, live.size);
  queue.sort((a, b) => a.rank - b.rank);
  assert.equal(new Set(queue.map(row => row.rank)).size, queue.length);
  return {schema: 'coach-queue-audit-v1', experiment: latest.experiment,
    hashes: {catalog: hash(catalogText), original: hash(original), tracker: hash(tracker)},
    summary: {originalOccurrences: seen.size, duplicateGroups: duplicates.length,
      redundantRows: duplicates.reduce((sum, row) => sum + row.occurrences.length - 1, 0),
      allVerifiedGroups: duplicates.filter(row => row.disposition === 'all-verified').length,
      allPendingGroups: duplicates.filter(row => row.disposition === 'all-pending').length,
      mixedScopeGroups: duplicates.filter(row => row.disposition === 'mixed-scope-audit-required').length,
      outstandingRows: queue.length, outstandingOccurrences: queue.reduce((sum, row) => sum + row.pendingIds.length, 0),
      supportRows: queue.filter(row => row.supportOnly).length},
    duplicates, queue};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert.ok(!args.length || args.length === 2 && args[0] === '--out', 'Usage: audit-queue.mjs [--out PATH]');
  const report = await auditQueue();
  if (args.length) {
    const destination = path.resolve(root, args[1]);
    const relative = path.relative(path.join(root, 'research'), destination);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({passed: true, experiment: report.experiment,
    ...report.summary, next: report.queue.slice(0, 8)}, null, 2));
}
