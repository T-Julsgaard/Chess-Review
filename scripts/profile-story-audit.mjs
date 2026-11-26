import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {season} from '../tests/helpers/profile-season.mjs';
import {rowsKey} from '../lib/profile/store.js';

export async function auditLearning({review, call, evaluate, waitFor, sleep, out, settingsOnly = false, motionOnly = false}) {
  const run = code => evaluate(review, code);
  const rows = season().map((row, i) => ({...row, rated: i % 5 !== 0,
    ...(motionOnly ? {m1: 2, m1Missed: row.cls === 'bullet' ? 2 : 0, think: row.cls === 'bullet' ? 2 : 75,
      myRating: row.cls === 'bullet' ? 1700 - i : 1200 + i, oppRating: row.cls === 'bullet' ? 1800 : 1400} : {})}));
  await run("document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await run(`import('./browser-compat.js').then(({browserAPI})=>browserAPI.storage.local.set(${JSON.stringify({[rowsKey('chesscom', 'tester')]: {rows, months: [], since: 0, updatedAt: Date.now()}})}))`);
  await run(`import('./analysis.js').then(async m=>{m.S.settings.profileDepth='off';m.S.settings.uiAnim=true;await m.openProfile();window.w=m.profileWorkspace;w.account='tester';await w.load();})`);
  await waitFor(review, "document.querySelector('.pv-story')?.dataset.slide==='cover'", 'Story cover');
  await sleep(800);
  await run("document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  if (settingsOnly) return auditSettings({review, call, run, sleep, out});
  if (motionOnly) {
    await call('Page.bringToFront', {}, review.sessionId);
    return auditPanelMotion({run, sleep, waitFor: expression => waitFor(review, expression, 'Panel motion')});
  }
  // Panel width follows the user's saved review layout, independently of the
  // viewport. Keep mode switches usable beside long titles in narrow panels.
  const filterLayout = [];
  const panelStyle = await run('w.shell.style.cssText');
  for (const panelWidth of [280, 360, 480]) {
    for (const id of ['numbers', 'season', 'openings', 'signature', 'rival', 'hits', 'habits', 'clock', 'endings', 'rating']) {
      await run(`w.go(w.deck.findIndex(s=>s.id===${JSON.stringify(id)}));w.report.classOptions=['bullet','blitz','rapid','daily'];w.renderSlide({animate:false});Object.assign(w.shell.style,{left:'12px',width:'${panelWidth}px'})`);
      const layout = await run(`(()=>{const a=document.querySelector('.pv-story'),g=a.querySelector('.pv-filter,.pv-modes'),r=g.getBoundingClientRect();g.scrollLeft=0;const b=g.querySelector('button').getBoundingClientRect();g.scrollLeft=g.scrollWidth;const last=g.querySelector('button:last-child').getBoundingClientRect();g.scrollLeft=0;return {panelWidth:w.shell.getBoundingClientRect().width,chapter:a.dataset.slide,width:r.width,contentWidth:g.scrollWidth,available:a.clientWidth,visible:b.right>r.left&&b.left<r.right,lastVisible:last.right>r.left&&last.left<r.right,overflow:a.scrollWidth>a.clientWidth+1}})()`);
      filterLayout.push({panelWidth, ...layout});
      assert.ok(Math.abs(layout.panelWidth-panelWidth)<1 && layout.visible && layout.lastVisible && layout.width >= Math.min(layout.contentWidth, layout.available) - 1 && !layout.overflow, JSON.stringify(filterLayout.at(-1)));
    }
  }
  await run(`w.shell.style.cssText=${JSON.stringify(panelStyle)};w.rebuild()`);
  await fs.writeFile(path.join(out, 'profile-filter-layout.json'), JSON.stringify(filterLayout, null, 2));
  const evidence = [];
  for (const [width, height] of [[1920, 1080], [1366, 768], [600, 800]]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await run("w.cls='all';w.rebuild();w.go(w.deck.findIndex(s=>s.id==='numbers'))");
    await sleep(1200);
    const initial = await run(`(()=>{window.f=document.querySelector('.pv-filter');window.b=document.querySelector('.pv-wdl');window.thumb=f.firstChild;const a=document.querySelector('.pv-story'),h=document.querySelector('.pv-story-host'),n=document.querySelector('.pv-next').getBoundingClientRect(),p=document.querySelector('.pv-prev').getBoundingClientRect();return {top:a.getBoundingClientRect().top-h.getBoundingClientRect().top,widths:[n.width,p.width],transform:thumb.style.transform};})()`);
    assert.ok(initial.top < 24, 'Chapters start at the top');
    assert.ok(Math.abs(initial.widths[0] - initial.widths[1]) < 1, 'Equal navigation widths');
    await run("f.lastChild.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));document.querySelector('.pv-story-hero').click()");
    assert.equal(await run('thumb.style.transform'), initial.transform);
    assert.equal(await run('w.deck[w.index].id'), 'numbers');
    const transition = await run(`(()=>{const old=document.querySelector('.pv-story-figure').textContent;[...f.querySelectorAll('button')].find(b=>b.textContent==='Bullet').click();return {old,current:document.querySelector('.pv-story-figure').textContent,filter:f===document.querySelector('.pv-filter'),bar:b===document.querySelector('.pv-wdl'),target:w.report.totals.games};})()`);
    assert.ok(transition.filter && transition.bar, 'Filter and bar retain their nodes');
    assert.equal(transition.current, transition.old, 'The count starts at the displayed value');
    await sleep(120);
    const markerDuring = await run("new DOMMatrixReadOnly(getComputedStyle(thumb).transform).m41");
    await sleep(380);
    const markerAfter = await run("new DOMMatrixReadOnly(getComputedStyle(thumb).transform).m41");
    assert.ok(markerDuring >= 0 && markerDuring <= markerAfter && markerAfter > 0, `The marker travels to the clicked choice: ${markerDuring} → ${markerAfter}`);
    await waitFor(review, `document.querySelector('.pv-story-figure').textContent===${JSON.stringify(String(transition.target))}`, 'Filtered game count');
    await run("[...f.querySelectorAll('button')].find(b=>b.textContent==='Blitz').click()");
    await sleep(80);
    await run("f.querySelector('button').click()");
    await sleep(500);
    assert.equal(await run("document.querySelector('.pv-story-figure').textContent"), String(rows.filter(r => r.t <= Date.now()/1000).length));
    // The board's coloured boundaries move in place instead of replaying the
    // staggered square entrance whenever a time control is selected.
    await run("window.fillSquares=[...w.boardEl.querySelectorAll('.sq')];window.oldFills=fillSquares.map(s=>getComputedStyle(s).getPropertyValue('--fill-win'));[...f.querySelectorAll('button')].find(b=>b.textContent==='Bullet').click();window.fillIndex=fillSquares.findIndex((s,i)=>s.style.getPropertyValue('--fill-win')!==oldFills[i]);window.fillSquare=fillSquares[fillIndex];window.beforeFill=oldFills[fillIndex]");
    await sleep(100);
    const fill = await run("({same:fillSquare===w.boardEl.querySelectorAll('.sq')[fillIndex],moving:fillSquare.classList.contains('profile-fill-updating'),duration:getComputedStyle(fillSquare).transitionDuration,before:beforeFill,during:getComputedStyle(fillSquare).getPropertyValue('--fill-win'),target:fillSquare.style.getPropertyValue('--fill-win'),ghost:!!w.boardEl.querySelector('.profile-fill-ghost')})");
    assert.ok(fill.same && fill.moving && !fill.ghost, JSON.stringify(fill));
    assert.notEqual(fill.duration, '0s');
    assert.notEqual(fill.during, fill.before); assert.notEqual(fill.during, fill.target, 'the boundary is between its old and new positions');
    await run("f.querySelector('button').click()"); await sleep(650);
    await run("w.report.classOptions=['blitz','rapid','daily','bullet'];w.renderSlide({animate:false})");
    const header = await run("(()=>{const a=document.querySelector('.pv-story'),f=document.querySelector('.pv-filter');return {width:f.getBoundingClientRect().width,expected:Math.min(f.scrollWidth,a.clientWidth),overflow:a.scrollWidth>a.clientWidth+1}})()");
    assert.ok(header.width >= header.expected - 1 && !header.overflow, JSON.stringify(header));
    await run('w.rebuild()');
    // Every available time control keeps the progress rail's geometry, including
    // chapters whose data disappears in that mode. Navigation starts fresh on All.
    for (const id of ['numbers', 'season', 'signature', 'rival', 'hits', 'habits']) {
      await run(`w.go(w.deck.findIndex(s=>s.id===${JSON.stringify(id)}))`);
      const geometry = () => run("[...document.querySelectorAll('.pv-seg')].map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})");
      const before = await geometry();
      const modes = await run("[...document.querySelectorAll('.pv-filter button')].map(n=>n.dataset.value)");
      for (const mode of modes.filter(m => m !== 'all')) {
        await run(`document.querySelector('.pv-filter button[data-value="${mode}"]').click()`);
        await sleep(100);
        const after = await geometry();
        assert.equal(after.length, before.length, `${id}/${mode}: chapter count stays fixed`);
        assert.ok(after.every((rect, i) => rect.every((v, k) => Math.abs(v - before[i][k]) < .1)), `${id}/${mode}: progress rail stays fixed`);
      }
      await run("document.querySelector('.pv-next').click()");
      assert.equal(await run("w.cls==='all'&&w.rivalCls==='all'"), true);
    }
    await run("w.go(w.deck.findIndex(s=>s.id==='signature'))");
    await sleep(700);
    const comparison = await run("(()=>{const a=document.querySelector('.pv-story'),l=document.querySelector('.pv-cmp-list'),r=l.getBoundingClientRect(),n=document.querySelector('.pv-next').getBoundingClientRect();return {height:r.height,bottom:r.bottom,navTop:n.top,overflow:a.scrollWidth>a.clientWidth+1,count:l.children.length,expected:w.currentSlide().compare.length,first:l.querySelector('.pv-cmp-label').firstChild.textContent,lead:w.currentSlide().signatures[0].label}})()");
    assert.equal(comparison.count, comparison.expected);
    assert.equal(comparison.first, comparison.lead);
    assert.ok(comparison.height > 190 && !comparison.overflow && (width < 700 || comparison.bottom <= comparison.navTop), JSON.stringify(comparison));
    const signature = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, `profile-story-comparison-${width}.png`), Buffer.from(signature.data, 'base64'));
    await run("w.go(w.deck.findIndex(s=>s.id==='numbers'))");
    const numbers = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, `profile-story-numbers-${width}.png`), Buffer.from(numbers.data, 'base64'));
    await run("w.go(w.deck.findIndex(s=>s.id==='openings'))");
    assert.equal(await run("!!document.querySelector('.pv-reasons')"), false);
    await run("w.go(w.deck.findIndex(s=>s.id==='season'))");
    assert.equal(await run("document.querySelector('.pv-layer:not(.pv-leaving) .pv-col-label').style.height"), '5%');
    await run("w.cls='bullet';w.rebuild();w.go(w.deck.findIndex(s=>s.id==='rating'))");
    await sleep(1800);
    assert.equal(await run("document.querySelectorAll('.pv-modes button').length"), 2);
    await run("document.querySelector('.pv-line').dispatchEvent(new PointerEvent('pointermove',{clientX:w.boardEl.getBoundingClientRect().left+w.boardEl.getBoundingClientRect().width/2,bubbles:true}));");
    assert.equal(await run("document.querySelector('.pv-inspect').hidden"), false);
    const rating = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, `profile-story-rating-${width}.png`), Buffer.from(rating.data, 'base64'));
    await run(`w.o.loadPgn=async()=> '[White "White player"]\\n[Black "Black player"]\\n[WhiteElo "1540"]\\n[BlackElo "1620"]\\n\\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *';w.go(w.deck.findIndex(s=>s.id==='numbers'));document.querySelector('.pv-link').click();`);
    await waitFor(review, "document.querySelector('.profile-game-chrome')?.textContent.includes('1540')", 'Game metadata');
    await sleep(9500);
    await waitFor(review, "document.querySelector('.profile-game-eval')?.getAttribute('aria-label').startsWith('Evaluation:')", 'Game evaluation');
    const game = await run(`(()=>{const bar=document.querySelector('.profile-game-eval').getBoundingClientRect(),board=w.liveBoard.getBoundingClientRect(),chrome=document.querySelector('.profile-game-chrome');return {names:chrome.textContent,bar:{left:bar.left,right:bar.right,top:bar.top,height:bar.height},board:{left:board.left,top:board.top,height:board.height},eval:document.querySelector('.profile-game-eval').getAttribute('aria-label')};})()`);
    assert.ok(game.names.includes('White player') && game.names.includes('Black player') && game.names.includes('1620'));
    assert.ok(game.bar.left >= 0 && game.bar.right < game.board.left, JSON.stringify(game));
    assert.ok(Math.abs(game.bar.top - game.board.top) < 2 && Math.abs(game.bar.height - game.board.height) < 3);
    const controls = await run("(()=>{const r=document.querySelector('.profile-game-controls').getBoundingClientRect();return {bottom:r.bottom,top:r.top,count:document.querySelectorAll('.profile-game-controls button').length}})()");
    assert.ok(controls.count===3 && controls.bottom<=height && controls.top>=game.board.top+game.board.height, JSON.stringify(controls));
    const screenshot = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, `profile-story-game-${width}.png`), Buffer.from(screenshot.data, 'base64'));
    await run("document.querySelector('.profile-game-controls .exit-analysis').click()");
    assert.equal(await run("!!document.querySelector('.profile-game-chrome')"), false);
    assert.equal(await run("w.deck[w.index].id"), 'numbers');
    await sleep(1500);
    assert.equal(await run("document.querySelectorAll('.board .profile-fill').length"), 64);
    await run('w.go(w.deck.length - 1)');
    const overview = await run(`(() => {
      const board = w.boardEl.getBoundingClientRect(), tiles = [...w.boardEl.querySelectorAll('.profile-overview button')];
      return {
        ids: tiles.map(tile => tile.dataset.chapter),
        expected: w.deck.slice(0, -1).map(slide => slide.id),
        fits: tiles.every(tile => {
          const r = tile.getBoundingClientRect();
          return r.top >= board.top && r.left >= board.left && r.bottom <= board.bottom && r.right <= board.right && tile.scrollHeight <= tile.clientHeight + 1;
        }),
        share: document.querySelector('.profile-share').textContent.trim(),
      };
    })()`);
    assert.deepEqual(overview.ids, overview.expected);
    assert.ok(overview.fits);
    assert.equal(overview.share, 'Share with a friend');
    const recap = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, `profile-story-overview-${width}.png`), Buffer.from(recap.data, 'base64'));
    await run("w.boardEl.querySelector('.profile-overview [data-chapter=rating]').focus()");
    await call('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r'}, review.sessionId);
    await call('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13}, review.sessionId);
    assert.equal(await run('w.currentSlide().id'), 'rating');
    assert.equal(await run('document.activeElement === w.slideHost.firstElementChild'), true);
    evidence.push({width, height, initial, transition, game});
  }
  await run('w.close()');
  await fs.writeFile(path.join(out, 'profile-story-evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ok: true, out, viewports: evidence.length}));
}

/** Real layout and WAAPI coverage for the playstyle panel's mode/sort transitions. */
async function auditPanelMotion({run, sleep, waitFor}) {
  await run("w.engine=Object.fromEntries(w.rows.map((r,i)=>[r.id,{acc:(r.cls==='bullet'?60:80)+i%8}]));w.rebuild()");
  for (const id of ['numbers', 'rating', 'hits', 'clock', 'trend', 'endings', 'mate1']) {
    await run(`w.go(w.deck.findIndex(s=>s.id==='${id}'));${id === 'rating' ? "w.ratingClass='blitz';w.renderSlide({animate:false})" : "w.cls='blitz';w.rebuild()"}`);
    await sleep(1100);
    const change = await run(`(()=>{
      const figure=()=>document.querySelector('.pv-story-figure').textContent,before=figure();
      ${id === 'rating' ? "[...document.querySelectorAll('.pv-modes button')].find(b=>b.textContent==='Bullet').click()" : "document.querySelector('.pv-filter [data-value=bullet]').click()"};
      return {before,shown:figure(),target:w.hero(w.currentSlide()).value};
    })()`);
    assert.notEqual(change.before, change.target, `${id}: fixture values differ`);
    assert.equal(change.shown, change.before, `${id}: starts at the displayed value`);
    await sleep(120);
    const during = await run("document.querySelector('.pv-story-figure').textContent");
    assert.notEqual(during, change.before, `${id}: counts toward the target`);
    assert.notEqual(during, change.target, `${id}: shows intermediate values`);
    await waitFor(`document.querySelector('.pv-story-figure').textContent===${JSON.stringify(change.target)}`);
  }
  await run("w.go(w.deck.findIndex(s=>s.id==='openings'))");
  await sleep(1100);
  const opening = await run(`(()=>{
    const rates=()=>[...document.querySelectorAll('.pv-rank-value')].map(n=>n.textContent);
    const before=rates();document.querySelectorAll('.pv-tabs button')[1].click();
    return {before,shown:rates(),bars:[...document.querySelectorAll('.pv-rank-meter i')].filter(b=>b.getAnimations().length).length};
  })()`);
  assert.deepEqual(opening.shown, opening.before);
  assert.ok(opening.bars > 0, 'opening meters animate to the newly sorted win rates');
  await sleep(120);
  const middle = await run("[...document.querySelectorAll('.pv-rank-value')].map(n=>n.textContent)");
  assert.notDeepEqual(middle, opening.before, 'opening percentages count while the bars travel');
  await sleep(450);
  assert.equal(await run("[...document.querySelectorAll('.pv-rank-row')].every(r=>Math.abs(parseFloat(r.querySelector('.pv-rank-value').textContent)-parseFloat(r.querySelector('.pv-rank-meter i').style.width))<.01)"), true);
  await run("w.go(w.deck.findIndex(s=>s.id==='signature'))");
  await sleep(1100);
  const comparison = await run(`(()=>{
    window.motionList=document.querySelector('.pv-cmp-list');window.motionTop=document.querySelector('.pv-story-top');
    const first=motionList.firstElementChild;window.motionFirst=first;
    const before=first.getBoundingClientRect().top;
    document.querySelector('.pv-filter [data-value="bullet"]').click();
    return {list:motionList===document.querySelector('.pv-cmp-list'),top:motionTop===document.querySelector('.pv-story-top'),
      row:motionFirst===motionList.firstElementChild,before,after:motionFirst.getBoundingClientRect().top,
      translated:motionList.getAnimations({subtree:true}).some(a=>a.effect.getKeyframes().some(k=>k.transform&&k.transform!=='none'))};
  })()`);
  assert.ok(comparison.list && comparison.top && comparison.row, JSON.stringify(comparison));
  assert.ok(Math.abs(comparison.before-comparison.after)<1, 'the first unchanged row stays put');
  assert.equal(comparison.translated, false, 'no staggered movement of the list');
  await sleep(500);
  const panelStyle = await run('w.shell.style.cssText');
  for (const width of [280, 360, 480]) for (const points of [11, 17]) {
    const wrap = await run(`(()=>{
      w.go(w.deck.findIndex(s=>s.id==='swings'));w.deck[w.index]={...w.currentSlide(),title:'Down ${points} points, still won'};
      w.renderSlide({animate:false});Object.assign(w.shell.style,{left:'12px',width:'${width}px'});
      const figure=document.querySelector('.pv-story-figure'),phrase=figure.querySelector('.pv-story-phrase'),range=document.createRange();range.selectNodeContents(phrase);
      return {lines:range.getClientRects().length,overflow:figure.scrollWidth>figure.clientWidth+1,text:phrase.textContent};
    })()`);
    assert.equal(wrap.lines, 1, JSON.stringify({width,points,...wrap}));
    assert.equal(wrap.overflow, false, JSON.stringify({width,points,...wrap}));
    assert.equal(wrap.text, `Down ${points} points,`);
  }
  await run(`w.shell.style.cssText=${JSON.stringify(panelStyle)};w.cls='all';w.rebuild()`);
  console.log('Playstyle motion: all seven headline counters, opening meters/counts, stable comparison rows and comeback wrapping passed.');
}

async function auditSettings({review, call, run, sleep, out}) {
  const settingsLayout = [];
  for (const [width, height] of [[1920, 1080], [600, 800]]) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}, review.sessionId);
    await run("document.querySelector('.pv-settings').click()");
    await sleep(250);
    const measure = () => run(`(() => {
      const menu = document.querySelector('.pv-settings-menu');
      const pixel = document.createElement('canvas').getContext('2d');
      pixel.fillStyle = getComputedStyle(menu).backgroundColor;
      pixel.fillRect(0, 0, 1, 1);
      const rects = [menu, ...menu.querySelectorAll('.pv-set-top, .pv-set-row, .pv-set-switch, .pv-set-search, .pv-set-opp, .pv-set-foot')].map(node => {
        const {x, y, width, height} = node.getBoundingClientRect();
        return [x, y, width, height];
      });
      return {alpha: pixel.getImageData(0, 0, 1, 1).data[3], rects, note: menu.querySelector('.pv-set-note')?.textContent ?? null};
    })()`);
    const before = await measure();
    await run("document.querySelector('[data-focus=profileRatedOnly]').click()");
    const filtered = await measure();
    const screenshot = await call('Page.captureScreenshot', {format: 'png'}, review.sessionId);
    await fs.writeFile(path.join(out, `profile-story-settings-${width}.png`), Buffer.from(screenshot.data, 'base64'));
    await run("document.querySelector('.pv-set-reset').click()");
    const reset = await measure();
    await run("document.querySelector('.pv-settings').click()");
    settingsLayout.push({width, before, filtered, reset});
  }
  for (const {width, before, filtered, reset} of settingsLayout) {
    assert.equal(before.alpha, 255, `${width}px: settings background is opaque`);
    assert.equal(before.note, null);
    assert.match(filtered.note, /^[1-9]\d* games? left out$/);
    assert.deepEqual(filtered.rects, before.rects, `${width}px: settings stay in place when the count appears`);
    assert.deepEqual(reset, before, `${width}px: settings stay in place after reset`);
  }
  console.log(JSON.stringify({ok: true, out, settingsViewports: settingsLayout.map(({width}) => width)}));
}
