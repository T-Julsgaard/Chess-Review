import test from 'node:test';
import assert from 'node:assert/strict';
import {zstdCompressSync} from 'node:zlib';
import {firstFrame,recordsIn,normalize,metadata,selectCohort,digest,validateFresh} from './fresh-format.mjs';

// Authored legal sequence and headers; no observed game/player evidence.
const line='1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 1-0';
function pgn(i,month='2026-06'){return `[Event "Rated Blitz game"]\n[Site "https://lichess.org/${String(i).padStart(8,'0')}"]\n[White "synthetic-w-${i}"]\n[Black "synthetic-b-${i}"]\n[WhiteElo "1600"]\n[BlackElo "1650"]\n[UTCDate "${month.replace('-','.')}.01"]\n[Result "1-0"]\n[TimeControl "180+2"]\n\n${line}\n\n`;}
test('bounded frame parsing separates concatenation and rejects corruption/truncation',()=>{
  const payload=Buffer.from(pgn(1)),compressed=zstdCompressSync(payload),combined=Buffer.concat([compressed,compressed]);
  const frame=firstFrame(combined);assert.deepEqual(frame.frame,compressed);assert.deepEqual(frame.decoded,payload);
  assert.equal(firstFrame(compressed.subarray(0,compressed.length-1)),null);
  const skip=Buffer.from('502a4d180400000001020304','hex'),prefixed=firstFrame(Buffer.concat([skip,compressed]));assert.equal(prefixed.start,12);assert.deepEqual(prefixed.frame,compressed);assert.equal(firstFrame(skip.subarray(0,11)),null);
  const bad=Buffer.from(compressed);bad[4]|=8;assert.throws(()=>firstFrame(bad),/Reserved/);
  assert.throws(()=>firstFrame(Buffer.from('random wrong format')),/magic/);
});
test('byte locators reconstruct legal normalized history and metadata tampering fails',()=>{
  const decoded=Buffer.from(pgn(1)+pgn(2)),loc=recordsIn(decoded)[0],raw=decoded.subarray(loc.start,loc.end),game=normalize(raw,'2026-06',{artifact:'synthetic.zst',...loc});
  assert.equal(recordsIn(decoded).length,1);assert.equal(game.id,'00000001');assert.equal(game.moves[0],'e2e4');assert.ok(game.decisionCounts.w>=10);assert.ok(game.decisionCounts.b>=10);assert.equal(game.locator.sha256,digest(raw));
  assert.throws(()=>metadata(raw,'2026-07'),/origin/);assert.throws(()=>normalize(Buffer.from(pgn(1).replace(/1-0\n\n$/,'0-1\n\n')),'2026-06',loc),/mismatch/);
});
test('selection uses unique players, deterministic splits and no old identities',()=>{
  const decoded=Buffer.from(Array.from({length:8},(_,i)=>pgn(i+1)).join('')),frames=[{name:'synthetic.zst',month:'2026-06',decoded}],excluded={gameIds:['00000001'],playerIds:[]};
  const a=selectCohort(frames,excluded,6),b=selectCohort(frames,excluded,6);assert.deepEqual(a,b);assert.equal(a.games.length,6);assert.ok(a.games.every(g=>g.id!=='00000001'));
  assert.equal(a.games.filter(g=>g.split==='train').length,3);assert.equal(a.games.filter(g=>g.split==='validation').length,1);assert.equal(a.games.filter(g=>g.split==='test').length,2);
  assert.equal(new Set(a.games.flatMap(g=>g.players.map(p=>p.id))).size,12);
  assert.throws(()=>validateFresh({sourceRecord:'source',provenance:{exclusions:'exclude',exclusionInput:'old'}},new Map([['source',{}],['exclude',{inputSha256:'wrong'}],['old',[]]]),{old:'correct'}),/dependency/);
});

test('full fresh origin reconstruction rejects altered ratings despite a new summary',()=>{
  const frames=['2026-06','2026-07','2026-08'].map((month,k)=>({name:'synthetic-'+month+'.zst',month,decoded:Buffer.from(Array.from({length:301},(_,i)=>pgn(k*1000+i+1,month)).join(''))}));
  const excluded={inputSha256:'a'.repeat(64),gameIds:[],playerIds:[]},rebuilt=selectCohort(frames,excluded);
  const records=new Map([['old',[]],['exclude',excluded],['games',rebuilt.games]]),artifacts={};
  const sources={sources:frames.map(f=>{
    const raw=zstdCompressSync(f.decoded),entry={kind:'raw-pgn-zstd',bytes:raw.length,sha256:digest(raw),uncompressedSha256:digest(f.decoded)};
    records.set(f.name,f.decoded);artifacts[f.name]=entry;
    return{month:f.month,frames:[{artifact:f.name,start:0,bytes:entry.bytes,sha256:entry.sha256,decodedSha256:entry.uncompressedSha256}]};
  })};records.set('source',sources);
  const manifest={sourceRecord:'source',normalized:'games',artifacts,provenance:{exclusions:'exclude',exclusionInput:'old',exclusionCounts:rebuilt.exclusions}};
  assert.equal(validateFresh(manifest,records,{old:excluded.inputSha256}),true);
  const altered=structuredClone(rebuilt.games);altered[0].players[0].rating++;records.set('games',altered);
  assert.throws(()=>validateFresh(manifest,records,{old:excluded.inputSha256}),/normalization, selection or split differs/);
});
