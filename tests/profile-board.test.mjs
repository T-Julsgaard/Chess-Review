import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createProfileBoard, squareNames} from '../lib/profile/board.js';

function surface(t, motion = true) {
  const dom = new JSDOM('<div class="board">'+ '<div class="sq"></div>'.repeat(64) +'</div>');
  t.after(() => { api.clear(); dom.window.close(); });
  const board = dom.window.document.querySelector('.board');
  const api = createProfileBoard({board, motion: () => motion, makePiece: () => dom.window.document.createElement('img')});
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
