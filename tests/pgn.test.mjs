import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../lib/chess.js';

const comments = [
  ['ordinary comment', 'ordinary comment'],
  ['{first} {second}', '[first] [second]'],
  ['nested {{idea}} and }} replies {{', 'nested [[idea]] and ]] replies [['],
  ['50% café {centre} and {king}', '50% café [centre] and [king]'],
  ['} 1... e5 { } 2. Nf3 {', '] 1... e5 [ ] 2. Nf3 ['],
  ['', ''],
];
for (const [input, expected] of comments) {
  test(`PGN round-trip preserves moves and comments: ${JSON.stringify(input)}`, () => {
    const original = new Chess();
    original.move('e4');
    original.setComment(input);
    original.move('c5');
    original.setComment('Reply {one} and {two}');
    const restored = new Chess();
    restored.loadPgn(original.pgn(), { strict: true });
    assert.deepEqual(restored.history(), ['e4', 'c5']);
    assert.equal(restored.fen(), original.fen());
    assert.equal(restored.getComment(), 'Reply [one] and [two]');
    restored.undo();
    assert.equal(restored.getComment(), expected);
  });
}

for (const [name, separator, options] of [
  ['default LF', '\n', {}],
  ['default CRLF', '\r\n', {}],
  ['escaped LF regexp', '\n', { newlineChar: String.raw`\r?\n` }],
  ['escaped CRLF regexp', '\r\n', { newlineChar: String.raw`\r?\n` }],
  ['escaped pipe regexp', '|', { newlineChar: String.raw`\|` }],
]) {
  test(`PGN import keeps headers, comments and moves with ${name}`, () => {
    const pgn = [
      '[Event "Separator regression"]',
      '[White "White player"]',
      '',
      '1. e4 {Opening comment}',
      'e5 ; Reply comment',
      '2. Nf3 Nc6 *',
    ].join(separator);
    const chess = new Chess();
    chess.loadPgn(pgn, { ...options, strict: true });
    assert.deepEqual(chess.history(), ['e4', 'e5', 'Nf3', 'Nc6']);
    assert.equal(chess.getHeaders().Event, 'Separator regression');
    assert.equal(chess.getHeaders().White, 'White player');
    assert.deepEqual(chess.getComments().map(({ comment }) => comment.trim()),
      ['Opening comment', 'Reply comment']);
  });
}
