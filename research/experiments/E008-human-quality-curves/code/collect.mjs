import {readFile,writeFile,appendFile,mkdir,stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {Engine,engineConfig} from '../../../../tools/calibration/engine.mjs';
import {selection,queryKey,validateSearch,outcomePlies} from './queries.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2),smoke=args.includes('--smoke');
if(args.some(a=>a!=='--smoke'))throw Error('Unknown argument');
const access=await openResearchData(['D001','D002'],{purpose:'collect'}),dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz');
let games=dataset.filter(g=>['train','validation'].includes(g.split));
if(smoke)games=['train','validation'].map(role=>games.find(g=>g.split===role));
if(games.length!==(smoke?2:600))throw Error('Unexpected development cohort');
const positions=selection(games),budget={kind:'nodes',value:20000},file=path.join(root,'engine/stockfish-19-lite-single.js'),config=await engineConfig(file,budget),configHash=sha256(JSON.stringify(config));
const directory=path.join(root,'research/runs/E008',smoke?'smoke':'sf19'),cacheFile=path.join(directory,'searches.jsonl');
try{await stat(cacheFile);throw Error('Existing partial run requires registered provenance and explicit resume; refusing unregistered cache');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(directory,{recursive:true});
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const codeHashes=Object.fromEntries(await Promise.all(['collect.mjs','queries.mjs'].map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))])));
const header={schema:'E008-search-cache-v1',sourceRevision:revision,codeSha256:codeHashes,configHash,engineConfig:config,dataEligibility:access.receipt,selectionHash:sha256(JSON.stringify(positions)),smoke};
await writeFile(path.join(directory,'header.json'),JSON.stringify(header,null,2)+'\n');
const cache=new Map(),engine=new Engine(file),started=performance.now();let requests=0,reused=0,completed=0;
async function progress(state,error){await writeFile(path.join(directory,'progress.json'),JSON.stringify({state,processId:process.pid,engineProcessId:engine.child.pid,sourceRevision:revision,completedGames:completed,totalGames:games.length,
  uniqueSearches:cache.size,requests,reused,elapsedMs:performance.now()-started,...(error?{error}: {})},null,2)+'\n');}
async function search(history,restricted=null){
  const key=queryKey(configHash,history,restricted);if(cache.has(key)){reused++;return key;}
  if(requests+2>50000||performance.now()-started>90*60*1000)throw Error('Predeclared compute budget exceeded');
  const result=await engine.search(history,restricted,budget);requests+=result.exactRecovery?2:1;
  const row={key,history,restricted,...result,finalNodes:Number(/\bnodes (\d+)/.exec(result.finalSearchInfo)?.[1])};validateSearch(row);
  cache.set(key,row);await appendFile(cacheFile,JSON.stringify(row)+'\n');return key;
}
try{
  const startup=await engine.init(config);await progress('running');
  const observations=[];
  for(let i=0;i<games.length;i++){
    const game=games[i],position=positions[i],outcomes=[];
    for(const ply of position.outcomePlies)outcomes.push({ply,key:await search(game.moves.slice(0,ply-1))});
    const rootKey=await search(position.history),alternatives=[];
    for(const move of position.legalMoves)alternatives.push({move,key:await search(position.history,move)});
    observations.push({...position,rootKey,outcomes,alternatives});completed++;
    if(completed%10===0||smoke){await progress('running');console.log(completed+'/'+games.length+' games; '+cache.size+' unique searches; '+Math.round((performance.now()-started)/1000)+' seconds');}
  }
  const evidence={schema:'E008-engine-observations-v1',complete:true,smoke,engineConfig:config,configHash,protocol:{outcomePlies,choiceSeed:'E008-choice-v1:',choicesPerGame:1},
    games,positions:observations,searches:[...cache.values()]};
  const bytes=gzipSync(JSON.stringify(evidence)+'\n');if(bytes.length>20*1024*1024)throw Error('Retained evidence exceeds budget');
  const out=smoke?directory:fileURLToPath(new URL('../evidence/',import.meta.url));await mkdir(out,{recursive:true});
  const name='sf19-observations.json.gz';await writeFile(path.join(out,name),bytes);
  await writeFile(path.join(out,'collection-run.json'),JSON.stringify({schema:'research-run-v1',id:'E008-sf19-collection'+(smoke?'-smoke':''),date:'2026-10-05',sourceRevision:revision,
    command:'node research/experiments/E008-human-quality-curves/code/collect.mjs'+(smoke?' --smoke':''),codeSha256:codeHashes,dataEligibility:access.receipt,
    environment:{node:process.version,platform:process.platform,arch:process.arch},engineConfig:config,startupIdentity:startup.identity,selectionHash:header.selectionHash,
    games:games.length,uniqueSearches:cache.size,requests,reused,elapsedMs:performance.now()-started,modelEvaluations:0,
    outputs:{[name]:sha256(bytes)}},null,2)+'\n');
  await progress('completed');console.log(JSON.stringify({completed:true,games:games.length,searches:cache.size,requests,reused,bytes:bytes.length,modelEvaluations:0}));
}catch(e){await progress('failed',e.message);throw e;}finally{engine.close();}
