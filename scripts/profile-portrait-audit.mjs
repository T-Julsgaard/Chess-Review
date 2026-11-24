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
  assert.equal(await run("!!document.querySelector('.lang-overlay')"), false, 'No first-use language prompt');
  const rows = season();
  await run(`import('./browser-compat.js').then(({browserAPI})=>browserAPI.storage.local.set(${JSON.stringify({[rowsKey('chesscom', 'tester')]: {rows, months: [], since: 0, updatedAt: Date.now()}})}))`);
  await run(`import('./analysis.js').then(async m=>{m.S.settings.uiAnim=true;m.S.settings.pieceStyle='merida';m.S.settings.profileDepth='off';m.S.settings.profilePortraitStyle='assemble';document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await m.openProfile();const w=m.profileWorkspace;w.account='tester';w.renderHead();await w.load();w.go(w.deck.findIndex(s=>s.id==='twin'));})`);
  await waitFor(review, "!!document.querySelector('.profile-portrait-pieces')", 'Portrait mounted');
  const opening = await run("[...document.querySelectorAll('.profile-board > .sq')].map(sq=>sq.querySelector('.profile-piece')?.dataset.piece||null)");
  const backRank = [...'RNBQKBNR'];
  const expectedOpening = [...backRank.map(p => 'b' + p), ...Array(8).fill('bP'), ...Array(32).fill(null), ...Array(8).fill('wP'), ...backRank.map(p => 'w' + p)];
  assert.ok(JSON.stringify(opening) === JSON.stringify(expectedOpening) || JSON.stringify(opening) === JSON.stringify(expectedOpening.slice().reverse()), 'The twin reveal starts from the complete standard opening position');
  await waitFor(review, "document.querySelector('.profile-board').getAnimations({subtree:true}).every(a=>a.playState!=='running')", 'Opening pieces settled');
  assert.equal(await run("[...document.querySelectorAll('.profile-board .profile-piece')].filter(p=>p.style.visibility!=='hidden').length"), 32, 'The full army settles visibly before the portrait starts');
  await shot('portrait-position');
  await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", 'Assembled face');
  await shot('portrait-assembled');
  await run("import('./analysis.js').then(m=>{m.S.settings.profilePortraitStyle='morph';const w=m.profileWorkspace;window.morphStart=performance.now();window.morphFrames=[];let previous=performance.now();function frame(now){morphFrames.push(now-previous);previous=now;if(!w.portrait?.revealed)requestAnimationFrame(frame);}w.showPortrait(w.deck.find(s=>s.id==='twin').board);requestAnimationFrame(frame);})");
  await sleep(1950); await shot('morph-pieces');
  await sleep(600); await shot('morph-stretching');
  await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", 'Morphed face');
  const timing = await run("({elapsed:performance.now()-morphStart,frames:morphFrames.length,p95:morphFrames.slice().sort((a,b)=>a-b)[Math.floor(morphFrames.length*.95)]})");
  assert.ok(timing.elapsed > 3700 && timing.elapsed < 7000, JSON.stringify(timing));
  await shot('morph-assembled');
  await run("import('./analysis.js').then(m=>{m.S.settings.profilePortraitStyle='inlay';const w=m.profileWorkspace;w.showPortrait(w.deck.find(s=>s.id==='twin').board);})");
  await waitFor(review, "!!document.querySelector('.profile-portrait-pieces')", 'Inlay mounted');
  assert.equal(await run("document.querySelectorAll('.profile-portrait-plate').length"), 0, 'Inlay has no backing plate');
  await sleep(2600); await shot('inlay-building');
  await sleep(700); await shot('inlay-fitting');
  await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", 'Entire image made from pieces');
  await shot('inlay-assembled');
  await run("import('./analysis.js').then(m=>{m.S.settings.profilePortraitStyle='relief';const w=m.profileWorkspace;window.reliefFrames=[];let previous=performance.now();function frame(now){reliefFrames.push(now-previous);previous=now;if(!w.portrait?.revealed)requestAnimationFrame(frame);}w.showPortrait({...w.deck.find(s=>s.id==='twin').board,portrait:'carlsen',name:'Magnus Carlsen'});requestAnimationFrame(frame);})");
  await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", 'Detailed Magnus portrait');
  const reliefTiming = await run("({frames:reliefFrames.length,p95:reliefFrames.slice(2).sort((a,b)=>a-b)[Math.floor((reliefFrames.length-2)*.95)]})");
  console.log('Relief frame timing: ' + JSON.stringify(reliefTiming));
  const portraitImage = await run("document.querySelector('.profile-portrait-pieces').toDataURL('image/png').split(',')[1]");
  await fs.writeFile(path.join(out, 'relief-magnus.png'), Buffer.from(portraitImage, 'base64'));
  const departure = await run("import('./analysis.js').then(m=>{const w=m.profileWorkspace,canvas=document.querySelector('.profile-portrait-pieces'),before=canvas.toDataURL();w.go(w.deck.findIndex(s=>s.id==='cover'));const ghost=document.querySelector('.profile-portrait-relief-exit');return {connected:ghost?.parentNode===document.body,same:ghost?.toDataURL()===before};})");
  assert.ok(departure.connected && departure.same, 'The departure starts on the exact displayed frame');
  await sleep(450); await shot('relief-departure');
  await waitFor(review, "!document.querySelector('.profile-portrait-relief-exit')", 'Smooth departure completed');
  await run("import('./analysis.js').then(m=>{const w=m.profileWorkspace;w.go(w.deck.findIndex(s=>s.id==='twin'));})");
  await run("import('./analysis.js').then(m=>{m.S.settings.uiAnim=false;m.S.settings.profilePortraitStyle='halftone';const w=m.profileWorkspace;w.showPortrait(w.deck.find(s=>s.id==='twin').board);})");
  await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", 'Original mosaic style');
  await shot('portrait-original-mosaic');
  await run("import('./analysis.js').then(m=>{m.S.settings.profilePortraitStyle='assemble';})");
  const evidence = [];
  for (const [width, height, set] of [[1920, 1080, 'merida'], [600, 800, 'cburnett']]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await run(`import('./analysis.js').then(m=>{m.S.settings.uiAnim=false;m.S.settings.pieceStyle='${set}';})`);
    const ids = await run("import('./lib/profile/portraits.js').then(m=>Object.keys(m.PORTRAITS))");
    for (const style of ['assemble', 'morph', 'inlay', 'relief']) for (const id of ids) {
      await run(`import('./analysis.js').then(m=>{m.S.settings.profilePortraitStyle='${style}';})`);
      await run(`import('./analysis.js').then(m=>{const w=m.profileWorkspace;w.showPortrait({...w.deck.find(s=>s.id==='twin').board,portrait:'${id}',name:'${id}'});})`);
      await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", id + ' reduced motion');
      const state = await run(`(()=>{const b=document.querySelector('.profile-board'),c=b.querySelector('.profile-portrait-pieces'),ctx=c.getContext('2d'),pixels=ctx.getImageData(0,0,c.width,c.height).data;let filled=0,solid=0;const tones=new Set();for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>250){filled++;tones.add(pixels[i]);}if(pixels[i+3]>200)solid++;}return {width:c.width,height:c.height,filled,solid,plate:!!b.querySelector('.profile-portrait-plate'),tones:tones.size,hidden:[...b.querySelectorAll('.profile-piece')].every(p=>p.style.visibility==='hidden'),label:b.querySelector('[role=img]')?.getAttribute('aria-label'),sets:[...new Set([...b.querySelectorAll('.profile-piece')].map(p=>p.dataset.set))]};})()`);
      assert.ok(state.width > 100 && state.height === state.width, JSON.stringify(state));
      assert.ok(state.filled > state.width * state.height * .05, id + ': a readable face');
      assert.ok(state.tones >= 6, id + ': material contours rendered');
      assert.equal(state.hidden, true); assert.deepEqual(state.sets, [set]);
      assert.ok(state.label.includes(id));
      if (['inlay', 'relief'].includes(style)) {
        assert.equal(state.plate, false);
        assert.ok(state.solid > state.width * state.height * .999, `${id}: the pieces must cover the full image, including its background: ${state.solid / state.width / state.height}`);
      }
      evidence.push({id, style, viewport: [width, height], set, ...state});
      if (['tal', 'fischer', 'carlsen'].includes(id)) await shot(`${style}-${id}-${width}`);
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
  // Closing the whole profile detaches its board immediately. The departure
  // must retain the painted face in the document, then remove itself cleanly.
  await run("import('./analysis.js').then(m=>{m.S.settings.profilePortraitStyle='relief';const w=m.profileWorkspace;w.go(w.deck.findIndex(s=>s.id==='twin'));})");
  await waitFor(review, "import('./analysis.js').then(m=>m.profileWorkspace.portrait?.revealed)", 'Relief before close');
  const closing = await run("import('./analysis.js').then(m=>{const before=document.querySelector('.profile-portrait-pieces').toDataURL();m.profileWorkspace.close();const ghost=document.querySelector('.profile-portrait-relief-exit');return {connected:ghost?.parentNode===document.body,same:ghost?.toDataURL()===before};})");
  assert.ok(closing.connected && closing.same, 'Closing retains the exact portrait while the review board returns');
  await sleep(450); await shot('relief-closing-profile');
  await waitFor(review, "!document.querySelector('.profile-portrait-relief-exit')", 'Close departure cleanup');
  assert.equal(await run("document.querySelectorAll('.profile-portrait').length"), 0);
  await fs.writeFile(path.join(out, 'portrait-results.json'), JSON.stringify({timing, reliefTiming, portraits: evidence}, null, 2));
  console.log('Profile portrait browser audit passed: ' + out);
}
