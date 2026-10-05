import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {openResearchData, openResearchSource, sha256, validateRegistry, validateManifest, verifyArtifact} from './data-policy.mjs';

// Authored synthetic records exercise mechanics only; no real games or labels.
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'chess-research-policy-'));
  t.after(async () => {
    const resolved = await realpath(root), relative = path.relative(await realpath(tmpdir()), resolved);
    assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(resolved).startsWith('chess-research-policy-'));
    await rm(resolved, {recursive: true, force: true});
  });
  const save = async (name, value) => {
    const file = path.join(root, name); await mkdir(path.dirname(file), {recursive: true});
    await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value) + '\n');
  };
  await save('research/DATA_POLICY.md', 'Synthetic test policy\n');
  const evidence = 'research/datasets/evidence/test.md';
  await save(evidence, 'Synthetic test permission evidence\n');
  const archive = 'https://data.example/lichess_db_standard_rated_2026-06.pgn.zst';
  const registry = {schema: 'research-approved-sources-v1', policyVersion: 'public-data-v1', sources: [{
    id: 'synthetic-source', status: 'approved', public: true, freeToUse: true, license: 'CC0-1.0',
    publisher: 'Synthetic fixture', termsUrl: 'https://data.example/', verifiedOn: '2026-10-05',
    allowedPurposes: ['inspect', 'train', 'reuse'], evidence: {path: evidence, sha256: sha256(await readFile(path.join(root, evidence)))}, exports: [archive],
  }], datasets: [{id: 'D001', manifest: 'research/datasets/D001/manifest.json'}]};
  const game = {id: 'Fixture1', source: 'https://lichess.org/Fixture1', sourceMonth: '2026-06', date: '2026.06.01',
    split: 'train', moves: ['e2e4'], players: [{id: 'synthetic-player', color: 'w', rating: 1000}]};
  const sources = {license: 'CC0-1.0', licenseUrl: 'https://data.example/', sources: [{url: archive, month: '2026-06',
    license: 'CC0-1.0', frames: [{url: archive, start: 0, end: 9, bytes: 10, sha256: 'a'.repeat(64), retrievedAt: '2026-10-05', verification: 'Synthetic fixture'}]}]};
  const manifest = {schema: 'research-dataset-manifest-v1', id: 'D001', sourceIds: ['synthetic-source'], originFormat: 'lichess-month-v1',
    sourceRecord: 'inputs/sources.json', normalized: 'inputs/games.json', provenance: {status: 'legacy-partial',
      limitations: ['Synthetic fixture, no empirical claim'], replayRecipe: 'Authored fixture'}, artifacts: {}};
  const add = async (name, value, kind, parents) => {
    await save(name, value); const bytes = await readFile(path.join(root, name));
    manifest.artifacts[name] = {kind, parents, sha256: sha256(bytes), bytes: bytes.length, uncompressedSha256: sha256(bytes)};
  };
  await add(manifest.sourceRecord, sources, 'sources', []);
  await add(manifest.normalized, [game], 'games', [manifest.sourceRecord]);
  await add('inputs/derived.json', {games: [game], positions: [{gameId: game.id}]}, 'game-evidence', [manifest.normalized]);
  await add('inputs/ratings.json', {rows: [{gameId: game.id, playerId: 'synthetic-player', color: 'w', ratingTarget: 1000, split: 'train'}]}, 'rating-evidence', [manifest.normalized]);
  const flush = async () => {
    await save('research/datasets/approved-sources.json', registry); await save(registry.datasets[0].manifest, manifest);
  };
  await flush();
  return {root, registry, manifest, game, add, save, flush, open: options => openResearchData(['D001'], {root, ...options})};
}

test('approved hash-bound inputs return a receipt and per-game origin', async t => {
  const f = await fixture(t), data = await f.open({purpose: 'train'});
  assert.equal(data.receipt.datasets.D001.gameCount, 1);
  assert.equal(data.receipt.inputHashes[f.manifest.normalized], f.manifest.artifacts[f.manifest.normalized].sha256);
  assert.equal(data.gameOrigin('Fixture1').archiveUrl, f.registry.sources[0].exports[0]);
  assert.deepEqual(await data.readJson(f.manifest.normalized), [f.game]);
  assert.throws(() => data.gameOrigin('unknown'), /unregistered game/);
  await assert.rejects(data.readJson('inputs/unregistered.json'), /unregistered input/);
  await assert.rejects(data.readJson('../secret.json'), /unsafe artifact path/);
  await assert.rejects(openResearchData(['D002'], {root: f.root}), /unregistered dataset/);
  await assert.rejects(openResearchData([], {root: f.root}), /explicit unique dataset/);
});

test('public access, unknown licenses and mixed-source permission do not imply approval', async t => {
  const f = await fixture(t);
  for (const change of [{license: 'UNKNOWN'}, {license: 'CC-BY-NC-4.0'}, {public: false}, {freeToUse: false}, {status: 'pending'}]) {
    const registry = structuredClone(f.registry); Object.assign(registry.sources[0], change);
    assert.throws(() => validateRegistry(registry, 'train'), /unapproved\/incompatible/);
  }
  const mixed = structuredClone(f.registry);
  mixed.sources.push({...mixed.sources[0], id: 'unapproved-contributor', license: 'UNKNOWN'});
  assert.throws(() => validateRegistry(mixed, 'train'), /unapproved\/incompatible/);
  f.manifest.sourceIds.push('unregistered-contributor');
  assert.throws(() => validateManifest(f.manifest, f.registry), /unknown contributing source/);
  assert.throws(() => validateRegistry(f.registry, 'unknown'), /unknown use purpose/);
  assert.throws(() => validateRegistry(f.registry, 'test'), /unapproved\/incompatible/);
});

test('permission is checked before game parsing and retained evidence is hash-bound', async t => {
  const f = await fixture(t);
  await f.save(f.manifest.normalized, 'invalid game JSON');
  f.registry.sources[0].license = 'UNKNOWN'; await f.flush();
  await assert.rejects(f.open(), /unapproved\/incompatible/);
  f.registry.sources[0].license = 'CC0-1.0'; await f.flush();
  await f.save(f.registry.sources[0].evidence.path, 'Changed terms');
  await assert.rejects(f.open(), /permission evidence hash differs/);
});

test('unregistered parents, cycles, incomplete lineage and unsafe paths are rejected', async t => {
  const f = await fixture(t);
  for (const [parents, message] of [[['missing.json'], /unregistered parent/], [['inputs/derived.json'], /cyclic/], [[], /missing derivative lineage/]]) {
    const manifest = structuredClone(f.manifest); manifest.artifacts['inputs/derived.json'].parents = parents;
    assert.throws(() => validateManifest(manifest, f.registry), message);
  }
  const unsupported = structuredClone(f.manifest); unsupported.originFormat = 'guess-origin';
  assert.throws(() => validateManifest(unsupported, f.registry), /unsupported origin format/);
  for (const name of ['../outside.json', '/outside.json', 'C:/outside.json', 'inputs\\outside.json']) {
    const manifest = structuredClone(f.manifest); manifest.artifacts[name] = manifest.artifacts['inputs/derived.json'];
    assert.throws(() => validateManifest(manifest, f.registry), /unsafe artifact path/);
  }
});

test('altered origins and cached derivatives fail even with newly matched file hashes', async t => {
  const f = await fixture(t);
  const changed = {...f.game, sourceMonth: '2026-07'};
  await f.add(f.manifest.normalized, [changed], 'games', [f.manifest.sourceRecord]); await f.flush();
  await assert.rejects(f.open(), /unknown\/invalid game origin/);
  await f.add(f.manifest.normalized, [f.game], 'games', [f.manifest.sourceRecord]);
  await f.add('inputs/derived.json', {games: [{...f.game, moves: ['d2d4']}]}, 'game-evidence', [f.manifest.normalized]); await f.flush();
  await assert.rejects(f.open(), /derivative game origin differs/);
  await f.add('inputs/derived.json', {games: [f.game]}, 'game-evidence', [f.manifest.normalized]);
  await f.add('inputs/ratings.json', {rows: [{gameId: 'Unknown1', color: 'w'}]}, 'rating-evidence', [f.manifest.normalized]); await f.flush();
  await assert.rejects(f.open(), /unknown derivative rating origin/);
});

test('game copies and nested report references cannot hide unknown origins', async t => {
  const f = await fixture(t);
  await f.add('inputs/copy.json', [{...f.game, id: 'Unknown1'}], 'games', [f.manifest.normalized]); await f.flush();
  await assert.rejects(f.open(), /derivative game origin differs/);
  await f.add('inputs/copy.json', [f.game], 'games', [f.manifest.normalized]);
  await f.add('inputs/report.json', {predictions: [{gameId: 'Unknown1'}]}, 'summary', [f.manifest.normalized]); await f.flush();
  await assert.rejects(f.open(), /unknown summary game origin/);
});

test('changed bytes and changes after preflight cannot enter the guarded loader', async t => {
  const f = await fixture(t), data = await f.open();
  await f.save(f.manifest.normalized, [{...f.game, moves: ['d2d4']}]);
  await assert.rejects(data.readJson(f.manifest.normalized), /file hash\/size differs/);
  await assert.rejects(f.open(), /file hash\/size differs/);
  const decoded = Buffer.from('{"synthetic":true}'), bytes = gzipSync(decoded);
  const entry = {bytes: bytes.length, sha256: sha256(bytes), uncompressedSha256: sha256(decoded)};
  assert.deepEqual(verifyArtifact(bytes, entry, 'fixture.json.gz'), decoded);
  assert.throws(() => verifyArtifact(bytes, {...entry, uncompressedSha256: '0'.repeat(64)}, 'fixture.json.gz'), /decoded hash differs/);
});

test('acquisition bootstrap requires exact exports and permission before requesting data',async t=>{
  const f=await fixture(t);f.registry.sources[0].allowedPurposes.push('collect');await f.flush();
  const approved=f.registry.sources[0].exports[0];
  assert.equal((await openResearchSource(approved,{root:f.root})).sourceId,'synthetic-source');
  await assert.rejects(openResearchSource('https://data.example/unapproved.pgn.zst',{root:f.root}),/unregistered exact export/);
  await f.save(f.registry.sources[0].evidence.path,'Changed synthetic terms');
  await assert.rejects(openResearchSource(approved,{root:f.root}),/permission evidence hash differs/);
});
