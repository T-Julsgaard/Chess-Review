import {SCREEN_PREVIEWS} from './screen-previews.js';
import {Chess} from './chess.js';

// Only loaded in an explicitly opened preview tab. All app writes in that tab
// use its memory storage, and these scenarios invoke the real UI components.
export async function mountScreenPreview(env) {
  const {context,document:doc,state:S,openLearning,renderAll,renderSettings,toggleSettings,toggleReorganize,openCredits,go,applyUserMove,startPractice}=env;
  const view=SCREEN_PREVIEWS.find(view=>view.id===context.id),index=SCREEN_PREVIEWS.indexOf(view);
  const h=(tag,attrs={},...children)=>{const node=doc.createElement(tag);for(const [key,value]of Object.entries(attrs)){if(key.startsWith('on'))node.addEventListener(key.slice(2),value);else node.setAttribute(key,value);}node.append(...children);return node;};
  const navigate=id=>{const url=new URL(doc.defaultView.location.href);url.searchParams.set('screen-preview',id);doc.defaultView.location.assign(url.href);};
  const select=h('select',{'aria-label':'Screen preview'});
  for(const group of new Set(SCREEN_PREVIEWS.map(view=>view.group))){
    const options=h('optgroup',{label:group});for(const view of SCREEN_PREVIEWS.filter(view=>view.group===group)){const option=h('option',{value:view.id},view.label);option.selected=view.id===context.id;options.append(option);}select.append(options);
  }
  select.addEventListener('change',()=>navigate(select.value));
  const toolbar=h('details',{class:'screen-preview-toolbar',open:''},
    h('summary',{},'Screen previews · '+view.label),
    h('div',{class:'screen-preview-actions'},
      h('button',{type:'button',onclick:()=>navigate(SCREEN_PREVIEWS[(index+SCREEN_PREVIEWS.length-1)%SCREEN_PREVIEWS.length].id)},'← Previous'),select,
      h('button',{type:'button',onclick:()=>navigate(SCREEN_PREVIEWS[(index+1)%SCREEN_PREVIEWS.length].id)},'Next →'),
      h('button',{type:'button',onclick:env.close},'Close preview')),
    h('p',{},'Sample data · changes stay in this tab. Alt + Left / Right changes views. Collapse these controls to inspect the full screen.'));
  doc.body.append(toolbar);doc.body.classList.add('is-screen-preview');doc.title=view.label+' — Screen preview';
  doc.defaultView.addEventListener('keydown',event=>{if(event.altKey&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();navigate(SCREEN_PREVIEWS[(index+(event.key==='ArrowRight'?1:SCREEN_PREVIEWS.length-1))%SCREEN_PREVIEWS.length].id);}},true);
  const pause=ms=>new Promise(resolve=>doc.defaultView.setTimeout(resolve,ms));
  for(let i=0;S.analyzing&&i<150;i++)await pause(100);
  if(S.analyzing)env.stopAnalysis();
  const id=context.id;
  if(id==='workspace-blank'){doc.body.dataset.previewReady='true';return;}
  if(id==='review')go(Math.min(3,S.total));
  else if(id==='review-loading'){S.analyzing=true;S.completed=2;S.progress=2;renderAll();}
  else if(id==='review-error'){S.analysisError='Sample engine interruption. Retry is available.';S.analyzing=false;renderAll();}
  else if(id==='review-variation'){go(2);applyUserMove('g2','g3');}
  else if(id==='review-practice'){S.meSide='w';S.classif[3]='blunder';startPractice();}
  else if(id==='reorganize')toggleReorganize();
  else if(id.startsWith('settings-')){S.settingsTab=id.slice(9);toggleSettings();renderSettings();}
  else if(id==='credits')openCredits();
  else if(id.startsWith('popup')){
    doc.querySelector('#root').hidden=true;
    const frame=h('iframe',{class:'screen-preview-popup',title:view.label,src:'popup.html?screen-preview='+id});doc.body.append(frame);
    for(let i=0;i<100&&frame.contentDocument?.body?.dataset.previewReady!=='true';i++)await pause(50);
    if(frame.contentDocument?.body?.dataset.previewReady!=='true')throw Error('Popup preview could not load.');
  } else {
    await openLearning();const w=env.workspace();
    if(!w?.ready)throw Error(w?.loadError||'Preview learning workspace could not load.');
    const {LESSONS}=await import('./learning/content.js');
    if(['puzzles','openings','concepts'].includes(id))await w.navigate(id);
    else if(id==='opening')await w.startOpening('italian');
    else if(id==='concept-notice'){await w.navigate('concepts');w.showConceptNotice();}
    else if(id==='lesson'||id==='lesson-exercise'){await w.startLesson(LESSONS[0].id);if(id==='lesson-exercise')await w.lessonTab('practise');}
    else if(id.startsWith('learning-')){w.ready=false;w.loadError=id==='learning-error'?'Sample library load error. Try again is available.':null;w.render();}
    else if(id.startsWith('statistics')){
      if(id==='statistics')await w.persist(p=>{for(const puzzle of w.puzzles.slice(0,4))p.puzzles[puzzle.id]={attempts:3,clean:1,mistakes:2};p.puzzleTimeMs=843000;});
      if(id==='statistics-timeAttack')await w.persist(p=>{
        const scores=[6,9,7,12,10,14,11,15];
        for(const [index,solved] of scores.entries()){
          const results=w.puzzles.slice(0,solved+3).map((puzzle,i)=>({id:puzzle.id,number:i+1,rating:puzzle.rating,correct:i<solved}));
          p.challenges.push({mode:'timeAttack',solved,results,at:Date.now()-(scores.length-index)*864e5});
          p.runStats.timeAttack.runs++;p.runStats.timeAttack.solved+=solved;p.runStats.timeAttack.attempted+=results.length;
          p.runStats.timeAttack.topRating=Math.max(p.runStats.timeAttack.topRating,...results.filter(r=>r.correct).map(r=>r.rating));
        }
        p.runStats.timeAttack.timeMs=scores.length*171000;p.bests.timeAttack=15;
      });
      w.showStatistics(id==='statistics-timeAttack'?'timeAttack':'solve-puzzle');
    } else if(id==='run-notice'){w.puzzleThemes.add('fork');w.render();void w.startPuzzleRun('timeAttack');}
    else if(id.startsWith('timeAttack')||id.startsWith('knockout')){
      const mode=id.startsWith('timeAttack')?'timeAttack':'knockout';await w.startPuzzleRun(mode);
      if(id!==mode){
        w.run.results=w.puzzles.slice(0,mode==='knockout'?13:15).map((p,i)=>({id:p.id,number:i+1,rating:p.rating,correct:mode==='knockout'?i<12:(i+1)%5!==0}));
        w.run.solved=12;w.run.mistakes=mode==='knockout'?1:3;w.run.previousBest=id.endsWith('-best')?8:15;
        await w.persist(p=>{p.bests[mode]=w.run.previousBest;});
        await w.finishChallenge('Out of lives');
        if(id.endsWith('-replay'))await w.replayRunPuzzle(w.result.results[0].id);
      }
    } else {
      const puzzle={id:'preview-mate',fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',solution:['f7f8'],rating:1200,themes:['mateIn1']};
      if(id==='puzzle-promotion'){puzzle.fen='7k/P7/8/8/8/8/8/7K w - - 0 1';puzzle.solution=['a7a8n'];puzzle.themes=['promotion'];}
      if(id==='puzzle-analysis'){puzzle.fen=new Chess().fen();puzzle.solution=['e2e4'];puzzle.themes=[];}
      w.puzzles=[puzzle];await w.startPuzzleSelection([puzzle]);
      if(id==='puzzle-correct'||id==='puzzle-analysis'){await w.submitPuzzle(puzzle.solution[0]);if(id==='puzzle-analysis')w.startPuzzleAnalysis();}
      else if(id==='puzzle-incorrect')await w.submitPuzzle('f7e7');
      else if(id==='puzzle-promotion'){w.promotionPending={moves:new Chess(puzzle.fen).moves({verbose:true}).filter(move=>move.promotion)};w.render();}
      else if(id==='puzzle-save-error'){w.store.storage={...context.storage,set:async()=>{throw Error('Sample save failure');}};await w.persist(p=>{p.puzzleTimeMs=1000;});w.render();}
    }
  }
  doc.body.dataset.previewReady='true';
}
