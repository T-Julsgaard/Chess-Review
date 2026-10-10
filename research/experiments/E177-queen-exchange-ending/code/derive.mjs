export const texts={
  'prepared-certified-rook-ending':'Endgame preparation: every defense completes this queen exchange into a rook ending with a certified finite mate policy; the alternative lacks that policy.',
  'prevented-profitable-capture-counterplay':'Preventing counterplay: this queen exchange removes every immediate profitable capture policy, unlike the alternative, and forces a winning rook ending.'
};
export function derive(p,limit){
  let work=0,claim=false;const tick=()=>{if(++work>limit)throw Error('ending-preparation-budget');},live=s=>!Object.values(s.flags).some(Boolean),observe=s=>{claim||=(s.flags.fifty||s.flags.threefold)&&!s.flags.mate;};tick();observe(p.root);
  const summaries=p.variants.map(v=>{tick();observe(v.state);claim||=v.query.searchClaim;const captures=[];for(const r of v.replies){tick();observe(r.state);let minimumGain=p.root.balance-r.state.balance,success=!!r.played.captured&&live(r.state)&&r.counters.length>0&&minimumGain>0;for(const c of r.counters){tick();observe(c.state);minimumGain=Math.min(minimumGain,p.root.balance-c.state.balance);if(!live(c.state)||p.root.balance-c.state.balance<=0)success=false;}if(r.played.captured)captures.push({move:r.played.move,minimumGain,success});}return{move:v.played.move,mate:v.query.tree.win,captures};});
  const [a,b]=p.variants,rook=p.root.units.find(u=>u.color===p.actor&&u.type==='r'),endings=a.replies.map(r=>r.played.piece==='k'&&r.played.captured==='q'&&r.played.victim===a.played.to&&live(r.state)&&r.state.units.length===3&&r.state.units.some(u=>u.square===rook.square&&u.type==='r'&&u.color===p.actor)&&r.state.units.filter(u=>u.type==='k').length===2),ending=!claim&&live(a.state)&&a.replies.length>0&&endings.every(Boolean)&&summaries[0].mate&&!summaries[1].mate,prevented=ending&&!summaries[0].captures.some(c=>c.success)&&summaries[1].captures.some(c=>c.success);
  return{experiment:'E177',before:p.root.fen,after:a.state.fen,panel:p,work,claim,summaries,endings,ending,prevented};
}
