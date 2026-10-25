import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountViewportPreview,previewScale} from '../lib/viewport-preview.js';

test('fit scales large screens without changing dimensions and actual size stays unscaled',()=>{
  assert.equal(previewScale(3840,2160,1920,1080),0.5);
  assert.equal(previewScale(1920,1080,1920,1080),1);
  assert.equal(previewScale(1280,720,1920,1080),1.5);
  assert.equal(previewScale(390,844,1968,1128),1128/844);
  assert.equal(previewScale(3840,2160,1968,1128,'1'),1);
});

test('presets, custom sizes, rotation keep native dimensions and resize the same live iframe',t=>{
  const dom=new JSDOM(fs.readFileSync(new URL('../screen-preview.html',import.meta.url),'utf8'),{url:'https://extension.test/screen-preview.html'});
  t.after(()=>dom.window.close());
  const doc=dom.window.document,$=id=>doc.getElementById(id),stage=$('preview-stage');
  Object.defineProperties(stage,{clientWidth:{value:1920},clientHeight:{value:1080}});
  const {frame}=mountViewportPreview(doc),source=frame.src;
  const click=name=>[...doc.querySelectorAll('#device-tabs button')].find(b=>b.textContent===name).click();
  const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new dom.window.Event('change'));};
  assert.equal(frame.style.width,'1920px');assert.equal(frame.style.height,'1080px');
  click('Desktop');change('screen-preset','2');assert.equal(frame.style.width,'3840px');assert.equal(frame.style.transform,'scale(0.5)');
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
  const dom=new JSDOM(fs.readFileSync(new URL('../screen-preview.html',import.meta.url),'utf8'),{url:'https://extension.test/screen-preview.html'});
  t.after(()=>dom.window.close());
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
  const dom=new JSDOM(fs.readFileSync(new URL('../screen-preview.html',import.meta.url),'utf8'),{url:'https://extension.test/screen-preview.html'});
  t.after(()=>dom.window.close());
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
