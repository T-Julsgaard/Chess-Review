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
  assert.equal(body.querySelector('.ip-text').textContent,'This allows Qh4#, checkmate. Better was g3.');
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
  assert.match(a.call('renderMoveComment').querySelector('.ip-text').textContent,/This allows Qh4#/);
  await a.call('setCoachPlain',false);
  assert.equal(S.settings.coachEngineReplies,false);
  assert.equal(a.store.settings.coachEngineReplies,false);
  assert.equal(S.coach,bank);
  assert.doesNotMatch(a.run('_ipText'),/This allows Qh4#/);
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
  assert.match(a.call('renderMoveComment').querySelector('.ip-text').textContent,/This allows Qh4#/);
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
  now=2000;a.call('renderReview');
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
