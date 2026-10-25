import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame} from './helpers/app.mjs';
import {runAnimationStyle} from '../lib/learning/run-animations.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('Puzzles settings persist independent animation choices, preview them, and reset only puzzles',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('buildUI');await a.call('toggleSettings');
  const doc=a.dom.window.document;
  [...doc.querySelectorAll('.set-tab')].find(n=>n.textContent==='Puzzles').click();
  assert.deepEqual([...doc.querySelectorAll('.set-sect-head')].map(n=>n.querySelector('span').textContent),['Time attack start','Game over']);
  const open=title=>[...doc.querySelectorAll('.set-sect-head')].find(n=>n.textContent===title).click();
  open('Time attack start');
  for(const style of ['rings','flip','still','pulse']){
    doc.querySelector(`[data-setting=puzzleStartAnimation][data-value=${style}]`).click();await settle();
    assert.equal(a.store.settings.puzzleStartAnimation,style);
    assert.equal(doc.querySelector('.puzzle-animation-preview .puzzle-run-start').dataset.style,style);
    assert.equal(doc.querySelector(`[data-setting=puzzleStartAnimation][data-value=${style}]`).getAttribute('aria-pressed'),'true');
  }
  open('Game over');
  for(const style of ['ribbon','spotlight','flip','still']){
    doc.querySelector(`[data-setting=puzzleEndAnimation][data-value=${style}]`).click();await settle();
    assert.equal(a.store.settings.puzzleEndAnimation,style);
    assert.equal(doc.querySelector('.puzzle-animation-preview .puzzle-run-end').dataset.style,style);
  }
  a.state.settings.boardTheme='custom';a.state.settings.puzzleStartAnimation='flip';
  doc.querySelector('.set-reset').click();await settle();
  assert.equal(a.store.settings.puzzleStartAnimation,'pulse');assert.equal(a.store.settings.puzzleEndAnimation,'classic');
  assert.equal(a.state.settings.boardTheme,'custom');
  assert.equal(doc.querySelector('.puzzle-run-end').dataset.motion,'off','Global motion preference applies to previews');
});

test('missing and stale animation preferences fall back to the original designs',()=>{
  assert.equal(runAnimationStyle({},'start'),'pulse');assert.equal(runAnimationStyle({},'end'),'classic');
  assert.equal(runAnimationStyle({puzzleStartAnimation:'removed'},'start'),'pulse');
  assert.equal(runAnimationStyle({puzzleEndAnimation:'removed'},'end'),'classic');
});
