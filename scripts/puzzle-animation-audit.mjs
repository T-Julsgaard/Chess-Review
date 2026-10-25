import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {auditLearning as auditStart} from './puzzle-run-start-audit.mjs';

export async function auditLearning(context) {
  await auditStart(context);
  const {review,call,evaluate,waitFor,sleep,out}=context,run=expression=>evaluate(review,expression);
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]},review.sessionId);
  await run(`import('./analysis.js').then(m=>{m.S.settings.moveAnim=true;})`);
  const capture=async name=>{
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  await run(`document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-tab')].find(n=>n.textContent==='Puzzles').click()`);
  for(const [width,height] of [[1280,800],[390,844],[320,640]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    for(const [kind,styles] of [['start',['pulse','rings','flip','still']],['end',['classic','ribbon','spotlight','flip','still']]]){
      await run(`(()=>{const head=[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent===${JSON.stringify(kind==='start'?'Time attack start':'Game over')});if(head.getAttribute('aria-expanded')!=='true')head.click();})()`);
      for(const style of styles){
        await run(`document.querySelector('[data-setting=${kind==='start'?'puzzleStartAnimation':'puzzleEndAnimation'}][data-value=${style}]').click()`);
        await sleep(kind==='end'&&style==='flip'?1050:650);
        const state=await run(`(()=>{const preview=document.querySelector('.set-section.open .puzzle-animation-preview'),e=preview.querySelector('.puzzle-run-${kind}'),r=preview.getBoundingClientRect(),c=e.querySelector('.puzzle-run-${kind}-card').getBoundingClientRect(),panel=document.querySelector('#settings');return {style:e.dataset.style,fits:c.left>=r.left-1&&c.right<=r.right+1&&c.top>=r.top-1&&c.bottom<=r.bottom+1,overflow:panel.scrollWidth>panel.clientWidth+1};})()`);
        assert.equal(state.style,style);assert.equal(state.fits,true,`${width} ${kind} ${style} preview fits`);assert.equal(state.overflow,false);
        if(width!==320)await capture(`puzzle-settings-${kind}-${style}-${width}`);
      }
    }
  }
  // Exercise the styles on the actual board in both modes and with reduced motion.
  await run(`document.querySelector('[aria-label=Settings]').click()`);
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false},review.sessionId);
  for(const style of ['pulse','rings','flip','still']){
    await run(`import('./analysis.js').then(async m=>{m.S.settings.moveAnim=true;m.S.settings.puzzleStartAnimation='${style}';const w=m.learningWorkspace;await w.navigate('puzzles');window.animationStarting=w.startPuzzleRun('timeAttack');})`);
    await waitFor(review,`!!document.querySelector('.learn-board > .puzzle-run-start')`,'Live countdown after board arrangement');
    await sleep(300);
    assert.equal(await run(`document.querySelector('.learn-board > .puzzle-run-start').dataset.style`),style);
    assert.equal(await run(`import('./analysis.js').then(m=>m.learningWorkspace.currentFen()===readyBefore)`),true);
    const coverage=await run(`(()=>{const e=document.querySelector('.learn-board > .puzzle-run-start'),b=e.parentElement.getBoundingClientRect(),r=e.getBoundingClientRect();return {covers:r.left<=b.left&&r.right>=b.right&&r.top<=b.top&&r.bottom>=b.bottom,rounded:getComputedStyle(e).borderRadius};})()`);
    assert.equal(coverage.covers,true);assert.equal(coverage.rounded,'0px','Only the board clips the veil, avoiding a second rounded edge');
    await capture(`puzzle-start-${style}`);
    if(style==='flip'){
      await waitFor(review,`document.querySelector('.learn-board > .puzzle-run-start')?.dataset.step==='2'`,'Second flip');
      await sleep(150);await capture('puzzle-flip-turning');
      await waitFor(review,`document.querySelector('.learn-board > .puzzle-run-start')?.dataset.step==='Go!'`,'Flip Go');
      const transition=await run(`import('./analysis.js').then(m=>{
        const w=m.learningWorkspace,e=w.runStartOverlay,animation=e.getAnimations().find(a=>a.animationName==='puzzle-run-start-go');
        animation.pause();animation.currentTime=100;
        const held=+getComputedStyle(e).opacity,observer=new MutationObserver(()=>{});observer.observe(e.parentElement,{childList:true});
        w.render();w.render();const stable=e.getAnimations().includes(animation),detached=observer.takeRecords().some(r=>[...r.removedNodes].includes(e));observer.disconnect();
        animation.currentTime=550;const faded=+getComputedStyle(e).opacity;animation.currentTime=100;
        return {held,faded,stable,detached,leafAnimation:getComputedStyle(e.querySelector('.puzzle-flip-in')).animationName,background:getComputedStyle(e).backgroundColor};
      })`);
      assert.equal(transition.held,1);assert.ok(transition.faded<.3);assert.equal(transition.stable,true);assert.equal(transition.detached,false);
      assert.equal(transition.leafAnimation,'none');assert.match(transition.background,/, 0\.6\)$/);
      await capture('puzzle-flip-go');
    }
    await run('animationStarting');
    await run(`import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('Time is up'))`);
  }
  for(const reduced of [false,true]){
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]},review.sessionId);
    for(const mode of ['timeAttack','knockout'])for(const style of ['classic','ribbon','spotlight','flip','still']){
      await run(`import('./analysis.js').then(m=>{m.S.settings.puzzleEndAnimation='${style}';const w=m.learningWorkspace;w.result.mode='${mode}';w.showPuzzleRunEnd();})`);
      await sleep(250);
      const state=await run(`(()=>{const e=document.querySelector('.learn-board > .puzzle-run-end');return {style:e.dataset.style,animation:getComputedStyle(e).animationName,card:getComputedStyle(e.firstChild).animationName};})()`);
      assert.equal(state.style,style);assert.equal(state.animation==='none',reduced||style==='still');assert.equal(state.card==='none',reduced||style==='still');
      if(style==='flip'){
        const score=await run(`(()=>{const e=document.querySelector('.learn-board > .puzzle-run-end'),s=e.querySelector('.puzzle-end-score');return {value:s.getAttribute('aria-label'),display:getComputedStyle(s).display,leaf:getComputedStyle(s.querySelector('.puzzle-flip-in')).animationName};})()`);
        assert.equal(score.value,'0 puzzles solved');assert.equal(score.display,'block');assert.equal(score.leaf==='none',reduced);
        if(!reduced)await sleep(650);
      }
      if(!reduced&&mode==='knockout')await capture(`puzzle-end-${style}`);
    }
    // Pseudo-elements must stop too, including rings in Settings.
    await run(`document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Time attack start').click();document.querySelector('[data-setting=puzzleStartAnimation][data-value=rings]').click()`);
    await sleep(100);
    assert.equal(await run(`getComputedStyle(document.querySelector('.puzzle-animation-preview .puzzle-run-start-count'),'::before').animationName==='none'`),reduced);
    await run(`document.querySelector('[aria-label=Settings]').click()`);
  }
  // A full result with a record badge must fit the smaller board too.
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]},review.sessionId);
  for(const [width,height] of [[1280,800],[390,844],[320,640]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await run(`import('./analysis.js').then(m=>{const w=m.learningWorkspace;w.scrollToTop();m.S.settings.puzzleEndAnimation='flip';w.result.solved=24;w.result.personalBest=true;w.showPuzzleRunEnd();})`);
    await sleep(1000);
    const fits=await run(`(()=>{const e=document.querySelector('.learn-board > .puzzle-run-end'),b=e.getBoundingClientRect(),c=e.firstChild.getBoundingClientRect(),top=document.querySelector('.topbar').getBoundingClientRect().bottom;return c.left>=b.left&&c.right<=b.right&&c.top>=b.top&&c.bottom<=b.bottom&&c.top>=top-1&&c.bottom<=innerHeight;})()`);
    assert.equal(fits,true,`Flip result with a record fits at ${width}`);await capture(`puzzle-end-flip-record-${width}`);
  }
  console.log(JSON.stringify({ok:true,out,checks:['countdown move and cursor gating','all animation previews at desktop and phone sizes','all live countdown styles','hinged flip and uninterrupted Go fade','lighter veil with complete board coverage','ending styles for both modes','reduced motion including rings']},null,2));
}
