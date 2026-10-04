import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

// Audit a disposable copy of the latest Chrome package. Test exports, profiles,
// screenshots and fixture games never enter either store ZIP or the user's profile.
const root=process.cwd(), artifacts=path.join(root,'web-ext-artifacts');
const {recordPath}=JSON.parse(await fs.readFile(path.join(artifacts,'latest-release.json')));
const record=JSON.parse(await fs.readFile(recordPath));
const out=await fs.mkdtemp(path.join(path.dirname(recordPath),'layout-'));
const source=await fs.mkdtemp(path.join(artifacts,'layout-chrome-'));
await fs.cp(record.packages.find(p=>p.browser==='chrome').sourceDir,source,{recursive:true});
await fs.appendFile(path.join(source,'analysis.js'),'\nexport {S, resetLayout, toggleReorganize, updateLibrary};\n');
await fs.writeFile(path.join(source,'audit.html'),'<!doctype html><script type="module" src="audit.js"></script>');
await fs.writeFile(path.join(source,'audit.js'),"import {browserAPI} from './browser-compat.js'; window.api=browserAPI;");
const profile=await fs.mkdtemp(path.join(artifacts,'layout-profile-'));
const chrome=spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
  '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
  '--enable-unsafe-extension-debugging',`--user-data-dir=${profile}`,'about:blank',
],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const keepAlive=setInterval(()=>{},1000);
let ws;
try {
  let portInfo;
  for(let i=0;i<100;i++){try{portInfo=await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8');break;}catch{await sleep(100);}}
  if(!portInfo)throw Error('Chrome did not expose its debugging port');
  const [port,route]=portInfo.trim().split(/\r?\n/);
  ws=new WebSocket(`ws://127.0.0.1:${port}${route}`);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('CDP connection timed out')),10000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=()=>{clearTimeout(timer);reject(Error('CDP connection failed'));};});
  let seq=0;const pending=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const {resolve,reject,timer}=pending.get(m.id);pending.delete(m.id);clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);}};
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,sessionId}));});
  const loaded=await call('Extensions.loadUnpacked',{path:source});
  const create=async(url)=>{const {targetId}=await call('Target.createTarget',{url});const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});return {targetId,sessionId};};
  const evaluate=async(t,expression)=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},t.sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const audit=await create(`chrome-extension://${loaded.id}/audit.html`);await sleep(300);
  const pgn='[White "Audit White"]\n[Black "Audit Black"]\n\n1. e4 e5 2. Nf3 Nc6 *';
  const payload={pgn,meta:{gameId:'layout-audit'},source:'pgn'};
  await evaluate(audit,`api.storage.local.clear().then(()=>api.storage.local.set({'job:audit':${JSON.stringify(payload)}}))`);
  const review=await create(`chrome-extension://${loaded.id}/analysis.html#audit`);
  const ready=async tab=>{
    for(let i=0;i<300;i++) {
      await sleep(100);
      if(await evaluate(tab,"!!document.querySelector('.board') && import('./analysis.js').then(m=>!m.S.analyzing)"))return;
      const error=await evaluate(tab,"document.querySelector('#error')?.textContent");
      if(error)throw Error(error);
    }
    throw Error('Review did not finish');
  };
  await ready(review);
  const fresh=await evaluate(review,"import('./analysis.js').then(m=>({engine:m.S.activeEngineBuild,error:m.S.analysisError,settings:m.S.settings}))");
  assert.equal(fresh.engine,'nnue');assert.equal(fresh.error,null);
  assert.equal(fresh.settings.enginePath,'nnue');
  const measure=`(async()=>{const m=await import('./analysis.js');const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};return {width:innerWidth,height:innerHeight,zoom:await chrome.tabs.getZoom(),mode:m.S.layoutMode,desktop:document.querySelector('.stage').classList.contains('desktop-layout'),board:rect(document.querySelector('.board')),scroll:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight},modules:[...document.querySelectorAll('.mod')].map(n=>({key:n.dataset.mod,...rect(n)})),error:document.querySelector('#error').textContent}})()`;
  const results=[];
  const capture=async(label)=>{
    const data=await evaluate(review,measure);
    assert.equal(data.error,'');
    assert.ok(Math.abs(data.board.w-data.board.h)<1,`${label}: board is not square`);
    assert.ok(data.scroll.w<=data.width+1,`${label}: horizontal overflow`);
    if(data.desktop||data.mode==='custom')assert.ok(data.scroll.h<=data.height+1,`${label}: vertical overflow`);
    results.push({label,...data});
    const screenshot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,label+'.png'),Buffer.from(screenshot.data,'base64'));
  };
  const {windowId}=await call('Browser.getWindowForTarget',{targetId:review.targetId});
  for(const [w,h] of [[1920,1080],[1366,768],[1536,864],[1280,720],[1280,800],[1440,900],[1470,956],[1536,960],[2560,1440],[3440,1440],[3840,2160],[1024,768],[820,768],[768,1024],[1280,480]]) {
    await call('Browser.setWindowBounds',{windowId,bounds:{width:w,height:h}});await sleep(700);
    await capture(`${w}x${h}`);
  }
  // Desktop Chrome enforces a minimum window width. Emulate smaller CSS viewports
  // separately to exercise the responsive CSS without pretending these are phones.
  for(const [w,h] of [[390,844],[320,640]]) {
    await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(700);
    await capture(`viewport-${w}x${h}`);
    await evaluate(review,"document.querySelector('[aria-label=Settings]').click()");
    const settings=await evaluate(review,"(()=>{const r=document.querySelector('#settings').getBoundingClientRect();return {x:r.x,right:r.right,width:innerWidth}})()");
    assert.ok(settings.x>=0&&settings.right<=settings.width, 'Settings escapes narrow viewport');
    await evaluate(review,"document.querySelector('[aria-label=Settings]').click()");
  }
  await call('Emulation.clearDeviceMetricsOverride',{},review.sessionId);
  await call('Browser.setWindowBounds',{windowId,bounds:{width:1920,height:1080}});await sleep(700);
  await evaluate(review,"import('./analysis.js').then(m=>m.toggleReorganize())");await sleep(400);
  await capture('custom-layout');
  await call('Page.reload',{},review.sessionId);await ready(review);await sleep(500);
  assert.equal(await evaluate(review,"import('./analysis.js').then(m=>m.S.layoutMode)"),'custom');
  await capture('custom-reloaded');
  await evaluate(review,"import('./analysis.js').then(m=>m.resetLayout())");await sleep(500);
  await capture('reset-layout');
  const popup=await create(`chrome-extension://${loaded.id}/popup.html`);await sleep(300);
  await call('Emulation.setDeviceMetricsOverride',{width:318,height:600,deviceScaleFactor:1,mobile:false},popup.sessionId);
  const popupSize=await evaluate(popup,"(()=>{document.querySelector('#manual').open=true;return {width:innerWidth,scroll:document.documentElement.scrollWidth,height:document.body.scrollHeight}})()");
  assert.ok(popupSize.scroll<=popupSize.width&&popupSize.height<=600,'Expanded popup overflows');
  const legacy={enginePath:'sf19',engineDepth:8,engineWorkers:1,depthBumped:true,coach:'professor',coachDefaulted:true,coachPlain:true,soundVolume:37,boardTheme:'kada_green',pieceStyle:'chesscom',badgeFont:'original',badgeDecimals:true};
  await evaluate(audit,`api.storage.local.set({settings:${JSON.stringify(legacy)},layoutVersion:7,'job:upgrade':${JSON.stringify(payload)}})`);
  const upgraded=await create(`chrome-extension://${loaded.id}/analysis.html#upgrade`);await ready(upgraded);
  const migrated=await evaluate(upgraded,"import('./analysis.js').then(m=>({settings:m.S.settings,layoutMode:m.S.layoutMode,engine:m.S.activeEngineBuild,library:m.S.library.length}))");
  for(const [key,value] of Object.entries({enginePath:'sf19lite',boardTheme:'green',pieceStyle:'image',badgeFont:'spacemono',coach:'professor',soundVolume:37}))assert.equal(migrated.settings[key],value,`Update preference: ${key}`);
  assert.equal(migrated.layoutMode,'auto');assert.equal(migrated.engine,'sf19lite');assert.ok(migrated.library>0);
  assert.equal(await evaluate(review,"typeof navigator.locks?.request"),'function');
  await Promise.all([
    evaluate(review,"import('./analysis.js').then(m=>m.updateLibrary(library=>[{...library[0],id:'audit-a'},...library]))"),
    evaluate(upgraded,"import('./analysis.js').then(m=>m.updateLibrary(library=>[{...library[0],id:'audit-b'},...library]))"),
  ]);
  const savedIds=await evaluate(audit,"api.storage.local.get('library').then(s=>s.library.map(r=>r.id))");
  assert.ok(savedIds.includes('audit-a')&&savedIds.includes('audit-b'),'Concurrent tabs lost a library entry');
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,chromeVersion:await call('Browser.getVersion'),sourceRecord:recordPath,results,popup:popupSize,fresh,upgrade:migrated},null,2));
  console.log(`Passed ${results.length} layout cases, expanded popup, refresh/reset, legacy update, and concurrent library writes. Screenshots and measurements: ${out}`);
} finally {clearInterval(keepAlive);ws?.close();chrome.kill();}
