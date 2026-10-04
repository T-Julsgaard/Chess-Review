// 57.4 s to the end: what it costs and where the data goes, then where to get it.
import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import { Line, Mark, Mono, Wordmark, rise } from '../components/ui';
import { word } from '../lib/narration';
import { C, FONT } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const TRUST = { in: 57.35, out: 60.75 };

export const Trust: React.FC<{ t: number }> = ({ t }) => {
  const out = interpolate(t, [TRUST.out - 0.3, TRUST.out], [1, 0], clamp);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: out }}>
      <div style={{ position: 'absolute', left: 170, top: 250 }}>
        <Line t={t} start={word('trust', 'No').start - 0.05} size={124}>No account.</Line>
        <Line t={t} start={word('trust', 'No', 1).start - 0.05} size={124}>No subscription.</Line>
        <Line t={t} start={word('trust', 'Open').start - 0.05} size={124} color={C.green}>Open source.</Line>
      </div>
      <div style={{ position: 'absolute', left: 174, top: 760 }}>
        <Mono t={t} start={word('trust', 'Open').start + 0.2} size={26} color={C.ink2}>
          Analysis runs on your device · Nothing is sent to the developer · GPL-3.0
        </Mono>
      </div>
    </div>
  );
};

// The five Chrome Web Store screenshots, as they appear on the listing.
const STORE = ['review', 'chesscom', 'lichess', 'accuracy', 'coaches'];

export const END = { in: 60.6 };

export const EndCard: React.FC<{ t: number; duration: number }> = ({ t, duration }) => {
  const markIn = rise(t, END.in, 0.6);
  const name = word('cta', 'Chess').start;
  const free = word('cta', 'Free').start;
  const fade = interpolate(t, [duration - 0.8, duration], [1, 0], clamp);
  const W = 296, GAP = 22, H = (W * 800) / 1280;
  const rowW = STORE.length * W + (STORE.length - 1) * GAP;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fade, transform: `scale(${interpolate(t, [END.in, duration], [1, 1.025], clamp)})` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 34, opacity: markIn, transform: `translateY(${(1 - markIn) * 24}px)` }}>
          <Mark size={118} />
          <div style={{ opacity: rise(t, name - 0.1, 0.5) }}>
            <Wordmark size={64} />
          </div>
        </div>
        <div style={{ height: 54 }} />
        <Line t={t} start={free - 0.1} size={84} style={{ textAlign: 'center' }}>
          Free on the <span style={{ color: C.green }}>Chrome Web Store</span>
        </Line>
        <div style={{ height: 26 }} />
        <Mono t={t} start={free + 0.6} size={26} color={C.ink2} style={{ textTransform: 'none', letterSpacing: '0.02em' }}>
          Source: github.com/T-Julsgaard/Chess-Review
        </Mono>
      </div>

      <div style={{ position: 'absolute', left: (1920 - rowW) / 2, top: 700, display: 'flex', gap: GAP }}>
        {STORE.map((s, i) => {
          const p = rise(t, free + 0.3 + i * 0.09, 0.6);
          return (
            <div key={s} style={{ width: W, height: H, borderRadius: 12, overflow: 'hidden', opacity: p * 0.95,
              transform: `translateY(${(1 - p) * 40}px)`, boxShadow: `0 0 0 1.5px ${C.line}, 0 30px 60px -30px rgba(0,0,0,0.9)` }}>
              <Img src={staticFile(`shared/store/${s}.png`)} style={{ width: W, height: H }} />
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 52, textAlign: 'center', opacity: rise(t, free + 1.0, 0.6),
        fontFamily: FONT.sans, fontSize: 21, color: C.ink3 }}>
        Independent project · Not affiliated with, endorsed by, or sponsored by Chess.com or Lichess
      </div>
    </div>
  );
};
