import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountViewportPreview,previewScale} from '../lib/viewport-preview.js';

test('fit scales large screens without changing dimensions and actual size stays unscaled',()=>{
  assert.equal(previewScale(3840,2160,1968,1128),0.5);
  assert.equal(previewScale(390,844,1968,1128),1);
  assert.equal(previewScale(3840,2160,1968,1128,'1'),1);
});

test('presets, custom sizes, rotation keep native dimensions and resize the same live iframe',t=>{
  const dom=new JSDOM(fs.readFileSync(new URL('../screen-preview.html',import.meta.url),'utf8'),{url:'https://extension.test/screen-preview.html'});
  t.after(()=>dom.window.close());
  const doc=dom.window.document,$=id=>doc.getElementById(id),stage=$('preview-stage');
  Object.defineProperties(stage,{clientWidth:{value:1968},clientHeight:{value:1128}});
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
