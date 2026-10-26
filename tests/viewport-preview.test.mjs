import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountViewportPreview,previewScale,monitorViewport,normalizePreviewZoom} from '../lib/viewport-preview.js';

function previewDOM(t,display={width:1920,height:1080,pixelRatio:1,insetWidth:0,insetHeight:0}) {
  const dom=new JSDOM(fs.readFileSync(new URL('../screen-preview.html',import.meta.url),'utf8'),{url:'https://extension.test/screen-preview.html'});
  t.after(()=>dom.window.close());
  dom.window.sessionStorage.setItem('screen-size-preview',JSON.stringify({display}));
  return dom;
}

test('fit scales large screens without changing dimensions and actual size stays unscaled',()=>{
  assert.equal(previewScale(3840,2160,1920,1080,'fit'),0.5);
  assert.equal(previewScale(1920,1080,1920,1080),1);
  assert.equal(previewScale(1280,720,1920,1080,'fit'),1.5);
  assert.equal(previewScale(390,844,1968,1128,'fit'),1128/844);
  assert.equal(previewScale(1920,1080,1920,919),1,'Actual size is the default even in a shorter browser window');
  assert.equal(previewScale(3840,2160,1968,1128,'1'),1);
});

test('presets, custom sizes, rotation keep native dimensions and resize the same live iframe',t=>{
  const dom=previewDOM(t);
  const doc=dom.window.document,$=id=>doc.getElementById(id),stage=$('preview-stage');
  Object.defineProperties(stage,{clientWidth:{value:1920},clientHeight:{value:1080}});
  const {frame}=mountViewportPreview(doc),source=frame.src;
  const click=name=>[...doc.querySelectorAll('#device-tabs button')].find(b=>b.textContent===name).click();
  const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new dom.window.Event('change'));};
  assert.equal(frame.style.width,'1920px');assert.equal(frame.style.height,'1080px');
  click('Desktop');change('screen-preset','1');assert.match($('screen-preset').selectedOptions[0].textContent,/1440p.*2560 × 1440/);
  assert.equal(frame.style.width,'2560px');assert.equal(frame.style.height,'1440px');
  change('preview-scale','fit');change('screen-preset','2');assert.equal(frame.style.width,'3840px');assert.equal(frame.style.transform,'scale(0.5)');
  change('preview-scale','1');assert.equal(frame.style.transform,'scale(1)');
  click('Phone');assert.equal(frame.style.width,'320px');assert.equal(frame.style.height,'568px');
  $('rotate-screen').click();assert.equal(frame.style.width,'568px');assert.equal(frame.style.height,'320px');
  change('screen-width','900');change('screen-height','700');
  assert.equal(frame.style.width,'900px');assert.equal(frame.style.height,'700px');
  change('screen-width','0');assert.equal(frame.style.width,'900px');
  change('screen-width','900');
  frame.dispatchEvent(new dom.window.CustomEvent('preview-zoom',{detail:0.75}));
  assert.equal(frame.style.width,'900px');assert.equal(frame.style.height,'700px');assert.equal(frame.dataset.previewZoom,undefined);
  assert.match($('screen-readout').textContent,/900 × 700/);
  assert.equal(frame.src,source);assert.equal($('preview-app'),frame);
});

test('setup overlays and hiding controls preserve the live viewport and restore keyboard focus',t=>{
  const dom=previewDOM(t);
  const doc=dom.window.document,$=id=>doc.getElementById(id);
  Object.defineProperties($('preview-stage'),{clientWidth:{value:1920},clientHeight:{value:1080}});
  const {frame}=mountViewportPreview(doc),source=frame.src;
  assert.equal($('preview-settings').hidden,true);
  $('toggle-settings').click();
  assert.equal($('preview-settings').hidden,false);assert.equal($('toggle-settings').getAttribute('aria-expanded'),'true');
  assert.equal(doc.activeElement,$('close-settings'));
  assert.equal(frame.style.transform,'scale(1)');
  doc.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));
  assert.equal($('preview-settings').hidden,true);assert.equal(doc.activeElement,$('toggle-settings'));
  $('toggle-settings').click();$('hide-controls').click();
  assert.equal($('preview-settings').hidden,true);assert.equal($('preview-toolbar').hidden,true);assert.equal($('show-controls').hidden,false);
  $('show-controls').click();
  assert.equal($('preview-toolbar').hidden,false);assert.equal($('show-controls').hidden,true);
  assert.equal(doc.activeElement,$('toggle-settings'));assert.equal(frame.src,source);
  assert.equal($('fullscreen-preview').hidden,true,'Unsupported fullscreen is hidden');
});

test('fullscreen uses the whole viewer, hides controls, handles exit and reports rejection',async t=>{
  const dom=previewDOM(t);
  const doc=dom.window.document,$=id=>doc.getElementById(id);
  let requests=0;
  doc.documentElement.requestFullscreen=async()=>{requests++;doc.fullscreenElement=doc.documentElement;doc.dispatchEvent(new dom.window.Event('fullscreenchange'));};
  doc.exitFullscreen=async()=>{doc.fullscreenElement=null;doc.dispatchEvent(new dom.window.Event('fullscreenchange'));};
  const {frame}=mountViewportPreview(doc),source=frame.src;
  assert.equal($('fullscreen-preview').hidden,false);
  $('fullscreen-preview').click();await Promise.resolve();
  assert.equal(requests,1);assert.equal(doc.fullscreenElement,doc.documentElement);
  assert.equal($('preview-toolbar').hidden,true);assert.equal($('show-controls').hidden,false);
  $('show-controls').click();
  assert.equal($('fullscreen-preview').textContent,'Exit full screen');assert.equal($('fullscreen-preview').getAttribute('aria-pressed'),'true');
  $('fullscreen-preview').click();await Promise.resolve();
  assert.equal(doc.fullscreenElement,null);assert.equal($('fullscreen-preview').textContent,'Full screen');
  doc.documentElement.requestFullscreen=async()=>{throw Error('Denied');};
  $('fullscreen-preview').click();await Promise.resolve();
  assert.equal($('preview-toolbar').hidden,false);assert.equal($('preview-status').hidden,false);
  assert.match($('preview-status').textContent,/could not open/);assert.equal(frame.src,source);
});

test('monitor presets subtract browser and taskbar space after applying OS display scaling',()=>{
  assert.deepEqual(monitorViewport(1920,1080,{pixelRatio:1,insetWidth:0,insetHeight:161}),[1920,919]);
  assert.deepEqual(monitorViewport(1920,1080,{pixelRatio:1.25,insetWidth:0,insetHeight:120}),[1536,744]);
  assert.deepEqual(monitorViewport(2560,1440,{pixelRatio:1.25,insetWidth:16,insetHeight:120}),[2032,1032]);
  assert.deepEqual(monitorViewport(1920,1080,{pixelRatio:0,insetWidth:-2,insetHeight:-1}),[1920,1080]);
});

test('current window matches the launching viewport and monitor settings leave mobile/custom dimensions alone',t=>{
  const dom=previewDOM(t,{width:1536,height:744,pixelRatio:1.25,insetWidth:0,insetHeight:120});
  const doc=dom.window.document,$=id=>doc.getElementById(id);
  Object.defineProperties($('preview-stage'),{clientWidth:{value:1536},clientHeight:{value:744}});
  const {frame}=mountViewportPreview(doc),source=frame.src;
  const click=name=>[...doc.querySelectorAll('#device-tabs button')].find(b=>b.textContent===name).click();
  assert.equal(frame.style.width,'1536px');assert.equal(frame.style.height,'744px');assert.equal(frame.style.transform,'scale(1)');
  click('Desktop');assert.equal(frame.style.width,'1536px');assert.equal(frame.style.height,'744px');
  click('Phone');assert.equal(frame.style.width,'320px');assert.equal(frame.style.height,'568px');
  $('screen-width').value='900';$('screen-width').dispatchEvent(new dom.window.Event('change'));
  assert.equal(frame.style.width,'900px');assert.equal(frame.style.height,'568px');
  click('Current');assert.equal(frame.style.width,'1536px');assert.equal(frame.style.height,'744px');
  assert.equal(frame.src,source);
});

test('directly opened previews use the current browser viewport when there is no launch snapshot',t=>{
  const dom=previewDOM(t);dom.window.sessionStorage.setItem('screen-size-preview','invalid');
  const {frame}=mountViewportPreview(dom.window.document);
  assert.equal(frame.style.width,dom.window.innerWidth+'px');assert.equal(frame.style.height,dom.window.innerHeight+'px');
  assert.equal(frame.style.transform,'scale(1)');
});

test('the preview viewer restores its own tab to 100% without touching other tabs',async()=>{
  const calls=[];
  const tabs={getCurrent:async()=>({id:42}),setZoomSettings:async(...args)=>calls.push(['settings',...args]),getZoom:async()=>.8,setZoom:async(...args)=>calls.push(['zoom',...args])};
  await normalizePreviewZoom(tabs);
  assert.deepEqual(calls,[['settings',42,{scope:'per-tab',mode:'automatic'}],['zoom',42,1]]);
  calls.length=0;tabs.getZoom=async()=>1;await normalizePreviewZoom(tabs);assert.equal(calls.length,1);
  tabs.getCurrent=async()=>{throw Error('Unavailable');};await normalizePreviewZoom(tabs);
});
