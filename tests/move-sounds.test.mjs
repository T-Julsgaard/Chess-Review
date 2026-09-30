import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from './helpers/app.mjs';

test('captures override check and mate sounds in review and practice moves', t => {
  const a = app(t), played = [];
  a.state.settings.sound = true;
  a.replace('playEvent', event => played.push(event));

  for (const san of ['Bxf7+', 'Qxh7#', 'exd6+', 'gxh8=Q+']) {
    a.state.positions = [{}, { san }];
    a.call('playMoveSound', 1);
    a.call('playSanSound', san);
  }

  assert.deepEqual(played, Array(8).fill('capture'));
});

test('quiet moves, captures, checks, mates and castling retain their sounds', t => {
  const a = app(t);
  for (const [san, expected] of [
    ['e4', 'move'], ['Bxf7', 'capture'], ['Qh5+', 'check'], ['Qh7#', 'check'],
    ['O-O', 'castle'], ['O-O-O', 'castle'], ['0-0', 'castle'], ['O-O+', 'check'],
    [undefined, 'move'],
  ]) {
    assert.equal(a.call('sanSound', san), expected, san);
  }
});
