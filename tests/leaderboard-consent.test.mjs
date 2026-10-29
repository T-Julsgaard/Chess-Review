import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {LeaderboardClient} from '../lib/learning/leaderboard-client.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {leaderboardSettingsControls} from '../lib/learning/leaderboard-settings.js';
import {syncLeaderboardCountry} from '../lib/learning/leaderboard-country.js';
import {leaderboardPreview} from '../lib/learning/leaderboard-preview.js';
import {app,loadGame} from './helpers/app.mjs';

const PREF='leaderboardPreferences:v1',KEY='leaderboard:v1',QUEUE='leaderboard:practice:v1';
const player={id:'me',name:'Knight-me',token:'a'.repeat(64),scores:{knockout:12}};
const board={rows:[{id:'me',name:'Knight-me',score:12}],hasNext:false};
const settle=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
function fixture(data={},fetcher=async()=>Response.json(board)) {
  const requests=[],storage={async get(key){return typeof key==='string'?{[key]:structuredClone(data[key])}:structuredClone(data);},async set(values){Object.assign(data,structuredClone(values));}};
  const client=new LeaderboardClient(storage,{endpoint:'https://rank.example',fetcher:async(url,options)=>{requests.push({url,...options});return fetcher(url,options);}});
  return {data,storage,client,requests};
}

for(const legacy of [false,true])test(`no leaderboard traffic before explicit opt-in${legacy?' even with an old player key and pending proofs':''}`,async()=>{
  const {client,data,requests}=fixture(legacy?{[KEY]:player,[QUEUE]:{pending:[{puzzleId:'old'}]}}:{});
  await assert.rejects(client.list('knockout',1),/Opt in/);
  await assert.rejects(client.connect(player.token),/Opt in/);
  await assert.rejects(client.start('solve-puzzle'),/Opt in/);
  await assert.rejects(client.attempt({id:'old',revision:0},['e2e4']),/Opt in/);
  await client.practice.resume();await client.practice.flush();
  await syncLeaderboardCountry(client,legacy?player:null);
  assert.equal(await client.personal('knockout'),null);assert.equal(requests.length,0);
  assert.equal(data[PREF],undefined);
});

test('consent is persisted separately from appearance; nationality defaults off and cannot be posted silently',async()=>{
  const {client,data,requests}=fixture();
  await client.optIn();assert.equal(data[PREF].enabled,true);assert.equal(data[PREF].showNationality,false);
  assert.equal(data[PREF].version,1);assert.ok(data[PREF].acceptedAt);
  await client.list('knockout',1);assert.equal(requests.length,1);
  await assert.rejects(client.request('/v1/me',{token:player.token,body:{country:'DK'}}),/Nationality sharing is off/);
  await client.optOut();assert.equal(data[PREF].enabled,false);
  await assert.rejects(client.list('knockout',1),/Opt in/);assert.equal(requests.length,1,'Cached rows are also gated');
});

test('withdrawal aborts in-flight uploads, clears unsent proofs, and retains only the key needed for failed deletion',async()=>{
  let release,signal;
  const {client,data,requests}=fixture({[KEY]:player,[QUEUE]:{pending:[{puzzleId:'old'}]}},async(url,options)=>{
    if(url.endsWith('/v1/delete-player'))return Response.json({}, {status:503});
    signal=options.signal;return new Promise(resolve=>{release=resolve;});
  });
  await client.optIn();
  const pending=client.request('/v1/attempts',{token:player.token,body:{session:'x'}});await settle();
  await assert.rejects(client.optOut(),/unavailable/);assert.equal(signal.aborted,true);
  release(Response.json({score:99}));await assert.rejects(pending,/privacy choice changed/);
  assert.equal(data[QUEUE],null);assert.deepEqual(data[KEY],player);
  assert.equal(data[PREF].pendingDeletion,true);
  await assert.rejects(client.optIn(),/Finish deleting/);
  await client.practice.flush();await client.practice.resume();assert.equal(requests.length,2);
});

test('deletion is allowed while opted out; failures retain the key for retry and success clears it',async()=>{
  let fail=true;
  const {client,data,requests}=fixture({[KEY]:player},async()=>fail?Response.json({}, {status:503}):Response.json({deleted:true}));
  await assert.rejects(client.removePlayer(),/unavailable/);
  assert.equal(data[PREF].enabled,false);assert.deepEqual(data[KEY],player);
  fail=false;await client.retryDeletion();assert.equal(data[KEY],null);assert.equal(data['leaderboardCountry:v1'],null);
  assert.equal(data[PREF].showNationality,false);assert.equal(requests.length,2,'Privacy deletion can retry despite the ordinary-read backoff');
  assert.ok(requests.every(r=>r.url.endsWith('/v1/delete-player')));
});

test('a late country-removal response cannot restore consent after opt-out',async()=>{
  const {client,storage,data}=fixture({[KEY]:player});
  await client.optIn(true);await client.setNationality(false);
  const set=storage.set;let release,reached=false;
  storage.set=async values=>{
    if(Object.hasOwn(values,'leaderboardCountry:v1')&&!Object.hasOwn(values,KEY)){
      reached=true;await new Promise(resolve=>{release=resolve;});
    }
    return set(values);
  };
  const pending=syncLeaderboardCountry(client,player);await settle();assert.equal(reached,true);
  await client.optOut();release();await pending;
  assert.equal(data[PREF].enabled,false);assert.equal(data[KEY],null);
});

test('turning nationality off removes the public flag without republishing; pending removals survive offline',async()=>{
  let offline=true;
  const {client,data,requests}=fixture({[KEY]:player},async()=>offline?Response.json({}, {status:503}):Response.json({country:null}));
  await client.optIn(true);await client.setNationality(false);
  await assert.rejects(syncLeaderboardCountry(client,player),/unavailable/);
  assert.equal(data[PREF].showNationality,false);assert.equal(data[PREF].pendingCountryRemoval,true);
  offline=false;
  await syncLeaderboardCountry(client,player);assert.equal(data[PREF].pendingCountryRemoval,false);
  await syncLeaderboardCountry(client,player);assert.equal(requests.length,2);
  assert.ok(requests.every(r=>JSON.parse(r.body).country===null));
});

test('opting out deletes the shared player; rejoining starts with a new key and no nationality',async()=>{
  const {client,data}=fixture({[KEY]:player});await client.optIn(true);await client.optOut();await client.optIn(false);
  assert.equal(data[PREF].showNationality,false);assert.equal(data[PREF].pendingCountryRemoval,false);assert.equal(data[KEY],null);
});

test('opting in without nationality removes a flag attached to a legacy or restored key',async()=>{
  const {client,data,requests}=fixture({[KEY]:player},async url=>Response.json(url.endsWith('/v1/me')?player:board));
  await client.optIn(false);assert.equal(data[PREF].pendingCountryRemoval,true);
  await syncLeaderboardCountry(client,player);assert.equal(JSON.parse(requests[0].body).country,null);
  await client.connect(player.token);assert.equal(data[PREF].pendingCountryRemoval,true,'Restoring an existing key schedules flag removal again');
});

test('Firefox nationality permission is separate and denied consent never enables leaderboards',async t=>{
  const original=globalThis.browser,grants=[];let allow=false;
  globalThis.browser={runtime:{getBrowserInfo(){}},permissions:{async request(value){grants.push(value.data_collection);return allow;}}};
  t.after(()=>{if(original===undefined)delete globalThis.browser;else globalThis.browser=original;});
  const {client,data}=fixture();await assert.rejects(client.optIn(),/Allow online leaderboard/);assert.equal(data[PREF],undefined);
  allow=true;await client.optIn(false);assert.deepEqual(grants.at(-1),['authenticationInfo','technicalAndInteraction']);
  await client.setNationality(true);assert.deepEqual(grants.at(-1),['locationInfo']);
});

test('the opt-in box gates all modes and asks about nationality before saving any consent',async t=>{
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>'),{client,storage,data,requests}=fixture();
  const puzzles=JSON.parse(readFileSync(new URL('../data/learning/puzzles.json',import.meta.url))).puzzles.slice(0,10);
  t.mock.method(globalThis,'fetch',async()=>Response.json({schema:1,puzzles}));
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>({moveAnim:false}),makePiece:()=>dom.window.document.createElement('span')});
  w.leaderboardClient=client;t.after(async()=>{await w.close();dom.window.close();});await w.open();
  for(const mode of ['solve-puzzle','timeAttack','knockout']){
    await w.showLeaderboard(mode);assert.ok(w.root.querySelector('.leaderboard-opt-in'));
    assert.equal(w.root.querySelector('.leaderboard-table'),null);assert.equal(w.root.querySelector('.leaderboard-pagination'),null);
  }
  w.root.querySelector('[data-focus=leaderboard-opt-in]').click();
  assert.equal(w.root.querySelector('[data-focus=leaderboard-nationality-choice]').checked,false);
  assert.equal(data[PREF],undefined);assert.equal(requests.length,0);
  w.root.querySelector('[data-focus=leaderboard-join]').click();await settle();
  assert.equal(data[PREF].enabled,true);assert.equal(data[PREF].showNationality,false);
  assert.equal(w.root.querySelector('.leaderboard-opt-in'),null);assert.ok(w.root.querySelector('.leaderboard-table'));
  await client.optOut();await w.refreshLeaderboardPreferences();assert.ok(w.root.querySelector('.leaderboard-opt-in'));
});

test('General settings support opt-in, optional flags, opt-out, and confirmed deletion with real client calls',async t=>{
  const dom=new JSDOM(''),{storage,client,data,requests}=fixture({[KEY]:player},async()=>Response.json({deleted:true}));
  t.after(()=>dom.window.close());let changes=0;
  const root=leaderboardSettingsControls({document:dom.window.document,storage,client,onChange:()=>{changes++;}});dom.window.document.body.append(root);await settle();
  const click=key=>root.querySelector(`[data-leaderboard-setting=${key}]`).click();
  click('enabled');assert.equal(root.querySelector('[data-leaderboard-setting=join-nationality]').checked,false);assert.equal(data[PREF],undefined);
  click('join');await settle();assert.equal(data[PREF].enabled,true);
  click('delete');assert.equal(requests.length,1);click('cancel-delete');assert.equal(requests.length,1);
  click('delete');click('confirm-delete');await settle();assert.equal(data[KEY],null);assert.equal(data[PREF].enabled,false);assert.equal(requests.length,2);
  click('enabled');click('join');await settle();assert.equal(data[PREF].enabled,true);
  click('enabled');await settle();assert.equal(data[PREF].enabled,false);assert.equal(changes,4);assert.equal(requests.length,2);
});

test('the renamed General tab and leaderboard settings shortcut open the correct section',async t=>{
  const puzzles=JSON.parse(readFileSync(new URL('../data/learning/puzzles.json',import.meta.url))).puzzles.slice(0,10);
  t.mock.method(globalThis,'fetch',async()=>Response.json({schema:1,puzzles}));
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');await a.call('openLearning');
  const w=a.run('learningWorkspace');t.after(()=>w.close());await w.showLeaderboard('knockout');
  w.root.querySelector('[data-focus=leaderboard-settings]').click();await settle();
  const doc=a.dom.window.document;assert.equal(doc.querySelector('.set-tab.on').textContent,'General');
  assert.ok([...doc.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Leaderboard')?.closest('.set-section').classList.contains('open'));
});

test('opt-in and nationality debugger previews never save real consent or make requests',async t=>{
  t.after(()=>leaderboardPreview.clear());const {client,data,requests}=fixture();
  leaderboardPreview.setScenario('opt-in');assert.equal(client.previewState('knockout').optIn,true);
  client.previewAction('nationality-choice','knockout');assert.equal(client.previewState('knockout').scenario,'nationality-choice');
  client.previewAction('opt-in','knockout');assert.equal((await client.list('knockout',1)).rows.length,10);
  assert.equal(data[PREF],undefined);assert.equal(requests.length,0);
});
