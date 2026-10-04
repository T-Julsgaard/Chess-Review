import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame } from './helpers/app.mjs';

test('a review reload recovers its game after the launch handoff is removed', async t => {
  const a = app(t);
  const payload = { pgn: '1. e4 e5', meta: { gameId: 'original', flip: true } };
  a.store['job:test-game'] = payload;
  assert.deepEqual(await a.call('loadJob'), payload);
  loadGame(a, payload.pgn); a.state.meta = payload.meta;
  assert.equal(a.call('rememberReviewJob'), true);
  delete a.store['job:test-game'];
  const recovered = await a.call('loadJob');
  assert.deepEqual(JSON.parse(JSON.stringify(recovered)), payload);
  assert.equal('analysis' in recovered, false, 'cached results must still be validated at startup');
});

test('switching library games updates the tab session only after a valid game opens', async t => {
  const a = app(t); loadGame(a, '1. e4 e5');
  a.call('computeDerived'); a.call('buildUI');
  a.replace('startAnalysis', () => {});
  const payload = { pgn: '1. d4 d5', meta: { gameId: 'library', flip: true }, analysis: null };
  await a.call('applyGame', payload);
  const recovered = await a.call('loadJob');
  assert.equal(recovered.pgn, payload.pgn);
  assert.equal(recovered.meta.gameId, 'library');
  assert.equal(recovered.meta.flip, true);
  await assert.rejects(a.call('applyGame', {pgn: 'invalid PGN'}));
  assert.equal((await a.call('loadJob')).pgn, payload.pgn);
});

test('corrupt or unavailable tab storage falls back to the launch handoff', async t => {
  const a = app(t); const payload = {pgn: '1. e4'};
  a.store['job:test-game'] = payload;
  a.dom.window.sessionStorage.setItem('job:test-game', '{broken');
  assert.deepEqual(await a.call('loadJob'), payload);
  Object.defineProperty(a.dom.window, 'sessionStorage', {get() { throw Error('Storage disabled'); }});
  loadGame(a, payload.pgn);
  assert.equal(a.call('rememberReviewJob'), false, 'startup must retain the handoff when session writes fail');
  assert.deepEqual(await a.call('loadJob'), payload);
});

test('a missing launch and session remains a recoverable opening error', async t => {
  const a = app(t);
  await assert.rejects(a.call('loadJob'), /Analysis data not found/);
});
