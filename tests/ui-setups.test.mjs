import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {app,loadGame,settle} from './helpers/app.mjs';
import {PANEL_DESIGNS} from '../lib/panel-designs.js';
import {UI_SETUPS,MODERN_LAYOUT} from '../lib/ui-setups.js';

const supplied = JSON.parse(fs.readFileSync(new URL('./fixtures/modern-panel-layout.json',import.meta.url),'utf8'));
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8,`${a} must equal ${b}`);
function review(t) {
  const a=app(t);loadGame(a,'1. e4 e5 2. Nf3 Nc6');
  Object.defineProperties(a.dom.window,{innerWidth:{value:1920,configurable:true},innerHeight:{value:919,configurable:true}});
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  return a;
}

test('Visual offers Old and Modern and selecting a setup preserves the review and other preferences',async t=>{
  const a=review(t),doc=a.dom.window.document;
  a.state.idx=3;a.state.settings.accent='#5a8bef';a.state.settings.engineDepth=18;
  a.replace('scheduleReanalyze',()=>{throw Error('UI setups must not reanalyze');});
  const before=JSON.stringify({pgn:a.state.pgn,idx:a.state.idx,evals:a.state.evals,acc:a.state.acc,classif:a.state.classif});
  a.call('toggleSettings');
  const section=()=>[...doc.querySelectorAll('.set-section')].find(n=>n.querySelector('.set-sect-head').textContent==='Premade UI setups');
  section().querySelector('.set-sect-head').click();
  assert.deepEqual([...section().querySelectorAll('[data-setting="uiSetup"]')].map(n=>n.textContent),['Old','Modern']);
  for(const value of ['old','modern','old']) {
    section().querySelector('[data-value="'+value+'"]').click();await settle();await a.run('_settingsWriteQueue');
    assert.equal(a.store.settings.uiSetup,value);
    assert.equal(section().querySelector('.on').dataset.value,value);
    for(const [key,design] of Object.entries(UI_SETUPS[value].designs))assert.equal(a.state.settings[key],design);
    assert.equal(a.state.layoutMode,UI_SETUPS[value].layoutMode);
    assert.equal(a.state.settings.accent,'#5a8bef');assert.equal(a.state.settings.engineDepth,18);
    assert.equal(JSON.stringify({pgn:a.state.pgn,idx:a.state.idx,evals:a.state.evals,acc:a.state.acc,classif:a.state.classif}),before);
  }
  for(const design of PANEL_DESIGNS)assert.equal(a.state.settings[design.setting],'original');
});

test('Modern reproduces every supplied box and scale, including the collapsed Accuracy baseline',async t=>{
  const a=review(t);
  assert.deepEqual(MODERN_LAYOUT,supplied.layout);
  await a.call('applyUiSetup','modern');
  assert.equal(a.state.settings.accuracyDesign,'phases');assert.equal(a.state.settings.movesDesign,'zoom20');
  for(const [key,box]of Object.entries(supplied.displayedLayout)) {
    for(const prop of ['x','y','w','h','scale'])near(a.state.layout[key][prop],box[prop]);
  }
  for(const [key,box]of Object.entries(supplied.layout))for(const prop of ['x','y','w','h','scale'])near(a.store.layout[key][prop],box[prop]);
  assert.equal(a.store.layoutMode,'custom');
});

test('Reset layout restores the active setup after edits and retains independently selected tab designs',async t=>{
  const a=review(t);
  for(const value of ['modern','old','modern']) {
    await a.call('applyUiSetup',value);
    const initial=structuredClone(a.state.layout),saved=structuredClone(a.store.layout);
    if(value==='old'){a.call('toggleReorganize');a.call('toggleReorganize');}
    a.state.layout.board.x+=60;a.state.layout.moves.w+=20;a.call('saveLayout');
    await a.call('setSetting','graphDesign','minimal');
    await a.call('resetLayout');
    assert.deepEqual(a.state.layout,initial);assert.deepEqual(a.store.layout,saved);
    assert.equal(a.state.settings.graphDesign,'minimal');assert.equal(a.state.settings.uiSetup,value);
    assert.equal(!!a.state._accReflow?.belowKeys.includes('engine'),value==='modern');
    a.call('fitViewport');await a.call('resetLayout');assert.deepEqual(a.state.layout,initial);
  }
});

test('Visual reset retains the chosen setup and restores its panel design combination',async t=>{
  const a=review(t);
  for(const value of ['modern','old']) {
    await a.call('applyUiSetup',value);await a.call('setSetting','accuracyDesign','dials');
    await a.call('setSetting','movesDesign','zoomed');await a.call('resetVisualSettings');
    assert.equal(a.state.settings.uiSetup,value);assert.equal(a.store.settings.uiSetup,value);
    for(const [key,design]of Object.entries(UI_SETUPS[value].designs))assert.equal(a.store.settings[key],design);
    assert.equal(a.state.layoutMode,UI_SETUPS[value].layoutMode);
  }
});

test('opening a saved Modern setup retains custom edits and missing layouts fall back to Modern',async t=>{
  const original=review(t);await original.call('applyUiSetup','modern');
  original.state.layout.moves.x+=16;await original.call('saveLayout',true);
  for(const withLayout of [true,false]) {
    const a=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
    a.replace('resetSettingsForRelease',async()=>{});
    Object.assign(a.store,structuredClone(original.store));
    if(!withLayout)delete a.store.layout;
    await a.start();
    assert.equal(a.state.settings.uiSetup,'modern');assert.equal(a.state.settings.movesDesign,'zoom20');
    assert.equal(a.state.layoutMode,'custom');
    near(a.state.layout.moves.x,MODERN_LAYOUT.moves.x+(withLayout?16:0));
    near(a.state.layout.accuracy.h,supplied.displayedLayout.accuracy.h);
    near(a.state.layout.engine.y,supplied.displayedLayout.engine.y);
    assert.deepEqual(a.call('setupLayout'),MODERN_LAYOUT);
  }
});
