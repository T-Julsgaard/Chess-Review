import fs from 'node:fs/promises';
import path from 'node:path';
import {season} from '../tests/helpers/profile-season.mjs';
import {rowsKey} from '../lib/profile/store.js';

// Laptop and desktop fit: every common viewport, at 100%, 125% and 150% display
// scaling, keeps Accuracy, Quality and Engine free of scroll bars for 1–3 lines,
// keeps the coach clear of the explanations switch, keeps rail buttons clear of
// Feedback, and shows every Playstyle chapter without scrolling.
// Viewports are CSS pixels inside a maximized browser (tabs, address bar, taskbar).
export const LAPTOP_VIEWPORTS = [
  [1920, 945], [1920, 880], [1680, 900], [1600, 770], [1536, 730], [1536, 760], [1504, 870], [1512, 860],
  [1440, 780], [1440, 700], [1366, 640], [1366, 768], [1280, 720], [1280, 680], [1280, 585], [1280, 550],
  [1707, 830], [1745, 980], [2560, 1300], [3440, 1300], [3840, 2000], [1100, 620],
];
const SCALES = [1, 1.25, 1.5];
// Elements that show a scroll bar: real overflow, or a sub-pixel overflow that
// still makes the browser draw one (scrollHeight rounds it away).
const SCROLLBARS = `(root=>[...root.querySelectorAll('*')].filter(n=>{const s=getComputedStyle(n);if(!/(auto|scroll)/.test(s.overflowY))return false;
  const r=n.getBoundingClientRect();if(!r.width||!r.height||s.visibility==='hidden')return false;
  const bar=n.offsetWidth-n.clientWidth-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth);
  return bar>.5&&s.scrollbarGutter==='auto'||n.scrollHeight>n.clientHeight&&s.scrollbarWidth!=='none';})
  .map(n=>({cls:String(n.className).slice(0,90),over:n.scrollHeight-n.clientHeight,h:n.clientHeight})))`;
const rect = `n=>{if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,r:r.right,b:r.bottom,w:r.width,h:r.height}}`;

export async function auditLearning({review, call, evaluate, waitFor, sleep, out}) {
  const run = expression => evaluate(review, expression);
  const frames = () => run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const failures = [], evidence = [];
  const fail = (label, msg, data) => failures.push({label, msg, data});
  const shot = async (name, clip) => { const s = await call('Page.captureScreenshot', {format: 'png', ...(clip && {clip: {...clip, scale: 1}})}, review.sessionId); await fs.writeFile(path.join(out, name + '.png'), Buffer.from(s.data, 'base64')); };
  // LAPTOP_FIT_ONLY=review or =profile runs one half (for quicker design iteration).
  const only = process.env.LAPTOP_FIT_ONLY;
  const size = async (width, height, deviceScaleFactor) => { await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor, mobile: false}, review.sessionId); await sleep(250); await frames(); };
  await run("document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await waitFor(review, "!document.querySelector('#startup')&&import('./analysis.js').then(m=>m.S.positions.length>4&&!m.S.analyzing)", 'Completed review');
  await run("import('./analysis.js').then(async m=>{await m.applyUiSetup('modern');m.S.settings.moveAnim=false;await m.setCoachEngineReplies(false);m.go(12);})");
  await sleep(500);
  // The approved desktop composition: the coach's inset from the review panel's right edge, in panel units.
  await size(1920, 945, 1);
  const desktop = await run(`(()=>{const R=${rect},c=R(document.querySelector('[data-mod=coach]')),v=R(document.querySelector('[data-mod=review]'));
    return {inset:(v.r-c.r)/v.w,width:c.w/v.w};})()`);
  if (only !== 'profile') for (const [width, height] of LAPTOP_VIEWPORTS) for (const scale of SCALES) {
    const label = `${width}x${height}@${scale}`;
    await size(width, height, scale);
    for (const lines of [3, 2, 1]) {
      await run(`import('./analysis.js').then(m=>{m.S.settings.engineLines=${lines};m.renderEngineCurrent();})`);
      await sleep(80); await frames();
      for (const page of [0, 1]) {
        await run(`import('./analysis.js').then(m=>m.setAccuracyPage(${page}))`);
        await frames(); await sleep(30); await frames();
        const data = await run(`(()=>{const R=${rect},q=s=>document.querySelector(s);
          const page=q('[data-mod=accuracy] .acc-page'),content=page?.querySelector('.acc-fit-content');
          const names=[...document.querySelectorAll('[data-mod=accuracy] .acc-name')].map(n=>n.scrollWidth-n.clientWidth);
          const font=n=>n?parseFloat(getComputedStyle(n).fontSize)*(content?Number(content.style.zoom||1):1)*(R(q('[data-mod=accuracy]')).w/q('[data-mod=accuracy]').offsetWidth):0;
          return {coach:R(q('[data-mod=coach]:not([hidden])')),review:R(q('[data-mod=review]')),toggle:R(q('.ip-explanations-toggle')),close:R(q('.ip-close-game')),
            accuracy:R(q('[data-mod=accuracy]')),stage:q('.stage').classList.contains('full-hd-reference'),
            zoom:content?Number(content.style.zoom||1):1,names:Math.max(0,...names),compact:!!content?.classList.contains('acc-compact'),
            cells:[...document.querySelectorAll('[data-mod=accuracy] .phase-report-cell')].map(n=>n.getBoundingClientRect().width),
            dials:[...document.querySelectorAll('[data-mod=accuracy] .acc-dial')].map(n=>{const r=n.getBoundingClientRect();return r.x+r.width/2;}),
            columns:[...document.querySelectorAll('[data-mod=accuracy] .phase-report-row:first-child .phase-report-cell')].map(n=>{const r=n.getBoundingClientRect();return r.x+r.width/2;}),
            nameFont:font(q('[data-mod=accuracy] .acc-name')),labelFont:font(q('[data-mod=accuracy] .qlabel .nm')),
            scrollbars:${SCROLLBARS}(q('.stage')).filter(s=>!/moves|ml-|panel-body$/.test(s.cls)||/acc-|engine/.test(s.cls))};})()`);
        const context = {label, lines, page};
        for (const bar of data.scrollbars) if (/acc-|engine/.test(bar.cls)) fail(label, `scroll bar in ${bar.cls}`, {...context, bar});
        if (data.names > 1) fail(label, 'player name truncated in Accuracy', context);
        // Compact overview: every score box has one size, and each dial sits over its column.
        if (page === 0 && data.compact && data.cells.length) {
          if (Math.max(...data.cells) - Math.min(...data.cells) > 1) fail(label, 'compact score boxes differ in width', {...context, cells: data.cells});
          if (data.dials.some((x, i) => Math.abs(x - data.columns[i]) > 1.5)) fail(label, 'compact dials off their columns', {...context, dials: data.dials, columns: data.columns});
        }
        if (page === 1 && data.labelFont && data.labelFont < 8) fail(label, `Quality labels too small (${data.labelFont.toFixed(1)}px)`, context);
        // 9px floor: the shortest window (1280x550, 1080p at 150% with bookmarks) with three lines lands near 9.3px.
        if (data.nameFont < 9) fail(label, `Accuracy text too small (${data.nameFont.toFixed(1)}px names)`, {...context, zoom: data.zoom});
        if (data.coach && data.stage) {
          const inset = (data.review.r - data.coach.r) / data.review.w;
          if (inset < desktop.inset - .005) fail(label, 'coach closer to the panel edge than on desktop', {...context, inset, desktop});
          if (data.coach.r > data.toggle.x + (data.toggle.w * .35) + 1 && inset < desktop.inset - .005) fail(label, 'coach over the explanations switch', context);
        }
        if (page === 0 && lines === 2) evidence.push({label, zoom: data.zoom, nameFont: +data.nameFont.toFixed(1)});
        if (page === 0 && lines === 2 && scale === 1.25) await shot(`overview-${label}`);
        // Crops show the settled page: after the page turn's leaf and the overview's reveal.
        if (page === 0 && lines !== 2) {
          await waitFor(review, "!document.querySelector('[data-mod=accuracy] :is(.acc-turn-leaf,.acc-reveal-slot)')", 'Accuracy page turn and reveal');
          await sleep(150); await frames();
          await shot(`accuracy-${label}-${lines}`, {x: data.accuracy.x, y: data.accuracy.y, width: data.accuracy.w, height: data.accuracy.h});
        }
      }
    }
    // Rail buttons stay clear of the floating Feedback button (after the rail's glide settles).
    await sleep(650);
    const rail = await run(`(()=>{const R=${rect},f=R(document.querySelector('.feedback-floating'));if(!f||!f.w)return [];
      return [...document.querySelectorAll('.section-rail button')].map(b=>({t:b.textContent.trim(),...R(b)})).filter(b=>b.w&&Math.min(b.r,f.r)-Math.max(b.x,f.x)>0&&Math.min(b.b,f.b)-Math.max(b.y,f.y)>0).map(b=>b.t);})()`);
    if (rail.length) fail(label, 'Feedback covers the section rail: ' + rail.join(', '));
    if (scale === 1.25) await shot(`review-${label}`);
  }
  // Stacked layouts (tablets, narrow windows, phones) place a smaller coach in the
  // same corner; it must leave the explanations switch and close button uncovered
  // as much as the desktop portrait does (at most its transparent right fifth).
  if (only !== 'profile') for (const [width, height] of [[1024, 768], [1080, 1800], [820, 1180], [768, 1024], [430, 932], [390, 844], [1280, 470]]) {
    const label = `${width}x${height}`;
    await size(width, height, 1);
    await run("import('./analysis.js').then(m=>{m.S.settings.engineLines=2;m.renderEngineCurrent();m.setAccuracyPage(0);scrollTo(0,0);})");
    await sleep(150); await frames();
    const data = await run(`(()=>{const R=${rect},q=s=>document.querySelector(s);return {coach:R(q('[data-mod=coach]:not([hidden])')),toggle:R(q('.ip-explanations-toggle')),opening:R(q('.ip-op-txt'))};})()`);
    if (data.coach?.w && data.toggle?.w) {
      const covered = Math.max(0, Math.min(data.coach.r, data.toggle.r) - Math.max(data.coach.x, data.toggle.x));
      const vertical = Math.min(data.coach.b, data.toggle.b) - Math.max(data.coach.y, data.toggle.y) > 0;
      if (vertical && covered > data.coach.w * .22) fail(label, 'stacked coach over the explanations switch', data);
      if (data.opening && data.opening.r > data.coach.x + data.coach.w * .2 && data.opening.b > data.coach.y) fail(label, 'opening name under the stacked coach', data);
    }
    await shot(`stacked-${label}`);
  }
  // Removing lines through the panel animates the fit; it must settle without a scroll bar.
  if (only !== 'profile') for (const [width, height] of [[1536, 730], [1366, 640], [1280, 680], [1920, 945]]) for (const scale of [1.25, 1.5]) {
    const label = `${width}x${height}@${scale}`;
    await size(width, height, scale);
    await run(`import('./analysis.js').then(m=>{m.S.settings.engineLines=3;m.renderEngineCurrent();m.setAccuracyPage(0);})`);
    await sleep(500);
    for (const button of ['remove', 'remove', 'add', 'add']) {
      await run(`document.querySelector('.engine-minimal-${button}')?.click()`);
      await sleep(520); await frames();
      const bars = await run(`${SCROLLBARS}(document.querySelector('[data-mod=accuracy]'))`);
      if (bars.length) fail(label, `scroll bar after ${button} line`, bars);
    }
  }
  // Playstyle
  if (only === 'review') return finish();
  const rows = season();
  await run(`import('./browser-compat.js').then(({browserAPI})=>browserAPI.storage.local.set(${JSON.stringify({[rowsKey('chesscom', 'tester')]: {rows, months: [], since: 0, updatedAt: Date.now()}})}))`);
  await size(1920, 945, 1);
  await run(`import('./analysis.js').then(async m=>{m.S.settings.profileDepth='off';await m.openProfile();window.w=m.profileWorkspace;w.account='tester';await w.load();})`);
  await waitFor(review, "document.querySelector('.pv-story')?.dataset.slide==='cover'", 'Story cover');
  await sleep(800);
  await run("document.querySelector('.learning-announcement')&&document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  const ids = await run('w.deck.map(s=>s.id)');
  const profileEvidence = [];
  for (const [width, height] of LAPTOP_VIEWPORTS) for (const scale of [1, 1.5]) {
    const label = `${width}x${height}@${scale}`;
    await size(width, height, scale);
    for (const [i, id] of ids.entries()) {
      await run(`w.go(${i})`); await sleep(120); await frames();
      const data = await run(`(()=>{const R=${rect},shell=document.querySelector('.profile-shell'),host=shell.querySelector('.profile-slide-host'),story=host.querySelector('.pv-story');
        const lead=story?.querySelector('.pv-story-lead,.pv-points li,.pv-fact dt,.pv-reasons li,.profile-share .profile-chooser-row .profile-button');
        const zoom=Number(story?.style.zoom||1),s=R(shell).w/shell.offsetWidth;
        return {shell:R(shell),board:R(w.liveBoard),zoom,font:lead?parseFloat(getComputedStyle(lead).fontSize)*zoom*s:null,
          scrollbars:${SCROLLBARS}(shell).filter(b=>!/pv-cmp-list|pv-filter|pv-modes|pv-compare-menu|pv-settings-menu|profile-suggest/.test(b.cls))};})()`);
      for (const bar of data.scrollbars) fail(label, `Playstyle ${id}: scroll bar in ${bar.cls}`, bar);
      if (data.shell.x < -1 || data.shell.r > width + 1 || data.shell.y < 0 || data.shell.b > height + 1) fail(label, `Playstyle ${id}: panel outside the window`, data.shell);
      // Beside the board, the deck spans exactly the squares' height, at every size.
      if (data.shell.x > data.board.r && (data.shell.y < data.board.y - 1 || data.shell.b > data.board.b + 1)) fail(label, `Playstyle ${id}: panel taller than the board`, data);
      if (data.font != null && data.font < 9) fail(label, `Playstyle ${id}: text too small (${data.font.toFixed(1)}px)`, data);
      profileEvidence.push({label, id, zoom: +data.zoom.toFixed(2), font: data.font && +data.font.toFixed(1)});
      // Shots show the settled chapter, after its figures count up and its rows rise in.
      if (scale === 1.5 && ['numbers', 'openings', 'signature', 'rating', 'share'].includes(id)) { await sleep(1600); await frames(); await shot(`profile-${label}-${id}`); }
    }
  }
  return finish(profileEvidence);
  async function finish(profileEvidence = []) {
    await fs.writeFile(path.join(out, 'laptop-fit.json'), JSON.stringify({failures, evidence, profileEvidence}, null, 1));
    const summary = {};
    for (const f of failures) summary[f.msg.replace(/\(.*\)/, '()')] = (summary[f.msg.replace(/\(.*\)/, '()')] || 0) + 1;
    console.log(JSON.stringify({out, failures: failures.length, summary, sample: failures.slice(0, 25)}, null, 1));
    if (failures.length) throw Error('Laptop fit audit failed: ' + failures.length + ' checks');
    console.log(`Laptop fit: ${LAPTOP_VIEWPORTS.length} viewports at ${SCALES.length} display scales. Screenshots: ${out}`);
  }
}
