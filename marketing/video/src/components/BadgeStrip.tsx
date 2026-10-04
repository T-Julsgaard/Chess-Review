import React from 'react';
import { Img, staticFile } from 'remotion';
import { rise } from './ui';
import { C, FONT } from '../theme';

// The ten move classes in the review's order, with the extension's own badge artwork.
const BADGES: [string, string][] = [
  ['brilliant', 'Brilliant'], ['great', 'Great'], ['best', 'Best'], ['excellent', 'Excellent'], ['good', 'Good'],
  ['book', 'Book'], ['inaccuracy', 'Inaccuracy'], ['mistake', 'Mistake'], ['miss', 'Miss'], ['blunder', 'Blunder'],
];

export const BadgeStrip: React.FC<{ t: number; from: number; to: number; size?: number }> = ({ t, from, to, size = 72 }) => (
  <div style={{ display: 'flex', gap: size * 0.42, alignItems: 'flex-start' }}>
    {BADGES.map(([id, name], i) => {
      const at = from + ((to - from) * i) / (BADGES.length - 1);
      const p = rise(t, at, 0.45);
      return (
        <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: size * 1.28,
          opacity: p, transform: `translateY(${(1 - p) * 22}px) scale(${0.85 + 0.15 * p})` }}>
          <Img src={staticFile(`shared/badges/${id}.svg`)} style={{ width: size, height: size, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' }} />
          <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: size * 0.27, color: C.ink2, whiteSpace: 'nowrap' }}>{name}</div>
        </div>
      );
    })}
  </div>
);
