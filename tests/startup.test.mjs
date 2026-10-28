import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {app, deferred, settle} from './helpers/app.mjs';

const html=fs.readFileSync(new URL('../analysis.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
function startup(t,blank=false) {
  const a=app(t,{html,url:blank?'https://extension.test/analysis.html?workspace=blank':'https://extension.test/analysis.html#test-game'});
  const style=a.dom.window.document.createElement('style');style.textContent=css;a.dom.window.document.head.append(style);
  a.context.requestAnimationFrame=fn=>{queueMicrotask(fn);return 0;};
  for(const name of ['resetSettingsForRelease','loadBook','loadCalibration'])a.replace(name,async()=>{});
  a.replace('startAnalysis',()=>{});
  a.store.settings={moveAnim:false};
  a.store['job:test-game']={pgn:'1. e4 e5',meta:{flip:true},source:'pgn',analysis:null};
  return a;
}

test('startup hides the partial shell through identity loading and piece decoding, then reveals the ready board',async t=>{
  const a=startup(t),doc=a.dom.window.document,identity=deferred(),pieces=deferred();
  a.store.settings.moveAnim=true;
  a.replace('rememberAnalyzedGame',()=>identity.promise);
  a.dom.window.HTMLImageElement.prototype.decode=()=>pieces.promise;
  const loading=a.start();await settle();await settle();
  assert.ok(doc.querySelector('.moves-panel'));
  assert.equal(doc.querySelector('.board'),null);
  assert.equal(a.dom.window.getComputedStyle(doc.getElementById('root')).visibility,'hidden');
  assert.equal(doc.getElementById('root').hasAttribute('inert'),true);
  assert.equal(doc.getElementById('startup').getAttribute('role'),'status');
  identity.resolve('');await settle();await settle();
  assert.equal(doc.querySelectorAll('.board .piece-img').length,32);
  assert.equal(a.state.flipped,true);
  assert.ok(doc.getElementById('startup'));
  assert.equal(a.dom.window.getComputedStyle(doc.getElementById('root')).visibility,'hidden');
  pieces.resolve();await settle();await settle();
  assert.ok(doc.querySelector('#startup.opening'));
  assert.equal(a.dom.window.getComputedStyle(doc.getElementById('root')).visibility,'visible');
  assert.equal(doc.getElementById('root').hasAttribute('inert'),true,'covered controls stay inert during the reveal');
  const end=new a.dom.window.Event('transitionend',{bubbles:true});
  Object.defineProperty(end,'propertyName',{value:'transform'});
  doc.querySelector('.startup-top').dispatchEvent(end);
  await loading;
  assert.equal(doc.getElementById('startup'),null);
  assert.equal(doc.body.hasAttribute('data-starting'),false);
  assert.equal(doc.getElementById('root').hasAttribute('inert'),false);
  assert.equal(doc.getElementById('root').hasAttribute('aria-busy'),false);
  assert.equal(a.dom.window.getComputedStyle(doc.getElementById('root')).visibility,'visible');
  assert.equal(a.state.analyzing,true,'the board does not wait for engine analysis');
});

test('reduced motion skips the shutter reveal',async t=>{
  const a=startup(t,true),doc=a.dom.window.document;
  a.store.settings.moveAnim=true;
  a.dom.window.matchMedia=query=>({matches:query==='(prefers-reduced-motion: reduce)'});
  await a.start();
  assert.equal(doc.getElementById('startup'),null);
  assert.equal(doc.getElementById('root').hasAttribute('inert'),false);
});

test('a missing transitionend cannot leave the ready board covered',async t=>{
  const a=startup(t,true),doc=a.dom.window.document;
  a.store.settings.moveAnim=true;
  const loading=a.start();await new Promise(resolve=>setImmediate(resolve));
  assert.ok(doc.querySelector('#startup.opening'));
  await loading;
  assert.equal(doc.getElementById('startup'),null);
  assert.equal(doc.getElementById('root').hasAttribute('inert'),false);
});

test('blank startup tolerates failed piece decoding and reveals the board',async t=>{
  const a=startup(t,true),doc=a.dom.window.document;
  a.dom.window.HTMLImageElement.prototype.decode=()=>Promise.reject(Error('Missing piece'));
  await a.start();
  assert.equal(doc.getElementById('startup'),null);
  assert.equal(doc.querySelectorAll('.board .piece-img').length,32);
  assert.equal(a.state.blank,true);assert.equal(a.state.analyzing,false);
});

test('startup failures dismiss the animation and expose the error without a partial shell',async t=>{
  const a=startup(t),doc=a.dom.window.document;
  a.replace('applyGame',async()=>{throw Error('Game unavailable');});
  a.context.console={...console,error(){}};
  await a.start();
  assert.equal(doc.getElementById('startup'),null);
  assert.equal(doc.getElementById('root').hidden,true);
  assert.equal(doc.getElementById('error').hidden,false);
  assert.match(doc.getElementById('error').textContent,/Game unavailable/);
});
