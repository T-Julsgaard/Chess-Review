import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { open, readFile, readdir, writeFile, appendFile, access, unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { args, json, jsonl, save, hash, codeIdentity, snapshotCode } from './io.mjs';
import { compareFeatures, developmentRows, diagnostic } from './development.mjs';
import { predict } from './fit-rating.mjs';
import { assertDisjoint } from './core.mjs';

export function schedule(deadline, now = Date.now()) {
  const end=Date.parse(deadline); if(!Number.isFinite(end)) throw Error('Invalid hard deadline');
  return {deadline: new Date(end).toISOString(), computeStop:new Date(end-30*60000).toISOString(),
    canStart:now<end-40*60000, remainingSeconds:Math.max(0,(end-now)/1000)};
}
export function planIds(games, validationCount=100) {
  assertDisjoint(games);
  const validation=games.filter(g=>g.split==='validation').slice(0,validationCount),train=games.filter(g=>g.split==='train');
  if(validation.length!==validationCount) throw Error('Insufficient fixed validation');
  const probes=[];
  for(let b=0;b<5;b++) {
    const q=train.filter(g=>g.band===b).sort((a,b)=>a.moves.length-b.moves.length);
    for(const i of [Math.floor(q.length*.2),Math.floor(q.length*.5),Math.floor(q.length*.8)]) if(q[i]&&!probes.includes(q[i].id))probes.push(q[i].id);
  }
  return {validationIds:validation.map(g=>g.id),developmentIds:[...validation,...train].map(g=>g.id),probeIds:probes,deepIds:probes.filter((_,i)=>i%3===1),workerIds:probes.filter((_,i)=>i%3===1)};
}
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
async function maybe(file) {try{return await json(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
const resource=()=>({cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),freeMemoryBytes:os.freemem(),supervisorRss:process.memoryUsage().rss});
export async function makeReport(root,state) {
  const dataset=await maybe(path.join(root,'dataset','manifest.json')), runs={};
  for(const engine of ['sf18','sf19']) {
    const folder=path.join(root,`${engine}-20k`);
    const development=await maybe(path.join(folder,'development.json')),features=await maybe(path.join(folder,'features.json'));
    const benchmarks=await readdir(folder).catch(()=>[]);
    runs[engine]={development,completedGames:features?new Set(features.rows.map(r=>r.gameId)).size:0,
      completedSides:features?.rows.length||0,decisions:features?.rows.reduce((s,r)=>s+r.decisions,0)||0,
      benchmarks:await Promise.all(benchmarks.filter(f=>f.startsWith('benchmark-')).map(f=>json(path.join(folder,f))))};
    if(features) for(const budget of ['80k','320k']) {
      const probe=await maybe(path.join(root,`${engine}-${budget}`,'features.json'));
      if(probe) {runs[engine][`stability${budget}`]=compareFeatures(features,probe);
        const val=developmentRows(features).filter(r=>r.split==='validation');
        const probeVal=developmentRows(probe).filter(r=>r.split==='validation');
        if(probeVal.length && development?.selected)runs[engine][`strongerRating${budget}`]=diagnostic(probeVal,probeVal.map(r=>predict(development.selected,r)));
      }
    }
  }
  const f18=await maybe(path.join(root,'sf18-20k','features.json')),f19=await maybe(path.join(root,'sf19-20k','features.json'));
  let transfer;
  if(f18&&f19&&runs.sf18.development?.selected&&runs.sf19.development?.selected){
    const ids=new Set(developmentRows(f18).filter(r=>r.split==='validation').map(r=>`${r.gameId}:${r.color}`));
    const val=developmentRows(f19).filter(r=>r.split==='validation'&&ids.has(`${r.gameId}:${r.color}`));
    transfer={accuracy:compareFeatures(f18,f19),sf18ModelOnSf19Validation:diagnostic(val,val.map(r=>predict(runs.sf18.development.selected,r))),
      separateSf19ModelOnSameValidation:diagnostic(val,val.map(r=>predict(runs.sf19.development.selected,r))),
      conclusion:'Exact engine/network metadata differ. Separate SF19 fit and explicit transfer metrics required; no automatic compatibility claim.'};
  }
  const scaling={};
  for(const w of [1,2]) {const folder=path.join(root,`workers-${w}`);const files=await readdir(folder).catch(()=>[]);scaling[w]=await Promise.all(files.filter(f=>f.startsWith('benchmark-')).map(f=>json(path.join(folder,f))));}
  const decisions=await readFile(path.join(root,'decisions.jsonl'),'utf8').catch(()=>'');
  const report={schemaVersion:1,generatedAt:new Date().toISOString(),status:state.phase==='complete'?'frozen-development':'experimental-in-progress',state,dataset,runs,transfer,workerScaling:scaling,
    decisions:decisions.trim()?decisions.trim().split('\n').map(JSON.parse):[],finalTest:{evaluated:false,status:'reserved; not evaluated or used for adaptive choices'},
    reproducibility:{import:'node tools/calibration/recent-dataset.mjs --out calibration-runs/NEW/dataset --games 2000 --windows 20 --months 2026-06,2026-07,2026-08 --seed overnight-sf18-v1',
      resume:`node tools/calibration/supervisor.mjs --root ${root} --deadline ${state.deadline}`,
      extend:'Use the frozen dataset and development-ids.json with analyze-games.mjs --sqlite --max-new-games N --development-only; preserve engine/budget binding. After examining final holdout, reserve a new dataset/time window.',
      refit:`node tools/calibration/build-features.mjs --dataset ${root}/dataset --run ${root}/sf18-20k --allow-partial; node tools/calibration/development.mjs --run ${root}/sf18-20k --validation-ids ${root}/validation-ids.json`,
      compare:'report.json includes paired budget and engine comparisons, learning curves and versioned candidate references.'},
    uncertainties:['Stratified bounded archive windows do not represent monthly population frequencies','Validation reused for adaptive development; no independent predictive coverage','20k search may be unstable; probes are smaller than development set','Single-game resemblance is noisy and predicts a narrower distribution','Final holdout remains reserved; no production model accepted'],
    nextExperiment:'Use measured 80k/320k stability to select search budget; address player-band bias and saturation before scaling. Reserve new temporal validation/holdout for later model changes.',
    commits:state.commits||[],resources:resource()};
  await save(path.join(root,'report.json'),report);
  const number=x=>x==null?'unavailable':x.toFixed(2);
  let md=`# Overnight independent calibration — 1 October 2026\n\nStatus: ${report.status}. Final test remains reserved. No production scoring changed.\n\n`;
  md+=`We can measure independently defined expected-result loss and fit experimental models for the exact bundled engines. We cannot establish an accepted calibration or independently tested rating uncertainty from development validation.\n\nDeadline: ${state.deadline}; evaluation cutoff: ${state.computeStop}. Phase: ${state.phase}.\n\n`;
  if(dataset)md+=`Dataset: ${dataset.selectedGames} CC0 rated human blitz games, ${dataset.uniquePlayers} globally unique players, splits ${JSON.stringify(dataset.splitCounts)}. Sources: ${dataset.sources.map(s=>s.month).join(', ')}. Focal quotas ${dataset.focalBandCounts.join('/')}; actual player-side bands ${dataset.playerBandCounts.join('/')}. Bounded ranges and local frame hashes are recorded; full published archive checksums were **not** verified. The sample is not population representative. ${dataset.provisionalRatings}\n\n`;
  md+='| Engine | Completed games / sides / decisions | Training games | Validation MAE | Constant MAE | Status |\n|---|---|---|---|---|---|\n';
  for(const [name,r]of Object.entries(runs)){const curve=r.development?.learningCurves?.at(-1);md+=`| ${name} | ${r.completedGames} / ${r.completedSides} / ${r.decisions} | ${r.development?.trainingGames||0} | ${number(curve?.diagnostics.mae)} | ${number(curve?.baseline.mae)} | ${r.development?.status||'inconclusive'} |\n`;}
  const candidates=Object.entries(runs).filter(([,r])=>r.development?.learningCurves).sort(([,a],[,b])=>a.development.learningCurves.at(-1).diagnostics.mae-b.development.learningCurves.at(-1).diagnostics.mae);
  md+=`\nStrongest available development candidate: ${candidates[0]?.[0]||'none yet'} by observed validation MAE; engine results use the same selected games where complete. Separate SF19 coefficients are fitted. See machine-readable results for all coefficients, sample counts, MAE/RMSE/median error/correlation, predicted distributions, clustered intervals, player-band and length biases, paired learning curves, and transfer.\n\n`;
  for(const[name,r]of Object.entries(runs)){
    md+=`## ${name}\n\n`;
    if(r.development?.learningCurves){md+='| Training games | Sides | Fixed validation games | MAE | RMSE | MAE 95% interval |\n|---|---|---|---|---|---|\n';for(const c of r.development.learningCurves)md+=`| ${c.trainingGames} | ${c.trainingSides} | ${c.validationGames} | ${number(c.diagnostics.mae)} | ${number(c.diagnostics.rmse)} | ${number(c.diagnostics.maeInterval?.lower)}–${number(c.diagnostics.maeInterval?.upper)} |\n`;
      md+=`\nAccuracy: arithmetic and RMS design candidates retained. Negative residuals below -0.02: ${r.development.accuracy.negativeResiduals}/${r.development.accuracy.decisions}. RMS range ${r.development.accuracy.rmsRange.map(number).join('–')}.\n\n`;
      const c=r.development.learningCurves.at(-1);md+='| Actual player band | Sides | Bias | MAE | Sparse (<30 sides) |\n|---|---|---|---|---|\n';for(const b of c.diagnostics.byPlayerRatingBand)md+=`| ${b.band} | ${b.n||0} | ${number(b.bias)} | ${number(b.mae)} | ${b.sparse} |\n`;
    }else md+=`Inconclusive: ${r.development?.reason||'evaluations or fitting not complete'}.\n`;
    for(const k of ['stability80k','stability320k'])if(r[k])md+=`\n${k}: ${r[k].games} paired games, RMS mean change ${number(r[k].rmsMeanAbsoluteChange)}, maximum ${number(r[k].rmsMaxAbsoluteChange)}, correlation ${number(r[k].rmsCorrelation)}.\n`;
  }
  if(transfer)md+=`\nSF18 model on SF19 validation MAE ${number(transfer.sf18ModelOnSf19Validation.mae)}; separately fitted SF19 MAE ${number(transfer.separateSf19ModelOnSameValidation.mae)}. This is development transfer evidence only.\n`;
  md+=`\nThe computer must remain awake with power available. System power settings were not changed. CPU measurements describe whole-machine activity. Logs and status retain failures and partial completion.\n\nNext: ${report.nextExperiment}\n\nFinal test: reserved. Uncertainty intervals are exploratory game-cluster intervals, not independently tested predictive coverage. Output means the Lichess blitz rating level these moves resemble, not true single-game performance, FIDE Elo, or official rating.\n\nReproducibility commands, input hashes, immutable fitting-source snapshots and candidate versions are in report.json.\n\nLocal commits:\n${report.commits.map(c=>`- ${c}`).join('\n')||'- Pending setup commit record.'}\n\nDecisions:\n${report.decisions.map(d=>`- ${d.at}: ${d.action} — ${d.reason}`).join('\n')}\n`;
  await writeFile(path.join(root,'report.md'),md);return report;
}
async function main(){
  const o=args({root:'calibration-runs/overnight-2026-09-30',deadline:'2026-10-01T09:00:00+02:00','report-only':false});
  const root=path.resolve(o.root);await save(path.join(root,'resolved-deadline.json'),schedule(o.deadline));
  const statusFile=path.join(root,'status.json');
  if(o['report-only']){await makeReport(root,(await maybe(statusFile))||{phase:'partial',...schedule(o.deadline)});return;}
  const lockFile=path.join(root,'supervisor.lock');
  try{const lock=await open(lockFile,'wx');await lock.writeFile(JSON.stringify({pid:process.pid,at:new Date().toISOString()}));await lock.close();}
  catch(e){if(e.code!=='EEXIST')throw e;const previous=await json(lockFile);if(alive(previous.pid))throw Error(`Supervisor already running: ${previous.pid}`);await unlink(lockFile);const lock=await open(lockFile,'wx');await lock.writeFile(JSON.stringify({pid:process.pid}));await lock.close();}
  const state={pid:process.pid,startedAt:new Date().toISOString(),...schedule(o.deadline),phase:'setup',resources:resource(),failures:[]};
  let child,stopping=false;
  const stop=()=>{stopping=true;};process.once('SIGINT',stop);process.once('SIGTERM',stop);
  const update=async()=>{state.updatedAt=new Date().toISOString();state.resources=resource();state.childPid=child?.pid||null;await save(statusFile,state);};
  const decide=async(action,reason,numbers={})=>{await appendFile(path.join(root,'decisions.jsonl'),JSON.stringify({at:new Date().toISOString(),action,reason,numbers})+'\n');state.lastDecision={action,reason};await update();};
  const timer=setInterval(()=>{update().catch(e=>console.error(e));if(Date.now()>=Date.parse(state.computeStop))stopping=true;},15000);
  async function run(script,argv,expensive=false){
    if(expensive&&(stopping||Date.now()>=Date.parse(state.computeStop)))return false;
    state.phase=script;state.command=[script,...argv];await update();
    const log=await open(path.join(root,'supervisor.log'),'a');
    child=spawn(process.execPath,[`tools/calibration/${script}`,...argv],{windowsHide:true,stdio:['ignore',log.fd,log.fd]});await update();
    const kill=async()=>{if(child?.pid){if(process.platform==='win32')await promisify(execFile)('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true}).catch(()=>{});else child.kill('SIGTERM');}};
    const remaining=Date.parse(state.computeStop)-Date.now();const cutoff=expensive?setTimeout(kill,Math.max(0,remaining+6000)):null;
    const result=await new Promise((resolve)=>{child.once('error',e=>resolve({code:-1,error:e.message}));child.once('exit',code=>resolve({code}));});
    clearTimeout(cutoff);await log.close();child=null;await update();
    if(result.code!==0){state.failures.push({at:new Date().toISOString(),script,...result});await decide('record failure',`${script} exited ${result.code}; preserve raw cache and continue independent coverage`);return false;}return true;
  }
  async function evaluate(name,engine,nodes,ids,max){
    const out=path.join(root,name),argv=['--dataset',path.join(root,'dataset'),'--out',out,'--engine',engine,'--nodes',String(nodes),'--workers','2','--sqlite','--development-only','--game-ids',path.join(root,ids),'--deadline',state.computeStop];
    if(max)argv.push('--max-new-games',String(max));
    const ok=await run('analyze-games.mjs',argv,true);
    if(await maybe(path.join(out,'manifest.json')))await run('build-features.mjs',['--dataset',path.join(root,'dataset'),'--run',out,'--allow-partial']);
    if(name.endsWith('-20k'))await run('development.mjs',['--run',out,'--validation-ids',path.join(root,'validation-ids.json')]);
    await makeReport(root,state);return ok;
  }
  try{
    const code=await codeIdentity();await snapshotCode(path.join(root,'supervisor-source',hash(JSON.stringify(code))),code);state.sourceHash=hash(JSON.stringify(code));
    await update();const dataset=await json(path.join(root,'dataset','manifest.json')),games=await jsonl(path.join(root,'dataset','games.jsonl'));
    if(hash(games.map(g=>JSON.stringify(g)).join('\n')+'\n')!==dataset.gamesSha256)throw Error('Dataset hash mismatch');
    const planned=planIds(games);for(const[key,ids]of Object.entries(planned)){
      const file=path.join(root,key.replace(/[A-Z]/g,l=>'-'+l.toLowerCase())+'.json'),previous=await maybe(file);
      if(previous&&JSON.stringify(previous)!==JSON.stringify(ids))throw Error('Frozen selection changed');await save(file,ids);
    }
    const commit=await promisify(execFile)('git',['log','-3','--format=%h %s','--','tools/calibration','tests/calibration-overnight.test.mjs'],{windowsHide:true});state.commits=commit.stdout.trim().split('\n');
    await decide('essential engine coverage','Fixed validation first, then balanced training prefix; complete both engine development packages before scaling',{datasetGames:games.length,fixedValidationGames:planned.validationIds.length,hardDeadline:state.deadline});
    const engines=[['sf18','engine/stockfish-nnue.js'],['sf19','engine/stockfish-19-lite-single.js']];
    for(const[name,engine]of engines)await evaluate(`${name}-20k`,engine,20000,'development-ids.json',200);
    for(const workers of [1,2])if(schedule(o.deadline).canStart&&!stopping){
      const out=path.join(root,`workers-${workers}`);await run('analyze-games.mjs',['--dataset',path.join(root,'dataset'),'--out',out,'--engine',engines[0][1],'--nodes','20000','--workers',String(workers),'--sqlite','--development-only','--game-ids',path.join(root,'worker-ids.json'),'--deadline',state.computeStop],true);
    }
    await decide('budget stability','Measure representative short/median/long training games at 80k and median-length games at 320k before spending remaining budget on sample expansion');
    for(const[name,engine]of engines){await evaluate(`${name}-80k`,engine,80000,'probe-ids.json');if(schedule(o.deadline).canStart)await evaluate(`${name}-320k`,engine,320000,'deep-ids.json');}
    // Separate, explicit shared-development transfer; deeper probes never touch final test.
    let rounds=0;
    while(!stopping&&schedule(o.deadline).canStart&&rounds++<14){
      const control=await maybe(path.join(root,'control.json'));if(control?.freeze){await decide('freeze development',control.reason||'Heartbeat requested freeze');break;}
      if(control?.probe&&control.requestedAt!==state.lastControlAt){
        const {engine,nodes}=control.probe;
        if(!['sf18','sf19'].includes(engine)||![80000,320000].includes(nodes))throw Error('Invalid control probe');
        state.lastControlAt=control.requestedAt;
        await decide('heartbeat requested stronger probe',control.reason||'Investigate search instability',control.probe);
        await evaluate(`${engine}-extra-${nodes}-${Date.now()}`,engines.find(([n])=>n===engine)[1],nodes,'probe-ids.json');
      }
      if(os.freemem()<1.5*2**30){await decide('freeze for memory','Less than 1.5 GB free; preserve completed engine packages');break;}
      const report=await makeReport(root,state),progress=Object.values(report.runs).map(r=>r.development?.trainingGames||0);
      if(progress.every(n=>n>=1400)){await decide('freeze completed development','All selected training and fixed validation games complete; final test remains reserved');break;}
      let advanced=false;
      for(const[name,engine]of engines){
        const r=report.runs[name],curves=r.development?.learningCurves||[],last=curves.at(-1),prev=curves.at(-2);
        if((r.development?.trainingGames||0)>=1400)continue;
        const stability=r.stability80k;
        if(stability?.rmsMeanAbsoluteChange>3&&rounds===1){await decide('search instability noted',`${name} RMS mean change exceeds 3 points; preserve deeper probes and label shallow calibration experimental`,{stability});}
        if(last&&prev&&last.trainingGames>=500&&last.diagnostics.mae>=prev.diagnostics.mae-3){await decide('pause scaling engine',`${name} validation MAE improved less than 3 points at latest size; band bias and search depth are more useful next experiments`,{previousMae:prev.diagnostics.mae,currentMae:last.diagnostics.mae,bands:last.diagnostics.byPlayerRatingBand});continue;}
        const benchmarks=r.benchmarks.filter(b=>b.newCompleted>0),rate=benchmarks.length?benchmarks.at(-1).elapsedSeconds/benchmarks.at(-1).newCompleted:30;
        const remaining=(Date.parse(state.computeStop)-Date.now())/1000;
        const requestedBatch=control?.batchGames==null?100:Number(control.batchGames);
        if(!Number.isInteger(requestedBatch)||requestedBatch<25||requestedBatch>250)throw Error('Invalid heartbeat batch size');
        const batch=Math.min(requestedBatch,Math.floor(remaining/(rate*3)/5)*5);
        if(batch<25){await decide('freeze for report reserve','Insufficient measured throughput/time for another balanced batch',{rate,remaining});continue;}
        await decide('expand balanced training',`${name}: add up to ${batch} games; fixed validation unchanged`,{trainingGames:r.development?.trainingGames,currentMae:last?.diagnostics.mae,estimatedSeconds:rate*batch});
        advanced=await evaluate(`${name}-20k`,engine,20000,'development-ids.json',batch)||advanced;
      }
      if(!advanced)break;
    }
    state.phase='complete';state.completedAt=new Date().toISOString();await decide('freeze and report','No further useful batch before cutoff or development scaling plateau; final holdout remains reserved');
    await update();await makeReport(root,state);
  }catch(e){state.phase='failed';state.failures.push({at:new Date().toISOString(),error:e.stack});await update();await makeReport(root,state);console.error(e);process.exitCode=1;}
  finally{clearInterval(timer);await unlink(lockFile).catch(()=>{});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
