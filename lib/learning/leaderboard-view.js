export const LEADERBOARD_MODES={
  'solve-puzzle':{name:'Solve a puzzle',metric:'Unique puzzles solved',tag:'ALL TIME',rule:'Each puzzle counts once.'},
  timeAttack:{name:'Time attack',metric:'Puzzles in 3 minutes',tag:'180 SECONDS',rule:'3 minutes · 3 lives'},
  knockout:{name:'Knockout',metric:'Puzzles without a mistake',tag:'SUDDEN DEATH',rule:'One mistake ends the run.'}
};

// Kept separate from the board/input machinery; all remote text uses text nodes.
export const leaderboardMethods={
  stopLeaderboard() {
    this.leaderboardRequest?.abort();this.leaderboardRequest=null;
    clearTimeout(this.leaderboardTimer);this.leaderboardTimer=null;
  },
  async showLeaderboard(mode) {
    if(this.busy||this.run||this.activity||!LEADERBOARD_MODES[mode])return;
    this.stopLeaderboard();
    const source=this.root.querySelector(`.puzzle-mode[data-mode="${mode}"]`),grid=source?.parentElement;
    const before=source?.getBoundingClientRect(),bounds=grid?.getBoundingClientRect();
    const backdrop=grid?.cloneNode(true);
    this.leaderboard={mode,page:1,rows:[],hasNext:false,loading:this.leaderboardClient.configured};
    this.page='leaderboard';this.scrollToTop();this.render();
    const hero=this.root.querySelector('.leaderboard-hero');
    if(before?.width&&bounds?.width&&hero?.animate&&this.puzzleMotionEnabled()) {
      const scale=parseFloat(this.root.style.getPropertyValue('--learn-content-scale'))||1;
      // Keep the other tickets underneath until the selected ticket covers them.
      const state=this.leaderboard;state.backdrop=backdrop;backdrop.classList.add('leaderboard-backdrop');
      backdrop.inert=true;backdrop.setAttribute('aria-hidden','true');
      backdrop.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      backdrop.style.top=hero.offsetTop+'px';backdrop.style.height=hero.offsetHeight+'px';hero.before(backdrop);
      const animation=hero.animate([{marginLeft:(before.left-bounds.left)/scale+'px',width:before.width/scale+'px'},
        {marginLeft:'0px',width:bounds.width/scale+'px'}],{duration:520,easing:'cubic-bezier(.22,1,.36,1)'});
      animation.finished.catch(()=>{}).finally(()=>{backdrop.remove();state.backdrop=null;});
    }
    this.root.querySelector('#leaderboard-title')?.focus({preventScroll:true});
    try {const player=await this.leaderboardClient.credentials();if(this.page==='leaderboard'&&this.leaderboard?.mode===mode)this.leaderboard.player=player;}
    catch {if(this.page==='leaderboard'){this.leaderboard.error='Player key could not be loaded.';this.render();}}
    if(this.page==='leaderboard'){if(this.leaderboardClient.configured)await this.loadLeaderboard(1,{quiet:true});else this.render();}
  },
  returnFromLeaderboard() {
    const mode=this.leaderboard?.mode;this.stopLeaderboard();this.page='puzzles';this.render();
    this.root.querySelector(`[data-focus="leaderboard-${mode}"]`)?.focus({preventScroll:true});
  },
  async loadLeaderboard(page=this.leaderboard?.page,{quiet=false}={}) {
    if(this.page!=='leaderboard'||!this.leaderboardClient.configured)return;
    this.stopLeaderboard();const state=this.leaderboard,request=new AbortController();this.leaderboardRequest=request;
    if(!quiet){state.loading=true;state.error=null;this.render();}
    try {
      const data=await this.leaderboardClient.list(state.mode,page,request.signal);
      if(request.signal.aborted||state!==this.leaderboard||this.page!=='leaderboard')return;
      if(!Array.isArray(data.rows)||data.rows.length>10||data.rows.some(r=>typeof r.name!=='string'||r.name.length>40||!Number.isSafeInteger(r.score)||r.score<0))throw Error('Leaderboard unavailable.');
      // A last page can disappear when players delete their records.
      if(page>1&&!data.rows.length)return this.loadLeaderboard(page-1);
      Object.assign(state,{rows:data.rows,page,hasNext:!!data.hasNext,loading:false,error:null,updated:Date.now()});this.render();
    } catch(error) {
      if(request.signal.aborted||state!==this.leaderboard||this.page!=='leaderboard')return;
      state.loading=false;state.error=error.message;this.render();
    }
    const refresh=()=>{
      if(this.page!=='leaderboard'||state!==this.leaderboard)return;
      if(this.doc.hidden){this.leaderboardTimer=setTimeout(refresh,30000);return;}
      this.loadLeaderboard(state.page,{quiet:true});
    };
    if(this.page==='leaderboard'&&state===this.leaderboard)this.leaderboardTimer=setTimeout(refresh,state.error?60000:30000);
  },
  async connectLeaderboard(input) {
    const state=this.leaderboard;state.error=null;state.connecting=true;this.render();
    try {await this.leaderboardClient.connect(input.trim());state.keyDraft='';state.player=await this.leaderboardClient.credentials();}
    catch(error){state.error=error.message;}
    finally {state.connecting=false;if(this.page==='leaderboard'&&state===this.leaderboard)this.render();}
  },
  async startRanked(mode) {
    if(this.busy||this.run||this.closed||this.closing||this.startingRanked)return;
    this.startingRanked=true;const generation=this.generation,state=this.leaderboard;this.render();
    try {
      const session=await this.leaderboardClient.start(mode);
      if(this.closed||this.closing||generation!==this.generation||this.page!=='leaderboard'||state!==this.leaderboard)return;
      if(!this.puzzleById(session.puzzleId))throw Error('Update the extension to play ranked puzzles.');
      this.stopLeaderboard();this.ranked={...session,mode};this.rankedNotice=null;
      this.page='puzzles';this.leaderboardLaunch=true;
      if(mode==='solve-puzzle')await this.startPuzzleSelection([this.puzzleById(session.puzzleId)]);
      else await this.startPuzzleRun(mode);
    } catch(error) {
      this.ranked=null;if(this.leaderboard)this.leaderboard.error=error.message;this.render();
    } finally {this.startingRanked=false;this.leaderboardLaunch=false;if(this.page==='leaderboard')this.render();}
  },
  async recordRankedAttempt(completed,skipped,activity) {
    const ranked=this.ranked;if(!ranked)return;
    if(skipped||activity.assisted||activity.mistakes&&!this.run?.mode){this.ranked=null;this.rankedNotice='Ranked session ended. Assistance and retries do not count.';return;}
    try {
      const moves=this.puzzleMoves.filter((_,i)=>i%2===0);if(!completed&&this.rankedWrongMove)moves.push(this.rankedWrongMove);
      const result=await this.leaderboardClient.attempt(ranked,moves);
      if(this.ranked!==ranked)return;
      Object.assign(ranked,result);ranked.nextPuzzle=result.puzzleId;
      this.rankedNotice=result.ended?'Ranked score saved.':'Ranked · '+result.score+' solved';
    } catch {
      if(this.ranked===ranked){this.ranked=null;this.rankedNotice='Connection lost. Ranked play stopped; earlier verified scores are saved.';}
    }
  },
  leaderboardView() {
    const h=this.h,s=this.leaderboard,c=LEADERBOARD_MODES[s.mode],configured=this.leaderboardClient.configured;
    const action=(label,fn,attrs={})=>this.button(label,fn,{class:'learn-button',...attrs});
    const row=(r,index)=>h('tr',{class:r.id===s.player?.id?'is-you':''},
      h('td',{class:'leaderboard-rank'},h('span',{'data-rank':(s.page-1)*10+index+1},(s.page-1)*10+index+1)),
      h('th',{scope:'row'},h('span',{class:'leaderboard-avatar','aria-hidden':'true'},r.name.slice(0,1)),h('span',{},r.name),r.id===s.player?.id&&h('span',{class:'leaderboard-you'},'You')),
      h('td',{class:'leaderboard-score'},r.score.toLocaleString()));
    const key=h('input',{type:'password',autocomplete:'off',spellcheck:'false',maxlength:64,placeholder:'Player key','aria-label':'Player key','data-focus':'leaderboard-key',oninput:e=>{s.keyDraft=e.target.value;}});key.value=s.keyDraft||'';
    const form=h('form',{class:'leaderboard-connect',onsubmit:e=>{e.preventDefault();this.connectLeaderboard(key.value);}},
      h('p',{},'Only ranked play counts. Verify once to get a private player key.'),
      h('a',{href:this.leaderboardClient.endpoint+'/join',target:'_blank',rel:'noopener noreferrer',class:'learn-button'},'Get player key ↗'),key,
      h('button',{type:'submit',class:'learn-button',disabled:s.connecting},s.connecting?'Connecting…':'Connect'));
    s.hero ||= h('div',{class:'leaderboard-hero'},
      h('div',{class:'leaderboard-hero-copy'},h('span',{class:'leaderboard-eyebrow'},c.tag),h('h3',{},c.name),h('p',{},c.rule)),this.leaderboardArt(s.mode));
    return h('section',{class:'learn-leaderboard','data-mode':s.mode,'aria-labelledby':'leaderboard-title'},
      h('div',{class:'learn-puzzle-heading'},h('h2',{id:'leaderboard-title',tabindex:'-1','data-focus':'leaderboard-title'},'Leaderboard'),
        action('Return to puzzle overview',()=>this.returnFromLeaderboard(),{'data-focus':'leaderboard-return',class:'learn-button learn-statistics-button'})),
      s.backdrop,s.hero,
      h('div',{class:'leaderboard-toolbar'},h('h3',{},c.metric),
        configured&&h('span',{class:'leaderboard-live',role:'status'},s.loading?'Updating…':s.error?'Offline':'↻ Every 30s')),
      s.error&&h('div',{class:'leaderboard-error',role:'alert'},s.error,action('Retry',()=>this.loadLeaderboard(s.page),{'data-focus':'leaderboard-retry'})),
      h('div',{class:'leaderboard-table-wrap','aria-busy':String(!!s.loading)},
        h('table',{class:'leaderboard-table'},h('caption',{class:'sr-only'},c.name+' leaderboard'),
          h('thead',{},h('tr',{},h('th',{scope:'col'},'Rank'),h('th',{scope:'col'},'Player'),h('th',{scope:'col'},'Solved'))),
          h('tbody',{},...s.rows.map(row))),
        !s.rows.length&&h('div',{class:'leaderboard-empty',role:'status'},h('span',{'aria-hidden':'true'},'♜'),
          h('strong',{},!configured?'Leaderboards coming soon':s.loading?'Loading rankings…':s.error?'Rankings unavailable':'The first place is open'),
          h('p',{},!configured?'Online rankings will appear once the service is connected.':s.loading?'':s.error?'Try again shortly.':'Play a ranked run to set the first score.'))),
      h('nav',{class:'leaderboard-pagination','aria-label':'Leaderboard pages'},
        action('← Previous',()=>this.loadLeaderboard(s.page-1),{disabled:s.page===1||s.loading,'data-focus':'leaderboard-previous'}),
        h('span',{'aria-live':'polite'},'Page '+s.page),
        action('Next →',()=>this.loadLeaderboard(s.page+1),{disabled:!s.hasNext||s.loading,'data-focus':'leaderboard-next'})),
      configured&&(s.player?h('div',{class:'leaderboard-player'},h('div',{},h('strong',{},s.player.name),h('p',{},'Only ranked play counts.')),
        action('Play ranked',()=>this.startRanked(s.mode),{class:'learn-button primary',disabled:this.startingRanked,'data-focus':'leaderboard-play'}),
        h('details',{open:s.playerSettingsOpen,ontoggle:e=>{s.playerSettingsOpen=e.currentTarget.open;}},h('summary',{},'Player settings'),
          action('Disconnect',async()=>{await this.leaderboardClient.disconnect();s.player=null;this.render();}),
          action('Delete online records',()=>{s.confirmDelete=true;this.render();}),
          s.confirmDelete&&h('div',{},h('p',{},'Permanently delete your player and all online scores?'),
            action('Delete my online records',async()=>{try{await this.leaderboardClient.removePlayer();s.player=null;s.confirmDelete=false;await this.loadLeaderboard(1);}catch(error){s.error=error.message;this.render();}}),
            action('Cancel',()=>{s.confirmDelete=false;this.render();})))):form));
  }
};
