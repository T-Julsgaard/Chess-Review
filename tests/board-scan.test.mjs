import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {parseModel,classifyTiles,MODEL_BYTES} from '../lib/board-model.js';
import {scanImage,readOrientation,readLastMover} from '../lib/board-scan.js';
import {resizeCrop} from '../lib/board-image.js';
import {setupFromFen} from '../lib/position-setup.js';

const fixture=name=>new URL('./fixtures/'+name,import.meta.url);
const bytes=fs.readFileSync(new URL('../lib/board-model.bin',import.meta.url));
const model=parseModel(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));
const FEN='r1bq1rk1/pp2bppp/2n1pn2/3p4/3P1B2/2NBPN2/PP3PPP/R2Q1RK1 w - - 0 10';
const board=()=>{
  const data=zlib.gunzipSync(fs.readFileSync(fixture('board-scan.rgba.gz')));
  return {data:new Uint8ClampedArray(data.buffer,data.byteOffset,data.length),width:520,height:420};
};
// The same board seen from Black's side: squares swap places, pieces stay upright.
function fromBlack({data,width,height}) {
  const out=Uint8ClampedArray.from(data),size=48,left=60,top=24;
  for(let row=0;row<8;row++)for(let col=0;col<8;col++)for(let y=0;y<size;y++) {
    const from=((top+row*size+y)*width+left+col*size)*4,to=((top+(7-row)*size+y)*width+left+(7-col)*size)*4;
    out.set(data.subarray(from,from+size*4),to);
  }
  return {data:out,width,height};
}

test('the plain JS classifier reproduces the official ONNX runtime',()=>{
  let seed=7;const rand=()=>(seed=(seed*1664525+1013904223)>>>0)/2**32,tiles=new Float32Array(6*1024);
  for(let t=0;t<6;t++) {
    const base=rand();
    for(let y=0;y<32;y++)for(let x=0;x<32;x++) {
      const r=Math.hypot(x-16,y-16);
      tiles[t*1024+y*32+x]=t%2?rand():r<9+base*6?base*.3:.5+base*.4;
    }
  }
  const expected=JSON.parse(fs.readFileSync(fixture('board-model-reference.json'))),probs=classifyTiles(model,tiles);
  assert.equal(probs.length,expected.length);
  for(const [i,value]of expected.entries())assert.ok(Math.abs(probs[i]-value)<1e-4,`probability ${i}`);
});

test('flat tiles are empty squares without running the network, and a damaged model is refused',()=>{
  const probs=classifyTiles(model,new Float32Array(1024).fill(.6));
  assert.equal(probs[0],1);assert.equal(probs.subarray(1).reduce((a,b)=>a+b,0),0);
  assert.throws(()=>parseModel(new ArrayBuffer(MODEL_BYTES-4)),/damaged/);
});

test('a board inside a larger screenshot is found and read exactly',()=>{
  const result=scanImage(board(),model),expected=setupFromFen(FEN).board;
  assert.deepEqual(result.board,expected);assert.equal(result.flipped,false);assert.equal(result.reliable,true);
  assert.deepEqual(result.uncertain,[]);
  assert.ok(Math.abs(result.crop.x-60)<=4&&Math.abs(result.crop.y-24)<=4&&Math.abs(result.crop.size-384)<=6,JSON.stringify(result.crop));
});

test('the highlighted last move shows who moved, so the other side is to play',()=>{
  assert.equal(scanImage(board(),model).lastMover,'w');
});

test('a screenshot from Black’s side keeps every piece and marks the board flipped',()=>{
  const result=scanImage(fromBlack(board()),model);
  assert.equal(result.flipped,true);assert.deepEqual(result.board,setupFromFen(FEN).board);
});

test('a hand-picked frame skips the search',()=>{
  const result=scanImage(board(),model,{crop:{x:60,y:24,size:384}});
  assert.deepEqual(result.crop,{x:60,y:24,size:384});assert.deepEqual(result.board,setupFromFen(FEN).board);
});

test('a screenshot without a board reports nothing to read',()=>{
  const image={data:new Uint8ClampedArray(400*300*4).fill(90),width:400,height:300};
  assert.equal(scanImage(image,model),null);
});

test('orientation follows pawns, then kings, and stays put when nothing decides it',()=>{
  assert.equal(readOrientation('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'),false);
  assert.equal(readOrientation('RNBKQBNR/PPPPPPPP/8/8/8/8/pppppppp/rnbkqbnr'),true);
  assert.equal(readOrientation('8/8/4k3/8/8/4K3/8/8'),false);
  assert.equal(readOrientation('8/8/4K3/8/8/4k3/8/8'),true);
  assert.equal(readOrientation('8/8/8/8/8/8/8/8'),false);
});

test('tinted squares only name a mover when they look like one move',()=>{
  const paint=tinted=>{
    const data=new Uint8ClampedArray(160*160*4);
    for(let y=0;y<160;y++)for(let x=0;x<160;x++) {
      const col=Math.floor(x/20),row=Math.floor(y/20),color=(col+row)%2?[118,150,86]:[238,238,210],tint=tinted.some(([c,r])=>c===col&&r===row);
      data.set(tint?[color[0],color[1],40]:color,(y*160+x)*4);data[(y*160+x)*4+3]=255;
    }
    return data;
  };
  const box={x0:0,y0:0,x1:160,y1:160},piece=(col,row)=>col===3&&row===3?'p':null;
  assert.equal(readLastMover(paint([[3,3],[3,1]]),160,160,box,piece),'b');
  assert.equal(readLastMover(paint([[3,3]]),160,160,box,piece),null);
  assert.equal(readLastMover(paint([[1,1],[6,6]]),160,160,box,piece),null);
});

test('wheel resizing stays anchored inside the image',()=>{
  const crop=resizeCrop({x:100,y:100,size:200},{x:200,y:200},-100,500,400);
  assert.ok(crop.size>200&&crop.x<100&&crop.y<100);
  assert.deepEqual(resizeCrop({x:0,y:0,size:400},{x:0,y:0},-300,500,400),{size:400,x:0,y:0});
});
