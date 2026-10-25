import {panelScale} from './panel-layout.js';

// The approved Full HD canvas was arranged at 87% browser zoom. Convert its
// coordinates and content scales together, preserving the rendered design at 100%.
export const FULL_HD_SCALE = .87;
export function fullHdReferenceLayout(layout, width, height, expanded = false) {
  if (width < 1800 || width > 2000 || height < 880 || height > 1100) return null;
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
  return out;
}
