import {expandStatistics,collapseStatistics,modeContentOrigin,ticketHead} from './mode-statistics-transition.js';
import {solveStatistics,runStatistics,formatDuration} from './statistics.js';

export const STATISTICS_MODES={
  'solve-puzzle':{name:'Solve a puzzle',tag:'NO RUSH',rule:'At your own pace'},
  timeAttack:{name:'Time attack',tag:'180 SECONDS',rule:'3 minutes · 3 lives'},
  knockout:{name:'Knockout',tag:'SUDDEN DEATH',rule:'One mistake ends the run.'}
};

const percent=rate=>rate==null?'—':Math.round(rate*100)+'%';
const number=value=>value.toLocaleString('en-US');

// Each puzzle mode's ticket opens its own statistics. The ticket's colored head
// grows into the page banner and shrinks back on return; only the content below
// the banner differs between modes. Everything is read from local progress.
export const statisticsMethods={
  stopStatistics() {
    this.statistics?.transition?.cancel();
    this.statisticsReturn?.cancel();this.statisticsReturn=null;
  },
  showStatistics(mode) {
    if(this.busy||this.run||this.activity||!STATISTICS_MODES[mode])return;
    this.stopStatistics();
    const source=this.root.querySelector(`.puzzle-mode[data-mode="${mode}"]`),grid=source?.parentElement;
    // Grow out of the ticket's colored head, which is the band the banner is
    // laid out to occupy, so the reveal only has to widen.
    const before=ticketHead(source),bounds=grid?.getBoundingClientRect();
    // Measure the ticket's title and drawing now; the render below replaces them.
    const ticket=modeContentOrigin(source);
    const backdrop=grid?.cloneNode(true);
    // Clones lose hover/pressed styles. Preserve the visible ticket positions
    // so the fading overview and the reveal share the same starting surface.
    grid?.querySelectorAll('.puzzle-mode-surface').forEach((node,index)=>{
      Object.assign(backdrop.querySelectorAll('.puzzle-mode-surface')[index].style,{
        transform:this.doc.defaultView.getComputedStyle(node).transform,transition:'none'
      });
    });
    const state=this.statistics={mode,entering:true};
    this.page='statistics';this.scrollToTop();this.render();
    const hero=this.root.querySelector('.mode-stats-hero');
    if(before?.width&&bounds?.width&&hero?.animate&&this.interfaceMotionEnabled()) {
      state.transition=expandStatistics({hero,section:hero.parentElement,backdrop,before,bounds,mode,ticket});
      state.transition.finished.finally(()=>{
        state.entering=false;
        // A render during the reveal replaces the section the transition started on.
        if(this.statistics===state)this.root.querySelector('.learn-mode-stats')?.classList.remove('mode-stats-entering');
      });
    } else {
      state.entering=false;hero?.parentElement.classList.remove('mode-stats-entering');
    }
    this.root.querySelector('#mode-stats-title')?.focus({preventScroll:true});
  },
  returnFromStatistics() {
    if(this.page!=='statistics')return;
    this.stopStatistics();
    const mode=this.statistics?.mode,section=this.root.querySelector('.learn-mode-stats');
    const before=section?.getBoundingClientRect(),heroBefore=section?.querySelector('.mode-stats-hero')?.getBoundingClientRect();
    const snapshot=section?.cloneNode(true);
    this.page='puzzles';this.statistics=null;this.scrollToTop();this.render();
    const target=this.root.querySelector(`.puzzle-mode[data-mode="${mode}"]`),grid=target?.parentElement;
    if(before?.width&&heroBefore?.width&&target?.animate&&this.interfaceMotionEnabled()) {
      const transition=this.statisticsReturn=collapseStatistics({snapshot,before,heroBefore,grid,target});
      transition.finished.finally(()=>{if(this.statisticsReturn===transition)this.statisticsReturn=null;});
    }
    this.root.querySelector(`[data-focus="statistics-${mode}"]`)?.focus({preventScroll:true});
    return this.statisticsReturn?.finished;
  },
  statisticsView() {
    const h=this.h,s=this.statistics,c=STATISTICS_MODES[s.mode];
    // The hero is cached so re-renders never interrupt its entrance animation.
    s.hero ||= h('div',{class:'mode-stats-hero'},
      h('div',{class:'mode-stats-hero-copy'},h('span',{class:'mode-stats-eyebrow'},c.tag),h('h3',{},c.name),h('p',{},c.rule)),this.statisticsArt(s.mode));
    return h('section',{class:'learn-mode-stats'+(s.entering?' mode-stats-entering':''),'data-mode':s.mode,'aria-labelledby':'mode-stats-title'},
      h('div',{class:'learn-puzzle-heading'},h('h2',{id:'mode-stats-title',tabindex:'-1','data-focus':'mode-stats-title'},'Statistics'),
        this.button('Return to puzzle overview',()=>this.returnFromStatistics(),{class:'learn-button learn-statistics-button','data-focus':'statistics-return'})),
      s.hero,
      h('div',{class:'mode-stats-body'},...(s.mode==='solve-puzzle'?this.solveStatisticsContent():this.runStatisticsContent(s.mode))));
  },
  statisticsMetric(label,value,{tone='',detail=null}={}) {
    const h=this.h;
    return h('div',{class:'learn-stat-metric'+(tone?' '+tone:'')},h('dt',{},label),
      h('dd',{},h('strong',{},value),detail&&h('span',{class:'learn-stat-detail'},detail)));
  },
  solveStatisticsContent() {
    const h=this.h,s=solveStatistics(this.store.value,this.puzzles),metric=(...args)=>this.statisticsMetric(...args);
    const rated=this.puzzleRatingEnabled();
    const row=type=>h('li',{class:'learn-stat-row','data-theme':type.theme},
      h('div',{class:'learn-stat-type'},h('span',{},type.name),
        h('span',{class:'learn-stat-detail'},`${type.clean} correct · ${type.needsWork} incorrect`)),
      h('strong',{class:'learn-stat-rate'},percent(type.rate??0)),
      h('div',{class:'learn-stat-track',role:'img','aria-label':`${type.clean} correct, ${type.needsWork} incorrect`},
        h('span',{class:'learn-stat-correct',style:`width:${type.attempts?type.rate*100:0}%`}),
        h('span',{class:'learn-stat-incorrect',style:`width:${type.attempts?(1-type.rate)*100:0}%`})));
    return [
      h('dl',{class:'learn-stat-overview'},
        // Players who turned the rating off are not shown a number they hid.
        rated&&metric('Rating',number(s.rating.elo),{tone:'rating',detail:s.rating.played?`${number(s.rating.wins)} won · ${number(s.rating.losses)} lost`:'No rated puzzles yet'}),
        rated&&metric('Peak rating',number(s.peak),{tone:'rating'}),
        metric('Correct',number(s.clean),{tone:'correct'}),
        metric('Incorrect',number(s.needsWork),{tone:'incorrect'}),
        metric('Accuracy',percent(s.rate),{detail:`${number(s.attempts)} ${s.attempts===1?'attempt':'attempts'}`}),
        metric('Time spent',formatDuration(s.timeMs),{tone:'time',detail:s.timePerAttempt?`≈ ${formatDuration(s.timePerAttempt)} per attempt`:null})),
      h('div',{class:'learn-stat-list-heading'},h('h3',{},'By puzzle type'),h('span',{},'Correct')),
      h('ul',{class:'learn-stat-types'},...s.types.map(row))];
  },
  runStatisticsContent(mode) {
    const h=this.h,s=runStatistics(this.store.value,mode),knockout=mode==='knockout',metric=(...args)=>this.statisticsMetric(...args);
    const average=s.average==null?'—':(Math.round(s.average*10)/10).toLocaleString('en-US');
    return [
      h('dl',{class:'learn-stat-overview'},
        metric(knockout?'Best streak':'Personal best',number(s.best),{tone:'correct'}),
        metric('Runs played',number(s.runs)),
        metric(knockout?'Average streak':'Average score',average,{detail:s.runs?'puzzles per run':null}),
        knockout?metric('Puzzles solved',number(s.solved),{detail:s.runs?'across all runs':null})
          :metric('Accuracy',percent(s.rate),{detail:s.attempted?`${number(s.solved)} of ${number(s.attempted)} puzzles`:null}),
        metric('Hardest solve',s.topRating?number(s.topRating):'—',{detail:s.topRating?'puzzle rating':null}),
        metric('Time spent',formatDuration(s.timeMs),{tone:'time',detail:s.timePerRun?`≈ ${formatDuration(s.timePerRun)} per run`:null})),
      ...this.recentRunsChart(s,knockout)];
  },
  recentRunsChart(s,knockout) {
    const h=this.h,unit=knockout?'in a row':'solved';
    const heading=h('div',{class:'learn-stat-list-heading'},h('h3',{},'Recent runs'),s.recent.length>1&&h('span',{},`Last ${s.recent.length}`));
    if(!s.recent.length)return [heading,h('p',{class:'learn-stat-empty'},'Finish a run to see your scores here.')];
    const max=Math.max(1,...s.recent.map(run=>run.solved));
    const when=at=>Number.isFinite(at)?new Date(at).toLocaleDateString(undefined,{day:'numeric',month:'short'}):null;
    return [heading,h('ol',{class:'learn-stat-runs','aria-label':'Recent scores, oldest first'},...s.recent.map((run,index)=>{
      const label=`Run ${index+1}: ${run.solved} ${unit}`+(when(run.at)?` · ${when(run.at)}`:'');
      return h('li',{class:'learn-stat-run'+(s.best&&run.solved===s.best?' is-best':''),title:label,'aria-label':label},
        h('span',{class:'learn-stat-run-value','aria-hidden':'true'},run.solved),
        h('span',{class:'learn-stat-run-track','aria-hidden':'true'},
          h('span',{class:'learn-stat-run-bar',style:`height:${run.solved?Math.max(4,run.solved/max*100):0}%`})));
    }))];
  }
};
