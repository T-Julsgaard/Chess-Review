import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {app,loadGame,settle} from './helpers/app.mjs';
import {PANEL_DESIGNS} from '../lib/panel-designs.js';
import {UI_SETUPS,MODERN_LAYOUT} from '../lib/ui-setups.js';

const supplied = JSON.parse(fs.readFileSync(new URL('./fixtures/modern-panel-layout.json',import.meta.url),'utf8'));
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8,`${a} must equal ${b}`);
test('fresh workspaces default to Modern and retain it after reload', async t => {
  const a=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease',async()=>{});
  await a.start();
  assert.equal(a.state.settings.uiSetup,'modern');
  for(const [key,value] of Object.entries(UI_SETUPS.modern.designs))assert.equal(a.state.settings[key],value);
  assert.deepEqual(a.call('layoutForSave'),MODERN_LAYOUT);
  const b=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  b.replace('resetSettingsForRelease',async()=>{});Object.assign(b.store,structuredClone(a.store));
  await b.start();assert.equal(b.state.settings.uiSetup,'modern');
});
function review(t) {
  const a=app(t);loadGame(a,'1. e4 e5 2. Nf3 Nc6');
  Object.defineProperties(a.dom.window,{innerWidth:{value:1920,configurable:true},innerHeight:{value:919,configurable:true}});
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  return a;
}

test('Visual offers Old, Modern and Custom and selecting a setup preserves the review and other preferences',async t=>{
  const a=review(t),doc=a.dom.window.document;
  a.state.idx=3;a.state.settings.accent='#5a8bef';a.state.settings.engineDepth=18;
  a.replace('scheduleReanalyze',()=>{throw Error('UI setups must not reanalyze');});
  const before=JSON.stringify({pgn:a.state.pgn,idx:a.state.idx,evals:a.state.evals,acc:a.state.acc,classif:a.state.classif});
  a.call('toggleSettings');
  const section=()=>[...doc.querySelectorAll('.set-section')].find(n=>n.querySelector('.set-sect-head').textContent==='Interface presets');
  section().querySelector('.set-sect-head').click();
  assert.deepEqual([...section().querySelectorAll('[data-setting="uiSetup"]')].map(n=>n.textContent),['Old','Modern','Custom']);
  assert.equal(section().querySelector('.on').dataset.value,'custom');
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
  assert.equal(a.state.settings.graphDesign,'bars');
  assert.equal(a.state.settings.accuracyDesign,'phases-modern');assert.equal(a.state.settings.movesDesign,'zoom20');
  for(const [key,box]of Object.entries(supplied.displayedLayout)) {
    for(const prop of ['x','y','w','h','scale'])near(a.state.layout[key][prop],box[prop]);
  }
  for(const [key,box]of Object.entries(supplied.layout))for(const prop of ['x','y','w','h','scale'])near(a.store.layout[key][prop],box[prop]);
  assert.equal(a.store.layoutMode,'custom');
});

test('Modern omits the duplicate insight evaluation while other setups retain it',async t=>{
  const a=review(t),doc=a.dom.window.document;
  a.state.evals[1]={cp:72};a.call('go',1);
  assert.equal(doc.querySelector('.ip-eval').textContent,'+0.7');
  for(const setup of ['modern','old','modern']) {
    await a.call('applyUiSetup',setup);
    await a.call('setSetting','graphDesign','bars2');
    assert.equal(doc.querySelector('.evaluation-score').textContent,'+0.7');
    assert.equal(doc.querySelector('.ip-move').textContent,'e4');
    assert.equal(doc.querySelector('.ip-eval')?.textContent,setup==='modern'?undefined:'+0.7');
    a.call('go',2);a.call('go',1);
    assert.equal(doc.querySelector('.ip-eval')?.textContent,setup==='modern'?undefined:'+0.7');
  }
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
    assert.equal(a.state.settings.graphDesign,'minimal');assert.equal(a.state.settings.uiSetup,'custom');
    assert.equal(a.state.settings.uiSetupBase,value);
    assert.equal(!!a.state._accReflow?.belowKeys.includes('engine'),value==='modern');
    a.call('fitViewport');await a.call('resetLayout');assert.deepEqual(a.state.layout,initial);
  }
});

test('Visual reset always restores Modern designs and layout and preserves engine preferences',async t=>{
  const a=review(t);
  for(const value of ['modern','old','custom']) {
    await a.call('applyUiSetup',value);await a.call('setSetting','accuracyDesign','dials');
    a.state.settings.engineDepth=18;
    await a.call('setSetting','movesDesign','zoomed');await a.call('resetVisualSettings');
    assert.equal(a.state.settings.uiSetup,'modern');assert.equal(a.store.settings.uiSetup,'modern');
    assert.equal(a.state.settings.uiSetupBase,'modern');
    for(const [key,design]of Object.entries(UI_SETUPS.modern.designs))assert.equal(a.store.settings[key],design);
    assert.deepEqual(a.call('layoutForSave'),MODERN_LAYOUT);
    assert.equal(a.state.layoutMode,'custom');assert.equal(a.state.settings.engineDepth,18);
  }
});

test('opening a legacy Modern setup labels saved edits Custom and missing layouts fall back to Modern',async t=>{
  const original=review(t);await original.call('applyUiSetup','modern');
  original.state.layout.moves.x+=16;await original.call('saveLayout',true);
  delete original.store.settings.uiSetupBase;
  for(const withLayout of [true,false]) {
    const a=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
    a.replace('resetSettingsForRelease',async()=>{});
    Object.assign(a.store,structuredClone(original.store));
    if(!withLayout)delete a.store.layout;
    await a.start();
    assert.equal(a.state.settings.uiSetup,withLayout?'custom':'modern');assert.equal(a.state.settings.movesDesign,'zoom20');
    assert.equal(a.state.layoutMode,'custom');
    near(a.state.layout.moves.x,MODERN_LAYOUT.moves.x+(withLayout?16:0));
    near(a.state.layout.accuracy.h,supplied.displayedLayout.accuracy.h);
    near(a.state.layout.engine.y,supplied.displayedLayout.engine.y);
    assert.deepEqual(a.call('setupLayout'),MODERN_LAYOUT);
  }
});

test('saved Modern move lists adopt Zoom +20% once while preserving later choices and geometry', async t => {
  const original = review(t); await original.call('applyUiSetup', 'modern');
  original.store.settings.movesDesign = 'original'; delete original.store.settings.modernMovesVersion;
  original.store.layout.moves.w += 12;
  const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease', async () => {});
  Object.assign(a.store, structuredClone(original.store)); await a.start();
  assert.equal(a.state.settings.movesDesign, 'zoom20');
  assert.equal(a.store.settings.modernMovesVersion, 1);
  assert.equal(a.state.layout.moves.w, original.store.layout.moves.w);
  await a.call('setSetting', 'movesDesign', 'original');
  const b = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  b.replace('resetSettingsForRelease', async () => {});
  Object.assign(b.store, structuredClone(a.store)); await b.start();
  assert.equal(b.state.settings.movesDesign, 'original');
});

test('Modern move-list migration keeps individually selected zoomed designs', async t => {
  const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease', async () => {});
  a.store.settings = {uiSetup: 'modern', movesDesign: 'zoomed'};
  await a.start();
  assert.equal(a.state.settings.movesDesign, 'zoomed');
  assert.equal(a.store.settings.modernMovesVersion, 1);
  assert.equal(a.state.settings.uiSetup, 'custom');
});

test('saved Modern evaluations adopt Move bars once and preserve subsequent choices', async t => {
  const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease', async () => {});
  a.store.settings = {uiSetup: 'modern', graphDesign: 'original'};
  await a.start();
  assert.equal(a.state.settings.graphDesign, 'bars');
  assert.equal(a.store.settings.modernGraphVersion, 1);
  await a.call('setSetting', 'graphDesign', 'original');
  const b = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  b.replace('resetSettingsForRelease', async () => {});
  Object.assign(b.store, structuredClone(a.store)); await b.start();
  assert.equal(b.state.settings.graphDesign, 'original');
});

test('Modern evaluation migration retains individually chosen designs', async t => {
  const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease', async () => {});
  a.store.settings = {uiSetup: 'modern', graphDesign: 'timeline'};
  await a.start();
  assert.equal(a.state.settings.graphDesign, 'timeline');
  assert.equal(a.store.settings.modernGraphVersion, 1);
});

test('tab customization selects and persists Custom while unrelated preferences and no-op choices retain presets',async t=>{
  const a=review(t),doc=a.dom.window.document;
  a.call('toggleSettings');a.state.setOpen['Interface presets']=true;
  for(const preset of ['modern','old']) {
    await a.call('applyUiSetup',preset);
    await a.call('setSetting','accent','#5a8bef');a.call('fitViewport');
    a.call('toggleReorganize');a.call('toggleReorganize');
    await a.call('setSetting','engineDesign',UI_SETUPS[preset].designs.engineDesign);
    assert.equal(a.state.settings.uiSetup,preset);
    if(a.run('UI.settings.hidden'))a.call('toggleSettings');
    const layout=structuredClone(a.call('layoutForSave'));
    await a.call('setSetting','graphDesign','minimal');
    assert.equal(a.state.settings.uiSetup,'custom');
    assert.equal(a.store.settings.uiSetup,'custom');assert.equal(a.store.settings.uiSetupBase,preset);
    assert.equal(doc.querySelector('[data-setting="uiSetup"].on').dataset.value,'custom');
    assert.deepEqual(a.call('layoutForSave'),layout);
    await a.call('applyUiSetup','custom');
    assert.equal(a.state.settings.graphDesign,'minimal');assert.deepEqual(a.call('layoutForSave'),layout);
    await a.call('applyUiSetup',preset);
    assert.equal(a.state.settings.uiSetup,preset);assert.equal(a.store.settings.uiSetup,preset);
  }
});

test('completed panel moves and resizes select Custom; clicks and cancelled gestures retain the preset',async t=>{
  const a=review(t),win=a.dom.window,doc=win.document;
  const event=(target,type,x,y)=>{
    const e=new win.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});
    Object.defineProperty(e,'pointerId',{value:1});target.dispatchEvent(e);
  };
  const drag=(selector,x,y,end='pointerup')=>{
    const scale=a.run('canvasScale');
    event(doc.querySelector('[data-mod=moves] '+selector),'pointerdown',0,0);
    event(win,'pointermove',x*scale,y*scale);event(win,end,x*scale,y*scale);
  };
  for(const preset of ['modern','old'])for(const handle of ['.mod-handle','.mod-resize.se']) {
    await a.call('applyUiSetup',preset);a.call('toggleReorganize');
    const before=structuredClone(a.state.layout);
    drag(handle,0,0);assert.equal(a.state.settings.uiSetup,preset);
    drag(handle,48,32,'pointercancel');assert.equal(a.state.settings.uiSetup,preset);
    assert.deepEqual(a.state.layout,before);
    drag(handle,48,32);await a.run('_settingsWriteQueue');await a.call('saveLayout',true);
    assert.equal(a.state.settings.uiSetup,'custom');assert.equal(a.store.settings.uiSetup,'custom');
    assert.equal(a.store.settings.uiSetupBase,preset);
    assert.notDeepEqual(a.state.layout,before);
    await a.call('resetLayout');assert.equal(a.state.settings.uiSetup,preset);
  }
});

test('Custom survives reload and reset keeps the starting Modern layout and panel behavior',async t=>{
  const original=review(t);await original.call('applyUiSetup','modern');
  original.state.layout.moves.x+=32;await original.call('saveLayout',true);
  await original.call('setSetting','graphDesign','bars2');
  const a=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease',async()=>{});
  Object.assign(a.store,structuredClone(original.store));await a.start();
  assert.equal(a.state.settings.uiSetup,'custom');assert.equal(a.state.settings.uiSetupBase,'modern');
  near(a.state.layout.moves.x,MODERN_LAYOUT.moves.x+32);
  await a.call('resetLayout');assert.equal(a.state.settings.uiSetup,'custom');
  near(a.state.layout.moves.x,MODERN_LAYOUT.moves.x);
  assert.equal(a.state.settings.graphDesign,'bars2');
  await a.call('resetVisualSettings');assert.equal(a.state.settings.uiSetup,'modern');
  for(const [key,value]of Object.entries(UI_SETUPS.modern.designs))assert.equal(a.state.settings[key],value);
});

test('opening Reorganize without editing preserves the named preset after reload',async t=>{
  const original=review(t);
  for(const preset of ['old','modern']) {
    await original.call('applyUiSetup',preset);
    original.call('toggleReorganize');original.call('toggleReorganize');
    await original.call('saveLayout',true);
    const a=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
    a.replace('resetSettingsForRelease',async()=>{});
    Object.assign(a.store,structuredClone(original.store));await a.start();
    assert.equal(a.state.settings.uiSetup,preset);assert.equal(a.store.settings.uiSetup,preset);
  }
});
