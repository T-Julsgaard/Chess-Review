import {mkdir, writeFile} from 'node:fs/promises';

// Original, deterministic puzzle feedback cues. Run with node scripts/generate-incorrect-sounds.mjs.
// Mono 48 kHz PCM, with smooth attacks/releases and headroom for overlapping board sounds.
const sampleRate = 48000, output = new URL('../sounds/Wrong/', import.meta.url);
const tau = Math.PI * 2;
const sine = phase => Math.sin(tau * phase);
const envelope = (t, duration, decay = 7) => (1 - Math.exp(-t * 500)) * Math.exp(-t * decay) * Math.min(1, Math.max(0, (duration - t) / .04));
const cues = [
  ['soft-descent', .54, t => {
    // A mellow falling two-note tone, with a quieter octave for warmth.
    const note = (start, hz) => {
      const age = t - start;
      return age < 0 ? 0 : envelope(age, .54 - start, 9) * (sine(hz * age) + .18 * sine(2 * hz * age));
    };
    return note(0, 392) + .85 * note(.16, 293.665);
  }],
  ['retro-wobble', .46, t => {
    // A gently descending arcade voice; a small vibrato replaces a harsh square wave.
    const phase = 360 * t - 160 * t * t + .035 * sine(9 * t);
    return envelope(t, .46, 6) * (sine(phase) + .16 * sine(3 * phase));
  }],
  ['wooden-knock', .40, t => {
    // Two muted, inharmonic wooden taps, the second lower and softer.
    const tap = (start, hz) => {
      const age = t - start;
      return age < 0 ? 0 : envelope(age, .40 - start, 28) * (sine(hz * age) + .4 * sine(hz * 2.76 * age) + .14 * sine(hz * 5.4 * age));
    };
    return tap(0, 260) + .72 * tap(.14, 210);
  }],
];
await mkdir(output, {recursive: true});
for (const [name, duration, synth] of cues) {
  const samples = Float64Array.from({length: Math.ceil(duration * sampleRate)}, (_, i) => synth(i / sampleRate));
  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((value, i) => wav.writeInt16LE(Math.round(value / peak * .65 * 32767), 44 + i * 2));
  await writeFile(new URL(name + '.wav', output), wav);
  console.log(`Generated ${name}.wav (${duration.toFixed(2)}s)`);
}
