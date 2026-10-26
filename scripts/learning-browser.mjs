import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {files} from './package-inputs.mjs';

// Real packaged Chrome extension, isolated profile; test exports and screenshots
// are written to disposable copies and never enter store packages.
const root=process.cwd(),artifacts=path.join(root,'web-ext-artifacts');
const {recordPath}=JSON.parse(await fs.readFile(path.join(artifacts,'latest-release.json')));
const record=JSON.parse(await fs.readFile(recordPath));
const out=await fs.mkdtemp(path.join(path.dirname(recordPath),'learning-audit-'));
const source=await fs.mkdtemp(path.join(artifacts,'learning-chrome-'));
await fs.cp(record.packages.find(p=>p.browser==='chrome').sourceDir,source,{recursive:true});
// Iterate on UI changes against the same packaged engine/assets without rebuilding them.
if (process.argv.includes('--working-tree')) {
  for (const file of files) await fs.copyFile(path.join(root,file),path.join(source,file));
  // Keep the workspace and its progress/input dependencies from the same revision.
  await fs.cp(path.join(root,'lib'),path.join(source,'lib'),{recursive:true});
  await fs.cp(path.join(root,'icons'),path.join(source,'icons'),{recursive:true});
}
await fs.appendFile(path.join(source,'analysis.js'),'\nexport {S, learningWorkspace, openLearning, go, toggleFlip, applyLayoutMode, applyUserMove, paintBoard, exitAnalysis};\n');
if(process.argv.includes('--viewport-preview'))await fs.appendFile(path.join(source,'analysis.js'),'\nglobalThis.__viewportAudit={S,openLearning,workspace:()=>learningWorkspace,fit:()=>_fittedDip};\n');
await fs.writeFile(path.join(source,'audit.html'),'<!doctype html><script type="module" src="audit.js"></script>');
await fs.writeFile(path.join(source,'audit.js'),"import {browserAPI} from './browser-compat.js'; window.api=browserAPI;");
const profile=await fs.mkdtemp(path.join(artifacts,'learning-profile-'));
const chrome=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
  '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
  '--enable-unsafe-extension-debugging',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;const keepAlive=setInterval(()=>{},1000);
try {
  let info;for(let i=0;i<100;i++){try{info=await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8');break;}catch{await sleep(100);}}
  if(!info)throw Error('Chrome debugging port unavailable');
  const [port,route]=info.trim().split(/\r?\n/);ws=new WebSocket(`ws://127.0.0.1:${port}${route}`);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('CDP timed out')),10000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=()=>{clearTimeout(timer);reject(Error('CDP failed'));};});
  let seq=0;const pending=new Map();
  ws.onmessage=event=>{const m=JSON.parse(event.data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},method==='Extensions.loadUnpacked'?60000:20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,sessionId}));});
  const loaded=await call('Extensions.loadUnpacked',{path:source});
  const tab=async url=>{const {targetId}=await call('Target.createTarget',{url});const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});return {targetId,sessionId};};
  const evaluate=async(t,expression)=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},t.sessionId).catch(error=>{throw Error(error.message+' while evaluating: '+expression,{cause:error});});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  const waitFor=async(t,expression,label)=>{for(let i=0;i<250;i++){if(await evaluate(t,expression))return;await sleep(100);}throw Error(label+' did not become ready');};
  const audit=await tab(`chrome-extension://${loaded.id}/audit.html`);await waitFor(audit,'!!window.api','Storage API');
  await evaluate(audit,"api.storage.local.set({settings:{engineDepth:4,engineWorkers:1,depthBumped:true,sound:false,coachPlain:true},'job:learn-audit':{pgn:'1. e4 e5 2. Nf3 Nc6 *',meta:{gameId:'learn-audit'},source:'pgn'}})");
  const review=await tab(`chrome-extension://${loaded.id}/analysis.html#learn-audit`);
  await waitFor(review,"!!document.querySelector('.board')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Review');
  const {windowId}=await call('Browser.getWindowForTarget',{targetId:review.targetId});
  await call('Browser.setWindowBounds',{windowId,bounds:{width:1920,height:1080}});await sleep(400);
  const {auditLearning}=await import(process.argv.includes('--puzzle-slider')?'./puzzle-slider-audit.mjs':process.argv.includes('--puzzle-ui')?'./puzzle-ui-audit.mjs':process.argv.includes('--openings')?'./openings-audit.mjs':process.argv.includes('--concept-notice')?'./concept-notice-audit.mjs':process.argv.includes('--run-notice')?'./puzzle-run-notice-audit.mjs':process.argv.includes('--run-layout')?'./puzzle-run-layout-audit.mjs':process.argv.includes('--puzzle-speed')?'./puzzle-speed-audit.mjs':process.argv.includes('--statistics')?'./puzzle-statistics-audit.mjs':process.argv.includes('--panel-groups')?'./panel-groups-audit.mjs':process.argv.includes('--screen-previews')?'./screen-previews-audit.mjs':process.argv.includes('--popup-workspace')?'./popup-workspace-audit.mjs':'./learning-audit.mjs');
  const runAudit=process.argv.includes('--native-zoom')?(await import('./native-zoom-audit.mjs')).auditLearning:process.argv.includes('--announcement')?(await import('./learning-announcement-audit.mjs')).auditLearning:process.argv.includes('--run-start')?(await import('./puzzle-run-start-audit.mjs')).auditLearning:process.argv.includes('--review-chrome')?(await import('./learning-chrome-transition-audit.mjs')).auditLearning:process.argv.includes('--viewport-preview')?(await import('./viewport-preview-audit.mjs')).auditLearning:process.argv.includes('--navigation')?(await import('./learning-navigation-audit.mjs')).auditLearning:auditLearning;
  if(process.argv.includes('--review-return'))await (await import('./learning-chrome-transition-audit.mjs')).auditReviewReturn({review,call,evaluate,waitFor,sleep,out});
  else if(process.argv.includes('--mode-tickets'))await (await import('./puzzle-mode-audit.mjs')).auditLearning({review,call,evaluate,waitFor,sleep,out});
  else if(process.argv.includes('--startup'))await (await import('./startup-audit.mjs')).auditLearning({review,call,evaluate,waitFor,sleep,out});
  else if(process.argv.includes('--run-dashboard'))await (await import('./run-dashboard-audit.mjs')).auditLearning({review,call,evaluate,waitFor,sleep,out});
  else if(process.argv.includes('--responsive-reference'))await (await import('./responsive-reference-audit.mjs')).auditLearning({review,call,evaluate,waitFor,sleep,out});
  else if(process.argv.includes('--responsive-layout'))await (await import('./responsive-layout-audit.mjs')).auditLearning({review,call,evaluate,waitFor,sleep,out});
  else if(process.argv.includes('--review-interactions'))await (await import('./review-interactions-audit.mjs')).auditLearning({review,call,evaluate,waitFor,sleep,out});
  else if(process.argv.includes('--full-hd-reference'))await (await import('./full-hd-reference-audit.mjs')).auditLearning({review,call,evaluate,waitFor,sleep,out,source});
  else await (process.argv.includes('--puzzle-animations')?(await import('./puzzle-animation-audit.mjs')).auditLearning:runAudit)({review,call,evaluate,waitFor,sleep,out});
} finally {clearInterval(keepAlive);ws?.close();chrome.kill();}
