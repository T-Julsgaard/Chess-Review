import test from 'node:test';
import assert from 'node:assert/strict';
import {app,settle} from './helpers/app.mjs';
import {Chess} from '../lib/chess.js';

const FEN='r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
function position(t,query='') {
  const a=app(t,{url:'https://extension.test/analysis.html?workspace=position'+query});
  a.replace('resetSettingsForRelease',async()=>{});
  a.replace('requestLiveEval',async()=>{});
  return a;
}

test('a position launch opens the editor on the real board with no game or engine work',async t=>{
  const a=position(t),calls=[];
  a.replace('loadBook',async()=>{calls.push('book');});a.replace('loadCalibration',async()=>{calls.push('calibration');});a.replace('startAnalysis',()=>{calls.push('engine');});
  await a.start();
  const doc=a.dom.window.document;
  assert.deepEqual(calls,[]);assert.equal(a.state.blank,true);assert.equal(a.state.position.editing,true);
  assert.ok(doc.querySelector('#canvas .position-editor'));assert.ok(doc.querySelector('#canvas').classList.contains('position-editing'));
  assert.equal(doc.querySelectorAll('.board .sq').length,64);assert.equal(doc.querySelectorAll('.board .piece-img').length,32);
  assert.equal(doc.title,'Set up position — Chess Review');
});

test('a supplied position opens in the editor, and a broken one falls back with a message',async t=>{
  const a=position(t,'&flipped=1&fen='+encodeURIComponent(FEN));await a.start();
  assert.equal(a.state.positions[0].fen,FEN);assert.equal(a.state.flipped,true);
  const b=position(t,'&fen=nonsense');await b.start();
  assert.equal(b.state.positions[0].fen,new Chess().fen());
});

test('analyzing hands the position to the real review panels',async t=>{
  const a=position(t,'&fen='+encodeURIComponent(FEN)),searches=[];
  a.replace('requestLiveEval',async()=>{searches.push(a.state.variation.positions[a.state.variation.idx].fen);});
  a.replace('loadBook',async()=>{});a.replace('loadCalibration',async()=>{});
  await a.start();
  a.call('analyzePosition',FEN);await settle();
  const doc=a.dom.window.document;
  assert.equal(doc.querySelector('.position-editor'),null);assert.equal(doc.querySelector('#canvas').classList.contains('position-editing'),false);
  assert.equal(a.state.blank,false);assert.equal(a.state.analysisMode,true);assert.equal(a.state.total,0);assert.deepEqual(searches,[FEN]);
  assert.match(doc.querySelector('#reviewMount .ip-text').textContent,/White to move/);
  assert.equal(doc.querySelector('.controls .position-edit').textContent,'Edit');
  assert.equal(doc.querySelector('.position-summary-fen').textContent,FEN);
  assert.match(doc.querySelector('.position-moves-empty').textContent,/Play a move/);
  assert.equal(doc.querySelector('[aria-label="Share game (copy link)"]').hidden,true);
  assert.equal(doc.querySelector('[aria-label="Flip board"]').hidden,false);
  assert.match(a.dom.window.location.search,/analyze=1/);
});

test('moves build a line in the move list, and going back stays in the position',async t=>{
  const a=position(t,'&analyze=1&fen='+encodeURIComponent(FEN));
  a.replace('loadBook',async()=>{});a.replace('loadCalibration',async()=>{});a.replace('requestLiveEval',async()=>a.call('refreshVariation'));
  await a.start();
  a.call('applyUserMove','f1','c4',false);a.call('applyUserMove','g8','f6',false);await settle();
  const doc=a.dom.window.document,cells=()=>[...doc.querySelectorAll('.ml-move[data-ply]')];
  assert.equal(cells().length,2);assert.ok(cells()[1].classList.contains('current'));
  a.call('navPrev');await settle();a.call('navPrev');await settle();
  assert.equal(a.state.analysisMode,true);assert.equal(a.state.variation.idx,0);assert.equal(a.call('activePos').fen,FEN);
  assert.equal(doc.querySelector('.controls .position-edit').textContent,'Edit');
  a.call('navPrev');assert.equal(a.state.variation.idx,0);
  cells()[0].click();await settle();assert.equal(a.state.variation.idx,1);
});

test('Edit returns the displayed position to the editor and stops the search',async t=>{
  const a=position(t,'&analyze=1&fen='+encodeURIComponent(FEN));
  a.replace('loadBook',async()=>{});a.replace('loadCalibration',async()=>{});
  await a.start();
  a.call('applyUserMove','f1','c4',false);await settle();
  const fen=a.call('activePos').fen,doc=a.dom.window.document;
  doc.querySelector('.controls .position-edit').click();await settle();
  assert.equal(a.state.blank,true);assert.equal(a.state.analysisMode,false);assert.equal(a.state.variation,null);
  assert.equal(doc.querySelector('.position-fen').value,fen);
});

test('engine setting changes search the position again instead of starting a game batch',async t=>{
  const a=position(t,'&analyze=1&fen='+encodeURIComponent(FEN));let searches=0,batches=0;
  a.replace('loadBook',async()=>{});a.replace('loadCalibration',async()=>{});
  a.replace('requestLiveEval',async()=>{searches++;});a.replace('startAnalysis',()=>{batches++;});
  await a.start();searches=0;
  a.call('scheduleReanalyze');await settle();
  assert.equal(searches,1);assert.equal(batches,0);
});

test('opening a game replaces the position completely',async t=>{
  const a=position(t);
  a.replace('loadBook',async()=>{});a.replace('loadCalibration',async()=>{});a.replace('startAnalysis',()=>{});
  await a.start();
  await a.call('applyGame',{pgn:'1. e4 e5',meta:{},analysis:null});
  const doc=a.dom.window.document;
  assert.equal(a.state.position,null);assert.equal(doc.querySelector('.position-editor'),null);assert.equal(a.state.total,2);
  assert.equal(doc.querySelector('[aria-label="Share game (copy link)"]').hidden,false);
  assert.equal(doc.querySelector('.controls .position-edit'),null);
});

test('a review tab keeps its game and opens positions in a new tab',async t=>{
  const a=app(t,{url:'https://extension.test/analysis.html?workspace=blank'}),tabs=[];
  a.replace('resetSettingsForRelease',async()=>{});a.replace('loadBook',async()=>{});a.replace('loadCalibration',async()=>{});a.replace('startAnalysis',()=>{});
  await a.start();
  a.context.platformAPI.tabs={create:options=>{tabs.push(options);}};
  await a.call('applyGame',{pgn:'1. e4 e5',meta:{},analysis:null});
  a.dom.window.document.querySelector('[aria-label="Set up position"]').click();
  assert.equal(tabs.length,1);assert.match(tabs[0].url,/analysis\.html\?workspace=position&fen=/);
  assert.equal(a.state.pgn,'1. e4 e5');
});

test('the blank workspace turns into the editor in place and closes back',async t=>{
  const a=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease',async()=>{});
  await a.start();
  const doc=a.dom.window.document;
  doc.querySelector('[aria-label="Set up position"]').click();
  assert.ok(doc.querySelector('.position-editor'));
  doc.querySelector('.position-close').click();
  assert.equal(doc.querySelector('.position-editor'),null);assert.equal(a.state.position,null);assert.equal(a.state.blank,true);
});
