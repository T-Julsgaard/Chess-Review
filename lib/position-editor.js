// Sets up a position on the review workspace's own board. The panel sits over
// the side modules for as long as it is open; the host owns the board itself.
import {setupFromFen,setupFen,validateSetup,importPosition,pieceLabel} from './position-setup.js';
import {readBoardImage,scanBoard,stopBoardScan,resizeCrop} from './board-image.js';
import {pieceRoutes,slidePuzzlePieces} from './learning/piece-transition.js';

const PIECES=[...'KQRBNPkqrbnp'];
const CASTLING=[['K','White O-O'],['Q','White O-O-O'],['k','Black O-O'],['q','Black O-O-O']];
const HOMES={K:['e1','K','h1','R'],Q:['e1','K','a1','R'],k:['e8','k','h8','r'],q:['e8','k','a8','r']};
const EMPTY_BOARD={board:{},turn:'w',castling:'-',ep:'-',halfmove:'0',fullmove:'1'};
const rotated=square=>String.fromCharCode(201-square.charCodeAt(0))+(9-Number(square[1]));

function homeCastling(setup) {
  return Object.entries(HOMES).filter(([,[king,k,rook,r]])=>setup.board[king]===k&&setup.board[rook]===r).map(([right])=>right).join('')||'-';
}
const pruneCastling=setup=>{
  setup.castling=[...setup.castling].filter(right=>homeCastling(setup).includes(right)).join('')||'-';
};
// The side that did not move can never be in check, so a read that says
// otherwise settles whose turn it is.
export function screenshotTurn(setup,lastMover,flipped) {
  const turn=lastMover?(lastMover==='w'?'b':'w'):flipped?'b':'w',other=turn==='w'?'b':'w';
  return validateSetup({...setup,turn}).error&&!validateSetup({...setup,turn:other}).error?other:turn;
}

export class PositionEditor {
  // host: {document,stage,fen,makePiece,squareAt,squares,board,flipped,setFlipped,paint,sound,blocked,motion,box,analyze,openGame,close}
  constructor(host) {
    this.host=host;this.doc=host.document;this.view=this.doc.defaultView;
    this.setup=setupFromFen(host.fen);this.undo=[];this.uncertain=new Set();this.tool='move';this.selected=null;this.scanToken=0;
    this.build();this.bind();this.render();host.paint(setupFen(this.setup));this.place();this.syncColors();
  }
  h(tag,attributes={},...children) {
    const node=this.doc.createElement(tag);
    for(const [key,value]of Object.entries(attributes)) {
      if(key.startsWith('on'))node.addEventListener(key.slice(2),value);
      else if(key==='class')node.className=value;
      else if(value!=null&&value!==false)node.setAttribute(key,value===true?'':String(value));
    }
    node.append(...children.filter(child=>child!=null));
    return node;
  }
  button(label,onclick,attributes={}) {return this.h('button',{type:'button',class:'position-button',onclick,...attributes},label);}
  build() {
    const {h}=this,make=h.bind(this);
    this.nodes={};
    const seg=(key,label,choices)=>{
      const buttons=choices.map(([value,text])=>make('button',{type:'button','data-value':value,onclick:()=>this.choose(key,value)},text));
      this.nodes[key]=buttons;
      return make('div',{class:'seg','role':'group','aria-label':label},...buttons);
    };
    this.nodes.palette=PIECES.map(piece=>make('button',{type:'button',class:'position-piece','aria-label':`Place ${pieceLabel(piece)}`,
      onpointerdown:event=>this.paletteDown(event,piece),onclick:event=>{if(event.detail===0)this.choose('tool',piece);}},
      this.pieceImage(piece)));
    this.nodes.castling=CASTLING.map(([right,label])=>make('button',{type:'button',class:'position-toggle','aria-label':label,'data-right':right,onclick:()=>this.toggleCastling(right)},right==='K'||right==='k'?'O-O':'O-O-O'));
    this.nodes.ep=make('select',{'aria-label':'En-passant square',onchange:event=>this.commit(()=>{this.setup.ep=event.target.value;})},
      make('option',{value:'-'},'None'),...[...'abcdefgh'].flatMap(file=>[3,6].map(rank=>make('option',{value:file+rank},file+rank))));
    this.nodes.fen=make('textarea',{class:'position-fen',rows:2,spellcheck:'false','aria-label':'FEN or PGN',placeholder:'Paste a FEN or PGN…',
      onkeydown:event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.loadText(event.target.value);}},
      onblur:()=>this.render()});
    this.nodes.undo=this.button('Undo',()=>this.restore());
    this.nodes.file=make('input',{type:'file',hidden:true,accept:'image/png,image/jpeg,image/webp,.fen,.pgn,.txt,text/plain',onchange:event=>{void this.openFile(event.target.files[0]);event.target.value='';}});
    this.nodes.status=make('p',{class:'position-status',role:'status','aria-live':'polite'});
    this.nodes.scan=make('div',{class:'position-scan',hidden:true});
    this.nodes.drop=make('button',{type:'button',class:'position-drop',onclick:()=>this.nodes.file.click()},
      make('strong',{},'Import a screenshot'),make('span',{},'Paste with Ctrl+V, drop an image, or click to choose'));
    this.nodes.validation=make('p',{class:'position-validation',role:'status'});
    this.nodes.analyze=make('button',{type:'button',class:'learn-entry-button position-analyze','data-motion':this.host.motion()?'on':'off',onclick:()=>this.analyze()},make('span',{class:'learn-entry-label'},'Analyze position'));
    this.root=make('section',{class:'position-editor panel','aria-label':'Position editor','data-motion':this.host.motion()?'on':'off'},
      make('div',{class:'panel-head'},make('h3',{},'Set up a position'),
        make('button',{type:'button',class:'position-close','aria-label':'Close position editor',onclick:()=>this.host.close()},'✕')),
      make('div',{class:'position-body'},
        make('div',{class:'position-group'},this.nodes.drop,this.nodes.scan,this.nodes.status),
        make('div',{class:'position-group'},
          make('div',{class:'position-tools'},seg('tool','Board tool',[['move','Move'],['erase','Erase']]),
            make('div',{class:'position-palette',role:'group','aria-label':'Pieces to place'},...this.nodes.palette))),
        make('div',{class:'position-group position-rows'},
          make('div',{class:'position-row'},make('span',{},'To move'),seg('turn','Side to move',[['w','White'],['b','Black']])),
          make('div',{class:'position-row'},make('span',{},'Castling'),
            make('div',{class:'position-castling'},
              make('span',{class:'position-side white','aria-hidden':'true'}),this.nodes.castling[0],this.nodes.castling[1],
              make('span',{class:'position-side black','aria-hidden':'true'}),this.nodes.castling[2],this.nodes.castling[3])),
          make('div',{class:'position-row'},make('span',{},'En passant'),this.nodes.ep)),
        make('div',{class:'position-group position-buttons'},
          this.button('Starting position',()=>this.commit(()=>{this.setup=setupFromFen();},{animate:true})),
          this.button('Clear',()=>this.commit(()=>{this.setup=structuredClone(EMPTY_BOARD);},{animate:true})),
          this.button('Flip board',()=>this.host.setFlipped(!this.host.flipped())),this.nodes.undo),
        make('div',{class:'position-group'},this.nodes.fen,
          make('div',{class:'position-buttons'},this.button('Load',()=>this.loadText(this.nodes.fen.value)),this.button('Copy FEN',()=>void this.copyFen()),this.nodes.file))),
      make('div',{class:'position-foot'},this.nodes.validation,this.nodes.analyze));
    this.host.stage.append(this.root);
    this.host.stage.classList.add('position-editing');
  }
  bind() {
    this.onPaste=event=>{
      if(this.host.blocked()||this.cropDialog?.open)return;
      const items=[...event.clipboardData?.items||[]],image=items.find(item=>item.type.startsWith('image/'));
      if(image){event.preventDefault();void this.importImage(image.getAsFile());return;}
      if(/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName||''))return;
      const text=event.clipboardData?.getData('text');
      if(text?.trim()){event.preventDefault();this.loadText(text);}
    };
    this.onDragOver=event=>{
      if(![...event.dataTransfer?.types||[]].includes('Files'))return;
      event.preventDefault();this.nodes.drop.classList.add('drag-over');
    };
    this.onDragLeave=event=>{if(!event.relatedTarget)this.nodes.drop.classList.remove('drag-over');};
    this.onDrop=event=>{
      this.nodes.drop.classList.remove('drag-over');
      if(!event.dataTransfer?.files.length||this.host.blocked())return;
      event.preventDefault();void this.openFile(event.dataTransfer.files[0]);
    };
    this.onResize=()=>this.place();
    for(const [type,listener]of [['paste',this.onPaste],['dragover',this.onDragOver],['dragleave',this.onDragLeave],['drop',this.onDrop]])this.doc.addEventListener(type,listener);
    this.view.addEventListener('resize',this.onResize);
    if(this.view.ResizeObserver) {this.observer=new this.view.ResizeObserver(this.onResize);this.observer.observe(this.host.stage);}
  }
  dispose() {
    this.scanToken++;this.endDrag?.();this.transition?.cancel();
    for(const [type,listener]of [['paste',this.onPaste],['dragover',this.onDragOver],['dragleave',this.onDragLeave],['drop',this.onDrop]])this.doc.removeEventListener(type,listener);
    this.view.removeEventListener('resize',this.onResize);this.observer?.disconnect();
    this.host.board()?.querySelector('.position-sweep')?.remove();
    for(const square of Object.values(this.host.squares()))square.classList.remove('position-uncertain','sel');
    this.cropDialog?.remove();this.root.remove();this.host.stage.classList.remove('position-editing');
    stopBoardScan();
  }
  place() {
    const box=this.host.box();
    if(box)Object.assign(this.root.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.fit?'auto':box.height+'px'});
  }
  syncColors() {
    const board=this.host.board();
    if(!board)return;
    const style=this.view.getComputedStyle(board);
    for(const name of ['--sq-light','--sq-dark'])this.root.style.setProperty(name,style.getPropertyValue(name));
  }
  pieceImage(piece) {return this.host.makePiece(piece.toUpperCase(),piece===piece.toUpperCase()?'w':'b');}
  // The piece set can change in Settings while the editor is open.
  refresh() {
    for(const [index,button]of this.nodes.palette.entries())button.replaceChildren(this.pieceImage(PIECES[index]));
    this.syncColors();
    const motion=this.host.motion()?'on':'off';
    this.root.dataset.motion=this.nodes.analyze.dataset.motion=motion;
  }
  choose(key,value) {
    if(key==='tool'){this.tool=this.tool===value&&value!=='move'?'move':value;this.selected=null;this.render();return;}
    if(this.setup.turn===value)return;
    this.commit(()=>{this.setup.turn=value;this.setup.ep='-';});
  }
  toggleCastling(right) {
    this.commit(()=>{
      const rights=new Set(this.setup.castling.replace('-',''));
      if(!rights.delete(right))rights.add(right);
      this.setup.castling=[...'KQkq'].filter(key=>rights.has(key)).join('')||'-';
    });
  }
  commit(change,{animate=false,fromFlipped=this.host.flipped(),turnsBoard=false}={}) {
    const before=setupFen(this.setup);
    this.undo.push({setup:structuredClone(this.setup),flipped:turnsBoard?fromFlipped:null});if(this.undo.length>100)this.undo.shift();
    change();this.settle(before,animate,fromFlipped);
  }
  restore() {
    if(!this.undo.length)return;
    const before=setupFen(this.setup),fromFlipped=this.host.flipped(),{setup,flipped}=this.undo.pop();
    this.setup=setup;
    if(flipped!=null&&flipped!==fromFlipped)this.host.setFlipped(flipped);
    this.settle(before,true,fromFlipped);
  }
  settle(before,animate,fromFlipped=this.host.flipped()) {
    const fen=setupFen(this.setup),board=this.host.board();
    this.selected=null;this.transition?.cancel();this.transition=null;
    if(animate&&this.host.motion()&&before!==fen&&board) {
      const motion=slidePuzzlePieces(board,pieceRoutes(before,fen,{fromFlipped,toFlipped:this.host.flipped()}),this.host.makePiece);
      this.transition=motion;void motion.finished.then(()=>{if(this.transition===motion)this.transition=null;});
    }
    this.host.paint(fen);this.render();
  }
  render() {
    const {setup,nodes}=this,{error,fen}=validateSetup(setup);
    for(const button of nodes.tool)button.classList.toggle('on',button.dataset.value===this.tool);
    for(const button of nodes.turn)button.classList.toggle('on',button.dataset.value===setup.turn);
    for(const [index,button]of nodes.palette.entries())button.setAttribute('aria-pressed',String(this.tool===PIECES[index]));
    for(const button of nodes.castling)button.setAttribute('aria-pressed',String(setup.castling.includes(button.dataset.right)));
    nodes.ep.value=setup.ep;nodes.undo.disabled=!this.undo.length;
    if(this.doc.activeElement!==nodes.fen)nodes.fen.value=fen||setupFen(setup);
    nodes.validation.textContent=error||(this.uncertain.size?`Check the ${this.uncertain.size===1?'marked square':`${this.uncertain.size} marked squares`} before analyzing.`:'Ready to analyze.');
    nodes.validation.dataset.invalid=String(!!error);nodes.analyze.disabled=!!error;
    this.root.dataset.tool=this.tool==='move'||this.tool==='erase'?this.tool:'place';
    for(const [name,square]of Object.entries(this.host.squares())) {
      square.classList.toggle('position-uncertain',this.uncertain.has(name));
      square.classList.toggle('sel',this.selected===name);
    }
  }
  status(text,error=false) {this.nodes.status.textContent=text;this.nodes.status.dataset.error=String(error);}
  put(square,piece,from=null) {
    const captured=piece&&this.setup.board[square];
    if(from===square||this.setup.board[square]===piece&&!from)return;
    this.commit(()=>{
      if(from)delete this.setup.board[from];
      if(piece) {
        // Each side has one king: placing another moves it.
        if(piece.toLowerCase()==='k')for(const [name,other]of Object.entries(this.setup.board))if(other===piece)delete this.setup.board[name];
        this.setup.board[square]=piece;
      } else delete this.setup.board[square];
      this.setup.ep='-';pruneCastling(this.setup);
      this.uncertain.delete(square);if(from)this.uncertain.delete(from);
    });
    if(piece)this.host.sound(captured?'Nxf3':'Nf3');
  }
  boardPointer(event) {
    event.preventDefault();
    const square=this.host.squareAt(event);
    if(!square)return;
    if(event.button===2){this.put(square,null);return;}
    if(event.button!==0)return;
    if(this.tool==='erase'){this.put(square,null);return;}
    if(this.tool!=='move'){this.put(square,this.setup.board[square]===this.tool?null:this.tool);return;}
    if(this.selected&&this.selected!==square){this.put(square,this.setup.board[this.selected],this.selected);return;}
    const piece=this.setup.board[square];
    if(!piece){this.selected=null;this.render();return;}
    this.selected=this.selected===square?null:square;this.render();
    this.drag(event,piece,square);
  }
  paletteDown(event,piece) {
    if(event.button!==0)return;
    event.preventDefault();
    this.drag(event,piece,null,()=>this.choose('tool',piece));
  }
  // Same lifted piece as a review drag. Dragging a piece off the board removes it.
  drag(start,piece,from,onClick) {
    this.endDrag?.();
    const board=this.host.board(),cell=board.getBoundingClientRect().width/8,ghost=this.h('div',{class:'drag-piece ps-'+this.host.pieceStyle()},this.pieceImage(piece));
    ghost.style.width=ghost.style.height=cell+'px';
    const original=from&&this.host.squares()[from]?.querySelector('.piece-img');
    let moved=false,hover=null;
    const position=event=>{ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';};
    const mark=square=>{
      if(square===hover)return;
      if(hover)this.host.squares()[hover]?.classList.remove('drag-over');
      hover=square;if(hover)this.host.squares()[hover]?.classList.add('drag-over');
    };
    const move=event=>{
      if(event.pointerId!==start.pointerId)return;
      if(!moved&&Math.hypot(event.clientX-start.clientX,event.clientY-start.clientY)<4)return;
      if(!moved) {
        moved=true;this.doc.body.append(ghost);this.selected=null;this.render();
        if(original)original.style.visibility='hidden';
      }
      position(event);mark(this.host.squareAt(event));
    };
    const end=()=>{
      this.view.removeEventListener('pointermove',move);this.view.removeEventListener('pointerup',up);this.view.removeEventListener('pointercancel',cancel);
      this.endDrag=null;ghost.remove();mark(null);
      if(original)original.style.visibility='';
    };
    const cancel=event=>{if(event.pointerId===start.pointerId)end();};
    const up=event=>{
      if(event.pointerId!==start.pointerId)return;
      const square=moved?this.host.squareAt(event):null;
      end();
      if(!moved){onClick?.();return;}
      if(square)this.put(square,piece,from);else if(from)this.put(from,null);
    };
    this.view.addEventListener('pointermove',move);this.view.addEventListener('pointerup',up);this.view.addEventListener('pointercancel',cancel);
    this.endDrag=end;position(start);
  }
  loadText(text) {
    try {
      const {setup,history}=importPosition(text);
      if(history?.moves.length){void this.host.openGame(text.trim());return;}
      this.uncertain.clear();this.clearScan();this.tool='move';this.nodes.fen.blur();
      this.commit(()=>{this.setup=setup;},{animate:true});this.status('Position loaded.');
    } catch(error){this.status(error.message,true);}
  }
  async openFile(file) {
    if(!file)return;
    if(file.type.startsWith('image/')){await this.importImage(file);return;}
    if(file.size>1000000){this.status('Choose a FEN or single-game PGN file smaller than 1 MB.',true);return;}
    try {this.loadText(await file.text());} catch {this.status('Could not read this file.',true);}
  }
  async copyFen() {
    try {await this.view.navigator.clipboard.writeText(this.nodes.fen.value);this.status('FEN copied.');}
    catch {this.nodes.fen.focus();this.nodes.fen.select();this.status('Press Ctrl+C to copy the selected FEN.');}
  }
  analyze() {
    const {error,fen}=validateSetup(this.setup);
    if(!error)this.host.analyze(fen);
  }
  scanning(active) {
    const board=this.host.board();
    this.root.classList.toggle('is-scanning',active);
    board?.querySelector('.position-sweep')?.remove();
    if(active&&board)board.append(this.h('div',{class:'position-sweep','aria-hidden':'true'}));
  }
  async importImage(file) {
    const token=++this.scanToken;
    this.status('Reading your screenshot…');this.scanning(true);
    try {
      const image=await readBoardImage(file);
      if(token!==this.scanToken)return;
      this.image=image;
      const result=await scanBoard(image);
      if(token!==this.scanToken)return;
      if(result)this.applyScan(result);
      else {
        const size=Math.min(image.canvas.width,image.canvas.height);
        this.status('No board found. Frame it by hand.',true);
        this.openCrop({x:Math.round((image.canvas.width-size)/2),y:Math.round((image.canvas.height-size)/2),size});
      }
    } catch(error) {if(token===this.scanToken)this.status(error.message,true);}
    finally {if(token===this.scanToken)this.scanning(false);}
  }
  applyScan(result) {
    const fromFlipped=this.host.flipped(),setup={...EMPTY_BOARD,board:result.board};
    setup.castling=homeCastling(setup);setup.turn=screenshotTurn(setup,result.lastMover,result.flipped);
    this.uncertain=new Set(result.uncertain);this.scan=result;this.tool='move';
    this.commit(()=>{
      this.setup=setup;
      if(result.flipped!==fromFlipped)this.host.setFlipped(result.flipped);
    },{animate:true,fromFlipped,turnsBoard:true});
    this.renderScan();
    const pieces=Object.keys(result.board).length,turn=setup.turn==='w'?'White':'Black';
    this.status(result.reliable?`Read ${pieces} pieces. ${turn} to move${result.lastMover?'':' is a guess, so check it'}.`:'Parts of this board were hard to read. Check the marked squares.',!result.reliable);
  }
  clearScan() {this.scan=null;this.nodes.scan.hidden=true;this.nodes.scan.replaceChildren();}
  renderScan() {
    const {crop}=this.scan,preview=this.h('canvas',{class:'position-thumb',width:88,height:88,'aria-hidden':'true'});
    preview.getContext('2d')?.drawImage(this.image.canvas,crop.x,crop.y,crop.size,crop.size,0,0,88,88);
    this.nodes.scan.hidden=false;
    this.nodes.scan.replaceChildren(preview,this.h('div',{class:'position-buttons'},
      this.button('Swap sides',()=>this.swapSides()),this.button('Adjust frame',()=>this.openCrop(crop))));
  }
  // For sparse endgames where the pieces cannot show which side was at the
  // bottom. The board looks the same; only what each square is called changes.
  swapSides() {
    const flipped=!this.host.flipped();
    this.uncertain=new Set([...this.uncertain].map(rotated));
    this.commit(()=>{
      this.setup={...this.setup,ep:'-',board:Object.fromEntries(Object.entries(this.setup.board).map(([square,piece])=>[rotated(square),piece]))};
      this.setup.castling=homeCastling(this.setup);
      this.setup.turn=screenshotTurn(this.setup,this.scan?.lastMover,flipped);
      this.host.setFlipped(flipped);
    },{turnsBoard:true});
  }
  openCrop(crop) {
    this.cropDialog?.remove();
    const {canvas}=this.image,{width,height}=canvas,picture=this.h('canvas',{width,height});
    picture.getContext('2d')?.drawImage(canvas,0,0);
    const frame=this.h('div',{class:'position-frame','aria-hidden':'true'}),stage=this.h('div',{class:'position-crop-image'},picture,frame);
    const size=this.h('input',{type:'range',min:64,max:Math.min(width,height),'aria-label':'Frame size'});
    const box={...crop};
    const draw=()=>{
      box.size=Math.max(64,Math.min(width,height,box.size));
      box.x=Math.max(0,Math.min(width-box.size,box.x));box.y=Math.max(0,Math.min(height-box.size,box.y));
      Object.assign(frame.style,{left:box.x/width*100+'%',top:box.y/height*100+'%',width:box.size/width*100+'%',height:box.size/height*100+'%'});
      size.value=box.size;
    };
    size.addEventListener('input',()=>{box.size=Number(size.value);draw();});
    let start=null;
    stage.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      start={x:event.clientX,y:event.clientY,left:box.x,top:box.y,scale:width/stage.getBoundingClientRect().width};
      stage.setPointerCapture?.(event.pointerId);
    });
    stage.addEventListener('pointermove',event=>{
      if(!start)return;
      box.x=start.left+(event.clientX-start.x)*start.scale;box.y=start.top+(event.clientY-start.y)*start.scale;draw();
    });
    for(const type of ['pointerup','pointercancel'])stage.addEventListener(type,()=>{start=null;});
    stage.addEventListener('wheel',event=>{
      event.preventDefault();
      const rect=stage.getBoundingClientRect(),point={x:(event.clientX-rect.left)*width/rect.width,y:(event.clientY-rect.top)*height/rect.height};
      Object.assign(box,resizeCrop(box,point,event.deltaY*(event.deltaMode===1?16:1),width,height));draw();
    },{passive:false});
    const close=()=>{this.cropDialog?.close();this.cropDialog?.remove();this.cropDialog=null;};
    this.cropDialog=this.h('dialog',{class:'position-crop panel','aria-label':'Frame the board'},
      this.h('div',{class:'panel-head'},this.h('h3',{},'Frame the board')),
      this.h('p',{},'Drag the frame onto the board. Scroll or use the slider to resize it, and keep labels outside.'),stage,size,
      this.h('div',{class:'position-buttons'},this.button('Cancel',close),this.button('Read this frame',()=>{close();void this.readCrop({...box});},{class:'position-button primary'})));
    this.doc.body.append(this.cropDialog);this.cropDialog.showModal?.();draw();
  }
  async readCrop(crop) {
    const token=++this.scanToken;
    this.status('Reading the framed board…');this.scanning(true);
    try {
      const result=await scanBoard(this.image,{x:Math.round(crop.x),y:Math.round(crop.y),size:Math.round(crop.size)});
      if(token===this.scanToken&&result)this.applyScan(result);
    } catch(error) {if(token===this.scanToken)this.status(error.message,true);}
    finally {if(token===this.scanToken)this.scanning(false);}
  }
}
