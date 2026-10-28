import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const base=await evaluate(review,'location.origin');
  await evaluate(review,"import('./browser-compat.js').then(({browserAPI})=>browserAPI.storage.local.set({'job:startup-audit':{pgn:'1. e4 e5 2. Nf3 Nc6 *',meta:{gameId:'startup-audit'},source:'pgn'}}))");
  for(const [name,url,reduced]of [['review','analysis.html#startup-audit',false],['blank','analysis.html?workspace=blank',true]]) {
    const {targetId}=await call('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    const tab={targetId,sessionId};
    await call('Page.enable',{},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false},sessionId);
    if(reduced)await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
    await call('Page.addScriptToEvaluateOnNewDocument',{source:`
      window.startupFrames=[];
      const decode=HTMLImageElement.prototype.decode;
      const gate=new Promise(resolve=>{window.releaseStartupPieces=resolve;});
      HTMLImageElement.prototype.decode=function(){
        const ready=decode.call(this);
        if(!this.closest('#boardWrap'))return ready;
        window.startupDecodeWaiting=true;
        return Promise.all([ready,gate]);
      };
      const sample=()=>{
        const root=document.getElementById('root'),board=document.querySelector('.board');
        const visible=!!root&&getComputedStyle(root).visibility==='visible'&&!root.hidden;
        startupFrames.push({visible,pieces:board?.querySelectorAll('.piece-img').length||0,
          squares:board?.querySelectorAll('.sq').length||0,width:board?.getBoundingClientRect().width||0});
        if(!visible)requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    `},sessionId);
    await call('Page.navigate',{url:base+'/'+url},sessionId);
    await waitFor(tab,'!!window.startupDecodeWaiting','Piece decode gate');
    const loading=await evaluate(tab,`({visible:getComputedStyle(document.getElementById('root')).visibility,
      inert:document.getElementById('root').inert,mark:!!document.getElementById('startup'),
      animations:document.querySelector('.startup-mark i').getAnimations().length})`);
    assert.equal(loading.visible,'hidden');assert.equal(loading.inert,true);assert.equal(loading.mark,true);
    assert.equal(loading.animations,reduced?0:1);
    const seam=await evaluate(tab,`(()=>{
      const top=document.querySelector('.startup-top').getBoundingClientRect();
      const bottom=document.querySelector('.startup-bottom').getBoundingClientRect();
      return {top:top.bottom,bottom:bottom.top,middle:innerHeight/2};
    })()`);
    assert.ok(Math.abs(seam.top-seam.middle)<=1&&Math.abs(seam.bottom-seam.middle)<=1,JSON.stringify(seam));
    await sleep(80);
    const image=await call('Page.captureScreenshot',{format:'png'},sessionId);
    await fs.writeFile(path.join(out,'startup-'+name+'.png'),Buffer.from(image.data,'base64'));
    await evaluate(tab,'releaseStartupPieces()');
    await waitFor(tab,"!document.body.hasAttribute('data-starting')",'Ready workspace');
    await sleep(40);
    const frames=await evaluate(tab,'startupFrames');
    assert.ok(frames.some(frame=>!frame.visible));
    assert.ok(frames.some(frame=>frame.visible));
    for(const frame of frames.filter(frame=>frame.visible)) {
      assert.equal(frame.pieces,32);assert.equal(frame.squares,64);assert.ok(frame.width>100);
    }
    await waitFor(tab,"!document.getElementById('startup')&&!document.getElementById('root').inert",'Finished reveal');
    const readyImage=await call('Page.captureScreenshot',{format:'png'},sessionId);
    await fs.writeFile(path.join(out,'startup-'+name+'-ready.png'),Buffer.from(readyImage.data,'base64'));
    console.log(name+': startup mark, complete-board first reveal and '+(reduced?'reduced motion':'animation')+' passed.');
  }
  console.log('Startup screenshots: '+out);
}
