import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Keep Settings open while browser chrome changes the available panel gutter.
export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression),results=[];
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  for(const setup of ['old','modern']){
    await run(`import('./analysis.js').then(m=>m.applyUiSetup('${setup}'))`);
    await run("document.querySelector('[aria-label=Settings]').click()");
    for(const [width,height] of [[1920,919],[1920,949],[1920,979],[1920,919],[2560,1280],[1366,648],[390,844]]){
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
      await sleep(200);
      for(const tab of ['Visual','Engine']){
        await run(`[...document.querySelectorAll('.set-tab')].find(n=>n.textContent==='${tab}').click()`);
        const data=await run(`(()=>{
          const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width};};
          const settings=document.querySelector('#settings'),r=settings.getBoundingClientRect();
          return {settings:rect(settings),topbar:rect(document.querySelector('.topbar')),
            panelsRight:Math.max(...[...document.querySelectorAll('.stage .mod')].filter(n=>!n.hidden&&getComputedStyle(n).display!=='none').map(n=>n.getBoundingClientRect().right)),
            hit:settings.contains(document.elementFromPoint(r.x+r.width/2,r.y+20)),
            overflow:settings.scrollWidth-settings.clientWidth};
        })()`);
        results.push({setup,width,height,tab,...data});
        await fs.writeFile(path.join(out,'settings-gutter.json'),JSON.stringify(results,null,2));
        const context=JSON.stringify(results.at(-1));
        assert.ok(data.settings.x>=0&&data.settings.right<=width+1&&data.settings.bottom<=height+1,context);
        assert.ok(data.settings.y>=data.topbar.bottom&&data.hit&&data.overflow<=1,context);
        if(width===1920||width===2560)assert.ok(data.settings.x>=data.panelsRight+11,context);
        if(tab==='Visual'){
          const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
          await fs.writeFile(path.join(out,`${setup}-${width}x${height}.png`),Buffer.from(shot.data,'base64'));
        }
      }
    }
    await run("document.querySelector('[aria-label=Settings]').click()");
  }
  console.log('Settings gutter fits through live bookmarks-bar changes in both setups and both tabs. Evidence: '+out);
}
