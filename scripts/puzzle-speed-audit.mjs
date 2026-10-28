import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,out}) {
  const run=expression=>evaluate(review,expression);
  await run(`import('./analysis.js').then(async m=>{
    const {Chess}=await import('./lib/chess.js');m.S.settings.moveAnim=true;m.S.settings.animSpeed=7;
    await m.openLearning();const w=m.learningWorkspace,before=new Chess();before.move('e4');const after=new Chess(before.fen());after.move('d5');
    w.puzzles=[{id:'speed-authored',fen:after.fen(),setup:{fen:before.fen(),move:'d7d5'},solution:['e4d5','d8d5','b1c3'],rating:450,themes:[]}];
    window.speedFinishes=0;window.speedDurations=[];
    const animate=w.animatePuzzleReply.bind(w);
    w.animatePuzzleReply=move=>{const result=animate(move),animation=w.replyAnimation;
      if(animation){const finish=animation.finish;animation.finish=()=>{speedFinishes++;finish();};
        for(const piece of w.root.querySelectorAll('.puzzle-reply-target img'))for(const a of piece.getAnimations()){speedDurations.push(a.effect.getTiming().duration);a.playbackRate=.01;}}
      return result;};
    void w.startPuzzleRun('timeAttack');window.speedRun=w.run;
  })`);
  await waitFor(review,"import('./analysis.js').then(m=>!!m.learningWorkspace.replyAnimation)",'Held setup animation');
  await run("import('./analysis.js').then(m=>{window.speedRun=m.learningWorkspace.run;})");
  const point=async square=>run(`(()=>{const r=document.querySelector('[data-square=${square}]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  const press=async square=>{const p=await point(square);await call('Input.dispatchMouseEvent',{type:'mouseMoved',...p},review.sessionId);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1},review.sessionId);};
  const drop=async square=>{const p=await point(square);await call('Input.dispatchMouseEvent',{type:'mouseMoved',...p,buttons:1},review.sessionId);await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1},review.sessionId);};
  await press('e4');
  assert.equal(await run("document.querySelector('[data-square=d5]').classList.contains('legal-cap')"),true);
  const capture=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,'time-attack-early-capture.png'),Buffer.from(capture.data,'base64'));
  await drop('d5');
  await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace.activity?.step===2&&!!m.learningWorkspace.replyAnimation)",'Held continuation animation');
  assert.equal(await run('speedRun.correctMoves'),1);assert.equal(await run('speedFinishes'),1);
  await press('b1');assert.equal(await run("document.querySelector('[data-square=c3]').classList.contains('legal')"),true);
  await drop('c3');
  await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace.result?.solved===1)",'Early-drop solve');
  assert.equal(await run('speedRun.correctMoves'),2);assert.equal(await run('speedFinishes'),2);
  assert.deepEqual(await run('speedDurations'),[64,64]);
  assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.pendingOpponent===null&&m.learningWorkspace.premove===null&&m.learningWorkspace.store.value.puzzleRating.played===0&&!document.querySelector('.drag-piece'))"),true);
  await run(`import('./analysis.js').then(m=>{
    const w=m.learningWorkspace;
    w.waitForPuzzleReply=function(){this.replyPending=true;return new Promise(resolve=>{this.releaseReply=value=>{this.releaseReply=null;this.replyPending=false;resolve(value);};});};
    void w.startPuzzleSelection(w.puzzles);
  })`);
  await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace.opponentPlaying&&!!m.learningWorkspace.releaseReply)",'Practice introduction');
  const before=await run("import('./analysis.js').then(m=>m.learningWorkspace.currentFen())");
  await press('e4');await drop('d5');
  assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.currentFen())"),before);
  assert.equal(await run("document.querySelector('[data-square=d5].premove img')?.dataset.piece"),'wP');
  assert.equal(await run("!!document.querySelector('[data-square=e4] img')"),false);
  assert.equal(await run(`(()=>{
    const square=document.querySelector('[data-square=h3]');square.classList.add('marked');
    const marked=getComputedStyle(square,'::after').backgroundColor;square.classList.remove('marked');
    return marked===getComputedStyle(document.querySelector('[data-square=d5]'),'::after').backgroundColor;
  })()`),true);
  const preview=await call('Page.captureScreenshot',{format:'png'},review.sessionId);await fs.writeFile(path.join(out,'practice-premove.png'),Buffer.from(preview.data,'base64'));
  const cancel=await point('h3');
  await call('Input.dispatchMouseEvent',{type:'mousePressed',...cancel,button:'right',buttons:2,clickCount:1},review.sessionId);
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',...cancel,button:'right',buttons:0,clickCount:1},review.sessionId);
  assert.equal(await run("document.querySelector('[data-square=e4] img')?.dataset.piece"),'wP');
  assert.equal(await run("!!document.querySelector('.premove')"),false);
  await press('e4');await drop('d5');
  await run("import('./analysis.js').then(m=>m.learningWorkspace.releaseReply(true))");
  await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace.activity?.step===1&&!!m.learningWorkspace.releaseReply)",'Practice continuation');
  await press('b1');await drop('c3');
  assert.equal(await run("document.querySelector('[data-square=c3].premove img')?.dataset.piece"),'wN');
  await run("import('./analysis.js').then(m=>m.learningWorkspace.releaseReply(true))");
  await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace.feedback?.status==='completed')",'Premoved puzzle solve');
  assert.equal(await run("!!document.querySelector('.premove, .drag-piece')"),false);
  for(const mode of ['practice','knockout']) {
    await run(`import('./analysis.js').then(async m=>{
      const {Chess}=await import('./lib/chess.js'),w=m.learningWorkspace;await w.navigate('puzzles');
      w.puzzles=[{id:'queued-authored',fen:new Chess().fen(),solution:['e2e4','e7e5','g1f3','b8c6','f3g5','h7h6','g5f7'],rating:450,themes:[]}];
      w.showPuzzleRunStart=async()=>true;
      if('${mode}'==='practice')await w.startPuzzleSelection(w.puzzles);else await w.startPuzzleRun('${mode}');
      window.queuedSounds=0;const sound=w.onPuzzlePremove;w.onPuzzlePremove=()=>{queuedSounds++;sound();};
      void w.submitPuzzle('e2e4');
    })`);
    await waitFor(review,"import('./analysis.js').then(m=>!!m.learningWorkspace.releaseReply)",'First queued reply');
    for(const [from,to] of [['g1','f3'],['f3','g5'],['g5','f7']]){await press(from);await drop(to);}
    assert.deepEqual(await run("import('./analysis.js').then(m=>m.learningWorkspace.premove.moves)"),['g1f3','f3g5','g5f7']);
    assert.equal(await run("document.querySelector('[data-square=f7].premove img')?.dataset.piece"),'wN');
    assert.equal(await run('queuedSounds'),3);
    for(const step of [3,5,7]){
      await run("import('./analysis.js').then(m=>m.learningWorkspace.releaseReply(true))");
      await waitFor(review,`import('./analysis.js').then(m=>m.learningWorkspace.activity?.step===${step}||m.learningWorkspace.result?.solved===1)`, 'Queued turn '+step);
    }
    await waitFor(review,"import('./analysis.js').then(m=>m.learningWorkspace.premove===null&&m.learningWorkspace.pendingOpponent===null)",'Queue completed');
    assert.equal(await run("document.querySelector('[data-square=f7] img')?.dataset.piece"),'wN');
    assert.equal(await run("!!document.querySelector('.premove, .drag-piece')"),false);
    await run("import('./analysis.js').then(m=>{m.learningWorkspace.onPuzzlePremove=()=>{};})");
  }
  console.log('Real pointer premove previews, red highlight matching, cancellation, automatic execution and Time attack checks passed. Screenshots: '+out);
}
