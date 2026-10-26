import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=code=>evaluate(review,code),evidence=[];
  const shot=async name=>{const r=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};
  const resize=async(width,height)=>{await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(120);};
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  await run("import('./analysis.js').then(m=>{m.S.settings.moveAnim=true;m.S.settings.sound=false;})");
  for(const [width,height]of [[1920,1080],[1920,920],[3840,2160],[3440,1280],[2560,1280],[1536,704],[1366,608],[1280,600]]){
    await resize(width,height);
    const initial=await run("({w:document.documentElement.clientWidth,h:document.documentElement.clientHeight})");
    for(let n=0;n<4;n++){
      await run("document.querySelector('.acc-page-next').click()");
      const state=await run("({w:document.documentElement.clientWidth,h:document.documentElement.clientHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,x:scrollX,y:scrollY})");
      assert.deepEqual({w:state.w,h:state.h},initial);assert.equal(state.scrollH,height);assert.equal(state.scrollW,width);assert.equal(state.y,0);
      if(n===0)await shot(`expanded-accuracy-${width}x${height}`);
    }
    for(const entry of ['#learningToggle','.learn-entry-button']){
      const reviewRight=await run("Math.max(...[...document.querySelectorAll('.mod[data-mod=accuracy] > .mod-inner,.mod[data-mod=engine] > .mod-inner,.mod[data-mod=learn] > .mod-inner')].map(n=>n.getBoundingClientRect().right))");
      await run(`window.samples=[];window.sampleActive=true;
        window.sampleScene=()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
          const board=document.querySelector('.board');
          return {board:rect(board),players:[...document.querySelectorAll('#playerTop,#playerBot')].map(n=>({rect:rect(n),opacity:+getComputedStyle(n).opacity,visibility:getComputedStyle(n).visibility})),
            panels:[...document.querySelectorAll('.stage .mod:not([data-mod=board]) > .mod-inner')].map(n=>({rect:rect(n),opacity:+getComputedStyle(n).opacity,visibility:getComputedStyle(n).visibility})),
            library:rect(document.querySelector('.lib-tab'))};};
        window.sampleLoop=()=>{samples.push(sampleScene());if(sampleActive)requestAnimationFrame(sampleLoop);};sampleLoop();
        document.querySelector('${entry}').click();`);
      await waitFor(review,"import('./analysis.js').then(m=>!!m.learningWorkspace?.shell)",'Learning mounted');
      await sleep(220);await shot(`learning-enter-${height}-${entry==='#learningToggle'?'top':'panel'}`);
      await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Learning entered');
      const frames=await run('sampleActive=false;samples');
      assert.ok(frames.length>10);
      for(const frame of frames)for(const [i,panel]of frame.panels.entries())if(panel.visibility==='visible'&&panel.opacity>.02){
        assert.ok(Math.abs(panel.rect.w-frames[0].panels[i].rect.w)<1,'Panel width jumps during entry');
      }
      for(const frame of frames)for(const [i,player]of frame.players.entries())if(player.visibility==='visible'&&player.opacity>.02){
        for(const key of ['x','y','w','h'])assert.ok(Math.abs(player.rect[key]-frames[0].players[i].rect[key])<1,'Player label moves while fading '+key);
      }
      const start=frames[0].board,end=frames.at(-1).board;
      const margins=await run("(()=>{const board=document.querySelector('.learning-embedded .board').getBoundingClientRect(),header=document.querySelector('.topbar').getBoundingClientRect(),panel=document.querySelector('.learn-shell').getBoundingClientRect();return {above:board.top-header.bottom,below:innerHeight-board.bottom,boardY:board.y,panelY:panel.y,boardHeight:board.height,panelHeight:panel.height};})()");
      assert.ok(Math.abs(margins.above-margins.below)<1,'Learning margins should balance '+JSON.stringify(margins));
      assert.ok(Math.abs(margins.boardY-margins.panelY)<1&&Math.abs(margins.boardHeight-margins.panelHeight)<1,'Board and learning UI should stay aligned');
      assert.ok(Math.abs(await run("document.querySelector('.learn-shell').getBoundingClientRect().right")-reviewRight)<1,'Learning panel should reach the review column right edge');
      assert.ok(Math.abs(await run("document.querySelector('.learn-nav').getBoundingClientRect().right")-reviewRight)<1,'Visible learning tabs should reach the review column right edge');
      for(const frame of frames)for(const key of ['x','y','w','h'])assert.ok(frame.board[key]>=Math.min(start[key],end[key])-1&&frame.board[key]<=Math.max(start[key],end[key])+1,'Board overshoot on entry '+JSON.stringify({key,frame,start,end}));
      await shot(`learning-entered-${height}`);
      if(entry==='#learningToggle'){
        await run("import('./analysis.js').then(m=>{const w=m.learningWorkspace,p={id:'centered-layout',fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',solution:['f7f8'],rating:1200,themes:['mateIn1']};w.puzzles=[p];return w.startPuzzleSelection([p]);})");
        const puzzle=await run("(()=>{const b=document.querySelector('.learning-embedded .board').getBoundingClientRect(),p=document.querySelector('.learn-shell').getBoundingClientRect(),t=document.querySelector('.topbar').getBoundingClientRect().bottom;return {above:b.top-t,below:innerHeight-b.bottom,panelY:p.y,boardY:b.y};})()");
        assert.ok(Math.abs(puzzle.above-puzzle.below)<1&&Math.abs(puzzle.panelY-puzzle.boardY)<1,'Puzzle activity should retain balanced alignment');
        assert.ok(Math.abs(await run("document.querySelector('.learn-shell').getBoundingClientRect().right")-reviewRight)<1,'Active puzzle should retain the review column right edge');
        await shot(`puzzle-centered-${height}`);
      }
      await run("samples=[];sampleActive=true;sampleLoop();document.querySelector('#learningToggle').click()");
      await waitFor(review,"import('./analysis.js').then(m=>!m.learningWorkspace)",'Review restored');
      const returning=await run('sampleActive=false;samples');
      const from=returning[0].board,to=returning.at(-1).board;
      for(const frame of returning)for(const key of ['x','y','w','h'])assert.ok(frame.board[key]>=Math.min(from[key],to[key])-1&&frame.board[key]<=Math.max(from[key],to[key])+1,'Board overshoot on return '+key);
      for(const key of ['x','y','w','h'])assert.ok(Math.abs(to[key]-start[key])<1,'Review geometry changed '+JSON.stringify({width,height,entry,key,to,start}));
      evidence.push({width,height,entry,frames,returning});
    }
  }
  // Interrupt the entry before its board expansion completes, then reopen.
  await run("import('./analysis.js').then(m=>{void m.openLearning();})");
  await waitFor(review,"import('./analysis.js').then(m=>!!m.learningWorkspace?.shell)",'Interrupted entry');
  await run("document.querySelector('#learningToggle').click()");
  await waitFor(review,"import('./analysis.js').then(m=>!m.learningWorkspace)",'Interrupted return');
  assert.equal(await run("!!document.querySelector('.learn-transition-surface,.learn-swoop-anchor')"),false);
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
  await run("import('./analysis.js').then(m=>m.openLearning())");
  assert.equal(await run("!!document.querySelector('.learn-transition-surface,.learn-swoop-anchor')"),false);
  await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]},review.sessionId);
  // Fill the actual move list with a long legal game while retaining the real UI.
  await run(`import('./analysis.js').then(m=>{
    const pgn=Array.from({length:50},(_,i)=>((i*2+1)+'. Nf3 Nf6 '+(i*2+2)+'. Ng1 Ng8')).join(' ')+' *';
    window.longGame=pgn;
  })`);
  await run(`import('./browser-compat.js').then(async({browserAPI:api})=>{await api.storage.local.set({'job:long-navigation':{pgn:longGame,meta:{gameId:'long-navigation'},source:'pgn',analysis:null}});})`);
  // Use the real position parser in a test-only export, without engine analysis.
  await run(`import('./analysis.js').then(async m=>{
    const {Chess}=await import('./lib/chess.js'),c=new Chess();c.loadPgn(longGame);
    const replay=new Chess(),positions=[{fen:replay.fen()}];
    for(const move of c.history({verbose:true})){replay.move(move);positions.push({...move,fen:replay.fen()});}
    Object.assign(m.S,{pgn:longGame,positions,total:positions.length-1,idx:0,analyzing:false,progress:positions.length-1,
      evals:positions.map(()=>({cp:0})),bests:positions.map(()=>null),classif:positions.map(()=>null),moveGrades:[],_panelNeedsLive:false});
    m.go(0);
  })`);
  for(const [width,height]of [[1920,920],[3840,2160],[2560,1280],[1366,608],[820,1180],[390,844]]){
   await resize(width,height);
   for(const style of ['rows','cards','compact']){
    await run(`import('./analysis.js').then(m=>{m.S.settings.mlStyle='${style}';m.go(0);})`);
    const misses=await run(`import('./analysis.js').then(m=>{
      const body=document.querySelector('#movesBody'),misses=[];
      for(const ply of [...Array.from({length:m.S.total},(_,i)=>i+1),...Array.from({length:m.S.total},(_,i)=>m.S.total-i)]){
        m.S.idx=ply; // renderMoves is invoked through go; same mainline navigation path.
        m.go(ply);
        const current=body.querySelector('.current'),r=current.getBoundingClientRect(),b=body.getBoundingClientRect();
        if(r.top<b.top-1||r.bottom>b.bottom+1||body.querySelectorAll('.current').length!==1||getComputedStyle(current).transitionDuration!=='0s')misses.push({ply,r:{top:r.top,bottom:r.bottom},b:{top:b.top,bottom:b.bottom},scroll:body.scrollTop});
      }
      return misses;
    })`);
    assert.deepEqual(misses,[],style+': current move must remain visible on every navigation step');
    await run("import('./analysis.js').then(m=>m.go(m.S.total))");await shot(`last-move-${style}`);
  }
  }
  await fs.writeFile(path.join(out,'review-interactions.json'),JSON.stringify({passed:true,evidence},null,2));
  console.log('Reference entry/return frames, expanded viewport clipping and 7,200 rapid navigation steps passed. Evidence: '+out);
}
