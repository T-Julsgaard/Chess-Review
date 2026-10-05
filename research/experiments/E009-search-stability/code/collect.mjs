import {readFile,writeFile,appendFile,mkdir,stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {Engine,engineConfig} from '../../../../tools/calibration/engine.mjs';
import {queryKey,validateSearch} from '../../E008-human-quality-curves/code/queries.mjs';
import {prepare} from '../../E008-human-quality-curves/code/prepare.mjs';
import {selectGames} from './method.mjs';

if(process.argv.length!==2)throw Error('No arguments supported');
const root=fileURLToPath(new URL('../../../../',import.meta.url)),access=await openResearchData(['D001','D002'],{purpose:'collect'}),
  dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),baseline=await access.readJson('research/experiments/E008-human-quality-curves/evidence/sf19-observations.json.gz');
const file=path.join(root,'engine/stockfish-19-lite-single.js'),budget={kind:'nodes',value:80000},config=await engineConfig(file,budget),configHash=sha256(JSON.stringify(config));
prepare(baseline,dataset,await engineConfig(file,{kind:'nodes',value:20000}));
const games=selectGames(baseline.games),basePositions=new Map(baseline.positions.map(p=>[p.gameId,p])),directory=path.join(root,'research/runs/E009/sf19'),cacheFile=path.join(directory,'searches.jsonl');
try{await stat(cacheFile);throw Error('Existing unregistered partial cache; explicit provenance-checked recovery required');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(directory,{recursive:true});
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),codeNames=['collect.mjs','method.mjs'],
  codeSha256=Object.fromEntries(await Promise.all(codeNames.map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))])));
await writeFile(path.join(directory,'header.json'),JSON.stringify({schema:'E009-search-cache-v1',sourceRevision:revision,codeSha256,engineConfig:config,configHash,baselineConfigHash:baseline.configHash,
  dataEligibility:access.receipt,selectedGameHash:sha256(JSON.stringify(games.map(g=>g.id)))},null,2)+'\n');
const engine=new Engine(file),cache=new Map(),positions=[],started=performance.now();let completed=0,requests=0,reused=0;
async function progress(state,error){await writeFile(path.join(directory,'progress.json'),JSON.stringify({state,processId:process.pid,engineProcessId:engine.child.pid,sourceRevision:revision,
  completedGames:completed,totalGames:45,uniqueSearches:cache.size,requests,reused,elapsedMs:performance.now()-started,...(error?{error}:{})},null,2)+'\n');}
async function search(history,restricted=null){
  const key=queryKey(configHash,history,restricted);if(cache.has(key)){reused++;return key;}
  if(requests+2>6000||performance.now()-started>30*60*1000)throw Error('Registered compute budget exceeded');
  const result=await engine.search(history,restricted,budget);requests+=result.exactRecovery?2:1;
  const row={key,history,restricted,...result,finalNodes:Number(/\bnodes (\d+)/.exec(result.finalSearchInfo)?.[1])};validateSearch(row);cache.set(key,row);
  await appendFile(cacheFile,JSON.stringify(row)+'\n');return key;
}
try{
  const startup=await engine.init(config);await progress('running');
  for(const game of games){
    const p=basePositions.get(game.id),rootKey=await search(p.history),alternatives=[];
    for(const a of p.alternatives)alternatives.push({move:a.move,baselineKey:a.key,key:await search(p.history,a.move)});
    positions.push({gameId:p.gameId,split:p.split,ply:p.ply,history:p.history,color:p.color,played:p.played,legalMoves:p.legalMoves,baselineRootKey:p.rootKey,rootKey,alternatives});completed++;
    if(completed%5===0){await progress('running');console.log(completed+'/45 games; '+cache.size+' searches; '+Math.round((performance.now()-started)/1000)+' seconds');}
  }
  const evidence={schema:'E009-search-observations-v1',complete:true,engineConfig:config,configHash,baselineConfigHash:baseline.configHash,games,positions,searches:[...cache.values()]},bytes=gzipSync(JSON.stringify(evidence)+'\n');
  if(bytes.length>5*1024*1024)throw Error('Retained evidence exceeds budget');
  const out=fileURLToPath(new URL('../evidence/',import.meta.url));await mkdir(out,{recursive:true});await writeFile(path.join(out,'sf19-observations.json.gz'),bytes);
  await writeFile(path.join(out,'collection-run.json'),JSON.stringify({schema:'research-run-v1',id:'E009-sf19-collection',date:'2026-10-05',sourceRevision:revision,codeSha256,
    command:'node research/experiments/E009-search-stability/code/collect.mjs',dataEligibility:access.receipt,environment:{node:process.version,platform:process.platform,arch:process.arch},
    engineConfig:config,startupIdentity:startup.identity,selectedGameHash:sha256(JSON.stringify(games.map(g=>g.id))),games:45,uniqueSearches:cache.size,requests,reused,
    elapsedMs:performance.now()-started,modelEvaluations:0,outputs:{'sf19-observations.json.gz':sha256(bytes)}},null,2)+'\n');
  await progress('completed');console.log(JSON.stringify({complete:true,games:45,searches:cache.size,requests,reused,bytes:bytes.length}));
}catch(e){await progress('failed',e.message);throw e;}finally{engine.close();}
