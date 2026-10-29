import assert from 'node:assert/strict';
import path from 'node:path';

export async function auditLearning({review,call,evaluate,waitFor,sleep}) {
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
      window.returningMotion=hero.getAnimations()[0];window.returningReveal=document.querySelector('.puzzle-mode-grid').getAnimations()[0];
      window.returningReveal.pause();return window.returningMotion.effect.getKeyframes().map(f=>f.clipPath);})`);
    assert.match(reverse[0],/^inset\(0px 0%(?: 0px 0%)? round 13px\)$/);assert.notEqual(reverse[0],reverse.at(-1));
    // Delay another participant so we can inspect the hero after its animation
    // finishes, before aggregate cleanup. This catches a full-header flash that
    // inspecting only the final DOM would miss.
    await waitFor(review,"window.returningMotion.playState==='finished'",'Return animation final frame');
    const ending=await run(`(()=>{const style=getComputedStyle(window.returningHero),card=document.querySelector('.puzzle-mode[data-mode="${mode}"]').getBoundingClientRect();
      return {opacity:style.opacity,clip:style.clipPath,connected:window.returningHero.isConnected,card:[card.x,card.y,card.width,card.height]};})()`);
    assert.equal(ending.connected,true);assert.equal(ending.opacity,'0','Finished header stays invisible until removed');
    assert.equal(ending.clip,reverse.at(-1),'Finished header holds its collapsed shape');
    await run('window.returningReveal.finish()');
    await run('window.previewReturning');assert.equal(await run("!!document.querySelector('.leaderboard-returning')"),false);
    const settledCard=await run(`(()=>{const r=document.querySelector('.puzzle-mode[data-mode="${mode}"]').getBoundingClientRect();return [r.x,r.y,r.width,r.height];})()`);
    settledCard.forEach((value,index)=>assert.ok(Math.abs(value-ending.card[index])<.5,'Cleanup does not shift the destination card'));
    assert.equal(await run('document.activeElement.dataset.focus'),'leaderboard-'+mode);
  }
  assert.equal(await run('window.previewRemoteRequests'),0);
  assert.equal(await run("import('./browser-compat.js').then(async({browserAPI:api})=>JSON.stringify(await api.storage.local.get(null))===JSON.stringify(window.previewSaved))"),true);
  await run("import('./analysis.js').then(m=>{m.learningWorkspace.leaderboardClient.endpoint='';return m.toggleSettings();})");
  await run("document.querySelector('[data-debug=leaderboard-csv-clear]').click()");
  assert.equal(await run("import('./lib/learning/leaderboard-preview.js').then(m=>m.leaderboardPreview.active)"),false);
  await upload();await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.board')",'Review reload');
  assert.equal(await run("import('./lib/learning/leaderboard-preview.js').then(m=>m.leaderboardPreview.active)"),false);
  console.log('CSV preview: file import, pagination, stable leaderboard during free-board moves/history/flips, reverse transitions, isolation and reload reset passed.');
}
