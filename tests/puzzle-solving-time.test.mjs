import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {normalizeProgress, ProgressStore} from '../lib/learning/progress.js';

async function setup(t) {
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'});
  const puzzle={id:'time',fen:new Chess().fen(),solution:['e2e4'],rating:1200,themes:['fork']};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
  let now=0,fail=false;
  t.mock.method(dom.window.performance,'now',()=>now);
  const data={},storage={async get(key){return {[key]:structuredClone(data[key])};},async set(value){now+=10000;if(fail)throw Error('Unavailable');Object.assign(data,structuredClone(value));}};
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>({moveAnim:false}),makePiece:()=>dom.window.document.createElement('span')});
  t.after(async()=>{fail=false;await w.close();dom.window.close();});await w.open();
  return {w,puzzle,data,storage,advance:ms=>{now+=ms;},fail:value=>{fail=value;}};
}

test('puzzle time counts thinking, hints and retries, excluding storage, completed boards and the overview',async t=>{
  const {w,puzzle,data,storage,advance}=await setup(t);
  advance(60000);await w.startPuzzleSelection([puzzle]);
  advance(1250);await w.hintPuzzle();
  assert.equal(data['learning:v1'].puzzleTimeMs,1250);
  advance(750);await w.submitPuzzle('d2d4');
  assert.equal(data['learning:v1'].puzzleTimeMs,2000);
  advance(1000);await w.submitPuzzle('e2e4');
  assert.equal(data['learning:v1'].puzzleTimeMs,3000);
  advance(60000);await w.navigate('puzzles');w.showStatistics('solve-puzzle');
  const timeCard=w.root.querySelector('.learn-stat-overview > div:last-child');
  assert.equal(timeCard.querySelector('dt').textContent,'Time spent');
  assert.equal(timeCard.querySelector('dd strong').textContent,'3s');
  assert.equal(timeCard.querySelector('.learn-stat-detail').textContent,'≈ 3s per attempt');
  advance(60000);await w.close();
  const reopened=new ProgressStore(storage);await reopened.load();
  assert.equal(reopened.value.puzzleTimeMs,3000);
});

test('leaving an unfinished puzzle saves time and failed writes retry without double counting',async t=>{
  const {w,puzzle,data,advance,fail}=await setup(t);
  await w.startPuzzleSelection([puzzle]);advance(2300);fail(true);
  await w.hintPuzzle();assert.equal(w.failedChanges.length,1);
  fail(false);await w.retrySave();await w.retrySave();
  assert.equal(data['learning:v1'].puzzleTimeMs,2300);
  advance(700);await w.navigate('puzzles');
  assert.equal(data['learning:v1'].puzzleTimeMs,3000);
  advance(60000);await w.startPuzzleSelection([puzzle]);advance(500);await w.close();
  assert.equal(data['learning:v1'].puzzleTimeMs,3500);
  assert.equal(data['learning:v1'].puzzles.time?.attempts||0,0);
});

test('old progress starts with zero time and invalid saved durations are ignored',()=>{
  for(const puzzleTimeMs of [undefined,null,-1,NaN,Infinity,'100'])assert.equal(normalizeProgress({schema:1,puzzleTimeMs}).puzzleTimeMs,0);
  assert.equal(normalizeProgress({schema:1,puzzleTimeMs:3723000}).puzzleTimeMs,3723000);
});
