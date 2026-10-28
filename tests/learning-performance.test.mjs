import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {PuzzleLibrary} from '../lib/learning/puzzle-library.js';
import {pickRunPuzzle} from '../lib/learning/puzzle-runs.js';
import {loadLearningWorkspace} from '../lib/learning-loader.js';
import {app, loadGame, deferred} from './helpers/app.mjs';

test('cached puzzle selection follows in-place filter changes without sharing mutable result arrays', () => {
  const library = new PuzzleLibrary(), puzzles = [
    {id:'a',rating:900,themes:['fork']}, {id:'b',rating:1400,themes:['pin']},
    {id:'c',rating:1600,themes:['fork','pin']},
  ], themes = new Set(), range = [800,1500];
  const ids = () => library.matching(puzzles,range,themes).map(p => p.id);
  assert.deepEqual(ids(),['a','b']);
  themes.add('fork'); assert.deepEqual(ids(),['a']);
  range[1] = 1700; assert.deepEqual(ids(),['a','c']);
  const result = library.matching(puzzles,range,themes); result.pop();
  assert.deepEqual(ids(),['a','c']);
  themes.clear(); assert.deepEqual(ids(),['a','b','c']);
  puzzles.push({id:'d',rating:1000,themes:[]}); assert.equal(library.count(puzzles,range,themes),4);
  assert.equal(library.count([puzzles[0]],range,themes),1);
});

test('bounds and active-puzzle reads avoid repeated full-library scans and refresh after append', () => {
  const library = new PuzzleLibrary(); let reads = 0;
  const puzzles = Array.from({length:200000},(_,i)=>({get id(){reads++;return String(i);},rating:i%3001,themes:[],solution:['e2e4']}));
  assert.deepEqual(library.bounds(puzzles),[0,3000]);
  const last = library.find(puzzles,'199999'), firstReads = reads;
  for (let i=0;i<50;i++) assert.equal(library.find(puzzles,'199999'),last);
  assert.equal(reads,firstReads);
  puzzles.push({id:'new',rating:3221,themes:[]});
  assert.equal(library.find(puzzles,'new'),puzzles.at(-1));
  assert.deepEqual(library.bounds(puzzles),[0,3250]);
  const bounds=library.bounds(puzzles);bounds[0]=-1;
  assert.equal(library.bounds(puzzles)[0],0);
  assert.equal(pickRunPuzzle(puzzles,[],'timeAttack',()=>0).rating,410);
});

test('review startup defers learning content and exercise rules until learning opens', async () => {
  const seen = new Set();
  async function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const source=await readFile(new URL('../'+file,import.meta.url),'utf8');
    for (const match of source.matchAll(/^(?:import|export)\s+[^\n]*?from\s*['"](\.[^'"]+)['"]/gm)) {
      await visit(path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1])));
    }
  }
  await visit('analysis.js');
  assert.ok(seen.has('lib/learning/presentations.js'));
  assert.ok(!seen.has('lib/learning/workspace.js'));
  assert.ok(!seen.has('lib/learning/content.js'));
  assert.ok(![...seen].some(file=>file.includes('/rules/')));
  const first=loadLearningWorkspace();assert.equal(loadLearningWorkspace(),first);
  assert.equal(typeof (await first).LearningWorkspace,'function');
});

test('concurrent learning opens wait for one module load and a failed load can be retried', async t => {
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');
  const messages=[];a.replace('toast',message=>messages.push(message));a.context.console={warn(){}};
  a.replace('loadLearningWorkspace',async()=>{throw Error('Module unavailable');});
  await a.call('openLearning');assert.equal(a.run('openingLearning'),false);
  assert.equal(a.run('learningWorkspace'),null);assert.equal(messages.length,1);
  const pending=deferred();let loads=0,opens=0;
  a.replace('loadLearningWorkspace',()=>{loads++;return pending.promise;});
  const first=a.call('openLearning'),second=a.call('openLearning');assert.equal(loads,1);
  pending.resolve({LearningWorkspace:class {async open(){opens++;}}});
  await Promise.all([first,second]);assert.equal(opens,1);assert.equal(a.run('openingLearning'),false);
});

test('changing the reviewed game while the learning module loads cancels the old entry request', async t => {
  const a=app(t);loadGame(a,'1. e4');a.call('computeDerived');a.call('buildUI');
  const pending=deferred();let opens=0;
  a.replace('loadLearningWorkspace',()=>pending.promise);
  const opening=a.call('openLearning');loadGame(a,'1. d4');
  pending.resolve({LearningWorkspace:class {async open(){opens++;}}});
  await opening;assert.equal(opens,0);assert.equal(a.run('learningWorkspace'),null);
  assert.equal(a.run('openingLearning'),false);
});
