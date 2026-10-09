// Coach build metadata and source fingerprints only. No games or searches.
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {latestCoachStatus} from './workflow.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const binary = /\.(gz|wasm|nnue|bin|png|jpg|jpeg|webp|zip|pdf)$/i;
const phases = [
  'Board, material and pawn descriptors',
  'Local legal relationships and history changes',
  'Structures, maneuvers and opening history',
  'Tactical and endgame proofs',
  'Strategic quality and practical decisions',
  'Supporting vocabulary, clocks and training',
];

function sourcePath(workspace, name) {
  if (typeof name !== 'string' || !name || path.isAbsolute(name) || name.includes('\\')
    || name.split('/').some(p => !p || p === '.' || p === '..')) throw Error('Invalid build input path: ' + name);
  const resolved = path.resolve(workspace, name);
  if (!resolved.startsWith(path.resolve(workspace) + path.sep)) throw Error('Build input outside workspace');
  // Build fingerprints are source/config metadata, never a path to game/evidence content.
  if (/^(research\/(runs|datasets)\/|tools\/calibration\/public\/)/.test(name)
    || /\/evidence\//.test(name)) throw Error('Use source inputs, not dataset/evidence bytes: ' + name);
  return resolved;
}

export async function coachBuildStatus(workspace = root) {
  const accepted = await latestCoachStatus(workspace);
  const tracker = await readFile(accepted.trackerPath, 'utf8');
  const rows = new Map([...tracker.matchAll(/^- \[([ x])\] (C\d{4}) \*\*([^*]+)\*\* — (.+)$/gm)]
    .map(m => [m[2], {id:m[2], name:m[3], status:m[1] === 'x' ? 'verified' : m[4].startsWith('Partial:') ? 'partial' : 'unimplemented', scope:m[4]}]));
  const folders = (await readdir(path.join(workspace, 'research/experiments'), {withFileTypes:true}))
    .filter(e => e.isDirectory() && (/^FRIEND-\d{2}-/.test(e.name)
      || /^E\d{3}-/.test(e.name) && Number(e.name.slice(1,4)) >= 20))
    .sort((a,b) => a.name.localeCompare(b.name));
  const builds = [];
  const implemented = new Set();
  for (const folder of folders) {
    const recordPath = path.join(workspace, 'research/experiments', folder.name, 'build.json');
    let text;
    try { text = await readFile(recordPath, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const record = JSON.parse(text);
    const studyId = /^(E\d{3}|FRIEND-\d{2})-/.exec(folder.name)[1];
    if (record.schema !== 'coach-build-v1' || record.experiment !== studyId
      || record.stage !== 'code-ready' || !Array.isArray(record.claims) || !record.claims.length
      || !record.inputHashes || typeof record.inputHashes !== 'object' || Array.isArray(record.inputHashes)
      || !Object.keys(record.inputHashes).length
      || !Array.isArray(record.focusedChecks) || !record.focusedChecks.length
      || record.focusedChecks.some(c => typeof c !== 'string' || !c.trim())
      || !Array.isArray(record.deferredChecks) || !record.deferredChecks.length
      || record.deferredChecks.some(c => typeof c !== 'string' || !c.trim())) throw Error('Invalid build record: ' + recordPath);
    const seen = new Set();
    for (const claim of record.claims) {
      if (!rows.has(claim.id) || seen.has(claim.id) || typeof claim.scope !== 'string' || !claim.scope.trim())
        throw Error('Unknown/duplicate/unscoped build claim: ' + claim.id);
      seen.add(claim.id);
    }
    const inputs = Object.entries(record.inputHashes);
    if (!inputs.some(([name]) => name.startsWith('research/experiments/' + folder.name + '/code/') && name.endsWith('.mjs')))
      throw Error('Build record needs its own implementation source: ' + recordPath);
    const changedInputs = [];
    for (const [name, expected] of inputs) {
      if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) throw Error('Invalid build input hash: ' + name);
      const target = sourcePath(workspace, name);
      let bytes;
      try { bytes = await readFile(target); }
      catch (error) { if (error.code === 'ENOENT') { changedInputs.push({path:name, reason:'missing'}); continue; } throw error; }
      const actual = digest(binary.test(name) ? bytes : bytes.toString('utf8').replaceAll('\r\n','\n'));
      if (actual !== expected) changedInputs.push({path:name, reason:'changed'});
    }
    const stage = changedInputs.length ? 'stale' : 'code-ready';
    const pendingIds = record.claims.filter(c => rows.get(c.id).status !== 'verified').map(c => c.id);
    if (stage === 'code-ready') pendingIds.forEach(id => implemented.add(id));
    builds.push({experiment:record.experiment, stage, claims:record.claims, pendingIds,
      changedInputs, focusedChecks:record.focusedChecks, deferredChecks:record.deferredChecks, recordPath});
  }
  const codeReadyEntries = implemented.size;
  return {accepted, codeReadyEntries, codeReadyPercent:Number((100*codeReadyEntries/accepted.entries).toFixed(1)),
    acceptedOrCodeReadyEntries:accepted.verifiedEntries+codeReadyEntries,
    acceptedOrCodeReadyPercent:Number((100*(accepted.verifiedEntries+codeReadyEntries)/accepted.entries).toFixed(1)),
    remainingWithoutReadyCode:accepted.remainingEntries-codeReadyEntries,
    codeReadyBatches:builds.filter(b => b.stage === 'code-ready').length,
    staleBatches:builds.filter(b => b.stage === 'stale').length, builds};
}

export async function coachBuildQueue(workspace = root) {
  const build = await coachBuildStatus(workspace);
  const catalog = JSON.parse(await readFile(path.join(workspace,'research/concepts/catalog.json'),'utf8'));
  const tracker = await readFile(build.accepted.trackerPath,'utf8');
  const pending = new Set([...tracker.matchAll(/^- \[ \] (C\d{4}) /gm)].map(m => m[1]));
  const ready = new Set(build.builds.filter(b => b.stage === 'code-ready').flatMap(b => b.pendingIds));
  const groups = phases.map((title,i) => ({phase:i+1,title,items:[]}));
  const seen = new Set();
  for (const rec of catalog.records) {
    const ids = rec.occurrences.filter(o => pending.has(o.id)).map(o => o.id);
    if (!ids.length) continue;
    if (!rec.proposedWork || !groups[rec.proposedWork.phase-1]) throw Error('Missing pending queue assignment: ' + rec.id);
    ids.forEach(id => { if (seen.has(id)) throw Error('Duplicate queue occurrence: ' + id); seen.add(id); });
    groups[rec.proposedWork.phase-1].items.push({id:rec.id,name:rec.name,rank:rec.proposedWork.rank,
      pendingIds:ids,codeReadyIds:ids.filter(id => ready.has(id)),needsCodeIds:ids.filter(id => !ready.has(id))});
  }
  if (seen.size !== pending.size) throw Error('Catalog omits pending tracker occurrences');
  groups.forEach(g => g.items.sort((a,b) => a.rank-b.rank));
  return {acceptedExperiment:build.accepted.experiment, remainingEntries:pending.size,
    codeReadyEntries:build.codeReadyEntries, remainingWithoutReadyCode:build.remainingWithoutReadyCode,
    workingItems:groups.reduce((n,g) => n+g.items.length,0),groups};
}

async function main(args) {
  const [command,...options] = args;
  if (!['status','backlog'].includes(command) || options.length > 1 || options.length === 1 && options[0] !== '--json')
    throw Error('Usage: build-workflow.mjs status|backlog [--json]');
  const value = command === 'status' ? await coachBuildStatus() : await coachBuildQueue();
  if (options.length) { console.log(JSON.stringify(value,null,2)); return; }
  if (command === 'status') {
    console.log(`${value.accepted.experiment}: ${value.accepted.verifiedEntries}/${value.accepted.entries} accepted entries (${value.accepted.verifiedPercent}%).\n`+
      `${value.codeReadyEntries} pending entries with provisional candidate scopes; ${value.codeReadyBatches} ready batches; ${value.staleBatches} stale batches.\n`+
      `${value.acceptedOrCodeReadyEntries}/${value.accepted.entries} accepted or with provisional candidate code (${value.acceptedOrCodeReadyPercent}%); narrower candidates do not complete broader scopes.\n`+
      `${value.remainingWithoutReadyCode} pending entries without hash-matched candidate code. No searches or game reads performed.`);
    for (const batch of value.builds) console.log(`${batch.experiment}: ${batch.stage}; ${batch.pendingIds.join(', ')}${batch.changedInputs.length ? '; changed inputs: '+batch.changedInputs.map(i=>i.path).join(', ') : ''}`);
  } else {
    console.log(`${value.workingItems} working items / ${value.remainingEntries} pending occurrences; ${value.codeReadyEntries} provisional code-ready.\n`+
      'Approved ordering within families; common-coach priority and prerequisite deviations follow BUILD-FIRST.md.');
    for (const group of value.groups) {
      console.log(`\nPhase ${group.phase}: ${group.title} (${group.items.length} items)`);
      for (const item of group.items) console.log(`${item.rank}. ${item.name} — ${item.pendingIds.join(', ')}${item.codeReadyIds.length ? '; provisional: '+item.codeReadyIds.join(', ') : ''}`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode=1; });
}
