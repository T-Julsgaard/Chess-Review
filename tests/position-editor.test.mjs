import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {PositionEditor,screenshotTurn} from '../lib/position-editor.js';
import {setupFromFen} from '../lib/position-setup.js';

const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function editor(t,{fen=START,flipped=false,...overrides}={}) {
  const dom=new JSDOM('<!doctype html><div class="stage"></div><div class="board"></div>',{pretendToBeVisual:true});
  const {document}=dom.window,squares={},stage=document.querySelector('.stage');let flip=flipped;const painted=[],sounds=[],analyzed=[],games=[];
  for(const file of 'abcdefgh')for(let rank=1;rank<=8;rank++)squares[file+rank]=document.createElement('div');
  const instance=new PositionEditor({document,stage,fen,squares:()=>squares,board:()=>document.querySelector('.board'),
    makePiece:(type,side)=>Object.assign(document.createElement('img'),{className:'piece-img',alt:side+type}),
    squareAt:event=>event.square,flipped:()=>flip,setFlipped:value=>{flip=value;},pieceStyle:()=>'image',paint:next=>painted.push(next),
    sound:san=>sounds.push(san),blocked:()=>false,motion:()=>false,box:()=>({left:1,top:2,width:300,height:400}),
    analyze:next=>analyzed.push(next),openGame:next=>games.push(next),close:()=>{},...overrides});
  t.after(()=>{instance.dispose();dom.window.close();});
  const pointer=(square,button=0)=>instance.boardPointer({square,button,preventDefault(){},clientX:0,clientY:0,pointerId:1});
  return {instance,document,stage,painted,sounds,analyzed,games,pointer,fen:()=>instance.nodes.fen.value,flipped:()=>flip,squares};
}
const button=(root,label)=>[...root.querySelectorAll('button')].find(node=>node.textContent===label);

test('the editor mounts over the side panels and paints the host board',t=>{
  const e=editor(t);
  assert.ok(e.stage.classList.contains('position-editing'));
  assert.equal(e.instance.root.style.width,'300px');assert.equal(e.instance.root.classList.contains('panel'),true);
  assert.equal(e.painted.at(-1),START);assert.equal(e.document.querySelectorAll('.position-piece').length,12);
});

test('stacked layouts size the panel to its content',t=>{
  const e=editor(t,{box:()=>({left:0,top:0,width:300,height:900,fit:true})});
  assert.equal(e.instance.root.style.height,'auto');
});

test('click to move, click to place, right click to erase',t=>{
  const e=editor(t);
  e.pointer('e2');e.instance.endDrag?.();assert.ok(e.squares.e2.classList.contains('sel'));
  e.pointer('e4');assert.equal(e.fen().split(' ')[0],'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
  e.instance.choose('tool','Q');e.pointer('d5');assert.equal(setupFromFen(e.fen()).board.d5,'Q');
  e.pointer('d5');assert.equal(setupFromFen(e.fen()).board.d5,undefined);
  e.pointer('a7',2);assert.equal(setupFromFen(e.fen()).board.a7,undefined);
  assert.deepEqual(e.sounds.at(-1),'Nf3');
});

test('placing a second king moves it, and displaced pieces drop castling rights',t=>{
  const e=editor(t);
  e.instance.choose('tool','K');e.pointer('e4');
  const board=setupFromFen(e.fen()).board;
  assert.equal(board.e1,undefined);assert.equal(board.e4,'K');assert.equal(e.fen().split(' ')[2],'kq');
});

test('undo restores the previous board and an invalid board blocks analysis',t=>{
  const e=editor(t);
  button(e.document,'Clear').click();
  assert.equal(e.instance.nodes.analyze.disabled,true);assert.notEqual(e.instance.nodes.validation.textContent,'Ready to analyze.');
  button(e.document,'Undo').click();
  assert.equal(e.fen(),START);assert.equal(e.instance.nodes.analyze.disabled,false);
  e.instance.nodes.analyze.click();assert.deepEqual(e.analyzed,[START]);
});

test('side to move and castling controls write the FEN',t=>{
  const e=editor(t);
  e.instance.nodes.turn[1].click();assert.equal(e.fen().split(' ')[1],'b');
  e.instance.nodes.castling[0].click();assert.equal(e.fen().split(' ')[2],'Qkq');
  assert.equal(e.instance.nodes.castling[0].getAttribute('aria-pressed'),'false');
});

test('text loads a FEN into the board, while a PGN goes to a real review',t=>{
  const e=editor(t),fen='8/8/4k3/8/8/4K3/8/8 w - - 0 1';
  e.instance.loadText(fen);assert.equal(e.fen(),fen);
  e.instance.loadText('1. e4 e5 2. Nf3');assert.deepEqual(e.games,['1. e4 e5 2. Nf3']);
  e.instance.loadText('not a position');assert.equal(e.instance.nodes.status.dataset.error,'true');
});

test('a scan fills the board, marks doubtful squares and applies its orientation',t=>{
  const e=editor(t),{board}=setupFromFen('8/8/4k3/8/4P3/4K3/8/8 w - - 0 1');
  e.instance.image={canvas:e.document.createElement('canvas')};
  e.instance.applyScan({board,uncertain:['e4'],flipped:true,lastMover:'w',crop:{x:0,y:0,size:64},reliable:true});
  assert.equal(e.flipped(),true);assert.equal(e.fen().split(' ')[1],'b');assert.ok(e.squares.e4.classList.contains('position-uncertain'));
  assert.match(e.instance.nodes.status.textContent,/Read 3 pieces\. Black to move\./);
  assert.match(e.instance.nodes.validation.textContent,/marked square/);
  e.pointer('e4',2);assert.equal(e.squares.e4.classList.contains('position-uncertain'),false);
});

test('Swap sides relabels the board without moving anything on screen, and undo turns it back',t=>{
  const e=editor(t),{board}=setupFromFen('8/8/4k3/8/4P3/4K3/8/8 w - - 0 1');
  e.instance.image={canvas:e.document.createElement('canvas')};
  e.instance.applyScan({board,uncertain:[],flipped:false,lastMover:null,crop:{x:0,y:0,size:64},reliable:true});
  button(e.document,'Swap sides').click();
  assert.equal(e.flipped(),true);assert.equal(setupFromFen(e.fen()).board.d5,'P');
  button(e.document,'Undo').click();
  assert.equal(e.flipped(),false);assert.equal(setupFromFen(e.fen()).board.e4,'P');
});

test('the side in check is the side to move, whatever the screenshot suggests',()=>{
  const {board}=setupFromFen('4k3/8/8/8/4R3/8/8/4K3 b - - 0 1'),setup={board,castling:'-',ep:'-',halfmove:'0',fullmove:'1'};
  assert.equal(screenshotTurn(setup,'b',false),'b');assert.equal(screenshotTurn(setup,null,false),'b');
  const quiet={...setup,board:setupFromFen('4k3/8/8/8/3R4/8/8/4K3 w - - 0 1').board};
  assert.equal(screenshotTurn(quiet,'b',false),'w');assert.equal(screenshotTurn(quiet,null,true),'b');
});

test('pasted text outside a field loads, and closing removes every trace',t=>{
  const e=editor(t),fen='8/8/4k3/8/8/4K3/8/8 w - - 0 1',{Event}=e.document.defaultView;
  const paste=Object.assign(new Event('paste',{bubbles:true,cancelable:true}),{clipboardData:{items:[],getData:()=>fen}});
  e.document.body.dispatchEvent(paste);assert.equal(e.fen(),fen);
  e.instance.dispose();
  assert.equal(e.document.querySelector('.position-editor'),null);assert.equal(e.stage.classList.contains('position-editing'),false);
});
