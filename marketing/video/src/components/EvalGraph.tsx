import React from 'react';
import { evalsCp } from '../lib/game';
import { C } from '../theme';

// The review screen's evaluation graph ("area" style), redrawn as a crisp vector from the
// engine's own numbers: white advantage up, clamped at ±5 pawns like the app.
export const EvalGraph: React.FC<{ width: number; height: number; upto: number; marks?: { ply: number; color: string }[]; stroke?: number }> = ({
  width, height, upto, marks = [], stroke = 3,
}) => {
  const total = evalsCp.length - 1;
  const mid = height / 2;
  const toX = (p: number) => (p / total) * width;
  const toY = (cp: number) => mid - (Math.max(-500, Math.min(500, cp)) / 500) * (mid - 8);
  const last = Math.max(0, Math.min(total, upto));
  const pts: [number, number][] = [];
  for (let p = 0; p <= Math.floor(last); p++) pts.push([toX(p), toY(evalsCp[p])]);
  // Partial segment toward the next ply, so the line draws smoothly.
  const f = last - Math.floor(last);
  if (f > 0 && Math.floor(last) < total) {
    const a = evalsCp[Math.floor(last)], b = evalsCp[Math.floor(last) + 1];
    pts.push([toX(last), toY(a + (b - a) * f)]);
  }
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fill = pts.length ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${mid} L0,${mid} Z` : '';
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
      <rect x={0} y={0} width={width} height={mid} fill={C.accent} opacity={0.08} />
      {fill && <path d={fill} fill={C.accent} opacity={0.22} />}
      <line x1={0} y1={mid} x2={width} y2={mid} stroke={C.line} strokeWidth={1.5} strokeDasharray="5 5" />
      {line && <path d={line} fill="none" stroke={C.accent} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />}
      {marks.filter((m) => m.ply <= last).map((m) => (
        <circle key={m.ply} cx={toX(m.ply)} cy={toY(evalsCp[m.ply])} r={stroke * 2.4} fill={m.color} stroke={C.bg} strokeWidth={stroke * 0.9} />
      ))}
    </svg>
  );
};
