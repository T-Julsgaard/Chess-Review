import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {auditLearning as auditStart} from './puzzle-run-start-audit.mjs';

export async function auditLearning(context) {
  await auditStart(context);
  const {review,call,evaluate,waitFor,sleep,out}=context,run=expression=>evaluate(review,expression);
  const capture=async name=>{
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  await run(`document.querySelector('[aria-label=Settings]').click()`);
  assert.deepEqual(await run(`[...document.querySelectorAll('.set-tab')].map(n=>n.textContent)`),['Visual','Engine']);
  await capture('settings-without-puzzles');
  await run(`document.querySelector('[aria-label=Settings]').click()`);
  for(const [width,height] of [[1280,800],[390,844],[320,640]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    for(const [motion,reduced] of [[true,false],[false,false],[true,true]]){
      await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]},review.sessionId);
      await run(`import('./analysis.js').then(async m=>{
        m.S.settings.moveAnim=${motion};m.S.settings.puzzleStartAnimation='rings';m.S.settings.puzzleEndAnimation='ribbon';
        const w=m.learningWorkspace;await w.navigate('puzzles');window.animationStarting=w.startPuzzleRun('timeAttack');
      })`);
      await waitFor(review,`!!document.querySelector('.learn-board > .puzzle-run-start')`,'Live flip countdown');
      await sleep(300);
      const start=await run(`(()=>{const e=document.querySelector('.puzzle-run-start'),s=e.querySelector('.puzzle-count-display'),r=s.getBoundingClientRect();return {style:e.dataset.style,width:r.width,height:r.height,leaf:getComputedStyle(e.querySelector('.puzzle-flip-in')).animationName};})()`);
      assert.equal(start.style,'flip');assert.equal(start.leaf==='none',!motion||reduced);
      if(motion&&!reduced)await capture('puzzle-start-flip-'+width);
      if(width===1280&&motion&&!reduced){
        await waitFor(review,`document.querySelector('.puzzle-run-start')?.dataset.step==='2'`,'Second flip');
        await sleep(150);await capture('puzzle-flip-turning');
        await waitFor(review,`document.querySelector('.puzzle-run-start')?.dataset.step==='Go!'`,'Flip Go');
        const transition=await run(`import('./analysis.js').then(m=>{
          const w=m.learningWorkspace,e=w.runStartOverlay,animation=e.getAnimations().find(a=>a.animationName==='puzzle-run-start-go');
          animation.pause();animation.currentTime=100;
          const held=+getComputedStyle(e).opacity,observer=new MutationObserver(()=>{});observer.observe(e.parentElement,{childList:true});
          w.render();w.render();const stable=e.getAnimations().includes(animation),detached=observer.takeRecords().some(r=>[...r.removedNodes].includes(e));observer.disconnect();
          animation.currentTime=550;const faded=+getComputedStyle(e).opacity;animation.currentTime=100;
          return {held,faded,stable,detached,leafAnimation:getComputedStyle(e.querySelector('.puzzle-flip-in')).animationName,background:getComputedStyle(e).backgroundColor,goColor:getComputedStyle(e.querySelector('.puzzle-flip')).color};
        })`);
        assert.equal(transition.held,1);assert.ok(transition.faded<.3);assert.equal(transition.stable,true);assert.equal(transition.detached,false);
        assert.equal(transition.leafAnimation,'none');assert.match(transition.background,/, 0\.6\)$/);assert.equal(transition.goColor,'rgb(255, 255, 255)');
        await capture('puzzle-flip-go');
      }
      await run('animationStarting');
      await run(`import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('Time is up'))`);
      for(const mode of ['timeAttack','knockout']){
        await run(`import('./analysis.js').then(m=>{const w=m.learningWorkspace;w.result.mode='${mode}';w.result.solved=24;w.result.personalBest=true;w.showPuzzleRunEnd();})`);
        await sleep(1000);
        const end=await run(`(()=>{
          const e=document.querySelector('.puzzle-run-end'),s=e.querySelector('.puzzle-end-score'),r=s.getBoundingClientRect(),b=e.getBoundingClientRect(),c=e.firstChild.getBoundingClientRect();
          return {style:e.dataset.style,width:r.width,height:r.height,title:e.querySelector('.puzzle-run-end-title').textContent,score:s.getAttribute('aria-label'),leaf:getComputedStyle(s.querySelector('.puzzle-flip-in')).animationName,
            fits:c.left>=b.left&&c.right<=b.right&&c.top>=b.top&&c.bottom<=b.bottom,color:getComputedStyle(s.querySelector('.puzzle-flip')).color};
        })()`);
        assert.equal(end.style,'flip');assert.equal(end.width,start.width,'Result counter matches countdown width');assert.equal(end.height,start.height,'Result counter matches countdown height');
        assert.equal(end.title,'Puzzles solved');assert.equal(end.score,'24 puzzles solved');assert.equal(end.leaf==='none',!motion||reduced);assert.equal(end.fits,true);assert.equal(end.color,'rgb(255, 255, 255)');
        if(motion&&!reduced)await capture('puzzle-end-flip-'+mode+'-'+width);
      }
    }
  }
  for(const mode of ['timeAttack','knockout']){
    await run(`import('./analysis.js').then(m=>{
      const w=m.learningWorkspace;w.result.mode='${mode}';w.result.results=[{id:w.puzzles[0].id,number:1,correct:true}];
      w.render();w.showPuzzleRunEnd();window.persistentEnding=w.runEndOverlay;
    })`);
    await sleep(3300);
    assert.equal(await run(`import('./analysis.js').then(m=>{const w=m.learningWorkspace;w.render();return w.runEndOverlay===persistentEnding&&persistentEnding.isConnected&&getComputedStyle(persistentEnding).opacity==='1';})`),true);
    await run(`document.querySelector('[data-focus=replay-1]').click()`);
    await waitFor(review,`import('./analysis.js').then(m=>m.learningWorkspace.activity?.replay&&!m.learningWorkspace.runEndOverlay)`,'Puzzle selection clears the ending');
    await run(`import('./analysis.js').then(m=>{const w=m.learningWorkspace;w.returnToRunResults();w.showPuzzleRunEnd();document.querySelector('[data-focus=run-again]').click();})`);
    await waitFor(review,`import('./analysis.js').then(m=>m.learningWorkspace.run?.mode==='${mode}'&&!m.learningWorkspace.runEndOverlay&&!m.learningWorkspace.busy)`,'Play again clears the ending');
    await run(`import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('Out of lives'))`);
  }
  console.log(JSON.stringify({ok:true,out,checks:['countdown timing and gating','settings without Puzzles tab','Flip replaces saved choices','equal counter dimensions at desktop and phone sizes','Go fade continuity','both run modes','global and reduced motion','persistent endings and dismissal']},null,2));
}
