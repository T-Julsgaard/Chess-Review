import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Disposable authored run summaries exercise wrapping without playing 26 puzzles.
export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(async m=>{m.S.settings.moveAnim=false;await m.openLearning();})");
  // Navigation shares its top/right anchor across the overview and every mode.
  const navigation=()=>run(`(()=>{
    const button=document.querySelector('[data-focus=puzzle-overview], [data-focus=puzzle-statistics]'),
      rect=button.getBoundingClientRect(),main=document.querySelector('.learn-main').getBoundingClientRect(),
      title=document.querySelector('.learn-main h2').getBoundingClientRect();
    return {top:rect.top-main.top,right:main.right-rect.right,height:rect.height,
      viewportTop:rect.top,viewportRight:rect.right,stacked:document.querySelector('.learning-workspace').classList.contains('learn-stacked'),
      overlap:rect.left<title.right&&rect.right>title.left&&rect.top<title.bottom&&rect.bottom>title.top,
      overflow:document.querySelector('.learn-main').scrollWidth>document.querySelector('.learn-main').clientWidth+1,
      label:button.textContent};
  })()`);
  const capture=async name=>{
    await run("import('./analysis.js').then(m=>m.learningWorkspace.scrollToTop())");
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  for(const [width,height] of [[1920,1080],[1280,800],[390,844],[320,640]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(1000);
    await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('puzzles'))");
    const overview=await navigation();
    assert.equal(overview.overlap,false);assert.equal(overview.overflow,false);
    await capture(`navigation-overview-${width}`);
    const aligned=async name=>{
      await sleep(100);
      const current=await navigation();
      assert.equal(current.label,'Return to puzzle overview');
      assert.ok(Math.abs(current.top-overview.top)<1&&Math.abs(current.right-overview.right)<1&&Math.abs(current.height-overview.height)<1,
        `${name} navigation must align with overview at ${width}px: ${JSON.stringify({overview,current})}`);
      assert.equal(current.stacked,overview.stacked);
      assert.ok(Math.abs(current.viewportRight-overview.viewportRight)<1,`${name} navigation must keep its screen position horizontally`);
      if(!overview.stacked)assert.ok(Math.abs(current.viewportTop-overview.viewportTop)<1,`${name} navigation must keep its screen position vertically`);
      assert.equal(current.overlap,false);assert.equal(current.overflow,false);
      await capture(`navigation-${name}-${width}`);
    };
    await run("import('./analysis.js').then(m=>m.learningWorkspace.showPuzzleStatistics(true))");await aligned('statistics');
    await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('puzzles'))");
    await run("import('./analysis.js').then(m=>m.learningWorkspace.startRatedPuzzles())");await aligned('practice');
    await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('puzzles'))");
    for(const mode of ['timeAttack','knockout']) {
      await run(`import('./analysis.js').then(m=>m.learningWorkspace.startPuzzleRun('${mode}'))`);await aligned(mode);
      await run("import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('Ended early'))");await aligned(mode+'-results');
      await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('puzzles'))");
    }
  }
  const grid=async()=>{
    const boxes=await run("(()=>{const list=document.querySelector('.puzzle-run-history'),r=list.getBoundingClientRect();return [...list.children].map(n=>{const b=n.getBoundingClientRect();return {left:b.left,top:b.top,width:b.width,height:b.height,right:b.right,listRight:r.right,fits:n.scrollWidth<=n.clientWidth+1&&(!n.firstElementChild.matches('button')||n.firstElementChild.scrollWidth<=n.firstElementChild.clientWidth+1)};});})()");
    assert.equal(boxes.length,26);
    const rows=new Map();
    for(const box of boxes){
      assert.ok(Math.abs(box.width-boxes[0].width)<1&&Math.abs(box.height-boxes[0].height)<1,'Puzzle cells must have uniform dimensions');
      assert.ok(box.right<=box.listRight+1,'Puzzle cells must fit their list');
      assert.ok(box.fits,'Puzzle ratings must fit their cells');
      const row=Math.round(box.top);if(!rows.has(row))rows.set(row,box.left);
    }
    assert.ok([...rows.values()].every(left=>Math.abs(left-boxes[0].left)<1),'Each wrapped row must start at the same position');
  };
  for(const mode of ['timeAttack','knockout']) {
    await run(`import('./analysis.js').then(async m=>{const w=m.learningWorkspace;await w.navigate('puzzles');await w.startPuzzleRun('${mode}');w.run.results=w.puzzles.slice(0,26).map((p,i)=>({id:p.id,number:i+1,rating:p.rating,correct:i%4!==3}));w.run.solved=20;w.run.bestEligible=false;w.render();})`);
    for(const [width,height] of [[1920,1080],[1280,800],[390,844],[320,640]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(300);
      await grid();
      assert.equal(await run("(()=>{const p=document.querySelector('.puzzle-run-panel'),cue=p.querySelector('.puzzle-practice-status').getBoundingClientRect(),list=p.querySelector('.puzzle-run-history').getBoundingClientRect();return cue.bottom<=list.top+1&&!p.querySelector('.puzzle-run-meta');})()"),true);
    }
    await run("import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('Out of lives'))");
    for(const [width,height] of [[1920,1080],[390,844],[320,640]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(300);await grid();
      const header=await run("(()=>{const h=document.querySelector('.puzzle-run-results h2'),b=document.querySelector('[data-focus=puzzle-overview]'),a=h.getBoundingClientRect(),c=b.getBoundingClientRect();return {title:h.textContent,center:a.top+a.height/2-c.top-c.height/2,below:a.top>=c.bottom+11,eyebrow:!!document.querySelector('.puzzle-run-results .learn-eyebrow')};})()");
      assert.equal(header.title,mode==='timeAttack'?'Time attack':'Knockout');assert.equal(header.eyebrow,false);assert.ok(Math.abs(header.center)<2||header.below,'Result heading must align with the overview button or sit below it in a narrow panel');
      await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=true;m.learningWorkspace.showPuzzleRunEnd();})");await sleep(450);
      const ending=await run("(()=>{const e=document.querySelector('.puzzle-run-end'),b=e.parentElement.getBoundingClientRect(),r=e.getBoundingClientRect();return {title:e.querySelector('strong').textContent,reason:e.querySelector('.puzzle-run-end-reason').textContent,motion:e.dataset.motion,animation:getComputedStyle(e).animationName,fits:Math.abs(r.left-b.left)<2&&Math.abs(r.right-b.right)<2&&Math.abs(r.top-b.top)<2&&Math.abs(r.bottom-b.bottom)<2};})()");
      assert.deepEqual(ending,{title:'Run over',reason:'Out of lives',motion:'on',animation:'puzzle-run-end-veil',fits:true});
      assert.equal(await run("document.querySelector('.puzzle-run-stats > div > span').textContent"),'Solved');
      assert.equal(await run("(()=>{const b=document.querySelector('[data-focus=run-again]');return b.getBoundingClientRect().width<180;})()"),true);
      const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,`${mode}-results-${width}.png`),Buffer.from(shot.data,'base64'));
    }
    await waitFor(review,"!document.querySelector('.puzzle-run-end')",'Board ending animation cleared');
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
    await run("import('./analysis.js').then(m=>m.learningWorkspace.showPuzzleRunEnd())");
    assert.equal(await run("(()=>{const e=document.querySelector('.puzzle-run-end');return e.dataset.motion==='off'&&getComputedStyle(e).animationName==='none'&&getComputedStyle(e.querySelector('.puzzle-flip-in')).animationName==='none';})()"),true);
    await run("import('./analysis.js').then(m=>m.learningWorkspace.cancelRunEnd())");
    await call('Emulation.setEmulatedMedia',{features:[]},review.sessionId);
    await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;})");
    const resultText=await run("(()=>{const r=document.querySelector('.puzzle-run-results').cloneNode(true);r.querySelector('.puzzle-practice-status')?.remove();return r.textContent;})()");
    await run("import('./analysis.js').then(m=>m.learningWorkspace.replayRunPuzzle(m.learningWorkspace.result.results[0].id))");
    await waitFor(review,"import('./analysis.js').then(m=>!m.learningWorkspace.busy)",'Replay ready');
    assert.equal(await run("document.querySelector('.puzzle-run-results h2').textContent"),mode==='timeAttack'?'Time attack':'Knockout');await grid();
    assert.equal(await run("document.querySelectorAll('.puzzle-run-history [aria-current=true]').length"),1);
    assert.equal(await run("(()=>{const r=document.querySelector('.puzzle-run-results').cloneNode(true);r.querySelector('.puzzle-practice-status')?.remove();return r.textContent;})()"),resultText);
    assert.equal(await run("!!document.querySelector('.puzzle-practice-actions, .puzzle-run-meta, [data-focus=replay-back], .puzzle-analyse')"),false);
    assert.match(await run("document.querySelector('.puzzle-practice-status').textContent"),/White to move|Black to move/);
    const saved=await run("import('./analysis.js').then(m=>JSON.stringify(m.learningWorkspace.store.value))");
    await run("import('./analysis.js').then(async m=>{const w=m.learningWorkspace,p=w.puzzleById(w.activity.id);while(!w.attemptRecorded)await w.submitMove(p.solution[w.activity.step]);})");
    assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.feedback.status)"),'completed');
    assert.equal(await run("import('./analysis.js').then(m=>JSON.stringify(m.learningWorkspace.store.value))"),saved);
    assert.equal(await run("(()=>{const r=document.querySelector('.puzzle-run-results').cloneNode(true);r.querySelector('.puzzle-practice-status')?.remove();return r.textContent;})()"),resultText);
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,`${mode}-replay-320.png`),Buffer.from(shot.data,'base64'));
    await run("import('./analysis.js').then(m=>m.learningWorkspace.returnToRunResults())");
  }
  await auditHistoryScrolling({review,call,evaluate,sleep});
  console.log('Run layout, history scrolling and in-place replay checks passed at 1920, 1280, 390 and 320 pixels. Screenshots: '+out);
}

export async function auditHistoryScrolling({review,call,evaluate,sleep}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(async m=>{m.S.settings.moveAnim=false;await m.openLearning();})");
  for(const mode of ['timeAttack','knockout']) {
    await run(`import('./analysis.js').then(async m=>{
      const w=m.learningWorkspace;await w.navigate('puzzles');await w.startPuzzleRun('${mode}');
      w.run.results=w.puzzles.slice(0,40).map((p,i)=>({id:p.id,number:i+1,rating:p.rating,correct:true}));
      w.run.solved=40;w.run.bestEligible=false;w.render();
    })`);
    const scrollState=()=>run(`(()=>{
      const list=document.querySelector('.puzzle-run-history'),last=list.lastElementChild.getBoundingClientRect(),rect=list.getBoundingClientRect();
      return {top:list.scrollTop,max:list.scrollHeight-list.clientHeight,visible:last.top>=rect.top-1&&last.bottom<=rect.bottom+1};
    })()`);
    for(const [width,height] of [[1280,800],[320,640]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(300);
      await run("import('./analysis.js').then(m=>{const list=document.querySelector('.puzzle-run-history');list.scrollTop=52;m.learningWorkspace.render();})");
      assert.equal((await scrollState()).top,52,'Redraws must preserve manual history scrolling');
      await run(`import('./analysis.js').then(async m=>{
        const w=m.learningWorkspace,id=w.activity.id;
        while(w.run&&w.activity.id===id)await w.submitPuzzle(w.puzzleById(id).solution[w.activity.step]);
      })`);
      const state=await scrollState();
      assert.ok(state.max>0,'The result history must overflow');
      assert.ok(Math.abs(state.top-state.max)<=1,'A solved puzzle must scroll its result into view');
      assert.equal(state.visible,true,'The newest result must fit inside the list');
      await run("import('./analysis.js').then(m=>m.learningWorkspace.render())");
      assert.ok(Math.abs((await scrollState()).top-state.max)<=1,'Following redraws must keep the newest result visible');
    }
  }
  console.log('Run history follows new results and preserves manual scrolling at 1280 and 320 pixels.');
}
