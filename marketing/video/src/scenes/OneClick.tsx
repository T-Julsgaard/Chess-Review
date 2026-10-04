// 17–22.8 s. Where the review starts: the button on Chess.com and Lichess (the store
// screenshots), or a link or PGN pasted into the toolbar popup.
import React from 'react';
import { interpolate, staticFile } from 'remotion';
import { Line, Ring, Shot, Window, rise } from '../components/ui';
import type { Cam } from '../lib/camera';
import type { Rect } from '../lib/captures';
import { popupSize, popupSrc } from '../lib/captures';
import { word } from '../lib/narration';
import { C, FONT } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Store screenshots are 1280×800; the crop drops their own headline and keeps the
// browser picture with its enlarged button callout. The two sites sit side by side near the
// screenshots' own size, so they stay sharp and both are on screen for the whole sentence.
const STORE = { w: 1280, h: 800 };
const CROP: Rect = { x: 128, y: 222, w: 1134, h: 556 };
const WIN_W = 840, GAP = 64;
const WIN_H = (WIN_W * CROP.h) / CROP.w;
const BOX_CC: Rect = { x: (1920 - 2 * WIN_W - GAP) / 2, y: 580 - WIN_H / 2, w: WIN_W, h: WIN_H };
const BOX_LI: Rect = { ...BOX_CC, x: BOX_CC.x + WIN_W + GAP };
// The screenshots' enlarged "Analyze with Chess Review" callouts, measured on their green
// borders. The rings trace those borders, so each callout lights up as it is named.
const CALLOUT_CC: Rect = { x: 856, y: 679, w: 396, h: 84 };
const CALLOUT_LI: Rect = { x: 915, y: 682, w: 344, h: 82 };

const cropCam = (box: Rect): Cam => ({
  x: CROP.x + CROP.w / 2, y: CROP.y + CROP.h / 2, k: box.w / CROP.w, ax: box.x + box.w / 2, ay: box.y + box.h / 2,
});
const CAM_CC = cropCam(BOX_CC);
const CAM_LI = cropCam(BOX_LI);

const POP = popupSize('pasted');
const POP_BOX: Rect = { x: 1170, y: 140, w: (800 * POP.w) / POP.h, h: 800 };
const POP_INPUT: Rect = { x: 16, y: 297, w: 286, h: 128 };
const POP_BUTTON: Rect = { x: 16, y: 438, w: 286, h: 36 };

const Site: React.FC<{ box: Rect; children: React.ReactNode }> = ({ box, children }) => (
  <div style={{ position: 'absolute', left: box.x, top: box.y + box.h + 26, width: box.w, textAlign: 'center',
    fontFamily: FONT.sans, fontWeight: 700, fontSize: 32, letterSpacing: '-0.01em', color: C.ink2 }}>
    {children}
  </div>
);

export const ONECLICK = { in: 16.95, out: 22.65 };

export const OneClick: React.FC<{ t: number }> = ({ t }) => {
  const click = word('one-click', 'Analyze');
  const paste = word('one-click', 'paste');
  const pgn = word('one-click', 'PGN');
  const enter = rise(t, ONECLICK.in, 0.6);
  const leave = interpolate(t, [ONECLICK.out, ONECLICK.out + 0.35], [1, 0], clamp);
  // The two sites fade out before the popup fades in over the dark ground, and a slow
  // push-in keeps them alive while they hold.
  const stores = interpolate(t, [paste.start - 0.5, paste.start - 0.15], [1, 0], clamp);
  const push = interpolate(t, [ONECLICK.in, paste.start], [1, 1.03], clamp);
  const popIn = rise(t, paste.start - 0.3, 0.5);
  const popCam: Cam = { x: POP.w / 2, y: POP.h / 2, k: POP_BOX.h / POP.h, ax: POP_BOX.x + POP_BOX.w / 2, ay: POP_BOX.y + POP_BOX.h / 2 + (1 - popIn) * 30 };

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: leave }}>
      {stores > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: stores }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 92, display: 'flex', justifyContent: 'center' }}>
            <Line t={t} start={word('one-click', 'Finish').start} size={76} style={{ whiteSpace: 'nowrap' }}>
              One click, <span style={{ color: C.green }}>straight from your game</span>
            </Line>
          </div>
          <div style={{ position: 'absolute', inset: 0, opacity: enter, transformOrigin: `960px ${BOX_CC.y + WIN_H / 2}px`,
            transform: `translateY(${(1 - enter) * 24}px) scale(${push})` }}>
            <Window box={BOX_CC} radius={18}>
              <Shot src={staticFile('shared/store/chesscom-3x.png')} cam={CAM_CC} page={STORE} />
            </Window>
            <Window box={BOX_LI} radius={18}>
              <Shot src={staticFile('shared/store/lichess-3x.png')} cam={CAM_LI} page={STORE} />
            </Window>
            <Site box={BOX_CC}>Chess.com</Site>
            <Site box={BOX_LI}>Lichess</Site>
            <Ring cam={CAM_CC} rect={CALLOUT_CC} t={t} start={click.start - 0.1} pad={-1.5} radius={9} />
            <Ring cam={CAM_LI} rect={CALLOUT_LI} t={t} start={click.start + 0.35} pad={-1.5} radius={9} />
          </div>
        </div>
      )}

      {popIn > 0 && (
        <>
          <div style={{ position: 'absolute', left: 128, top: 330, width: 900 }}>
            <Line t={t} start={paste.start - 0.1} size={92}>Or paste a link</Line>
            <Line t={t} start={pgn.start - 0.35} size={92} color={C.green}>or a PGN.</Line>
          </div>
          <div style={{ position: 'absolute', inset: 0, opacity: popIn }}>
            <Window box={{ ...POP_BOX, y: POP_BOX.y + (1 - popIn) * 30 }} radius={20}>
              <Shot src={popupSrc('pasted')} cam={popCam} page={POP} />
            </Window>
            <Ring cam={popCam} rect={POP_INPUT} t={t} start={paste.start + 0.25} end={pgn.start} radius={14} />
            <Ring cam={popCam} rect={POP_BUTTON} t={t} start={pgn.start + 0.1} end={ONECLICK.out} radius={12} />
          </div>
        </>
      )}
    </div>
  );
};
