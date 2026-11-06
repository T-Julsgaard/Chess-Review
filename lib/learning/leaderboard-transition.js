// Visual bounds rather than box bounds: a title's ink and an illustration's
// rendered viewBox are what has to line up when content moves between layouts.
const inkRect=node=>{const range=node.ownerDocument.createRange();range.selectNodeContents(node);return range.getBoundingClientRect?.()||node.getBoundingClientRect();};
const artRect=node=>{const r=node.getBoundingClientRect(),box=node.viewBox?.baseVal;if(!box?.width||!box.height)return r;
  const fit=Math.min(r.width/box.width,r.height/box.height);return {left:r.left+(r.width-box.width*fit)/2,top:r.top+(r.height-box.height*fit)/2,width:box.width*fit,height:box.height*fit};};
const contentRect=(node,text)=>node&&(text?inkRect(node):artRect(node));

// The banner is one ticket's colored head, widened: the head itself plus the
// surface's own hairline rule around it. Both halves of the transition work
// from this box, and the hero's own layout is sized to match it.
export function ticketHead(ticket) {
  const head=ticket?.querySelector('.puzzle-mode-button'),edge=ticket?.querySelector('.puzzle-mode-surface');
  if(!head||!edge)return head?.getBoundingClientRect();
  const inner=head.getBoundingClientRect(),outer=edge.getBoundingClientRect();
  return {left:outer.left,right:outer.right,top:outer.top,width:outer.width,height:inner.bottom-outer.top};
}

// Measure the ticket's own title and drawing before the overview is replaced,
// so the reveal can carry them into the hero instead of dissolving them.
export function modeContentOrigin(source) {
  if(!source)return null;
  const name=source.querySelector('.puzzle-mode-name'),art=source.querySelector('.puzzle-mode-art');
  return {name:name&&inkRect(name),art:art&&artRect(art)};
}

// Keep layout fixed during the reveal. In particular, do not crop the original
// ticket footer: its Leaderboard button needs to fade, rather than disappear.
export function expandLeaderboard({hero,section,backdrop,before,bounds,mode,ticket}) {
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
  const easing='cubic-bezier(.22,1,.36,1)',shiftY=before.top-rect.top;
  // Carry the ticket's own title and drawing up into the hero. Fading them out
  // and a new pair in reads as a replacement; travelling makes the reveal feel
  // like the one button growing into the page.
  const content=[];
  for(const [node,start,text] of [
    [hero.querySelector('h3'),ticket?.name,true],
    [hero.querySelector('.puzzle-mode-art'),ticket?.art,false]
  ]) {
    if(!node||!start?.width||!start.height)continue;
    const from=node.getBoundingClientRect(),ink=contentRect(node,text);
    if(!ink.width||!ink.height)continue;
    // Scale uniformly from the ticket's size, and undo the hero's own opening
    // offset so the content starts exactly where the player clicked.
    const s=start.width/ink.width;
    const x=(start.left-from.left-(ink.left-from.left)*s)/scale;
    const y=(start.top-from.top-shiftY-(ink.top-from.top)*s)/scale;
    node.style.transformOrigin='0 0';
    content.push(node.animate([{transform:`translate(${x}px, ${y}px) scale(${s}, ${s})`},{transform:'translate(0, 0) scale(1)'}],
      {duration:480,easing,fill:'backwards'}));
  }
  // The travelling pair stands in for the ticket's own, so hide the originals
  // in the fading overview rather than leaving a duplicate behind.
  if(content.length&&mode)for(const node of backdrop.querySelectorAll(`.puzzle-mode[data-mode="${mode}"] .puzzle-mode-name,.puzzle-mode[data-mode="${mode}"] .puzzle-mode-art`))
    node.style.opacity='0';
  const animations=[
    hero.animate([
      {clipPath:`inset(0 ${right}% ${bottom}% ${left}% round 13px)`,transform:`translateY(${shiftY/scale}px)`},
      {clipPath:'inset(0 0% 0 0% round 13px)',transform:'translateY(0)'}
    ],{duration:480,easing}),
    backdrop.animate([{opacity:1},{opacity:0}],{duration:220,easing:'ease-out',fill:'forwards'}),
    // The two pages are laid out to put the banner on the ticket heads' own
    // band, so this normally has nothing to do. It absorbs what is left --
    // the pressed ticket's offset, or any later drift between the layouts --
    // which would otherwise surface a ticket head from under the banner.
    backdrop.animate([{transform:'translateY(0)'},{transform:`translateY(${-shiftY/scale}px)`}],{duration:480,easing,fill:'forwards'}),
    ...content,
    // Only the copy that has no counterpart on the ticket fades in.
    ...(content.length?[...hero.querySelectorAll('.leaderboard-eyebrow,.leaderboard-hero-copy p')]:[...hero.children])
      .map(node=>node.animate([{opacity:0},{opacity:1}],{duration:260,delay:140,easing,fill:'backwards'}))
  ];
  let cleaned=false;
  const cleanup=()=>{
    if(cleaned)return;cleaned=true;
    backdrop.remove();animations.forEach(animation=>animation.cancel());
    // The hero element is cached between visits, so leave nothing of the
    // travelling transforms behind on its title and drawing.
    for(const node of hero.querySelectorAll('h3,.puzzle-mode-art'))node.style.removeProperty('transform-origin');
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
  // Land on the ticket's colored head, not the taller ticket including its
  // record/footer, so the banner contracts back onto the band it came from.
  const hero=snapshot.querySelector('.leaderboard-hero'),to=ticketHead(target)||target.getBoundingClientRect();
  const left=Math.max(0,Math.min(100,(to.left-heroBefore.left)/heroBefore.width*100));
  const right=Math.max(0,Math.min(100,(heroBefore.right-to.right)/heroBefore.width*100));
  const bottom=Math.max(0,(heroBefore.height-to.height)/heroBefore.height*100);
  const easing='cubic-bezier(.22,1,.36,1)';
  const shiftY=to.top-heroBefore.top;
  const content=[];
  // Bring the same title and illustration home to the actual card. Dissolving
  // them at the beginning leaves an empty block and makes the ending look like
  // a replacement rather than the reverse of the opening motion.
  for(const [node,destination,text] of [
    [hero.querySelector('h3'),target.querySelector('.puzzle-mode-name'),true],
    [hero.querySelector('.puzzle-mode-art'),target.querySelector('.puzzle-mode-art'),false]
  ]) {
    if(!node||!destination)continue;
    const from=node.getBoundingClientRect(),ink=contentRect(node,text),landing=contentRect(destination,text);
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
