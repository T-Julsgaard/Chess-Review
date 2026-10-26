import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await run("import('./analysis.js').then(async m=>{await m.applyUiSetup('modern');m.go(0);})");
  await waitFor(review, "!!document.querySelector('.engine-minimal')", 'Modern minimal Engine');
  const initial = await run("import('./analysis.js').then(m=>JSON.stringify(m.S.layout))");
  const evidence = [];
  const measure = () => run(`(()=>{
    const panel=document.querySelector('.engine-minimal'), body=panel.querySelector('.engine-body');
    const r=body.getBoundingClientRect(), p=panel.getBoundingClientRect();
    const rows=[...panel.querySelectorAll('.engine-focus-candidate,.engine-focus-pending,.engine-empty')];
    const add=panel.querySelector('.engine-minimal-add'), a=add?.getBoundingClientRect();
    return {design:panel.dataset.design,overflow:body.scrollHeight-body.clientHeight,
      horizontal:body.scrollWidth-body.clientWidth,rows:rows.length,
      topGap:rows[0].getBoundingClientRect().top-r.top,
      addVisible:!!a&&a.top>=r.top&&a.bottom<=r.bottom,
      addGap:a?a.top-rows.at(-1).getBoundingClientRect().bottom:null,
      visible:rows.every(n=>{const b=n.getBoundingClientRect();return b.top>=r.top-.5&&b.bottom<=r.bottom+.5}),
      playVisible:(()=>{const b=panel.querySelector('.engine-focus-play').getBoundingClientRect();return b.top>=p.top&&b.bottom<=p.bottom})()};
  })()`);
  const shot = async label => {
    const clip = await run("(()=>{const r=document.querySelector('.engine-minimal').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:2}})()");
    const result = await call('Page.captureScreenshot', {format:'png', clip, captureBeyondViewport:true}, review.sessionId);
    await fs.writeFile(path.join(out,label+'.png'),Buffer.from(result.data,'base64'));
  };
  for (const [width,height] of [[1920,1080],[1920,919],[1536,864],[1366,768],[1280,720],[390,844]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(150);
    for (const count of [1,2,3,4]) {
      await run(`import('./analysis.js').then(m=>{m.S.settings.engineLines=${count};m.renderEngine([
        {score:{cp:42},pv:'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6'},
        {score:{cp:21},pv:'d2d4 d7d5 c2c4 e7e6 b1c3 g8f6'},
        {score:{cp:-12},pv:'g1f3 d7d5 d2d4 g8f6 c2c4 e7e6'},
        {score:{mate:3},pv:'c2c4 e7e5 b1c3 g8f6 g2g3 d7d5'}]);})`);
      const result = await measure();
      assert.equal(result.rows,count);
      assert.equal(result.addVisible,count<4,'Add line stays visible below the candidates until the four-line limit');
      assert.ok(result.topGap<=5&&(count===4||result.addGap<=5),JSON.stringify({width,height,count,...result}));
      assert.ok(result.overflow<=1&&result.horizontal<=1&&result.visible&&result.playVisible,JSON.stringify({width,height,count,...result}));
      assert.equal(await run("import('./analysis.js').then(m=>JSON.stringify(m.S.layout))"),initial,'Engine must retain the supplied panel geometry');
      evidence.push({width,height,count,...result});
      if(width===1920&&height===919)await shot('engine-minimal-'+count+'-lines');
    }
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1920,height:919,deviceScaleFactor:1,mobile:false},review.sessionId);
  for (const theme of ['light','dark']) {
    await run(`document.documentElement.dataset.theme='${theme}'`);
    await shot('engine-minimal-'+theme);
  }
  await run("document.querySelector('.engine-focus-candidate').focus()");
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'},review.sessionId);
  assert.equal(await run("document.activeElement.classList.contains('engine-focus-candidate')"),true,'Tab must reach the next candidate');
  await run("import('./analysis.js').then(m=>{m.S.settings.engineLines=1;m.S.bests[m.S.idx].lines=[{score:{cp:42},pv:'e2e4 e7e5'},{score:{cp:21},pv:'d2d4 d7d5'},{score:{cp:12},pv:'g1f3 d7d5'},{score:{cp:8},pv:'c2c4 e7e5'}];m.renderEngineCurrent();document.querySelector('.engine-minimal-add').focus();})");
  for(const count of [2,3,4]) {
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13},review.sessionId);
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},review.sessionId);
    await waitFor(review,`document.querySelectorAll('.engine-focus-candidate').length===${count}`,'Add one candidate');
    assert.equal(await run("chrome.storage.local.get('settings').then(s=>s.settings.engineLines)"),count);
    const fit=await measure();
    assert.ok(fit.visible&&fit.overflow<=1&&(count===4||fit.addVisible),JSON.stringify(fit));
    await shot('engine-add-line-'+count);
  }
  assert.equal(await run("!!document.querySelector('.engine-minimal-add')"),false);
  for (const state of ['pending','terminal','error','practice']) {
    await run(`import('./analysis.js').then(m=>{m.S._lastEngineLines=null;
      if('${state}'==='practice')m.renderEnginePractice();
      else {m.S.analysisMode='${state}'==='error';m.S.liveError=m.S.analysisMode?'Engine unavailable. Please try again.':null;m.renderEngine('${state}'==='terminal'?[]:null);}})`);
    const result=await measure();
    assert.ok(result.overflow<=1&&result.visible&&result.playVisible,JSON.stringify({state,...result}));
    assert.equal(await run("document.querySelector('.engine-focus-play').disabled"),true);
    evidence.push({state,...result});
  }
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.engine-minimal')",'Saved minimal Engine');
  await fs.writeFile(path.join(out,'engine-minimal.json'),JSON.stringify({passed:true,evidence},null,2));
  console.log('Minimal Engine: top-aligned rows and Add line fit Modern at six viewport sizes; keyboard additions, geometry, empty states and reload passed. Screenshots: '+out);
}
