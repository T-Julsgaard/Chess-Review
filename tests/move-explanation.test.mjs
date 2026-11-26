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
  assert.equal(result.summary, 'This allows Queen h4, checkmate.');
  assert.equal(result.detail, 'Better was Pawn g3.');
  assert.equal(result.threat.uci, 'd8h4');
  assert.equal(result.reply.san, '2… Qh4#');
  assert.equal(result.alternative.move, 'g3');
  assert.equal(result.evaluation, '-0.3 → mate for Black');
});

test('uses the correct perspective when Black allows mate or loses evaluation', () => {
  const mate = explainMove({...position('1. e4 f6 2. d4', 'g5'),
    beforeScore:{cp:50}, afterScore:{mate:1}, afterPv:'d1h5'});
  assert.equal(mate.summary, 'This allows Queen h5, checkmate.');
  assert.equal(mate.threat.uci, 'd1h5');
  const cp = explainMove({...position('1. e4', 'e5'), beforeScore:{cp:20}, afterScore:{cp:220}});
  assert.equal(cp.summary, 'This gives White a much stronger position.');
});

test('evaluation losses and alternatives distinguish your move from your opponent’s for either color', () => {
  for (const side of ['w', 'b']) {
    const input = side === 'w' ? {...position('', 'e4'), beforePv:'a2a3'}
      : {...position('1. e4', 'e5'), beforePv:'c7c5'};
    const direction = side === 'w' ? -1 : 1;
    for (const loss of [50, 250]) {
      const evidence = {...input, beforeScore:{cp:0}, afterScore:{cp:direction * loss}};
      const own = explainMove({...evidence, viewerSide:side});
      const enemy = explainMove({...evidence, viewerSide:side === 'w' ? 'b' : 'w'});
      const strength = loss >= 200 ? 'much stronger' : 'better';
      assert.equal(own.summary, `Your move gives your opponent a ${strength} position.`);
      assert.equal(enemy.summary, `Your opponent's move gives you a ${strength} position.`);
      assert.match(own.detail, /^You could have played /);
      assert.match(enemy.detail, /^Your opponent could have played /);
      assert.deepEqual(enemy.detailParts.filter(part=>part.move), own.detailParts.filter(part=>part.move));
      assert.deepEqual(enemy.alternative, own.alternative);
      assert.deepEqual(enemy.evaluation, own.evaluation);
      const neutral = explainMove(evidence);
      assert.equal(neutral.summary, `This gives ${side === 'w' ? 'Black' : 'White'} a ${strength} position.`);
      assert.doesNotMatch(neutral.summary + neutral.detail, /you|opponent/i);
    }
  }
});

test('reply tactics, best replies, missed chances and sound moves use the viewer’s identity', () => {
  const tactic = {...position('1. e4 e5 2. Nf3 d6 3. d4', 'Nc6'), category:'inacc', afterPv:'f1b5'};
  assert.match(explainMove({...tactic, viewerSide:'w'}).summary, /^You can reply Bishop b5, pinning/);
  assert.match(explainMove({...tactic, viewerSide:'b'}).summary, /^Your opponent can reply Bishop b5, pinning/);
  const quiet = {...position('1. e4', 'e5'), afterPv:'g1f3'};
  assert.equal(explainMove({...quiet, viewerSide:'w'}).detail, 'Your best reply is Knight f3.');
  assert.equal(explainMove({...quiet, viewerSide:'b'}).detail, "Your opponent's best reply is Knight f3.");
  const miss = fromFen('r3k3/8/8/8/1n6/8/8/R3K3 b Qq - 0 1', 'Ke7',
    {category:'miss', beforePv:'b4c2', viewerSide:'w'});
  assert.match(miss.summary, /^Your opponent's move misses Knight c2/);
  const fork = fromFen('r3k3/8/8/8/1n6/8/8/R3K3 b Qq - 0 1', 'Nc2+', {category:'best', viewerSide:'w'});
  assert.match(fork.summary, /^Your opponent's move forks/);
});

test('forced mate explanations identify who benefits and address the correct player', () => {
  const evidence = {...position('1. f3 e5', 'g4'), beforeScore:{cp:0}, afterScore:{mate:-3}};
  assert.equal(explainMove({...evidence, viewerSide:'w'}).summary, 'Your move allows mate in 3 for your opponent.');
  assert.equal(explainMove({...evidence, viewerSide:'b'}).summary, "Your opponent's move allows mate in 3 for you.");
  const continuing = {...evidence, beforeScore:{mate:-4}};
  assert.equal(explainMove({...continuing, viewerSide:'w'}).summary, 'You are still facing a forced mate.');
  assert.equal(explainMove({...continuing, viewerSide:'b'}).summary, 'Your opponent is still facing a forced mate.');
});

test('rendered explanations follow the known player independently of board orientation and review mode', t => {
  const a = app(t), S = loadGame(a, '1. e4 e5');
  a.call('computeDerived');
  S.idx=2; S.classif[2]='inacc'; S.evals[1]={cp:0}; S.evals[2]={cp:50};
  S.bests[1]={pv:'c7c5'}; S.bests[2]=null;
  S.settings.coachEngineReplies=true;
  S.playerKnown=true; S.meSide='w';
  for (const mode of ['normal', 'dopamine']) {
    S.settings.reviewMode=mode;
    for (const flipped of [false, true]) {
      S.flipped=flipped;
      const body=a.call('renderMoveComment');
      assert.equal(body.querySelector('.ip-assessment').textContent, "Your opponent's e5 is an inaccuracy.");
      assert.equal(body.querySelector('.ip-text').textContent,
        "Your opponent's move gives you a better position." + (mode==='normal' ? ' Your opponent could have played Pawn c5.' : ''));
      assert.match(body.textContent, /Your opponent could have played Pawn c5/);
    }
  }
  S.meSide='b';
  const own=a.call('renderMoveComment');
  assert.equal(own.querySelector('.ip-assessment').textContent, 'Your e5 is an inaccuracy.');
  assert.equal(own.querySelector('.ip-text').textContent, 'Your move gives your opponent a better position.');
  S.playerKnown=false;
  const spectator=a.call('renderMoveComment');
  assert.equal(spectator.querySelector('.ip-assessment').textContent, 'e5 is an inaccuracy.');
  assert.equal(spectator.querySelector('.ip-text').textContent, 'This gives White a better position.');
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
  assert.equal(result.summary, 'This allows Queen h4, putting the king in check.');
  assert.doesNotMatch(result.summary + result.detail, /mate|wins/);
});

test('describes promotion and underpromotion without promising the new piece survives', () => {
  const before=new Chess('4k3/8/8/8/8/8/p7/4K2R w - - 0 1'), beforeFen=before.fen();
  before.move('Rh2');
  const inputs={beforeFen,afterFen:before.fen(),category:'blunder'};
  assert.equal(explainMove({...inputs,afterPv:'a2a1q'}).summary, 'Black can reply Pawn a1 (queen), promoting to a queen.');
  assert.equal(explainMove({...inputs,afterPv:'a2a1n'}).summary, 'Black can reply Pawn a1 (knight), promoting to a knight.');
});

function fromFen(fen, played, extra) {
  const board = new Chess(fen), beforeFen = board.fen(); board.move(played);
  return explainMove({beforeFen, afterFen:board.fen(), ...extra});
}

test('names forks allowed by the reply, including pawn forks and forks with check', () => {
  const knight = fromFen('r3k3/8/8/8/1n6/8/7P/R3K3 w Qq - 0 1', 'h3',
    {category:'blunder', beforeScore:{cp:0}, afterScore:{cp:-500}, afterPv:'b4c2 e1d2 c2a1'});
  assert.equal(knight.summary, 'Black can reply Knight c2, forking the king and the rook on a1.');
  assert.equal(knight.detail, 'The check must be answered first, leaving the rook on a1 exposed.');
  const pawn = fromFen('4k3/8/8/2n1b3/8/8/3P4/3QK3 b - - 0 1', 'Kd7', {category:'mistake', afterPv:'d2d4'});
  assert.equal(pawn.summary, 'White can reply Pawn d4, forking the knight on c5 and the bishop on e5.');
  assert.equal(pawn.detail, "Black can't move both pieces at once.");
});

test('a forking piece that can simply be taken is not called a fork', () => {
  // After Ra2 the rook guards c2, so Nc2+ is only a check.
  const result = fromFen('r3k3/8/8/8/1n6/8/8/R3K3 w Qq - 0 1', 'Ra2', {category:'blunder', afterPv:'b4c2'});
  assert.equal(result.summary, 'This allows Knight c2, putting the king in check.');
});

test('names absolute and relative pins and skewers', () => {
  const pin = explainMove({...position('1. e4 e5 2. Nf3 d6 3. d4', 'Nc6'), category:'inacc', afterPv:'f1b5'});
  assert.equal(pin.summary, 'White can reply Bishop b5, pinning the knight on c6 to the king.');
  assert.equal(pin.detail, "The pinned knight can't move away without exposing the king.");
  const relative = explainMove({...position('1. d4 d5 2. c4 e6 3. Nc3', 'Nf6'), category:'inacc', afterPv:'c1g5'});
  assert.equal(relative.summary, 'White can reply Bishop g5, pinning the knight on f6 to the queen on d8.');
  const skewer = fromFen('K7/8/8/4k3/7r/8/8/R7 b - - 0 1', 'Ke4', {category:'blunder', afterPv:'a1a4 e4e5 a4h4'});
  assert.equal(skewer.summary, 'White can reply Rook a4, skewering the king and the rook on h4 behind it.');
  assert.match(skewer.detail, /^Once the king steps aside, the rook on h4 can be taken\./);
});

test('explains loose pieces, removed defenders and captures with a cheaper piece', () => {
  const removed = fromFen('4k3/8/4n3/8/3b4/8/8/3RK3 b - - 0 1', 'Nc5', {category:'blunder', afterPv:'d1d4'});
  assert.equal(removed.summary, 'White can reply Rook d4, capturing the undefended bishop on d4.');
  assert.equal(removed.detail, 'Knight c5 left the bishop on d4 without a defender.');
  const moved = explainMove({...position('1. e4 e5 2. Nf3 Nc6 3. Bc4', 'Nd4'), afterPv:'f3d4'});
  assert.equal(moved.summary, 'White can reply Knight d4, capturing the knight on d4.');
  const cheap = explainMove({...position('1. e4 e5 2. Nf3', 'Nc6'), afterPv:'f3e5'});
  assert.match(cheap.summary, /capturing the pawn on e5/);
  const pawnTakes = fromFen('4k3/8/8/3n4/4P3/8/8/4K3 b - - 0 1', 'Ke7', {category:'blunder', afterPv:'e4d5'});
  assert.equal(pawnTakes.summary, 'White can reply Pawn d5, capturing the undefended knight on d5.');
  assert.equal(pawnTakes.detail, '');
});

test('a capture that also checks mentions both, and discovered and double checks are named', () => {
  const both = explainMove({...position('1. e4 e5 2. Nf3 d6 3. Bc4', 'Be7'), afterPv:'c4f7 e8f7'});
  assert.equal(both.summary, 'White can reply Bishop f7, capturing the pawn on f7 with check.');
  const discovered = fromFen('r3k3/8/8/8/4N3/8/8/4R1K1 b - - 0 1', 'Ra7', {category:'blunder', afterPv:'e4c5'});
  assert.equal(discovered.summary, 'White can reply Knight c5, giving a discovered check.');
  assert.equal(discovered.detail, 'The knight moved out of the way, so the rook on e1 now gives check.');
  const double = fromFen('r3k3/8/8/8/4N3/8/8/4R1K1 b - - 0 1', 'Ra7', {category:'blunder', afterPv:'e4f6'});
  assert.equal(double.summary, 'White can reply Knight f6, giving double check.');
});

test('quotes a mating line only when the board confirms it mates in the reported distance', () => {
  const inputs = {category:'blunder', beforeScore:{cp:-200}, afterScore:{mate:-2}};
  const shown = fromFen('k2q4/pp6/8/8/8/8/4RPPP/R5K1 w - - 0 1', 'Ra3', {...inputs, afterPv:'d8d1 e2e1 d1e1'});
  assert.equal(shown.detail, 'Mating line: 1… Queen d1 2. Rook e1 Queen e1.');
  const short = fromFen('k2q4/pp6/8/8/8/8/4RPPP/R5K1 w - - 0 1', 'Ra3', {...inputs, afterPv:'d8d1 e2e1'});
  assert.equal(short.summary, 'This allows mate in 2 for Black.');
  assert.equal(short.detail, '');
  assert.equal(short.threat, null);
  const wrongLength = fromFen('k2q4/pp6/8/8/8/8/4RPPP/R5K1 w - - 0 1', 'Ra3', {...inputs, afterScore:{mate:-3}, afterPv:'d8d1 e2e1 d1e1'});
  assert.equal(wrongLength.summary, 'This allows mate in 3 for Black.');
  assert.equal(wrongLength.detail, '');
  assert.equal(wrongLength.threat, null);
  const lost = fromFen('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', 'h3', {category:'blunder', beforeScore:{mate:1}, afterScore:{cp:300}, beforePv:'e1e8'});
  assert.equal(lost.detail, 'Better was Rook e8.');
});

test('a miss leads with the tactic that was available, and weak moves name a better tactic', () => {
  const miss = fromFen('r3k3/8/8/8/1n6/8/8/R3K3 b Qq - 0 1', 'Ke7',
    {category:'miss', beforeScore:{cp:-500}, afterScore:{cp:0}, beforePv:'b4c2 e1d2 c2a1'});
  assert.equal(miss.summary, 'This misses Knight c2, forking the king and the rook on a1.');
  assert.equal(miss.detail, '');
  const better = explainMove({...position('1. e4 e5 2. Nf3 Nc6 3. Nxe5', 'a6'),
    beforeScore:{cp:0}, afterScore:{cp:300}, beforePv:'c6e5', afterPv:'d2d4'});
  assert.equal(better.detail, 'Better was Knight e5.');
});

test('weak moves without scores still name the strongest reply instead of a vague line', () => {
  const result = explainMove({...position('1. e4', 'e5'), category:'mistake', afterPv:'g1f3'});
  assert.equal(result.summary, 'A stronger move was available.');
  assert.equal(result.detail, "White's best reply is Knight f3.");
});

test('good moves describe what they do on the board', () => {
  const fork = fromFen('r3k3/8/8/8/1n6/8/8/R3K3 b Qq - 0 1', 'Nc2+', {category:'best'});
  assert.equal(fork.summary, 'This forks the king and the rook on a1.');
  const skewer = fromFen('K7/8/7r/8/5k2/8/8/2B5 w - - 0 1', 'Bd2+', {category:'excellent'});
  assert.equal(skewer.summary, 'This skewers the king and the rook on h6 behind it.');
  const mate = fromFen('6k1/5ppp/8/8/8/8/5PPP/3QR1K1 w - - 0 1', 'Qd7', {category:'best', afterScore:{mate:1}, afterPv:'g8f8 d7e8'});
  assert.equal(mate.summary, 'This keeps a forced mate in 1: 1… King f8 2. Queen e8.');
  const book = explainMove({...position('1. e4 e5 2. Nf3', 'Nc6'), category:'book'});
  assert.equal(book.detail, '');
});

test('a brilliant sacrifice names the piece given up', () => {
  const result = explainMove({...position('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5', 'Nxf7'),
    category:'brilliant', beforeScore:{cp:30}, afterScore:{cp:60}});
  assert.equal(result.summary, 'This gives up the knight for a pawn.');
  assert.equal(result.detail, '');
});

test('explanation evidence selects the exact top line and handles older results without lines', () => {
  assert.equal(explanationPv({bestmove:'e2e4',lines:[]}), 'e2e4');
  assert.equal(explanationPv({pv:'e2e4 e7e5'}), 'e2e4 e7e5');
  assert.equal(explanationPv({pv:'d2d4',lines:[{multipv:2,pv:'d2d4'}, {multipv:1,bound:'exact',pv:'e2e4'}]}), 'e2e4');
  assert.equal(explanationPv({bound:'upperbound',pv:'e2e4'}), null);
});

test('a mating evaluation is not presented as proof that a separate reply line gives mate', () => {
  const result=explainMove({...position('1. f3 e5','g4'),beforeScore:{cp:-30},afterScore:{mate:-1},afterPv:'d7d6'});
  assert.equal(result.summary,'This allows mate in 1 for Black.');
  assert.equal(result.detail,'');
  assert.equal(result.threat,null);
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

test('quiet explanations select a changed, concrete fact for either side', () => {
  const develop=explainMove({...position('1. e4 e5','Nf3'),category:'best'});
  assert.match(develop.summary,/knight develops and controls d4 and e5/);
  const black=explainMove({...position('1. e4 e5 2. Nf3','Nc6'),category:'excellent'});
  assert.equal(black.summary,'This defends the pawn on e5, which was under attack.');
  const opening=explainMove({...position('1. Nf3 Nf6','e3'),category:'best'});
  assert.equal(opening.summary,'This opens a diagonal for the bishop on f1.');
  const castle=explainMove({...position('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5','O-O'),category:'good'});
  assert.match(castle.summary,/Castling/);
  const file=fromFen('4k3/7p/8/8/8/8/7P/R3K3 w - - 0 1','Rc1',{category:'best'});
  assert.match(file.summary,/open c-file/);
  const blocked=fromFen('4k3/7p/8/8/2P5/8/7P/R3K3 w - - 0 1','Rc1',{category:'best'});
  assert.doesNotMatch(blocked.summary,/open c-file/);
  const semi=fromFen('4k3/2p4p/8/8/8/8/7P/R3K3 w - - 0 1','Rc1',{category:'best'});
  assert.match(semi.summary,/semi-open c-file/);
  const passer=fromFen('4k3/8/8/8/3P4/8/8/4K3 w - - 0 1','d5',{category:'best'});
  assert.match(passer.summary,/passed pawn/);
  const enemy=fromFen('4k3/2p5/8/8/3P4/8/8/4K3 w - - 0 1','d5',{category:'best'});
  assert.doesNotMatch(enemy.summary,/passed pawn/);
  const connect=fromFen('4k3/7p/8/8/8/8/7P/R2Q1RK1 w - - 0 1','Qd2',{category:'best'});
  assert.match(connect.summary,/connects the rooks/);
  const defend=fromFen('4k3/1b6/8/8/4P3/8/5P2/3QK3 w - - 0 1','f3',{category:'best'});
  assert.match(defend.summary,/defends the pawn on e4/);
});

test('weak moves prioritize the reply and name quiet alternatives without praising the bad move', () => {
  const result=explainMove({...position('1. f3 e5','g4'),beforePv:'e2e3',afterPv:'d8h4',afterScore:{mate:-1}});
  assert.match(result.summary,/Queen h4/);
  assert.equal(result.detail,'Better was Pawn e3.');
  assert.doesNotMatch(result.summary+result.detail,/diagonal|develop/);
  const quiet=explainMove({...position('1. e4 e5','a3'),beforePv:'g1f3',category:'inacc'});
  assert.equal(quiet.summary,'Better was Knight f3.');
  assert.match(quiet.detail,/knight develops/);
  // A matching played move is never offered as its own improvement.
  const same=explainMove({...position('1. e4 e5','Nf3'),beforePv:'g1f3',category:'inacc'});
  assert.equal(same.alternative,null);
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
  assert.equal(body.querySelector('.ip-text').textContent, 'This allows Queen h4, checkmate.');
  assert.equal(body.querySelectorAll('.dopamine-line').length, 2);
  assert.doesNotMatch(body.textContent,/Qh4#|Better: g3/);
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

test('readable move mentions retain legal prefixes and never turn board squares into links', () => {
  const shown=fromFen('k2q4/pp6/8/8/8/8/4RPPP/R5K1 w - - 0 1','Ra3',
    {category:'blunder',afterScore:{mate:-2},afterPv:'d8d1 e2e1 d1e1'});
  assert.deepEqual(shown.detailParts.filter(part=>part.move).map(part=>[part.text,part.move.uci,part.move.plyOffset]),[
    ['Queen d1','d8d1',0],['Rook e1','d8d1 e2e1',0],['Queen e1','d8d1 e2e1 d1e1',0],
  ]);
  assert.ok(shown.detailParts.filter(part=>part.move).every(part=>part.move.category==='best'));
  const pin=explainMove({...position('1. e4 e5 2. Nf3 d6 3. d4','Nc6'),category:'inacc',afterPv:'f1b5'});
  assert.deepEqual(pin.summaryParts.filter(part=>part.move).map(part=>part.text),['Bishop b5']);
  assert.match(pin.summary,/knight on c6/);
  const castle=explainMove({...position('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5','O-O'),category:'good'});
  assert.equal(castle.played.text,'Castle kingside');
  assert.equal(castle.played.uci,'e1g1');
  assert.equal(castle.played.category,'good');
  assert.equal(castle.played.origin,'played');
  const ep=explainMove({...position('1. e4 a6 2. e5','d5'),afterPv:'e5d6'});
  assert.equal(ep.summaryParts.find(part=>part.move).text,'Pawn d6');
  assert.match(ep.summary,/pawn on d5/);
});
