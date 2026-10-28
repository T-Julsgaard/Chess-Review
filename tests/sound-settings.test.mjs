import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {app, settle} from './helpers/app.mjs';

test('incorrect choices contain only four dedicated cues and Off, and each choice persists and previews', async t => {
  const a = app(t), played = [];
  a.replace('triggerAudio', (...args) => played.push(args));
  a.call('buildUI');a.call('toggleSettings');
  const doc = a.dom.window.document;
  const choices = a.run('PUZZLE_INCORRECT_SOUNDS');
  const options = () => [...doc.querySelectorAll('.set-puzzle-incorrect .lib-dd-opt')];
  assert.deepEqual(options().map(n => n.textContent), ['Try Again', 'Soft Descent', 'Retro Wobble', 'Wooden Knock', 'Off']);
  for (const [id, label, file] of choices) {
    assert.ok(readFileSync(new URL('../' + file, import.meta.url)).length > 44);
    options().find(n => n.textContent === label).click();
    await settle();await a.run('_settingsWriteQueue');await settle();
    assert.equal(a.store.settings.puzzleIncorrectSound, id);
    assert.equal(played.at(-1)[0], 'https://extension.test/' + file);
    assert.equal(doc.querySelector('.set-puzzle-incorrect .lib-dd-cur').textContent, label);
  }
  for (const legacy of ['01', '09', 'removed', true, undefined]) {
    a.state.settings.puzzleIncorrectSound = legacy;
    a.call('triggerFx', 'puzzleIncorrect');
    assert.equal(played.at(-1)[0], 'https://extension.test/sounds/Wrong/Incorrect.mp3');
  }
  options().find(n => n.textContent === 'Off').click();
  await settle();await a.run('_settingsWriteQueue');
  const count = played.length;a.call('playWrongSound', true);assert.equal(played.length, count);
});

test('generated incorrect cues are distinct playable PCM with headroom and silent boundaries', t => {
  const a = app(t), seen = new Set();
  for (const [, , file] of a.run('PUZZLE_INCORRECT_SOUNDS').slice(1)) {
    const wav = readFileSync(new URL('../' + file, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ');
    assert.equal(wav.readUInt32LE(4), wav.length - 8);
    assert.equal(wav.readUInt16LE(20), 1);assert.equal(wav.readUInt16LE(22), 1);
    assert.equal(wav.readUInt32LE(24), 48000);assert.equal(wav.readUInt16LE(34), 16);
    assert.equal(wav.readUInt32LE(40), wav.length - 44);
    let peak = 0, energy = 0;
    for (let i = 44; i < wav.length; i += 2) {const v = wav.readInt16LE(i);peak = Math.max(peak, Math.abs(v));energy += v*v;}
    assert.ok(peak > 16000 && peak < 22000);assert.ok(energy > 0);
    assert.equal(wav.readInt16LE(44), 0);assert.ok(Math.abs(wav.readInt16LE(wav.length - 2)) < 10);
    seen.add(wav.toString('base64'));
  }
  assert.equal(seen.size, 3);
});

test('all six event volume sliders save independently, preview at their level and reset with countdown volume', async t => {
  const a = app(t), played = [];
  a.replace('triggerAudio', (...args) => played.push(args));
  a.call('buildUI');a.call('toggleSettings');
  const doc = a.dom.window.document;
  const events = ['puzzleSuccess', 'puzzleIncorrect', 'move', 'capture', 'check', 'castle', 'runStart'];
  for (const [i, event] of events.entries()) {
    const slider = doc.querySelector(`[data-sound-event="${event}"] input[type=range]`);
    assert.ok(slider.getAttribute('aria-label').includes('volume'));
    slider.value = 20 + i * 10;
    slider.dispatchEvent(new a.dom.window.Event('input'));
    slider.dispatchEvent(new a.dom.window.Event('change'));
    await a.run('_settingsWriteQueue');
    assert.equal(a.store.settings.soundFx[event].volume, 20 + i * 10);
    assert.equal(slider.previousElementSibling.querySelector('b').textContent, (20 + i * 10) + ' %');
    if (event !== 'runStart') assert.equal(played.at(-1)[3], (event === 'puzzleSuccess' ? .25 : 1) * (20 + i * 10) / 100);
  }
  assert.equal(a.state.settings.soundVolume, 50);
  for (const [i, event] of events.entries()) assert.equal(a.call('fxConfig', event).volume, 20 + i * 10);
  await a.call('resetSettingKeys', a.run('VISUAL_SETTING_KEYS'));
  for (const event of events) assert.equal(a.call('fxConfig', event).volume, 100);
});

test('playback multiplies event and master levels, preserves Soft Retro calibration and mutes events independently', async t => {
  const a = app(t), gains = [];
  a.state.settings.sound = true;a.state.settings.soundVolume = 40;
  a.replace('audioCtx', () => ({state:'running',destination:{},
    createBufferSource: () => ({playbackRate:{},connect: gain => gain,start() {}}),
    createGain: () => {const gain={gain:{},connect() {}};gains.push(gain);return gain;},
  }));
  a.replace('processedFx', async () => ({buffer:{},rate:1}));
  for (const [event, volume, expected] of [['move', 30, .12], ['capture', 80, .32], ['puzzleIncorrect', 0, 0], ['puzzleSuccess', 60, .06]]) {
    await a.call('setFx', event, 'volume', volume);
    a.call('triggerFx', event);await settle();
    assert.ok(Math.abs(gains.at(-1).gain.value - expected) < 1e-12);
  }
  for (const [volume, expected] of [[undefined, 100], [null, 100], ['invalid', 100], [Infinity, 100], [-4, 0], [140, 100], [25, 25]]) {
    a.state.settings.soundFx = {move:{volume}};
    assert.equal(a.call('fxConfig', 'move').volume, expected);
  }
  a.state.settings.soundFx = {move:{snd:'02',pitch:-3,speed:1.3}};
  assert.equal(a.call('fxConfig', 'move').volume, 100);
  await a.call('setFx', 'move', 'volume', 45);
  assert.equal(a.call('fxConfig', 'move').snd, '02');assert.equal(a.call('fxConfig', 'move').pitch, -3);
  assert.equal(a.call('fxConfig', 'move').speed, 1.3);
});
