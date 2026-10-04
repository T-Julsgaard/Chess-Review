// 0–10 s. A close game flies past, one pawn grab loses it on the spot, and the board
// rewinds to the question the rest of the video answers.
import React from 'react';
import { Easing, interpolate } from 'remotion';
import { EvalGraph } from '../components/EvalGraph';
import { Line, Mono, Ring, Shot, Window, span } from '../components/ui';
import type { Cam } from '../lib/camera';
import { camAt, key } from '../lib/camera';
import { seqClip, seqSrc, squareRect, UI } from '../lib/captures';
import { closeGameBound, MISTAKE_PLY } from '../lib/game';
import { word } from '../lib/narration';
import { C } from '../theme';

const clip = seqClip('hook-replay')!;
const CLIP = { x: clip.x, y: clip.y, w: clip.width, h: clip.height };
// The board column sits on the right; the words on the left.
const BOX = { x: 952, y: 70, w: (940 * CLIP.w) / CLIP.h, h: 940 };
const K0: Cam = { x: CLIP.x + CLIP.w / 2, y: CLIP.y + CLIP.h / 2, k: BOX.h / CLIP.h, ax: BOX.x + BOX.w / 2, ay: BOX.y + BOX.h / 2 };
// Closer on where the game ends (d4, g2, h1): files c–h, down to the board's bottom edge,
// so no half-cut name strip shows.
const K1_W = (6 * UI.board.w) / 8;
const K1_K = BOX.w / K1_W;
const K1: Cam = { ...K0, k: K1_K, x: UI.board.x + UI.board.w - K1_W / 2, y: UI.board.y + UI.board.h - BOX.h / K1_K / 2 };

// When the two captured moves land (the slide takes 20 frames after the key press at frame 2).
export const HOOK = {
  replay: [0.6, 3.9] as const,
  qxd4: 5.1, // frame 0 of hook-qxd4
  qxg2: 6.2, // frame 0 of hook-qxg2
  land: 22 / 60,
  rewind: 7.2,
  out: 9.45,
};

const inOut = Easing.inOut(Easing.quad);
function replayPly(t: number) {
  const [a, b] = HOOK.replay;
  return 54 * inOut(Math.max(0, Math.min(1, (t - a) / (b - a))));
}

// The board image and the graph's last drawn ply at time t.
function boardAt(t: number): { src: string; full: boolean; ply: number } {
  if (t < HOOK.qxd4) return { src: seqSrc('hook-replay', Math.floor(replayPly(t))), full: false, ply: replayPly(t) };
  if (t < HOOK.qxg2) {
    const i = (t - HOOK.qxd4) * 60;
    return { src: seqSrc('hook-qxd4', i), full: true, ply: 54 + interpolate(i, [12, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
  }
  if (t < HOOK.rewind) {
    const i = (t - HOOK.qxg2) * 60;
    return { src: seqSrc('hook-qxg2', i), full: true, ply: 55 + interpolate(i, [12, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
  }
  // Rewind: back through the last two moves to move 28.
  const step = Math.min(2, Math.floor((t - HOOK.rewind) / 0.13));
  return { src: seqSrc('hook-replay', 56 - step), full: false, ply: 56 - interpolate(t, [HOOK.rewind, HOOK.rewind + 0.3], [0, 2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
}

export const Hook: React.FC<{ t: number }> = ({ t }) => {
  const landD4 = HOOK.qxd4 + HOOK.land;
  const landG2 = HOOK.qxg2 + HOOK.land;
  const cam = camAt([key(0, { ...K0, k: K0.k * 0.97 }), key(3.9, K0), key(4.9, K0), key(5.45, K1), key(6.95, K1), key(7.5, K0),
    key(9.3, { ...K0, k: K0.k * 1.03 }), key(10.1, { ...K0, k: K0.k * 0.9 })], t);
  const board = boardAt(t);
  const out = interpolate(t, [HOOK.out, HOOK.out + 0.55], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const box = { x: BOX.x, y: BOX.y, w: BOX.w, h: BOX.h };

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: out }}>
      <Window box={box}>
        {board.full
          ? <Shot src={board.src} cam={cam} />
          : <Shot src={board.src} cam={cam} page={{ w: CLIP.w, h: CLIP.h }} origin={{ x: CLIP.x, y: CLIP.y }} />}
        <Ring cam={cam} rect={squareRect('d4')} t={t} start={landD4 + 0.05} end={HOOK.rewind - 0.25} color={C.mistake} pad={-4} round />
        <Ring cam={cam} rect={squareRect('h1')} t={t} start={landG2 + 0.05} end={HOOK.rewind - 0.1} color={C.blunder} pad={-4} round />
      </Window>

      <div style={{ position: 'absolute', left: 128, top: 268, width: 790 }}>
        <div style={{ position: 'relative', height: 200 }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Line t={t} start={word('close-game', '27').start} end={3.75} size={92}>27 moves.</Line>
            <Line t={t} start={word('close-game', 'A').start} end={3.75} size={92} color={C.green}>A close game.</Line>
          </div>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Line t={t} start={word('pawn-grab', 'Then').start} end={HOOK.rewind - 0.2} size={92}>One pawn grab…</Line>
            <Line t={t} start={word('pawn-grab', 'and').start} end={HOOK.rewind - 0.2} size={92}>
              …and it's <span style={{ color: C.blunder }}>mate.</span>
            </Line>
          </div>
          <div style={{ position: 'absolute', inset: 0 }}>
            <Line t={t} start={word('question', 'So').start + 0.1} size={92}>What should you</Line>
            <Line t={t} start={word('question', 'should').start} size={92} color={C.green}>have played?</Line>
          </div>
        </div>

        <div style={{ marginTop: 150, opacity: span(t, 1.2, HOOK.out, 0.4) }}>
          <Mono t={t} start={1.2} size={22} style={{ marginBottom: 18 }}>
            Engine eval · within ±{closeGameBound.toFixed(1)} for 27 moves
          </Mono>
          <EvalGraph width={700} height={170} upto={board.ply} marks={[{ ply: MISTAKE_PLY, color: C.mistake }]} />
          <div style={{ height: 0, position: 'relative' }}>
            <Mono t={t} start={landD4 + 0.25} end={HOOK.rewind - 0.2} size={22} color={C.blunder}
              style={{ position: 'absolute', right: 130, top: -48 }}>
              Mate in 1
            </Mono>
          </div>
        </div>
      </div>
    </div>
  );
};
