import {mkdir, writeFile} from 'node:fs/promises';

// Original brilliant-move candidates; no recordings, dependencies or random input.
// Regenerate with: node scripts/generate-brilliant-sounds.mjs
const rate = 48000, tau = 2 * Math.PI;
const output = new URL('../sounds/brilliant/', import.meta.url);
const sin = phase => Math.sin(tau * phase);
const hz = midi => 440 * 2 ** ((midi - 69) / 12);

function voice(t, note, kind) {
  const age = t - note.start;
  if (age <= 0 || age >= note.length) return 0;
  const f = hz(note.pitch), phase = f * age;
  const attack = kind === 'pad' ? .12 : kind === 'brass' ? .025 : .006;
  const fade = Math.min(1, (note.length - age) / .1);
  const envelope = (1 - Math.exp(-age / attack)) * fade * fade;
  let wave;
  switch (kind) {
    case 'bell':
      wave = sin(phase) * Math.exp(-age * 4)
        + .27 * sin(phase * 2.003) * Math.exp(-age * 7)
        + .09 * sin(phase * 4.19) * Math.exp(-age * 12);
      break;
    case 'mallet':
      wave = sin(phase) * Math.exp(-age * 7)
        + .28 * sin(phase * 3.98) * Math.exp(-age * 23)
        + .13 * sin(phase / 2) * Math.exp(-age * 9);
      break;
    case 'pad':
      wave = (sin(phase + .012 * sin(4 * age))
        + .38 * sin(phase * 1.003) + .17 * sin(phase * 2)) * Math.exp(-age * 2);
      break;
    case 'brass':
      wave = (sin(phase + .03 * sin(5 * age)) + .24 * sin(phase * 2)
        + .10 * sin(phase * 3)) * Math.exp(-age * 3);
      break;
    case 'spark':
      wave = (sin(phase + 1.1 * Math.exp(-age * 18) * sin(phase * 2))
        + .1 * sin(phase * 3)) * Math.exp(-age * 9);
      break;
    default: throw Error(`Unknown voice: ${kind}`);
  }
  return wave * envelope * note.gain;
}

const note = (start, pitch, length, gain = 1, pan = 0) => ({start, pitch, length, gain, pan});
const cues = [
  {name: '01-crystal-revelation', duration: 1.45, kind: 'bell', notes: [
    note(0, 74, 1.05, .8, -.25), note(.09, 81, 1.05, .7, .2),
    note(.18, 86, 1.1, .85, 0), note(.19, 78, .95, .28, -.15),
  ]},
  {name: '02-golden-insight', duration: 1.1, kind: 'mallet', notes: [
    note(0, 67, .75, 1, -.2), note(.1, 71, .75, .85, 0),
    note(.21, 78, .8, .95, .2), note(.21, 59, .75, .32, -.1),
  ]},
  {name: '03-celestial-bloom', duration: 1.8, kind: 'pad', notes: [
    note(0, 62, 1.45, .65, -.25), note(.05, 69, 1.4, .48, .25),
    note(.12, 78, 1.35, .5, -.1), note(.24, 81, 1.3, .55, .1),
  ]},
  {name: '04-royal-flourish', duration: 1.3, kind: 'brass', notes: [
    note(0, 62, .25, .65, -.15), note(.13, 69, .25, .6, .15),
    note(.28, 74, .8, .75, 0), note(.28, 66, .8, .35, -.25),
    note(.28, 69, .8, .35, .25), note(.28, 50, .7, .23, 0),
  ]},
  {name: '05-neon-spark', duration: .95, kind: 'spark', notes: [
    note(0, 74, .42, .7, -.25), note(.055, 78, .42, .65, .25),
    note(.11, 81, .42, .65, -.15), note(.18, 88, .6, .8, .15),
    note(.18, 62, .55, .32, 0),
  ]},
];

await mkdir(output, {recursive: true});
for (const cue of cues) {
  const length = Math.ceil(cue.duration * rate);
  const left = new Float64Array(length), right = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / rate;
    for (const n of cue.notes) {
      const sample = voice(t, n, cue.kind);
      left[i] += sample * Math.cos((n.pan + 1) * Math.PI / 4);
      right[i] += sample * Math.sin((n.pan + 1) * Math.PI / 4);
    }
  }
  // Quiet cross-channel reflections provide a short, deterministic room tail.
  for (const [delay, gain] of [[.043, .14], [.079, .09], [.127, .045]]) {
    const offset = Math.round(delay * rate);
    for (let i = length - 1; i >= offset; i--) {
      const l = left[i - offset], r = right[i - offset];
      left[i] += r * gain;
      right[i] += l * gain;
    }
  }
  let peak = 0, energy = 0;
  for (let i = 0; i < length; i++) {
    // Fade both boundaries without cutting the tail.
    const fade = Math.min(1, i / (rate * .003), (length - 1 - i) / (rate * .06));
    for (const channel of [left, right]) {
      channel[i] *= fade;
      peak = Math.max(peak, Math.abs(channel[i]));
      energy += channel[i] ** 2;
    }
  }
  // Match approximate RMS for comparison, while retaining at least 3.7 dB headroom.
  const scale = Math.min(.12 / Math.sqrt(energy / (length * 2)), .65 / peak);
  const wav = Buffer.alloc(44 + length * 4);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(length * 4, 40);
  for (let i = 0; i < length; i++) {
    wav.writeInt16LE(Math.round(left[i] * scale * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(right[i] * scale * 32767), 46 + i * 4);
  }
  await writeFile(new URL(`${cue.name}.wav`, output), wav);
  console.log(`${cue.name}: ${cue.duration.toFixed(2)} s, peak ${(20 * Math.log10(peak * scale)).toFixed(1)} dBFS`);
}
