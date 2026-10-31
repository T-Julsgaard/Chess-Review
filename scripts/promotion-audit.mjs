import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,sleep,out}) {
  const run=expression=>evaluate(review,expression);
  const check=async(color,label,flipped)=>{
    const state=await run(`(async()=>{
      const picker=document.querySelector('.promotion-picker'),buttons=[...picker.querySelectorAll('.promotion-options button')];
      await Promise.all(buttons.map(n=>n.querySelector('img').decode()));
      const css=getComputedStyle(buttons[0]),rect=picker.getBoundingClientRect(),overlay=picker.closest('.board-promotion');
      const board=overlay.parentElement.getBoundingClientRect(),queen=buttons[0].getBoundingClientRect();
      return {color:picker.dataset.color,pieces:buttons.map(n=>n.querySelector('img').dataset.piece),
        edge:overlay.dataset.edge,queen:{x:queen.left-board.left,y:queen.top-board.top,width:queen.width,height:queen.height},board:{width:board.width,height:board.height},
        background:css.backgroundColor,ink:css.color,focused:picker.contains(document.activeElement),
        inside:rect.left>=-1&&rect.right<=innerWidth+1&&rect.top>=-1&&rect.bottom<=innerHeight+1};
    })()`);
    assert.equal(state.color,color,label);
    assert.deepEqual(state.pieces,['Q','R','B','N'].map(piece=>color+piece),label);
    assert.equal(state.focused,true,label);assert.equal(state.inside,true,label);
    const bottom=(color==='b')!==flipped;
    assert.equal(state.edge,bottom?'bottom':'top',label);
    assert.ok(Math.abs(state.queen.width-state.board.width/8)<1,label+' square width');
    assert.ok(Math.abs(state.queen.height-state.board.height/8)<1,label+' square height');
    assert.ok(Math.abs(state.queen.x-(flipped?state.board.width*7/8:0))<1,label+' destination file');
    assert.ok(Math.abs(state.queen.y-(bottom?state.board.height*7/8:0))<1,label+' destination rank');
    if(color==='b') {
      assert.equal(state.background,'rgb(222, 218, 205)',label);
      assert.equal(state.ink,'rgb(37, 38, 41)',label);
      // The focused and hovered option must keep a light background too.
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown'},review.sessionId);
      await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown'},review.sessionId);
      assert.ok(await run("(()=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle=getComputedStyle(document.activeElement).backgroundColor;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data].slice(0,3).every(n=>n>140)})()"),label);
    }
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,label+'.png'),Buffer.from(shot.data,'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click();import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.S.settings.learningTransition='fade';})");
  for(const [width,height] of [[1920,1080],[390,844]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(150);
    for(const theme of ['dark','light'])for(const color of ['w','b'])for(const flipped of [false,true]) {
      const fen=color==='w'?'7k/P7/8/8/8/8/8/7K w - - 0 1':'7k/8/8/8/8/8/p7/7K b - - 0 1';
      const from=color==='w'?'a7':'a2',to=color==='w'?'a8':'a1',label=`${width}-${theme}-${color}-${flipped}`;
      await run(`import('./analysis.js').then(m=>{
        document.querySelector('[data-theme]').setAttribute('data-theme','${theme}');
        if(m.S.flipped!==${flipped})m.toggleFlip();m.S.analysisMode=true;
        m.S.variation={branchIdx:m.S.idx,idx:0,positions:[{...m.S.positions[m.S.idx],fen:'${fen}'}]};
        m.paintBoard();m.applyUserMove('${from}','${to}',false);
      })`);
      // Move focus away to inspect the resting option, then check keyboard focus separately.
      await run("document.querySelector('.promotion-cancel').focus()");
      await check(color,'review-'+label,flipped);
      const point=await run("(()=>{const r=document.querySelector('[aria-label=\"Promote to knight\"]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()");
      await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1},review.sessionId);
      await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1},review.sessionId);
      assert.equal(await run("import('./analysis.js').then(m=>m.S.variation.positions[1].promotion)"),'n');
      await run("import('./analysis.js').then(m=>m.openLearning())");
      for(const mode of ['free','puzzle']) {
        await run(`import('./analysis.js').then(async m=>{
          const w=m.learningWorkspace;await w.navigate('puzzles');
          if('${mode}'==='puzzle') {w.puzzles=[{id:'${label}',fen:'${fen}',solution:['${from}${to}n'],rating:1200,themes:[]}];await w.startPuzzleSelection(w.puzzles);}
          else w.homePosition.load('${fen}');
          w.render();if(w.flipped!==${flipped})w.flipBoard();
          document.querySelector('[data-square=${from}]').click();document.querySelector('[data-square=${to}]').click();
        })`);
        await run("document.querySelector('.promotion-cancel').focus()");
        await check(color,mode+'-'+label,flipped);
        await run("document.querySelector('[aria-label=\"Promote to knight\"]').click()");
        assert.equal(await run(`document.querySelector('[data-square=${to}] img').dataset.piece`),color+'N');
      }
      await run("import('./analysis.js').then(m=>m.learningWorkspace.close())");
    }
  }
  console.log('Promotion contrast, piece colors, orientation, focus and underpromotion passed in review, free play and puzzles, in both themes at desktop/mobile widths. Screenshots: '+out);
}
