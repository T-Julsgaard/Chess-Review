import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createReviewEffects} from '../lib/review-effects.js';
import {app, loadGame} from './helpers/app.mjs';

function fixture(t) {
  const dom = new JSDOM('<div class="board"></div>');
  t.after(() => dom.window.close());
  const effects = createReviewEffects(dom.window.document);
  const board = dom.window.document.querySelector('.board');
  const move = {key: 'game:1', category: 'brilliant', label: 'Brilliant', square: 'e4', enabled: true};
  return {dom, effects, board, move};
}

test('repaints do not repeat rewards, and navigation cancels the previous celebration', t => {
  const {effects, board, move} = fixture(t);
  effects.update(board, move);
  const first = board.querySelector('.dopamine-effect');
  assert.ok(first);
  assert.equal(first.querySelectorAll('.dopamine-spark').length, 24);
  effects.update(board, move);
  assert.equal(board.querySelector('.dopamine-effect'), first);
  effects.update(board, {...move, key: 'game:2', category: 'book'});
  assert.equal(board.querySelector('.dopamine-effect'), null);
  effects.update(board, {...move, key: 'game:3', category: 'great'});
  assert.ok(board.querySelector('.dopamine-ripple'));
  assert.equal(board.querySelectorAll('.dopamine-spark').length, 10);
  effects.update(board, {...move, key: 'game:4', enabled: false});
  assert.equal(board.childElementCount, 0);
});

test('effects honor reduced motion and orient the ripple to the destination square', t => {
  const {dom, effects, board, move} = fixture(t);
  dom.window.matchMedia = () => ({matches: true});
  effects.show(board, move);
  const first = board.firstElementChild;
  assert.equal(first.dataset.motion, 'off');
  assert.equal(first.querySelector('.dopamine-wave'), null);
  assert.equal(first.style.getPropertyValue('--effect-x'), '56.25%');
  assert.equal(first.style.getPropertyValue('--effect-y'), '56.25%');
  dom.window.matchMedia = () => ({matches: false});
  effects.show(board, {...move, flipped: true, motion: false});
  assert.equal(board.firstElementChild.dataset.motion, 'off');
  assert.equal(board.firstElementChild.style.getPropertyValue('--effect-x'), '43.75%');
  assert.equal(board.firstElementChild.style.getPropertyValue('--effect-y'), '43.75%');
});

test('Brilliant square waves start at the landing square and follow board orientation', t => {
  const {effects, board, move} = fixture(t);
  effects.show(board, {...move, square: 'h8'});
  let cells = [...board.querySelectorAll('.dopamine-wave-cell')];
  assert.equal(cells.length, 64);
  const delays = () => cells.map(cell => Number.parseInt(cell.style.getPropertyValue('--wave-delay')));
  assert.equal(delays()[7], 0); // h8 is top right with White below.
  assert.equal(delays()[6], 65);
  assert.equal(delays()[15], 65);
  assert.equal(Math.max(...delays()), delays()[56]);
  effects.show(board, {...move, square: 'h8', flipped: true});
  cells = [...board.querySelectorAll('.dopamine-wave-cell')];
  assert.equal(delays()[56], 0); // h8 is bottom left with Black below.
  assert.equal(delays()[57], 65);
  assert.equal(delays()[48], 65);
  assert.equal(Math.max(...delays()), delays()[7]);
  effects.show(board, {...move, category: 'great'});
  assert.equal(board.querySelector('.dopamine-wave'), null);
});

test('blunders have a full-board reaction and grade corrections cancel stale reactions', t => {
  const {effects, board, move} = fixture(t);
  effects.update(board, {...move, category:'blunder'});
  assert.equal(board.querySelector('.dopamine-effect').dataset.category, 'blunder');
  assert.equal(board.querySelectorAll('.dopamine-wave-cell').length, 64);
  assert.equal(board.textContent, '');
  effects.update(board, {...move, category:'good'});
  assert.equal(board.childElementCount, 0);
});

test('the first grade arriving at the selected move reacts once, without replaying on repaints or toggles', t => {
  const {effects, board, move} = fixture(t);
  effects.update(board, {...move, category:null});
  assert.equal(board.childElementCount, 0);
  effects.update(board, move);
  const reaction = board.firstElementChild;
  assert.ok(reaction);
  effects.update(board, move);
  assert.equal(board.firstElementChild, reaction);
  effects.update(board, {...move, enabled:false});
  effects.update(board, move);
  assert.equal(board.childElementCount, 0);
});

test('mode choices expose the selected state and keep keyboard focus after changing mode', async t => {
  const a = app(t); loadGame(a, '1. e4 e5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.call('toggleSettings');
  const doc = a.dom.window.document;
  [...doc.querySelectorAll('.set-sect-head')].find(node=>node.textContent.includes('Review experience')).click();
  const control = value => doc.querySelector('[data-setting="reviewMode"][data-value="'+value+'"]');
  assert.equal(control('normal').getAttribute('aria-pressed'), 'true');
  assert.equal(control('dopamine').getAttribute('aria-pressed'), 'false');
  control('dopamine').focus(); control('dopamine').click();
  await a.run('_settingsWriteQueue');
  await Promise.resolve();
  assert.equal(control('dopamine').getAttribute('aria-pressed'), 'true');
  assert.equal(doc.activeElement, control('dopamine'));
});

test('effects contain no text or caption, and expired effects clean themselves up', t => {
  const {dom, effects, board, move} = fixture(t);
  let expire;
  dom.window.setTimeout = callback => {expire = callback; return 1;};
  effects.show(board, {...move, label: '<img src=x onerror=alert(1)>'});
  assert.equal(board.querySelector('img'), null);
  assert.equal(board.textContent, '');
  expire();
  assert.equal(board.childElementCount, 0);
});

test('mode persists independently of board preferences and scoring, with no effects in practice', async t => {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll'); a.call('applySettings');
  const doc = a.dom.window.document, root = doc.documentElement;
  const grades = [...a.state.classif], evals = structuredClone(a.state.evals);
  assert.equal(a.state.settings.reviewMode, 'normal');
  assert.equal(doc.querySelector('.dopamine-effect'), null);
  const colors = root.style.getPropertyValue('--sq-light');
  await a.call('setSetting', 'reviewMode', 'dopamine');
  assert.equal(a.store.settings.reviewMode, 'dopamine');
  assert.equal(root.dataset.reviewMode, 'dopamine');
  assert.equal(doc.querySelector('.review-mode-toggle'), null);
  assert.equal(a.state.settings.boardTheme, 'maple');
  assert.equal(root.style.getPropertyValue('--sq-light'), colors);
  assert.deepEqual([...a.state.classif], grades);
  assert.deepEqual(structuredClone(a.state.evals), evals);
  a.state.classif[1] = 'brilliant';
  a.call('go', 1);
  assert.ok(doc.querySelector('.dopamine-effect[data-category="brilliant"]'));
  a.call('paintBoard');
  assert.equal(doc.querySelectorAll('.dopamine-effect').length, 1);
  a.state.practice = {spots: [2], i: 0};
  a.call('paintBoard');
  assert.equal(doc.querySelector('.dopamine-effect'), null);
  a.state.practice = null;
  await a.call('setSetting', 'reviewMode', 'normal');
  assert.equal(root.dataset.reviewMode, 'normal');
  assert.equal(root.style.getPropertyValue('--sq-light'), colors);
  assert.equal(a.store.settings.reviewMode, 'normal');
});

test('Dopamine gives Modern commentary room without rewriting saved layout geometry', t => {
  const a = app(t);
  Object.defineProperties(a.dom.window, {innerWidth:{value:1920, configurable:true},innerHeight:{value:1080, configurable:true}});
  a.run('S.layout = structuredClone(MODERN_LAYOUT); S.layoutMode = "custom"; S.settings.uiSetup = "modern"; S.settings.uiSetupBase = "modern";');
  const saved = JSON.stringify(a.state.layout), normal = a.call('referenceLayout');
  a.state.settings.reviewMode = 'dopamine';
  const changed = a.call('referenceLayout');
  assert.ok(changed.review.h > normal.review.h);
  assert.ok(changed.moves.h < normal.moves.h);
  assert.equal(JSON.stringify(a.state.layout), saved);
  a.state.settings.reviewMode = 'normal';
  assert.deepEqual(JSON.parse(JSON.stringify(a.call('referenceLayout'))), JSON.parse(JSON.stringify(normal)));
});

test('review reactions are not saved into learning or replayed when returning to review', async t => {
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[
    {id:'effect-lifecycle',fen:'7k/8/8/8/8/8/8/K7 w - - 0 1',solution:['a1b1'],rating:450,themes:[]},
  ]})}));
  const a=app(t); loadGame(a,'1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.state.settings.reviewMode='dopamine'; a.state.classif[1]='brilliant'; a.call('go',1);
  const doc=a.dom.window.document;
  assert.ok(doc.querySelector('.dopamine-effect'));
  await a.call('openLearning'); const workspace=a.run('learningWorkspace');
  t.after(async()=>{await workspace.close();});
  assert.equal(workspace.boardChildren.some(node=>node.classList?.contains('dopamine-effect')),false);
  const previews=[...a.call('visualSettings').querySelectorAll('button')].filter(button=>button.textContent.startsWith('Preview '));
  assert.ok(previews.length===2 && previews.every(button=>button.disabled));
  a.state.setOpen['Review experience']=true;
  a.call('toggleSettings');
  const livePreview=()=>[...doc.querySelectorAll('#settings button')].find(button=>button.textContent==='Preview Brilliant effect');
  assert.equal(livePreview().disabled,true);
  await workspace.close();
  assert.equal(livePreview().disabled,false,'open settings refresh when game review resumes');
  assert.equal(doc.querySelector('#settings').textContent.includes('Return to game review to preview these effects.'),false);
  assert.equal(doc.querySelector('.dopamine-effect'),null);
  a.call('paintBoard');
  assert.equal(doc.querySelector('.dopamine-effect'),null);
  a.state.classif[2]='best'; a.call('go',2);
  assert.ok(doc.querySelector('.dopamine-effect'),'new review navigation still reacts');
});

test('entering panel arrangement stops an active reaction', t => {
  const a=app(t); loadGame(a,'1. e4 e5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.state.settings.reviewMode='dopamine'; a.state.classif[1]='blunder'; a.call('go',1);
  assert.ok(a.dom.window.document.querySelector('.dopamine-effect'));
  a.state.layoutMode='custom'; a.call('toggleReorganize');
  assert.equal(a.dom.window.document.querySelector('.dopamine-effect'),null);
});
