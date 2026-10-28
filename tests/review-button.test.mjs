import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../content.js', import.meta.url), 'utf8');

// Reduced from the supplied profile-game sidebar, retaining its action hierarchy.
const profileSidebar = `<div id="board-layout-sidebar" class="board-layout-sidebar"><div class="sidebar-component"><div class="sidebar-content">
  <div class="game-tab-scrollable"></div>
  <div class="quick-analysis-component"><a href="/analysis/game/live/185946151208?tab=review" class="quick-analysis-tally-component">2 Great 30 Best 15 Excellent</a></div>
  <div class="game-review-buttons-component"><a href="/analysis/game/live/185946151208?tab=review" class="cc-button-component cc-button-primary cc-button-xx-large cc-bg-primary cc-button-full">Game Review</a></div>
  <div class="game-buttons-container-component"><button aria-label="First Move"></button></div>
  <div class="game-icons-container-component"><a href="/analysis/game/live/185946151208?tab=analysis" aria-label="Self Analysis"></a></div>
</div></div></div>`;

function page(t, html) {
  const dom=new JSDOM(html,{url:'https://www.chess.com/game/live/185946151208?username=PavolPapik',runScripts:'outside-only',pretendToBeVisual:true});
  t.after(()=>dom.window.close());const w=dom.window,frames=[],sent=[];
  w.console={log(){},info(){},warn(){}};w.setTimeout=()=>0;
  w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  let finish;
  w.chrome={runtime:{getURL:p=>p,onMessage:{addListener(){}},sendMessage:message=>{sent.push(message);return new Promise(resolve=>{finish=resolve;});}}};
  w.eval(source);
  return {w,sent,finish:()=>finish({ok:true}),async flush(){
    for(let i=0;i<5;i++){await Promise.resolve();frames.splice(0).forEach(fn=>fn());}
  }};
}

test('profile-game sidebar places its review action below the CTA and above replay controls',async t=>{
  const p=page(t,profileSidebar+'<div class="game-over-modal-shell-buttons"><a href="/analysis?tab=review">Game Review</a></div>');
  const doc=p.w.document,actions=doc.querySelector('.game-review-buttons-component'),cta=actions.querySelector('a');
  const slot=actions.nextElementSibling,button=slot.querySelector('.chess-analyzer-free-review--sidebar');assert.ok(button);
  assert.equal(cta.nextElementSibling,null,'Native action row retains its original children');
  assert.equal(slot.className,'chess-analyzer-review-slot');
  assert.equal(slot.nextElementSibling.className,'game-buttons-container-component');
  assert.equal(doc.querySelectorAll('.chess-analyzer-free-review').length,2);
  assert.equal(doc.querySelector('.quick-analysis-component .chess-analyzer-free-review'),null);
  button.click();await p.flush();
  assert.equal(p.sent[0].type,'freeGameReview');
  assert.equal(p.sent[0].gameKey,'https://www.chess.com/game/live/185946151208?username=PavolPapik');
  assert.equal(button.disabled,true);assert.equal(button.textContent,'Opening review…');
  p.finish();await p.flush();assert.equal(button.disabled,false);
});

test('profile sidebar waits for its CTA and recovers from late insertion and section replacement',async t=>{
  const p=page(t,'<div class="sidebar-content"></div>'),doc=p.w.document,sidebar=doc.querySelector('.sidebar-content');
  const actions=doc.createElement('div');actions.className='game-review-buttons-component';sidebar.append(actions);await p.flush();
  assert.equal(doc.querySelector('.chess-analyzer-free-review'),null,'Do not insert into an unfinished Vue section');
  actions.innerHTML='<a href="/analysis/game/live/185946151208?tab=review">Game Review</a>';await p.flush();
  const button=actions.nextElementSibling.querySelector('.chess-analyzer-free-review');assert.ok(button);button.click();
  actions.append(doc.createElement('span'));await p.flush();
  assert.equal(actions.nextElementSibling.querySelector('.chess-analyzer-free-review'),button);assert.equal(button.disabled,true);
  actions.outerHTML='<div class="game-review-buttons-component"><a href="/analysis/game/live/185946151208?tab=review">Game Review</a></div>';
  await p.flush();assert.equal(doc.querySelectorAll('.chess-analyzer-free-review--sidebar').length,1);
  doc.querySelector('.sidebar-content').outerHTML=profileSidebar;await p.flush();
  assert.equal(doc.querySelectorAll('.chess-analyzer-free-review--sidebar').length,1);
});

test('post-game emphasis keeps native action children intact through coach and CTA updates',async t=>{
  const p=page(t,`<div class="game-review-emphasis-component"><div class="game-review-emphasis-content">
    <div class="coach-message">Well played</div><div class="game-review-buttons-component"><a href="/analysis?tab=review">Game Review</a><!--Vue anchor--></div>
  </div></div>`),doc=p.w.document,actions=doc.querySelector('.game-review-buttons-component');
  const emphasis=doc.querySelector('.game-review-emphasis-component');
  const slot=emphasis.nextElementSibling,button=slot.querySelector('button');
  assert.equal(actions.childNodes.length,2,'No extension nodes inside the native action row');
  button.click();await p.flush();
  actions.innerHTML='<a href="/analysis?tab=review">Updated Game Review</a><!--Vue anchor-->';
  doc.querySelector('.coach-message').textContent='Next coach message';await p.flush();
  assert.equal(actions.childNodes.length,2);
  assert.equal(emphasis.nextElementSibling,slot);assert.equal(slot.querySelector('button'),button);
  assert.equal(button.disabled,true);assert.equal(button.textContent,'Opening review…');
  slot.remove();await p.flush();assert.equal(emphasis.nextElementSibling,slot,'Restore sibling removed by a parent update');
  emphasis.style.display='none';await p.flush();assert.equal(slot.hidden,true);
  emphasis.style.display='';await p.flush();assert.equal(slot.hidden,false);
  actions.querySelector('a').hidden=true;await p.flush();assert.equal(slot.hidden,true);
  actions.querySelector('a').hidden=false;await p.flush();assert.equal(slot.hidden,false);
  actions.replaceChildren();await p.flush();assert.equal(doc.querySelector('.chess-analyzer-review-slot'),null,'Remove stale action when native review is dismissed');
});

test('post-game coach action stays outside the capped animation and native click handler',async t=>{
  const p=page(t,`<div class="sidebar-content"><div class="coach-nudge-game-review-component">
    <div class="coach-nudge-game-review-content-animation" style="max-height:20dvh;overflow:hidden">
      <div class="native-review-click"><div class="game-review-buttons-component"><a href="/analysis?tab=review">Game Review</a></div></div>
      <div class="new-game-buttons">New Game</div>
    </div></div><div class="game-buttons-container-component">Replay</div></div>`),doc=p.w.document;
  const panel=doc.querySelector('.coach-nudge-game-review-component'),slot=panel.nextElementSibling;
  assert.equal(slot.className,'chess-analyzer-review-slot');
  assert.equal(slot.nextElementSibling.className,'game-buttons-container-component');
  let nativeClicks=0;doc.querySelector('.native-review-click').addEventListener('click',()=>nativeClicks++);
  slot.querySelector('button').click();await p.flush();assert.equal(nativeClicks,0);
  const animation=doc.querySelector('.coach-nudge-game-review-content-animation');
  animation.style.maxHeight='0px';await p.flush();assert.equal(slot.hidden,true);
  animation.style.maxHeight='20dvh';await p.flush();assert.equal(slot.hidden,false);
  panel.remove();await p.flush();assert.equal(doc.querySelector('.chess-analyzer-review-slot'),null);
});

test('several sidebars recover independently without duplicates or stale slots',async t=>{
  const p=page(t,profileSidebar+profileSidebar),doc=p.w.document;
  assert.equal(doc.querySelectorAll('.chess-analyzer-review-slot').length,2);
  doc.querySelector('.game-review-buttons-component').remove();await p.flush();
  assert.equal(doc.querySelectorAll('.chess-analyzer-review-slot').length,1);
  doc.querySelector('.sidebar-content').innerHTML='<div class="game-review-buttons-component"><a href="/analysis?tab=review">Game Review</a></div>';
  await p.flush();assert.equal(doc.querySelectorAll('.chess-analyzer-review-slot').length,2);
});

test('profile sidebar selector fallback remains scoped to the sidebar',t=>{
  const p=page(t,'<div class="game-review-buttons-unrelated"><a href="/analysis?tab=review">Other review</a></div>'+profileSidebar.replaceAll('game-review-buttons-component','game-review-buttons-renamed'));
  assert.equal(p.w.document.querySelectorAll('.chess-analyzer-free-review--sidebar').length,1);
  assert.equal(p.w.document.querySelector('.game-review-buttons-unrelated .chess-analyzer-free-review'),null);
});

test('modal action follows primary-action width through resize without replacing its busy state', async t => {
  const dom = new JSDOM(`<div class="game-over-modal-shell-buttons">
    <a href="/analysis?tab=review">Platform review</a>
    <div class="game-over-secondary-actions-row-component"></div>
  </div><div class="game-review-emphasis-content"><div class="game-review-buttons-component">
    <a href="/analysis?tab=review">Platform review</a>
  </div></div>`, { url: 'https://www.chess.com/game/live/12345678', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window, sent = [], timers = [];
  let width = 288, finish;
  Object.defineProperty(w.document.querySelector('.game-over-modal-shell-buttons a'), 'offsetWidth', { get: () => width });
  w.console = { log() {}, info() {}, warn() {} };
  w.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return timers.length; };
  w.clearTimeout = () => {};
  w.chrome = { runtime: {
    getURL: path => `chrome-extension://test/${path}`,
    sendMessage: message => { sent.push(message);return new Promise(resolve=>{finish=resolve;}); },
    onMessage: { addListener() {} },
  } };
  w.eval(source);
  const modal = w.document.querySelector('.chess-analyzer-free-review--modal');
  const sidebar = w.document.querySelector('.chess-analyzer-free-review--sidebar');
  assert.equal(modal.style.getPropertyValue('--chess-review-modal-width'), '288px');
  assert.equal(sidebar.style.getPropertyValue('--chess-review-modal-width'), '');
  assert.equal(modal.textContent, 'Analyze with Chess Review');
  assert.equal(sidebar.textContent, 'Analyze with Chess Review');
  assert.ok([...modal.classList].every(name => name.startsWith('chess-analyzer-free-review')));
  modal.click();
  await Promise.resolve();
  assert.equal(modal.disabled, true);
  assert.equal(modal.textContent, 'Opening review…');
  assert.equal(sent[0].type, 'freeGameReview');
  width = 224;
  w.dispatchEvent(new w.Event('resize'));
  assert.equal(w.document.querySelector('.chess-analyzer-free-review--modal'), modal);
  assert.equal(w.document.querySelectorAll('.chess-analyzer-free-review').length, 2);
  assert.equal(modal.style.getPropertyValue('--chess-review-modal-width'), '224px');
  assert.equal(modal.disabled, true);
  assert.equal(modal.textContent, 'Opening review…');
  assert.equal(timers.some(timer => timer.delay === 5000),false);
  finish({ok:true});await Promise.resolve();
  assert.equal(modal.disabled, false);
  assert.equal(modal.textContent, 'Analyze with Chess Review');
});
