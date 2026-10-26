import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './helpers/app.mjs';

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
