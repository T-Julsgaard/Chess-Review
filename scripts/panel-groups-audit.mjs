import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression),near=(a,b)=>assert.ok(Math.abs(a-b)<1,`${a} must match ${b}`);
  await call('Emulation.setDeviceMetricsOverride',{width:1919,height:919,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(150);
  const nativeBoxes=()=>run("Object.fromEntries([...document.querySelectorAll('.stage .mod')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.mod,{x:r.x,y:r.y,w:r.width,h:r.height}]}))");
  const defaults=await nativeBoxes();
  const expectedLayout=await run("import('./analysis.js').then(m=>structuredClone(m.S.layout))");
  const checkDefaults=async()=>{
    assert.equal(await run("chrome.tabs.getZoom()"),1);
    assert.equal(await run("import('./analysis.js').then(m=>m.S.layoutMode)"),'auto');
    const boxes=await nativeBoxes();for(const key of Object.keys(defaults))for(const prop of ['x','y','w','h'])near(boxes[key][prop],defaults[key][prop]);
  };
  await checkDefaults();
  const defaultShot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
  await fs.writeFile(path.join(out,'default-panels.png'),Buffer.from(defaultShot.data,'base64'));
  const rect=selector=>run(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
  const board=await rect('.board');
  await run("document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Layout').click();document.querySelector('.reorg-toggle-btn').click()");
  await run("document.querySelector('[data-reorg=right]').click()");
  const start=await run("import('./analysis.js').then(m=>({layout:structuredClone(m.S.layout),keys:[...document.querySelectorAll('.mod.panel-selected')].map(n=>n.dataset.mod)}))");
  assert.ok(start.keys.includes('moves')&&start.keys.includes('engine')&&!start.keys.includes('board'));
  const label=await rect('.moves-panel .ml-move');
  const boxes=start.keys.map(key=>start.layout[key]),left=Math.min(...boxes.map(b=>b.x)),top=Math.min(...boxes.map(b=>b.y)),engine=start.layout.engine;
  const grip=await rect('[data-mod=engine] .mod-resize.se'),x=grip.x+grip.width/2,y=grip.y+grip.height/2;
  const dx=-(engine.x+engine.w-left)*.2,dy=-(engine.y+engine.h-top)*.2;
  const drag=async(x,y,dx,dy)=>{
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y},review.sessionId);
    await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1},review.sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+dx,y:y+dy,buttons:1},review.sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+dx,y:y+dy,button:'left',buttons:0,clickCount:1},review.sessionId);
  };
  await drag(x,y,dx,dy);await sleep(100);
  let changed=await run("import('./analysis.js').then(m=>structuredClone(m.S.layout))");
  for(const key of start.keys){near(changed[key].w,start.layout[key].w*.8);near(changed[key].h,start.layout[key].h*.8);assert.ok(Math.abs(changed[key].scale-(start.layout[key].scale||1)*.8)<.001);}
  const smallLabel=await rect('.moves-panel .ml-move');near(smallLabel.height,label.height*.8);
  const sameBoard=await rect('.board');for(const key of ['x','y','width','height'])near(sameBoard[key],board[key]);
  const handle=await rect('[data-mod=review] .mod-handle');await drag(handle.x+10,handle.y+10,-40,30);await sleep(100);
  const moved=await run("import('./analysis.js').then(m=>structuredClone(m.S.layout))");
  for(const key of start.keys){near(moved[key].x,changed[key].x-40);near(moved[key].y,changed[key].y+30);}
  const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,'selected-scaled-panels.png'),Buffer.from(shot.data,'base64'));
  await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});
  await run("document.querySelector('[data-reorg=export]').click()");
  const file=path.join(out,'chess-review-layout.json');let exported;
  for(let i=0;i<40;i++){try{exported=JSON.parse(await fs.readFile(file,'utf8'));break;}catch{await sleep(100);}}
  assert.equal(exported?.schema,'chess-review-layout-v1');assert.equal(exported.layoutMode,'custom');
  assert.deepEqual(exported.displayedLayout,moved);assert.ok(!('pgn' in exported));
  await run("document.querySelector('.reorg-done').click()");await sleep(400);await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.board')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Reloaded scaled layout');
  changed=await run("import('./analysis.js').then(m=>structuredClone(m.S.layout))");
  for(const key of start.keys)for(const value of ['x','y','w','h','scale'])near(changed[key][value],moved[key][value]);
  const transform=await run("document.querySelector('[data-mod=moves] .mod-inner').style.transform");
  assert.ok(Math.abs(parseFloat(transform.slice(6))-changed.moves.scale)<1e-5);
  const reset=await run("(async()=>{document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Layout').click();[...document.querySelectorAll('.set-reset')].find(n=>n.textContent==='Reset layout').click();return chrome.storage.local.get(['layout','layoutMode']);})()");
  assert.equal(reset.layoutMode,'auto');
  assert.deepEqual(reset.layout,expectedLayout);
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.board')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Reloaded default layout');
  await checkDefaults();
  console.log('Default placements, real group move/scale, JSON export, saved reload, Reset layout and reset reload checks passed. Artifacts: '+out);
}
