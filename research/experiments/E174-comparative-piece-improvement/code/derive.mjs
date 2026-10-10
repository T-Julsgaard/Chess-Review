const live=s=>Object.values(s.flags).every(v=>v===false);
export const texts={
  'comparative-piece-objective-improvement':"Piece improvement for the declared capture objective: this relocation covers every defense with material gain; the quiet alternative does not.",
  'new-outpost-with-objective-benefit':"New supported outpost: this knight entry also establishes the complete profitable capture policy; future exchanges and lasting strategic value remain unresolved."
};
export function derive(i,p,limit){
  if(limit<3)throw Error('improvement-budget');
  const summaries=p.variants.map(v=>{const branches=v.branches.map(b=>{const successes=b.attempts.filter(a=>a.from===v.to&&a.piece===v.piece&&live(a.state)&&a.state.balance-p.baseline>=1&&a.counters.length>0&&a.counters.every(c=>live(c.state)&&c.state.balance-p.baseline>=1)).map(a=>({move:a.move,minimumGain:Math.min(a.state.balance-p.baseline,...a.counters.map(c=>c.state.balance-p.baseline))}));return{reply:b.move,live:live(b.state),successes};});return{move:v.move,passed:live(v.state)&&branches.length>0&&branches.every(b=>b.live&&b.successes.length>0),branches,refutations:branches.filter(b=>!b.live||!b.successes.length).map(b=>b.reply)};});
  const actual=p.variants[0],claim=p.claimContexts.length>0,improved=!claim&&summaries[0].passed&&!summaries[1].passed,originRank=p.actor==='w'?+actual.from[1]:9-+actual.from[1],outpost=improved&&actual.piece==='n'&&originRank<4&&p.outpost.status==='proven';
  return{experiment:'E174',before:p.before,after:actual.state.fen,panel:p,work:3,claim,summaries,improved,outpost};
}
