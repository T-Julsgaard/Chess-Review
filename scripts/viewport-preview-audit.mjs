import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

function geometry(win) {
  const rect=element=>{
    const {x,y,width,height}=element.getBoundingClientRect();
    return {x,y,width,height};
  };
  const panels=[...win.document.querySelectorAll('.stage .mod[data-mod]')].filter(panel=>panel.getClientRects().length);
  return {width:win.innerWidth,height:win.innerHeight,board:rect(win.document.querySelector('.stage .board')),
    panels:Object.fromEntries(panels.map(panel=>[panel.dataset.mod,rect(panel)]))};
}

function compareGeometry(preview,reference,label) {
  assert.equal(preview.width,reference.width,`${label}: viewport width`);
  assert.equal(preview.height,reference.height,`${label}: viewport height`);
  const previewRects={board:preview.board,...preview.panels},referenceRects={board:reference.board,...reference.panels};
  assert.deepEqual(Object.keys(previewRects),Object.keys(referenceRects),`${label}: panels`);
  for(const [key,rect]of Object.entries(referenceRects)){
    for(const [property,value]of Object.entries(rect)){
      const actual=previewRects[key][property];
      assert.ok(Math.abs(actual-value)<0.5,`${label}: ${key} ${property} is ${actual}, expected ${value}`);
    }
  }
}

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  await evaluate(review,`(async()=>{const {id}=await chrome.tabs.getCurrent();
    await chrome.tabs.setZoomSettings(id,{scope:'per-tab'});
    await chrome.tabs.setZoom(id,1.25)})()`);
  await waitFor(review,'chrome.tabs.getZoom().then(z=>z===1.25)','Review tab zoom');
  await evaluate(review,"import('./analysis.js').then(m=>m.go(2))");
  await evaluate(review,`document.querySelector('[aria-label=Settings]').click();
    document.querySelector('.set-category .lib-dd-btn').click();
    document.querySelector('[data-category=developer]').click();
    [...document.querySelectorAll('.set-sect-head')].find(b=>b.textContent==='Developer debugger').click()`);
  const before=await call('Target.getTargets');
  await evaluate(review,"document.querySelector('[data-debug=screen-previews]').click()");
  let created;
  for(let i=0;i<100&&!created;i++){
    const targets=await call('Target.getTargets');created=targets.targetInfos.find(t=>t.url.endsWith('/screen-preview.html')&&!before.targetInfos.some(b=>b.targetId===t.targetId));
    if(!created)await sleep(100);
  }
  assert.ok(created,'Settings opens the screen-size preview');
  const {sessionId}=await call('Target.attachToTarget',{targetId:created.targetId,flatten:true}),tab={targetId:created.targetId,sessionId};
  const run=expression=>evaluate(tab,expression);
  const change=(id,value)=>run(`(()=>{const control=document.getElementById('${id}');control.value='${value}';control.dispatchEvent(new Event('change'));})()`);
  const selectGroup=group=>run(`[...document.querySelectorAll('#device-tabs button')].find(b=>b.textContent==='${group}').click()`);
  const inside=expression=>run(`(async()=>{const w=document.querySelector('iframe').contentWindow;return (${expression})})()`);
  await waitFor(tab,"document.querySelector('iframe')?.contentDocument?.body?.dataset.previewReady==='true'",'Viewport preview');
  const initial=await inside("w.document.querySelector('#error').textContent");assert.equal(initial,'');
  const liveGeometry=await evaluate(review,`(${geometry})(window)`);
  const previewGeometry=await inside(`(${geometry})(w)`);
  compareGeometry(previewGeometry,liveGeometry,'Current at the launch zoom');
  assert.equal(await run("document.querySelector('iframe').style.transform"),'scale(1)');
  assert.equal(await run('chrome.tabs.getZoom()'),1,'Preview tab uses 100% browser zoom');
  assert.equal(await run('devicePixelRatio'),1.5,'The preview viewer inherits the OS display scale only');
  assert.equal(await evaluate(review,'devicePixelRatio'),1.875,'The launching tab kept its 125% zoom');
  await waitFor(tab,"document.querySelector('#display-scale [value=current]').textContent.includes('150%')",'Display scale at 100% browser zoom');
  await evaluate(review,'chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,1))');
  const game=await inside("({pgn:w.__viewportAudit.S.pgn,idx:w.__viewportAudit.S.idx})");
  assert.equal(game.pgn,'1. e4 e5 2. Nf3 Nc6 *');assert.equal(game.idx,2);
  await run("window.originalFrame=document.querySelector('iframe').contentWindow;window.originalDoc=originalFrame.document");
  const measureStage="(()=>{const r=document.querySelector('#preview-stage').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight}})()";
  const stage=await run(measureStage);
  assert.equal(stage.x,0);assert.equal(stage.y,0);
  assert.ok(Math.abs(stage.width-stage.viewportWidth)<0.5&&Math.abs(stage.height-stage.viewportHeight)<0.5,
    'Review uses the entire available viewport');
  assert.equal(await run("document.querySelector('#preview-settings').hidden"),true);
  await run("document.querySelector('#toggle-settings').click()");
  assert.deepEqual(await run(measureStage),stage,'Screen setup overlays the review without shrinking it');
  let shot=await call('Page.captureScreenshot',{format:'png'},sessionId);await fs.writeFile(path.join(out,'screen-size-setup.png'),Buffer.from(shot.data,'base64'));
  await run("document.querySelector('#close-settings').click()");
  await call('Runtime.evaluate',{expression:"document.querySelector('#fullscreen-preview').click()",userGesture:true},sessionId);
  await waitFor(tab,"document.fullscreenElement===document.documentElement&&document.querySelector('#preview-toolbar').hidden",'Immersive full screen');
  assert.equal(await run("document.querySelector('#show-controls').hidden"),false);
  shot=await call('Page.captureScreenshot',{format:'png'},sessionId);await fs.writeFile(path.join(out,'screen-size-fullscreen.png'),Buffer.from(shot.data,'base64'));
  await run("document.querySelector('#show-controls').click()");
  assert.equal(await run("document.querySelector('#fullscreen-preview').textContent"),'Exit full screen');
  await run("document.exitFullscreen()");
  await waitFor(tab,"!document.fullscreenElement",'Exit full screen');
  const base=await evaluate(review,'location.origin');
  const auditTarget=await call('Target.createTarget',{url:base+'/audit.html'});
  const auditSession=await call('Target.attachToTarget',{targetId:auditTarget.targetId,flatten:true}),audit={sessionId:auditSession.sessionId};
  await waitFor(audit,'!!window.api','Storage');
  const baseline=await evaluate(audit,'api.storage.local.get(null).then(JSON.stringify)');
  await call('Page.bringToFront',{},sessionId);
  assert.equal(await run("document.querySelector('#preview-scale').value"),'fit','Whole screen is visible by default');
  assert.equal(await run("document.querySelector('#display-scale').value"),'1','Other monitors default to a 100% target scale');
  await change('target-window','fullscreen');
  let checked=0;
  for(const [group,index,scale,width,height]of [
    ['Desktop',0,'1',1920,1080],['Desktop',1,'1',2560,1440],
    ['Desktop',2,'1',3840,2160],['Desktop',2,'current',2560,1440],
    ['Desktop',3,'1',3440,1440],['Laptop',1,'1',1366,768],['Tablet',1,'1',820,1180],
  ]){
    await selectGroup(group);
    await change('screen-preset',index);
    await change('display-scale',scale);
    await waitFor(tab,`(()=>{const fit=document.querySelector('iframe').contentWindow.__viewportAudit.fit();return Math.abs(fit?.w-${width})<3&&Math.abs(fit?.h-${height})<3})()`,`${group} layout fit`).catch(async error=>{
      throw Error(error.message+': '+JSON.stringify(await inside("({fit:w.__viewportAudit.fit(),width:w.innerWidth,height:w.innerHeight,zoom:w.frameElement.dataset.previewZoom})")));
    });
    await sleep(650);
    const state=await run("(()=>{const f=document.querySelector('iframe'),w=f.contentWindow;return {width:f.offsetWidth,height:f.offsetHeight,same:w===originalFrame&&w.document===originalDoc,outerZoom:devicePixelRatio,error:w.document.querySelector('#error').textContent,scroll:w.document.documentElement.scrollWidth,innerWidth:w.innerWidth}})()");
    assert.ok(Math.abs(state.width-width)<2,`${group}: width`);assert.ok(Math.abs(state.height-height)<2,`${group}: height`);
    assert.equal(state.same,true,'Size changes preserve the live document');assert.equal(state.error,'');
    const fit=await run("(()=>{const s=document.querySelector('#preview-stage');return {width:s.clientWidth,height:s.clientHeight,scrollWidth:s.scrollWidth,scrollHeight:s.scrollHeight}})()");
    assert.ok(fit.scrollWidth<=fit.width+1&&fit.scrollHeight<=fit.height+1,`${group}: fitted review fills the stage without outer scrolling`);
    assert.equal(await run("(()=>{const s=document.querySelector('#preview-stage'),f=document.querySelector('iframe'),r=document.querySelector('#preview-surface').getBoundingClientRect();return Math.abs(r.width-s.clientWidth)<1||Math.abs(r.height-s.clientHeight)<1||f.style.transform==='scale(1)'})()"),true,`${group}: preview fits without enlarging smaller screens`);
    if((group==='Desktop'&&index===2)||group==='Laptop'){
      await call('Page.bringToFront',{},review.sessionId);
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:scale==='current'?1.5:1,mobile:false},review.sessionId);
      await waitFor(review,`window.__viewportAudit.fit()?.w===${width}&&window.__viewportAudit.fit()?.h===${height}`,'Top-level review');
      const nativeGeometry=await evaluate(review,`(${geometry})(window)`);
      const frameGeometry=await inside(`(${geometry})(w)`);
      compareGeometry(frameGeometry,nativeGeometry,`${group} ${width}×${height} versus top-level review`);
      const nativeShot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,`screen-size-native-${width}x${height}.png`),Buffer.from(nativeShot.data,'base64'));
      await call('Emulation.clearDeviceMetricsOverride',{},review.sessionId);
      await call('Page.bringToFront',{},sessionId);
    }
    const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);await fs.writeFile(path.join(out,`screen-size-${group.toLowerCase()}-${index}-${scale}.png`),Buffer.from(shot.data,'base64'));
    if(scale==='current'){
      await run("document.querySelector('#toggle-settings').click()");
      const setupShot=await call('Page.captureScreenshot',{format:'png'},sessionId);
      await fs.writeFile(path.join(out,'screen-size-4k-setup.png'),Buffer.from(setupShot.data,'base64'));
      await run("document.querySelector('#close-settings').click()");
    }
    assert.ok(state.scroll<=state.innerWidth+1,`${group}: horizontal overflow ${JSON.stringify(state)}; screenshot: ${out}`);
    checked++;
  }
  await run("document.querySelector('#preview-scale').value='1';document.querySelector('#preview-scale').dispatchEvent(new Event('change'))");
  assert.equal(await run("document.querySelector('iframe').style.transform"),'scale(1)');
  await run("document.querySelector('#preview-scale').value='fit';document.querySelector('#preview-scale').dispatchEvent(new Event('change'))");
  await run("document.querySelector('iframe').contentWindow.document.querySelector('[aria-label=Settings]').click()");
  await sleep(200);
  assert.equal(await inside("!w.document.querySelector('#settings').hidden"),true);
  await run("document.querySelector('#rotate-screen').click()");await sleep(650);
  assert.equal(await inside("!w.document.querySelector('#settings').hidden"),true,'Rotation keeps settings open');
  await inside("(await w.__viewportAudit.openLearning(),await w.__viewportAudit.workspace().navigate('puzzles'),true)");
  assert.equal(await inside("w.__viewportAudit.workspace().ready"),true);
  await run("[...document.querySelectorAll('#device-tabs button')].find(b=>b.textContent==='Laptop').click()");await sleep(650);
  assert.equal(await run("document.querySelector('iframe').contentWindow===originalFrame"),true);
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false},sessionId);
  await change('target-window','maximized');
  await run("document.querySelector('#toggle-settings').click()");await sleep(250);
  assert.equal(await run("['preview-settings','preview-toolbar'].every(id=>{const n=document.getElementById(id),r=n.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight&&n.scrollWidth<=n.clientWidth+1})"),true,'Screen controls remain usable in a narrow window');
  shot=await call('Page.captureScreenshot',{format:'png'},sessionId);await fs.writeFile(path.join(out,'screen-size-narrow-setup.png'),Buffer.from(shot.data,'base64'));
  await call('Emulation.clearDeviceMetricsOverride',{},sessionId);
  assert.equal(await evaluate(audit,'api.storage.local.get(null).then(JSON.stringify)'),baseline,'Preview leaves real account data unchanged');
  await run("chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,.8))");
  await call('Page.reload',{},sessionId);
  await waitFor(tab,"document.querySelector('iframe')?.contentDocument?.body?.dataset.previewReady==='true'&&chrome.tabs.getZoom().then(z=>z===1)",'Preview restores 100% browser zoom');
  assert.equal(await evaluate(review,'chrome.tabs.getZoom()'),1,'Preview zoom leaves the review tab unchanged');
  assert.deepEqual(await inside("({width:w.innerWidth,height:w.innerHeight})"),{width:liveGeometry.width,height:liveGeometry.height});
  console.log(`Passed launch-zoom handoff, 4K at 100% and 150% and laptop layout comparisons, ${checked} viewport sizes, whole-viewport fit, fullscreen, narrow controls and isolated storage. Screenshots: ${out}`);
}
