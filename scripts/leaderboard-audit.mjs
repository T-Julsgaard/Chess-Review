import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(m=>m.openLearning())");
  await waitFor(review,"!!document.querySelector('.puzzle-mode-grid')&&!document.querySelector('.learn-transition-surface')",'Puzzle modes');
  // Deliberate test data lives only in this isolated profile, never the product.
  await run(`import('./analysis.js').then(({learningWorkspace:w})=>{w.leaderboardClient={configured:true,endpoint:'https://leaderboard.example',credentials:async()=>({id:'you',name:'Knight-a13f08c5d2'}),
    list:async(mode,page)=>({rows:Array.from({length:10},(_,i)=>({id:i===3?'you':'player-'+i,name:i===3?'Knight-a13f08c5d2':'Knight-'+String(9876543210-i*2377),score:mode==='solve-puzzle'?1854-i*93:mode==='timeAttack'?72-i*3:46-i*2})),hasNext:page===1})};})`);
  for(const [width,height] of [[1920,1080],[390,844],[320,740]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    for(const theme of ['dark','light']) {
      // The product currently fixes a dark app background; simulate the alternate
      // surface too so the component's contrast can be checked independently.
      await run(`document.documentElement.dataset.theme='${theme}';document.querySelector('#root > .app').style.background= 'var(--bg)'`);
      for(const mode of ['solve-puzzle','timeAttack','knockout']) {
        const frames=await run(`import('./analysis.js').then(async({learningWorkspace:w})=>{await w.showLeaderboard('${mode}');const hero=document.querySelector('.leaderboard-hero');return hero.getAnimations().map(a=>a.effect.getKeyframes().map(f=>({width:f.width,marginLeft:f.marginLeft})));})`);
        if(width===1920&&theme==='dark') {
          assert.ok(frames.length,'Expansion is animated');const first=frames[0][0],last=frames[0].at(-1);
          assert.ok(parseFloat(last.width)>parseFloat(first.width)*2.5);
          assert.equal(mode==='solve-puzzle'?parseFloat(first.marginLeft)===0:parseFloat(first.marginLeft)>0,true);
        }
        await sleep(650);
        const layout=await run(`(()=>{const s=document.querySelector('.learn-leaderboard'),r=s.getBoundingClientRect();return {overflow:s.scrollWidth>s.clientWidth+1,x:r.x,width:r.width,
          hero:document.querySelector('.leaderboard-hero').getBoundingClientRect().width,rows:s.querySelectorAll('tbody tr').length,focus:document.activeElement.id,
          clip:{x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(innerWidth-Math.max(0,r.x-8),r.width+16),height:Math.min(innerHeight-Math.max(0,r.y-8),r.height+16),scale:1}}})()`);
        assert.equal(layout.overflow,false,`${mode}/${width}/${theme}: no horizontal overflow`);
        assert.equal(layout.rows,10);assert.equal(layout.focus,'leaderboard-title');assert.ok(layout.hero<=layout.width+1);
        assert.equal(await run("getComputedStyle(document.querySelector('.leaderboard-table caption')).position"),'absolute');
        assert.equal(await run("getComputedStyle(document.querySelector('.leaderboard-hero p')).color"),'rgb(65, 69, 53)');
        assert.ok(layout.x>=0&&layout.x+layout.width<=width+1);
        const {data}=await call('Page.captureScreenshot',{format:'png',clip:layout.clip},review.sessionId);
        await fs.writeFile(path.join(out,`leaderboard-${mode}-${width}-${theme}.png`),Buffer.from(data,'base64'));
        await run("document.querySelector('[data-focus=leaderboard-next]').click()");
        await waitFor(review,"document.querySelector('.leaderboard-rank')?.textContent==='11'",'Next leaderboard page');
        await run("document.querySelector('[data-focus=leaderboard-return]').click()");
        assert.equal(await run(`document.activeElement.dataset.focus`),'leaderboard-'+mode);
      }
    }
  }
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
  await run("import('./analysis.js').then(m=>m.learningWorkspace.showLeaderboard('knockout'))");
  assert.equal(await run("document.querySelector('.leaderboard-hero').getAnimations().length"),0);
  await run("document.querySelector('[data-focus=leaderboard-return]').click()");
  await run("import('./analysis.js').then(m=>{m.learningWorkspace.root.dataset.motion='off';m.learningWorkspace.settings=()=>({moveAnim:false});return m.learningWorkspace.showLeaderboard('timeAttack');})");
  assert.equal(await run("document.querySelector('.leaderboard-hero').getAnimations().length"),0);
  console.log('Leaderboards: three mode expansions, pagination, focus, dark/light, desktop/mobile, and reduced motion passed. Screenshots: '+out);
}
