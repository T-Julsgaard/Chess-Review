import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {openResearchData, sha256} from '../../../data-policy.mjs';
import {explainMove} from './concepts.mjs';
import {replayCertificate} from './certificate.mjs';
import {renderDemo} from './demo.mjs';
import {renderStatus} from './status.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const base = 'research/experiments/E020-coach-concepts';
const args = process.argv.slice(2);
assert.ok(!args.length || (args.length === 2 && args[0] === '--out'), 'Usage: node research/experiments/E020-coach-concepts/code/run.mjs [--out PATH]');
const out = path.resolve(root, args[1] || `${base}/evidence`);
const relative = path.relative(path.join(root, 'research'), out);
assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Output must stay inside research/');
const data = await openResearchData(['D001'], {purpose:'test'});
// Fixture modules are authored source only, after the shared eligibility gate.
const {fixtures, reflect} = await import('./fixtures.mjs');
const started = performance.now(), results = [], replays = [];
for (const fixture of fixtures.flatMap(f => [f, reflect(f)])) {
  if (fixture.invalid) {
    assert.throws(() => explainMove(fixture), /Illegal move/);
    results.push({fixture, error:'Illegal move; explanation refused.'}); continue;
  }
  const result = explainMove(fixture);
  assert.deepEqual(result.events.map(e => e.id).sort(), [...fixture.expected].sort());
  assert.equal(result.diagnostics.tactics, 'complete');
  for (const e of result.events) {
    if (e.id === 'fork') replays.push({fixture:fixture.id, kind:e.id, ...replayCertificate(fixture.fen, fixture.move, e.evidence)});
    if (e.id === 'allows-fork') replays.push({fixture:fixture.id, kind:e.id, ...replayCertificate(result.after, e.evidence.threat.move, e.evidence.threat)});
    if (e.id === 'avoids-fork') {
      const comparison = explainMove({...fixture, move:fixture.alternative, alternative:null});
      replays.push({fixture:fixture.id, kind:e.id, ...replayCertificate(comparison.after, e.evidence.threat.move, e.evidence.threat)});
    }
  }
  results.push({fixture, result});
}
const report = {schema:'E020-synthetic-mechanics-v1', source:'authored synthetic fixtures; no real games',
  fixtures:results.length, accepted:results.filter(r => r.result?.events.length).length,
  abstained:results.filter(r => r.result && !r.result.events.length).length,
  invalid:results.filter(r => r.error).length, replays, results};
const json = JSON.stringify(report,null,2)+'\n', html = renderDemo(results);
const status = renderStatus(await readFile(path.join(root,base,'CONCEPTS.md'),'utf8'), report);
const inputHashes = {};
for (const name of ['lib/chess.js', ...['concepts.mjs','fixtures.mjs','certificate.mjs','concepts.test.mjs','run.mjs','demo.mjs','status.mjs'].map(n => `${base}/code/${n}`),`${base}/plan.md`,`${base}/CONCEPTS.md`]) {
  inputHashes[name] = sha256((await readFile(path.join(root,name),'utf8')).replaceAll('\r\n','\n'));
}
const run = {schema:'research-synthetic-run-v1', experiment:'E020', date:new Date().toISOString(),
  codeRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  workingTreeStatus:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),
  command:'node research/experiments/E020-coach-concepts/code/run.mjs'+(args.length ? ` --out ${args[1]}` : ''),
  evaluationRole:'exposed synthetic development mechanics; not human or real-game confirmation',
  environment:{node:process.version,platform:os.platform(),arch:os.arch()},
  config:{maxNodes:50000,scanReplies:true,engine:null,seed:null,history:'FEN plus simulated legal continuations; prior repetition unknown'},
  eligibilityReceipt:data.receipt, inputHashes,
  outputHashes:{'results.json':sha256(json),'demo.html':sha256(html),'concept-status.md':sha256(status)}, elapsedMs:performance.now()-started,
  metrics:{fixtures:report.fixtures,accepted:report.accepted,abstained:report.abstained,invalid:report.invalid,
    certificates:replays.length,defenderReplies:replays.reduce((n,r)=>n+r.defenderReplies,0),
    counterreplyLeaves:replays.reduce((n,r)=>n+r.counterreplyLeaves,0)}};
await mkdir(out,{recursive:true});
await writeFile(path.join(out,'results.json'),json);
await writeFile(path.join(out,'demo.html'),html);
await writeFile(path.join(out,'concept-status.md'),status);
await writeFile(path.join(out,'run.json'),JSON.stringify(run,null,2)+'\n');
console.log(JSON.stringify({passed:true,...run.metrics,elapsedMs:Math.round(run.elapsedMs),out,outputHashes:run.outputHashes},null,2));
