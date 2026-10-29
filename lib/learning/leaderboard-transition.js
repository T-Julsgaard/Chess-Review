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

// Mirror the reveal over the real overview. The old table fades while the
// overview/settings return underneath, without resizing either layout.
export function collapseLeaderboard({snapshot,before,heroBefore,grid,target}) {
  const view=grid.ownerDocument.defaultView,host=grid.closest('.learn-puzzles'),origin=host.getBoundingClientRect();
  const bounds=grid.getBoundingClientRect(),scale=grid.offsetWidth?bounds.width/grid.offsetWidth:1;
  host.classList.add('leaderboard-return-host');
  snapshot.classList.remove('leaderboard-entering');snapshot.classList.add('leaderboard-returning');
  snapshot.inert=true;snapshot.setAttribute('aria-hidden','true');snapshot.removeAttribute('aria-labelledby');
  snapshot.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  Object.assign(snapshot.style,{left:(before.left-origin.left)/scale+'px',top:(before.top-origin.top)/scale+'px',width:before.width/scale+'px'});
  host.append(snapshot);
  const hero=snapshot.querySelector('.leaderboard-hero'),to=target.getBoundingClientRect();
  const left=Math.max(0,Math.min(100,(to.left-heroBefore.left)/heroBefore.width*100));
  const right=Math.max(0,Math.min(100,(heroBefore.right-to.right)/heroBefore.width*100));
  const easing='cubic-bezier(.22,1,.36,1)';
  // Hold the transparent final frame until cleanup removes the snapshot. Without
  // a fill, the finished animation can briefly reveal the full header again.
  const animations=[hero.animate([
    {clipPath:'inset(0 0% 0 0% round 13px)',transform:'translateY(0)',opacity:1},
    {clipPath:`inset(0 ${right}% 0 ${left}% round 13px)`,transform:`translateY(${(to.top-heroBefore.top)/scale}px)`,opacity:0}
  ],{duration:480,easing,fill:'both'}),
    ...[...hero.children].map(node=>node.animate([{opacity:1},{opacity:0}],{duration:140,easing:'ease-out',fill:'forwards'})),
    ...[...snapshot.children].filter(node=>node!==hero).map(node=>node.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'})),
    ...[grid,host.querySelector('.learn-puzzle-options')].filter(Boolean).map(node=>node.animate([{opacity:0},{opacity:1}],{duration:260,delay:140,easing,fill:'backwards'}))
  ];
  let cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;snapshot.remove();host.classList.remove('leaderboard-return-host');animations.forEach(a=>a.cancel());view.removeEventListener('resize',cleanup);};
  view.addEventListener('resize',cleanup,{once:true});
  return {finished:Promise.allSettled(animations.map(a=>a.finished)).then(cleanup),cancel:cleanup};
}
