import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  const pointer=async(x,y)=>call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y},review.sessionId);
  const key=async key=>{
    const windowsVirtualKeyCode={Enter:13,Tab:9,Escape:27}[key];
    await call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode},review.sessionId);
    await call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode},review.sessionId);
  };
  const geometry=()=>run(`(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    return {card:rect('.learn-notice-card'),arena:rect('.learn-notice-actions'),accept:rect('.learn-notice-accept'),reject:rect('.learn-notice-reject'),width:innerWidth,height:innerHeight};})()`);
  const shot=async name=>{
    const result=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(result.data,'base64'));
  };
  const open=()=>run("(()=>{const b=document.querySelector('.learn-library-row > button');b.focus();b.click();})()");
  await run("import('./analysis.js').then(async m=>{m.S.settings.moveAnim=false;await m.openLearning();await m.learningWorkspace.navigate('concepts');})");
  for(const [width,height] of [[1920,1080],[390,844],[320,640]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(600); // Let the review finish applying its responsive CSS zoom.
    await pointer(0,0);await open();const initial=await geometry();
    assert.ok(Math.abs((initial.card.left+initial.card.right)/2-initial.width/2)<2,'Dialog must be centered horizontally: '+JSON.stringify(initial));
    assert.ok(Math.abs((initial.card.top+initial.card.bottom)/2-initial.height/2)<2,'Dialog must be centered vertically: '+JSON.stringify(initial));
    assert.ok(initial.accept.left-initial.reject.right>=32,'Fair enough sits to the right with a generous gap');
    assert.ok(initial.card.left>=15&&initial.card.right<=initial.width-15&&initial.card.top>=15&&initial.card.bottom<=initial.height-15,'Dialog must fit the viewport: '+JSON.stringify(initial));
    assert.ok(initial.card.width<=460&&initial.card.height<400,'Keep the dialog compact');
    assert.equal(await run("getComputedStyle(document.querySelector('.learn-notice-card')).userSelect"),'none');
    assert.equal(await run("getComputedStyle(document.querySelector('#learn-notice-copy')).fontSize"),'17px');
    await call('Input.dispatchMouseEvent',{type:'mousePressed',x:4,y:4,button:'left',clickCount:1},review.sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:4,y:4,button:'left',clickCount:1},review.sessionId);
    await key('Escape');assert.equal(await run("!!document.querySelector('.learn-notice-overlay')"),true);
    await shot('concept-notice-'+width);
    // Enter above Fair enough, then move down to it without waking the runner.
    await pointer((initial.accept.left+initial.accept.right)/2,initial.accept.top-60);
    await pointer((initial.accept.left+initial.accept.right)/2,(initial.accept.top+initial.accept.bottom)/2);
    assert.equal(await run("Number(document.querySelector('.learn-notice-reject').dataset.dodges||0)"),0,'Approaching Fair enough should not trigger the first dodge');
    // A rapid press must dodge rather than win before the queued frame runs.
    const pressX=(initial.reject.left+initial.reject.right)/2,pressY=(initial.reject.top+initial.reject.bottom)/2;
    await call('Input.dispatchMouseEvent',{type:'mousePressed',x:pressX,y:pressY,button:'left',clickCount:1},review.sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:pressX,y:pressY,button:'left',clickCount:1},review.sessionId);
    await waitFor(review,"Number(document.querySelector('.learn-notice-reject').dataset.dodges)>0",'Immediate press escape');
    assert.equal(await run("document.querySelector('.learn-notice-reject').disabled"),false,'An immediate pointer click must not catch an alert button');
    await run("Promise.allSettled(document.querySelector('.learn-notice-reject').getAnimations().map(a=>a.finished))");
    await sleep(70);
    // Proximity, rather than entering the button itself, should start each escape.
    for(let i=0;i<18;i++) {
      const before=await geometry(),r=before.reject;
      const dodges=await run("Number(document.querySelector('.learn-notice-reject').dataset.dodges||0)");
      await pointer((r.left+r.right)/2,(r.top+r.bottom)/2);
      await waitFor(review,`Number(document.querySelector('.learn-notice-reject').dataset.dodges)>${dodges}`,'Button escape');
      await run("Promise.allSettled(document.querySelector('.learn-notice-reject').getAnimations().map(a=>a.finished))");
      await sleep(70);const next=await geometry(),b=next.reject,a=next.accept;
      assert.ok(Math.hypot(b.left-r.left,b.top-r.top)>50,'Escape should travel, not jitter: '+JSON.stringify({before,next}));
      assert.ok(b.left>=Math.max(15,next.card.left-73)&&b.right<=Math.min(next.width-15,next.card.right+73)&&b.top>=next.arena.top-13&&b.bottom<=Math.min(next.height-15,next.card.bottom+73),'Escape stays in the small halo around the dialog');
      assert.ok(b.left>=a.right+39||b.right<=a.left-39||b.top>=a.bottom+39||b.bottom<=a.top-39,'Dismiss button keeps its protected space: '+JSON.stringify(next));
    }
    await shot('concept-notice-dodged-'+width);
    // A keyboard catch must work without moving the focused button.
    await run("document.querySelector('.learn-notice-accept').focus()");await key('Tab');
    assert.equal(await run('document.activeElement.textContent'),'Unacceptable');
    const beforeCatch=await geometry();await key('Enter');
    assert.equal(await run("document.querySelector('#learn-notice-copy').textContent"),"Whoa, nice mouse speed! Why don't you use that in some of your bullet games?");
    assert.equal(await run('document.activeElement.textContent'),'Fair enough');
    const afterCatch=await geometry();assert.ok(Math.abs(beforeCatch.card.top-afterCatch.card.top)<1,'The catch should not shift the dialog');
    await shot('concept-notice-caught-'+width);
    const a=afterCatch.accept,x=(a.left+a.right)/2,y=(a.top+a.bottom)/2;await pointer(x,y);
    await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1},review.sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1},review.sessionId);
    assert.equal(await run("!!document.querySelector('.learn-notice-overlay')"),false);
  }
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
  await open();const r=(await geometry()).reject;await pointer(r.left+8,r.top+8);
  await waitFor(review,"Number(document.querySelector('.learn-notice-reject').dataset.dodges)>0",'Reduced-motion escape');
  assert.equal(await run("document.querySelector('.learn-notice-reject').getAnimations().length"),0);
  await key('Escape');assert.equal(await run("!!document.querySelector('.learn-notice-overlay')"),true);
  await run("document.querySelector('.learn-notice-accept').focus()");await key('Enter');
  assert.equal(await run("!!document.querySelector('.learn-notice-overlay')"),false);
  console.log('Concept notice browser checks passed at 1920, 390 and 320 pixels, including escapes, catches and reduced motion. Screenshots: '+out);
}
