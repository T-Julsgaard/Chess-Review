import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openResearchData,openResearchSource,sha256} from '../../../data-policy.mjs';
import {firstFrame,selectCohort} from '../../../fresh-format.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),base='research/datasets/D002-fresh-prefix/',limit=8*1024*1024;
const months=['2026-06','2026-07','2026-08'];
async function main(){
  if(process.argv.length>2)throw Error('Unknown argument');
  const access=await openResearchData(['D001'],{purpose:'collect'}),old=await access.readJson('tools/calibration/public/dataset.json.gz');
  const excluded={inputSha256:access.receipt.inputHashes['tools/calibration/public/dataset.json.gz'],gameIds:old.map(g=>g.id).sort(),playerIds:old.flatMap(g=>g.players.map(p=>p.id)).sort()};
  const sources={license:'CC0-1.0',licenseUrl:'https://database.lichess.org/',sources:[]},frames=[],receipts=[],outputs={},started=performance.now();
  await mkdir(new URL(base+'raw/',new URL('../../../../',import.meta.url)),{recursive:true});
  // Source permission is verified before each request; no redirect/source fallback.
  for(const month of months){
    const url='https://database.lichess.org/standard/lichess_db_standard_rated_'+month+'.pgn.zst',source=await openResearchSource(url);
    const retrievedAt=new Date().toISOString(),response=await fetch(url,{redirect:'error',headers:{Range:'bytes=0-'+(limit-1),'Accept-Encoding':'identity'},signal:AbortSignal.timeout(45000)});
    const range=response.headers.get('content-range'),match=range?.match(/^bytes 0-(\d+)\/(\d+)$/);
    if(response.status!==206||response.url!==url||!match||Number(match[1])!==limit-1||Number(match[2])<=limit){await response.body?.cancel();throw Error('Unexpected ranged response for '+month);}
    const chunks=[];let bytes=0;
    for await(const chunk of response.body){bytes+=chunk.length;if(bytes>limit)throw Error('Response exceeds acquisition budget');chunks.push(chunk);}
    if(bytes!==limit)throw Error('Truncated prefix response');
    const prefix=Buffer.concat(chunks),frame=firstFrame(prefix);if(!frame)throw Error('Prefix has no complete frame');
    const name=base+'raw/'+month+'.pgn.zst';await writeFile(new URL(name,new URL('../../../../',import.meta.url)),frame.frame);
    outputs[name]={kind:'raw-pgn-zstd',parents:[base+'sources.json'],sha256:sha256(frame.frame),bytes:frame.frame.length,uncompressedSha256:sha256(frame.decoded)};
    frames.push({name,month,decoded:frame.decoded});receipts.push(source.receipt);
    sources.sources.push({url,month,license:'CC0-1.0',frames:[{url,artifact:name,start:0,end:frame.frame.length-1,bytes:frame.frame.length,sha256:sha256(frame.frame),decodedSha256:sha256(frame.decoded),retrievedAt,
      verification:'HTTPS206 exact prefix range; complete first frame decoded; SHA256 raw/decoded bytes',
      request:{range:'bytes=0-'+(limit-1),acceptEncoding:'identity'},response:{status:response.status,contentRange:range,etag:response.headers.get('etag'),lastModified:response.headers.get('last-modified')},
      prefixSha256:sha256(prefix),prefixBytes:prefix.length,extraction:{start:0,end:frame.frame.length}}]});
    console.log(month+' complete frame retained: '+frame.frame.length+' compressed bytes');
  }
  if(frames.reduce((s,f)=>s+outputs[f.name].bytes,0)>20*1024*1024)throw Error('Raw storage budget exceeded');
  const selection=selectCohort(frames,excluded),sourceRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  const save=async(name,bytes,kind,parents,decoded=bytes)=>{await writeFile(new URL(name,new URL('../../../../',import.meta.url)),bytes);outputs[name]={kind,parents,sha256:sha256(bytes),bytes:Buffer.byteLength(bytes),uncompressedSha256:sha256(decoded)};};
  await save(base+'sources.json',JSON.stringify(sources,null,2)+'\n','sources',[]);
  await save(base+'exclusions.json',JSON.stringify(excluded)+'\n','summary',[base+'sources.json']);
  const gameText=JSON.stringify(selection.games)+'\n';await save(base+'games.json.gz',gzipSync(gameText),'games',[base+'sources.json',base+'exclusions.json',...frames.map(f=>f.name)],gameText);
  const run={schema:'research-run-v1',id:'E007-D002-acquisition-v1',date:'2026-10-05',sourceRevision,command:'node research/experiments/E007-fresh-evidence/code/collect.mjs',
    environment:{node:process.version,platform:process.platform,arch:process.arch},dataEligibility:access.receipt,sourceEligibility:receipts,
    networkBytes:3*limit,elapsedMs:performance.now()-started,engineSearches:0,modelEvaluations:0,
    codeSha256:{'collect.mjs':sha256(await readFile(fileURLToPath(import.meta.url))),'fresh-format.mjs':sha256(await readFile(new URL('../../../fresh-format.mjs',import.meta.url)))},
    outputs:Object.fromEntries(Object.entries(outputs).map(([name,e])=>[name,e.sha256]))};
  await save(base+'run.json',JSON.stringify(run,null,2)+'\n','summary',[base+'games.json.gz']);
  const manifest={schema:'research-dataset-manifest-v1',id:'D002',sourceIds:['lichess-standard-2026-summer'],originFormat:'lichess-prefix-v1',sourceRecord:base+'sources.json',normalized:base+'games.json.gz',
    provenance:{status:'pipeline-verified',limitations:['Archive-prefix convenience cohort; not a representative monthly/global population.','Only retained frame bytes are hashed; no whole-archive checksum is claimed.','Reserved evaluation labels were structurally parsed; no model evaluated or manual cases inspected during collection.'],
      replayRecipe:'node research/experiments/E007-fresh-evidence/code/verify.mjs',selectionSeed:'D002-select-v1:',splitSeed:'D002-split-v1:',formatSha256:run.codeSha256['fresh-format.mjs'],
      exclusions:base+'exclusions.json',exclusionInput:'tools/calibration/public/dataset.json.gz',exclusionCounts:selection.exclusions,dependencies:['D001']},artifacts:outputs};
  await writeFile(new URL(base+'manifest.json',new URL('../../../../',import.meta.url)),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({games:selection.games.length,splits:Object.fromEntries(['train','validation','test'].map(s=>[s,selection.games.filter(g=>g.split===s).length])),exclusions:selection.exclusions,elapsedMs:run.elapsedMs,modelEvaluations:0}));
}
await main();
