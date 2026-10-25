import {PUZZLE_RUN_MODES} from './puzzle-runs.js';

const PATHS={
  trophy:'M8 3h8v5a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v6m-4 3h8m-7-3h6',
  heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
};
function icon(doc,name) {
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
  const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',PATHS[name]);svg.append(path);return svg;
}

export function runDashboard(h,run,best,clockText) {
  const config=PUZZLE_RUN_MODES[run.mode],target=run.previousBest+1;
  const record=run.bestEligible&&run.solved>run.previousBest;
  const dashboard=h('div',{class:'puzzle-run-stats run-dashboard','data-mode':run.mode,'data-record':record?'true':null});
  const doc=dashboard.ownerDocument;
  const vitality=h('div',{class:'run-vitality',role:'img','aria-label':`${run.lives} of ${config.lives} ${config.lives===1?'life':'lives'} remaining`},
    h('span',{'aria-hidden':'true'},...Array.from({length:config.lives},(_,i)=>h('i',{'data-lost':i>=run.lives?'true':null},icon(doc,'heart')))),
    h('span',{'aria-hidden':'true'},run.clock?`${run.lives} ${run.lives===1?'life':'lives'} left`:'One life'));
  dashboard.append(
    h('div',{class:'run-dashboard-top'},h('span',{class:'run-dashboard-eyebrow'},run.clock?'Make every move count':'Sudden death'),vitality),
    h('div',{class:'run-dashboard-metrics'},
      h('div',{class:'run-score'},h('span',{class:'run-metric-label'},'Solved'),h('strong',{'data-run-score':''},run.solved)),
      run.bestEligible&&h('div',{class:'run-record'},h('span',{class:'run-metric-label'},icon(doc,'trophy'),'Personal best'),h('strong',{},best)),
      run.clock?h('div',{class:'run-countdown',role:'timer','aria-label':'Time remaining'},
        h('span',{class:'run-clock-ring','aria-hidden':'true'}),
        h('strong',{id:'learn-clock'},clockText),h('span',{class:'run-metric-label'},'Remaining')):
        h('div',{class:'run-knockout-cue'},h('span',{class:'run-heart-emblem','aria-hidden':'true'},icon(doc,'heart')),h('span',{},'No second chances'))),
    h('div',{class:'run-target'},
      h('span',{class:'run-target-copy'},record?'New personal best!':!run.bestEligible?'Personal best off · Custom filters':!run.previousBest?'Set your first record':`${target-run.solved} more to a new record`),
      run.bestEligible&&run.previousBest>0&&h('span',{class:'run-target-track','aria-hidden':'true'},h('span',{style:`width:${Math.min(100,run.solved/target*100)}%`}))));
  updateRunCountdown(dashboard,run);
  return dashboard;
}

export function updateRunCountdown(root,run) {
  const dashboard=root.querySelector('.run-dashboard')||(root.matches?.('.run-dashboard')?root:null);
  if(!dashboard||!run?.clock)return;
  const remaining=run.clock.remaining(),low=remaining<=30000;
  dashboard.style.setProperty('--run-time',`${Math.max(0,Math.min(100,remaining/(run.duration*1000)*100))}%`);
  dashboard.dataset.urgency=low?'low':'normal';
  const node=dashboard.querySelector('#learn-clock');
  node?.classList.toggle('running-low',low);
  const label=dashboard.querySelector('.run-countdown .run-metric-label');
  if(label)label.textContent=low?'Last 30 seconds':'Remaining';
}
