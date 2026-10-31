// Native-extension regression: authored finished-game fixtures, actual content
// scripts, real Stockfish/WASM, Chrome offscreen host and Firefox background.
// Browser profiles, injected audit hooks and screenshots stay under scratch/.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {cmd} from 'web-ext';
import {files,directories} from './package-inputs.mjs';

const root=process.cwd(), out=await fs.mkdtemp(path.join(root,'scratch/button-browser-'));
const source=path.join(out,'extension');await fs.mkdir(source);
for(const name of [...files,...directories]) await fs.cp(path.join(root,name),path.join(source,name),{recursive:true});
const pgn='[Event "Button regression"]\n[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const settings={enginePath:'nnue',engineDepth:16,engineWorkers:2,sound:false,depthBumped:true};
const seed={settingsResetFor040:true,settings,library:[],username:'Alice',
  'gamecache:chesscom:12345678':{data:{url:'https://www.chess.com/game/live/12345678',pgn,white:{username:'Alice'},black:{username:'Bob'}}},
  'gamecache:lichess:abcdefgh':{data:pgn}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
let firefoxReport,firefoxFontReport;
const server=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  if(req.method==='GET' && req.url==='/abcdefgh') {
    res.setHeader('Content-Type','text/html');
    res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'");
    res.end('<!doctype html><cg-container></cg-container><div class="cg-wrap orientation-white"></div><div class="rcontrols"><div class="follow-up"><a class="fbt">Analysis board</a></div></div>');return;
  }
  if(body){const report=JSON.parse(body);if(report.kind==='font')firefoxFontReport=report;else firefoxReport=report;}
  res.setHeader('Access-Control-Allow-Origin','*');res.end('ok');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const endpoint='http://127.0.0.1:'+server.address().port;
const original=JSON.parse(await fs.readFile(path.join(root,'manifest.json')));
let chrome,ws,firefox;
try {
  const manifest=structuredClone(original);delete manifest.background.scripts;delete manifest.browser_specific_settings;
  await fs.writeFile(path.join(source,'manifest.json'),JSON.stringify(manifest));
  await fs.writeFile(path.join(source,'audit.html'),'<!doctype html><script type="module" src="audit.js"></script>');
  await fs.writeFile(path.join(source,'audit.js'),"import {browserAPI} from './browser-compat.js';globalThis.api=browserAPI;");
  const profile=path.join(out,'chrome-profile');
  chrome=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
    '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
    '--enable-unsafe-extension-debugging',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let info;for(let i=0;i<100;i++){try{info=await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8');break;}catch{await sleep(100);}}
  assert.ok(info,'Chrome debugging port');const [port,route]=info.trim().split(/\r?\n/);
  ws=new WebSocket(`ws://127.0.0.1:${port}${route}`);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;setTimeout(()=>j(Error('CDP unavailable')),10000).unref();});
  let sequence=0;const pending=new Map(),events=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
    else events.get(m.sessionId)?.(m);};
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},method==='Extensions.loadUnpacked'?120000:60000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,sessionId}));});
  const tab=async()=>{const {targetId}=await call('Target.createTarget',{url:'about:blank'});const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});return {targetId,sessionId};};
  const evaluate=async(t,expression)=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},t.sessionId).catch(e=>{throw Error(e.message+' evaluating '+expression);});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const wait=async(t,expression,label)=>{for(let i=0;i<200;i++){if(await evaluate(t,expression))return;await sleep(100);}throw Error(label+' unavailable');};
  console.log('Loading isolated Chrome extension');
  const {id}=await call('Extensions.loadUnpacked',{path:source});
  console.log('Loaded Chrome extension:',id);
  const audit=await tab();await call('Page.navigate',{url:`chrome-extension://${id}/audit.html`},audit.sessionId);await wait(audit,'!!globalThis.api','Audit');
  await wait(audit,"api.storage.local.get('settingsResetFor040').then(x=>x.settingsResetFor040===true)",'Install migration');
  await evaluate(audit,`api.storage.local.set(${JSON.stringify(seed)})`);
  const native='<a class="cc-button-component" href="/analysis/game/live/12345678?tab=review">Game Review</a>';
  const row='<div class="game-review-buttons-component">'+native+'</div>';
  const newGame='<div class="new-game-buttons-component"><div class="new-game-buttons-buttons"><button>New 1 min</button><button>Rematch</button></div></div>';
  const fixtures=[
    ['profile','<div class="sidebar-content">'+row+'<p>Replay controls</p></div>'],
    ['archive-actions','<div class="sidebar-content">'+row+newGame+'<p>Replay controls</p></div>'],
    ['emphasis','<div class="game-review-emphasis-component"><div class="game-review-emphasis-content">'+row+'</div></div>'],
    ['completed-emphasis','<div class="sidebar-content"><div class="game-review-emphasis-component game-review-emphasis-short" style="overflow:hidden"><div class="game-review-emphasis-content"><div class="quick-analysis-component">6 Great · 9 Best · 10 Excellent</div>'+row+newGame+'</div></div></div>'],
    ['coach','<div class="sidebar-content"><div class="coach-nudge-game-review-component"><div style="max-height:20dvh;overflow:hidden">'+row+'</div></div><p>Replay controls</p></div>'],
    ['modal','<div class="game-over-modal-shell-buttons">'+native+'<div class="game-over-secondary-actions-row-component">New game · Rematch</div></div>'],
    ['modal-native-gap','<div class="game-over-modal-shell-buttons" style="display:flex;flex-direction:column;gap:8px">'+native+'<div class="game-over-secondary-actions-row-component" style="padding:0">'+newGame+'</div></div>'],
    ['modal-scaled','<div class="game-over-modal-shell-buttons" style="display:flex;flex-direction:column;gap:8px;transform:scale(.85);transform-origin:top left">'+native+'<div class="game-over-secondary-actions-row-component">New game · Rematch</div></div>'],
    ['nested-modal','<div class="game-over-modal-shell-buttons"><div class="nested-modal-actions">'+native+newGame+'</div></div>'],
    ['both','<div class="sidebar-content">'+row+'</div><div class="game-over-modal-shell-buttons">'+native+'</div>'],
    ['lichess','<div class="rcontrols"><div class="follow-up"><a class="fbt" href="/abcdefgh/analysis">Analysis board</a><button class="rematch">Rematch</button></div></div>'],
  ];
  for(const [sourceName,name,from,to] of [['profile','profile-fallback','game-review-buttons-component','game-review-buttons-next'],
    ['modal','modal-fallback','game-over-modal-shell-buttons','future-modal-shell-buttons'],
    ['emphasis','emphasis-fallback','game-review-emphasis-content','game-review-emphasis-next']]) {
    fixtures.push([name,fixtures.find(f=>f[0]===sourceName)[1].replace(from,to)]);
  }
  fixtures.push(['lichess-metadata',fixtures.find(f=>f[0]==='lichess')[1]]);
  let clickTab;
  for(const [name,markup] of fixtures) {
    console.log('Checking Chrome fixture:',name);
    const t=await tab(),isLi=name.startsWith('lichess');
    const html=`<!doctype html><meta charset="utf-8">${name==='lichess-metadata'?'<meta property="og:url" content="https://lichess.org/abcdefgh">':''}<style>
      body{background:#262421;color:#fff;font:15px Arial;padding:18px;margin:0}.fixture{width:var(--width,288px)}
      .cc-button-component,.fbt{display:block;box-sizing:border-box;width:100%;padding:14px 8px;border-radius:6px;background:#81b64c;color:white;text-decoration:none;text-align:center;border:0}
      .game-over-secondary-actions-row-component{padding:15px;text-align:center}.follow-up{display:flex;flex-direction:column;gap:8px}
      .quick-analysis-component{font-size:12px;color:#a3bd7c;text-align:center;margin-bottom:14px}
      .new-game-buttons-buttons{display:flex;gap:8px;margin-top:8px}.new-game-buttons-buttons>button{flex:1;border:0;border-radius:4px;background:#ffffff12;color:#ddd;padding:12px;font:600 13px Arial}
      wc-chess-board,cg-container{display:block}</style><div class="fixture">${isLi?'<cg-container></cg-container><div class="cg-wrap orientation-black"></div>':'<wc-chess-board></wc-chess-board><div class="player-bottom"><a href="/member/Alice">Alice</a></div>'}${markup}</div>`;
    const headers=[{name:'Content-Type',value:'text/html'}];
    if(isLi)headers.push({name:'Content-Security-Policy',value:"default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'"});
    events.set(t.sessionId,m=>{if(m.method==='Fetch.requestPaused')void call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:headers,body:Buffer.from(html).toString('base64')},t.sessionId);});
    await call('Fetch.enable',{patterns:[{urlPattern:'*',resourceType:'Document'}]},t.sessionId);
    const started=Date.now();await call('Page.navigate',{url:isLi?'https://lichess.org/'+(name==='lichess-metadata'?'future/game/':'')+'abcdefgh':'https://www.chess.com/game/live/12345678'},t.sessionId);
    await wait(t,"!!document.querySelector('.chess-review-button-summary')",name+' injection');
    await wait(t,"[...document.fonts].some(f=>f.family==='Chess Review Inter'&&f.status==='loaded')",name+' local Inter font');
    assert.match(await evaluate(t,"getComputedStyle(document.querySelector('.chess-review-button-summary')).fontFamily"),/Chess Review Inter/);
    await wait(t,"/\\d+\\.\\d% accuracy/.test(document.querySelector('.chess-review-button-summary').textContent)",name+' engine preview');
    const elapsedMs=Date.now()-started;
    const text=await evaluate(t,"document.querySelector('.chess-review-button-summary').textContent");
    assert.match(text,isLi?/Bob played with ~/ : /Alice played with ~/);
    await sleep(350); // Let the one-shot accuracy reveal settle before measuring.
    const widths=name==='completed-emphasis'?[220,288,585]:[220,288,360];
    for(const width of widths) {
      await evaluate(t,`document.querySelector('.fixture').style.setProperty('--width','${width}px');dispatchEvent(new Event('resize'))`);await sleep(60);
      const boxes=await evaluate(t,`[...document.querySelectorAll('.chess-analyzer-free-review,.chess-analyzer-review')].map(b=>{const r=b.getBoundingClientRect(),s=b.querySelector('.chess-review-button-summary').getBoundingClientRect();return {width:r.width,height:b.offsetHeight,summaryFits:s.left>=r.left&&s.right<=r.right&&s.bottom<=r.bottom,overflow:b.scrollWidth>b.clientWidth+1};})`);
      for(const b of boxes){assert.ok(b.height>=62);assert.ok(b.width<=width+1);assert.ok(b.summaryFits);assert.equal(b.overflow,false);}
      if(['completed-emphasis','nested-modal','archive-actions'].includes(name)) {
        const order=await evaluate(t,"(()=>{const c=document.querySelector('.cc-button-component').getBoundingClientRect(),b=document.querySelector('.chess-analyzer-free-review').getBoundingClientRect(),n=document.querySelector('.new-game-buttons-component').getBoundingClientRect();return {between:c.bottom<=b.top&&b.bottom<=n.top,one:document.querySelectorAll('.chess-analyzer-free-review').length===1,gap:b.top-c.bottom};})()");
        assert.equal(order.between,true);assert.equal(order.one,true);assert.ok(order.gap>=15.9,'Keep a full 16px gap below native Game Review');
      }
      if(name.startsWith('modal')||name==='nested-modal') {
        const gaps=await evaluate(t,"(()=>{const button=document.querySelector('.chess-analyzer-free-review'),c=document.querySelector('.cc-button-component').getBoundingClientRect(),b=button.getBoundingClientRect(),row=document.querySelector('.game-over-secondary-actions-row-component,.new-game-buttons-component'),n=(row.querySelector('button,a[href]')||row).getBoundingClientRect(),scale=b.width/button.offsetWidth;return [(b.top-c.bottom)/scale,(n.top-b.bottom)/scale];})()");
        for(const gap of gaps)assert.ok(Math.abs(gap-16)<=1,'Popup separates both native action rows by 16px, including during entrance scaling');
      }
      await call('Emulation.setDeviceMetricsOverride',{width:Math.max(430,width+40),height:650,deviceScaleFactor:1,mobile:false},t.sessionId);
      const clip=await evaluate(t,"(()=>{const r=document.querySelector('.fixture').getBoundingClientRect();return {x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:r.width+16,height:r.height+16,scale:1};})()");
      const shot=await call('Page.captureScreenshot',{format:'png',clip},t.sessionId);await fs.writeFile(path.join(out,`${name}-${width}.png`),Buffer.from(shot.data,'base64'));
    }
    await call('DOM.enable',{},t.sessionId);await call('CSS.enable',{},t.sessionId);
    const {root:documentRoot}=await call('DOM.getDocument',{},t.sessionId);
    const {nodeId}=await call('DOM.querySelector',{nodeId:documentRoot.nodeId,selector:'.chess-analyzer-free-review,.chess-analyzer-review'},t.sessionId);
    const restingBackground=await evaluate(t,"getComputedStyle(document.querySelector('.chess-analyzer-free-review,.chess-analyzer-review')).backgroundColor");
    await call('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']},t.sessionId);await sleep(180);
    assert.notEqual(await evaluate(t,"getComputedStyle(document.querySelector('.chess-analyzer-free-review,.chess-analyzer-review')).backgroundColor"),restingBackground);
    assert.equal(await evaluate(t,"getComputedStyle(document.querySelector('.chess-analyzer-free-review,.chess-analyzer-review')).backgroundImage"),'none');
    assert.equal(await evaluate(t,"getComputedStyle(document.querySelector('.chess-analyzer-free-review-logo,.chess-analyzer-review-logo')).animationName"),'none');
    await call('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['focus-visible']},t.sessionId);
    assert.equal(await evaluate(t,"getComputedStyle(document.querySelector('.chess-analyzer-free-review,.chess-analyzer-review')).outlineStyle"),'solid');
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},t.sessionId);
    assert.equal(await evaluate(t,"getComputedStyle(document.querySelector('.chess-analyzer-free-review,.chess-analyzer-review'),'::after').animationName"),'none');
    assert.equal(await evaluate(t,"getComputedStyle(document.querySelector('.chess-review-button-accuracy')).animationName"),'none');
    assert.equal(await evaluate(t,"getComputedStyle(document.querySelector('.chess-analyzer-free-review,.chess-analyzer-review')).transitionDuration"),'0s');
    await call('Emulation.setEmulatedMedia',{features:[]},t.sessionId);
    await call('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]},t.sessionId);
    results.push({browser:'chrome',fixture:name,elapsedMs,text,widths});
    if(name==='profile')clickTab=t;else await call('Target.closeTarget',{targetId:t.targetId});
  }
  assert.deepEqual(await evaluate(audit,"api.storage.local.get('settings').then(x=>x.settings)"),settings);
  await evaluate(audit,`api.storage.local.set({settings:${JSON.stringify({...settings,uiAnim:false})}})`);
  await wait(clickTab,"document.querySelector('.chess-analyzer-free-review').dataset.motion==='off'",'Interface motion preference');
  assert.equal(await evaluate(clickTab,"getComputedStyle(document.querySelector('.chess-review-button-accuracy')).animationName"),'none');
  assert.equal(await evaluate(clickTab,"getComputedStyle(document.querySelector('.chess-analyzer-free-review')).transitionDuration"),'0s');
  await evaluate(audit,`api.storage.local.set({settings:${JSON.stringify(settings)}})`);
  await wait(clickTab,"document.querySelector('.chess-analyzer-free-review').dataset.motion==='on'",'Interface motion restored');
  const before=await call('Target.getTargets');
  const opening=await evaluate(clickTab,"(()=>{const b=document.querySelector('.chess-analyzer-free-review');b.click();return {busy:b.getAttribute('aria-busy'),opening:b.classList.contains('is-opening'),animation:getComputedStyle(b).animationName};})()");
  assert.deepEqual(opening,{busy:'true',opening:true,animation:'none'});
  let opened;
  for(let i=0;i<100;i++){const now=await call('Target.getTargets');opened=now.targetInfos.find(t=>t.url.includes(id+'/analysis.html#')&&!before.targetInfos.some(old=>old.targetId===t.targetId));if(opened)break;await sleep(100);}
  assert.ok(opened,'Review click opens the original full-review flow');
  const jobs=await evaluate(audit,"api.storage.local.get(null).then(x=>Object.entries(x).filter(([k])=>k.startsWith('job:')).map(([,v])=>v))");
  assert.ok(jobs.some(job=>job.pgn===pgn && !job.estimated && !job.accuracy));
  await call('Target.closeTarget',{targetId:opened.targetId});
  // Legacy saved counts must be ignored: only the completed accuracy is displayed.
  await evaluate(audit,`api.storage.local.set({library:[{url:'https://www.chess.com/game/live/12345678',pgn:${JSON.stringify(pgn)},buttonSummary:{version:1,accuracy:{w:98.1,b:73.2},counts:{w:{brilliant:2,great:1},b:{brilliant:0,great:0}}}}]})`);
  await wait(clickTab,"document.querySelector('.chess-review-button-summary').textContent==='Alice played with 98.1% accuracy'",'Saved review refresh');
  for(const width of [220,360]) {
    await evaluate(clickTab,`document.querySelector('.fixture').style.setProperty('--width','${width}px');dispatchEvent(new Event('resize'))`);await sleep(60);
    assert.ok(await evaluate(clickTab,"(()=>{const b=document.querySelector('.chess-analyzer-free-review'),s=b.querySelector('.chess-review-button-summary'),r=b.getBoundingClientRect(),sr=s.getBoundingClientRect();return sr.bottom<=r.bottom&&b.scrollWidth<=b.clientWidth+1;})()"));
    const saved=await call('Page.captureScreenshot',{format:'png'},clickTab.sessionId);await fs.writeFile(path.join(out,`saved-accuracy-${width}.png`),Buffer.from(saved.data,'base64'));
  }
  await call('Target.closeTarget',{targetId:clickTab.targetId});
  await sleep(300);
  const contexts=await evaluate(audit,"api.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']})");assert.equal(contexts.length,0,'Idle preview document closes');
  ws.close();ws=null;chrome.kill();chrome=null;

  // Firefox supports workers directly in its background document. The test-only
  // hook exercises that real context; it is never present in source or packages.
  const ff=structuredClone(original);delete ff.background.service_worker;
  ff.permissions=ff.permissions.filter(p=>p!=='offscreen');ff.host_permissions.push('http://127.0.0.1/*');
  ff.web_accessible_resources[0].matches.push('http://127.0.0.1/*');
  ff.content_scripts.push({matches:['http://127.0.0.1/*'],js:['button-preview-content.js','lichess-content.js','font-audit.js'],css:['content-button.css'],run_at:'document_idle'});
  await fs.writeFile(path.join(source,'manifest.json'),JSON.stringify(ff));
  await fs.appendFile(path.join(source,'background.js'),`\nbrowserAPI.runtime.onInstalled.addListener(()=>browserAPI.tabs.create({url:browserAPI.runtime.getURL('firefox-audit.html')}));
browserAPI.runtime.onMessage.addListener((m,s,reply)=>{if(m?.type!=='preview-native-audit')return;createPreviewRunner(browserAPI)(m.pgn).then(summary=>reply({ok:true,summary}),e=>reply({ok:false,error:e.message}));return true;});\n`);
  await fs.appendFile(path.join(source,'background.js'),`\nbrowserAPI.runtime.onMessage.addListener((m,s,reply)=>{if(m?.type!=='preview-font-audit')return;fetch(${JSON.stringify(endpoint)},{method:'POST',body:JSON.stringify({kind:'font',...m.report})}).then(()=>reply({ok:true}));return true;});\n`);
  await fs.writeFile(path.join(source,'font-audit.js'),`(async()=>{for(let i=0;i<200;i++){const loaded=[...document.fonts].some(f=>f.family==='Chess Review Inter'&&f.status==='loaded');if(loaded){await browserAPI.runtime.sendMessage({type:'preview-font-audit',report:{ok:true,font:getComputedStyle(document.querySelector('.chess-review-button-summary')).fontFamily}});return;}await new Promise(r=>setTimeout(r,50));}await browserAPI.runtime.sendMessage({type:'preview-font-audit',report:{ok:false,error:'Inter did not load under strict page CSP'}});})();`);
  await fs.writeFile(path.join(source,'firefox-audit.html'),'<!doctype html><script type="module" src="firefox-audit.js"></script>');
  await fs.writeFile(path.join(source,'firefox-audit.js'),`import {browserAPI as api} from './browser-compat.js';
try{for(let i=0;i<200;i++){if((await api.storage.local.get('settingsResetFor040')).settingsResetFor040)break;await new Promise(r=>setTimeout(r,25));}await api.storage.local.set(${JSON.stringify({settingsResetFor040:true,settings})});const start=performance.now();const result=await api.runtime.sendMessage({type:'preview-native-audit',pgn:${JSON.stringify(pgn)}});const after=await api.storage.local.get('settings');await fetch(${JSON.stringify(endpoint)},{method:'POST',body:JSON.stringify({...result,browser:'firefox',elapsedMs:performance.now()-start,settings:after.settings})});}catch(e){await fetch(${JSON.stringify(endpoint)},{method:'POST',body:JSON.stringify({ok:false,error:e.message})});}`);
  firefox=await cmd.run({sourceDir:source,artifactsDir:out,firefox:process.env.FIREFOX_PATH||'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    firefoxProfile:await fs.mkdtemp(path.join(out,'firefox-profile-')),keepProfileChanges:true,target:['firefox-desktop'],args:['-headless'],noReload:true,noInput:true,startUrl:[endpoint+'/abcdefgh']});
  for(let i=0;i<300&&(!firefoxReport||!firefoxFontReport);i++)await sleep(100);
  assert.ok(firefoxReport?.ok,JSON.stringify(firefoxReport));assert.equal(firefoxReport.summary.estimated,true);
  assert.ok(firefoxReport.summary.accuracy.w>0);assert.deepEqual(firefoxReport.settings,settings);results.push(firefoxReport);
  assert.ok(firefoxFontReport?.ok,JSON.stringify(firefoxFontReport));assert.match(firefoxFontReport.font,/Chess Review Inter/);results.push({browser:'firefox',...firefoxFontReport});
  await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({out,results},null,2));
} finally {ws?.close();chrome?.kill();if(firefox)await firefox.exit();server.close();}
