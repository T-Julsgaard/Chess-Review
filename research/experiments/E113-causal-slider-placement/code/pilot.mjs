import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './placement.mjs';
import {checkWitness} from './check-witness.mjs';
const data = await openResearchData(['D001'],{purpose:'test'}),rows = [];
for (const fixture of fixtures) {
  const result = explainMove(fixture);
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E113').map(e => e.id),fixture.expected);
  if (result.sliderPlacementAnalysis.witness) checkWitness(result.sliderPlacementAnalysis.witness,result,fixture);
  rows.push({fixture,result});
}
const dir = 'research/experiments/E113-causal-slider-placement';
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out')+1] : 'research/runs/E113/pilot';
const report = {schema:'E113-focused-pilot-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  source:'authored synthetic only',environment:{node:process.version,platform:process.platform,arch:process.arch},
  command:process.argv,engine:null,seed:null,inputHashes:JSON.parse(await readFile(dir+'/build.json','utf8')).inputHashes,
  workingTreeStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,rows};
const plain = Buffer.from(JSON.stringify(report)+'\n'),packed = gzipSync(plain,{level:9});
await mkdir(out,{recursive:true}); await writeFile(out+'/results.json.gz',packed);
await writeFile(out+'/run.json',JSON.stringify({schema:'E113-focused-retention-v1',sourceRevision:report.revision,
  environment:report.environment,command:report.command,engine:null,seed:null,inputHashes:report.inputHashes,
  outputHashes:{'results.json.gz':sha256(packed)},uncompressedSha256:sha256(plain),
  uncompressedBytes:plain.length,compressedBytes:packed.length,cases:rows.length,
  scope:'Provisional causal rook lift and queen centralization; combined acceptance deferred'},null,2)+'\n');
console.log(JSON.stringify({passed:true,cases:rows.length,positive:rows.filter(r => r.result.sliderPlacementAnalysis.status === 'proven').length,
  exhausted:rows.filter(r => r.result.sliderPlacementAnalysis.status === 'exhausted').length,plainBytes:plain.length,compressedBytes:packed.length,out}));
