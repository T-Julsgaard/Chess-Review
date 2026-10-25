export const SCREEN_PREVIEWS = [
  ['workspace-blank','Blank workspace','Review'], ['review','Review','Review'], ['review-loading','Analyzing','Review'],
  ['review-error','Analysis error','Review'], ['review-variation','Move variation','Review'],
  ['review-practice','Mistake practice','Review'], ['reorganize','Reorganize panels','Review'],
  ['settings-visual','Visual settings','Review'], ['settings-engine','Engine settings','Review'],
  ['credits','Credits','Dialogs'],
  ['puzzles','Puzzle overview','Learning'], ['puzzle-ready','Puzzle ready','Puzzles'],
  ['puzzle-correct','Puzzle solved','Puzzles'], ['puzzle-incorrect','Wrong puzzle move','Puzzles'],
  ['puzzle-promotion','Promotion picker','Dialogs'], ['puzzle-analysis','Puzzle analysis','Puzzles'],
  ['puzzle-save-error','Progress save error','Puzzles'],
  ['timeAttack','Time attack','Runs'], ['timeAttack-results','Time attack results','Runs'],
  ['timeAttack-replay','Time attack replay','Runs'], ['timeAttack-best','Time attack personal best','Runs'],
  ['knockout','Knockout','Runs'], ['knockout-results','Knockout results','Runs'],
  ['knockout-replay','Knockout replay','Runs'], ['run-notice','Filtered-run notice','Dialogs'],
  ['statistics','Puzzle statistics','Learning'], ['statistics-empty','Empty statistics','Learning'],
  ['openings','Opening library','Learning'], ['opening','Opening course','Learning'],
  ['concepts','Concept library','Learning'], ['concept-notice','Concept notice','Dialogs'],
  ['lesson','Lesson explanation','Learning'], ['lesson-exercise','Lesson exercise','Learning'],
  ['learning-loading','Learning loading','Learning'], ['learning-error','Learning load error','Learning'],
  ['popup','Extension popup','Popup'], ['popup-manual','Popup manual setup','Popup'],
].map(([id,label,group])=>({id,label,group}));

export function memoryStorage(initial={}) {
  const values=structuredClone(initial);
  return {
    async get(keys=null) {
      if(typeof keys==='string')return {[keys]:structuredClone(values[keys])};
      const names=Array.isArray(keys)?keys:keys?Object.keys(keys):Object.keys(values),result={};
      for(const key of names)result[key]=key in values?values[key]:Array.isArray(keys)||!keys?undefined:keys[key];
      return structuredClone(result);
    },
    async set(data) {Object.assign(values,structuredClone(data));},
    async remove(keys) {for(const key of Array.isArray(keys)?keys:[keys])delete values[key];},
    async clear() {for(const key of Object.keys(values))delete values[key];},
  };
}

export function createScreenPreviewContext(location) {
  const params=new URLSearchParams(location.search||'');
  const viewport=params.has('viewport-preview');
  if(!params.has('screen-preview')&&!viewport)return null;
  const id=SCREEN_PREVIEWS.some(view=>view.id===params.get('screen-preview'))?params.get('screen-preview'):'review';
  const storage=memoryStorage();
  return {id,viewport,storage,job:id==='workspace-blank'?{source:'blank',analysis:null}:{pgn:'[White "Preview White"]\n[Black "Preview Black"]\n\n1. f3 e5 2. g4 Qh4#',meta:{gameId:'screen-preview',myName:'Preview White'},source:'pgn'},
    async configure(preferences,snapshot) {
      if(viewport){
        await storage.set(preferences);
        if(snapshot?.job){this.job=structuredClone(snapshot.job);this.idx=snapshot.idx;}
        if(snapshot?.preferences)await storage.set(snapshot.preferences);
        return;
      }
      await storage.set({settings:{...(preferences.settings||{}),engineDepth:4,engineWorkers:1,depthBumped:true,sound:false},
        layout:preferences.layout,layoutMode:preferences.layoutMode,layoutVersion:preferences.layoutVersion,library:[]});
    }};
}

export function loadScreenPreviewController() {return import('./screen-preview-controller.js');}
