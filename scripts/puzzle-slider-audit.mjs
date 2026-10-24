import assert from 'node:assert/strict';

// Real pointer capture and native keyboard behavior cannot be exercised by jsdom.
export async function auditLearning({review,call,evaluate,waitFor}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(m=>m.openLearning())");
  await waitFor(review,"!!document.querySelector('.learn-dual-range')&&!document.querySelector('.learn-transition-surface')",'Puzzle slider');
  await run(`import('./analysis.js').then(m=>{
    const w=m.learningWorkspace,update=w.updatePuzzleSelection.bind(w);
    window.sliderUpdates=[];w.updatePuzzleSelection=()=>{sliderUpdates.push([...w.puzzleRange]);update();};
  })`);
  const mouse=(type,x,y,buttons=1)=>call('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons,clickCount:1},review.sessionId);
  for(const index of [0,1]){
    await run("[...document.querySelectorAll('.learn-puzzle-options button')].find(n=>n.textContent==='Reset').click();sliderUpdates=[]");
    const bounds=await run(`(()=>{
      const track=document.querySelector('.learn-dual-range'),input=track.querySelectorAll('input')[${index}],r=input.getBoundingClientRect();
      window.sliderTrack=track;window.sliderInput=input;
      return {left:r.left+10,right:r.right-10,y:r.top+r.height/2,min:Number(input.min),max:Number(input.max)};
    })()`);
    const {left,right,y,min,max}=bounds,start=index===0?left:right;
    await mouse('mouseMoved',start,y,0);await mouse('mousePressed',start,y);
    assert.equal(await run("sliderTrack.classList.contains('is-dragging')&&sliderTrack.hasPointerCapture(1)&&document.activeElement===sliderInput"),true);
    const target=min+(max-min)*(index===0?.2317:.7683),x=left+(target-min)/(max-min)*(right-left);
    await mouse('mouseMoved',x,y);
    const dragging=await run(`new Promise(resolve=>requestAnimationFrame(()=>resolve({
      value:Number(sliderInput.value),cursor:getComputedStyle(sliderTrack).cursor,
      thumbCursor:getComputedStyle(sliderInput,'::-webkit-slider-thumb').cursor,
      text:sliderInput.getAttribute('aria-valuetext'),step:sliderInput.step
    })))`);
    assert.ok(Math.abs(dragging.value-target)<1,'the thumb follows the pointer between rating steps');
    assert.equal(dragging.cursor,'grabbing');assert.equal(dragging.step,'any');
    assert.equal(dragging.text,Math.round(target/50)*50+' rating');
    // Leaving the track must keep the captured drag and cursor, and clamp at the bound.
    const outside=index===0?left-40:right+40;
    await mouse('mouseMoved',outside,y+60);
    assert.equal(await run("sliderTrack.hasPointerCapture(1)&&getComputedStyle(sliderTrack).cursor==='grabbing'"),true);
    await mouse('mouseReleased',outside,y+60,0);
    assert.equal(await run("!sliderTrack.classList.contains('is-dragging')&&!sliderTrack.hasPointerCapture(1)&&sliderInput.step==='50'"),true);
    assert.equal(await run('Number(sliderInput.value)'),index===0?min:max);
    assert.equal(await run('sliderUpdates.every((range,i)=>!i||range.some((value,j)=>value!==sliderUpdates[i-1][j]))'),true,'unchanged selections must not repeat filtering');
    await run('sliderInput.focus()');
    const key=index===0?'ArrowRight':'ArrowLeft';
    await call('Input.dispatchKeyEvent',{type:'keyDown',key},review.sessionId);
    await call('Input.dispatchKeyEvent',{type:'keyUp',key},review.sessionId);
    assert.equal(await run('Number(sliderInput.value)'),index===0?min+50:max-50,'keyboard keeps 50-point steps');
  }
  // A rail press uses the same capture path and chooses the nearest thumb.
  const rail=await run("(()=>{const r=sliderTrack.getBoundingClientRect();return {x:r.left+r.width*.7,y:r.top+3};})()");
  await mouse('mousePressed',rail.x,rail.y);
  assert.equal(await run("document.activeElement.getAttribute('aria-label')==='Maximum'&&sliderTrack.hasPointerCapture(1)"),true);
  await mouse('mouseReleased',rail.x,rail.y,0);
  console.log('Puzzle slider: smooth real-pointer drags, stable captured cursor, bounds, rail selection and keyboard steps passed.');
}
