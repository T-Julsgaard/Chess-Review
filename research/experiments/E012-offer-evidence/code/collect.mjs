import {readFile,writeFile,appendFile,mkdir,stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {Engine,engineConfig} from '../../../../tools/calibration/engine.mjs';
import {loadCohort} from './inputs.mjs';
import {queryKey,validateQuery} from './queries.mjs';
const args=process.argv.slice(2),smoke=args.length===1&&args[0]==='--synthetic-smoke';if(args.length&&!smoke)throw Error('Only --synthetic-smoke is supported');
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=path.join(root,'engine/stockfish-nnue.js');
if(smoke){
  const configs={'20k':await engineConfig(file,{kind:'nodes',value:20000}),'80k':await engineConfig(file,{kind:'nodes',value:80000})},engine=new Engine(file),rows=[];
  try{await engine.init(configs['20k']);for(const [mode,c] of Object.entries(configs)){const h=sha256(JSON.stringify(c)),r=await engine.search([],null,c.budget),row={key:queryKey(h,[],null),configHash:h,history:[],restricted:null,...r,finalNodes:Number(/\bnodes (\d+)/.exec(r.finalSearchInfo)?.[1])};validateQuery(row);rows.push({mode,elapsedMs:r.elapsedMs,selectedNodes:r.nodes,finalNodes:row.finalNodes});}}finally{engine.close();}
  await mkdir(path.join(root,'research/runs/E012/smoke'),{recursive:true});await writeFile(path.join(root,'research/runs/E012/smoke/pilot.json'),JSON.stringify({synthetic:true,configs,rows},null,2)+'\n');console.log(JSON.stringify({synthetic:true,rows}));
}else{
  const access=await openResearchData(['D001'],{purpose:'collect'}),{dataset,pack,policy,selected}=await loadCohort(access),directory=path.join(root,'research/runs/E012/sf18'),cacheFile=path.join(directory,'searches.jsonl');
  try{await stat(cacheFile);throw Error('Existing unregistered partial cache; explicit provenance-checked recovery required');}catch(e){if(e.code!=='ENOENT')throw e;}
  await mkdir(directory,{recursive:true});const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),codeSha256=Object.fromEntries(await Promise.all(['collect.mjs','cohort.mjs','queries.mjs','inputs.mjs','board.mjs','policy.mjs'].map(async name=>[name,sha256(await readFile(new URL(name,import.meta.url)))]))),policySha256=sha256(JSON.stringify(policy));
  await writeFile(path.join(directory,'header.json'),JSON.stringify({schema:'E012-query-cache-v1',sourceRevision:revision,codeSha256,engineConfigs:policy.engineConfigs,configHashes:policy.configHashes,policySha256,packId:pack.packId,selectionHash:sha256(JSON.stringify(selected)),dataEligibility:access.receipt},null,2)+'\n');
  const engine=new Engine(file),cache=new Map(),positions=[],started=performance.now();let completed=0,requests=0,reused=0;
  async function progress(state,error){await writeFile(path.join(directory,'progress.json'),JSON.stringify({state,processId:process.pid,engineProcessId:engine.child.pid,sourceRevision:revision,completedCases:completed,totalCases:24,queries:cache.size,requests,reused,elapsedMs:performance.now()-started,...(error?{error}:{})},null,2)+'\n');}
  async function search(c,mode,restricted){const h=policy.configHashes[mode],key=queryKey(h,c.history,restricted);if(cache.has(key)){reused++;return key;}
    if(requests+2>3000||performance.now()-started>30*60*1000)throw Error('Registered compute budget exceeded');const r=await engine.search(c.history,restricted,policy.engineConfigs[mode].budget);requests+=r.exactRecovery?2:1;
    const row={key,configHash:h,history:c.history,restricted,...r,finalNodes:Number(/\bnodes (\d+)/.exec(r.finalSearchInfo)?.[1])};validateQuery(row);cache.set(key,row);await appendFile(cacheFile,JSON.stringify(row)+'\n');return key;}
  try{
    const startup=await engine.init(policy.engineConfigs['20k']);await progress('running');
    for(const c of selected){const keys={};for(const mode of ['20k','80k']){const rootKey=await search(c,mode,null),alternatives=[];for(const move of c.legalMoves)alternatives.push({move,key:await search(c,mode,move)});keys[mode]={rootKey,alternatives};}positions.push({...c,keys});completed++;await progress('running');console.log(completed+'/24 cases; '+cache.size+' queries; '+Math.round((performance.now()-started)/1000)+' seconds');}
    const evidence={schema:'E012-root-observations-v1',complete:true,packId:pack.packId,policySha256,engineConfigs:policy.engineConfigs,configHashes:policy.configHashes,games:selected.map(c=>dataset.find(g=>g.id===c.gameId)),positions,searches:[...cache.values()]},bytes=gzipSync(JSON.stringify(evidence)+'\n');if(bytes.length>3*1024*1024)throw Error('Evidence exceeds retained budget');
    const out=new URL('../evidence/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('sf18-observations.json.gz',out),bytes);
    await writeFile(new URL('collection-run.json',out),JSON.stringify({schema:'research-run-v1',id:'E012-full-root-collection',date:'2026-10-05',sourceRevision:revision,command:'node research/experiments/E012-offer-evidence/code/collect.mjs',codeSha256,dataEligibility:access.receipt,environment:{node:process.version,platform:process.platform,arch:process.arch},engineConfigs:policy.engineConfigs,startupIdentity:startup.identity,policySha256,packId:pack.packId,selectionHash:sha256(JSON.stringify(selected)),cases:24,queries:cache.size,requests,reused,elapsedMs:performance.now()-started,modelFits:0,propertyAssessments:0,humanLabelsUsed:0,outputs:{'sf18-observations.json.gz':sha256(bytes)}},null,2)+'\n');await progress('completed');console.log(JSON.stringify({complete:true,cases:24,queries:cache.size,requests,reused,bytes:bytes.length,propertyAssessments:0}));
  }catch(e){await progress('failed',e.message);throw e;}finally{engine.close();}
}
