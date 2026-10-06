import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {explainMove} from './proofs.mjs';
import {replay as replayNew} from './replay.mjs';
import {replay} from '../../E023-broad-tactics/code/replay.mjs';
import {replay as replayMove} from '../../E022-move-tactics/code/replay.mjs';
import {Chess} from '../../../../lib/chess.js';
import {renderStatus} from './status.mjs';
import {renderDemo} from '../../E020-coach-concepts/code/demo.mjs';
import {replayCertificate} from '../../E020-coach-concepts/code/certificate.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),base='research/experiments/E026-pin-proofs',args=process.argv.slice(2);
assert.ok(!args.length||(args.length===2&&args[0]==='--out'),'Usage: run.mjs [--out PATH]');
const out=path.resolve(root,args[1]||`${base}/evidence`),relative=path.relative(path.join(root,'research'),out);
assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'Output must stay inside research/');
const data=await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs');
const {fixtures:formationFixtures}=await import('../../E025-pawn-formations/code/fixtures.mjs');
const {fixtures:transitionFixtures}=await import('../../E024-transitions/code/fixtures.mjs');
const {fixtures:broadFixtures}=await import('../../E023-broad-tactics/code/fixtures.mjs');
const {fixtures:moveFixtures,newIds}=await import('../../E022-move-tactics/code/fixtures.mjs');
const {fixtures:structure}=await import('../../E021-structural-concepts/code/fixtures.mjs');
const {fixtures:original}=await import('../../E020-coach-concepts/code/fixtures.mjs');
const results=[],replays=[],started=performance.now();
for(const fixture of [...fixtures,...formationFixtures,...transitionFixtures,...broadFixtures,...moveFixtures,...structure,...original].flatMap(f=>[f,reflect(f)])){
 if(fixture.invalid){assert.throws(()=>explainMove(fixture),/Illegal move/);results.push({fixture,error:'Illegal move; explanation refused.'});continue;}
 const result=explainMove(fixture),ids=result.events.map(e=>e.id);
 for(const id of fixture.expected)assert.ok(ids.includes(id),`${fixture.id}: missing ${id}`);
 for(const id of fixture.absent||[])assert.ok(!ids.includes(id),`${fixture.id}: unexpected ${id}`);
 if(fixture.expectedNew)assert.deepEqual(ids.filter(id=>newIds.has(id)).sort(),[...fixture.expectedNew].sort());
 assert.ok(!result.comment||result.comment.split(/\s+/).length<=24);
 for(const e of result.events){
  if(['relative-pin','cross-pin','certified-removal'].includes(e.id))replays.push({fixture:fixture.id,kind:e.id,...replayNew(fixture,e)});
  if(['broad-fork','triple-attack','discovered-double-attack','hanging-piece'].includes(e.id))replays.push({fixture:fixture.id,kind:e.id,...replay(fixture,e)});
  if(['absolute-skewer','profitable-capture','winning-exchange'].includes(e.id))replays.push({fixture:fixture.id,kind:e.id,...replayMove(fixture,e)});
  if(e.id==='allows-mate'){const c=new Chess(result.after);c.move(e.evidence.move);assert.ok(c.isCheckmate());assert.equal(c.fen(),e.evidence.after);}
  if(e.id==='fork')replays.push({fixture:fixture.id,kind:e.id,...replayCertificate(fixture.fen,fixture.move,e.evidence)});
  if(e.id==='allows-fork')replays.push({fixture:fixture.id,kind:e.id,...replayCertificate(result.after,e.evidence.threat.move,e.evidence.threat)});
  if(e.id==='avoids-fork'){const alternative=explainMove({...fixture,move:fixture.alternative,alternative:null});replays.push({fixture:fixture.id,kind:e.id,...replayCertificate(alternative.after,e.evidence.threat.move,e.evidence.threat)});}
 }
 results.push({fixture,result});
}
const newResults=results.slice(0,fixtures.length*2),baselineResults=results.slice(fixtures.length*2).map(row=>({fixture:row.fixture.id,fen:row.fixture.fen,move:row.fixture.move,after:row.result?.after||null,comment:row.result?.comment||null,error:row.error||null,eventIds:row.result?.events.map(e=>e.id)||[],fullResultHash:sha256(JSON.stringify(row.result||{error:row.error})),sourceEvidence:'E020–E025 frozen evidence; regenerate full E026 result with committed explainMove API'}));
const report={schema:'E026-synthetic-mechanics-v1',source:'authored synthetic development fixtures; no real games',fixtures:results.length,newFixtureCases:fixtures.length*2,baselineCases:(formationFixtures.length+transitionFixtures.length+broadFixtures.length+moveFixtures.length+structure.length+original.length)*2,
 accepted:results.filter(r=>r.result?.events.length).length,abstained:results.filter(r=>r.result&&!r.result.events.length).length,invalid:results.filter(r=>r.error).length,
 maxCommentWords:Math.max(...results.map(r=>r.result?.comment?.split(/\s+/).length||0)),eventCounts:Object.fromEntries([...new Set(results.flatMap(r=>r.result?.events.map(e=>e.id)||[]))].sort().map(id=>[id,results.reduce((n,r)=>n+(r.result?.events.filter(e=>e.id===id).length||0),0)])),replays,results:newResults,baselineResults};
// Adapt the frozen demo's fork-shaped highlight input; canonical evidence
// retains the original event schema in results.json.
const display=newResults.map(row=>row.result?{...row,result:{...row.result,events:row.result.events.map(e=>{
 const attacker=e.evidence.attacker||e.evidence.attackers?.[0]?.square||(e.evidence.target&&e.evidence.slider);
 if(!attacker)return e;const target=e.evidence.target;
 return{...e,evidence:{...e.evidence,attacker,targets:e.evidence.targets||(target?[typeof target==='string'?{square:target}:target]:[])}};
})}}:row);
const json=JSON.stringify(report,null,2)+'\n',html=renderDemo(display).replace('<h1>Coach concepts</h1>','<h1>Coach concepts · conditional pins and defender-removal proofs</h1>').replace('A research prototype for comments grounded in legal moves. Constructed positions; no extension integration.','Short comments explain relative pins, mixed cross-pins and certified defender removal with explicit immediate scope. Authored positions; no extension integration.').replace('<nav aria-label="Filter examples">','<p><a href="../../E024-transitions/evidence/demo.html">Earlier endgame and trade examples</a> · <a href="../../E023-broad-tactics/evidence/demo.html">Tactical and structural examples</a> · Inherited cases are checked and fingerprinted in results.json.</p><nav aria-label="Filter examples">'),status=renderStatus(await readFile(path.join(root,'research/experiments/E020-coach-concepts/CONCEPTS.md'),'utf8'),report);
const inputs=['lib/chess.js',`${base}/plan.md`,...['proofs.mjs','replay.mjs','fixtures.mjs','proofs.test.mjs','status.mjs','run.mjs'].map(n=>`${base}/code/${n}`),...['formations.mjs','selection.mjs','fixtures.mjs','status.mjs'].map(n=>`research/experiments/E025-pawn-formations/code/${n}`),...['transitions.mjs','fixtures.mjs','status.mjs'].map(n=>`research/experiments/E024-transitions/code/${n}`),...['tactics.mjs','replay.mjs','fixtures.mjs','status.mjs'].map(n=>`research/experiments/E023-broad-tactics/code/${n}`),...['tactics.mjs','replay.mjs','fixtures.mjs','status.mjs'].map(n=>`research/experiments/E022-move-tactics/code/${n}`),...['features.mjs','explain.mjs','fixtures.mjs','status.mjs'].map(n=>`research/experiments/E021-structural-concepts/code/${n}`),...['concepts.mjs','certificate.mjs','fixtures.mjs','demo.mjs','status.mjs'].map(n=>`research/experiments/E020-coach-concepts/code/${n}`),'research/experiments/E020-coach-concepts/CONCEPTS.md'];
const inputHashes={};for(const name of inputs)inputHashes[name]=sha256((await readFile(path.join(root,name),'utf8')).replaceAll('\r\n','\n'));
const run={schema:'research-synthetic-run-v1',experiment:'E026',date:new Date().toISOString(),codeRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),workingTreeStatus:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),command:`node ${base}/code/run.mjs`+(args.length?` --out ${args[1]}`:''),evaluationRole:'exposed synthetic development mechanics; not independent explanation precision',environment:{node:process.version,platform:os.platform(),arch:os.arch()},config:{maxNodes:50000,maxTacticNodes:50000,maxBroadNodes:50000,maxProofNodes:50000,historyMaxPlies:1000,scanReplies:true,engine:null,seed:null,commentWordLimit:24},eligibilityReceipt:data.receipt,inputHashes,outputHashes:{'results.json':sha256(json),'demo.html':sha256(html),'concept-status.md':sha256(status)},elapsedMs:performance.now()-started,metrics:{fixtures:report.fixtures,newFixtureCases:report.newFixtureCases,baselineCases:report.baselineCases,accepted:report.accepted,abstained:report.abstained,invalid:report.invalid,maxCommentWords:report.maxCommentWords,certificates:replays.length,broadCertificates:replays.filter(r=>['broad-fork','triple-attack','discovered-double-attack','hanging-piece'].includes(r.kind)).length,defenderReplies:replays.reduce((n,r)=>n+(r.replies??r.defenderReplies),0),counterreplyLeaves:replays.reduce((n,r)=>n+(r.leaves??r.counterreplyLeaves),0)}};
await mkdir(out,{recursive:true});for(const [name,content]of Object.entries({'results.json':json,'demo.html':html,'concept-status.md':status,'run.json':JSON.stringify(run,null,2)+'\n'}))await writeFile(path.join(out,name),content);
console.log(JSON.stringify({passed:true,...run.metrics,elapsedMs:Math.round(run.elapsedMs),out,outputHashes:run.outputHashes},null,2));
