import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const controller=readFileSync(new URL('../button-preview-content.js',import.meta.url),'utf8');
const chess=readFileSync(new URL('../content.js',import.meta.url),'utf8');
const lichess=readFileSync(new URL('../lichess-content.js',import.meta.url),'utf8');
const native='<a href="/analysis/game/live/12345678?tab=review" class="cc-button-component">Game Review</a>';
const row='<div class="game-review-buttons-component">'+native+'</div>';
const modal='<div class="game-over-modal-shell-buttons">'+native+'<div class="game-over-secondary-actions-row-component"></div></div>';
const profile='<div class="sidebar-content">'+row+'<div class="game-buttons-container-component">Replay</div></div>';
const follow='<div class="rcontrols"><div class="follow-up"><a class="fbt" href="/12345678/analysis">Analysis board</a><button class="rematch">Rematch</button></div></div>';

function page(t,html,{site='chess',path,reply}={}) {
  const origin=site==='chess'?'https://www.chess.com':'https://lichess.org';
  const dom=new JSDOM(html,{url:origin+(path || (site==='chess'?'/game/live/12345678':'/12345678')),runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,sent=[],frames=[],timeouts=new Map(),intervals=new Map(),changes=[];let sequence=0;
  t.after(()=>w.close());w.console={log(){},info(){},warn(){}};w.fetch=async()=>{throw Error('no logo in DOM fixture');};
  w.setTimeout=(fn,delay)=>{const id=++sequence;timeouts.set(id,{fn,delay});return id;};w.clearTimeout=id=>timeouts.delete(id);
  w.setInterval=fn=>{const id=++sequence;intervals.set(id,fn);return id;};w.clearInterval=id=>intervals.delete(id);
  w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  const pending=[];
  w.chrome={runtime:{getURL:p=>p,onMessage:{addListener(){}},sendMessage:message=>{
    sent.push(message);if(message.type==='cancelButtonPreview')return Promise.resolve();
    if(reply && message.type==='buttonPreview')return Promise.resolve(reply(message));
    return new Promise((resolve,reject)=>pending.push({message,resolve,reject}));
  }},storage:{onChanged:{addListener:fn=>changes.push(fn)}}};
  w.eval(controller);w.eval(site==='chess'?chess:lichess);
  return {w,sent,pending,changes,timeouts,intervals,
    buttons:()=>[...w.document.querySelectorAll('.chess-analyzer-free-review,.chess-analyzer-review')],
    refresh:()=>w.ChessReviewButtonPreview.refresh(),
    resolve(result,index=0){pending.filter(p=>p.message.type==='buttonPreview')[index].resolve(result);},
    async flush(){for(let i=0;i<10;i++){await Promise.resolve();frames.splice(0).forEach(fn=>fn());}}
  };
}
const result=(key='chesscom:12345678')=>({ok:true,key,estimated:true,accuracy:{w:91.24,b:72.06},players:{w:'Alice',b:'Bob'}});

const fixtures=[
  ['previous / other player game',profile],
  ['own game emphasis','<div class="game-review-emphasis-component"><div class="game-review-emphasis-content">'+row+'</div></div>'],
  ['own game coach','<div class="sidebar-content"><div class="coach-nudge-game-review-component"><div style="max-height:20dvh;overflow:hidden">'+row+'</div></div></div>'],
  ['modal',modal],
  ['modal fallback',modal.replace('game-over-modal-shell-buttons','future-modal-shell-buttons')],
  ['sidebar fallback',profile.replace('game-review-buttons-component','game-review-buttons-next')],
  ['emphasis fallback','<div class="game-review-emphasis-next">'+row+'</div>'],
];
for(const [name,html] of fixtures) test(`${name}: existing review placement gains a named accuracy summary`,async t=>{
  const p=page(t,'<wc-chess-board></wc-chess-board>'+html);await p.flush();
  assert.equal(p.buttons().length,1);assert.equal(p.sent.filter(m=>m.type==='buttonPreview').length,1);
  p.resolve(result());await p.flush();
  assert.equal(p.buttons()[0].querySelector('.chess-review-button-summary').textContent,'Alice · ~91.2% accuracy');
  assert.match(p.buttons()[0].querySelector('.chess-review-button-summary').title,/depth 8/);
  const original=p.w.document.querySelector('.cc-button-component');assert.equal(original.textContent,'Game Review');
});

test('modal and multiple sidebars share one job and preserve busy states during native updates',async t=>{
  const p=page(t,'<wc-chess-board></wc-chess-board>'+modal+profile+profile);await p.flush();
  assert.equal(p.buttons().length,3);assert.equal(p.sent.filter(m=>m.type==='buttonPreview').length,1);
  const button=p.buttons()[0];button.click();await p.flush();
  p.resolve(result());p.w.document.querySelector('.game-over-modal-shell-buttons a').textContent='Updated review';await p.flush();
  assert.equal(button.disabled,true);assert.equal(button.querySelector('.chess-review-button-summary').hidden,true);
  assert.equal(button.querySelector('.chess-analyzer-free-review-label').textContent,'Opening review…');
  p.pending.find(x=>x.message.type==='freeGameReview').resolve({ok:true});await p.flush();
  assert.equal(button.disabled,false);assert.equal(button.querySelector('.chess-review-button-summary').hidden,false);
  assert.equal(p.buttons()[0],button);assert.equal(p.buttons().length,3);
});

for(const path of ['/game/daily/12345678?flip=true','/analysis/game/live/12345678/review?flip=1']) test(`black perspective survives ${path}`,async t=>{
  const p=page(t,profile,{path});await p.flush();p.resolve(result());await p.flush();
  assert.equal(p.buttons()[0].querySelector('.chess-review-button-summary').textContent,'Bob · ~72.1% accuracy');
});
test('board flip updates the named score without starting another engine',async t=>{
  const p=page(t,'<wc-chess-board></wc-chess-board>'+profile);await p.flush();p.resolve(result());await p.flush();
  p.w.document.querySelector('wc-chess-board').classList.add('flipped');p.refresh();await p.flush();
  assert.match(p.buttons()[0].textContent,/Bob · ~72.1%/);assert.equal(p.sent.filter(m=>m.type==='buttonPreview').length,1);
});
test('unknown perspective shows both colours instead of claiming account ownership',async t=>{
  const p=page(t,profile);await p.flush();p.resolve(result());await p.flush();
  assert.match(p.buttons()[0].textContent,/White ~91.2% · Black ~72.1%/);
  assert.doesNotMatch(p.buttons()[0].textContent,/Your/);
});
test('SPA navigation discards late scores and cancels the old job',async t=>{
  const p=page(t,'<wc-chess-board></wc-chess-board>'+profile);await p.flush();
  p.w.history.pushState({},'','/game/live/99999999');p.resolve(result());await p.flush();
  assert.equal(p.sent.some(m=>m.type==='cancelButtonPreview' && m.key==='chesscom:12345678'),true);
  assert.equal(p.sent.filter(m=>m.type==='buttonPreview').at(-1).key,'chesscom:99999999');
  assert.doesNotMatch(p.buttons()[0].textContent,/91.2/);
  p.resolve(result('chesscom:99999999'),1);await p.flush();assert.match(p.buttons()[0].textContent,/91.2/);
});
test('pagehide cancels computation and removes its polling interval',async t=>{
  const p=page(t,profile);await p.flush();p.w.dispatchEvent(new p.w.Event('pagehide'));
  assert.equal(p.sent.at(-1).type,'cancelButtonPreview');assert.equal(p.intervals.size,0);
  p.resolve(result());await p.flush();assert.doesNotMatch(p.buttons()[0].textContent,/91.2/);
});
test('failed preview leaves review clickable and retries a delayed archive with a bounded backoff',async t=>{
  const p=page(t,profile);await p.flush();p.resolve({ok:false,key:'chesscom:12345678'});await p.flush();
  assert.equal(p.buttons()[0].disabled,false);assert.match(p.buttons()[0].textContent,/unavailable/);
  for(const delay of [2000,5000,10000]) {
    const timer=[...p.timeouts.values()].find(x=>x.delay===delay);assert.ok(timer);timer.fn();await p.flush();
    p.pending.filter(x=>x.message.type==='buttonPreview').at(-1).resolve({ok:false,key:'chesscom:12345678'});await p.flush();
  }
  assert.equal(p.sent.filter(m=>m.type==='buttonPreview').length,4);
  p.buttons()[0].click();assert.equal(p.sent.at(-1).type,'freeGameReview');
});
test('a saved full review replaces estimates and adds Brilliant/Great counts on every placement',async t=>{
  const p=page(t,'<wc-chess-board></wc-chess-board>'+modal+profile);await p.flush();p.resolve(result());await p.flush();
  p.changes[0]({library:{newValue:[]}},'local');await p.flush();
  p.resolve({...result(),estimated:false,counts:{w:{brilliant:1,great:3},b:{brilliant:0,great:0}}},1);await p.flush();
  for(const button of p.buttons()) {
    assert.match(button.textContent,/Alice · 91.2% accuracy · 1 Brilliant · 3 Great/);assert.doesNotMatch(button.textContent,/~|Estimating/);
  }
});
test('a retry paused in a hidden tab resumes when that tab becomes visible',async t=>{
  const p=page(t,profile);await p.flush();p.resolve({ok:false,key:'chesscom:12345678'});await p.flush();
  let hidden=true;Object.defineProperty(p.w.document,'hidden',{get:()=>hidden});
  p.w.document.dispatchEvent(new p.w.Event('visibilitychange'));
  [...p.timeouts.values()].find(x=>x.delay===2000).fn();await p.flush();
  assert.equal(p.sent.filter(m=>m.type==='buttonPreview').length,1);
  hidden=false;p.w.document.dispatchEvent(new p.w.Event('visibilitychange'));await p.flush();
  assert.equal(p.sent.filter(m=>m.type==='buttonPreview').length,2);
  p.resolve(result(),1);await p.flush();assert.match(p.buttons()[0].textContent,/91.2/);
});
test('Vue replacement preserves the finished preview without duplicate requests',async t=>{
  const p=page(t,'<wc-chess-board></wc-chess-board>'+profile);await p.flush();p.resolve(result());await p.flush();
  p.w.document.querySelector('.sidebar-content').outerHTML=profile;await p.flush();
  assert.equal(p.buttons().length,1);assert.match(p.buttons()[0].textContent,/91.2/);
  assert.equal(p.sent.filter(m=>m.type==='buttonPreview').length,1);
});

for(const [name,html] of [['round',follow],['legacy',follow.replace('rcontrols','old-controls')],
  ['selector fallback',follow.replace('follow-up','future-follow-up')],['no analysis link',follow.replace(/<a.*?<\/a>/,'')]]) {
  test(`Lichess ${name}: summary and original review click work beneath the native action`,async t=>{
    const p=page(t,'<cg-container></cg-container><div class="cg-wrap orientation-black"></div>'+html,{site:'lichess',path:'/game/12345678abcd/black'});await p.flush();
    assert.equal(p.buttons().length,1);p.resolve(result('lichess:12345678'));await p.flush();
    const button=p.buttons()[0];assert.match(button.textContent,/Bob · ~72.1% accuracy/);button.click();await p.flush();
    assert.equal(button.disabled,true);assert.equal(button.querySelector('.chess-review-button-summary').hidden,true);
    assert.equal(p.sent.at(-1).type,'freeGameReview');assert.equal(p.sent.at(-1).gameKey,'https://lichess.org/game/12345678abcd/black');
    p.pending.find(x=>x.message.type==='freeGameReview').resolve({ok:true});await p.flush();assert.equal(button.disabled,false);
  });
}
for(const site of ['chess','lichess']) test(`${site}: an ongoing board without post-game controls never requests an analysis`,async t=>{
  const p=page(t,site==='chess'?'<wc-chess-board></wc-chess-board>':'<cg-container></cg-container>',{site});await p.flush();
  assert.equal(p.buttons().length,0);assert.equal(p.sent.length,0);
});
