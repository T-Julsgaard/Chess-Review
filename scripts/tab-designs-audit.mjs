import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const resize = async (width, height) => {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await sleep(150);
  };
  const open = async () => {
    await run("document.querySelector('#settings').hidden&&document.querySelector('[aria-label=Settings]').click()");
    await run("(()=>{const head=[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Tabs');if(head.getAttribute('aria-expanded')!=='true')head.click();})()");
  };
  const close = () => run("!document.querySelector('#settings').hidden&&document.querySelector('[aria-label=Settings]').click()");
  const choose = async (key, value, panel) => {
    await open();
    await run(`document.querySelector('[data-setting="${key}"][data-value="${value}"]').click()`);
    await waitFor(review, `document.querySelector('${panel}')?.dataset.design==='${value}'`, key + ' ' + value);
  };
  const shot = async (name, selector = null) => {
    const clip = selector && await run(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
    const result = await call('Page.captureScreenshot', {format: 'png', ...(clip ? {clip, captureBeyondViewport: true} : {})}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(result.data, 'base64'));
  };
  const numericState = () => run("import('./analysis.js').then(m=>JSON.stringify({pgn:m.S.pgn,idx:m.S.idx,evals:m.S.evals,bests:m.S.bests,accuracy:m.S.acc,classif:m.S.classif,batch:m.S.batchGen,key:m.S.analyzedSettingsKey}))");
  const boxes = () => run("JSON.stringify([...document.querySelectorAll('.mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,r.x,r.y,r.width,r.height]}))");
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  const before = await numericState(), evidence = [];
  for (const [width, height] of [[1920,1080], [1366,768], [1280,600], [390,844], [320,640]]) {
    await resize(width, height); await close();
    const geometry = await boxes();
    for (const design of ['original', 'pages', 'dials']) {
      await choose('accuracyDesign', design, '.accuracy-panel'); await close();
      const fit = await run("(()=>{const n=document.querySelector('.accuracy-panel'),b=n.querySelector('.panel-body');return {horizontal:b.scrollWidth-b.clientWidth,page:document.documentElement.scrollWidth-innerWidth,height:n.getBoundingClientRect().height}})()");
      assert.ok(fit.horizontal <= 1 && fit.page <= 1, JSON.stringify({width, height, design, fit}));
      assert.equal(await boxes(), geometry, 'Switching designs must preserve the panel arrangement');
      assert.equal(await numericState(), before, 'Design changes must not alter analysis or move selection');
      if (design === 'original') {
        await run("document.querySelector('.qbreak-toggle').click()");
        assert.equal(await run("document.querySelectorAll('.accuracy-original .qbreak-row').length"), 10);
        assert.equal(await boxes(), geometry, 'The original expander stays inside the fixed comparison panel');
        await run("document.querySelector('.qbreak-toggle').click()");
      }
      if (width === 1920) await shot('accuracy-design-' + design, '.accuracy-panel');
      evidence.push({width, height, design, ...fit});
    }
    await choose('movesDesign', 'original', '.moves-panel'); await close();
    const oldHeight = await run("document.querySelector('#movesBody').clientHeight");
    if (width === 1920) await shot('moves-design-original', '.moves-panel');
    await choose('movesDesign', 'full', '.moves-panel'); await close();
    const full = await run("(()=>{const n=document.querySelector('.moves-panel'),b=n.querySelector('#movesBody'),r=n.getBoundingClientRect(),q=b.getBoundingClientRect();return {height:b.clientHeight,gap:r.bottom-q.bottom,footer:!!n.querySelector('.moves-foot,.moves-head')}})()");
    assert.equal(full.footer, false); assert.ok(full.gap <= 1.1);
    assert.ok(full.height >= oldHeight + 40, JSON.stringify({width, height, oldHeight, full}));
    assert.equal(await boxes(), geometry); assert.equal(await numericState(), before);
    if (width === 1920) await shot('moves-design-full', '.moves-panel');
    const normal = await run("(()=>{const c=document.querySelector('.ml-move');return {font:parseFloat(getComputedStyle(c).fontSize),row:c.getBoundingClientRect().height,text:c.children[1].getBoundingClientRect().height}})()");
    await choose('movesDesign', 'zoomed', '.moves-panel'); await close();
    const zoomed = await run("(()=>{const p=document.querySelector('.moves-panel'),b=p.querySelector('#movesBody'),c=b.querySelector('.ml-move');return {font:parseFloat(getComputedStyle(c).fontSize),row:c.getBoundingClientRect().height,height:b.clientHeight,horizontal:b.scrollWidth-b.clientWidth,page:document.documentElement.scrollWidth-innerWidth,footer:!!p.querySelector('.moves-head,.moves-foot')}})()");
    assert.ok(zoomed.font > normal.font && zoomed.row > normal.row, JSON.stringify({width, height, normal, zoomed}));
    assert.equal(zoomed.height, full.height); assert.equal(zoomed.footer, false);
    assert.ok(zoomed.horizontal <= 1 && zoomed.page <= 1, JSON.stringify({width, height, zoomed}));
    assert.equal(await boxes(), geometry); assert.equal(await numericState(), before);
    await shot(`moves-design-zoomed-${width}`, '.moves-panel');
    await choose('movesDesign', 'zoom20', '.moves-panel'); await close();
    const mild = await run("(()=>{const p=document.querySelector('.moves-panel'),b=p.querySelector('#movesBody'),c=b.querySelector('.ml-move');return {row:c.getBoundingClientRect().height,text:c.children[1].getBoundingClientRect().height,height:b.clientHeight,horizontal:b.scrollWidth-b.clientWidth,page:document.documentElement.scrollWidth-innerWidth,footer:!!p.querySelector('.moves-head,.moves-foot')}})()");
    assert.ok(Math.abs(mild.row / normal.row - 1.2) < .01 && Math.abs(mild.text / normal.text - 1.2) < .01, JSON.stringify({width, height, normal, mild}));
    assert.ok(mild.row < zoomed.row && mild.horizontal <= 1 && mild.page <= 1, JSON.stringify({width, height, mild}));
    assert.equal(mild.height, full.height); assert.equal(mild.footer, false);
    assert.equal(await boxes(), geometry); assert.equal(await numericState(), before);
    await shot(`moves-design-zoom20-${width}`, '.moves-panel');
    evidence.push({width, height, oldHeight, fullHeight: full.height, normal, zoomed, mild});
  }
  await resize(1920, 1080); await open();
  await shot('visual-tabs-settings', '#settings');
  await choose('accuracyDesign', 'original', '.accuracy-panel');
  await choose('movesDesign', 'zoom20', '.moves-panel');
  await call('Page.reload', {}, review.sessionId);
  await waitFor(review, "document.querySelector('.accuracy-original')&&document.querySelector('.moves-panel[data-design=zoom20]')&&import('./analysis.js').then(m=>!m.S.analyzing)", 'Saved panel designs');
  await choose('accuracyDesign', 'dials', '.accuracy-panel');
  await close();
  await run('document.activeElement?.blur()');
  await call('Input.dispatchKeyEvent', {type: 'keyDown', key: 'End', code: 'End'}, review.sessionId);
  const bottom = await run("import('./analysis.js').then(m=>{const b=document.querySelector('#movesBody').getBoundingClientRect(),r=document.querySelector('.ml-move[data-ply=\"'+m.S.total+'\"]').getBoundingClientRect();return {idx:m.S.idx,total:m.S.total,visible:r.bottom<=b.bottom+1&&r.top>=b.top-1}})");
  assert.equal(bottom.idx, bottom.total); assert.equal(bottom.visible, true);
  await fs.writeFile(path.join(out, 'tab-designs.json'), JSON.stringify({passed: true, evidence}, null, 2));
  console.log('Saved panel variants, fixed geometry, unchanged scoring and zoomed move navigation passed at five viewport sizes. Screenshots: ' + out);
}
