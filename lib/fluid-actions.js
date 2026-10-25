// A single liquid highlight flows between actions, matching the learning tabs.
export function mountFluidActions(group) {
  if(!group)return ()=>{};
  const doc=group.ownerDocument,view=doc.defaultView,indicator=group.querySelector('.fluid-indicator');
  const buttons=[...group.querySelectorAll('button')];
  let current=null,hovered=null,animation=null;
  const move=button=>{
    if(!button||button.disabled||!button.offsetWidth)return;
    const rail=group.getBoundingClientRect(),rect=indicator.getBoundingClientRect();
    const start={x:rect.left-rail.left-group.clientLeft,y:rect.top-rail.top-group.clientTop,w:rect.width,h:rect.height};
    const target={x:button.offsetLeft,y:button.offsetTop,w:button.offsetWidth,h:button.offsetHeight};
    const animate=current&&current!==button&&start.w>0&&typeof indicator.animate==='function'&&!view.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    animation?.cancel();animation=null;
    Object.assign(indicator.style,{left:target.x+'px',top:target.y+'px',width:target.w+'px',height:target.h+'px'});
    group.dataset.ready='true';current=button;hovered=button;
    for(const item of buttons)item.dataset.highlighted=String(item===button);
    if(!animate)return;
    const lerp=(a,b,t)=>a+(b-a)*t;
    const frames=Array.from({length:25},(_,i)=>{
      const t=i/24,lead=1-(1-t)**3,trail=t*t*(3-2*t),wave=Math.sin(Math.PI*t);
      const down=target.y>=start.y;
      const top=lerp(start.y,target.y,down?trail:lead),bottom=lerp(start.y+start.h,target.y+target.h,down?lead:trail);
      const width=lerp(start.w,target.w,trail)*(1-.06*wave);
      return {offset:t,left:(lerp(start.x+start.w/2,target.x+target.w/2,trail)-width/2)+'px',top:top+'px',
        width:width+'px',height:(bottom-top)+'px',borderRadius:(10+14*wave)+'px'};
    });
    animation=indicator.animate(frames,{duration:280,easing:'linear'});
  };
  const enter=event=>move(event.currentTarget);
  const hide=()=>{
    animation?.cancel();animation=null;hovered=null;group.dataset.ready='false';
    for(const button of buttons)button.dataset.highlighted='false';
  };
  const reset=()=>{hide();current=null;};
  for(const button of buttons){button.addEventListener('pointerenter',enter);button.addEventListener('pointerleave',hide);}
  group.addEventListener('pointerleave',reset);
  const resize=()=>{if(hovered&&!hovered.disabled)move(hovered);else hide();};
  const observer=view.ResizeObserver?new view.ResizeObserver(resize):null;observer?.observe(group);
  view.addEventListener('resize',resize);view.addEventListener('blur',reset);reset();
  return ()=>{animation?.cancel();observer?.disconnect();view.removeEventListener('resize',resize);group.removeEventListener('pointerleave',reset);
    view.removeEventListener('blur',reset);reset();
    for(const button of buttons){button.removeEventListener('pointerenter',enter);button.removeEventListener('pointerleave',hide);}};
}
