import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Chess} from '../lib/chess.js';
import {app, loadGame, settle} from './helpers/app.mjs';

function setup(t) {
  const a = app(t);
  loadGame(a, '1. e4 e5');
  a.state.bests[0] = {bestmove:'e2e4',score:{cp:40},lines:[{score:{cp:40},pv:'e2e4'}]};
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.state.settings.sound = true;
  const played = [];
  a.replace('triggerAudio', url => played.push(url));
  a.replace('playEvent', () => {});
  a.replace('playWrongSound', () => {});
  return {a, played};
}

test('success choices resolve to bundled WAVs, with a safe default and an independent Off option', t => {
  const {a, played} = setup(t);
  const choices = a.run('PUZZLE_SUCCESS_SOUNDS');
  assert.equal(choices.length, 5);
  assert.equal(choices[0][0], 'soft-retro');
  assert.equal(a.state.settings.puzzleSuccessSound, 'soft-retro');
  for (const [id, , file] of choices) {
    const wav = readFileSync(new URL('../' + file, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    a.state.settings.puzzleSuccessSound = id;
    a.call('playPuzzleSuccess');
    assert.equal(played.pop(), 'https://extension.test/' + file);
  }
  for (const invalid of [undefined, 'removed-sound']) {
    a.state.settings.puzzleSuccessSound = invalid;
    a.call('playPuzzleSuccess');
    assert.match(played.pop(), /04-soft-retro\.wav$/);
  }
  a.state.settings.puzzleSuccessSound = 'none';
  a.call('playPuzzleSuccess'); a.call('playPuzzleSuccess', true);
  assert.deepEqual(played, []);
  a.state.settings.puzzleSuccessSound = 'airy-bloom';
  a.state.settings.sound = false;
  a.call('playPuzzleSuccess'); assert.deepEqual(played, []);
  a.call('playPuzzleSuccess', true);
  assert.match(played.pop(), /05-airy-bloom\.wav$/);
});

test('success audio respects master volume and Soft Retro plays at 25% of its original level', async t => {
  const a = app(t), requests = [], sources = [], gains = [];
  const destination = {}, buffer = {};
  a.state.settings.sound = true; a.state.settings.soundVolume = 27;
  a.replace('audioCtx', () => ({state:'running', destination,
    createBufferSource() {
      const source = {playbackRate:{}, connect(gain) {assert.equal(gain, gains.at(-1));return gain;}, start() {this.started = true;}};
      sources.push(source); return source;
    },
    createGain() {const gain = {gain:{},connect(target) {assert.equal(target, destination);}};gains.push(gain);return gain;},
  }));
  a.replace('processedFx', async (...args) => {requests.push(args);return {buffer,rate:1};});
  a.state.settings.puzzleSuccessSound = 'warm-marimba';
  a.call('playPuzzleSuccess'); await settle();
  assert.deepEqual(requests, [['https://extension.test/sounds/success/01-warm-marimba.wav', 0, 1]]);
  assert.equal(gains[0].gain.value, .27);assert.equal(sources[0].buffer, buffer);assert.equal(sources[0].started, true);
  a.state.settings.puzzleSuccessSound = 'soft-retro';
  a.call('playPuzzleSuccess');await settle();
  assert.deepEqual(requests[1], ['https://extension.test/sounds/success/04-soft-retro.wav', 0, 1]);
  assert.equal(gains[1].gain.value, .27 * .25);
});

test('Sound settings save and preview each choice, support Off without a preview button, and reset to default', async t => {
  const {a, played} = setup(t);
  a.call('toggleSettings');
  const doc = a.dom.window.document;
  const controls = () => doc.querySelector('.set-puzzle-success');
  const sound = [...doc.querySelectorAll('.set-section')].find(s => s.querySelector('.set-sect-head').textContent === 'Sound');
  sound.querySelector('.set-sect-head').click();
  assert.ok(controls().closest('.set-section').classList.contains('open'));
  assert.equal(controls().querySelectorAll('.lib-dd-opt').length, 6);
  for (const [id, label] of a.run('PUZZLE_SUCCESS_SOUNDS')) {
    [...controls().querySelectorAll('.lib-dd-opt')].find(b => b.textContent === label).click();
    await settle();await a.run('_settingsWriteQueue');await settle();
    assert.equal(a.store.settings.puzzleSuccessSound, id);
    assert.equal(controls().querySelector('.lib-dd-cur').textContent, label);
    assert.equal(played.length, 1);played.length = 0;
  }
  assert.equal(controls().querySelector('.set-reset'), null);
  assert.equal(doc.body.textContent.includes('Preview sound'), false);
  [...controls().querySelectorAll('.lib-dd-opt')].find(b => b.textContent === 'Off').click();
  await settle();await a.run('_settingsWriteQueue');await settle();
  assert.equal(a.store.settings.puzzleSuccessSound, 'none');
  assert.deepEqual(played, []);
  await a.call('resetSettingKeys', a.run('VISUAL_SETTING_KEYS'));
  assert.equal(a.store.settings.puzzleSuccessSound, 'soft-retro');
});

test('incorrect sounds can be muted independently in puzzles and practice and reset in Sound settings', async t => {
  const a = app(t), played = [];
  a.replace('triggerAudio', url => played.push(url));
  loadGame(a, '1. e4 e5');
  a.state.bests[0] = {bestmove:'e2e4',score:{cp:40},lines:[]};
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  a.state.settings.sound = true;
  a.call('toggleSettings');
  const doc = a.dom.window.document;
  const select = async value => {
    const label = value ? 'Try Again' : 'Off';
    [...doc.querySelectorAll('.set-puzzle-incorrect .lib-dd-opt')].find(b => b.textContent === label).click();
    await settle();await a.run('_settingsWriteQueue');await settle();
    assert.equal(a.store.settings.puzzleIncorrectSound, value ? 'default' : 'none');
    assert.equal(doc.querySelector('.set-puzzle-incorrect .lib-dd-cur').textContent, label);
    played.length = 0;
  };
  await select(false);
  a.state.practice = {spots:[1],i:0,solving:true,busy:false};
  await a.call('practiceAttempt', 'd2', 'd4');assert.deepEqual(played, []);
  await select(true);
  await a.call('practiceAttempt', 'd2', 'd4');assert.equal(played.length, 1);
  assert.match(played[0], /Wrong\/Incorrect\.mp3$/);
  a.state.practice = null;
  const p = {id:'incorrect-sound',fen:new Chess().fen(),solution:['e2e4'],rating:1200,themes:[],source:{url:'https://lichess.org/training'}};
  t.mock.method(globalThis, 'fetch', async () => ({ok:true,json:async () => ({schema:1,puzzles:[p]})}));
  await a.call('openLearning');const w = a.run('learningWorkspace');t.after(() => w.close());
  await w.startPuzzleSelection([p]);
  await a.call('setSetting', 'puzzleIncorrectSound', false);
  await w.submitPuzzle('d2d4');assert.equal(played.length, 1);
  await a.call('setSetting', 'puzzleIncorrectSound', true);
  await w.submitPuzzle('d2d4');assert.equal(played.length, 2);
  a.state.settings.sound = false;
  await w.submitPuzzle('d2d4');assert.equal(played.length, 2);
  await a.call('setSetting', 'puzzleIncorrectSound', false);
  await a.call('resetSettingKeys', a.run('VISUAL_SETTING_KEYS'));
  assert.equal(a.store.settings.puzzleIncorrectSound, 'default');
});

test('both puzzle sounds share the event dropdown, volume, pitch and speed layout and save live tuning', async t => {
  const {a} = setup(t), played = [];
  a.replace('triggerAudio', (...args) => played.push(args));
  a.call('toggleSettings');
  const doc = a.dom.window.document;
  for (const [event, label] of [['puzzleSuccess', 'Puzzle success'], ['puzzleIncorrect', 'Incorrect puzzle']]) {
    const controls = doc.querySelector(`[data-sound-event="${event}"]`);
    assert.ok(controls.classList.contains('set-fx'));
    assert.equal(controls.querySelector('.set-row > .set-lbl').textContent, label);
    assert.ok(controls.querySelector('.lib-dd-field'));
    assert.equal(controls.querySelector('.set-seg'), null);
    assert.deepEqual([...controls.querySelectorAll('.set-fx-knob .set-lbl')].map(n => n.textContent), ['Volume', 'Pitch', 'Speed']);
    const [, pitch, speed] = controls.querySelectorAll('input[type=range]');
    pitch.value = -4;pitch.dispatchEvent(new a.dom.window.Event('input'));pitch.dispatchEvent(new a.dom.window.Event('change'));
    speed.value = 1.35;speed.dispatchEvent(new a.dom.window.Event('input'));speed.dispatchEvent(new a.dom.window.Event('change'));
    await a.run('_settingsWriteQueue');
    assert.equal(a.store.settings.soundFx[event].pitch, -4);
    assert.equal(a.store.settings.soundFx[event].speed, 1.35);
    assert.deepEqual(played.at(-1).slice(1), [-4, 1.35, event === 'puzzleSuccess' ? .25 : 1]);
  }
  const controls = () => doc.querySelector('.set-puzzle-incorrect');
  [...controls().querySelectorAll('.lib-dd-opt')].find(b => b.textContent === 'Retro Wobble').click();
  await settle();await a.run('_settingsWriteQueue');await settle();
  assert.equal(a.store.settings.puzzleIncorrectSound, 'retro-wobble');
  assert.deepEqual(played.at(-1), ['https://extension.test/sounds/Wrong/retro-wobble.wav', -4, 1.35, 1]);
  [...controls().querySelectorAll('.lib-dd-opt')].find(b => b.textContent === 'Off').click();
  await settle();await a.run('_settingsWriteQueue');await settle();
  const count = played.length;
  controls().querySelector('input').dispatchEvent(new a.dom.window.Event('change'));
  assert.equal(played.length, count);
  await a.call('resetSettingKeys', a.run('VISUAL_SETTING_KEYS'));
  for (const event of ['puzzleSuccess', 'puzzleIncorrect']) {
    assert.equal(a.call('fxConfig', event).pitch, 0);
    assert.equal(a.call('fxConfig', event).speed, 1);
  }
});

test('puzzle playback applies independent saved pitch and speed and supports legacy incorrect mute settings', async t => {
  const a = app(t), played = [];
  a.state.settings.sound = true;
  a.replace('triggerAudio', (...args) => played.push(args));
  await a.call('setFx', 'puzzleSuccess', 'pitch', 3);
  await a.call('setFx', 'puzzleSuccess', 'speed', 1.5);
  await a.call('setFx', 'puzzleIncorrect', 'pitch', -2);
  await a.call('setFx', 'puzzleIncorrect', 'speed', .75);
  a.state.settings.puzzleSuccessSound = 'soft-retro';
  a.call('playPuzzleSuccess');a.call('playWrongSound');
  assert.deepEqual(played, [
    ['https://extension.test/sounds/success/04-soft-retro.wav', 3, 1.5, .25],
    ['https://extension.test/sounds/Wrong/Incorrect.mp3', -2, .75, 1],
  ]);
  a.state.settings.puzzleIncorrectSound = false;
  a.call('playWrongSound');assert.equal(played.length, 2);
  a.state.settings.puzzleIncorrectSound = true;
  a.call('playWrongSound');assert.equal(played.length, 3);
  a.state.settings.puzzleIncorrectSound = 'removed-effect';
  a.call('playWrongSound');assert.match(played.at(-1)[0], /Wrong\/Incorrect\.mp3$/);
  a.state.settings.sound = false;
  a.call('playPuzzleSuccess');a.call('playWrongSound');assert.equal(played.length, 4);
});

test('practice plays success once for an accepted answer and stays silent for wrong or illegal answers', async t => {
  const {a, played} = setup(t);
  a.state.practice = {spots:[1],i:0,solving:true,busy:false};
  a.state.bests[0].lines.push({score:{cp:-400},pv:'d2d4'});
  await a.call('practiceAttempt', 'e2', 'e5');
  await a.call('practiceAttempt', 'd2', 'd4');
  assert.deepEqual(played, []);
  await a.call('practiceAttempt', 'e2', 'e4');
  await a.call('practiceAttempt', 'e2', 'e4');
  assert.equal(played.length, 1);assert.match(played[0], /04-soft-retro\.wav$/);
});

async function learning(t) {
  const result = setup(t), {a} = result;
  a.state.settings.learningTransition = 'morph4';
  const p = {id:'success-test',fen:new Chess().fen(),solution:['e2e4','e7e5','g1f3'],rating:1200,difficulty:'Introductory',phase:'Middlegame',theme:'hangingPiece',themes:[],source:{url:'https://lichess.org/training'}};
  t.mock.method(globalThis, 'fetch', async () => ({ok:true,json:async () => ({schema:1,puzzles:[p]})}));
  await a.call('openLearning');const w = a.run('learningWorkspace');
  t.after(() => w.close());await w.startPuzzleSelection([p]);
  return {...result, w};
}

test('puzzles play success only on completion, including after a retry, and never repeat it', async t => {
  const {a, w, played} = await learning(t);
  await w.submitPuzzle('d2d4');assert.deepEqual(played, []);
  await w.submitPuzzle('e2e4');assert.deepEqual(played, []);
  a.state.settings.puzzleSuccessSound = 'crystal-chime';
  await w.submitPuzzle('g1f3');await w.submitPuzzle('g1f3');
  assert.equal(played.length, 1);assert.match(played[0], /02-crystal-chime\.wav$/);
});

test('revealing or skipping a puzzle does not play success', async t => {
  const {w, played} = await learning(t);
  await w.revealPuzzle();assert.deepEqual(played, []);
  await w.preparePuzzle(w.puzzles[0]);
  await w.skipPuzzle();assert.deepEqual(played, []);
});

test('muting before puzzle completion suppresses success', async t => {
  const {a, w, played} = await learning(t);
  await w.submitPuzzle('e2e4');a.state.settings.sound = false;
  await w.submitPuzzle('g1f3');assert.deepEqual(played, []);
});
