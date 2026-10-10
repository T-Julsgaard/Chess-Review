import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {openResearchTablebases} from '../../../tablebase-data-policy.mjs';
import {savedObservations} from './saved-observations.mjs';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './tablebases.mjs';
import {checkPanel} from './check-panel.mjs';
const game=await openResearchData(['D001'],{purpose:'test'}),tables=await openResearchTablebases(),saved=await savedObservations(),rows=[];
for(const [i,fixture]of fixtures.entries()){const stored=saved.rows[i];assert.deepEqual(stored.fixture,fixture);const bundle=stored.bundle,result=explainMove({...fixture,admittedTablebasePanel:bundle});checkPanel(fixture,bundle,result);assert.deepEqual(result.events.filter(e=>e.evidence?.experiment==='E141').map(e=>e.id),fixture.expected);rows.push({fixture,bundle,result});}
const dir='research/experiments/E141-admitted-kqk-tablebases',out=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'research/runs/E141/pilot',build=JSON.parse(await readFile(dir+'/build.json','utf8'));
for(const [name,hash]of Object.entries(build.inputHashes))assert.equal(sha256((await readFile(name,'utf8')).replaceAll('\r\n','\n')),hash,'Changed source '+name);
const report={schema:'E141-focused-pilot-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:'authored synthetic positions; genuine admitted local Syzygy observations',environment:{node:process.version,platform:process.platform,arch:process.arch},command:process.argv,engine:null,probe:rows[0].bundle.panel.metadata,seed:null,inputHashes:build.inputHashes,workingTreeStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),gameGuardReceipt:game.receipt,tablebaseReceipt:tables.receipt,collectionSource:{revision:saved.revision,inputHashes:saved.sourceHashes,reused:true,observationsSha256:sha256(await readFile(dir+'/evidence/observations.json.gz'))},rows};
const plain=Buffer.from(JSON.stringify(report)+'\n'),packed=gzipSync(plain,{level:9});await mkdir(out,{recursive:true});await writeFile(out+'/results.json.gz',packed);await writeFile(out+'/run.json',JSON.stringify({schema:'E141-focused-retention-v1',sourceRevision:report.revision,environment:report.environment,command:report.command,engine:null,probe:report.probe,seed:null,inputHashes:report.inputHashes,outputHashes:{'results.json.gz':sha256(packed),'observations.json.gz':report.collectionSource.observationsSha256},uncompressedSha256:sha256(plain),uncompressedBytes:plain.length,compressedBytes:packed.length,cases:rows.length,scope:'Provisional admitted KQK root/complete successor WDL50/rounded DTZ observations; combined acceptance deferred'},null,2)+'\n');console.log(JSON.stringify({passed:true,cases:rows.length,positionProbes:rows.reduce((n,r)=>n+r.bundle.panel.positionProbes,0),sourceInputs:Object.keys(report.inputHashes).length,plainBytes:plain.length,compressedBytes:packed.length,out}));
