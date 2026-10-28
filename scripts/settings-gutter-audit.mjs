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
  await run("document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-tab')].find(n=>n.textContent==='Visual').click()");
  for (const [width,height] of [[1920,919],[390,844]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(200);
    for (const section of ['Tabs','Board & Pieces','Best-move/Threat arrow']) {
      await run(`(()=>{const head=[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent===${JSON.stringify(section)});if(head.getAttribute('aria-expanded')!=='true')head.click();head.scrollIntoView({block:'start'});})()`);
      if (section==='Tabs') {
        const choices=await run(`Object.fromEntries([...document.querySelectorAll('.set-section.open .set-dropdown')].map(field=>[field.querySelector('.lib-dd-btn').dataset.setting,[...field.querySelectorAll('.lib-dd-opt')].map(n=>n.textContent)]))`);
        assert.deepEqual(choices.accuracyDesign,['Original','Game phases']);
        assert.deepEqual(choices.accuracyQualityDesign,['Original','Category bars']);
        assert.deepEqual(choices.engineDesign,['Original','Minimal']);
        assert.ok(!choices.graphDesign.includes('Timeline v2'));
        assert.equal(choices.accuracyAdvancedDesign,undefined);
        assert.equal(choices.evalbarDesign,undefined);
        assert.deepEqual(choices.barStyle,['Gradient','Solid','Mono','Accent']);
        const nextTop=await run("document.querySelector('.lib-dd-btn[data-setting=accuracyQualityDesign]').getBoundingClientRect().top");
        await run("document.querySelector('.lib-dd-btn[data-setting=accuracyDesign]').click()");
        assert.equal(await run("document.querySelector('.lib-dd-btn[data-setting=accuracyQualityDesign]').getBoundingClientRect().top"),nextTop,'Opening a dropdown must overlay later settings without moving them');
        const bounds=await run(`(()=>{const settings=document.querySelector('#settings').getBoundingClientRect(),menu=document.querySelector('.set-dropdown.open .lib-dd-menu').getBoundingClientRect();return {left:menu.left,right:menu.right,min:settings.left,max:settings.right};})()`);
        assert.ok(bounds.left>=bounds.min&&bounds.right<=bounds.max,JSON.stringify(bounds));
      }
      if(section==='Best-move/Threat arrow')assert.ok(await run("document.querySelector('.set-section.open .set-sect-head > span').getBoundingClientRect().height<16"),'Arrow heading fits one line');
      assert.ok(await run("document.querySelector('#settings').scrollWidth<=document.querySelector('#settings').clientWidth+1"));
      const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
      await fs.writeFile(path.join(out,`cleanup-${section.replace(/[^a-z]/gi,'-')}-${width}.png`),Buffer.from(shot.data,'base64'));
    }
  }
  console.log('Settings gutter fits through live bookmarks-bar changes in both setups and both tabs. Evidence: '+out);
}
