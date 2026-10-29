import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {LEADERBOARD_NAME_MAX,validLeaderboardName} from '../lib/learning/leaderboard-name.js';
import {LeaderboardClient} from '../lib/learning/leaderboard-client.js';
import {parseLeaderboardCsv} from '../lib/learning/leaderboard-preview.js';

const valid=['A','Knight-0123456789','Player_23','Chess Review','A'.repeat(25)];
const invalid=['','A'.repeat(26),'https://example.com','example.com','www.example.com','Name@site','<b>Name</b>',
  'A\n','A\r','A\0hidden','A\tB','A\u202eB','A\u200bB','♞Player',' Name','Name ','_Name','Name-'];

test('live names allow up to 25 plain characters and reject links, markup and hidden characters',()=>{
  assert.equal(LEADERBOARD_NAME_MAX,25);
  for(const name of valid)assert.equal(validLeaderboardName(name),true,name);
  for(const name of [...invalid,null,25,{}])assert.equal(validLeaderboardName(name),false,JSON.stringify(name));
});

test('database migration repairs invalid imports and blocks unsafe inserts and updates',t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const folder=new URL('../services/leaderboard/migrations/',import.meta.url),migration='0004_player_names.sql';
  for(const file of readdirSync(folder).filter(f=>f.endsWith('.sql')&&f!==migration).sort())db.exec(readFileSync(new URL(file,folder),'utf8'));
  const insert=db.prepare('INSERT INTO players VALUES (?,?,?,?)');
  insert.run('legacy','legacy-token','https://example.com',1);insert.run('kept','kept-token','Knight-safe',1);
  db.exec(readFileSync(new URL(migration,folder),'utf8'));
  assert.equal(validLeaderboardName(db.prepare("SELECT name FROM players WHERE id='legacy'").get().name),true);
  assert.equal(db.prepare("SELECT name FROM players WHERE id='kept'").get().name,'Knight-safe');
  valid.forEach((name,i)=>insert.run('valid'+i,'valid-token'+i,name,1));
  for(const name of invalid){
    assert.throws(()=>insert.run('invalid','invalid-token',name,1),/Invalid player name/);
    assert.throws(()=>db.prepare("UPDATE players SET name=? WHERE id='kept'").run(name),/Invalid player name/);
  }
  assert.equal(db.prepare("SELECT name FROM players WHERE id='kept'").get().name,'Knight-safe');
});

test('client rejects invalid names from online credentials and ranking responses',async()=>{
  const data={},storage={async get(key){return {[key]:data[key]};},async set(values){Object.assign(data,values);}};
  for(const name of ['https://example.com','A'.repeat(26),'<b>Name</b>']){
    const client=new LeaderboardClient(storage,{endpoint:'https://rank.example',fetcher:async url=>Response.json(url.endsWith('/v1/me')?{id:'me',name}:{rows:[{id:'me',name,score:10}],hasNext:false})});
    await assert.rejects(client.connect('a'.repeat(64)),/Invalid player name/);
    await assert.rejects(client.list('knockout',1),/Leaderboard unavailable/);
    assert.equal(data['leaderboard:v1'],undefined);
  }
});

test('temporary CSV names follow the same 25-character display limit',()=>{
  assert.equal(parseLeaderboardCsv('mode,player,solved\nknockout,'+'A'.repeat(25)+',1').count,1);
  assert.throws(()=>parseLeaderboardCsv('mode,player,solved\nknockout,'+'A'.repeat(26)+',1'),/Invalid CSV record/);
});
