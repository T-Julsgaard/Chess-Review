import {readFile,writeFile,appendFile,mkdir,stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {Engine,engineConfig} from '../../../../tools/calibration/engine.mjs';
import {selection,queryKey,validateRoot,outcomePlies} from './queries.mjs';
import {validateFreeze} from './models.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2),smoke=args.length===1&&args[0]==='--synthetic-smoke';
if(args.length&&!smoke)throw Error('Only --synthetic-smoke is supported');
const file=path.join(root,'engine/stockfish-19-lite-single.js'),configs={'20k':await engineConfig(file,{kind:'nodes',value:20000}),'80k':await engineConfig(file,{kind:'nodes',value:80000})},hashes=Object.fromEntries(Object.entries(configs).map(([m,c])=>[m,sha256(JSON.stringify(c))]));
if(smoke){
  const engine=new Engine(file),rows=[];try{await engine.init(configs['20k']);for(const [mode,c] of Object.entries(configs)){const result=await engine.search([],null,c.budget),row={key:queryKey(hashes[mode],[],null),configHash:hashes[mode],history:[],restricted:null,...result,finalNodes:Number(/\bnodes (\d+)/.exec(result.finalSearchInfo)?.[1])};validateRoot(row);rows.push({mode,elapsedMs:row.elapsedMs,selectedNodes:row.nodes,finalNodes:row.finalNodes,exactRecovery:!!row.exactRecovery});}}finally{engine.close();}
  await mkdir(path.join(root,'research/runs/E011/synthetic-smoke'),{recursive:true});await writeFile(path.join(root,'research/runs/E011/synthetic-smoke/pilot.json'),JSON.stringify({synthetic:true,engineConfigs:configs,rows},null,2)+'\n');console.log(JSON.stringify({synthetic:true,rows}));
}else{
  const access=await openResearchData(['D001','D002'],{purpose:'collect'}),dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),games=dataset.filter(g=>g.split==='test'),
    freeze=await access.readJson('research/experiments/E011-outcome-confirmation/evidence/models.json'),source=await access.readJson('research/experiments/E010-candidate-stability/evidence/models.json');
  validateFreeze(freeze,source,configs['20k']);if(games.length!==300)throw Error('Wrong reserved cohort size');
  const selected=selection(games),directory=path.join(root,'research/runs/E011/sf19'),cacheFile=path.join(directory,'searches.jsonl');
  try{await stat(cacheFile);throw Error('Existing unregistered partial run; explicit provenance-checked recovery required');}catch(e){if(e.code!=='ENOENT')throw e;}
  const cache=new Map(),used=new Map();
  for(const [mode,name] of [['20k','E008-human-quality-curves'],['80k','E009-search-stability']]){
    const origin='research/experiments/'+name+'/evidence/sf19-observations.json.gz',parent=await access.readJson(origin),config=parent.engineConfig;
    if(JSON.stringify(config)!==JSON.stringify(configs[mode])||parent.configHash!==hashes[mode]||!parent.complete)throw Error('Incompatible registered root cache');
    for(const r of parent.searches)if(r.restricted===null){const row={...r,configHash:hashes[mode],cacheSource:origin};validateRoot(row);cache.set(row.key,row);}
  }
  await mkdir(directory,{recursive:true});const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),codeSha256=Object.fromEntries(await Promise.all(['collect.mjs','queries.mjs','models.mjs'].map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))])));
  await writeFile(path.join(directory,'header.json'),JSON.stringify({schema:'E011-root-cache-v1',sourceRevision:revision,codeSha256,engineConfigs:configs,configHashes:hashes,curvesSha256:freeze.curvesSha256,dataEligibility:access.receipt,selectionHash:sha256(JSON.stringify(selected))},null,2)+'\n');
  const engine=new Engine(file),positions=[],started=performance.now();let completed=0,requests=0,reused=0;
  async function progress(state,error){await writeFile(path.join(directory,'progress.json'),JSON.stringify({state,processId:process.pid,engineProcessId:engine.child.pid,sourceRevision:revision,completedGames:completed,totalGames:300,uniqueQueries:used.size,newRequests:requests,reused,elapsedMs:performance.now()-started,...(error?{error}:{})},null,2)+'\n');}
  async function search(history,mode){
    const key=queryKey(hashes[mode],history,null);if(cache.has(key)){reused++;used.set(key,cache.get(key));return key;}
    if(requests+2>6000||performance.now()-started>45*60*1000)throw Error('Registered compute budget exceeded');
    const result=await engine.search(history,null,configs[mode].budget);requests+=result.exactRecovery?2:1;
    const row={key,configHash:hashes[mode],history,restricted:null,...result,finalNodes:Number(/\bnodes (\d+)/.exec(result.finalSearchInfo)?.[1]),cacheSource:'E011-new-query'};validateRoot(row);cache.set(key,row);used.set(key,row);await appendFile(cacheFile,JSON.stringify(row)+'\n');return key;
  }
  try{
    const startup=await engine.init(configs['20k']);await progress('running');
    for(const p of selected){const roots=[];for(const r of p.roots)roots.push({...r,keys:{'20k':await search(r.history,'20k'),'80k':await search(r.history,'80k')}});positions.push({...p,roots});completed++;
      if(completed%10===0){await progress('running');console.log(completed+'/300 reserved games; '+used.size+' root queries; '+Math.round((performance.now()-started)/1000)+' seconds');}}
    const evidence={schema:'E011-root-observations-v1',complete:true,engineConfigs:configs,configHashes:hashes,protocol:{outcomePlies,roles:{test:300},budgets:[20000,80000]},games,positions,searches:[...used.values()]},bytes=gzipSync(JSON.stringify(evidence)+'\n');
    if(bytes.length>7*1024*1024)throw Error('Retained evidence exceeds budget');const out=fileURLToPath(new URL('../evidence/',import.meta.url));await mkdir(out,{recursive:true});await writeFile(out+'sf19-observations.json.gz',bytes);
    await writeFile(out+'collection-run.json',JSON.stringify({schema:'research-run-v1',id:'E011-reserved-root-collection',date:'2026-10-05',sourceRevision:revision,codeSha256,command:'node research/experiments/E011-outcome-confirmation/code/collect.mjs',dataEligibility:access.receipt,
      environment:{node:process.version,platform:process.platform,arch:process.arch},engineConfigs:configs,startupIdentity:startup.identity,curvesSha256:freeze.curvesSha256,selectionHash:sha256(JSON.stringify(selected)),games:300,uniqueQueries:used.size,requests,reused,
      elapsedMs:performance.now()-started,modelFits:0,targetAssessments:0,outputs:{'sf19-observations.json.gz':sha256(bytes)}},null,2)+'\n');await progress('completed');console.log(JSON.stringify({complete:true,games:300,queries:used.size,requests,reused,bytes:bytes.length,targetAssessments:0}));
  }catch(e){await progress('failed',e.message);throw e;}finally{engine.close();}
}
