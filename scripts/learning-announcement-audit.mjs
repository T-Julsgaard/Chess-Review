import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  await waitFor(review, "!!document.querySelector('.learning-announcement')", 'First-open developer note');
  const geometry = () => run(`(() => {
    const card = document.querySelector('.learning-announcement'), r = card.getBoundingClientRect();
    const targets = [...document.querySelectorAll('.learning-announcement-target')].map(b => {
      const r = b.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,
        hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b};
    });
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,
      overflow:card.scrollWidth>card.clientWidth+1,targets,
      arrows:[...document.querySelectorAll('.learning-announcement-arrow')].filter(p=>getComputedStyle(p).display!=='none').length};
  })()`);
  const screenshot = async name => {
    const shot = await call('Page.captureScreenshot', {format:'png'}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(shot.data, 'base64'));
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
    assert.equal(g.targets.length, 2);
    assert.equal(g.targets[0].hit, true, 'The top entry remains clickable');
    const visible = g.targets.filter(t => t.top >= 0 && t.bottom <= g.height && t.left >= 0 && t.right <= g.width);
    visible.forEach(t => assert.equal(t.hit, true, JSON.stringify(g)));
    assert.equal(g.arrows, visible.length, JSON.stringify(g));
    await screenshot('learning-announcement-' + width);
    if (visible.length < 2) {
      await run("document.querySelector('.learn-entry-button').scrollIntoView({block:'end'})");
      await sleep(200);
      const scrolled = await geometry();
      assert.equal(scrolled.targets[1].hit, true, JSON.stringify(scrolled));
      assert.equal(scrolled.arrows, 2, JSON.stringify(scrolled));
      await screenshot('learning-announcement-scrolled-' + width);
    }
  }
  await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]}, review.sessionId);
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
  console.log('First-open announcement, arrows, responsive layout, reduced motion, permanent opt-out and reload passed. Screenshots: ' + out);
}
