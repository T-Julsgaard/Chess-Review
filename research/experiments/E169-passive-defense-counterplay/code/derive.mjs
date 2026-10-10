export const texts={'bounded-passive-defense-refuted':'Passive defense fails here: the quiet block permits forced mate, while capturing the checker starts a verified winning counterattack.','bounded-winning-counterplay':'Counterplay: capturing the checker starts forced mate; the quiet blocking defense loses to a complete mating policy.'};
export function derive(input,p,limit){
  if(limit<3)throw Error('defense-comparison-budget');const quiet=p.variants.find(v=>v.role==='quiet'),active=p.variants.find(v=>v.role==='active'),claim=p.variants.some(v=>v.own.searchClaim||v.enemy.searchClaim||v.state.flags.fifty||v.state.flags.threefold),live=p.variants.every(v=>!Object.values(v.state.flags).some(Boolean));
  const comparison=!claim&&live&&quiet.enemy.tree.win&&!quiet.own.tree.win&&active.own.tree.win&&!active.enemy.tree.win?{quiet:quiet.move,active:active.move,quietLoss:quiet.enemy,activeWin:active.own,quietWinFailure:quiet.own,activeLossFailure:active.enemy}:null;
  const event=comparison?(input.move===quiet.move?'bounded-passive-defense-refuted':'bounded-winning-counterplay'):null;
  return{experiment:'E169',before:p.root.fen,after:p.variants.find(v=>v.move===input.move).state.fen,panel:p,work:3,claim,comparison,event};
}
