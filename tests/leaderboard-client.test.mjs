import test from 'node:test';
import assert from 'node:assert/strict';
import {LeaderboardClient} from '../lib/learning/leaderboard-client.js';
import {leaderboardPreview} from '../lib/learning/leaderboard-preview.js';

const storage=()=>{const data={};return {async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};};
const board={rows:[{id:'me',name:'Knight-me',score:12}],hasNext:false};

test('Chromium browser alias never receives Firefox-only consent fields',async t=>{
  const original=globalThis.browser;
  globalThis.browser={runtime:{},permissions:{request(){throw Error('Firefox-only request');},contains(){throw Error('Firefox-only check');}}};
  t.after(()=>{if(original===undefined)delete globalThis.browser;else globalThis.browser=original;});
  const client=new LeaderboardClient(storage(),{endpoint:'https://rank.example',fetcher:async()=>Response.json({id:'me',name:'Knight-me'})});
  await client.connect('a'.repeat(64));assert.equal((await client.credentials()).id,'me');
});

test('public pages reuse a minute of data, deduplicate in-flight reads and throttle manual refreshes',async t=>{
  let now=100000,calls=0,resolve;t.mock.method(Date,'now',()=>now);
  const client=new LeaderboardClient(storage(),{endpoint:'https://rank.example',fetcher:async()=>{calls++;return new Promise(r=>{resolve=r;});}});
  const first=client.list('knockout',1),second=client.list('knockout',1);assert.equal(calls,1);resolve(Response.json(board));
  const [a,b]=await Promise.all([first,second]);a.rows[0].score=99;assert.equal(b.rows[0].score,12);
  await client.list('knockout',1);await client.list('knockout',1,undefined,{fresh:true});assert.equal(calls,1);
  now+=11000;const fresh=client.list('knockout',1,undefined,{fresh:true});assert.equal(calls,2);resolve(Response.json(board));await fresh;
  now+=61000;const expired=client.list('knockout',1);assert.equal(calls,3);resolve(Response.json(board));await expired;
});

test('aborting one caller leaves the shared read available for another caller',async()=>{
  let resolve,calls=0;
  const client=new LeaderboardClient(storage(),{endpoint:'https://rank.example',fetcher:async()=>{calls++;return new Promise(r=>{resolve=r;});}});
  const controller=new AbortController(),first=client.list('knockout',1,controller.signal),second=client.list('knockout',1);
  controller.abort();await assert.rejects(first,/Abort/);resolve(Response.json(board));assert.deepEqual(await second,board);assert.equal(calls,1);
});

test('service capacity Retry-After prevents repeated network requests and preserves stale rankings',async t=>{
  let now=100000,calls=0;t.mock.method(Date,'now',()=>now);
  const client=new LeaderboardClient(storage(),{endpoint:'https://rank.example',fetcher:async()=>{
    calls++;return calls===1?Response.json(board):Response.json({error:'capacity'},{status:503,headers:{'Retry-After':'3600'}});
  }});
  await client.list('knockout',1);now+=61000;
  assert.equal((await client.list('knockout',1)).stale,true);assert.equal(calls,2);
  for(let i=0;i<10;i++)assert.equal((await client.list('knockout',1,undefined,{fresh:true})).rows[0].score,12);
  await assert.rejects(client.list('timeAttack',1),/wait before retrying/);assert.equal(calls,2);
  now+=3600001;await client.list('knockout',1);assert.equal(calls,3);
});

test('CSV preview neither flushes durable practice nor exposes live cached data',async t=>{
  t.after(()=>leaderboardPreview.clear());let calls=0;
  const client=new LeaderboardClient(storage(),{endpoint:'https://rank.example',fetcher:async()=>{calls++;return Response.json(board);}});
  await client.list('knockout',1);
  leaderboardPreview.load('mode,player,solved\nknockout,Preview Knight,9');
  assert.equal((await client.list('knockout',1)).rows[0].name,'Preview Knight');
  await client.practice.flush();await client.practice.resume();assert.equal(calls,1);
  await assert.rejects(client.practice.discard(),/Clear test data/);
});
