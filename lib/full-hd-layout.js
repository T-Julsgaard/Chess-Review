import {panelScale} from './panel-layout.js';

// The approved Full HD canvas was arranged at 87% browser zoom. Convert its
// coordinates and content scales together, preserving the rendered design at 100%.
export const FULL_HD_SCALE = .87;
export function fullHdReferenceLayout(layout, width, height, expanded = false) {
  if (width < 1100 || height < 600) return null;
  const out = Object.fromEntries(Object.entries(layout).map(([key, box]) => [key, {
    x:box.x*FULL_HD_SCALE, y:box.y*FULL_HD_SCALE,
    w:box.w*FULL_HD_SCALE, h:box.h*FULL_HD_SCALE,
    scale:panelScale(box)*FULL_HD_SCALE,
  }]));
  if (!expanded) {
    const accuracy=out.accuracy,delta=87*panelScale(accuracy);
    for(const [key,box]of Object.entries(out))if(key!=='accuracy'&&key!=='controls'
      &&box.x<accuracy.x+accuracy.w&&box.x+box.w>accuracy.x&&box.y>=accuracy.y+accuracy.h-1)box.y-=delta;
    accuracy.h-=delta;
  }
  // Keep the approved Full HD result byte-for-byte in its original window range.
  if(width>=1800&&width<=2000&&height>=880&&height<=1100)return out;
  const factor=Math.min(2,width/1920,(height-24)/(844.21+52.2));
  const top=52.2*Math.max(1,factor);
  if(factor>=1){
    const dx=(width-1920*factor)/2,dy=Math.max(0,(height-top-868.21*factor)/2);
    for(const box of Object.values(out)){
      box.x=box.x*factor+dx;box.y=box.y*factor+dy;
      box.w*=factor;box.h*=factor;box.scale*=factor;
    }
    return out;
  }
  // Laptops retain readable component sizes. Spend the smaller viewport on the
  // board and scrollable panel bodies, rather than shrinking all text to fit.
  const s=Math.max(.92,factor),gap=12*s,available=height-52.2-24;
  const sideWidth=out.review.w*s,colWidth=(sideWidth-gap)/2;
  let boardHeight=Math.min(out.board.h*s,available);
  const boardWidth=Math.min(out.board.w*s,boardHeight-100*s,width-48-sideWidth-out.evalbar.w*s-48*s);
  boardHeight=Math.min(boardHeight,boardWidth+100*s);
  const total=out.evalbar.w*s+24*s+boardWidth+24*s+sideWidth;
  const left=(width-total)/2,boardX=left+out.evalbar.w*s+24*s,sideX=boardX+boardWidth+24*s;
  const box=(key,x,y,w,h)=>{out[key]={x,y,w,h,scale:out[key].scale*s};};
  box('board',boardX,0,boardWidth,boardHeight);
  box('evalbar',left,53*s,out.evalbar.w*s,boardHeight-106*s);
  box('review',sideX,53*s,sideWidth,119.22*s);
  box('coach',sideX+sideWidth-169.86*s,0,169.86*s,173.4*s);
  const start=184.22*s,button=47.78*s,engine=130*s,graph=130*s;
  const bottom=boardHeight,buttonY=bottom-button,engineY=buttonY-gap-engine;
  const columnHeight=engineY-gap-start;
  box('moves',sideX,start,colWidth,columnHeight);
  box('accuracy',sideX+colWidth+gap,start,colWidth,columnHeight);
  box('graph',sideX,engineY,colWidth,graph);
  box('engine',sideX+colWidth+gap,engineY,colWidth,engine);
  box('controls',sideX,buttonY,colWidth,button);
  box('learn',sideX+colWidth+gap,buttonY,colWidth,button);
  return out;
}
