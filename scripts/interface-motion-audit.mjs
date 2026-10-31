import assert from 'node:assert/strict';

// node scripts/learning-browser.mjs --working-tree --interface-motion
export async function auditLearning({review,call,evaluate,waitFor,sleep}) {
  const run=expression=>evaluate(review,expression);
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]},review.sessionId);
  assert.deepEqual(await run("import('./analysis.js').then(m=>[m.S.settings.moveAnim,m.S.settings.uiAnim])"),[false,true],
    'Existing piece-motion opt-out must keep interface motion enabled by default');
  await run("document.querySelector('.learning-announcement-disable')?.click();import('./analysis.js').then(m=>{void m.openLearning();})");
  await waitFor(review,"!!document.querySelector('.learn-transition-surface')",'Animated learning entry with piece moves off');
  assert.ok(await run("document.querySelector('.learn-board').getAnimations().length"),'The real board expands');
  await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace?.ready&&!m.learningWorkspace.transitioning)",'Learning entry complete');

  await run("import('./analysis.js').then(m=>{void m.learningWorkspace.showLeaderboard('timeAttack');})");
  await waitFor(review,"!!document.querySelector('.leaderboard-backdrop')",'Leaderboard expansion');
  await run("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
  const initial=await run("document.querySelector('.leaderboard-hero').getAnimations()[0].currentTime");
  await sleep(80);
  assert.ok(await run("document.querySelector('.leaderboard-hero').getAnimations()[0].currentTime")>initial,'The reveal timeline advances');
  await waitFor(review,"!document.querySelector('.leaderboard-entering')",'Leaderboard revealed');
  await run("import('./analysis.js').then(m=>{void m.learningWorkspace.returnFromLeaderboard();})");
  await waitFor(review,"!!document.querySelector('.leaderboard-returning')",'Leaderboard contraction');
  await waitFor(review,"!document.querySelector('.leaderboard-returning')",'Overview restored');

  // A deterministic board change exercises the actual puzzle assembly path.
  await run(`import('./analysis.js').then(m=>{
    const w=m.learningWorkspace;
    w.puzzles=[{id:'interface-motion',fen:'7k/8/8/8/8/8/8/K7 w - - 0 1',solution:['a1b1'],rating:450,themes:[]}];
    void w.startPuzzleSelection(w.puzzles);
  })`);
  await waitFor(review,"!!document.querySelector('.puzzle-arranging')",'Animated puzzle change with piece moves off');
  assert.ok(await run("document.querySelector('.learn-board').getAnimations({subtree:true}).length")>0);
  await waitFor(review,"import('./analysis.js').then(m=>!m.learningWorkspace.busy)",'Puzzle ready');
  await run("import('./analysis.js').then(m=>m.learningWorkspace.navigate('puzzles'))");
  await waitFor(review,"!document.querySelector('.puzzle-arranging')",'Puzzle return complete');

  await run("import('./analysis.js').then(m=>m.setSetting('uiAnim',false))");
  await run("import('./analysis.js').then(m=>m.learningWorkspace.showLeaderboard('timeAttack'))");
  assert.equal(await run("document.querySelector('.leaderboard-hero').getAnimations().length"),0,'Interface preference disables reveals');
  await run("import('./analysis.js').then(m=>m.learningWorkspace.returnFromLeaderboard())");
  await run("import('./analysis.js').then(m=>m.setSetting('uiAnim',true))");
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},review.sessionId);
  await run("import('./analysis.js').then(m=>m.learningWorkspace.showLeaderboard('timeAttack'))");
  assert.equal(await run("document.querySelector('.leaderboard-hero').getAnimations().length"),0,'System reduced motion still wins');
  await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
  await call('Page.reload',{},review.sessionId);
  await waitFor(review,"!!document.querySelector('.board')&&import('./analysis.js').then(m=>!m.S.analyzing)",'Reloaded preferences');
  assert.deepEqual(await run("import('./analysis.js').then(m=>[m.S.settings.moveAnim,m.S.settings.uiAnim])"),[false,true]);
  console.log('Independent motion: learning entry, leaderboard expansion/return, puzzle changes, interface opt-out, reduced motion and persisted preferences passed.');
}
