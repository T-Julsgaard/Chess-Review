import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Modern hands Engine's unused height to Accuracy. Every line count, Engine design and
// common laptop/desktop viewport must keep the Accuracy→Engine gap and Engine's bottom
// edge fixed, never clip Engine, and animate only the changes the user makes.
export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  await run("document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await run("import('./analysis.js').then(async m=>{await m.applyUiSetup('modern');m.go(0);})");
  await waitFor(review, "!!document.querySelector('.engine-minimal')", 'Modern minimal Engine');
  const lines = `[{score:{cp:42},pv:'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6'},{score:{cp:21},pv:'d2d4 d7d5 c2c4 e7e6 b1c3 g8f6'},
    {score:{cp:-12},pv:'g1f3 d7d5 d2d4 g8f6 c2c4 e7e6'}]`;
  const render = count => run(`import('./analysis.js').then(m=>{m.S.settings.engineLines=${count};m.renderEngine(${lines});})`);
  const measure = () => run(`(()=>{
    const rect=key=>{const r=document.querySelector('[data-mod="'+key+'"]').getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,left:r.left,right:r.right};};
    const panel=document.querySelector('[data-mod="engine"] .panel'), body=panel.querySelector('.engine-body'), b=body.getBoundingClientRect();
    const items=[...panel.querySelectorAll('.engine-focus-candidate,.engine-focus-pending,.engine-line,.engine-empty,.engine-minimal-controls,.engine-focus-play,.engine-bestwalk')];
    const page=document.querySelector('[data-mod="accuracy"] .acc-fit-page');
    const sections=[...page.querySelector('.phase-overview').children].map(n=>n.getBoundingClientRect());
    return {accuracy:rect('accuracy'),engine:rect('engine'),learn:rect('learn'),
      sectionGaps:sections.slice(1).map((r,i)=>r.top-sections[i].bottom),
      overflow:body.scrollHeight-body.clientHeight,
      clipped:items.filter(n=>{const r=n.getBoundingClientRect();const p=panel.getBoundingClientRect();return r.top<p.top-.5||r.bottom>p.bottom+.5;}).length,
      accuracyOverflow:page?page.scrollHeight-page.clientHeight:0,
      spare:b.bottom-Math.max(...[...body.children].map(n=>n.getBoundingClientRect().bottom)),
      motion:document.querySelector('.stage').classList.contains('engine-fit-motion')};
  })()`);
  // Engine's slot before the fit; content taller than it scrolls exactly as it did before.
  const allotment = () => run(`Promise.all([import('./analysis.js'),import('./lib/full-hd-layout.js'),import('./lib/ui-setups.js')])
    .then(([m,l,u])=>l.fullHdReferenceLayout(u.MODERN_LAYOUT,innerWidth,innerHeight,!!m.S.qbreakExpanded,true).engine.h)`);
  const settle = () => sleep(420);
  const evidence = [];
  assert.equal(await run("import('./analysis.js').then(m=>m.S.settings.engineAutoHeight)"), false, 'Fixed height is the default');
  const fixed = [];
  for (const count of [1, 2, 3]) {
    await render(count); await settle();
    fixed.push(await measure());
  }
  for (const size of fixed) {
    assert.deepEqual(size.engine, fixed[0].engine, 'Default Engine geometry does not follow line count');
    assert.deepEqual(size.accuracy, fixed[0].accuracy, 'Default Accuracy geometry does not follow line count');
  }
  await run("import('./analysis.js').then(m=>m.setSetting('engineAutoHeight',true))");
  await render(1); await settle();
  assert.ok((await measure()).engine.height < fixed[0].engine.height, 'Opting in shrinks Engine');
  await run("import('./analysis.js').then(m=>m.setSetting('engineAutoHeight',false))");
  await settle();
  assert.deepEqual((await measure()).engine, fixed[0].engine, 'Switching off restores the original slot');
  await run("import('./analysis.js').then(m=>m.setSetting('engineAutoHeight',true))");
  for (const design of ['minimal', 'focus', 'original']) {
    await run(`import('./analysis.js').then(m=>{m.S.settings.engineDesign='${design}';m.applyLayoutMode();})`);
    for (const [width, height] of [[1920,1080],[1920,919],[2560,1440],[1600,900],[1536,864],[1440,900],[1366,768],[1280,800],[1280,720],[1100,620]]) {
      await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor:1, mobile:false}, review.sessionId);
      await sleep(120);
      const sizes = [];
      for (const count of [3, 2, 1]) {
        await render(count); await settle();
        const fit = await measure();
        await run("import('./analysis.js').then(m=>m.applyLayoutMode())");
        const again = await measure();
        const context = JSON.stringify({design, width, height, count, fit});
        assert.ok(Math.abs(again.accuracy.height-fit.accuracy.height)<.5&&Math.abs(again.engine.top-fit.engine.top)<.5, 'Fit is stable across layout passes '+context);
        const slot = await allotment();
        assert.ok(fit.overflow<=1&&fit.clipped===0||Math.abs(fit.engine.height-slot)<.5, 'Engine never clips content it shrank for '+context);
        assert.ok(fit.accuracyOverflow<=1, 'Accuracy content fits its panel '+context);
        assert.ok(Math.abs(fit.sectionGaps[0]-fit.sectionGaps[1])<.5, 'Accuracy shares spare height equally between its three sections '+context);
        assert.ok(fit.engine.bottom<=fit.learn.top-1, 'Engine stays above the puzzle entry '+context);
        sizes.push({count, ...fit});
      }
      const [three, two, one] = sizes, gap = three.engine.top-three.accuracy.bottom;
      for (const fit of sizes) {
        const context = JSON.stringify({design, width, height, gap, fit});
        assert.ok(Math.abs(fit.engine.top-fit.accuracy.bottom-gap)<.5, 'Accuracy→Engine gap never changes '+context);
        assert.ok(Math.abs(fit.engine.bottom-three.engine.bottom)<.5, 'Engine keeps its bottom edge '+context);
        assert.ok(Math.abs(fit.accuracy.top-three.accuracy.top)<.5, 'Accuracy keeps its top edge '+context);
      }
      if (design === 'minimal') {
        assert.ok(two.accuracy.height>three.accuracy.height+10&&one.accuracy.height>two.accuracy.height+10,
          'Removing lines gives Accuracy more room '+JSON.stringify({width,height,sizes}));
        assert.ok(one.spare<=6&&two.spare<=6&&three.spare<=6, 'Engine has no unused height '+JSON.stringify({width,height,sizes}));
      }
      assert.ok(one.accuracy.height>=three.accuracy.height, 'Fewer lines never shrink Accuracy');
      evidence.push({design, width, height, gap, accuracy:sizes.map(s=>+s.accuracy.height.toFixed(1)), engine:sizes.map(s=>+s.engine.height.toFixed(1))});
    }
  }
  // The user's add/remove buttons animate both edges together, then settle exactly.
  await run("import('./analysis.js').then(m=>{m.S.settings.engineDesign='minimal';m.applyLayoutMode();})");
  await call('Emulation.setDeviceMetricsOverride', {width:1366, height:768, deviceScaleFactor:1, mobile:false}, review.sessionId);
  await render(3); await settle();
  await run(`import('./analysis.js').then(m=>{m.S.bests[m.S.idx].lines=${lines};m.renderEngineCurrent();})`);
  await settle();
  const before = await measure();
  // Sample every frame from the click on, inside the page, so polling cannot miss the motion.
  const frames = await run(`new Promise(resolve=>{
    const a=document.querySelector('[data-mod="accuracy"]'),e=document.querySelector('[data-mod="engine"]'),frames=[],start=performance.now();
    document.querySelector('.engine-minimal-remove').click();
    const sample=()=>{const ar=a.getBoundingClientRect(),er=e.getBoundingClientRect();
      frames.push({t:performance.now()-start,height:ar.height,gap:er.top-ar.bottom,bottom:er.bottom,
        motion:document.querySelector('.stage').classList.contains('engine-fit-motion')});
      if(performance.now()-start<450)requestAnimationFrame(sample);else resolve(frames);};
    requestAnimationFrame(sample);})`);
  await settle();
  const after = await measure();
  const motion = JSON.stringify({before:before.accuracy.height, after:after.accuracy.height, frames});
  const between = frames.filter(f=>f.height>before.accuracy.height+.5&&f.height<after.accuracy.height-.5);
  assert.ok(frames.some(f=>f.motion), 'Removing a line starts the fit motion '+motion);
  assert.ok(between.length>=3, 'Accuracy grows gradually over several frames '+motion);
  assert.ok(frames.every((f,i)=>!i||f.height>=frames[i-1].height-.01), 'Accuracy only grows while a line is removed '+motion);
  assert.ok(frames.every(f=>Math.abs(f.gap-(before.engine.top-before.accuracy.bottom))<1&&Math.abs(f.bottom-before.engine.bottom)<1), 'Gap and Engine bottom hold every frame '+motion);
  assert.ok(!after.motion&&after.overflow<=1&&after.clipped===0, 'Motion ends cleanly '+JSON.stringify(after));
  await run("document.querySelector('.engine-minimal-add').click()");
  await waitFor(review, "document.querySelectorAll('.engine-focus-candidate').length===3", 'Add a line');
  await settle();
  const restored = await measure();
  assert.ok(Math.abs(restored.accuracy.height-before.accuracy.height)<.5&&restored.clipped===0, 'Adding the line back restores the layout');
  // Rapid toggles retarget the motion and still settle on the final count's geometry.
  for (let i = 0; i < 4; i++) { await run(`document.querySelector('${i % 2 ? '.engine-minimal-add' : '.engine-minimal-remove'}')?.click()`); await sleep(60); }
  await settle();
  const rapid = await measure();
  assert.ok(Math.abs(rapid.accuracy.height-before.accuracy.height)<.5&&rapid.clipped===0&&!rapid.motion, 'Rapid add/remove settles '+JSON.stringify(rapid));
  // Window resizes apply at once.
  await call('Emulation.setDeviceMetricsOverride', {width:1536, height:864, deviceScaleFactor:1, mobile:false}, review.sessionId);
  await sleep(30);
  assert.equal((await measure()).motion, false, 'A resize is not animated');
  // Practice hides lines behind a longer message; Engine makes room for it.
  for (const count of [1, 3]) {
    await render(count); await settle();
    await run("import('./analysis.js').then(m=>m.renderEnginePractice())"); await settle();
    const practice = await measure();
    assert.ok(practice.overflow<=1&&practice.clipped===0, 'Practice message fits '+JSON.stringify({count, practice}));
  }
  // Interface animations off: changes apply at once.
  await run("import('./analysis.js').then(m=>{m.S.settings.uiAnim=false;})");
  await render(2); await sleep(30);
  assert.equal((await measure()).motion, false, 'No motion when interface animations are off');
  await run("import('./analysis.js').then(m=>{m.S.settings.uiAnim=true;})");
  for (const count of [1, 2, 3]) {
    await call('Emulation.setDeviceMetricsOverride', {width:1366, height:768, deviceScaleFactor:1, mobile:false}, review.sessionId);
    await render(count); await settle();
    const clip = await run("(()=>{const a=document.querySelector('[data-mod=\"accuracy\"]').getBoundingClientRect(),l=document.querySelector('[data-mod=\"learn\"]').getBoundingClientRect();return {x:a.x-8,y:a.y-8,width:a.width+16,height:l.bottom-a.y+16,scale:1}})()");
    const shot = await call('Page.captureScreenshot', {format:'png', clip, captureBeyondViewport:true}, review.sessionId);
    await fs.writeFile(path.join(out, `engine-fit-${count}-lines.png`), Buffer.from(shot.data, 'base64'));
  }
  // Editing freezes the fitted boxes into a custom canvas without moving Engine or
  // Accuracy; adding lines there grows Engine upward, never over the puzzle entry.
  await call('Emulation.setDeviceMetricsOverride', {width:1366, height:768, deviceScaleFactor:1, mobile:false}, review.sessionId);
  await render(1); await settle();
  const fitted = await measure();
  await run("document.querySelector('[aria-label=Settings]').click();document.querySelector('.reorg-toggle-btn').click()");
  await sleep(150);
  const handle = await run("(()=>{const n=document.querySelector('[data-mod=moves] .mod-handle'),r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2; if(!n.contains(document.elementFromPoint(x,y)))throw Error('Move handle obscured by '+document.elementFromPoint(x,y)?.outerHTML);return {x,y}})()");
  await call('Input.dispatchMouseEvent', {type:'mousePressed', ...handle, button:'left', clickCount:1}, review.sessionId);
  await call('Input.dispatchMouseEvent', {type:'mouseMoved', x:handle.x+24, y:handle.y, button:'left', buttons:1}, review.sessionId);
  await call('Input.dispatchMouseEvent', {type:'mouseReleased', x:handle.x+24, y:handle.y, button:'left', clickCount:1}, review.sessionId);
  await waitFor(review, "chrome.storage.local.get('settings').then(s=>s.settings.uiSetup==='custom')", 'Custom edit');
  const frozen = await measure();
  for (const key of ['accuracy', 'engine', 'learn']) for (const prop of ['top', 'bottom'])
    assert.ok(Math.abs(frozen[key][prop]-fitted[key][prop])<1, `Editing keeps the fitted ${key}.${prop}`);
  for (const count of [2, 3]) {
    await render(count); await settle();
    const custom = await measure(), context = JSON.stringify({count, fitted, custom});
    assert.ok(custom.overflow<=1&&custom.clipped===0, 'Custom canvas makes room for added lines '+context);
    assert.ok(Math.abs(custom.engine.bottom-fitted.engine.bottom)<1&&custom.engine.bottom<=custom.learn.top-1, 'Engine grows upward, not over the puzzle entry '+context);
    assert.ok(Math.abs(custom.engine.top-custom.accuracy.bottom-(fitted.engine.top-fitted.accuracy.bottom))<1, 'Custom canvas keeps the gap '+context);
  }
  await fs.writeFile(path.join(out, 'engine-fit.json'), JSON.stringify({passed:true, evidence}, null, 2));
  console.log('Engine fit: Accuracy takes Engine\'s unused height for 1–3 lines in three Engine designs at ten viewports, with a fixed gap, no clipping, gradual motion for user changes and none for resizes. Screenshots: '+out);
}
