// 22.8–46 s. The review: every move classified, the graph leading to move 28, the mistake
// and the move that held, an idea of your own rated, and the accuracy panel.
import React from 'react';
import { interpolate } from 'remotion';
import { BadgeStrip } from '../components/BadgeStrip';
import { Browser } from '../components/Browser';
import { Chip, Cursor, Line, Mono, Ring, Shot } from '../components/ui';
import type { Cam } from '../lib/camera';
import { camAt, drift, fit, inside, key, rectToScreen, toScreen } from '../lib/camera';
import { PAGE, cursorAt, seqSrc, square, squareRect, stillLayout, stillSrc, union, UI } from '../lib/captures';
import { word } from '../lib/narration';
import { C } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const R = stillLayout('review-55');
const view = (x: number, y: number, k: number): Cam => inside({ x, y, k, ax: 960, ay: 540 });

// The whole window under a headline, then close-ups no larger than the capture's own
// resolution (2.08 screen pixels per page pixel) except the small accuracy text.
const OVERVIEW = fit({ x: 0, y: -40, w: PAGE.w, h: PAGE.h + 40 }, 24, { x: 0, y: 215, w: 1920, h: 865 });
const GRAPH = inside(fit(UI.graph, 40, { x: 0, y: 0, w: 1920, h: 1080 }, 2.2));
const MISTAKE = view(1222, 410, 1.54); // d4 on the board plus the review line and the move list
const ARROW = view(801, 730, 2.08); // ranks 1–4: the d1→g1 arrow, the queen on d4
const IDEA = view(1000, 668, 1.95); // g5 down to h1: the h3 pawn, the g5→g2 reply, the move list
const ACCURACY = view(1429, 491, 2.3);
// Practice continues from where the accuracy close-up has drifted to.
export const ACCURACY_END = drift(ACCURACY, 1.04);

export const REVIEW = { in: 22.75, out: 45.95 };
// graph-jump: the press is frame 56 and the board jumps on release, frame 61 — on "turned".
const G0 = word('classified', 'turned').start + 0.09 - 61 / 60;
// alt-h3: the pawn is dropped on frame 70 and rated on frame 71 — on "rated".
const A0 = word('own-idea', 'rated').start - 70 / 60;

// [time, piece sound, gain] for the soundtrack: the click on the graph, the pawn dropped on h3.
export const REVIEW_SOUNDS: [number, number, number][] = [[G0 + 56 / 60, 8, 0.32], [A0 + 70 / 60, 4, 0.5]];

// What the window shows: [from time, image], crossfading 0.25 s into each next entry.
function sources(t: number): [number, string][] {
  return [
    [-Infinity, seqSrc('graph-jump', Math.max(0, (t - G0) * 60))],
    [28.85, stillSrc('review-55')],
    [36.2, seqSrc('alt-h3', Math.max(0, (t - A0) * 60))],
    [40.9, stillSrc('review-55')],
  ];
}

export const Review: React.FC<{ t: number }> = ({ t }) => {
  const cam = camAt([
    key(REVIEW.in, { ...OVERVIEW, k: OVERVIEW.k * 0.97, ay: OVERVIEW.ay + 45 }), key(23.35, OVERVIEW),
    key(26.55, { ...OVERVIEW, k: OVERVIEW.k * 1.03 }), key(27.3, GRAPH), key(28.35, drift(GRAPH, 1.02)),
    key(29.15, MISTAKE), key(32.85, drift(MISTAKE)),
    key(33.6, ARROW), key(36.05, drift(ARROW)),
    key(36.8, IDEA), key(40.85, drift(IDEA)),
    key(41.6, ACCURACY), key(REVIEW.out, ACCURACY_END),
  ], t);

  // Current and incoming image.
  const list = sources(t);
  let i = 0;
  while (i + 1 < list.length && t >= list[i + 1][0]) i++;
  const base = list[Math.max(0, i - 1)][1];
  const top = list[i][1];
  const fade = i === 0 ? 1 : interpolate(t, [list[i][0], list[i][0] + 0.25], [0, 1], clamp);

  const gi = (t - G0) * 60;
  const ai = (t - A0) * 60;
  const gCursor = interpolate(t, [G0 - 0.25, G0, 28.45, 28.75], [0, 1, 1, 0], clamp);
  const aCursor = interpolate(t, [A0 - 0.25, A0, 39.0, 39.3], [0, 1, 1, 0], clamp);
  const enter = interpolate(t, [REVIEW.in, REVIEW.in + 0.4], [0, 1], clamp);

  const w = (id: Parameters<typeof word>[0], text: string) => word(id, text).start;
  const g1 = toScreen(cam, square('g1'));
  const g2 = toScreen(cam, square('g2'));
  const acc = rectToScreen(cam, R.accuracy);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: enter }}>
      <Browser cam={cam}>
        {fade < 1 && i > 0 && <Shot src={base} cam={cam} />}
        <Shot src={top} cam={cam} opacity={fade} />
      </Browser>

      {/* Classification: the headline, then the ten classes from Brilliant to Blunder, held
          until the camera moves to the graph. */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 84, display: 'flex', justifyContent: 'center' }}>
        <Line t={t} start={w('classified', 'Every')} end={w('classified', 'from') - 0.25} size={76}>
          Every move, <span style={{ color: C.green }}>classified.</span>
        </Line>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', justifyContent: 'center',
        opacity: interpolate(t, [26.6, 26.9], [1, 0], clamp) }}>
        <BadgeStrip t={t} from={w('classified', 'from') - 0.1} to={w('classified', 'Blunder')} size={66} />
      </div>

      {/* The graph: the real pointer goes to the cliff and clicks. */}
      <Cursor cam={cam} at={cursorAt('graph-jump', gi)} pressAge={gi >= 56 ? (gi - 56) / 60 : null} opacity={gCursor} />

      {/* Move 28. Qxd4 — a mistake. */}
      <Ring cam={cam} rect={R.currentMove} t={t} start={w('mistake', '28')} end={32.85} color={C.mistake} pad={5} radius={8} />
      <Ring cam={cam} rect={squareRect('d4')} t={t} start={w('mistake', 'd4') - 0.1} end={32.85} color={C.mistake} pad={-4} round />
      <Ring cam={cam} rect={R.ipText} t={t} start={w('mistake', 'mistake') - 0.15} end={32.85} color={C.mistake} pad={9} radius={10} />

      {/* The arrow: what held. */}
      <Ring cam={cam} rect={union(squareRect('d1'), squareRect('g1'))} t={t} start={w('arrow', 'arrow') - 0.1} end={36.05} pad={-2} radius={70} />
      <Chip x={g1.x} y={g1.y - 150 * cam.k / 2.08} anchor="center" t={t} start={w('arrow', 'Rook') - 0.05} end={36.05}>
        Better · 28. Rg1
      </Chip>

      {/* Your own idea, rated: 28. h3 is still mate. */}
      <Cursor cam={cam} at={cursorAt('alt-h3', ai)} pressAge={ai >= 40 && ai < 70 ? (ai - 40) / 60 : null} opacity={aCursor} />
      <Ring cam={cam} rect={squareRect('h3')} t={t} start={w('still-mate', 'h3') - 0.1} end={40.85} color={C.mistake} pad={-4} round />
      <Ring cam={cam} rect={union(squareRect('g5'), squareRect('g2'))} t={t} start={w('still-mate', 'Still') - 0.1} end={40.85} color={C.blunder} pad={-2} radius={70} />
      <Chip x={g2.x - 120 * cam.k / 2.08} y={g2.y + 10} anchor="right" color={C.blunder} t={t} start={w('still-mate', 'Still')} end={40.85}>
        Qxg2# · still mate
      </Chip>

      {/* Accuracy for both players and an estimated performance rating. */}
      <Ring cam={cam} rect={R.accVals[0]} t={t} start={w('accuracy', 'accuracy') - 0.1} end={REVIEW.out} pad={8} radius={10} />
      <Ring cam={cam} rect={R.accVals[1]} t={t} start={w('accuracy', 'both') - 0.1} end={REVIEW.out} pad={8} radius={10} color={C.ink2} />
      <Ring cam={cam} rect={R.estRatings[0]} t={t} start={w('accuracy', 'estimated') - 0.1} end={REVIEW.out} pad={7} radius={8} />
      <Ring cam={cam} rect={R.estRatings[1]} t={t} start={w('accuracy', 'estimated') + 0.1} end={REVIEW.out} pad={7} radius={8} color={C.ink2} />
      {/* In the panel's foot, above where YouTube draws captions. */}
      <div style={{ position: 'absolute', left: acc.x + 16, top: acc.y + acc.h - 16, width: acc.w - 32, transform: 'translateY(-100%)' }}>
        <Mono t={t} start={w('accuracy', 'both')} end={REVIEW.out} size={20} color={C.ink2}
          style={{ background: 'rgba(20,19,15,0.92)', padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${C.line}`, lineHeight: 1.45 }}>
          Estimates from Chess Review's own scoring.<br />Other tools can differ.
        </Mono>
      </div>
    </div>
  );
};
