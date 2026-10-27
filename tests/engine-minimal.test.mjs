import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';

test('line controls add up to three candidates, remove back to one, and save without changing the review', async t => {
  const a=app(t),doc=a.dom.window.document;
  loadGame(a,'1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived');a.call('buildUI');
  a.state.settings.engineDesign='minimal';
  a.state.bests[0].lines=[
    {score:{cp:42},pv:'e2e4 e7e5'}, {score:{cp:21},pv:'d2d4 d7d5'},
    {score:{cp:12},pv:'g1f3 d7d5'}, {score:{cp:8},pv:'c2c4 e7e5'},
  ];
  a.replace('requestPanelLines',()=>{});
  a.replace('scheduleReanalyze',()=>{throw Error('Adding a panel line must not reanalyze the game');});
  a.call('renderEngineCurrent');
  assert.equal(doc.querySelector('.engine-focus-play').hasAttribute('title'),false);
  const before=JSON.stringify({positions:a.state.positions,evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout});
  assert.equal(doc.querySelectorAll('.engine-focus-candidate').length,1);
  assert.equal(doc.querySelector('.engine-minimal-controls').previousElementSibling.className,'engine-candidates');
  assert.equal(doc.querySelector('.engine-minimal-remove'),null);
  for(const count of [2,3]) {
    doc.querySelector('.engine-minimal-add').click();await settle();await a.run('_settingsWriteQueue');
    assert.equal(doc.querySelectorAll('.engine-focus-candidate').length,count);
    assert.equal(a.store.settings.engineLines,count);
    assert.equal(doc.activeElement,doc.querySelector('.engine-minimal-add')||doc.querySelector('.engine-minimal-remove'));
    assert.equal(JSON.stringify({positions:a.state.positions,evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout}),before);
  }
  assert.equal(doc.querySelector('.engine-minimal-add'),null);
  for(const count of [2,1]) {
    doc.querySelector('.engine-minimal-remove').click();await settle();await a.run('_settingsWriteQueue');
    assert.equal(doc.querySelectorAll('.engine-focus-candidate').length,count);
    assert.equal(a.store.settings.engineLines,count);
    assert.equal(doc.activeElement,doc.querySelector('.engine-minimal-remove')||doc.querySelector('.engine-minimal-add'));
    assert.equal(JSON.stringify({positions:a.state.positions,evals:a.state.evals,bests:a.state.bests,idx:a.state.idx,layout:a.state.layout}),before);
  }
  assert.equal(doc.querySelector('.engine-minimal-remove'),null);
});

test('Minimal caps saved four-line preferences and searches at three; Focus still supports four', async t => {
  const a=app(t),doc=a.dom.window.document;
  loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');
  Object.assign(a.state.settings,{engineDesign:'minimal',engineLines:4});
  const line={score:{cp:42},pv:'e2e4 e7e5'};
  a.state.bests[0].lines=[line];
  let searched;
  a.replace('ensureLiveEngine',async()=>({cancelPending(){},stop(){},async analyse(fen,depth,count){searched=count;return {lines:[line,line,line]};}}));
  await a.call('requestPanelLines');
  assert.equal(searched,3);
  assert.equal(doc.querySelectorAll('.engine-focus-candidate').length,3);
  assert.equal(doc.querySelector('.engine-minimal-add'),null);
  const controls=a.call('engineSeg','Panel lines','engineLines',[1,2,3]);
  assert.equal(controls.querySelector('.on').dataset.value,'3');
  await a.call('setEngineSetting','engineLines',4);
  assert.equal(a.state.settings.engineLines,3);
  a.state.settings.engineDesign='focus';a.state.settings.engineLines=4;
  a.call('renderEngine',[line,line,line,line]);
  assert.equal(doc.querySelectorAll('.engine-focus-candidate').length,4);
});

test('Add line cannot reveal answers during practice or act on loading, final and error states', t => {
  const a=app(t),doc=a.dom.window.document;
  loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');
  a.state.settings.engineDesign='minimal';
  for(const input of [null,[]]) {
    a.state._lastEngineLines=null;a.call('renderEngine',input);
    assert.equal(doc.querySelector('.engine-minimal-add').disabled,true);
  }
  a.state.analysisMode=true;a.state.liveError='Engine unavailable';a.call('renderEngine',null);
  assert.equal(doc.querySelector('.engine-minimal-add').disabled,true);
  a.call('renderEnginePractice');
  assert.equal(doc.querySelector('.engine-minimal-add').disabled,true);
  doc.querySelector('.engine-minimal-add').click();
  assert.equal(a.state.settings.engineLines,1);
  a.state.settings.engineLines=3;a.call('renderEnginePractice');
  assert.equal(doc.querySelector('.engine-minimal-remove').disabled,true);
  doc.querySelector('.engine-minimal-remove').click();
  assert.equal(a.state.settings.engineLines,3);
});

test('existing Modern defaults upgrade once, retaining saved geometry and later individual choices', async t => {
  const a = app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease',async()=>{});
  a.store.settings={uiSetup:'modern',engineDesign:'original'};
  await a.start();
  assert.equal(a.state.settings.engineDesign,'minimal');
  assert.equal(a.store.settings.modernEngineVersion,1);
  const layout=JSON.stringify(a.state.layout);
  await a.call('setSetting','engineDesign','original');
  const b = app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  b.replace('resetSettingsForRelease',async()=>{});
  Object.assign(b.store,structuredClone(a.store));
  await b.start();
  assert.equal(b.state.settings.engineDesign,'original');
  assert.equal(JSON.stringify(b.state.layout),layout);
});

test('Modern upgrade retains an individually selected Focus design', async t => {
  const a = app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease',async()=>{});
  a.store.settings={uiSetup:'modern',engineDesign:'focus'};
  await a.start();
  assert.equal(a.state.settings.engineDesign,'focus');
  assert.equal(a.store.settings.modernEngineVersion,1);
});
