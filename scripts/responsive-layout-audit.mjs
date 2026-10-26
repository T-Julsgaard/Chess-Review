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
      const root=document.querySelector('.learning-workspace');
      return {width:innerWidth,height:innerHeight,board:rect(root.querySelector('.board')),shell:rect(root.querySelector('.learn-shell')),
        nav:rect(root.querySelector('.learn-nav')),navOverflow:root.querySelector('.learn-nav').scrollWidth-root.querySelector('.learn-nav').clientWidth,
        scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,stacked:root.classList.contains('learn-stacked'),error:document.querySelector('#error').textContent};
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
  await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
  await fs.writeFile(path.join(out,'responsive-layout.json'),JSON.stringify(results,null,2));
  console.log('Responsive live resize checks passed. Screenshots and measurements: '+out);
}
