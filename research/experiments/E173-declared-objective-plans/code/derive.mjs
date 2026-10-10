export const texts={
  'declared-rook-entry-objective':"Declared objective: the original rook can reach the seventh rank within the stated bound against every defense.",
  'complete-short-objective-plan':"Short plan: this first move leaves a complete policy for the original rook's seventh-rank entry after every reply.",
  'comparative-objective-plan-formed':"Establishing the declared route: this move permits the complete short policy; the supplied quiet alternative does not."
};
export function derive(p,limit){
  const work=3;if(work>limit)throw Error('plan-budget');
  const claim=p.root.flags.fifty||p.root.flags.threefold||p.variants.some(v=>v.state.flags.fifty||v.state.flags.threefold||v.query.claim),[actual,alternative]=p.variants;
  const objective=!claim&&actual.query.tree.win,short=objective&&!actual.state.goal,formed=short&&!alternative.query.tree.win;
  return{experiment:'E173',before:p.root.fen,after:actual.state.fen,panel:p,work,claim,objective,short,formed};
}
