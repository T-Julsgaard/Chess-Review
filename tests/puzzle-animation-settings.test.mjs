import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame} from './helpers/app.mjs';

test('settings offer Visual and Engine without puzzle animation controls',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('buildUI');await a.call('toggleSettings');
  const doc=a.dom.window.document;
  assert.deepEqual([...doc.querySelectorAll('.set-tab')].map(n=>n.textContent),['Visual','Engine']);
  assert.equal(Object.hasOwn(a.state.settings,'puzzleStartAnimation'),false);
  assert.equal(Object.hasOwn(a.state.settings,'puzzleEndAnimation'),false);
  for(const tab of doc.querySelectorAll('.set-tab')){
    tab.click();
    assert.equal(doc.querySelector('[data-setting=puzzleStartAnimation],[data-setting=puzzleEndAnimation],.puzzle-animation-preview'),null);
  }
});
