import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {LeaderboardClient} from '../lib/learning/leaderboard-client.js';

const library=JSON.parse(readFileSync(new URL('../data/learning/puzzles.json',import.meta.url))).puzzles.slice(0,20);
async function setup(t){
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'}),data={};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:library})}));
  const storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>({moveAnim:false}),makePiece:()=>dom.window.document.createElement('span')});
  t.after(async()=>{await w.close();dom.window.close();});await w.open();return {w,dom,data,storage};
}
test('all modes have compact leaderboard entries; screens preserve filters, use their own colors, and restore focus',async t=>{
  const {w,dom}=await setup(t);w.puzzleThemes.add('fork');w.puzzleRange=[500,800];
  const saved=structuredClone(w.store.value);
  assert.equal(w.root.querySelectorAll('.puzzle-leaderboard-button').length,3);
  for(const mode of ['solve-puzzle','timeAttack','knockout']){
    await w.showLeaderboard(mode);
    assert.equal(w.page,'leaderboard');assert.equal(w.root.querySelector('.learn-leaderboard').dataset.mode,mode);
    assert.equal(w.root.querySelector('.learn-puzzle-options'),null);
    assert.equal(w.root.querySelectorAll('.puzzle-mode').length,0);
    assert.equal(dom.window.document.activeElement.id,'leaderboard-title');
    assert.equal(w.nav.querySelector('[aria-current]').textContent,'Puzzles');
    assert.match(w.root.querySelector('.leaderboard-empty').textContent,/coming soon/);
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert.equal(w.page,'puzzles');assert.equal(dom.window.document.activeElement.dataset.focus,'leaderboard-'+mode);
  }
  assert.deepEqual([...w.puzzleThemes],['fork']);assert.deepEqual(w.puzzleRange,[500,800]);assert.deepEqual(w.store.value,saved);
});
test('pagination, own-player emphasis, escaping remote names and network retry work',async t=>{
  const {w}=await setup(t);let fail=false;
  w.leaderboardClient={configured:true,credentials:async()=>({id:'me',name:'Knight-me'}),
    async list(mode,page){if(fail)throw Error('Offline');return {rows:[{id:'me',name:'<img src=x onerror=alert(1)>',score:42}],hasNext:page===1};}};
  await w.showLeaderboard('knockout');assert.equal(w.root.querySelector('.leaderboard-table img'),null);
  assert.equal(w.root.querySelector('.is-you .leaderboard-score').textContent,'42');
  assert.equal(w.root.querySelector('[data-focus=leaderboard-previous]').disabled,true);
  await w.loadLeaderboard(2);assert.equal(w.leaderboard.page,2);
  assert.equal(w.root.querySelector('.leaderboard-rank').textContent,'11');
  assert.equal(w.root.querySelector('[data-focus=leaderboard-next]').disabled,true);
  fail=true;await w.loadLeaderboard(2);assert.match(w.root.querySelector('[role=alert]').textContent,/Offline/);
  assert.equal(w.root.querySelector('.leaderboard-score').textContent,'42');
  fail=false;await w.loadLeaderboard(2);assert.equal(w.root.querySelector('[role=alert]'),null);
  await w.navigate('concepts');assert.equal(w.leaderboardTimer,null);assert.equal(w.leaderboardRequest,null);
});
test('leaving aborts reads and late responses cannot replace the current screen',async t=>{
  const {w}=await setup(t);let release,signal;
  w.leaderboardClient={configured:true,credentials:async()=>null,list:async(mode,page,input)=>{signal=input;return new Promise(resolve=>{release=resolve;});}};
  const pending=w.showLeaderboard('timeAttack');for(let i=0;i<20&&!release;i++)await Promise.resolve();
  w.returnFromLeaderboard();assert.equal(signal.aborted,true);release({rows:[{name:'Late',score:9}],hasNext:false});await pending;
  assert.equal(w.page,'puzzles');assert.equal(w.leaderboardTimer,null);assert.equal(w.root.querySelector('.learn-leaderboard'),null);
});
test('client stores only a personal key locally and never sends it when reading public boards',async t=>{
  const {storage,data}=await setup(t),calls=[],token='a'.repeat(64);
  const client=new LeaderboardClient(storage,{endpoint:'https://rank.example',fetcher:async(url,options)=>{
    calls.push({url,options});return Response.json(url.endsWith('/v1/me')?{name:'Knight-me',id:'me'}:{rows:[],hasNext:false});}});
  await client.connect(token);assert.equal(data['leaderboard:v1'].token,token);
  await client.list('knockout',1);assert.equal(calls[1].options.headers.Authorization,undefined);
  assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.referrerPolicy,'no-referrer');
  await client.disconnect();assert.equal(data['leaderboard:v1'],null);
});
test('ranked proof includes only player moves; network failure stops further submissions',async t=>{
  const {w}=await setup(t);let moves;
  w.ranked={id:'run',revision:0};w.puzzleMoves=['e2e4','e7e5','g1f3'];
  w.leaderboardClient.attempt=async(session,input)=>{moves=input;return {revision:1,puzzleId:library[0].id,score:1};};
  await w.recordRankedAttempt(true,false,{});assert.deepEqual(moves,['e2e4','g1f3']);assert.equal(w.ranked.revision,1);
  w.leaderboardClient.attempt=async()=>{throw Error('timeout');};await w.recordRankedAttempt(true,false,{});
  assert.equal(w.ranked,null);assert.match(w.rankedNotice,/earlier verified scores are saved/);
});
test('a late ranked start cannot open a puzzle after leaving or switching boards',async t=>{
  const {w}=await setup(t);let resolve;
  w.leaderboardClient={configured:true,credentials:async()=>({id:'me'}),list:async()=>({rows:[]}),start:async()=>new Promise(r=>{resolve=r;})};
  await w.showLeaderboard('knockout');const pending=w.startRanked('knockout');w.returnFromLeaderboard();
  await w.showLeaderboard('timeAttack');resolve({id:'late',puzzleId:library[0].id});await pending;
  assert.equal(w.page,'leaderboard');assert.equal(w.leaderboard.mode,'timeAttack');assert.equal(w.activity,null);
});

test('Firefox consent denial and later revocation prevent authenticated network traffic',async t=>{
  const {storage}=await setup(t),original=globalThis.browser;let allowed=false,calls=0,permissions;
  globalThis.browser={permissions:{async request(input){permissions=input;return allowed;},async contains(){return allowed;}}};
  t.after(()=>{if(original===undefined)delete globalThis.browser;else globalThis.browser=original;});
  const client=new LeaderboardClient(storage,{endpoint:'https://rank.example',fetcher:async()=>{calls++;return Response.json({name:'Knight-me',id:'me'});}});
  await assert.rejects(client.connect('a'.repeat(64)),/Allow online player data/);assert.equal(calls,0);
  assert.deepEqual(permissions.data_collection,['authenticationInfo','technicalAndInteraction']);
  allowed=true;await client.connect('a'.repeat(64));assert.equal(calls,1);
  allowed=false;await assert.rejects(client.start('knockout'),/permission was removed/);assert.equal(calls,1);
});
