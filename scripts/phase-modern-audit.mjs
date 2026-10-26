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
  assert.equal(await run("import('./analysis.js').then(m=>m.S.settings.accuracyDesign)"), 'phases-modern', 'Modern defaults to the Modern report');
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
    for (const page of [1,2,0]) {
      await run("document.querySelector('#accuracy-tab-"+page+"').click()");
      const footer = await run("(()=>{const n=document.querySelector('.acc-navigation');return {overflow:n.scrollWidth-n.clientWidth,buttons:[...n.querySelectorAll('button')].map(b=>({width:b.clientWidth,overflow:b.scrollWidth-b.clientWidth})),pageOverflow:document.documentElement.scrollWidth-innerWidth}})()");
      assert.ok(footer.overflow <= 1 && footer.pageOverflow <= 1 && footer.buttons.every(b=>b.overflow<=1), JSON.stringify({width,page,footer}));
    }
    evidence.push(fit);
  }
  await resize(1920, 919);
  await shot('phase-modern-workspace', true);
  // Real pointer input targets one named destination, with no alternate pager.
  const click = async page => {
    const at = await run("(()=>{const r=document.querySelector('#accuracy-tab-"+page+"').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    for (const type of ['mousePressed','mouseReleased']) await call('Input.dispatchMouseEvent',
      {type, x: at.x, y: at.y, button: 'left', clickCount: 1}, review.sessionId);
  };
  assert.equal(await run("!!document.querySelector('.acc-page-corner,.acc-page-prev,.acc-page-next,.acc-pager-steps')"), false);
  await click(1);
  assert.equal(await run("document.activeElement.id"), 'accuracy-tab-1');
  await shot('phase-modern-quality');
  await click(2); await shot('phase-modern-advanced');
  await click(0);
  assert.equal(await snapshot(), before, 'Navigation preserves all review evidence and geometry');
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=true;m.setAccuracyPage(2)})");
  const flows = await run("(()=>{const n=document.querySelector('.acc-navigation');const a=n.getAnimations({subtree:true}).filter(a=>a.effect.target.matches('.acc-nav-current,.acc-nav-wake'));a.forEach(a=>{a.pause();a.currentTime=150});return a.length})()");
  assert.equal(flows, 2, 'A moving surface and a trailing wake');
  await shot('phase-modern-liquid-flow');
  const painted = await run("document.querySelector('.acc-nav-current').getBoundingClientRect().toJSON()");
  await run("import('./analysis.js').then(m=>m.setAccuracyPage(1))");
  const redirected = await run("(()=>{const n=document.querySelector('.acc-nav-current');n.getAnimations().forEach(a=>{a.pause();a.currentTime=0});return n.getBoundingClientRect().toJSON()})()");
  assert.ok(Math.abs(painted.x-redirected.x)<1 && Math.abs(painted.width-redirected.width)<1, 'Rapid reversal starts at the painted water surface');
  await run("document.querySelector('.acc-navigation').getAnimations({subtree:true}).forEach(a=>a.finish())");
  await waitFor(review, "!document.querySelector('.acc-turn-leaf')", 'Page dissolve cleaned up');
  await run("document.querySelector('#accuracy-tab-1').focus()");
  await call('Input.dispatchKeyEvent', {type:'keyDown',key:'ArrowRight',code:'ArrowRight'}, review.sessionId);
  assert.equal(await run('document.activeElement.id'), 'accuracy-tab-2');
  await call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]}, review.sessionId);
  await run("import('./analysis.js').then(m=>m.setAccuracyPage(0))");
  assert.equal(await run("!!document.querySelector('.acc-turn-leaf,[data-revealing]')"), false);
  assert.equal(await run("document.querySelector('.acc-navigation').getAnimations({subtree:true}).length"), 0);
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
  console.log('Modern report passed eight viewport sizes, saved settings/reload, liquid navigation, rapid reversals, keyboard focus, animation cleanup and reduced motion. Screenshots: ' + out);
}
