import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { cmd } from 'web-ext';

// Uses fresh test-only copies of the packaged extensions and isolated headless profiles.
// The loopback reporting permission and smoke files are never added to store ZIPs.
const root=process.cwd(), artifacts=path.join(root,'web-ext-artifacts');
let recordPath;
try { ({recordPath}=JSON.parse(await fs.readFile(path.join(artifacts,'latest-release.json')))); }
catch(error) { if(error.code!=='ENOENT')throw error; }
const releases=JSON.parse(await fs.readFile(recordPath || path.join(artifacts,'release-sizes.json')));
const packages=recordPath ? releases.packages : releases;
const reportDir=recordPath ? path.dirname(recordPath) : artifacts;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const reports=new Map();
const server=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  res.setHeader('Access-Control-Allow-Origin','*');res.end('ok');
  if(body){const data=JSON.parse(body);console.log(JSON.stringify(data));if(data.done)reports.set(data.browser,data);}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const endpoint=`http://127.0.0.1:${server.address().port}`;
let chromeProcess, ws, firefoxRunner;
try {
  for(const release of packages){
    const sourceDir=await fs.mkdtemp(path.join(artifacts,`smoke-${release.browser}-`));
    await fs.cp(release.sourceDir,sourceDir,{recursive:true});
    const manifest=JSON.parse(await fs.readFile(path.join(sourceDir,'manifest.json')));
    manifest.host_permissions.push('http://127.0.0.1/*');
    await fs.writeFile(path.join(sourceDir,'manifest.json'),JSON.stringify(manifest));
    await fs.appendFile(path.join(sourceDir,'background.js'), '\nbrowserAPI.runtime.onInstalled.addListener(() => browserAPI.tabs.create({url:browserAPI.runtime.getURL("smoke.html")}));\n');
    await fs.writeFile(path.join(sourceDir,'smoke.html'),'<!doctype html><script type="module" src="smoke-client.js"></script>');
    await fs.writeFile(path.join(sourceDir,'smoke-client.js'), `
import {browserAPI} from './browser-compat.js';
import {Engine} from './engine/uci.js';
const report=data=>fetch(${JSON.stringify(endpoint)},{method:'POST',body:JSON.stringify({browser:${JSON.stringify(release.browser)},...data})});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try {
  const results=[];
  for(const [key,file] of [['nnue','engine/stockfish-nnue.js'],['sf19lite','engine/stockfish-19-lite-single.js']]) {
    const engine=new Engine(file);
    try {
      await engine.setOptions({Hash:16,MultiPV:2});
      const search=await engine.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',8,2);
      if(!/^[a-h][1-8][a-h][1-8]/.test(search.bestmove)||!Number.isFinite(search.score.cp))throw Error('Invalid engine result');
      results.push({key,bestmove:search.bestmove,score:search.score});
      await report({step:'real-engine',result:results.at(-1)});
    } finally {engine.terminate();}
    const id='smoke-'+key;
    await browserAPI.storage.local.set({settings:{...(key==='sf19lite'?{enginePath:'sf19'}:{}),engineDepth:8,engineWorkers:1,depthBumped:true,sound:false,coachPlain:true},['job:'+id]:{pgn:'1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *',meta:{gameId:id},source:'pgn'}});
    const frame=document.createElement('iframe');frame.style='width:1680px;height:1000px';frame.src='analysis.html#'+id;document.body.append(frame);
    let saved;
    for(let i=0;i<250;i++){await wait(100);saved=(await browserAPI.storage.local.get('analysis:'+id))['analysis:'+id];if(saved)break;}
    if(!saved||saved.engineBuild!==key||saved.evals.length!==7||!saved.evals.every(Boolean))throw Error('Review did not complete with '+key+': '+frame.contentDocument?.body?.innerText?.slice(-1200));
    const board=frame.contentDocument.querySelector('.board');if(!board)throw Error('Board missing');
    await report({step:'completed-review',key,positions:saved.evals.length,engineBuild:saved.engineBuild});
    frame.remove();
  }
  await report({done:true,ok:true,results});
} catch(e){await report({done:true,ok:false,error:e.stack});}
`);
    if(release.browser==='chrome'){
      const profile=await fs.mkdtemp(path.join(artifacts,'smoke-chrome-profile-'));
      chromeProcess=spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
        '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
        '--enable-unsafe-extension-debugging',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
      let portInfo;
      for(let i=0;i<100;i++){try{portInfo=await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8');break;}catch{await sleep(100);}}
      if(!portInfo)throw Error('Chrome did not expose debugging port');
      const [port,route]=portInfo.trim().split(/\r?\n/);
      ws=new WebSocket(`ws://127.0.0.1:${port}${route}`);
      await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;setTimeout(()=>j(Error('CDP connection timed out')),10000).unref();});
      let seq=0;const pending=new Map();
      ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const [r,j]=pending.get(m.id);pending.delete(m.id);m.error?j(Error(JSON.stringify(m.error))):r(m.result);}};
      const call=(method,params={})=>new Promise((r,j)=>{const id=++seq;pending.set(id,[r,j]);setTimeout(()=>j(Error(method+' timed out')),15000).unref();ws.send(JSON.stringify({id,method,params}));});
      const loaded=await call('Extensions.loadUnpacked',{path:sourceDir});
      console.log('Chrome extension loaded:',loaded.id);
    } else {
      firefoxRunner=await cmd.run({sourceDir,artifactsDir:artifacts,firefox:process.env.FIREFOX_PATH || 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',target:['firefox-desktop'],args:['-headless'],noReload:true,noInput:true,startUrl:['about:blank']});
    }
    for(let i=0;i<600&&!reports.has(release.browser);i++)await sleep(100);
    if(!reports.get(release.browser)?.ok)throw Error(JSON.stringify(reports.get(release.browser)||{error:'Browser smoke timed out',browser:release.browser}));
    if(release.browser==='chrome'){ws.close();chromeProcess.kill();chromeProcess=null;}else{await firefoxRunner.exit();firefoxRunner=null;}
  }
  await fs.writeFile(path.join(reportDir,'browser-smoke-results.json'),JSON.stringify([...reports.values()],null,2));
} finally {
  ws?.close();chromeProcess?.kill();if(firefoxRunner)await firefoxRunner.exit();server.close();
}
