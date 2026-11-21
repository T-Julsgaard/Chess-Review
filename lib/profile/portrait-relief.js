// Continuous acceleration at both ends keeps the material from snapping into
// motion. Departure first reforms chess pieces, then carries them off the face.
export const silk = p => { p = Math.max(0, Math.min(1, p)); return p * p * p * (p * (p * 6 - 15) + 10); };
export const RELIEF_EXIT = {shrink: 900, overlap: 440, travel: 820, stagger: 140};
export function reliefExitState(item, ms) {
  const local = ms - item.start, unfold = silk(local / RELIEF_EXIT.shrink);
  const delay = item.morphFrom > .15 ? RELIEF_EXIT.overlap : 0;
  const p = Math.max(0, Math.min(1, (local - delay) / RELIEF_EXIT.travel)), move = silk(p);
  return {x: item.from.x + (item.to.x - item.from.x) * move, y: item.from.y + (item.to.y - item.from.y) * move,
    size: item.sizeFrom, morph: item.morphFrom * (1 - unfold), turn: (item.turnFrom || 0) * (1 - unfold),
    p, visible: true, moving: p < 1 || unfold < 1};
}
