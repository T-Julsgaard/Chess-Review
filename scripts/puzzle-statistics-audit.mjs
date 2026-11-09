import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {THEME_NAMES} from '../lib/learning/content.js';

const tiles="[...document.querySelectorAll('.learn-stat-overview > div')].map(n=>n.textContent)";
export async function auditLearning({review,call,evaluate,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(async m=>{m.S.settings.moveAnim=false;await m.openLearning();m.learningWorkspace.showStatistics('solve-puzzle');})");
  assert.equal(await run("document.querySelectorAll('.learn-stat-row').length"),Object.keys(THEME_NAMES).length);
  assert.equal(await run("[...document.querySelectorAll('.learn-stat-row')].every(n=>n.textContent.includes('0 correct · 0 incorrect')&&n.textContent.endsWith('0%'))"),true);
  assert.equal(await run("[...document.querySelectorAll('.learn-stat-track > span')].every(n=>n.style.width==='0%')"),true);
  await run("import('./analysis.js').then(async m=>{const w=m.learningWorkspace,puzzle=w.puzzles.find(p=>p.themes.includes('fork'));await w.persist(p=>{p.puzzles[puzzle.id]={attempts:3,clean:1,mistakes:2};p.puzzleTimeMs=843000;});w.render();})");
  assert.deepEqual(await run(tiles),['Rating1,200No rated puzzles yet','Peak rating1,200','Correct1','Incorrect2','Accuracy33%3 attempts','Time spent14m 3s≈ 4m 41s per attempt']);
  assert.equal(await run("(()=>{const row=document.querySelector('[data-theme=fork]');return Math.abs(parseFloat(row.querySelector('.learn-stat-correct').style.width)-100/3)<.01&&Math.abs(parseFloat(row.querySelector('.learn-stat-incorrect').style.width)-200/3)<.01;})()"),true);
  for(const mode of ['solve-puzzle','timeAttack','knockout']) {
    await run(`import('./analysis.js').then(async m=>{const w=m.learningWorkspace;await w.navigate('puzzles');w.showStatistics('${mode}');})`);await sleep(700);
    for(const [width,height] of [[1920,1080],[1280,800],[390,844],[320,640]]) {
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(250);
      if(width<760)await run("document.querySelector('.learn-mode-stats').scrollIntoView({block:'start'})");
      const layout=await run("(()=>{const section=document.querySelector('.learn-mode-stats');const cards=[...document.querySelectorAll('.learn-stat-overview > div')].map(n=>{const r=n.getBoundingClientRect();return {top:r.top,width:r.width,overflow:n.scrollWidth>n.clientWidth+1};});return {cards,overflow:section.scrollWidth>section.clientWidth+1};})()");
      assert.equal(layout.overflow,false,`${mode} overflows at ${width}px`);assert.equal(layout.cards.length,6);
      assert.ok(layout.cards.every(card=>!card.overflow&&Math.abs(card.width-layout.cards[0].width)<1),`${mode} tiles share one width at ${width}px`);
      assert.ok(Math.abs(layout.cards[0].top-layout.cards[1].top)<1,`${mode} tiles sit side by side at ${width}px`);
      const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,`statistics-${mode}-${width}.png`),Buffer.from(shot.data,'base64'));
    }
  }
  console.log('Statistics for every mode: tiles, all-type zero states and layouts verified at 1920, 1280, 390 and 320 pixels. Screenshots: '+out);
}
