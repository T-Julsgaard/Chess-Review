import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  await call('Page.bringToFront', {}, review.sessionId);
  await call('Emulation.setDeviceMetricsOverride', {width: 1920, height: 919, deviceScaleFactor: 1, mobile: false}, review.sessionId);
  await waitFor(review, "!document.querySelector('#startup')", 'Startup finished');
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await run("import('./analysis.js').then(async m=>{await m.applyUiSetup('modern');m.S.settings.moveAnim=true;m.renderStats();})");
  await waitFor(review, "!document.querySelector('[data-revealing]')", 'Initial reveal finished');
  const evidence = [];
  for (const page of [1, 2, 0, 2, 1, 0]) {
    const result = await run(`import('./analysis.js').then(m=>{
      const names=()=>[...document.querySelectorAll('.acc-page:not(.acc-turn-leaf) .acc-name')].map(n=>{
        const r=n.getBoundingClientRect();return {text:n.textContent,x:r.x,y:r.y,w:r.width,h:r.height};});
      const before=names();m.setAccuracyPage(${page});
      const panel=document.querySelector('.accuracy-panel');
      const animations=panel.getAnimations({subtree:true});
      animations.forEach(a=>{a.pause();a.currentTime=100;});
      const after=names(),leaf=panel.querySelector('.acc-turn-leaf');
      return {page:${page},before,after,animations:animations.length,
        hidden:getComputedStyle(leaf.querySelector('.acc-players')).visibility,
        background:getComputedStyle(leaf).backgroundColor};
    })`);
    assert.deepEqual(result.after, result.before, 'Names keep the same painted position during a page turn');
    assert.ok(result.animations >= 4, 'Keep the liquid navigation and page transition');
    assert.equal(result.hidden, 'hidden');
    assert.equal(result.background, 'rgba(0, 0, 0, 0)');
    evidence.push(result);
    await run("document.querySelector('.accuracy-panel').getAnimations({subtree:true}).forEach(a=>a.finish())");
    await waitFor(review, "!document.querySelector('.acc-turn-leaf')", 'Outgoing page removed');
  }
  // Controlled arrivals exercise the real browser's frame clock and painted text.
  const first = await run(`import('./analysis.js').then(m=>{
    m.S.restoredAnalysis=false;m.S.progressiveAccuracy=true;m.S.analyzing=true;m.S.batchGen++;
    m.S.gameStats=structuredClone(m.S.gameStats);
    for(const side of ['w','b'])for(const phase of ['opening','middlegame','endgame'])
      Object.assign(m.S.gameStats[side].phases[phase],{complete:false,accuracy:90});
    m.setAccuracyPage(0);
    window.motionLoader=document.querySelector('.acc-val');
    for(const side of ['w','b'])m.S.gameStats[side].phases.opening.complete=true;
    m.renderStats();window.motionOpening=document.querySelector('[data-phase=opening]');
    return motionOpening.querySelector('.acc-reveal-ink').textContent;
  })`);
  assert.equal(first, '0.0');
  await sleep(250);
  const middle = await run(`import('./analysis.js').then(m=>{
    const value=Number(motionOpening.querySelector('.acc-reveal-ink').textContent);
    for(const side of ['w','b'])m.S.gameStats[side].phases.middlegame.complete=true;
    m.renderStats();return {value,same:document.querySelector('[data-phase=opening]')===motionOpening,
      loader:document.querySelector('.acc-val')===motionLoader,
      next:document.querySelector('[data-phase=middlegame] .acc-reveal-ink').textContent};
  })`);
  assert.ok(middle.value > 0 && middle.value < 90);
  assert.equal(middle.same, true); assert.equal(middle.loader, true); assert.equal(middle.next, '0.0');
  await run(`import('./analysis.js').then(m=>{
    for(const side of ['w','b'])m.S.gameStats[side].phases.endgame.complete=true;
    m.renderStats();m.S.analyzing=false;m.renderStats();
  })`);
  await waitFor(review, "!document.querySelector('[data-revealing]')", 'Phase and totals reveals finished');
  assert.equal(await run("document.querySelector('[data-phase=opening] strong').textContent"), '90.0');
  await run("import('./analysis.js').then(m=>m.go(2))");
  const colors = [];
  for (const theme of ['dark', 'light']) {
    const result = await run(`(()=>{
      document.documentElement.dataset.theme='${theme}';
      const panel=document.querySelector('.evaluation-panel'),line=panel.querySelector('.eval-position');
      return {theme:'${theme}',design:panel.dataset.design,stroke:getComputedStyle(line).stroke,
        ink:getComputedStyle(panel).getPropertyValue('--ink').trim()};
    })()`);
    assert.equal(result.design, 'bars');
    assert.equal(result.stroke, await run("(()=>{const n=document.createElement('span');n.style.color='var(--ink)';document.body.append(n);const c=getComputedStyle(n).color;n.remove();return c;})()"));
    colors.push(result);
    const clip = await run("(()=>{const r=document.querySelector('.evaluation-panel').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:3};})()");
    const shot = await call('Page.captureScreenshot', {format: 'png', clip, captureBeyondViewport: true}, review.sessionId);
    await fs.writeFile(path.join(out, 'move-bars-' + theme + '.png'), Buffer.from(shot.data, 'base64'));
  }
  await fs.writeFile(path.join(out, 'accuracy-motion.json'), JSON.stringify({evidence, middle, colors}, null, 2));
  console.log('Static player names, animated phase arrivals, retained loaders and themed Move bars passed. Screenshots: ' + out);
}
