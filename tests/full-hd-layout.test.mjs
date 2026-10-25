import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fullHdReferenceLayout,FULL_HD_SCALE} from '../lib/full-hd-layout.js';

const reference=JSON.parse(fs.readFileSync(new URL('./fixtures/default-panel-layout.json',import.meta.url)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} must equal ${b}`);
test('Full HD converts the approved panel positions and contents to their physical 87% sizes',()=>{
  for(const [width,height]of [[1920,1080],[1920,960],[1919,919]]){
    const layout=fullHdReferenceLayout(reference.layout,width,height,false);
    for(const [key,box]of Object.entries(reference.displayedLayout)){
      for(const prop of ['x','y','w','h','scale'])near(layout[key][prop],box[prop]*FULL_HD_SCALE);
      near(layout[key].w/layout[key].scale,box.w/box.scale);
    }
  }
});
test('Accuracy expansion preserves its original spacing and does not alter the saved reference',()=>{
  const before=structuredClone(reference.layout),expanded=fullHdReferenceLayout(reference.layout,1920,920,true);
  for(const [key,box]of Object.entries(before))for(const prop of ['x','y','w','h'])near(expanded[key][prop],box[prop]*FULL_HD_SCALE);
  assert.deepEqual(reference.layout,before);
});
test('The prototype does not replace layouts outside the Full HD window range',()=>{
  for(const [width,height]of [[1366,768],[1536,864],[2560,1440],[1920,1200],[1280,560],[390,844]])assert.equal(fullHdReferenceLayout(reference.layout,width,height),null);
});
