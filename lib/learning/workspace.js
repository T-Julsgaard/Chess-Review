import {Chess} from '../chess.js';
import {LESSONS, OPENINGS, CATEGORIES, DIFFICULTIES, THEME_NAMES, playUci, linePositions} from './content.js';
import {validateExercise, validatePuzzleMove, validSquares} from './validation.js';
import {ProgressStore, progressTotals, recordPuzzle, ChallengeClock, challengeResult} from './progress.js';
import {moveEvents} from './rules/E022-tactics.mjs';
import {explainMove} from './rules/E020-concepts.mjs';
import {capturePanels} from './morph.js';
import {fullSizeLearningLayout, centeredMorph} from './centered-morph.js';
import {presentationFor} from './presentations.js';
import {canRatePuzzle, ratePuzzle, pickRatedPuzzle, normalizePuzzleRating} from './puzzle-rating.js';
import {pieceRoutes, slidePuzzlePieces} from './piece-transition.js';
import {puzzleResultBadge} from '../puzzle-badge.js';
import {matedKingSquare,mateMark} from '../mate-mark.js';
import {moveAnimationDuration, MOVE_ANIMATION_EASING} from '../move-animation.js';
import {puzzleStatistics} from './statistics.js';
import {PUZZLE_RUN_MODES, pickRunPuzzle, runBest} from './puzzle-runs.js';
import {evasiveNoticeButton} from './notice-dodge.js';
import {PuzzleLibrary} from './puzzle-library.js';
import {createRunStartSound} from './run-start-sound.js';
import {runDashboard,updateRunCountdown} from './run-dashboard.js';
import {runAnimationStyle,runStartOverlay,runEndOverlay} from './run-animations.js';

const PUZZLE_COUNT = new Intl.NumberFormat('da-DK');
const NAMES = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
export function puzzleExplanation(puzzle) {
  const c = new Chess(puzzle.fen), notes = [];
  for (let i = 0; i < puzzle.solution.length; i++) {
    const before = new Chess(c.fen());
    const m = playUci(c, puzzle.solution[i]);
    let text = `${i % 2 ? 'Opponent' : 'You'}: ${m.san}. `;
    if (m.captured) text += `The ${NAMES[m.piece]} captures the ${NAMES[m.captured]} on ${m.isEnPassant() ? m.to[0]+m.from[1] : m.to}. `;
    else text += `The ${NAMES[m.piece]} moves from ${m.from} to ${m.to}. `;
    if (m.promotion) text += `The pawn promotes to a ${NAMES[m.promotion]}. `;
    if (c.isCheckmate()) text += 'The king is in check and has no legal response: checkmate.';
    else if (c.isCheck()) text += 'Check forces the next reply to address the king threat. ';
    if (!(i % 2) && puzzle.themes.includes('fork')) {
      const targets = c.board().flat().filter(p=>p && p.color!==m.color && c.attackers(p.square,m.color).includes(m.to));
      if (targets.length >= 2) text += `This attacks ${targets.map(p=>`the ${NAMES[p.type]} on ${p.square}`).join(' and ')} at once. `;
    }
    if (!(i % 2)) {
      const facts = moveEvents(before,c,m,{maxTacticNodes:2000}).events;
      for (const event of facts.filter(e=>['discovered-attack','absolute-skewer','profitable-capture','winning-exchange','interposition','capture-checker','back-rank-mate','smothered-mate'].includes(e.id))) text += event.text + ' ';
      if (puzzle.themes.includes('pin')) {
        const pin = explainMove({fen:before.fen(),move:m.lan,scanReplies:false,maxNodes:2000}).events.find(e=>e.id==='absolute-pin');
        if(pin)text += pin.text + ' ';
      }
      if(puzzle.themes.includes('sacrifice')&&c.moves({verbose:true}).some(reply=>reply.captured&&reply.to===m.to)) text += `The ${NAMES[m.promotion||m.piece]} is offered on ${m.to}; follow the forcing continuation before judging the material trade. `;
    }
    notes.push(text.trim());
  }
  return notes;
}

export class LearningWorkspace {
  static presentationFor = presentationFor;
  constructor({document = globalThis.document, storage, makePiece, url = p=>p, settings = ()=>({}), flipped = false, onClose = ()=>{}, onClosing = ()=>{}, onPuzzleWrong = ()=>{}, onPuzzleMove = ()=>{}, onOpeningMove = ()=>{}, onFreeMove = ()=>{}, onPuzzleSuccess = ()=>{}, createAnalysisEngine, book = ()=>({}), embedded = null, startDrag = embedded?.startDrag, navigationButton = null, returnLabel = "← Back to review"}) {
    this.doc = document; this.store = new ProgressStore(storage, document.defaultView?.navigator?.locks);
    this.failedChanges = this.store.pending.changes;
    this.syncSaveWarning();
    this.makePiece = makePiece; this.url = url; this.settings = settings; this.flipped = flipped; this.onClose = onClose; this.book = book;
    this.onClosing = onClosing;
    this.embedded = embedded;this.returnLabel=returnLabel;
    this.startDrag = startDrag;
    this.navigationButton = navigationButton;
    this.onPuzzleWrong = onPuzzleWrong;
    this.onPuzzleMove = onPuzzleMove;
    this.onOpeningMove = onOpeningMove;
    this.onFreeMove = onFreeMove;
    this.onPuzzleSuccess = onPuzzleSuccess;
    this.createAnalysisEngine = createAnalysisEngine;
    this.presentation = presentationFor(settings());
    this.reviewFlipped = flipped;
    this.homePosition = new Chess();
    this.homeHistory = [{fen:this.homePosition.fen()}]; this.homeIndex = 0;
    this.page = 'puzzles'; this.activity = null; this.filters = {search:'',category:'All',difficulty:'All',theme:'All',phase:'All',status:'All',family:'All',rating:'Near my rating'};
    this.puzzleThemes = new Set(); this.puzzleRange = null;
    this.puzzleLibrary = new PuzzleLibrary();
    this.selected = null; this.marked = new Set(); this.feedback = null; this.busy = false; this.closed = false; this.generation = 0;
    this.run = null; this.worker = null; this.workerSeq = 0; this.workerPending = new Map();
    this.h = (tag, attrs = {}, ...children) => {
      const node = this.doc.createElement(tag);
      for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === false) continue;
        if (key === 'class') node.className = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else if (key === 'disabled') node.disabled = !!value;
        else node.setAttribute(key, value);
      }
      for (const child of children.flat()) if (child != null && child !== false) node.append(child.nodeType ? child : this.doc.createTextNode(String(child)));
      return node;
    };
  }
  button(label, action, attrs = {}) {return this.h('button', {type:'button', class:'learn-button', 'data-focus':'button-'+label, onclick:action, ...attrs}, label);}
  p(text, cls = '') {return this.h('p', {class:cls}, text);}
  heading(text) {return this.h('h2', {}, text);}
  async open() {
    this.previousFocus = this.doc.activeElement;
    this.background = this.doc.querySelector('#root > .app');
    this.backgroundInert = this.background?.inert;
    this.oldOverflow = this.doc.body.style.overflow;
    this.root = this.h('section', {class:'learning-workspace'+(this.embedded?' learning-embedded':this.navigationButton?' learning-with-topbar':''), tabindex:'-1', role:this.embedded||this.navigationButton?'region':'dialog', 'aria-modal':this.embedded||this.navigationButton?null:'true', 'aria-label':'Learn with Chess Review', 'data-presentation':this.presentation, 'data-motion':this.settings().moveAnim===false?'off':'on'});
    this.keyHandler = e => this.onKey(e); this.doc.addEventListener('keydown', this.keyHandler, true);
    this.dismissDropdown = e => {if(this.dropdown&&!this.dropdown.field.contains(e.target))this.closeDropdown(e.type==='pointerdown');};
    this.doc.addEventListener('pointerdown', this.dismissDropdown, true);
    this.doc.addEventListener('focusin', this.dismissDropdown);
    if (this.embedded) {
      this.transitioning = true;
      // Keep the review intact while the offline library is read and parsed.
      // Mount and animate the complete learning surface in the same turn.
      await this.load({render:false});
      if (!this.closed && !this.closing) {
        this.mountEmbedded();
        this.render();
        this.shell.style.visibility = '';
        (this.navigationButton||this.root.querySelector('[data-focus="review"]'))?.focus({preventScroll:true});
        const arranging=this.arrangePuzzlePieces({fen:this.embedded.fen,flipped:this.reviewFlipped},this.displayedBoard);
        // Start the chrome transitions after the learning content is ready to paint.
        this.background?.classList.add('has-learning');
        await Promise.all([arranging,this.morph = this.transitionPanels(this.reviewSurfaces, this.panelSurfaces(), {fromBoard:this.reviewBoardRect})]);
      }
      this.transitioning = false;
      if(!this.closed&&!this.closing&&this.shell)this.render();
    } else {
      if (this.navigationButton) {
        this.backgroundNodes = [...(this.background?.children||[])].filter(node=>!node.matches('.topbar')).map(node=>({node,inert:node.inert}));
        this.backgroundNodes.forEach(({node})=>{node.inert=true;});
      } else if (this.background) this.background.inert = true;
      this.doc.body.style.overflow = 'hidden'; this.doc.body.append(this.root);
      await this.load();
    }
  }
  mountEmbedded() {
    const {stage, boardWrap} = this.embedded;
    this.reviewNodes = [...stage.querySelectorAll('.mod:not([data-mod="board"]) > .mod-inner'), this.doc.querySelector('#playerTop'), this.doc.querySelector('#playerBot')].filter(Boolean);
    this.reviewSurfaces = capturePanels(this.reviewNodes);
    this.boardElement = boardWrap.querySelector('.board');
    this.reviewBoardRect = this.boardElement.getBoundingClientRect();
    this.boardOriginalClass = this.boardElement.className;
    this.appliedPieceStyle = this.settings().pieceStyle;
    this.boardOriginalInert = this.boardElement.inert;
    this.boardChildren = [...this.boardElement.childNodes];
    this.boardExtras = [...boardWrap.children].filter(node => node !== this.boardElement);
    this.boardExtras.forEach(node => node.remove());
    this.placeholder = this.h('div', {class:'board-wrap learn-board-placeholder', 'aria-hidden':'true'});
    // Preserve the review layout while the real board moves into its learning dock.
    const boardStyle = this.doc.defaultView.getComputedStyle(boardWrap);
    Object.assign(this.placeholder.style, {width:boardStyle.width, height:boardStyle.height, flex:'none', aspectRatio:'auto'});
    boardWrap.replaceWith(this.placeholder);
    this.dock = this.h('div', {class:'learn-board-dock'}, boardWrap);
    this.boardInfo = this.h('div', {class:'learn-dock-info'});
    this.dock.append(this.boardInfo);
    this.shell = this.h('div', {class:'learn-shell'});
    this.shell.style.visibility = 'hidden';
    this.root.append(this.dock, this.shell); stage.append(this.root);
    this.inertNodes = [...stage.querySelectorAll('.mod'), this.background?.querySelector('.library-rail')].filter(Boolean).map(node => ({node, inert:node.inert}));
    this.inertNodes.forEach(({node}) => {node.inert = true;});
    stage.classList.add('learning-active');
    this.reviewMeta=this.background?.querySelector('.topbar-meta');
    this.reviewLibrary=this.background?.querySelector('.library-rail');
    if(this.reviewLibrary)this.reviewLibrary.dataset.motion=this.root.dataset.motion;
    if(this.reviewMeta){
      this.reviewMeta.classList.remove('meta-return');
      this.reviewMeta.dataset.motion=this.settings().moveAnim===false?'off':'on';
      this.reviewMeta.setAttribute('aria-hidden','true');
    }
    this.background?.classList.add('has-learning-morph3');
    this.doc.body.append(this.root);
    this.doc.body.style.overflow = 'hidden';
    this.positionEmbedded = () => this.positionCentered();
    this.positionEmbedded();
    this.doc.defaultView.addEventListener('resize', this.positionEmbedded);
    if (this.doc.defaultView.ResizeObserver) {
      this.resizeObserver = new this.doc.defaultView.ResizeObserver(this.positionEmbedded);
      this.resizeObserver.observe(this.placeholder);
    }
  }
  panelSurfaces() {return [this.shell, this.boardInfo];}
  positionCentered() {
    const view = this.doc.defaultView, settings = this.doc.querySelector('#settings');
    const top = Math.max(0, this.doc.querySelector('.topbar')?.getBoundingClientRect().bottom || 60);
    const settingsWidth = settings?.getBoundingClientRect().width || 286;
    const layout = fullSizeLearningLayout({width:view.innerWidth, height:view.innerHeight, top, settingsWidth, board:this.reviewBoardRect});
    if(this.puzzleAnalysis){
      const inset=Math.max(0,(view.innerWidth<760?16:24)+40-layout.boardX);
      layout.boardX+=inset;layout.boardSize=Math.max(1,layout.boardSize-inset);
      if(!layout.stacked)layout.panelHeight=layout.boardSize;
    }
    this.root.style.top = top+'px';
    for (const [key, value] of Object.entries({'board-x':layout.boardX, 'board-y':layout.boardY, 'board-size':layout.boardSize,
      'panel-x':layout.panelX, 'panel-y':layout.panelY, 'panel-width':layout.panelWidth, 'panel-height':layout.panelHeight})) this.root.style.setProperty('--learn-'+key, value+'px');
    this.root.classList.toggle('learn-stacked', layout.stacked);
  }
  // The settings gutter is always reserved. Opening it never reflows the scene.
  settingsLayoutChanged() {}
  refreshSettings() {
    if (!this.root || this.closed || this.closing) return;
    if(!this.settings().sound)this.runStartSound?.stop();
    for(const [kind,overlay] of [['start',this.runStartOverlay],['end',this.root.querySelector('.puzzle-run-end')]])if(overlay){
      const style=runAnimationStyle(this.settings(),kind);
      overlay.dataset.style=style;overlay.dataset.motion=this.puzzleMotionEnabled()&&style!=='still'?'on':'off';
    }
    this.root.dataset.motion = this.settings().moveAnim===false ? 'off' : 'on';
    if(!this.shell)return;
    if(this.reviewMeta)this.reviewMeta.dataset.motion=this.root.dataset.motion;
    if(this.reviewLibrary)this.reviewLibrary.dataset.motion=this.root.dataset.motion;
    if (this.settings().moveAnim===false) {this.motionController?.abort();this.cancelPieceTransition?.();}
    // Keep the saved review squares and current learning board in sync with the
    // piece picker without replacing the board or interrupting an exercise.
    const pieceStyle = this.settings().pieceStyle;
    if (this.appliedPieceStyle !== pieceStyle) {
      this.appliedPieceStyle = pieceStyle;
      for (const square of this.boardChildren) for (const img of square.querySelectorAll?.('img[data-piece]') || []) {
        const code = img.dataset.piece; img.replaceWith(this.makePiece(code[1].toLowerCase(),code[0]));
      }
      this.render();
    }
    this.positionCentered();
    this.syncNavigation();
    this.syncPuzzleElo();
    if(this.puzzleAnalysis){
      if(this.puzzleAnalysisSettingsKey()!==this.analysisSettingsKey){this.releaseAnalysisEngine();this.analysisRequest=this.requestPuzzleAnalysis();}
      else this.render({preservePickup:true});
    }
  }
  transitionPanels(sources, targets, options = {}) {
    this.motionController?.abort(); this.motionController = new this.doc.defaultView.AbortController();
    return centeredMorph(this.doc, sources, targets, {board:this.boardElement || this.embedded?.boardWrap, reduced:this.settings().moveAnim===false, signal:this.motionController.signal, ...options});
  }
  unmountEmbedded() {
    this.doc.defaultView.removeEventListener('resize', this.positionEmbedded); this.resizeObserver?.disconnect();
    const {stage, boardWrap} = this.embedded;
    this.boardElement.className = this.boardOriginalClass;
    this.boardElement.removeAttribute('data-puzzle-board');
    this.boardElement.inert = this.boardOriginalInert || false;
    this.boardElement.removeAttribute('aria-label');
    this.boardElement.replaceChildren(...this.boardChildren);
    this.embedded.restoreBoard?.();
    boardWrap.append(...this.boardExtras); this.placeholder.replaceWith(boardWrap);
    this.inertNodes.forEach(({node, inert}) => {node.inert = inert || false;});
    stage.classList.remove('learning-active'); this.background?.classList.remove('has-learning');
    if(this.reviewMeta){this.reviewMeta.removeAttribute('aria-hidden');this.reviewMeta.classList.add('meta-return');}
    this.background?.classList.remove('has-learning-morph3');
    this.doc.body.style.overflow = this.oldOverflow;
  }
  async load({render = true} = {}) {
    this.loadError = null; this.ready = false; if (render) this.render();
    try {
      const [response] = await Promise.all([fetch(this.url('data/learning/puzzles.json')), this.store.load()]);
      if (!response.ok) throw Error('Puzzle library could not be read.');
      const data = await response.json();
      if (data.schema !== 1 || !Array.isArray(data.puzzles) || !data.puzzles.length) throw Error('Puzzle library has an unsupported format.');
      this.puzzles = data.puzzles; this.ready = true;
    } catch (error) {this.loadError = error.message;}
    if (!this.closed && render) this.render();
  }
  async save(change) {
    try {await this.store.update(change); return true;} catch {return false;}
  }
  close() {return this.closePromise ||= this.finishClose();}
  async finishClose() {
    if (this.closed || this.closing) return;
    this.closing = true;
    this.cancelRunEnd?.();
    this.openingLibraryState = null;
    this.cancelRunStart?.();this.runStartSound?.close();
    this.puzzleRunNotice?.close(false);
    this.closeConceptNotice();
    this.pausePuzzleClock();
    if(this.pendingPuzzleTimeMs)await this.persist(()=>{});
    this.stopPuzzleAnalysis();
    // Commit the active challenge before leaving; the review can return immediately.
    // Update navigation before saving progress or animating the review back in.
    this.onClosing();
    if (this.run) await this.finishChallenge('Ended on return to review', false);
    if (this.failedChanges.length) await this.retrySave();
    this.cancelBoardInput?.(); this.cancelPuzzleSound(); this.cancelPuzzleReply(); this.cancelPieceTransition?.(); this.cancelRangeInput?.(); this.cancelEloAnimation(); this.closed = true; this.generation++; clearInterval(this.ticker); this.stopWorker();
    this.doc.removeEventListener('keydown', this.keyHandler, true);
    this.closeDropdown();
    this.doc.removeEventListener('pointerdown', this.dismissDropdown, true);
    this.doc.removeEventListener('focusin', this.dismissDropdown);
    this.navAnimation?.cancel();this.navObserver?.disconnect();
    if(this.repositionNavigation)this.doc.defaultView.removeEventListener('resize',this.repositionNavigation);
    if (this.embedded && this.shell) {
      const surfaces = capturePanels(this.panelSurfaces());
      const fromBoard = this.boardElement.getBoundingClientRect();
      // Reverse from the currently painted board, even if entry is unfinished.
      this.motionController?.abort();
      await this.morph;
      // Keep the live learning shell in its original context as it fades away.
      this.unmountEmbedded();
      await this.transitionPanels(surfaces, this.reviewNodes, {fromBoard, exiting:true});
    } else if (!this.embedded) {
      this.backgroundNodes?.forEach(({node,inert})=>{node.inert=inert||false;});
      if (this.background) this.background.inert = this.backgroundInert || false;
      this.doc.body.style.overflow = this.oldOverflow;
    }
    this.root.remove(); this.previousFocus?.focus(); this.onClose();
  }
  flipBoard() {
    if (this.closed || this.closing) return;
    if (this.activity) {
      this.flipped = !this.flipped;
      if(this.activity.kind==='opening') {
        this.activity.color=this.flipped?'b':'w';
        const resume={...this.activity};this.persist(p=>{p.resume=resume;});
      }
    }
    else if(this.result?.board)this.result.board.flipped=!this.result.board.flipped;
    else {this.homeBoardFlipped = !this.homeBoardFlipped; this.flipped = this.homeBoardFlipped ? !this.reviewFlipped : this.reviewFlipped;}
    this.render();
  }
  stopWorker() {
    this.worker?.terminate(); this.worker = null;
    for (const resolve of this.workerPending.values()) resolve({status:'inconclusive',feedback:'Validation was interrupted; no incorrect answer was recorded.'});
    this.workerPending.clear();
  }
  onKey(e) {
    if (this.closed) return;
    if(this.puzzleRunNotice) {
      e.stopImmediatePropagation();
      if(e.key==='Escape'){e.preventDefault();this.puzzleRunNotice.close(false);}
      else if(e.key==='Tab'){
        e.preventDefault();const buttons=[...this.puzzleRunNotice.element.querySelectorAll('button')],index=buttons.indexOf(this.doc.activeElement);
        buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
      }
      return;
    }
    if(this.conceptNotice) {
      e.stopImmediatePropagation();
      if(e.key==='Escape'){e.preventDefault();}
      else if((e.key==='Enter'||e.key===' ')&&this.conceptNotice.contains(this.doc.activeElement)&&this.doc.activeElement.matches('button:not(:disabled)')){
        e.preventDefault();this.doc.activeElement.click();
      }
      else if(e.key==='Tab'){
        e.preventDefault();const buttons=[...this.conceptNotice.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(this.doc.activeElement);
        buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
      }
      return;
    }
    if (e.key==='Escape'&&this.dropdown) {e.preventDefault();e.stopImmediatePropagation();this.closeDropdown(true);return;}
    if(e.key==='Escape'&&this.premove){e.preventDefault();e.stopImmediatePropagation();this.premove=null;this.render();return;}
    if(this.promotionPending) {
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.promotionPending=null;this.render();return;}
      if(e.key==='Tab') {const buttons=[...this.root.querySelectorAll('.learn-promotion button')];const index=buttons.indexOf(this.doc.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}
      if(e.key==='ArrowUp'||e.key==='ArrowDown'){const buttons=[...this.root.querySelectorAll('.promotion-options button')],index=buttons.indexOf(this.doc.activeElement),direction=this.root.querySelector('.learn-promotion')?.dataset.edge==='bottom'?-1:1;e.preventDefault();buttons[(index+(e.key==='ArrowUp'?-direction:direction)+buttons.length)%buttons.length]?.focus();}
      e.stopImmediatePropagation();return;
    }
    if (this.embedded) {
      const settings = this.doc.querySelector('#settings');
      if (settings && !settings.hidden && e.key==='Escape') {
        e.preventDefault(); e.stopImmediatePropagation();
        const toggle = this.doc.querySelector('[aria-label="Settings"]');
        if (toggle) {toggle.click(); toggle.focus({preventScroll:true});}
        else {settings.hidden = true; this.settingsLayoutChanged();}
        return;
      }
    }
    if (e.key==='Escape'&&this.page==='statistics') {e.preventDefault();e.stopImmediatePropagation();this.showPuzzleStatistics(false);return;}
    if (e.key === 'Escape') {e.preventDefault(); e.stopImmediatePropagation(); if (this.selected || this.marked.size) {this.selected = null; this.marked.clear(); this.render();} else this.close(); return;}
    if (e.key === 'Tab' && !this.embedded && !this.navigationButton) {
      const controls = [...this.root.querySelectorAll('button:not(:disabled), input, select, a[href]')].filter(n=>n.tabIndex>=0);
      const first = controls[0], last = controls.at(-1);
      if (e.shiftKey && (this.doc.activeElement === first || this.doc.activeElement === this.root || !this.root.contains(this.doc.activeElement))) {e.preventDefault(); last?.focus();}
      else if (!e.shiftKey && this.doc.activeElement === last) {e.preventDefault(); first?.focus();}
    }
    if(!this.activity&&!this.dropdown&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)
      &&(['ArrowLeft','ArrowRight'].includes(e.key)||e.target.closest?.('.learn-board'))
      &&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest?.('input,textarea,select,[contenteditable="true"],#settings')
      &&(this.root.contains(e.target)||e.target===this.doc.body||e.target===this.doc)) {
      e.preventDefault();e.stopImmediatePropagation();
      // History arrows must not restore a square's visible keyboard focus.
      if(this.doc.activeElement?.closest('.learn-square'))this.root.focus({preventScroll:true});
      if(['ArrowLeft','ArrowRight'].includes(e.key)&&!this.busy&&!this.transitioning&&!this.closing)this.stepHomePosition(this.homeIndex+(e.key==='ArrowLeft'?-1:1));
      return;
    }
    if(this.activity?.kind==='opening'&&!this.dropdown
      &&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)
      &&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest?.('input,textarea,select,[contenteditable="true"],#settings')
      &&(this.root.contains(e.target)||e.target===this.doc.body)) {
      e.preventDefault();e.stopImmediatePropagation();
      if(this.doc.activeElement?.closest('.learn-opening-controls'))this.doc.activeElement.blur();
      const a=this.activity,max=this.openingState.moves.length;
      this.stepOpening({ArrowLeft:a.ply-1,ArrowRight:a.ply+1,Home:0,End:max}[e.key],{restoreFocus:false});
      return;
    }
    // Puzzle arrows navigate analysis history, never focus or mark board squares.
    if(this.activity?.kind==='puzzle'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)
      &&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest?.('input,textarea,select,[contenteditable="true"],#settings')
      &&(this.root.contains(e.target)||e.target===this.doc.body)){
      e.preventDefault();e.stopImmediatePropagation();
      if(!e.target.closest?.('.puzzle-rating-toggle'))this.root.focus({preventScroll:true});
      const a=this.puzzleAnalysis;
      if(a){
        const index={ArrowLeft:a.index-1,ArrowRight:a.index+1,Home:0,End:a.line.length}[e.key];
        if(index!=null&&index>=0&&index<=a.line.length&&index!==a.index)this.stepPuzzleAnalysis(index);
      }
      return;
    }
    // Preserve review keyboard state while learning owns focus.
    if (!this.root.contains(e.target)) {if (!this.embedded && !this.navigationButton) e.stopImmediatePropagation(); return;}
    if (e.target.closest('.learn-board') && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault(); const nodes = [...this.root.querySelectorAll('.learn-square')], index = nodes.indexOf(e.target.closest('.learn-square'));
      const offset = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[e.key]; const next = nodes[index+offset];
      if (next) {nodes.forEach(n=>n.tabIndex=-1); next.tabIndex=0; next.focus(); this.boardFocus=next.dataset.square;}
    }
  }
  async navigate(page) {
    if ((this.busy && !this.run) || this.finishing || this.closed || this.closing) return;
    if (this.run) await this.finishChallenge('Ended on navigation',false);
    if (this.closed || this.closing) return;
    if (page==='home') page='puzzles';
    const library = page==='openings'&&this.page==='openings'&&this.activity?.kind==='opening' ? this.openingLibraryState : null;
    if (page!==this.page) this.openingLibraryState = null;
    this.puzzleRunNotice?.close(false);
    this.closeConceptNotice();
    this.pausePuzzleClock();
    if(this.pendingPuzzleTimeMs)await this.persist(()=>{});
    this.generation++; this.page = page; this.activity = null; this.result=null; this.runReplay=null; this.clearAnswer();
    if (!library) {this.filters.search = ''; this.filters.status = 'All';}
    await this.store.load();
    if (!this.closed) {
      this.scrollToTop();this.render();
      if (library) {
        this.root.scrollTop = library.root;
        if (this.shell) this.shell.scrollTop = library.shell;
        this.root.querySelector('.learn-main').scrollTop = library.main;
      }
    }
  }
  scrollToTop(showBoard = false) {
    if (!this.embedded) {this.root.scrollTop = 0; return;}
    this.shell.scrollTop = 0;
    const main = this.shell.querySelector('.learn-main'); if (main) main.scrollTop = 0;
    if (this.root.classList.contains('learn-stacked')) {
      this.root.scrollTop = showBoard ? 0 : Math.max(0,parseFloat(this.root.style.getPropertyValue('--learn-panel-y'))-16);
      return;
    }
    if (this.root.classList.contains('learn-stacked') && this.doc.defaultView.scrollY > 0) {
      (showBoard ? this.dock : this.shell).scrollIntoView?.({block:'start'});
    }
  }
  render({preservePickup=false,restoreFocus=true}={}) {
    const pickup=(preservePickup||this.opponentPlaying)&&this.cancelBoardInput?.active?.()?this.cancelBoardInput:null;
    if(!pickup)this.cancelBoardInput?.();
    this.cancelRangeInput?.();
    if(this.puzzleRunNotice)return;
    if (this.closed || !this.root || this.conceptNotice) return;
    this.cancelRunEnd?.();
    // Results and library pages share the scratch board; assemble it on return.
    const returningBoard=!this.activity&&this.displayedActivity?this.displayedBoard:null;
    this.cancelPieceTransition?.();
    this.closeDropdown(true);
    this.renderedBoard=null;
    this.root.querySelector('.learn-promotion')?.remove();
    const h = this.h, focused = this.doc.activeElement, focusKey = focused?.dataset?.focus;
    const selection = focused?.type === 'search' || focused?.type === 'text' ? [focused.selectionStart, focused.selectionEnd] : null;
    const inStatistics=this.page==='statistics';
    const header = this.navigationButton ? null : h('footer', {class:'learn-header learn-footer'},
      this.button(this.returnLabel,()=>this.close(), {'data-focus':'review'}));
    const footer = header ? [header] : [];
    const nav = this.navigation();
    const main = h('main',{class:'learn-main'});
    if (!this.ready) main.append(h('div',{class:'learn-empty',role:'status'}, this.heading(this.loadError?'Learning could not load':'Preparing your learning workspace…'), this.p(this.loadError||'Loading your saved progress and offline library.'), this.loadError && this.button('Try again',()=>this.load())));
    else {
      if (this.store.error || this.failedChanges.length) main.append(h('div',{class:'learn-storage-error',role:'alert'}, 'Your progress could not be saved or loaded. Practice is still available. ',this.button('Retry saving',async()=>{await this.retrySave(); this.render();})));
      if (this.result) main.append(this.resultView());
      else if (this.activity?.kind === 'lesson') main.append(this.lessonView());
      else if (this.activity?.kind === 'opening') main.append(this.openingView());
      else if (this.activity?.kind === 'puzzle') main.append(this.puzzleView());
      else if (this.page === 'concepts') main.append(this.conceptsView());
      else if (this.page === 'openings') main.append(this.openingsView());
      else if (inStatistics) main.append(this.puzzleStatisticsView());
      else main.append(this.puzzlesView());
    }
    if (this.embedded) {
      let column=main.querySelector('.learn-board-column');
      if(!column){
        this.flipped=this.homeBoardFlipped?!this.reviewFlipped:this.reviewFlipped;
        this.syncHomeHistory();
        column=this.board(this.homePosition.fen(),{interactive:!this.busy&&!this.transitioning,last:this.homeHistory[this.homeIndex].move?.lan});
      }
      if (column) {
        const board = column.querySelector('.learn-board');
        this.boardElement.className = this.boardOriginalClass+' learn-board';
        this.boardElement.classList.remove('analysis');
        this.boardElement.toggleAttribute('data-puzzle-board',board.hasAttribute('data-puzzle-board'));
        this.boardElement.setAttribute('aria-label', board.getAttribute('aria-label'));
        this.boardElement.replaceChildren(...board.childNodes);
        this.boardInfo.replaceChildren(...[...column.children].filter(node=>node!==board));
        column.remove();
      }
      this.boardElement.inert = false;
      const mainScroll = this.shell.querySelector('.learn-main')?.scrollTop || 0;
      const mounted=this.mountContent(this.shell,nav,main,footer);
      mounted.scrollTop = mainScroll;
      this.root.dataset.destination = this.page;
      this.positionCentered();
    } else this.mountContent(this.root,nav,main,footer);
    this.syncNavigation();
    if(this.runStartOverlay)(this.boardElement||this.root.querySelector('.learn-board'))?.append(this.runStartOverlay);
    if(this.puzzleAnalysis)this.paintPuzzleAnalysis();
    this.displayedBoard=this.renderedBoard || (this.embedded?.fen?{fen:this.embedded.fen,flipped:this.reviewFlipped}:null);
    this.displayedActivity=this.activity;
    if(returningBoard)this.arrangePuzzlePieces(returningBoard,this.displayedBoard);
    if(pickup)pickup.refresh(Object.fromEntries([...this.root.querySelectorAll('[data-square]')].map(n=>[n.dataset.square,n])));
    this.syncPuzzleElo();
    const target = focusKey && [...this.root.querySelectorAll('[data-focus]')].find(n=>n.dataset.focus===focusKey);
    if (restoreFocus) {
      if (target) {target.focus({preventScroll:true}); if (selection && target.setSelectionRange) target.setSelectionRange(...selection);}
      else if (!this.root.contains(this.doc.activeElement)) {
        if(this.activity?.kind==='puzzle')this.root.focus({preventScroll:true});
        else (this.embedded||this.navigationButton?this.root:header).querySelector('.learn-header button, button')?.focus({preventScroll:true});
      }
    }
    if(this.promotionPending) {
      const pending=this.promotionPending;
      const file=pending.moves[0].to.charCodeAt(0)-97;
      const bottom=(pending.moves[0].to[1]==='1')!==!!this.flipped;
      const picker=h('div',{class:'learn-promotion','data-edge':bottom?'bottom':'top',role:'dialog','aria-modal':'true','aria-label':'Choose promotion piece'},
        h('div',{class:'promotion-picker',style:'left:'+((this.flipped?7-file:file)*12.5)+'%'},h('div',{class:'promotion-options'},...['q','r','b','n'].map(piece=>pending.moves.find(m=>m.promotion===piece)).filter(Boolean).map(m=>
          h('button',{type:'button','aria-label':'Promote to '+NAMES[m.promotion],title:NAMES[m.promotion],onclick:()=>{
            if(this.promotionPending!==pending)return;this.promotionPending=null;
            if(pending.reply){
              const reply=pending.reply;
              if(this.closed||this.closing||this.activity!==reply.activity||this.generation!==reply.generation)return;
              if(this.pendingOpponent===reply){this.queuePuzzlePremove(m.lan);return;}
            }
            this.submitMove(m.lan);
          }},this.makePiece(m.promotion,m.color)))),this.button('Cancel',()=>{this.promotionPending=null;this.render();},{class:'promotion-cancel'})));
      (this.boardElement||this.root.querySelector('.learn-board')).append(picker);picker.querySelector('button').focus({preventScroll:true});
    }
  }
  navigation() {
    if(!this.nav){
      this.nav=this.h('nav',{class:'learn-nav','data-fluid':'','aria-label':'Learning destinations'},
        ...[['puzzles','Puzzles'],['openings','Openings'],['concepts','Concepts']].map(([id,label])=>
          this.button(label,()=>this.navigate(id),{'data-focus':id})),
        this.navIndicator=this.h('span',{class:'learn-nav-indicator','aria-hidden':'true'}));
      this.repositionNavigation=()=>this.syncNavigation();
      this.doc.defaultView.addEventListener('resize',this.repositionNavigation);
      if(this.doc.defaultView.ResizeObserver){
        this.navObserver=new this.doc.defaultView.ResizeObserver(this.repositionNavigation);this.navObserver.observe(this.nav);
      }
    }
    for(const button of this.nav.querySelectorAll('button')){
      button.toggleAttribute('aria-current',button.dataset.focus===(this.page==='statistics'?'puzzles':this.page));
      if(button.hasAttribute('aria-current'))button.setAttribute('aria-current','page');
      button.disabled=this.busy&&!this.run;
    }
    return this.nav;
  }
  syncNavigation() {
    const nav=this.nav,indicator=this.navIndicator,active=nav?.querySelector('[aria-current="page"]');
    if(!active||!nav.isConnected||!active.offsetWidth)return;
    const target={x:active.offsetLeft,y:active.offsetTop,width:active.offsetWidth,height:active.offsetHeight};
    const page=active.dataset.focus;
    const motion=this.puzzleMotionEnabled()&&typeof indicator.animate==='function';
    if(this.navPage===page&&JSON.stringify(this.navTarget)===JSON.stringify(target)){
      if(!motion)this.navAnimation?.cancel();return;
    }
    const rail=nav.getBoundingClientRect(),rect=indicator.getBoundingClientRect();
    const start={x:rect.left-rail.left-nav.clientLeft+nav.scrollLeft,y:rect.top-rail.top-nav.clientTop+nav.scrollTop,width:rect.width,height:rect.height};
    const swoop=motion&&this.navPage&&this.navPage!==page&&start.width>0;
    this.navAnimation?.cancel();this.navAnimation=null;
    Object.assign(indicator.style,{left:target.x+'px',top:target.y+'px',width:target.width+'px',height:target.height+'px'});
    nav.dataset.ready='true';this.navPage=page;this.navTarget=target;
    if(!swoop)return;
    // The leading edge flows ahead of the trailing edge, stretching one continuous
    // liquid shape. Sample its painted bounds first so rapid clicks redirect it smoothly.
    const right=target.x>start.x,lerp=(a,b,t)=>a+(b-a)*t;
    const frames=Array.from({length:25},(_,i)=>{
      const t=i/24,lead=1-(1-t)**3,trail=t*t*(3-2*t),wave=Math.sin(Math.PI*t);
      const left=lerp(start.x,target.x,right?trail:lead),end=lerp(start.x+start.width,target.x+target.width,right?lead:trail);
      const height=lerp(start.height,target.height,trail)*(1-.14*wave);
      return {offset:t,left:left+'px',top:(lerp(start.y+start.height/2,target.y+target.height/2,trail)-height/2)+'px',
        width:(end-left)+'px',height:height+'px',borderRadius:(9+13*wave)+'px'};
    });
    this.navAnimation=indicator.animate(frames,{duration:280,easing:'linear'});
  }
  async retrySave() {
    const pending = this.store.pending;
    const thinking=this.puzzleThinkingAt!=null;
    if(thinking)this.pausePuzzleClock();
    if (!pending.retry) {
      pending.retry = (async()=>{
        while (pending.changes.length) {
          if (!(await this.save(pending.changes[0]))) break;
          pending.changes.shift();
        }
      })();
    }
    const retry = pending.retry;
    try {await retry; if (!pending.changes.length) await this.store.load();}
    finally {if (pending.retry === retry) pending.retry = null; this.syncSaveWarning();if(thinking)this.readyPuzzleClock();}
  }
  syncSaveWarning() {
    const pending = this.store.pending, view = this.doc.defaultView;
    if (pending.warning && (!pending.changes.length || pending.warning.view !== view)) {
      pending.warning.view.removeEventListener('beforeunload', pending.warning.handler); pending.warning = null;
    }
    if (pending.changes.length && !pending.warning) {
      const handler = e => {if(pending.changes.length){e.preventDefault();e.returnValue='';}};
      view.addEventListener('beforeunload',handler); pending.warning = {view,handler};
    }
  }
  async persist(change) {
    const elapsed=this.pendingPuzzleTimeMs||0;
    this.pendingPuzzleTimeMs=0;
    if(elapsed){const update=change;change=p=>{update(p);p.puzzleTimeMs+=elapsed;};}
    if (this.failedChanges.length) {
      this.failedChanges.push(change); await this.retrySave(); return !this.failedChanges.includes(change);
    }
    const saved = await this.save(change);
    if (!saved) {this.failedChanges.push(change); this.syncSaveWarning();}
    return saved;
  }
  resumeLabel(resume) {
    if (resume.kind==='lesson') return 'Continue ' + (LESSONS.find(l=>l.id===resume.id)?.title || 'your concept lesson');
    if (resume.kind==='opening') return 'Continue ' + (OPENINGS.find(o=>o.id===resume.id)?.title || 'your opening course');
    return 'Continue your unfinished puzzle';
  }
  resume(r) {if (r.kind==='lesson') return this.startLesson(r.id,r); else if(r.kind==='opening') return this.startOpening(r.id,r); else {const p=this.puzzleById(r.id);if(p)return this.startPuzzleSelection([p],r,{adaptive:!!r.adaptive});else return this.navigate('puzzles');}}
  card(meta, title, copy, action, label = 'Open', extra = null) {
    return this.h('article',{class:'learn-library-row'},
      this.h('div',{class:'learn-row-copy'},meta&&this.h('span',{class:'learn-eyebrow'},meta),this.h('h3',{},title),copy&&this.p(copy),extra),this.button(label,action));
  }
  search() {return this.h('input',{type:'search',placeholder:'Search the library…',value:this.filters.search,'aria-label':'Search the library','data-focus':'search',oninput:e=>{this.filters.search=e.target.value;this.render();}});}
  select(label, key, options) {
    return this.h('div',{class:'learn-filter'},this.h('span',{id:'learn-label-'+key},label),
      this.dropdownField(label,key,this.filters[key],options.map(value=>[value,value]),value=>{this.filters[key]=value;this.render();},false,'learn-label-'+key));
  }
  closeDropdown(restoreFocus=false) {
    const open=this.dropdown;if(!open)return;
    this.dropdown=null;open.field.classList.remove('open');open.button.setAttribute('aria-expanded','false');
    if(restoreFocus)open.button.focus({preventScroll:true});
  }
  // Reuse the settings Coach picker's surfaces and accent colors, with listbox keyboard controls.
  dropdownField(label,key,value,options,onChange,disabled=false,labelId=null) {
    const h=this.h,id='learn-options-'+key,current=options.find(([v])=>v===value)||options[0];
    let field,button,typed='',typedAt=0;
    const menu=h('div',{class:'lib-dd-menu',id,role:'listbox','aria-label':label},...options.map(([v,text])=>
      h('button',{type:'button',class:'lib-dd-opt'+(v===value?' sel':''),role:'option','aria-selected':String(v===value),tabindex:'-1',onclick:e=>{
        e.stopPropagation();this.closeDropdown(true);onChange(v);
      }},text)));
    const choices=[...menu.children];
    const open=(index=options.findIndex(([v])=>v===value))=>{
      this.closeDropdown();
      this.doc.querySelectorAll('.lib-dd-field.open').forEach(node=>node.classList.remove('open'));
      field.classList.add('open');button.setAttribute('aria-expanded','true');this.dropdown={field,button};
      menu.style.transform='';
      const bounds=menu.getBoundingClientRect(),shift=Math.max(8-bounds.left,Math.min(0,this.doc.defaultView.innerWidth-8-bounds.right));
      if(shift)menu.style.transform=`translateX(${shift}px)`;
      const option=choices[Math.max(0,index)];option.focus({preventScroll:true});option.scrollIntoView?.({block:'nearest'});
    };
    button=h('button',{type:'button',class:'lib-dd-btn','aria-label':label,'aria-labelledby':labelId?labelId+' learn-value-'+key:null,'aria-describedby':labelId?null:'learn-value-'+key,
      'aria-haspopup':'listbox','aria-expanded':'false','aria-controls':id,'data-focus':key,disabled,onclick:e=>{
        e.stopPropagation();if(this.dropdown?.field===field)this.closeDropdown(true);else open();
      }},h('span',{class:'lib-dd-cur',id:'learn-value-'+key},current[1]),h('span',{class:'lib-dd-chev','aria-hidden':'true'},h('span',{class:'learn-dropdown-chevron'})));
    field=h('div',{class:'lib-dd-field learn-dropdown',onkeydown:e=>{
      if(disabled||e.ctrlKey||e.metaKey||e.altKey)return;
      const index=choices.indexOf(this.doc.activeElement),isOpen=this.dropdown?.field===field;
      let next;
      if(e.key==='ArrowDown')next=isOpen?(index+1)%choices.length:options.findIndex(([v])=>v===value);
      else if(e.key==='ArrowUp')next=isOpen?(index-1+choices.length)%choices.length:options.findIndex(([v])=>v===value);
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=choices.length-1;
      else if(e.key==='Tab'){
        // Put focus back on the trigger so the browser tabs to the adjacent control.
        this.closeDropdown(true);return;
      } else if(e.key.length===1&&e.key!==' '){
        const now=Date.now();typed=now-typedAt<700?typed+e.key:e.key;typedAt=now;
        const query=typed.toLowerCase(),prefix=[...query].every(c=>c===query[0])?query[0]:query;
        next=options.findIndex((_,offset)=>options[(Math.max(index,0)+1+offset)%options.length][1].toLowerCase().startsWith(prefix));
        if(next<0)return;next=(Math.max(index,0)+1+next)%options.length;
      }
      if(next!=null){e.preventDefault();e.stopPropagation();if(!isOpen)open(Math.max(0,next));else{choices[next].focus({preventScroll:true});choices[next].scrollIntoView?.({block:'nearest'});}}
    }},button,menu);
    return field;
  }
  matches(text) {return text.toLowerCase().includes(this.filters.search.toLowerCase());}
  empty(copy) {return this.h('div',{class:'learn-empty'},this.heading('Nothing here yet'),this.p(copy),this.button('Clear filters',()=>{for(const k of ['category','difficulty','theme','phase','status','family'])this.filters[k]='All';this.filters.search='';this.filters.rating='All ratings';this.render();}));}
  conceptsView() {
    const h = this.h, items = LESSONS.filter(l=>this.matches(l.title+' '+l.explanation+' '+l.category)
      && (this.filters.category==='All'||l.category===this.filters.category)
      && (this.filters.difficulty==='All'||DIFFICULTIES[l.level-1]===this.filters.difficulty));
    return h('div',{},this.heading('Concepts'),
      h('div',{class:'learn-filters'},this.search(),this.select('Category','category',['All',...CATEGORIES]),this.select('Level','difficulty',['All',...DIFFICULTIES])),
      items.length?h('div',{class:'learn-library'},...CATEGORIES.flatMap(category=>items.filter(l=>l.category===category).sort((a,b)=>a.level-b.level))
        .map(l=>this.card(l.category,l.title,l.exercises.length+' exercises · '+DIFFICULTIES[l.level-1],()=>this.showConceptNotice(),'Learn →'))):this.empty('Try another category or search term.'));
  }
  showConceptNotice() {
    if(this.conceptNotice)return;
    this.conceptNoticeFocus=this.doc.activeElement;
    this.conceptNoticeBackground=[...this.root.children].map(node=>({node,inert:node.inert}));
    this.conceptNoticeBackground.forEach(({node})=>{node.inert=true;});
    const h=this.h;
    const copy=h('p',{id:'learn-notice-copy','aria-live':'polite'},'Chess Review is a one-person project, and I’m still working on these lessons. I’m taking the time to make them clear, useful, and enjoyable. Thank you for your patience and for being here.');
    const accept=this.button('Fair enough',()=>this.closeConceptNotice(),{class:'learn-button primary learn-notice-accept'});
    const reject=this.button('Unacceptable',()=>{
      this.disposeConceptDodge?.();this.disposeConceptDodge=null;reject.disabled=true;
      const height=copy.getBoundingClientRect().height;if(height)copy.style.minHeight=height+'px';
      copy.textContent="Whoa, nice mouse speed! Why don't you use that in some of your bullet games?";
      accept.focus({preventScroll:true});
    },{class:'learn-button learn-notice-reject'});
    const arena=h('div',{class:'learn-notice-actions'},reject,accept);
    const card=h('div',{class:'learn-notice-card',role:'dialog','aria-modal':'true','aria-labelledby':'learn-notice-title','aria-describedby':'learn-notice-copy'},
      h('h2',{id:'learn-notice-title'},'Concept lessons are on the way'),
      copy,arena);
    this.conceptNotice=h('div',{class:'learn-notice-overlay'},card);
    this.root.append(this.conceptNotice);
    this.disposeConceptDodge=evasiveNoticeButton({arena,button:reject,safeButton:accept,view:this.doc.defaultView,card,eventSurface:this.conceptNotice});
    accept.focus();
  }
  closeConceptNotice() {
    if(!this.conceptNotice)return;
    this.disposeConceptDodge?.();this.disposeConceptDodge=null;
    this.conceptNotice.remove();this.conceptNotice=null;
    this.conceptNoticeBackground.forEach(({node,inert})=>{node.inert=inert||false;});
    this.conceptNoticeFocus?.focus({preventScroll:true});
  }
  async startLesson(id, resume = {}) {
    const lesson=LESSONS.find(l=>l.id===id);if(!lesson)return;
    if(!resume.tab&&this.filters.status==='Struggled') {
      const first=Object.entries(this.store.value.lessons[id]?.exercises||{}).find(([,e])=>e.struggled);
      if(first)resume={tab:'practise',exercise:+first[0]};
    }
    this.result=null;this.page='concepts';this.generation++;this.activity={kind:'lesson',id,tab:resume.tab||'understand',example:resume.example||0,ply:resume.ply||0,exercise:resume.exercise||0};
    this.scrollToTop(true);
    this.clearAnswer();
    await this.persist(p=>{const entry=p.lessons[id]||={status:'in progress',exercises:{}};if(entry.status!=='completed')entry.status='in progress';p.resume={...this.activity};});this.render();
  }
  async lessonTab(tab) {this.activity.tab=tab;this.clearAnswer();this.scrollToTop(true);await this.persist(p=>{p.resume={...this.activity};});this.render();}
  lessonExamples(lesson) {const contrast=lesson.exercises.find(e=>e.type==='choice');return [...lesson.examples,...(contrast?[{fen:contrast.fen,moves:[],captions:[contrast.explanation],highlights:[]}]:[])];}
  lessonView() {
    const a=this.activity,l=LESSONS.find(l=>l.id===a.id),h=this.h,record=this.store.value.lessons[l.id]||{exercises:{}};
    const tabs=h('div',{class:'learn-tabs'},...['understand','observe','practise'].map(t=>this.button(t[0].toUpperCase()+t.slice(1),()=>this.lessonTab(t),{'aria-pressed':a.tab===t?'true':'false',disabled:this.busy})));
    const head=h('div',{class:'learn-activity-head'},h('div',{class:'learn-topline'},this.button('← Lesson library',()=>this.navigate('concepts'),{disabled:this.busy}),h('span',{class:'learn-eyebrow'},l.category+' · '+DIFFICULTIES[l.level-1])),this.heading(l.title),h('div',{class:'learn-subline'},this.p(`${Object.values(record.exercises).filter(e=>e.passed).length}/${l.exercises.length} exercises passed`),tabs));
    if(a.tab==='understand')return h('div',{},head,h('div',{class:'learn-study'},this.board(l.examples[0].fen,{highlights:l.examples[0].highlights}),h('article',{class:'learn-panel learn-copy'},h('h3',{},'The idea'),this.p(l.explanation),h('h3',{},'Why it matters'),this.p(l.why),h('details',{class:'learn-notes'},h('summary',{},'Common mistakes'),h('ul',{},...l.mistakes.map(m=>h('li',{},m)))),l.prerequisites.length&&h('details',{class:'learn-notes'},h('summary',{},'Helpful first'),...l.prerequisites.map(id=>this.button(LESSONS.find(x=>x.id===id).title,()=>this.startLesson(id)))),this.button('See it on the board →',()=>this.lessonTab('observe'),{class:'learn-button primary'}))));
    if(a.tab==='observe') {
      const examples=this.lessonExamples(l),ex=examples[Math.min(a.example,examples.length-1)],c=new Chess(ex.fen),ply=Math.min(a.ply,ex.moves.length);
      for(const m of ex.moves.slice(0,ply))playUci(c,m);
      return h('div',{},head,h('div',{class:'learn-study'},this.board(c.fen(),{highlights:ex.highlights,last:ply?ex.moves[ply-1]:null}),h('article',{class:'learn-panel learn-copy'},h('h3',{},a.example<l.examples.length?'Watch the idea unfold':'A useful contrast'),this.p(ex.captions[ply]),this.moveNavigation(ply,ex.moves.length,async next=>{a.ply=next;await this.persist(p=>{p.resume={...a};});this.render();}),this.button('Next example',async()=>{a.example=(a.example+1)%examples.length;a.ply=0;await this.persist(p=>{p.resume={...a};});this.render();}),this.p(`Example ${a.example+1} of ${examples.length}`,'learn-small'),this.button('Put it into practice →',()=>this.lessonTab('practise'),{class:'learn-button primary'}))));
    }
    const ex=l.exercises[a.exercise],r=record.exercises[a.exercise];
    return h('div',{},head,h('div',{class:'learn-study'},this.board(this.exerciseFen||ex.fen,{interactive:!this.busy&&this.feedback?.status!=='correct'&&ex.type!=='choice',squareSelection:ex.type==='squares',highlights:this.revealedSquares||[],last:this.lastMove}),h('article',{class:'learn-panel learn-copy'},h('span',{class:'learn-eyebrow'},`Exercise ${a.exercise+1} of ${l.exercises.length} · ${ex.type==='squares'?'Select squares':ex.type==='choice'?'Read the position':'Play a move'}`),h('h3',{},ex.prompt),
      ex.type==='choice'?h('div',{class:'learn-options'},...ex.options.map((option,i)=>this.button(option,()=>this.submitExercise(i),{disabled:this.busy||this.feedback?.status==='correct'}))):ex.type==='squares'?h('div',{},this.p(ex.selection==='one'?'Choose one square.':'Select every matching square, then check your answer.'),this.button('Check selection',()=>this.submitExercise([...this.marked]),{disabled:!this.marked.size||this.busy||this.feedback?.status==='correct',class:'learn-button primary'})):this.moveInput(),
      this.feedbackView(),this.button('Show explanation',async()=>{this.feedback={status:'info',feedback:ex.explanation};this.revealedSquares=ex.type==='squares'?validSquares(ex):[];await this.persist(p=>{const e=p.lessons[l.id].exercises[a.exercise]||={};e.struggled=true;});this.render();},{disabled:this.busy||this.feedback?.status==='correct'}),
      this.button('Try again',()=>{this.clearAnswer();this.render();},{disabled:this.busy}),
      this.button(a.exercise+1<l.exercises.length?'Next exercise':'Revisit first exercise',async()=>{a.exercise=(a.exercise+1)%l.exercises.length;this.clearAnswer();await this.persist(p=>{p.resume={...a};});this.render();},{disabled:this.busy}),
      r?.struggled&&this.p('Saved for another visit. A clean correct answer clears this exercise from your difficult list.','learn-small'),
      record.status==='completed'&&h('div',{class:'learn-completion'},h('h3',{},'Lesson completed'),this.p('You have passed every exercise. Return any time to practise again.')))));
  }
  cancelPuzzleSound() {this.doc.defaultView.clearTimeout(this.puzzleSoundTimer);this.puzzleSoundTimer=null;}
  clearAnswer() {this.stopPuzzleAnalysis();this.cancelBoardInput?.();this.cancelPuzzleSound();this.cancelPuzzleReply();this.cancelPieceTransition?.();this.opponentPlaying=false;this.hintSquare=null;this.hintArrow=null;this.hintStep=null;this.promotionPending=null;this.boardMarks?.clear();this.boardArrows=[];this.feedback=null;this.wrongMove=null;this.puzzleResult=null;this.selected=null;this.marked.clear();this.exerciseFen=null;this.revealedSquares=null;this.lastMove=null;}
  async checkExercise(ex,answer) {
    // Bound detector work off the UI thread. Unsupported environments retain the
    // same pure validator; tests and rules-only exercises need no worker.
    if (ex.type!=='move'||!ex.objective.startsWith('event:')||typeof Worker==='undefined') return validateExercise(ex,answer);
    try {
      if(!this.worker){this.worker=new Worker(this.url('lib/learning/validation-worker.js'),{type:'module'});this.worker.onmessage=({data})=>{this.workerPending.get(data.id)?.(data.result);this.workerPending.delete(data.id);};this.worker.onerror=()=>this.stopWorker();}
      const id=++this.workerSeq;
      return await new Promise(resolve=>{const timer=setTimeout(()=>{this.workerPending.delete(id);this.stopWorker();resolve({status:'inconclusive',feedback:'Validation timed out. No incorrect answer was recorded.'});},15000);this.workerPending.set(id,r=>{clearTimeout(timer);resolve(r);});this.worker.postMessage({id,exercise:ex,answer});});
    } catch {this.stopWorker();return {status:'inconclusive',feedback:'The validator is unavailable. No incorrect answer was recorded.'};}
  }
  async submitExercise(answer) {
    if(this.busy||this.activity?.kind!=='lesson')return;
    const a=this.activity,l=LESSONS.find(l=>l.id===a.id),index=a.exercise,ex=l.exercises[index],generation=this.generation;
    this.busy=true;this.render();const r=await this.checkExercise(ex,answer);
    if(this.closed||generation!==this.generation){this.busy=false;return;}
    this.feedback=r;
    if(r.status==='correct'&&ex.type==='move'){const c=new Chess(ex.fen);playUci(c,answer);this.exerciseFen=c.fen();this.lastMove=answer;}
    if(['correct','incorrect'].includes(r.status)) await this.persist(p=>{const entry=p.lessons[l.id],e=entry.exercises[index]||={};if(r.status==='correct'){e.passed=true;e.struggled=false;}else{e.mistakes=(e.mistakes||0)+1;e.struggled=true;}entry.status=l.exercises.every((_,i)=>entry.exercises[i]?.passed)?'completed':'in progress';p.resume=entry.status==='completed'?null:{...a};});
    this.busy=false;this.render();
  }
  feedbackView() {return this.feedback?this.h('div',{class:'learn-feedback '+this.feedback.status,role:'status','aria-live':'polite'},
    this.feedback.title&&this.h('strong',{},this.feedback.title),this.h('div',{},this.feedback.feedback)):this.busy?this.p('Checking your answer…','learn-feedback'):null;}
  moveNavigation(index,total,action) {return this.h('div',{class:'learn-move-nav'},this.button('⏮',()=>action(0),{'aria-label':'First position',disabled:index===0}),this.button('←',()=>action(index-1),{'aria-label':'Previous position',disabled:index===0}),this.h('span',{},`${index} / ${total}`),this.button('→',()=>action(index+1),{'aria-label':'Next position',disabled:index===total}),this.button('⏭',()=>action(total),{'aria-label':'Last position',disabled:index===total}));}
  moveInput() {
    const input=this.h('input',{type:'text',placeholder:'Move, e.g. Nf3 or e2e4','aria-label':'Enter a chess move','data-focus':'move-input',autocomplete:'off'});
    const submit=e=>{e.preventDefault();let value=input.value.trim();if(!value)return;try{const c=new Chess(this.currentFen()),promotions=c.moves({verbose:true}).filter(m=>m.promotion&&(m.from+m.to===value||m.san.replace(/=[QRBN]/,'')===value));if(promotions.length){this.promotionPending={moves:promotions};this.render();return;}const m=/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value)?playUci(c,value):c.move(value);this.submitMove(m.lan);}catch{this.feedback={status:'illegal',feedback:'That move is not legal here. Use algebraic notation or select a piece and destination.'};this.render();}};
    return this.h('div',{},this.p('Select a piece and destination, drag a piece, or type a move.','learn-small'),this.h('form',{class:'learn-move-input',onsubmit:submit},input,this.h('button',{type:'submit',class:'learn-button',disabled:this.busy||['correct','completed','revealed'].includes(this.feedback?.status)},'Play')));
  }
  currentFen() {
    if(this.puzzleAnalysis)return this.puzzleAnalysis.chess.fen();
    const a=this.activity;if(!a)return this.result?.board?.fen||this.homePosition.fen();if(a.kind==='lesson')return LESSONS.find(l=>l.id===a.id).exercises[a.exercise].fen;
    if(a.kind==='puzzle'){const p=this.puzzleById(a.id),c=new Chess(p.fen);for(const m of p.solution.slice(0,a.step))playUci(c,m);return this.puzzleFen||c.fen();}
    return this.openingState.positions[a.ply];
  }
  syncHomeHistory() {
    const fen=this.homePosition.fen();
    if(this.homeHistory[this.homeIndex]?.fen!==fen){this.homeHistory=[{fen}];this.homeIndex=0;}
  }
  inputPosition(from,fen=this.currentFen()) {
    const c=new Chess(fen),color=c.get(from)?.color;
    if(!this.activity&&color&&color!==c.turn()) {
      const fields=c.fen().split(' ');fields[1]=color;fields[3]='-';
      c.load(fields.join(' '));
    }
    return c;
  }
  stepHomePosition(index) {
    if(this.activity||this.busy||this.closed||this.closing||this.transitioning)return;
    this.syncHomeHistory();
    if(!Number.isInteger(index)||index<0||index>=this.homeHistory.length||index===this.homeIndex)return;
    const entry=this.homeHistory[index],move=index<this.homeIndex?this.homeHistory[this.homeIndex].move:entry.move;
    this.cancelBoardInput?.();this.selected=null;this.promotionPending=null;
    this.homePosition.load(entry.fen);this.homeIndex=index;this.lastMove=entry.move?.lan||null;
    this.render();if(move)this.onFreeMove(move.san);
  }
  submitMove(value) {
    if(this.busy||this.closed||this.closing||this.transitioning)return;
    if(this.puzzleAnalysis)return this.submitAnalysisMove(value);
    if(!this.activity){
      this.syncHomeHistory();
      let move,c;try {c=this.inputPosition(value.slice(0,2));move=playUci(c,value);}catch {return;}
      if(move.captured==='k')return;
      this.homePosition.load(c.fen());
      this.homeHistory=this.homeHistory.slice(0,this.homeIndex+1);
      this.homeHistory.push({fen:c.fen(),move:{lan:move.lan,san:move.san}});this.homeIndex++;
      this.selected=null;this.lastMove=move.lan;this.render();this.onFreeMove(move.san);
    } else if(this.activity.kind==='lesson')return this.submitExercise(value);else if(this.activity.kind==='puzzle')return this.submitPuzzle(value);
  }
  board(fen,{interactive=false,squareSelection=false,highlights=[],hint=null,last=null,outcome=this.activity?.kind==='puzzle'&&!this.puzzleAnalysis?this:null}={}) {
    this.renderedBoard={fen,flipped:this.flipped};
    if(this.markupFen!==fen){this.boardMarks=new Set();this.boardArrows=[];this.markupFen=fen;}
    const h=this.h,c=new Chess(fen),files=this.flipped?[...'hgfedcba']:[...'abcdefgh'],ranks=this.flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
    const mated=matedKingSquare(c);
    const preview=this.premove?.preview;
    const board=h('div',{class:'learn-board','aria-label':!this.activity?'Free board. Either colour can move. Use Left and Right arrow keys for move history.':`${c.turn()==='w'?'White':'Black'} to move. Chessboard.`});
    if(this.activity?.kind==='puzzle'&&!this.puzzleAnalysis)board.dataset.puzzleBoard='';
    const position=(from=this.selected)=>this.inputPosition(from,(this.opponentPlaying&&this.pendingOpponent?.fen)||this.currentFen()||fen);
    const legalMoves=c=>c.moves({verbose:true}).filter(m=>this.activity||m.captured!=='k');
    const playerColor=()=>this.activity?.kind==='puzzle'&&!this.puzzleAnalysis?this.puzzleById(this.activity.id).fen.split(' ')[1]:position().turn();
    const selectable=piece=>piece&&(!this.activity||piece.color===playerColor());
    const pick=sq=>{
      this.boardFocus=sq;
      if(!interactive)return;
      this.premove=null;
      this.wrongMove=null;
      this.puzzleResult=null;
      if(squareSelection){if(this.marked.has(sq))this.marked.delete(sq);else{const ex=LESSONS.find(l=>l.id===this.activity.id).exercises[this.activity.exercise];if(ex.selection==='one')this.marked.clear();this.marked.add(sq);}this.render();return;}
      const c=position(),piece=c.get(sq);
      if(this.selected&&sq!==this.selected&&piece?.color!==c.turn()) {
        const promotion=(this.promotion||'q'),legal=legalMoves(c).find(m=>m.from===this.selected&&m.to===sq&&(!m.promotion||m.promotion===promotion));
        if(legal){this.selected=null;move(legal.from,legal.to);return;}
      }
      this.selected=this.selected===sq?null:selectable(piece)?sq:null;this.render();
    };
    const destinations=new Map(interactive&&!squareSelection&&this.selected?legalMoves(position()).filter(m=>m.from===this.selected).map(m=>[m.to,!!m.captured]):[]);
    const pointerInput = !!this.startDrag;
    const move = (from,to) => {
      const c=position(from);
      const moves=legalMoves(c).filter(m=>m.from===from&&m.to===to);
      if(!moves.length)return;
      if(this.activity?.kind==='puzzle'&&!this.puzzleAnalysis&&moves[0].color!==playerColor())return;
      if(this.busy&&(!this.opponentPlaying||!this.pendingOpponent))return;
      this.selected=null;
      if(moves.some(m=>m.promotion)) {
        this.promotionPending={moves,reply:this.busy?this.pendingOpponent:null}; this.render();
      } else if(this.busy)this.queuePuzzlePremove(moves[0].lan);
      else this.submitMove(moves[0].lan);
    };
    const down = (e,sq) => {
      if(!pointerInput || !interactive || this.busy&&!this.opponentPlaying)return;
      e.preventDefault();
      if(this.premove&&(e.button===0||e.button===2)){
        this.premove=null;this.render();if(e.button===2)return;
      }
      const live=this.boardElement||board, view=this.doc.defaultView;
      const currentBoard=()=>this.boardElement||this.root.querySelector('.learn-board')||live;
      const squares=()=>Object.fromEntries([...currentBoard().querySelectorAll('[data-square]')].map(n=>[n.dataset.square,n]));
      const squareAt=ev=>{
        const r=currentBoard().getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;
        if(x<0||y<0||x>=r.width||y>=r.height)return null;
        return files[Math.floor(x/r.width*8)]+ranks[Math.floor(y/r.height*8)];
      };
      const previousSelection=this.selected;
      this.cancelBoardInput?.();
      this.selected=previousSelection;
      if(e.button===2) {
        this.selected=null;Object.values(squares()).forEach(n=>n.classList.remove('selected','sel','legal','legal-cap'));
        const cleanup=()=>{view.removeEventListener('pointerup',up);view.removeEventListener('pointercancel',cleanup);view.removeEventListener('blur',cleanup);this.cancelBoardInput=null;};
        const up=ev=>{if(ev.pointerId!==e.pointerId)return;cleanup();const to=squareAt(ev);if(!to)return;
          this.boardMarks ||= new Set(); this.boardArrows ||= [];
          if(to===sq){if(this.boardMarks.has(sq))this.boardMarks.delete(sq);else this.boardMarks.add(sq);}
          else {const i=this.boardArrows.findIndex(a=>a.from===sq&&a.to===to);if(i>=0)this.boardArrows.splice(i,1);else this.boardArrows.push({from:sq,to});}
          this.render();};
        view.addEventListener('pointerup',up);view.addEventListener('pointercancel',cleanup);view.addEventListener('blur',cleanup);this.cancelBoardInput=cleanup;return;
      }
      if(e.button!==0)return;
      this.wrongMove=null;Object.values(squares()).forEach(n=>n.classList.remove('puzzle-wrong','puzzle-correct'));
      this.puzzleResult=null;live.querySelectorAll('.puzzle-result-badge').forEach(n=>{n.parentElement.classList.remove('has-badge');n.remove();});
      this.boardMarks?.clear();this.boardArrows=[];live.querySelector('.user-arrows')?.remove();
      Object.values(squares()).forEach(n=>n.classList.remove('marked'));
      if(squareSelection){pick(sq);return;}
      const c=position();
      if(this.selected && sq!==this.selected && legalMoves(c).some(m=>m.from===this.selected&&m.to===sq)){move(this.selected,sq);return;}
      const piece=new Chess(this.currentFen()||fen).get(sq);this.selected=previousSelection===sq?null:selectable(piece)?sq:null;
      const selection=()=>{
        const cells=squares(),c=position();
        Object.values(cells).forEach(n=>n.classList.remove('selected','sel','legal','legal-cap'));
        if(!this.selected)return;
        cells[this.selected]?.classList.add('sel');
        for(const m of legalMoves(c).filter(m=>m.from===this.selected))cells[m.to]?.classList.add(m.captured?'legal-cap':'legal');
      };
      selection();if(!piece)return;
      this.cancelBoardInput=this.startDrag(e,sq,{board:live,squares:squares(),fen:()=>position(sq).fen(),squareAt,move,deselect:()=>{this.selected=null;selection();}});
    };
    ranks.forEach((rank,ri)=>files.forEach((file,ci)=>{
      const sq=file+rank,piece=preview?.has(sq)?preview.get(sq):c.get(sq),light=(file.charCodeAt(0)-97+8-rank)%2===0;
      const node=h('button',{type:'button',class:'learn-square sq '+(light?'light':'dark')+(this.selected===sq||this.marked.has(sq)?(pointerInput&&!squareSelection?' sel':' selected'):'')+(this.boardMarks?.has(sq)?' marked':'')+(preview?.has(sq)?' premove':'')+(highlights?.includes(sq)?' annotated':'')+(!preview?.has(sq)&&last&&(last.slice(0,2)===sq||last.slice(2,4)===sq)?' last-move':''),
        'data-square':sq,'data-focus':'square-'+sq,tabindex:sq===(this.boardFocus||files[0]+ranks[0])?'0':'-1','aria-label':sq+(piece?`, ${piece.color==='w'?'White':'Black'} ${NAMES[piece.type]}`:', empty'),
        'aria-pressed':squareSelection?(this.marked.has(sq)?'true':'false'):null,onpointerdown:e=>down(e,sq),oncontextmenu:e=>e.preventDefault(),onclick:e=>{if(pointerInput&&e.detail)return;pick(sq);},ondragover:e=>{if(interactive)e.preventDefault();},ondrop:e=>{e.preventDefault();const from=e.dataTransfer.getData('text/plain');if(!interactive||squareSelection)return;move(from,sq);}});
      if(hint===sq&&!preview?.has(sq))node.classList.add('puzzle-hint-square');
      if(outcome?.wrongMove?.includes(sq))node.classList.add('puzzle-wrong');
      if(outcome?.puzzleResult?.status==='correct'&&[outcome.puzzleResult.from,outcome.puzzleResult.square].includes(sq))node.classList.add('puzzle-correct');
      if(ri===0)node.classList.add('top-row');if(ci===7)node.classList.add('right-col');
      if(outcome?.puzzleResult?.square===sq){node.classList.add('has-badge');node.append(puzzleResultBadge(this.doc,outcome.puzzleResult.status));}
      if(piece){const image=this.makePiece(piece.type,piece.color);image.draggable=!pointerInput&&interactive&&!squareSelection&&selectable(piece);image.addEventListener('dragstart',e=>{if(pointerInput){e.preventDefault();return;}e.dataTransfer.setData('text/plain',sq);});node.append(image);}
      if(ci===0)node.append(h('span',{class:'learn-coordinate rank','aria-hidden':'true'},rank));if(ri===7)node.append(h('span',{class:'learn-coordinate file','aria-hidden':'true'},file));
      if(destinations.has(sq)){if(pointerInput)node.classList.add(destinations.get(sq)?'legal-cap':'legal');else node.append(h('span',{class:'learn-legal-dot','aria-hidden':'true'}));}board.append(node);
    }));
    mateMark(board,mated?board.querySelector(`[data-square="${mated}"]`):null,mated,this.flipped);
    if(this.boardArrows?.length && this.embedded?.drawArrow){const svg=this.doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','user-arrows');svg.setAttribute('viewBox','0 0 8 8');svg.setAttribute('aria-hidden','true');svg.append(...this.boardArrows.map(a=>this.embedded.drawArrow(a.from,a.to,this.flipped)));board.append(svg);}
    if(!this.puzzleAnalysis&&this.activity?.kind==='puzzle'&&this.hintArrow)board.append(this.puzzleHintArrow(this.hintArrow));
    return h('div',{class:'learn-board-column'},board);
  }

  puzzlesView() {
    const h=this.h, items=this.filteredPuzzles();
    const [min,max]=this.puzzleRatingBounds();
    const range=this.puzzleRange || [min,max];
    const outputs=range.map((value,index)=>h('span',{'data-range-output':index},value));
    const paintRange=values=>{
      handles.forEach((input,i)=>{input.value=values[i];});
      track.style.setProperty('--range-low',(values[0]-min)/(max-min)*100+'%');
      track.style.setProperty('--range-high',(values[1]-min)/(max-min)*100+'%');
    };
    const updateRange=(index,value,smooth=false)=>{
      const next=[...(this.puzzleRange||range)];
      const clamped=index===0?Math.max(min,Math.min(value,next[1]-50)):Math.min(max,Math.max(value,next[0]+50));
      next[index]=Math.round(clamped/50)*50;
      const visual=[...next];if(smooth)visual[index]=clamped;
      paintRange(visual);
      if(this.puzzleRange?.every((value,i)=>value===next[i]))return;
      this.puzzleRange=next;
      handles.forEach((input,i)=>{input.setAttribute('aria-valuetext',next[i]+' rating');outputs[i].textContent=next[i];});
      this.updatePuzzleSelection();
    };
    const slider=(label,index)=>h('input',{type:'range',min,max,step:50,value:range[index],'aria-label':label,'aria-valuetext':range[index]+' rating','data-focus':'elo-'+index,
      oninput:e=>updateRange(index,Number(e.target.value))});
    const handles=[slider('Minimum',0),slider('Maximum',1)];
    const track=h('div',{class:'learn-dual-range',style:'--range-low:'+(range[0]-min)/(max-min)*100+'%;--range-high:'+(range[1]-min)/(max-min)*100+'%',
      onpointerdown:e=>{
        if(e.button!==0||e.isPrimary===false)return;
        e.preventDefault();this.cancelRangeInput?.();
        const bounds=track.getBoundingClientRect(),view=this.doc.defaultView;
        // Native range thumb centres travel between half-thumb insets, not the full width.
        const width=Math.max(1,bounds.width-20),value=x=>min+(x-bounds.left-10)/width*(max-min);
        const current=this.puzzleRange||range,target=handles.indexOf(e.target);
        const index=target>=0?target:Math.abs(value(e.clientX)-current[0])<=Math.abs(value(e.clientX)-current[1])?0:1;
        const offset=target>=0?e.clientX-(bounds.left+10+(current[index]-min)/(max-min)*width):0;
        let pendingX=null,frame=null;
        const flush=()=>{frame=null;if(pendingX!==null){updateRange(index,value(pendingX-offset),true);pendingX=null;}};
        const move=ev=>{
          if(ev.pointerId!==e.pointerId)return;
          pendingX=ev.clientX;
          if(frame===null)frame=view.requestAnimationFrame(flush);
        };
        const stop=ev=>{
          if(ev?.pointerId!==undefined&&ev.pointerId!==e.pointerId)return;
          if(ev?.type==='pointerup')pendingX=ev.clientX;
          if(frame!==null)view.cancelAnimationFrame(frame);
          flush();
          view.removeEventListener('pointermove',move);view.removeEventListener('pointerup',stop);view.removeEventListener('pointercancel',stop);view.removeEventListener('blur',stop);
          track.removeEventListener('lostpointercapture',stop);
          this.cancelRangeInput=null;track.classList.remove('is-dragging');
          handles.forEach(input=>{input.step=50;});paintRange(this.puzzleRange||range);
          if(track.hasPointerCapture?.(e.pointerId))track.releasePointerCapture(e.pointerId);
        };
        this.cancelRangeInput=stop;track.classList.add('is-dragging');
        handles.forEach(input=>{input.step='any';});
        handles[index].focus({preventScroll:true});track.setPointerCapture?.(e.pointerId);
        if(target<0)updateRange(index,value(e.clientX),true);
        view.addEventListener('pointermove',move);view.addEventListener('pointerup',stop);view.addEventListener('pointercancel',stop);view.addEventListener('blur',stop);
        track.addEventListener('lostpointercapture',stop);
      }},h('div',{class:'learn-range-rail','aria-hidden':'true'}),...handles);
    return h('div',{class:'learn-puzzles'},h('section',{class:'learn-puzzle-start'},
      h('div',{class:'learn-puzzle-heading'},this.heading('Puzzles'),
        this.button('Puzzle Statistics',()=>this.showPuzzleStatistics(true),{class:'learn-button learn-statistics-button','data-focus':'puzzle-statistics'})),
      h('div',{class:'puzzle-mode-grid','aria-label':'Puzzle game modes'},
        this.puzzleModeButton('Solve a puzzle','At your own pace',progressTotals(this.store.value).unique,'puzzles solved',()=>this.startRatedPuzzles(),{class:'learn-button puzzle-mode-button primary','data-focus':'solve-puzzle',disabled:!items.length&&!this.unfinishedPuzzle()}),
        ...Object.entries(PUZZLE_RUN_MODES).map(([mode,config])=>this.puzzleModeButton(config.name,config.description,runBest(this.store.value,mode),'personal best',()=>this.startPuzzleRun(mode),{'data-focus':mode,disabled:!items.length}))),
      this.ratedLibraryComplete&&this.button('Practise again',()=>this.startPuzzleSelection(items)),
      !items.length&&this.p('No puzzles match. Widen the rating range or choose another type.','learn-small')),
      h('section',{class:'learn-puzzle-options'},h('div',{class:'learn-list-heading'},h('h3',{},'Puzzle settings'),this.button('Reset',()=>{this.puzzleRange=null;this.puzzleThemes.clear();this.render();},{class:'learn-button learn-text-button'})),
        h('fieldset',{class:'learn-elo-range','aria-label':'Puzzle rating range'},h('output',{class:'learn-range-value','aria-label':'Selected rating range'},outputs[0],' – ',outputs[1],' rating'),track),
        h('fieldset',{class:'learn-theme-list'},h('legend',{},h('span',{},'Puzzle types'),
          h('span',{class:'learn-puzzle-count','data-puzzle-matches':'',role:'status'},PUZZLE_COUNT.format(items.length)+' puzzles available')),
          h('label',{class:'learn-theme-row'},h('input',{type:'checkbox',checked:!this.puzzleThemes.size,'data-focus':'theme-all',onchange:()=>{this.puzzleThemes.clear();this.render();}}),h('span',{},'All types')),
          ...Object.entries(THEME_NAMES).map(([theme,name])=>h('label',{class:'learn-theme-row'},
            h('input',{type:'checkbox',checked:this.puzzleThemes.has(theme),'data-focus':'theme-'+theme,onchange:e=>{if(e.target.checked)this.puzzleThemes.add(theme);else this.puzzleThemes.delete(theme);this.render();}}),h('span',{},name))))));
  }
  puzzleModeButton(name,description,score,label,action,attrs) {
    const details='puzzle-mode-'+attrs['data-focus']+'-details';
    return this.h('div',{class:'puzzle-mode'},
      this.h('button',{type:'button',class:'learn-button puzzle-mode-button primary',onclick:action,'aria-describedby':details,...attrs},this.h('span',{class:'puzzle-mode-name'},name)),
      this.h('div',{class:'puzzle-mode-info',id:details},this.h('span',{class:'puzzle-mode-description'},description),
        this.h('span',{class:'puzzle-mode-record'},this.h('span',{},label),this.h('strong',{},score))));
  }
  updatePuzzleSelection() {
    const count=this.puzzleLibrary.count(this.puzzles,this.puzzleRange,this.puzzleThemes);
    const button=this.root.querySelector('[data-focus="solve-puzzle"]');if(button)button.disabled=!count&&!this.unfinishedPuzzle();
    for(const mode of Object.keys(PUZZLE_RUN_MODES)){const runButton=this.root.querySelector('[data-focus='+mode+']');if(runButton)runButton.disabled=!count;}
    const label=this.root.querySelector('[data-puzzle-matches]');if(label)label.textContent=PUZZLE_COUNT.format(count)+' puzzles available';
  }
  showPuzzleStatistics(show) {
    if(this.busy||this.run||this.activity)return;
    this.page=show?'statistics':'puzzles';this.scrollToTop();this.render();
    this.root.querySelector(show?'.learn-puzzle-statistics h2':'[data-focus="puzzle-statistics"]')?.focus({preventScroll:true});
  }
  puzzleStatisticsView() {
    const h=this.h, stats=puzzleStatistics(this.store.value,this.puzzles);
    const percent=rate=>Math.round(rate*100)+'%';
    const seconds=Math.floor((this.store.value.puzzleTimeMs||0)/1000),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);
    const time=hours?`${hours}h ${minutes%60}m ${seconds%60}s`:minutes?`${minutes}m ${seconds%60}s`:`${seconds}s`;
    const total=(value,label,tone)=>h('div',{class:'learn-stat-metric '+tone},h('dt',{},label),h('dd',{},h('strong',{},value)));
    const row=type=>h('li',{class:'learn-stat-row','data-theme':type.theme},
      h('div',{class:'learn-stat-type'},h('span',{},type.name),
        h('span',{class:'learn-stat-detail'},`${type.clean} correct · ${type.needsWork} incorrect`)),
      h('strong',{class:'learn-stat-rate'},percent(type.rate??0)),
      h('div',{class:'learn-stat-track',role:'img','aria-label':`${type.clean} correct, ${type.needsWork} incorrect`},
        h('span',{class:'learn-stat-correct',style:`width:${type.attempts?type.rate*100:0}%`}),
        h('span',{class:'learn-stat-incorrect',style:`width:${type.attempts?(1-type.rate)*100:0}%`})));
    return h('section',{class:'learn-puzzle-statistics','aria-labelledby':'learn-statistics-title'},
      h('div',{class:'learn-puzzle-heading'},h('h2',{id:'learn-statistics-title',tabindex:'-1'},'Puzzle Statistics'),
        this.button('Return to puzzle overview',()=>this.showPuzzleStatistics(false),{class:'learn-button learn-statistics-button','data-focus':'puzzle-statistics'})),
      h('dl',{class:'learn-stat-overview'},total(stats.clean,'Correct','correct'),total(stats.needsWork,'Incorrect','incorrect'),total(stats.attempts,'Attempts','attempts'),total(time,'Time spent','time')),
      h('div',{class:'learn-stat-list-heading'},h('h3',{},'By puzzle type'),h('span',{},'Correct')),
      h('ul',{class:'learn-stat-types'},...stats.types.map(row)));
  }

  puzzleRatingBounds() {
    return this.puzzleLibrary.bounds(this.puzzles);
  }
  filteredPuzzles() {
    return this.puzzleLibrary.matching(this.puzzles,this.puzzleRange,this.puzzleThemes);
  }
  puzzleById(id) {return this.puzzleLibrary.find(this.puzzles,id);}
  shuffle(items) {const list=[...items];for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
  puzzleRatingView(puzzle = null) {
    const h=this.h,rating=normalizePuzzleRating(this.store.value.puzzleRating),result=puzzle&&this.store.value.puzzles[puzzle.id]?.ratingResult;
    const change=this.puzzleRatingEnabled() ? result&&this.activity?.rated ? result : this.skippedPuzzleRating : null;
    const enabled=this.puzzleRatingEnabled();
    return h('div',{class:'puzzle-rating-region','data-enabled':String(enabled),'aria-hidden':String(!enabled),inert:enabled?null:''},
      h('div',{class:'puzzle-rating-content'},h('section',{class:'puzzle-elo-panel','aria-label':'Your puzzle rating'},
      h('div',{class:'puzzle-elo-summary'},
        h('div',{class:'puzzle-elo-number'},h('strong',{'data-puzzle-elo':'','aria-label':rating.elo.toLocaleString()+' rating'},Math.round(this.displayedPuzzleElo??rating.elo).toLocaleString()),h('span',{},'Rating'))),
      change&&h('strong',{class:'puzzle-elo-change '+(change.won?'gain':'loss'),role:'status'},(change.delta>0?'+':'')+change.delta+' rating'))));
  }
  puzzleRatingToggle() {
    const h=this.h,enabled=this.puzzleRatingEnabled();
    // Reuse the live control so its transitions survive workspace renders.
    if(!this.ratingToggle)this.ratingToggle=this.button([
      h('span',{class:'puzzle-rating-label'},'Rating'),
      h('span',{class:'puzzle-rating-track','aria-hidden':'true'},h('span',{class:'puzzle-rating-thumb'},h('span',{class:'puzzle-rating-tick'})))
    ],()=>this.togglePuzzleRating(),{class:'learn-button puzzle-rating-toggle',role:'switch','aria-label':'Puzzle rating','data-focus':'puzzle-rating-toggle'});
    this.ratingToggle.setAttribute('aria-checked',String(enabled));
    this.ratingToggle.disabled=this.busy||!!this.ratingSaving;
    return this.ratingToggle;
  }
  puzzleRatingEnabled() {return this.store.value.puzzleRatingEnabled!==false;}
  async togglePuzzleRating() {
    if(this.busy||this.ratingSaving||this.closed||this.closing)return;
    const enabled=!this.puzzleRatingEnabled(),activity=this.activity?.kind==='puzzle'?this.activity:null;
    this.ratingSaving=true;this.skippedPuzzleRating=null;
    // Once an attempt becomes unrated, reenabling rating starts with the next puzzle.
    if(!enabled&&activity)activity.rated=false;
    // Update only the rating controls: rebuilding the workspace interrupts motion
    // and briefly disables every other button while this preference is saved.
    this.store.value.puzzleRatingEnabled=enabled;
    this.puzzleRatingToggle();
    const region=this.root?.querySelector('.puzzle-rating-region');
    if(region){
      region.dataset.enabled=String(enabled);
      region.setAttribute('aria-hidden',String(!enabled));
      region.toggleAttribute('inert',!enabled);
      region.querySelector('.puzzle-elo-change')?.remove();
    }
    const saved=await this.persist(progress=>{
      progress.puzzleRatingEnabled=enabled;
      if(!enabled&&activity)for(const key of ['resume','puzzleResume'])if(progress[key]?.id===activity.id)progress[key].rated=false;
    });
    this.ratingSaving=false;
    if(!saved)this.store.value.puzzleRatingEnabled=!enabled;
    if(!this.closed&&!this.closing){
      if(saved)this.puzzleRatingToggle();
      else this.render();
    }
  }
  cancelEloAnimation() {
    if(this.eloFrame!=null)this.doc.defaultView.cancelAnimationFrame?.(this.eloFrame);
    this.eloFrame=null;this.eloMotion=null;
    this.root?.querySelectorAll('.puzzle-elo-panel').forEach(n=>delete n.dataset.eloMotion);
  }
  syncPuzzleElo() {
    if(!this.root||this.closed)return;
    const view=this.doc.defaultView,elo=normalizePuzzleRating(this.store.value.puzzleRating).elo;
    const counters=this.root.querySelectorAll('[data-puzzle-elo]');
    if(!counters.length){this.cancelEloAnimation();this.displayedPuzzleElo=null;this.eloTarget=null;return;}
    const paint=value=>{
      this.displayedPuzzleElo=value;
      this.root.querySelectorAll('[data-puzzle-elo]').forEach(n=>{n.textContent=Math.round(value).toLocaleString();n.setAttribute('aria-label',elo.toLocaleString()+' rating');});
      this.root.querySelectorAll('.puzzle-elo-panel').forEach(n=>{if(this.eloMotion)n.dataset.eloMotion=this.eloMotion;else delete n.dataset.eloMotion;});
    };
    if(this.displayedPuzzleElo==null||!this.puzzleMotionEnabled()||!view.requestAnimationFrame){this.cancelEloAnimation();this.eloTarget=elo;paint(elo);return;}
    if(this.eloFrame!=null&&this.eloTarget===elo){paint(this.displayedPuzzleElo);return;}
    const from=this.displayedPuzzleElo;this.cancelEloAnimation();this.eloTarget=elo;
    if(from===elo){paint(elo);return;}
    this.eloMotion=elo>from?'gain':'loss';
    const start=view.performance.now(),duration=elo>from?900:350;
    const tick=now=>{
      if(this.closed||this.closing){this.cancelEloAnimation();return;}
      const progress=this.puzzleMotionEnabled()?Math.min(1,Math.max(0,(now-start)/duration)):1;
      paint(from+(elo-from)*(1-Math.pow(1-progress,3)));
      if(progress<1)this.eloFrame=view.requestAnimationFrame(tick);
      else {this.eloFrame=null;this.eloMotion=null;paint(elo);}
    };
    paint(from);this.eloFrame=view.requestAnimationFrame(tick);
  }
  unfinishedPuzzle() {
    const resume=this.store.value.puzzleResume;
    const puzzle=resume&&this.puzzleById(resume.id);
    return puzzle&&Number.isInteger(resume.step)&&resume.step>=0&&resume.step<puzzle.solution.length&&resume.step%2===0 ? {puzzle,resume} : null;
  }
  async startRatedPuzzles() {
    if(this.busy||this.run||this.closing||this.closed||this.startingRated)return;
    this.startingRated=true;const generation=this.generation;
    try {
      await this.store.load();
      if(this.closed||this.closing||generation!==this.generation)return;
      this.puzzleLibrary.invalidate();
      const unfinished=this.unfinishedPuzzle();
      if(unfinished)return await this.startPuzzleSelection([unfinished.puzzle],unfinished.resume,{adaptive:!!unfinished.resume.adaptive});
      const puzzle=pickRatedPuzzle(this.filteredPuzzles(),this.store.value);
      if(!puzzle){this.ratedLibraryComplete=true;await this.navigate('puzzles');return;}
      this.ratedLibraryComplete=false;
      return await this.startPuzzleSelection([puzzle],null,{adaptive:true});
    } finally {this.startingRated=false;}
  }
  async startPuzzleSelection(items,resume=null,{adaptive=false}={}) {
    if(this.busy||this.closed||this.closing)return;
    this.puzzleLibrary.invalidate();
    if(!items.length){this.feedback=null;this.activity=null;this.page='puzzles';this.filters.status='Mistakes';this.render();return;}
    this.skippedPuzzleRating=null;
    this.adaptivePuzzles=adaptive;this.adaptiveSeen=new Set(items.length===1?[items[0].id]:[]);
    this.result=null;this.page='puzzles';this.queue=this.shuffle(items);this.queueIndex=0;this.generation++;this.scrollToTop(true);await this.preparePuzzle(this.queue[0],resume);
  }
  mountContent(container,nav,main,footer) {
    const previous=container.querySelector(':scope > .learn-main');
    const before=previous?.querySelector(':scope > .puzzle-session'),after=main.querySelector(':scope > .puzzle-session');
    if(before&&after&&before.tagName===after.tagName){
      // Keep the navigation and its ancestors connected: detaching even the same
      // button clears hover and restarts its transition during the opening move.
      const navigation=before.querySelector('.puzzle-session-navigation');
      before.className=after.className;
      for(const child of [...before.children])if(child!==navigation)child.remove();
      for(const child of [...after.children])if(!child.classList.contains('puzzle-session-navigation'))before.append(child);
      for(const child of [...previous.children])if(child!==before)child.remove();
      for(const child of [...main.children])if(child!==after)previous.insertBefore(child,before);
      main=previous;
    } else {
      const replacement=main.querySelector('[data-focus=puzzle-overview]');
      if(replacement&&replacement!==this.overviewButton)replacement.replaceWith(this.overviewButton);
    }
    const children=[nav,main,...footer];
    for(const child of [...container.children])if(!children.includes(child))child.remove();
    children.forEach((child,index)=>{
      if(container.children[index]!==child)container.insertBefore(child,container.children[index]||null);
    });
    return main;
  }
  puzzleOverviewButton() {
    // Keep the live button through setup renders so hovering does not restart its styles.
    if(!this.overviewButton)this.overviewButton=this.button('Return to puzzle overview',async()=>{
      if(this.busy&&!this.puzzleIntroducing||this.finishing)return;
      if(this.puzzleIntroducing){
        this.puzzleIntroducing=false;this.busy=false;this.generation++;
        this.cancelPuzzleReply();this.cancelPieceTransition?.();
      }
      if(this.run)await this.finishChallenge('Ended on return to puzzles',false);
      await this.navigate('puzzles');
    },{class:'learn-button learn-statistics-button','data-focus':'puzzle-overview'});
    this.overviewButton.disabled=!!this.finishing||this.busy&&!this.puzzleIntroducing;
    // mountContent keeps the connected control in place while rebuilding its siblings.
    return this.overviewButton.isConnected?this.overviewButton.cloneNode(true):this.overviewButton;
  }
  async replayRunPuzzle(id) {
    const result=this.result||this.runReplay;
    if(this.busy||this.run||!result?.mode||this.closed||this.closing)return;
    const puzzle=this.puzzleById(id);
    if(!puzzle||!result.results.some(r=>r.id===id))return;
    const from=this.displayedBoard;
    this.runReplay=result;
    this.replayPuzzleId=id;
    this.pausePuzzleClock();this.clearAnswer();this.generation++;
    this.result=null;
    this.activity={kind:'puzzle',id,step:0,replay:true,rated:false,assisted:false,mistakes:0};
    this.puzzleFen=puzzle.fen;this.puzzleMoves=[];this.solutionPly=0;this.attemptRecorded=false;
    this.flipped=puzzle.fen.split(' ')[1]==='b';
    this.render();
    await this.arrangePuzzlePieces(from,this.displayedBoard);
  }
  returnToRunResults() {
    if(this.busy||!this.runReplay)return;
    this.pausePuzzleClock();this.stopPuzzleAnalysis();this.cancelPuzzleReply();this.generation++;
    this.result=this.runReplay;this.runReplay=null;this.activity=null;this.clearAnswer();this.scrollToTop();this.render();
    const number=this.result.results.find(r=>r.id===this.replayPuzzleId)?.number;
    this.root.querySelector(`[data-focus="replay-${number}"]`)?.focus({preventScroll:true});
  }
  async preparePuzzle(puzzle,resume=null) {
    const from=this.displayedBoard;
    this.pausePuzzleClock();
    this.busy=true;this.puzzleIntroducing=true;this.clearAnswer();this.hintSquare=null;this.puzzleFen=null;this.solutionPly=0;this.attemptRecorded=false;
    // Keep saved mistakes and assistance while replaying the full puzzle line.
    const step=0;
    this.puzzleMoves=[];
    this.activity={kind:'puzzle',id:puzzle.id,step,assisted:!!resume?.assisted,mistakes:resume?.mistakes||0,
      replay:!!this.runReplay,rated:!this.runReplay&&!this.run?.mode&&this.puzzleRatingEnabled()&&(resume?.rated ?? canRatePuzzle(this.store.value,puzzle)),adaptive:!!this.adaptivePuzzles};
    this.flipped=puzzle.fen.split(' ')[1]==='b';
    const activity=this.activity,setup=this.puzzleSetup(puzzle),generation=this.generation;
    const current=()=>!this.closed&&!this.closing&&this.activity===activity&&this.generation===generation;
    this.puzzleFen=setup?puzzle.setup.fen:this.solutionFen(puzzle,step);
    if(setup)this.feedback={status:'info',feedback:'Opponent’s move'};
    this.render();
    const arranging=this.arrangePuzzlePieces(from,this.displayedBoard);
    const attempt={...this.activity};
    if(!this.run&&!attempt.replay)await this.persist(p=>{p.resume={...attempt};p.puzzleResume={...attempt};});
    if(!current())return;
    // Persisted assistance or an old resumed mistake can never become a win.
    if(attempt.rated&&(attempt.mistakes||attempt.assisted))await this.persist(progress=>ratePuzzle(progress,puzzle,false,attempt.mistakes?'wrong':'hint'));
    await arranging;
    if(!current())return;
    if(this.run?.introPending){
      this.run.introPending=false;
      if(!await this.showPuzzleRunStart()||!current())return;
    }
    let opponent=null;
    if(setup){
      opponent=this.beginOpponentReply(puzzle.fen);
      this.opponentPlaying=true;this.render();
      if(this.puzzleMotionEnabled()&&!await this.waitForPuzzleReply(450))return;
      if(!current())return;
      this.puzzleFen=puzzle.fen;this.lastMove=puzzle.setup.move;this.render();
      this.onPuzzleMove(setup.san);
      await this.animatePuzzleReply(puzzle.setup.move);
      if(!current())return;
      this.feedback=null;
    }
    this.puzzleIntroducing=false;this.opponentPlaying=false;this.busy=false;this.render({preservePickup:true});if(this.run){this.run.clock?.ready();this.updateClock();}
    this.readyPuzzleClock();
    this.settleOpponentReply(opponent,true);
  }
  puzzleSetup(puzzle) {
    if(!puzzle.setup?.fen||!puzzle.setup?.move)return null;
    try {
      const position=new Chess(puzzle.setup.fen),move=playUci(position,puzzle.setup.move);
      return position.fen()===puzzle.fen?move:null;
    } catch {return null;}
  }
  async arrangePuzzlePieces(from,to) {
    this.cancelPieceTransition?.();
    const board=this.boardElement||this.root.querySelector('.learn-board');
    if(!from||!to||!board?.animate||!board.getBoundingClientRect().width||!this.puzzleMotionEnabled())return;
    const routes=pieceRoutes(from.fen,to.fen,{fromFlipped:from.flipped,toFlipped:to.flipped});
    if(routes.every(r=>r.from.x===r.to.x&&r.from.y===r.to.y))return;
    const transition=slidePuzzlePieces(board,routes,this.makePiece);
    const cancel=()=>transition.cancel();
    this.cancelPieceTransition=cancel;
    try {await transition.finished;}
    finally {if(this.cancelPieceTransition===cancel)this.cancelPieceTransition=null;}
  }
  puzzleView() {
    if(this.activity.replay)return this.resultView(this.runReplay);
    const h=this.h,a=this.activity,p=this.puzzleById(a.id),done=['completed','revealed'].includes(this.feedback?.status);
    const analysis=this.puzzleAnalysis;
    const fen=analysis?analysis.chess.fen():done&&this.feedback.status==='revealed'?this.solutionFen(p,this.solutionPly):this.puzzleFen||this.solutionFen(p,a.step);
    const board=this.board(fen,{interactive:!this.puzzleRunStarting()&&(!!analysis||!done&&(!this.busy||this.opponentPlaying)),hint:analysis?null:this.hintSquare,last:analysis?analysis.line[analysis.index-1]:this.lastMove});
    if(analysis)board.classList.add('has-puzzle-analysis');
    this.puzzlePracticeStatus(p);
    return h('div',{class:'puzzle-session'},
      h('div',{class:'puzzle-session-navigation'},this.puzzleOverviewButton()),
      h('div',{class:'puzzle-practice-heading'},this.heading(this.run?.mode?PUZZLE_RUN_MODES[this.run.mode].name:this.run?'Timed challenge':'Puzzle practice'),!this.run?.mode&&this.puzzleRatingToggle()),
      this.run?.mode?this.puzzleRunView():this.run&&h('div',{class:'learn-timer',role:'timer','aria-label':'Time remaining'},h('strong',{id:'learn-clock'}),this.button('Finish challenge',()=>this.finishChallenge('Ended early'),{disabled:this.busy})),
      h('div',{class:'puzzle-session-body'},
      !this.run?.mode&&this.puzzleRatingView(p),
      h('div',{class:'learn-study'},board),
      this.puzzleActionControls(done),
      !this.run?.mode&&this.practiceStatus,
      !this.run?.mode&&this.feedback?.status==='completed'&&this.button(analysis?'Analysing':'Analyse',()=>this.startPuzzleAnalysis(),{class:'learn-button puzzle-analyse',disabled:this.busy||!!analysis,'data-focus':'puzzle-analyse'}),
      analysis&&h('div',{class:'puzzle-analysis-status',role:'status','aria-live':'polite',hidden:!analysis.error},analysis.error),
      analysis&&this.button('Retry analysis',()=>{this.releaseAnalysisEngine();this.analysisRequest=this.requestPuzzleAnalysis();},{class:'learn-button puzzle-analysis-retry',hidden:!analysis.error})));
  }
  puzzlePracticeStatus(p,{keepTurn=false}={}) {
    const done=['completed','revealed'].includes(this.feedback?.status);
    // Keep the solver's colour visible through setup, accepted moves and replies.
    const showTurn=keepTurn||!done&&(!this.feedback||this.feedback.status==='info');
    const status=showTurn?(p.fen.split(' ')[1]==='w'?'White to move':'Black to move'):this.feedback?.title || (this.replyPending?'Opponent’s turn':this.feedback?.feedback||'');
    if(!this.practiceStatus)this.practiceStatus=this.h('div',{role:'status','aria-live':'polite'});
    const statusClass='puzzle-practice-status '+(showTurn?'puzzle-turn-cue':this.feedback?.status||'')+(!showTurn&&(this.feedback?.status==='info'||this.feedback?.status==='illegal')?' puzzle-quiet-status':'');
    if(this.practiceStatus.className!==statusClass)this.practiceStatus.className=statusClass;
    if(this.practiceStatus.textContent!==status)this.practiceStatus.textContent=status;
    return this.practiceStatus;
  }
  puzzleActionControls(done) {
    if(this.run?.mode||this.activity?.replay)return null;
    if(done)return this.h('div',{class:'puzzle-practice-actions'},this.button('Next puzzle →',()=>this.nextPuzzle(),{class:'learn-button primary',disabled:this.busy}));
    if(!this.puzzleActions){
      this.hintButton=this.button('Hint',()=>this.hintPuzzle(),{class:'learn-button puzzle-hint','data-focus':'puzzle-hint'});
      this.skipButton=this.button('Skip',()=>this.skipPuzzle(),{class:'learn-button puzzle-skip','data-focus':'puzzle-skip'});
      this.puzzleActions=this.h('div',{class:'puzzle-practice-actions'},this.hintButton,this.skipButton);
    }
    this.hintButton.disabled=this.busy;this.skipButton.disabled=this.busy;
    return this.puzzleActions;
  }
  startPuzzleAnalysis() {
    if(this.busy||this.run?.mode||this.activity?.replay||this.closed||this.closing||this.feedback?.status!=='completed'||this.puzzleAnalysis)return;
    const puzzle=this.puzzleById(this.activity.id);
    this.cancelBoardInput?.();this.selected=null;this.promotionPending=null;this.boardMarks?.clear();this.boardArrows=[];
    this.pauseChallengeClock();
    this.puzzleAnalysis={initialFen:puzzle.fen,chess:new Chess(puzzle.fen),line:[...this.puzzleMoves],index:0,score:null,best:null};
    this.analysisRequest=this.requestPuzzleAnalysis();
  }
  releaseAnalysisEngine() {
    this.analysisToken=(this.analysisToken||0)+1;
    this.analysisEngine?.terminate();this.analysisEngine=null;this.analysisEnginePromise=null;
  }
  stopPuzzleAnalysis() {
    this.releaseAnalysisEngine();this.puzzleAnalysis=null;
    this.analysisBar?.remove();this.analysisBar=null;
  }
  puzzleAnalysisSettingsKey() {
    const s=this.settings();return JSON.stringify([s.enginePath,s.engineDepth,s.engineHash,s.engineSkill]);
  }
  async getAnalysisEngine() {
    if(this.analysisEngine&&!this.analysisEngine.dead)return this.analysisEngine;
    if(!this.analysisEnginePromise){
      const pending=Promise.resolve().then(()=>{
        if(!this.createAnalysisEngine)throw Error('Stockfish is unavailable.');
        return this.createAnalysisEngine();
      }).then(engine=>{
        if(this.analysisEnginePromise!==pending){engine.terminate();throw Error('Analysis cancelled');}
        this.analysisEngine=engine;return engine;
      });
      this.analysisEnginePromise=pending;
    }
    const pending=this.analysisEnginePromise;
    try{return await pending;}finally{if(this.analysisEnginePromise===pending)this.analysisEnginePromise=null;}
  }
  async requestPuzzleAnalysis() {
    const a=this.puzzleAnalysis;if(!a)return;
    const token=this.analysisToken=(this.analysisToken||0)+1,fen=a.chess.fen();
    const valid=()=>!this.closed&&!this.closing&&this.puzzleAnalysis===a&&token===this.analysisToken&&a.chess.fen()===fen;
    this.analysisSettingsKey=this.puzzleAnalysisSettingsKey();
    this.analysisEngine?.cancelPending();this.analysisEngine?.stop();
    a.best=null;a.score=null;a.error=null;a.pending=true;
    const terminal=a.chess.isCheckmate()?{mate:a.chess.turn()==='w'?-1:1}:a.chess.isDraw()?{cp:0}:null;
    if(terminal){a.score=terminal;a.pending=false;this.render({preservePickup:true});return;}
    this.render({preservePickup:true});
    const apply=result=>{
      if(!valid())return;
      const score=result?.score;
      if(!score||!(Number.isFinite(score.cp)||Number.isFinite(score.mate)))return false;
      const sign=fen.split(' ')[1]==='w'?1:-1;
      a.score=score.mate!=null?{mate:score.mate*sign}:{cp:score.cp*sign};
      const move=result.bestmove||result.pv?.split(' ')[0];
      a.best=a.chess.moves({verbose:true}).some(m=>m.lan===move)?move:null;
      this.paintPuzzleAnalysis();return true;
    };
    try {
      const engine=await this.getAnalysisEngine();if(!valid())return;
      const history={initialFen:a.initialFen,moves:a.chess.history({verbose:true}).map(m=>m.lan)};
      // Match game review's activeEval/activeBest: only completed searches drive
      // the bar and arrow. Early iterations can swing wildly even when exact.
      const result=await engine.analyse(fen,this.settings().engineDepth||16,1,history);
      if(valid()&&!apply(result))throw Error('No evaluation returned');
    } catch {
      if(valid()){a.best=null;a.score=null;a.error='Analysis is unavailable. You can still move the pieces.';}
    } finally {
      if(valid()){a.pending=false;this.paintPuzzleAnalysis();}
    }
  }
  submitAnalysisMove(value) {
    const a=this.puzzleAnalysis;let move;
    try {move=playUci(a.chess,value);}catch{return;}
    a.line=a.line.slice(0,a.index);a.line.push(move.lan);a.index++;
    this.selected=null;this.onPuzzleMove(move.san);this.analysisRequest=this.requestPuzzleAnalysis();
  }
  stepPuzzleAnalysis(index) {
    const a=this.puzzleAnalysis;if(!a||!Number.isInteger(index)||index<0||index>a.line.length)return;
    this.cancelBoardInput?.();this.selected=null;this.promotionPending=null;
    a.chess.load(a.initialFen);
    for(const move of a.line.slice(0,index))playUci(a.chess,move);
    a.index=index;this.analysisRequest=this.requestPuzzleAnalysis();
  }
  paintPuzzleAnalysis() {
    const a=this.puzzleAnalysis;if(!a||this.closed||this.closing)return;
    const board=this.boardElement||this.root.querySelector('.learn-board');
    const mount=this.embedded?.boardWrap||board?.closest('.learn-board-column');if(!mount)return;
    // As in the review bar, retain the same fill node so CSS can interpolate.
    // Pending positions hold the previous value instead of jumping back to 50%.
    if(!this.analysisBar)this.analysisBar=this.h('div',{role:'img'},this.h('div',{class:'white-fill',style:'height:50%'}),this.h('span',{class:'score top'}),this.h('span',{class:'score bot'},'…'));
    const bar=this.analysisBar;
    if(bar.parentElement!==mount)mount.prepend(bar);
    bar.className='puzzle-analysis-evalbar evalbar eb-'+(this.settings().barStyle||'classic')+(this.flipped?' flipped':'');
    const score=a.score;
    const label=a.error?'Evaluation unavailable':!score?'Evaluation pending':score.mate!=null?'Evaluation: '+(a.chess.isCheckmate()?'checkmate':(score.mate>0?'White':'Black')+' mates in '+Math.abs(score.mate)):'Evaluation: '+(score.cp/100).toFixed(2)+' pawns for White';
    bar.title=label;bar.setAttribute('aria-label',label);
    if(score){
      const cp=score.cp??(score.mate>0?600:-600);
      const share=score.mate!=null?(score.mate>0?100:0):50+Math.max(-600,Math.min(600,cp))/600*46;
      const text=score.mate!=null?(a.chess.isCheckmate()?'#':`M${Math.abs(score.mate)}`):(Math.abs(cp)/100).toFixed(2);
      bar.style.setProperty('--score-chars',text.length);
      bar.querySelector('.white-fill').style.height=share+'%';
      bar.querySelector('.score.top').textContent=cp<0?text:'';
      bar.querySelector('.score.bot').textContent=cp>=0?text:'';
    }
    const arrow=board.querySelector('.puzzle-analysis-arrow');
    if(!a.best||arrow?.dataset.move!==a.best||arrow?.dataset.flipped!==String(this.flipped)){
      arrow?.remove();
      if(a.best){const next=this.puzzleHintArrow(a.best,'Best move');next.dataset.move=a.best;next.dataset.flipped=String(this.flipped);board.append(next);}
    }
    const status=this.root.querySelector('.puzzle-analysis-status');
    if(status){status.textContent=a.error||'';status.hidden=!a.error;}
    const retry=this.root.querySelector('.puzzle-analysis-retry');if(retry)retry.hidden=!a.error;
  }
  puzzleHintArrow(move,label='Hint') {
    const svg=this.doc.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','best-arrow '+(label==='Hint'?'puzzle-hint-arrow':'puzzle-analysis-arrow'));svg.setAttribute('viewBox','0 0 8 8');
    svg.setAttribute('role','img');svg.setAttribute('aria-label',label+': '+move.slice(0,2)+' to '+move.slice(2,4));
    if(this.embedded?.drawBestArrow)svg.append(this.embedded.drawBestArrow(move.slice(0,2),move.slice(2,4),this.flipped));
    else {
      const point=sq=>[this.flipped?7.5-(sq.charCodeAt(0)-97):sq.charCodeAt(0)-96.5,this.flipped?Number(sq[1])-.5:8.5-Number(sq[1])];
      const [x,y]=point(move.slice(0,2)),[tx,ty]=point(move.slice(2,4)),length=Math.hypot(tx-x,ty-y);
      const path=this.doc.createElementNS(svg.namespaceURI,'path');
      path.setAttribute('d','M0,-.12 H'+(length-.5)+' V-.35 L'+length+',0 L'+(length-.5)+',.35 V.12 H0 Z');
      path.setAttribute('transform','translate('+x+' '+y+') rotate('+(Math.atan2(ty-y,tx-x)*180/Math.PI)+')');path.setAttribute('fill','var(--accent)');path.setAttribute('opacity','.8');svg.append(path);
    }
    return svg;
  }
  cancelPuzzleReply() {
    this.premove=null;
    this.settleOpponentReply(this.pendingOpponent,false);
    this.replyAnimation?.cancel();this.replyAnimation=null;
    this.doc.defaultView.clearTimeout(this.replyTimer);this.replyTimer=null;
    this.releaseReply?.(false);this.releaseReply=null;this.replyPending=false;
  }
  waitForPuzzleReply(delay=800) {
    if(this.pendingOpponent?.fastForward)return Promise.resolve(true);
    if(this.run?.mode==='timeAttack')delay=Math.min(delay,this.feedback?.status==='incorrect'?180:80);
    this.replyPending=true;
    return new Promise(resolve=>{this.releaseReply=resolve;this.replyTimer=this.doc.defaultView.setTimeout(()=>{this.replyTimer=null;this.releaseReply=null;this.replyPending=false;resolve(true);},delay);});
  }
  puzzleMotionEnabled() {return this.settings().moveAnim!==false&&!this.doc.defaultView.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
  puzzleMoveDuration() {
    const duration=moveAnimationDuration(this.settings());
    return this.run?.mode==='timeAttack'?Math.max(24,Math.min(100,duration*.4)):duration;
  }
  beginOpponentReply(fen) {
    this.settleOpponentReply(this.pendingOpponent,false);
    let resolve;const ready=new Promise(release=>{resolve=release;});
    return this.pendingOpponent={fen,ready,resolve,activity:this.activity,generation:this.generation,fastForward:false};
  }
  settleOpponentReply(reply,ready) {
    if(!reply)return;
    if(this.pendingOpponent===reply)this.pendingOpponent=null;
    reply.resolve(ready);
  }
  async queuePuzzlePremove(value) {
    const reply=this.pendingOpponent;
    if(!reply||!this.opponentPlaying||this.activity?.kind!=='puzzle'||this.puzzleAnalysis||this.puzzleRunStarting())return;
    const before=new Chess(reply.fen),after=new Chess(reply.fen);
    let move;try{move=playUci(after,value);}catch{return;}
    if(move.color!==this.puzzleById(this.activity.id).fen.split(' ')[1])return;
    const preview=new Map();
    for(const row of before.board())for(const cell of row){
      if(!cell)continue;
      const next=after.get(cell.square);
      if(next?.type!==cell.type||next?.color!==cell.color)preview.set(cell.square,next);
    }
    for(const row of after.board())for(const cell of row){
      if(cell&&!before.get(cell.square))preview.set(cell.square,cell);
    }
    const request={reply,value,preview};this.premove=request;this.selected=null;this.render();
    // Time attack retains its immediate reply completion for fast input.
    if(this.run?.mode==='timeAttack'){
      reply.fastForward=true;
      this.doc.defaultView.clearTimeout(this.replyTimer);this.replyTimer=null;
      const release=this.releaseReply;this.releaseReply=null;this.replyPending=false;release?.(true);
      this.replyAnimation?.finish();
    }
    const ready=await reply.ready;
    if(this.premove!==request)return;
    this.premove=null;
    if(!ready||this.closed||this.closing||this.busy||this.activity!==reply.activity||this.generation!==reply.generation)return;
    this.render();
    if(!new Chess(this.currentFen()).moves({verbose:true}).some(m=>m.lan===value))return;
    return this.submitMove(value);
  }
  animatePuzzleReply(move) {
    if(!this.puzzleMotionEnabled()||this.pendingOpponent?.fastForward)return;
    const duration=this.puzzleMoveDuration();
    const animations=[];
    const slide=(fromSquare,toSquare)=>{
      if(this.premove?.preview.has(toSquare))return;
      const from=this.root.querySelector('[data-square="'+fromSquare+'"]'),to=this.root.querySelector('[data-square="'+toSquare+'"]');
      const piece=to?.querySelector('.piece-img, img');if(!from||!piece?.animate)return;
      const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();to.classList.add('puzzle-reply-target');
      const animation=piece.animate([{transform:'translate('+(a.x-b.x)+'px,'+(a.y-b.y)+'px)'},{transform:'translate(0,0)'}],{duration,easing:MOVE_ANIMATION_EASING});
      animations.push(animation);animation.finished.catch(()=>{}).finally(()=>to.classList.remove('puzzle-reply-target'));
    };
    const from=move.slice(0,2),to=move.slice(2,4);slide(from,to);
    if(new Chess(this.currentFen()).get(to)?.type==='k'&&Math.abs(from.charCodeAt(0)-to.charCodeAt(0))===2)slide((to[0]==='g'?'h':'a')+to[1],(to[0]==='g'?'f':'d')+to[1]);
    const animation={cancel:()=>animations.forEach(a=>a.cancel()),finish:()=>animations.forEach(a=>{try{if(a.finish)a.finish();else a.cancel();}catch{a.cancel();}})};
    this.replyAnimation=animation;
    return Promise.allSettled(animations.map(a=>a.finished)).finally(()=>{if(this.replyAnimation===animation)this.replyAnimation=null;});
  }
  solutionFen(p,ply) {const c=new Chess(p.fen);for(const m of p.solution.slice(0,ply))playUci(c,m);return c.fen();}
  async submitPuzzle(value) {
    if(this.closed||this.closing||this.activity?.kind!=='puzzle')return;
    if(this.busy||this.attemptRecorded||this.run?.clock?.expired()){if(this.run?.clock?.expired())await this.finishChallenge('Time is up');return;}
    const a=this.activity,p=this.puzzleById(a.id);this.busy=true;this.pauseChallengeClock();
    this.cancelPuzzleSound();this.cancelPuzzleReply();
    const generation=this.generation;let replyMove=null,opponent=null;
    const answer=validatePuzzleMove(p,a.step,value);
    if(answer.status==='correct'||answer.status==='incorrect')this.skippedPuzzleRating=null;
    this.selected=null;this.wrongMove=null;this.puzzleResult=null;
    if(answer.status==='correct') {
      this.puzzleResult={status:'correct',from:answer.move.from,square:answer.move.to};
      this.puzzleMoves.push(answer.move.lan);
      this.onPuzzleMove(answer.move.san);
      if(this.run)this.run.correctMoves++;this.lastMove=value;this.puzzleFen=answer.fen;a.step++;
      this.hintSquare=null;this.hintArrow=null;this.hintStep=null;
      if(!answer.terminal&&a.step<p.solution.length){
        const c=new Chess(this.puzzleFen),reply=playUci(c,p.solution[a.step]);
        this.feedback={status:'info',title:'Correct move',feedback:'Opponent’s turn'};
        // Save the stable position after the forced reply. Closing during the pause
        // keeps the accepted move without leaving an odd-ply resume or a live timer.
        const snapshot={...a,step:a.step+1};
        opponent=this.beginOpponentReply(c.fen());this.opponentPlaying=true;
        const waiting=this.waitForPuzzleReply();this.render();
        if(!this.run&&!a.replay)await this.persist(p=>{p.resume={...snapshot};p.puzzleResume={...snapshot};});
        if(!await waiting||this.closed||this.closing||generation!==this.generation||this.activity!==a){this.busy=false;return;}
        this.puzzleResult=null;
        replyMove=p.solution[a.step];this.lastMove=replyMove;this.puzzleFen=c.fen();a.step++;
        this.puzzleMoves.push(replyMove);
        this.onPuzzleMove(reply.san);
      }
      if(answer.terminal||a.step>=p.solution.length) {
        this.onPuzzleSuccess();
        this.feedback={status:'completed',title:a.mistakes?'Puzzle completed':a.assisted?'Completed with assistance':'Solved!',feedback:a.mistakes?'You finished the line. The rating loss stays; further attempts do not change it.':a.assisted?'Review the idea and try another puzzle without help.':'You found the complete continuation.'};
        // Paint the accepted position in the drop event, before storage can yield
        // and expose the old origin square after the drag ghost is released.
        this.render();
        await this.recordAttempt(true,false);
      } else {this.feedback={status:'info',title:'Your turn',feedback:'Your opponent has replied.'};}
    } else {
      this.feedback=answer;
      if(answer.status==='incorrect'){
        this.puzzleResult={status:'incorrect',square:value.slice(0,2)};
        a.mistakes++;if(this.run)this.run.mistakes++;
        this.wrongMove=[value.slice(0,2),value.slice(2,4)];this.onPuzzleWrong();
        if(this.run?.mode){
          this.feedback={status:'incorrect',title:'Life lost',feedback:'Next puzzle'};
          await this.recordAttempt(false,false);
          if(this.activity===a)await this.advancePuzzleRun();
          return;
        }
        this.feedback={status:'incorrect',title:'Wrong move',feedback:'That move is not the puzzle continuation. The position is restored. '+(a.rated?'Your first mistake counts once; further attempts do not cost more rating.':'This is an unrated retry. Your rating stays the same.')};
        const snapshot={...a},timed=!!this.run;
        this.render();
        if(!a.replay)await this.persist(progress=>{
          if(snapshot.rated)ratePuzzle(progress,p,false,'wrong');
          const r=progress.puzzles[snapshot.id]||={clean:0,assisted:0,mistakes:0,attempts:0,struggled:false};
          r.struggled=true;if(!timed){progress.resume={...snapshot};progress.puzzleResume={...snapshot};}
        });
      }
    }
    if(replyMove){
      this.render();await this.animatePuzzleReply(replyMove);
      if(this.closed||this.closing||generation!==this.generation||this.activity!==a)return;
    }
    if(this.closed||this.closing||generation!==this.generation||this.activity!==a)return;
    if(this.run?.mode&&this.attemptRecorded){await this.advancePuzzleRun();return;}
    this.opponentPlaying=false;this.busy=false;this.render({preservePickup:true});this.run?.clock?.ready();this.updateClock();
    this.readyPuzzleClock();
    this.settleOpponentReply(opponent,true);
  }
  async recordAttempt(completed,skipped) {
    if(this.attemptRecorded)return;this.attemptRecorded=true;
    this.pausePuzzleClock();
    const a={...this.activity},puzzle=this.puzzleById(a.id);
    if(a.replay)return;
    if(this.run?.mode){
      const run=this.run;
      if(completed)run.solved++;
      else {run.lives--;run.missed.push(a.id);}
      run.results.push({id:a.id,number:run.results.length+1,correct:completed,rating:puzzle.rating});
      const score=run.solved,mode=run.mode;
      // Save each score immediately, including when the browser closes mid-run.
      if(completed&&run.bestEligible)await this.persist(p=>{p.bests[mode]=Math.max(runBest(p,mode),score);});
      return;
    }
    if(this.run){if(completed){if(a.assisted)this.run.assisted++;else this.run.solved++;}if(skipped)this.run.skips++;if(a.mistakes||a.assisted||skipped)this.run.missed.push(a.id);}
    await this.persist(p=>{
      if(a.rated)ratePuzzle(p,puzzle,completed&&!a.assisted&&!a.mistakes,skipped?'skip':a.mistakes?'wrong':a.assisted?'solution':'solved');
      recordPuzzle(p,a.id,{completed,skipped,assisted:a.assisted,mistakes:a.mistakes});if(p.resume?.id===a.id)p.resume=null;
      if(!this.run&&p.puzzleResume?.id===a.id)p.puzzleResume=null;
    });
  }
  async hintPuzzle() {
    if(this.run?.mode||this.activity?.replay)return;
    if(this.busy||this.attemptRecorded||this.run?.clock?.expired()){if(this.run?.clock?.expired())await this.finishChallenge('Time is up');return;}
    this.skippedPuzzleRating=null;
    const a=this.activity,p=this.puzzleById(a.id),value=p.solution[a.step];a.assisted=true;
    this.hintLevel=this.hintStep===a.step?Math.min(2,this.hintLevel+1):1;this.hintStep=a.step;
    this.hintSquare=value.slice(0,2);this.hintArrow=this.hintLevel===2?value:null;
    this.feedback={status:'info',feedback:this.hintArrow?'Move '+value.slice(0,2)+' to '+value.slice(2,4)+'.':'Move the '+NAMES[new Chess(this.currentFen()).get(this.hintSquare).type]+' on '+this.hintSquare+'.'};
    this.busy=true;this.pauseChallengeClock();const snapshot={...a},timed=!!this.run;
    if(!a.replay)await this.persist(progress=>{if(snapshot.rated)ratePuzzle(progress,p,false,'hint');if(!timed){progress.resume={...snapshot};progress.puzzleResume={...snapshot};}});
    this.busy=false;this.render();this.run?.clock?.ready();this.updateClock();
    this.readyPuzzleClock();
  }
  async revealPuzzle() {
    if(this.run?.mode||this.activity?.replay)return;
    if(this.run?.clock?.expired()){await this.finishChallenge('Time is up');return;}
    if(this.busy||this.attemptRecorded)return;this.busy=true;this.pauseChallengeClock();this.activity.assisted=true;this.hintSquare=null;this.hintArrow=null;this.solutionPly=0;
    this.puzzleResult=null;
    await this.recordAttempt(true,false);this.feedback={status:'revealed',feedback:'Solution revealed. This is saved as an assisted solution.'};this.busy=false;this.render();this.run?.clock?.ready();this.updateClock();
  }
  async skipPuzzle() {
    if(this.run?.mode||this.activity?.replay)return;
    if(this.run?.clock?.expired()){await this.finishChallenge('Time is up');return;}
    if(this.busy||this.attemptRecorded)return;
    const puzzle=this.puzzleById(this.activity.id),before=normalizePuzzleRating(this.store.value.puzzleRating).elo;
    this.busy=true;this.pauseChallengeClock();this.feedback=null;this.wrongMove=null;this.puzzleResult=null;this.render();
    await this.recordAttempt(false,true);
    const result=this.store.value.puzzles[puzzle.id]?.ratingResult;
    this.skippedPuzzleRating=result&&result.after<before?result:null;
    this.busy=false;await this.nextPuzzle();
  }
  async nextPuzzle() {
    if(this.run?.clock?.expired()){await this.finishChallenge('Time is up');return;}
    if(this.busy||!this.attemptRecorded)return;
    if(this.runReplay){this.returnToRunResults();return;}
    this.cancelBoardInput?.();this.promotionPending=null;this.selected=null;this.stopPuzzleAnalysis();
    this.busy=true;this.pauseChallengeClock();this.hintSquare=null;
    if(this.run?.mode){
      const puzzle=pickRunPuzzle(this.run.puzzles,this.run.results);
      if(!puzzle){await this.finishChallenge('All puzzles completed');return;}
      this.queue.push(puzzle);this.queueIndex++;
      await this.preparePuzzle(puzzle);return;
    }
    if(this.adaptivePuzzles){
      await this.store.load();const puzzle=pickRatedPuzzle(this.filteredPuzzles(),this.store.value,{seen:this.adaptiveSeen});
      if(this.closed||this.closing){this.busy=false;return;}
      if(puzzle){this.adaptiveSeen.add(puzzle.id);this.queue.push(puzzle);}
      else this.ratedLibraryComplete=true;
    }
    if(++this.queueIndex>=this.queue.length){this.busy=false;if(this.run)await this.finishChallenge('All puzzles in this run are complete');else{this.activity=null;this.feedback=null;this.page='puzzles';this.render();}return;}
    await this.preparePuzzle(this.queue[this.queueIndex]);
  }
  async startChallenge(duration) {
    if(this.busy||this.run||this.closed||this.closing)return;
    this.challengeSetup=null;this.result=null;this.run={duration,clock:new ChallengeClock(duration),solved:0,assisted:0,mistakes:0,skips:0,correctMoves:0,missed:[]};
    await this.startPuzzleSelection(this.puzzles);
    clearInterval(this.ticker);this.ticker=setInterval(()=>{if(this.run?.clock?.expired()&&!this.busy)this.finishChallenge('Time is up');else this.updateClock();},200);
  }
  readyPuzzleClock() {
    if(this.puzzleThinkingAt!=null||this.closed||this.closing||this.busy||this.activity?.kind!=='puzzle'||this.activity.replay||this.attemptRecorded||this.puzzleAnalysis)return;
    this.puzzleThinkingAt=this.doc.defaultView.performance.now();
  }
  pausePuzzleClock() {
    if(this.puzzleThinkingAt==null)return;
    const elapsed=Math.max(0,this.doc.defaultView.performance.now()-this.puzzleThinkingAt);
    this.puzzleThinkingAt=null;
    this.pendingPuzzleTimeMs=(this.pendingPuzzleTimeMs||0)+elapsed;
  }
  pauseChallengeClock() {this.pausePuzzleClock();if(!this.run?.mode)this.run?.clock?.pause();}
  showPuzzleRunNotice() {
    return new Promise(resolve=>{
      const h=this.h,focus=this.doc.activeElement;
      this.closeDropdown(true);
      const background=[...this.root.children].map(node=>({node,inert:node.inert}));
      background.forEach(({node})=>{node.inert=true;});
      const close=accepted=>{
        element.remove();this.puzzleRunNotice=null;
        background.forEach(({node,inert})=>{node.inert=inert||false;});
        focus?.focus({preventScroll:true});resolve(accepted);
      };
      const card=h('div',{class:'puzzle-run-notice-card',role:'dialog','aria-modal':'true','aria-labelledby':'puzzle-run-notice-title','aria-describedby':'puzzle-run-notice-copy'},
        h('h2',{id:'puzzle-run-notice-title'},'Personal best disabled'),
        h('p',{id:'puzzle-run-notice-copy'},
          'Use “All types” and the full rating range to set a record.'),
        h('div',{class:'learn-inline'},this.button('Cancel',()=>close(false),{'data-focus':'run-notice-cancel'}),
          this.button('Continue',()=>close(true),{class:'learn-button primary','data-focus':'run-notice-continue'})));
      const element=h('div',{class:'puzzle-run-notice-overlay',onclick:e=>{if(e.target===element)close(false);}},card);
      this.puzzleRunNotice={element,close};this.root.append(element);
      card.querySelector('[data-focus=run-notice-continue]').focus();
    });
  }
  async startPuzzleRun(mode,{again=false}={}) {
    const config=PUZZLE_RUN_MODES[mode];
    if(!config||!this.ready||this.busy||this.run||this.closed||this.closing||this.startingPuzzleRun)return;
    this.startingPuzzleRun=true;
    try {
      this.puzzleLibrary.invalidate();
      const themes=new Set(this.puzzleThemes),bounds=this.puzzleRatingBounds(),range=[...(this.puzzleRange||bounds)];
      const ratingRestricted=range[0]>bounds[0]||range[1]<bounds[1],bestEligible=!themes.size&&!ratingRestricted;
      if(!bestEligible&&!(again&&this.result?.mode===mode)){
        if(!await this.showPuzzleRunNotice())return;
      }
      if(mode==='timeAttack'){
        this.runStartSound ||= createRunStartSound(this.doc.defaultView,()=>this.settings());
        this.runStartSound.prime();
      }
      await this.store.load();
      if(this.busy||this.run||this.closed||this.closing)return;
      const puzzles=this.puzzles.filter(p=>p.rating>=range[0]&&p.rating<=range[1]
        &&(!themes.size||p.themes.some(theme=>themes.has(theme))));
      const puzzle=pickRunPuzzle(puzzles);
      if(!puzzle)return;
      this.run={mode,puzzles,bestEligible,introPending:mode==='timeAttack',duration:config.duration,clock:config.duration?new ChallengeClock(config.duration):null,
        lives:config.lives,solved:0,assisted:0,mistakes:0,skips:0,correctMoves:0,missed:[],results:[],previousBest:runBest(this.store.value,mode)};
      clearInterval(this.ticker);
      if(config.duration)this.ticker=setInterval(()=>{
        if(this.run?.clock?.expired())this.finishChallenge('Time is up');else this.updateClock();
      },100);
      await this.startPuzzleSelection([puzzle]);
    } finally {this.startingPuzzleRun=false;}
  }
  async advancePuzzleRun() {
    const run=this.run;
    if(!run?.mode||this.closed||this.closing||this.finishing)return;
    this.opponentPlaying=false;
    if(run.lives<=0){await this.finishChallenge('Out of lives');return;}
    if(run.clock?.expired()){await this.finishChallenge('Time is up');return;}
    this.render();
    if(this.puzzleMotionEnabled()&&!await this.waitForPuzzleReply(this.feedback?.status==='incorrect'?600:350))return;
    if(this.run!==run||this.closed||this.closing||this.finishing)return;
    this.busy=false;await this.nextPuzzle();
  }
  puzzleRunHistory(results,{replay=false}={}) {
    return this.h('ol',{class:'puzzle-run-history','aria-label':'Puzzle results'},...results.map(r=>
      this.h('li',{class:r.correct?'solved':'missed','aria-label':`Puzzle ${r.number}: ${r.correct?'solved':'incorrect'}`},
        replay?this.button([this.h('span',{'aria-hidden':'true'},r.correct?'✓':'×'),this.h('span',{'aria-hidden':'true'},r.number)],()=>this.replayRunPuzzle(r.id),
          {class:'puzzle-run-replay',disabled:this.busy,'aria-current':this.activity?.replay&&this.activity.id===r.id?'true':null,'aria-label':`Replay puzzle ${r.number}: ${r.correct?'solved':'incorrect'}`,'data-focus':'replay-'+r.number}):
          [this.h('span',{'aria-hidden':'true'},r.correct?'✓':'×'),this.h('span',{'aria-hidden':'true'},r.number)])));
  }
  puzzleRunView() {
    const h=this.h,run=this.run,config=PUZZLE_RUN_MODES[run.mode],best=Math.max(run.previousBest,run.solved,runBest(this.store.value,run.mode));
    return h('section',{class:'puzzle-run-panel','aria-label':config.name+' progress'},
      runDashboard(h,run,best,this.clockText()),
      this.practiceStatus,
      this.puzzleRunHistory(run.results));
  }
  clockText() {const seconds=Math.ceil((this.run?.clock?.remaining()||0)/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  updateClock() {const node=this.root?.querySelector('#learn-clock');if(node&&this.run?.clock){node.textContent=this.clockText();node.classList.toggle('running-low',this.run.clock.remaining()<=30000);updateRunCountdown(this.root,this.run);}}
  async finishChallenge(reason,show=true) {
    if(!this.run||this.finishing)return;this.finishing=true;this.busy=true;this.run.clock?.pause();clearInterval(this.ticker);
    this.cancelRunStart?.();
    this.pausePuzzleClock();
    this.cancelPuzzleReply();this.cancelBoardInput?.();this.cancelPieceTransition?.();this.promotionPending=null;this.generation++;
    this.stopPuzzleAnalysis();
    if(this.run.mode){
      // Results keep the final puzzle rather than falling back to the scratch board.
      const board={fen:this.currentFen(),flipped:this.flipped,lastMove:this.lastMove,puzzleId:this.activity?.id,
        wrongMove:this.wrongMove&&[...this.wrongMove],puzzleResult:this.puzzleResult&&{...this.puzzleResult}};
      this.selected=null;
      const run=this.run;this.run=null;
      const result={...challengeResult(run,run.previousBest),mode:run.mode,bestEligible:run.bestEligible,results:structuredClone(run.results),reason};
      if(!run.bestEligible)result.personalBest=false;
      await this.persist(p=>{
        if(run.bestEligible)p.bests[run.mode]=Math.max(runBest(p,run.mode),run.solved);
        result.best=runBest(p,run.mode);p.challenges.push(result);p.challenges=p.challenges.slice(-100);
      });
      this.result={...result,board};this.activity=null;this.opponentPlaying=false;this.busy=false;this.finishing=false;
      if(show&&!this.closed&&!this.closing){this.scrollToTop();this.render();this.showPuzzleRunEnd();}return;
    }
    // Record an unfinished puzzle that accumulated mistakes; an untouched board
    // at timeout is not silently counted as a skip or as an attempted puzzle.
    if(!this.attemptRecorded&&(this.activity?.mistakes||this.activity?.assisted))await this.recordAttempt(false,false);
    const run=this.run;this.run=null;
    let result=challengeResult(run,this.store.value.bests[run.duration]||0);
    await this.persist(p=>{result=challengeResult(run,p.bests[run.duration]||0);p.bests[run.duration]=result.best;p.challenges.push(result);p.challenges=p.challenges.slice(-100);});
    this.result={...result,reason};this.activity=null;this.busy=false;this.finishing=false;if(show&&!this.closed){this.scrollToTop();this.render();}
  }
  puzzleRunResultStats(result) {
    const h=this.h;
    return h('div',{class:'puzzle-run-stats'},h('div',{},h('strong',{},result.solved),h('span',{},'Solved')),
      result.bestEligible&&h('div',{},h('strong',{},result.best),h('span',{},'Personal best')));
  }
  puzzleRunStarting() {return !!this.runStartOverlay&&this.runStartOverlay.dataset.step!=='Go!';}
  showPuzzleRunStart() {
    const board=this.boardElement||this.root?.querySelector('.learn-board');
    if(!board||this.closed||this.closing)return Promise.resolve(false);
    this.cancelRunStart?.();
    return new Promise(resolve=>{
      const view=this.doc.defaultView;
      const overlay=runStartOverlay(this.h,{style:runAnimationStyle(this.settings(),'start'),motion:this.puzzleMotionEnabled()});
      const count=overlay.querySelector('.puzzle-run-start-count'),status=overlay.querySelector('[role=status]');
      let timer,step=3,settled=false;
      const cleanup=(ready=false)=>{
        view.clearTimeout(timer);overlay.remove();this.runStartSound?.stop();
        if(this.runStartOverlay===overlay)this.runStartOverlay=null;
        if(this.cancelRunStart===cleanup)this.cancelRunStart=null;
        if(!settled){settled=true;resolve(ready);}
      };
      const tick=()=>{
        const label=step?String(step):'Go!';
        count.textContent=label;overlay.dataset.step=label;
        status.textContent=step?`Time attack. ${label}`:'Time attack. Go!';
        this.runStartSound?.play(label);
        if(!step){
          // Go releases the opening move; the clock starts once the board is ready.
          settled=true;resolve(true);timer=view.setTimeout(()=>cleanup(true),300);return;
        }
        step--;timer=view.setTimeout(tick,1000);
      };
      this.runStartOverlay=overlay;this.cancelRunStart=cleanup;board.append(overlay);tick();
    });
  }
  showPuzzleRunEnd() {
    const result=this.result,board=this.boardElement||this.root?.querySelector('.learn-board');
    if(!result?.mode||!board||this.closed||this.closing)return;
    this.cancelRunEnd?.();
    const overlay=runEndOverlay(this.h,{...result,style:runAnimationStyle(this.settings(),'end'),motion:this.puzzleMotionEnabled()});
    const view=this.doc.defaultView;
    const cleanup=()=>{view.clearTimeout(timer);overlay.remove();if(this.cancelRunEnd===cleanup)this.cancelRunEnd=null;};
    const timer=view.setTimeout(cleanup,2800);
    this.cancelRunEnd=cleanup;
    board.append(overlay);
  }
  resultView(r=this.result) {
    const h=this.h;
    if(r.board&&!this.activity?.replay)this.flipped=r.board.flipped;
    if(r.mode)return h('section',{class:'learn-results puzzle-run-results puzzle-session'},
      h('div',{class:'puzzle-session-navigation'},this.puzzleOverviewButton()),
      h('div',{class:'puzzle-practice-heading'},h('h2',{},PUZZLE_RUN_MODES[r.mode].name)),
      this.puzzleRunResultStats(r),
      this.activity?.replay?this.puzzlePracticeStatus(this.puzzleById(this.activity.id)):
        r.board?.puzzleId&&this.puzzlePracticeStatus(this.puzzleById(r.board.puzzleId),{keepTurn:true}),
      this.puzzleRunHistory(r.results,{replay:true}),
      this.button('Play again',()=>{if(this.runReplay)this.returnToRunResults();return this.startPuzzleRun(r.mode,{again:true});},{class:'learn-button primary','data-focus':'run-again',disabled:this.busy}),
      this.activity?.replay?this.board(this.currentFen(),{interactive:!this.attemptRecorded&&(!this.busy||this.opponentPlaying),last:this.lastMove}):r.board&&this.board(r.board.fen,{last:r.board.lastMove,outcome:r.board}));
    return h('section',{class:'learn-results'},h('span',{class:'learn-eyebrow'},`${r.duration/60}-minute challenge · ${r.reason}`),h('h1',{},r.personalBest?'A new personal best.':'Good practice, well played.'),
      h('div',{class:'learn-stats'},...[[r.solved,'Puzzles solved'],[r.mistakes,'Mistakes'],[r.accuracy+'%','Move accuracy'],[r.best,'Personal best'],[r.assisted,'Assisted solutions'],[r.skips,'Skipped']].map(([n,label])=>h('div',{},h('strong',{},n),h('span',{},label)))),
      this.p('Only unassisted completions count toward your timed score. Each puzzle appeared once in this run.'),
      this.button('Review missed puzzles',()=>{const missed=this.puzzles.filter(p=>r.missed.includes(p.id));this.result=null;this.startPuzzleSelection(missed);},{disabled:!r.missed.length,class:'learn-button primary'}),
      this.button('Try another challenge',()=>{this.result=null;this.navigate('puzzles');}),this.button('Back to puzzles',()=>{this.result=null;this.navigate('puzzles');}));
  }

  openingsView() {
    const h=this.h,items=OPENINGS.filter(o=>this.matches(o.title+' '+o.family+' '+o.plans)
      && (this.filters.family==='All'||this.filters.family===o.family)
      && (this.filters.difficulty==='All'||DIFFICULTIES[o.level-1]===this.filters.difficulty));
    return h('div',{},this.heading('Openings'),
      h('div',{class:'learn-filters'},this.search(),this.select('Family','family',['All',...new Set(OPENINGS.map(o=>o.family))]),this.select('Level','difficulty',['All',...DIFFICULTIES])),
      items.length?h('div',{class:'learn-library'},...items.map(o=>this.card(o.family,o.title,(o.defaultColor==='b'?'Black':'White')+' opening · '+o.lines.length+' variations · '+DIFFICULTIES[o.level-1],()=>this.startOpening(o.id),'Study →'))):this.empty('Try another opening family or search term.'));
  }
  async startOpening(id,resume={}) {
    const o=OPENINGS.find(o=>o.id===id);if(!o)return;
    if (this.page==='openings'&&!this.activity) {
      this.openingLibraryState = {root:this.root.scrollTop,shell:this.shell?.scrollTop||0,main:this.root.querySelector('.learn-main').scrollTop};
    }
    this.result=null;this.page='openings';this.generation++;
    this.activity={kind:'opening',id,line:Math.max(0,Math.min(resume.line||0,o.lines.length-1)),ply:resume.ply||0,color:['w','b'].includes(resume.color)?resume.color:o.defaultColor};
    this.clearAnswer();this.setOpeningState();
    const activity=this.activity,generation=this.generation,resumeState={...activity};
    await this.persist(p=>{const r=p.openings[id]||={status:'in progress',completed:{}};if(r.status!=='completed')r.status='in progress';p.resume=resumeState;});
    if(this.closed||this.closing||this.activity!==activity||this.generation!==generation)return;
    // Reset the scroll in the same turn as replacing the library, so a pending
    // progress save cannot expose the top of the old list for a few frames.
    const from=this.displayedBoard;
    this.scrollToTop(true);this.render();
    await this.arrangePuzzlePieces(from,this.displayedBoard);
  }
  setOpeningState() {
    const a=this.activity,o=OPENINGS.find(o=>o.id===a.id);this.openingState=linePositions(o.lines[a.line]);
    a.ply=Math.max(0,Math.min(a.ply,this.openingState.moves.length));this.flipped=a.color==='b';
    this.lastMove=a.ply?this.openingState.moves[a.ply-1]:null;
  }
  stepOpening(ply,{restoreFocus=true}={}) {
    if(this.closed||this.closing||this.activity?.kind!=='opening')return;
    const a=this.activity,max=this.openingState.moves.length,previous=a.ply;
    a.ply=Math.max(0,Math.min(ply,max));
    if(a.ply===previous)return;
    // On a single step back, highlight the piece being returned. Jumps and
    // forward navigation highlight the last move in the selected position.
    this.lastMove=a.ply?this.openingState.moves[previous===a.ply+1?a.ply:a.ply-1]:null;
    if(restoreFocus&&this.doc.activeElement?.closest('.learn-square, .learn-opening-moves')) {
      this.root.querySelector(`[data-focus="opening-${a.ply<previous?'prev':'next'}"]`)?.focus({preventScroll:true});
    }
    const resume={...a};this.persist(p=>{p.resume=resume;});this.render({restoreFocus});
    const line=OPENINGS.find(o=>o.id===a.id).lines[a.line];
    this.onOpeningMove(line.moves[(a.ply<previous?previous:a.ply)-1]);
    this.root.querySelector('.learn-opening-moves [aria-current="step"]')?.scrollIntoView?.({block:'nearest'});
  }
  openingControls() {
    const a=this.activity,max=this.openingState.moves.length;
    const control=(name,label,action,disabled=false)=>{
      const paths={prev:'M19 12H5m6-6-6 6 6 6',next:'M5 12h14m-6-6 6 6-6 6'};
      const svg=this.doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=this.doc.createElementNS(svg.namespaceURI,'path');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');path.setAttribute('d',paths[name]);svg.append(path);
      return this.button(svg,action,{class:'learn-button primary','aria-label':label,title:label,'data-focus':'opening-'+name,disabled});
    };
    return this.h('div',{class:'learn-opening-controls',role:'group','aria-label':'Opening navigation'},
      control('prev','Previous move',()=>this.stepOpening(a.ply-1),a.ply===0),
      control('next','Next move',()=>this.stepOpening(a.ply+1),a.ply===max));
  }
  openingView() {
    const h=this.h,a=this.activity,o=OPENINGS.find(o=>o.id===a.id),line=o.lines[a.line];
    const lineSelect=this.dropdownField('Variation','opening-variation',a.line,o.lines.map((l,i)=>[i,l.name]),async value=>{
      const from=this.displayedBoard;
      a.line=value;a.ply=0;this.clearAnswer();this.setOpeningState();
      const resume={...a};this.persist(p=>{p.resume=resume;});this.render();
      await this.arrangePuzzlePieces(from,this.displayedBoard);
    });
    const board=this.board(this.openingState.positions[a.ply],{interactive:false,last:this.lastMove});
    const moveCell=i=>h('td',{},i<line.moves.length&&this.button(line.moves[i],()=>this.stepOpening(i+1),{
      'data-focus':'opening-move-'+i,'aria-label':`${Math.floor(i/2)+1}. ${i%2?'Black':'White'} ${line.moves[i]}`,
      'aria-current':a.ply===i+1?'step':null}));
    return h('div',{class:'learn-opening-view'},
      h('div',{class:'learn-activity-head puzzle-session'},
        h('div',{class:'puzzle-session-navigation'},this.button('Return to opening library',()=>this.navigate('openings'),{class:'learn-button learn-statistics-button','data-focus':'opening-library'})),
        h('div',{class:'puzzle-practice-heading'},this.heading(o.title)),lineSelect),
      h('div',{class:'learn-study'},board,h('section',{class:'learn-opening-score','aria-label':'Opening moves'},
        h('div',{class:'learn-opening-toolbar'},h('div',{},h('h3',{},'Moves'),h('span',{class:'learn-opening-progress','aria-live':'polite'},a.ply?`${a.ply} of ${line.moves.length} moves`:'Starting position')),this.openingControls()),
        h('table',{class:'learn-opening-moves','aria-label':line.name+' moves'},
          h('thead',{},h('tr',{},h('th',{scope:'col','aria-label':'Move number'},'#'),h('th',{scope:'col'},'White'),h('th',{scope:'col'},'Black'))),
          h('tbody',{},...line.moves.filter((_,i)=>i%2===0).map((_,row)=>h('tr',{},h('th',{scope:'row',class:'learn-opening-number'},row+1),moveCell(row*2),moveCell(row*2+1))))))));
  }
}
