import {openResearchData,sha256} from '../../../data-policy.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {readFile,readdir,stat}=await import('node:fs/promises');
const {default:assert}=await import('node:assert/strict');
const {unpackReport}=await import('../../E079-central-king-support/code/saved.mjs');
const {replayResult}=await import('./replay.mjs');
const {fixtures,reflect}=await import('./fixtures.mjs');
const dir=process.argv[2]||'research/experiments/E080-pawn-shield-defense/evidence';
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const run=await json(dir+'/run.json'),report=unpackReport(await json(dir+'/results.json'));
for(const[file,hash]of Object.entries(run.inputHashes))assert.equal(sha256(file.endsWith('.gz')?await readFile(file):(await readFile(file,'utf8')).replaceAll('\r\n','\n')),hash,file);
for(const[file,hash]of Object.entries(run.outputHashes))assert.equal(sha256(await readFile(dir+'/'+file)),hash,file);
const priorDir='research/experiments/E079-central-king-support/evidence',prior=unpackReport(await json(priorDir+'/results.json')),priorRun=await json(priorDir+'/run.json');
const inherited=[...prior.results.map(r=>[r.fixture.id,sha256(JSON.stringify(r.result||{error:r.error}))]),...prior.baselineResults.map(r=>[r.fixture,r.fullResultHash])];
assert.equal(inherited.length,5190);
const actual=report.baselineResults.map(r=>[r.fixture,r.fullResultHash]);
assert.equal(actual.length,inherited.length);
for(let i=0;i<actual.length;i++)assert.deepEqual(actual[i],inherited[i],'ordered inherited fingerprint '+i);
const list='research/experiments/E020-coach-concepts/CONCEPTS.md';assert.equal(run.inputHashes[list],priorRun.inputHashes[list]);
assert.deepEqual(report.results.map(r=>r.fixture),fixtures.flatMap(f=>[f,reflect(f)]));
let errors=0,certificates=0,replies=0,leaves=0;const states={},home={w:new Set(),b:new Set()},families=new Set();
for(const row of report.results){
 if(row.error){assert.ok(row.fixture.inputError&&row.error.includes(row.fixture.expectedError));errors++;continue;}
 const checked=replayResult(row.fixture,row.result);assert.equal(checked.state,row.fixture.expectedStatus||'proven');
 states[checked.state]=(states[checked.state]||0)+1;certificates+=checked.certificates;replies+=checked.replies;leaves+=checked.leaves;
 const a=row.result.pawnShieldAnalysis;
 if(a?.witness){const w=a.witness;home[w.actor].add(w.before.king[0]);families.add(w.blockedCapture.piece);
  assert.equal(w.before.king,w.after.king);assert.ok(w.before.cover.includes(w.played.from));assert.ok(w.after.cover.includes(w.played.to));
  const event=row.result.events.find(e=>e.id==='pawn-shield-defense');assert.equal(event.qualityClaim,false);assert.ok(event.text.split(/\s+/).length<=24);
 }
 if(row.fixture.parentSelectedId)assert.equal(row.result.events.find(e=>e.text===row.result.comment).id,row.fixture.parentSelectedId);
}
assert.equal(report.results.length,122);assert.equal(errors,38);assert.equal(certificates,16);
assert.deepEqual(states,{proven:16,'no-new-fact':40,disabled:2,exhausted:4,'not-applicable':12,'not-live':10});
for(const actor of ['w','b'])assert.deepEqual([...home[actor]].sort(),['c','e','g']);assert.deepEqual([...families].sort(),['q','r']);
const rows=t=>new Map([...t.matchAll(/^- .* (C\d{4}) \*\*.*$/gm)].map(r=>[r[1],r[0]]));
const before=rows(await readFile(priorDir+'/concept-status.md','utf8')),after=rows(await readFile(dir+'/concept-status.md','utf8'));
let unchanged=0;for(const[id,row]of before)if(!['C0226','C0400'].includes(id)){assert.equal(after.get(id),row,id);unchanged++;}
assert.equal(unchanged,1083);for(const id of ['C0226','C0400'])assert.ok(after.get(id).startsWith('- [x]'));
assert.ok(after.get('C0227').includes('Partial:'));assert.ok(after.get('C0384').includes('Partial:'));
let bytes=0;for(const file of await readdir(dir))bytes+=(await stat(dir+'/'+file)).size;
console.log(JSON.stringify({passed:true,source:run.codeRevision,cases:report.fixtures,newCases:report.results.length,inherited:5190,certificates,errors,states,replies,leaves,unchangedOccurrences:unchanged,bytes,elapsedMs:Math.round(run.elapsedMs),metrics:run.metrics},null,2));
