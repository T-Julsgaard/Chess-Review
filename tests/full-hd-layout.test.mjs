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
test('Desktop reference proportions adapt to larger screens and readable laptop panels',()=>{
  for(const [width,height]of [[1100,600],[1180,820],[1100,900],[1280,600],[1366,608],[1536,704],[2560,1280],[2560,1440],[3840,2160],[3440,1280],[1920,1200]]){
    const layout=fullHdReferenceLayout(reference.layout,width,height),before=structuredClone(reference.layout);
    for(const [key,box]of Object.entries(layout)){
      assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=width&&box.y+box.h<=height-52.2,`${width}×${height}: ${key} bounds`);
      assert.ok(box.h>0&&box.w>0&&box.scale>=.81,'Content retains a readable scale');
    }
    const panels=Object.entries(layout).filter(([key])=>!['evalbar','coach'].includes(key));
    for(const [i,[ak,a]]of panels.entries())for(const [bk,b]of panels.slice(i+1))assert.ok(
      Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<1||Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<1,`${width}×${height}: ${ak}/${bk} overlap`);
    assert.deepEqual(reference.layout,before);
  }
});
test('Narrow and short windows use stacked panels instead of shrinking the desktop canvas',()=>{
  for(const [width,height]of [[1024,1366],[820,1180],[1280,560],[390,844]])assert.equal(fullHdReferenceLayout(reference.layout,width,height),null);
});
