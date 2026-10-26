import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

// Render the approved revision and the working tree in separate test extensions.
// Compare physical pixels: reference CSS coordinates × browser zoom vs native 100%.
export async function auditLearning({review,call,evaluate,waitFor,sleep,out,source}) {
  const referenceSource=await fs.mkdtemp(path.join(path.dirname(source),'full-hd-reference-'));
  await fs.cp(source,referenceSource,{recursive:true});
  for(const file of ['analysis.js','styles.css'])await fs.writeFile(path.join(referenceSource,file),execFileSync('git',['show',`8516f684:${file}`],{maxBuffer:4*1024*1024,windowsHide:true}));
  await fs.appendFile(path.join(referenceSource,'analysis.js'),'\nexport {S,go};\nglobalThis.__pinFullHdReference=async()=>{_zoomTabId=null;const tab=await browserAPI.tabs.getCurrent();await browserAPI.tabs.setZoom(tab.id,.87);};\n');
  const loaded=await call('Extensions.loadUnpacked',{path:referenceSource});
  const create=async url=>{
    const {targetId}=await call('Target.createTarget',{url});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});return {targetId,sessionId};
  };
  const storage=await create(`chrome-extension://${loaded.id}/audit.html`);
  await waitFor(storage,'!!window.api','Reference storage');
  await evaluate(storage,"api.storage.local.set({settingsResetFor030:true,settings:{engineDepth:4,engineWorkers:1,depthBumped:true,sound:false,moveAnim:false,coachPlain:true,coach:'old_soviet',coachDefaulted:true,insightFont:18},'job:reference':{pgn:'1. e4 e5 2. Nf3 Nc6 *',meta:{gameId:'reference'},source:'pgn'}})");
  const reference=await create(`chrome-extension://${loaded.id}/analysis.html#reference`);
  await waitFor(reference,"!!document.querySelector('.board')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Reference review');
  for(const tab of [reference,review]){
    await evaluate(tab,"document.querySelector('.learning-announcement-disable')?.click()");
    await evaluate(tab,"import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;})");
  }
  await evaluate(review,"document.documentElement.style.setProperty('--ip-font','20px')");
  assert.equal(await evaluate(review,"getComputedStyle(document.querySelector('.ip-text')).fontSize"),'22.5px','Commentary sizing must remain live');
  await evaluate(review,"document.documentElement.style.setProperty('--ip-font','16px')");
  const {windowId}=await call('Browser.getWindowForTarget',{targetId:review.targetId});
  const measurements=async tab=>{
    await call('Page.bringToFront',{},tab.sessionId);
    await evaluate(tab,'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    return evaluate(tab,`(async()=>{
    const currentTab=await chrome.tabs.getCurrent(),zoom=await chrome.tabs.getZoom(currentTab.id);
    const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x*zoom,y:r.y*zoom,w:r.width*zoom,h:r.height*zoom};};
    const selectors=['.topbar','.brand-mark','.learning-toggle','.board','.controls button.play','.engine-bestwalk','.lib-tab','.feedback-floating'];
    return {zoom,width:Math.round(innerWidth*zoom),height:Math.round(innerHeight*zoom),
      panels:Object.fromEntries([...document.querySelectorAll('.mod')].map(n=>[n.dataset.mod,rect(n)])),
      contents:Object.fromEntries(selectors.map(s=>[s,rect(document.querySelector(s))]))};
  })()`);
  };
  const results=[];
  for(const [width,height]of [[1920,1080],[1920,960],[1919,919]]){
    const current=await measurements(review);
    const outer=await evaluate(review,'({w:outerWidth,h:outerHeight})');
    await call('Browser.setWindowBounds',{windowId,bounds:{width:outer.w+width-current.width,height:outer.h+height-current.height}});
    await sleep(400);
    await evaluate(reference,"globalThis.__pinFullHdReference()");await sleep(150);
    for(const ply of [0,2]){
      for(const tab of [reference,review])await evaluate(tab,`import('./analysis.js').then(m=>m.go(${ply}))`);
      const old=await measurements(reference),native=await measurements(review);
      assert.equal(old.zoom,.87);assert.equal(native.zoom,1);
      const differences=[];
      for(const group of ['panels','contents'])for(const [key,box]of Object.entries(old[group]))for(const prop of ['x','y','w','h']){
        const delta=native[group][key][prop]-box[prop];
        if(Math.abs(delta)>1.1)differences.push({group,key,prop,old:box[prop],native:native[group][key][prop],delta});
      }
      const label=`${width}x${height}-ply${ply}`;
      for(const [name,tab]of [['reference-87',reference],['native-100',review]]){
        const shot=await call('Page.captureScreenshot',{format:'png'},tab.sessionId);
        await fs.writeFile(path.join(out,`${label}-${name}.png`),Buffer.from(shot.data,'base64'));
      }
      results.push({label,reference:old,native,differences});
    }
  }
  await fs.writeFile(path.join(out,'full-hd-comparison.json'),JSON.stringify(results,null,2));
  const differences=results.flatMap(r=>r.differences.map(d=>({label:r.label,...d})));
  const beforeEdit=await measurements(review);
  await evaluate(review,"document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Layout').click();document.querySelector('.reorg-toggle-btn').click()");
  const editing=await measurements(review);
  for(const [key,box]of Object.entries(beforeEdit.panels))for(const prop of ['x','y','w','h'])assert.ok(Math.abs(editing.panels[key][prop]-box[prop])<1,'Editing changed '+key+'.'+prop);
  await evaluate(review,"[...document.querySelectorAll('.set-reset')].find(n=>n.textContent==='Reset layout').click()");
  await evaluate(review,"document.querySelector('[aria-label=Settings]').click()");
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.board')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Reset review');
  const reset=await measurements(review);assert.equal(reset.zoom,1);
  for(const [key,box]of Object.entries(beforeEdit.panels))for(const prop of ['x','y','w','h'])assert.ok(Math.abs(reset.panels[key][prop]-box[prop])<1,'Reset changed '+key+'.'+prop);
  const pairs=results.map(r=>`<article><h2>${r.label}</h2><div><figure><a href="${r.label}-reference-87.png"><img src="${r.label}-reference-87.png"></a><figcaption>Original · 87% browser zoom</figcaption></figure><figure><a href="${r.label}-native-100.png"><img src="${r.label}-native-100.png"></a><figcaption>Prototype · 100% browser zoom</figcaption></figure></div></article>`).join('');
  await fs.writeFile(path.join(out,'full-hd-comparison.html'),`<!doctype html><meta charset="utf-8"><title>Full HD reference comparison</title><style>body{font:14px system-ui;background:#191917;color:#eee;margin:24px}article>div{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%}figcaption{margin-top:8px}</style><h1>Full HD · original appearance at 100%</h1><p>Click a screenshot for full size. Browser chrome is accounted for in the shorter views.</p>${pairs}`);
  console.log('Full HD comparison: '+out);
  assert.equal(differences.length,0,JSON.stringify(differences,null,2));
  console.log('Reference 87% and native 100% panel and content measurements match within 1.1 physical pixels in all six views.');
}
