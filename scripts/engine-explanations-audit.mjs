import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Authored synthetic move sequence; no external games or extra engine searches.
// node scripts/learning-browser.mjs --working-tree --engine-explanations
export async function auditLearning({review,call,evaluate,sleep,out}) {
  const run=code=>evaluate(review,code),results=[];
  const shot=async name=>{
    const result=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(result.data,'base64'));
  };
  await run(`import('./analysis.js').then(async m=>{
    const {Chess}=await import('./lib/chess.js'),board=new Chess(),positions=[{fen:board.fen()}];
    for(const san of ['f3','e5','g4','Qh4#']) {const move=board.move(san);positions.push({...move,fen:board.fen()});}
    Object.assign(m.S,{positions,total:4,idx:3,analyzing:false,progress:4,
      evals:[{cp:0},{cp:-30},{cp:-30},{mate:-1},{mate:0}],
      bests:[null,null,{pv:'g2g3 d7d5'},{pv:'d8h4'},null],
      classif:[null,'inacc','best','blunder','best'],moveGrades:[],_panelNeedsLive:false});
    m.S.settings.moveAnim=false;m.S.settings.showThreat=false;
    await m.setCoachEngineReplies(false);await m.setCoach('old_soviet');m.go(3);
  })`);
  await run("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  for(const [width,height] of [[1920,1080],[1366,768],[390,844]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);
    await sleep(150);
    await run("import('./analysis.js').then(m=>m.setCoachEngineReplies(false))");
    await shot(`coach-${width}`);
    await run("document.querySelector('.ip-explanations-toggle').click()");await sleep(100);
    const state=await run(`(()=>{
      const toggle=document.querySelector('.ip-explanations-toggle'),close=document.querySelector('.ip-close-game');
      const t=toggle.getBoundingClientRect(),x=close.getBoundingClientRect();
      return {on:toggle.getAttribute('aria-checked'),beforeClose:t.right<=x.left,
        assessment:document.querySelector('.ip-assessment')?.textContent,
        portrait:!!document.querySelector('.coach-frame'),
        overflow:document.documentElement.scrollWidth>innerWidth};
    })()`);
    assert.equal(state.on,'true');assert.equal(state.beforeClose,true);
    assert.equal(state.assessment,'g4 is a blunder.');assert.equal(state.portrait,false);
    assert.equal(state.overflow,false);
    assert.equal(await run("!!document.querySelector('.ip-assessment-row > .ip-badge')"),true);
    await run("document.querySelector('.ip-show-threat').click()");await sleep(50);
    assert.equal(await run("!!document.querySelector('svg.threat-arrow')"),true);
    const visible=await run(`(()=>{
      const body=document.querySelector('.insight-panel .ip-body').getBoundingClientRect();
      const head=document.querySelector('.ip-assessment').getBoundingClientRect();
      const text=document.querySelector('.insight-panel .ip-text').getBoundingClientRect();
      return head.top>=body.top&&text.bottom<=body.bottom;
    })()`);
    if(width>=1366)assert.equal(visible,true,'Assessment and explanation should fit together');
    await shot(`explanation-threat-${width}`);
    // A deliberate line break reproduces the small vertical scroll range.
    await run(`(()=>{
      const text=document.querySelector('.insight-panel .ip-text');
      text.replaceChildren('Qxd6 takes the bishop.',document.createElement('br'),'Better was Bf4.');
    })()`);
    const fixedComment=await run(`(()=>{
      const body=document.querySelector('.insight-panel .ip-body');
      const b=body.getBoundingClientRect(),badge=body.querySelector('.ip-badge').getBoundingClientRect();
      const text=body.querySelector('.ip-text').getBoundingClientRect();
      body.scrollTop=100;body.scrollTop=-100;
      return {scrollTop:body.scrollTop,overflow:getComputedStyle(body).overflowY,
        unmoved:text.top===body.querySelector('.ip-text').getBoundingClientRect().top,
        badgeVisible:badge.top>=b.top&&badge.bottom<=b.bottom,
        bodyHeight:b.height,badgeTop:badge.top-b.top,badgeHeight:badge.height,textHeight:text.height,
        bottomGap:b.bottom-text.bottom,paddingBottom:parseFloat(getComputedStyle(body).paddingBottom)*b.height/body.offsetHeight};
    })()`);
    assert.equal(fixedComment.overflow,'clip');assert.equal(fixedComment.scrollTop,0);
    assert.equal(fixedComment.unmoved,true);
    assert.equal(fixedComment.badgeVisible,true,'Badge should stay visible with a two-line comment: '+JSON.stringify({width,...fixedComment}));
    assert.ok(Math.abs(fixedComment.bottomGap-fixedComment.paddingBottom)<1,'Comment stays aligned to the bottom');
    await shot(`two-line-locked-${width}`);
    await run("import('./analysis.js').then(m=>m.go(2))");
    assert.equal(await run("!!document.querySelector('svg.threat-arrow')"),false);
    await run("import('./analysis.js').then(m=>m.go(3))");
    results.push({width,height,...state,fixedComment,threatCleared:true});
  }
  // Use native keyboard input to verify the switch's Space activation and focus.
  await run("document.querySelector('.ip-explanations-toggle').focus()");
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32},review.sessionId);
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32},review.sessionId);
  await sleep(100);
  assert.equal(await run("document.activeElement.matches('.ip-explanations-toggle[aria-checked=false]')"),true);
  assert.equal(await run("!!document.querySelector('.coach-frame')"),true);
  await fs.writeFile(path.join(out,'engine-explanations.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({out,cases:results.length,keyboard:'passed'}));
}
