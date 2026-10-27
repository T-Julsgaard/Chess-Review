import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  const controlsTop=()=>run("document.querySelector('[data-mod=controls]').getBoundingClientRect().top");
  for(const mode of ['auto','custom']){
    await run(`import('./analysis.js').then(m=>{m.S.layoutMode='${mode}';m.applyLayoutMode();})`);
    const top=await controlsTop();
    for(let i=0;i<4;i++){
      await run("(()=>{const tabs=[...document.querySelectorAll('.acc-navigation button')];tabs[(tabs.findIndex(b=>b.getAttribute('aria-selected')==='true')+1)%tabs.length].click()})()");await sleep(100);
      assert.ok(Math.abs(await controlsTop()-top)<1,mode+': accuracy pages must keep playback controls in place');
    }
  }
  await run("import('./analysis.js').then(m=>{m.S.layoutMode='auto';m.applyLayoutMode();})");
  await run(`import('./analysis.js').then(async m=>{
    m.S.settings.moveAnim=true;await m.openLearning();const w=m.learningWorkspace;
    const {Chess}=await import('./lib/chess.js'),position=new Chess(),before=position.fen();position.move('e4');
    w.puzzles=[{id:'startup-audit',fen:position.fen(),setup:{fen:before,move:'e2e4'},solution:['e7e5','g1f3','b8c6'],rating:1200,themes:[]}];
    window.uiArrange=w.arrangePuzzlePieces.bind(w);
  })`);
  for(const mode of ['practice','timeAttack','knockout'])for(const leaveEarly of [false,true]) {
    await run(`import('./analysis.js').then(async m=>{const w=m.learningWorkspace;
      await w.navigate('puzzles');
      w.arrangePuzzlePieces=()=>new Promise(resolve=>{window.uiReleaseIntro=resolve;w.cancelPieceTransition=resolve;});
      window.uiStarting=${mode==='practice'?'w.startRatedPuzzles()':`w.startPuzzleRun('${mode}')`};
    })`);
    await waitFor(review,"!!window.uiReleaseIntro&&!!document.querySelector('[data-focus=puzzle-overview]')",'Puzzle introduction');
    const target=await run(`(()=>{window.uiOverview=document.querySelector('[data-focus=puzzle-overview]');
      const r=uiOverview.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',...target},review.sessionId);await sleep(250);
    assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.puzzleIntroducing&&m.learningWorkspace.busy&&!uiOverview.disabled&&uiOverview.matches(':hover'))"),true,mode+': return is available immediately');
    if(leaveEarly) {
      await call('Input.dispatchMouseEvent',{type:'mousePressed',...target,button:'left',clickCount:1},review.sessionId);
      await call('Input.dispatchMouseEvent',{type:'mouseReleased',...target,button:'left',clickCount:1},review.sessionId);
      await waitFor(review,"!!document.querySelector('.puzzle-mode-grid')",'Immediate return to overview');
      await run('uiStarting');
      assert.equal(await run("import('./analysis.js').then(m=>!m.learningWorkspace.activity&&!m.learningWorkspace.run&&!m.learningWorkspace.busy&&!m.learningWorkspace.puzzleIntroducing)"),true);
    } else {
      const frames=await run(`(async()=>{
        const sample=()=>({same:document.querySelector('[data-focus=puzzle-overview]')===uiOverview,
          hover:uiOverview.matches(':hover'),disabled:uiOverview.disabled,
          background:getComputedStyle(uiOverview).backgroundColor,opacity:getComputedStyle(uiOverview).opacity});
        const frames=[sample()],started=performance.now();uiReleaseIntro();
        await new Promise(resolve=>{function tick(){frames.push(sample());
          if(performance.now()-started<900)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
        await uiStarting;return frames;
      })()`);
      const unstable=frames.filter(frame=>!frame.same||!frame.hover||frame.disabled||frame.background!==frames[0].background||frame.opacity!=='1');
      assert.equal(unstable.length,0,mode+': hover appearance must stay stable through startup '+JSON.stringify(unstable.slice(0,3)));
    }
    await run("import('./analysis.js').then(m=>{m.learningWorkspace.arrangePuzzlePieces=uiArrange;window.uiReleaseIntro=null;})");
  }
  await run(`import('./analysis.js').then(async m=>{
    const w=m.learningWorkspace;await w.navigate('puzzles');
    const {Chess}=await import('./lib/chess.js');
    w.puzzles=[{id:'ui-audit',fen:new Chess().fen(),solution:['e2e4','e7e5','g1f3'],rating:1200,themes:[]}];
    await w.startPuzzleSelection(w.puzzles);
  })`);
  const screenshot=async label=>{
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,label+'.png'),Buffer.from(shot.data,'base64'));
  };
  const collapse=async(label,width)=>{
    for(const enabled of [false,true]){
      const motion=await run(`import('./analysis.js').then(async m=>{
        const w=m.learningWorkspace,region=document.querySelector('.puzzle-rating-region');
        const selectors=['.puzzle-practice-actions','.puzzle-practice-status','.puzzle-analyse'].filter(s=>document.querySelector(s));
        const controls=[...w.root.querySelectorAll('button')].filter(n=>n!==w.ratingToggle),disabled=controls.map(n=>n.disabled);
        const frame=()=>({height:region.getBoundingClientRect().height,tops:selectors.map(s=>document.querySelector(s).getBoundingClientRect().top)});
        const frames=[frame()],start=performance.now(),saving=w.togglePuzzleRating();let stable=true;
        await new Promise(resolve=>{function tick(){
          stable&&=controls.every((n,i)=>n.isConnected&&n.disabled===disabled[i]);frames.push(frame());
          if(performance.now()-start<650)requestAnimationFrame(tick);else resolve();
        }requestAnimationFrame(tick);});await saving;
        const toggle=w.ratingToggle.getBoundingClientRect(),actions=document.querySelector('.puzzle-practice-actions').getBoundingClientRect();
        return {frames,stable,hidden:region.getAttribute('aria-hidden'),inert:region.hasAttribute('inert'),visibility:getComputedStyle(region).visibility,
          overlap:[...document.querySelectorAll('.puzzle-practice-actions button')].some(n=>{const r=n.getBoundingClientRect();return r.left<toggle.right&&r.right>toggle.left&&r.top<toggle.bottom&&r.bottom>toggle.top;}),
          overflow:w.root.scrollWidth>innerWidth,actionsHeight:actions.height};
      })`);
      assert.equal(motion.stable,true,label+': preserve other controls');
      assert.equal(motion.hidden,String(!enabled));assert.equal(motion.inert,!enabled);
      assert.equal(motion.visibility,enabled?'visible':'hidden');
      assert.equal(motion.overlap,false,label+': switch must not cover action buttons');
      assert.equal(motion.overflow,false,label+': no horizontal overflow');
      const first=motion.frames[0],last=motion.frames.at(-1),height=Math.max(first.height,last.height);
      assert.ok(height>20);assert.ok((enabled?first:last).height<1,label+': hidden rating occupies no space');
      assert.ok(motion.frames.some(f=>f.height>2&&f.height<height-2),label+': animate intermediate heights');
      first.tops.forEach((top,i)=>{
        assert.ok(Math.abs(last.tops[i]-top)>20,label+': lower items must move');
        assert.ok(Math.abs((last.tops[i]-top)-(last.height-first.height))<2,label+': lower items follow the rating '+JSON.stringify({width,enabled,first,last}));
      });
      await screenshot(`${label}-${width}-${enabled?'rated':'unrated'}`);
    }
  };
  for(const [width,height] of [[1920,1080],[1280,800],[390,844],[320,640]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(800);
    assert.equal(await run(`(()=>{const toggle=document.querySelector('.puzzle-rating-toggle').getBoundingClientRect(),navigation=document.querySelector('.puzzle-session-navigation').getBoundingClientRect();
      return Math.abs(toggle.x+toggle.width/2-navigation.x-navigation.width/2)<1;})()`),true,'Rating switch centers below the navigation button');
    await collapse('solving',width);
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false},review.sessionId);
  // Hold persistence to inspect the brief disabled state that used to flash.
  await run(`import('./analysis.js').then(m=>{const w=m.learningWorkspace,save=w.store.update.bind(w.store);
    window.uiRestoreSave=()=>{w.store.update=save;};w.store.update=async change=>{await new Promise(resolve=>{window.uiReleaseSave=resolve;});return save(change);};
    window.uiMove=w.submitPuzzle('d2d4');
  })`);
  await waitFor(review,'!!window.uiReleaseSave','Held move save');
  assert.equal(await run(`(()=>{
    const buttons=[...document.querySelectorAll('.learn-nav button,.puzzle-session-navigation button')];
    return buttons.every(n=>n.disabled&&getComputedStyle(n).opacity==='1')&&
      [...document.querySelectorAll('.puzzle-rating-toggle,.puzzle-hint,.puzzle-skip')].every(n=>!['wait','progress'].includes(getComputedStyle(n).cursor));
  })()`),true,'Busy controls must keep a normal cursor and undimmed navigation');
  await run('uiReleaseSave();uiMove.then(()=>uiRestoreSave())');
  // A fresh attempt has one continuous turn label throughout the forced reply.
  await run(`import('./analysis.js').then(async m=>{const w=m.learningWorkspace;await w.preparePuzzle(w.puzzles[0]);
    window.uiCue=document.querySelector('.puzzle-turn-cue');window.uiCueChanges=[];
    window.uiObserver=new MutationObserver(records=>uiCueChanges.push(...records.map(r=>r.type)));
    uiObserver.observe(uiCue,{attributes:true,attributeFilter:['class'],childList:true,characterData:true,subtree:true});
    window.uiMove=w.submitPuzzle('e2e4');
  })`);
  assert.equal(await run("document.querySelector('.puzzle-turn-cue')===uiCue&&uiCue.textContent==='White to move'&&uiCue.getAnimations().length===0"),true);
  await run('uiMove');
  assert.equal(await run("document.querySelector('.puzzle-turn-cue')===uiCue&&uiCue.textContent==='White to move'"),true);
  assert.deepEqual(await run('uiCueChanges'),[],'Accepted moves must not change the turn label');
  await run('uiObserver.disconnect()');
  await run("document.querySelector('[data-square=g1]').focus()");
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight'},review.sessionId);
  assert.equal(await run("document.activeElement===document.querySelector('.learning-workspace')"),true,'Arrows focus the workspace');
  await run("import('./analysis.js').then(m=>m.learningWorkspace.submitPuzzle('g1f3'))");
  assert.equal(await run("document.querySelector('.puzzle-practice-status').textContent"),'Solved! · 1200');
  for(const [width,height] of [[1920,1080],[390,844],[320,640]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(800);
    assert.equal(await run(`(()=>{const next=document.querySelector('.puzzle-practice-actions .primary').getBoundingClientRect(),analyse=document.querySelector('.puzzle-analyse').getBoundingClientRect();
      return Math.abs(next.width-analyse.width)<1&&Math.abs(next.height-analyse.height)<1;})()`),true,'Analyse matches Next puzzle dimensions');
    await collapse('completed',width);
  }
  for(const [width,height] of [[1920,1080],[390,844],[320,640]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(500);
    for(const color of ['w','b'])for(const flipped of [false,true]){
      const square=color==='w'?'a8':'a1',from=color==='w'?'a7':'a2';
      await run(`import('./analysis.js').then(async m=>{const w=m.learningWorkspace;
        const puzzle={id:'promotion-${color}-${flipped}',fen:'${color==='w'?'7k/P7/8/8/8/8/8/7K w':'7k/8/8/8/8/8/p7/7K b'} - - 0 1',solution:['${from}${square}n'],rating:1200,themes:[]};
        w.puzzles=[puzzle];await w.startPuzzleSelection(w.puzzles);w.flipped=${flipped};w.render();
        window.uiBoardBefore=getComputedStyle(document.querySelector('.board')).filter;
        document.querySelector('[data-square=${from}]').click();document.querySelector('[data-square=${square}]').click();
      })`);
      const placement=await run(`(()=>{const overlay=document.querySelector('.learn-promotion'),options=[...overlay.querySelectorAll('.promotion-options button')],square=document.querySelector('[data-square=${square}]').getBoundingClientRect(),queen=options[0].getBoundingClientRect();
        return {aligned:Math.abs(square.x-queen.x)<1&&Math.abs(square.y-queen.y)<1&&Math.abs(square.width-queen.width)<1&&Math.abs(square.height-queen.height)<1,
          inside:options.every(n=>{const r=n.getBoundingClientRect(),b=document.querySelector('.board').getBoundingClientRect();return r.x>=b.x-1&&r.right<=b.right+1&&r.y>=b.y-1&&r.bottom<=b.bottom+1;}),
          heading:!!overlay.querySelector('h3'),background:getComputedStyle(overlay).backgroundColor,filter:getComputedStyle(document.querySelector('.board')).filter===uiBoardBefore};})()`);
      assert.deepEqual(placement,{aligned:true,inside:true,heading:false,background:'rgba(0, 0, 0, 0)',filter:true},'Promotion anchors to '+square+' at '+width+'px, flipped='+flipped);
      if(width===1920)await screenshot(`promotion-${color}-${flipped}`);
      const target=await run("(()=>{const r=document.querySelector('[aria-label=\"Promote to knight\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
      await call('Input.dispatchMouseEvent',{type:'mousePressed',...target,button:'left',clickCount:1},review.sessionId);
      await call('Input.dispatchMouseEvent',{type:'mouseReleased',...target,button:'left',clickCount:1},review.sessionId);
      await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace.activity.step===1&&!m.learningWorkspace.busy&&!document.querySelector('.learn-promotion'))",'Underpromotion');
    }
  }
  console.log('Playback position, rating alignment, promotion anchoring in both orientations and existing puzzle UI checks passed at desktop and mobile widths. Screenshots: '+out);
}
