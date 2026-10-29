import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {explainMove, explanationPv} from '../lib/move-explanation.js';
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

test('missing analysis does not claim that a continuation is displayed', () => {
  const result = explainMove({...position('1. e4', 'e5'), category:null});
  assert.equal(result.summary, 'Waiting for analysis of this move.');
  assert.equal(result.reply, null);
});

test('explains a checking reply without inventing a forced mate', () => {
  const result = explainMove({...position('1. f3 e5', 'e3'), afterPv:'d8h4'});
  assert.equal(result.summary, 'This allows Qh4+, putting the king in check.');
  assert.doesNotMatch(result.summary + result.detail, /mate|wins/);
});

test('describes promotion and underpromotion without promising the new piece survives', () => {
  const before=new Chess('4k3/8/8/8/8/8/p7/4K2R w - - 0 1'), beforeFen=before.fen();
  before.move('Rh2');
  const inputs={beforeFen,afterFen:before.fen(),category:'blunder'};
  assert.equal(explainMove({...inputs,afterPv:'a2a1q'}).summary, 'Black can reply a1=Q+, promoting to a queen.');
  assert.equal(explainMove({...inputs,afterPv:'a2a1n'}).summary, 'Black can reply a1=N, promoting to a knight.');
});

test('explanation evidence selects the exact top line and handles older results without lines', () => {
  assert.equal(explanationPv({bestmove:'e2e4',lines:[]}), 'e2e4');
  assert.equal(explanationPv({pv:'e2e4 e7e5'}), 'e2e4 e7e5');
  assert.equal(explanationPv({pv:'d2d4',lines:[{multipv:2,pv:'d2d4'}, {multipv:1,bound:'exact',pv:'e2e4'}]}), 'e2e4');
  assert.equal(explanationPv({bound:'upperbound',pv:'e2e4'}), null);
});

test('provisional lines cannot reappear through the root result fallback', t => {
  const a = app(t), S = loadGame(a, '1. f3 e5 2. g4 Qh4#');
  S.idx=3; S.classif[3]='mistake'; S.settings.reviewMode='dopamine';
  S.evals[2]={cp:-30}; S.evals[3]={mate:-1};
  S.bests[3]={bestmove:'d8h4',pv:'d8h4',lines:[{multipv:1,bound:'lowerbound',pv:'d8h4'}]};
  const body=a.call('renderMoveComment');
  assert.equal(body.querySelector('.dopamine-line'), null);
  assert.doesNotMatch(body.querySelector('.ip-text').textContent, /Qh4/);
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
