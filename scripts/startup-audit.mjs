import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function auditLearning({review,call,evaluate,waitFor,sleep,out}) {
  const base=await evaluate(review,'location.origin');
  for(const [name,url,reduced,zoom]of [
    ['review','analysis.html#startup-audit',false,1],
    ['blank','analysis.html?workspace=blank',true,1],
    ['review-125','analysis.html#startup-audit',false,1.25],
    ['blank-80','analysis.html?workspace=blank',false,.8],
  ]) {
    await evaluate(review,"import('./browser-compat.js').then(({browserAPI})=>browserAPI.storage.local.set({'job:startup-audit':{pgn:'1. e4 e5 2. Nf3 Nc6 *',meta:{gameId:'startup-audit'},source:'pgn'}}))");
    const {targetId}=await call('Target.createTarget',{url:base+'/audit.html'});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    const tab={targetId,sessionId};
    await call('Page.enable',{},sessionId);
    await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false},sessionId);
    if(reduced)await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
    // Set an inherited browser zoom before navigation, while no loading mark is
    // present. A 100%-only audit misses the startup resize reported by users.
    await waitFor(tab,'!!window.api','Zoom fixture');
    await evaluate(tab,`chrome.tabs.getCurrent().then(async t=>{
      await chrome.tabs.setZoomSettings(t.id,{scope:'per-origin',mode:'automatic'});
      await chrome.tabs.setZoom(t.id,${zoom});
    })`);
    await call('Page.addScriptToEvaluateOnNewDocument',{source:`
      window.startupFrames=[];
      window.startupZoomCalls=[];
      for(const key of ['setZoomSettings','setZoom']){
        const original=chrome.tabs[key];
        chrome.tabs[key]=function(...args){startupZoomCalls.push({key,args});return original.apply(this,args);};
      }
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
        const rect=board?.getBoundingClientRect();
        const mark=document.querySelector('.startup-mark')?.getBoundingClientRect();
        startupFrames.push({visible,pieces:board?.querySelectorAll('.piece-img').length||0,
          squares:board?.querySelectorAll('.sq').length||0,width:rect?.width||0,x:rect?.x||0,
          mark:mark&&mark.width>0?{x:mark.x,width:mark.width}:null,
          viewport:innerWidth,pixelRatio:devicePixelRatio});
        if(!window.startupSamplingDone)requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    `},sessionId);
    for(const load of ['open','reload']){
      const label=name+'-'+load;
      if(load==='open')await call('Page.navigate',{url:base+'/'+url},sessionId);
      else await call('Page.reload',{},sessionId);
      await waitFor(tab,'!!window.startupDecodeWaiting&&!window.startupSamplingDone','Piece decode gate');
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
      await fs.writeFile(path.join(out,'startup-'+label+'.png'),Buffer.from(image.data,'base64'));
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
      await sleep(150);
      const finish=await evaluate(tab,'(async()=>{startupSamplingDone=true;return {frames:startupFrames,zoomCalls:startupZoomCalls,zoom:await chrome.tabs.getZoom()};})()');
      await fs.writeFile(path.join(out,'startup-'+label+'-frames.json'),JSON.stringify(finish,null,2));
      assert.deepEqual(finish.zoomCalls,[],'Startup must not mutate browser zoom');
      assert.ok(Math.abs(finish.zoom-zoom)<.005,'Open and reload must preserve the initial browser zoom');
      const marks=finish.frames.filter(frame=>frame.mark);
      assert.ok(marks.length>1,'The loading symbol must be sampled before the workspace reveal');
      for(const frame of marks){
        assert.ok(Math.abs(frame.mark.x-marks[0].mark.x)<.5,'Loading symbol moved sideways');
        assert.ok(Math.abs(frame.mark.width-marks[0].mark.width)<.5,'Loading symbol changed size');
        assert.equal(frame.viewport,marks[0].viewport);
        assert.equal(frame.pixelRatio,marks[0].pixelRatio);
      }
      const visible=finish.frames.filter(frame=>frame.visible);
      for(const frame of visible){
        assert.ok(Math.abs(frame.x-visible[0].x)<.5,'Board moved sideways during startup');
        assert.ok(Math.abs(frame.width-visible[0].width)<.5,'Board resized during startup');
        assert.equal(frame.viewport,visible[0].viewport);
        assert.equal(frame.pixelRatio,visible[0].pixelRatio);
      }
      const readyImage=await call('Page.captureScreenshot',{format:'png'},sessionId);
      await fs.writeFile(path.join(out,'startup-'+label+'-ready.png'),Buffer.from(readyImage.data,'base64'));
      console.log(label+': stable loading symbol and '+zoom*100+'% zoom through '+(reduced?'reduced motion':'animation')+' passed.');
    }
  }
  console.log('Startup screenshots: '+out);
}
