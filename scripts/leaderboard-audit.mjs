import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.S.settings.uiAnim=true;return m.openLearning();})");
  await waitFor(review,"!!document.querySelector('.puzzle-mode-grid')&&!document.querySelector('.learn-transition-surface')",'Puzzle modes');
  // Deliberate test data lives only in this isolated profile, never the product.
  await run(`import('./analysis.js').then(({learningWorkspace:w})=>{w.leaderboardPreferences={enabled:true};w.leaderboardClient={configured:true,endpoint:'https://leaderboard.example',credentials:async()=>({id:'you',name:'Knight-a13f08c5d2'}),
    list:async(mode,page)=>{await window.leaderboardReadDelay;return {rows:Array.from({length:27},(_,i)=>({id:i===13?'you':'player-'+i,name:i===13?'Knight-a13f08c5d2':'Knight-'+((i+1)*2654435761>>>0).toString(16).padStart(8,'0')+'e2',country:['DK','2','XE'][i%3],score:mode==='solve-puzzle'?1854-i*39:mode==='timeAttack'?72-Math.floor(i*1.5):46-i})).slice((page-1)*10,page*10),hasNext:page<3};}};})`);
  for(const [width,height] of [[1920,1080],[390,844],[320,740]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    for(const theme of ['dark','light']) {
      // The product currently fixes a dark app background; simulate the alternate
      // surface too so the component's contrast can be checked independently.
      await run(`document.documentElement.dataset.theme='${theme}';document.querySelector('#root > .app').style.background= 'var(--bg)'`);
      for(const mode of ['solve-puzzle','timeAttack','knockout']) {
        await run('window.leaderboardReadDelay=new Promise(resolve=>{window.finishLeaderboardRead=resolve;});void 0');
        await run("document.querySelector('.puzzle-mode-grid').scrollIntoView({block:'center'})");
        const pointer=await run(`(()=>{const r=document.querySelector('[data-focus=leaderboard-${mode}]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
        await call('Input.dispatchMouseEvent',{type:'mouseMoved',...pointer},review.sessionId);await sleep(300);
        await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pointer},review.sessionId);await sleep(80);
        const entrance=await run(`import('./analysis.js').then(({learningWorkspace:w})=>{
          const source=document.querySelector('.puzzle-mode[data-mode="${mode}"] .puzzle-mode-button').getBoundingClientRect(),expected=[source.x,source.y,source.width,source.height];
          window.leaderboardOpening=w.showLeaderboard('${mode}');const hero=window.openingHero=document.querySelector('.leaderboard-hero'),backdrop=document.querySelector('.leaderboard-backdrop'),button=backdrop?.querySelector('[data-focus=leaderboard-${mode}]');
          const animation=hero.getAnimations()[0];animation.pause();animation.currentTime=0;
          const r=hero.getBoundingClientRect(),clip=getComputedStyle(hero).clipPath.slice(6).split(' round')[0].split(' ').map(parseFloat),[top,right,bottom,left]=clip;
          const actual=[r.x+r.width*left/100,r.y,r.width*(1-(left+right)/100),r.height*(1-bottom/100)];
          const original=backdrop.querySelector('.puzzle-mode[data-mode="${mode}"] .puzzle-mode-button').getBoundingClientRect(),fading=[original.x,original.y,original.width,original.height];
          animation.play();return {expected,actual,fading,frames:hero.getAnimations().map(a=>a.effect.getKeyframes().map(f=>({clipPath:f.clipPath,transform:f.transform}))),footerFits:!backdrop||button.getBoundingClientRect().bottom<=backdrop.getBoundingClientRect().bottom+2};})`);
        await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pointer},review.sessionId);
        for(const key of ['actual','fading'])entrance[key].forEach((value,index)=>assert.ok(Math.abs(value-entrance.expected[index])<.5,`${mode}/${width}/${theme}: ${key} starts at the pressed colored button`));
        if(width===1920&&theme==='dark') {
          const frames=entrance.frames;
          assert.ok(frames.length,'Expansion is animated');const first=frames[0][0],last=frames[0].at(-1);
          assert.notEqual(first.clipPath,last.clipPath);assert.equal(last.transform,'translateY(0px)');
          assert.equal(entrance.footerFits,true,'Original leaderboard footer is not cropped on click');
          await sleep(80);
          assert.equal(await run("window.openingHero===document.querySelector('.leaderboard-hero')"),true,'Immediate data does not detach the animating card');
          const clip=await run(`(()=>{const hero=document.querySelector('.leaderboard-hero').getBoundingClientRect(),backdrop=document.querySelector('.leaderboard-backdrop')?.getBoundingClientRect();
            return {x:hero.x-6,y:Math.min(hero.y,backdrop?.y??hero.y)-6,width:hero.width+12,height:Math.max(hero.bottom,backdrop?.bottom??hero.bottom)-Math.min(hero.y,backdrop?.y??hero.y)+12,scale:1}})()`);
          const {data}=await call('Page.captureScreenshot',{format:'png',clip},review.sessionId);
          await fs.writeFile(path.join(out,`entrance-${mode}.png`),Buffer.from(data,'base64'));
        }
        await waitFor(review,"!!document.querySelector('.leaderboard-empty')&&!document.querySelector('.leaderboard-entering')",'Loading leaderboard');
        await sleep(100);
        const loadingHeight=await run("document.querySelector('.leaderboard-table-wrap').getBoundingClientRect().height");
        await run('window.finishLeaderboardRead();window.leaderboardOpening');await sleep(100);
        const loadedHeight=await run("document.querySelector('.leaderboard-table-wrap').getBoundingClientRect().height");
        assert.ok(Math.abs(loadingHeight-loadedHeight)<1,`${mode}/${width}/${theme}: loading height ${loadingHeight} matches loaded height ${loadedHeight}`);
        const layout=await run(`(()=>{const s=document.querySelector('.learn-leaderboard'),r=s.getBoundingClientRect();return {overflow:s.scrollWidth>s.clientWidth+1,x:r.x,width:r.width,
          hero:document.querySelector('.leaderboard-hero').getBoundingClientRect().width,rows:s.querySelectorAll('tbody tr').length,focus:document.activeElement.id,
          clip:{x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(innerWidth-Math.max(0,r.x-8),r.width+16),height:Math.min(innerHeight-Math.max(0,r.y-8),r.height+16),scale:1}}})()`);
        assert.equal(layout.overflow,false,`${mode}/${width}/${theme}: no horizontal overflow`);
        assert.equal(layout.rows,10);assert.equal(layout.focus,'leaderboard-title');assert.ok(layout.hero<=layout.width+1);
        assert.equal(await run("!!document.querySelector('.leaderboard-toolbar h3')"),false);
        assert.equal(await run("[...document.querySelectorAll('.leaderboard-flag')].every(img=>img.complete&&img.naturalWidth>0)"),true);
        await run("document.querySelector('.leaderboard-flag').dispatchEvent(new MouseEvent('mouseenter'))");
        assert.equal(await run("document.querySelector('[role=tooltip]').textContent"),'Denmark');
        await run("document.querySelector('.leaderboard-flag').dispatchEvent(new MouseEvent('mouseleave'))");
        assert.equal(await run("getComputedStyle(document.querySelector('.leaderboard-table caption')).position"),'absolute');
        assert.equal(await run("getComputedStyle(document.querySelector('.leaderboard-hero p')).color"),'rgb(65, 69, 53)');
        assert.ok(layout.x>=0&&layout.x+layout.width<=width+1);
        const {data}=await call('Page.captureScreenshot',{format:'png',clip:layout.clip},review.sessionId);
        await fs.writeFile(path.join(out,`leaderboard-${mode}-${width}-${theme}.png`),Buffer.from(data,'base64'));
        const scroll=await run("(()=>{const main=document.querySelector('.learn-main');main.scrollTop=Math.min(160,main.scrollHeight-main.clientHeight);return main.scrollTop;})()");
        await run("document.querySelector('[data-focus=leaderboard-next]').click()");
        await waitFor(review,"document.querySelector('.leaderboard-rank')?.textContent==='11'",'Next leaderboard page');
        assert.ok(Math.abs(await run("document.querySelector('.learn-main').scrollTop")-scroll)<1,'Pagination preserves the panel scroll position');
        await run("document.querySelector('[data-focus=leaderboard-return]').click()");
        assert.equal(await run(`document.activeElement.dataset.focus`),'leaderboard-'+mode);
      }
    }
  }
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
  await run("import('./analysis.js').then(m=>m.learningWorkspace.showLeaderboard('knockout'))");
  assert.equal(await run("document.querySelector('.leaderboard-hero').getAnimations().length"),0);
  await run("document.querySelector('[data-focus=leaderboard-return]').click()");
  await run("import('./analysis.js').then(m=>{m.learningWorkspace.root.dataset.motion='off';m.learningWorkspace.settings=()=>({uiAnim:false});return m.learningWorkspace.showLeaderboard('timeAttack');})");
  assert.equal(await run("document.querySelector('.leaderboard-hero').getAnimations().length"),0);
  await run("document.querySelector('[data-focus=leaderboard-return]').click()");
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]},review.sessionId);
  await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1500,deviceScaleFactor:1,mobile:false},review.sessionId);
  await run(`document.documentElement.dataset.theme='dark';document.querySelector('#root > .app').style.background='var(--bg)';
    const style=document.createElement('style');style.textContent='.leaderboard-capture.learning-embedded {inset:0;overflow:visible} .leaderboard-capture .learn-shell {position:absolute;left:0!important;top:0!important;width:680px!important;height:auto!important;max-height:none!important;transform:none!important;overflow:visible;display:block} .leaderboard-capture .learn-main {overflow:visible;max-height:none;height:auto;flex:none;padding:24px!important} .leaderboard-capture .learn-board-dock,.leaderboard-capture .learn-nav,.leaderboard-capture .learn-footer {display:none!important}';document.head.append(style)`);
  for(const mode of ['solve-puzzle','timeAttack','knockout']) {
    await run(`import('./analysis.js').then(async({learningWorkspace:w})=>{await w.showLeaderboard('${mode}');w.root.classList.add('leaderboard-capture');})`);
    for(const page of [1,2,3]) {
      if(page>1)await run(`import('./analysis.js').then(m=>m.learningWorkspace.loadLeaderboard(${page}))`);
      await sleep(100);
      const capture=await run(`(()=>{const s=document.querySelector('.learn-leaderboard'),r=s.getBoundingClientRect();return {rows:s.querySelectorAll('tbody tr').length,rank:s.querySelector('.leaderboard-rank').textContent,
        pagination:s.querySelector('.leaderboard-pagination').textContent,clip:{x:r.x-16,y:r.y-16,width:r.width+32,height:r.height+32,scale:1}}})()`);
      assert.equal(capture.rows,page===3?7:10);assert.equal(Number(capture.rank),(page-1)*10+1);assert.match(capture.pagination,new RegExp('Page '+page));
      const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:capture.clip},review.sessionId);
      await fs.writeFile(path.join(out,`preview-${mode}-page-${page}.png`),Buffer.from(data,'base64'));
    }
    await run("import('./analysis.js').then(m=>{m.learningWorkspace.root.classList.remove('leaderboard-capture');m.learningWorkspace.returnFromLeaderboard();})");
  }
  console.log('Leaderboards: three mode expansions, pagination, focus, dark/light, desktop/mobile, and reduced motion passed. Screenshots: '+out);
}
