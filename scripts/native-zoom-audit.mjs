import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {SCREEN_SIZES} from '../lib/viewport-preview.js';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression),results=[];
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.S.settings.sound=false;})");
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  const resize=async(width,height)=>{
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(100);
  };
  const inspect=async(label,width,height,{learning=false,shot=true}={})=>{
    const data=await run(`(async()=>{
      const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
      const board=document.querySelector('${learning?'.learning-embedded .board':'.stage .board'}');
      const button=document.querySelector('#learningToggle'),b=button.getBoundingClientRect();
      return {width:innerWidth,height:innerHeight,zoom:await chrome.tabs.getZoom(),devicePixelRatio,board:rect(board),
        scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,
        topbar:rect(document.querySelector('.topbar')),buttonHit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===button,
        modules:[...document.querySelectorAll('.stage .mod')].filter(n=>!n.hidden&&getComputedStyle(n).display!=='none').map(n=>({key:n.dataset.mod,...rect(n)})),
        shell:document.querySelector('.learning-embedded .learn-shell')?rect(document.querySelector('.learning-embedded .learn-shell')):null,
        stacked:!!document.querySelector('.learn-stacked'),error:document.querySelector('#error').textContent};
    })()`);
    const file=label+'.png';
    if(shot){const screenshot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,file),Buffer.from(screenshot.data,'base64'));}
    results.push({label,file:shot?file:null,...data});
    await fs.writeFile(path.join(out,'native-zoom-results.json'),JSON.stringify({passed:false,results},null,2));
    const context=label+': '+JSON.stringify(data);
    assert.equal(data.zoom,1,context);assert.equal(data.error,'',context);
    assert.equal(data.width,width,context);assert.equal(data.height,height,context);
    assert.ok(data.scrollW<=width+1,context);
    assert.ok(data.buttonHit,context);
    assert.ok(Math.abs(data.board.w-data.board.h)<1&&data.board.w>=120,context);
    assert.ok(data.board.x>=-1&&data.board.right<=width+1,context);
    if(!learning&&width>=1100&&height>=600){
      assert.ok(data.scrollH<=height+1,context);
      for(const box of data.modules)assert.ok(box.x>=-1&&box.right<=width+1&&box.y>=50&&(label==='review-expanded-accuracy'||box.bottom<=height+1)&&box.w>0&&box.h>0,context);
      const panels=data.modules.filter(b=>!['coach','evalbar'].includes(b.key));
      for(const [i,a]of panels.entries())for(const b of panels.slice(i+1))assert.ok(
        Math.min(a.right,b.right)-Math.max(a.x,b.x)<1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<1,
        label+': overlapping '+a.key+' and '+b.key);
    }
    if(learning){
      assert.ok(data.shell.x>=0&&data.shell.right<=width+1,context);
      if(!data.stacked||label.startsWith('learning-puzzle-')||label.startsWith('learning-solved-'))assert.ok(data.board.y>=50&&data.board.bottom<=height+1,context);
    }
    return data;
  };
  const sizes=[];
  for(const [group,presets]of Object.entries(SCREEN_SIZES))for(const [name,width,screenHeight]of presets){
    for(const chromeHeight of ['Desktop','Laptop'].includes(group)?[0,120,160]:[0])sizes.push({name:name.replaceAll(' ','-').toLowerCase(),width,height:screenHeight-chromeHeight,chromeHeight});
  }
  sizes.push(...[[1280,480],[820,600],[844,390],[568,320]].map(([width,height])=>({name:'short',width,height,chromeHeight:0})));
  for(const {name,width,height,chromeHeight}of sizes){
    await resize(width,height);
    await inspect(`review-${name}-${width}x${height}-chrome${chromeHeight}`,width,height);
    await run("document.querySelector('[aria-label=Settings]').click()");
    const settings=await run("(()=>{const r=document.querySelector('#settings').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})()");
    assert.ok(settings.x>=0&&settings.right<=width+1&&settings.y>=0&&settings.bottom<=height+1,JSON.stringify({width,height,settings}));
    await run("document.querySelector('[aria-label=Settings]').click()");
  }
  // Review details, saved panel editing, Reset, and an old browser zoom all use 100%.
  await resize(1919,919);
  await run("document.querySelector('.qbreak-toggle').click()");
  await inspect('review-expanded-accuracy',1919,919);
  await run("document.querySelector('.qbreak-toggle').click();document.querySelector('[aria-label=Settings]').click();[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Layout').click();document.querySelector('.reorg-toggle-btn').click()");
  await inspect('review-custom-canvas',1919,919);
  await run("[...document.querySelectorAll('.set-reset')].find(n=>n.textContent==='Reset layout').click()");
  await run("document.querySelector('[aria-label=Settings]').click()");
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.board')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Reloaded review');
  await inspect('review-reset-reloaded',1919,919);
  await run("chrome.tabs.getCurrent().then(t=>chrome.tabs.setZoom(t.id,.87))");
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.board')&&chrome.tabs.getZoom().then(z=>z===1)",'Legacy zoom restored to 100%');
  await inspect('review-legacy-zoom-reloaded',1919,919);
  for(const [width,height]of [[1919,919],[1366,648],[320,568]]){
    await resize(width,height);await run("document.querySelector('[aria-label=Settings]').click()");
    for(const tab of ['Visual','Engine']){
      await run(`[...document.querySelectorAll('.set-tab')].find(n=>n.textContent==='${tab}').click()`);
      const fits=await run("(()=>{const n=document.querySelector('#settings');return n.scrollWidth<=n.clientWidth+1;})()");
      assert.ok(fits,`Settings ${tab} at ${width}`);
      await inspect(`settings-${tab.toLowerCase()}-${width}x${height}`,width,height);
    }
    await run("document.querySelector('[aria-label=Settings]').click()");
  }

  for(const [width,height]of [[1920,920],[1366,648],[1280,560],[1024,1206],[820,1020],[390,844],[320,568]]){
    await resize(width,height);
    await run("import('./analysis.js').then(m=>m.openLearning())");
    await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Learning');
    for(const page of ['puzzles','openings','statistics']){
      await run(`import('./analysis.js').then(m=>m.learningWorkspace.navigate('${page}'))`);
      await inspect(`learning-${page}-${width}x${height}`,width,height,{learning:true});
    }
    await run("import('./analysis.js').then(async m=>{const w=m.learningWorkspace;const p={id:'native-zoom',fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',solution:['f7f8'],rating:1200,themes:['mateIn1']};w.puzzles=[p];await w.startPuzzleSelection([p]);})");
    await inspect(`learning-puzzle-${width}x${height}`,width,height,{learning:true});
    await run("import('./analysis.js').then(m=>m.learningWorkspace.submitPuzzle('f7f8'))");
    await inspect(`learning-solved-${width}x${height}`,width,height,{learning:true});
    await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
  }
  for(const [width,height]of [[1920,920],[390,844]]){
    await resize(width,height);await run("document.documentElement.dataset.theme='light'");
    await inspect(`review-light-${width}x${height}`,width,height);
    await run("document.documentElement.dataset.theme='dark'");
  }
  for(const factor of [1.25,1.5,2]){
    await call('Emulation.setDeviceMetricsOverride',{width:1920,height:920,deviceScaleFactor:factor,mobile:false},review.sessionId);
    await sleep(100);
    const data=await inspect(`review-display-scale-${factor}`,1920,920);
    assert.equal(data.devicePixelRatio,factor);
  }
  for(const [width,height]of [[1920,920],[1366,608],[390,844],[320,568]]){
    await resize(width,height);
    await run("import('./analysis.js').then(m=>m.openLearning())");
    await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Learning flows');
    await run("import('./analysis.js').then(m=>m.learningWorkspace.startOpening('italian'))");
    await inspect(`learning-opening-lesson-${width}x${height}`,width,height,{learning:true});
    for(const mode of ['timeAttack','knockout']){
      await run(`import('./analysis.js').then(async m=>{const w=m.learningWorkspace;await w.navigate('puzzles');await w.startPuzzleRun('${mode}');w.run.clock?.pause();})`);
      await waitFor(review,"!document.querySelector('.puzzle-run-start')||document.querySelector('.puzzle-run-start').dataset.step==='Go!'",'Run intro');
      await inspect(`learning-${mode}-${width}x${height}`,width,height,{learning:true});
      await run("import('./analysis.js').then(m=>m.learningWorkspace.finishChallenge('Layout check'))");
      await inspect(`learning-${mode}-ending-${width}x${height}`,width,height,{learning:true});
      await run("import('./analysis.js').then(m=>m.learningWorkspace.scrollToTop())");
      await inspect(`learning-${mode}-results-${width}x${height}`,width,height,{learning:true});
    }
    await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
  }
  // Popup and manual entry have their own native-size document.
  const origin=await run('location.origin');
  const {targetId}=await call('Target.createTarget',{url:origin+'/popup.html'});
  const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
  for(const [width,height]of [[360,600],[320,568]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
    await waitFor({sessionId},"!!document.querySelector('#manual')",'Popup');
    const popup=await evaluate({sessionId},"(()=>{document.querySelector('#manual').open=true;return {width:innerWidth,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight};})()");
    assert.ok(popup.scrollW<=width&&popup.scrollH<=height,JSON.stringify(popup));
    const screenshot=await call('Page.captureScreenshot',{format:'png'},sessionId),file=`popup-${width}x${height}.png`;
    await fs.writeFile(path.join(out,file),Buffer.from(screenshot.data,'base64'));results.push({label:`popup-${width}x${height}`,file,...popup});
  }
  await fs.writeFile(path.join(out,'native-zoom-results.json'),JSON.stringify({passed:true,results},null,2));
  const gallery=results.filter(r=>r.file).map(r=>`<figure><a href="${r.file}"><img loading="lazy" src="${r.file}"></a><figcaption>${r.label} · browser 100%</figcaption></figure>`).join('');
  await fs.writeFile(path.join(out,'native-zoom-gallery.html'),`<!doctype html><meta charset="utf-8"><title>Chess Review · 100% zoom audit</title><style>body{background:#191917;color:#eee;font:14px system-ui;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:24px}figure{margin:0}img{width:100%;max-height:440px;object-fit:contain;background:#111}figcaption{margin-top:8px}</style><h1>100% browser zoom · ${results.length} verified views</h1><main>${gallery}</main>`);
  console.log(`Passed ${results.length} views at 100% browser zoom. Gallery and measurements: ${out}`);
}
