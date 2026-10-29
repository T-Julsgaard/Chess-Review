// Keep layout fixed during the reveal. In particular, do not crop the original
// ticket footer: its Leaderboard button needs to fade, rather than disappear.
export function expandLeaderboard({hero,section,backdrop,before,bounds}) {
  const view=hero.ownerDocument.defaultView,rect=hero.getBoundingClientRect();
  const scale=hero.offsetWidth?rect.width/hero.offsetWidth:1,origin=section.getBoundingClientRect();
  const left=Math.max(0,Math.min(100,(before.left-rect.left)/rect.width*100));
  const right=Math.max(0,Math.min(100,(rect.right-before.right)/rect.width*100));
  const bottom=Math.max(0,(rect.height-before.height)/rect.height*100);
  backdrop.classList.add('leaderboard-backdrop');backdrop.inert=true;
  backdrop.setAttribute('aria-hidden','true');
  backdrop.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  Object.assign(backdrop.style,{left:(bounds.left-origin.left)/scale+'px',top:(bounds.top-origin.top)/scale+'px',
    width:bounds.width/scale+'px',height:bounds.height/scale+'px'});
  hero.before(backdrop);
  const easing='cubic-bezier(.22,1,.36,1)';
  const animations=[
    hero.animate([
      {clipPath:`inset(0 ${right}% ${bottom}% ${left}% round 13px)`,transform:`translateY(${(before.top-rect.top)/scale}px)`},
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
  // Land on the colored button, rather than the taller ticket including its
  // record/footer. That keeps the final surface aligned with the real card.
  const hero=snapshot.querySelector('.leaderboard-hero'),button=target.querySelector('.puzzle-mode-button')||target,to=button.getBoundingClientRect();
  const left=Math.max(0,Math.min(100,(to.left-heroBefore.left)/heroBefore.width*100));
  const right=Math.max(0,Math.min(100,(heroBefore.right-to.right)/heroBefore.width*100));
  const bottom=Math.max(0,(heroBefore.height-to.height)/heroBefore.height*100);
  const easing='cubic-bezier(.22,1,.36,1)';
  const shiftY=to.top-heroBefore.top;
  const inkRect=node=>{const range=node.ownerDocument.createRange();range.selectNodeContents(node);return range.getBoundingClientRect?.()||node.getBoundingClientRect();};
  const artRect=node=>{const r=node.getBoundingClientRect(),box=node.viewBox?.baseVal;if(!box?.width||!box.height)return r;
    const fit=Math.min(r.width/box.width,r.height/box.height);return {left:r.left+(r.width-box.width*fit)/2,top:r.top+(r.height-box.height*fit)/2,width:box.width*fit,height:box.height*fit};};
  const content=[];
  // Bring the same title and illustration home to the actual card. Dissolving
  // them at the beginning leaves an empty block and makes the ending look like
  // a replacement rather than the reverse of the opening motion.
  for(const [node,destination,text] of [
    [hero.querySelector('h3'),target.querySelector('.puzzle-mode-name'),true],
    [hero.querySelector('.puzzle-mode-art'),target.querySelector('.puzzle-mode-art'),false]
  ]) {
    if(!node||!destination)continue;
    const from=node.getBoundingClientRect(),ink=text?inkRect(node):artRect(node),landing=text?inkRect(destination):artRect(destination);
    if(!ink.width||!ink.height||!landing.width||!landing.height)continue;
    // Use the rendered viewBox for SVGs so different viewport proportions do
    // not squash the illustration on its way back into the ticket.
    const sx=landing.width/ink.width,sy=sx;
    const x=(landing.left-from.left-(ink.left-from.left)*sx)/scale;
    const y=(landing.top-from.top-shiftY-(ink.top-from.top)*sy)/scale;
    node.style.transformOrigin='0 0';
    content.push(node.animate([{transform:'translate(0, 0) scale(1)'},{transform:`translate(${x}px, ${y}px) scale(${sx}, ${sy})`}],{duration:480,easing,fill:'both'}));
  }
  // Contract an opaque surface first. Crossfade only at the landing so this
  // remains a visible return motion rather than an early dissolve to overview.
  const animations=[hero.animate([
    {clipPath:'inset(0 0% 0 0% round 13px)',transform:'translateY(0)'},
    {clipPath:`inset(0 ${right}% ${bottom}% ${left}% round 13px)`,transform:`translateY(${(to.top-heroBefore.top)/scale}px)`}
  ],{duration:480,easing,fill:'both'}),
    // Keep the final opacity after completion until the snapshot is removed.
    snapshot.animate([{opacity:1,offset:0},{opacity:1,offset:.72},{opacity:0,offset:1}],{duration:480,easing:'linear',fill:'both'}),
    ...content,
    ...[...hero.querySelectorAll('.leaderboard-eyebrow,.leaderboard-hero-copy p')].map(node=>node.animate([{opacity:1},{opacity:0}],{duration:140,easing:'ease-out',fill:'forwards'})),
    ...[...snapshot.children].filter(node=>node!==hero).map(node=>node.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'})),
    ...[grid,host.querySelector('.learn-puzzle-options')].filter(Boolean).map(node=>node.animate([{opacity:0},{opacity:1}],{duration:260,delay:220,easing,fill:'both'}))
  ];
  let cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;snapshot.remove();host.classList.remove('leaderboard-return-host');animations.forEach(a=>a.cancel());view.removeEventListener('resize',cleanup);};
  view.addEventListener('resize',cleanup,{once:true});
  return {finished:Promise.allSettled(animations.map(a=>a.finished)).then(cleanup),cancel:cleanup};
}
