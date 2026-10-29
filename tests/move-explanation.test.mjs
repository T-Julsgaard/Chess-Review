import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {explainMove} from '../lib/move-explanation.js';
import {app, loadGame} from './helpers/app.mjs';

function position(pgn, played) {
  const board = new Chess(); board.loadPgn(pgn);
  const beforeFen = board.fen(); board.move(played);
  return {beforeFen, afterFen:board.fen(), category:'blunder'};
}

test('explains an immediate mating consequence with a legal, playable alternative', () => {
  const result = explainMove({...position('1. f3 e5', 'g4'),
    beforeScore:{cp:-30}, afterScore:{mate:-1}, beforePv:'g2g3 d7d5', afterPv:'d8h4'});
  assert.equal(result.summary, 'This allows Qh4#, checkmate.');
  assert.match(result.detail, /Black can end the game/);
  assert.equal(result.reply.san, '2… Qh4#');
  assert.equal(result.alternative.move, 'g3');
  assert.equal(result.evaluation, '-0.3 → mate for Black');
});

test('uses the correct perspective when Black allows mate or loses evaluation', () => {
  const mate = explainMove({...position('1. e4 f6 2. d4', 'g5'),
    beforeScore:{cp:50}, afterScore:{mate:1}, afterPv:'d1h5'});
  assert.equal(mate.summary, 'This allows Qh5#, checkmate.');
  assert.match(mate.detail, /White can end the game/);
  const cp = explainMove({...position('1. e4', 'e5'), beforeScore:{cp:20}, afterScore:{cp:220}});
  assert.equal(cp.summary, 'This gives up 2.0 pawns of engine evaluation.');
});

test('describes en passant at the captured pawn’s square and does not call an even trade a material win', () => {
  const ep = explainMove({...position('1. e4 a6 2. e5', 'd5'), afterPv:'e5d6'});
  assert.match(ep.summary, /pawn on d5/);
  const trade = explainMove({...position('1. e4 d5', 'exd5'), afterPv:'d8d5 b1c3 d5d8'});
  assert.match(trade.summary, /capturing the pawn on d5/);
  assert.equal(trade.detail, '');
});

test('rejects illegal PV moves and invalid positions without inventing tactics', () => {
  const result = explainMove({...position('1. e4', 'e5'),
    beforeScore:{cp:20}, afterScore:{cp:70}, afterPv:'a1a8 d8h4'});
  assert.equal(result.reply, null);
  assert.doesNotMatch(result.summary + result.detail, /captures|checkmate|rook|queen/);
  assert.equal(explainMove({beforeFen:'invalid',afterFen:'invalid'}), null);
});

test('Dopamine explanations and exploration are opt-in and leave scores and Normal commentary intact', async t => {
  const a = app(t), S = loadGame(a, '1. f3 e5 2. g4 Qh4#');
  a.call('computeDerived'); S.idx = 3; S.classif[3] = 'mistake';
  S.evals[2] = {cp:-30}; S.evals[3] = {mate:-1};
  S.bests[2] = {bestmove:'g2g3',score:{cp:-30},lines:[{multipv:1,score:{cp:-30},pv:'g2g3 d7d5'}]};
  S.bests[3] = {bestmove:'d8h4',score:{mate:1},lines:[{multipv:1,score:{mate:1},pv:'d8h4'}]};
  a.call('buildUI'); a.call('renderAll');
  assert.equal(a.call('renderMoveComment').querySelector('.dopamine-line'), null);
  const scores = JSON.stringify([S.evals,S.moveGrades,S.classif]);
  await a.call('setSetting','reviewMode','dopamine');
  const body = a.call('renderMoveComment');
  assert.equal(body.dataset.moveCategory, 'mistake');
  assert.equal(body.hasAttribute('data-category'), false);
  assert.equal(body.querySelector('.ip-text').textContent, 'This allows Qh4#, checkmate.');
  assert.equal(body.querySelectorAll('.dopamine-line').length, 2);
  let explored;
  a.replace('playLine', pv => {explored = {pv,idx:S.idx};});
  body.querySelectorAll('.dopamine-line')[1].click();
  assert.deepEqual(explored, {pv:'g2g3 d7d5',idx:2});
  assert.equal(JSON.stringify([S.evals,S.moveGrades,S.classif]), scores);
  await a.call('setSetting','reviewMode','normal'); S.idx = 3;
  const normal = a.call('renderMoveComment');
  assert.equal(normal.querySelector('.dopamine-line'), null);
  assert.equal(normal.querySelector('.ip-move').textContent, 'g4');
  assert.equal(S.settings.boardTheme, 'maple');
});
