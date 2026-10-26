import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const resize = async (width, height) => {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await sleep(180);
  };
  const shot = async name => {
    const clip = await run("(()=>{const r=document.querySelector('.accuracy-panel').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:2}})()");
    const image = await call('Page.captureScreenshot', {format:'png',clip,captureBeyondViewport:true}, review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(image.data,'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await waitFor(review,"!document.querySelector('#startup')",'Startup finished');
  await run("import('./analysis.js').then(async m=>{await m.applyUiSetup('modern');m.S.settings.moveAnim=false})");
  await resize(1920,919);
  await run(`document.querySelector('[aria-label="Settings"]').click();
    [...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Tabs').click();
    document.querySelector('[data-setting="accuracyDesign"][data-value="phases-modern-v2"]').click()`);
  await waitFor(review,"chrome.storage.local.get('settings').then(r=>r.settings.accuracyDesign==='phases-modern-v2')",'Saved Modern v2');
  await run("document.querySelector('[aria-label=Settings]').click()");
  const evidence = [];
  for (const [width,height] of [[1920,1080],[1920,919],[1366,768],[1280,600],[1100,480],[820,900],[390,844],[320,640]]) {
    await resize(width,height);
    const fit = await run(`(()=>{const p=document.querySelector('.accuracy-panel'),b=p.querySelector('.acc-page');
      return {width:innerWidth,height:innerHeight,body:b.clientHeight,content:b.scrollHeight,overflow:b.scrollWidth-b.clientWidth,
        pageOverflow:document.documentElement.scrollWidth-innerWidth,arcs:p.querySelectorAll('.acc-dial-fill').length}})()`);
    assert.equal(fit.arcs,2);
    assert.ok(fit.overflow<=1 && fit.pageOverflow<=1 && fit.content<=fit.body+1,JSON.stringify(fit));
    evidence.push(fit);
    await shot('phase-modern-v2-'+width+'x'+height);
    for (const page of [1,2,0]) {
      await run("import('./analysis.js').then(m=>m.setAccuracyPage("+page+"))");
      assert.equal(await run("document.querySelector('.accuracy-panel').dataset.design"),'phases-modern-v2');
    }
  }
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"document.querySelector('.accuracy-phase-modern-v2')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Restored Modern v2');
  await waitFor(review,"!document.querySelector('#startup')&&!document.querySelector('[data-revealing]')",'Reload finished');
  await resize(1920,919);
  await run(`import('./analysis.js').then(m=>{
    m.S.settings.moveAnim=false;m.S.acc={w:72.4,b:71.0};
    m.S.calibrated=structuredClone(m.S.calibrated);m.S.calibrated.w.rating=1750;m.S.calibrated.b.rating=1650;
    m.renderStats();})`);
  for (const theme of ['dark','light']) {
    await run("document.documentElement.dataset.theme='"+theme+"'");
    await shot('phase-modern-v2-'+theme);
  }
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
  assert.equal(await run("document.querySelector('.phase-overview').getAnimations({subtree:true}).length"),0);
  await fs.writeFile(path.join(out,'phase-modern-v2.json'),JSON.stringify({passed:true,evidence},null,2));
  console.log('Modern v2 passed eight viewports, saved settings/reload, page navigation, dark/light themes and reduced motion. Screenshots: '+out);
}
