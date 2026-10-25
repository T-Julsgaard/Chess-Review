import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  await evaluate(review,"import('./analysis.js').then(m=>m.go(2))");
  await evaluate(review,"document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-sect-head')].find(b=>b.textContent==='Screen sizes').click()");
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
  const inside=expression=>run(`(async()=>{const w=document.querySelector('iframe').contentWindow;return (${expression})})()`);
  await waitFor(tab,"document.querySelector('iframe')?.contentDocument?.body?.dataset.previewReady==='true'",'Viewport preview');
  const initial=await inside("w.document.querySelector('#error').textContent");assert.equal(initial,'');
  const game=await inside("({pgn:w.__viewportAudit.S.pgn,idx:w.__viewportAudit.S.idx})");
  assert.equal(game.pgn,'1. e4 e5 2. Nf3 Nc6 *');assert.equal(game.idx,2);
  await run("window.originalFrame=document.querySelector('iframe').contentWindow;window.originalDoc=originalFrame.document");
  const base=await evaluate(review,'location.origin');
  const auditTarget=await call('Target.createTarget',{url:base+'/audit.html'});
  const auditSession=await call('Target.attachToTarget',{targetId:auditTarget.targetId,flatten:true}),audit={sessionId:auditSession.sessionId};
  await waitFor(audit,'!!window.api','Storage');
  const baseline=await evaluate(audit,'api.storage.local.get(null).then(JSON.stringify)');
  await call('Page.bringToFront',{},sessionId);
  let checked=0;
  for(const [group,index,width,height]of [['Desktop',0,1920,1080],['Desktop',2,3840,2160],['Desktop',3,3440,1440],['Laptop',1,1366,768],['Tablet',1,820,1180],['Phone',1,390,844]]){
    await run(`(()=>{[...document.querySelectorAll('#device-tabs button')].find(b=>b.textContent==='${group}').click();const s=document.querySelector('#screen-preset');s.value='${index}';s.dispatchEvent(new Event('change'));})()`);
    await waitFor(tab,`(()=>{const fit=document.querySelector('iframe').contentWindow.__viewportAudit.fit();return Math.abs(fit?.w-${width})<3&&Math.abs(fit?.h-${height})<3})()`,`${group} layout fit`).catch(async error=>{
      throw Error(error.message+': '+JSON.stringify(await inside("({fit:w.__viewportAudit.fit(),width:w.innerWidth,height:w.innerHeight,zoom:w.frameElement.dataset.previewZoom})")));
    });
    await sleep(650);
    const state=await run("(()=>{const f=document.querySelector('iframe'),w=f.contentWindow;return {width:f.offsetWidth*Number(f.dataset.previewZoom),height:f.offsetHeight*Number(f.dataset.previewZoom),same:w===originalFrame&&w.document===originalDoc,outerZoom:devicePixelRatio,error:w.document.querySelector('#error').textContent,scroll:w.document.documentElement.scrollWidth,innerWidth:w.innerWidth}})()");
    assert.ok(Math.abs(state.width-width)<2,`${group}: width`);assert.ok(Math.abs(state.height-height)<2,`${group}: height`);
    assert.equal(state.same,true,'Size changes preserve the live document');assert.equal(state.error,'');
    const shot=await call('Page.captureScreenshot',{format:'png'},sessionId);await fs.writeFile(path.join(out,`screen-size-${group.toLowerCase()}-${index}.png`),Buffer.from(shot.data,'base64'));
    assert.ok(state.scroll<=state.innerWidth+1,`${group}: horizontal overflow ${JSON.stringify(state)}; screenshot: ${out}`);
    checked++;
  }
  await run("document.querySelector('iframe').contentWindow.document.querySelector('[aria-label=Settings]').click()");
  await sleep(200);
  assert.equal(await inside("!w.document.querySelector('#settings').hidden"),true);
  await run("document.querySelector('#rotate-screen').click()");await sleep(650);
  assert.equal(await inside("!w.document.querySelector('#settings').hidden"),true,'Rotation keeps settings open');
  await inside("(await w.__viewportAudit.openLearning(),await w.__viewportAudit.workspace().navigate('puzzles'),true)");
  assert.equal(await inside("w.__viewportAudit.workspace().ready"),true);
  await run("[...document.querySelectorAll('#device-tabs button')].find(b=>b.textContent==='Laptop').click()");await sleep(650);
  assert.equal(await run("document.querySelector('iframe').contentWindow===originalFrame"),true);
  assert.equal(await evaluate(audit,'api.storage.local.get(null).then(JSON.stringify)'),baseline,'Preview leaves real account data unchanged');
  console.log(`Passed ${checked} viewport sizes, current-game handoff, persistent iframe, settings rotation, learning navigation and isolated storage. Screenshots: ${out}`);
}
