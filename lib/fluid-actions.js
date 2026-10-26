// A single liquid highlight flows between actions, matching the learning tabs.
export function mountFluidActions(group) {
  if(!group)return ()=>{};
  const doc=group.ownerDocument,view=doc.defaultView,indicator=group.querySelector('.fluid-indicator');
  const buttons=[...group.querySelectorAll('button')];
  let current=null,hovered=null,animation=null;
  const reducedMotion=()=>view.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const lerp=(a,b,t)=>a+(b-a)*t;
  // Sample before canceling so a quick re-entry continues from the visible shape.
  const snapshot=()=>{
    const rail=group.getBoundingClientRect(),rect=indicator.getBoundingClientRect(),style=view.getComputedStyle(indicator);
    return {x:rect.left-rail.left-group.clientLeft,y:rect.top-rail.top-group.clientTop,w:rect.width,h:rect.height,
      opacity:style.opacity===''?1:parseFloat(style.opacity),radius:parseFloat(style.borderRadius)||10};
  };
  const move=button=>{
    if(!button||button.disabled||!button.offsetWidth)return;
    const start=snapshot();
    const target={x:button.offsetLeft,y:button.offsetTop,w:button.offsetWidth,h:button.offsetHeight};
    const animate=current&&(current!==button||!hovered)&&start.w>0&&typeof indicator.animate==='function'&&!reducedMotion();
    animation?.cancel();animation=null;
    Object.assign(indicator.style,{left:target.x+'px',top:target.y+'px',width:target.w+'px',height:target.h+'px'});
    group.dataset.ready='true';current=button;hovered=button;
    for(const item of buttons)item.dataset.highlighted=String(item===button);
    if(!animate)return;
    const frames=Array.from({length:25},(_,i)=>{
      const t=i/24,lead=1-(1-t)**3,trail=t*t*(3-2*t),wave=Math.sin(Math.PI*t);
      const down=target.y>=start.y;
      const top=lerp(start.y,target.y,down?trail:lead),bottom=lerp(start.y+start.h,target.y+target.h,down?lead:trail);
      const width=lerp(start.w,target.w,trail)*(1-.06*wave);
      return {offset:t,left:(lerp(start.x+start.w/2,target.x+target.w/2,trail)-width/2)+'px',top:top+'px',
        width:width+'px',height:(bottom-top)+'px',borderRadius:(lerp(start.radius,10,trail)+14*wave)+'px',opacity:lerp(start.opacity,1,lead)};
    });
    animation=indicator.animate(frames,{duration:280,easing:'linear'});
  };
  const enter=event=>move(event.currentTarget);
  const hide=()=>{
    animation?.cancel();animation=null;hovered=null;current=null;group.dataset.ready='false';
    for(const button of buttons)button.dataset.highlighted='false';
  };
  const leave=event=>{
    if(!hovered)return;
    const button=hovered,rect=button.getBoundingClientRect(),start=snapshot();
    hovered=null;
    for(const item of buttons)item.dataset.highlighted='false';
    if(reducedMotion()||typeof indicator.animate!=='function'){hide();return;}
    // Pick the exit edge, then pull the trailing edge into a small rounded scoop.
    const nx=(event.clientX-rect.left)/rect.width,ny=(event.clientY-rect.top)/rect.height;
    const horizontal=Math.abs(nx-.5)>Math.abs(ny-.5),side=(horizontal?nx:ny)>.5?1:0;
    const endW=horizontal?0:start.w*.16,endH=horizontal?start.h*.22:0;
    const clamp=value=>Math.max(0,Math.min(1,value));
    const endX=horizontal?start.x+side*start.w:start.x+clamp(nx)*(start.w-endW);
    const endY=horizontal?start.y+clamp(ny)*(start.h-endH):start.y+side*start.h;
    animation?.cancel();
    const frames=Array.from({length:25},(_,i)=>{
      const t=i/24,pull=1-(1-t)**3,squeeze=t*t*(3-2*t);
      const w=lerp(start.w,endW,squeeze),h=lerp(start.h,endH,squeeze);
      const cx=lerp(start.x+start.w/2,endX+endW/2,pull),cy=lerp(start.y+start.h/2,endY+endH/2,pull);
      return {offset:t,left:Math.max(start.x,Math.min(start.x+start.w-w,cx-w/2))+'px',
        top:Math.max(start.y,Math.min(start.y+start.h-h,cy-h/2))+'px',width:w+'px',height:h+'px',
        borderRadius:lerp(start.radius,32,pull)+'px',opacity:start.opacity*(1-squeeze*squeeze)};
    });
    const exit=indicator.animate(frames,{duration:300,easing:'linear',fill:'forwards'});animation=exit;
    exit.onfinish=()=>{if(animation===exit)hide();};
  };
  for(const button of buttons){button.addEventListener('pointerenter',enter);button.addEventListener('pointerleave',leave);}
  group.addEventListener('pointerleave',leave);
  const resize=()=>{if(hovered&&!hovered.disabled)move(hovered);else hide();};
  const observer=view.ResizeObserver?new view.ResizeObserver(resize):null;observer?.observe(group);
  view.addEventListener('resize',resize);view.addEventListener('blur',hide);hide();
  return ()=>{observer?.disconnect();view.removeEventListener('resize',resize);group.removeEventListener('pointerleave',leave);
    view.removeEventListener('blur',hide);hide();
    for(const button of buttons){button.removeEventListener('pointerenter',enter);button.removeEventListener('pointerleave',leave);}};
}
