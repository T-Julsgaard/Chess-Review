import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {OPENINGS, linePositions} from '../lib/learning/content.js';

test('every expanded course exposes, navigates and resumes its added variations in either orientation',async t=>{
  const dom=new JSDOM('<div class="app"></div>',{url:'https://extension.test'});
  const saved={},storage={
    async get(key){return {[key]:structuredClone(saved[key])};},
    async set(values){Object.assign(saved,structuredClone(values));}
  };
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[{
    id:'opening-variation-fixture',fen:new Chess().fen(),solution:['e2e4'],rating:1200,themes:[]
  }]})}));
  const w=new LearningWorkspace({document:dom.window.document,storage,
    makePiece:()=>dom.window.document.createElement('img')});
  t.after(async()=>{await w.close();dom.window.close();});
  await w.open();await w.navigate('openings');
  const rows=[...w.root.querySelectorAll('.learn-library-row')];
  for(const o of OPENINGS){
    const row=rows.find(row=>row.querySelector('h3').textContent===o.title);
    assert.ok(row.textContent.includes(o.lines.length+' variations'),o.id);
  }
  for(const o of OPENINGS){
    await w.startOpening(o.id);
    w.root.querySelector('[data-focus="opening-variation"]').click();
    const options=w.dropdown.field.querySelectorAll('[role="option"]');
    assert.equal(options.length,o.lines.length,o.id);
    const index=o.lines.length-1,line=o.lines[index];
    options[index].click();await w.store.queue;
    assert.equal(w.activity.line,index,o.id);
    assert.equal(w.activity.ply,0,o.id);
    assert.equal(w.root.querySelectorAll('.learn-opening-moves button').length,line.moves.length,o.id);
    w.root.querySelector(`[data-focus="opening-move-${line.moves.length-1}"]`).click();
    await w.store.queue;
    assert.equal(w.currentFen(),linePositions(line).positions.at(-1),o.id);
    assert.equal(w.root.querySelector('.learn-opening-moves [aria-current="step"]').textContent,line.moves.at(-1),o.id);
    assert.equal(w.root.querySelector('.learn-opening-progress').textContent,`${line.moves.length} of ${line.moves.length} moves`,o.id);
    w.flipBoard();await w.store.queue;
    const resume=structuredClone(saved['learning:v1'].resume);
    assert.equal(resume.line,index,o.id);
    assert.equal(resume.ply,line.moves.length,o.id);
    await w.navigate('openings');await w.resume(resume);
    assert.deepEqual(w.activity,resume,o.id);
    assert.equal(w.flipped,o.defaultColor!=='b',o.id);
    assert.equal(w.currentFen(),linePositions(line).positions.at(-1),o.id);
  }
});
