import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {syncLeaderboardCountry} from '../lib/learning/leaderboard-country.js';
import {PLAYER_HISTORY_KEY} from '../lib/player-history.js';
import worker,{digest} from '../services/leaderboard/worker.js';

test('only the explicitly chosen country is published, changes synchronize once, and preview stays local',async()=>{
  const store={"leaderboardPreferences:v1":{version:1,enabled:true,nationality:'DK'},[PLAYER_HISTORY_KEY]:{chesscom:[1,2,3].map(id=>({site:'chesscom',id:String(id),white:'Owner',black:'Opponent'+id,whiteCountry:'FR'}))}},requests=[];
  const player={id:'key-player',token:'private-key',name:'Knight-generated'};
  const client={endpoint:'https://rank.example',storage:{async get(key){assert.notEqual(key,PLAYER_HISTORY_KEY);assert.notEqual(key,'library');return {[key]:structuredClone(store[key])};},async set(values){Object.assign(store,values);}},
    async request(path,options){requests.push({path,...options});}};
  await syncLeaderboardCountry(client,player);await syncLeaderboardCountry(client,player);
  assert.equal(requests.length,1);assert.deepEqual(requests[0].body,{country:'DK'});
  assert.equal(requests[0].token,'private-key');assert.doesNotMatch(JSON.stringify(requests),/Owner|Opponent/);
  store['leaderboardPreferences:v1'].nationality='US';
  await syncLeaderboardCountry(client,player);assert.equal(requests[1].body.country,'US');
  client.preview=true;client.storage.get=()=>{throw Error('Preview must not read history');};
  await syncLeaderboardCountry(client,player);assert.equal(requests.length,2);
});

test('legacy inferred-country sharing is removed until the user explicitly chooses a country',async()=>{
  const store={'leaderboardPreferences:v1':{version:1,enabled:true,showNationality:true}},requests=[];
  const client={storage:{async get(key){assert.equal(key,'leaderboardPreferences:v1');return {[key]:store[key]};},async set(value){Object.assign(store,value);}},
    async request(path,options){requests.push(options.body);}};
  await syncLeaderboardCountry(client,{id:'key-player'});await syncLeaderboardCountry(client,{id:'key-player'});
  assert.deepEqual(requests,[{country:null}]);assert.equal(store['leaderboardPreferences:v1'].showNationality,false);
});

test('authenticated country updates reach public rows, reject invalid flags, and disappear on player deletion',async t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const migrations=new URL('../services/leaderboard/migrations/',import.meta.url);
  for(const file of readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL(file,migrations),'utf8'));
  const token='a'.repeat(64);db.prepare('INSERT INTO players VALUES (?,?,?,?)').run('player',await digest(token),'Knight-test',1);
  db.prepare('INSERT INTO records VALUES (?,?,?,?)').run('knockout','player',42,1);
  const adapter={prepare(sql){return {bind(...args){const statement=db.prepare(sql);return {async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return statement.run(...args);}};}};}};
  const allow={async limit(){return {success:true};}},env={DB:adapter,ENABLED:'true',TURNSTILE_SECRET_KEY:'secret',IP_HASH_KEY:'hash-key',TURNSTILE_HOSTNAME:'rank.example',TURNSTILE_SITE_KEY:'site',READ_LIMIT:allow,WRITE_LIMIT:allow,JOIN_LIMIT:allow,GLOBAL_LIMIT:allow,PLAYER_LIMIT:allow,START_LIMIT:allow};
  const call=(path,body,key=token)=>worker.fetch(new Request('https://rank.example'+path,{method:body?'POST':'GET',headers:{'CF-Connecting-IP':'192.0.2.1',...(key?{Authorization:'Bearer '+key}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,{waitUntil(){}});
  assert.equal((await call('/v1/me',{country:'dk'},null)).status,401);
  for(const country of ['../../DK','ZZ','',{},'x'.repeat(100)])assert.equal((await call('/v1/me',{country})).status,400);
  assert.equal((await call('/v1/me',{country:'dk'})).status,200);
  const board=await (await call('/v1/boards/knockout')).json();
  assert.deepEqual(board.rows,[{id:'player',name:'Knight-test',score:42,country:'DK'}]);
  assert.equal((await call('/v1/me',{country:null})).status,200);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM player_countries').get().count,0);
  assert.equal(db.prepare('SELECT score FROM records').get().score,42,'Removing nationality keeps the player and score');
  assert.equal((await call('/v1/me',{country:'2'})).status,200);
  assert.equal(db.prepare('SELECT country FROM player_countries').get().country,'2');
  assert.equal((await call('/v1/delete-player',{})).status,200);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM player_countries').get().count,0);
});
