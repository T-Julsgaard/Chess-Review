import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Exercise the same live workspace across breakpoints. Reopening at every size
// hides stale board measurements and loses the activity state this audit checks.
export async function auditLearning({review,call,evaluate,sleep,out}) {
  const run=expression=>evaluate(review,expression),results=[];
  const resize=async(width,height)=>{
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(300);
  };
  const capture=async label=>{
    const data=await run(`(()=>{
      const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
      const root=document.querySelector('.learning-workspace'),status=root.querySelector('.puzzle-board-status'),clock=status?.querySelector('[data-board-clock]');
      return {width:innerWidth,height:innerHeight,board:rect(root.querySelector('.board')),shell:rect(root.querySelector('.learn-shell')),
        nav:rect(root.querySelector('.learn-nav')),navOverflow:root.querySelector('.learn-nav').scrollWidth-root.querySelector('.learn-nav').clientWidth,
        scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,stacked:root.classList.contains('learn-stacked'),error:document.querySelector('#error').textContent,
        status:status&&{...rect(status),visible:getComputedStyle(status).display!=='none',overflow:status.scrollWidth-status.clientWidth,clock:clock?.textContent,
          turnFits:status.querySelector('[data-board-status]').scrollWidth<=status.querySelector('[data-board-status]').clientWidth+1}};
    })()`);
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,label+'.png'),Buffer.from(shot.data,'base64'));
    results.push({label,...data});return data;
  };
  await run("document.querySelector('.learning-announcement-disable')?.click();import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.S.settings.sound=false;})");
  await resize(1920,960);
  await run("import('./analysis.js').then(m=>m.openLearning())");
  await run("import('./analysis.js').then(m=>{const w=m.learningWorkspace;globalThis.resizeAudit={workspace:w,board:w.boardElement,layout:JSON.stringify(m.S.layout),reviewIndex:m.S.idx};})");
  for(const [width,height]of [[1920,960],[1366,648],[1280,600],[390,844],[320,568],[844,390],[1024,768],[1366,648],[1920,960],[2560,1440],[3840,2160],[1920,960]]){
    await resize(width,height);const data=await capture('learning-resize-'+width+'x'+height);
    assert.equal(data.error,'');assert.equal(data.navOverflow,0,'Learning tabs must not clip: '+JSON.stringify(data));
    assert.ok(data.scrollWidth<=data.clientWidth+1,'Learning horizontal overflow: '+JSON.stringify(data));
    assert.ok(data.board.x>=0&&data.board.right<=width+1&&Math.abs(data.board.w-data.board.h)<1,'Square board bounds: '+JSON.stringify(data));
    assert.ok(data.shell.x>=0&&data.shell.right<=width+1,'Learning panel bounds: '+JSON.stringify(data));
    if(!data.stacked)assert.ok(data.shell.w>=340&&data.shell.x>=data.board.right+20,'Readable panel beside board: '+JSON.stringify(data));
    assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace===resizeAudit.workspace&&m.learningWorkspace.boardElement===resizeAudit.board&&m.S.idx===resizeAudit.reviewIndex&&JSON.stringify(m.S.layout)===resizeAudit.layout)"),true,'Resizing must preserve the workspace, board and saved review');
  }
  for(const page of ['openings','concepts','puzzles']){
    await run(`import('./analysis.js').then(m=>m.learningWorkspace.navigate('${page}'))`);
    for(const [width,height]of [[1920,960],[1366,648]]){
      await resize(width,height);const data=await capture(page+'-resized-'+width+'x'+height);
      assert.equal(data.navOverflow,0);assert.ok(data.shell.w>=340);
    }
  }
  await run("import('./analysis.js').then(async m=>{const w=m.learningWorkspace,p={id:'responsive-mate',fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',solution:['f7f8'],rating:1200,themes:['mateIn1']};w.puzzles=[p];await w.startPuzzleSelection([p]);globalThis.resizeAudit.activity=w.activity;globalThis.resizeAudit.history=w.puzzleHistory;})");
  for(const [width,height]of [[1920,960],[1366,648],[390,844],[320,568],[1366,648]]){
    await resize(width,height);await capture('puzzle-resize-'+width+'x'+height);
    assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.activity===resizeAudit.activity&&m.learningWorkspace.puzzleHistory===resizeAudit.history&&m.learningWorkspace.currentFen()==='7k/5Q2/6K1/8/8/8/8/8 w - - 0 1')"),true,'Resize must preserve the active puzzle and move history');
  }
  for(const mode of ['timeAttack','knockout']){
    await run(`import('./analysis.js').then(async m=>{const w=m.learningWorkspace;await w.navigate('puzzles');await w.startPuzzleRun('${mode}');if(w.run.clock){w.run.clock.pause();w.run.clock.remainingMs=61000;w.updateClock();}resizeAudit.run=w.run;})`);
    for(const [width,height]of [[320,568],[390,844],[430,932],[568,320],[844,390],[820,600],[1024,768],[1366,648],[1920,960],[320,568]]){
      await resize(width,height);await run("document.querySelector('.learning-workspace').scrollTop=0");
      const data=await capture(mode+'-board-status-'+width+'x'+height);
      assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.run===resizeAudit.run)"),true,'Resize must not restart a timed run');
      if(data.stacked){
        assert.ok(data.status.visible&&data.status.y>=data.board.bottom&&data.status.bottom<=height,'Puzzle status must fit beside the visible board: '+JSON.stringify(data));
        assert.ok(data.status.x>=0&&data.status.right<=width&&data.status.overflow<=1,'Compact status must not clip: '+JSON.stringify(data));
        assert.equal(data.status.turnFits,true,'The turn instruction must remain readable on short landscape boards');
        assert.ok(data.board.y>=52&&data.board.bottom<=height,'Entire puzzle board remains visible');
        if(mode==='timeAttack')assert.equal(data.status.clock,'1:01');
      }else assert.equal(data.status.visible,false,'Desktop keeps its existing dashboard');
    }
    if(mode==='timeAttack'){
      await run("import('./analysis.js').then(m=>{m.learningWorkspace.run.clock.remainingMs=23000;m.learningWorkspace.updateClock();})");
      assert.equal(await run("[...document.querySelectorAll('#learn-clock, [data-board-clock]')].every(n=>n.textContent==='0:23'&&n.classList.contains('running-low'))"),true,'Both countdown displays follow the same clock and low-time cue');
      await capture('time-attack-low-time-320x568');
    }
    await run("import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('Audit complete'))");
    assert.equal(await run("document.querySelector('.puzzle-board-status')"),null,'Completed runs remove the compact status');
  }
  await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
  for(const [width,height]of [[1280,600],[1280,599],[1280,560],[1280,520],[1280,480],[1366,560],[1366,480],[1100,480],[1920,560]]){
    await resize(width,height);await run('scrollTo(0,0)');
    const data=await run(`(()=>{
      const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
      return {width:innerWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight,
        modules:[...document.querySelectorAll('.stage .mod')].filter(n=>!n.hidden&&getComputedStyle(n).display!=='none').map(n=>({key:n.dataset.mod,...rect(n)})),
        buttons:[...document.querySelectorAll('.controls button')].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return {...rect(n),hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})};
    })()`);
    const label='review-short-'+width+'x'+height,shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,label+'.png'),Buffer.from(shot.data,'base64'));results.push({label,...data});
    assert.ok(data.scrollHeight<=height+1,'Short laptop review must fit the viewport: '+JSON.stringify(data));
    for(const box of data.modules)assert.ok(box.x>=0&&box.y>=50&&box.right<=width+1&&box.bottom<=height+1&&box.w>0&&box.h>0,'Visible review module bounds: '+JSON.stringify(box));
    for(const button of data.buttons)assert.ok(button.y>=52&&button.bottom<=height&&button.hit,'Review navigation must remain visible and clickable: '+JSON.stringify(button));
    const panels=data.modules.filter(n=>!['coach','evalbar'].includes(n.key));
    for(const [i,a]of panels.entries())for(const b of panels.slice(i+1))assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<1,'Short review panels overlap: '+a.key+'/'+b.key);
  }
  const reviewIndex=await run("import('./analysis.js').then(m=>m.S.idx)");
  await run("document.querySelector('.controls button[aria-label=Next]').click()");
  assert.equal(await run("import('./analysis.js').then(m=>m.S.idx)"),reviewIndex+1,'Short-window navigation still advances the real game');
  await fs.writeFile(path.join(out,'responsive-layout.json'),JSON.stringify(results,null,2));
  console.log('Responsive live resize checks passed. Screenshots and measurements: '+out);
}
