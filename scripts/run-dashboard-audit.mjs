import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(async m=>{m.S.settings.moveAnim=false;await m.openLearning();})");
  const capture=async name=>{
    await run("import('./analysis.js').then(m=>m.learningWorkspace.scrollToTop())");
    await run("document.querySelector('.run-dashboard').scrollIntoView({block:'nearest'})");
    await sleep(150);
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  for(const mode of ['timeAttack','knockout']) {
    await run(`import('./analysis.js').then(async m=>{const w=m.learningWorkspace;await w.navigate('puzzles');await w.persist(p=>{p.bests['${mode}']=17;});await w.startPuzzleRun('${mode}');w.run.clock?.pause();})`);
    for(const [width,height] of [[1920,1080],[1280,800],[390,844],[320,740]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(300);
      for(const theme of ['dark','light']) {
        await run(`document.documentElement.dataset.theme='${theme}'`);
        const layout=await run(`(()=>{
          const card=document.querySelector('.run-dashboard'),r=card.getBoundingClientRect();
          const metrics=[...card.children].map(n=>n.getBoundingClientRect());
          return {fits:card.scrollWidth<=card.clientWidth+1,metricsFit:metrics.every(n=>n.left>=r.left&&n.right<=r.right+1),
            separated:metrics.every((n,i)=>!i||n.left>=metrics[i-1].right-1),width:r.width};
        })()`);
        assert.ok(layout.fits&&layout.metricsFit&&layout.separated,`${mode} ${width}px ${theme}: ${JSON.stringify(layout)}`);
        await capture(`${mode}-${width}-${theme}`);
      }
    }
    await run("document.documentElement.dataset.theme='dark'");
    await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false},review.sessionId);
    await run("import('./analysis.js').then(m=>{const w=m.learningWorkspace;w.run.solved=9;w.run.lives=1;w.render();if(w.run.clock){w.run.clock.remainingMs=23000;w.updateClock();}})");
    assert.equal(await run("document.querySelector('[data-run-score]').textContent"),'9');
    assert.equal(await run("!!document.querySelector('.run-vitality, .run-target, .run-clock-ring, .run-knockout-cue')"),false);
    if(mode==='timeAttack') {
      assert.equal(await run("document.querySelector('#learn-clock').classList.contains('running-low')"),true);
      assert.equal(await run("document.querySelector('#learn-clock').textContent"),'0:23');
    }
    await capture(`${mode}-progress`);
    await run("import('./analysis.js').then(m=>{m.learningWorkspace.run.solved=18;m.learningWorkspace.render();})");
    assert.equal(await run("document.querySelector('.run-record strong').textContent"),'18');
    await capture(`${mode}-new-best`);
    await run("import('./analysis.js').then(m=>{m.learningWorkspace.run.bestEligible=false;m.learningWorkspace.render();})");
    assert.equal(await run("!!document.querySelector('.run-record')"),false);
    await capture(`${mode}-custom`);
    await run(`import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('${mode==='timeAttack'?'Time is up':'Out of lives'}'))`);
    assert.equal(await run("!!document.querySelector('.puzzle-run-results .run-dashboard')"),true);
    assert.equal(await run("!!document.querySelector('.run-record, [role=timer]')"),false);
    await capture(`${mode}-results-custom`);
    await run("import('./analysis.js').then(m=>{m.learningWorkspace.result.bestEligible=true;m.learningWorkspace.render();})");
    for(const [width,height] of [[1920,1080],[390,844],[320,740]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(150);
      assert.equal(await run("(()=>{const card=document.querySelector('.puzzle-run-results .run-dashboard');return card.scrollWidth<=card.clientWidth+1&&card.children.length===2&&!!card.querySelector('.run-record');})()"),true);
      await capture(`${mode}-results-${width}`);
    }
  }
  console.log('Run dashboard checks passed in both themes at 1920, 1280, 390 and 320 pixels. Screenshots: '+out);
}
