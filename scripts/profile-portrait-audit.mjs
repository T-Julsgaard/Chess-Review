import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {season} from '../tests/helpers/profile-season.mjs';
import {rowsKey} from '../lib/profile/store.js';

// Run with: node scripts/learning-browser.mjs --working-tree --profile-portrait
export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const shot = async name => {
    const {data} = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, name + '.png'), Buffer.from(data, 'base64'));
  };
  await run("document.querySelector('.lang-later')?.click()");
  assert.equal(await run("!!document.querySelector('.lang-overlay')"), false, 'First-use dialog is dismissed for visual QA');
  const rows = season();
  await run(`import('./browser-compat.js').then(({browserAPI})=>browserAPI.storage.local.set(${JSON.stringify({[rowsKey('chesscom', 'tester')]: {rows, months: [], since: 0, updatedAt: Date.now()}})}))`);
  await run(`import('./analysis.js').then(async m=>{m.S.settings.uiAnim=true;m.S.settings.pieceStyle='merida';m.S.settings.profileDepth='off';m.S.settings.profilePortraitStyle='assemble';document.querySelector('.learning-announcement-disable')?.click();await m.openProfile();const w=m.profileWorkspace;w.account='tester';w.renderHead();await w.load();w.go(w.deck.findIndex(s=>s.id==='twin'));})`);
  await waitFor(review, "!!document.querySelector('.profile-portrait-pieces')", 'Portrait mounted');
  await shot('portrait-position');
  await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", 'Assembled face');
  await shot('portrait-assembled');
  await run("import('./analysis.js').then(m=>{m.S.settings.uiAnim=false;m.S.settings.profilePortraitStyle='halftone';const w=m.profileWorkspace;w.showPortrait(w.deck.find(s=>s.id==='twin').board);})");
  await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", 'Original mosaic style');
  await shot('portrait-original-mosaic');
  await run("import('./analysis.js').then(m=>{m.S.settings.profilePortraitStyle='assemble';})");
  const evidence = [];
  for (const [width, height, set] of [[1920, 1080, 'merida'], [600, 800, 'cburnett']]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await run(`import('./analysis.js').then(m=>{m.S.settings.uiAnim=false;m.S.settings.pieceStyle='${set}';})`);
    const ids = await run("import('./lib/profile/portraits.js').then(m=>Object.keys(m.PORTRAITS))");
    for (const id of ids) {
      await run(`import('./analysis.js').then(m=>{const w=m.profileWorkspace;w.showPortrait({...w.deck.find(s=>s.id==='twin').board,portrait:'${id}',name:'${id}'});})`);
      await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", id + ' reduced motion');
      const state = await run(`(()=>{const b=document.querySelector('.profile-board'),c=b.querySelector('.profile-portrait-pieces'),ctx=c.getContext('2d'),pixels=ctx.getImageData(0,0,c.width,c.height).data;let filled=0;const tones=new Set();for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>250){filled++;tones.add(pixels[i]);}return {width:c.width,height:c.height,filled,tones:tones.size,hidden:[...b.querySelectorAll('.profile-piece')].every(p=>p.style.visibility==='hidden'),label:b.querySelector('[role=img]')?.getAttribute('aria-label'),sets:[...new Set([...b.querySelectorAll('.profile-piece')].map(p=>p.dataset.set))]};})()`);
      assert.ok(state.width > 100 && state.height === state.width, JSON.stringify(state));
      assert.ok(state.filled > state.width * state.height * .05, id + ': a readable face');
      assert.ok(state.tones >= 6, id + ': material contours rendered');
      assert.equal(state.hidden, true); assert.deepEqual(state.sets, [set]);
      assert.ok(state.label.includes(id));
      evidence.push({id, viewport: [width, height], set, ...state});
      if (['tal', 'fischer', 'carlsen'].includes(id)) await shot(`portrait-${id}-${width}`);
    }
    await run("import('./analysis.js').then(m=>m.profileWorkspace.leavePortrait())");
    await waitFor(review, "!document.querySelector('.profile-portrait-pieces')", 'Original position restored');
    assert.equal(await run("document.querySelectorAll('.profile-piece[style*=hidden]').length"), 0);
  }
  // Interrupt an animated face, then switch slides and close. Nothing may hide
  // pieces in the next chapter or leave an animation canvas over the review.
  await run("import('./analysis.js').then(m=>{m.S.settings.uiAnim=true;const w=m.profileWorkspace;w.showPortrait(w.deck.find(s=>s.id==='twin').board);})");
  await sleep(1550);
  await shot('portrait-unfolding');
  await run("import('./analysis.js').then(m=>{const w=m.profileWorkspace;w.go(w.deck.findIndex(s=>s.id==='cover'));})");
  await sleep(1500);
  assert.equal(await run("document.querySelectorAll('.profile-portrait-pieces').length"), 0);
  assert.equal(await run("document.querySelectorAll('.profile-piece[style*=hidden]').length"), 0);
  await run("import('./analysis.js').then(m=>m.profileWorkspace.close())");
  assert.equal(await run("document.querySelectorAll('.profile-portrait').length"), 0);
  await fs.writeFile(path.join(out, 'portrait-results.json'), JSON.stringify(evidence, null, 2));
  console.log('Profile portrait browser audit passed: ' + out);
}
