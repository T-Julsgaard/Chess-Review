import test from 'node:test';
import assert from 'node:assert/strict';
import {SCREEN_PREVIEWS,memoryStorage,createScreenPreviewContext} from '../lib/screen-previews.js';
import {app,loadGame} from './helpers/app.mjs';

test('preview storage is isolated, snapshots its inputs and implements browser get defaults',async()=>{
  const source={settings:{accent:'#123456'},username:'sample'},store=memoryStorage(source);
  source.settings.accent='changed';const first=await store.get('settings');first.settings.accent='changed again';
  assert.equal((await store.get('settings')).settings.accent,'#123456');
  await store.set({progress:{attempts:3}});assert.deepEqual(await store.get({missing:7}),{missing:7});
  assert.deepEqual(await store.get(['username']),{username:'sample'});
  await store.remove(['username','progress']);assert.equal((await store.get('username')).username,undefined);
  await store.clear();assert.deepEqual(await store.get(),{});
});

test('only an explicit preview query creates a memory context and invalid views remain isolated',async()=>{
  assert.equal(createScreenPreviewContext({search:''}),null);
  assert.equal(createScreenPreviewContext({search:'?other=review'}),null);
  const context=createScreenPreviewContext({search:'?screen-preview=unknown'});assert.equal(context.id,'review');
  const preferences={settings:{accent:'#123456',engineWorkers:8,sound:true},layout:{board:{x:10,y:20,w:300,h:400}},layoutMode:'custom',layoutVersion:8};
  await context.configure(preferences);await context.storage.set({username:'preview'});
  const data=await context.storage.get();assert.equal(data.settings.engineWorkers,1);assert.equal(data.settings.engineDepth,4);assert.equal(data.settings.sound,false);
  assert.equal(data.settings.accent,'#123456');assert.deepEqual(data.layout,preferences.layout);
  assert.equal(preferences.settings.engineWorkers,8);assert.equal(preferences.username,undefined);
  assert.match(context.job.pgn,/Preview White/);assert.equal(new Set(SCREEN_PREVIEWS.map(view=>view.id)).size,SCREEN_PREVIEWS.length);
});

test('Visual settings opens screen sizes with a session snapshot of the current game',async t=>{
  const a=app(t);loadGame(a,'1. e4');a.call('buildUI');a.call('renderSettings');let created,snapshot;
  Object.defineProperties(a.dom.window,{innerWidth:{value:1920},innerHeight:{value:919},outerWidth:{value:1920},outerHeight:{value:1040},devicePixelRatio:{value:1}});
  Object.defineProperties(a.dom.window.screen,{width:{value:1920},height:{value:1080},availWidth:{value:1920},availHeight:{value:1040}});
  a.dom.window.open=(url)=>{created=url;snapshot=JSON.parse(a.dom.window.sessionStorage.getItem('screen-size-preview'));return {};};
  a.dom.window.document.querySelector('[data-debug=screen-previews]').click();await Promise.resolve();
  assert.equal(created,'https://extension.test/screen-preview.html');assert.equal(a.writes.length,0);
  assert.equal(snapshot.job.pgn,'1. e4');assert.equal(snapshot.preferences.settings.sound,false);
  assert.deepEqual(snapshot.display,{width:1920,height:919,pixelRatio:1,insetWidth:0,insetHeight:161});
  assert.equal(a.dom.window.sessionStorage.getItem('screen-size-preview'),null);
});

test('viewport previews copy real library and progress into memory and accept a launch snapshot',async()=>{
  const context=createScreenPreviewContext({search:'?viewport-preview=1'});
  const original={settings:{accent:'#123456'},library:[{id:'keep'}],'learning:v1':{attempts:3}};
  const snapshot={job:{pgn:'1. d4 d5',meta:{gameId:'current'},source:'pgn'},idx:2,preferences:{settings:{accent:'#654321'}}};
  await context.configure(original,snapshot);
  assert.equal(context.viewport,true);assert.equal(context.job.pgn,'1. d4 d5');assert.equal(context.idx,2);
  await context.storage.set({library:[],'learning:v1':{attempts:9}});
  assert.deepEqual(original.library,[{id:'keep'}]);assert.equal(original['learning:v1'].attempts,3);
  assert.equal((await context.storage.get('settings')).settings.accent,'#654321');
});

test('viewport startup uses the current game without mounting a scenario toolbar or writing real storage',async t=>{
  const a=app(t,{url:'https://extension.test/analysis.html?viewport-preview=1'});
  const original={settings:{accent:'#123456'},library:[{id:'keep'}]};Object.assign(a.store,structuredClone(original));
  a.dom.window.sessionStorage.setItem('screen-size-preview',JSON.stringify({job:{pgn:'1. d4 d5',meta:{},source:'pgn'},idx:1}));
  a.replace('loadBook',async()=>{});a.replace('loadCalibration',async()=>{});
  // A completed preview analysis must publish scores before restoring its move.
  a.replace('startAnalysis',()=>{a.state.evals=a.state.positions.map(()=>({cp:0}));a.state.analyzing=false;});
  a.replace('loadScreenPreviewController',async()=>{throw Error('Unexpected scenario toolbar');});
  await a.start();
  assert.equal(a.state.pgn,'1. d4 d5');assert.equal(a.state.idx,1);assert.equal(a.dom.window.document.body.dataset.previewReady,'true');
  assert.equal(a.writes.length,0);assert.deepEqual(a.store,original);
});

test('viewport previews never expose tab zoom APIs to the host',async t=>{
  const a=app(t,{url:'https://extension.test/analysis.html?viewport-preview=1'});let changes=0;
  a.context.platformAPI.tabs={getCurrent:async()=>({id:1}),setZoomSettings:async()=>{},getZoom:async()=>.87,setZoom:async()=>{changes++;}};
  loadGame(a,'1. e4 e5');a.call('buildUI');await a.call('initTabZoom');assert.equal(changes,0);
});

test('preview startup reads display preferences but never migrates or saves real account data',async t=>{
  const a=app(t,{url:'https://extension.test/analysis.html?screen-preview=review#keep'}),original={settings:{accent:'#123456'},username:'real user',library:[{id:'keep'}]};
  Object.assign(a.store,structuredClone(original));let releaseCalls=0,mounted=0;
  a.replace('resetSettingsForRelease',async()=>{releaseCalls++;});
  a.replace('loadBook',async()=>{});a.replace('loadCalibration',async()=>{});
  a.replace('startAnalysis',()=>{a.state.analyzing=false;});
  a.replace('loadScreenPreviewController',async()=>({async mountScreenPreview(env){mounted++;await env.context.storage.set({username:'sample',library:[]});}}));
  a.dom.window.sessionStorage.setItem('job:keep','keep original game');
  await a.start();
  assert.equal(a.dom.window.sessionStorage.getItem('job:keep'),'keep original game');
  assert.equal(releaseCalls,0);assert.equal(mounted,1);assert.equal(a.writes.length,0);assert.deepEqual(a.store,original);
  assert.equal(a.state.players.w.name,'Preview White');assert.equal(a.state.settings.accent,'#123456');
});
