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
    const image = await call('Page.captureScreenshot', {format:'png', clip, captureBeyondViewport:true}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(image.data, 'base64'));
  };
  const header = () => run("(()=>{const p=document.querySelector('.accuracy-panel'),b=p.getBoundingClientRect();return [...p.querySelectorAll('.acc-player,.acc-name')].map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:r.x-b.x,y:r.y-b.y,width:r.width,height:r.height,font:s.font,bg:s.backgroundColor,border:s.border,text:n.textContent}})})()");
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
    const fit = await run("(()=>{const b=document.querySelector('.acc-page'),p=document.querySelector('.accuracy-panel');return {width:innerWidth,height:innerHeight,body:b.clientHeight,content:b.scrollHeight,overflow:b.scrollWidth-b.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,rows:p.querySelectorAll('.advanced-row').length,infos:p.querySelectorAll('.advanced-info').length,hover:p.querySelectorAll('[title]').length,meters:p.querySelectorAll('.advanced-meter').length,font:getComputedStyle(p.querySelector('.acc-stat-value')).fontSize,panel:p.getBoundingClientRect().toJSON()}})()");
    assert.equal(fit.rows,13); assert.equal(fit.infos,13); assert.equal(fit.hover,0); assert.equal(fit.meters,0);
    assert.ok(fit.overflow<=1&&fit.pageOverflow<=1,JSON.stringify(fit));
    assert.ok(fit.content>fit.body+500,'Advanced is generously spaced and scrollable');
    assert.equal(fit.font,'29px');
    const alignment = await run("(()=>{const rows=[...document.querySelectorAll('.advanced-row')];return {rows:rows.map(row=>{const r=row.getBoundingClientRect(),i=row.querySelector('.advanced-info').getBoundingClientRect(),label=row.querySelector('.advanced-label').getBoundingClientRect(),text=row.querySelector('.advanced-label>span').getBoundingClientRect();return {inset:r.right-i.right,top:i.top-label.top,titleOffset:(text.left+text.right-r.left-r.right)/2}}),headings:[...document.querySelectorAll('.advanced-group-label')].map(n=>getComputedStyle(n).textAlign)}})()");
    assert.ok(alignment.rows.every(r=>Math.abs(r.inset-alignment.rows[0].inset)<.1&&Math.abs(r.top)<.1&&Math.abs(r.titleOffset)<.1),'Info icons share a fixed top-right position and titles stay centered: '+JSON.stringify(alignment));
    assert.ok(alignment.headings.every(value=>value==='center'));

    await shot('modern-advanced-'+width+'x'+height);
    await run("document.querySelector('.acc-page').scrollTop=10000"); await sleep(100);
    assert.deepEqual(await header(),overviewHeader,'Player names stay anchored while scrolling');
    assert.equal(await run("(()=>{const row=document.querySelector('[data-metric=think-longest]').getBoundingClientRect(),body=document.querySelector('.acc-page').getBoundingClientRect();return row.bottom<=body.bottom+1&&row.top>=body.top})()"),true,'Last metric is reachable');
    await shot('modern-advanced-bottom-'+width+'x'+height);
    assert.equal(await run("import('./analysis.js').then(m=>JSON.stringify({layout:m.S.layout,stats:m.S.gameStats,idx:m.S.idx}))"),before);
    evidence.push(fit);
  }
  await resize(1920,919);
  assert.equal(await run("document.querySelector('[data-metric=clock] .advanced-detail')===null"),true);
  await call('Page.bringToFront',{},review.sessionId);
  await call('Emulation.setFocusEmulationEnabled',{enabled:true},review.sessionId);
  // Native keyboard activation opens a plain-language explanation.
  await run("document.querySelector('[data-metric=clock] .advanced-info').scrollIntoView({block:'center'});document.querySelector('[data-metric=clock] .advanced-info').focus()");
  const key = async (key,code=key) => {
    await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:key==='Enter'?13:27,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})},review.sessionId);
    await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:key==='Enter'?13:27},review.sessionId);
  };
  await key('Enter');
  assert.equal(await run("document.querySelector('#advanced-info-clock').hidden"),false);
  await shot('modern-advanced-clock-explanation');
  await key('Escape');
  assert.equal(await run("document.querySelector('#advanced-info-clock').hidden"),true);
  // Every row has its own explanation; never more than one is open.
  for(const metric of await run("[...document.querySelectorAll('.advanced-row')].map(n=>n.dataset.metric)")) {
    await run("document.querySelector('[data-metric="+metric+"] .advanced-info').click()");
    assert.equal(await run("document.querySelectorAll('.advanced-explainer:not([hidden])').length"),1);
  }
  await run("document.querySelector('.advanced-info[aria-expanded=true]').click()");
  await run("document.querySelector('[data-metric=streak] button.advanced-value').scrollIntoView({block:'center'});document.querySelector('[data-metric=streak] button.advanced-value').focus()");
  await key('Enter');
  await waitFor(review,"import('./analysis.js').then(m=>m.S.idx>0)",'Keyboard streak link');
  // Real wheel input scrolls only the page body; the navigation and names stay put.
  await run("document.querySelector('.acc-page').scrollTop=0"); await sleep(100);
  const initial = await header();
  const point = await run("(()=>{const r=document.querySelector('.acc-page').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*.7}})()");
  await call('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:0,deltaY:380},review.sessionId); await sleep(250);
  assert.ok(await run("document.querySelector('.acc-page').scrollTop>100"));
  assert.deepEqual(await header(),initial);
  await shot('modern-advanced-scrolled');
  await run("document.documentElement.dataset.theme='light';document.querySelector('.acc-page').scrollTop=0"); await shot('modern-advanced-light');
  await run("document.querySelector('[data-metric=loss] .advanced-info').click()"); await shot('modern-advanced-explanation-light');
  await run("document.documentElement.dataset.theme='dark'");
  // Both Modern overview variants share this Advanced report.
  await run("import('./analysis.js').then(m=>{m.S.settings.accuracyDesign='phases-modern-v2';m.renderStats()})");
  assert.equal(await run("document.querySelectorAll('.advanced-row').length"),13);
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"document.querySelector('.accuracy-phase-modern')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Saved review');
  await waitFor(review,"!document.querySelector('#startup')&&!document.querySelector('[data-revealing]')",'Saved reveal');
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.setAccuracyPage(2)})");
  assert.equal(await run("document.querySelector('[data-metric=clock] .advanced-detail')===null"),true);
  assert.equal(await run("document.querySelectorAll('.advanced-explainer:not([hidden])').length"),0);
  await fs.writeFile(path.join(out,'modern-advanced.json'),JSON.stringify(evidence,null,2));
  console.log('Modern Advanced passed eight viewports, anchored names, thirteen scrollable stats, click-only explanations, real wheel/keyboard input and cached reload. Screenshots: '+out);
}
