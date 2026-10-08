import {openResearchData,sha256} from '../../../data-policy.mjs';await openResearchData(['D001'],{purpose:'test'});
const {readFile,readdir,stat}=await import('node:fs/promises');const {default:assert}=await import('node:assert/strict');
const {unpackReport}=await import('../../E079-central-king-support/code/saved.mjs');
const {replayResult}=await import('./replay.mjs');
const {fixtures,reflect}=await import('./fixtures.mjs');
const dir=process.argv[2]||'research/experiments/E081-direct-attacks/evidence',json=async p=>JSON.parse(await readFile(p,'utf8'));
const run=await json(dir+'/run.json'),report=unpackReport(await json(dir+'/results.json'));
for(const[file,hash]of Object.entries(run.inputHashes))assert.equal(sha256(file.endsWith('.gz')?await readFile(file):(await readFile(file,'utf8')).replaceAll('\r\n','\n')),hash,file);
for(const[file,hash]of Object.entries(run.outputHashes))assert.equal(sha256(await readFile(dir+'/'+file)),hash,file);
const priorDir='research/experiments/E080-pawn-shield-defense/evidence',prior=unpackReport(await json(priorDir+'/results.json')),priorRun=await json(priorDir+'/run.json');
const inherited=[...prior.results.map(r=>[r.fixture.id,sha256(JSON.stringify(r.result||{error:r.error}))]),...prior.baselineResults.map(r=>[r.fixture,r.fullResultHash])];assert.equal(inherited.length,5312);
assert.deepEqual(report.baselineResults.map(r=>[r.fixture,r.fullResultHash]),inherited);
const list='research/experiments/E020-coach-concepts/CONCEPTS.md';assert.equal(run.inputHashes[list],priorRun.inputHashes[list]);
assert.deepEqual(report.results.map(r=>r.fixture),JSON.parse(JSON.stringify(fixtures.flatMap(f=>[f,reflect(f)]))));
let errors=0,certificates=0;const states={},actors={w:{attackers:new Set(),targets:new Set()},b:{attackers:new Set(),targets:new Set()}};
for(const r of report.results){if(r.error){assert.ok(r.fixture.inputError&&r.error.includes(r.fixture.expectedError));errors++;continue;}const checked=replayResult(r.fixture,r.result);assert.equal(checked.state,r.fixture.expectedStatus||'proven');states[checked.state]=(states[checked.state]||0)+1;certificates+=checked.certificates;
const w=r.result.directAttackAnalysis?.witness;if(w){actors[w.actor].attackers.add(w.attacker);for(const t of w.targets)actors[w.actor].targets.add(t.target.type);for(const e of r.result.events.filter(e=>['direct-attack','attack-on-pawn','attack-on-piece'].includes(e.id))){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}}
if(r.fixture.parentSelectedId)assert.equal(r.result.events.find(e=>e.text===r.result.comment)?.id,r.fixture.parentSelectedId);
if(r.fixture.id.startsWith('all-capture-promotion-choices')){assert.equal(w.targets.length,2);for(const t of w.targets)assert.equal(t.captures.length,4);}
}
assert.equal(report.results.length,144);assert.equal(errors,36);assert.equal(certificates,50);assert.deepEqual(states,{proven:50,disabled:4,exhausted:4,'no-new-fact':28,'not-applicable':12,'not-live':10});
for(const actor of ['w','b']){assert.deepEqual([...actors[actor].attackers].sort(),['b','k','n','p','q','r']);assert.deepEqual([...actors[actor].targets].sort(),['b','n','p','q','r']);}
const rows=t=>new Map([...t.matchAll(/^- .* (C\d{4}) \*\*.*$/gm)].map(r=>[r[1],r[0]]));const before=rows(await readFile(priorDir+'/concept-status.md','utf8')),after=rows(await readFile(dir+'/concept-status.md','utf8'));let unchanged=0;
for(const[id,row]of before)if(!['C0404','C0410','C0411'].includes(id)){assert.equal(after.get(id),row,id);unchanged++;}assert.equal(unchanged,1082);for(const id of ['C0404','C0410','C0411'])assert.ok(after.get(id).startsWith('- [x]'));
let bytes=0;for(const f of await readdir(dir))bytes+=(await stat(dir+'/'+f)).size;
console.log(JSON.stringify({passed:true,revision:run.codeRevision,cases:report.fixtures,newCases:144,inherited:5312,certificates,errors,states,unchangedOccurrences:unchanged,inputCount:Object.keys(run.inputHashes).length,bytes,elapsedMs:Math.round(run.elapsedMs),metrics:run.metrics},null,2));