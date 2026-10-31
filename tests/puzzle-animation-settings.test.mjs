import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame} from './helpers/app.mjs';

test('settings offer General and Engine without puzzle animation controls',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('buildUI');await a.call('toggleSettings');
  const doc=a.dom.window.document;
  assert.deepEqual([...doc.querySelectorAll('.set-tab')].map(n=>n.textContent),['General','Engine']);
  assert.equal(Object.hasOwn(a.state.settings,'puzzleStartAnimation'),false);
  assert.equal(Object.hasOwn(a.state.settings,'puzzleEndAnimation'),false);
  for(const tab of doc.querySelectorAll('.set-tab')){
    tab.click();
    assert.equal(doc.querySelector('[data-setting=puzzleStartAnimation],[data-setting=puzzleEndAnimation],.puzzle-animation-preview'),null);
  }
});

test('interface animation and piece moves can be changed and saved independently',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('buildUI');await a.call('toggleSettings');
  const doc=a.dom.window.document;
  assert.equal(a.run('DEFAULT_SETTINGS.uiAnim'),true);
  assert.equal(a.run('DEFAULT_SETTINGS.moveAnim'),true);
  assert.ok(doc.querySelector('[data-setting=uiAnim]'));
  assert.ok(doc.querySelector('[data-setting=moveAnim]'));
  await a.call('setSetting','uiAnim',true);
  await a.call('setSetting','moveAnim',false);
  assert.equal(a.state.settings.uiAnim,true);
  assert.equal(a.store.settings.uiAnim,true);
  assert.equal(a.store.settings.moveAnim,false);
  assert.equal(doc.querySelector('#learningToggle').dataset.motion,'on');
  await a.call('setSetting','uiAnim',false);
  await a.call('setSetting','moveAnim',true);
  assert.equal(a.state.settings.uiAnim,false);
  assert.equal(a.store.settings.uiAnim,false);
  assert.equal(a.store.settings.moveAnim,true);
  assert.equal(doc.querySelector('#learningToggle').dataset.motion,'off');
});
