import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// The first-run intro tour ends with the live engine explanations transition.
const STEPS = [
  {target: 'playstyle', title: 'Your player profile'},
  {target: 'learn', title: 'Learn with Chess Review'},
  {target: 'engine-explanations', title: 'Engine explanations'},
];
const KEYS = "['introTour:seen','introTour:explanationsPending','learningAnnouncement:puzzles:seen','learningAnnouncement:puzzles:disabled']";

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const screenshot = async name => {
    const shot = await call('Page.captureScreenshot', {format:'png'}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(shot.data, 'base64'));
  };
  const absent = "!document.querySelector('.learning-announcement, .learning-announcement-arrows, .learning-announcement-target')";
  const geometry = () => run(`(() => {
    const card = document.querySelector('.learning-announcement'), r = card.getBoundingClientRect();
    const heading = card.querySelector('h2'), copy = card.querySelector('.learning-announcement-copy');
    const targets = [...document.querySelectorAll('.learning-announcement-target')].map(b => {
      const r = b.getBoundingClientRect(); return {id:b.dataset.section||'engine-explanations',top:r.top,bottom:r.bottom,left:r.left,right:r.right,
        hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b};
    });
    const path = document.querySelector('.learning-announcement-arrow'), shown = getComputedStyle(path).display !== 'none';
    const button = document.querySelector('.learning-announcement-target')?.getBoundingClientRect();
    const end = shown && path.getPointAtLength(path.getTotalLength()), start = shown && path.getPointAtLength(0);
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,
      overflow:card.scrollWidth>card.clientWidth+1||card.scrollHeight>card.clientHeight+1,targets,
      title:heading.textContent,eyebrow:card.querySelector('.learning-announcement-eyebrow').textContent,
      text:card.querySelector('p').textContent,buttons:[...card.querySelectorAll('button')].map(b=>b.textContent),
      step:card.dataset.step,dots:[...card.querySelectorAll('.learning-announcement-steps i')].map(i=>i.classList.contains('active')),
      opacity:getComputedStyle(copy).opacity,copyAnimations:copy.getAnimations().length,
      headingSize:parseFloat(getComputedStyle(heading).fontSize),copySize:parseFloat(getComputedStyle(card.querySelector('p')).fontSize),
      centered:getComputedStyle(card).textAlign==='center'&&getComputedStyle(card.querySelector('.learning-announcement-actions')).justifyContent==='center',
      arrow:shown,start:start&&{x:start.x,y:start.y},end:end&&{x:end.x,y:end.y},
      expectedEnd:button&&(button.bottom<=r.top?{x:button.left+button.width/2,y:button.bottom+9}:{x:button.right+2,y:button.top+button.height/2})};
  })()`);
  const checkStep = (g, index) => {
    const label = JSON.stringify(g);
    assert.equal(g.step, String(index + 1), label);
    assert.deepEqual(g.dots, STEPS.map((_, i) => i === index), label);
    assert.equal(g.title, STEPS[index].title, label);
    assert.equal(g.eyebrow, 'Welcome to Chess Review', label);
    assert.deepEqual(g.buttons, ['Got it'], 'Only one action, no opt-out: ' + label);
    assert.equal(g.targets.length, 1, label);
    assert.equal(g.targets[0].id, STEPS[index].target, label);
    assert.equal(g.targets[0].hit, true, 'The highlighted button stays clickable: ' + label);
    assert.ok(g.left >= 10 && g.right <= g.width - 10 && g.top >= 50 && g.bottom <= g.height - 10, label);
    assert.equal(g.overflow, false, label);
    assert.equal(g.opacity, '1', 'The step text is fully visible: ' + label);
    assert.equal(g.headingSize, 21); assert.equal(g.copySize, 13);
    assert.equal(g.centered, true, 'Copy and actions should be centered');
    assert.equal(g.arrow, true, 'The arrow points at the button: ' + label);
    assert.ok(Math.hypot(g.end.x - g.expectedEnd.x, g.end.y - g.expectedEnd.y) < 1.5, 'The arrow reaches the button: ' + label);
    assert.ok(Math.min(Math.abs(g.start.y - (g.top - 5)), Math.abs(g.start.y - (g.bottom + 5))) < 1.5, 'The arrow leaves the card edge: ' + label);
  };
  const fresh = async ({legacy} = {}) => {
    // Reset only this disposable audit profile to exercise another first open.
    await run(`chrome.storage.local.remove(${KEYS}).then(()=>{${KEYS}.forEach(k=>localStorage.removeItem(k));${legacy ? `return chrome.storage.local.set({'${legacy}':true});` : ''}})`);
    await call('Page.reload', {}, review.sessionId);
    await waitFor(review, "!!document.querySelector('.section-btn[data-section=playstyle]')", 'Reloaded review');
    await waitFor(review, "!!document.querySelector('.learning-announcement')", 'Fresh intro'); await sleep(500);
  };
  const reloadShowsNothing = async message => {
    await call('Page.reload', {}, review.sessionId); await sleep(1200);
    await waitFor(review, "!!document.querySelector('.section-btn[data-section=playstyle]')", 'Reloaded review');
    assert.equal(await run("!!document.querySelector('.learning-announcement')"), false, message);
  };

  // A new installation opens in English with no language prompt; the intro shows first.
  await waitFor(review, "!!document.querySelector('.learning-announcement')", 'First-open intro');
  await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]}, review.sessionId);
  // Laptop and desktop viewports, plus a narrow ~500 px window.
  for (const [width, height] of [[1920,1080],[1366,900],[1280,720],[960,800],[500,800]]) {
    await call('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false}, review.sessionId);
    await sleep(1000);
    checkStep(await geometry(), 0);
    await screenshot(`intro-step1-${width}`);
  }
  await call('Emulation.setDeviceMetricsOverride', {width:1920,height:1080,deviceScaleFactor:1,mobile:false}, review.sessionId);
  await sleep(500);
  const step1 = await geometry();
  assert.ok(step1.text.includes('accuracy'), JSON.stringify(step1));
  assert.equal(await run("document.querySelector('.ip-explanations-toggle').getAttribute('aria-checked')"), 'false');
  await waitFor(review, "document.querySelector('.coach-frame')?.classList.contains('ready')", 'Intro coach');

  // Got it: the same card morphs to the second button.
  const morph = await run(`(() => {
    const button=document.querySelector('.learning-announcement-dismiss');button.focus();button.click();button.click();
    const card=document.querySelector('.learning-announcement');
    return {present:!!card,morphing:!!document.querySelector('.learning-announcement-morph')||card.querySelector('.learning-announcement-copy').getAnimations().length>0};
  })()`);
  assert.deepEqual(morph, {present:true,morphing:true}, 'A double click must not skip step two');
  await sleep(140);
  await screenshot('intro-morph-mid');
  await sleep(900);
  const step2 = await geometry();
  checkStep(step2, 1);
  assert.ok(step2.text.includes('50,000 puzzles'), JSON.stringify(step2));
  assert.equal(step2.copyAnimations, 0, 'Morph animations finish cleanly');
  assert.ok(Math.abs(step2.left - step1.left) < 1 && Math.abs(step2.top - step1.top) < 1, 'The card stays put while it morphs');
  assert.equal(await run('document.activeElement.className'), 'learning-announcement-dismiss', 'Keyboard focus stays on Got it');
  await screenshot('intro-step2-1920');
  for (const [width, height] of [[1366,900],[500,800]]) {
    await call('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false}, review.sessionId);
    await sleep(1000);
    checkStep(await geometry(), 1);
    await screenshot(`intro-step2-${width}`);
  }
  await call('Emulation.setDeviceMetricsOverride', {width:1920,height:1080,deviceScaleFactor:1,mobile:false}, review.sessionId);
  await sleep(400);

  // The final step switches on explanations through the real animated setting path.
  await run("document.querySelector('.learning-announcement-dismiss').click()");
  await waitFor(review, "document.querySelector('.coach-transition')!==null", 'Intro coach exit animation');
  await screenshot('intro-coach-exit');
  await sleep(1100);
  checkStep(await geometry(), 2);
  assert.equal(await run("document.querySelector('.ip-explanations-toggle').getAttribute('aria-checked')"), 'true');
  assert.equal(await run("!!document.querySelector('.coach-frame')"), false);
  for (const [width,height] of [[1920,1080],[1366,900],[500,800]]) {
    await call('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false}, review.sessionId);
    await sleep(700);
    checkStep(await geometry(), 2);
    await screenshot(`intro-step3-${width}`);
  }

  // The final Got it pops the card away and hands focus to the button it showed.
  const popping = await run(`(() => {
    const button=document.querySelector('.learning-announcement-dismiss');button.click();button.click();
    const card=document.querySelector('.learning-announcement');
    return {present:!!card,inert:card?.inert,animated:card?.getAnimations().some(a=>a.playState==='running'),focus:document.activeElement.matches('.ip-explanations-toggle')};
  })()`);
  assert.deepEqual(popping, {present:true,inert:true,animated:true,focus:true});
  await waitFor(review, absent, 'Pop dismissal cleanup');
  await reloadShowsNothing('Finishing the tour must not show it again');
  assert.equal(await run("document.querySelector('.ip-explanations-toggle').getAttribute('aria-checked')"), 'true', 'The enabled setting survives reopening');

  // Closing or reloading without pressing Got it must already suppress it.
  await fresh();
  await reloadShowsNothing('An unacknowledged intro must not repeat');

  await fresh();
  await run("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  assert.equal(await run(absent), true, 'Escape ends the tour');
  await reloadShowsNothing('Escape must not show the tour again');

  await fresh();
  await run("document.querySelector('.section-btn[data-section=playstyle]').click()");
  assert.equal(await run(absent), true, 'Opening the profile ends the tour');
  await reloadShowsNothing('Using a button must not show the tour again');

  await fresh({legacy: 'learningAnnouncement:puzzles:seen'});
  assert.equal(await run('!!document.querySelector(".learning-announcement")'), true, 'Users who saw the old note get the tour too');
  await run("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))");
  await reloadShowsNothing('The tour shows only once for users who saw the old note');

  await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]}, review.sessionId);
  await fresh();
  assert.equal(await run("document.querySelector('.learning-announcement').getAnimations().length"), 0);
  assert.equal(await run("document.querySelector('.learning-announcement-dismiss').click();document.querySelector('.learning-announcement').dataset.step"), '2', 'Reduced motion swaps steps at once');
  checkStep(await geometry(), 1);
  assert.equal(await run("document.querySelector('.learning-announcement-dismiss').click();document.querySelector('.learning-announcement').dataset.step"), '3');
  await sleep(100);
  checkStep(await geometry(), 2);
  assert.equal(await run(`document.querySelector('.learning-announcement-dismiss').click();${absent}`), true, 'Reduced motion dismisses immediately');
  await reloadShowsNothing('Reduced-motion tour must not show again');
  console.log('Intro tour: all three steps, coach exit, saved explanations, morph, arrows, viewports, dismissal, legacy users and reduced motion passed. Screenshots: ' + out);
}
