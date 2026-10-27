import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

function pendingReview(t) {
  const a = app(t); loadGame(a, '1. e4 d5 2. exd5 Qxd5');
  Object.assign(a.state, {analyzing:true, progress:0, completed:1,
    evals:[null, null, {cp:180}, null, null], bests:Array(5).fill(null)});
  a.state.settings.graphDesign = 'bars';
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('keyboard and move-list cross gaps but stop at the furthest result', t => {
  const a = pendingReview(t), S = a.state, doc = a.dom.window.document;
  const original = JSON.stringify({evals:S.evals, bests:S.bests});
  for (const [key, expected] of [['ArrowRight',1], ['ArrowRight',2], ['ArrowRight',2], ['End',2], ['ArrowLeft',1], ['Home',0]]) {
    doc.body.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key, bubbles:true, cancelable:true}));
    assert.equal(S.idx, expected, key); assert.equal(S.analyzing, true);
    assert.equal(S.progress, 0);
    assert.equal(JSON.stringify({evals:S.evals, bests:S.bests}), original);
    if (expected !== 2) assert.equal(doc.querySelector('.evaluation-score').textContent, '—');
  }
  doc.querySelector('.ml-move[data-ply="4"]').click(); assert.equal(S.idx, 2);
  assert.equal(doc.querySelector('.ml-move.current').dataset.ply, '2');
  assert.equal(doc.querySelector('#controls [aria-label="Next"]').disabled, true);
});

for (const design of ['original', 'timeline', 'timeline2', 'bars', 'bars2', 'minimal']) {
  test(`${design} graph navigation crosses gaps but cannot pass the last score`, t => {
    const a = pendingReview(t), S = a.state, doc = a.dom.window.document;
    S.settings.graphDesign = design; a.call('renderGraph');
    const chart = () => doc.querySelector('#graphMount .evalgraph');
    const click = ply => {
      chart().getBoundingClientRect = () => ({left:0, top:0, width:400, height:120});
      chart().dispatchEvent(new a.dom.window.MouseEvent('click', {
        clientX:design.startsWith('bars') ? (ply + .5) / 5 * 400 : ply / 4 * 400, bubbles:true,
      }));
    };
    click(1); assert.equal(S.idx, 1); assert.equal(S.evals[1], null);
    assert.equal(doc.querySelector('.eval-tip')?.classList.contains('show') || false, false);
    if (design !== 'original') {
      assert.match(chart().getAttribute('aria-valuetext'), /Calculating/);
      assert.equal(chart().getAttribute('aria-valuenow'), '1');
      assert.equal(chart().getAttribute('aria-valuemax'), '2');
    }
    click(2); assert.equal(S.idx, 2);
    click(4); assert.equal(S.idx, 2, 'A click beyond the last result stops at that result');
    S.evals[4] = {cp:40}; a.call('flushProgress', S.batchGen);
    click(3); assert.equal(S.idx, 3); assert.equal(S.evals[3], null);
    if (design !== 'original') {
      assert.equal(chart().getAttribute('aria-valuemax'), '4');
      chart().dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key:'End', bubbles:true}));
      assert.equal(S.idx, 4, 'New results extend navigation without waiting for earlier gaps');
      S.evals.fill(null); a.call('go', 0);
      chart().dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key:'End', bubbles:true}));
      assert.equal(S.idx, 0, 'No completed result means only the starting position is available');
      assert.equal(chart().getAttribute('aria-disabled'), 'true');
    }
  });
}

test('following the recorded move on the board stays in the mainline before analysis completes', t => {
  const a = pendingReview(t), S = a.state;
  a.replace('requestLiveEval', () => {throw Error('Following the recorded move must not start variation analysis');});
  a.call('applyUserMove', 'e2', 'e4', false);
  assert.equal(S.idx, 1); assert.equal(S.analysisMode, false); assert.equal(S.variation, null);
  assert.equal(S.evals[1], null); assert.equal(S.progress, 0);
  a.call('applyUserMove', 'd7', 'd5', false); assert.equal(S.idx, 2);
  a.call('applyUserMove', 'e4', 'd5', false);
  assert.equal(S.idx, 2, 'The recorded next move stays locked beyond the furthest result');
  assert.equal(S.analysisMode, false); assert.equal(S.variation, null);
});

test('autoplay crosses gaps, waits at the last result and resumes when that limit advances', t => {
  const a = pendingReview(t); let advance;
  a.context.setInterval = callback => {advance = callback; return 1;};
  a.context.clearInterval = () => {};
  a.call('toggleAuto');
  for (const expected of [1, 2, 2, 2]) {advance(); assert.equal(a.state.idx, expected);}
  assert.equal(a.state.autoTimer, 1);
  a.state.evals[4] = {cp:30};
  for (const expected of [3, 4]) {advance(); assert.equal(a.state.idx, expected);}
  advance(); assert.equal(a.state.autoTimer, null);
  assert.equal(a.state.progress, 0); assert.equal(a.state.analyzing, true);
});

test('uncompleted searches and stopped analysis cannot unlock later moves', t => {
  const a = pendingReview(t), S = a.state;
  S.evals.fill(null); S.searchPreviews = Array(5).fill({score:{cp:100}, depth:4});
  S.progress = S.total; S.completed = S.total;
  a.call('go', S.total); assert.equal(S.idx, 0, 'Previews and counters are not completed scores');
  S.evals[2] = {cp:0}; S.analyzing = false; S.analysisError = 'Engine stopped';
  a.call('go', S.total); assert.equal(S.idx, 2);
});
