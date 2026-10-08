import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Chess} from '../lib/chess.js';
import {analyzeConcepts, conceptInput} from '../lib/concepts/analyze.js';
import {findingsFor, routedNames, excludedEvents} from '../lib/concepts/registry.js';
import {ConceptSession, conceptKey} from '../lib/concepts/session.js';
import {app, loadGame, branch} from './helpers/app.mjs';
const root = path.resolve(import.meta.dirname, '..');
const provenance = JSON.parse(await fs.readFile(path.join(root, 'lib/concepts/provenance.json')));
const verified = provenance.verified;
const hash = value => createHash('sha256').update(value).digest('hex');
const normalized = value => value.toString().replaceAll('\r\n', '\n');
const researchPresent = await fs.access(path.join(root, provenance.trackerPath)).then(() => true, () => false);

test('promotion matches canonical E080 tracker with only import relocation and EOF normalization', async () => {
  assert.equal(verified.length, 372);
  if (researchPresent) {
    const tracker = normalized(await fs.readFile(path.join(root, provenance.trackerPath)));
    assert.equal(hash(tracker), provenance.trackerSha256);
    assert.deepEqual(verified.map(r => r.occurrence), [...tracker.matchAll(/^- \[x\] (C\d{4})/gm)].map(m => m[1]));
  }
  for (const [source, record] of Object.entries(provenance.sources)) {
    const promoted = normalized(await fs.readFile(path.join(root, 'lib/concepts/detectors', record.file)));
    assert.equal(hash(promoted), record.promotedSha256, record.file);
    if (!researchPresent) continue; // Release source snapshots deliberately omit research/.
    const sourceText = normalized(await fs.readFile(path.join(root, source))); assert.equal(hash(sourceText), record.sha256, source);
    const relocated = sourceText.replace(/((?:from\s*|import\s*)['"])([^'"]+)(['"])/g, (_, a, specifier, z) => {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), specifier));
      return a + (target === 'lib/chess.js' ? '../../chess.js' : './' + provenance.sources[target].file) + z;
    }).replace(/\n+$/, '\n');
    assert.equal(promoted, relocated, source);
  }
  const names = new Set(verified.map(v => v.name));
  assert.deepEqual(routedNames.filter(n => !names.has(n)), []);
  assert.deepEqual([...names].filter(n => !routedNames.includes(n)), ['Board coordinates', 'Illegal move']);
});

test('routing audits retained synthetic events without treating partial scopes as verified', {skip: !researchPresent}, async () => {
  const {openResearchData} = await import('../research/data-policy.mjs');
  await openResearchData(['D001'], {purpose: 'test'}); // Source eligibility; cases below are authored synthetic.
  const folders = (await fs.readdir(path.join(root, 'research/experiments'))).filter(f => /^E0(?:[2-7]\d|80)-/.test(f));
  const unknown = new Set(); let rows = 0;
  for (const folder of folders) {
    const file = path.join(root, 'research/experiments', folder, 'evidence/results.json');
    let raw;
    try { raw = await fs.readFile(file); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    const run = JSON.parse(await fs.readFile(path.join(path.dirname(file), 'run.json')));
    assert.equal(hash(raw), run.outputHashes['results.json'], folder);
    const report = JSON.parse(raw);
    for (const row of report.results || []) {
      if (!row.result?.events) continue;
      const mapped = findingsFor(row.result, verified); rows++;
      for (const message of mapped.unavailable) unknown.add(message);
      for (const f of mapped.findings) assert.ok(f.scopes.every(s => verified.includes(s)));
    }
  }
  assert.ok(rows > 1000);
  assert.deepEqual([...unknown].sort(), []);
  assert.ok(excludedEvents.has('fifty-move-threshold'));
  assert.ok(excludedEvents.has('connected-passed-pawns'));
});

test('history-based development abstains without history and proof budgets report exhaustion', () => {
  const fen = new Chess().fen();
  const without = analyzeConcepts({fen, move: 'g1f3'}, verified);
  const withHistory = analyzeConcepts({fen, move: 'g1f3', history: {fen, moves: []}}, verified);
  assert.deepEqual(withHistory.errors, []);
  assert.ok(!without.findings.some(f => f.name === 'Development'));
  assert.ok(withHistory.findings.some(f => f.name === 'Development'));
  assert.ok(without.unavailable.some(s => s.includes('history unavailable')));
  assert.ok(!withHistory.findings.some(f => ['Only move', 'Forced move', 'King centralization'].includes(f.name)));
  assert.equal(conceptInput({fen, move: 'g1f3'}, false).mateDepth, 0);
  const options = conceptInput({fen, move: 'g1f3'});
  assert.equal(options.maxTacticNodes, 4000); assert.equal(options.maxBroadNodes, 4000);
});

test('latest pawn-shield scope and terminal observations survive without changing scores or comments', () => {
  const candidate = {fen: '7k/8/8/8/6q1/5b2/5PPP/6K1 w - - 0 1', move: 'g2g3'};
  const found = analyzeConcepts(candidate, verified);
  assert.deepEqual(found.errors, []);
  assert.ok(found.findings.some(f => f.name === 'Pawn shield'));
  assert.ok(!found.findings.some(f => ['Pawn cover', 'King safety'].includes(f.name)));
  const c = new Chess(); for (const move of ['f2f3', 'e7e5', 'g2g4']) c.move(move);
  const mate = analyzeConcepts({fen: c.fen(), move: 'd8h4', history: {fen: new Chess().fen(), moves: ['f2f3','e7e5','g2g4']}}, verified);
  assert.deepEqual(mate.errors, []);
  assert.ok(mate.findings.some(f => f.name === 'Checkmate'));
  assert.ok(mate.findings.some(f => f.name === 'Check'));
  assert.ok(mate.findings.some(f => f.name === 'Mate in one'));
});

function harness() {
  const workers = [], timers = new Map(); let timerId = 0;
  const session = new ConceptSession({worker: () => { const w = {posts: [], terminated: false, postMessage(p) {this.posts.push(p);}, terminate() {this.terminated = true;}}; workers.push(w); return w; },
    setTimer: fn => {timers.set(++timerId, fn); return timerId;}, clearTimer: id => timers.delete(id)});
  const input = {fen: new Chess().fen(), move: 'e2e4', history: {fen: new Chess().fen(), moves: []}};
  const result = {findings: [{name: 'test'}], timeMs: 20, errors: [], issues: [], unavailable: []};
  return {session, workers, timers, input, result};
}

test('disabled analysis creates no worker; enabling reuses exact history and ignores stale callbacks', () => {
  const {session, workers, input, result} = harness();
  session.configure([input], false); assert.equal(workers.length, 0);
  session.configure([input], true); const old = workers[0], key = conceptKey(input);
  old.onmessage({data: {key, phase: 'complete', result}});
  assert.equal(session.metrics().found, 1);
  session.configure([input], false); assert.ok(old.terminated);
  old.onmessage({data: {key, phase: 'complete', result: {...result, timeMs: 999}}});
  session.configure([input], true); assert.equal(workers.length, 1); assert.equal(session.metrics().timeMs, 20); assert.equal(session.metrics().reused, 1);
  const changedHistory = {...input, history: {...input.history, moves: ['g1f3','g8f6','f3g1','f6g8']}};
  session.include(changedHistory); assert.equal(workers.length, 2);
  session.stop();
});

test('watchdog retains validated facts and reports unfinished proof cost; navigation does not repeat work', () => {
  const {session, workers, timers, input, result} = harness(); session.configure([input], true);
  const key = conceptKey(input);
  workers[0].onmessage({data: {key, phase: 'facts', result}});
  session.include(input, true); assert.equal(workers[0].posts.length, 1);
  [...timers.values()][0]();
  assert.ok(workers[0].terminated); assert.equal(session.metrics().processed, 1);
  assert.equal(session.metrics().found, 1); assert.match(session.metrics().errors[0], /budget exhausted/);
  session.stop();
});

test('native timer callbacks are invoked without the session as their receiver', () => {
  const session = new ConceptSession({setTimer: function () {assert.equal(this, undefined); return 1;},
    clearTimer: function () {assert.equal(this, undefined);}});
  session.configure([], false); session.setTimer(() => {}, 0); session.stop();
});

test('Concepts appends after Visual and Engine, uses selected resulting move/history, and disables immediately', t => {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3'); a.call('computeDerived'); a.call('buildUI');
  a.call('toggleSettings');
  assert.deepEqual([...a.dom.window.document.querySelectorAll('.set-tab')].map(n => n.textContent), ['Visual','Engine','Concepts']);
  a.dom.window.document.querySelectorAll('.set-tab')[2].click();
  assert.equal(a.state.settings.conceptsEnabled, false); assert.equal(a.run('_conceptSession'), null);
  a.call('go', 3);
  const input = a.call('selectedConceptInput'); assert.equal(input.move, 'g1f3'); assert.deepEqual(Array.from(input.history.moves), ['e2e4','e7e5']);
  branch(a, 1, 1); assert.equal(a.call('selectedConceptInput').move, 'e7e5');
  const checkbox = a.dom.window.document.querySelector('#conceptsEnabled'); checkbox.click();
  assert.equal(a.state.settings.conceptsEnabled, true);
  assert.match(a.dom.window.document.querySelector('#conceptMetrics').textContent, /Positions processed:/);
  const detail = a.dom.window.document.querySelector('[data-concept-detail="debug:Errors"]'); detail.open = true;
  a.dom.window.document.querySelector('#conceptsEnabled').focus(); a.call('renderSettings');
  assert.ok(a.dom.window.document.querySelector('[data-concept-detail="debug:Errors"]').open);
  assert.equal(a.dom.window.document.activeElement.id, 'conceptsEnabled');
  a.dom.window.document.querySelector('#conceptsEnabled').click();
  assert.equal(a.state.settings.conceptsEnabled, false); assert.equal(a.run('_conceptSession.enabled'), false);
  assert.equal(a.writes.at(-1).settings.conceptsEnabled, false);
  a.call('go', 1); assert.ok(a.state.evals.every(e => e.cp === 0));
});
