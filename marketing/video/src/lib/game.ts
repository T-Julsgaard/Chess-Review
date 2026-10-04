// The hero game as the extension analysed it (public/captures/analysis.json, written by
// the capture). Evaluations are White-relative, in centipawns; mate maps like scoreToCp().
import analysis from '../../public/captures/analysis.json';

type Score = { cp?: number; mate?: number | null } | null;

const toCp = (s: Score) => {
  if (!s) return 0;
  if (s.mate != null) {
    const dist = Math.min(Math.abs(s.mate), 50);
    return s.mate > 0 ? 10000 - dist * 100 : -10000 + dist * 100;
  }
  return s.cp ?? 0;
};

export const evalsCp: number[] = (analysis.evals as Score[]).map(toCp);

// Plies 0–54 are moves 1–27 for both sides; 28.Qxd4 is ply 55 and 28...Qxg2# ply 56.
export const MISTAKE_PLY = 55;
export const MATE_PLY = 56;

// Largest swing either way before move 28, rounded up to a tenth of a pawn.
export const closeGameBound = Math.ceil(Math.max(...evalsCp.slice(0, MISTAKE_PLY).map(Math.abs)) / 10) / 10;
