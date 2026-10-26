import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const resize = async (width, height) => {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await sleep(180);
    await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  };
  const shot = async (name, full = false) => {
    const clip = !full && await run("(()=>{const r=document.querySelector('.accuracy-panel').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:2}})()");
    const image = await call('Page.captureScreenshot', {format: 'png', ...(clip ? {clip, captureBeyondViewport: true} : {})}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(image.data, 'base64'));
  };
  const snapshot = () => run("import('./analysis.js').then(m=>JSON.stringify({acc:m.S.acc,stats:m.S.gameStats,idx:m.S.idx,evals:m.S.evals,layout:m.S.layout}))");
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await waitFor(review, "!document.querySelector('#startup')", 'Startup finished');
  await resize(1920, 919);
  await run("import('./analysis.js').then(async m=>{await m.applyUiSetup('modern');m.S.settings.moveAnim=false})");
  await run(`document.querySelector('[aria-label="Settings"]').click();
    [...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Tabs').click();
    document.querySelector('[data-setting="accuracyDesign"][data-value="phases-modern"]').click()`);
  await waitFor(review, "chrome.storage.local.get('settings').then(r=>r.settings.accuracyDesign==='phases-modern')", 'Saved Modern report');
  await shot('phase-modern-settings', true);
  await run("document.querySelector('[aria-label=Settings]').click()");
  const before = await snapshot(), evidence = [];
  for (const [width, height] of [[1920,1080],[1920,919],[1366,768],[1280,600],[1100,480],[820,900],[390,844],[320,640]]) {
    await resize(width, height);
    const fit = await run(`(()=>{const p=document.querySelector('.accuracy-panel'),b=p.querySelector('.acc-page');
      return {width:innerWidth,height:innerHeight,body:b.clientHeight,content:b.scrollHeight,overflow:b.scrollWidth-b.clientWidth,
        pageOverflow:document.documentElement.scrollWidth-innerWidth,arcs:p.querySelectorAll('.acc-dial-fill').length,
        percent:p.querySelector('.acc-page').innerText.includes('%'),panel:p.getBoundingClientRect().toJSON()}})()`);
    assert.equal(fit.arcs, 2); assert.equal(fit.percent, false);
    assert.ok(fit.overflow <= 1 && fit.pageOverflow <= 1, JSON.stringify(fit));
    assert.ok(fit.content <= fit.body + 1, 'Modern overview fits without scrolling: ' + JSON.stringify(fit));
    await shot('phase-modern-' + width + 'x' + height);
    evidence.push(fit);
  }
  await resize(1920, 919);
  await shot('phase-modern-workspace', true);
  // Drive actual captured mouse input, including cancellation and a full turn.
  const corner = () => run("(()=>{const r=document.querySelector('.acc-page-corner').getBoundingClientRect();return {x:r.right-8,y:r.bottom-8}})()");
  const mouse = (type, x, y, buttons = 0) => call('Input.dispatchMouseEvent', {type, x, y, button: 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : 1}, review.sessionId);
  let at = await corner();
  await mouse('mousePressed', at.x, at.y, 1); await mouse('mouseMoved', at.x - 20, at.y - 10, 1); await mouse('mouseReleased', at.x - 20, at.y - 10);
  assert.equal(await run("import('./analysis.js').then(m=>m.S.accuracyPage)"), 0, 'Short drag cancels');
  at = await corner();
  await mouse('mousePressed', at.x, at.y, 1); await mouse('mouseMoved', at.x - 90, at.y - 70, 1);
  assert.ok(await run("parseFloat(getComputedStyle(document.querySelector('.accuracy-panel'),'::after').width)>100"), 'The fold follows the captured drag');
  await shot('phase-modern-corner-drag');
  await mouse('mouseReleased', at.x - 90, at.y - 70);
  assert.equal(await run("import('./analysis.js').then(m=>m.S.accuracyPage)"), 1, 'Drag turns once');
  assert.equal(await run("document.activeElement.classList.contains('acc-page-corner')"), true);
  await shot('phase-modern-quality');
  await run("document.querySelector('.acc-page-corner').click()"); await shot('phase-modern-advanced');
  await run("document.querySelector('.acc-page-corner').click()");
  assert.equal(await run("import('./analysis.js').then(m=>m.S.accuracyPage)"), 0);
  assert.equal(await snapshot(), before, 'Navigation preserves all review evidence and geometry');
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=true;m.setAccuracyPage(1)})");
  assert.equal(await run("!!document.querySelector('.acc-turn-leaf')"), true);
  await waitFor(review, "!document.querySelector('.acc-turn-leaf')", 'Sheet turn cleaned up');
  await call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]}, review.sessionId);
  await run("import('./analysis.js').then(m=>m.setAccuracyPage(0))");
  assert.equal(await run("!!document.querySelector('.acc-turn-leaf,[data-revealing]')"), false);
  await call('Emulation.setEmulatedMedia', {features: []}, review.sessionId);
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=false})");
  await call('Page.reload', {}, review.sessionId);
  await waitFor(review, "document.querySelector('.accuracy-phase-modern')&&import('./analysis.js').then(m=>!m.S.analyzing)", 'Saved report after reload');
  await waitFor(review, "!document.querySelector('#startup')&&!document.querySelector('[data-revealing]')", 'Reload reveal completed');
  await run(`import('./analysis.js').then(m=>{
    m.S.settings.moveAnim=false;
    window.originalPhaseStats=structuredClone(m.S.gameStats);window.originalPhaseAcc={...m.S.acc};window.originalPhaseCalibration=structuredClone(m.S.calibrated);
    m.S.calibrated=structuredClone(m.S.calibrated);m.S.calibrated.w.rating=1760;m.S.calibrated.b.rating=1950;
    m.S.acc={w:87.6,b:82.4};
    const values={opening:[96.2,87.9],middlegame:[43.8,64.5],endgame:[76.9,92.6]};
    for(const [phase,scores]of Object.entries(values))for(const [i,side]of ['w','b'].entries())Object.assign(m.S.gameStats[side].phases[phase],{accuracy:scores[i],decisions:8});
    m.renderStats();})`);
  await shot('phase-modern-illustrative');
  await run("document.documentElement.dataset.theme='light'"); await shot('phase-modern-illustrative-light');
  await run("import('./analysis.js').then(m=>{m.S.gameStats=originalPhaseStats;m.S.acc=originalPhaseAcc;m.S.calibrated=originalPhaseCalibration;m.renderStats()})");
  await fs.writeFile(path.join(out, 'phase-modern.json'), JSON.stringify({passed: true, evidence}, null, 2));
  console.log('Modern report passed eight viewport sizes, saved settings/reload, real corner dragging, animation cleanup and reduced motion. Screenshots: ' + out);
}
