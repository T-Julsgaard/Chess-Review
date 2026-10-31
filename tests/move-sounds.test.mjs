import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame } from './helpers/app.mjs';

test('check and mate override captures with exactly one cue in review and practice', t => {
  const a = app(t), played = [];
  a.state.settings.sound = true;
  a.replace('playEvent', event => played.push(event));

  for (const san of ['Bxf7+', 'Qxh7#', 'exd6+', 'gxh8=Q+']) {
    a.state.positions = [{}, { san }];
    a.call('playMoveSound', 1);
    a.call('playSanSound', san);
  }

  assert.deepEqual(played, Array(8).fill('check'));
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

test('brilliant cues override SAN sounds only for known forward review moves', async t => {
  const a = app(t), played = [];
  a.state.settings.sound = true;
  a.replace('playEvent', event => played.push(event));
  a.state.positions = [{}, {san: 'Bxf7'}];
  a.state.classif = [null, 'brilliant'];
  a.call('playMoveSound', 1);
  a.call('playMoveSound', 1, false);
  a.call('playSanSound', 'Bxf7');
  assert.deepEqual(played, ['brilliant', 'capture', 'capture']);

  await a.call('setFx', 'brilliant', 'snd', 'none');
  a.call('playMoveSound', 1);
  assert.equal(played.at(-1), 'capture');
  await a.call('setFx', 'brilliant', 'snd', 'default');
  a.state.practice = {};
  a.call('playMoveSound', 1);
  assert.equal(played.at(-1), 'capture');
  a.state.practice = null;
  a.state.classif[1] = 'great';
  a.call('playMoveSound', 1);
  assert.equal(played.at(-1), 'capture');
  a.state.classif[1] = 'brilliant';
  a.state.settings.sound = false;
  const count = played.length;
  a.call('playMoveSound', 1);
  assert.equal(played.length, count);
});

test('check overrides brilliant and castling cues, including when the check sound is off', async t => {
  const a = app(t), played = [];
  const triggerFx = a.run('triggerFx');
  a.state.settings.sound = true;
  a.replace('triggerFx', event => played.push(event));
  a.state.classif = [null, 'brilliant'];
  for (const san of ['Bxf7+', 'Qxh7#', 'O-O+', 'O-O-O#']) {
    a.state.positions = [{}, {san}];
    for (const forward of [true, false]) {
      a.run('_lastNavSound = -Infinity');
      a.call('playMoveSound', 1, forward);
    }
  }
  assert.deepEqual(played, Array(8).fill('check'));

  // Turning check off must not fall back to an unrelated move/capture/celebration.
  a.replace('triggerFx', triggerFx);
  const audio = [];
  a.replace('triggerAudio', (...args) => audio.push(args));
  await a.call('setFx', 'check', 'snd', 'none');
  a.run('_lastNavSound = -Infinity');
  a.call('playMoveSound', 1);
  assert.equal(audio.length, 0);
});

test('review navigation celebrates a brilliant move once on entry and uses normal audio when undoing it', t => {
  const a = app(t), played = [];
  loadGame(a, '1. e4 e5');a.call('computeDerived');a.call('buildUI');
  a.state.classif[1] = 'brilliant';
  a.state.settings.sound = true;
  a.replace('playEvent', event => played.push(event));
  a.call('go', 1);
  a.call('go', 1);
  a.call('renderAll');
  a.call('go', 0);
  a.call('go', 1);
  assert.deepEqual(played, ['brilliant', 'move', 'brilliant']);
});
