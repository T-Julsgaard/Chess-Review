// Reads a chessboard out of a screenshot. No canvas or DOM, so this runs in a
// worker and in tests. Detection and tile handling are fenshot's (lib/fenshot);
// the rescan and alignment arbitration below follow its recognizeGray().
import {findChessboardCorners,snapCorners} from './fenshot/detect.js';
import {extractTiles,rgbaToGray} from './fenshot/tiles.js';
import {probsToPlacement,flipPlacement,resolveOrientation} from './fenshot/fen.js';
import {classifyTiles} from './board-model.js';

export const CONFIDENCE_FLOOR=.7;
const MAX_PASSES=3,EMPTY='8/8/8/8/8/8/8/8',FILES='abcdefgh';

const count=(placement,piece)=>[...placement].filter(ch=>ch===piece).length;
const plausible=placement=>count(placement,'K')===1&&count(placement,'k')===1;
const toBox=crop=>({x0:crop.x,y0:crop.y,x1:crop.x+crop.size,y1:crop.y+crop.size});

function read(gray,box,model) {
  return {...probsToPlacement(classifyTiles(model,extractTiles(gray,box))),box};
}
function scanOnce(gray,model) {
  const corners=findChessboardCorners(gray);
  if(!corners)return null;
  let best=read(gray,corners,model);
  const snapped=snapCorners(gray,corners);
  if(snapped.x0!==corners.x0||snapped.y0!==corners.y0||snapped.x1!==corners.x1||snapped.y1!==corners.y1) {
    const other=read(gray,snapped,model);
    if(other.meanConfidence>best.meanConfidence)best=other;
  }
  return best;
}
// A page can hold decorative or empty boards. Blank out a board that cannot be
// the position and look again, keeping the best read in case nothing better exists.
function findBoard(gray,model) {
  let working=gray,fallback=null;
  for(let pass=0;pass<MAX_PASSES;pass++) {
    const result=scanOnce(working,model);
    if(!result)break;
    if(plausible(result.placement))return result;
    if(!fallback||fallback.placement===EMPTY&&result.placement!==EMPTY)fallback=result;
    const data=Float32Array.from(working.data),{x0,y0,x1,y1}=result.box,left=Math.max(0,Math.floor(x0)),right=Math.min(working.width,Math.ceil(x1));
    for(let y=Math.max(0,Math.floor(y0));y<Math.min(working.height,Math.ceil(y1));y++)data.fill(128,y*working.width+left,y*working.width+right);
    working={data,width:working.width,height:working.height};
  }
  return fallback;
}

// Which way up the board is. Pawns decide; without pawns on both sides, fall
// back on the kings, which usually stay on their owner's half.
export function readOrientation(placement) {
  const resolved=resolveOrientation(placement);
  if(count(placement,'P')&&count(placement,'p'))return resolved.orientation==='black';
  const rows=placement.split('/'),row=king=>rows.findIndex(rank=>rank.includes(king));
  return row('K')>=0&&row('k')>=0&&row('K')<row('k');
}

function squareColor(rgba,width,height,box,col,row) {
  const size=(box.x1-box.x0)/8,tones=[];
  for(const dx of [.08,.92])for(const dy of [.08,.92]) {
    const x=Math.min(width-1,Math.max(0,Math.round(box.x0+(col+dx)*size))),y=Math.min(height-1,Math.max(0,Math.round(box.y0+(row+dy)*size))),i=(y*width+x)*4;
    tones.push([rgba[i],rgba[i+1],rgba[i+2]]);
  }
  return [0,1,2].map(c=>tones.map(tone=>tone[c]).sort((a,b)=>a-b)[1]);
}
// Sites tint the two squares of the last move. A tinted pair where one square
// holds a piece shows who just moved, so the other side is to play.
export function readLastMover(rgba,width,height,box,pieceAt) {
  const colors=[];
  for(let row=0;row<8;row++)for(let col=0;col<8;col++)colors.push({row,col,color:squareColor(rgba,width,height,box,col,row)});
  const tinted=[];
  for(const parity of [0,1]) {
    const group=colors.filter(({row,col})=>(row+col)%2===parity);
    const base=[0,1,2].map(c=>group.map(square=>square.color[c]).sort((a,b)=>a-b)[group.length>>1]);
    tinted.push(...group.filter(({color})=>color.reduce((sum,value,c)=>sum+Math.abs(value-base[c]),0)>36));
  }
  if(tinted.length!==2)return null;
  const pieces=tinted.map(({row,col})=>pieceAt(col,row)).filter(Boolean);
  if(pieces.length!==1)return null;
  return pieces[0]===pieces[0].toUpperCase()?'w':'b';
}

// image: {data,width,height}; crop: an exact {x,y,size} instead of searching.
export function scanImage(image,model,{crop=null}={}) {
  const gray=rgbaToGray(image.data,image.width,image.height);
  const found=crop?read(gray,toBox(crop),model):findBoard(gray,model);
  if(!found)return null;
  const flipped=readOrientation(found.placement),placement=flipped?flipPlacement(found.placement):found.placement;
  const board={},uncertain=[],grid=placement.split('/').map(rank=>rank.replace(/\d/g,n=>'.'.repeat(n)));
  for(let rank=0;rank<8;rank++)for(let file=0;file<8;file++) {
    const square=FILES[file]+(rank+1),piece=grid[7-rank][file];
    if(piece!=='.')board[square]=piece;
    // Confidences stay in the screen's reading order, bottom-left first.
    if(found.confidences[flipped?(7-rank)*8+7-file:rank*8+file]<CONFIDENCE_FLOOR)uncertain.push(square);
  }
  const {x0,y0,x1,y1}=found.box;
  const mover=readLastMover(image.data,image.width,image.height,found.box,(col,row)=>grid[flipped?7-row:row][flipped?7-col:col]==='.'?null:grid[flipped?7-row:row][flipped?7-col:col]);
  return {board,uncertain,flipped,lastMover:mover,crop:{x:Math.round(x0),y:Math.round(y0),size:Math.round(Math.max(x1-x0,y1-y0))},confidence:found.meanConfidence,reliable:found.minConfidence>=CONFIDENCE_FLOOR};
}
