import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const resize = async (width, height) => {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await sleep(150);
  };
  const shot = async name => {
    const clip = await run("(()=>{const r=document.querySelector('.accuracy-panel').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
    const image = await call('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true, clip}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(image.data, 'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await waitFor(review, "!document.querySelector('#startup')", 'Visible review');
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.S.accuracyPage=1;m.renderStats()})");
  const original = await run("import('./analysis.js').then(m=>JSON.stringify({acc:m.S.acc,evals:m.S.evals,bests:m.S.bests,stats:m.S.gameStats,classif:m.S.classif,idx:m.S.idx}))");
  const evidence = [];
  for (const [width, height] of [[1920,1080],[1920,919],[1366,768],[1280,600],[1100,480],[820,900],[390,844],[320,640]]) {
    await resize(width, height);
    const geometry = await run("JSON.stringify([...document.querySelectorAll('.mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,r.x,r.y,r.width,r.height]}))");
    const result = await run(`(()=>{
      const p=document.querySelector('.accuracy-panel'),body=p.querySelector('.acc-page');
      return {width:innerWidth,height:innerHeight,overflow:body.scrollWidth-body.clientWidth,
        windowOverflow:document.documentElement.scrollWidth-innerWidth,body:body.clientHeight,content:body.scrollHeight,
        panel:p.getBoundingClientRect().height,rows:p.querySelectorAll('.qbreak-row').length,
        segments:p.querySelectorAll('.quality-spectrum i').length,
        totals:[...p.querySelectorAll('[data-quality-total]')].map(n=>Number(n.textContent)),
        lastRowVisible:p.querySelector('.qbreak-row:last-child').getBoundingClientRect().bottom<=body.getBoundingClientRect().bottom+1};})()`);
    assert.ok(result.overflow <= 1, JSON.stringify(result));
    assert.ok(result.windowOverflow <= 1, JSON.stringify(result));
    assert.equal(result.rows, 10); assert.equal(result.segments, 20);
    assert.deepEqual(result.totals, [17, 16]);
    if (width >= 1800 || width <= 820) {
      assert.ok(result.content <= result.body + 1, 'Distribution must fit: ' + JSON.stringify(result));
      assert.equal(result.lastRowVisible, true);
    }
    if (width === 1920 && height === 1080) assert.ok(Math.abs(result.panel - 370.69) < 1);
    await shot('move-quality-' + width + 'x' + height);
    await run("document.querySelector('#accuracy-tab-1').click();document.querySelector('#accuracy-tab-0').click()");
    assert.equal(await run("JSON.stringify([...document.querySelectorAll('.mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,r.x,r.y,r.width,r.height]}))"), geometry);
    evidence.push(result);
  }
  assert.equal(await run("import('./analysis.js').then(m=>JSON.stringify({acc:m.S.acc,evals:m.S.evals,bests:m.S.bests,stats:m.S.gameStats,classif:m.S.classif,idx:m.S.idx}))"), original);
  await resize(1920, 1080);
  await run("document.documentElement.dataset.theme='light'"); await shot('move-quality-light');
  await run("document.documentElement.dataset.theme='dark'");
  // A count remains a native button and can be activated using only the keyboard.
  await call('Page.bringToFront', {}, review.sessionId);
  const jump = await run("import('./analysis.js').then(m=>{const side=m.S.meSide;const button=document.querySelector('.qbreak .ct.left:not(:disabled)');const category=button.parentElement.querySelector('[data-category]').dataset.category;button.focus();return m.S.positions.findIndex((p,i)=>p&&p.color===side&&m.S.classif[i]===category)})");
  assert.equal(await run("document.activeElement.matches('.qbreak .ct.left:not(:disabled)')"), true);
  await call('Input.dispatchKeyEvent', {type:'keyDown', key:'Enter', code:'Enter', text:'\r', unmodifiedText:'\r', windowsVirtualKeyCode:13, nativeVirtualKeyCode:13}, review.sessionId);
  await call('Input.dispatchKeyEvent', {type:'keyUp', key:'Enter', code:'Enter', windowsVirtualKeyCode:13, nativeVirtualKeyCode:13}, review.sessionId);
  await waitFor(review, `import('./analysis.js').then(m=>m.S.idx===${jump})`, 'Keyboard category jump');
  // Verify the two independent saved selections through the real settings controls.
  await run("document.querySelector('[aria-label=Settings]').click()");
  await run("[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Tabs').click()");
  for (const label of ['Accuracy overview', 'Accuracy move quality', 'Accuracy advanced']) {
    assert.equal(await run(`[...document.querySelectorAll('.set-lbl')].some(n=>n.textContent===${JSON.stringify(label)})`), true);
  }
  await run("document.querySelector('[data-setting=accuracyQualityDesign][data-value=original]').click()");
  await waitFor(review, "!document.querySelector('.quality-summary')", 'Original move quality');
  assert.equal(await run("import('./analysis.js').then(m=>m.S.settings.accuracyDesign)"), 'phases');
  await run("document.querySelector('[aria-label=Settings]').click()"); await shot('move-quality-original');
  await run("document.querySelector('[aria-label=Settings]').click();document.querySelector('[data-setting=accuracyQualityDesign][data-value=distribution]').click()");
  await waitFor(review, "!!document.querySelector('.quality-summary')", 'Distribution move quality');
  await run("document.querySelector('[aria-label=Settings]').click()");
  await call('Page.reload', {}, review.sessionId);
  await waitFor(review, "import('./analysis.js').then(m=>!m.S.analyzing&&!!document.querySelector('#accuracy-tab-1'))", 'Reload');
  await run("document.querySelector('#accuracy-tab-1').click()");
  assert.equal(await run("document.querySelector('.acc-quality').dataset.qualityDesign"), 'distribution');
  await fs.writeFile(path.join(out, 'move-quality.json'), JSON.stringify(evidence, null, 2));
  console.log('Move quality passed at eight viewport sizes, with keyboard navigation, independent saved choices and light/dark screenshots. Screenshots: ' + out);
}
