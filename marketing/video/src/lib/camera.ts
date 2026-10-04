// A camera looks at page coordinates: point (x, y) lands on screen point (ax, ay), and
// k screen pixels show one page pixel. Keys are eased; zoom moves in log space.
import { Easing } from 'remotion';
import type { Pt, Rect } from './captures';
import { PAGE } from './captures';
import { H, W } from '../theme';

export type Cam = { x: number; y: number; k: number; ax: number; ay: number };
export type Key = Cam & { t: number };

const ease = Easing.bezier(0.65, 0, 0.35, 1);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export function camAt(keys: Key[], t: number): Cam {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) {
      const p = ease((t - a.t) / Math.max(1e-6, b.t - a.t));
      // Interpolate what is on screen (the page point under the screen centre) so a
      // zoom and a pan together travel in a straight line instead of swinging.
      const k = Math.exp(lerp(Math.log(a.k), Math.log(b.k), p));
      const ax = lerp(a.ax, b.ax, p), ay = lerp(a.ay, b.ay, p);
      const ca = { x: a.x + (W / 2 - a.ax) / a.k, y: a.y + (H / 2 - a.ay) / a.k };
      const cb = { x: b.x + (W / 2 - b.ax) / b.k, y: b.y + (H / 2 - b.ay) / b.k };
      const cx = lerp(ca.x, cb.x, p), cy = lerp(ca.y, cb.y, p);
      return { x: cx - (W / 2 - ax) / k, y: cy - (H / 2 - ay) / k, k, ax, ay };
    }
  }
  return keys[keys.length - 1];
}

// Camera that fits `r` (plus padding) inside a screen area, centred there.
export function fit(r: Rect, pad = 40, area: Rect = { x: 0, y: 0, w: W, h: H }, maxK = 2.6): Cam {
  const k = Math.min(area.w / (r.w + 2 * pad), area.h / (r.h + 2 * pad), maxK);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2, k, ax: area.x + area.w / 2, ay: area.y + area.h / 2 };
}

export const key = (t: number, c: Cam): Key => ({ ...c, t });

// The same view, slightly closer: a slow push-in keeps a held shot alive.
export const drift = (c: Cam, s = 1.035): Cam => inside({ ...c, k: c.k * s });

export const toScreen = (c: Cam, p: Pt): Pt => ({ x: c.ax + (p.x - c.x) * c.k, y: c.ay + (p.y - c.y) * c.k });
export const rectToScreen = (c: Cam, r: Rect): Rect => {
  const p = toScreen(c, r);
  return { x: p.x, y: p.y, w: r.w * c.k, h: r.h * c.k };
};

// Keeps a camera's view inside an area of the page (default: the page's left/right edges),
// so a close-up near an edge never shows past the window.
export function inside(c: Cam, area: Rect = { x: 0, y: -Infinity, w: PAGE.w, h: Infinity }): Cam {
  const hw = (W / 2) / c.k, hh = (H / 2) / c.k;
  const cx = c.x + (W / 2 - c.ax) / c.k, cy = c.y + (H / 2 - c.ay) / c.k; // page point at screen centre
  const nx = Math.min(Math.max(cx, area.x + hw), area.x + area.w - hw);
  const ny = Number.isFinite(area.h) ? Math.min(Math.max(cy, area.y + hh), area.y + area.h - hh) : cy;
  return { ...c, x: c.x + (nx - cx), y: c.y + (ny - cy) };
}
