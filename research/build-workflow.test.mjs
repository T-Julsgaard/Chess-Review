import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {coachBuildStatus,coachBuildQueue} from './build-workflow.mjs';

const hash = text => createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex');

async function fixture(t) {
  const workspace = await mkdtemp(path.join(os.tmpdir(),'chess-review-build-'));
  assert.ok(path.resolve(workspace).startsWith(path.resolve(os.tmpdir())+path.sep));
  t.after(() => rm(workspace,{recursive:true,force:true}));
  const put = async (name,contents) => {
    const target=path.join(workspace,name);await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,typeof contents === 'string' ? contents : JSON.stringify(contents));
  };
  await put('research/INDEX.md','| E020 | [Accepted](experiments/E020-baseline/RESULT.md) | complete | accepted |\n'+
    '| E021 | [Prototype](experiments/E021-candidate/RESULT.md) | prototype | deferred |\n');
  await put('research/experiments/E020-baseline/RESULT.md','Accepted baseline.');
  await put('research/experiments/E020-coach-concepts/CONCEPTS.md','- Fork\n- Fork\n- Pin\n');
  await put('research/experiments/E020-baseline/evidence/concept-status.md',
    '3 entries; 1 verified occurrences across 1 names; 1 partial occurrences.\n'+
    '- [x] C0001 **Fork** — Mechanics verified: bounded fork.\n'+
    '- [ ] C0002 **Fork** — Partial: broader scope.\n'+
    '- [ ] C0003 **Pin** — Not implemented.\n');
  await put('research/concepts/catalog.json',{records:[
    {id:'C0001',name:'Fork',occurrences:[{id:'C0001'},{id:'C0002'}],proposedWork:{phase:2,rank:3}},
    {id:'C0003',name:'Pin',occurrences:[{id:'C0003'}],proposedWork:{phase:4,rank:4}},
  ]});
  const shared='research/shared.mjs',own='research/experiments/E021-candidate/code/candidate.mjs';
  await put(shared,'export const n=1;\r\n');await put(own,'export const candidate=true;\n');
  const record={schema:'coach-build-v1',experiment:'E021',stage:'code-ready',
    claims:[{id:'C0002',scope:'Candidate fork scope'},{id:'C0003',scope:'Candidate pin scope'}],
    inputHashes:{[shared]:hash('export const n=1;\n'),[own]:hash('export const candidate=true;\n')},
    focusedChecks:['node --test code/candidate.test.mjs'],deferredChecks:['combined regression','saved replay']};
  const recordPath='research/experiments/E021-candidate/build.json';
  await put(recordPath,record);
  return {workspace,put,record,recordPath,shared,own};
}

test('prototype coverage never advances accepted counts; shared dependency edits and missing inputs invalidate it',async t => {
  const f=await fixture(t);
  let result=await coachBuildStatus(f.workspace);
  assert.equal(result.accepted.verifiedEntries,1);assert.equal(result.accepted.experiment,'E020');
  assert.equal(result.codeReadyEntries,2);assert.equal(result.acceptedOrCodeReadyEntries,3);
  await f.put(f.shared,'export const n=2;\n');
  result=await coachBuildStatus(f.workspace);
  assert.equal(result.codeReadyEntries,0);assert.equal(result.accepted.verifiedEntries,1);
  assert.equal(result.staleBatches,1);assert.deepEqual(result.builds[0].changedInputs,[{path:f.shared,reason:'changed'}]);
  await f.put(f.shared,'export const n=1;\n');
  f.record.inputHashes['research/missing.mjs']=hash('missing');await f.put(f.recordPath,f.record);
  result=await coachBuildStatus(f.workspace);
  assert.equal(result.codeReadyEntries,0);assert.equal(result.builds[0].changedInputs[0].reason,'missing');
});

test('overlapping prototype IDs count once and accepted scopes are excluded from provisional coverage',async t => {
  const f=await fixture(t);
  const second=structuredClone(f.record);second.experiment='FRIEND-01';
  const own='research/experiments/FRIEND-01-overlap/code/overlap.mjs';await f.put(own,'export const overlap=true;\n');
  second.inputHashes[own]=hash('export const overlap=true;\n');
  second.claims.push({id:'C0001',scope:'Already accepted occurrence'});
  await f.put('research/experiments/FRIEND-01-overlap/build.json',second);
  const result=await coachBuildStatus(f.workspace);
  assert.equal(result.codeReadyBatches,2);assert.equal(result.codeReadyEntries,2);
  assert.equal(result.acceptedOrCodeReadyEntries,3);assert.equal(result.remainingWithoutReadyCode,0);
});

test('backlog filters current acceptance against historical queue and keeps pending scopes of repeated labels',async t => {
  const f=await fixture(t);
  let result=await coachBuildQueue(f.workspace);
  assert.equal(result.workingItems,2);assert.equal(result.remainingEntries,2);
  assert.deepEqual(result.groups[1].items[0].pendingIds,['C0002']);
  assert.deepEqual(result.groups[1].items[0].codeReadyIds,['C0002']);
  await f.put(f.shared,'changed');result=await coachBuildQueue(f.workspace);
  assert.equal(result.codeReadyEntries,0);assert.deepEqual(result.groups[1].items[0].needsCodeIds,['C0002']);
  const catalog=JSON.parse(await readFile(path.join(f.workspace,'research/concepts/catalog.json'),'utf8'));
  catalog.records.pop();await f.put('research/concepts/catalog.json',catalog);
  await assert.rejects(coachBuildQueue(f.workspace),/omits pending/);
});

test('malformed or unscoped build records cannot inflate implementation progress',async t => {
  const f=await fixture(t);
  for (const mutate of [r=>r.claims.push({id:'C9999',scope:'Unknown'}),r=>r.claims.push(r.claims[0]),
    r=>r.claims[0].scope='',r=>r.focusedChecks=[],r=>r.deferredChecks=[],
    r=>r.inputHashes[f.own]='not-a-hash',r=>delete r.inputHashes[f.own]]) {
    const record=structuredClone(f.record);mutate(record);await f.put(f.recordPath,record);
    await assert.rejects(coachBuildStatus(f.workspace));
  }
});

test('build fingerprints reject traversal, absolute paths and game/evidence inputs',async t => {
  const f=await fixture(t);
  for (const name of ['../outside.mjs',path.resolve(f.workspace,'outside.mjs'),
    'research/datasets/game.json','research/runs/old/results.json','research/experiments/E020-baseline/evidence/results.json']) {
    const record=structuredClone(f.record);record.inputHashes[name]=hash('x');await f.put(f.recordPath,record);
    await assert.rejects(coachBuildStatus(f.workspace),/path|outside|dataset\/evidence/);
  }
});
