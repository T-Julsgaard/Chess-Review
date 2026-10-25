import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await sleep(600); // Allow startup zoom and font fitting to settle.
  await run(`window.sampleReviewChrome=()=>{
    const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const players=[...document.querySelectorAll('#playerTop, #playerBot')].map(n=>{
      const s=getComputedStyle(n);
      return {opacity:+s.opacity,visible:s.visibility==='visible',box:box(n),name:box(n.querySelector('.name')),avatar:box(n.querySelector('.avatar'))};
    });
    const library=getComputedStyle(document.querySelector('.library-rail'));
    return {players,libraryX:new DOMMatrix(library.transform).m41,libraryVisible:library.visibility==='visible'};
  }`);
  for(const entry of ['#learningToggle','.learn-entry-button']){
    await run(`window.chromeFrames=[sampleReviewChrome()];window.samplingChrome=true;
      function sample(){chromeFrames.push(sampleReviewChrome());if(samplingChrome)requestAnimationFrame(sample);}requestAnimationFrame(sample);
      document.querySelector('${entry}').click();`);
    await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Learning entry');
    const frames=await run('samplingChrome=false;chromeFrames');
    await fs.writeFile(path.join(out,entry==='#learningToggle'?'learn-entry-frames.json':'puzzle-entry-frames.json'),JSON.stringify(frames,null,2));
    assert.ok(frames.length>10,'Entry must be sampled across frames');
    assert.ok(frames.some(f=>f.players.some(p=>p.visible&&p.opacity>0&&p.opacity<1)),'Player labels must fade visibly');
    for(const frame of frames)for(const [i,player] of frame.players.entries()){
      if(!player.visible||player.opacity===0)continue;
      for(const part of ['box','name','avatar'])for(const key of ['x','y','width','height']){
        assert.ok(Math.abs(player[part][key]-frames[0].players[i][part][key])<1,'Player labels must stay still while fading: '+JSON.stringify({entry,part,key,player,original:frames[0].players[i]}));
      }
    }
    assert.ok(frames.some(f=>f.libraryX<0&&f.libraryX>-39&&f.libraryVisible),'Library must slide visibly before hiding');
    assert.equal(frames.at(-1).libraryVisible,false);
    assert.equal(await run("getComputedStyle(document.querySelector('.topbar-meta')).visibility"),'hidden');
    await run("document.querySelector('#learningToggle').click()");
    await waitFor(review,"document.querySelector('.topbar-meta').classList.contains('meta-return')",'Metadata return');
    const slide=await run(`(()=>{
      const n=document.querySelector('.topbar-meta'),a=n.getAnimations().find(a=>a.animationName==='meta-slide-down');
      if(!a)return null;a.pause();
      const frames=[0,70,140,210,280].map(time=>{a.currentTime=time;const m=new DOMMatrix(getComputedStyle(n).transform);return {x:m.m41,y:m.m42,scaleX:m.m11,scaleY:m.m22,skewX:m.m12,skewY:m.m21};});
      a.finish();return {frames,hidden:n.hasAttribute('aria-hidden')};
    })()`);
    assert.ok(slide&&!slide.hidden,'Review metadata must slide back into view');
    for(const [i,frame] of slide.frames.entries()){
      assert.equal(frame.x,0);assert.equal(frame.scaleX,1);assert.equal(frame.scaleY,1);assert.equal(frame.skewX,0);assert.equal(frame.skewY,0);
      assert.ok(frame.y>=-60&&frame.y<=0,'Metadata must stay on its straight return path');
      if(i)assert.ok(frame.y>=slide.frames[i-1].y,'Metadata must return without bouncing');
    }
    await waitFor(review,"import('./analysis.js').then(m=>!m.learningWorkspace)",'Review restored');
    assert.equal(await run("getComputedStyle(document.querySelector('.library-rail')).visibility"),'visible');
  }
  // Close while entry is still moving, then reopen to catch stale animation state.
  await run("import('./analysis.js').then(m=>{void m.openLearning();})");
  await waitFor(review,"import('./analysis.js').then(m=>!!m.learningWorkspace?.shell)",'Quick entry');
  await run("document.querySelector('#learningToggle').click()");
  await waitFor(review,"import('./analysis.js').then(m=>!m.learningWorkspace)",'Quick return');
  assert.equal(await run("!!document.querySelector('.learn-transition-surface, .learn-swoop-anchor')"),false);
  for(const reduced of [false,true]){
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]},review.sessionId);
    await run(`import('./analysis.js').then(m=>{m.S.settings.moveAnim=${reduced};return m.openLearning();})`);
    assert.equal(await run("getComputedStyle(document.querySelector('.library-rail')).transitionDuration"),'0s');
    assert.equal(await run("getComputedStyle(document.querySelector('.library-rail')).visibility"),'hidden');
    await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
    assert.equal(await run("getComputedStyle(document.querySelector('.library-rail')).visibility"),'visible');
  }
  const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
  await fs.writeFile(path.join(out,'review-restored.png'),Buffer.from(shot.data,'base64'));
  console.log('Both learning entries: stationary player fades, Library slide, smooth metadata return, interrupted entry and reduced motion passed. Evidence: '+out);
}
