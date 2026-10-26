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
  await waitFor(review, "!document.querySelector('#startup')", 'Startup finished');
  await run("import('./analysis.js').then(async m=>{await m.applyUiSetup('modern');m.S.settings.moveAnim=false})");
  const evidence = [];
  for (const [width,height] of [[1920,919],[1920,1080],[1366,768],[1280,600],[1100,480],[820,900],[390,844],[320,640]]) {
    await resize(width,height);
    await run("import('./analysis.js').then(m=>m.setAccuracyPage(0))");
    const overviewHeader = await header();
    const before = await run("import('./analysis.js').then(m=>JSON.stringify({layout:m.S.layout,stats:m.S.gameStats,idx:m.S.idx}))");
    await run("document.querySelector('#accuracy-tab-2').click()");
    assert.deepEqual(await header(),overviewHeader,'Advanced header matches overview at '+width+'x'+height);
    const fit = await run(`(()=>{const b=document.querySelector('.acc-page'),p=document.querySelector('.accuracy-panel');
      return {width:innerWidth,height:innerHeight,body:b.clientHeight,content:b.scrollHeight,overflow:b.scrollWidth-b.clientWidth,
        pageOverflow:document.documentElement.scrollWidth-innerWidth,rows:p.querySelectorAll('.advanced-row').length,
        metrics:[...p.querySelectorAll('.advanced-row')].map(n=>({id:n.dataset.metric,height:n.offsetHeight,
          padding:getComputedStyle(n.querySelector('.advanced-value')).padding,font:getComputedStyle(n.querySelector('strong')).fontSize})),
        panel:p.getBoundingClientRect().toJSON()}})()`);
    assert.equal(fit.rows,6);
    assert.ok(fit.overflow<=1&&fit.pageOverflow<=1,JSON.stringify(fit));
    await shot('modern-advanced-'+width+'x'+height);
    if(width>=1366||width<1100)assert.ok(fit.content<=fit.body+1,'Advanced fits without scrolling: '+JSON.stringify(fit));
    assert.equal(await run("import('./analysis.js').then(m=>JSON.stringify({layout:m.S.layout,stats:m.S.gameStats,idx:m.S.idx}))"),before);
    evidence.push(fit);
  }
  await resize(1920,919);
  assert.equal(await run("!!document.querySelector('[data-metric=clock] .advanced-value[title*=seconds]')"),true,'Clock metric uses imported PGN history');
  const streak = await run("document.querySelector('[data-metric=streak] button')?.getAttribute('aria-label')");
  assert.ok(streak,'Real analysis produces a revisit link');
  await call('Page.bringToFront',{},review.sessionId);
  await call('Emulation.setFocusEmulationEnabled',{enabled:true},review.sessionId);
  await run("document.querySelector('[data-metric=streak] button').focus()");
  assert.equal(await run("document.activeElement.matches('[data-metric=streak] button')"),true);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'},review.sessionId);
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},review.sessionId);
  await waitFor(review,"import('./analysis.js').then(m=>m.S.idx>0)",'Keyboard streak link');
  await shot('modern-advanced-keyboard');
  await run("document.documentElement.dataset.theme='light'"); await shot('modern-advanced-light');
  // An explicitly illustrative fixture exercises large values and both meters.
  await run(`import('./analysis.js').then(m=>{
    window.originalAdvanced=structuredClone(m.S.gameStats);
    for(const [i,side] of ['w','b'].entries())Object.assign(m.S.gameStats[side],{
      averageCpLoss:i?103.8:18.2,topMatch:i?42.5:76.3,
      timeAhead:{percent:i?28:72,seconds:390,turns:8,totalTurns:8},
      cleanStreak:{count:i?7:14,startPly:i+1,endPly:i+5},
      comeback:{score:i?0:78,worst:.12,finish:i?0:.9,hadDeficit:true,finalResult:false}});
    m.renderStats();})`);
  await shot('modern-advanced-illustrative-light');
  await run("document.documentElement.dataset.theme='dark'"); await shot('modern-advanced-illustrative-dark');
  await run("import('./analysis.js').then(m=>{m.S.gameStats=originalAdvanced;m.renderStats()})");
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"document.querySelector('.accuracy-phase-modern')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Saved review');
  await waitFor(review,"!document.querySelector('#startup')&&!document.querySelector('[data-revealing]')",'Saved reveal');
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.setAccuracyPage(2)})");
  assert.equal(await run("!!document.querySelector('[data-metric=clock] .advanced-value[title*=seconds]')"),true);
  await fs.writeFile(path.join(out,'modern-advanced.json'),JSON.stringify(evidence,null,2));
  console.log('Modern Advanced passed eight viewports, exact overview headers, real clock/streak evidence, keyboard navigation and cached reload. Screenshots: '+out);
}
