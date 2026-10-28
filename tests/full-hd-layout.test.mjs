import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fullHdReferenceLayout,FULL_HD_SCALE} from '../lib/full-hd-layout.js';
import {MODERN_LAYOUT} from '../lib/ui-setups.js';

const reference=JSON.parse(fs.readFileSync(new URL('./fixtures/default-panel-layout.json',import.meta.url)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} must equal ${b}`);
test('Full HD converts the approved panel positions and contents to their physical 87% sizes',()=>{
  for(const [width,height]of [[1920,919],[1919,919]]){
    const layout=fullHdReferenceLayout(reference.layout,width,height,false);
    for(const [key,box]of Object.entries(reference.displayedLayout)){
      for(const prop of ['x','y','w','h','scale'])near(layout[key][prop],box[prop]*FULL_HD_SCALE);
      near(layout[key].w/layout[key].scale,box.w/box.scale);
    }
  }
});
test('Accuracy pages scale the reference without altering its saved geometry',()=>{
  const before=structuredClone(reference.layout),expanded=fullHdReferenceLayout(reference.layout,1920,960,true);
  const factor=expanded.board.w/(before.board.w*FULL_HD_SCALE);
  for(const [key,box]of Object.entries(before))for(const prop of ['x','y','w','h']){
    if(key==='engine'&&prop==='h'||key==='learn'&&prop==='y')continue;
    near(expanded[key][prop],box[prop]*FULL_HD_SCALE*factor);
  }
  assert.deepEqual(reference.layout,before);
});

test('extra browser content height grows the desktop composition within both viewport bounds',()=>{
  for(const width of [1800,1920,2001,2560])for(const expanded of [false,true]){
    let previous=0;
    for(const height of [919,949,979,1080,1200]){
      const layout=fullHdReferenceLayout(reference.layout,width,height,expanded);
      assert.ok(layout.board.w>=previous,'More height must not shrink the board');
      if(height===949)assert.ok(layout.board.w>previous,'Hiding a bookmarks bar makes the board larger');
      previous=layout.board.w;
      const top=52.2*Math.max(1,layout.review.scale/(reference.layout.review.scale*FULL_HD_SCALE));
      for(const box of Object.values(layout))assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=width&&box.y+box.h<=height-top);
    }
  }
});
test('the fixed expanded Accuracy panel keeps Engine and puzzle entry in short Full HD windows',()=>{
  for(const height of [880,900,919,920,960,1080]){
    const layout=fullHdReferenceLayout(reference.layout,1920,height,true);
    const top=52.2*Math.max(1,layout.review.scale/(reference.layout.review.scale*FULL_HD_SCALE));
    assert.ok(layout.learn.y+layout.learn.h<=height-top-19);
    assert.ok(layout.engine.h>=84);
    assert.ok(layout.accuracy.y+layout.accuracy.h<layout.engine.y);
    assert.ok(layout.engine.y+layout.engine.h<layout.learn.y);
  }
});
test('Desktop reference proportions adapt to larger screens and readable laptop panels',()=>{
  for(const [width,height]of [[1100,480],[1100,520],[1280,480],[1280,560],[1366,560],[1920,480],[1920,599],[1100,600],[1180,820],[1100,900],[1280,600],[1366,608],[1536,704],[2560,1280],[2560,1440],[3840,2160],[3440,1280],[1920,1200]]){
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
test('Narrow and very short windows use stacked panels instead of shrinking the desktop canvas',()=>{
  for(const [width,height]of [[1024,1366],[820,1180],[1280,479],[390,844]])assert.equal(fullHdReferenceLayout(reference.layout,width,height),null);
});

test('Modern retains the approved desktop geometry and shares readable laptop sizing with Old',()=>{
  const before=structuredClone(MODERN_LAYOUT);
  const baseline=fullHdReferenceLayout(MODERN_LAYOUT,1920,919,false,true);
  const approved=JSON.parse(fs.readFileSync(new URL('./fixtures/modern-panel-layout.json',import.meta.url)));
  assert.deepEqual(baseline,approved.displayedLayout);
  for(const [width,height]of [[1920,880],[1920,800],[1536,704],[1280,560],[1100,480]]){
    const old=fullHdReferenceLayout(reference.layout,width,height,false);
    const modern=fullHdReferenceLayout(MODERN_LAYOUT,width,height,false,true);
    near(modern.moves.scale,old.moves.scale);near(modern.review.w,old.review.w);
    near(modern.review.x,old.review.x);near(modern.board.w,old.board.w);
    assert.ok(modern.graph.y+modern.graph.h<modern.moves.y,'Modern keeps its graph above the move list');
    for(const [key,box]of Object.entries(modern)){
      assert.ok(box.w>0&&box.h>0,`${width}x${height}: ${key} has usable area`);
      assert.ok(box.x>=0&&box.y>=0&&box.x+box.w<=width&&box.y+box.h<=height-52.2,`${width}x${height}: ${key} bounds`);
    }
  }
  assert.deepEqual(MODERN_LAYOUT,before,'Rendering never rewrites saved preset coordinates');
});
test('short laptop windows retain readable move and accuracy bodies with visible navigation',()=>{
  for(const width of [1100,1280,1366,1600,1920])for(const height of [480,520,560,599,600])for(const expanded of [false,true]){
    const layout=fullHdReferenceLayout(reference.layout,width,height,expanded);
    for(const key of ['moves','accuracy'])assert.ok(layout[key].h>=76,'Scrollable bodies retain space below their headers');
    for(const key of ['controls','learn']){
      assert.ok(layout[key].y+layout[key].h<=height-52.2-20,'Navigation stays above the viewport bottom');
      assert.ok(layout[key].h>=40,'Navigation retains its click target size');
    }
  }
});
