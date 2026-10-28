import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {gameFlip,parseUsername} from '../chesscom.js';

const url='https://www.chess.com/game/live/185657116394?username=julsgaard&move=0';
const game={white:{username:'JaJaMinks'},black:{username:'Julsgaard'}};

test('link perspective matches either API player or PGN headers without guessing unknown players',()=>{
  assert.equal(gameFlip(game,url),true);
  assert.equal(gameFlip(game,url.replace('julsgaard','JAJAMINKS')),false);
  assert.equal(gameFlip(game,url.replace('julsgaard','Spectator')),null);
  assert.equal(gameFlip(game,url.replace('username=julsgaard&','')),null);
  assert.equal(gameFlip(game,url+'&flip=false'),false);
  assert.equal(gameFlip({pgn:'[White "JaJaMinks"]\n[Black "Julsgaard"]\n\n1. e4 e5'},url),true);
  assert.equal(gameFlip({white:{username:'Julsgaard'},black:{username:'Julsgaard'}},url),null);
  for(const name of ['','a','Julsgaard/other','Julsgaard?x=1'])assert.equal(parseUsername(url.replace('julsgaard',encodeURIComponent(name))),'');
});

function page(t,html,pageUrl=url) {
  const dom=new JSDOM(html,{url:pageUrl,runScripts:'outside-only',pretendToBeVisual:true});
  t.after(()=>dom.window.close());const w=dom.window;let listener;
  w.console={log(){},warn(){}};w.setTimeout=()=>0;w.requestAnimationFrame=()=>0;
  w.chrome={runtime:{getURL:p=>p,onMessage:{addListener(fn){listener=fn;}}}};
  w.eval(fs.readFileSync(new URL('../content.js',import.meta.url),'utf8'));
  return {w,info(){let result;listener({type:'getGameInfo'},{},value=>{result=value;});return result;}};
}

test('Chess.com content script reports the displayed board and tracks flips at message time',t=>{
  const {w,info}=page(t,'<wc-chess-board class="board flipped" id="board-single"></wc-chess-board>');
  assert.equal(info().flip,true);assert.equal(info().gameId,'185657116394');
  w.document.querySelector('wc-chess-board').classList.remove('flipped');
  assert.equal(info().flip,false);
});

test('legacy boards, explicit URL hints, and missing boards retain tri-state perspective',t=>{
  assert.equal(page(t,'<chess-board class="flipped"></chess-board>').info().flip,true);
  assert.equal(page(t,'<wc-chess-board></wc-chess-board>',url+'&flip=true').info().flip,true);
  assert.equal(page(t,'<wc-chess-board class="flipped"></wc-chess-board>',url+'&flip=false').info().flip,false);
  assert.equal(page(t,'').info().flip,null);
});
