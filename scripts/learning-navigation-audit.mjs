import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  const resize=async width=>{await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(150);};
  const screenshot=async name=>{const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));};
  const checkTopbar=async()=>{
    const bounds=await run("(()=>{const b=document.querySelector('#learningToggle'),r=b.getBoundingClientRect(),bar=document.querySelector('.topbar').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,barBottom:bar.bottom,width:innerWidth,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b,overflow:b.scrollWidth>b.clientWidth+1,barScroll:document.querySelector('.topbar').scrollWidth};})()");
    assert.ok(bounds.left>=0&&bounds.right<=bounds.width&&bounds.top>=0&&bounds.bottom<=bounds.barBottom,JSON.stringify(bounds));
    assert.ok(bounds.hit,'Navigation button must be clickable');assert.equal(bounds.overflow,false);
    assert.ok(bounds.barScroll<=bounds.width+1,'Top bar must fit the viewport: '+JSON.stringify(bounds));
  };
  await run("import('./analysis.js').then(m=>{m.go(2);m.toggleFlip();})");
  const before=await run("import('./analysis.js').then(m=>({idx:m.S.idx,flipped:m.S.flipped,pgn:m.S.pgn}))");
  assert.equal(await run("document.querySelector('.learn-entry-button').textContent"),'Solve Puzzles');
  assert.equal(await run("document.querySelector('#learningToggle').textContent"),'Learn with Chess review');
  for(const width of [1920,1366,1100,960,761,760,520,390,320]){await resize(width);await checkTopbar();}
  await resize(1920);
  await run("document.querySelector('#learningToggle').click()");
  await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Learning');
  for(const page of ['puzzles','openings','concepts','statistics']){
    await run(`import('./analysis.js').then(m=>m.learningWorkspace.navigate('${page}'))`);
    assert.equal(await run("document.querySelector('.learn-footer, [data-focus=review]')"),null);
    assert.equal(await run("document.querySelector('#learningToggle').textContent"),'Return to Game review');
    assert.equal(await run("(()=>{const m=document.querySelector('.learn-main').getBoundingClientRect(),s=document.querySelector('.learn-shell').getBoundingClientRect();return Math.abs(m.bottom-s.bottom)<1;})()"),true,'Content must fill the panel through the bottom');
  }
  await screenshot('learning-navigation-desktop');
  for(const width of [1366,960,760,520,390,320]){await resize(width);await checkTopbar();}
  await screenshot('learning-navigation-mobile');
  await run("document.querySelector('#learningToggle').click()");
  await waitFor(review,"import('./analysis.js').then(m=>!m.learningWorkspace)",'Return to game');
  assert.deepEqual(await run("import('./analysis.js').then(m=>({idx:m.S.idx,flipped:m.S.flipped,pgn:m.S.pgn}))"),before);
  assert.equal(await run("document.querySelector('#learningToggle').textContent"),'Learn with Chess review');
  await resize(1920);
  await run("document.querySelector('.learn-entry-button').click()");
  await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Solve Puzzles entry');
  assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.page)"),'puzzles');
  await run("document.querySelector('#learningToggle').click()");
  await waitFor(review,"import('./analysis.js').then(m=>!m.learningWorkspace)",'Return from Solve Puzzles');

  await call('Page.navigate',{url:await run("location.origin+'/analysis.html?workspace=blank'")},review.sessionId);
  await waitFor(review,"!!document.querySelector('.workspace-home')",'Blank workspace');
  await run("document.querySelector('#learningToggle').click()");
  await waitFor(review,"!!document.querySelector('.learn-theme-list')",'Learning without a game');
  for(const width of [1280,390,320]){await resize(width);await checkTopbar();}
  assert.equal(await run("document.querySelector('.learn-footer, [data-focus=review]')"),null);
  await screenshot('learning-navigation-blank');
  await run("document.querySelector('#learningToggle').focus()");
  assert.equal(await run("document.activeElement.id"),'learningToggle');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'},review.sessionId);
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},review.sessionId);
  await waitFor(review,"import('./analysis.js').then(m=>!m.learningWorkspace)",'Keyboard return to blank workspace');
  assert.equal(await run("document.querySelector('.workspace-home').inert"),false);
  console.log('Learning navigation, both entries, full-height scroll area, game restoration, blank workspace and 320–1920px top bars passed. Screenshots: '+out);
}
