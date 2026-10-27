import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression), results = [];
  await run("document.querySelector('.learning-announcement-disable')?.click();import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.S.settings.sound=false;})");
  for (const [width,height,pixelRatio] of [[1920,919,1],[1920,880,1],[1920,800,1],[1536,704,1.25],[1280,560,1.5],[960,600,2]]) {
    await call('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:pixelRatio,mobile:false}, review.sessionId);
    await sleep(180);
    for (const setup of ['old','modern']) {
      await run(`import('./analysis.js').then(m=>m.applyUiSetup('${setup}'))`);
      await run("document.querySelector('#settings').hidden&&document.querySelector('[aria-label=Settings]').click()");
      await sleep(180);
      const before = await run(`import('./analysis.js').then(m=>{
        const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
        const moves=document.querySelector('[data-mod=moves] .mod-inner');
        const settings=document.querySelector('#settings'), canvas=document.querySelector('.stage');
        return {viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio},board:rect(document.querySelector('.board')),
          componentScale:moves.getBoundingClientRect().width/moves.offsetWidth,canvasTransform:getComputedStyle(canvas).transform,
          settings:rect(settings),settingsScale:parseFloat(getComputedStyle(settings).zoom)||1,
          panelsRight:Math.max(...[...canvas.querySelectorAll('.mod')].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect().right)),
          saved:JSON.stringify({layout:m.S.layout,settings:m.S.settings,idx:m.S.idx})};})`);
      await run("document.querySelector('[aria-label=Settings]').click();document.querySelector('#learningToggle').click()");
      await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Learning');
      await sleep(100);
      const learning = await run(`(()=>{
        const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
        const root=document.querySelector('.learning-workspace'),shell=root.querySelector('.learn-shell');
        return {board:rect(document.querySelector('.board')),shell:rect(shell),root:rect(root),
          assignedWidth:parseFloat(root.style.getPropertyValue('--learn-panel-width')),
          contentScale:parseFloat(root.style.getPropertyValue('--learn-content-scale'))||1,
          transformedAncestor:!!root.parentElement.closest('.stage.canvas')};})()`);
      const shot = await call('Page.captureScreenshot',{format:'png'},review.sessionId);
      await fs.writeFile(path.join(out,`${setup}-${width}x${height}.png`),Buffer.from(shot.data,'base64'));
      await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
      const after = await run("import('./analysis.js').then(m=>JSON.stringify({layout:m.S.layout,settings:m.S.settings,idx:m.S.idx}))");
      results.push({setup,width,height,pixelRatio,...before,learning,savedPreserved:after===before.saved});
      await fs.writeFile(path.join(out,'preset-scaling.json'),JSON.stringify(results,null,2));
    }
  }
  for (const result of results) {
    assert.ok(Math.abs(result.learning.shell.w-result.learning.assignedWidth)<2,
      'Learning geometry must not be scaled a second time: '+JSON.stringify(result));
    assert.ok(result.learning.shell.w>=300, 'Learning must retain readable panel width: '+JSON.stringify(result));
    assert.ok(Math.abs(result.board.w-result.board.h)<1);
    assert.ok(result.savedPreserved, 'Learning must preserve the saved review');
  }
  for (let index = 0; index < results.length; index += 2) {
    const old = results[index], modern = results[index+1], label = modern.width+'x'+modern.height;
    assert.ok(Math.abs(old.componentScale-modern.componentScale)<.01, label+': presets need the same readable component scale');
    assert.ok(Math.abs(old.settings.w-modern.settings.w)<2, label+': Settings must not zoom when switching presets');
    assert.ok(Math.abs(old.learning.shell.w-modern.learning.shell.w)<2, label+': learning needs the same usable column width');
    assert.ok(Math.abs(old.panelsRight-modern.panelsRight)<2, label+': Modern must not leave an extra right-hand gap');
  }
  // Editing must start from the laptop's displayed boxes, without moving other
  // panels or losing the saved custom arrangement on the next opening.
  await call('Emulation.setDeviceMetricsOverride',{width:1536,height:704,deviceScaleFactor:1.25,mobile:false},review.sessionId);
  await run("import('./analysis.js').then(m=>m.applyUiSetup('modern'))");
  await run("document.querySelector('[aria-label=Settings]').click();document.querySelector('.reorg-toggle-btn').click()");
  const boxes=()=>run("Object.fromEntries([...document.querySelectorAll('.stage .mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,{x:r.x,y:r.y,w:r.width,h:r.height}]}))");
  const original=await boxes();
  const handle=await run("(()=>{const r=document.querySelector('[data-mod=moves] .mod-handle').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await call('Input.dispatchMouseEvent',{type:'mousePressed',...handle,button:'left',clickCount:1},review.sessionId);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:handle.x+32,y:handle.y+16,button:'left',buttons:1},review.sessionId);
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:handle.x+32,y:handle.y+16,button:'left',clickCount:1},review.sessionId);
  await waitFor(review,"chrome.storage.local.get('settings').then(s=>s.settings.uiSetup==='custom')",'Saved laptop edit');
  await sleep(350);
  const edited=await boxes();
  assert.ok(edited.moves.x>original.moves.x+20,'The requested panel move is applied');
  for(const [key,box]of Object.entries(original).filter(([key])=>key!=='moves'))for(const property of ['x','y','w','h'])
    assert.ok(Math.abs(edited[key][property]-box[property])<1,'Editing must not jump another panel: '+key+'.'+property);
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.board')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Reopened laptop layout');
  const reopened=await boxes();
  for(const [key,box]of Object.entries(edited))for(const property of ['x','y','w','h'])
    assert.ok(Math.abs(reopened[key][property]-box[property])<1,'Saved laptop edit changed after reload: '+key+'.'+property);
  await fs.writeFile(path.join(out,'preset-editing.json'),JSON.stringify({original,edited,reopened},null,2));
  console.log('Preset scaling and learning geometry passed. Evidence: '+out);
}
