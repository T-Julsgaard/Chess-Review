function flipPanels(h,value,previous=value) {
  return h('span',{class:'puzzle-flip','aria-hidden':'true'},...['top','bottom','out','in'].map(part=>
    h('span',{class:'puzzle-flip-'+part,'data-value':part==='top'||part==='in'?value:previous})));
}

// Countdown and results share the same split-flap counter.
export function runStartOverlay(h,{motion=true}={}) {
  return h('div',{class:'puzzle-run-start','data-style':'flip','data-motion':motion?'on':'off','data-step':'3'},
    h('div',{class:'puzzle-run-start-card'},h('span',{class:'puzzle-run-start-title'},'Get ready'),
      h('span',{class:'puzzle-count-display','aria-hidden':'true'},
        h('strong',{class:'puzzle-run-start-count'},'3'),
        flipPanels(h,'3'))),
    h('span',{class:'sr-only',role:'status','aria-live':'assertive','aria-atomic':'true'},'Time attack. Get ready. 3'));
}

export function updateRunStartStep(overlay,label) {
  const count=overlay.querySelector('.puzzle-run-start-count'),previous=count.textContent;
  count.textContent=label;
  for(const part of overlay.querySelectorAll('.puzzle-flip > span'))
    part.dataset.value=label==='Go!'||part.matches('.puzzle-flip-top,.puzzle-flip-in')?label:previous;
  overlay.dataset.step=label;
}

export function runEndOverlay(h,{motion=true,personalBest=false,solved=0}={}) {
  const score=Number.isFinite(solved)?Math.max(0,Math.trunc(solved)):0;
  return h('div',{class:'puzzle-run-end','data-style':'flip','data-motion':motion?'on':'off',
    role:'status','aria-live':'polite','aria-atomic':'true'},
    h('div',{class:'puzzle-run-end-card'},
      h('strong',{class:'puzzle-run-end-title'},'Puzzles solved'),
      h('div',{class:'puzzle-end-score',role:'img','aria-label':`${score} ${score===1?'puzzle':'puzzles'} solved`},flipPanels(h,String(score),'—')),
      personalBest&&h('span',{class:'puzzle-run-end-best'},'New personal best!')));
}
