import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const resize = async (width,height) => {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(150);
  };
  const shot = async name => {
    const clip=await run("(()=>{const r=document.querySelector('.accuracy-panel').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()");
    const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(image.data,'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await waitFor(review,"!document.querySelector('#startup')",'Visible review');
  await run("import('./analysis.js').then(m=>{m.S.settings.accuracyDesign='phases';m.S.settings.moveAnim=false;m.S.accuracyPage=0;m.renderStats()})");
  const original = await run("import('./analysis.js').then(m=>JSON.stringify({acc:m.S.acc,evals:m.S.evals,bests:m.S.bests,stats:m.S.gameStats,classif:m.S.classif,idx:m.S.idx}))");
  const evidence=[];
  for(const [width,height] of [[1920,1080],[1920,919],[1366,768],[1280,600],[1100,480],[820,900],[390,844],[320,640]]){
    await resize(width,height);
    const geometry=await run("JSON.stringify([...document.querySelectorAll('.mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,r.x,r.y,r.width,r.height]}))");
    const result=await run("(()=>{const n=document.querySelector('.acc-page'),p=document.querySelector('.accuracy-panel');return {w:innerWidth,h:innerHeight,overflow:n.scrollWidth-n.clientWidth,body:n.clientHeight,content:n.scrollHeight,panel:p.getBoundingClientRect().height,cells:p.querySelectorAll('.phase-report-cell').length,headers:p.querySelectorAll('.panel-head,.acc-note').length,ratingLabel:p.querySelector('.acc-elo-label').innerText}})()");
    assert.ok(result.overflow<=1,JSON.stringify(result));assert.equal(result.cells,6);assert.equal(result.headers,0);
    assert.equal(result.ratingLabel,'Estimated rating');
    if(width!==1100)await shot('phase-report-'+width+'x'+height);
    if(width>=1800||width<=820)assert.ok(result.content<=result.body+1,'Overview must fit: '+JSON.stringify(result));
    if(width===1920&&height===1080)assert.ok(Math.abs(result.panel-370.69)<1,'Keep original compact size');
    await run("document.querySelector('.acc-page-next').click();document.querySelector('.acc-page-prev').click()");
    assert.equal(await run("JSON.stringify([...document.querySelectorAll('.mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,r.x,r.y,r.width,r.height]}))"),geometry);
    evidence.push(result);
  }
  assert.equal(await run("import('./analysis.js').then(m=>JSON.stringify({acc:m.S.acc,evals:m.S.evals,bests:m.S.bests,stats:m.S.gameStats,classif:m.S.classif,idx:m.S.idx}))"),original);
  await resize(1920,1080);
  // Deliberate display fixture, never stored as game analysis. It exposes all
  // five display bands in a single labeled sample image for design comparison.
  await run(`import('./analysis.js').then(m=>{
    window.phaseOriginal={players:m.S.players,stats:m.S.gameStats,acc:m.S.acc,calibrated:m.S.calibrated};
    m.S.players={w:{name:'Sample White'},b:{name:'Sample Black'}};
    m.S.acc={w:78.6,b:87.2};m.S.gameStats=structuredClone(m.S.gameStats);m.S.calibrated=structuredClone(m.S.calibrated);
    m.S.calibrated.w.rating=1760;m.S.calibrated.b.rating=1950;
    const values={opening:[96.2,87.9],middlegame:[43.8,64.5],endgame:[76.9,92.6]};
    for(const [phase,scores]of Object.entries(values))for(const [i,side]of ['w','b'].entries())Object.assign(m.S.gameStats[side].phases[phase],{accuracy:scores[i],decisions:8});
    m.renderStats();})`);
  const colors=await run("[...document.querySelectorAll('.phase-report-cell')].map(n=>({category:n.dataset.phaseCategory,color:getComputedStyle(n).color,label:n.querySelector('.phase-category-label').textContent}))");
  assert.deepEqual(colors.map(n=>n.category),['excellent','good','blunder','mistake','inacc','excellent']);
  assert.deepEqual(colors.map(n=>n.color),['rgb(129, 182, 76)','rgb(149, 183, 118)','rgb(238, 74, 47)','rgb(249, 168, 90)','rgb(247, 197, 49)','rgb(129, 182, 76)']);
  await shot('phase-report-illustrative');
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=true;m.S.positions=[...m.S.positions];m.renderStats()})");
  assert.equal(await run("!!document.querySelector('[data-revealing]')"),true);
  await waitFor(review,"!document.querySelector('[data-revealing]')",'Phase reveal complete');
  assert.equal(await run("document.querySelector('[data-phase=middlegame] .phase-report-score').textContent"),'43.8%');
  await run("import('./analysis.js').then(m=>{Object.assign(m.S,phaseOriginal);m.S.settings.moveAnim=false;m.renderStats()})");
  await fs.writeFile(path.join(out,'phase-report.json'),JSON.stringify({passed:true,evidence,illustrativeColors:colors},null,2));
  console.log('Phase report passed at eight viewport sizes: compact fit, category colors, missing scores, animation and unchanged evidence. Screenshots: '+out);
}
