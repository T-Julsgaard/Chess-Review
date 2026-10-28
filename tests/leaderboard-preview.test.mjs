import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLeaderboardCsv,createLeaderboardPreview,leaderboardPreview,PREVIEW_MAX_BYTES} from '../lib/learning/leaderboard-preview.js';
import {LeaderboardClient} from '../lib/learning/leaderboard-client.js';
import {app,loadGame,settle} from './helpers/app.mjs';

const csv='mode,player,solved,is_you\r\nknockout,"Queen, ""Gambit""",42,0\r\nknockout,Preview Player,53,1\r\ntimeAttack,Speed Knight,33,0\r\nsolve-puzzle,Daily Knight,1200,0\r\n';
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
  const safe=parseLeaderboardCsv('mode,player,solved\nknockout,<img src=x onerror=alert(1)>,9');assert.equal(safe.count,1);
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
  const client=new LeaderboardClient({},{endpoint:'https://rank.example',fetcher:async(url,options)=>{signal=options.signal;return new Promise(r=>{resolve=r;});}});
  const pending=client.list('knockout',1);leaderboardPreview.load(csv);assert.equal(signal.aborted,true);
  resolve(Response.json({rows:[{name:'Live',score:999}]}));await assert.rejects(pending,/source changed/);
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
