import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Simulate the content height gained by hiding browser chrome in the same tab.
export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression),results=[];
  const resize=async(width,height)=>{
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(150);
  };
  await run("document.querySelector('.learning-announcement-disable')?.click();import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.S.settings.sound=false;})");
  for(const setup of ['old','modern']){
    await resize(1920,919);
    await run(`import('./analysis.js').then(m=>m.applyUiSetup('${setup}'))`);
    const saved=await run("import('./analysis.js').then(async m=>({layout:JSON.stringify(m.S.layout),stored:JSON.stringify((await chrome.storage.local.get('layout')).layout),index:m.S.idx}))");
    let baseline;
    for(const [width,height]of [[1920,919],[1920,949],[1920,979],[1920,1080],[1920,919],[1600,979],[1366,648],[2560,1440]]){
      await resize(width,height);
      const data=await run(`(async()=>{
        const m=await import('./analysis.js'),rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
        return {width:innerWidth,height:innerHeight,zoom:await chrome.tabs.getZoom(),board:rect(document.querySelector('.stage .board')),
          scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,
          modules:[...document.querySelectorAll('.stage .mod')].filter(n=>!n.hidden&&getComputedStyle(n).display!=='none').map(n=>({key:n.dataset.mod,...rect(n)})),
          saved:{layout:JSON.stringify(m.S.layout),stored:JSON.stringify((await chrome.storage.local.get('layout')).layout),index:m.S.idx}};
      })()`);
      assert.deepEqual(data.saved,saved,'Resizing must preserve the review and saved layout');
      assert.equal(data.zoom,1);assert.ok(data.scrollW<=width+1&&data.scrollH<=height+1);
      assert.ok(Math.abs(data.board.w-data.board.h)<1,'The board stays square');
      for(const box of data.modules)assert.ok(box.x>=0&&box.y>=50&&box.right<=width+1&&box.bottom<=height+1,JSON.stringify({setup,width,height,box}));
      const panels=data.modules.filter(n=>!['coach','evalbar'].includes(n.key));
      for(const [i,a]of panels.entries())for(const b of panels.slice(i+1))assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<1,`${setup}: ${a.key}/${b.key} overlap`);
      if(width===1920){
        if(height===919){if(baseline)assert.ok(Math.abs(data.board.w-baseline)<1);else baseline=data.board.w;}
        else assert.ok(data.board.w>baseline,'Extra height should enlarge the board');
      }
      const label=`${setup}-${width}x${height}`;
      const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
      await fs.writeFile(path.join(out,label+'.png'),Buffer.from(shot.data,'base64'));
      results.push({label,...data});
    }
    await resize(1920,949);
    await run("import('./analysis.js').then(m=>m.openLearning())");
    await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Learning');
    for(const height of [919,949,979,919]){
      await resize(1920,height);
      const board=await run("(()=>{const r=document.querySelector('.learning-embedded .board').getBoundingClientRect();return {w:r.width,h:r.height,bottom:r.bottom};})()");
      assert.ok(Math.abs(board.w-board.h)<1&&board.bottom<=height+1);
    }
    await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
  }
  await fs.writeFile(path.join(out,'viewport-growth.json'),JSON.stringify(results,null,2));
  console.log('Viewport growth checks passed for Old and Modern. Screenshots and measurements: '+out);
}
