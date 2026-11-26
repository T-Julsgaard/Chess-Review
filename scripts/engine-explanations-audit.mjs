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
    assert.equal(state.assessment,'Pawn g4 is a blunder.');assert.equal(state.portrait,false);
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
    const singleLine=await run(`(()=>{
      const body=document.querySelector('.insight-panel .ip-body'),text=body.querySelector('.ip-text');
      text.textContent='One concise explanation.';
      return {badgeTop:body.querySelector('.ip-badge').getBoundingClientRect().top-body.getBoundingClientRect().top,
        textTop:text.getBoundingClientRect().top-body.getBoundingClientRect().top};
    })()`);
    // A deliberate line break reproduces the small vertical scroll range.
    await run(`(()=>{
      const text=document.querySelector('.insight-panel .ip-text');
      text.replaceChildren('Queen d6 takes the bishop.',document.createElement('br'),'Better was Bishop f4.');
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
        textTop:text.top-b.top,textVisible:text.bottom<=b.bottom};
    })()`);
    assert.equal(fixedComment.overflow,'clip');assert.equal(fixedComment.scrollTop,0);
    assert.equal(fixedComment.unmoved,true);
    assert.equal(fixedComment.badgeVisible,true,'Badge should stay visible with a two-line comment: '+JSON.stringify({width,...fixedComment}));
    assert.equal(fixedComment.textVisible,true,'Two-line comment should fit');
    assert.ok(Math.abs(fixedComment.badgeTop-singleLine.badgeTop)<1,'Badge stays at the same top position');
    assert.ok(Math.abs(fixedComment.textTop-singleLine.textTop)<1,'Comment stays at the same top position');
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
  await run("import('./analysis.js').then(async m=>{m.S.settings.uiAnim=true;await m.setCoachEngineReplies(true);m.go(2);m.go(3);})");
  const writing=await run(`(()=>{
    const node=document.querySelector('.insight-panel .ip-text'),r=node.getBoundingClientRect();
    return {text:node.textContent,rect:{x:r.x,y:r.y,width:r.width,height:r.height},
      hidden:[...node.querySelectorAll('.ip-written-char')].some(n=>+getComputedStyle(n).opacity<1)};
  })()`);
  assert.equal(writing.hidden,true,'Explanation should write out progressively');
  await sleep(200);await shot('writing-explanation');
  await run("import('./analysis.js').then(m=>m.go(3))");
  assert.equal(await run("parseFloat(document.querySelector('.ip-written-char').style.getPropertyValue('--ink-delay'))<0"),true);
  await sleep(1100);
  const finished=await run(`(()=>{
    const node=document.querySelector('.insight-panel .ip-text'),r=node.getBoundingClientRect();
    return {text:node.textContent,rect:{x:r.x,y:r.y,width:r.width,height:r.height},
      visible:[...node.querySelectorAll('.ip-written-char')].every(n=>+getComputedStyle(n).opacity===1)};
  })()`);
  assert.equal(finished.visible,true);assert.equal(finished.text,writing.text);
  assert.deepEqual(finished.rect,writing.rect,'Writing must preserve line wrapping and alignment');
  await run("import('./analysis.js').then(m=>m.go(3))");
  const settled=await run(`(()=>{
    const node=document.querySelector('.insight-panel .ip-text'),r=node.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height};
  })()`);
  assert.deepEqual(settled,writing.rect,'Settled plain text must keep the same layout');
  assert.equal(await run("!!document.querySelector('.ip-written-char')"),false);
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
  await run("import('./analysis.js').then(m=>{m.go(2);m.go(3);})");
  assert.equal(await run("!!document.querySelector('.ip-written-char')"),false);
  for(const [label,branchIdx,square,piece] of [['Queen h4',3,'h4','q'],['Pawn g3',2,'g3','p'],['Pawn g4',2,'g4','p']]) {
    await run("import('./analysis.js').then(m=>{m.exitAnalysis();m.go(3);})");
    await run(`([...document.querySelectorAll('.insight-panel .ip-move-link')].find(n=>n.textContent===${JSON.stringify(label)})).click()`);
    const opened=await run(`import('./analysis.js').then(async m=>{
      const {Chess}=await import('./lib/chess.js');
      return {branchIdx:m.S.variation?.branchIdx,piece:new Chess(m.S.variation.positions[m.S.variation.idx].fen).get('${square}')?.type};
    })`);
    assert.deepEqual(opened,{branchIdx,piece});
  }
  // Count natural wrapping for an actual generated explanation, including the
  // previous SAN wording, to answer whether two line breaks were already possible.
  await run(`import('./analysis.js').then(async m=>{
    m.exitAnalysis();const {Chess}=await import('./lib/chess.js'),board=new Chess(),positions=[{fen:board.fen()}];
    for(const san of ['e4','e5','Nf3','d6','Bc4','Be7']){const move=board.move(san);positions.push({...move,fen:board.fen()});}
    Object.assign(m.S,{positions,total:6,idx:6,evals:positions.map(()=>({cp:0})),classif:positions.map(()=>null),
      bests:positions.map(()=>null)});
    m.S.classif[6]='mistake';m.S.bests[5]={pv:'g8f6'};m.S.bests[6]={pv:'c4f7 e8f7'};m.go(6);
  })`);
  const wrapping=[];
  for(const [width,height] of [[1920,1080],[1366,768],[390,844]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(100);
    wrapping.push(await run(`(async()=>{
      const {S}=await import('./analysis.js'),{explainMove}=await import('./lib/move-explanation.js');
      const result=explainMove({beforeFen:S.positions[5].fen,afterFen:S.positions[6].fen,category:'mistake',beforePv:'g8f6',afterPv:'c4f7 e8f7'});
      const text=document.querySelector('.insight-panel .ip-text'),r=text.getBoundingClientRect(),scale=r.width/text.offsetWidth;
      const lineHeight=parseFloat(getComputedStyle(text).lineHeight)*scale;
      const previous=document.createElement('div');previous.className='ip-text';
      previous.textContent=[...result.summaryParts,{text:' '},...result.detailParts].map(p=>p.move?.san||p.text).join('');
      text.after(previous);const previousLines=Math.round(previous.getBoundingClientRect().height/lineHeight);previous.remove();
      const panel=document.querySelector('.insight-panel').getBoundingClientRect();
      return {width:innerWidth,previousSanLines:previousLines,readableLines:Math.round(r.height/lineHeight),text:text.textContent,
        fullyVisible:r.bottom<=panel.bottom,movesBelow:document.querySelector('.mod[data-mod=moves]').getBoundingClientRect().top>=panel.bottom};
    })()`));
    await shot(`natural-wrapping-${width}`);
  }
  assert.ok(wrapping.some(row=>row.previousSanLines>=3),'Existing explanations can naturally wrap beyond two lines');
  assert.equal(wrapping.find(row=>row.width===390).fullyVisible,true,'Narrow layout must show all three lines without an inner scrollbar');
  assert.equal(wrapping.find(row=>row.width===390).movesBelow,true,'The following panel must move down with the taller explanation');
  await fs.writeFile(path.join(out,'explanation-wrapping.json'),JSON.stringify(wrapping,null,2));
  await fs.writeFile(path.join(out,'engine-explanations.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({out,cases:results.length,keyboard:'passed',moveLinks:'passed',wrapping}));
}
