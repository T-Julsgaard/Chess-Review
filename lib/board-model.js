// The tile classifier from fenshot (see lib/fenshot/LICENSE), run without an ML
// runtime. A 32x32 grayscale tile passes through three conv/ReLU/pool stages and
// two dense layers, which is small enough for plain typed-array loops. Weights
// are one little-endian Float32 blob in the order of LAYERS.
const TILE=32, CLASSES=13, FLAT_VARIANCE=.012**2;
const LAYERS=[[32,1],[64,32],[64,64]];
export const MODEL_BYTES=LAYERS.reduce((sum,[out,input])=>sum+(out*input*9+out)*4,0)+(256*1024+256+13*256+13)*4;

export function parseModel(buffer) {
  if(buffer.byteLength!==MODEL_BYTES)throw Error('The board recognition model is damaged.');
  let offset=0;
  const take=length=>{const view=new Float32Array(buffer,offset,length);offset+=length*4;return view;};
  const conv=LAYERS.map(([out,input])=>({out,input,weight:take(out*input*9),bias:take(out)}));
  const dense=[[256,1024],[CLASSES,256]].map(([out,input])=>({out,input,weight:take(out*input),bias:take(out)}));
  return {conv,dense};
}

// Same-padded 3x3 convolution, ReLU and a 2x2 max pool, written as one pass over
// the output so the hot loop stays free of allocation.
function convolve(layer,input,size,scratch) {
  const {out,input:channels,weight,bias}=layer,pooled=size>>1,result=new Float32Array(out*pooled*pooled);
  for(let c=0;c<out;c++) {
    scratch.fill(bias[c]);
    for(let source=0;source<channels;source++) {
      const offset=source*size*size;
      for(let ky=0;ky<3;ky++)for(let kx=0;kx<3;kx++) {
        const w=weight[(c*channels+source)*9+ky*3+kx];
        for(let y=Math.max(0,1-ky);y<Math.min(size,size+1-ky);y++) {
          const from=offset+(y+ky-1)*size+kx-1,to=y*size;
          for(let x=Math.max(0,1-kx);x<Math.min(size,size+1-kx);x++)scratch[to+x]+=w*input[from+x];
        }
      }
    }
    const row=c*pooled*pooled;
    for(let y=0;y<pooled;y++)for(let x=0;x<pooled;x++) {
      const i=y*2*size+x*2;
      result[row+y*pooled+x]=Math.max(0,scratch[i],scratch[i+1],scratch[i+size],scratch[i+size+1]);
    }
  }
  return result;
}
function linear({out,input:width,weight,bias},input) {
  const result=new Float32Array(out);
  for(let i=0;i<out;i++) {
    let sum=bias[i];const row=i*width;
    for(let j=0;j<width;j++)sum+=weight[row+j]*input[j];
    result[i]=sum;
  }
  return result;
}

// A piece always adds contrast, so a flat tile is an empty square. Most of a
// board is flat, and answering those here makes a scan about three times faster.
function isFlat(tile) {
  let sum=0,squares=0;
  for(let i=0;i<tile.length;i++){sum+=tile[i];squares+=tile[i]*tile[i];}
  return squares/tile.length-(sum/tile.length)**2<FLAT_VARIANCE;
}

// tiles: Float32Array [count,1024] of 0-1 luma. Returns [count,13] probabilities.
export function classifyTiles(model,tiles) {
  const count=tiles.length/(TILE*TILE),probs=new Float32Array(count*CLASSES),scratch=new Float32Array(TILE*TILE);
  for(let tile=0;tile<count;tile++) {
    let values=tiles.subarray(tile*TILE*TILE,(tile+1)*TILE*TILE),size=TILE;
    if(isFlat(values)){probs[tile*CLASSES]=1;continue;}
    for(const layer of model.conv) {values=convolve(layer,values,size,scratch);size>>=1;}
    const hidden=linear(model.dense[0],values);
    for(let i=0;i<hidden.length;i++)if(hidden[i]<0)hidden[i]=0;
    const logits=linear(model.dense[1],hidden),top=Math.max(...logits);
    let total=0;
    for(let i=0;i<CLASSES;i++){logits[i]=Math.exp(logits[i]-top);total+=logits[i];}
    for(let i=0;i<CLASSES;i++)probs[tile*CLASSES+i]=logits[i]/total;
  }
  return probs;
}
