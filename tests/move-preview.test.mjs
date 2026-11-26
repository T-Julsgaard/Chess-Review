import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {createMovePreview} from '../lib/move-preview.js';

function fixture(t, fen = new Chess().fen()) {
  const dom = new JSDOM('<div class="board"><svg class="user-arrows"></svg></div><button>Preview</button>');
  const doc = dom.window.document, board = doc.querySelector('.board'), owner = doc.querySelector('button');
  const squares = {}, animations = [], pending = new Map();
  let now = 0, next = 0;
  const preview = createMovePreview({
    setTimer(fn, delay) { const id = ++next; pending.set(id, {fn, at: now + delay}); return id; },
    clearTimer(id) { pending.delete(id); },
  });
  function tick(ms) {
    const end = now + ms;
    for (;;) {
      const entry = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry || entry[1].at > end) break;
      pending.delete(entry[0]); now = entry[1].at; entry[1].fn();
    }
    now = end;
  }
  const makePiece = (type, color) => {
    const piece = doc.createElement('img'); piece.className = 'piece-img'; piece.dataset.piece = color + type;
    piece.animate = (frames, options) => {
      const animation = {frames, options, cancel() { this.cancelled = true; }};
      animations.push(animation); return animation;
    };
    return piece;
  };
  const chess = new Chess(fen);
  for (let rank = 8; rank >= 1; rank--) for (const file of 'abcdefgh') {
    const name = file + rank, square = doc.createElement('div');
    square.className = 'sq ' + ((file.charCodeAt(0) + rank) % 2 ? 'light' : 'dark');
    square.dataset.square = name;
    const piece = chess.get(name); if (piece) square.append(makePiece(piece.type.toUpperCase(), piece.color));
    board.append(square); squares[name] = square;
  }
  // Rects resolve from the square name on original and cloned cells, including a flipped board.
  let flipped = false;
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    const name = this.dataset.square || this.parentElement?.dataset.square || 'a8';
    const f = name.charCodeAt(0) - 97, r = 8 - Number(name[1]);
    return {left: (flipped ? 7 - f : f) * 50, top: (flipped ? 7 - r : r) * 50};
  };
  t.after(() => { preview.cancel(); dom.window.close(); });
  const show = (uci, options = {}) => preview.show({board, squares, makePiece, owner,
    currentFen: fen, baseFen: fen, uci, duration: 160, ...options});
  const pieceAt = square => board.querySelector(`.move-preview [data-square="${square}"] .piece-img`)?.dataset.piece;
  return {dom, doc, board, owner, squares, animations, pending, preview, tick, show, pieceAt,
    flip: () => { flipped = !flipped; }};
}

test('click previews once, animates back, and reveals the unchanged board', t => {
  const f = fixture(t), original = f.board.innerHTML;
  f.show('g1f3');
  assert.equal(f.pieceAt('f3'), 'wN'); assert.equal(f.pieceAt('g1'), undefined);
  assert.equal(f.board.classList.contains('previewing-move'), true);
  assert.deepEqual(f.animations[0].frames[0], {transform: 'translate(50px, 100px)'});
  f.tick(1009); assert.equal(f.pieceAt('f3'), 'wN');
  f.tick(1); assert.equal(f.pieceAt('g1'), 'wN');
  assert.deepEqual(f.animations[1].frames[0], {transform: 'translate(-50px, -100px)'});
  f.tick(220);
  assert.equal(f.board.querySelector('.move-preview'), null);
  assert.equal(f.board.innerHTML, original); assert.equal(f.pending.size, 0);
});

test('hover holds until released; clicking a hovered move makes a bounded preview', t => {
  const f = fixture(t);
  f.show('g1f3', {hold: true}); f.tick(10000);
  assert.equal(f.pieceAt('f3'), 'wN');
  f.preview.release(f.owner); assert.equal(f.pieceAt('g1'), 'wN'); f.tick(220);
  assert.equal(f.board.querySelector('.move-preview'), null);
  f.show('g1f3', {hold: true}); f.show('g1f3');
  f.preview.release(f.owner); assert.equal(f.pieceAt('f3'), 'wN');
  f.tick(1230); assert.equal(f.board.querySelector('.move-preview'), null);
});

test('new mentions replace previews and ignore releases from the previous link', t => {
  const f = fixture(t), second = f.doc.createElement('button'); f.doc.body.append(second);
  f.show('g1f3', {hold: true});
  f.show('b1c3', {hold: true, owner: second});
  f.preview.release(f.owner); f.tick(10000);
  assert.equal(f.pieceAt('c3'), 'wN'); assert.equal(f.pieceAt('g1'), 'wN');
  assert.equal(f.board.querySelectorAll('.move-preview').length, 1);
  f.preview.release(second); f.tick(220); assert.equal(f.pending.size, 0);
});

test('alternatives undo the played move and restore it after the preview', t => {
  const chess = new Chess(); const played = chess.move('e4'); const f = fixture(t, chess.fen());
  f.show('d2d4', {baseFen: played.before, played, hold: true});
  assert.equal(f.pieceAt('e2'), 'wP'); assert.equal(f.pieceAt('e4'), undefined);
  f.tick(320); assert.equal(f.pieceAt('d4'), 'wP');
  f.preview.release(f.owner); f.tick(220);
  assert.equal(f.pieceAt('e4'), 'wP'); assert.equal(f.pieceAt('d2'), 'wP');
  f.tick(220); assert.equal(f.board.querySelector('.move-preview'), null);
});

test('later mentions play their legal prefix once and reverse it on leave', t => {
  const f = fixture(t);
  f.show('e2e4 d7d5 e4d5', {hold: true}); f.tick(640);
  assert.equal(f.pieceAt('d5'), 'wP'); assert.equal(f.pieceAt('e4'), undefined);
  f.preview.release(f.owner); assert.equal(f.pieceAt('d5'), 'bP');
  f.tick(660); assert.equal(f.board.querySelector('.move-preview'), null);
});

test('captures, en passant, castling and promotions restore every original piece', t => {
  for (const [fen, uci, expected, empty] of [
    ['4k3/8/8/8/8/2n5/8/1N2K3 w - - 0 1', 'b1c3', {c3:'wN'}, ['b1']],
    ['4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', 'e5d6', {d6:'wP'}, ['e5','d5']],
    ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1', {g1:'wK',f1:'wR'}, ['e1','h1']],
    ['r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', 'e8c8', {c8:'bK',d8:'bR'}, ['e8','a8']],
    ['4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a7a8n', {a8:'wN'}, ['a7']],
  ]) {
    const f = fixture(t, fen), original = f.board.innerHTML;
    f.show(uci, {hold:true});
    for (const [square, code] of Object.entries(expected)) assert.equal(f.pieceAt(square), code, uci);
    for (const square of empty) assert.equal(f.pieceAt(square), undefined, uci);
    assert.equal(f.animations.length, uci.includes('e1g1') || uci.includes('e8c8') ? 2 : 1);
    f.preview.release(f.owner); f.tick(220);
    assert.equal(f.board.innerHTML, original, uci);
  }
});

test('flipped and reduced-motion previews retain their direction and lifetime', t => {
  const f = fixture(t); f.flip(); f.show('g1f3');
  assert.deepEqual(f.animations[0].frames[0], {transform: 'translate(-50px, -100px)'});
  f.preview.cancel(); f.animations.length = 0;
  f.show('e2e4 e7e5', {motion: false}); f.tick(0);
  assert.equal(f.pieceAt('e5'), 'bP'); assert.equal(f.animations.length, 0);
  f.tick(850); assert.equal(f.board.querySelector('.move-preview'), null);
});

test('invalid lines, stale links and cancellation cannot leave a layer or delayed replay', t => {
  const f = fixture(t);
  for (const uci of ['g1g8', 'e2e4 nope', '']) {
    f.show(uci); assert.equal(f.board.querySelector('.move-preview'), null);
  }
  f.show('e2e4'); f.preview.cancel(); f.tick(10000);
  assert.equal(f.board.querySelector('.move-preview'), null); assert.equal(f.pending.size, 0);
  f.owner.remove(); f.show('e2e4'); assert.equal(f.pending.size, 0);
});
