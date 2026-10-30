import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {constants, zstdCompressSync} from 'node:zlib';
import {readPuzzleArchive} from '../scripts/puzzle-archive.mjs';

const frame = text => zstdCompressSync(Buffer.from(text));
function metadata(text, variant = 0) {
  const payload = Buffer.from(text), header = Buffer.alloc(8);
  header.writeUInt32LE(0x184d2a50 + variant); header.writeUInt32LE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

test('bounded puzzle archives decode every concatenated frame across arbitrary download chunks', async () => {
  const input = Buffer.concat([metadata('header'), frame('first,row\nsecond,'),
    metadata('between frames', 15), frame('row\nthird,row\n')]);
  const chunks = Array.from({length: Math.ceil(input.length / 7)}, (_, i) => input.subarray(i * 7, (i + 1) * 7));
  const archive = await readPuzzleArchive(Readable.from(chunks), input.length);
  assert.equal(archive.bytes, input.length);
  assert.equal([...archive.frames()].map(b => b.toString()).join(''), 'first,row\nsecond,row\nthird,row\n');
});

test('a bounded prefix retains completed frames before a truncated trailing frame', async () => {
  const input = Buffer.concat([frame('complete,row\n'), frame('unfinished,row\n').subarray(0, 10)]);
  const archive = await readPuzzleArchive(Readable.from([input]), input.length);
  assert.ok([...archive.frames()].map(b => b.toString()).join('').startsWith('complete,row\n'));
});

test('puzzle archive downloads reject over-budget data', async () => {
  await assert.rejects(readPuzzleArchive(Readable.from([Buffer.alloc(8), Buffer.alloc(8)]), 15), /download budget/);
});

test('corrupt frames and oversized metadata fail rather than being treated as valid puzzle data', async () => {
  const corrupt = await readPuzzleArchive(Readable.from([Buffer.from('not a Zstd archive')]), 64);
  assert.throws(() => [...corrupt.frames()]);
  const header = metadata(''); header.writeUInt32LE(1024 * 1024, 4);
  const oversized = await readPuzzleArchive(Readable.from([header]), 64);
  assert.throws(() => [...oversized.frames()], /metadata size/);
});

test('bounded downloads retain all completed rows at different trailing-frame cutoffs', async () => {
  const complete=frame('complete,row\n'), trailing=frame('another,row\nfinal,row\n');
  for (let cutoff=1;cutoff<trailing.length;cutoff++) {
    const input=Buffer.concat([complete,trailing.subarray(0,cutoff)]);
    const archive=await readPuzzleArchive(Readable.from([input]),input.length);
    assert.ok([...archive.frames()].map(chunk=>chunk.toString()).join('').startsWith('complete,row\n'), 'cutoff '+cutoff);
  }
});

test('prefix decoding still rejects a corrupt checksum in a complete frame', async () => {
  const corrupt=zstdCompressSync(Buffer.from('complete,row\n'), {params:{[constants.ZSTD_c_checksumFlag]:1}});
  corrupt[corrupt.length-1]^=0xff;
  const archive=await readPuzzleArchive(Readable.from([corrupt]),corrupt.length);
  assert.throws(()=>[...archive.frames()]);
});
