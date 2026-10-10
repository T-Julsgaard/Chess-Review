import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {fixtures,live} from './fixtures.mjs';
import {mockContract} from './mock.mjs';
import {normalizeSynthetic} from './contract.mjs';
import {checkContract} from './check-contract.mjs';
import {explainMove} from './tablebase.mjs';
import {explainMove as parent} from '../../E139-recorded-geometric-traps/code/traps.mjs';
import {checkSourceRegistration} from './admission.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),rows=[];
for(const fixture of fixtures){let nodes=0;const view=normalizeSynthetic(fixture.input,fixture.envelope,{tick(){if(++nodes>50000)throw Error('pilot budget');}});checkContract(fixture.input,fixture.envelope,view);rows.push({fixture,nodes,view});}
const wrapperRows=[];for(const [id,extra,expected]of [['synthetic-wrapper',{tablebaseContract:mockContract(live)},'synthetic-contract-checked'],['real-header-refusal',{tablebaseContract:{kind:'registered-tablebase',approved:true}},'admission-unavailable'],['missing-contract',{},'missing-contract'],['zero-budget',{tablebaseContract:mockContract(live),maxTablebaseContractNodes:0},'exhausted'],['one-below-budget',{tablebaseContract:mockContract(live),maxTablebaseContractNodes:47},'exhausted'],['exact-budget',{tablebaseContract:mockContract(live),maxTablebaseContractNodes:48},'synthetic-contract-checked']]){
 const input={...live,tablebaseContractTags:true,...extra},result=explainMove(input),p=parent(input);assert.equal(result.tablebaseContractAnalysis.status,expected);assert.deepEqual(result.events,p.events);assert.equal(result.comment,p.comment);if(result.tablebaseContractAnalysis.view)checkContract(input,input.tablebaseContract,result.tablebaseContractAnalysis.view);wrapperRows.push({id,input,expected,result,parent:{events:p.events,comment:p.comment}});
}
const admissions=[];for(const url of ['https://tablebase.lichess.ovh/standard','https://database.lichess.org/standard/lichess_db_standard_rated_2026-06.pgn.zst'])admissions.push({url,result:await checkSourceRegistration(url)});
const dir='research/experiments/E140-tablebase-contract',out=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'research/runs/E140/pilot',support=JSON.parse(await readFile(dir+'/support.json','utf8'));
for(const [name,hash]of Object.entries(support.inputHashes)){const bytes=await readFile(name);assert.equal(sha256(name.endsWith('.wasm')?bytes:bytes.toString('utf8').replaceAll('\r\n','\n')),hash);}
const report={schema:'E140-prerequisite-pilot-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),stage:support.stage,coverageCredit:false,source:'authored synthetic contracts and source metadata only; no tablebase probes',environment:{node:process.version,platform:process.platform,arch:process.arch},command:process.argv,engine:null,seed:null,inputHashes:support.inputHashes,workingTreeStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,rows,wrapperRows,admissions};
const plain=Buffer.from(JSON.stringify(report)+'\n'),packed=gzipSync(plain,{level:9});await mkdir(out,{recursive:true});await writeFile(out+'/results.json.gz',packed);await writeFile(out+'/run.json',JSON.stringify({schema:'E140-prerequisite-retention-v1',sourceRevision:report.revision,stage:report.stage,coverageCredit:false,environment:report.environment,command:report.command,engine:null,seed:null,inputHashes:report.inputHashes,outputHashes:{'results.json.gz':sha256(packed)},uncompressedSha256:sha256(plain),uncompressedBytes:plain.length,compressedBytes:packed.length,cases:rows.length,wrapperCases:wrapperRows.length,admissionCases:admissions.length,scope:'Synthetic contract machinery and real admission refusal only; no tablebase outcome evidence'},null,2)+'\n');
console.log(JSON.stringify({passed:true,syntheticCases:rows.length,wrapperCases:wrapperRows.length,admissionCases:admissions.length,sourceInputs:Object.keys(report.inputHashes).length,coverageCredit:false,plainBytes:plain.length,compressedBytes:packed.length,out}));
