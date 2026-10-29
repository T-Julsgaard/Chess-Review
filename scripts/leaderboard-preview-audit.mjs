import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(m=>m.openLearning())");
  await waitFor(review,"!!document.querySelector('.puzzle-mode-grid')&&!document.querySelector('.learn-transition-surface')",'Puzzle modes');
  await run(`import('./browser-compat.js').then(async({browserAPI:api})=>{await api.storage.local.set({'leaderboard:v1':{id:'unchanged',name:'Unchanged player',token:'a'.repeat(64)}});window.previewSaved=await api.storage.local.get(null);})`);
  await run(`window.previewRemoteRequests=0;window.previewOriginalFetch=window.fetch.bind(window);window.fetch=(url,...args)=>{
    if(!String(url?.url||url).startsWith('chrome-extension://')){window.previewRemoteRequests++;throw Error('Unexpected preview network request');}return window.previewOriginalFetch(url,...args);
  };import('./analysis.js').then(m=>{m.learningWorkspace.leaderboardClient.endpoint='https://preview-must-stay-local.example';return m.toggleSettings();})`);
  await run("[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent.includes('Developer debugger')).click()");
  const upload=async()=>{
    const {root}=await call('DOM.getDocument',{},review.sessionId);
    const {nodeId}=await call('DOM.querySelector',{nodeId:root.nodeId,selector:'[data-debug=leaderboard-csv-file]'},review.sessionId);
    await call('DOM.setFileInputFiles',{nodeId,files:[path.resolve(process.env.LEADERBOARD_PREVIEW_CSV||'scratch/leaderboard-test-data.csv')]},review.sessionId);
    await waitFor(review,"document.querySelector('[data-debug=leaderboard-csv-status]')?.textContent.includes('90 records')",'CSV import');
  };
  await upload();await run("import('./analysis.js').then(m=>m.toggleSettings())");
  for(const mode of ['solve-puzzle','timeAttack','knockout']) {
    await run(`document.querySelector('[data-focus=leaderboard-${mode}]').click()`);
    await waitFor(review,"document.querySelectorAll('.leaderboard-table tbody tr').length===10&&!document.querySelector('.leaderboard-entering')",'Preview leaderboard');
    assert.equal(await run("document.querySelector('.leaderboard-live').textContent"),'Test data');
    assert.equal(await run("!!document.querySelector('[data-focus=leaderboard-play],.leaderboard-connect')"),false);
    for(const rank of [11,21]) {
      await run("document.querySelector('[data-focus=leaderboard-next]').click()");
      await waitFor(review,`document.querySelector('.leaderboard-rank')?.textContent==='${rank}'`,'Preview page');
    }
    assert.equal(await run("document.querySelector('[data-focus=leaderboard-next]').disabled"),true);
    const unchanged=await run(`import('./analysis.js').then(({learningWorkspace:w})=>{
      w.stepHomePosition(0);const main=w.shell.querySelector('.learn-main'),panel=main.querySelector('.learn-leaderboard'),row=panel.querySelector('tbody tr');main.scrollTop=80;
      const observer=new MutationObserver(()=>{});observer.observe(main,{childList:true,subtree:true});
      w.boardElement.querySelector('[data-square=e2]').click();w.boardElement.querySelector('[data-square=e4]').click();
      w.submitMove('e7e5');w.stepHomePosition(0);w.stepHomePosition(2);w.flipBoard();
      const result=panel.isConnected&&row.isConnected&&w.shell.querySelector('.learn-main')===main&&main.scrollTop===80&&observer.takeRecords().length===0&&w.leaderboard.page===3;
      observer.disconnect();return result;
    })`);
    assert.equal(unchanged,true,'Free-board moves, history and flips leave the leaderboard connected and still');
    const reverse=await run(`import('./analysis.js').then(({learningWorkspace:w})=>{window.previewReturning=w.returnFromLeaderboard();const hero=window.returningHero=document.querySelector('.leaderboard-returning .leaderboard-hero');
      window.returningMotion=hero.getAnimations()[0];window.returningFade=hero.parentElement.getAnimations()[0];window.returningReveal=document.querySelector('.puzzle-mode-grid').getAnimations()[0];
      window.returningReveal.pause();return window.returningMotion.effect.getKeyframes().map(f=>f.clipPath);})`);
    assert.match(reverse[0],/^inset\(0px 0%(?: 0px 0%)? round 13px\)$/);assert.notEqual(reverse[0],reverse.at(-1));
    const contracting=await run(`(()=>{const animation=window.returningFade,time=animation.currentTime;animation.pause();animation.currentTime=240;
      const opacity=getComputedStyle(window.returningHero.parentElement).opacity;animation.currentTime=time;animation.play();return opacity;})()`);
    assert.equal(contracting,'1','The card stays solid through contraction instead of dissolving early');
    // Delay another participant so we can inspect the hero after its animation
    // finishes, before aggregate cleanup. This catches a full-header flash that
    // inspecting only the final DOM would miss.
    await waitFor(review,"window.returningMotion.playState==='finished'&&window.returningFade.playState==='finished'",'Return animation final frame');
    const ending=await run(`(()=>{const style=getComputedStyle(window.returningHero),card=document.querySelector('.puzzle-mode[data-mode="${mode}"]').getBoundingClientRect();
      return {opacity:getComputedStyle(window.returningHero.parentElement).opacity,clip:style.clipPath,connected:window.returningHero.isConnected,card:[card.x,card.y,card.width,card.height]};})()`);
    assert.equal(ending.connected,true);assert.equal(ending.opacity,'0','Finished header stays invisible until removed');
    assert.equal(ending.clip,reverse.at(-1),'Finished header holds its collapsed shape');
    const landing=await run(`(()=>{const hero=window.returningHero,r=hero.getBoundingClientRect(),button=document.querySelector('.puzzle-mode[data-mode="${mode}"] .puzzle-mode-button').getBoundingClientRect(),
      clip=getComputedStyle(hero).clipPath.slice(6).split(' round')[0].split(' ').map(parseFloat);return {hero:{x:r.x,y:r.y,width:r.width,height:r.height},button:[button.x,button.y,button.width,button.height],clip};})()`);
    const [top,right,bottom,left]=landing.clip;
    const box=[landing.hero.x+landing.hero.width*left/100,landing.hero.y,
      landing.hero.width*(1-(left+right)/100),landing.hero.height*(1-bottom/100)];
    box.forEach((value,index)=>assert.ok(Math.abs(value-landing.button[index])<2,'The shrinking surface lands on the colored mode button'));
    const contents=await run(`(()=>{const textRect=node=>{const range=document.createRange();range.selectNodeContents(node);return range.getBoundingClientRect();},
      artRect=node=>{const r=node.getBoundingClientRect(),box=node.viewBox.baseVal,fit=Math.min(r.width/box.width,r.height/box.height);return {x:r.x+(r.width-box.width*fit)/2,y:r.y+(r.height-box.height*fit)/2,width:box.width*fit,height:box.height*fit};},
      hero=window.returningHero,card=document.querySelector('.puzzle-mode[data-mode="${mode}"]');return [
        [textRect(hero.querySelector('h3')),textRect(card.querySelector('.puzzle-mode-name'))],
        [artRect(hero.querySelector('.puzzle-mode-art')),artRect(card.querySelector('.puzzle-mode-art'))]
      ].map(pair=>pair.map(r=>[r.x,r.y,r.width,r.height]));})()`);
    for(const [from,to] of contents)from.forEach((value,index)=>assert.ok(Math.abs(value-to[index])<2,'Title and artwork return to their original card positions'));
    const clip=await run(`(()=>{const host=window.returningHero.closest('.learn-puzzles'),grid=host.querySelector('.puzzle-mode-grid');
      window.returningFrames=[...window.returningHero.parentElement.getAnimations({subtree:true}),...grid.getAnimations(),...host.querySelector('.learn-puzzle-options').getAnimations()];
      for(const animation of window.returningFrames){animation.pause();animation.currentTime=240;}
      const r=grid.getBoundingClientRect();return {x:r.x-6,y:r.y-6,width:r.width+12,height:r.height+12,scale:1};})()`);
    const {data}=await call('Page.captureScreenshot',{format:'png',clip},review.sessionId);
    await fs.writeFile(path.join(out,`return-${mode}-midpoint.png`),Buffer.from(data,'base64'));
    await run('window.returningFrames.forEach(animation=>animation.finish())');
    await run('window.previewReturning');assert.equal(await run("!!document.querySelector('.leaderboard-returning')"),false);
    const settledCard=await run(`(()=>{const r=document.querySelector('.puzzle-mode[data-mode="${mode}"]').getBoundingClientRect();return [r.x,r.y,r.width,r.height];})()`);
    settledCard.forEach((value,index)=>assert.ok(Math.abs(value-ending.card[index])<.5,'Cleanup does not shift the destination card'));
    assert.equal(await run('document.activeElement.dataset.focus'),'leaderboard-'+mode);
  }
  const show=async(mode,state)=>{
    await run(`import('./analysis.js').then(async m=>{
      if(document.querySelector('#settings').hidden)await m.toggleSettings();
      document.querySelector('[data-debug=leaderboard-preview-mode]').value='${mode}';
      document.querySelector('[data-debug=leaderboard-preview-state]').value='${state}';
      document.querySelector('[data-debug=leaderboard-preview-show]').click();
    })`);
    await waitFor(review,`document.querySelector('.learn-leaderboard')?.dataset.previewState==='${state}'&&document.querySelector('.learn-leaderboard')?.dataset.mode==='${mode}'&&!document.querySelector('.leaderboard-entering')&&document.querySelector('#settings').hidden`,'Debugger preview '+state);
  };
  for(const mode of ['solve-puzzle','timeAttack','knockout']){
    let gap;
    for(const state of ['coming-soon','rankings','empty']){
      await show(mode,state);
      const actual=await run("document.querySelector('.leaderboard-table-wrap').getBoundingClientRect().top-document.querySelector('.leaderboard-hero').getBoundingClientRect().bottom");
      assert.ok(actual>=40,'The toolbar reserves a visible banner-to-table gap');
      if(gap!==undefined)assert.ok(Math.abs(gap-actual)<1,`${mode}/${state}: empty and populated rankings share the same gap (${gap} vs ${actual})`);gap=actual;
    }
  }
  const states=await run("import('./lib/learning/leaderboard-preview.js').then(m=>m.LEADERBOARD_PREVIEW_STATES.map(([key])=>key))");
  for(const state of states){
    await show('solve-puzzle',state);
    const actual=await run("({busy:document.querySelector('.leaderboard-table-wrap').getAttribute('aria-busy'),personal:document.querySelector('.leaderboard-personal')?.textContent,alert:document.querySelector('.leaderboard-error')?.textContent})");
    if(state==='loading')assert.equal(actual.busy,'true');
    if(state==='syncing')assert.match(actual.personal,/Syncing…/);
    if(state==='sync-failed')assert.match(actual.personal,/Sync needs attention/);
    if(state==='saved')assert.match(actual.personal,/Saved/);
    if(['offline','unavailable','capacity','rate-limited','connection-error'].includes(state))assert.ok(actual.alert);
  }
  for(const [action,label] of [['start-sync','Syncing…'],['finish-sync','Saved'],['fail-sync','Sync needs attention'],['retry-sync','Syncing…']]){
    await run(`import('./analysis.js').then(async m=>{if(document.querySelector('#settings').hidden)await m.toggleSettings();document.querySelector('[data-debug=leaderboard-${action}]').click();})`);
    await waitFor(review,`document.querySelector('.leaderboard-personal')?.textContent.includes('${label}')&&!document.querySelector('.leaderboard-entering')`,'Debugger action '+action);
  }
  await run("import('./analysis.js').then(m=>m.toggleSettings())");
  await run("document.querySelector('#settings').scrollTop=document.querySelector('#settings').scrollHeight");
  const debugClip=await run("(()=>{const r=document.querySelector('#settings').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()");
  const debugImage=await call('Page.captureScreenshot',{format:'png',clip:debugClip},review.sessionId);
  await fs.writeFile(path.join(out,'leaderboard-debugger-controls.png'),Buffer.from(debugImage.data,'base64'));
  assert.equal(await run('window.previewRemoteRequests'),0);
  assert.equal(await run("import('./browser-compat.js').then(async({browserAPI:api})=>JSON.stringify(await api.storage.local.get(null))===JSON.stringify(window.previewSaved))"),true);
  await run("import('./analysis.js').then(async m=>{m.learningWorkspace.leaderboardClient.endpoint='';if(document.querySelector('#settings').hidden)await m.toggleSettings();})");
  await run("document.querySelector('[data-debug=leaderboard-csv-clear]').click()");
  assert.equal(await run("import('./lib/learning/leaderboard-preview.js').then(m=>m.leaderboardPreview.active)"),false);
  await upload();await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.board')",'Review reload');
  assert.equal(await run("import('./lib/learning/leaderboard-preview.js').then(m=>m.leaderboardPreview.active)"),false);
  console.log('Leaderboard previews: CSV import, consistent spacing, all debugger states/sync actions, pagination, free-board isolation, reverse transitions and reload reset passed. Screenshots: '+out);
}
