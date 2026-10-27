import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const shot = async (name, crop = true) => {
    const clip = crop && await run("(()=>{const r=document.querySelector('.accuracy-panel').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
    const result = await call('Page.captureScreenshot', {format: 'png', ...(clip ? {clip, captureBeyondViewport: true} : {})}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(result.data, 'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await waitFor(review, "!document.querySelector('#startup')", 'Startup complete');
  const snapshot = () => run("import('./analysis.js').then(m=>JSON.stringify({acc:m.S.acc,calibrated:m.S.calibrated,evals:m.S.evals,bests:m.S.bests,idx:m.S.idx,layout:m.S.layout}))");
  const before = await snapshot();
  await run(`window.revealSamples=[];
    window.revealSample=()=>{
      const p=document.querySelector('.accuracy-panel'),r=p.getBoundingClientRect(),value=p.querySelector('.acc-val');
      const rect=value.getBoundingClientRect();
      return {time:performance.now(),running:p.dataset.revealing==='true',
        number:parseFloat((value.querySelector('.acc-reveal-ink')||value).textContent),
        name:(p.querySelector('.acc-name .acc-reveal-ink')||p.querySelector('.acc-name')).textContent,
        label:(p.querySelector('.acc-elo-label .acc-reveal-ink')||p.querySelector('.acc-elo-label')).textContent,
        phase:(p.querySelector('.acc-phase-values>span .acc-reveal-ink')||p.querySelector('.acc-phase-values>span')).textContent,
        arc:parseFloat(p.querySelector('.acc-dial-fill').getAttribute('stroke-dasharray')),
        bar:parseFloat(p.querySelector('.acc-phase-bars i').style.width),
        x:r.x,y:r.y,width:r.width,height:r.height,valueWidth:rect.width,valueX:rect.x};
    };
    window.revealLoop=()=>{const s=revealSample();revealSamples.push(s);if(s.running)requestAnimationFrame(revealLoop);};
    import('./analysis.js').then(m=>{m.S.settings.accuracyDesign='reveal';m.S.settings.moveAnim=true;
      m.S.positions=[...m.S.positions];m.S.accuracyPage=0;m.renderStats();revealLoop();});`);
  assert.equal(await run("document.querySelector('.accuracy-panel').dataset.revealing"), 'true');
  await sleep(140); await shot('overview-reveal-early');
  const nodePreserved = await run("import('./analysis.js').then(m=>{const n=document.querySelector('.accuracy-panel');m.renderStats();return n===document.querySelector('.accuracy-panel')})");
  assert.equal(nodePreserved, true);
  await sleep(200); await shot('overview-reveal-middle');
  await waitFor(review, "!document.querySelector('.accuracy-panel[data-revealing]')", 'Completed reveal');
  await sleep(50); await shot('overview-reveal-final');
  const samples = await run('revealSamples');
  assert.ok(samples.length > 8);
  assert.equal(samples[0].number, 0); assert.equal(samples[0].arc, 0); assert.equal(samples[0].bar, 0);
  const partial = samples.find(s => s.running && s.number > 0 && s.name.length > 0 && s.name.length < samples.at(-1).name.length);
  assert.ok(partial, 'Numbers and player names must reveal together');
  assert.ok(partial.name.length > 0 && partial.phase.length > 0);
  assert.ok(samples.every(s => s.label === 'Estimated rating' && s.phase === 'Opening'), 'Labels stay fully visible throughout the reveal');
  assert.equal(await run("document.querySelector('.acc-navigation [aria-selected=true]').textContent"), 'Overview');
  assert.equal(await run("!!document.querySelector('.acc-navigation .acc-reveal-slot,.acc-dial-label .acc-reveal-slot')"), false);
  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i].number >= samples[i-1].number);
    assert.ok(samples[i].arc >= samples[i-1].arc);
    for (const key of ['x','y','width','height','valueWidth','valueX']) assert.ok(Math.abs(samples[i][key]-samples[0][key]) < 1, 'Layout shifts during reveal: ' + key);
  }
  const final = await run("import('./analysis.js').then(m=>({shown:document.querySelector('.acc-val').textContent,expected:m.S.acc[m.S.meSide].toFixed(1),filter:getComputedStyle(document.querySelector('.acc-dial-fill')).filter,background:getComputedStyle(document.querySelector('.acc-scorecard')).backgroundImage,label:document.querySelector('.acc-elo-label').textContent}))");
  assert.equal(final.shown, final.expected); assert.equal(final.label, 'Estimated rating');
  assert.equal(final.filter, 'none'); assert.equal(final.background, 'none');
  assert.equal(await snapshot(), before);
  await run("document.querySelector('#accuracy-tab-1').click();document.querySelector('#accuracy-tab-0').click()");
  assert.equal(await run("!!document.querySelector('[data-revealing]')"), false, 'Changing pages must not repeat the reveal');
  await call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]}, review.sessionId);
  await run("import('./analysis.js').then(m=>{m.S.positions=[...m.S.positions];m.renderStats()})");
  assert.equal(await run("!!document.querySelector('[data-revealing]')"), false);
  await call('Emulation.setEmulatedMedia', {features: []}, review.sessionId);
  await run("import('./analysis.js').then(m=>{m.S.positions=[...m.S.positions];m.S.settings.moveAnim=false;m.renderStats()})");
  assert.equal(await run("!!document.querySelector('[data-revealing]')"), false);
  for (const [width, height] of [[1920,1080],[1366,768],[1280,600],[390,844],[320,640]]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await sleep(150);
    const fits = await run("(()=>{const n=document.querySelector('.acc-page');return n.scrollWidth<=n.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()");
    assert.ok(fits, width + 'x' + height);
    if (width === 1920 || width === 390) await shot('overview-reveal-' + width + 'x' + height);
  }
  await fs.writeFile(path.join(out, 'overview-reveal.json'), JSON.stringify({passed: true, samples, final}, null, 2));
  console.log('Overview reveal passed: synchronized counters/names/meters, static labels, stable geometry, exact final stats, once-only playback and motion preferences. Screenshots: ' + out);
}
