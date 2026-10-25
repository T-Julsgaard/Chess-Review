export const RUN_START_STYLES = [['pulse','Pulse'],['rings','Rings'],['flip','Flip'],['still','Still']];
export const RUN_END_STYLES = [['classic','Classic'],['ribbon','Ribbon'],['spotlight','Spotlight'],['flip','Flip'],['still','Still']];

function flipPanels(h,value,previous=value) {
  return h('span',{class:'puzzle-flip','aria-hidden':'true'},...['top','bottom','out','in'].map(part=>
    h('span',{class:'puzzle-flip-'+part,'data-value':part==='top'||part==='in'?value:previous})));
}

export function runAnimationStyle(settings,kind) {
  const choices=kind==='start'?RUN_START_STYLES:RUN_END_STYLES;
  const value=settings[kind==='start'?'puzzleStartAnimation':'puzzleEndAnimation'];
  return choices.some(([id])=>id===value)?value:choices[0][0];
}

// Settings previews and the live board share markup and animation styles.
export function runStartOverlay(h,{style='pulse',motion=true,preview=false}={}) {
  return h('div',{class:'puzzle-run-start','data-style':style,'data-motion':motion&&style!=='still'?'on':'off','data-step':'3',
    'aria-hidden':preview?'true':null},
    h('div',{class:'puzzle-run-start-card'},h('span',{class:'puzzle-run-start-title'},'Get ready'),
      h('span',{class:'puzzle-count-display','aria-hidden':'true'},
        h('strong',{class:'puzzle-run-start-count'},'3'),
        flipPanels(h,'3'))),
    !preview&&h('span',{class:'sr-only',role:'status','aria-live':'assertive','aria-atomic':'true'},'Time attack. Get ready. 3'));
}

export function updateRunStartStep(overlay,label) {
  const count=overlay.querySelector('.puzzle-run-start-count'),previous=count.textContent;
  count.textContent=label;
  for(const part of overlay.querySelectorAll('.puzzle-flip > span'))
    part.dataset.value=label==='Go!'||part.matches('.puzzle-flip-top,.puzzle-flip-in')?label:previous;
  overlay.dataset.step=label;
}

export function runEndOverlay(h,{style='classic',motion=true,preview=false,reason='Out of lives',personalBest=false,solved=preview?12:0}={}) {
  const complete=reason==='All puzzles completed',score=Number.isFinite(solved)?Math.max(0,Math.trunc(solved)):0;
  return h('div',{class:'puzzle-run-end','data-style':style,'data-motion':motion&&style!=='still'?'on':'off',
    role:preview?null:'status','aria-live':preview?null:'polite','aria-atomic':preview?null:'true','aria-hidden':preview?'true':null},
    h('div',{class:'puzzle-run-end-card'},
      h('span',{class:'puzzle-run-end-icon','data-complete':complete?'true':null,'aria-hidden':'true'},complete?'✓':'♔'),
      h('strong',{class:'puzzle-run-end-title'},'Puzzles solved'),
      h('strong',{class:'puzzle-end-score-static'},String(score)),
      h('div',{class:'puzzle-end-score',role:'img','aria-label':`${score} ${score===1?'puzzle':'puzzles'} solved`},flipPanels(h,String(score),'—')),
      personalBest&&h('span',{class:'puzzle-run-end-best'},'New personal best!')));
}
