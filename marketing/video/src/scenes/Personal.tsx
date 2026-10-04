// 53.4–57.4 s. Ten coaches, then the board and pieces you like.
import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import { Line, Shot, Window, rise } from '../components/ui';
import type { Cam } from '../lib/camera';
import { stillSrc, UI } from '../lib/captures';
import { word } from '../lib/narration';
import { C, FONT } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Portraits rendered from the coaches' own rigs (capture-ui.mjs), with the app's names.
const COACHES: [string, string][] = [
  ['old_soviet', 'Old Soviet'], ['professor', 'Professor'], ['hustler', 'Hustler'], ['wise_grandma', 'Wise Grandma'],
  ['drunk_uncle', 'Drunk Uncle'], ['conspiracy_theorist', 'Conspiracy Theorist'], ['kid_prodigy', 'Kid Prodigy'],
  ['mentor', 'Ralph'], ['life_coach', 'Julie'], ['nature_documentarian', 'Nature Documentarian'],
];
// Board themes and piece sets as the settings name them.
const THEMES: [string, string][] = [
  ['theme-green-image', 'Meadow'], ['theme-ocean-merida', 'Harbor · Merida'], ['theme-ink-image', 'Graphite'],
  ['theme-coral-merida', 'Terracotta · Merida'], ['theme-lavender-image', 'Lavender'],
];

export const PERSONAL = { in: 53.35, swap: 55.15, out: 57.35 };

export const Personal: React.FC<{ t: number }> = ({ t }) => {
  const coachesOut = interpolate(t, [PERSONAL.swap - 0.1, PERSONAL.swap + 0.2], [0, 1], clamp);
  const out = interpolate(t, [PERSONAL.out - 0.3, PERSONAL.out], [1, 0], clamp);
  const ten = word('personal', '10').start;
  const boardAt = word('personal', 'board').start;

  const CARD = 150, GAP = 18;
  const rowW = COACHES.length * CARD + (COACHES.length - 1) * GAP;
  const SIZE = 300, TGAP = 28;
  const themesW = THEMES.length * SIZE + (THEMES.length - 1) * TGAP;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: out }}>
      {/* Coaches */}
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - coachesOut, transform: `translateY(${-50 * coachesOut}px)` }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 310, display: 'flex', justifyContent: 'center' }}>
          <Line t={t} start={word('personal', 'Choose').start - 0.1} size={84}>
            Choose from <span style={{ color: C.green }}>10 coaches.</span>
          </Line>
        </div>
        <div style={{ position: 'absolute', left: (1920 - rowW) / 2, top: 500, display: 'flex', gap: GAP }}>
          {COACHES.map(([id, name], i) => {
            const p = rise(t, ten - 0.25 + i * 0.06, 0.5);
            return (
              <div key={id} style={{ width: CARD, opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
                <div style={{ width: CARD, height: 176, borderRadius: 18, overflow: 'hidden', position: 'relative',
                  background: `linear-gradient(180deg, ${C.panel2}, ${C.panel})`, boxShadow: `0 0 0 1.5px ${C.line}` }}>
                  <Img src={staticFile(`captures/coaches/${id}.png`)} style={{ position: 'absolute', left: -CARD * 0.09, bottom: 0, width: CARD * 1.18 }} />
                </div>
                <div style={{ marginTop: 14, fontFamily: FONT.sans, fontWeight: 600, fontSize: 18, lineHeight: 1.2, color: C.ink2, textAlign: 'center' }}>
                  {name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Board themes and piece sets, on the same position. */}
      {t > PERSONAL.swap - 0.1 && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 262, display: 'flex', justifyContent: 'center' }}>
            <Line t={t} start={PERSONAL.swap + 0.15} size={84}>
              Your board. <span style={{ color: C.green }}>Your pieces.</span>
            </Line>
          </div>
          {THEMES.map(([still, name], i) => {
            const p = rise(t, boardAt - 0.2 + i * 0.12, 0.55);
            const box = { x: (1920 - themesW) / 2 + i * (SIZE + TGAP), y: 450 + (1 - p) * 50, w: SIZE, h: SIZE };
            const cam: Cam = { x: UI.board.x + UI.board.w / 2, y: UI.board.y + UI.board.h / 2, k: SIZE / UI.board.w, ax: box.x + SIZE / 2, ay: box.y + SIZE / 2 };
            return (
              <div key={still} style={{ opacity: p }}>
                <Window box={box} radius={16}>
                  <Shot src={stillSrc(still)} cam={cam} />
                </Window>
                <div style={{ position: 'absolute', left: box.x, top: box.y + SIZE + 22, width: SIZE, textAlign: 'center',
                  fontFamily: FONT.sans, fontWeight: 600, fontSize: 22, color: C.ink2 }}>
                  {name}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
