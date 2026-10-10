export const eventId='quiet-capture-deterring-counterthreat',text='Counterthreat: every capture of this piece now permits forced mate; the quiet alternative leaves a profitable capture and other replies can defend.';
export function derive(input,p,limit){
  let work=0;const tick=()=>{if(++work>limit)throw Error('counterthreat-budget');},live=s=>!Object.values(s.flags).some(Boolean);tick();let claim=p.root.flags.fifty||p.root.flags.threefold;
  const branches=p.variants.map(v=>{claim||=v.state.flags.fifty||v.state.flags.threefold;return v.replies.map(r=>{tick();claim||=r.query.searchClaim||r.state.flags.fifty||r.state.flags.threefold;let profitable=live(r.state)&&r.counters.length>0&&p.root.balance-r.state.balance>=1,minGain=p.root.balance-r.state.balance;
    for(const counter of r.counters){tick();claim||=counter.state.flags.fifty||counter.state.flags.threefold;const gain=p.root.balance-counter.state.balance;minGain=Math.min(minGain,gain);profitable&&=live(counter.state)&&gain>=1;}
    return{reply:r.played.move,from:r.played.from,capture:r.played.victim===p.victim.square,live:live(r.state),mate:r.query.tree.win,profitable,minimumGain:minGain};
  });});
  const ai=p.variants.findIndex(v=>v.played.move===input.move),actual=branches[ai],alternative=branches[1-ai],captures=actual.filter(r=>r.capture),otherCaptures=alternative.filter(r=>r.capture),matched=captures.map(r=>r.reply),certified=otherCaptures.filter(r=>r.profitable&&!r.mate&&p.rootAttackers.some(a=>a.square===r.from)).map(r=>r.reply),escapes=actual.filter(r=>!r.capture&&r.live&&!r.mate).map(r=>r.reply),same=JSON.stringify(matched)===JSON.stringify(otherCaptures.map(r=>r.reply));
  const deterrent=!claim&&same&&captures.length>0&&captures.every(r=>r.live&&r.mate)&&certified.length>0&&escapes.length>0?{victim:p.victim.square,captures:matched,certifiedAlternative:certified,alternative:input.counterthreatAlternative,escapes}:null;
  return{experiment:'E170',before:p.root.fen,after:p.variants[ai].state.fen,panel:p,work,claim,branches,deterrent};
}
