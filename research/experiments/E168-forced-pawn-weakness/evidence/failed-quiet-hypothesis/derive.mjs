export const eventId='forced-new-isolated-pawn-exploitation';
export const text='Forcing a weakness: every defense isolates this pawn and permits a capture leading to forced mate; the quiet alternative allows escape.';
export function derive(p,limit){
  let work=0;const tick=()=>{if(++work>limit)throw Error('forced-weakness-budget');};tick();
  let claim=p.claimContexts.length>0;const branches=p.variants.map(v=>v.replies.map(r=>{
    tick();const winningCaptures=[];for(const a of r.captures){tick();claim||=a.query.searchClaim;if(a.query.tree.win)winningCaptures.push(a.played.move);}
    const live=!Object.values(r.state.flags).some(Boolean),isolated=r.targetPresent&&r.adjacent.length===0;
    return{reply:r.played.move,pawnDefense:r.played.piece==='p',targetPresent:r.targetPresent,live,isolated,winningCaptures};
  }));
  const escapes=branches[1].filter(r=>r.live&&r.targetPresent&&!r.isolated&&!r.winningCaptures.length).map(r=>r.reply);
  const success=!claim&&branches[0].length>0&&branches[0].every(r=>r.live&&r.pawnDefense&&r.isolated&&r.winningCaptures.length)&&escapes.length>0;
  return{experiment:'E168',before:p.root.fen,after:p.variants[0].state.fen,panel:p,work,branches,claim,forced:success?{target:p.target,replies:branches[0].map(r=>r.reply),quiet:p.input.weaknessQuiet,escapes}:null};
}
