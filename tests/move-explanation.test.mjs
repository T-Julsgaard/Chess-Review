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

function fromFen(fen, played, extra) {
  const board = new Chess(fen), beforeFen = board.fen(); board.move(played);
  return explainMove({beforeFen, afterFen:board.fen(), ...extra});
}

test('names forks allowed by the reply, including pawn forks and forks with check', () => {
  const knight = fromFen('r3k3/8/8/8/1n6/8/7P/R3K3 w Qq - 0 1', 'h3',
    {category:'blunder', beforeScore:{cp:0}, afterScore:{cp:-500}, afterPv:'b4c2 e1d2 c2a1'});
  assert.equal(knight.summary, 'Black can reply Nc2+, forking the king and the rook on a1.');
  assert.equal(knight.detail, 'The check must be answered first, leaving the rook on a1 exposed. In the shown engine line, White loses a net 5 points of material.');
  const pawn = fromFen('4k3/8/8/2n1b3/8/8/3P4/3QK3 b - - 0 1', 'Kd7', {category:'mistake', afterPv:'d2d4'});
  assert.equal(pawn.summary, 'White can reply d4, forking the knight on c5 and the bishop on e5.');
  assert.equal(pawn.detail, "Black can't move both pieces at once.");
});

test('a forking piece that can simply be taken is not called a fork', () => {
  // After Ra2 the rook guards c2, so Nc2+ is only a check.
  const result = fromFen('r3k3/8/8/8/1n6/8/8/R3K3 w Qq - 0 1', 'Ra2', {category:'blunder', afterPv:'b4c2'});
  assert.equal(result.summary, 'This allows Nc2+, putting the king in check.');
});

test('names absolute and relative pins and skewers', () => {
  const pin = explainMove({...position('1. e4 e5 2. Nf3 d6 3. d4', 'Nc6'), category:'inacc', afterPv:'f1b5'});
  assert.equal(pin.summary, 'White can reply Bb5, pinning the knight on c6 to the king.');
  assert.equal(pin.detail, "The pinned knight can't move away without exposing the king.");
  const relative = explainMove({...position('1. d4 d5 2. c4 e6 3. Nc3', 'Nf6'), category:'inacc', afterPv:'c1g5'});
  assert.equal(relative.summary, 'White can reply Bg5, pinning the knight on f6 to the queen on d8.');
  const skewer = fromFen('K7/8/8/4k3/7r/8/8/R7 b - - 0 1', 'Ke4', {category:'blunder', afterPv:'a1a4 e4e5 a4h4'});
  assert.equal(skewer.summary, 'White can reply Ra4+, skewering the king and the rook on h4 behind it.');
  assert.match(skewer.detail, /^Once the king steps aside, the rook on h4 can be taken\./);
});

test('explains loose pieces, removed defenders and captures with a cheaper piece', () => {
  const removed = fromFen('4k3/8/4n3/8/3b4/8/8/3RK3 b - - 0 1', 'Nc5', {category:'blunder', afterPv:'d1d4'});
  assert.equal(removed.summary, 'White can reply Rxd4, capturing the undefended bishop on d4.');
  assert.equal(removed.detail, 'Nc5 left the bishop on d4 without a defender.');
  const moved = explainMove({...position('1. e4 e5 2. Nf3 Nc6 3. Bc4', 'Nd4'), afterPv:'f3d4'});
  assert.equal(moved.summary, 'White can reply Nxd4, capturing the knight on d4.');
  const cheap = explainMove({...position('1. e4 e5 2. Nf3', 'Nc6'), afterPv:'f3e5'});
  assert.match(cheap.summary, /capturing the pawn on e5/);
  const pawnTakes = fromFen('4k3/8/8/3n4/4P3/8/8/4K3 b - - 0 1', 'Ke7', {category:'blunder', afterPv:'e4d5'});
  assert.equal(pawnTakes.summary, 'White can reply exd5, capturing the undefended knight on d5.');
  assert.equal(pawnTakes.detail, 'The knight on d5 was loose: nothing defended it.');
});

test('a capture that also checks mentions both, and discovered and double checks are named', () => {
  const both = explainMove({...position('1. e4 e5 2. Nf3 d6 3. Bc4', 'Be7'), afterPv:'c4f7 e8f7'});
  assert.equal(both.summary, 'White can reply Bxf7+, capturing the pawn on f7 with check.');
  const discovered = fromFen('r3k3/8/8/8/4N3/8/8/4R1K1 b - - 0 1', 'Ra7', {category:'blunder', afterPv:'e4c5'});
  assert.equal(discovered.summary, 'White can reply Nc5+, giving a discovered check.');
  assert.equal(discovered.detail, 'The knight moved out of the way, so the rook on e1 now gives check.');
  const double = fromFen('r3k3/8/8/8/4N3/8/8/4R1K1 b - - 0 1', 'Ra7', {category:'blunder', afterPv:'e4f6'});
  assert.equal(double.summary, 'White can reply Nf6+, giving double check.');
});

test('quotes a mating line only when the board confirms it mates in the reported distance', () => {
  const inputs = {category:'blunder', beforeScore:{cp:-200}, afterScore:{mate:-2}};
  const shown = fromFen('k2q4/pp6/8/8/8/8/4RPPP/R5K1 w - - 0 1', 'Ra3', {...inputs, afterPv:'d8d1 e2e1 d1e1'});
  assert.equal(shown.detail, 'Stockfish reports mate in 2: 1… Qd1+ 2. Re1 Qxe1#.');
  const short = fromFen('k2q4/pp6/8/8/8/8/4RPPP/R5K1 w - - 0 1', 'Ra3', {...inputs, afterPv:'d8d1 e2e1'});
  assert.equal(short.detail, 'Stockfish reports mate in 2.');
  const wrongLength = fromFen('k2q4/pp6/8/8/8/8/4RPPP/R5K1 w - - 0 1', 'Ra3', {...inputs, afterScore:{mate:-3}, afterPv:'d8d1 e2e1 d1e1'});
  assert.equal(wrongLength.detail, 'Stockfish reports mate in 3.');
  const lost = fromFen('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', 'h3', {category:'blunder', beforeScore:{mate:1}, afterScore:{cp:300}, beforePv:'e1e8'});
  assert.equal(lost.detail, 'Before this move, Stockfish reported mate in 1 for White: 1. Re8#.');
});

test('a miss leads with the tactic that was available, and weak moves name a better tactic', () => {
  const miss = fromFen('r3k3/8/8/8/1n6/8/8/R3K3 b Qq - 0 1', 'Ke7',
    {category:'miss', beforeScore:{cp:-500}, afterScore:{cp:0}, beforePv:'b4c2 e1d2 c2a1'});
  assert.equal(miss.summary, 'This misses Nc2+, forking the king and the rook on a1.');
  assert.equal(miss.detail, 'This gives up 5.0 pawns of engine evaluation.');
  const better = explainMove({...position('1. e4 e5 2. Nf3 Nc6 3. Nxe5', 'a6'),
    beforeScore:{cp:0}, afterScore:{cp:300}, beforePv:'c6e5', afterPv:'d2d4'});
  assert.equal(better.detail, "White's strongest reply is d4. Better was Nxe5, capturing the undefended knight on e5.");
});

test('weak moves without scores still name the strongest reply instead of a vague line', () => {
  const result = explainMove({...position('1. e4', 'e5'), category:'mistake', afterPv:'g1f3'});
  assert.equal(result.summary, 'Stockfish prefers a different move here.');
  assert.equal(result.detail, "White's strongest reply is Nf3.");
});

test('good moves describe what they do on the board', () => {
  const fork = fromFen('r3k3/8/8/8/1n6/8/8/R3K3 b Qq - 0 1', 'Nc2+', {category:'best'});
  assert.equal(fork.detail, 'It forks the king and the rook on a1.');
  const skewer = fromFen('K7/8/7r/8/5k2/8/8/2B5 w - - 0 1', 'Bd2+', {category:'excellent'});
  assert.equal(skewer.detail, 'It skewers the king and the rook on h6 behind it.');
  const mate = fromFen('6k1/5ppp/8/8/8/8/5PPP/3QR1K1 w - - 0 1', 'Qd7', {category:'best', afterScore:{mate:1}, afterPv:'g8f8 d7e8'});
  assert.equal(mate.detail, 'Stockfish reports mate in 1 for White: 1… Kf8 2. Qe8#.');
  const book = explainMove({...position('1. e4 e5 2. Nf3', 'Nc6'), category:'book'});
  assert.equal(book.detail, '');
});

test('a brilliant sacrifice names the piece given up', () => {
  const result = explainMove({...position('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5', 'Nxf7'),
    category:'brilliant', beforeScore:{cp:30}, afterScore:{cp:60}});
  assert.equal(result.detail, "It gives up the knight for a pawn. After the sacrifice, the engine evaluation is +0.6 (White's perspective).");
});

test('explanation evidence selects the exact top line and handles older results without lines', () => {
  assert.equal(explanationPv({bestmove:'e2e4',lines:[]}), 'e2e4');
  assert.equal(explanationPv({pv:'e2e4 e7e5'}), 'e2e4 e7e5');
  assert.equal(explanationPv({pv:'d2d4',lines:[{multipv:2,pv:'d2d4'}, {multipv:1,bound:'exact',pv:'e2e4'}]}), 'e2e4');
  assert.equal(explanationPv({bound:'upperbound',pv:'e2e4'}), null);
});

test('a mating evaluation is not presented as proof that a separate reply line gives mate', () => {
  const result=explainMove({...position('1. f3 e5','g4'),beforeScore:{cp:-30},afterScore:{mate:-1},afterPv:'d7d6'});
  assert.equal(result.summary,'This allows a forced mate for Black.');
  assert.equal(result.detail,'Stockfish reports mate in 1.');
  assert.equal(result.reply.san,'2… d6');
});

test('a player already facing forced mate is not told this move introduced it', () => {
  const result=explainMove({...position('1. f3 e5','g4'),beforeScore:{mate:-4},afterScore:{mate:-3}});
  assert.equal(result.summary,'White is still facing a forced mate.');
});

test('unsigned mate zero cannot identify the wrong winner', () => {
  const result=explainMove({...position('1. e4 f6 2. d4 g5','Qh5#'),beforeScore:{cp:300},afterScore:{mate:0}});
  assert.match(result.summary,/Checkmate/);
  assert.equal(result.evaluation,null);
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
