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
    for(const [kind,styles] of [['start',['pulse','rings','flip','still']],['end',['classic','ribbon','spotlight','still']]]){
      await run(`(()=>{const head=[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent===${JSON.stringify(kind==='start'?'Time attack start':'Game over')});if(head.getAttribute('aria-expanded')!=='true')head.click();})()`);
      for(const style of styles){
        await run(`document.querySelector('[data-setting=${kind==='start'?'puzzleStartAnimation':'puzzleEndAnimation'}][data-value=${style}]').click()`);
        await sleep(650);
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
    await capture(`puzzle-start-${style}`);
    await run('animationStarting');
    await run(`import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('Time is up'))`);
  }
  for(const reduced of [false,true]){
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]},review.sessionId);
    for(const mode of ['timeAttack','knockout'])for(const style of ['classic','ribbon','spotlight','still']){
      await run(`import('./analysis.js').then(m=>{m.S.settings.puzzleEndAnimation='${style}';const w=m.learningWorkspace;w.result.mode='${mode}';w.showPuzzleRunEnd();})`);
      await sleep(250);
      const state=await run(`(()=>{const e=document.querySelector('.learn-board > .puzzle-run-end');return {style:e.dataset.style,animation:getComputedStyle(e).animationName,card:getComputedStyle(e.firstChild).animationName};})()`);
      assert.equal(state.style,style);assert.equal(state.animation==='none',reduced||style==='still');assert.equal(state.card==='none',reduced||style==='still');
      if(!reduced&&mode==='knockout')await capture(`puzzle-end-${style}`);
    }
    // Pseudo-elements must stop too, including rings in Settings.
    await run(`document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Time attack start').click();document.querySelector('[data-setting=puzzleStartAnimation][data-value=rings]').click()`);
    await sleep(100);
    assert.equal(await run(`getComputedStyle(document.querySelector('.puzzle-animation-preview .puzzle-run-start-count'),'::before').animationName==='none'`),reduced);
    await run(`document.querySelector('[aria-label=Settings]').click()`);
  }
  console.log(JSON.stringify({ok:true,out,checks:['countdown move and cursor gating','all animation previews at desktop and phone sizes','all live countdown styles','ending styles for both modes','reduced motion including rings']},null,2));
}
