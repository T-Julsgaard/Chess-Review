import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {cmd} from 'web-ext';

// Run against built packages, using disposable copies and headless profiles.
// Hardware hints are simulated; CPU feature/memory limits are real V8 options.
const artifacts=path.resolve('web-ext-artifacts');
const {recordPath}=JSON.parse(await fs.readFile(path.join(artifacts,'latest-release.json')));
const record=JSON.parse(await fs.readFile(recordPath));
const out=await fs.mkdtemp(path.join(path.dirname(recordPath),'hardware-'));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)), reports=new Map();
const server=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  res.setHeader('Access-Control-Allow-Origin','*');res.end('ok');
  if(body){const data=JSON.parse(body);console.log(JSON.stringify(data));if(data.done)reports.set(data.mode,data);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const endpoint=`http://127.0.0.1:${server.address().port}`;
let processHandle,ws,firefox;
try {
  for(const mode of ['chrome-no-avx-no-gpu','firefox','chrome-no-sse41']) {
    const browser=mode==='firefox'?'firefox':'chrome';
    const release=record.packages.find(pkg=>pkg.browser===browser);
    const sourceDir=path.join(out,mode);await fs.cp(release.sourceDir,sourceDir,{recursive:true});
    if(!(await fs.readFile(path.join(sourceDir,'analysis.js'),'utf8')).includes('function engineWorkerCount'))throw Error('Build the hardware fixes before running this script');
    const manifest=JSON.parse(await fs.readFile(path.join(sourceDir,'manifest.json')));
    manifest.host_permissions.push('http://127.0.0.1/*');
    await fs.writeFile(path.join(sourceDir,'manifest.json'),JSON.stringify(manifest));
    await fs.appendFile(path.join(sourceDir,'background.js'),'\nbrowserAPI.runtime.onInstalled.addListener(()=>browserAPI.tabs.create({url:browserAPI.runtime.getURL("hardware.html")}));\n');
    const html=await fs.readFile(path.join(sourceDir,'analysis.html'),'utf8');
    await fs.writeFile(path.join(sourceDir,'analysis.html'),html.replace('<script type="module" src="analysis.js">','<script src="hardware-profile.js"></script><script type="module" src="analysis.js">'));
    await fs.writeFile(path.join(sourceDir,'hardware-profile.js'),`
const profiles=[[1,2,1],[8,2,1],[8,4,2],[16,null,2],[16,8,4]];
const profile=profiles[Number(new URLSearchParams(location.search).get('hardware'))];
Object.defineProperties(navigator,{hardwareConcurrency:{value:profile[0]},deviceMemory:{value:profile[1]??undefined}});
globalThis.__hardwareWorkerStarts=0;
const RealWorker=Worker;globalThis.Worker=class extends RealWorker{constructor(...args){super(...args);globalThis.__hardwareWorkerStarts++;}};
`);
    await fs.writeFile(path.join(sourceDir,'hardware.html'),'<!doctype html><script type="module" src="hardware-client.js"></script>');
    await fs.writeFile(path.join(sourceDir,'hardware-client.js'),`
import {browserAPI} from './browser-compat.js';
import {Engine,engineCapabilityError} from './engine/uci.js';
import {resetSettingsForRelease} from './release-settings.js';
const report=data=>fetch(${JSON.stringify(endpoint)},{method:'POST',body:JSON.stringify({mode:${JSON.stringify(mode)},...data})});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
  await resetSettingsForRelease({reason:'startup'});
  const unsupported=${JSON.stringify(mode)}==='chrome-no-sse41';
  if(unsupported) {
    if(engineCapabilityError()?.code!=='ENGINE_UNSUPPORTED')throw Error('Expected missing SIMD');
    const id='unsupported';await browserAPI.storage.local.set({['job:'+id]:{pgn:'1. e4 e5 *',meta:{gameId:id},source:'pgn'}});
    const frame=document.createElement('iframe');frame.src='analysis.html?hardware=0#'+id;document.body.append(frame);
    let message='';for(let i=0;i<300;i++){await wait(100);message=frame.contentDocument?.body?.innerText||'';if(message.includes('SIMD is unavailable'))break;}
    if(!message.includes('SIMD is unavailable')||frame.contentWindow.__hardwareWorkerStarts!==0)throw Error('Unsupported CPU did not fail clearly before loading workers');
    await report({done:true,ok:true,expectedUnsupported:true,workers:0});
  } else {
    const results=[];
    for(const [build,file] of [['nnue','engine/stockfish-nnue.js'],['sf19lite','engine/stockfish-19-lite-single.js']]) {
      const engine=new Engine(file);
      try {
        await engine.setOptions({Hash:32});
        const result=await engine.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',6);
        if(!Number.isFinite(result.score.cp)||!result.bestmove)throw Error('Real engine search failed');
      } finally {engine.terminate();}
      for(const [index,expected] of [[0,1],[1,1],[2,2],[3,2],[4,4]]) {
        const id='hardware-'+build+'-'+index;
        await browserAPI.storage.local.set({settings:{enginePath:build,engineDepth:6,engineWorkers:4,engineHash:16,depthBumped:true,sound:false,coachPlain:true},
          ['job:'+id]:{pgn:'1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *',meta:{gameId:id},source:'pgn'}});
        const frame=document.createElement('iframe');frame.style='width:1366px;height:768px';
        frame.src='analysis.html?hardware='+index+'#'+id;document.body.append(frame);
        let saved;for(let i=0;i<600;i++) {
          await wait(100);saved=(await browserAPI.storage.local.get('analysis:'+id))['analysis:'+id];
          if(saved)break;
          if(frame.contentDocument?.body?.innerText.includes('Analysis stopped early'))throw Error(frame.contentDocument.body.innerText);
        }
        if(!saved||saved.engineBuild!==build||saved.evals.length!==7||!saved.evals.every(Boolean))throw Error('Review failed: '+id);
        const workers=frame.contentWindow.__hardwareWorkerStarts;
        if(workers!==expected)throw Error(id+': expected '+expected+' workers, got '+workers);
        if(frame.contentWindow.crossOriginIsolated)throw Error('Test unexpectedly requires isolation');
        results.push({build,profile:index,workers,positions:saved.evals.length});
        await report({step:'completed-review',result:results.at(-1)});frame.remove();
      }
    }
    await report({done:true,ok:true,results});
  }
} catch(error){await report({done:true,ok:false,error:error.stack});}
`);
    if(browser==='chrome') {
      const profile=await fs.mkdtemp(path.join(out,'chrome-profile-'));
      const flags=mode==='chrome-no-sse41'?'--no-enable-sse4-1':'--no-enable-avx --no-enable-avx2 --wasm-max-mem-pages=2048';
      processHandle=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
        '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
        '--enable-unsafe-extension-debugging',`--js-flags=${flags}`,`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
      processHandle.stderr.on('data',chunk=>fs.appendFile(path.join(out,mode+'.log'),chunk).catch(()=>{}));
      let portInfo;for(let i=0;i<100;i++){try{portInfo=await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8');break;}catch{await wait(100);}}
      if(!portInfo)throw Error('Chrome did not expose debugging port');
      const [port,route]=portInfo.trim().split(/\r?\n/);ws=new WebSocket(`ws://127.0.0.1:${port}${route}`);
      await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;setTimeout(()=>reject(Error('CDP connection timeout')),10000).unref();});
      await new Promise((resolve,reject)=>{
        ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id===1){console.log('Extension loaded:',mode,message);message.error?reject(Error(JSON.stringify(message.error))):resolve(message.result);}};
        ws.send(JSON.stringify({id:1,method:'Extensions.loadUnpacked',params:{path:sourceDir}}));
        setTimeout(()=>reject(Error('Extension load timeout')),30000).unref();
      });
    } else firefox=await cmd.run({sourceDir,artifactsDir:out,firefox:process.env.FIREFOX_PATH||'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      target:['firefox-desktop'],args:['-headless'],noReload:true,noInput:true,startUrl:['about:blank']});
    for(let i=0;i<1800&&!reports.has(mode);i++)await wait(100);
    if(!reports.get(mode)?.ok)throw Error(JSON.stringify(reports.get(mode)||{mode,error:'Hardware smoke timeout'}));
    ws?.close();ws=null;processHandle?.kill();processHandle=null;
    if(firefox){await firefox.exit();firefox=null;}
  }
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify({recordPath,node:process.version,results:[...reports.values()]},null,2));
  console.log('Hardware compatibility report:',path.join(out,'results.json'));
} finally {ws?.close();processHandle?.kill();if(firefox)await firefox.exit();server.close();}
