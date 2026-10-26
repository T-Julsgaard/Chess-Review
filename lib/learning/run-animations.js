import {puzzleModeArt} from './puzzle-mode-art.js';
import {PUZZLE_RUN_MODES} from './puzzle-runs.js';

function ticketHeading(h,mode) {
  const heading=h('div',{class:'puzzle-run-ticket-heading'},
    h('span',{},PUZZLE_RUN_MODES[mode].name));
  heading.prepend(puzzleModeArt(heading.ownerDocument,mode));
  return heading;
}

function flipPanels(h,value,previous=value) {
  return h('span',{class:'puzzle-flip','aria-hidden':'true'},...['top','bottom','out','in'].map(part=>
    h('span',{class:'puzzle-flip-'+part,'data-value':part==='top'||part==='in'?value:previous})));
}

// The mode ticket becomes a small desk calendar, with the same hinged leaves
// for the countdown and the final score.
export function runStartOverlay(h,{motion=true}={}) {
  return h('div',{class:'puzzle-run-start','data-mode':'timeAttack','data-style':'flip','data-motion':motion?'on':'off','data-step':'3'},
    h('div',{class:'puzzle-run-start-card'},ticketHeading(h,'timeAttack'),
      h('span',{class:'puzzle-count-display','aria-hidden':'true'},
        h('strong',{class:'puzzle-run-start-count'},'3'),
        flipPanels(h,'3')),
      h('div',{class:'puzzle-run-ticket-footer'},
        h('span',{class:'puzzle-run-start-title'},'Get ready'),
        h('span',{class:'puzzle-run-ticket-note'},'180 seconds'))),
    h('span',{class:'sr-only',role:'status','aria-live':'assertive','aria-atomic':'true'},'Time attack. Get ready. 3'));
}

export function updateRunStartStep(overlay,label) {
  const count=overlay.querySelector('.puzzle-run-start-count'),previous=count.textContent;
  count.textContent=label;
  for(const part of overlay.querySelectorAll('.puzzle-flip > span'))
    part.dataset.value=label==='Go!'||part.matches('.puzzle-flip-top,.puzzle-flip-in')?label:previous;
  overlay.dataset.step=label;
}

export function runEndOverlay(h,{mode='timeAttack',motion=true,personalBest=false,solved=0}={}) {
  const score=Number.isFinite(solved)?Math.max(0,Math.trunc(solved)):0;
  return h('div',{class:'puzzle-run-end','data-mode':mode,'data-style':'flip','data-motion':motion?'on':'off',
    role:'status','aria-live':'polite','aria-atomic':'true'},
    h('div',{class:'puzzle-run-end-card'},ticketHeading(h,mode),
      h('div',{class:'puzzle-end-score',role:'img','aria-label':`${score} ${score===1?'puzzle':'puzzles'} solved`},flipPanels(h,String(score),'—')),
      h('div',{class:'puzzle-run-ticket-footer'},
        h('strong',{class:'puzzle-run-end-title'},'Puzzles solved'),
        personalBest&&h('span',{class:'puzzle-run-end-best'},'New personal best!'))));
}
