import test from 'node:test';
import assert from 'node:assert/strict';
import {app,settle} from './helpers/app.mjs';

function blank(t) {const a=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});a.replace('resetSettingsForRelease',async()=>{});return a;}

test('blank startup creates no game, engine, opening-book or calibration work',async t=>{
  const a=blank(t),calls=[];
  a.replace('loadBook',async()=>{calls.push('book');});a.replace('loadCalibration',async()=>{calls.push('calibration');});
  a.replace('startAnalysis',()=>{calls.push('engine');});a.store.library=[{id:'saved',pgn:'1. e4 e5',opName:'Saved opponent'}];
  await a.start();
  assert.deepEqual(calls,[]);assert.equal(a.state.blank,true);assert.equal(a.state.pgn,'');assert.equal(a.state.analyzing,false);
  const doc=a.dom.window.document;assert.equal(doc.querySelector('#canvas').hidden,true);assert.ok(doc.querySelector('.workspace-home'));
  assert.equal(doc.title,'Chess Review');assert.equal(doc.querySelectorAll('[data-game-action]:not([hidden])').length,0);
  assert.ok(a.writes.every(write=>Object.keys(write).every(key=>!key.startsWith('job:')&&!key.startsWith('analysis:')&&key!=='learning:v1'&&key!=='library')));
  doc.querySelectorAll('.workspace-home-action')[1].click();assert.equal(a.state.libraryOpen,true);assert.equal(doc.activeElement.className,'lc-open');
});

test('ordinary missing jobs and arbitrary position-only PGNs remain rejected',async t=>{
  const a=app(t,{url:'https://extension.test/analysis.html'});await assert.rejects(a.call('loadJob'),/No analysis job/);
  const b=blank(t);await b.start();await assert.rejects(b.call('applyGame',{pgn:'*'}),/Load a game with moves/);
  assert.equal(b.state.blank,true);assert.equal(b.dom.window.document.querySelector('#canvas').hidden,true);
});

test('a saved game opened from blank becomes a review and survives reload in that tab',async t=>{
  const a=blank(t),calls=[];await a.start();
  a.replace('loadBook',async()=>{calls.push('book');});a.replace('loadCalibration',async()=>{calls.push('calibration');});a.replace('startAnalysis',()=>{calls.push('engine');});
  await a.call('applyGame',{pgn:'1. e4 e5',meta:{},analysis:null});
  assert.equal(a.state.blank,false);assert.equal(a.state.total,2);assert.equal(a.dom.window.document.querySelector('#canvas').hidden,false);
  assert.equal(a.dom.window.document.querySelector('.workspace-home').hidden,true);assert.deepEqual(calls,['book','calibration','engine']);
  assert.equal((await a.call('loadJob')).pgn,'1. e4 e5');
  const b=blank(t);assert.equal((await b.call('loadJob')).source,'blank');
});

test('reloading a blank-launch tab with a selected game loads its review data before rendering',async t=>{
  const a=blank(t),calls=[];a.dom.window.sessionStorage.setItem('job:blank-workspace',JSON.stringify({pgn:'1. d4 d5',meta:{}}));
  a.replace('loadBook',async()=>{calls.push('book');});a.replace('loadCalibration',async()=>{calls.push('calibration');});a.replace('startAnalysis',()=>{calls.push('engine');});
  await a.start();assert.equal(a.state.blank,false);assert.equal(a.state.pgn,'1. d4 d5');assert.deepEqual(calls,['book','calibration','engine']);
});

test('a later saved-game choice wins while blank review data is loading',async t=>{
  const a=blank(t);await a.start();let finish;const waiting=new Promise(resolve=>{finish=resolve;});
  a.replace('loadBook',()=>waiting);a.replace('loadCalibration',()=>waiting);a.replace('startAnalysis',()=>{});
  const first=a.call('applyGame',{pgn:'1. e4 e5',analysis:null});const second=a.call('applyGame',{pgn:'1. d4 d5',analysis:null});
  finish();await Promise.all([first,second]);assert.equal(a.state.pgn,'1. d4 d5');
});

test('game shortcuts and engine setting changes do not start work on a blank workspace',async t=>{
  const a=blank(t);await a.start();const {document,KeyboardEvent}=a.dom.window;
  for(const key of ['ArrowLeft','ArrowRight','Home','End','f'])document.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));
  const tab=new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});document.dispatchEvent(tab);assert.equal(tab.defaultPrevented,false);
  a.call('renderEngineCurrent');a.call('scheduleReanalyze');await a.call('startAnalysis');await settle();
  assert.equal(a.state.analyzing,false);assert.equal(a.state.evalEngines.length,0);assert.equal(a.state.flipped,false);assert.equal(a.state.autoTimer,null);
});

test('learning opens without a review board and returns to the blank workspace',async t=>{
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[{id:'sample',fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',solution:['f7f8'],rating:1200,themes:['mateIn1']}]})}));
  const a=blank(t);await a.start();const entry=a.dom.window.document.querySelector('.workspace-home-action');entry.focus();
  await a.call('openLearning');const w=a.run('learningWorkspace');
  assert.equal(w.ready,true);assert.equal(w.embedded,null);assert.equal(a.state.blank,true);assert.equal(a.state.analyzing,false);
  assert.ok(w.root.querySelector('.learn-theme-list'));assert.equal(w.root.querySelector('[data-focus=review]'),null);
  const toggle=a.dom.window.document.querySelector('#learningToggle');
  assert.equal(toggle.textContent,'Return to Game review');assert.notEqual(toggle.closest('.app').inert,true);
  assert.equal(entry.closest('.workspace-home').inert,true);
  assert.ok(w.root.classList.contains('learning-with-topbar'));
  let keyReached=false;toggle.addEventListener('keydown',()=>{keyReached=true;},{once:true});
  toggle.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(keyReached,true,'learning must allow keyboard activation of the top-bar button');
  await w.navigate('openings');assert.equal(w.page,'openings');assert.match(w.root.textContent,/Italian Game/);
  toggle.click();await w.close();assert.equal(a.run('learningWorkspace'),null);assert.equal(a.dom.window.document.activeElement,entry);
  assert.equal(toggle.textContent,'Learn with Chess review');assert.equal(entry.closest('.workspace-home').inert,false);
  assert.equal(a.dom.window.document.querySelector('#canvas').hidden,true);
});

test('a stored job cannot masquerade as the explicit no-game entry',async t=>{
  const a=app(t);a.replace('resetSettingsForRelease',async()=>{});a.replace('loadBook',async()=>{});a.replace('loadCalibration',async()=>{});
  const error=a.dom.window.document.createElement('div');error.id='error';error.hidden=true;a.dom.window.document.body.append(error);
  a.store['job:test-game']={source:'blank',pgn:'*',analysis:null};await a.start();
  assert.equal(a.state.blank,false);assert.equal(error.hidden,false);assert.match(error.textContent,/Load a game with moves/);
  assert.equal(a.dom.window.document.querySelector('.workspace-home'),null);
});
