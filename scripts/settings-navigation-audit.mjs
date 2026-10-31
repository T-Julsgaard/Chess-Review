import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const run=expression=>evaluate(review,expression),results=[];
  const click=async selector=>{
    const point=await run(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point},review.sessionId);
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point},review.sessionId);
  };
  const capture=async name=>{
    const shot=await call('Page.captureScreenshot',{format:'png'},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));
  };
  await run("document.querySelector('.learning-announcement-disable')?.click()");
  for(const setup of ['old','modern']){
    await run(`import('./analysis.js').then(m=>m.applyUiSetup('${setup}'))`);
    if(await run("document.querySelector('#settings').hidden"))await click('[aria-label=Settings]');
    for(const [width,height] of [[1920,919],[1920,979],[2560,1280],[1366,648],[1024,768],[390,844],[320,568],[844,390],[568,320]]){
      await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},review.sessionId);await sleep(100);
      let originalWidth;
      for(const category of ['visual','review','engine','sound','leaderboard','developer']){
        await click('.set-category > .lib-dd-btn');
        assert.equal(await run("document.querySelector('.set-category > .lib-dd-btn').getAttribute('aria-expanded')"),'true');
        if(category==='visual'&&[1920,390,320].includes(width)){
          await sleep(220);await capture(`${setup}-menu-${width}x${height}`);
        }
        await click(`.set-category [data-category="${category}"]`);await sleep(50);
        const data=await run(`(()=>{const p=document.querySelector('#settings'),r=p.getBoundingClientRect(),b=document.querySelector('.set-category > .lib-dd-btn').getBoundingClientRect();return {panelWidth:r.width,x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:p.scrollWidth-p.clientWidth,selected:document.querySelector('.set-category [aria-checked=true]').dataset.category,focus:document.activeElement===document.querySelector('.set-category > .lib-dd-btn'),headerHit:p.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};})()`);
        results.push({setup,width,height,category,...data});
        originalWidth??=data.panelWidth;
        await fs.writeFile(path.join(out,'settings-navigation.json'),JSON.stringify(results,null,2));
        assert.equal(data.selected,category);assert.equal(data.focus,true,JSON.stringify(results.at(-1)));
        assert.ok(data.headerHit&&data.x>=0&&data.right<=width+1&&data.bottom<=height+1&&data.overflow<=1,JSON.stringify(results.at(-1)));
        assert.ok(Math.abs(data.panelWidth-originalWidth)<1,'Category selection preserves panel width');
        if([1920,390].includes(width)&&['review','sound','visual'].includes(category)){
          await sleep(400);await capture(`${setup}-${category}-${width}x${height}`);
        }
      }
    }
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1920,height:919,deviceScaleFactor:1,mobile:false},review.sessionId);
  // Motion preferences apply to both the picker and the incoming settings.
  for(const [motion,reduced] of [[true,false],[false,false],[true,true]]){
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]},review.sessionId);
    await run(`import('./analysis.js').then(m=>{m.S.settings.uiAnim=${motion};m.selectSettingsCategory('visual');m.selectSettingsCategory('review');})`);
    const animated=await run("document.querySelector('.set-category-content > *').getAnimations().some(a=>a.animationName==='settings-category-in')");
    assert.equal(animated,motion&&!reduced);
    await click('.set-category > .lib-dd-btn');
    assert.equal(await run("document.querySelector('#settingsCategoryMenu').getAnimations().some(a=>a.animationName==='settings-menu-in')"),motion&&!reduced);
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'},review.sessionId);
    await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'},review.sessionId);
    assert.equal(await run("document.querySelector('.set-category > .lib-dd-btn').getAttribute('aria-expanded')"),'false');
  }
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]},review.sessionId);
  await run("import('./analysis.js').then(m=>{m.S.settings.uiAnim=true;m.selectSettingsCategory('visual');})");
  await click('.set-category > .lib-dd-btn');await sleep(250);await capture('settings-category-menu-final');
  await fs.writeFile(path.join(out,'settings-navigation.json'),JSON.stringify(results,null,2));
  console.log(`Settings navigation: ${results.length} category/viewport checks; real pointer input, keyboard dismissal and motion preferences passed. Evidence: ${out}`);
}
