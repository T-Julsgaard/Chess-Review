import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  const resize=async(width,height)=>{
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(150);
  };
  const section=async title=>{
    await run("document.querySelector('#settings').hidden&&document.querySelector('[aria-label=Settings]').click()");
    const {result,exceptionDetails}=await call('Runtime.evaluate',{expression:'globalThis'},review.sessionId);
    if(exceptionDetails)throw Error(JSON.stringify(exceptionDetails));
    try {
      const response=await call('Runtime.callFunctionOn',{
        objectId:result.objectId,
        functionDeclaration:function(title) {
          const head=[...this.document.querySelectorAll('.set-sect-head')].find(n=>n.querySelector('span')?.textContent===title);
          if(!head)throw Error('Settings section not found');
          if(head.getAttribute('aria-expanded')!=='true')head.click();
        }.toString(),
        arguments:[{value:title}],returnByValue:true,
      },review.sessionId);
      if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));
    } finally {await call('Runtime.releaseObject',{objectId:result.objectId},review.sessionId);}
  };
  const choose=async value=>{
    await section('Interface presets');
    await run(`document.querySelector('[data-setting="uiSetup"][data-value="${value}"]').click()`);
    await waitFor(review,`chrome.storage.local.get('settings').then(s=>s.settings.uiSetup==='${value}')`,'Saved setup');
    await waitFor(review,`import('./analysis.js').then(m=>m.S.layoutMode==='${value==='modern'?'custom':'auto'}')`,'Applied layout');
    await sleep(100);
  };
  const close=()=>run("!document.querySelector('#settings').hidden&&document.querySelector('[aria-label=Settings]').click()");
  const boxes=()=>run("Object.fromEntries([...document.querySelectorAll('.stage .mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,{x:r.x,y:r.y,w:r.width,h:r.height}]}))");
  const evidence=()=>run("import('./analysis.js').then(m=>JSON.stringify({pgn:m.S.pgn,idx:m.S.idx,evals:m.S.evals,acc:m.S.acc,classif:m.S.classif}))");
  const screenshot=async name=>{
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await resize(1920,919);
  const unchanged=await evidence();
  await choose('old');await close();
  const collapsed=await boxes();
  await screenshot('old-collapsed');
  await run("document.querySelector('.qbreak-toggle').click()");
  const expanded=await boxes(),delta=expanded.accuracy.h-collapsed.accuracy.h;
  assert.ok(delta>70);
  assert.ok(Math.abs(expanded.engine.y-collapsed.engine.y-delta)<1);
  assert.ok(expanded.learn.y>collapsed.learn.y,'Solve puzzles moves down while Engine can compact to fit the window');
  assert.deepEqual(expanded.controls,collapsed.controls);
  await screenshot('old-expanded');
  await run("document.querySelector('.qbreak-toggle').click()");assert.deepEqual(await boxes(),collapsed);
  await choose('modern');await close();
  const supplied=JSON.parse(await fs.readFile(new URL('../tests/fixtures/modern-panel-layout.json',import.meta.url)));
  const modern=await run("import('./analysis.js').then(m=>structuredClone(m.S.layout))");
  for(const [key,box]of Object.entries(supplied.displayedLayout))for(const prop of ['x','y','w','h','scale'])
    assert.ok(Math.abs(modern[key][prop]-box[prop])<1e-8,`${key}.${prop}`);
  const designs=await run("import('./analysis.js').then(m=>Object.fromEntries(Object.entries(m.S.settings).filter(([key])=>key.endsWith('Design'))))");
  assert.equal(designs.accuracyDesign,'phases-modern');assert.equal(designs.movesDesign,'zoom20');
  const {UI_SETUPS}=await import('../lib/ui-setups.js');
  for(const [key,value]of Object.entries(UI_SETUPS.modern.designs))assert.equal(designs[key],value);
  await screenshot('modern');
  const modernBoxes=await boxes();
  await run("import('./analysis.js').then(m=>{m.S.layout.moves.x+=16;m.applyLayoutMode();})");
  await section('Layout');await run("[...document.querySelectorAll('#settings button')].find(n=>n.textContent==='Reset layout').click()");await sleep(200);
  await close();assert.deepEqual(await boxes(),modernBoxes);
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"document.querySelector('.moves-panel[data-design=zoom20]')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Reopened Modern');
  assert.deepEqual(await boxes(),modernBoxes);
  const fit=[];
  for(const [width,height]of [[1366,768],[390,844],[1920,919]]) {
    await resize(width,height);
    const dimensions=await run("({page:document.documentElement.scrollWidth-innerWidth,canvas:document.querySelector('.stage').getBoundingClientRect().right,height:innerHeight})");
    assert.ok(dimensions.page<=1);assert.ok(dimensions.canvas<=width+1);
    fit.push({width,height,...dimensions});await screenshot('modern-'+width);
  }
  await section('Interface presets');await screenshot('premade-ui-settings');
  await choose('old');await close();assert.deepEqual(await boxes(),collapsed);
  assert.equal(await evidence(),unchanged);
  await fs.writeFile(path.join(out,'ui-setups.json'),JSON.stringify({passed:true,collapsed,expanded,modern,designs,fit},null,2));
  console.log('Old expansion, supplied Modern layout, setup reset, reopening and viewport fit passed. Screenshots: '+out);
}
