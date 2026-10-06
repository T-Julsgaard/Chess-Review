import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {explainMove} from './explain.mjs';
import {renderStatus} from './status.mjs';
import {renderDemo} from '../../E020-coach-concepts/code/demo.mjs';
import {replayCertificate} from '../../E020-coach-concepts/code/certificate.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),base='research/experiments/E021-structural-concepts';
const args=process.argv.slice(2);
assert.ok(!args.length||(args.length===2&&args[0]==='--out'),'Usage: run.mjs [--out PATH]');
const out=path.resolve(root,args[1]||`${base}/evidence`),relative=path.relative(path.join(root,'research'),out);
assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative),'Output must stay inside research/');
const data=await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs');
const {fixtures:old}=await import('../../E020-coach-concepts/code/fixtures.mjs');
const started=performance.now(),results=[],replays=[];
for(const fixture of [...fixtures,...old].flatMap(f=>[f,reflect(f)])){
  if(fixture.invalid){assert.throws(()=>explainMove(fixture),/Illegal move/);results.push({fixture,error:'Illegal move; explanation refused.'});continue;}
  const result=explainMove(fixture),ids=result.events.map(e=>e.id);
  for(const id of fixture.expected)assert.ok(ids.includes(id),`${fixture.id}: missing ${id}`);
  for(const id of fixture.absent||[])assert.ok(!ids.includes(id),`${fixture.id}: unexpected ${id}`);
  assert.ok(!result.comment||result.comment.split(/\s+/).length<=24);
  assert.equal(result.diagnostics.tactics,'complete');
  for(const e of result.events){
    if(e.id==='fork')replays.push({fixture:fixture.id,kind:e.id,...replayCertificate(fixture.fen,fixture.move,e.evidence)});
    if(e.id==='allows-fork')replays.push({fixture:fixture.id,kind:e.id,...replayCertificate(result.after,e.evidence.threat.move,e.evidence.threat)});
    if(e.id==='avoids-fork'){
      const alternative=explainMove({...fixture,move:fixture.alternative,alternative:null});
      replays.push({fixture:fixture.id,kind:e.id,...replayCertificate(alternative.after,e.evidence.threat.move,e.evidence.threat)});
    }
  }
  results.push({fixture,result});
}
const report={schema:'E021-synthetic-mechanics-v1',source:'authored synthetic fixtures; no real games',fixtures:results.length,
  newFixtureCases:fixtures.length*2,baselineCases:old.length*2,
  accepted:results.filter(r=>r.result?.events.length).length,abstained:results.filter(r=>r.result&&!r.result.events.length).length,
  invalid:results.filter(r=>r.error).length,maxCommentWords:Math.max(...results.map(r=>r.result?.comment?.split(/\s+/).length||0)),
  eventCounts:Object.fromEntries([...new Set(results.flatMap(r=>r.result?.events.map(e=>e.id)||[]))].sort().map(id=>[id,results.reduce((n,r)=>n+(r.result?.events.filter(e=>e.id===id).length||0),0)])),replays,results};
const json=JSON.stringify(report,null,2)+'\n';
const html=renderDemo(results).replace('<h1>Coach concepts</h1>','<h1>Coach concepts · structural expansion</h1>').replace('A research prototype for comments grounded in legal moves. Constructed positions; no extension integration.','Short factual comments identify pawn structures, files, batteries, blockades and piece placement. Authored positions; no extension integration.');
const status=renderStatus(await readFile(path.join(root,'research/experiments/E020-coach-concepts/CONCEPTS.md'),'utf8'),report);
const inputs=['lib/chess.js',`${base}/plan.md`,...['features.mjs','explain.mjs','fixtures.mjs','features.test.mjs','status.mjs','run.mjs'].map(n=>`${base}/code/${n}`),...['concepts.mjs','certificate.mjs','fixtures.mjs','demo.mjs','status.mjs'].map(n=>`research/experiments/E020-coach-concepts/code/${n}`),'research/experiments/E020-coach-concepts/CONCEPTS.md'];
const inputHashes={};for(const name of inputs)inputHashes[name]=sha256((await readFile(path.join(root,name),'utf8')).replaceAll('\r\n','\n'));
const run={schema:'research-synthetic-run-v1',experiment:'E021',date:new Date().toISOString(),codeRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  workingTreeStatus:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),command:`node ${base}/code/run.mjs`+(args.length?` --out ${args[1]}`:''),
  evaluationRole:'exposed synthetic development mechanics; no human or real-game confirmation',environment:{node:process.version,platform:os.platform(),arch:os.arch()},
  config:{maxNodes:50000,scanReplies:true,engine:null,seed:null,commentWordLimit:24},eligibilityReceipt:data.receipt,inputHashes,
  outputHashes:{'results.json':sha256(json),'demo.html':sha256(html),'concept-status.md':sha256(status)},elapsedMs:performance.now()-started,
  metrics:{fixtures:report.fixtures,newFixtureCases:report.newFixtureCases,baselineCases:report.baselineCases,accepted:report.accepted,abstained:report.abstained,invalid:report.invalid,maxCommentWords:report.maxCommentWords,certificates:replays.length,defenderReplies:replays.reduce((n,r)=>n+r.defenderReplies,0),counterreplyLeaves:replays.reduce((n,r)=>n+r.counterreplyLeaves,0)}};
await mkdir(out,{recursive:true});
for(const [name,content] of Object.entries({'results.json':json,'demo.html':html,'concept-status.md':status,'run.json':JSON.stringify(run,null,2)+'\n'}))await writeFile(path.join(out,name),content);
console.log(JSON.stringify({passed:true,...run.metrics,elapsedMs:Math.round(run.elapsedMs),out,outputHashes:run.outputHashes},null,2));
