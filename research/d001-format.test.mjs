import test from 'node:test';
import assert from 'node:assert/strict';
import {zstdCompressSync} from 'node:zlib';
import {candidate, selectGames, hash, seed, historicalRevision, pinnedFiles, decodeFragment, createReconstruction, scanFragment, validateReconstruction} from './d001-format.mjs';
import {fetchFragment} from './datasets/D001-public-baseline/reconstruct.mjs';

// Authored PGNs and identities; no observed game data or human labels.
const line = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0';
function pgn(i, rating = 1600) {
  return `[Event "Rated Blitz game"]\n[Site "https://lichess.org/${String(i).padStart(8, '0')}"]\n[White "synthetic-w-${i}"]\n[Black "synthetic-b-${i}"]\n[WhiteElo "${rating}"]\n[BlackElo "${rating}"]\n[UTCDate "2026.06.01"]\n[Result "1-0"]\n[TimeControl "180+2"]\n\n${line}\n\n`;
}

test('historical selection reconstructs balanced splits and byte locators after Unicode', () => {
  const texts = [800, 1200, 1600, 2000, 2400].flatMap((rating, band) =>
    Array.from({length: 20}, (_, i) => pgn(band * 100 + i + 1, rating)));
  texts[0] = texts[0].replace('1. e4', '{Authored Unicode: æ棋} 1. e4');
  const decoded = Buffer.from(texts.join('') + pgn(9999)), state = createReconstruction();
  scanFragment(state, decoded, '2026-06', 0, {sha256: 'a'.repeat(64)});
  assert.equal(state.completeRecords, 100); // The trailing unbounded record is discarded.
  const selected = selectGames(state.reservoirs, 100, seed).games;
  assert.deepEqual(Object.fromEntries(['train', 'validation', 'test'].map(s => [s, selected.filter(g => g.split === s).length])),
    {train: 70, validation: 15, test: 15});
  assert.equal(new Set(selected.flatMap(g => g.players.map(p => p.id))).size, 200);
  for (const row of state.reservoirs.flatMap(r => r.rows)) {
    const raw = decoded.subarray(row.locator.start, row.locator.end);
    assert.equal(hash(raw), row.locator.sha256);
    assert.equal(raw.toString(), row.pgn);
  }
  assert.equal(candidate(pgn(1).replace('Rated Blitz', 'Casual Blitz'), seed), null);
  assert.equal(candidate(pgn(1).replace('"1600"', '"1600?"'), seed), null);
});

test('raw hash, frame length, PZstandard header and truncated compressed data are enforced', () => {
  const plain = Buffer.from(pgn(1)), compressed = zstdCompressSync(plain);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x184d2a50); header.writeUInt32LE(4, 4); header.writeUInt32LE(compressed.length, 8);
  const raw = Buffer.concat([header, compressed]), frame = {bytes: raw.length, sha256: hash(raw)};
  assert.deepEqual(decodeFragment(raw, frame), plain);
  assert.throws(() => decodeFragment(raw, {...frame, sha256: '0'.repeat(64)}), /hash\/size/);
  const bad = Buffer.from(raw); bad.writeUInt32LE(compressed.length + 1, 8);
  assert.throws(() => decodeFragment(bad, {bytes: bad.length, sha256: hash(bad)}), /PZstandard/);
  const truncated = compressed.subarray(0, compressed.length - 1);
  assert.throws(() => decodeFragment(truncated, {bytes: truncated.length, sha256: hash(truncated)}));
});

test('ranged acquisition rejects redirects, ignored ranges, oversized/truncated and changed bytes', async () => {
  const raw = Buffer.from('synthetic'), frame = {url: 'https://data.example/archive', start: 10, end: 18,
    archiveBytes: 100, bytes: raw.length, sha256: hash(raw)};
  function response(bytes = raw, status = 206, range = 'bytes 10-18/100', url = frame.url) {
    const r = new Response(bytes, {status, headers: {'content-range': range}});
    Object.defineProperty(r, 'url', {value: url}); return r;
  }
  const fetcher = async (url, options) => {
    assert.equal(url, frame.url); assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Range, 'bytes=10-18'); return response();
  };
  assert.deepEqual(await fetchFragment(frame, fetcher), raw);
  for (const r of [response(raw, 200), response(raw, 206, 'bytes 0-8/100'), response(raw, 206, 'bytes 10-18/100', 'https://other.example/')])
    await assert.rejects(fetchFragment(frame, async () => r), /range response/);
  await assert.rejects(fetchFragment(frame, async () => response(Buffer.concat([raw, raw]))), /byte bound/);
  await assert.rejects(fetchFragment(frame, async () => response(raw.subarray(1))), /hash\/size/);
  await assert.rejects(fetchFragment(frame, async () => response(Buffer.from('different'))), /hash\/size/);
});

test('retained provenance rejects an unbound reconstruction before any raw acquisition', () => {
  const manifest = {sourceRecord: 'source', normalized: 'games', provenance: {reconstruction: {record: 'record', locators: 'locators', codeSha256: {}}}};
  const records = new Map([['source', {}], ['games', []], ['record', {result: {passed: false}}]]);
  assert.throws(() => validateReconstruction(manifest, records, {}), /binding differs/);
});

test('offline admission binds every locator, frame, input and method to the retained proof', () => {
  // A synthetic metadata inventory checks admission; it is not a claim of raw-game verification.
  const games = Array.from({length: 2000}, (_, i) => ({id: String(i).padStart(8, '0'), sourceMonth: '2026-06'}));
  const sources = {datasetSha256: hash(games.map(g => JSON.stringify(g)).join('\n') + '\n'),
    sources: ['2026-06', '2026-07', '2026-08'].map(month => ({month, frames: Array.from({length: 20}, () => ({sha256: 'a'.repeat(64)}))}))};
  const inputHashes = {source: 'b'.repeat(64), games: 'c'.repeat(64)};
  const locators = {schema: 'd001-raw-locators-v1', inputHashes,
    entries: games.map(g => ({gameId: g.id, month: g.sourceMonth, frame: 0, start: 10, end: 20, sha256: 'd'.repeat(64)}))};
  const codeSha256 = Object.fromEntries(pinnedFiles.map(n => [n, 'e'.repeat(64)]));
  const result = {schema: 'd001-reconstruction-v1', passed: true, seed, historicalRevision, inputHashes,
    exactNormalizedRebuild: true, individualRawMembership: true, engineSearches: 0, modelFits: 0, games: 2000,
    splits: {train: 1400, validation: 300, test: 300}, normalizedJsonlSha256: sources.datasetSha256,
    locatorsDecodedSha256: hash(JSON.stringify(locators) + '\n'), completeRecords: 3000,
    frames: sources.sources.flatMap(s => s.frames.map((f, i) => ({month: s.month, frame: i,
      compressedSha256: f.sha256, decodedSha256: 'f'.repeat(64), decodedBytes: 100, completeRecords: 50})))};
  const manifest = {sourceRecord: 'source', normalized: 'games', provenance: {reconstruction: {record: 'record', locators: 'locators', codeSha256}}};
  const records = new Map([['source', sources], ['games', games], ['locators', locators], ['record', {result, codeSha256}]]);
  assert.equal(validateReconstruction(manifest, records, inputHashes), true);
  for (const change of [l => {l.entries[0].end = 101;}, l => {l.entries[0].month = '2026-09';}, l => {l.entries[0].gameId = 'Unknown1';}]) {
    const changed = structuredClone(locators); change(changed);
    const proof = structuredClone(records.get('record')); proof.result.locatorsDecodedSha256 = hash(JSON.stringify(changed) + '\n');
    const altered = new Map(records); altered.set('locators', changed); altered.set('record', proof);
    assert.throws(() => validateReconstruction(manifest, altered, inputHashes), /locator binding/);
  }
  const altered = new Map(records), proof = structuredClone(records.get('record'));
  proof.result.frames[0].compressedSha256 = '0'.repeat(64); altered.set('record', proof);
  assert.throws(() => validateReconstruction(manifest, altered, inputHashes), /frame binding/);
  assert.throws(() => validateReconstruction(manifest, records, {...inputHashes, games: '0'.repeat(64)}), /binding/);
});
