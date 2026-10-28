import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame} from './helpers/app.mjs';

for(const scale of [.5,.8847,1,1.5])test(`current move stays within the scroller at content scale ${scale}`,t=>{
  const a=app(t);loadGame(a,'1. e4 e5 2. Nf3 Nc6');a.call('computeDerived');a.call('buildUI');a.call('renderMoves');
  const body=a.dom.window.document.querySelector('#movesBody'),cell=body.querySelector('[data-ply="4"]');
  Object.defineProperties(body,{offsetHeight:{value:200},clientHeight:{value:200},clientTop:{value:0}});
  body.getBoundingClientRect=()=>({top:100,height:200*scale,bottom:100+200*scale});
  let position=700;
  cell.getBoundingClientRect=()=>({top:100+(position-body.scrollTop)*scale,bottom:100+(position-body.scrollTop+28)*scale,height:28*scale});
  a.state.idx=4;a.call('highlightCurrentMove');
  assert.equal(body.scrollTop,536);
  const stationary=body.scrollTop;a.call('highlightCurrentMove',true);assert.equal(body.scrollTop,stationary,'Already visible rows must stay still');
  position=0;a.call('highlightCurrentMove',true);
  assert.ok(Math.abs(body.scrollTop+8)<1e-8); // The browser clamps negative scrollTop to zero.
  assert.equal(cell.classList.contains('current'),true);
});
