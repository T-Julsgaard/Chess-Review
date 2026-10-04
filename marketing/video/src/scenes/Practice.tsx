// 46–53.4 s. Practice mode: the real click on "Practice your mistakes", the replay back to
// move 28, and 28. Rg1 found on the board.
import React from 'react';
import { interpolate } from 'remotion';
import { Browser } from '../components/Browser';
import { Chip, Cursor, Ring, Shot } from '../components/ui';
import type { Cam } from '../lib/camera';
import { camAt, drift, fit, inside, key, toScreen } from '../lib/camera';
import { cursorAt, seqSrc, square, stillSrc } from '../lib/captures';
import { word } from '../lib/narration';
import { ACCURACY_END } from './Review';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const PRACTICE = { in: 45.95, out: 53.4 };
// The button is pressed on frame 46 — on "practice". Frame 220 on, the board takes moves;
// the rook is picked up on 280 and dropped on g1 on 330.
const P0 = word('practice', 'practice').start - 46 / 60;
const DROP = P0 + 330 / 60;
// Until frame 27 the pointer crosses the class rows and their tooltips; the capture is shown
// from there. The board resets on frame 370, so the found move is held from frame 360.
const FROM = 27, HOLD = 360;

const FULL: Cam = inside({ ...fit({ x: 300, y: 40, w: 1520, h: 960 }, 10), ax: 960, ay: 540 });
const DRAG: Cam = inside({ x: 790, y: 700, k: 1.9, ax: 960, ay: 540 });
// The review line in practice mode: the PRACTICE tag over "Qxd4 is a Mistake."
const PRACTICE_TAG = { x: 1206, y: 174, w: 190, h: 62 };

export const Practice: React.FC<{ t: number }> = ({ t }) => {
  const i = (t - P0) * 60;
  const cam = camAt([key(PRACTICE.in, ACCURACY_END), key(47.0, ACCURACY_END), key(47.85, FULL), key(49.3, FULL), key(50.15, DRAG),
    key(PRACTICE.out, drift(DRAG, 1.04))], t);
  const fromReview = interpolate(t, [P0 + FROM / 60, P0 + (FROM + 7) / 60], [0, 1], clamp);
  const cursorO = interpolate(t, [PRACTICE.in, PRACTICE.in + 0.15, P0 + 395 / 60, P0 + 410 / 60], [0, 1, 1, 0], clamp);
  const pressAge = i >= 46 && i < 120 ? (i - 46) / 60 : i >= 280 && i < 330 ? (i - 280) / 60 : null;
  const g1 = toScreen(cam, square('g1'));
  const g3 = toScreen(cam, square('g3')); // the chip sits on g3 and h3, clear of g1's badge and the f3 pawn
  const out = interpolate(t, [PRACTICE.out - 0.35, PRACTICE.out], [1, 0], clamp);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: out }}>
      <Browser cam={cam}>
        {fromReview < 1 && <Shot src={stillSrc('review-55')} cam={cam} />}
        <Shot src={seqSrc('practice', Math.min(Math.max(FROM, i), HOLD))} cam={cam} opacity={fromReview} />
      </Browser>
      <Cursor cam={cam} at={cursorAt('practice', i)} pressAge={pressAge} opacity={cursorO} />
      <Ring cam={cam} rect={PRACTICE_TAG} t={t} start={word('practice', 'Chess').start - 0.1} end={49.5} radius={12} />
      <Chip x={g1.x + 50} y={g3.y} anchor="center" t={t} start={DROP + 0.1} end={PRACTICE.out}>
        ✓ Correct · 28. Rg1
      </Chip>
    </div>
  );
};

// For the soundtrack.
export const PRACTICE_CLICK = P0 + 46 / 60;
export const PRACTICE_PICK = P0 + 280 / 60;
export const PRACTICE_DROP = DROP;
