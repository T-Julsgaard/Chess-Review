import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker,{digest,verifyAttempt} from '../services/leaderboard/worker.js';
import {Chess} from '../lib/chess.js';
import {JSDOM} from 'jsdom';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {LeaderboardClient} from '../lib/learning/leaderboard-client.js';

const library=JSON.parse(readFileSync(new URL('../data/learning/puzzles.json',import.meta.url))).puzzles;
const mate=library.find(p=>p.solution.length===1),line=library.find(p=>p.solution.length>=5);
const token='a'.repeat(64),otherToken='b'.repeat(64);
function adapter(db) {
  return {prepare(sql){return {bind(...args){const statement=db.prepare(sql);return {
    async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return statement.run(...args);}
  };},async all(){return {results:db.prepare(sql).all()};}};},async batch(statements){db.exec('BEGIN');try{const results=await Promise.all(statements.map(s=>s.run()));db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
async function setup(t) {
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const migrations=new URL('../services/leaderboard/migrations/',import.meta.url);
  for(const file of readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL(file,migrations),'utf8'));
  db.prepare('INSERT INTO players VALUES (?,?,?,?)').run('player',await digest(token),'Knight-test',1);
  db.prepare('INSERT INTO players VALUES (?,?,?,?)').run('other',await digest(otherToken),'Knight-other',1);
  for(let i=0;i<12;i++)db.prepare('INSERT INTO puzzles VALUES (?,?,?,?)').run('p'+i,450+i*40,mate.fen,JSON.stringify(mate.solution));
  const allow={async limit(){return {success:true};}},env={DB:adapter(db),ENABLED:'true',TURNSTILE_SECRET_KEY:'server-only-secret',IP_HASH_KEY:'private-random-hash-key',TURNSTILE_HOSTNAME:'rank.example',TURNSTILE_SITE_KEY:'public-site-key',READ_LIMIT:allow,WRITE_LIMIT:allow,JOIN_LIMIT:allow,GLOBAL_LIMIT:allow,PLAYER_LIMIT:allow,START_LIMIT:allow};
  let time=1800000000000;t.mock.method(Date,'now',()=>time);
  const call=async(path,body,key=token,extra={})=>worker.fetch(new Request('https://rank.example'+path,{method:body===undefined?'GET':'POST',
    headers:{'CF-Connecting-IP':'192.0.2.1',...(key?{Authorization:'Bearer '+key}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...extra},
    ...(body===undefined?{}:{body:JSON.stringify(body)})}),env,{waitUntil(){}});
  const start=async mode=>{const response=await call('/v1/sessions',{mode});assert.equal(response.status,200);const session=await response.json();
    const ready=await call('/v1/ready',{session:session.id});assert.equal(ready.status,200);return {...session,...await ready.json()};};
  const attempt=async(s,moves=mate.solution)=>{time+=1000;return call('/v1/attempts',{session:s.id,revision:s.revision,moves});};
  return {db,env,call,start,attempt,advance(ms){time+=ms;},now:()=>time};
}
test('proof verification requires complete legal player lines and rejects invented solves',()=>{
  assert.equal(verifyAttempt(line,line.solution.filter((_,i)=>i%2===0)),true);
  assert.throws(()=>verifyAttempt(line,[]),/Invalid moves/);
  assert.throws(()=>verifyAttempt(line,[line.solution[0]]),/Incomplete/);
  assert.throws(()=>verifyAttempt(line,['a1a1']),/Illegal/);
  assert.throws(()=>verifyAttempt(line,Array(33).fill('a1a2')),/Invalid/);
  const c=new Chess(mate.fen),wrong=c.moves({verbose:true}).find(m=>m.lan!==mate.solution[0]&&!new Chess(m.after).isCheckmate()).lan;
  assert.equal(verifyAttempt(mate,[wrong]),false);
  assert.throws(()=>verifyAttempt(mate,[...mate.solution,...mate.solution]),/after completion/);
});
test('disabled/missing security bindings, rate limits and spoofed extension origins fail closed',async t=>{
  const s=await setup(t);s.env.ENABLED='false';assert.equal((await s.call('/v1/boards/knockout')).status,503);s.env.ENABLED='true';
  const limiter=s.env.GLOBAL_LIMIT;s.env.GLOBAL_LIMIT={async limit(){return {success:false};}};
  assert.equal((await s.call('/v1/boards/knockout')).status,429);s.env.GLOBAL_LIMIT=limiter;
  assert.equal((await s.call('/v1/sessions',{mode:'knockout'},null,{Origin:'chrome-extension://trusted'})).status,401);
  assert.equal((await s.call('/v1/me',undefined,'c'.repeat(64))).status,401);
  assert.equal((await s.call('/v1/sessions',{mode:'knockout'},token,{'CF-Connecting-IP':''})).status,403);
  s.env.PLAYER_LIMIT={async limit({key}){return {success:!key.startsWith('player:')};}};
  assert.equal((await s.call('/v1/sessions',{mode:'knockout'})).status,429);
  delete s.env.WRITE_LIMIT;assert.equal((await s.call('/v1/boards/knockout')).status,503);
});
test('server score updates atomically; duplicate/parallel proof submissions count once',async t=>{
  const s=await setup(t),session=await s.start('knockout');
  const responses=await Promise.all([s.attempt(session),s.attempt(session)]);
  assert.ok(responses.every(r=>[200,409].includes(r.status)));
  assert.equal(s.db.prepare("SELECT score FROM records WHERE mode='knockout'").get().score,1);
  const replay=await s.attempt(session);assert.equal(replay.status,200);
  assert.equal((await replay.json()).score,1);
  assert.equal(s.db.prepare('SELECT score FROM records').get().score,1);
  const wrong=new Chess(mate.fen).moves({verbose:true}).find(m=>m.lan!==mate.solution[0]&&!new Chess(m.after).isCheckmate()).lan;
  assert.equal((await s.attempt(session,[wrong])).status,409);
});
test('practice credits a distinct puzzle once across sessions; token ownership is enforced',async t=>{
  const s=await setup(t),session=await s.start('solve-puzzle');
  assert.equal((await s.call('/v1/attempts',{session:session.id,revision:0,moves:mate.solution},otherToken)).status,409);
  assert.equal((await s.attempt(session)).status,200);
  const next=await s.start('solve-puzzle');assert.notEqual(next.puzzleId,session.puzzleId);
  assert.equal((await s.attempt(next)).status,200);
  assert.equal(s.db.prepare("SELECT score FROM records WHERE mode='solve-puzzle'").get().score,2);
  s.db.prepare('INSERT OR IGNORE INTO solves VALUES (?,?)').run('player',session.puzzleId);
  assert.equal(s.db.prepare("SELECT score FROM records WHERE mode='solve-puzzle'").get().score,2);
  assert.equal((await s.attempt(session)).status,409);
});
test('server readiness starts exactly 180 seconds and cannot reset or extend a running clock',async t=>{
  const s=await setup(t),response=await s.call('/v1/sessions',{mode:'timeAttack'}),session=await response.json();
  assert.equal((await s.attempt(session)).status,409);
  s.advance(20000);const ready=await s.call('/v1/ready',{session:session.id}),deadline=(await ready.json()).deadline;
  assert.equal(deadline,s.now()+180000);s.advance(5000);
  const replay=await s.call('/v1/ready',{session:session.id});assert.equal((await replay.json()).deadline,deadline);
  s.advance(175000);assert.equal((await s.attempt(session)).status,409);
  assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM records').get().n,0);
});
for(const [mode,lives] of [['knockout',1],['timeAttack',3]])test(`${mode} enforces ${lives} lives on the service`,async t=>{
  const s=await setup(t);let session=await s.start(mode);
  const wrong=new Chess(mate.fen).moves({verbose:true}).find(m=>m.lan!==mate.solution[0]&&!new Chess(m.after).isCheckmate()).lan;
  for(let i=0;i<lives;i++){const result=await s.attempt(session,[wrong]);assert.equal(result.status,200);session={...session,...await result.json()};}
  assert.equal(session.ended,true);assert.equal((await s.attempt(session)).status,409);
  assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM records').get().n,0);
});
test('bounded bodies, pages and routes reject malicious input without exposing service details',async t=>{
  const s=await setup(t);
  assert.equal((await s.call('/v1/sessions',{mode:'invalid'})).status,400);
  assert.equal((await s.call('/v1/sessions',{mode:'x'.repeat(5000)})).status,413);
  for(const page of ['0','-1','101','1.5',"1' OR 1=1"]){assert.equal((await s.call('/v1/boards/knockout?page='+encodeURIComponent(page))).status,400);}
  assert.equal((await s.call('/v1/boards/unknown')).status,400);
  assert.equal((await s.call('/v1/admin')).status,404);
  const body=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('x'.repeat(4097)));controller.close();}});
  const response=await worker.fetch(new Request('https://rank.example/v1/sessions',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1',Authorization:'Bearer '+token,'Content-Type':'application/json'},body,duplex:'half'}),s.env,{});
  assert.equal(response.status,413);assert.doesNotMatch(await response.text(),/secret|SELECT|token_hash/);
});
test('daily mutation budget stops writes; deletion still removes all player data atomically',async t=>{
  const s=await setup(t),session=await s.start('solve-puzzle');await s.attempt(session);
  s.db.prepare('UPDATE quotas SET used=80000 WHERE key=?').run('write-units:'+Math.floor(s.now()/86400000));
  assert.equal((await s.call('/v1/sessions',{mode:'knockout'})).status,503);
  assert.equal((await s.call('/v1/delete-player',{})).status,200);
  for(const table of ['players','sessions','solves','records']){
    const key=table==='players'?'id':'player_id';assert.equal(s.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${key}=?`).get('player').n,0);
  }
  assert.equal(s.db.prepare("SELECT used FROM quotas WHERE key='players'").get(),undefined);
  assert.equal(s.db.prepare("SELECT used FROM quotas WHERE key='solves'").get(),undefined);
  assert.equal((await s.call('/v1/me')).status,401);
});
test('enrollment verifies Turnstile hostname/action, returns a personal key and stores only its hash',async t=>{
  const s=await setup(t);let result={success:true,hostname:'attacker.example',action:'enroll'};
  t.mock.method(globalThis,'fetch',async()=>Response.json(result));
  assert.equal((await s.call('/v1/enroll',{turnstile:'proof'},null)).status,403);
  result={success:true,hostname:'rank.example',action:'wrong'};
  assert.equal((await s.call('/v1/enroll',{turnstile:'proof'},null)).status,403);
  result={success:true,hostname:'rank.example',action:'enroll'};
  const response=await s.call('/v1/enroll',{turnstile:'proof'},null);assert.equal(response.status,201);
  const player=await response.json();assert.match(player.token,/^[a-f0-9]{64}$/);
  const stored=s.db.prepare('SELECT * FROM players WHERE id=?').get(player.id);assert.equal(stored.token_hash,await digest(player.token));
  assert.doesNotMatch(JSON.stringify(stored),new RegExp(player.token));
});

test('public names stay server-assigned even when a modified client submits a name',async t=>{
  const s=await setup(t);
  for(const name of ['https://example.com','A'.repeat(26),'AnotherPlayer']){
    assert.equal((await s.call('/v1/enroll',{turnstile:'proof',name},null)).status,400);
    assert.equal((await s.call('/v1/me',{country:'DK',name})).status,400);
  }
  assert.equal(s.db.prepare("SELECT name FROM players WHERE id='player'").get().name,'Knight-test');
});
test('pagination is bounded and deterministic and never exposes authentication data',async t=>{
  const s=await setup(t);
  for(let i=0;i<15;i++){s.db.prepare('INSERT INTO players VALUES (?,?,?,?)').run('p'+i,'hash'+i,'Knight-'+i,1);s.db.prepare('INSERT INTO records VALUES (?,?,?,?)').run('knockout','p'+i,15-i,1);}
  const first=await (await s.call('/v1/boards/knockout')).json(),next=await (await s.call('/v1/boards/knockout?page=2')).json();
  assert.equal(first.rows.length,10);assert.equal(first.hasNext,true);assert.equal(next.rows.length,5);assert.equal(next.hasNext,false);
  assert.equal(first.rows[0].score,15);assert.doesNotMatch(JSON.stringify(first),/token|hash|192\.0/);
});

for(const mode of ['solve-puzzle','timeAttack','knockout'])test(`${mode}: real workspace → client → Worker → SQLite ranks verified play`,async t=>{
  const s=await setup(t),dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'}),data={};
  const storage={async get(key){return {[key]:data[key]};},async set(values){Object.assign(data,values);}};
  const puzzles=Array.from({length:12},(_,i)=>({...mate,id:'p'+i,rating:450+i*40}));
  t.mock.method(globalThis,'fetch',async()=>Response.json({schema:1,puzzles}));
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>({moveAnim:false}),makePiece:()=>dom.window.document.createElement('span')});
  t.mock.method(w,'showPuzzleRunStart',async()=>true);
  w.leaderboardClient=new LeaderboardClient(storage,{endpoint:'https://rank.example',fetcher:async(url,options)=>{
    s.advance(1000);return worker.fetch(new Request(url,{...options,headers:{...options.headers,'CF-Connecting-IP':'192.0.2.1'}}),s.env,{waitUntil(){}});
  }});
  t.after(async()=>{await w.close();dom.window.close();});await w.open();await w.leaderboardClient.connect(token);
  await w.showLeaderboard(mode);await w.startRanked(mode);assert.ok(w.activity);assert.ok(w.ranked.started);
  const first=w.activity.id;
  await w.submitPuzzle(mate.solution[0]);
  assert.equal(w.ranked.score,1);
  if(mode==='solve-puzzle')assert.equal(s.db.prepare('SELECT score FROM records WHERE mode=?').get(mode),undefined);
  else assert.equal(s.db.prepare('SELECT score FROM records WHERE mode=?').get(mode).score,1);
  if(mode==='solve-puzzle')await w.nextPuzzle();
  assert.notEqual(w.activity.id,first);assert.equal(w.activity.id,w.ranked.puzzleId);
  await w.submitPuzzle(mate.solution[0]);assert.equal(w.ranked.score,2);
  if(w.run){await w.finishChallenge('Ended early');assert.equal(w.result.ranked,true);}
  await w.navigate('puzzles');await w.showLeaderboard(mode);
  assert.equal(w.root.querySelector('.leaderboard-personal strong').textContent,'2','Personal best is immediate even when the cached board is older');
  await w.leaderboardClient.practice.work;
  s.advance(61000);await w.loadLeaderboard(1,{fresh:true});
  assert.equal(w.root.querySelector('.leaderboard-score').textContent,'2');
});

test('practice batches verify assigned solutions and commit a five-puzzle total once',async t=>{
  const s=await setup(t),batch=await (await s.call('/v1/practice',{})).json();
  assert.equal(batch.puzzleIds.length,5);assert.equal(new Set(batch.puzzleIds).size,5);
  const body={session:batch.id,revision:batch.revision,attempts:batch.puzzleIds.map(puzzleId=>({puzzleId,moves:mate.solution}))};
  const wrong=await s.call('/v1/practice/attempts',{...body,attempts:[{puzzleId:'p-unknown',moves:mate.solution}]});assert.equal(wrong.status,400);
  assert.equal((await s.call('/v1/practice/attempts',body,otherToken)).status,409);
  const responses=await Promise.all([s.call('/v1/practice/attempts',body),s.call('/v1/practice/attempts',body)]);
  assert.ok(responses.every(r=>[200,409].includes(r.status)));
  const result=await (await s.call('/v1/practice/attempts',body)).json();assert.equal(result.total,5);
  assert.equal(s.db.prepare("SELECT score FROM records WHERE player_id='player' AND mode='solve-puzzle'").get().score,5);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM solves').get().n,5);
  assert.equal(result.puzzleIds.some(id=>batch.puzzleIds.includes(id)),false);
  assert.equal((await s.call('/v1/practice/attempts',{...body,attempts:Array(6).fill(body.attempts[0])})).status,400);
  const fresh=await (await s.call('/v1/practice',{})).json();assert.deepEqual(fresh.puzzleIds,result.puzzleIds);
});

test('a bad proof rejects the whole practice batch; closing a partial batch keeps its verified prefix',async t=>{
  const s=await setup(t),batch=await (await s.call('/v1/practice',{})).json();
  const proofs=batch.puzzleIds.slice(0,2).map(puzzleId=>({puzzleId,moves:mate.solution}));
  const wrong=new Chess(mate.fen).moves({verbose:true}).find(m=>m.lan!==mate.solution[0]&&!new Chess(m.after).isCheckmate()).lan;
  assert.equal((await s.call('/v1/practice/attempts',{session:batch.id,revision:0,attempts:[proofs[0],{...proofs[1],moves:[wrong]}]})).status,400);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM solves').get().n,0);
  const result=await (await s.call('/v1/practice/attempts',{session:batch.id,revision:0,attempts:proofs,end:true})).json();
  assert.equal(result.total,2);assert.equal(result.ended,true);
  const next=await (await s.call('/v1/practice',{})).json();assert.notEqual(next.id,batch.id);
  assert.equal(next.puzzleIds.some(id=>proofs.some(p=>p.puzzleId===id)),false);
});

function clientFor(s,t,data={},transport) {
  data['leaderboard:v1'] ||= {token,id:'player',name:'Knight-test',scores:{}};
  const storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};
  const fetcher=async(url,options)=>{const response=await s.call(new URL(url).pathname+new URL(url).search,options.body?JSON.parse(options.body):undefined);
    return transport?transport(response,url,options):response;};
  const client=new LeaderboardClient(storage,{endpoint:'https://rank.example',fetcher});t.after(()=>client.practice.stop());return {client,data,storage};
}

test('client practice buffers five proofs with immediate personal feedback, then sends one batch',async t=>{
  const s=await setup(t),requests=[];
  const {client}=clientFor(s,t,{},(response,url)=>{requests.push(url);return response;});
  const batch=await client.start('solve-puzzle');
  for(let i=0;i<4;i++)await client.practice.record(batch.puzzleIds[i],mate.solution);
  assert.equal(requests.filter(url=>url.endsWith('/attempts')).length,0);
  assert.deepEqual(await client.personal('solve-puzzle'),{score:4,confirmed:0,syncing:true,blocked:false,error:undefined});
  const next=await client.practice.record(batch.puzzleIds[4],mate.solution);
  assert.equal(requests.filter(url=>url.endsWith('/attempts')).length,1);assert.equal(next.score,5);assert.equal(next.syncing,false);
  assert.equal((await client.personal('solve-puzzle')).confirmed,5);
});

test('durable practice retries a lost response after restart without losing or duplicating solves',async t=>{
  const s=await setup(t),data={};let lose=true;
  const {client}=clientFor(s,t,data,(response,url)=>{if(lose&&url.endsWith('/attempts'))throw Error('Response lost');return response;});
  const batch=await client.start('solve-puzzle');await client.practice.record(batch.puzzleIds[0],mate.solution);
  await client.practice.record(batch.puzzleIds[1],mate.solution);await client.practice.flush();client.practice.stop();
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM solves').get().n,2);
  assert.equal(data['leaderboard:practice:v1'].pending.length,2);
  s.advance(61000);lose=false;
  const restarted=clientFor(s,t,data).client;await restarted.practice.resume();
  assert.equal(data['leaderboard:practice:v1'].pending.length,0);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM solves').get().n,2);
  assert.equal((await restarted.personal('solve-puzzle')).confirmed,2);
});

test('the 60-second timer flushes a partial practice batch and stops when there is nothing pending',async t=>{
  const s=await setup(t);t.mock.timers.enable({apis:['setTimeout']});
  const {client}=clientFor(s,t),batch=await client.start('solve-puzzle');await client.practice.record(batch.puzzleIds[0],mate.solution);
  assert.ok(client.practice.timer);t.mock.timers.tick(60000);await client.practice.work;
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM solves').get().n,1);assert.equal(client.practice.timer,null);
});

test('signup has no 100-player daily ceiling and lifetime counters no longer reject valid data',async t=>{
  const s=await setup(t);t.mock.method(globalThis,'fetch',async()=>Response.json({success:true,hostname:'rank.example',action:'enroll'}));
  s.db.prepare('INSERT INTO quotas VALUES (?,?)').run('enroll:'+Math.floor(s.now()/86400000),100);
  for(let i=0;i<101;i++)assert.equal((await s.call('/v1/enroll',{turnstile:'proof'},null)).status,201);
  assert.equal(s.db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='trigger' AND name IN ('bound_players','bound_solves')").get().n,0);
});

test('one player reaching the daily work allowance does not block other players',async t=>{
  const s=await setup(t),day=Math.floor(s.now()/86400000);
  s.db.prepare('INSERT INTO quotas VALUES (?,?)').run('player-player:'+day,10000);
  const blocked=await s.call('/v1/practice',{});assert.equal(blocked.status,503);assert.ok(Number(blocked.headers.get('Retry-After'))>0);
  assert.equal((await s.call('/v1/practice',{},otherToken)).status,200);
  s.advance(86400000);assert.equal((await s.call('/v1/practice',{})).status,200);
});

test('daily per-player requests include rejected proofs and repeated assignment requests',async t=>{
  const s=await setup(t),day=Math.floor(s.now()/86400000),batch=await (await s.call('/v1/practice',{})).json();
  const counter='requests-player:'+day,before=s.db.prepare('SELECT used FROM quotas WHERE key=?').get(counter).used;
  assert.equal((await s.call('/v1/practice/attempts',{session:batch.id,revision:0,attempts:[{puzzleId:'unassigned',moves:mate.solution}]})).status,400);
  assert.equal(s.db.prepare('SELECT used FROM quotas WHERE key=?').get(counter).used,before+1);
  s.db.prepare('UPDATE quotas SET used=2500 WHERE key=?').run(counter);
  assert.equal((await s.call('/v1/practice',{})).status,503);
  assert.equal((await s.call('/v1/practice',{},otherToken)).status,200);
  assert.equal((await s.call('/v1/delete-player',{})).status,200,'Deletion remains available at the app request ceiling');
});
