import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await waitFor(review,"!document.querySelector('#startup')&&import('./analysis.js').then(m=>m.S.positions.length>4&&!m.S.analyzing)",'Completed review');
  await run("import('./analysis.js').then(async m=>{await m.applyUiSetup('modern');m.S.settings.moveAnim=false;m.renderStats()})");
  const snapshot=()=>run("import('./analysis.js').then(m=>JSON.stringify({layout:m.S.layout,idx:m.S.idx,acc:m.S.acc,stats:m.S.gameStats}))");
  const original=await snapshot(),evidence=[];
  for(const busy of [false,true]) {
    await run(`import('./analysis.js').then(m=>{m.S.analyzing=${busy};m.renderStats()})`);
    for(const [width,height]of [[1920,1080],[1920,919],[1920,880],[1920,800],[1536,704],[1366,768],[1280,600],[1280,560],[1100,480],[820,900],[390,844],[320,640]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
      await sleep(250);
      await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      const boxes=await run("JSON.stringify([...document.querySelectorAll('.mod')].map(n=>n.getBoundingClientRect().toJSON()))");
      for(const page of [0,1]) {
        await run(`import('./analysis.js').then(m=>m.setAccuracyPage(${page}))`);
        await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
        const fit=await run(`(()=>{
          const body=document.querySelector('.acc-fit-page'),content=body.querySelector('.acc-fit-content'),r=body.getBoundingClientRect();
          return {body:body.clientHeight,content:body.scrollHeight,horizontal:body.scrollWidth-body.clientWidth,
            zoom:Number(content.style.zoom),overflowY:getComputedStyle(body).overflowY,
            dials:content.querySelectorAll('.acc-dial').length,phases:content.querySelectorAll('.phase-report-row').length,
            rows:content.querySelectorAll('.qbreak-row').length,
            visible:[...content.querySelectorAll('.phase-rating,.phase-report-row,.qbreak-row')].every(n=>n.getBoundingClientRect().bottom<=r.bottom+.5),
            columns:new Set([...content.querySelectorAll('.qbreak-row')].map(n=>Math.round(n.getBoundingClientRect().left))).size,
            boxes:JSON.stringify([...document.querySelectorAll('.mod')].map(n=>n.getBoundingClientRect().toJSON()))};})()`);
        evidence.push({width,height,page,busy,...fit});
        await fs.writeFile(path.join(out,'accuracy-fit.json'),JSON.stringify(evidence,null,2));
        assert.equal(fit.content,fit.body,'No scrolling: '+JSON.stringify(evidence.at(-1)));
        assert.equal(fit.horizontal,0);assert.equal(fit.visible,true);
        if(width===1920&&height===919)assert.equal(fit.zoom,1,'Restore the original size when it fits');
        assert.ok(!['hidden','clip'].includes(fit.overflowY),'Fit the data without clipping it');
        assert.equal(fit.boxes,boxes,'Keep the surrounding panels and page dimensions unchanged');
        if(page===0){assert.equal(fit.dials,2);assert.equal(fit.phases,3);}
        else {assert.equal(fit.rows,10);assert.equal(fit.columns,1,'Keep the existing single category list');}
        const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
        await fs.writeFile(path.join(out,`accuracy-fit-${busy?'pending':'complete'}-${page}-${width}x${height}.png`),Buffer.from(shot.data,'base64'));
      }
    }
  }
  await run("import('./analysis.js').then(m=>{m.S.analyzing=false;m.renderStats()})");
  assert.equal(await snapshot(),original,'Preserve the saved layout and review');
  console.log('Accuracy and Quality fit at twelve viewport sizes, with the existing dials, phase cards, single Quality list and unchanged panel geometry. Evidence: '+out);
}
