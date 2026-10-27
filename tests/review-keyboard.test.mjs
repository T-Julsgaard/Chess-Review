import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame,settle} from './helpers/app.mjs';
function review(t,pgn='1. e4 e5'){const a=app(t);loadGame(a,pgn);a.call('computeDerived');a.call('buildUI');a.call('renderAll');a.replace('requestLiveEval',()=>{});return a;}
test('review navigation clears leftover Feedback focus after returning from its tab',t=>{
  const a=review(t),doc=a.dom.window.document,feedback=doc.querySelector('.feedback-floating');
  for(const [key,idx] of [['ArrowRight',1],['ArrowLeft',0],['End',2],['Home',0]]){
    feedback.focus();assert.equal(doc.activeElement,feedback);
    const event=new a.dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});
    feedback.dispatchEvent(event);
    assert.equal(a.state.idx,idx);assert.equal(doc.activeElement,doc.body);assert.equal(event.defaultPrevented,true);
  }
});

test('clicking Accuracy tabs or moves leaves arrows reviewing the game without a tab focus frame',t=>{
  const a=review(t,'1. e4 e5 2. Nf3 Nc6'),doc=a.dom.window.document;
  for(const page of [0,1,2]) {
    const button=doc.querySelector('#accuracy-tab-'+page);
    button.focus();button.click();
    assert.equal(doc.activeElement,doc.body);
    doc.querySelector('.ml-move[data-ply="1"]').click();
    for(const [key,idx] of [['ArrowRight',2],['ArrowLeft',1],['End',4],['Home',0]]) {
      doc.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
      assert.equal(a.state.idx,idx);assert.equal(a.state.accuracyPage,page);
      assert.equal(doc.activeElement,doc.body);
    }
  }
});

test('review has no typed move field and Tab does not traverse review sections',async t=>{
  const a=review(t),doc=a.dom.window.document;
  assert.equal(doc.querySelector('.review-move-entry'),null);
  a.state.practice={spots:[1],i:0,solving:true};a.call('renderEngineCurrent');assert.equal(doc.querySelector('.review-move-entry'),null);a.state.practice=null;
  const event=()=>new a.dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});
  const mainTab=event();doc.body.dispatchEvent(mainTab);assert.equal(mainTab.defaultPrevented,true);
  await a.call('toggleSettings');const settingsTab=event();doc.querySelector('.set-tab').dispatchEvent(settingsTab);assert.equal(settingsTab.defaultPrevented,false);
  assert.ok([...doc.querySelectorAll('.lib-tab,.lc-open,.lc-fav,.engine-line.clickable')].every(n=>n.tabIndex===-1));
});
test('promotion picker supports cancellation and explicit rook selection',t=>{
  const a=review(t,'[SetUp "1"]\n[FEN "8/k1P5/2K5/8/8/8/8/8 w - - 0 1"]\n\n1. Kb5'),doc=a.dom.window.document;
  a.call('applyUserMove','c7','c8',false);assert.ok(doc.querySelector('.promotion-picker'));assert.equal(doc.querySelector('.app').inert,true);
  doc.querySelector('.promotion-cancel').click();assert.equal(a.state.analysisMode,false);assert.equal(doc.querySelector('.promotion-picker'),null);
  a.call('applyUserMove','c7','c8',false);
  assert.equal(doc.querySelector('.promotion-picker').dataset.color,'w');
  const options=[...doc.querySelectorAll('.promotion-options button')];assert.equal(options.length,4);
  assert.deepEqual(options.map(n=>n.querySelector('img').dataset.piece),['wQ','wR','wB','wN']);assert.ok(options.every(n=>n.textContent===''));
  options[0].dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(doc.activeElement,options[1]);
  doc.querySelector('[aria-label="Promote to rook"]').click();assert.equal(a.state.variation.positions[1].promotion,'r');assert.equal(doc.querySelector('.app').inert,false);
});
test('different promotion does not silently replay the recorded mainline',t=>{
  const a=review(t,'[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=N');
  a.call('applyUserMove','a7','a8',false,'q');assert.equal(a.state.analysisMode,true);assert.equal(a.state.variation.positions[1].promotion,'q');
});

test('Black promotion uses only Black queen, rook, bishop and knight images',t=>{
  const a=review(t,'[SetUp "1"]\n[FEN "7k/8/8/8/8/8/p7/7K b - - 0 1"]\n\n1... a1=Q'),doc=a.dom.window.document;
  a.call('applyUserMove','a2','a1',false);
  assert.equal(doc.querySelector('.promotion-picker').dataset.color,'b');
  assert.deepEqual([...doc.querySelectorAll('.promotion-options img')].map(n=>n.dataset.piece),['bQ','bR','bB','bN']);
  doc.querySelector('[aria-label="Promote to knight"]').click();assert.equal(a.state.variation.positions[1].promotion,'n');
});
test('library toggle, game buttons, favorite focus and Escape form one keyboard workflow',async t=>{
  const a=review(t),doc=a.dom.window.document;const rec={id:'saved',pgn:'1. d4 d5',meta:{gameId:'saved'},myAcc:90,opName:'Opponent',fav:false};a.state.library=[rec];a.store.library=[structuredClone(rec)];a.call('renderLibrary');
  const toggle=doc.querySelector('.lib-tab'),panel=doc.querySelector('.lib-panel');assert.equal(toggle.tagName,'BUTTON');assert.equal(panel.inert,true);toggle.click();assert.equal(panel.inert,false);
  const open=doc.querySelector('.lc-open'),favorite=doc.querySelector('.lc-fav');assert.equal(open.tagName,'BUTTON');assert.equal(open.contains(favorite),false);favorite.focus();
  favorite.dispatchEvent(new a.dom.window.FocusEvent('focusout',{bubbles:true,relatedTarget:null}));
  favorite.click();await a.run('_libraryWriteQueue');
  assert.equal(a.store.library[0].fav,true);assert.equal(doc.activeElement.classList.contains('lc-fav'),true);assert.equal(a.state.pgn,'1. e4 e5');assert.equal(panel.inert,false);
  doc.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(panel.inert,true);assert.equal(doc.activeElement,toggle);
});

test('leaving the library collapses it after opening a game even while its card has focus',async t=>{
  const a=review(t),doc=a.dom.window.document;
  const rec={id:'saved',pgn:'1. d4 d5',meta:{gameId:'saved'},opName:'Opponent'};
  a.state.library=[rec];a.call('renderLibrary');a.replace('startAnalysis',()=>{});
  const rail=doc.querySelector('.library-rail'),panel=doc.querySelector('.lib-panel'),toggle=doc.querySelector('.lib-tab');
  rail.dispatchEvent(new a.dom.window.MouseEvent('mouseenter'));
  const open=doc.querySelector('.lc-open');open.focus();open.click();await settle();
  assert.equal(a.state.pgn,rec.pgn);assert.equal(doc.activeElement,open);
  assert.equal(a.state.libraryOpen,true);assert.equal(panel.inert,false);
  rail.dispatchEvent(new a.dom.window.MouseEvent('mouseleave'));
  assert.equal(a.state.libraryOpen,false);assert.equal(rail.classList.contains('open'),false);
  assert.equal(panel.inert,true);assert.equal(toggle.getAttribute('aria-expanded'),'false');
  a.call('renderLibrary');await settle();assert.equal(a.state.libraryOpen,false);
  rail.dispatchEvent(new a.dom.window.MouseEvent('mouseenter'));
  assert.equal(a.state.libraryOpen,true);assert.equal(panel.inert,false);
});
test('settings toggle updates retain control identity and Credits owns keyboard focus',async t=>{
  const a=review(t),doc=a.dom.window.document;await a.call('toggleSettings');[...doc.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Sound').click();
  const on=doc.querySelector('[data-setting="sound"][data-value="true"]');on.focus();on.click();await a.run('_settingsWriteQueue');await settle();assert.equal(doc.activeElement.dataset.setting,'sound');assert.equal(doc.activeElement.dataset.value,'true');
  const credits=doc.querySelector('[aria-label="Credits & attributions"]');credits.focus();a.call('openCredits');const card=doc.querySelector('.credits-card');assert.equal(card.getAttribute('aria-modal'),'true');assert.equal(card.contains(doc.activeElement),true);
  doc.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(a.state.idx,0);
  const last=[...card.querySelectorAll('button,a[href]')].at(-1);last.focus();last.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(doc.activeElement.getAttribute('aria-label'),'Close credits');
  doc.activeElement.click();assert.equal(doc.querySelector('.app').inert,false);assert.equal(doc.activeElement,credits);
});
