// YouTube thumbnail, 1280×720: the review at the moment of the mistake, and the promise in
// three words that stay legible at 168×94.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Mark, Shot, Window, Wordmark } from './components/ui';
import type { Cam } from './lib/camera';
import { toScreen } from './lib/camera';
import { stillSrc, square, UI } from './lib/captures';
import { C, FONT } from './theme';

const SQ = UI.board.w / 8;
// Files c–h, ranks 1–6: the queen on d4 with its Mistake badge, the d1→g1 arrow, g2 and h1.
const BOX = { x: 610, y: 50, w: 620, h: 620 };
const cam: Cam = { x: UI.board.x + 5 * SQ, y: UI.board.y + 5 * SQ, k: BOX.w / (6 * SQ), ax: BOX.x + BOX.w / 2, ay: BOX.y + BOX.h / 2 };

export const Thumbnail: React.FC = () => {
  // The move's badge as the review draws it (Mistake colour, this move's score 2), enlarged at
  // d4's top-right corner. The icons/ SVGs show each class's reference number, not this move's.
  const d4 = square('d4');
  const badge = toScreen(cam, { x: d4.x + SQ * 0.4, y: d4.y - SQ * 0.4 });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(900px 700px at 70% 50%, rgba(127,180,95,0.16), rgba(127,180,95,0) 70%), ${C.bg}` }}>
      <Window box={BOX} radius={26}>
        <Shot src={stillSrc('review-55')} cam={cam} />
      </Window>
      <div style={{ position: 'absolute', left: badge.x - 52, top: badge.y - 52, width: 104, height: 104, borderRadius: '50%', background: C.mistake,
        display: 'grid', placeItems: 'center', color: '#fff', font: '700 50px Arial, Helvetica, sans-serif',
        boxShadow: '0 10px 22px rgba(0,0,0,0.5)' }}>2</div>

      <div style={{ position: 'absolute', left: 70, top: 92, display: 'flex', alignItems: 'center', gap: 20 }}>
        <Mark size={74} />
        <Wordmark size={30} />
      </div>
      <div style={{ position: 'absolute', left: 64, top: 222, fontFamily: FONT.sans, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.95 }}>
        <div style={{ fontSize: 168, color: C.green }}>Free</div>
        <div style={{ fontSize: 96, color: C.ink }}>game</div>
        <div style={{ fontSize: 96, color: C.ink }}>review</div>
      </div>
      <div style={{ position: 'absolute', left: 70, top: 600, fontFamily: FONT.mono, fontSize: 25, letterSpacing: '0.04em', color: C.ink2 }}>
        CHESS.COM · LICHESS
      </div>
    </AbsoluteFill>
  );
};
