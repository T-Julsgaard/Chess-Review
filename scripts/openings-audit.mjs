import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {OPENINGS} from '../lib/learning/content.js';

// Run with: node scripts/learning-browser.mjs --working-tree --openings
export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression),results=[];
  const press=async(key,value)=>{for(const type of ['keyDown','keyUp'])await call('Input.dispatchKeyEvent',{type,key,code:key,windowsVirtualKeyCode:value,nativeVirtualKeyCode:value},review.sessionId);};
  await run("document.querySelector('.learn-entry-button').click()");
  await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Learning workspace');
  // Exercise library entry, not just startOpening with an explicit perspective.
  const defaults=await run(`import('./analysis.js').then(async m=>{
    const {OPENINGS}=await import('./lib/learning/content.js'),w=m.learningWorkspace,results=[];
    for(const o of OPENINGS){
      await w.navigate('openings');
      const row=[...w.root.querySelectorAll('.learn-library-row')].find(row=>row.querySelector('h3').textContent===o.title);
      row.querySelector('button').click();
      for(let i=0;i<100&&!w.root.querySelector('.learn-opening-view');i++)await new Promise(requestAnimationFrame);
      results.push({id:w.activity.id,color:w.activity.color,flipped:w.flipped,ply:w.activity.ply});
    }
    await w.navigate('openings');return results;
  })`);
  assert.deepEqual(defaults,OPENINGS.map(o=>({id:o.id,color:o.defaultColor,flipped:o.defaultColor==='b',ply:0})));
  assert.equal(await run("document.querySelector('[data-focus=color]').getAttribute('aria-label')"),'View as');
  const rect=selector=>`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right};})()`;
  for(const [width,height] of [[1920,1080],[1366,768],[960,768],[390,844],[320,640]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(200);
    await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('openings'))");
    assert.deepEqual(await run("[...document.querySelectorAll('.learn-library-row h3')].map(n=>n.textContent)"),OPENINGS.map(o=>o.title));
    const libraryScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},review.sessionId);
    await fs.writeFile(path.join(out,`opening-library-${width}.png`),Buffer.from(libraryScreenshot.data,'base64'));
    await run(`import('./analysis.js').then(async m=>{
      const {Chess}=await import('./lib/chess.js'),w=m.learningWorkspace;
      w.homePosition=new Chess('7k/8/8/8/8/8/8/K7 w - - 0 1');w.render();
      [...w.root.querySelectorAll('.learn-library-row')].find(row=>row.querySelector('h3').textContent==='Sicilian Defense').querySelector('button').click();
    })`);
    await waitFor(review,"!!document.querySelector('.board.puzzle-arranging .puzzle-piece-transition')",'Opening piece assembly');
    assert.equal(await run("document.querySelectorAll('.puzzle-transition-piece').length"),32);
    const assemblyScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},review.sessionId);
    await fs.writeFile(path.join(out,`opening-assembly-${width}.png`),Buffer.from(assemblyScreenshot.data,'base64'));
    await waitFor(review,"!document.querySelector('.puzzle-piece-transition')",'Opening assembly completion');
    assert.equal(await run("document.querySelectorAll('.board .sq img').length"),32);
    assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.flipped)"),true);
    await run(`import('./analysis.js').then(m=>{
      const w=m.learningWorkspace;w.stepOpening(6);
      w.root.querySelector('[data-focus="opening-variation"]').click();
      w.dropdown.field.querySelectorAll('[role="option"]')[1].click();
    })`);
    await waitFor(review,"!!document.querySelector('.puzzle-piece-transition')",'Opening variation assembly');
    await waitFor(review,"!document.querySelector('.puzzle-piece-transition')",'Opening variation assembly completion');
    await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('openings'))");
    await waitFor(review,"!document.querySelector('.puzzle-piece-transition')",'Opening library return assembly');
    const libraryScroll=()=>run("(()=>{const w=document.querySelector('.learning-workspace'),m=w.querySelector('.learn-main');return {root:w.scrollTop,main:m.scrollTop};})()");
    await run("document.querySelector('.learning-workspace').scrollTop=600;document.querySelector('.learn-main').scrollTop=600");
    const scrolled=await libraryScroll();
    assert.ok(scrolled.root>0||scrolled.main>0,'Library must actually scroll at '+width);
    const entryFrames=await run(`import('./analysis.js').then(async m=>{
      const w=m.learningWorkspace,persist=w.persist;
      let release,saving;const gate=new Promise(resolve=>{release=resolve;});
      w.persist=change=>(saving=gate.then(()=>persist.call(w,change)));
      const frames=[];
      try {
        w.root.querySelector('.learn-library-row:last-child > button').click();
        for(let i=0;i<3;i++) {
          await new Promise(requestAnimationFrame);
          frames.push({library:!!w.root.querySelector('.learn-library'),root:w.root.scrollTop,main:w.root.querySelector('.learn-main').scrollTop});
        }
      } finally {release();await saving;w.persist=persist;}
      return frames;
    })`);
    assert.ok(entryFrames.every(frame=>frame.library&&frame.root===scrolled.root&&frame.main===scrolled.main),
      'Study must keep the library at its saved position until the opening is ready: '+JSON.stringify({width,scrolled,entryFrames}));
    await waitFor(review,"!!document.querySelector('.learn-opening-view')",'Opening study view');
    await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('openings'))");
    assert.deepEqual(await libraryScroll(),scrolled,'Opening return restores library scroll at '+width);
    await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('puzzles'))");
    const board=await run(rect('.board'));
    for(const color of ['w','b']) {
      await run(`import('./analysis.js').then(m=>m.learningWorkspace.startOpening('italian',{color:'${color}'}))`);
      const openingBoard=await run(rect('.board'));
      // Stacked layouts scroll between the board and panel on navigation.
      for(const key of width>=1366?['x','y','width','height']:['width','height'])assert.ok(Math.abs(openingBoard[key]-board[key])<1,'Opening must keep puzzle board '+key+' at '+width);
      assert.deepEqual(await run("[...document.querySelectorAll('.learn-nav button')].map(n=>n.textContent)"),['Puzzles','Openings','Concepts']);
      assert.equal(await run("(()=>{const b=document.querySelector('[data-focus=opening-library]'),head=b.closest('.learn-activity-head');return b.classList.contains('learn-statistics-button')&&Math.abs(b.getBoundingClientRect().right-head.getBoundingClientRect().right)<1;})()"),true,'Opening return must use the puzzle-return style at the right edge');
      assert.equal(await run("document.querySelectorAll('.learn-opening-controls button').length"),2);
      assert.equal(await run("!!document.querySelector('.learn-shell .learn-opening-controls')&&!document.querySelector('.learn-board-dock .learn-opening-controls')"),true);
      const controls=await run(rect('.learn-opening-controls'));
      if(width>=1366)assert.ok(controls.x>board.right,'Controls belong to the right of the board');
      assert.equal(await run("getComputedStyle(document.querySelector('[aria-label=\"Next move\"]')).backgroundColor"),'rgb(127, 180, 95)');
      await run("import('./analysis.js').then(m=>m.learningWorkspace.stepOpening(4))");
      await run("document.querySelector('[aria-label=\"Previous move\"]').click()");
      assert.deepEqual(await run("[...document.querySelectorAll('.last-move')].map(n=>n.dataset.square).sort()"),['b8','c6']);
      assert.equal(await run("document.querySelector('.learn-opening-moves [aria-current=step]').textContent"),'Nf3');
      await run("import('./analysis.js').then(m=>m.learningWorkspace.stepOpening(0))");
      assert.equal(await run("document.querySelectorAll('.last-move').length"),0);
      await run("import('./analysis.js').then(m=>m.learningWorkspace.stepOpening(7))");
      await run("document.querySelector('[aria-label=\"Previous move\"]').focus()");await press('ArrowLeft',37);
      assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.activity.ply)"),6);
      assert.equal(await run("!!document.querySelector('.learn-opening-controls :focus-visible')"),false,'Arrow shortcuts must not mark the buttons');
      await run("document.querySelector('[aria-label=\"Previous move\"]').focus()");
      assert.equal(await run("document.activeElement.matches(':focus-visible')"),true,'Keyboard focus indication remains available');
      await press('ArrowRight',39);
      assert.equal(await run("!!document.querySelector('.learn-opening-controls :focus-visible')"),false);
      assert.equal(await run("[...document.querySelectorAll('.learn-opening-score, .learn-opening-moves, .learn-opening-toolbar, .learn-opening-moves button')].every(n=>n.scrollWidth<=n.clientWidth+1)"),true,'Move scorecard must fit at '+width);
      const screenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},review.sessionId);
      const label=`opening-${width}-${color}`;
      await fs.writeFile(path.join(out,label+'.png'),Buffer.from(screenshot.data,'base64'));
      results.push({label,board,controls});
    }
    // Exercise a newly added, long variation as Black at every viewport size.
    await run("import('./analysis.js').then(m=>m.learningWorkspace.startOpening('benko',{color:'b'}))");
    await run("document.querySelector('[data-focus=\"opening-variation\"]').click()");
    await run("document.querySelectorAll('#learn-options-opening-variation [role=\"option\"]')[1].click()");
    await run("import('./analysis.js').then(m=>m.learningWorkspace.stepOpening(14))");
    assert.equal(await run("document.querySelector('.learn-opening-progress').textContent"),'14 of 14 moves');
    assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.flipped)"),true);
    assert.equal(await run("[...document.querySelectorAll('.learn-opening-score, .learn-opening-moves, .learn-opening-toolbar, .learn-opening-moves button')].every(n=>n.scrollWidth<=n.clientWidth+1)"),true,'New variation must fit at '+width);
    const expandedScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},review.sessionId);
    await fs.writeFile(path.join(out,`opening-benko-${width}.png`),Buffer.from(expandedScreenshot.data,'base64'));
  }
  await fs.writeFile(path.join(out,'openings-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({ok:true,out,views:results.length}));
}
