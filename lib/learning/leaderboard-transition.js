// Keep layout fixed during the reveal. In particular, do not crop the original
// ticket footer: its Leaderboard button needs to fade, rather than disappear.
export function expandLeaderboard({hero,section,backdrop,before,bounds}) {
  const view=hero.ownerDocument.defaultView,rect=hero.getBoundingClientRect();
  const scale=hero.offsetWidth?rect.width/hero.offsetWidth:1,origin=section.getBoundingClientRect();
  const left=Math.max(0,Math.min(100,(before.left-rect.left)/rect.width*100));
  const right=Math.max(0,Math.min(100,(rect.right-before.right)/rect.width*100));
  backdrop.classList.add('leaderboard-backdrop');backdrop.inert=true;
  backdrop.setAttribute('aria-hidden','true');
  backdrop.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  Object.assign(backdrop.style,{left:(bounds.left-origin.left)/scale+'px',top:(bounds.top-origin.top)/scale+'px',
    width:bounds.width/scale+'px',height:bounds.height/scale+'px'});
  hero.before(backdrop);
  const easing='cubic-bezier(.22,1,.36,1)';
  const animations=[
    hero.animate([
      {clipPath:`inset(0 ${right}% 0 ${left}% round 13px)`,transform:`translateY(${(before.top-rect.top)/scale}px)`},
      {clipPath:'inset(0 0% 0 0% round 13px)',transform:'translateY(0)'}
    ],{duration:480,easing}),
    backdrop.animate([{opacity:1},{opacity:0}],{duration:220,easing:'ease-out',fill:'forwards'}),
    ...[...hero.children].map(node=>node.animate([{opacity:0},{opacity:1}],{duration:260,delay:140,easing,fill:'backwards'}))
  ];
  let cleaned=false;
  const cleanup=()=>{
    if(cleaned)return;cleaned=true;
    backdrop.remove();animations.forEach(animation=>animation.cancel());
    section.classList.remove('leaderboard-entering');view.removeEventListener('resize',cleanup);
  };
  view.addEventListener('resize',cleanup,{once:true});
  const finished=Promise.allSettled(animations.map(animation=>animation.finished)).then(cleanup);
  return {finished,cancel:cleanup};
}
