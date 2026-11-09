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

test('brilliant moves play their ordinary move sound', t => {
  const a = app(t), played = [];
  a.state.settings.sound = true;
  a.replace('playEvent', event => played.push(event));
  a.state.classif = [null, 'brilliant'];
  for (const san of ['Bxf7', 'Nf3', 'O-O']) {
    a.state.positions = [{}, {san}];
    a.call('playMoveSound', 1);
  }
  assert.deepEqual(played, ['capture', 'move', 'castle']);
  assert.equal(a.run('SOUND_EVENTS').some(([event]) => event === 'brilliant'), false);
  a.state.settings.sound = false;
  a.call('playMoveSound', 1);
  assert.equal(played.length, 3);
});

test('check overrides castling cues on brilliant moves, including when the check sound is off', async t => {
  const a = app(t), played = [];
  const triggerFx = a.run('triggerFx');
  a.state.settings.sound = true;
  a.replace('triggerFx', event => played.push(event));
  a.state.classif = [null, 'brilliant'];
  for (const san of ['Bxf7+', 'Qxh7#', 'O-O+', 'O-O-O#']) {
    a.state.positions = [{}, {san}];
    for (let repeat = 0; repeat < 2; repeat++) {
      a.run('_lastNavSound = -Infinity');
      a.call('playMoveSound', 1);
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

test('review navigation plays normal audio for a brilliant move in both directions', t => {
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
  assert.deepEqual(played, ['move', 'move', 'move']);
});
