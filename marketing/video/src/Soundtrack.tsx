// Voice, music and the extension's own piece sounds. Levels are set so the bed sits about
// 13 LU under the voice while it speaks; tools/render.mjs normalises the mix to −14 LUFS.
import React from 'react';
import { Audio, interpolate, Sequence, staticFile } from 'remotion';
import { FPS, MUSIC_OFFSET, cues, voiceChunks } from './lib/narration';
import { HOOK } from './scenes/Hook';
import { PRACTICE_CLICK, PRACTICE_DROP } from './scenes/Practice';
import { REVIEW_SOUNDS } from './scenes/Review';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const db = (d: number) => Math.pow(10, d / 20);

// Spans where the voice speaks. Pauses under 1.5 s are merged: in a shorter one the music only
// jumps up for a moment and is pushed down again, which sounds like it was cut off.
const speech = cues.reduce<[number, number][]>((acc, c) => {
  const last = acc[acc.length - 1];
  if (last && c.start - last[1] < 1.5) last[1] = c.end;
  else acc.push([c.start, c.end]);
  return acc;
}, []);
function ducking(t: number) {
  let d = 0;
  for (const [a, b] of speech) d = Math.max(d, interpolate(t, [a - 0.35, a - 0.1, b + 0.15, b + 0.65], [0, 1, 1, 0], clamp));
  return d;
}

// The track (from MUSIC_OFFSET) is a quiet intro (−26 LUFS) until the beat lands at 23.475 s
// in the video (measured in 5 ms steps), then a groove at about −15 LUFS, fading out by itself
// from 65 s. The gain drops in the last 30 ms before the beat, so the intro is not cut short.
const DROP = 23.475;
export function musicGain(t: number) {
  const base = interpolate(t, [DROP - 0.03, DROP, 63.6, 64.6], [-6, -17, -17, -13], clamp);
  const fadeOut = interpolate(t, [67.6, 69.0], [1, 0], clamp);
  return db(base - 7 * ducking(t)) * fadeOut;
}

// [time the sound should hit, file, gain]. The files peak about 85 ms after they start.
const PEAK = 0.085;
const take = staticFile('audio/narration-take.mp3');
const sfx = (n: number) => staticFile(`shared/sfx/chess_sound_0${n}.wav`);

// `stem` renders one part alone (the narration deliverable, level checks).
export type Stem = 'voice' | 'music' | 'sfx';
export const Soundtrack: React.FC<{ stem?: Stem }> = ({ stem }) => {
  const on = (s: Stem) => !stem || stem === s;
  const hits: [number, number, number][] = [
    [HOOK.qxd4 + HOOK.land, 2, 0.55],
    [HOOK.qxg2 + HOOK.land, 4, 0.65],
    [HOOK.rewind + 0.0, 5, 0.25], [HOOK.rewind + 0.13, 5, 0.25], [HOOK.rewind + 0.26, 5, 0.25],
    ...REVIEW_SOUNDS,
    [PRACTICE_CLICK, 8, 0.32],
    [PRACTICE_DROP, 4, 0.55],
  ];
  return (
    <>
      {on('voice') && voiceChunks.map((c) => {
        const len = Math.round((c.out - c.in) * FPS);
        return (
          <Sequence key={c.id} from={Math.round(c.at * FPS)} durationInFrames={len} name={`voice ${c.id}`}>
            <Audio src={take} trimBefore={Math.round(c.in * FPS)}
              volume={(f) => interpolate(f, [0, 2, len - 2, len], [0, 1, 1, 0], clamp)} />
          </Sequence>
        );
      })}
      {on('music') && <Audio src={staticFile('audio/music.mp3')} trimBefore={Math.round(MUSIC_OFFSET * FPS)} name="music"
        volume={(f) => musicGain(f / FPS)} />}
      {on('sfx') && hits.map(([at, n, gain], i) => (
        <Sequence key={i} from={Math.max(0, Math.round((at - PEAK) * FPS))} durationInFrames={Math.round(0.7 * FPS)} name={`sfx ${n}`}>
          <Audio src={sfx(n)} volume={gain} />
        </Sequence>
      ))}
    </>
  );
};

