export function runDashboard(h,run,best,clockText) {
  return h('div',{class:'puzzle-run-stats run-dashboard'},
    h('div',{class:'run-score'},h('strong',{'data-run-score':''},run.solved),h('span',{},'Solved')),
    run.bestEligible&&h('div',{class:'run-record'},h('strong',{},best),h('span',{},'Personal best')),
    run.clock&&h('div',{class:'run-countdown',role:'timer','aria-label':'Time remaining'},
      h('strong',{id:'learn-clock',class:run.clock.remaining()<=30000?'running-low':null},clockText),h('span',{},'Remaining')));
}
