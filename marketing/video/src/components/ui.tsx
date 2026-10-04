import React from 'react';
import { Easing, Img, interpolate, staticFile } from 'remotion';
import type { Cam } from '../lib/camera';
import { rectToScreen, toScreen } from '../lib/camera';
import type { Pt, Rect } from '../lib/captures';
import { PAGE } from '../lib/captures';
import { C, FONT } from '../theme';

const out = Easing.bezier(0.16, 1, 0.3, 1);

// 0 → 1 over `dur` seconds from `start` (eased), for entrances.
export const rise = (t: number, start: number, dur = 0.5) =>
  interpolate(t, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: out });

// Opacity of something on screen from `a` to `b` with fades at both ends.
// `b` may be Infinity for something that stays.
export const span = (t: number, a: number, b: number, fade = 0.3, fadeOut = fade) => {
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const fin = interpolate(t, [a - fade, a], [0, 1], clamp);
  return Number.isFinite(b) ? Math.min(fin, interpolate(t, [b, b + fadeOut], [1, 0], clamp)) : fin;
};

// A capture placed by a camera. `origin`/`page` describe the page area the image covers.
export const Shot: React.FC<{ src: string; cam: Cam; page?: { w: number; h: number }; origin?: Pt; opacity?: number }> = ({
  src, cam, page = PAGE, origin = { x: 0, y: 0 }, opacity = 1,
}) => {
  const p = toScreen(cam, origin);
  return (
    <Img
      src={src}
      style={{ position: 'absolute', left: p.x, top: p.y, width: page.w * cam.k, height: page.h * cam.k, opacity, maxWidth: 'none' }}
    />
  );
};

// A rounded window on screen (`box`, screen pixels); children draw in screen space and
// are clipped to it. Use rectToScreen(cam, rect) for a window that moves with the camera.
export const Window: React.FC<{ box: Rect; radius?: number; children: React.ReactNode; opacity?: number; style?: React.CSSProperties }> = ({
  box, radius = 18, children, opacity = 1, style,
}) => (
  <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: radius, overflow: 'hidden', opacity,
    boxShadow: '0 0 0 1.5px rgba(255,255,255,0.08), 0 50px 110px -40px rgba(0,0,0,0.9)', ...style }}>
    <div style={{ position: 'absolute', left: -box.x, top: -box.y, width: 1920, height: 1080 }}>{children}</div>
  </div>
);

// The real pointer, drawn where the captured mouse was. A ring marks a press.
export const Cursor: React.FC<{ cam: Cam; at: { x: number; y: number; down: boolean } | null; pressAge?: number | null; opacity?: number }> = ({
  cam, at, pressAge = null, opacity = 1,
}) => {
  if (!at) return null;
  const p = toScreen(cam, at);
  const s = 30 * Math.min(1.45, Math.max(1, cam.k / 1.04)) * (at.down ? 0.92 : 1);
  const ring = pressAge != null && pressAge < 0.45 ? pressAge / 0.45 : null;
  return (
    <>
      {ring != null && (
        <div style={{ position: 'absolute', left: p.x - 30 * (0.4 + ring), top: p.y - 30 * (0.4 + ring), width: 60 * (0.4 + ring), height: 60 * (0.4 + ring),
          borderRadius: '50%', border: `3px solid ${C.green}`, opacity: (1 - ring) * 0.9 * opacity }} />
      )}
      <svg width={s} height={s * 1.3} viewBox="0 0 20 26" style={{ position: 'absolute', left: p.x - s * 0.05, top: p.y - s * 0.03, opacity,
        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))' }}>
        <path d="M1.5 1.5 L1.5 20.5 L6.4 15.9 L9.9 23.6 L13.3 22.1 L9.9 14.6 L16.6 14.6 Z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </>
  );
};

// Highlight ring around a page rectangle, drawn in over ~0.5 s.
export const Ring: React.FC<{ cam: Cam; rect: Rect; t: number; start: number; end?: number; color?: string; pad?: number; radius?: number; round?: boolean }> = ({
  cam, rect, t, start, end = Infinity, color = C.green, pad = 8, radius = 14, round = false,
}) => {
  const p = rise(t, start, 0.55);
  const o = span(t, start + 0.15, end, 0.15, 0.3);
  if (o <= 0) return null;
  const r = rectToScreen(cam, rect);
  const x = r.x - pad, y = r.y - pad, w = r.w + 2 * pad, h = r.h + 2 * pad;
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: o, overflow: 'visible' }}>
      {round
        ? <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="none" stroke={color} strokeWidth={4} pathLength={1}
            strokeDasharray={`${p} 1`} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
        : <rect x={x} y={y} width={w} height={h} rx={radius} fill="none" stroke={color} strokeWidth={4} pathLength={1}
            strokeDasharray={`${p} 1`} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />}
    </svg>
  );
};

// Small label pill, placed in screen pixels.
export const Chip: React.FC<{ x: number; y: number; t: number; start: number; end?: number; color?: string; children: React.ReactNode; anchor?: 'left' | 'center' | 'right' }> = ({
  x, y, t, start, end = Infinity, color = C.green, children, anchor = 'left',
}) => {
  const o = span(t, start, end, 0.25) * rise(t, start, 0.4);
  if (o <= 0) return null;
  const shift = anchor === 'center' ? '-50%' : anchor === 'right' ? '-100%' : '0';
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(${shift}, ${(1 - rise(t, start, 0.4)) * 12}px)`, opacity: o,
      padding: '12px 22px', borderRadius: 999, background: 'rgba(20,19,15,0.88)', border: `2px solid ${color}`, color: C.ink,
      fontFamily: FONT.sans, fontWeight: 700, fontSize: 34, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
      boxShadow: '0 18px 40px -18px rgba(0,0,0,0.9)' }}>
      {children}
    </div>
  );
};

// Headline line with the store screenshots' two-tone style.
export const Line: React.FC<{ t: number; start: number; end?: number; size?: number; color?: string; weight?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  t, start, end = Infinity, size = 84, color = C.ink, weight = 800, children, style,
}) => {
  const p = rise(t, start, 0.55);
  const o = Math.min(p, span(t, start, end, 0.3));
  // Always laid out (opacity 0 when hidden) so lines below never jump.
  return (
    <div style={{ fontFamily: FONT.sans, fontWeight: weight, fontSize: size, lineHeight: 1.04, letterSpacing: '-0.035em', color,
      opacity: o, transform: `translateY(${(1 - p) * 26}px)`, ...style }}>
      {children}
    </div>
  );
};

export const Mono: React.FC<{ t: number; start: number; end?: number; size?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  t, start, end = Infinity, size = 24, color = C.ink3, children, style,
}) => {
  const o = Math.min(rise(t, start, 0.45), span(t, start, end, 0.3));
  return (
    <div style={{ fontFamily: FONT.mono, fontSize: size, letterSpacing: '0.06em', textTransform: 'uppercase', color, opacity: o, ...style }}>
      {children}
    </div>
  );
};

// The brand mark: green rounded square with the Cburnett knight, as in the popup header.
export const Mark: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.286, background: `linear-gradient(160deg, ${C.accent}, ${C.accentStrong})`,
    display: 'grid', placeItems: 'center', boxShadow: `inset 0 ${size * 0.02}px 0 rgba(255,255,255,0.25), 0 ${size * 0.25}px ${size * 0.6}px -${size * 0.3}px ${C.accent}` }}>
    <Img src={staticFile('shared/pieces/wN.svg')} style={{ width: size * 0.72, height: size * 0.72 }} />
  </div>
);

export const Wordmark: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ fontFamily: FONT.sans, fontWeight: 800, fontSize: size, letterSpacing: '0.14em', color: C.ink, whiteSpace: 'nowrap' }}>
    CHESS <span style={{ color: C.ink3, fontWeight: 600 }}>/ REVIEW</span>
  </div>
);

// Darkens the left side so text can sit over the UI.
export const Scrim: React.FC<{ opacity?: number; width?: number }> = ({ opacity = 1, width = 1100 }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width, height: 1080, opacity,
    background: `linear-gradient(90deg, rgba(20,19,15,0.96) 0%, rgba(20,19,15,0.9) 55%, rgba(20,19,15,0) 100%)` }} />
);
