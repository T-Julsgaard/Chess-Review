const live=s=>!Object.values(s.flags).some(Boolean);
export const texts={
  'recorded-objective-weak-own-minor-exchanged':"Recorded exchange: the removed own minor lacked the declared pawn-capture resource; the surviving equal-value minor retains it without nominal loss.",
  'recorded-objective-active-enemy-minor-exchanged':"Recorded exchange removed an enemy minor with a certified pawn-capture resource that its equal-value comparator lacked; general strategic quality remains unresolved."
};
export function derive(i,p,limit){
  if(limit<4)throw Error('exchange-quality-budget');
  const summaries=p.frames.map(f=>({name:f.name,policies:f.nominees.map(n=>{const successes=f.captures.filter(a=>a.played.from===n.square&&a.played.piece===n.type&&live(a.state)&&a.state.balance-f.baseline>=0&&a.counters.length>0&&a.counters.every(c=>live(c.state)&&c.state.balance-f.baseline>=0)).map(a=>({move:a.played.move,minimumGain:Math.min(a.state.balance-f.baseline,...a.counters.map(c=>c.state.balance-f.baseline))}));return{...n,passed:successes.length>0,successes};})})),claim=p.frames.some(f=>f.claims.length>0),current=p.frames[2].captures.find(a=>a.played.move===i.move),preserved=!claim&&summaries[2].policies[0].successes.some(a=>a.move===i.move),ownWeakExchanged=preserved&&!summaries[0].policies[0].passed&&summaries[0].policies[1].passed,enemyActiveExchanged=preserved&&summaries[1].policies[0].passed&&!summaries[1].policies[1].passed;
  return{experiment:'E175',before:p.certificate.recapture.after,after:current.state.fen,panel:p,work:4,claim,summaries,preserved,ownWeakExchanged,enemyActiveExchanged};
}
