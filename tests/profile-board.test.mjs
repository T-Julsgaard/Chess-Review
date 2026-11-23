import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {createProfileBoard, squareNames} from '../lib/profile/board.js';

function surface(t, motion = true, onMove = null) {
  const dom = new JSDOM('<div class="board">'+ '<div class="sq"></div>'.repeat(64) +'</div>');
  t.after(() => { api.clear(); dom.window.close(); });
  const board = dom.window.document.querySelector('.board');
  const api = createProfileBoard({board, motion: () => motion, makePiece: () => dom.window.document.createElement('img'), onMove});
  const at = name => board.children[squareNames(false).indexOf(name)].querySelector('.profile-piece');
  return {api, board, at};
}

test('profile cover is a stable illustration without scheduled moves', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const {api, board, at} = surface(t);
  api.cover('e4', 'c5');
  assert.ok(at('e4')); assert.ok(at('c5')); assert.equal(at('e2'), null);
  const piece = at('e4'); t.mock.timers.tick(20000);
  assert.equal(at('e4'), piece); assert.ok(!board.classList.contains('profile-board-busy'));
});

test('slide changes cancel replay timers so moves cannot leak into a heatmap', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const {api, board} = surface(t);
  api.moves(['e4','e5','Nf3']); t.mock.timers.tick(900);
  api.heat(Array(64).fill(1)); t.mock.timers.tick(20000);
  assert.equal(board.querySelectorAll('.profile-piece').length, 0);
  assert.equal(board.querySelectorAll('.profile-heat').length, 64);
  assert.ok(!board.classList.contains('profile-board-busy'));
});

test('invalid and empty move sequences finish playback and release the busy state', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const {api, board} = surface(t); let done = 0;
  api.moves(['e4','invalid'], {onDone: () => done++});
  t.mock.timers.tick(900); t.mock.timers.tick(700);
  assert.equal(done, 1); assert.ok(!board.classList.contains('profile-board-busy'));
  api.moves([], {onDone: () => done++});
  assert.equal(done, 2);
});

test('reduced motion shows the final position immediately and reports skipped opening moves', t => {
  const {api, board, at} = surface(t, false); let done = 0; const steps = [];
  api.moves(['e4','e5','Nf3'], {from: 2, onStep: (move,i) => steps.push([move.san,i]), onDone: () => done++});
  assert.deepEqual(steps, [['e5',2], ['Nf3',3]]);
  assert.ok(at('f3')); assert.equal(at('g1'), null); assert.equal(done, 1);
  assert.ok(!board.classList.contains('profile-board-busy'));
});

test('flipped profile boards place pieces and coordinates on the same squares', t => {
  const {api, board} = surface(t, false);
  for (const [i, sq] of [...board.children].entries()) {
    if (i % 8 === 0) sq.innerHTML += '<span class="coord rank"></span>';
    if (i >= 56) sq.innerHTML += '<span class="coord file"></span>';
  }
  api.setOrientation(true);
  api.fen('8/8/8/8/8/8/8/7K w - - 0 1');
  assert.ok(board.children[0].querySelector('.profile-piece'));
  assert.equal(board.querySelector('.coord.rank').textContent, '1');
  assert.equal(board.querySelector('.coord.file').textContent, 'h');
  api.setOrientation(false);
  assert.equal(board.querySelector('.coord.rank').textContent, '8');
  assert.equal(board.querySelector('.coord.file').textContent, 'a');
});

test('results preserve half and sixth squares instead of rounding away draws', t => {
  const {api, board} = surface(t, false);
  api.fill(128, 32, 3);
  assert.equal(board.children[17].title, 'Each square represents 2.00 games.', 'result hover only explains the game count');
  assert.equal(board.children[17].style.getPropertyValue('--fill-win'), '0%');
  assert.equal(board.children[17].style.getPropertyValue('--fill-draw'), '50%');
  api.fill(384, 99, 1);
  const win = parseFloat(board.children[16].style.getPropertyValue('--fill-win'));
  const draw = parseFloat(board.children[16].style.getPropertyValue('--fill-draw'));
  assert.equal(win, 50, 'half of the boundary square is a win');
  assert.ok(Math.abs(draw - win - 100 / 6) < .000001, 'one sixth is a draw');
});

test('profile playback emits the review move cue once per move, including undo', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const sounds = [], {api} = surface(t, true, move => sounds.push(move?.san));
  api.moves(['e4', 'd5', 'exd5']);
  t.mock.timers.tick(900); t.mock.timers.tick(700); t.mock.timers.tick(700);
  assert.deepEqual(sounds, ['e4', 'd5', 'exd5']);
  api.step(-1); assert.equal(sounds.at(-1), 'exd5', 'undo uses the move being undone');
  api.step(1); assert.equal(sounds.at(-1), 'exd5');
  const n = sounds.length; api.step(1); assert.equal(sounds.length, n, 'endpoint is silent');
  api.moves(['e4', 'd5'], {from: 2, autoplay: false});
  assert.equal(sounds.length, n, 'initial positions are silent');
});

test('manual arrows take over autoplay, respect endpoints and release on another slide', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const {api, at} = surface(t); const steps = [];
  api.moves(['e4', 'e5', 'Nf3'], {onStep: (move, i) => steps.push([move?.san, i])});
  assert.equal(api.step(1), true); assert.ok(at('e4'));
  t.mock.timers.tick(20000);
  assert.equal(at('e5'), null, 'autoplay stops when the user takes over');
  api.step(1); assert.ok(at('e5'));
  api.step(-1); assert.ok(at('e7')); assert.equal(at('e5'), null);
  api.step(-1); api.step(-1); assert.ok(at('e2'));
  assert.deepEqual(steps.at(-1), [undefined, 0]);
  api.heat(Array(64).fill(0));
  assert.equal(api.step(1), false, 'old moves cannot replace another visualization');
});

test('rewind starts at the final position and runs back to move one, silently; a step takes over', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const cues = [], steps = [];
  const {api, board, at} = surface(t, true, move => cues.push(move));
  const moves = ['e4', 'd5', 'exd5', 'Qxd5'];
  api.moves(moves, {from: moves.length, rewind: true, delay: 100, timing: () => 20, onStep: (move, i) => steps.push(i)});
  assert.ok(at('d5')); assert.equal(at('e2'), null, 'the final position first');
  assert.ok(board.classList.contains('profile-board-busy'));
  t.mock.timers.tick(100); for (let i = 0; i < 3; i++) t.mock.timers.tick(20);
  assert.deepEqual(steps, [4, 3, 2, 1, 0]);
  assert.ok(at('e2') && at('d7') && at('d8'), 'back at the start, captures restored');
  assert.ok(!board.classList.contains('profile-board-busy'));
  assert.equal(cues.length, 0, 'no move sounds while rewinding');
  assert.equal(api.step(1), true); assert.ok(at('e4'), 'stepping forward works from the start');
  api.moves(moves, {from: moves.length, rewind: true, delay: 100, timing: () => 20});
  t.mock.timers.tick(100); t.mock.timers.tick(20); api.step(-1); for (let i = 0; i < 10; i++) t.mock.timers.tick(100);
  assert.ok(at('e4') && at('d7') && !at('e2'), 'a manual step stops the rewind where it is');
});

test('rewind without motion lands on the starting position at once', t => {
  const {api, at} = surface(t, false);
  let last = null;
  api.moves(['e4', 'e5'], {from: 2, rewind: true, onStep: (move, i) => { last = i; }});
  assert.equal(last, 0); assert.ok(at('e2') && at('e7'));
});

test('profile puzzles replay the previous move and right-click resets a picked-up piece', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const {api, board, at} = surface(t, true);
  const doc = board.ownerDocument, win = doc.defaultView, submitted = [];
  const square = name => board.children[squareNames(false).indexOf(name)];
  const pointer = (target, type, props = {}) => target.dispatchEvent(new win.PointerEvent(type, {bubbles: true, pointerId: 1, ...props}));
  const chess = new Chess();
  for (const san of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5']) chess.move(san);
  const previous = chess.move('Nf6');
  let ready = false;
  api.play(chess.fen(), {previous, intro: true, onReady: () => { ready = true; }, onMove: move => submitted.push(move)});
  assert.ok(at('g8') && !at('f6'));
  pointer(square('h5'), 'pointerdown');
  assert.equal(board.querySelector('.profile-sel'), null, 'input is locked during the lead-in');
  t.mock.timers.tick(450); await Promise.resolve();
  assert.ok(!at('g8') && at('f6') && ready);
  assert.ok(square('g8').classList.contains('profile-hl') && square('f6').classList.contains('profile-hl'));

  doc.elementFromPoint = () => square('f7');
  pointer(square('h5'), 'pointerdown', {buttons: 1});
  pointer(doc, 'pointermove', {buttons: 1, clientX: 20});
  assert.match(at('h5').style.transform, /translate/);
  pointer(doc, 'pointermove', {buttons: 3, clientX: 20});
  pointer(square('f7'), 'pointerup');
  assert.equal(at('h5').style.transform, '');
  assert.equal(board.querySelector('.profile-sel, .profile-target, .profile-moving'), null);
  assert.deepEqual(submitted, []);

  pointer(square('h5'), 'pointerdown', {buttons: 1});
  pointer(doc, 'pointermove', {buttons: 1, clientX: 20});
  assert.equal(square('f7').dispatchEvent(new win.MouseEvent('contextmenu', {bubbles: true, cancelable: true, button: 2})), false);
  assert.equal(at('h5').style.transform, '');
  assert.equal(board.querySelector('.profile-sel, .profile-target, .profile-moving'), null);

  pointer(square('h5'), 'pointerdown'); pointer(square('h5'), 'pointerup');
  pointer(square('f7'), 'pointerdown');
  assert.deepEqual(submitted.map(({from, to}) => [from, to]), [['h5', 'f7']]);
});
