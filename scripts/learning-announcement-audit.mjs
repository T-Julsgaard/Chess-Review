import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  await waitFor(review, "!!document.querySelector('.learning-announcement')", 'First-open developer note');
  const geometry = () => run(`(() => {
    const card = document.querySelector('.learning-announcement'), r = card.getBoundingClientRect();
    const heading = card.querySelector('h2'), insight = document.querySelector('.insight-panel');
    const targets = [...document.querySelectorAll('.learning-announcement-target')].map(b => {
      const r = b.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,
        hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b};
    });
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,
      overflow:card.scrollWidth>card.clientWidth+1,targets,
      insightTop:insight?.getBoundingClientRect().top,
      headingHeight:heading.getBoundingClientRect().height,headingLine:parseFloat(getComputedStyle(heading).lineHeight),
      headingSize:parseFloat(getComputedStyle(heading).fontSize),copySize:parseFloat(getComputedStyle(card.querySelector('p')).fontSize),
      developerSize:parseFloat(getComputedStyle(card.querySelector('.learning-announcement-eyebrow')).fontSize),
      centered:getComputedStyle(card).textAlign==='center'&&getComputedStyle(card.querySelector('.learning-announcement-actions')).justifyContent==='center',
      arrows:[...document.querySelectorAll('.learning-announcement-arrow')].filter(p=>getComputedStyle(p).display!=='none').length};
  })()`);
  const screenshot = async name => {
    const shot = await call('Page.captureScreenshot', {format:'png'}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(shot.data, 'base64'));
  };
  const checkLowerPointer = async () => {
    const anchors = await run(`(() => {
      const box=document.querySelector('.learning-announcement').getBoundingClientRect();
      const button=document.querySelector('.learn-entry-button').getBoundingClientRect();
      const path=document.querySelectorAll('.learning-announcement-arrow')[1];
      const start=path.getPointAtLength(0),end=path.getPointAtLength(path.getTotalLength());
      return {start:{x:start.x,y:start.y},end:{x:end.x,y:end.y},
        from:{x:box.left+box.width/2,y:box.bottom+5},to:{x:button.right+2,y:button.top+button.height/2}};
    })()`);
    for (const [point,expected] of [[anchors.start,anchors.from],[anchors.end,anchors.to]])
      assert.ok(Math.hypot(point.x-expected.x,point.y-expected.y)<1, 'Connect the bottom center to the middle of the button side: '+JSON.stringify(anchors));
  };
  for (const [width, height] of [[1920,1080],[1366,900],[960,800],[390,844],[320,640]]) {
    await run('window.scrollTo(0,0)');
    await call('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false}, review.sessionId);
    await sleep(700);
    const g = await geometry();
    // The application adjusts browser zoom to fit desktop compositions. Geometry
    // and SVG coordinates use the resulting CSS viewport, not device pixels.
    assert.ok(g.left >= 10 && g.right <= g.width - 10 && g.top >= 60 && g.bottom <= g.height - 10, JSON.stringify(g));
    assert.equal(g.overflow, false, JSON.stringify(g));
    assert.ok(g.headingHeight <= g.headingLine + 1, 'The title stays on one line: ' + JSON.stringify(g));
    assert.equal(g.headingSize, 25); assert.equal(g.copySize, 14);
    assert.equal(g.developerSize, 14);
    assert.equal(g.centered, true, 'Copy and actions should be centered');
    if (width >= 1366) assert.ok(Math.abs(g.top - g.insightTop) < 1, 'Align the note with Insights: ' + JSON.stringify(g));
    assert.equal(g.targets.length, 2);
    assert.equal(g.targets[0].hit, true, 'The top entry remains clickable');
    const visible = g.targets.filter(t => t.top >= 0 && t.bottom <= g.height && t.left >= 0 && t.right <= g.width);
    visible.forEach(t => assert.equal(t.hit, true, JSON.stringify(g)));
    assert.equal(g.arrows, visible.length, JSON.stringify(g));
    if (visible.length === 2) await checkLowerPointer();
    if (width === 1920) {
      assert.equal(await run("(()=>{const d=document.querySelectorAll('.learning-announcement-arrow')[1].getAttribute('d');return (d.match(/C/g)||[]).length===1&&!/[HQV]/.test(d);})()"), true, 'The lower pointer uses a single smooth curve');
      assert.equal(await run("document.querySelector('.learning-announcement').textContent.includes('Jump in with')||document.querySelector('.learning-announcement p').textContent.startsWith('Hi!')"), false);
      assert.equal(await run("!!document.querySelector('.learning-announcement-traveller, .learning-announcement-arrows animateMotion, .learning-announcement-arrows animate')"), false);
      assert.equal(await run("document.querySelector('.learning-announcement p').textContent.includes('50,000 puzzles')"), true);
      const dashSamples = await run(`([...document.querySelectorAll('.learning-announcement-arrow')].map(p=>{
        const animation=p.getAnimations()[0];if(!animation)return null;
        animation.pause();animation.currentTime=0;const before=getComputedStyle(p).strokeDashoffset;
        animation.currentTime=600;const after=getComputedStyle(p).strokeDashoffset;animation.play();return {before,after};
      }))`);
      dashSamples.forEach(sample => assert.ok(sample&&sample.before!==sample.after, 'The dash pattern flows toward both buttons'));
    }
    await screenshot('learning-announcement-' + width);
    if (visible.length < 2) {
      await run("document.querySelector('.learn-entry-button').scrollIntoView({block:'end'})");
      await sleep(200);
      const scrolled = await geometry();
      assert.equal(scrolled.targets[1].hit, true, JSON.stringify(scrolled));
      assert.equal(scrolled.arrows, 2, JSON.stringify(scrolled));
      await checkLowerPointer();
      await screenshot('learning-announcement-scrolled-' + width);
    }
  }
  await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]}, review.sessionId);
  await sleep(80);
  assert.equal(await run("document.querySelector('.learning-announcement').getAnimations().length"), 0);
  assert.equal(await run("document.querySelector('.learning-announcement-arrow').getAnimations().length"), 0);
  // Closing/reloading without acknowledging it must already suppress it.
  await call('Page.reload', {}, review.sessionId); await sleep(1200);
  await waitFor(review, "!!document.querySelector('#learningToggle')", 'Unacknowledged reload');
  assert.equal(await run("!!document.querySelector('.learning-announcement')"), false);
  // In this disposable profile only, simulate a fresh first open to exercise the
  // permanent opt-out on the blank-workspace entry as well.
  await run("chrome.storage.local.remove(['learningAnnouncement:puzzles:seen','learningAnnouncement:puzzles:disabled']).then(()=>{localStorage.removeItem('learningAnnouncement:puzzles:seen');localStorage.removeItem('learningAnnouncement:puzzles:disabled');})");
  await call('Page.navigate', {url:await run("location.origin+'/analysis.html?workspace=blank'")}, review.sessionId);
  await waitFor(review, "!!document.querySelector('.learning-announcement')", 'Blank-workspace developer note');
  await run("document.querySelector('.learning-announcement-disable').focus();document.querySelector('.learning-announcement-disable').click()");
  assert.equal(await run("!!document.querySelector('.learning-announcement, .learning-announcement-arrows, .learning-announcement-target')"), false);
  assert.equal(await run('document.activeElement.id'), 'learningToggle');
  assert.equal(await run("chrome.storage.local.get(['learningAnnouncement:puzzles:seen','learningAnnouncement:puzzles:disabled']).then(s=>Object.values(s).every(v=>v===true)&&Object.keys(s).length===2)"), true);
  await call('Page.reload', {}, review.sessionId); await sleep(1200);
  await waitFor(review, "!!document.querySelector('#learningToggle')", 'Reloaded workspace');
  assert.equal(await run("!!document.querySelector('.learning-announcement')"), false, 'Reload must not repeat the notice');
  const freshNotice = async () => {
    // Reset only this disposable audit profile to exercise another dismissal.
    await run("chrome.storage.local.remove(['learningAnnouncement:puzzles:seen','learningAnnouncement:puzzles:disabled']).then(()=>{localStorage.removeItem('learningAnnouncement:puzzles:seen');localStorage.removeItem('learningAnnouncement:puzzles:disabled');})");
    await call('Page.reload', {}, review.sessionId);
    await waitFor(review, "!!document.querySelector('.learning-announcement')", 'Fresh dismissal check');
    await sleep(500);
  };
  await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]}, review.sessionId);
  await freshNotice();
  const popping = await run(`(() => {
    const button=document.querySelector('.learning-announcement-dismiss');button.focus();button.click();button.click();
    const card=document.querySelector('.learning-announcement');
    return {present:!!card,inert:card?.inert,animated:card?.getAnimations().some(a=>a.playState==='running'),focus:document.activeElement.id};
  })()`);
  assert.deepEqual(popping, {present:true,inert:true,animated:true,focus:'learningToggle'});
  await waitFor(review, "!document.querySelector('.learning-announcement, .learning-announcement-arrows, .learning-announcement-target')", 'Pop dismissal cleanup');
  await call('Page.reload', {}, review.sessionId); await sleep(1000);
  await waitFor(review, "!!document.querySelector('#learningToggle')", 'Reload after pop');
  assert.equal(await run("!!document.querySelector('.learning-announcement')"), false, 'Pop dismissal must not show again');
  await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]}, review.sessionId);
  await freshNotice();
  assert.equal(await run("document.querySelector('.learning-announcement-dismiss').click();!!document.querySelector('.learning-announcement, .learning-announcement-arrows, .learning-announcement-target')"), false, 'Reduced motion dismisses immediately');
  console.log('First-open announcement, arrows, responsive layout, pop dismissal, reduced motion, permanent opt-out and reload passed. Screenshots: ' + out);
}
