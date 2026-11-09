import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {app,loadGame} from './helpers/app.mjs';

const library=JSON.parse(readFileSync(new URL('../data/learning/puzzles.json',import.meta.url))).puzzles.slice(0,20);
const drain=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
async function setup(t){
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'}),data={};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:library})}));
  const storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>({moveAnim:false}),makePiece:()=>dom.window.document.createElement('span')});
  t.after(async()=>{await w.close();dom.window.close();});await w.open();return {w,dom,data,storage};
}
const rect=(left,top,width,height)=>({left,right:left+width,top,bottom:top+height,width,height,x:left,y:top});

test('every mode has a Statistics entry; screens preserve filters, use their own colors, make no network requests and restore focus',async t=>{
  const {w,dom}=await setup(t);w.puzzleThemes.add('fork');w.puzzleRange=[500,800];
  let requests=0;t.mock.method(globalThis,'fetch',async()=>{requests++;throw Error('Unexpected network access');});
  const saved=structuredClone(w.store.value);
  assert.equal(w.root.querySelectorAll('.puzzle-stats-button').length,3);
  assert.equal(w.root.querySelector('.puzzle-leaderboard-button'),null);
  for(const mode of ['solve-puzzle','timeAttack','knockout']){
    w.showStatistics(mode);
    assert.equal(w.page,'statistics');assert.equal(w.root.querySelector('.learn-mode-stats').dataset.mode,mode);
    assert.equal(w.root.querySelector('.learn-puzzle-options'),null);
    assert.equal(w.root.querySelectorAll('.puzzle-mode').length,0);
    assert.equal(w.root.querySelectorAll('.learn-stat-overview > div').length,6);
    assert.doesNotMatch(w.root.textContent,/leaderboard|ranked|player key/i);
    assert.equal(dom.window.document.activeElement.id,'mode-stats-title');
    assert.equal(w.nav.querySelector('[aria-current]').textContent,'Puzzles');
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert.equal(w.page,'puzzles');assert.equal(dom.window.document.activeElement.dataset.focus,'statistics-'+mode);
  }
  assert.deepEqual([...w.puzzleThemes],['fork']);assert.deepEqual(w.puzzleRange,[500,800]);assert.deepEqual(w.store.value,saved);
  assert.equal(requests,0);
});

for(const leave of [false,true])test(`statistics entrance keeps its clicked footer and the ticket-head reveal${leave?' then returns mid-animation':''}`,async t=>{
  const {w,dom}=await setup(t),animations=[];let finishHero;
  w.interfaceMotionEnabled=()=>true;
  t.mock.method(dom.window.HTMLElement.prototype,'getBoundingClientRect',function(){
    if(this.matches('.puzzle-mode-button'))return rect(421,104,178,158);
    if(this.matches('.puzzle-mode-surface'))return rect(420,100,180,254);
    if(this.matches('.puzzle-mode'))return rect(420,100,180,254);
    if(this.matches('.puzzle-mode-grid'))return rect(0,100,600,254);
    // The banner is laid out on the band of the ticket heads: same top, same height, full width.
    if(this.matches('.mode-stats-hero'))return rect(0,100,600,162);
    return rect(0,0,600,700);
  });
  dom.window.Element.prototype.animate=function(frames,options){
    let resolve;const finished=new Promise(r=>{resolve=r;});
    const animation={finished,cancel(){resolve();}};animations.push({node:this,frames,options,animation});
    if(this.matches('.mode-stats-hero'))finishHero=resolve;else resolve();return animation;
  };
  w.showStatistics('knockout');
  const section=w.root.querySelector('.learn-mode-stats'),hero=section.querySelector('.mode-stats-hero');
  assert.ok(section.classList.contains('mode-stats-entering'));
  assert.equal(section.querySelector('.mode-stats-backdrop').style.height,'254px','The entire original ticket/footer remains available to fade');
  assert.equal(section.querySelector('.mode-stats-backdrop [data-focus=statistics-knockout]').textContent,'Statistics');
  for(const {frames} of animations)for(const frame of frames){assert.equal('width' in frame,false);assert.equal('marginLeft' in frame,false);}
  const first=animations.find(a=>a.node===hero).frames[0];
  assert.equal(first.clipPath,`inset(0 0% 0% ${420/600*100}% round 13px)`,'The reveal is the ticket head widening');
  assert.equal(first.transform,'translateY(0px)');
  w.render();assert.equal(w.root.querySelector('.mode-stats-hero'),hero,'A re-render keeps the animating hero');
  if(leave)w.returnFromStatistics();else finishHero();
  await drain();
  assert.equal(w.root.querySelector('.mode-stats-backdrop'),null);
  if(leave)assert.equal(w.page,'puzzles');
  else {assert.equal(w.root.querySelector('.mode-stats-hero'),hero);assert.equal(w.root.querySelector('.mode-stats-entering'),null);}
});

for(const mode of ['solve-puzzle','timeAttack','knockout'])test(`${mode} statistics return through the inverse reveal and cancel cleanly on navigation`,async t=>{
  const {w,dom}=await setup(t);w.showStatistics(mode);let finishHero;
  const frames=[];w.interfaceMotionEnabled=()=>true;
  const index=['solve-puzzle','timeAttack','knockout'].indexOf(mode);
  t.mock.method(dom.window.HTMLElement.prototype,'getBoundingClientRect',function(){
    if(this.matches('.puzzle-mode-button'))return rect(index*210,100,180,158);
    if(this.matches('.puzzle-mode'))return rect(index*210,100,180,254);
    if(this.matches('.mode-stats-hero'))return rect(0,100,600,164);
    if(this.matches('.puzzle-mode-grid'))return rect(0,100,600,254);return rect(0,0,600,700);
  });
  dom.window.Element.prototype.animate=function(keyframes){let resolve;const finished=new Promise(r=>{resolve=r;});
    if(this.matches('.mode-stats-hero')){finishHero=resolve;frames.push(keyframes);}else resolve();return {finished,cancel(){resolve();}};};
  const pending=w.returnFromStatistics();assert.equal(w.page,'puzzles');assert.ok(w.root.querySelector('.mode-stats-returning'));
  assert.equal(dom.window.document.activeElement.dataset.focus,'statistics-'+mode);
  assert.equal(frames[0][0].clipPath,'inset(0 0% 0 0% round 13px)');assert.notEqual(frames[0][0].clipPath,frames[0][1].clipPath);
  if(mode==='knockout')await w.navigate('concepts');else finishHero();
  await pending;assert.equal(w.root.querySelector('.mode-stats-returning'),null);assert.equal(w.statisticsReturn,null);
});

for(const mode of ['solve-puzzle','timeAttack','knockout'])test(`${mode} statistics stay connected during free-board moves, history and flips`,async t=>{
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:library})}));
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');await a.call('openLearning');
  const w=a.run('learningWorkspace');t.after(()=>w.close());
  w.showStatistics(mode);
  const main=w.shell.querySelector('.learn-main'),panel=main.querySelector('.learn-mode-stats'),tile=panel.querySelector('.learn-stat-overview > div');
  main.scrollTop=123;
  const observer=new a.dom.window.MutationObserver(()=>{});observer.observe(main,{childList:true,subtree:true});t.after(()=>observer.disconnect());
  w.boardElement.querySelector('[data-square=e2]').click();assert.equal(w.selected,'e2');
  w.boardElement.querySelector('[data-square=e4]').click();assert.equal(w.homePosition.get('e4')?.type,'p');
  w.submitMove('e7e5');w.stepHomePosition(0);w.stepHomePosition(2);w.flipBoard();
  assert.equal(w.shell.querySelector('.learn-main'),main);assert.equal(panel.isConnected,true);assert.equal(tile.isConnected,true);
  assert.equal(main.scrollTop,123);
  assert.equal(observer.takeRecords().length,0,'Board updates must not rebuild the statistics');
});

test('run thinking time is kept per mode and excluded from Solve a puzzle',async t=>{
  const {w,data}=await setup(t);let now=0;
  t.mock.method(w.doc.defaultView.performance,'now',()=>now);
  w.showPuzzleRunStart=async()=>true;
  await w.startPuzzleRun('knockout');
  w.readyPuzzleClock();now+=4000;
  await w.finishChallenge('Ended early',false);
  assert.equal(data['learning:v1'].runStats.knockout.timeMs,4000);
  assert.equal(data['learning:v1'].puzzleTimeMs,4000);
  await w.navigate('puzzles');w.showStatistics('solve-puzzle');
  assert.equal(w.root.querySelector('.learn-stat-overview > div:last-child strong').textContent,'0s');
  await w.navigate('puzzles');w.showStatistics('knockout');
  assert.equal(w.root.querySelector('.learn-stat-overview > div:last-child strong').textContent,'4s');
  assert.equal(data['learning:v1'].runStats.knockout.runs,0,'A run with no answered puzzle is not counted');
});
