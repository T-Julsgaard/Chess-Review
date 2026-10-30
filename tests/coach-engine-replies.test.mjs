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

test('Coach offers text-only Engine explanations without changing Normal visuals or analysis',async t=>{
  const a=review(t),S=a.state,doc=a.dom.window.document;
  const snapshot=()=>JSON.stringify({pgn:S.pgn,idx:S.idx,evals:S.evals,classif:S.classif,grades:S.moveGrades,
    layout:S.layout,layoutMode:S.layoutMode,theme:S.settings.boardTheme,accent:S.settings.accent,mode:S.settings.reviewMode});
  const unchanged=snapshot(),plain=a.run('_ipText');
  await a.call('toggleSettings');
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
  assert.equal(body.querySelector('.ip-text').textContent,'This allows Qh4#, checkmate. Black can end the game immediately; White has no legal answer to the check.');
  assert.equal(body.querySelector('.dopamine-line,.dopamine-evaluation,.dopamine-detail'),null);
  assert.equal(doc.querySelector('.dopamine-comment,.dopamine-effect'),null);
  assert.equal(snapshot(),unchanged);
  await a.call('setCoachEngineReplies',false);
  assert.equal(a.run('_ipText'),plain);
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

test('Engine explanations persist without a coach and visual reset returns to the default reply style',async t=>{
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
  assert.equal(restored.state.settings.coachEngineReplies,null);
  assert.equal(restored.call('engineExplanationsEnabled'),false);
});

test('Dopamine keeps its existing explanations until an explicit Coach choice overrides them',async t=>{
  const a=review(t);
  await a.call('setSetting','reviewMode','dopamine');
  assert.equal(a.call('engineExplanationsEnabled'),true);
  assert.ok(a.call('renderMoveComment').querySelector('.dopamine-line'));
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
