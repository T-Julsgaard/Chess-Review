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
    const clip = await run(`(()=>{const r=document.querySelector('.accuracy-panel').getBoundingClientRect();
      return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:2}})()`);
    const image = await call('Page.captureScreenshot', {format:'png', clip, captureBeyondViewport:true}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(image.data, 'base64'));
  };
  const header = () => run(`(()=>{const p=document.querySelector('.accuracy-panel'),b=p.getBoundingClientRect();
    return [...p.querySelectorAll('.acc-player,.acc-name')].map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);
      return {x:r.x-b.x,y:r.y-b.y,width:r.width,height:r.height,font:s.font,bg:s.backgroundColor,border:s.border,text:n.textContent}})})()`);
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await waitFor(review, "!document.querySelector('#startup')", 'Review ready');
  await run("import('./analysis.js').then(async m=>{await m.applyUiSetup('modern');m.S.settings.moveAnim=false;m.renderStats()})");
  const original = await run("import('./analysis.js').then(m=>JSON.stringify({acc:m.S.acc,stats:m.S.gameStats,idx:m.S.idx,counts:m.S.counts,layout:m.S.layout}))");
  const evidence = [];
  for (const design of ['original','distribution']) {
    await run(`import('./analysis.js').then(m=>{m.S.settings.accuracyQualityDesign='${design}';m.renderStats()})`);
    for (const [width,height] of [[1920,1080],[1920,919],[1366,768],[1280,600],[1100,480],[820,900],[390,844],[320,640]]) {
      await resize(width,height);
      await run("import('./analysis.js').then(m=>m.setAccuracyPage(0))");
      const overview = await header();
      const panel = await run("document.querySelector('.accuracy-panel').getBoundingClientRect().toJSON()");
      await run("import('./analysis.js').then(m=>m.setAccuracyPage(1))");
      assert.equal(await run("!!document.querySelector('.quality-summary')"),false);
      assert.deepEqual(await header(),overview,'Names match overview style and coordinates at '+width+'x'+height);
      assert.deepEqual(await run("document.querySelector('.accuracy-panel').getBoundingClientRect().toJSON()"),panel);
      const fit = await run(`(()=>{
        const p=document.querySelector('.accuracy-panel'),b=p.querySelector('.acc-page'),list=p.querySelector('.qbreak').getBoundingClientRect();
        const names=p.querySelector('.acc-players').getBoundingClientRect(),body=b.getBoundingClientRect();
        return {width:innerWidth,height:innerHeight,panel:p.getBoundingClientRect().toJSON(),body:b.clientHeight,content:b.scrollHeight,
          overflow:b.scrollWidth-b.clientWidth,windowOverflow:document.documentElement.scrollWidth-innerWidth,rows:p.querySelectorAll('.qbreak-row').length,
          topGap:list.top-names.bottom,bottomGap:body.bottom-list.bottom,
        bars:[...p.querySelectorAll('.ct')].some(n=>getComputedStyle(n,'::before').content!=='none'),
        centered:[...p.querySelectorAll('.qlabel')].every(n=>{
          const badge=n.querySelector('.qsym').getBoundingClientRect(),text=n.querySelector('.nm').getBoundingClientRect();
          const left=n.previousElementSibling.getBoundingClientRect(),right=n.nextElementSibling.getBoundingClientRect();
          return Math.abs((badge.left+text.right)/2-(left.left+left.width/2+right.left+right.width/2)/2)<1})};})()`);
      assert.equal(fit.rows,10); assert.equal(fit.centered,true);
      assert.equal(fit.bars,false);
      assert.ok(fit.overflow<=1&&fit.windowOverflow<=1,JSON.stringify(fit));
      assert.ok(fit.content<=fit.body+1,'All categories fit: '+JSON.stringify(fit));
      assert.ok(Math.abs(fit.topGap-fit.bottomGap)<8,'List is vertically balanced: '+JSON.stringify(fit));
      await shot('modern-quality-'+design+'-'+width+'x'+height);
      evidence.push({design,...fit});
    }
  }
  assert.equal(await run("import('./analysis.js').then(m=>JSON.stringify({acc:m.S.acc,stats:m.S.gameStats,idx:m.S.idx,counts:m.S.counts,layout:m.S.layout}))"),original);
  await resize(1920,919);
  // Real pointer hover enlarges only the badge, leaving the text and rows fixed.
  for (const category of ['brilliant','inacc','blunder','book']) {
    const before = await run(`(()=>{const n=document.querySelector('[data-category="${category}"]'),r=n.getBoundingClientRect();
      return {x:r.x+r.width/2,y:r.y+r.height/2,badge:n.querySelector('.qsym').getBoundingClientRect().width,
        text:n.querySelector('.nm').getBoundingClientRect().toJSON(),rows:[...document.querySelectorAll('.qbreak-row')].map(n=>n.getBoundingClientRect().top)}})()`);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:before.x,y:before.y},review.sessionId);
    await sleep(220);
    const after = await run(`(()=>{const n=document.querySelector('[data-category="${category}"]');
      return {badge:n.querySelector('.qsym').getBoundingClientRect().width,text:n.querySelector('.nm').getBoundingClientRect().toJSON(),
        rows:[...document.querySelectorAll('.qbreak-row')].map(n=>n.getBoundingClientRect().top),
        label:n.getBoundingClientRect().toJSON(),left:n.previousElementSibling.getBoundingClientRect().right,right:n.nextElementSibling.getBoundingClientRect().left}})()`);
    assert.ok(after.badge>before.badge*1.3,JSON.stringify({category,before,after}));
    assert.deepEqual(after.text,before.text,'Label text stays fixed');
    assert.deepEqual(after.rows,before.rows);
    assert.ok(after.label.left>=after.left&&after.label.right<=after.right,'Enlargement leaves counts clear');
    await shot('modern-quality-hover-'+category);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0},review.sessionId); await sleep(220);
  }
  await run("document.documentElement.dataset.theme='light'"); await shot('modern-quality-light');
  await run("document.documentElement.dataset.theme='dark'");
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
  await run("document.querySelector('[data-category=brilliant]').focus()");
  assert.equal(await run("getComputedStyle(document.querySelector('[data-category=brilliant] .qsym')).transitionDuration"),'0s');
  assert.notEqual(await run("getComputedStyle(document.querySelector('[data-category=brilliant] .qsym')).transform"),'none');
  assert.equal(await run("getComputedStyle(document.querySelector('[data-category=brilliant]')).transform"),'none');
  await shot('modern-quality-keyboard');
  // Category labels are read-only for pointer and keyboard users.
  await run("document.querySelector('[data-category=brilliant]').click()");
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},review.sessionId);
  assert.equal(await run("!!document.querySelector('.category-name-input,.category-name-reset')"),false);
  assert.equal(await run("document.querySelector('[data-category=brilliant] .nm').textContent"),'Brilliant');
  await fs.writeFile(path.join(out,'modern-quality.json'),JSON.stringify(evidence,null,2));
  console.log('Both Modern Quality designs passed eight viewports, exact overview headers, centered badge/text groups, no bars, badge-only enlargement, reduced motion and read-only categories. Screenshots: '+out);
}
