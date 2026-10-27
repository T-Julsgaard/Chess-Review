import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(async m=>{m.S.settings.moveAnim=false;await m.openLearning();})");
  assert.equal(await run("document.querySelector('[data-puzzle-matches]').textContent"),'50.000 puzzles available');
  assert.equal(await run("!!document.querySelector('legend [data-puzzle-matches]')"),true);
  const overview=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
  await fs.writeFile(path.join(out,'puzzle-count-overview.png'),Buffer.from(overview.data,'base64'));
  await run("import('./analysis.js').then(m=>{const w=m.learningWorkspace;w.puzzleRange=[600,1200];w.puzzleThemes.add('mateIn1');w.render();document.querySelector('[data-focus=timeAttack]').click();})");
  await waitFor(review,"!!document.querySelector('.puzzle-run-notice-card')",'Filtered run notice');
  for(const [width,height] of [[1920,1080],[390,844],[320,640]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(600);
    const layout=await run("(()=>{const card=document.querySelector('.puzzle-run-notice-card'),r=card.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,copy:card.textContent,titleAlign:getComputedStyle(card.querySelector('h2')).textAlign,copyAlign:getComputedStyle(card.querySelector('p')).textAlign,copyLines:card.querySelector('p').offsetHeight/parseFloat(getComputedStyle(card.querySelector('p')).lineHeight),backdrop:getComputedStyle(card.parentElement).backgroundColor,overflow:card.scrollWidth>card.clientWidth,buttons:[...card.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width,height:b.height};})};})()");
    assert.ok(layout.left>=15&&layout.right<=layout.viewportWidth-15&&layout.top>=15&&layout.bottom<=layout.viewportHeight-15,'Notice must fit the viewport: '+JSON.stringify(layout));
    assert.ok(layout.width<=401&&layout.height<220,'Keep the notice compact');
    assert.equal(layout.overflow,false);assert.ok(layout.buttons.every(b=>b.width>=42&&b.height>=42));
    assert.ok(Math.abs((layout.buttons[0].left+layout.buttons[1].right)/2-(layout.left+layout.right)/2)<1,'Center the buttons together within the dialog');
    assert.equal(layout.titleAlign,'center');assert.equal(layout.copyAlign,'center');
    assert.ok(layout.copyLines>=1&&layout.copyLines<=2,'Keep the explanation to one or two lines: '+JSON.stringify(layout));
    assert.match(layout.copy,/full rating range/);assert.doesNotMatch(layout.copy,/Elo|Puzzles solved/);
    assert.match(layout.backdrop,/0\.267/,'Use a lighter backdrop');
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,'run-notice-'+width+'.png'),Buffer.from(shot.data,'base64'));
  }
  await run("document.querySelector('[data-focus=run-notice-continue]').click()");
  await waitFor(review,"import('./analysis.js').then(m=>!!m.learningWorkspace.run&&!m.learningWorkspace.busy&&!m.learningWorkspace.startingPuzzleRun)",'Accepted run');
  assert.equal(await run("import('./analysis.js').then(m=>!('puzzleRunNoticeAccepted' in m.learningWorkspace.store.value)&&!m.learningWorkspace.run.bestEligible)"),true);
  await run("import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('Ended early'))");
  await run("document.querySelector('[data-focus=run-again]').click()");
  await waitFor(review,"import('./analysis.js').then(m=>!!m.learningWorkspace.run&&!m.learningWorkspace.busy&&!m.learningWorkspace.startingPuzzleRun)",'Play again without another notice');
  assert.equal(await run("!!document.querySelector('.puzzle-run-notice-card')"),false);
  await run("import('./analysis.js').then(async m=>{const w=m.learningWorkspace;await w.finishChallenge('Ended early');await w.navigate('puzzles');void w.startPuzzleRun('knockout');})");
  assert.equal(await run("import('./analysis.js').then(m=>!m.learningWorkspace.run&&!!document.querySelector('.puzzle-run-notice-card'))"),true);
  await run("document.querySelector('[data-focus=run-notice-cancel]').click()");
  await call('Emulation.clearDeviceMetricsOverride',{},review.sessionId);
  await run("import('./analysis.js').then(async m=>{await m.learningWorkspace.close();await m.openLearning();const w=m.learningWorkspace;w.puzzleRange=[600,1200];void w.startPuzzleRun('timeAttack');})");
  assert.equal(await run("import('./analysis.js').then(m=>!m.learningWorkspace.run&&!!document.querySelector('.puzzle-run-notice-card'))"),true);
  console.log('Run notice browser checks passed at 1920, 390 and 320 pixels, including per-entry warnings, Play again and reopening. Screenshots: '+out);
}
