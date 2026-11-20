// Connected, nested pieces of light. These outlines are the portrait itself:
// each island becomes one chess piece's destination, never a picture or mask.
export const SCULPT = {levels: 7, floor: .13, minArea: 3.5, samples: 640, morph: 1180, spread: 820};

const area = ring => ring.reduce((sum, p, i) => {
  const q = ring[(i + 1) % ring.length];
  return sum + p.x * q.y - q.x * p.y;
}, 0) / 2;

/** Trace the outside and holes of a binary pixel surface. Coordinates are in pixels. */
export function traceContours(mask, n) {
  const edges = new Map(), key = (x, y) => y * (n + 1) + x;
  const edge = (x, y, dx, dy) => {
    const a = key(x, y), b = key(x + dx, y + dy);
    if (!edges.has(a)) edges.set(a, []);
    edges.get(a).push(b);
  };
  const on = (x, y) => x >= 0 && x < n && y >= 0 && y < n && mask[y * n + x];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (on(x, y)) {
    if (!on(x, y - 1)) edge(x, y, 1, 0);
    if (!on(x + 1, y)) edge(x + 1, y, 0, 1);
    if (!on(x, y + 1)) edge(x + 1, y + 1, -1, 0);
    if (!on(x - 1, y)) edge(x, y + 1, 0, -1);
  }
  const rings = [];
  while (edges.size) {
    const first = edges.keys().next().value, ring = [];
    let current = first;
    do {
      ring.push({x: current % (n + 1), y: Math.floor(current / (n + 1))});
      const next = edges.get(current);
      if (!next?.length) break;
      const previous = current;
      current = next.pop();
      if (!next.length) edges.delete(previous);
    } while (current !== first);
    if (ring.length >= 4) rings.push({points: ring, area: area(ring)});
  }
  return rings;
}

/** Round pixel corners, then sample equal distances around a closed outline. */
export function sampleContour(points, count) {
  for (let pass = 0; pass < 2; pass++) points = points.flatMap((p, i) => {
    const q = points[(i + 1) % points.length];
    return [{x: p.x * .75 + q.x * .25, y: p.y * .75 + q.y * .25}, {x: p.x * .25 + q.x * .75, y: p.y * .25 + q.y * .75}];
  });
  // A consistent seam lets a chess silhouette unfold without twisting itself.
  let top = 0;
  points.forEach((p, i) => { if (p.y < points[top].y || (p.y === points[top].y && p.x < points[top].x)) top = i; });
  points = [...points.slice(top), ...points.slice(0, top)];
  const lengths = points.map((p, i) => Math.hypot(p.x - points[(i + 1) % points.length].x, p.y - points[(i + 1) % points.length].y));
  const step = lengths.reduce((sum, d) => sum + d, 0) / count, result = [];
  let edge = 0, passed = 0;
  for (let i = 0; i < count; i++) {
    const distance = i * step;
    while (edge < lengths.length - 1 && passed + lengths[edge] < distance) passed += lengths[edge++];
    const p = points[edge], q = points[(edge + 1) % points.length], t = lengths[edge] ? (distance - passed) / lengths[edge] : 0;
    result.push({x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t});
  }
  return result;
}

const inside = (point, ring) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
};

/** Seven flat tones, each made only of connected shapes with genuine empty holes. */
export function portraitContours(tones, n, {levels = SCULPT.levels, minArea = SCULPT.minArea, minShapes = 0} = {}) {
  if (!tones || tones.length !== n * n) return [];
  const shapes = [];
  // A small local filter keeps fine facial features but removes isolated pixels.
  const filtered = Float32Array.from(tones, (t, i) => {
    const x = i % n, y = Math.floor(i / n);
    let sum = t * 4, weight = 4;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < n && yy >= 0 && yy < n) { sum += tones[yy * n + xx]; weight++; }
    }
    return sum / weight;
  });
  // Interpolate before tracing, rather than smoothing a staircase afterwards.
  // The tiny bundled tone map then yields continuous, finely curved material.
  const scale = 3, grid = n * scale, surface = new Float32Array(grid * grid);
  const at = (x, y) => filtered[Math.max(0, Math.min(n - 1, y)) * n + Math.max(0, Math.min(n - 1, x))];
  for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
    const xx = (x + .5) / scale - .5, yy = (y + .5) / scale - .5, x0 = Math.floor(xx), y0 = Math.floor(yy), dx = xx - x0, dy = yy - y0;
    surface[y * grid + x] = (at(x0, y0) * (1 - dx) + at(x0 + 1, y0) * dx) * (1 - dy)
      + (at(x0, y0 + 1) * (1 - dx) + at(x0 + 1, y0 + 1) * dx) * dy;
  }
  for (let level = 0; level < levels; level++) {
    const threshold = SCULPT.floor + level * (.9 - SCULPT.floor) / (levels - 1);
    const rings = traceContours(surface.map(t => t >= threshold ? 1 : 0), grid);
    const islands = rings.filter(r => r.area >= minArea * scale * scale), holes = rings.filter(r => r.area <= -minArea * scale * scale);
    for (const island of islands) {
      const contours = [island, ...holes.filter(h => inside(h.points[0], island.points))];
      const outer = island.points, x = outer.reduce((s, p) => s + p.x, 0) / outer.length, y = outer.reduce((s, p) => s + p.y, 0) / outer.length;
      shapes.push({level, tone: (level + 1) / levels, area: island.area / (scale * scale), x: x / grid * 8, y: y / grid * 8,
        rings: contours.map(r => sampleContour(r.points, Math.min(SCULPT.samples, Math.max(48, r.points.length))).map(p => ({x: p.x / grid * 8, y: p.y / grid * 8}))),
      });
    }
  }
  // An unusually smooth photograph can have fewer islands than the position
  // has pieces. Divide the broadest forms so every board piece contributes.
  while (shapes.length && shapes.length < minShapes) {
    const largest = shapes.reduce((a, b) => a.area > b.area ? a : b);
    const points = largest.rings[0], xs = points.map(p => p.x), ys = points.map(p => p.y);
    const axis = Math.max(...xs) - Math.min(...xs) > Math.max(...ys) - Math.min(...ys) ? 'x' : 'y';
    const values = points.map(p => p[axis]), cut = (Math.min(...values) + Math.max(...values)) / 2;
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
      area: Math.abs(area(rings[0])) * n * n / 64,
      x: rings[0].reduce((s, p) => s + p.x, 0) / rings[0].length,
      y: rings[0].reduce((s, p) => s + p.y, 0) / rings[0].length,
    })));
  }
  return shapes.sort((a, b) => a.level - b.level || b.area - a.area);
}
