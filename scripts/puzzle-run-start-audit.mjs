import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await run(`import('./analysis.js').then(async m=>{
    m.S.settings.moveAnim=false;await m.openLearning();
    const w=m.learningWorkspace,{Chess}=await import('./lib/chess.js');
    const before=new Chess();before.move('e4');const after=new Chess(before.fen());after.move('d5');
    window.readyBefore=before.fen();window.readyMoves=[];w.onPuzzleMove=san=>readyMoves.push(san);
    w.puzzles=[{id:'ready-audit',fen:after.fen(),setup:{fen:before.fen(),move:'d7d5'},solution:['e4d5','d8d5','b1c3'],rating:450,themes:[]}];
    window.startCues=[];
    const {createRunStartSound}=await import('./lib/learning/run-start-sound.js');
    w.runStartSound=createRunStartSound(window,()=>m.S.settings);
    const play=w.runStartSound.play;w.runStartSound.play=step=>{startCues.push(step);play(step);};
  })`);
  const capture=async name=>{
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  for(const [width,height,motion,reduced] of [[1280,800,true,false],[390,844,false,false],[1280,800,true,true]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]},review.sessionId);
    await run(`import('./analysis.js').then(async m=>{
      await m.learningWorkspace.navigate('puzzles');m.S.settings.moveAnim=${motion};m.S.settings.sound=true;m.S.settings.soundVolume=15;
      m.learningWorkspace.refreshSettings();
      window.startCues=[];window.readyMoves=[];window.readyStarted=performance.now();
      void m.learningWorkspace.startPuzzleRun('timeAttack');
    })`);
    await waitFor(review,"!!document.querySelector('.puzzle-run-start[data-step=\"3\"]')",'Countdown');
    await sleep(350);
    const state=await run(`import('./analysis.js').then(m=>{
      const w=m.learningWorkspace,e=document.querySelector('.puzzle-run-start'),b=e.parentElement.getBoundingClientRect(),r=e.getBoundingClientRect(),c=e.querySelector('.puzzle-run-start-card').getBoundingClientRect();
      return {clock:w.clockText(),started:w.run.clock.started,busy:w.busy,thinking:w.puzzleThinkingAt!=null,motion:e.dataset.motion,
        waiting:w.currentFen()===readyBefore&&!w.opponentPlaying&&!readyMoves.length,cursor:getComputedStyle(e).cursor,
        animation:getComputedStyle(e.querySelector('strong')).animationName,
        fits:Math.abs(r.left-b.left)<2&&Math.abs(r.right-b.right)<2&&Math.abs(r.top-b.top)<2&&Math.abs(r.bottom-b.bottom)<2,
        contained:c.left>=r.left&&c.right<=r.right&&c.top>=r.top&&c.bottom<=r.bottom};
    })`);
    assert.equal(state.clock,'3:00');assert.equal(state.started,false);assert.equal(state.busy,true);assert.equal(state.thinking,false);
    assert.equal(state.waiting,true);assert.equal(state.cursor,'default');
    assert.equal(state.motion,motion&&!reduced?'on':'off');assert.equal(state.animation==='none',!motion||reduced);
    assert.equal(state.fits,true);assert.equal(state.contained,true);
    const point=async square=>run(`(()=>{const r=document.querySelector('[data-square=${square}]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    const from=await point('e4'),to=await point('d5');
    await call('Input.dispatchMouseEvent',{type:'mousePressed',...from,button:'left',buttons:1,clickCount:1},review.sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',...to,button:'left',buttons:0,clickCount:1},review.sessionId);
    assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.run.correctMoves)"),0);
    await capture(`time-attack-ready-${width}-${reduced?'reduced':motion?'animated':'static'}`);
    await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace.run.clock.started&&!m.learningWorkspace.busy)",'Go unlocks play');
    assert.ok(await run('performance.now()-readyStarted>=3000'));
    assert.deepEqual(await run('startCues'),['3','2','1','Go!']);
    await waitFor(review,"!document.querySelector('.puzzle-run-start')",'Intro clears');
    await run("import('./analysis.js').then(m=>m.learningWorkspace.submitPuzzle('e4d5'))");
    assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.run.correctMoves)"),1);
  }
  await run("import('./analysis.js').then(async m=>{const w=m.learningWorkspace;await w.navigate('puzzles');void w.startPuzzleRun('timeAttack');})");
  await waitFor(review,"!!document.querySelector('.puzzle-run-start')",'Second countdown');
  await run("document.querySelector('[data-focus=puzzle-overview]').click()");
  await waitFor(review,"!!document.querySelector('.puzzle-mode-grid')&&!document.querySelector('.puzzle-run-start')",'Cancel returns to overview');
  await sleep(3200);
  assert.equal(await run("import('./analysis.js').then(m=>!m.learningWorkspace.run&&!m.learningWorkspace.activity&&!m.learningWorkspace.runStartOverlay)"),true);
  console.log(JSON.stringify({ok:true,out,checks:['three-second readiness countdown','clock and input gating','generated sound cue sequence','desktop and mobile layout','reduced motion','cancellation']},null,2));
}
