// 10–17 s. The name, what it is, and the engine running in the review tab.
import React from 'react';
import { interpolate } from 'remotion';
import { Browser } from '../components/Browser';
import { Line, Mark, Mono, Ring, Shot, Wordmark, rise } from '../components/ui';
import { camAt, fit, inside, key } from '../lib/camera';
import { PAGE, stillLayout, stillSrc } from '../lib/captures';
import { word } from '../lib/narration';
import { C } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const L = stillLayout('loading');


export const BRAND = { out: 16.95 };

export const Brand: React.FC<{ t: number }> = ({ t }) => {
  const markIn = rise(t, 9.95, 0.7);
  const nameAt = word('intro', 'Chess').start;
  const blockOut = interpolate(t, [14.45, 14.95], [0, 1], clamp);
  const page = { x: 0, y: -40, w: PAGE.w, h: PAGE.h + 40 }; // with the title bar
  // The analysis in progress: the review line counting moves, the moves and accuracy filling in.
  const right = { x: L.review.x, y: L.review.y, w: L.stats.x + L.stats.w - L.review.x, h: L.stats.y + L.stats.h - L.review.y };
  const cam = camAt([
    key(14.5, { ...fit(page, 50), ay: 540 + 700 }),
    key(15.25, fit(page, 50)),
    key(16.4, inside(fit(right, 50))),
    key(17.4, { ...inside(fit(right, 50)), k: fit(right, 50).k * 0.9, ay: 540 - 900 }),
  ], t);
  const browserO = Math.min(interpolate(t, [14.5, 14.9], [0, 1], clamp), interpolate(t, [BRAND.out, BRAND.out + 0.35], [1, 0], clamp));
  const stock = word('intro', 'Stockfish');

  return (
    <>
      {/* Name and promise, centred. */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: 1 - blockOut, transform: `translateY(${-70 * blockOut}px)` }}>
        <div style={{ opacity: markIn, transform: `scale(${0.82 + 0.18 * markIn})` }}>
          <Mark size={168} />
        </div>
        <div style={{ height: 44 }} />
        <div style={{ opacity: rise(t, nameAt - 0.05, 0.5), transform: `translateY(${(1 - rise(t, nameAt - 0.05, 0.5)) * 18}px)` }}>
          <Wordmark size={56} />
        </div>
        <div style={{ height: 58 }} />
        <Line t={t} start={word('intro', 'Free').start} size={84} style={{ textAlign: 'center' }}>Free game review</Line>
        <Line t={t} start={word('intro', 'for').start} size={84} color={C.green} style={{ textAlign: 'center' }}>for Chess.com and Lichess</Line>
      </div>

      {/* The engine at work in the review tab. */}
      {t > 14.4 && (
        <>
          <Browser cam={cam} opacity={browserO}>
            <Shot src={stillSrc('loading')} cam={cam} />
          </Browser>
          <div style={{ position: 'absolute', inset: 0, opacity: browserO }}>
            <Ring cam={cam} rect={L.ipAnalyzing} t={t} start={15.35} end={BRAND.out} pad={10} radius={10} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center', opacity: browserO }}>
            <Mono t={t} start={stock.start} end={BRAND.out} size={26} color={C.ink2}
              style={{ background: 'rgba(20,19,15,0.86)', padding: '14px 26px', borderRadius: 12, border: `1.5px solid ${C.line}` }}>
              Stockfish 18 NNUE · runs locally, in your browser
            </Mono>
          </div>
        </>
      )}
    </>
  );
};
