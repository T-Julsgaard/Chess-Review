// 17–22.8 s. Where the review starts: the button on Chess.com and Lichess (the store
// screenshots), or a link or PGN pasted into the toolbar popup.
import React from 'react';
import { interpolate, staticFile } from 'remotion';
import { Line, Ring, Shot, Window, rise } from '../components/ui';
import type { Cam } from '../lib/camera';
import { camAt, key } from '../lib/camera';
import type { Rect } from '../lib/captures';
import { popupSize, popupSrc } from '../lib/captures';
import { word } from '../lib/narration';
import { C } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Store screenshots are 1280×800; the crop drops their own headline and keeps the
// browser picture with its enlarged button callout.
const STORE = { w: 1280, h: 800 };
const CROP: Rect = { x: 128, y: 222, w: 1134, h: 556 };
const BOX: Rect = { x: (1920 - 1460) / 2, y: 262, w: 1460, h: (1460 * CROP.h) / CROP.w };
const BUTTON_CC: Rect = { x: 730, y: 588, w: 318, h: 38 }; // "Analyze with Chess Review" in the page
const BUTTON_LI: Rect = { x: 862, y: 575, w: 228, h: 32 };

const cropCam = (zoom = 1, focus = { x: CROP.x + CROP.w / 2, y: CROP.y + CROP.h / 2 }): Cam => ({
  x: focus.x, y: focus.y, k: (BOX.w / CROP.w) * zoom, ax: BOX.x + BOX.w / 2, ay: BOX.y + BOX.h / 2,
});

const POP = popupSize('pasted');
const POP_BOX: Rect = { x: 1170, y: 140, w: (800 * POP.w) / POP.h, h: 800 };
const POP_INPUT: Rect = { x: 16, y: 297, w: 286, h: 128 };
const POP_BUTTON: Rect = { x: 16, y: 438, w: 286, h: 36 };

export const ONECLICK = { in: 16.95, out: 22.65 };

export const OneClick: React.FC<{ t: number }> = ({ t }) => {
  const click = word('one-click', 'Analyze');
  const paste = word('one-click', 'paste');
  const pgn = word('one-click', 'PGN');
  const enter = rise(t, ONECLICK.in, 0.6);
  const leave = interpolate(t, [ONECLICK.out, ONECLICK.out + 0.35], [1, 0], clamp);

  // Chess.com: lean in towards the button as it is named, staying inside the 1280×800 picture.
  const ccFocus = { x: 787, y: 558 };
  const cc = camAt([key(click.start - 0.2, cropCam(1)), key(click.start + 0.7, cropCam(1.15, ccFocus)), key(19.4, cropCam(1.15, ccFocus))], t);
  const li = cropCam(1);
  const liIn = interpolate(t, [18.95, 19.4], [0, 1], clamp);
  // The store pictures step back first, so the popup fades in over the dark ground.
  const back = interpolate(t, [paste.start - 0.55, paste.start - 0.15], [0, 1], clamp);
  const popIn = rise(t, paste.start - 0.35, 0.5);
  const storeStyle = (slide: number): React.CSSProperties => ({
    position: 'absolute', inset: 0, transformOrigin: '30% 50%',
    transform: `translateX(${slide - 330 * back}px) scale(${1 - 0.22 * back})`, opacity: 1 - back,
  });
  const popCam: Cam = { x: POP.w / 2, y: POP.h / 2, k: POP_BOX.h / POP.h, ax: POP_BOX.x + POP_BOX.w / 2, ay: POP_BOX.y + POP_BOX.h / 2 + (1 - popIn) * 80 };

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: leave }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 92, display: 'flex', justifyContent: 'center', opacity: 1 - back }}>
        <Line t={t} start={word('one-click', 'Finish').start} size={76} style={{ whiteSpace: 'nowrap' }}>
          One click, <span style={{ color: C.green }}>straight from your game</span>
        </Line>
      </div>

      <div style={{ ...storeStyle(0), opacity: (1 - back) * enter * (1 - liIn * 0.6) }}>
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - enter) * 60}px)` }}>
          <Window box={BOX} radius={22}>
            <Shot src={staticFile('shared/store/chesscom.png')} cam={cc} page={STORE} />
          </Window>
          <Ring cam={cc} rect={BUTTON_CC} t={t} start={click.start} end={19.2} radius={10} />
        </div>
      </div>

      {liIn > 0 && (
        <div style={{ ...storeStyle((1 - liIn) * 1400), opacity: 1 - back }}>
          <Window box={BOX} radius={22}>
            <Shot src={staticFile('shared/store/lichess.png')} cam={li} page={STORE} />
          </Window>
          <Ring cam={li} rect={BUTTON_LI} t={t} start={19.3} end={paste.start - 0.3} radius={10} />
        </div>
      )}

      {popIn > 0 && (
        <>
          <div style={{ position: 'absolute', left: 128, top: 330, width: 900 }}>
            <Line t={t} start={paste.start - 0.1} size={92}>Or paste a link</Line>
            <Line t={t} start={pgn.start - 0.35} size={92} color={C.green}>or a PGN.</Line>
          </div>
          <div style={{ position: 'absolute', inset: 0, opacity: popIn }}>
            <Window box={{ ...POP_BOX, y: POP_BOX.y + (1 - popIn) * 80 }} radius={20}>
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
