import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, readFile, stat, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {packagePuzzles} from '../scripts/package-puzzles.mjs';
import {loadPuzzleData} from '../lib/learning/puzzle-library.js';

test('store packages retain all 50,000 puzzles and metadata in JSON files below the validator limit', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'chess-review-puzzle-package-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  const dataDir = path.join(directory, 'data/learning'); await mkdir(dataDir, {recursive:true});
  const source = new URL('../data/learning/puzzles.json', import.meta.url);
  await copyFile(source, path.join(dataDir, 'puzzles.json'));
  const original = await readFile(source), expected = JSON.parse(original);
  const record = await packagePuzzles(directory);
  assert.equal(record.count, 50_000); assert.ok(record.parts > 1);
  assert.equal(record.sourceSha256, createHash('sha256').update(original).digest('hex'));
  const packaged = await loadPuzzleData(file => path.join(directory, file), async file => ({
    ok:true, json:async () => JSON.parse(await readFile(file, 'utf8')),
  }));
  assert.deepEqual(packaged.puzzles, expected.puzzles, 'Order, puzzle IDs, positions, solutions and ratings must remain identical');
  for (const key of Object.keys(expected).filter(key => key !== 'puzzles')) assert.deepEqual(packaged[key], expected[key]);
  for (const [file, hash] of Object.entries(record.files)) {
    const target = path.join(directory, file);
    assert.ok((await stat(target)).size < 5 * 1024 * 1024);
    assert.equal(createHash('sha256').update(await readFile(target)).digest('hex'), hash);
  }
  // The source artifact remains readable without first running a build.
  const plain = await loadPuzzleData(file => file, async () => ({ok:true, json:async () => JSON.parse(original)}));
  assert.deepEqual(plain, expected);
});

function library(index, parts = {}) {
  return loadPuzzleData(file => file, async file => {
    const value = file.endsWith('/puzzles.json') ? index : parts[file.split('/').at(-1)];
    return {ok:value !== undefined, json:async () => structuredClone(value)};
  });
}

for (const broken of [
  {schema:2, puzzles:[{id:'one'}]},
  {schema:1, puzzleCount:1, puzzleFiles:[]},
  {schema:1, puzzleCount:1, puzzleFiles:['../outside.json']},
  {schema:1, puzzleCount:1, puzzleFiles:['puzzles-001.json', 'puzzles-001.json']},
  {schema:1, puzzleCount:2, puzzleFiles:['puzzles-001.json']},
]) {
  test('incomplete or invalid packaged libraries cannot start a partial puzzle session: ' + JSON.stringify(broken), async () => {
    await assert.rejects(library(broken, {'puzzles-001.json':[{id:'one'}]}), /unsupported format/);
  });
}

test('a missing package part reports a load failure instead of silently dropping puzzles', async () => {
  await assert.rejects(library({schema:1, puzzleCount:1, puzzleFiles:['puzzles-001.json']}), /could not be read/);
});
