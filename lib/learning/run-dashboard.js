export function runDashboard(h,run,best,clockText) {
  const remainingMs=run.clock?.remaining()??run.remainingMs;
  return h('div',{class:'puzzle-run-stats run-dashboard'},
    h('div',{class:'run-score'},h('strong',{'data-run-score':''},run.solved),h('span',{},'Solved')),
    run.bestEligible&&h('div',{class:'run-record'},h('strong',{},best),h('span',{},'Personal best')),
    remainingMs!=null&&h('div',{class:'run-countdown',role:'timer','aria-label':'Time remaining'},
      h('strong',{id:'learn-clock',class:remainingMs<=30000?'running-low':null},clockText),h('span',{},'Remaining')));
}
