import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run = expression => evaluate(review,expression);
  // Coach annotation searches may finish in the background; compare scored results.
  const snapshot = () => run("import('./analysis.js').then(m=>JSON.stringify({idx:m.S.idx,evals:m.S.evals,bests:m.S.bests.map(b=>b&&({bestmove:b.bestmove,score:b.score,playedScore:b.playedScore})),layout:m.S.layout}))");
  const settings = async () => {
    await run("document.querySelector('#settings').hidden&&document.querySelector('[aria-label=Settings]').click();(()=>{const n=[...document.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Tabs');if(n.getAttribute('aria-expanded')!=='true')n.click()})()");
  };
  const close = () => run("!document.querySelector('#settings').hidden&&document.querySelector('[aria-label=Settings]').click()");
  const choose = async design => {
    await settings(); await run(`document.querySelector('[data-setting=graphDesign][data-value=${design}]').click()`);
    await waitFor(review,`document.querySelector('#graphMount .panel')?.dataset.design==='${design}'`,'Evaluation '+design);
    await close();
  };
  const shot = async (name,selector) => {
    const clip = selector && await run(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:2}})()`);
    const result = await call('Page.captureScreenshot',{format:'png',...(clip ? {clip,captureBeyondViewport:true} : {})},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(result.data,'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click();import('./analysis.js').then(m=>{m.S.settings.moveAnim=false;m.go(17)})");
  const evidence=[];
  for (const [width,height] of [[1920,1080],[1366,768],[1280,600],[390,844],[320,640]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId); await sleep(160);
    for (const design of ['timeline','bars','bars2','bars3','bars4','minimal','original']) {
      const before = await snapshot();
      await choose(design);
      assert.equal(await snapshot(),before);
      if (design === 'original') continue;
      const fit = await run("(()=>{const p=document.querySelector('.evaluation-panel'),q=p.getBoundingClientRect(),f=p.querySelector('.evaluation-footer')?.getBoundingClientRect(),s=p.querySelector('.evalgraph').getBoundingClientRect();return {overflow:p.scrollWidth-p.clientWidth,vertical:p.scrollHeight-p.clientHeight,footer:!f||f.bottom<=q.bottom+1,plot:s.height,height:p.offsetHeight,page:document.documentElement.scrollWidth-innerWidth,columns:p.querySelectorAll('.evaluation-column').length}})()");
      assert.ok(fit.overflow<=1&&fit.vertical<=1&&fit.footer&&fit.plot>=19&&fit.page<=1,JSON.stringify({width,height,design,fit}));
      if (design==='bars') {
        assert.ok(fit.columns>25);
        const markers = await run(`(()=>{
          const chart=document.querySelector('.evaluation-bars .evalgraph'),r=chart.getBoundingClientRect();
          return {pointer:!!chart.querySelector('.evaluation-position-marker'),
            guides:chart.querySelectorAll('svg .eval-position,.eval-hover-line').length,
            dots:[...chart.querySelectorAll('.evaluation-move-dot')].map(dot=>{
              const q=dot.getBoundingClientRect();return {category:dot.dataset.category,text:dot.textContent,
                round:Math.abs(q.width-q.height)<.1,
                inside:q.left>=r.left-1&&q.right<=r.right+1&&q.top>=r.top-1&&q.bottom<=r.bottom+1};
            })};
        })()`);
        assert.equal(markers.pointer,true); assert.equal(markers.guides,0);
        assert.ok(markers.dots.length>0&&markers.dots.every(dot=>
          ['brilliant','great','miss','blunder'].includes(dot.category)&&dot.text===''&&dot.round&&dot.inside),
        JSON.stringify({width,height,markers}));
      }
      if (design === 'bars3') {
        const guide = await run(`(()=>{
          const chart=document.querySelector('.evaluation-bars3 .evalgraph'),g=chart.querySelector('.evaluation-position-guide'),
            marker=chart.querySelector('.evaluation-position-marker'),r=chart.getBoundingClientRect(),
            svg=chart.querySelector('svg').getBoundingClientRect(),s=getComputedStyle(g);
          return {visible:s.display!=='none',width:parseFloat(s.strokeWidth),opacity:+s.opacity,
            aligned:Math.abs(svg.left+(+g.getAttribute('x1')/384)*svg.width-(r.left+parseFloat(marker.style.left)/100*r.width))<1,
            end:+g.getAttribute('y2'),start:+g.getAttribute('y1')};
        })()`);
        assert.ok(guide.visible&&guide.aligned&&guide.width===1&&guide.opacity<.6&&guide.end===120&&guide.start<120,JSON.stringify(guide));
      }
      if (design === 'bars4') {
        const colors = await run(`import('./analysis.js').then(m=>{
          const p=document.querySelector('.evaluation-bars4'),bars=[...p.querySelectorAll('.evaluation-column')];
          return {dots:p.querySelectorAll('.evaluation-move-dot').length,
            classified:bars.filter(b=>b.dataset.category).length,
            correct:bars.filter(b=>b.dataset.category).every(b=>b.style.fill==='var(--q-'+b.dataset.category+')'),
            count:bars.length,expected:m.S.evals.filter(Boolean).length};
        })`);
        assert.ok(colors.dots===0&&colors.classified>0&&colors.correct&&colors.count===colors.expected,JSON.stringify(colors));
      }
      if (design==='minimal') {
        assert.ok(fit.height<=96,JSON.stringify(fit));
        assert.equal(await run("document.querySelector('.evaluation-minimal').textContent"),'');
      } else {
        const readout = await run("(()=>{const p=document.querySelector('.evaluation-panel'),s=p.querySelector('.evaluation-score'),r=p.getBoundingClientRect(),q=s.getBoundingClientRect(),scale=r.width/p.offsetWidth;return {text:p.textContent,score:s.textContent,top:(q.top-r.top)/scale,right:(r.right-q.right)/scale}})()");
        if (design !== 'timeline2') assert.equal(readout.text,readout.score,'Only evaluation data should be visible');
        assert.ok(readout.top>=0&&readout.top<=8&&readout.right>=0&&readout.right<=8,JSON.stringify({width,height,design,readout}));
        if (design === 'timeline2') {
          const badges = await run("(()=>{const chart=document.querySelector('.evaluation-timeline2 .evalgraph').getBoundingClientRect();return [...document.querySelectorAll('.evaluation-move-badge')].map(b=>{const r=b.getBoundingClientRect();return {ply:+b.dataset.ply,round:Math.abs(r.width-r.height)<1,inside:r.left>=chart.left-1&&r.right<=chart.right+1&&r.top>=chart.top-1&&r.bottom<=chart.bottom+1}})})()");
          assert.ok(badges.length>0&&badges.every(b=>b.round&&b.inside),JSON.stringify({width,height,badges}));
        }
      }
      await shot(`evaluation-${design}-${width}`,'#graphMount .panel');
      if (width===1920) await shot('evaluation-'+design+'-desktop');
      evidence.push({width,height,design,...fit});
    }
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false},review.sessionId);
  await sleep(200);
  for (const design of ['timeline','bars','bars2','bars3','bars4','minimal']) {
    await choose(design);
    await run("document.querySelector('.evaluation-panel [role=slider]').focus()");
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home'},review.sessionId);
    assert.equal(await run("import('./analysis.js').then(m=>m.S.idx)"),0);
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'},review.sessionId);
    assert.equal(await run("import('./analysis.js').then(m=>m.S.idx)"),1);
    const p=await run("(()=>{const r=document.querySelector('.evaluation-panel [role=slider]').getBoundingClientRect();return {x:r.left+r.width*.5,y:r.top+r.height*.5}})()");
    await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p},review.sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p},review.sessionId);
    const clicked = await run(`import('./analysis.js').then(m=>({idx:m.S.idx,total:m.S.total,hit:document.elementFromPoint(${p.x},${p.y})?.outerHTML.slice(0,250),point:${JSON.stringify(p)},scroll:scrollY}))`);
    assert.ok(clicked.idx>10,JSON.stringify({design,...clicked}));
    if (design.startsWith('bars')) {
      // Clicking then navigating with arrows must not add a frame to Move bars.
      for (const [key,delta] of [['ArrowLeft',-1],['ArrowRight',0]]) {
        await call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key},review.sessionId);
        await call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key},review.sessionId);
        const state = await run(`import('./analysis.js').then(m=>{
          const chart=document.querySelector('.evaluation-panel [role=slider]');
          return {idx:m.S.idx,focused:document.activeElement===chart,
            outline:getComputedStyle(chart).outlineStyle,
            marker:chart.querySelector('.evaluation-position-marker').style.display};
        })`);
        assert.equal(state.idx,clicked.idx+delta);
        assert.equal(state.focused,true);
        assert.equal(state.outline,'none',JSON.stringify({design,key,...state}));
        assert.equal(state.marker,'');
      }
      await shot(`evaluation-${design}-keyboard-navigation`,'#graphMount .panel');
    }
    await call('Page.reload',{},review.sessionId);
    await waitFor(review,`document.querySelector('.evaluation-panel')?.dataset.design==='${design}'&&!document.querySelector('#startup')&&import('./analysis.js').then(m=>!m.S.analyzing)`,'Restored '+design);
  }
  await choose('minimal'); await settings(); await shot('evaluation-design-settings','#settings');
  await fs.writeFile(path.join(out,'evaluation-panel.json'),JSON.stringify({passed:true,evidence},null,2));
  console.log('Evaluation designs: fit at five sizes, stable analysis/layout, pointer/keyboard navigation and saved choices passed. Screenshots: '+out);
}
