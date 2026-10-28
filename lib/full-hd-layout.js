import {panelScale} from './panel-layout.js';

// The approved Full HD canvas was arranged at 87% browser zoom. Convert its
// coordinates and content scales together, preserving the rendered design at 100%.
export const FULL_HD_SCALE = .87;
// The approved composition was fitted with browser chrome at a 919px viewport.
// Extra content height (for example, hiding the bookmarks bar) can enlarge it.
export const viewportGrowth = height => Math.max(1, (height - 24) / (919 - 24));
export function fullHdReferenceLayout(layout, width, height, expanded = false, modern = false) {
  if (width < 1100 || height < 480) return null;
  // Modern's stored coordinates already include the original 87% conversion.
  const units = modern ? 1 : FULL_HD_SCALE;
  const out = Object.fromEntries(Object.entries(layout).map(([key, box]) => [key, {
    x:box.x*units, y:box.y*units,
    w:box.w*units, h:box.h*units,
    scale:panelScale(box)*units,
  }]));
  if (!expanded) {
    const accuracy=out.accuracy,delta=87*panelScale(accuracy);
    for(const [key,box]of Object.entries(out))if(key!=='accuracy'&&key!=='controls'
      &&box.x<accuracy.x+accuracy.w&&box.x+box.w>accuracy.x&&box.y>=accuracy.y+accuracy.h-1)box.y-=delta;
    accuracy.h-=delta;
  }
  const right=Math.max(...Object.values(out).map(box=>box.x+box.w));
  const factor=width>=1800&&height>=900
    ?Math.min(2,width/(right+12),viewportGrowth(height))
    :Math.min(2,width/1920,(height-24)/(844.21+52.2));
  const top=52.2*Math.max(1,factor);
  if(factor>=1){
    const dx=Math.max(0,(width-1920*factor)/2),dy=Math.max(0,(height-top-868.21*factor)/2);
    for(const box of Object.values(out)){
      box.x=box.x*factor+dx;box.y=box.y*factor+dy;
      box.w*=factor;box.h*=factor;box.scale*=factor;
    }
    // Spend spare Engine height before allowing expanded Accuracy's puzzle
    // entry to clip. Apply this after scaling so it uses actual viewport bounds.
    if(expanded){
      const excess=Math.max(0,out.learn.y+out.learn.h-(height-top-20));
      const trim=Math.min(excess,Math.max(0,out.engine.h-96*panelScale(out.engine)));
      out.engine.h-=trim;out.learn.y-=trim;
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
  // Short laptop windows keep navigation in view. Compact the two lower panels
  // before sacrificing the scrollable move and accuracy bodies or text size.
  const start=184.22*s,button=47.78*s,engine=(height<600?96:130)*s,graph=engine;
  const bottom=boardHeight,buttonY=bottom-button,engineY=buttonY-gap-engine;
  const columnHeight=engineY-gap-start;
  box('moves',sideX,start,colWidth,columnHeight);
  box('accuracy',sideX+colWidth+gap,start,colWidth,columnHeight);
  box('graph',sideX,engineY,colWidth,graph);
  box('engine',sideX+colWidth+gap,engineY,colWidth,engine);
  box('controls',sideX,buttonY,colWidth,button);
  box('learn',sideX+colWidth+gap,buttonY,colWidth,button);
  if (modern) {
    // Retain Modern's graph above its move list while sharing Old's readable
    // component scales, column widths and navigation clearance on laptops.
    out.graph.y = start;
    out.moves.y = start + graph + gap;
    out.moves.h = columnHeight;
  }
  return out;
}
