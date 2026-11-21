// A complete material portrait: disjoint pieces own the highlights, shadows
// and background. There is no backing image, reveal mask or painted plate.
import {traceContours, sampleContour} from './portrait-contours.js';

// The join allowance is in board squares, so it follows the material's scale.
export const INLAY = {levels: 7, budget: 64, maxArea: .13, seam: .016};
export const RELIEF = {levels: 12, budget: 144, scale: 2, selfWeight: 12, samples: 2560, seam: .012};
const signedArea = ring => ring.reduce((sum, p, i) => {
  const q = ring[(i + 1) % ring.length];
  return sum + p.x * q.y - q.x * p.y;
}, 0) / 2;
const inside = (point, ring) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
};

/** Quantize and merge adjacent, low-contrast slivers. Every pixel keeps an
 * owner; small regions are absorbed into another piece rather than erased. */
function materialRegions(tones, n, levels, budget, scale = 3, selfWeight = 4) {
  const grid = n * scale, count = grid * grid;
  const source = Float32Array.from(tones, (t, i) => {
    const x = i % n, y = Math.floor(i / n);
    let sum = t * selfWeight, weight = selfWeight;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const a = x + dx, b = y + dy;
      if (a >= 0 && a < n && b >= 0 && b < n) { sum += tones[b * n + a]; weight++; }
    }
    return sum / weight;
  });
  const at = (x, y) => source[Math.max(0, Math.min(n - 1, y)) * n + Math.max(0, Math.min(n - 1, x))];
  const labels = new Uint8Array(count), owners = new Int32Array(count).fill(-1);
  for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
    const xx = (x + .5) / scale - .5, yy = (y + .5) / scale - .5, x0 = Math.floor(xx), y0 = Math.floor(yy), dx = xx - x0, dy = yy - y0;
    const tone = (at(x0, y0) * (1 - dx) + at(x0 + 1, y0) * dx) * (1 - dy)
      + (at(x0, y0 + 1) * (1 - dx) + at(x0 + 1, y0 + 1) * dx) * dy;
    labels[y * grid + x] = Math.min(levels - 1, Math.floor(Math.max(0, tone) * levels));
  }
  const regions = [];
  const neighbors = (pixel, visit) => {
    if (pixel % grid) visit(pixel - 1);
    if (pixel % grid < grid - 1) visit(pixel + 1);
    if (pixel >= grid) visit(pixel - grid);
    if (pixel < count - grid) visit(pixel + grid);
  };
  for (let pixel = 0; pixel < count; pixel++) {
    if (owners[pixel] >= 0) continue;
    const id = regions.length, level = labels[pixel], pixels = [pixel];
    owners[pixel] = id;
    for (let head = 0; head < pixels.length; head++) neighbors(pixels[head], next => {
      if (owners[next] < 0 && labels[next] === level) { owners[next] = id; pixels.push(next); }
    });
    regions.push({id, level, pixels, adjacent: new Map(), active: true});
  }
  for (let p = 0; p < count; p++) neighbors(p, q => {
    const a = owners[p], b = owners[q];
    if (a !== b) { const map = regions[a].adjacent; map.set(b, (map.get(b) || 0) + 1); }
  });
  let remaining = regions.length;
  while (remaining > budget) {
    let chosen = null, importance = Infinity;
    for (const r of regions) if (r.active && r.adjacent.size) {
      const contrast = Math.min(...[...r.adjacent.keys()].map(id => Math.abs(r.level - regions[id].level)));
      const value = r.pixels.length * (1 + contrast * 3);
      if (value < importance) { chosen = r; importance = value; }
    }
    if (!chosen) break;
    const targetId = [...chosen.adjacent.keys()].sort((a, b) =>
      Math.abs(chosen.level - regions[a].level) - Math.abs(chosen.level - regions[b].level)
      || chosen.adjacent.get(b) - chosen.adjacent.get(a) || a - b)[0];
    const target = regions[targetId];
    for (const p of chosen.pixels) { owners[p] = targetId; target.pixels.push(p); }
    for (const [id, border] of chosen.adjacent) {
      const neighbor = regions[id]; neighbor.adjacent.delete(chosen.id);
      if (id === targetId) continue;
      neighbor.adjacent.set(targetId, (neighbor.adjacent.get(targetId) || 0) + border);
      target.adjacent.set(id, (target.adjacent.get(id) || 0) + border);
    }
    target.adjacent.delete(chosen.id); chosen.active = false; remaining--;
  }
  for (const r of regions) if (r.active) for (const p of r.pixels) labels[p] = r.level;
  return {labels, grid};
}

/** Fitted, opaque regions cover the entire square. Broad negative spaces are
 * split too, so several real pieces visibly construct the background. */
export function inlayContours(tones, n, {minShapes = 0, budget = INLAY.budget, levels = INLAY.levels, scale = 3, selfWeight = 4, samples = 2560} = {}) {
  if (!tones || tones.length !== n * n) return [];
  const {labels, grid} = materialRegions(tones, n, levels, Math.max(budget, minShapes), scale, selfWeight);
  const shapes = [];
  for (let level = 0; level < levels; level++) {
    const rings = traceContours(labels.map(l => l === level ? 1 : 0), grid);
    const islands = rings.filter(r => r.area > 0).sort((a, b) => a.area - b.area);
    const holes = new Map(islands.map(r => [r, []]));
    for (const hole of rings.filter(r => r.area < 0)) {
      const owner = islands.find(r => inside(hole.points[0], r.points));
      if (owner) holes.get(owner).push(hole);
    }
    for (const island of islands) {
      const contours = [island, ...holes.get(island)];
      const points = island.points, area = contours.reduce((sum, r) => sum + r.area, 0) / grid ** 2 * 64;
      shapes.push({level, tone: level / (levels - 1), area,
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length / grid * 8,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length / grid * 8,
        rings: contours.map(r => sampleContour(r.points, Math.min(samples, Math.max(48, r.points.length * 2))).map(p => ({x: p.x / grid * 8, y: p.y / grid * 8}))),
      });
    }
  }
  while (shapes.length) {
    const largest = shapes.reduce((a, b) => a.area > b.area ? a : b);
    if (shapes.length >= minShapes && largest.area <= 64 * INLAY.maxArea) break;
    const valuesX = largest.rings[0].map(p => p.x), valuesY = largest.rings[0].map(p => p.y);
    const axis = Math.max(...valuesX) - Math.min(...valuesX) > Math.max(...valuesY) - Math.min(...valuesY) ? 'x' : 'y';
    const values = largest.rings[0].map(p => p[axis]), cut = (Math.min(...values) + Math.max(...values)) / 2;
    const clip = (ring, side) => {
      const out = [];
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i], q = ring[(i + 1) % ring.length], a = (p[axis] - cut) * side >= 0, b = (q[axis] - cut) * side >= 0;
        if (a) out.push(p);
        if (a !== b) { const t = (cut - p[axis]) / (q[axis] - p[axis]); out.push({x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t}); }
      }
      return out;
    };
    const halves = [-1, 1].map(side => largest.rings.map(r => clip(r, side)).filter(r => r.length >= 3));
    if (halves.some(r => !r.length)) break;
    shapes.splice(shapes.indexOf(largest), 1, ...halves.map(rings => ({...largest, rings,
      area: Math.abs(rings.reduce((sum, r) => sum + signedArea(r), 0)),
      x: rings[0].reduce((sum, p) => sum + p.x, 0) / rings[0].length,
      y: rings[0].reduce((sum, p) => sum + p.y, 0) / rings[0].length,
    })));
  }
  return shapes.sort((a, b) => a.level - b.level || b.area - a.area);
}
