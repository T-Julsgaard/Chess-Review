import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame,settle} from './helpers/app.mjs';

function settings(t) {
  const a=app(t);loadGame(a,'1. e4 e5');a.state.settings.uiAnim=true;a.call('buildUI');a.call('toggleSettings');
  const doc=a.dom.window.document;
  return {a,doc,choose:id=>doc.querySelector(`[data-category="${id}"]`).click(),
    trigger:()=>doc.querySelector('.set-category > .lib-dd-btn')};
}

test('category selection mounts only the intended controls without saving or changing review state',t=>{
  const {a,doc,choose,trigger}=settings(t),before=structuredClone(a.state.settings),writes=a.writes.length;
  const sections=()=>[...doc.querySelectorAll('.set-sect-head > span:first-child')].map(n=>n.textContent);
  for(const [id,expected] of [
    ['review',['Review experience','Coach']],['engine',['Search','Estimated rating','Engine']],
    ['sound',['General','Move','Capture','Check','Castle','Puzzle success','Incorrect puzzle','Puzzle intro']],['developer',['Developer debugger']],
  ]){
    trigger().click();choose(id);
    assert.deepEqual(sections(),expected);
    assert.equal(doc.querySelectorAll('[role=menuitemradio][aria-checked=true]').length,1);
    assert.equal(doc.querySelector('[role=menuitemradio][aria-checked=true]').dataset.category,id);
    assert.equal(doc.querySelector('.set-category.open'),null);
    assert.equal(doc.activeElement,trigger());
  }
  choose('visual');
  assert.ok(sections().includes('Board & Pieces'));assert.ok(!sections().includes('Incorrect puzzle'));
  assert.deepEqual(structuredClone(a.state.settings),before);assert.equal(a.writes.length,writes);
  assert.equal(a.state.idx,0);
});

test('category menu supports arrow navigation, boundaries, Escape, Tab and focus leaving the menu',async t=>{
  const {a,doc,trigger}=settings(t);
  const key=value=>doc.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  trigger().click();
  // Native browsers may dispatch focusout before activeElement becomes the item.
  trigger().dispatchEvent(new a.dom.window.FocusEvent('focusout',{bubbles:true,relatedTarget:doc.querySelector('[data-category=engine]')}));
  await settle();assert.equal(trigger().getAttribute('aria-expanded'),'true');
  trigger().focus();key('ArrowDown');
  assert.equal(trigger().getAttribute('aria-expanded'),'true');assert.equal(doc.activeElement.dataset.category,'visual');
  key('End');assert.equal(doc.activeElement.dataset.category,'developer');
  key('ArrowDown');assert.equal(doc.activeElement.dataset.category,'visual');
  key('ArrowUp');assert.equal(doc.activeElement.dataset.category,'developer');
  key('Home');assert.equal(doc.activeElement.dataset.category,'visual');
  key('Escape');assert.equal(doc.activeElement,trigger());assert.equal(trigger().getAttribute('aria-expanded'),'false');
  key('ArrowDown');key('Tab');assert.equal(trigger().getAttribute('aria-expanded'),'false');
  trigger().focus();key('ArrowDown');doc.querySelector('.set-sect-head').focus();await settle();
  assert.equal(trigger().getAttribute('aria-expanded'),'false');assert.equal(a.state.idx,0);
});

test('category transitions respect interface motion, preserve category scroll and do not replay on edits',async t=>{
  const {a,doc,choose}=settings(t),panel=doc.querySelector('#settings');
  panel.scrollTop=90;choose('sound');assert.equal(panel.scrollTop,0);
  assert.equal(doc.querySelector('.set-category-content').dataset.enter,'true');
  panel.scrollTop=140;choose('visual');assert.equal(panel.scrollTop,90);
  choose('sound');assert.equal(panel.scrollTop,140);
  await a.call('setSetting','sound',false);
  assert.equal(doc.querySelector('.set-category-content').dataset.enter,'false');
  a.state.settings.uiAnim=false;choose('review');
  assert.equal(doc.querySelector('.set-category-content').dataset.enter,'false');
  assert.equal(doc.querySelector('.set-category').dataset.motion,'off');
});

test('leaving a category collapses its sections while edits and reselecting it preserve expansion',async t=>{
  const {a,doc,choose}=settings(t);
  const open=title=>[...doc.querySelectorAll('.set-sect-head')].find(n=>n.textContent===title).click();
  open('Tabs');assert.equal(doc.querySelector('.set-section.open .set-sect-head').textContent,'Tabs');
  choose('visual');assert.equal(doc.querySelector('.set-section.open .set-sect-head').textContent,'Tabs');
  await a.call('setSetting','barStyle','classic');
  assert.equal(doc.querySelector('.set-section.open .set-sect-head').textContent,'Tabs');
  choose('engine');open('Search');choose('visual');assert.equal(doc.querySelector('.set-section.open'),null);
  choose('engine');assert.equal(doc.querySelector('.set-section.open'),null);
  // Every category opens collapsed, including the first visit after a page load.
  for(const id of ['review','sound','developer']){choose(id);assert.equal(doc.querySelector('.set-section.open'),null);}
  choose('review');open('Review experience');choose('visual');choose('review');assert.equal(doc.querySelector('.set-section.open'),null);
});

test('visual and sound resets leave the other categories intact',async t=>{
  const {a,doc,choose}=settings(t);
  Object.assign(a.state.settings,{sound:false,soundVolume:22,reviewMode:'dopamine',coach:'',coachEngineReplies:true,engineDepth:12});
  await a.call('resetVisualSettings');
  for(const [key,value] of Object.entries({sound:false,soundVolume:22,reviewMode:'dopamine',coach:'',coachEngineReplies:true,engineDepth:12}))assert.equal(a.state.settings[key],value);
  choose('sound');
  [...doc.querySelectorAll('.set-reset')].find(n=>n.textContent==='Reset all sound settings').click();await a.run('_settingsWriteQueue');await settle();
  assert.equal(a.state.settings.sound,true);assert.equal(a.state.settings.soundVolume,50);
  assert.equal(a.state.settings.reviewMode,'dopamine');assert.equal(a.state.settings.coachEngineReplies,true);assert.equal(a.state.settings.engineDepth,12);
});
