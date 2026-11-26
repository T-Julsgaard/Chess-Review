import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';

function review(t) {
  const a=app(t), S=loadGame(a,'1. f3 e5 2. g4 Qh4#');
  a.call('computeDerived');S.idx=3;S.classif[3]='mistake';
  S.evals[2]={cp:-30};S.evals[3]={mate:-1};
  S.bests[2]={pv:'g2g3 d7d5'};S.bests[3]={pv:'d8h4'};
  a.call('buildUI');a.call('renderAll');a.call('applySettings');
  return a;
}

test('Coach offers concise Engine explanations with an assessment and unchanged analysis',async t=>{
  const a=review(t),S=a.state,doc=a.dom.window.document;
  const snapshot=()=>JSON.stringify({pgn:S.pgn,idx:S.idx,evals:S.evals,classif:S.classif,grades:S.moveGrades,
    layout:S.layout,layoutMode:S.layoutMode,theme:S.settings.boardTheme,accent:S.settings.accent,mode:S.settings.reviewMode});
  const unchanged=snapshot(),plain=a.run('_ipText');
  await a.call('toggleSettings');a.call('selectSettingsCategory','review');
  [...doc.querySelectorAll('.set-sect-head')].find(n=>n.textContent==='Coach').click();
  const control=enabled=>doc.querySelector(`[data-setting="coachEngineReplies"][data-value="${enabled}"]`);
  assert.equal(control(false).getAttribute('aria-pressed'),'true');
  assert.equal(control(true).closest('.set-section').querySelector('.set-sect-head').textContent,'Coach');
  control(true).focus();control(true).click();
  await a.run('_settingsWriteQueue');await settle();
  assert.equal(a.store.settings.coachEngineReplies,true);
  assert.equal(control(true).getAttribute('aria-pressed'),'true');
  assert.equal(doc.activeElement,control(true));
  const body=a.call('renderMoveComment');
  assert.equal(body.querySelector('.ip-head,.ip-move'),null);
  const badge=body.querySelector('.ip-assessment-row > .ip-badge');
  assert.ok(badge);
  assert.equal(badge.src,a.call('gradeBadge','mistake',S.moveGrades[S.idx],'ip-badge').src);
  assert.equal(body.querySelector('.ip-assessment').textContent,'g4 is a mistake.');
  assert.equal(body.querySelector('.ip-assessment .ip-move-link'),null);
  assert.equal(body.querySelector('.ip-text').textContent,'This allows Queen h4, checkmate. Better was Pawn g3.');
  assert.equal(body.querySelector('.dopamine-line,.dopamine-evaluation,.dopamine-detail'),null);
  assert.equal(doc.querySelector('.dopamine-comment,.dopamine-effect'),null);
  assert.equal(snapshot(),unchanged);
  await a.call('setCoachEngineReplies',false);
  assert.equal(a.run('_ipText'),plain);
  assert.equal(a.call('renderMoveComment').querySelector('.ip-move').textContent,'g4');
  assert.equal(snapshot(),unchanged);
});

test('Engine explanations and Special replies switch one another off while retaining the coach',async t=>{
  const a=review(t),S=a.state;
  S.settings.coach='old_soviet';
  const bank={move_quality:{mistake:['A special reply.']}};
  a.replace('loadCoach',async()=>bank);
  await a.call('setCoachPlain',false);
  assert.equal(S.coach,bank);
  await a.call('setCoachEngineReplies',true);
  assert.equal(S.settings.coach,'old_soviet');
  assert.equal(S.settings.coachPlain,true);
  assert.equal(S.coach,null);
  assert.match(a.call('renderMoveComment').querySelector('.ip-text').textContent,/This allows Queen h4/);
  await a.call('setCoachPlain',false);
  assert.equal(S.settings.coachEngineReplies,false);
  assert.equal(a.store.settings.coachEngineReplies,false);
  assert.equal(S.coach,bank);
  assert.doesNotMatch(a.run('_ipText'),/This allows Queen h4/);
});

test('Engine explanations persist without a coach and survive a visual reset',async t=>{
  const a=review(t);
  await a.call('setCoach','');await a.call('setCoachEngineReplies',true);
  const restored=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease',async()=>{});
  restored.store.settings={...a.store.settings,coachDefaulted:true};
  await restored.start();
  assert.equal(restored.state.settings.coach,'');
  assert.equal(restored.state.settings.coachEngineReplies,true);
  assert.equal(restored.call('engineExplanationsEnabled'),true);
  assert.equal(restored.dom.window.document.documentElement.dataset.reviewMode,'normal');
  await restored.call('resetVisualSettings');
  assert.equal(restored.state.settings.coachEngineReplies,true);
  assert.equal(restored.call('engineExplanationsEnabled'),true);
});

test('Dopamine keeps its existing explanations until an explicit Coach choice overrides them',async t=>{
  const a=review(t);
  await a.call('setSetting','reviewMode','dopamine');
  assert.equal(a.call('engineExplanationsEnabled'),true);
  assert.ok(a.call('renderMoveComment').querySelector('.dopamine-line'));
  assert.equal(a.call('renderMoveComment').querySelector('.ip-head'),null);
  await a.call('setCoachEngineReplies',false);
  assert.equal(a.call('engineExplanationsEnabled'),false);
  assert.equal(a.call('renderMoveComment').querySelector('.dopamine-line'),null);
  const restored=app(t,{url:'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease',async()=>{});
  restored.store.settings={...a.store.settings,coachDefaulted:true};
  await restored.start();
  assert.equal(restored.state.settings.reviewMode,'dopamine');
  assert.equal(restored.call('engineExplanationsEnabled'),false);
  await a.call('setCoachEngineReplies',true);
  await a.call('setSetting','reviewMode','normal');
  assert.match(a.call('renderMoveComment').querySelector('.ip-text').textContent,/This allows Queen h4/);
  assert.equal(a.call('renderMoveComment').querySelector('.dopamine-line'),null);
});

test('Insights switch persists, restores the portrait and keeps keyboard focus',async t=>{
  const a=review(t),S=a.state,doc=a.dom.window.document;
  await a.call('setCoach','old_soviet');
  const canvas=a.run('UI.canvas'),mod=a.run('UI.coach.closest(".mod")');
  assert.equal(canvas.classList.contains('has-coach'),true);
  const toggle=()=>doc.querySelector('.ip-explanations-toggle');
  const close=doc.querySelector('.ip-close-game');
  assert.ok(toggle().compareDocumentPosition(close)&doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
  toggle().focus();toggle().click();await a.run('_settingsWriteQueue');await settle();
  assert.equal(a.store.settings.coachEngineReplies,true);
  assert.equal(toggle().getAttribute('aria-checked'),'true');
  assert.equal(doc.activeElement,toggle());
  assert.equal(mod.hidden,true);
  assert.equal(canvas.classList.contains('has-coach'),false);
  assert.equal(a.run('_coachFrame'),null);
  assert.equal(S.settings.coach,'old_soviet');
  toggle().click();await a.run('_settingsWriteQueue');await settle();
  assert.equal(toggle().getAttribute('aria-checked'),'false');
  assert.equal(mod.hidden,false);
  assert.equal(canvas.classList.contains('has-coach'),true);
  assert.ok(a.run('_coachFrame'));
});

test('Show threat previews the saved reply for either player without a search or score changes',async t=>{
  const a=review(t),S=a.state,doc=a.dom.window.document;
  await a.call('setCoachEngineReplies',true);
  const snapshot=JSON.stringify([S.evals,S.bests,S.classif,S.moveGrades]);
  const button=()=>doc.querySelector('.ip-show-threat');
  button().click();await settle();
  assert.equal(button().getAttribute('aria-pressed'),'true');
  assert.equal(a.run('_reviewThreat.uci'),'d8h4');
  assert.ok(doc.querySelector('svg.threat-arrow'));
  assert.equal(S.helperEngine,null);
  assert.equal(S.settings.showThreat,false);
  S.flipped=!S.flipped;a.call('paintBoard');
  assert.ok(doc.querySelector('svg.threat-arrow'));
  button().click();await settle();
  assert.equal(doc.querySelector('svg.threat-arrow'),null);
  assert.equal(doc.activeElement,button());
  button().click();await settle();
  a.call('go',2);
  assert.equal(doc.querySelector('svg.threat-arrow'),null);
  assert.equal(a.run('_reviewThreat'),null);
  a.call('go',3);
  assert.equal(button().getAttribute('aria-pressed'),'false');
  assert.equal(JSON.stringify([S.evals,S.bests,S.classif,S.moveGrades]),snapshot);

  // Now the bad move belongs to Black: the preview must show White's reply.
  loadGame(a,'1. e4 f6 2. d4 g5 3. Qh5#');S.idx=4;S.meSide='w';
  S.classif[4]='blunder';S.evals[4]={mate:1};S.bests[4]={pv:'d1h5'};
  a.call('paintBoard');a.call('renderReview');
  button().click();await settle();
  assert.equal(a.run('_reviewThreat.uci'),'d1h5');
  assert.ok(doc.querySelector('svg.threat-arrow'));
  assert.equal(S.helperEngine,null);
  await a.call('setCoachEngineReplies',false);
  assert.equal(doc.querySelector('svg.threat-arrow'),null);
});

test('threat previews abstain for good, terminal, illegal and provisional replies',async t=>{
  const a=review(t),S=a.state;
  await a.call('setCoachEngineReplies',true);
  S.bests[3]={pv:'d8h4',lines:[{multipv:1,pv:'d8h4',bound:'lowerbound'}]};
  assert.equal(a.call('renderMoveComment').querySelector('.ip-show-threat'),null);
  S.bests[3]={pv:'a8a1'};
  assert.equal(a.call('renderMoveComment').querySelector('.ip-show-threat'),null);
  S.bests[3]={pv:'d8h4'};S.classif[3]='best';
  assert.equal(a.call('renderMoveComment').querySelector('.ip-show-threat'),null);
  S.idx=4;S.classif[4]='blunder';S.bests[4]={pv:'e1f2'};
  assert.equal(a.call('renderMoveComment').querySelector('.ip-show-threat'),null);
});

test('explanations write out without changing their text or restarting on a repaint',async t=>{
  const a=review(t),S=a.state,doc=a.dom.window.document;
  let now=0;a.context.performance={now:()=>now};
  S.settings.uiAnim=true;
  await a.call('setCoachEngineReplies',true);
  const text=()=>doc.querySelector('.insight-panel .ip-text');
  const full=text().textContent,first=text().querySelector('.ip-written-char');
  assert.ok(first);
  assert.equal(first.style.getPropertyValue('--ink-delay'),'0ms');
  assert.equal(text().textContent,full);
  now=200;a.call('renderReview');
  assert.equal(text().querySelector('.ip-written-char').style.getPropertyValue('--ink-delay'),'-200ms');
  assert.equal(text().textContent,full);
  now=700;a.call('renderReview');
  assert.equal(text().querySelector('.ip-written-char'),null);
  assert.equal(text().textContent,full);
  a.call('go',2);a.call('go',3);
  assert.equal(text().querySelector('.ip-written-char').style.getPropertyValue('--ink-delay'),'0ms');
  assert.equal(first.isConnected,false);
});

test('written explanations respect reduced motion and sequence Dopamine detail after the summary',async t=>{
  const a=review(t),S=a.state;
  a.context.performance={now:()=>0};S.settings.uiAnim=true;
  a.dom.window.matchMedia=()=>({matches:true});
  await a.call('setCoachEngineReplies',true);
  assert.equal(a.call('renderMoveComment').querySelector('.ip-written-char'),null);
  a.dom.window.matchMedia=()=>({matches:false});S.settings.uiAnim=false;
  assert.equal(a.call('renderMoveComment').querySelector('.ip-written-char'),null);
  S.settings.uiAnim=true;
  await a.call('setSetting','reviewMode','dopamine');
  const body=a.call('renderMoveComment');
  const summary=body.querySelector('.ip-text'),detail=body.querySelector('.engine-explanation-detail');
  assert.ok(detail);
  const delay=node=>parseFloat(node.style.getPropertyValue('--ink-delay'));
  assert.ok(delay(detail.firstElementChild)>delay(summary.lastElementChild));
});

test('explanations over three rendered lines keep the first sentence and refit on resize',async t=>{
  const a=review(t),win=a.dom.window,doc=win.document;
  let fullLines=3,width=300,now=0;
  const observers=[];
  win.ResizeObserver=class {
    constructor(callback){this.callback=callback;observers.push(this);}
    observe(node){(this.nodes ||= []).push(node);}
    disconnect(){this.disconnected=true;}
  };
  const style=a.context.getComputedStyle;
  a.context.getComputedStyle=node=>node.matches('.ip-text')?{lineHeight:'20px'}:style(node);
  const rect=win.HTMLElement.prototype.getBoundingClientRect;
  win.HTMLElement.prototype.getBoundingClientRect=function(){
    return this.matches('.ip-text')?{width}:rect.call(this);
  };
  const summary='This allows Queen h4, checkmate.';
  const full=summary+' Better was Pawn g3.';
  Object.defineProperty(win.HTMLElement.prototype,'scrollHeight',{get(){
    return this.textContent===full?fullLines*20:40;
  }});
  a.context.performance={now:()=>now};a.state.settings.uiAnim=true;
  await a.call('setCoachEngineReplies',true);
  const text=()=>doc.querySelector('.insight-panel .ip-text');
  assert.equal(text().textContent,full,'Exactly three lines stay intact');
  const observer=observers.at(-1);
  assert.equal(observer.nodes[0],text());
  assert.equal(observer.nodes[1],text().parentElement);
  now=200;fullLines=4;observer.callback();
  assert.equal(text().textContent,summary);
  assert.equal(text().querySelector('.ip-move-link').textContent,'Queen h4');
  assert.equal(text().querySelectorAll('.ip-move-link').length,1);
  assert.equal(text().querySelector('.ip-written-char').style.getPropertyValue('--ink-delay'),'-200ms');
  assert.ok(text().classList.contains('ip-explanation-limited'));
  width=0;fullLines=2;observer.callback();
  assert.equal(text().textContent,summary,'Wait until hidden panels have a measurable width');
  width=600;observer.callback();
  assert.equal(text().textContent,full,'Widening restores the original explanation');
  assert.equal(text().querySelectorAll('.ip-move-link').length,2);
  Object.defineProperty(text().parentElement,'clientHeight',{configurable:true,value:20});
  observer.callback();
  assert.equal(text().textContent,summary,'Short panels also discard the extra sentence');
  assert.equal(text().style.getPropertyValue('--ip-explanation-lines'),'1');
  a.call('renderReview');
  assert.equal(observer.disconnected,true,'Repaints stop observing the replaced node');
  await a.call('setSetting','reviewMode','dopamine');
  assert.equal(text().classList.contains('ip-explanation-limited'),false,'Rich exploration remains scrollable');
});

test('explanation moves preview only on hover with their category badge; assessment headings retain plain SAN',async t=>{
  const a=review(t),S=a.state;
  await a.call('setCoachEngineReplies',true);
  const before=JSON.stringify([S.evals,S.bests,S.classif,S.moveGrades]);
  a.replace('playLine',()=>assert.fail('An explanation preview must not open analysis'));
  const body=a.dom.window.document.querySelector('.insight-panel');
  const links=[...body.querySelectorAll('.ip-text .ip-move-link')];
  assert.deepEqual(links.map(link=>link.textContent),['Queen h4','Pawn g3']);
  const previewPiece=square=>a.dom.window.document.querySelector('.move-preview')?.children[
    [...a.run('UI.boardWrap').querySelector('.board').children].indexOf(a.run('sqByName')[square])
  ]?.querySelector('.piece-img')?.dataset.piece;
  assert.equal(links[0].tagName,'SPAN');
  links[0].click();assert.equal(previewPiece('h4'),undefined);
  links[0].dispatchEvent(new a.dom.window.Event('pointerenter'));
  assert.equal(previewPiece('h4'),'bQ');
  const badge=()=>a.dom.window.document.querySelector('.move-preview .sq-badge');
  assert.equal(badge().dataset.badgeCategory,'best');
  assert.equal(badge().querySelector('.grade-numeral').textContent,'9.0');
  assert.equal(badge().getAttribute('aria-label'),'Best, score 9');
  assert.equal(badge().parentElement.querySelector('.piece-img').dataset.piece,'bQ');
  const layer=a.dom.window.document.querySelector('.move-preview');
  links[0].click();assert.equal(a.dom.window.document.querySelector('.move-preview'),layer);
  assert.equal(S.idx,3);assert.equal(S.analysisMode,false);assert.equal(S.variation,null);
  // Hovering the alternative first undoes the played move, then previews it.
  links[1].dispatchEvent(new a.dom.window.Event('pointerenter'));
  assert.equal(previewPiece('g3'),'wP');assert.equal(S.idx,3);
  assert.equal(badge().dataset.badgeCategory,'best');
  assert.equal(badge().querySelector('.grade-numeral').textContent,'9.0');
  assert.equal(badge().parentElement.querySelector('.piece-img').dataset.piece,'wP');
  links[1].dispatchEvent(new a.dom.window.Event('pointerleave'));
  assert.equal(a.dom.window.document.querySelector('.move-preview'),null);
  assert.equal(JSON.stringify([S.evals,S.bests,S.classif,S.moveGrades]),before);
  a.call('go',3);
  links[0].click();assert.equal(a.dom.window.document.querySelector('.move-preview'),null);
  for(const [category,text] of [['blunder','g4 is a blunder.'],['best','g4 is the best move.']]) {
    S.classif[3]=category;
    const heading=a.call('renderMoveComment').querySelector('.ip-assessment');
    assert.equal(heading.textContent,text);
    assert.equal(heading.childElementCount,0);
  }
});

test('explanation hover badges follow selected symbols, fonts and appearances',async t=>{
  const a=review(t),doc=a.dom.window.document;
  await a.call('setCoachEngineReplies',true);
  const hover=()=>doc.querySelector('.ip-move-link').dispatchEvent(new a.dom.window.Event('pointerenter'));
  const badge=()=>doc.querySelector('.move-preview .sq-badge');
  const expected=()=>a.call('gradeBadge','best',9,'sq-badge');
  hover();
  for (const appearance of ['solid','ink-mineral','enamel']) {
    await a.call('setSetting','badgeAppearance',appearance);
    await a.call('setCategoryBadgeSymbol','best','crown');
    assert.equal(badge().querySelector('.category-symbol').dataset.symbol,'crown');
    assert.equal(badge().innerHTML,expected().innerHTML);
    hover();
    assert.equal(badge().innerHTML,expected().innerHTML);
    await a.call('setCategoryBadgeSymbol','best','numbers');
    await a.call('setSetting','badgeFont','lora');
    assert.equal(badge().querySelector('.grade-numeral').textContent,'9.0');
    assert.match(badge().querySelector('.grade-numeral').getAttribute('font-family'),/Badge Lora/);
    assert.equal(badge().innerHTML,expected().innerHTML);
    hover();
    assert.equal(badge().innerHTML,expected().innerHTML);
  }
});

test('move previews clean up on navigation, board input, Escape and window blur',async t=>{
  const a=review(t),doc=a.dom.window.document;
  await a.call('setCoachEngineReplies',true);
  const hover=()=>doc.querySelector('.ip-move-link').dispatchEvent(new a.dom.window.Event('pointerenter'));
  const shown=()=>!!doc.querySelector('.move-preview');
  for (const stop of [
    ()=>a.call('go',2),
    ()=>a.run('UI.boardWrap').dispatchEvent(new a.dom.window.Event('pointerdown')),
    ()=>doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})),
    ()=>a.dom.window.dispatchEvent(new a.dom.window.Event('blur')),
    ()=>a.call('buildBoard'),
  ]) {
    a.call('go',3);hover();assert.equal(shown(),true);
    stop();assert.equal(shown(),false);
  }
  const link=doc.querySelector('.ip-move-link'),touch=new a.dom.window.Event('pointerenter');
  Object.defineProperty(touch,'pointerType',{value:'touch'});
  link.dispatchEvent(touch);assert.equal(shown(),false);
  link.click();assert.equal(shown(),false);
});
