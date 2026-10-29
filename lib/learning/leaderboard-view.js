import {expandLeaderboard,collapseLeaderboard} from './leaderboard-transition.js';
import {LEADERBOARD_NAME_MAX} from './leaderboard-name.js';
import {flagCodeForCountryId,countryNameForId} from '../../flags.js';
import {syncLeaderboardCountry} from './leaderboard-country.js';

export const LEADERBOARD_MODES={
  'solve-puzzle':{name:'Solve a puzzle',tag:'ALL TIME',rule:'Each puzzle counts once.'},
  timeAttack:{name:'Time attack',tag:'180 SECONDS',rule:'3 minutes · 3 lives'},
  knockout:{name:'Knockout',tag:'SUDDEN DEATH',rule:'One mistake ends the run.'}
};

// Kept separate from the board/input machinery; all remote text uses text nodes.
export const leaderboardMethods={
  async updateLeaderboardPersonal() {
    const state=this.leaderboard;
    if(this.closed||this.closing||this.page!=='leaderboard'||!state||this.leaderboardClient.preview)return;
    try {await state.intro;
      if(this.page!=='leaderboard'||this.leaderboard!==state)return;
      const personal=await this.leaderboardClient.personal?.(state.mode);
      if(this.page==='leaderboard'&&this.leaderboard===state&&!state.entering&&JSON.stringify(state.personal)!==JSON.stringify(personal)){state.personal=personal;this.render();}
    }catch{/* A local score read must not interrupt the board. */}
  },
  stopLeaderboard({cancelTransition=false}={}) {
    this.hideLeaderboardCountry?.();
    if(cancelTransition){this.leaderboard?.transition?.cancel();this.leaderboardReturn?.cancel();this.leaderboardReturn=null;}
    this.leaderboardRequest?.abort();this.leaderboardRequest=null;
    clearTimeout(this.leaderboardTimer);this.leaderboardTimer=null;
  },
  async showLeaderboard(mode) {
    if(this.busy||this.run||this.activity||!LEADERBOARD_MODES[mode])return;
    this.stopLeaderboard({cancelTransition:true});
    const source=this.root.querySelector(`.puzzle-mode[data-mode="${mode}"]`),grid=source?.parentElement;
    const before=source?.querySelector('.puzzle-mode-button')?.getBoundingClientRect(),bounds=grid?.getBoundingClientRect();
    const backdrop=grid?.cloneNode(true);
    // Clones lose hover/pressed styles. Preserve the visible ticket positions
    // so the fading overview and the reveal share the same starting surface.
    grid?.querySelectorAll('.puzzle-mode-surface').forEach((node,index)=>{
      Object.assign(backdrop.querySelectorAll('.puzzle-mode-surface')[index].style,{
        transform:this.doc.defaultView.getComputedStyle(node).transform,transition:'none'
      });
    });
    this.leaderboard={mode,page:1,rows:[],hasNext:false,loading:this.leaderboardClient.configured,entering:true};
    this.page='leaderboard';this.scrollToTop();this.render();
    const hero=this.root.querySelector('.leaderboard-hero');
    if(before?.width&&bounds?.width&&hero?.animate&&this.puzzleMotionEnabled()) {
      const state=this.leaderboard;
      state.transition=expandLeaderboard({hero,section:hero.parentElement,backdrop,before,bounds});
      state.intro=state.transition.finished.finally(()=>{state.entering=false;});
    } else {
      this.leaderboard.entering=false;hero.parentElement.classList.remove('leaderboard-entering');
    }
    this.root.querySelector('#leaderboard-title')?.focus({preventScroll:true});
    const state=this.leaderboard;
    try {
      const player=await this.leaderboardClient.credentials();
      if(this.page==='leaderboard'&&this.leaderboard===state){
        state.player=player;
        state.personal=await this.leaderboardClient.personal?.(mode);
        // Read local progress first. Neither an offline upload nor a profile
        // request should hide the player's own score behind a network timeout.
        Promise.resolve(state.intro).then(()=>{if(this.page==='leaderboard'&&this.leaderboard===state)this.render();}).catch(()=>{});
        this.leaderboardClient.practice?.flush().then(()=>this.updateLeaderboardPersonal()).catch(()=>{});
        try {await syncLeaderboardCountry(this.leaderboardClient,player);}catch { /* A profile outage must not hide public rankings. */ }
      }
    }
    catch {if(this.page==='leaderboard'&&this.leaderboard===state)state.error='Player key could not be loaded.';}
    if(this.page==='leaderboard'&&this.leaderboard===state){
      if(this.leaderboardClient.configured)await this.loadLeaderboard(1,{quiet:true});
      else {await state.intro;if(this.page==='leaderboard'&&this.leaderboard===state)this.render();}
    }
  },
  returnFromLeaderboard() {
    if(this.page!=='leaderboard')return;
    this.stopLeaderboard({cancelTransition:true});
    const mode=this.leaderboard?.mode,section=this.root.querySelector('.learn-leaderboard');
    const before=section?.getBoundingClientRect(),heroBefore=section?.querySelector('.leaderboard-hero')?.getBoundingClientRect();
    const snapshot=section?.cloneNode(true);
    this.page='puzzles';this.scrollToTop();this.render();
    const target=this.root.querySelector(`.puzzle-mode[data-mode="${mode}"]`),grid=target?.parentElement;
    if(before?.width&&heroBefore?.width&&target?.animate&&this.puzzleMotionEnabled()) {
      const transition=this.leaderboardReturn=collapseLeaderboard({snapshot,before,heroBefore,grid,target});
      transition.finished.finally(()=>{if(this.leaderboardReturn===transition)this.leaderboardReturn=null;});
    }
    this.root.querySelector(`[data-focus="leaderboard-${mode}"]`)?.focus({preventScroll:true});
    return this.leaderboardReturn?.finished;
  },
  async loadLeaderboard(page=this.leaderboard?.page,{quiet=false,fresh=false}={}) {
    if(this.page!=='leaderboard'||!this.leaderboardClient.configured)return;
    this.stopLeaderboard();const state=this.leaderboard,request=new AbortController();this.leaderboardRequest=request;
    if(!quiet){state.loading=true;state.error=null;this.render();}
    try {
      const data=await this.leaderboardClient.list(state.mode,page,request.signal,{fresh});
      if(request.signal.aborted||state!==this.leaderboard||this.page!=='leaderboard')return;
      if(!Array.isArray(data.rows)||data.rows.length>10||data.rows.some(r=>typeof r.name!=='string'||!r.name.length||r.name.length>LEADERBOARD_NAME_MAX||!Number.isSafeInteger(r.score)||r.score<0))throw Error('Leaderboard unavailable.');
      // A last page can disappear when players delete their records.
      if(page>1&&!data.rows.length)return this.loadLeaderboard(page-1);
      Object.assign(state,{rows:data.rows,page,hasNext:!!data.hasNext,loading:false,error:data.stale?'Showing saved rankings. '+data.message:null,updated:Date.now()});
      await state.intro;
      if(request.signal.aborted||state!==this.leaderboard||this.page!=='leaderboard')return;
      this.render();
    } catch(error) {
      if(request.signal.aborted||state!==this.leaderboard||this.page!=='leaderboard')return;
      state.loading=false;state.error=error.message;await state.intro;
      if(request.signal.aborted||state!==this.leaderboard||this.page!=='leaderboard')return;
      this.render();
    }
  },
  async connectLeaderboard(input) {
    if(this.leaderboardClient.preview)return this.previewLeaderboardAction('connect');
    const state=this.leaderboard;state.error=null;state.connecting=true;this.render();
    try {
      await this.leaderboardClient.connect(input.trim());state.keyDraft='';state.player=await this.leaderboardClient.credentials();
      state.personal=await this.leaderboardClient.personal?.(state.mode);
      try {await syncLeaderboardCountry(this.leaderboardClient,state.player);}catch { /* Retry when rankings are opened again. */ }
    }
    catch(error){state.error=error.message;}
    finally {state.connecting=false;if(this.page==='leaderboard'&&state===this.leaderboard)this.render();}
  },
  async startRanked(mode) {
    if(this.leaderboardClient.preview)return this.previewLeaderboardAction('play');
    if(this.busy||this.run||this.closed||this.closing||this.startingRanked)return;
    this.startingRanked=true;const generation=this.generation,state=this.leaderboard;this.render();
    try {
      const session=await this.leaderboardClient.start(mode);
      if(this.closed||this.closing||generation!==this.generation||this.page!=='leaderboard'||state!==this.leaderboard)return;
      if(!this.puzzleById(session.puzzleId))throw Error('Update the extension to play ranked puzzles.');
      this.stopLeaderboard({cancelTransition:true});this.ranked={...session,mode};this.rankedNotice=null;
      this.page='puzzles';this.leaderboardLaunch=true;
      if(mode==='solve-puzzle')await this.startPuzzleSelection([this.puzzleById(session.puzzleId)]);
      else await this.startPuzzleRun(mode);
    } catch(error) {
      this.ranked=null;if(this.leaderboard)this.leaderboard.error=error.message;this.render();
    } finally {this.startingRanked=false;this.leaderboardLaunch=false;if(this.page==='leaderboard')this.render();}
  },
  async recordRankedAttempt(completed,skipped,activity) {
    const ranked=this.ranked;if(!ranked)return;
    if(skipped||activity.assisted||activity.mistakes&&!this.run?.mode){
      if(ranked.practice)await this.leaderboardClient.practice.flush({end:true});
      this.ranked=null;this.rankedNotice='Ranked session ended. Assistance and retries do not count.';return;}
    try {
      const moves=this.puzzleMoves.filter((_,i)=>i%2===0);if(!completed&&this.rankedWrongMove)moves.push(this.rankedWrongMove);
      const result=ranked.practice?await this.leaderboardClient.practice.record(activity.id,moves):await this.leaderboardClient.attempt(ranked,moves);
      if(this.ranked!==ranked)return;
      Object.assign(ranked,result);ranked.nextPuzzle=result.puzzleId;
      this.rankedNotice=result.ended?'Ranked score saved.':'Ranked · '+result.score+' solved'+(result.syncing?' · Syncing…':'');
    } catch {
      if(this.ranked===ranked){this.ranked=null;this.rankedNotice='Connection lost. Ranked play stopped; earlier verified scores are saved.';}
    }
  },
  previewLeaderboardAction(action) {
    if(this.page!=='leaderboard'||!this.leaderboardClient.preview)return;
    this.leaderboardClient.previewAction(action,this.leaderboard.mode);
    return this.loadLeaderboard(this.leaderboard.page);
  },
  refreshLeaderboard() {
    return this.leaderboardClient.preview?this.previewLeaderboardAction('refresh'):this.loadLeaderboard(this.leaderboard.page,{fresh:true});
  },
  leaderboardView() {
    this.hideLeaderboardCountry?.();
    const h=this.h,state=this.leaderboard,debug=this.leaderboardClient.previewState?.(state.mode),preview=this.leaderboardClient.preview;
    const s=debug?{...state,loading:state.loading||debug.loading,personal:debug.personal,player:debug.player,connecting:debug.connecting,confirmDelete:debug.confirmDelete}:state;
    const c=LEADERBOARD_MODES[s.mode],configured=this.leaderboardClient.configured&&debug?.configured!==false;
    const action=(label,fn,attrs={})=>this.button(label,fn,{class:'learn-button',...attrs});
    const isYou=r=>preview?r.isYou:r.id===s.player?.id;
    const row=(r,index)=>h('tr',{class:isYou(r)?'is-you':''},
      h('td',{class:'leaderboard-rank'},h('span',{'data-rank':(s.page-1)*10+index+1},(s.page-1)*10+index+1)),
      h('th',{scope:'row'},this.leaderboardAvatar(r),h('span',{},r.name),isYou(r)&&h('span',{class:'leaderboard-you'},'You')),
      h('td',{class:'leaderboard-score'},r.score.toLocaleString()));
    const key=h('input',{type:'password',autocomplete:'off',spellcheck:'false',maxlength:64,placeholder:'Player key','aria-label':'Player key','data-focus':'leaderboard-key',oninput:e=>{state.keyDraft=e.target.value;}});key.value=s.keyDraft||'';
    const form=h('form',{class:'leaderboard-connect',onsubmit:e=>{e.preventDefault();this.connectLeaderboard(key.value);}},
      h('p',{},'Only ranked play counts. Verify once to get a private player key.'),
      preview?action('Get player key ↗',()=>this.previewLeaderboardAction('get-key')):h('a',{href:this.leaderboardClient.endpoint+'/join',target:'_blank',rel:'noopener noreferrer',class:'learn-button'},'Get player key ↗'),key,
      h('button',{type:'submit',class:'learn-button',disabled:s.connecting},s.connecting?'Connecting…':'Connect'));
    state.hero ||= h('div',{class:'leaderboard-hero'},
      h('div',{class:'leaderboard-hero-copy'},h('span',{class:'leaderboard-eyebrow'},c.tag),h('h3',{},c.name),h('p',{},c.rule)),this.leaderboardArt(s.mode));
    return h('section',{class:'learn-leaderboard'+(s.entering?' leaderboard-entering':''),'data-mode':s.mode,'data-preview-state':debug?.scenario,'aria-labelledby':'leaderboard-title'},
      h('div',{class:'learn-puzzle-heading'},h('h2',{id:'leaderboard-title',tabindex:'-1','data-focus':'leaderboard-title'},'Leaderboard'),
        action('Return to puzzle overview',()=>this.returnFromLeaderboard(),{'data-focus':'leaderboard-return',class:'learn-button learn-statistics-button'})),
      state.hero,
      h('div',{class:'leaderboard-toolbar'},
        configured&&preview&&h('span',{class:'leaderboard-live'},'Test data'),
        configured&&(!preview||debug)&&action(s.loading?'Updating…':'↻ Refresh',()=>this.refreshLeaderboard(),{disabled:s.loading,'data-focus':'leaderboard-refresh',class:'learn-button leaderboard-refresh'})),
      debug?.notice&&h('p',{class:'leaderboard-preview-notice',role:'status'},debug.notice),
      (!preview||debug?.personal)&&s.personal&&h('div',{class:'leaderboard-personal',role:'status'},h('span',{},s.mode==='solve-puzzle'?'Your total':'Your best'),
        h('strong',{},s.personal.score.toLocaleString()),h('span',{class:'leaderboard-live'},s.personal.syncing?(s.personal.blocked?'Sync needs attention':'Syncing…'):'Saved'),
        s.personal.blocked&&action('Discard unsynced scores',async()=>{if(preview)return this.previewLeaderboardAction('discard');await this.leaderboardClient.practice.discard();await this.updateLeaderboardPersonal();})),
      s.error&&h('div',{class:'leaderboard-error',role:'alert'},s.error,action('Retry',()=>this.refreshLeaderboard(),{'data-focus':'leaderboard-retry'})),
      h('div',{class:'leaderboard-table-wrap','aria-busy':String(!!s.loading)},
        h('table',{class:'leaderboard-table'},h('caption',{class:'sr-only'},c.name+' leaderboard'),
          h('thead',{},h('tr',{},h('th',{scope:'col'},'Rank'),h('th',{scope:'col'},'Player'),h('th',{scope:'col'},'Solved'))),
          h('tbody',{},...s.rows.map(row))),
        !s.rows.length&&h('div',{class:'leaderboard-empty',role:'status'},h('span',{'aria-hidden':'true'},'♜'),
          h('strong',{},!configured?'Leaderboards coming soon':s.loading?'Loading rankings…':s.error?'Rankings unavailable':preview&&(!debug||debug.scenario==='rankings')?'No test records':s.personal?.score?(s.personal.syncing?'Your score is syncing…':'Your score is saved'):'The first place is open'),
          h('p',{},!configured?'Online rankings will appear once the service is connected.':s.loading||preview&&(!debug||debug.scenario==='rankings')?'':s.error?'Try again shortly.':s.personal?.score?'Refresh to update the rankings.':'Play a ranked run to set the first score.'))),
      h('nav',{class:'leaderboard-pagination','aria-label':'Leaderboard pages'},
        action('← Previous',()=>this.loadLeaderboard(s.page-1),{disabled:s.page===1||s.loading,'data-focus':'leaderboard-previous'}),
        h('span',{'aria-live':'polite'},'Page '+s.page),
        action('Next →',()=>this.loadLeaderboard(s.page+1),{disabled:!s.hasNext||s.loading,'data-focus':'leaderboard-next'})),
      configured&&(!preview||debug?.account)&&(s.player?h('div',{class:'leaderboard-player'},h('div',{},h('strong',{},s.player.name),h('p',{},'Only ranked play counts.')),
        action('Play ranked',()=>this.startRanked(s.mode),{class:'learn-button primary',disabled:this.startingRanked,'data-focus':'leaderboard-play'}),
        h('details',{open:s.playerSettingsOpen||s.confirmDelete,ontoggle:e=>{state.playerSettingsOpen=e.currentTarget.open;}},h('summary',{},'Player settings'),
          action('Disconnect',async()=>{if(preview)return this.previewLeaderboardAction('disconnect');await this.leaderboardClient.disconnect();state.player=null;this.render();}),
          action('Delete online records',()=>{if(preview)return this.previewLeaderboardAction('confirm-delete');state.confirmDelete=true;this.render();}),
          s.confirmDelete&&h('div',{},h('p',{},'Permanently delete your player and all online scores?'),
            action('Delete my online records',async()=>{if(preview)return this.previewLeaderboardAction('delete');try{await this.leaderboardClient.removePlayer();state.player=null;state.confirmDelete=false;await this.loadLeaderboard(1);}catch(error){state.error=error.message;this.render();}}),
            action('Cancel',()=>{if(preview)return this.previewLeaderboardAction('cancel-delete');state.confirmDelete=false;this.render();})))):form));
  },
  leaderboardAvatar(player) {
    const h=this.h,code=typeof player.country==='string'?flagCodeForCountryId(player.country):null;
    const country=code&&countryNameForId(player.country);
    if(!country)return h('span',{class:'leaderboard-avatar leaderboard-placeholder','aria-hidden':'true'});
    const show=e=>{
      this.hideLeaderboardCountry?.();
      const target=e.currentTarget,view=this.doc.defaultView;
      const tip=h('span',{class:'leaderboard-country-tip',role:'tooltip',id:'leaderboard-country-tip'},country);
      this.doc.body.append(tip);target.setAttribute('aria-describedby',tip.id);
      const rect=target.getBoundingClientRect(),width=tip.getBoundingClientRect().width;
      tip.style.left=Math.max(8,Math.min(rect.left,view.innerWidth-width-8))+'px';
      tip.style.top=Math.max(8,rect.top-tip.getBoundingClientRect().height-6)+'px';
      const hide=this.hideLeaderboardCountry=()=>{
        tip.remove();target.removeAttribute('aria-describedby');
        this.doc.removeEventListener('scroll',hide,true);view.removeEventListener('resize',hide);
        this.hideLeaderboardCountry=null;
      };
      this.doc.addEventListener('scroll',hide,true);view.addEventListener('resize',hide);
    };
    const hide=()=>this.hideLeaderboardCountry?.();
    return h('img',{class:'leaderboard-avatar leaderboard-flag',src:this.url(`flags/${code}.svg`),alt:country,draggable:'false',tabindex:'0',
      'data-focus':'leaderboard-country-'+player.id,onmouseenter:show,onmouseleave:hide,onfocus:show,onblur:hide,
      onkeydown:e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();hide();}}});
  }
};
