import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {season} from '../tests/helpers/profile-season.mjs';
import {rowsKey} from '../lib/profile/store.js';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = code => evaluate(review, code);
  // Keep fixture values separate from executable source, including quotes and markup.
  const invoke = async (fn, ...values) => {
    const {result, exceptionDetails} = await call('Runtime.evaluate', {expression: 'globalThis'}, review.sessionId);
    if (exceptionDetails) throw Error(JSON.stringify(exceptionDetails));
    try {
      const response = await call('Runtime.callFunctionOn', {
        objectId: result.objectId, functionDeclaration: fn.toString(),
        arguments: values.map(value => ({value})), awaitPromise: true, returnByValue: true,
      }, review.sessionId);
      if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
      return response.result.value;
    } finally { await call('Runtime.releaseObject', {objectId: result.objectId}, review.sessionId); }
  };
  const rows = season();
  await invoke(async function(items) {
    const {browserAPI} = await import('./browser-compat.js');
    await browserAPI.storage.local.set(items);
  }, {[rowsKey('chesscom', 'tester')]: {rows, months: [], since: 0, updatedAt: Date.now()}});
  await run("document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  // Exercise the real review-tab -> background -> offscreen -> Stockfish route.
  // A cached archived game keeps this check deterministic and offline.
  const engineGame = rows[0];
  await invoke(async function(game) {
    const [cache, source] = await Promise.all([import('./gamecache.js'), import('./lib/profile/pgn-source.js')]);
    await cache.setCachedMonth(source.monthUrl('tester', game.t), [{url: game.url, pgn: '[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0'}]);
  }, {t: engineGame.t, url: engineGame.url});
  const started = await invoke(async function(row) {
    const {browserAPI} = await import('./browser-compat.js');
    return browserAPI.runtime.sendMessage({type: 'profileEngine', action: 'start', job: {
      site: 'chesscom', account: 'tester', budget: 'quick', workers: 1, rows: [row],
    }});
  }, {id: engineGame.id, t: engineGame.t, me: engineGame.me});
  assert.ok(started?.ok, 'The real engine job starts from the review tab: ' + JSON.stringify(started));
  await waitFor(review, "import('./browser-compat.js').then(({browserAPI})=>browserAPI.storage.local.get('profile:v1:job')).then(data=>data['profile:v1:job']?.status==='done')", 'Profile engine completion');
  const engineJob = await run("import('./browser-compat.js').then(({browserAPI})=>browserAPI.storage.local.get('profile:v1:job')).then(data=>data['profile:v1:job'])");
  assert.equal(engineJob.failed, 0, 'The bundled engine analyses the cached game');
  const evidence = [];
  for (const [width, height] of [[1920,1080], [1366,768], [1280,600], [800,900], [600,800]]) {
    await call('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false}, review.sessionId);
    await sleep(150);
    await run(`import('./analysis.js').then(async m=>{m.S.settings.uiAnim=true;m.S.settings.pieceStyle='merida';window.profileReviewIdx=m.S.idx;await m.openProfile();const w=m.profileWorkspace;w.account='tester';w.renderHead();await w.load();})`);
    await waitFor(review, "!!document.querySelector('.pv-story[data-slide=cover]')", 'Profile cover');
    await run("document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
    await sleep(750);
    const cover = await run(`(()=>{const board=document.querySelector('.profile-board'),p=document.querySelector('.profile-shell'),r=p.getBoundingClientRect();return {mosaic:!!board.querySelector('.profile-game-map'),pieces:board.querySelectorAll('.piece-img').length,status:getComputedStyle(p.querySelector('.profile-status')).display,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height}};})()`);
    assert.equal(cover.mosaic,true); assert.equal(cover.pieces,0); assert.equal(cover.status,'none');
    assert.ok(cover.rect.left >= 0 && cover.rect.right <= width+1 && cover.rect.top >= 0 && cover.rect.bottom <= height+1 && cover.rect.height > 180, JSON.stringify(cover.rect));
    const shot = await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,`profile-${width}x${height}.png`),Buffer.from(shot.data,'base64'));
    const stable = await run(`import('./analysis.js').then(m=>{const w=m.profileWorkspace,b=w.boardEl,map=b.querySelector('.profile-game-map');m.paintBoard();m.buildBoard();const stableCover=map===b.querySelector('.profile-game-map');w.nav.querySelector('.pv-next').click();return {sameBoard:b===document.querySelector('.board'),stableCover,index:m.S.idx,original:profileReviewIdx,slide:w.deck[w.index].id};})`);
    assert.ok(stable.sameBoard); assert.ok(stable.stableCover); assert.equal(stable.index,stable.original); assert.equal(stable.slide,'numbers');
    await sleep(1500);
    for (const id of ['numbers', 'rating']) {
      if (id === 'rating') await run("import('./analysis.js').then(m=>m.profileWorkspace.go(m.profileWorkspace.deck.findIndex(s=>s.id==='rating')))");
      if (id === 'rating') {
        await run("(()=>{[...document.querySelectorAll('.pv-modes button')].find(b=>b.textContent==='Bullet').click();const chart=document.querySelector('.pv-line'),r=chart.getBoundingClientRect();chart.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+r.width/2}));})()");
        assert.equal(await run("document.querySelector('.pv-inspect').hidden"), false);
        assert.match(await run("document.querySelector('.pv-story-label').textContent"), /Bullet rating/);
        await sleep(1000);
      }
      const screenshot = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
      await fs.writeFile(path.join(out, `profile-${id}-${width}x${height}.png`), Buffer.from(screenshot.data, 'base64'));
    }
    const slides = await run(`import('./analysis.js').then(async m=>{const w=m.profileWorkspace,out=[];for(let i=0;i<w.deck.length;i++){w.go(i);await new Promise(r=>setTimeout(r,30));out.push({id:w.deck[i].id,duplicates:[...w.boardEl.querySelectorAll('.sq')].some(s=>s.querySelectorAll('.piece-img').length>1)});}return out;})`);
    assert.ok(slides.length>=12); assert.ok(slides.every(s=>!s.duplicates));
    const chapters = await run("Array.from(document.querySelectorAll('.profile-overview button'), button => button.dataset.chapter)");
    assert.deepEqual(chapters, slides.slice(0, -1).map(slide => slide.id));
    await run("document.querySelector('.profile-overview [data-chapter=numbers]').click()");
    assert.equal(await run("document.querySelector('.pv-story').dataset.slide"), 'numbers');
    // Exercise resizing while open in both directions, including reattaching
    // the compact board to the review module before restoring the game.
    await call('Emulation.setDeviceMetricsOverride', {width:width>900?800:1280,height,deviceScaleFactor:1,mobile:false}, review.sessionId);
    await sleep(100);
    assert.equal(await run("document.querySelectorAll('.profile-board .sq').length"),64);
    await call('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false}, review.sessionId);
    await sleep(100);
    await run("import('./analysis.js').then(async m=>{await m.profileWorkspace.close();await m.openLearning();})");
    await waitFor(review, "import('./analysis.js').then(m=>!!m.learningWorkspace?.ready)", 'Learning after profile');
    await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
    await waitFor(review, "import('./analysis.js').then(m=>!m.learningWorkspace)", 'Review restored');
    assert.equal(await run("document.querySelectorAll('.profile-piece').length"),0);
    evidence.push({width,height,cover,slides:slides.length});
  }
  await fs.writeFile(path.join(out,'profile-results.json'),JSON.stringify({engine:engineJob,viewports:evidence},null,2));
  console.log('Profile browser audit passed: '+out);
}
