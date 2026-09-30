// tactics-gen.js — Generate puzzles from blunders/mistakes
// Pure functions, no DOM dependencies — fully testable.

import { Chess } from "./lib/chess.js";

const BLUNDER_THRESHOLD = 300;   // cp drop to consider a blunder
const MISTAKE_THRESHOLD = 100;   // cp drop to consider a mistake

/**
 * Extract tactical puzzles from a fully analyzed game.
 * @param {Object} game - { positions[], evals[], bests[], classif[], pgn, meta }
 * @returns {Array} puzzles — each: { fen, solution, theme, rating, meta }
 */
export function generatePuzzles(game) {
  const { positions, evals, bests, classif, pgn, meta } = game;
  const puzzles = [];

  for (let i = 1; i <= positions.length; i++) {
    const cls = classif[i];
    if (!cls) continue;

    const isBlunder = cls === "blunder";
    const isMistake = cls === "mistake";
    if (!isBlunder && !isMistake) continue;

    const pos = positions[i];
    const beforeEval = evals[i - 1];
    const afterEval = evals[i];
    if (!beforeEval || !afterEval) continue;

    const cpBefore = scoreToCp(beforeEval);
    const cpAfter = scoreToCp(afterEval);
    const drop = Math.abs(cpBefore - cpAfter);
    const threshold = isBlunder ? BLUNDER_THRESHOLD : MISTAKE_THRESHOLD;
    if (drop < threshold) continue;

    const best = bests[i - 1];
    if (!best || !best.bestmove) continue;

    const solution = [best.bestmove];
    if (best.lines && best.lines.length > 1) {
      // Include alternative lines as "try" moves for richer puzzles
      for (let l = 1; l < Math.min(3, best.lines.length); l++) {
        const alt = best.lines[l].pv?.split(" ")[0];
        if (alt && alt !== best.bestmove) solution.push(alt);
      }
    }

    const theme = inferTheme(pos.fen, best.bestmove, best.lines);
    const rating = estimatePuzzleRating(drop, isBlunder);

    puzzles.push({
      fen: pos.fen,
      solution,
      theme,
      rating,
      meta: {
        ply: i,
        move: pos.san,
        classification: cls,
        evalDrop: drop,
        playerColor: pos.color,
        gameDate: meta?.date || "",
        opening: meta?.opening?.name || "",
        eco: meta?.opening?.eco || "",
        pgn,
      },
    });
  }

  return puzzles;
}

function scoreToCp(score) {
  if (!score) return 0;
  if (score.mate != null) return score.mate > 0 ? 10000 : -10000;
  return score.cp || 0;
}

function inferTheme(fen, bestmove, lines) {
  const c = new Chess(fen);
  const mv = c.move({ from: bestmove.slice(0, 2), to: bestmove.slice(2, 4), promotion: bestmove.slice(4, 5) || undefined });
  if (!mv) return "tactics";

  const isCapture = mv.captured || mv.flags.includes("e");
  const isCheck = c.in_check();
  const isMate = c.in_checkmate();
  const piece = mv.piece;
  const san = mv.san;

  // Sacrifice detection: best move is not the top engine line by material
  let isSac = false;
  if (lines && lines.length >= 2) {
    const topScore = scoreToCp(lines[0].score);
    const altScore = scoreToCp(lines[1].score);
    if (topScore - altScore > 200) isSac = true; // significant eval gap suggests sac
  }

  if (isMate) return "mate";
  if (isCheck && isCapture) return "check-capture";
  if (isCheck) return "check";
  if (isCapture && piece === "p") return "pawn-capture";
  if (isCapture) return "capture";
  if (isSac) return "sacrifice";
  if (san.includes("=")) return "promotion";
  if (san.startsWith("O-O")) return "castling";

  return "tactics";
}

function estimatePuzzleRating(drop, isBlunder) {
  // Rough mapping: larger drop = easier puzzle (more obvious)
  // Blunders tend to be simpler tactics; mistakes more subtle
  const base = isBlunder ? 1200 : 1500;
  const adjust = Math.min(600, Math.max(-400, (drop - 300) * 0.8));
  return Math.round(base - adjust);
}

/**
 * Convert puzzles to PGN format for export/import.
 * @param {Array} puzzles
 * @returns {String} PGN with each puzzle as a game
 */
export function puzzlesToPgn(puzzles) {
  return puzzles.map((p, i) => {
    const c = new Chess(p.fen);
    const moves = p.solution.map((uci, idx) => {
      const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
      return mv ? mv.san : uci;
    }).join(" ");

    return `[Event "Chess Review Puzzle"]
[Site "Chess-Review"]
[Date "${new Date().toISOString().slice(0, 10)}"]
[Round "${i + 1}"]
[White "To Move"]
[Black "Opponent"]
[Result "*"]
[Theme "${p.theme}"]
[Rating "${p.rating}"]
[FEN "${p.fen}"]

${moves} *`;
  }).join("\n\n");
}

/**
 * Filter puzzles by theme(s).
 */
export function filterPuzzlesByTheme(puzzles, themes) {
  if (!themes?.length) return puzzles;
  const themeSet = new Set(themes);
  return puzzles.filter(p => themeSet.has(p.theme));
}

/**
 * Filter puzzles by rating range.
 */
export function filterPuzzlesByRating(puzzles, min, max) {
  return puzzles.filter(p => p.rating >= min && p.rating <= max);
}