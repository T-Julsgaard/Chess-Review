import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(m=>m.openLearning())");
  await waitFor(review,"!!document.querySelector('.puzzle-mode-grid')&&!document.querySelector('.learn-transition-surface')",'Mode tickets');
  for(const [width,height] of [[1920,1080],[390,844],[320,740]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    for(const theme of ['dark','light']) {
      await run(`document.documentElement.dataset.theme='${theme}';document.querySelector('.puzzle-mode-grid').scrollIntoView({block:'center'})`);await sleep(500);
      const layout=await run(`(()=>{
        const grid=document.querySelector('.puzzle-mode-grid'),g=grid.getBoundingClientRect();
        const cards=[...grid.querySelectorAll('.puzzle-mode')].map(n=>{
          const b=n.querySelector('button'),r=b.getBoundingClientRect();
          return {x:r.x,y:r.y,width:r.width,height:r.height,fits:b.scrollWidth<=b.clientWidth+1};
        });
        return {cards,clip:{x:Math.max(0,g.x-8),y:Math.max(0,g.y-10),width:g.width+16,height:g.height+28,scale:1},overflow:grid.scrollWidth>grid.clientWidth+1};
      })()`);
      assert.equal(layout.overflow,false);
      assert.equal(layout.cards.length,3);
      for(const c of layout.cards) {
        assert.ok(c.fits&&c.x>=0&&c.x+c.width<=width+1);
        assert.ok(Math.abs(c.y-layout.cards[0].y)<1);
        assert.ok(Math.abs(c.height-layout.cards[0].height)<1);
      }
      const {data}=await call('Page.captureScreenshot',{format:'png',clip:layout.clip},review.sessionId);
      await fs.writeFile(path.join(out,`mode-tickets-${width}-${theme}.png`),Buffer.from(data,'base64'));
    }
  }
  const {nodes}=await call('Accessibility.getFullAXTree',{},review.sessionId);
  for(const name of ['Solve a puzzle','Time attack','Knockout'])assert.ok(nodes.some(n=>n.role?.value==='button'&&n.name?.value===name),'Clear accessible name: '+name);
  await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false},review.sessionId);
  await run("document.querySelector('.puzzle-mode-grid').scrollIntoView({block:'center'})");await sleep(500);
  const pointer=await run("(()=>{const r=document.querySelector('[data-focus=timeAttack]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',...pointer},review.sessionId);await sleep(450);
  const lift=await run("(()=>{const m=new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-mode=timeAttack] .puzzle-mode-surface')).transform);return [m.a,m.b,m.c,m.d,m.e,m.f]})()");
  assert.deepEqual(lift.slice(0,5),[1,0,0,1,0],'Hover keeps the ticket upright with no sideways movement');
  assert.ok(lift[5]<0&&lift[5]>=-3,'Hover lifts the ticket only slightly');
  assert.notEqual(await run("getComputedStyle(document.querySelector('.mode-timer')).transform"),'none','Artwork animates inside the upright ticket');
  for(const mode of ['solve-puzzle','timeAttack','knockout']) {
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0},review.sessionId);await sleep(300);
    const edge=await run(`(()=>{const r=document.querySelector('.puzzle-mode[data-mode="${mode}"] .puzzle-mode-button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.bottom-1};})()`);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',...edge},review.sessionId);
    const samples=await run(`new Promise(resolve=>{const samples=[],button=document.querySelector('.puzzle-mode[data-mode="${mode}"] .puzzle-mode-button');
      const frame=()=>{samples.push({top:button.getBoundingClientRect().top,cursor:getComputedStyle(document.elementFromPoint(${edge.x},${edge.y})).cursor});
        if(samples.length<45)requestAnimationFrame(frame);else resolve(samples.slice(-15));};requestAnimationFrame(frame);})`);
    assert.ok(Math.max(...samples.map(s=>s.top))-Math.min(...samples.map(s=>s.top))<.1,mode+': the button settles at the colored/record seam');
    assert.equal(new Set(samples.map(s=>s.cursor)).size,1,mode+': cursor does not flicker at the seam');
  }
  await run("document.querySelector('.learning-workspace').dataset.motion='off'");
  assert.equal(await run("getComputedStyle(document.querySelector('[data-mode=knockout] .puzzle-mode-surface')).transform"),'none','App motion preference suppresses hover movement');
  assert.equal(await run("getComputedStyle(document.querySelector('.mode-timer')).transform"),'none','App motion preference suppresses artwork movement');
  await run("document.querySelector('.learning-workspace').dataset.motion='on'");
  await run("document.querySelector('[data-focus=timeAttack]').focus()");
  assert.equal(await run("document.activeElement.matches('[data-focus=timeAttack]:focus-visible')"),true);
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
  assert.equal(await run("getComputedStyle(document.querySelector('[data-mode=timeAttack] .puzzle-mode-surface')).transitionDuration"),'0s');
  assert.equal(await run("getComputedStyle(document.querySelector('.mode-timer')).transitionDuration"),'0s');
  await run("import('./analysis.js').then(m=>{const w=m.learningWorkspace;w.puzzleRange=[9000,9100];w.updatePuzzleSelection();})");
  assert.equal(await run("[...document.querySelectorAll('.puzzle-mode-button')].every(n=>n.disabled)"),true);
  await run("import('./analysis.js').then(m=>{const w=m.learningWorkspace;w.puzzleRange=w.puzzleRatingBounds();w.updatePuzzleSelection();document.querySelector('[data-focus=solve-puzzle]').click();})");
  await waitFor(review,"!!document.querySelector('[data-focus=puzzle-overview]')",'Puzzle launch');
  console.log('Mode tickets: desktop/mobile, dark/light, accessibility, reduced motion, empty selection and puzzle launch passed. Screenshots: '+out);
}
