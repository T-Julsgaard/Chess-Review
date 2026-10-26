import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const shot = async name => {
    const result = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(result.data, 'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.go(2)})");
  await waitFor(review, "!!document.querySelector('.eval-balance')", 'Balance bar');
  const evidence = [];
  for (const [width, height] of [[1920,1080], [1366,768], [390,844], [320,640]]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await sleep(180);
    for (const [name, score] of [['equal',{cp:0}], ['white',{cp:180}], ['black',{cp:-350}], ['mate',{mate:4}], ['large',{cp:1800}]]) {
      await run(`import('./analysis.js').then(m=>{m.S.evals[m.S.idx]=${JSON.stringify(score)};m.go(m.S.idx)})`);
      const fit = await run("(()=>{const b=document.querySelector('.eval-balance'),r=b.getBoundingClientRect(),s=b.querySelector('.eval-balance-score'),q=s.getBoundingClientRect();return {width:r.width,height:r.height,score:s.textContent,overflow:s.scrollWidth-s.clientWidth,inside:q.top>=r.top&&q.bottom<=r.bottom,page:document.documentElement.scrollWidth-innerWidth,label:b.getAttribute('aria-label')}})()");
      assert.ok(fit.overflow <= 1 && fit.inside && fit.page <= 1, JSON.stringify({width, name, fit}));
      evidence.push({width, name, ...fit});
      if (width === 1920 || (width === 390 && name === 'white')) await shot(`evaluation-${width}-${name}`);
    }
    await run("import('./analysis.js').then(m=>m.toggleFlip())");
    if (width === 1920) await shot('evaluation-flipped');
    await run("import('./analysis.js').then(m=>m.toggleFlip())");
  }
  await call('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false}, review.sessionId);
  await run("document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Tabs').click()");
  await run("document.querySelector('[data-setting=evalbarDesign][data-value=original]').click()");
  await waitFor(review, "document.querySelector('.evalbar')?.dataset.design==='original'", 'Original bar');
  await run("document.querySelector('[data-setting=evalbarDesign][data-value=balance]').click()");
  await waitFor(review, "!!document.querySelector('.eval-balance')", 'Saved Balance choice');
  await shot('evaluation-settings');
  await call('Page.reload', {}, review.sessionId);
  await waitFor(review, "!!document.querySelector('.eval-balance')", 'Restored Balance choice');
  await fs.writeFile(path.join(out, 'evaluation-bar.json'), JSON.stringify({passed: true, evidence}, null, 2));
  console.log('Balance bar scores, flips, saved Tabs choice and four viewport sizes passed. Screenshots: ' + out);
}
