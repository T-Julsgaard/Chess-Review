import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLeaderboardCsv,createLeaderboardPreview,leaderboardPreview,PREVIEW_MAX_BYTES,LEADERBOARD_PREVIEW_STATES} from '../lib/learning/leaderboard-preview.js';
import {readFileSync} from 'node:fs';
import {LeaderboardClient} from '../lib/learning/leaderboard-client.js';
import {app,loadGame,settle} from './helpers/app.mjs';

const csv='mode,player,solved,is_you\r\nknockout,"Queen, ""Gambit""",42,0\r\nknockout,Preview Player,53,1\r\ntimeAttack,Speed Knight,33,0\r\nsolve-puzzle,Daily Knight,1200,0\r\n';

test('sample scenarios cover every mode and score actions distinguish pending and confirmed totals',()=>{
  const preview=createLeaderboardPreview();preview.sample();assert.equal(preview.count,90);
  for(const mode of ['solve-puzzle','timeAttack','knockout']){
    preview.setScenario('saved',mode);const before=preview.view(mode).personal.score;
    assert.equal(preview.list(mode,1).rows.filter(r=>r.country).length,8);
    preview.action('solve',mode);assert.equal(preview.view(mode).personal.score,before+1);assert.equal(preview.view(mode).personal.confirmed,before);
    preview.action('fail-sync',mode);assert.equal(preview.view(mode).personal.blocked,true);
    preview.action('retry-sync',mode);assert.equal(preview.view(mode).personal.blocked,false);assert.equal(preview.view(mode).personal.syncing,true);
    preview.action('finish-sync',mode);assert.equal(preview.view(mode).personal.score,before+1);assert.equal(preview.view(mode).personal.syncing,false);
    preview.action('start-sync',mode);preview.action('discard',mode);assert.equal(preview.view(mode).personal.score,before+1);
    for(const [state] of LEADERBOARD_PREVIEW_STATES){
      preview.setScenario(state,mode);assert.equal(preview.view(mode).scenario,state);
      if(['unavailable','rate-limited','capacity','connection-error'].includes(state))assert.throws(()=>preview.list(mode,1));
      else assert.ok(Array.isArray(preview.list(mode,1).rows));
    }
    preview.setScenario('offline',mode);assert.equal(preview.list(mode,1).stale,true);
    preview.action('refresh',mode);assert.equal(preview.list(mode,1).stale,undefined);
  }
  assert.throws(()=>preview.action('unexpected'));assert.throws(()=>preview.setScenario('unexpected'));
  preview.setScenario('syncing','solve-puzzle');const other=preview.view('knockout').personal;
  assert.equal(other.syncing,true);preview.action('finish-sync','knockout');assert.equal(preview.view('knockout').personal.score,other.score);
  preview.clear();assert.equal(preview.active,false);assert.equal(preview.view(),null);
});

test('optional country column accepts Chess.com codes and IDs without requiring changes to older CSVs',()=>{
  const parsed=parseLeaderboardCsv('mode,player,solved,is_you,country\nknockout,Danish Player,9,1,dk\nknockout,American Player,8,0,2\nknockout,Unknown,7,0,ZZ\nknockout,No flag,6,0,');
  assert.deepEqual(parsed.boards.knockout.map(r=>r.country),['dk','2','ZZ',undefined]);
  assert.throws(()=>parseLeaderboardCsv('mode,player,solved,country\nknockout,Player,9,../../DK'),/Invalid CSV/);
});
test('CSV supports quoted fields, sorts scores, marks the preview player and keeps boards separate',()=>{
  const data=parseLeaderboardCsv('\uFEFF'+csv);assert.equal(data.count,4);
  assert.deepEqual(data.boards.knockout.map(r=>r.score),[53,42]);assert.equal(data.boards.knockout[1].name,'Queen, "Gambit"');
  assert.equal(data.boards.knockout[0].isYou,true);assert.equal(data.boards.timeAttack.length,1);
  const preview=createLeaderboardPreview();preview.load(csv);assert.equal(preview.list('knockout',1).rows.length,2);
  const old=preview.signal;preview.clear();assert.equal(old.aborted,true);assert.equal(preview.active,false);
  assert.equal(createLeaderboardPreview().active,false,'A fresh tab starts without sample data');
});
test('malformed, duplicate, oversized and untrusted CSV records are rejected without replacing an active preview',()=>{
  const preview=createLeaderboardPreview();preview.load(csv);
  for(const invalid of ['',csv.replace('53','-1'),csv.replace('53','1.5'),csv.replace('53','1000001'),csv.replace('timeAttack','unknown'),
    csv+'knockout,Preview Player,99,0\n',csv.replace('42,0','42,1'),csv.replace('Gambit"""','Gambit""'),
    'mode,player,solved\nknockout,Name,Infinity', 'mode,player,solved\nknockout,Name,1,extra',
    'x'.repeat(PREVIEW_MAX_BYTES+1)])assert.throws(()=>preview.load(invalid));
  assert.equal(preview.count,4);
  const safe=parseLeaderboardCsv('mode,player,solved\nknockout,<img src=x onerror=x>,9');assert.equal(safe.count,1);
});
test('preview mode never reads credentials, writes progress, requests consent or sends leaderboard traffic',async t=>{
  t.after(()=>leaderboardPreview.clear());let network=0,reads=0,writes=0;
  const client=new LeaderboardClient({get(){reads++;throw Error('No storage');},set(){writes++;throw Error('No writes');}},
    {endpoint:'https://rank.example',fetcher(){network++;throw Error('No network');}});
  leaderboardPreview.load(csv);assert.equal(client.configured,true);assert.equal(await client.credentials(),null);
  assert.equal((await client.list('knockout',1)).rows[0].score,53);
  for(const action of [()=>client.connect('a'.repeat(64)),()=>client.start('knockout'),()=>client.attempt({id:'x',revision:0},['e2e4']),
    ()=>client.ready({id:'x'}),()=>client.removePlayer(),()=>client.disconnect(),()=>client.request('/v1/me')])await assert.rejects(action(),/Clear test data/);
  assert.deepEqual([network,reads,writes],[0,0,0]);
  leaderboardPreview.clear();assert.equal(client.preview,false);
});
test('activating preview aborts an in-flight live read and rejects its late result',async t=>{
  t.after(()=>leaderboardPreview.clear());let resolve,signal;
  const client=new LeaderboardClient({async get(){return {'leaderboardPreferences:v1':{version:1,enabled:true}};}},{endpoint:'https://rank.example',fetcher:async(url,options)=>{signal=options.signal;return new Promise(r=>{resolve=r;});}});
  const pending=client.list('knockout',1);await settle();leaderboardPreview.load(csv);assert.equal(signal.aborted,true);
  resolve(Response.json({rows:[{name:'Live',score:999}]}));await assert.rejects(pending,/source or privacy choice changed/);
});
test('Developer debugger imports and clears CSV without changing saved data',async t=>{
  t.after(()=>leaderboardPreview.clear());
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');a.call('toggleSettings');
  const doc=a.dom.window.document,input=doc.querySelector('[data-debug=leaderboard-csv-file]'),saved=structuredClone(a.store),writes=a.writes.length;
  Object.defineProperty(input,'files',{value:[{name:'test.csv',size:csv.length,text:async()=>csv}]});
  input.dispatchEvent(new a.dom.window.Event('change'));await settle();
  assert.equal(leaderboardPreview.count,4);assert.match(doc.querySelector('[data-debug=leaderboard-csv-status]').textContent,/4 records · temporary/);
  assert.equal(a.writes.length,writes);assert.deepEqual(a.store,saved);
  doc.querySelector('[data-debug=leaderboard-csv-clear]').click();assert.equal(leaderboardPreview.active,false);
  assert.equal(a.writes.length,writes);assert.deepEqual(a.store,saved);
});

test('Developer debugger opens chosen states and exercises sync and account actions without storage or network writes',async t=>{
  t.after(()=>leaderboardPreview.clear());
  const puzzles=JSON.parse(readFileSync(new URL('../data/learning/puzzles.json',import.meta.url))).puzzles.slice(0,20);
  t.mock.method(globalThis,'fetch',async()=>Response.json({schema:1,puzzles}));
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');await a.call('openLearning');
  const w=a.run('learningWorkspace'),doc=a.dom.window.document;t.after(()=>w.close());
  a.store['leaderboard:v1']={id:'real-player',name:'Knight-real',token:'a'.repeat(64),scores:{knockout:17}};
  const saved=structuredClone(a.store),writes=a.writes.length,progress=structuredClone(w.store.value);
  w.leaderboardClient.fetcher=()=>{throw Error('Preview must not contact the service');};
  const drain=async()=>{for(let i=0;i<8;i++)await settle();};
  const click=async selector=>{assert.ok(doc.querySelector(selector),selector);doc.querySelector(selector).click();await drain();};
  const preview=async state=>{
    if(doc.querySelector('#settings').hidden)await a.call('toggleSettings');
    doc.querySelector('[data-debug=leaderboard-preview-mode]').value='timeAttack';
    doc.querySelector('[data-debug=leaderboard-preview-state]').value=state;
    await click('[data-debug=leaderboard-preview-show]');
    assert.equal(w.page,'leaderboard');assert.equal(w.leaderboard.mode,'timeAttack');
  };
  await preview('rankings');await w.loadLeaderboard(2);await click('[data-focus=leaderboard-refresh]');assert.equal(w.leaderboard.page,2);
  await preview('syncing');assert.match(doc.querySelector('.leaderboard-personal').textContent,/Syncing…/);
  await a.call('toggleSettings');await click('[data-debug=leaderboard-finish-sync]');
  assert.match(doc.querySelector('.leaderboard-personal').textContent,/Saved/);
  await a.call('toggleSettings');await click('[data-debug=leaderboard-fail-sync]');
  assert.match(doc.querySelector('.leaderboard-personal').textContent,/Sync needs attention/);
  await click('[data-focus="button-Discard unsynced scores"]');assert.match(doc.querySelector('.leaderboard-personal').textContent,/Saved/);
  await preview('loading');assert.equal(doc.querySelector('.leaderboard-table-wrap').getAttribute('aria-busy'),'true');
  await preview('offline');assert.match(doc.querySelector('.leaderboard-error').textContent,/Showing saved rankings/);
  await click('[data-focus=leaderboard-retry]');assert.equal(doc.querySelector('.leaderboard-error'),null);
  await preview('disconnected');assert.equal(doc.querySelector('.leaderboard-connect a'),null,'Preview key button cannot open the live join page');
  doc.querySelector('.leaderboard-connect').dispatchEvent(new a.dom.window.Event('submit',{bubbles:true,cancelable:true}));await drain();
  assert.ok(doc.querySelector('.leaderboard-player'));
  await click('[data-focus=leaderboard-play]');assert.match(doc.querySelector('.leaderboard-preview-notice').textContent,/Ranked-play button preview/);
  assert.equal(w.activity,null);assert.ok(!w.ranked);
  await click('[data-focus="button-Delete online records"]');assert.match(doc.querySelector('.leaderboard-player').textContent,/Permanently delete/);
  await click('[data-focus="button-Cancel"]');assert.equal(doc.querySelector('[data-focus="button-Delete my online records"]'),null);
  await click('[data-focus="button-Disconnect"]');assert.ok(doc.querySelector('.leaderboard-connect'));
  await preview('confirm-delete');await click('[data-focus="button-Delete my online records"]');
  assert.equal(doc.querySelectorAll('.leaderboard-table tbody tr').length,0);assert.match(doc.querySelector('.leaderboard-preview-notice').textContent,/Test records deleted/);
  assert.deepEqual(a.store,saved);assert.equal(a.writes.length,writes);assert.deepEqual(w.store.value,progress);
});
