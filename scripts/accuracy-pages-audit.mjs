import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out, source}) {
  const run = expression => evaluate(review, expression);
  const resize = async (width, height) => {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await sleep(150);
  };
  const shot = async name => {
    const image = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(image.data, 'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  const scores=await run("import('./analysis.js').then(m=>({accuracy:m.S.acc,stats:m.S.gameStats}))");
  for(const side of ['w','b']){
    assert.ok(Number.isFinite(scores.accuracy[side]));
    assert.ok(Number.isFinite(scores.stats[side].phases.opening.accuracy));
    assert.ok(Number.isFinite(scores.stats[side].averageCpLoss));
  }
  // Preserve a before image from the exact parent revision in an isolated extension.
  const baseline = await fs.mkdtemp(path.join(path.dirname(source), 'accuracy-before-'));
  await fs.cp(source, baseline, {recursive: true});
  for (const file of ['analysis.js', 'styles.css', 'lib/full-hd-layout.css']) await fs.writeFile(path.join(baseline, file),
    execFileSync('git', ['show', 'HEAD:' + file], {maxBuffer: 4 * 1024 * 1024, windowsHide: true}));
  const loaded = await call('Extensions.loadUnpacked', {path: baseline});
  const {targetId} = await call('Target.createTarget', {url: `chrome-extension://${loaded.id}/analysis.html?screen-preview=review`});
  const {sessionId} = await call('Target.attachToTarget', {targetId, flatten: true});
  try {
    await waitFor({targetId, sessionId}, "document.body?.dataset.previewReady==='true'", 'Before review');
    await call('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false}, sessionId);
    const image = await call('Page.captureScreenshot', {format: 'png'}, sessionId);
    await fs.writeFile(path.join(out, 'accuracy-before.png'), Buffer.from(image.data, 'base64'));
  } finally { await call('Target.closeTarget', {targetId}); }
  const evidence = [];
  for (const [width, height] of [[1920,1080], [1920,919], [1366,768], [1280,600], [1100,480], [820,900], [390,844], [320,640]]) {
    await resize(width, height);
    const before = await run("JSON.stringify([...document.querySelectorAll('.mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,r.x,r.y,r.width,r.height]}))");
    for (let page = 0; page < 3; page++) {
      await run(`document.querySelector('#accuracy-tab-${page}').click()`);
      const state = await run(`(()=>{
        const p=document.querySelector('.accuracy-panel'),body=p.querySelector('.acc-page'),tabs=p.querySelector('.acc-pager');
        return {page:document.querySelector('[aria-selected=true]').getAttribute('aria-label'),
          overflow:body.scrollWidth>body.clientWidth+1, tabsOverflow:tabs.scrollWidth>tabs.clientWidth+1,
          windowOverflow:document.documentElement.scrollWidth>innerWidth+1,
          panelHeight:p.getBoundingClientRect().height,bodyHeight:body.clientHeight,contentHeight:body.scrollHeight,
          font:getComputedStyle(p.querySelector('.acc-name')).fontSize, headers:document.querySelectorAll('.accuracy-panel .panel-head,.moves-panel .panel-head').length,
          valueFont:p.querySelector('.acc-val')?getComputedStyle(p.querySelector('.acc-val')).fontSize:null,
          puzzleBottom:document.querySelector('[data-mod=learn]').getBoundingClientRect().bottom,
          layout:JSON.stringify([...document.querySelectorAll('.mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,r.x,r.y,r.width,r.height]}))};})()`);
      assert.equal(state.overflow, false, JSON.stringify({width, height, page, state}));
      assert.equal(state.tabsOverflow, false, JSON.stringify({width, height, page, state}));
      assert.equal(state.windowOverflow, false);
      if(width>=1100)assert.ok(state.puzzleBottom<=height+1,'Puzzle entry must remain visible');
      assert.equal(state.layout, before, 'Changing pages must not move panels');
      assert.equal(state.font, '14px');
      assert.equal(state.headers, 0);
      if (page === 0) assert.ok(parseFloat(state.valueFont)>=32&&parseFloat(state.valueFont)<=38);
      if (page === 1) assert.equal(await run("document.querySelectorAll('.qbreak-row').length"), 10);
      if (width >= 1280 || width === 390) await shot(`accuracy-${page}-${width}x${height}`);
      const clip=await run("(()=>{const r=document.querySelector('.accuracy-panel').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
      const panelImage=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip},review.sessionId);
      await fs.writeFile(path.join(out,`accuracy-panel-${page}-${width}x${height}.png`),Buffer.from(panelImage.data,'base64'));
      if(width===1920&&height===1080)assert.ok(Math.abs(state.panelHeight-370.69)<1,'Restore the original compact panel height');
      if (width >= 1800 && height >= 1000) assert.ok(state.contentHeight <= state.bodyHeight + 1, 'Desktop page must fit: ' + JSON.stringify(state));
      evidence.push({width, height, page, ...state, layout: undefined});
    }
  }
  await resize(1920, 1080);
  await run("document.querySelector('#accuracy-tab-0').click();document.querySelector('#accuracy-tab-0').focus()");
  await call('Input.dispatchKeyEvent', {type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight'}, review.sessionId);
  assert.equal(await run('document.activeElement.id'), 'accuracy-tab-1');
  await run("document.querySelector('.qbreak [data-category]').dispatchEvent(new MouseEvent('mouseenter'))");
  assert.equal(await run("!!document.querySelector('.q-tip.show')"), false);
  assert.equal(await run("!!document.querySelector('.accuracy-panel .practice-btn,.qbreak-toggle')"), false);
  await run("document.querySelector('#accuracy-tab-2').click()");
  const expected=scores.stats.w.largestLoss.ply;
  await run("document.querySelector('.acc-loss').click()");
  assert.equal(await run("import('./analysis.js').then(m=>m.S.idx)"),expected);
  const panels=[];
  for(let page=0;page<3;page++){
    await run(`document.querySelector('#accuracy-tab-${page}').click()`);
    panels.push(await run("document.querySelector('.accuracy-panel').outerHTML"));
  }
  // An unscaled native browser rendering of the three actual result panels.
  const origin=await run('location.origin');
  const {targetId:galleryId}=await call('Target.createTarget',{url:origin+'/audit.html'});
  const {sessionId:gallerySession}=await call('Target.attachToTarget',{targetId:galleryId,flatten:true});
  try{
    await waitFor({sessionId:gallerySession},'!!document.body','Preview gallery');
    await evaluate({sessionId:gallerySession},`document.documentElement.dataset.theme='dark';document.head.innerHTML='<link rel="stylesheet" href="${origin}/styles.css">';document.body.innerHTML=${JSON.stringify('<div class="stage" style="display:flex;gap:16px;padding:20px;align-items:flex-start">'+panels.map(panel=>'<div class="mod" style="width:310px;height:420px;flex:none"><div class="mod-inner"><div>'+panel+'</div></div></div>').join('')+'</div>')}`);
    await call('Emulation.setDeviceMetricsOverride',{width:1010,height:460,deviceScaleFactor:1,mobile:false},gallerySession);
    await sleep(300);
    assert.equal(await evaluate({sessionId:gallerySession},"getComputedStyle(document.querySelector('.acc-val')).fontSize"),'38px');
    const image=await call('Page.captureScreenshot',{format:'png'},gallerySession);
    await fs.writeFile(path.join(out,'accuracy-pages-preview.png'),Buffer.from(image.data,'base64'));
    const overview=await call('Page.captureScreenshot',{format:'png',clip:{x:20,y:20,width:310,height:420,scale:1}},gallerySession);
    await fs.writeFile(path.join(out,'accuracy-overview-preview.png'),Buffer.from(overview.data,'base64'));
  }finally{await call('Target.closeTarget',{targetId:galleryId});}
  await run("document.documentElement.dataset.theme='light';document.querySelector('#accuracy-tab-0').click()");
  await shot('accuracy-light');
  await run("document.documentElement.dataset.theme='dark'");
  await fs.writeFile(path.join(out, 'accuracy-pages.json'), JSON.stringify({scores,evidence}, null, 2));
  console.log('Accuracy pages passed at eight viewport sizes, with stable geometry, readable text and keyboard navigation. Screenshots: ' + out);
}
