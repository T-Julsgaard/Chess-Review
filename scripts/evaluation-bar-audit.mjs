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
  await run("document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Tabs').click()");
  await run("document.querySelector('[data-setting=barStyle][data-value=flat]').click()");
  await waitFor(review, "!!document.querySelector('.evalbar.eb-flat')", 'Flat bar');
  await shot('evaluation-settings');
  await run("document.querySelector('[aria-label=Settings]').click()");
  const evidence = [];
  for (const [width, height] of [[1920,1080], [1366,768], [390,844], [320,640]]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await sleep(180);
    for (const [name, score] of [['equal',{cp:0}], ['white',{cp:120}], ['black',{cp:-350}], ['mate',{mate:4}], ['black-mate',{mate:-12}], ['large',{cp:1800}]]) {
      await run(`import('./analysis.js').then(m=>{m.S.evals[m.S.idx]=${JSON.stringify(score)};m.go(m.S.idx)})`);
      const fit = await run("(()=>{const b=document.querySelector('.evalbar.eb-flat'),r=b.getBoundingClientRect(),s=[...b.querySelectorAll('.score')].find(n=>n.textContent),q=s.getBoundingClientRect(),css=getComputedStyle(b);return {width:r.width,height:r.height,score:s.textContent,font:getComputedStyle(s).fontFamily,fontSize:parseFloat(getComputedStyle(s).fontSize),background:css.backgroundColor,fill:getComputedStyle(b.querySelector('.white-fill')).backgroundColor,radius:css.borderRadius,border:css.borderWidth,overflow:s.scrollWidth-s.clientWidth,inside:q.top>=r.top&&q.bottom<=r.bottom,page:document.documentElement.scrollWidth-innerWidth}})()");
      assert.ok(fit.overflow <= 1 && fit.inside && fit.page <= 1, JSON.stringify({width, name, fit}));
      assert.equal(fit.background, 'rgb(61, 61, 66)');
      assert.equal(fit.fill, 'rgb(255, 255, 255)');
      assert.equal(fit.radius, '0px');
      assert.equal(fit.border, '0px');
      assert.match(fit.font, /JetBrains/);
      if (width === 1920 && name === 'white') assert.equal(fit.fontSize, 14);
      evidence.push({width, name, ...fit});
      if (width === 1920 || (width === 390 && name === 'white')) await shot(`evaluation-${width}-${name}`);
    }
    await run("import('./analysis.js').then(m=>m.toggleFlip())");
    if (width === 1920) await shot('evaluation-flipped');
    await run("import('./analysis.js').then(m=>m.toggleFlip())");
  }
  await call('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false}, review.sessionId);
  await run("document.querySelector('[aria-label=Settings]').click()");
  await run("document.querySelector('[data-setting=barStyle][data-value=gradient]').click()");
  await waitFor(review, "!!document.querySelector('.evalbar.eb-gradient')", 'Original gradient style');
  await run("document.querySelector('[data-setting=barStyle][data-value=flat]').click()");
  await waitFor(review, "!!document.querySelector('.evalbar.eb-flat')", 'Saved Flat choice');
  await call('Page.reload', {}, review.sessionId);
  await waitFor(review, "!!document.querySelector('.evalbar.eb-flat')", 'Restored Flat choice');
  await fs.writeFile(path.join(out, 'evaluation-bar.json'), JSON.stringify({passed: true, evidence}, null, 2));
  console.log('Flat bar scores, typography, flips, saved Tabs choice and four viewport sizes passed. Screenshots: ' + out);
}
