import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {hash} from '../../../../tools/calibration/io.mjs';
import {fitQualityStudy,assessQualityStudy} from './study.mjs';

const evidenceDir=new URL('../evidence/',import.meta.url);
const inputs=JSON.parse(await readFile(new URL('inputs.json',evidenceDir)));
const records={};
for(const [study,entry]of Object.entries(inputs.archives)){
  const bytes=await readFile(new URL(entry.file,evidenceDir));
  if(hash(bytes)!==entry.sha256||bytes.length!==entry.bytes)throw Error('Archive input hash differs');
  const evidence=JSON.parse(gunzipSync(bytes));
  const model=fitQualityStudy(evidence);
  const report={development:assessQualityStudy(evidence,model,'validation'),test:assessQualityStudy(evidence,model,'test')};
  // Archived expected coefficients/reports are opened only after training-only refit.
  const expectedBytes=await readFile(new URL('../../E001-evidence-audit/evidence/'+study+'-archive.json',import.meta.url));
  const expected=JSON.parse(expectedBytes);
  const modelMatches=JSON.stringify(model)===JSON.stringify(expected.model),reportMatches=JSON.stringify(report)===JSON.stringify(expected.report);
  if(!modelMatches||!reportMatches)throw Error('Archived numerical outputs differ: '+study);
  records[study]={modelMatches,reportMatches,model,report,sourceSha256:entry.sha256,expectedSnapshotSha256:hash(expectedBytes),
    counts:{games:evidence.games.length,positions:evidence.positions.length,searches:evidence.searches.length,
      trainingChoices:evidence.positions.filter(p=>p.split==='train').length},
    note:'Retrospective numerical reproduction; original reports previously inspected; no new confirmation'};
}
const output=JSON.stringify({schema:'E003-retrospective-replay-v1',passed:true,records},null,2)+'\n';
await writeFile(new URL('replay.json',evidenceDir),output);
const root=fileURLToPath(new URL('../../../../',import.meta.url));
let sourceRevision=null;
try{sourceRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();}catch{/* Independent source copy need not have Git. */}
await writeFile(new URL('run.json',evidenceDir),JSON.stringify({schema:'research-run-v1',id:'E003-retrospective-replay',date:'2026-10-05',sourceRevision,
  command:'node research/experiments/E003-sf19-archive-replay/code/replay.mjs',environment:{node:process.version,platform:process.platform,arch:process.arch},
  evaluationRole:'retrospective replay of consumed development/test evidence',seed:18019,bootstrapIterations:2000,engineSearches:0,
  inputs,codeSha256:{'replay.mjs':hash(await readFile(fileURLToPath(import.meta.url))),'study.mjs':hash(await readFile(new URL('study.mjs',import.meta.url)))},
  outputs:{'replay.json':hash(output)}},null,2)+'\n');
console.log(JSON.stringify({passed:true,studies:Object.fromEntries(Object.entries(records).map(([study,r])=>[study,{modelMatches:r.modelMatches,reportMatches:r.reportMatches,testPassed:r.report.test.passed,testChoiceEffect:r.report.test.pairedDifference.choice,testOutcomeEffect:r.report.test.pairedDifference.outcome}]))},null,2));
