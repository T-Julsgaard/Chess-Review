import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

for(const [file,html,rootSelector,buttonSelector] of [
  ['content.js','<div class="game-over-modal-shell-buttons"><a href="/review">Review</a></div>','.game-over-modal-shell-buttons','.chess-analyzer-free-review'],
  ['content.js','<div class="sidebar-content"><div class="game-review-buttons-component"><a href="/analysis?tab=review">Game Review</a></div></div>','.game-review-buttons-component','.chess-analyzer-free-review'],
  ['lichess-content.js','<div class="follow-up"><a class="fbt" href="/analysis">Analysis board</a></div>','.follow-up','.chess-analyzer-review'],
])test(file+' '+rootSelector+': unrelated mutations stay idle, relevant bursts batch, and replacement recovers',async t=>{
  const dom=new JSDOM('<div id="other"></div>'+html,{url:'https://example.test/abcdefgh',runScripts:'outside-only',pretendToBeVisual:true});
  t.after(()=>dom.window.close());const w=dom.window,frames=[],timers=[];
  w.console={log(){},info(){},warn(){}};w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  w.setTimeout=(fn,ms)=>{timers.push({fn,ms});return timers.length;};
  w.fetch=async()=>({blob:async()=>new w.Blob(['logo'])});
  w.chrome={runtime:{getURL:p=>p,onMessage:{addListener(){}},sendMessage:()=>new Promise(()=>{})}};
  Object.defineProperty(w.HTMLElement.prototype,'offsetWidth',{get:()=>288});
  w.eval(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'));
  const settle=async()=>{await Promise.resolve();await Promise.resolve();};
  const flush=async()=>{await settle();for(let i=0;i<4&&frames.length;i++){frames.splice(0).forEach(fn=>fn());await settle();}};
  await flush();const button=w.document.querySelector(buttonSelector);assert.ok(button);button.click();await flush();
  let scans=0;const query=w.document.querySelector.bind(w.document);w.document.querySelector=(...args)=>{scans++;return query(...args);};
  for(let i=0;i<60;i++){query('#other').append(w.document.createElement('div'));await settle();}
  assert.equal(scans,0);assert.equal(frames.length,0,'unrelated page updates should not schedule injection');
  for(let i=0;i<60;i++){query(rootSelector).append(w.document.createElement('span'));await settle();}
  assert.equal(frames.length,1);await flush();assert.ok(scans>0);
  assert.equal(query(buttonSelector),button);assert.equal(button.disabled,true);assert.equal(button.textContent.trim(),'Opening review…');
  query(rootSelector).outerHTML=html;await flush();assert.equal(w.document.querySelectorAll(buttonSelector).length,1);
  Object.defineProperty(w.document,'hidden',{configurable:true,value:true});query(buttonSelector).remove();await settle();
  assert.equal(timers.filter(t=>t.ms===32).length,1);timers.filter(t=>t.ms===32).forEach(t=>t.fn());await settle();
  assert.equal(w.document.querySelectorAll(buttonSelector).length,1);
});
