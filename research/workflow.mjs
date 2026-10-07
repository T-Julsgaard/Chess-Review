// Metadata reporting and test orchestration only; this tool does not load games.
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));

export function parseTracker(text, original) {
  const names = [...original.matchAll(/^- (.+)$/gm)].map(row => row[1].split(' — ')[0].replaceAll('*', '').trim());
  const rows = [...text.matchAll(/^- \[([ x])\] C(\d{4}) \*\*([^*]+)\*\* — (.+)$/gm)];
  if (rows.length !== names.length || !rows.length) throw Error('Tracker does not cover the original list');
  const seen = new Set();
  for (const row of rows) {
    const id = Number(row[2]);
    if (seen.has(id) || names[id - 1] !== row[3]) throw Error('Duplicate or mismatched tracker occurrence: C' + row[2]);
    if (row[1] === 'x' ? !row[4].startsWith('Mechanics verified:') : !/^(Partial:|Not implemented\.)/.test(row[4])) {
      throw Error('Unrecognized tracker status: C' + row[2]);
    }
    seen.add(id);
  }
  const verified = rows.filter(row => row[1] === 'x');
  const partial = rows.filter(row => row[4].startsWith('Partial:'));
  const summary = {
    entries: rows.length, verifiedEntries: verified.length,
    verifiedConcepts: new Set(verified.map(row => row[3])).size,
    partialEntries: partial.length,
    unimplementedEntries: rows.length - verified.length - partial.length,
    remainingEntries: rows.length - verified.length,
  };
  const header = /^(\d+) entries; (\d+) verified occurrences across (\d+) (?:concept )?names; (\d+) partial occurrences\./m.exec(text);
  if (!header || [summary.entries, summary.verifiedEntries, summary.verifiedConcepts, summary.partialEntries]
    .some((value, index) => value !== Number(header[index + 1]))) throw Error('Tracker headline disagrees with occurrence rows');
  return {...summary, verifiedPercent: Number((100 * summary.verifiedEntries / summary.entries).toFixed(1))};
}

export async function latestCoachStatus(workspace = root) {
  const index = await readFile(path.join(workspace, 'research/INDEX.md'), 'utf8');
  const completed = [...index.matchAll(/^\| (E\d{3}) \| .*?\]\((experiments\/E\d{3}-[a-z0-9-]+\/RESULT\.md)\) \| complete \|/gm)]
    .filter(row => Number(row[1].slice(1)) >= 20).sort((a, b) => b[1].localeCompare(a[1]));
  if (!completed.length) throw Error('No completed coach experiment in the index');
  const latest = completed[0];
  const folder = path.dirname(latest[2]);
  if (!path.basename(folder).startsWith(latest[1] + '-')) throw Error('Index ID and result path disagree');
  // Require the result record; never report a draft or silently fall back to stale evidence.
  await readFile(path.join(workspace, 'research', latest[2]), 'utf8');
  const trackerPath = path.join(workspace, 'research', folder, 'evidence/concept-status.md');
  const [tracker, original] = await Promise.all([
    readFile(trackerPath, 'utf8'),
    readFile(path.join(workspace, 'research/experiments/E020-coach-concepts/CONCEPTS.md'), 'utf8'),
  ]);
  return {experiment: latest[1], completedStudies: completed.length, ...parseTracker(tracker, original), trackerPath};
}

export async function coachTestFiles(workspace = root, requested = []) {
  if (requested.some(id => !/^E\d{3}$/.test(id) || Number(id.slice(1)) < 20)) throw Error('Use coach experiment IDs such as E065');
  const experiments = path.join(workspace, 'research/experiments');
  const folders = (await readdir(experiments, {withFileTypes: true})).filter(entry => entry.isDirectory() && /^E\d{3}-/.test(entry.name)
    && Number(entry.name.slice(1, 4)) >= 20).sort((a, b) => a.name.localeCompare(b.name));
  for (const id of requested) {
    if (folders.filter(entry => entry.name.startsWith(id + '-')).length !== 1) throw Error('Missing or ambiguous experiment: ' + id);
  }
  const files = [];
  for (const folder of folders) {
    const id = folder.name.slice(0, 4);
    if (requested.length && !requested.includes(id)) continue;
    const code = path.join(experiments, folder.name, 'code');
    let entries;
    try { entries = await readdir(code, {withFileTypes: true}); }
    catch (error) { if (error.code !== 'ENOENT') throw error; entries = []; }
    const tests = entries.filter(entry => entry.isFile() && entry.name.endsWith('.test.mjs'));
    if (requested.includes(id) && !tests.length) throw Error('No tests found for ' + id);
    files.push(...tests.map(entry => path.join(code, entry.name)).sort());
  }
  if (!files.length) throw Error('No coach tests found');
  return files;
}

async function main(args) {
  const [command, ...options] = args;
  if (command === 'status' && (options.length === 0 || options.length === 1 && options[0] === '--json')) {
    const status = await latestCoachStatus();
    console.log(options.length ? JSON.stringify(status, null, 2) :
      `${status.experiment}: ${status.verifiedConcepts} verified concepts; ${status.verifiedEntries}/${status.entries} entries (${status.verifiedPercent}%).\n` +
      `${status.partialEntries} partial; ${status.unimplementedEntries} unimplemented; ${status.remainingEntries} remaining.\n` +
      `${status.completedStudies} completed coach studies. Tracker: ${status.trackerPath}\n` +
      'Synthetic mechanics only; real-game precision and human usefulness remain unmeasured.');
    return;
  }
  if (command !== 'test') throw Error('Usage: workflow.mjs status [--json] | test [E065 E066 ...]');
  const files = await coachTestFiles(root, options);
  console.log(`${options.length ? 'Focused development checks: ' + options.join(', ') : 'Full coach regression'} (${files.length} test files).`);
  if (options.length) console.log('Focused checks do not replace the final full regression or independent proof/reproducibility checks.');
  const started = performance.now();
  const child = spawn(process.execPath, ['--test', '--test-reporter=dot', ...files], {cwd: root, stdio: 'inherit', windowsHide: true});
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => signal ? reject(Error('Tests interrupted: ' + signal)) : resolve(code));
  });
  console.log(`\n${options.length ? 'Focused checks' : 'Full coach regression'} ${code === 0 ? 'passed' : 'failed'} in ${((performance.now() - started) / 1000).toFixed(1)} seconds.`);
  process.exitCode = code;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
