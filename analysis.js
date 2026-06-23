// analysis.js — Chess Review analysis page (vanilla port of "Design 2.0").
// Parses the PGN, runs Stockfish through the game and fills every panel with real
// data: eval bar/graph, accuracy, mistake classification, engine lines (MultiPV),
// opening (from the PGN), player/clock/result. Board + 6 piece styles + theme are selectable.

import { Chess } from "./lib/chess.js";
import { Engine } from "./engine/uci.js";
import { flagCodeForCountryId, countryNameForId } from "./flags.js";

/* ---------------- Opening book ----------------
 * Offline lookup table built from lichess-org/chess-openings (see data/build-book.mjs).
 * Key = "epd" (the first 4 FEN fields: board, side, castling, en passant) → either
 * [eco, name] for a named theory position or 0 for "known, but unnamed".
 * Used for true book detection and opening naming in computeDerived(). */
let BOOK = null;
function epdOf(fen) { return fen.split(" ").slice(0, 4).join(" "); }
/** Look up a position in the book. Returns [eco, name] | 0 | undefined (not in book). */
function bookLookup(fen) { return BOOK ? BOOK[epdOf(fen)] : undefined; }
async function loadBook() {
  if (BOOK) return BOOK;
  try {
    const res = await fetch(chrome.runtime.getURL("data/book.json"));
    BOOK = (await res.json()).epd || {};
  } catch {
    BOOK = {}; // book missing/unreadable → fall back to pure engine classification
  }
  return BOOK;
}

/* ---------------- Calibration (tuned scoring params) ----------------
 * data/calibration.json, produced by tools/dataset/export-calibration.mjs (the big-compute tuner).
 * When present with display:"winpct", the SHOWN accuracy switches from the crude category-average
 * to the tuned win%-based accuracy method. Absent/invalid → the add-on
 * keeps its original behaviour, so this is always safe. */
let CALIB = null;
async function loadCalibration() {
  if (CALIB) return CALIB;
  try { CALIB = await (await fetch(chrome.runtime.getURL("data/calibration.json"))).json(); }
  catch { CALIB = {}; }
  return CALIB;
}
function calWinK() { return CALIB?.winK ?? 0.00368208; }
function calMoveAcc() { return CALIB?.moveAcc ?? { a: 103.1668, b: 0.04354, c: 3.1669 }; }
// Rating-dependent multiplier on the accuracy drop (default 1 = no-op). Mirrors score-core.
function calAccMult(rating) {
  const ar = CALIB?.accRating; if (!ar?.on) return 1;
  const r = Number(rating); if (!Number.isFinite(r) || r <= 0) return 1;
  return Math.max(ar.min, Math.min(ar.max, 1 + (ar.center - r) * ar.slope));
}
// Per-rating-band additive correction on the DISPLAYED accuracy (mirrors score-core applyAccBias).
// Removes the structured residual tilt vs the reference values (we under-rate ~1200-1600, over-rate 1600+).
// Applied to S.acc only — the Elo path (S.accElo / sideAccuracies) is intentionally untouched.
function calAccBias(acc, rating) {
  const ab = CALIB?.accBias; if (acc == null || !ab?.on) return acc;
  const r = Number(rating); if (!Number.isFinite(r) || r <= 0) return acc;
  let idx = ab.edges.length; for (let i = 0; i < ab.edges.length; i++) if (r < ab.edges[i]) { idx = i; break; }
  return Math.max(0, Math.min(100, acc - (ab.bias[idx] || 0)));
}

/* ---------------- Configuration ---------------- */
const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };  // used for the move-list piece icons

const BOARD_THEMES = {
  green:   ["#e9edcc", "#6f9c54"],
  walnut:  ["#f0d9b5", "#b58863"],
  slate:   ["#dfe3e9", "#8a97a8"],
  ocean:   ["#dbe7f3", "#6f8fb4"],
  ink:     ["#b9bdc6", "#474c57"],
  // Four extra professional palettes.
  maple:   ["#e8cfa0", "#a4703c"],   // warm maple wood
  emerald: ["#e4ead4", "#46683f"],   // deep forest green
  coral:   ["#f7dfca", "#c8835a"],   // warm terracotta
};
const ACCENTS = {
  "#7fb45f": { accent: "#7fb45f", strong: "#6aa14a", ink: "#11210a" },
  "#5a8bef": { accent: "#5a8bef", strong: "#4574db", ink: "#06122e" },
  "#d9a544": { accent: "#d9a544", strong: "#c4902f", ink: "#2a1c05" },
};
// Move classifications (standard style). Each has a color (CSS variable), a
// short symbol (fallback) and an SVG badge icon in icons/<icon>.svg. Note that the
// internal code "inacc" points to the "inaccuracy" icon.
const QUALITY = {
  brilliant: { sym: "!!", name: "Brilliant", color: "var(--q-brilliant)", icon: "brilliant" },
  great:     { sym: "!",  name: "Great",     color: "var(--q-great)",     icon: "great" },
  best:      { sym: "★",  name: "Best",      color: "var(--q-best)",      icon: "best" },
  excellent: { sym: "✓",  name: "Excellent", color: "var(--q-excellent)", icon: "excellent" },
  good:      { sym: "✓",  name: "Good",      color: "var(--q-good)",      icon: "good" },
  book:      { sym: "◇",  name: "Book",      color: "var(--q-book)",      icon: "book" },
  inacc:     { sym: "?!", name: "Inaccuracy",color: "var(--q-inacc)",     icon: "inaccuracy" },
  mistake:   { sym: "?",  name: "Mistake",   color: "var(--q-mistake)",   icon: "mistake" },
  miss:      { sym: "✕",  name: "Miss",      color: "var(--q-miss)",      icon: "miss" },
  blunder:   { sym: "??", name: "Blunder",   color: "var(--q-blunder)",   icon: "blunder" },
};
const QUALITY_ORDER = ["brilliant","great","best","excellent","good","book","inacc","mistake","miss","blunder"];
// Accuracy breakdown: compact (default) vs. full list (expanded via the expander arrow).
const QBREAK_SUMMARY = ["brilliant","great","best","mistake","miss","blunder"];
const QBREAK_FULL = ["brilliant","great","book","best","excellent","good","inacc","mistake","miss","blunder"];
const QUALITY_LABEL = {
  brilliant: "Brilliant move!", great: "Great move!", best: "Best move",
  excellent: "Excellent", good: "Good move", book: "Book move",
  inacc: "Inaccuracy", mistake: "Mistake", miss: "Missed chance", blunder: "Blunder",
};
const NOTEWORTHY = new Set(["brilliant","great","inacc","mistake","miss","blunder"]);
// Explanation for each category (shown as a tooltip in the accuracy panel). The classifier
// (computeDerived → classifyMove) works on the engine's eval in PAWNS: "loss" is how much the
// eval drops after your move vs. the best continuation; a "sacrifice" is a real, voluntary
// give-up of material (not a recapture/trade), detected on the board.
const QUALITY_DESC = {
  brilliant: "A sound sacrifice: you give up material for a strong move (typically punishing the opponent's slip, or to start/keep a forced mate). Real sacrifices only — never a plain trade.",
  great:     "An only-good move that capitalises on the opponent's mistake or blunder.",
  best:      "Exactly the engine's top move — the best possible move in the position (also shown for forced, only-legal moves).",
  excellent: "Not the top move, but nearly as strong (loses well under half a pawn), or a move that begins or keeps a forced mate.",
  good:      "A solid move (loses roughly half to one pawn), or one that delays an unavoidable mate.",
  book:      "A known opening move — the position is in the opening book (theory from a large game dataset).",
  inacc:     "Inaccuracy: a move that loses about 1–4 pawns of eval.",
  mistake:   "Mistake: a move that throws away a clear (≥2 pawn) advantage, or hands the opponent one.",
  miss:      "Missed chance: the opponent erred and you failed to punish it — or you let a forced mate slip.",
  blunder:   "Blunder: a move that loses ~4+ pawns of eval, or walks into a forced mate.",
};
// Explanations for the accuracy and elo numbers (shown as a tooltip like the categories).
const ACCURACY_INFO = "Accuracy (0–100) reflects how good your moves were: each move scores by its category (Best/Brilliant = 100 down to Blunder = 0) and the game accuracy is their average — close to what the major sites report. (The Elo estimate below uses a separate win%-based accuracy under the hood.) 100 = flawless.";
const ELO_INFO = "A rough estimate of the rating you played at in this game. It anchors on your actual rating and adjusts up or down by how accurately you played this game (when no rating is known it falls back to accuracy alone). It's not an official rating — only an indication based on this single game.";
// Explanations for the engine settings (shown on hover, same tooltip as the accuracy panel).
const ENGINE_INFO = {
  engineLines:   "How many candidate moves (lines) the engine panel shows for the position you're viewing. Extra lines are searched on demand — changing this doesn't re-analyze the game.",
  classifyLines: "Lines searched per position during the analysis batch. 1 is fastest and is all the move classification needs; raising it measures your move in the same search (steadier accuracy/Elo) and pre-fills the panel. Re-analyzes the game.",
  engineDepth:   "How many plies (half-moves) deep Stockfish searches each position. Higher depth gives more accurate evaluations and fewer false mistakes, but takes longer.",
  engineWorkers: "Number of Stockfish instances analysing positions in parallel. More workers finish the game faster on multi-core CPUs; the results are identical.",
  fastAnalysis:  "Trades quality for speed: the classification pass uses fewer engine lines. ~1.3×/1.6× faster, but evals shift slightly and clean games can pick up a few false inaccuracies.",
  enginePath:    "Which Stockfish build to run. Stockfish 18 NNUE (default) is the strongest; Stockfish 10 (WASM) is lighter; asm.js is a fallback for browsers without WebAssembly support.",
  engineSkill:   "Caps the engine's playing strength (Stockfish 'Skill Level'). Max (20) = full strength. Lower values play deliberately weaker — useful for more human-like suggestions.",
  engineHash:    "Memory (MB) for the engine's transposition table — its cache of already-searched positions. More can speed up deep searches; setting it too high just wastes RAM.",
  clsGood:       "A move that loses at least this much eval (in pawns) can be no better than \"Good\". Below it, the move is \"Excellent\". Lower = stricter.",
  clsInacc:      "A move that loses at least this much eval (pawns) is flagged \"Inaccuracy\". Lower = more inaccuracies.",
  clsBlunder:    "A move that loses at least this much eval (pawns) is a \"Blunder\". Lower = more blunders.",
  clsClearAdv:   "How many pawns counts as a \"clear advantage\". Used to decide Mistakes (you threw away a clear advantage), Misses, and the context for Great moves.",
  clsMistakeLoss:"Minimum eval lost (pawns) for a move to qualify as a Mistake, and for a slip to be \"punishable\" (enabling a Great/Miss on the reply).",
  clsMissTol:    "How close to giving back the whole advantage still counts as a Miss rather than a clean punish. Higher = more Misses.",
};
// Slider value formatters reused by the Engine-tab classification/accuracy knobs.
const pawnsFmt = (v) => (+v).toFixed(2).replace(/\.00$/, "") + " pawns";
const ptsFmt = (v) => v + " pts";
// URL to a classification badge (SVG).
const qIcon = (cls) => _url("icons/" + (QUALITY[cls]?.icon || cls) + ".svg");
const PIECE_STYLES = ["image","merida","kaneo","kaneo_midnight","kbyte_gambit"];
// Labels shown in the settings. "image" = bundled Cburnett (the Lichess default set, the standard
// here), "merida" = the bundled Merida set; the kaneo/kaneo_midnight/kbyte sets are bundled Kadagaden
// sets (CC BY 4.0) — all crisp SVG.
const PIECE_STYLE_LABEL = { image: "Cburnett", merida: "Merida", kaneo: "Kaneo", kaneo_midnight: "Kaneo Midnight", kbyte_gambit: "1Kbyte Gambit" };
// Color approximation of common board themes [light, dark square], used to MATCH a detected
// board by name (colours aren't copyrightable; the source site's board image is never used).
// Unknown themes fall back to "green".
const CC_BOARD_COLORS = {
  green:      ["#ebecd0", "#739552"],
  brown:      ["#f0d9b5", "#b58863"],
  walnut:     ["#c8a275", "#875f3c"],
  wood:       ["#c0926a", "#7c4f31"],
  dark_wood:  ["#c0926a", "#7c4f31"],
  blue:       ["#dee3e6", "#8ca2ad"],
  sky:        ["#dee3e6", "#8ca2ad"],
  light:      ["#dad6cc", "#b0a999"],
  glass:      ["#c2d3da", "#7a9db0"],
  bubblegum:  ["#f9f0fb", "#e6a3c6"],
  tournament: ["#eaeed3", "#6f9f64"],
  newspaper:  ["#e6e6e6", "#9c9c9c"],
  marble:     ["#e8e2d6", "#9a8d7a"],
  icy_sea:    ["#cdd7e0", "#7d97ab"],
  sea:        ["#cdd7e0", "#7d97ab"],
  metal:      ["#d6d6d6", "#8e8e8e"],
};
// "image" = real piece images (cburnett). Filenames per piece+color (l=white, d=black).
// Bundled high-quality SVG piece sets (from Lichess; GPLv2+). Maps a piece-style key to its folder
// under pieces-img/<set>/<code>.svg, where <code> is e.g. wK / bN (white King, black kNight). SVG =
// crisp at any board size.
const BUNDLED_PIECE_SETS = { image: "cburnett", merida: "merida", kaneo: "kaneo", kaneo_midnight: "kaneo_midnight", kbyte_gambit: "kbyte_gambit" };
// Bundled full-board artwork from Kadagaden/chess-pieces (CC BY 4.0). Each entry is a complete 8x8
// SVG painted as the board's background (squares go transparent via .cc-board, like a detected
// board); the [light, dark] pair drives the coordinate + last-move/selection highlight tints so
// they read well on top of that board. Keyed by the boardTheme setting value.
const BUNDLED_BOARDS = {
  kada_green:   { label: "Kada Green", file: "8x8_green.svg",                colors: ["#ebecd0", "#779556"] },
  kada_sand:    { label: "Sand",       file: "8x8_brown_sand.svg",           colors: ["#ebecd0", "#b68860"] },
  kada_amber:   { label: "Amber",      file: "8x8_brown_yellow.svg",         colors: ["#f4eeaa", "#af7c59"] },
  kada_clay:    { label: "Clay",       file: "8x8_pinkish_brown_yellow.svg", colors: ["#f4eeaa", "#d29b75"] },
  kada_wood:    { label: "Wood",       file: "8x8_wood.svg",                 colors: ["#ba9d78", "#6e4e37"] },
};

const DEFAULT_SETTINGS = {
  theme: "dark", accent: "#7fb45f", density: "compact",
  evalView: "both", mlStyle: "rows", badgeStyle: "icon", badgeScale: 1,
  // Eval-graph look (see renderGraph), eval-BAR look (see renderEvalBar) and the Insight-panel text size (px).
  graphStyle: "area", barStyle: "gradient", insightFont: 20,
  // App background: "color" (a tone picked with the HSL sliders), a bundled preset (slate / olive
  // = "Dark", a fixed near-black tone / ember), or "custom" (uploaded). bgFit is "cover" (stretched) or "tile" (repeated
  // at bgTile size). bgCustom holds the uploaded data URL. bgHue/Sat/Light define the "color" tone.
  // Default = a near-black neutral colour tone (HSL 0/0/11).
  bg: "color", bgFit: "tile", bgTile: "large", bgCustom: null,
  bgHue: 0, bgSat: 0, bgLight: 11,
  // Commentary coach (data/coaches/<id>.json) — drives the animated avatar that's shown.
  // coachPlain toggles only the reply VOICE: false = the coach's special phrasing,
  // true = neutral "plain" commentary (the coach still appears and reacts on the board).
  coach: "old_soviet", coachPlain: true,
  // When chess.com's board/pieces can't be detected, fall back to the green board and the
  // bundled "Default" (image) pieces.
  boardTheme: "chesscom", pieceStyle: "image", sound: true,
  // Master volume (0–100) applied to every sound the extension plays.
  soundVolume: 50,
  // Custom board colours (used when boardTheme === "custom" — the colour-picker chip, shown first).
  boardCustomLight: "#f9f9f9", boardCustomDark: "#e1a652",
  // Practice-mode "wrong answer" effect (file under sounds/Wrong/; see WRONG_SOUNDS). Standard = "Incorrect".
  wrongSound: "Incorrect.mp3",
  // Per-event sound mapping + knobs (see FX_SOUNDS / SOUND_EVENTS). snd = an FX_SOUNDS id or "default"
  // (the original cue); pitch in semitones; speed is a duration multiplier (1 = unchanged).
  soundFx: {
    move:    { snd: "default", pitch: 0, speed: 1 },
    capture: { snd: "default", pitch: 0, speed: 1 },
    check:   { snd: "default", pitch: 0, speed: 1 },
    castle:  { snd: "default", pitch: 0, speed: 1 },
  },
  // ccBoardTheme = the detected board's NAME (when opened from a chess.com/Lichess tab) → mapped to
  // our own board colours. Pieces are never imported. We never store or fetch a source site's
  // piece/board image. The other cc* fields are dead (kept null for back-compat with old saves).
  ccPieceSet: null, ccPieceUrlTemplate: null, ccPieceUrlMap: null, ccBoardTheme: null, ccBoardUrl: null,
  // Best-move arrow (the engine's recommendation in the current position)
  bestArrow: true, arrowOpacity: 0.65, arrowShaft: 0.2, arrowHead: 0.4,
  // "Show the threat": a yellow arrow with the opponent's best move as if it were their turn.
  showThreat: false,
  // Move animation (sliding piece on single-step navigation). 1 = slow, 10 = fast.
  moveAnim: true, animSpeed: 7,
  // Loading animation while the analysis runs (selectable style).
  loaderStyle: "wave",
  // Engine panel: how many candidate lines to show. The batch only searches the single best line
  // (all the classification logic needs); extra lines are searched on demand for the position you're
  // viewing, so changing this never re-analyzes — it just refreshes the panel.
  // Depth 16 (was 12): shallow searches give noisy evals that fabricate inaccuracies/mistakes and
  // inflate the accuracy variance vs the reference values. Deeper search is the single biggest accuracy fix.
  engineLines: 1, engineDepth: 16, enginePath: "nnue", engineHash: 16, engineSkill: 20,
  // Parallel analysis workers: independent single-threaded Stockfish instances that pull
  // positions from a shared queue. Each position is still searched identically (cold, same
  // depth/lines), so results are unchanged — only the wall-clock is parallelized. Default ≈
  // (CPU cores − 1), capped at 4.
  engineWorkers: Math.max(1, Math.min(4, ((typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4) - 1)),
  // Lines searched per position during the analysis batch. 1 = fastest (~2x faster than 2) and, per
  // the mpv1-vs-mpv2 study, tracks the reference values as well or better — so
  // the calibration is (re)built on MultiPV-1 evals to match. The runtime MultiPV MUST equal the mpv
  // the calibration was built on, or accuracy drifts. Changing it re-analyzes the game.
  classifyLines: 1,
  // Fast analysis: kept for backwards compatibility, but now a no-op for line count — the batch
  // already searches a single line, so there are no extra lines to drop.
  fastAnalysis: false, fastLines: 3,
  // --- Move-classification thresholds (pawns of eval lost). The category logic (classifyMove /
  // getStandardRating) reads these live, so tweaking them re-labels the game WITHOUT re-analysing. ---
  clsGood: 0.4,        // eval lost ≥ this → at best "Good"
  clsInacc: 0.8,       // eval lost ≥ this → "Inaccuracy"
  clsBlunder: 4.0,     // eval lost ≥ this → "Blunder"
  clsClearAdv: 2.0,    // a "clear advantage" is this many pawns (drives Mistake / Miss / Great context)
  clsMistakeLoss: 1.2, // minimum eval lost for a move to count as a Mistake / a punishable slip
  clsMissTol: 0.5,     // how close to giving back the whole advantage still counts as a Miss
  // --- Displayed accuracy: points per category (Best/Brilliant/Great/Book are always 100). The
  // shown game accuracy is the average of these; the Elo estimate uses the win%-based accuracy, not these. ---
  accExcellent: 90, accGood: 70, accInacc: 30, accMiss: 30, accMistake: 20, accBlunder: 0,
};
// Keys reset by "Reset engine defaults" (everything in the Engine tab), and their default values.
const ENGINE_SETTING_KEYS = [
  "engineDepth", "classifyLines", "engineLines", "engineWorkers", "enginePath", "engineHash", "engineSkill",
  "clsGood", "clsInacc", "clsBlunder", "clsClearAdv", "clsMistakeLoss", "clsMissTol",
  "accExcellent", "accGood", "accInacc", "accMiss", "accMistake", "accBlunder",
];
// Available Stockfish builds (all bundled). "asm" = fallback without wasm.
const ENGINE_BUILDS = { nnue: "engine/stockfish-nnue.js", wasm: "engine/stockfish.js", asm: "engine/stockfish.asm.js" };
// Fixed strength order, strongest → weakest. createEngine() always tries the user's chosen build
// first, then walks DOWN this chain so a build that can't load (e.g. NNUE one day failing) degrades
// to the next-strongest one that does — rather than the analysis silently hanging.
const ENGINE_FALLBACK_ORDER = ["nnue", "wasm", "asm"];
// The engine panel shows up to this many candidate lines (searched on demand for the viewed position).
const ENGINE_MAX_LINES = 4;
// Best-move arrow color — a muted hint green.
const ARROW_COLOR = "#85AE4A";
// User arrow color — yellow/orange.
const USER_ARROW_COLOR = "#E89B3C";
// Loading style → CSS variant. The keys are shown directly in the settings.
const LOADERS = { dots: "pulse", bounce: "bounce", spinner: "spin", wave: "wave" };
// Default placement of the movable modules (free canvas). Saved per user.
// When LAYOUT_VERSION is bumped, saved layouts are reset to this default once.
// v5: the user-arranged default (board on the left, panels stacked on the right).
// v6: an animated coach portrait sits at the top of the right column, directly
// above the insight ("information") panel; the rest of the right stack moved down.
// v7: the user-tuned arrangement — controls tucked under the board, coach compact at
// top-right, review spanning the top of the right stack, panels retuned around them.
const LAYOUT_VERSION = 7;
const DEFAULT_LAYOUT = {
  board:    { x: 346,  y: 0,   w: 824, h: 936 },
  evalbar:  { x: 290,  y: 60,  w: 32,  h: 818 },
  controls: { x: 1194, y: 808, w: 312, h: 56  },
  coach:    { x: 1570, y: 0,   w: 194, h: 198 },
  review:   { x: 1200, y: 62,  w: 608, h: 138 },
  moves:    { x: 1200, y: 220, w: 300, h: 388 },
  accuracy: { x: 1512, y: 218, w: 296, h: 172 },
  graph:    { x: 1200, y: 622, w: 300, h: 172 },
  engine:   { x: 1512, y: 738, w: 296, h: 198 },
};
const GRIP_SVG = `<svg viewBox="0 0 12 12" width="12" height="12"><path d="M11 4 4 11M11 8 8 11" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;
const HANDLE_SVG = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="5" cy="4" r="1.3"/><circle cx="11" cy="4" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="12" r="1.3"/><circle cx="11" cy="12" r="1.3"/></svg>`;
// Engine depth/lines are now controlled via S.settings (engineDepth/engineLines).
const GRID = 2;          // fine snap grid for modules (px) — small, so placement feels free
const MINW = 170;        // minimum module width (px)
const MINH = 56;         // minimum module height (px)
// Per-module width floors that override MINW — the eval bar is a thin strip, so it may go narrow.
const MOD_MINW = { evalbar: 16 };
const modMinW = (key) => MOD_MINW[key] ?? MINW;
// Estimated strength from accuracy (interpolation) — the no-rating fallback. Calibrated to roughly
// hit realistic numbers — it's an estimate, not an official rating.
// Calibrated against reference "estimated game rating" vs accuracy across a sample of
// blitz/bullet/classical games. The old low end was far too harsh (56% → 560; the reference
// puts the same game near 1300–1600), which made every fast game's Elo collapse.
const ELO_ANCHORS = [[30,550],[40,800],[50,1100],[58,1300],[65,1450],[72,1600],[78,1750],[85,2000],[91,2200],[96,2450],[100,2750]];

const ICONS = {
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`,
  flip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4M21 7H7M7 21l-4-4 4-4M3 17h14"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
  first: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h2v14H7zM19 5l-9 7 9 7z"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5l-9 7 9 7z"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l9 7-9 7z"/></svg>`,
  last: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 5h2v14h-2zM5 5l9 7-9 7z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 4h12v3a6 6 0 0 1-12 0V4ZM6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M9 19h6M12 13v6"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2z"/></svg>`,
  library: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16M9 4v16M14 5l4 15M18.5 4.2 14 5"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.6" r="0.4" fill="currentColor"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
};

/* ---------------- DOM helper ---------------- */
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "style" && typeof v === "object") {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith("--")) n.style.setProperty(sk, sv);
        else n.style[sk] = sv;
      }
    } else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) n.setAttribute(k, "");
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}
const icon = (name) => el("span", { style: { display: "contents" }, html: ICONS[name] || "" });

// UTF-8-safe base64 (for the share link)
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
// Small toast. Centered at the bottom by default; pass an anchor element to pop it beneath that element.
function toast(msg, anchor) {
  let t = document.querySelector(".toast");
  if (!t) { t = el("div", { class: "toast" }); document.body.append(t); }
  t.textContent = msg;
  if (anchor) {
    const r = anchor.getBoundingClientRect();
    t.style.left = (r.left + r.width / 2) + "px";
    t.style.top = (r.bottom + 20) + "px";
    t.style.bottom = "auto";
  } else {
    t.style.left = ""; t.style.top = ""; t.style.bottom = "";
  }
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1900);
}
// Build a share link: a chess.com URL with the game (PGN) packed in the fragment.
// The recipient's add-on reads the fragment and opens the same analysis — independent
// of the extension ID, so it works on another PC that also has the add-on.
function shareGame(ev) {
  // Capture the button now — native event.currentTarget is null by the time the clipboard promise resolves.
  const btn = ev?.currentTarget;
  try {
    // Bake the resolved perspective into the export so the game reopens the right way up even on a
    // PC whose stored handle doesn't match either player — the username stays the safety net, the
    // flip is the certainty. (flip = is the user Black / sitting after a board flip.)
    const meta = { ...S.meta, flip: S.flipped, myName: (S.players?.[S.meSide]?.name) || S.username || "" };
    const data = encodeURIComponent(b64encode(JSON.stringify({ pgn: S.pgn, meta })));
    const carrier = ((S.meta && S.meta.url) ? S.meta.url : "https://www.chess.com/").split("#")[0];
    const url = carrier + "#gambit=" + data;
    navigator.clipboard.writeText(url)
      .then(() => toast("Share link copied", btn))
      .catch(() => toast("Couldn't copy the link", btn));
  } catch {
    toast("Couldn't create link");
  }
}

/* ---------------- Sound ---------------- */
const _url = (p) => (typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(p) : p);
// The 9 base effects (test bank under sounds/fx). [id, label, file]. Each board event picks one of
// these (or the extension's original cue) and shapes it live with pitch + speed knobs — so the old
// sped-up duplicate files are gone: one source per sound, tuned per event. See SOUND_EVENTS / fxConfig.
const FX_SOUNDS = [
  ["01", "Sound 01", "sounds/fx/chess_sound_01.wav"],
  ["02", "Sound 02", "sounds/fx/chess_sound_02.wav"],
  ["03", "Sound 03", "sounds/fx/chess_sound_03.wav"],
  ["04", "Sound 04", "sounds/fx/chess_sound_04.wav"],
  ["05", "Sound 05", "sounds/fx/chess_sound_05.wav"],
  ["06", "Sound 06", "sounds/fx/chess_sound_06.wav"],
  ["07", "Sound 07", "sounds/fx/chess_sound_07.wav"],
  ["08", "Sound 08", "sounds/fx/chess_sound_08.wav"],
  ["09", "Sound 09", "sounds/fx/chess_sound_09.wav"],
];
// Board events that get their own sound + knobs. [key, label, lichessFile]. "default" maps the event
// to lichessFile (the stock Lichess cue, shown as "Lichess"), still pitch/speed-tunable so you can A/B it.
const SOUND_EVENTS = [
  ["move", "Move", "sounds/move-self.mp3"],
  ["capture", "Capture", "sounds/capture.mp3"],
  ["check", "Check", "sounds/Check.mp3"],
  ["castle", "Castle", "sounds/Castling.mp3"],
];
const _fxFileById = (id) => (FX_SOUNDS.find(([x]) => x === id) || [])[2] || null;
const _eventDef = (ev) => SOUND_EVENTS.find(([k]) => k === ev) || SOUND_EVENTS[0];
// Per-event config { snd, pitch, speed }, with safe fallbacks for old/missing stored settings.
function fxConfig(ev) {
  const c = (S.settings.soundFx && S.settings.soundFx[ev]) || {};
  const snd = c.snd === "default" || _fxFileById(c.snd) ? c.snd : "default";
  return { snd, pitch: Number.isFinite(+c.pitch) ? +c.pitch : 0, speed: +c.speed > 0 ? +c.speed : 1 };
}
function setFx(ev, field, val) {
  // Write fresh objects rather than mutating in place — S.settings.soundFx may still be aliased to the
  // shared DEFAULT_SETTINGS object (settings are loaded with a shallow spread).
  const fx = { ...(S.settings.soundFx || {}) };
  fx[ev] = { ...fxConfig(ev), [field]: val };
  S.settings.soundFx = fx;
  chrome.storage.local.set({ settings: S.settings });
}
// Resolve an event's chosen sound to a packaged URL.
function fxUrl(ev) {
  const cfg = fxConfig(ev);
  if (cfg.snd === "default") return _url(_eventDef(ev)[2]);
  return _url(_fxFileById(cfg.snd) || _eventDef(ev)[2]);
}
// Selectable "wrong answer" effects (practice mode). [filename, label]; first entry is the default.
// Kept deliberately short — "Incorrect" is the standard cue, with "Wrong" and "No" as alternatives.
const NO_WRONG_FILE = "No.mp3";
const WRONG_SOUNDS = [
  ["Incorrect.mp3", "Incorrect"],
  ["Wrong.mp3", "Wrong"],
  ["No.mp3", "No"],
];
// Master volume (0–1) for every sound the extension plays — driven by the "Volume" slider.
function masterVol() {
  const v = S.settings.soundVolume;
  return (v == null ? 100 : Math.max(0, Math.min(100, v))) / 100;
}

/* --- Web Audio engine: lets the pitch & speed knobs reshape one source sound instead of shipping a
   pre-rendered file per speed. The two knobs are independent: pitch shifts the tone, speed sets the
   duration. We get that by time-stretching the buffer (WSOLA) by pitchRatio/speed, then resampling it
   at pitchRatio on playback — net pitch = pitchRatio, net duration = original/speed. At the default
   knobs (0 st, 1.00×) stretch is 1 and the sound plays untouched, so stock cues stay pristine. */
let _actx = null;
function audioCtx() {
  if (!_actx) { try { _actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
  return _actx;
}
const _bufferCache = new Map();   // url → Promise<AudioBuffer> (raw decoded source)
function loadBuffer(url) {
  if (!_bufferCache.has(url)) {
    _bufferCache.set(url, fetch(url).then((r) => r.arrayBuffer()).then((a) => audioCtx().decodeAudioData(a)));
  }
  return _bufferCache.get(url);
}
// WSOLA time-stretch: returns a new AudioBuffer `ratio`× as long (ratio>1 = longer/slower), keeping
// pitch. Overlap-adds Hann-windowed grains, sliding each within a small seek window to the spot that
// best continues the previous grain — which keeps transient clicks from smearing into an echo.
function wsolaStretch(buf, ratio) {
  const ctx = audioCtx(), sr = buf.sampleRate, chs = buf.numberOfChannels;
  const frame = Math.max(128, Math.round(sr * 0.04));   // ~40 ms grain
  const Hs = Math.round(frame / 2);                       // synthesis hop (50% overlap)
  const Ha = Math.max(1, Math.round(Hs / ratio));        // analysis hop
  const seek = Math.round(sr * 0.008);                   // ±8 ms similarity search
  const win = new Float32Array(frame);
  for (let i = 0; i < frame; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frame - 1));
  const outLen = Math.max(frame, Math.round(buf.length * ratio)) + frame;
  const out = ctx.createBuffer(chs, outLen, sr);
  for (let c = 0; c < chs; c++) {
    const inp = buf.getChannelData(c), o = out.getChannelData(c), nrm = new Float32Array(outLen);
    let aPos = 0, sPos = 0, natural = 0, last = 0;
    while (aPos + frame + seek < inp.length && sPos + frame < outLen) {
      let off = 0;
      if (sPos > 0) {                                      // align grain to the natural continuation
        let best = -Infinity;
        const lo = Math.max(-seek, -aPos), hi = Math.min(seek, inp.length - frame - aPos);
        for (let d = lo; d <= hi; d++) {
          let acc = 0;
          for (let k = 0; k < frame; k += 4) acc += inp[aPos + d + k] * inp[natural + k];
          if (acc > best) { best = acc; off = d; }
        }
      }
      const start = aPos + off;
      for (let i = 0; i < frame; i++) { o[sPos + i] += inp[start + i] * win[i]; nrm[sPos + i] += win[i]; }
      natural = Math.min(start + Hs, inp.length - frame - 1);
      last = sPos + frame; sPos += Hs; aPos += Ha;
    }
    for (let i = 0; i < outLen; i++) if (nrm[i] > 1e-6) o[i] /= nrm[i];
    if (c === chs - 1 && last && last < outLen) return sliceBuffer(out, last);
  }
  return out;
}
function sliceBuffer(buf, len) {
  const ctx = audioCtx(), out = ctx.createBuffer(buf.numberOfChannels, len, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(0, len), c);
  return out;
}
// Cache the processed (stretched) buffer + playback rate per url|pitch|speed so rapid nav scrubbing
// doesn't re-run WSOLA on every step.
const _fxCache = new Map();
function processedFx(url, pitch, speed) {
  const key = url + "|" + pitch + "|" + speed;
  if (_fxCache.has(key)) return Promise.resolve(_fxCache.get(key));
  const rate = Math.pow(2, pitch / 12);                  // pitch multiplier (semitones)
  const stretch = rate / speed;                          // WSOLA factor → final duration = orig/speed
  return loadBuffer(url).then((buf) => {
    const fx = { buffer: Math.abs(stretch - 1) < 1e-3 ? buf : wsolaStretch(buf, stretch), rate };
    _fxCache.set(key, fx);
    return fx;
  });
}
// Play an event's sound now (no throttle) — used for the move board and settings previews.
function triggerFx(ev) {
  const ctx = audioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const cfg = fxConfig(ev);
  processedFx(fxUrl(ev), cfg.pitch, cfg.speed).then((fx) => {
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = fx.buffer; src.playbackRate.value = fx.rate;
    gain.gain.value = masterVol();
    src.connect(gain).connect(ctx.destination);
    src.start();
  }).catch(() => {});
}
// Fast-scrub feel (holding ←/→): nav events fire quicker than a click can ring out. Throttle the cue
// to a tidy cadence; Web Audio is naturally polyphonic so overlapping plays don't garble.
const NAV_SOUND_GAP = 55;   // ms — min spacing between consecutive nav click sounds
let _lastNavSound = 0, _lastNavStep = 0;
function playEvent(ev) {
  if (!S.settings.sound) return;
  const now = performance.now();
  if (now - _lastNavSound < NAV_SOUND_GAP) return;   // throttle machine-gun key-repeat
  _lastNavSound = now;
  triggerFx(ev);
}
// True when this step lands quicker than a slide would take, so the caller should snap, not animate.
function navFastScrub() {
  const now = performance.now();
  const fast = now - _lastNavStep < animDuration() + 30;
  _lastNavStep = now;
  return fast;
}
// Pick the event for a SAN string. Priority: check/mate > castle > capture > plain move.
function sanSound(san) {
  san = san || "";
  if (/[+#]/.test(san)) return "check";
  if (/^[O0]-[O0]/.test(san)) return "castle";
  if (/x/.test(san)) return "capture";
  return "move";
}
// Play the move sound for the position you land on (check/castle/capture/move, from its SAN).
function playMoveSound(ply) {
  if (!S.settings.sound || ply < 1 || !S.positions[ply]) return;
  playEvent(sanSound(S.positions[ply].san));
}
// Cached "wrong answer" Audio (rebuilt when the chosen effect changes).
let _wrongAudio = null, _wrongAudioKey = null;
// The selected effect, falling back to the default if an old/removed choice is still stored.
function currentWrongFile() {
  const f = S.settings.wrongSound;
  return WRONG_SOUNDS.some(([file]) => file === f) ? f : WRONG_SOUNDS[0][0];
}
function playWrongSound() {
  if (!S.settings.sound) return;
  const file = currentWrongFile();
  if (_wrongAudioKey !== file) { _wrongAudio = new Audio(_url("sounds/Wrong/" + file)); _wrongAudioKey = file; }
  // The "No" voice clip opens with a beat of silence — skip into it so the cue lands promptly.
  try { _wrongAudio.volume = masterVol(); _wrongAudio.currentTime = file === NO_WRONG_FILE ? 0.08 : 0; _wrongAudio.play().catch(() => {}); } catch {}
}

/* ---------------- State ---------------- */
const S = {
  pgn: "", headers: {}, meta: {},
  positions: [], clocks: [], evals: [], bests: [],
  classif: [], accMove: [], _sacCache: [], _forcedCache: [],
  players: { w: {}, b: {} }, meSide: "w",
  // acc = displayed (category-based) accuracy; accElo = win%-based accuracy that feeds the Elo estimate.
  acc: { w: null, b: null }, accElo: { w: null, b: null }, counts: { w: {}, b: {} },
  bookCount: 0, opening: null, verdict: "Analyzing …",
  idx: 0, total: 0, flipped: false,
  analyzing: true, progress: 0, userArrows: [], userMarks: [], qbreakExpanded: false,
  // Collapsible settings sections: open/closed state, keyed by section title.
  setOpen: {},
  settings: { ...DEFAULT_SETTINGS },
  layout: structuredClone(DEFAULT_LAYOUT),
  evalEngines: [], autoTimer: null,
  // Re-analysis + analysis mode
  batchGen: 0, settingsTab: "visual", analyzedMultipv: null,
  analysisMode: false, variation: null, liveEngine: null, liveToken: 0, panelToken: 0, _panelCache: null, selectedSq: null,
  // The build that is ACTUALLY running (set by createEngine; may differ from settings.enginePath if
  // the chosen build failed to load and we fell back). The Engine tab shows this, not the selection.
  activeEngineBuild: null,
  // "Play best moves from here": auto-walk that re-analyzes each position and plays the engine's
  // best move until mate/draw or the user takes over. Token invalidates an in-flight walk.
  bestWalkToken: 0, bestWalking: false,
  // Commentary coach: the loaded phrase bank (null = plain lines). _turnPly caches the game's
  // biggest-swing ply for the "turning point" line.
  coach: null, _turnPly: null,
  // Mistake-practice session (null when inactive). "Show the threat" helper engine + cache.
  practice: null, helperEngine: null, threatCache: new Map(),
  // Practice hint squares (the engine's best move) — shown after 3 failed attempts.
  practiceHint: null,
  // Library (left hover-sidebar): the saved games + the active sort/filter selection.
  library: [], libSort: "history", libResult: "all", libType: "all",
  // Reorganize mode (drag/resize panels) — off by default each load; the layout itself persists.
  reorganize: false,
};
let UI = {};
let sqByName = {};
// References to the loader/counter nodes so the panels can be updated in place during
// the analysis — so the CSS animation doesn't restart for each analyzed move.
let revRefs = null;
let statsRefs = null;

/* ---------------- Active position (mainline vs. analysis mode) ----------------
   In analysis mode the shown position + eval + engine data come from the variation;
   otherwise from the mainline's caches. The renderers use these accessors, so they
   work the same in both modes. */
function activePos() {
  return S.analysisMode && S.variation ? S.variation.positions[S.variation.idx] : S.positions[S.idx];
}
function activeEval() {
  return S.analysisMode && S.variation ? (activePos().eval ?? null) : S.evals[S.idx];
}
// Best-move data for the current view. In analysis mode: the current position's
// live analysis. On the mainline: the position BEFORE the played move (the alternative).
function activeBest() {
  if (S.analysisMode && S.variation) return activePos().best || null;
  return S.idx > 0 ? S.bests[S.idx - 1] : null;
}

/* ---------------- Loading + PGN ---------------- */
async function loadJob() {
  const jobId = location.hash.replace(/^#/, "");
  if (!jobId) throw new Error("No analysis job specified.");
  const key = `job:${jobId}`;
  const data = await chrome.storage.local.get(key);
  const payload = data[key];
  if (!payload) throw new Error("Analysis data not found (open via the popup).");
  await chrome.storage.local.remove(key);
  return payload;
}
function parseHeaders(pgn) {
  const h = {}; const re = /\[(\w+)\s+"([^"]*)"\]/g; let m;
  while ((m = re.exec(pgn))) h[m[1]] = m[2];
  return h;
}
function parseClocks(pgn) {
  const out = [null]; const re = /\{\[%clk\s+([\d:.]+)\]\}/g; let m;
  while ((m = re.exec(pgn))) {
    let t = m[1].split(".")[0];
    const p = t.split(":").map(Number);
    if (p.length === 3) t = `${p[0] * 60 + p[1]}:${String(p[2]).padStart(2, "0")}`;
    out.push(t);
  }
  return out;
}
function buildPositions(pgn) {
  const c = new Chess(); c.loadPgn(pgn);
  const moves = c.history({ verbose: true });
  // No moves → keep whatever position the PGN set up (a [FEN] header for a pasted FEN), not the
  // standard start. With moves, the start is the position before the first one.
  const startFen = moves.length ? moves[0].before : c.fen();
  const pos = [{ fen: startFen, san: null }];
  for (const mv of moves) pos.push({ fen: mv.after, san: mv.san, from: mv.from, to: mv.to, color: mv.color, promotion: mv.promotion || "", captured: mv.captured || "" });
  return pos;
}
function deriveOpening(h) {
  const eco = h.ECO || "";
  let name = h.Opening || "";
  if (!name && h.ECOUrl) {
    // Chess.com's URL slug often contains the whole variation ("Indian-Game...3.e3-d5-4.Nf3"),
    // not just the name. Cut off the move tail (from "..." or a " <number>." move number).
    name = decodeURIComponent(h.ECOUrl.split("/").pop() || "")
      .replace(/-/g, " ")
      .replace(/(\.{2,}|\s+\d+\.).*$/s, "")
      .trim();
  }
  return eco || name ? { eco, name } : null;
}
function derivePlayers(h, meta, username) {
  const res = h.Result || meta.result || "";
  const me = (username || "").toLowerCase();
  // country = flag basename ("US", "GB_ENG") resolved from the chess.com country id the page
  // scraped, or null when we have no flag for it → the avatar falls back to the username initial.
  // countryName labels the flag's hover tooltip.
  const w = { name: h.White || meta.white?.user || "White", rating: h.WhiteElo || "", result: res, country: flagCodeForCountryId(meta.white?.countryId), countryName: countryNameForId(meta.white?.countryId) };
  const b = { name: h.Black || meta.black?.user || "Black", rating: h.BlackElo || "", result: res, country: flagCodeForCountryId(meta.black?.countryId), countryName: countryNameForId(meta.black?.countryId) };
  let meSide = "w";
  if (me && b.name.toLowerCase() === me && w.name.toLowerCase() !== me) meSide = "b";
  return { players: { w, b }, meSide };
}

/* ---------------- Math ---------------- */
function scoreToCp(s) { return !s ? 0 : s.mate != null ? (s.mate > 0 ? 10000 : -10000) : s.cp; }
function whiteRel(score, fen) {
  if (!score) return null;
  const flip = fen.split(" ")[1] === "b" ? -1 : 1;
  return score.mate != null ? { mate: score.mate * flip } : { cp: score.cp * flip };
}
// Terminal positions (checkmate/stalemate/draw) must not be read from the engine: a mate
// position has no legal moves, and Stockfish typically reports "score mate 0" — an unsigned
// zero, which would otherwise always be interpreted as the same side (wrong eval bar on mate).
// We decide the result directly from the board and return a white-relative score.
function terminalScore(fen) {
  let c; try { c = new Chess(fen); } catch { return null; }
  // Checkmate: the side to move is checkmated → it loses. White-relative: white-to-move
  // means white is mated (black wins, negative); black-to-move means white wins.
  if (c.isCheckmate()) return { mate: fen.split(" ")[1] === "w" ? -1 : 1 };
  if (c.isDraw()) return { cp: 0 }; // stalemate, 50-move, insufficient material, threefold
  return null;
}
function winPct(cp) { return 50 + 50 * (2 / (1 + Math.exp(-calWinK() * cp)) - 1); }
function moverWin(wr, mover) { const wp = winPct(scoreToCp(wr)); return mover === "w" ? wp : 100 - wp; }
// Classify a move from the win% drop. "best" is given ONLY when the move actually is
// the engine's top move (isTop) — so the label always matches the best-move arrow. A
// near-optimal move that isn't #1 becomes "excellent"/"good" (standard grading).
// Thresholds follow the standard "expected points" model, applied to
// Move accuracy (0–100) from the win% loss, for the win%-based game accuracy that feeds the Elo estimate.
function moveAccuracy(d) { const m = calMoveAcc(); return Math.max(0, Math.min(100, m.a * Math.exp(-m.b * d) - m.c)); }

// --- Game accuracy (win%-based) ---
// The simple average overestimates (many quiet ≈100% moves pull the average up).
// Instead we blend a volatility-weighted average with the harmonic
// mean (the latter punishes low values hard) → steadier, more realistic numbers.
function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) * (b - m), 0) / arr.length);
}
function harmonicMean(arr) {
  const v = arr.filter((x) => x > 0);
  if (!v.length) return 0;
  return v.length / v.reduce((a, b) => a + 1 / b, 0);
}
function weightedMean(vals, wts) {
  let sw = 0, swv = 0;
  for (let i = 0; i < vals.length; i++) { sw += wts[i]; swv += wts[i] * vals[i]; }
  return sw > 0 ? swv / sw : (vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
}
// Weighted power mean with an outlier floor — the tuned aggregation family (p=-1 harmonic,
// p→1 arithmetic). Used when calibration.json selects agg.mode "power".
function powerMean(vals, wts, p, floor = 0) {
  let sw = 0, s = 0;
  for (let i = 0; i < vals.length; i++) { const v = Math.max(1e-6, Math.max(floor, vals[i])); sw += wts[i]; s += wts[i] * Math.pow(v, p); }
  return sw > 0 ? Math.pow(s / sw, 1 / p) : 0;
}
// Return { w, b } game accuracy (0–100) or null per side.
function sideAccuracies() {
  const N = S.total;
  // White-relative win% per ply (carry-forward if an eval is still missing during analysis).
  const wp = new Array(N + 1).fill(50);
  for (let p = 0; p <= N; p++) wp[p] = S.evals[p] ? winPct(scoreToCp(S.evals[p])) : (p ? wp[p - 1] : 50);
  // Volatility weight = std.dev. of win% in a small window around the move (sharp
  // positions weigh more). Clamped to [0.5, 12].
  const win = Math.max(2, Math.min(8, Math.floor(N / 10)));
  const weight = new Array(N + 1).fill(1);
  for (let i = 1; i <= N; i++) {
    const seg = [];
    for (let j = Math.max(0, i - win); j <= Math.min(N, i); j++) seg.push(wp[j]);
    weight[i] = Math.max(CALIB?.volatility?.clampMin ?? 0.5, Math.min(CALIB?.volatility?.clampMax ?? 12, stdev(seg)));
  }
  const acc = { w: [], b: [] }, wts = { w: [], b: [] };
  for (let i = 1; i <= N; i++) {
    if (S.accMove[i] == null) continue;
    const mv = S.positions[i].color;
    acc[mv].push(S.accMove[i]);
    wts[mv].push(weight[i]);
  }
  const out = {};
  const a = CALIB?.agg;
  for (const s of ["w", "b"]) {
    if (!acc[s].length) { out[s] = null; continue; }
    // learned aggregation (ridge regression on per-move features) is the closest match to the
    // reference accuracy values; else tuned power-mean+floor; else the original blend.
    if (a && a.mode === "learned" && a.learnedFeatures) out[s] = learnedAccuracy(acc[s], wts[s], a);
    else if (a && a.mode === "power") out[s] = powerMean(acc[s], a.useVol ? wts[s] : acc[s].map(() => 1), a.p, a.floor || 0);
    else out[s] = (weightedMean(acc[s], wts[s]) + harmonicMean(acc[s])) / 2;
  }
  return out;
}
// Features of a side's floored per-move accuracies — must match tools/dataset/score-core.mjs.
const AGG_FEATURES = {
  bias: () => 1,
  mean: (v) => v.reduce((a, b) => a + b, 0) / v.length,
  harmonic: (v) => harmonicMean(v),
  wmean: (v, w) => weightedMean(v, w),
  min: (v) => Math.min(...v),
  p25: (v) => v.slice().sort((a, b) => a - b)[Math.floor(0.25 * v.length)],
  fracLt50: (v) => v.filter((x) => x < 50).length / v.length,
  fracLt30: (v) => v.filter((x) => x < 30).length / v.length,
  logn: (v) => Math.log(v.length),
};
function learnedAccuracy(accs, vols, a) {
  const vals = accs.map((v) => Math.max(a.floor || 0, v));
  const wts = a.useVol ? vols : vals.map(() => 1);
  let acc = 0;
  a.learnedFeatures.forEach((f, i) => { acc += (AGG_FEATURES[f] ? AGG_FEATURES[f](vals, wts) : 0) * a.learnedWeights[i]; });
  return Math.max(0, Math.min(100, acc));
}

/* ---------------- Move classification (based on an open-source MIT-licensed classifier) ----------
   The category logic (top-tier … Blunder) is derived from that approach because it is more stable
   than our old win%-drop buckets — above all it uses a real, board-based SACRIFICE test,
   so a plain trade is never mistaken for a brilliancy (our old maxOpponentWin counted gross
   recapturable material and fired Brilliant on equal trades). Evals are read from our white-relative
   S.evals[] so the perspective is unambiguous; the original's cp/parity arithmetic is re-expressed
   in those terms. The win%-based accuracy (sideAccuracies) is kept untouched — it still feeds the Elo
   estimate — while the *displayed* accuracy is derived from these categories (see computeDerived). */
const SAC_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function _opp(c) { return c === "w" ? "b" : "w"; }
// Legal attackers (opponent) and defenders (mover) of `to`, mirroring Brilliant-Chess's
// getAttackersDefenders: defenders are counted AFTER a hypothetical capture so x-ray recaptures
// are seen. Returns { attackers, defenders } each as { squares, pieces, length }.
function getAttackersDefenders(chess, color, to) {
  const raw = chess.attackers(to, _opp(color));
  const legalAttackers = raw.filter((a) => chess.moves({ verbose: true }).some((m) => m.from === a && m.to === to));
  const attackersPieces = legalAttackers.map((a) => chess.get(a));
  let legalDefenders;
  if (raw.length === 1) {
    const t = new Chess(chess.fen());
    try { t.move({ from: raw[0], to }); } catch {}
    legalDefenders = t.attackers(to, color).filter((d) => t.moves({ verbose: true }).some((m) => m.from === d && m.to === to));
  } else {
    legalDefenders = chess.attackers(to, color).filter((d) => {
      for (const a of legalAttackers) {
        const t = new Chess(chess.fen());
        try { t.move({ from: a, to }); } catch {}
        if (!t.moves({ verbose: true }).some((m) => m.from === d && m.to === to)) return false;
      }
      return true;
    });
  }
  return {
    attackers: { squares: legalAttackers, pieces: attackersPieces, length: legalAttackers.length },
    defenders: { squares: legalDefenders, pieces: legalDefenders.map((d) => chess.get(d)), length: legalDefenders.length },
  };
}
// Could the piece on `square` have stayed safe in this (pre-move) position? Either it wasn't
// attacked and another move existed (so giving it up was a choice), or it had a flight square.
function couldBeSaved(chess, square, color) {
  if (!chess.attackers(square, color).length) {
    for (const m of chess.moves({ verbose: true })) if (m.from !== square) return true;
  } else {
    for (const m of chess.moves({ verbose: true, square })) {
      if (!new Chess(m.after).attackers(m.to, color).length) return true;
    }
  }
  return false;
}
// True if the move voluntarily gives up material — a genuine sacrifice, not a trade/recapture.
// `move` = { before, after, color, captured, from }.
function isSacrifice(move) {
  let chess, chessBefore;
  try { chess = new Chess(move.after); chessBefore = new Chess(move.before); } catch { return false; }
  const sacrificing = [];
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.type === "p" || sq.color !== move.color) continue;
      const { attackers, defenders } = getAttackersDefenders(chess, move.color, sq.square);
      if (!defenders.length && attackers.length && (!move.captured || move.captured === "p")) { sacrificing.push(sq); continue; }
      if ((sq.type === "n" || sq.type === "b") && !move.captured && attackers.pieces.findIndex((p) => p?.type === "p") !== -1) { sacrificing.push(sq); continue; }
      if (sq.type === "r" && attackers.length && (move.captured !== "r" && move.captured !== "q")
        && !(attackers.length === 1 && (attackers.pieces[0]?.type === "q" || attackers.pieces[0]?.type === "r") && defenders.length)
        && !(defenders.length && (move.captured === "n" || move.captured === "b"))) { sacrificing.push(sq); continue; }
      if (sq.type === "q" && attackers.length && move.captured !== "q"
        && !(attackers.length === 1 && attackers.pieces[0]?.type === "q" && defenders.length)
        && !(attackers.length === 1 && attackers.pieces[0]?.type === "r" && move.captured === "r" && defenders.length)) { sacrificing.push(sq); continue; }
    }
  }
  for (const sq of sacrificing) {
    const same = chessBefore.get(sq.square)?.color === chess.get(sq.square)?.color && chessBefore.get(sq.square)?.type === chess.get(sq.square)?.type;
    const beforeSquare = same ? sq.square : move.from;
    if (couldBeSaved(chessBefore, beforeSquare, _opp(move.color))) return true;
  }
  return false;
}
// --- Eval readouts (all from our white-relative S.evals[]) ---
function _evalPawnsWhite(k) { const e = S.evals[k]; return e ? scoreToCp(e) / 100 : null; }
function _evalPawns(k, mover) { const p = _evalPawnsWhite(k); return p == null ? null : (mover === "w" ? p : -p); }
function _isMateEval(k) { const e = S.evals[k]; return !!(e && e.mate != null); }
// Mate distance from `mover`'s POV at position k (>0 = mover mating, <0 = mover being mated).
function _mateFor(k, mover) { const e = S.evals[k]; if (!e || e.mate == null) return null; return mover === "w" ? e.mate : -e.mate; }
function _isCheckmate(k) { try { return new Chess(S.positions[k].fen).isCheckmate(); } catch { return false; } }
// Eval loss (pawns, the mover's own POV) of the move that produced position k.
function _moveLoss(k) {
  if (k < 1) return null;
  const m = S.positions[k].color;
  const a = _evalPawns(k - 1, m), b = _evalPawns(k, m);
  return (a == null || b == null) ? null : a - b;
}
// Baseline bucket on the WIN%-DROP (the "expected points" model),
// not raw pawns: losing 0.8 pawns at +0.2 is a real slip, but at +6 it's nothing. Thresholds are
// in win% points (0–100); defaults mirror the standard table (≤2 excellent … >20 blunder,
// with the add-on deriving Mistake from the clear-advantage logic). Overridable via calibration.json.
function getStandardRating(wp) {
  if (wp == null) return null;
  const t = (typeof CALIB !== "undefined" && CALIB?.clsWp) || { good: 2, inacc: 5, blunder: 20 };
  let r = "excellent";
  if (wp >= t.good) r = "good";
  if (wp >= t.inacc) r = "inacc";
  if (wp >= t.blunder) r = "blunder";
  return r;
}
// Per-ply move category, ported from getMoveRating(). `mover` made move i; `isTop` = it was the
// engine's #1; `book` = the resulting position is theory; arrays sac/std/loss are indexed by ply.
function classifyMove(i, mover, isTop, book, sac, std, loss, wpDrop) {
  if (book) return "book";
  // "Forced": only one legal move in the position before — we have no separate icon, so it reads
  // as Best (you couldn't have done better).
  if (_forcedAt(i)) return "best";   // only one legal move — you couldn't have done better

  // User-tunable thresholds (Engine settings → Move classification), all in pawns of eval.
  const CA = S.settings.clsClearAdv, ML = S.settings.clsMistakeLoss, MT = S.settings.clsMissTol;
  const mate = _isMateEval, evalFor = (k) => _evalPawns(k, mover);
  const winningNow = (evalFor(i) ?? 0) > 0;
  const prevWinning = (evalFor(i - 1) ?? 0) > 0;
  const notMateRel = !mate(i) && !mate(i - 1);
  const wasNotMateRel = (n) => i - 2 - n >= 0 && !mate(i - 1 - n) && !mate(i - 2 - n);
  const pStd = (n) => (i - 1 - n >= 1 ? std[i - 1 - n] : null);
  const pLoss = (n) => (i - 1 - n >= 1 ? loss[i - 1 - n] : null);
  // mover-POV "lost a clear advantage" / "fell into a clear disadvantage" (CA pawns) for move k.
  const losingAdvAt = (k) => { const m = S.positions[k].color; const a = _evalPawns(k - 1, m), b = _evalPawns(k, m); return a != null && b != null && a >= CA && b < CA; };
  const givingAdvAt = (k) => { const m = S.positions[k].color; const a = _evalPawns(k - 1, m), b = _evalPawns(k, m); return a != null && b != null && a >= -CA && b < -CA; };
  const keepMating = (k) => { const c = _mateFor(k, S.positions[k].color), p = _mateFor(k - 1, S.positions[k].color); return c != null && p != null && c > 0 && p > 0 && c <= p; };
  const advanceMate = (k) => { const c = _mateFor(k, S.positions[k].color), p = _mateFor(k - 1, S.positions[k].color); return c != null && p != null && c < 0 && p < 0 && c > p; };

  const previousMistake = wasNotMateRel(0) && pStd(0) === "inacc" && pLoss(0) >= ML && (losingAdvAt(i - 1) || givingAdvAt(i - 1));
  const previousPreviousMistake = wasNotMateRel(1) && pStd(1) === "inacc" && pLoss(1) >= ML && (losingAdvAt(i - 2) || givingAdvAt(i - 2));
  const previousMiss = wasNotMateRel(0) && (previousPreviousMistake || pStd(1) === "blunder")
    && (pStd(0) === "blunder" || pStd(0) === "inacc") && (pLoss(0) != null && pLoss(1) != null && pLoss(0) <= pLoss(1) + MT);

  // Brilliant — a sound sacrifice that punishes the opponent's slip.
  const previousBrilliant = wasNotMateRel(0) && sac[i - 1] && pStd(0) === "excellent";
  if (!previousBrilliant && notMateRel && std[i] === "excellent" && sac[i]
    && (pStd(0) === "inacc" || pStd(0) === "blunder"
      || (!(pStd(1) === "inacc" || pStd(1) === "blunder") && (pStd(2) === "inacc" || pStd(2) === "blunder")))) return "brilliant";
  if (sac[i] && !mate(i - 1) && mate(i) && winningNow) return "brilliant";                                   // sac that starts a mate
  if (sac[i] && mate(i - 1) && mate(i) && keepMating(i) && winningNow) return "brilliant";                   // sac that keeps the mate

  // Great — an only-good move that capitalises on the opponent's mistake/blunder.
  if (!previousMiss && wasNotMateRel(0) && notMateRel && std[i] === "excellent"
    && (previousMistake || pStd(0) === "blunder")) return "great";

  if (isTop && _isCheckmate(i)) return "best";
  if (isTop) return "best";

  if (_isCheckmate(i)) return "excellent";
  if (!mate(i - 1) && mate(i) && winningNow) return "excellent";                                             // starts a mate
  if (mate(i - 1) && mate(i) && keepMating(i) && winningNow) return "excellent";                             // keeps the mate
  if (mate(i - 1) && mate(i) && !keepMating(i) && winningNow) return "good";                                 // delays own mate
  if (mate(i - 1) && mate(i) && advanceMate(i) && !winningNow) return "good";                                // being mated, unavoidable

  if (mate(i - 1) && !mate(i) && prevWinning) return "miss";                                                 // threw away a forced mate
  if (!previousMiss && notMateRel && (previousMistake || pStd(0) === "blunder")
    && (std[i] === "blunder" || std[i] === "inacc")
    && (loss[i] != null && pLoss(0) != null && loss[i] <= pLoss(0) + MT)) return "miss";                     // failed to punish

  if (notMateRel && std[i] === "inacc" && loss[i] >= ML && losingAdvAt(i)) return "mistake";                 // lost a clear advantage
  if (notMateRel && std[i] === "inacc" && loss[i] >= ML && givingAdvAt(i)) return "mistake";                 // handed over a clear advantage
  if (!mate(i - 1) && mate(i) && !winningNow && (evalFor(i - 1) ?? 0) > -CA) return "mistake";               // walked into a mate (wasn't already lost)
  if (!mate(i - 1) && mate(i) && !winningNow) return "blunder";                                              // walked into a mate
  if (mate(i - 1) && mate(i) && !winningNow && prevWinning) return "blunder";                                // threw a win straight into a mate

  // Split the medium-error band the way the expected-points model does: a 10–20% win-drop
  // is a Mistake, 5–10% an Inaccuracy. (Done only here, at the plain-move fallback, so the relational
  // great/miss chains above are untouched.) Threshold from calibration.json.
  if (std[i] === "inacc" && wpDrop && wpDrop[i] != null) {
    const mistWp = (typeof CALIB !== "undefined" && CALIB?.clsWp?.mistake) || 10;
    if (wpDrop[i] >= mistWp) return "mistake";
  }
  return std[i];   // plain excellent / good / inaccuracy / blunder
}
// Displayed (category-based) per-move accuracy from the category — the basis of the shown game
// accuracy. Best/Brilliant/Great/Book are always 100; the rest are tunable (Engine settings →
// Accuracy points). The Elo estimate keeps using the win%-based accuracy (sideAccuracies), not this.
function catAcc(cls) {
  switch (cls) {
    case "brilliant": case "great": case "best": case "book": return 100;
    case "excellent": return S.settings.accExcellent;
    case "good": return S.settings.accGood;
    case "inacc": return S.settings.accInacc;
    case "miss": return S.settings.accMiss;
    case "mistake": return S.settings.accMistake;
    case "blunder": return S.settings.accBlunder;
    default: return null;
  }
}
// Sacrifice/forced are functions of the board only (not the eval), so they're cached per ply for
// the whole analysis — computeDerived runs many times while the batch fills in, and isSacrifice is
// the one non-trivial cost here. Caches are reset whenever a new game's positions are built.
function _sacAt(i) {
  if (S._sacCache[i] !== undefined) return S._sacCache[i];
  const p = S.positions[i];
  let v = false;
  if (p && !p.promotion) v = isSacrifice({ before: S.positions[i - 1].fen, after: p.fen, color: p.color, captured: p.captured, from: p.from });
  S._sacCache[i] = v;
  return v;
}
function _forcedAt(i) {
  if (S._forcedCache[i] !== undefined) return S._forcedCache[i];
  let v = false;
  try { v = new Chess(S.positions[i - 1].fen).moves().length === 1; } catch {}
  S._forcedCache[i] = v;
  return v;
}
// Estimated ratings are reported in steps of 50, so we quantize to the NEAREST 50 (round-to-nearest
// keeps the average bias ~0; a ceiling would add a spurious ~+26 upward bias for nothing).
const round50 = (v) => Math.round(v / 50) * 50;
// Pure accuracy→Elo via linear interpolation between anchor points (fallback when no rating).
function estimateEloFromAcc(acc) {
  if (acc == null) return null;
  const A = ELO_ANCHORS;
  if (acc <= A[0][0]) return A[0][1];
  for (let i = 1; i < A.length; i++) {
    if (acc <= A[i][0]) {
      const [x0, y0] = A[i - 1], [x1, y1] = A[i];
      return round50(y0 + ((acc - x0) / (x1 - x0)) * (y1 - y0));
    }
  }
  return A[A.length - 1][1];
}
// Estimated game rating. A per-game rating estimate is NOT a pure function of accuracy — it
// correlates more with the player's ACTUAL rating (r=0.84) than with accuracy (r=0.71): the same
// accuracy maps to wildly different ratings depending on the level. So when the actual rating is
// known we use a 2-input model (actual rating + accuracy) fit to reference rating estimates
// (CV MAE ~156 vs ~495 for accuracy-only). Without a rating we fall back to the accuracy anchors.
function estimateElo(acc, rating) {
  if (acc == null) return null;
  const em = CALIB?.eloModel;
  const r = Number(rating);
  if (em?.on && Number.isFinite(r) && r > 0) {
    const v = em.a + em.b * r + em.c * acc;
    const lo = em.clampMin ?? 100, hi = em.clampMax ?? 3200;
    return round50(Math.max(lo, Math.min(hi, v)));
  }
  return estimateEloFromAcc(acc);
}

function computeDerived() {
  const N = S.total;
  S.classif = new Array(N + 1).fill(null);
  S.accMove = new Array(N + 1).fill(null);
  if (!S._sacCache || S._sacCache.length !== N + 1) { S._sacCache = new Array(N + 1).fill(undefined); S._forcedCache = new Array(N + 1).fill(undefined); }

  // Per-ply inputs for the ported classifier. The classifier only ever looks BACKWARDS, so one
  // forward pass to fill std/loss/sac/isTop is enough; a second pass assigns the final category.
  const std = new Array(N + 1).fill(null);
  const loss = new Array(N + 1).fill(null);
  const wpDrop = new Array(N + 1).fill(null); // win%-drop per ply ("expected points" basis)
  const sac = new Array(N + 1).fill(false);
  const isTop = new Array(N + 1).fill(false);
  const bookAt = new Array(N + 1).fill(false);

  // True book detection: a move is "book" if the position it leads to is in the opening book
  // (data/book.json). Alongside, the deepest named theory position gives the opening name.
  S.bookCount = 0;
  let bookOpening = null;
  for (let i = 1; i <= N; i++) {
    const bk = bookLookup(S.positions[i].fen);
    if (Array.isArray(bk)) bookOpening = { eco: bk[0], name: bk[1] };
    bookAt[i] = bk !== undefined;

    const mover = S.positions[i].color;
    const bestSearch = S.bests[i - 1];
    const before = S.evals[i - 1];

    // win%-based move accuracy (kept solely as the Elo estimate's input). With MultiPV=1 the played
    // move is rarely in the single line, so winAfter falls back to the after-position search —
    // i.e. the same consecutive-eval comparison the category logic uses.
    if (bestSearch && before) {
      const playedUci = (S.positions[i].from || "") + (S.positions[i].to || "") + (S.positions[i].promotion || "");
      const lines = bestSearch.lines || [];
      const winBefore = lines.length ? winPct(scoreToCp(lines[0].score)) : moverWin(before, mover);
      let winAfter = null;
      for (const ln of lines) { if ((ln.pv || "").split(" ")[0] === playedUci) { winAfter = winPct(scoreToCp(ln.score)); break; } }
      if (winAfter == null && S.evals[i]) winAfter = moverWin(S.evals[i], mover);
      if (winAfter != null) { S.accMove[i] = moveAccuracy(Math.max(0, winBefore - winAfter) * calAccMult(S.players[mover]?.rating)); wpDrop[i] = Math.max(0, winBefore - winAfter); }
      const bestUci = (bestSearch.bestmove || "").slice(0, 4);
      isTop[i] = !!bestUci && bestUci === playedUci.slice(0, 4);
    }

    loss[i] = _moveLoss(i);
    std[i] = getStandardRating(wpDrop[i]);   // bucket on win%-drop, not raw pawns
    sac[i] = _sacAt(i);
  }
  // Second pass: final category per ply (Brilliant-Chess logic). A move stays unlabelled until both
  // its own and the previous position's eval are in, so the panel fills in cleanly during analysis.
  for (let i = 1; i <= N; i++) {
    if (bookAt[i]) { S.classif[i] = "book"; S.bookCount++; continue; }
    if (S.evals[i] == null || S.evals[i - 1] == null) { S.classif[i] = null; continue; }
    S.classif[i] = classifyMove(i, S.positions[i].color, isTop[i], false, sac, std, loss, wpDrop);
  }
  // Opening name: prefer the book's clean name over the chess.com header's ECOUrl slug.
  S.opening = bookOpening || S.openingHeader;
  const eloAccs = sideAccuracies();   // win%-based accuracy → Elo (unchanged)
  for (const side of ["w", "b"]) {
    const counts = {}; QUALITY_ORDER.forEach((k) => (counts[k] = 0));
    const catScores = [];
    for (let i = 1; i <= N; i++) {
      if (S.positions[i].color !== side) continue;
      const c = S.classif[i];
      if (!c) continue;
      counts[c]++;
      const a = catAcc(c);
      if (a != null) catScores.push(a);
    }
    // Displayed accuracy: with calibration (display:"winpct") show the tuned win%-based number that
    // the tuner produces; otherwise the original category average. Elo keeps the win%-based accuracy.
    const catAvg = catScores.length ? catScores.reduce((a, b) => a + b, 0) / catScores.length : null;
    S.acc[side] = (CALIB?.display === "winpct") ? calAccBias(eloAccs[side], S.players[side]?.rating) : catAvg;
    S.accElo[side] = eloAccs[side];
    S.counts[side] = counts;
  }
  buildVerdict();
}
function buildVerdict() {
  const me = S.acc[S.meSide];
  if (me == null) { S.verdict = "Analyzing …"; return; }
  if (me >= 92) S.verdict = "Almost flawless game";
  else if (me >= 85) S.verdict = "Strong and solid play";
  else if (me >= 75) S.verdict = "Solid with a few wobbles";
  else if (me >= 60) S.verdict = "Uneven — room for improvement";
  else S.verdict = "Tough game — lots to learn from";
}

/* ---------------- Formatting ---------------- */
function evalText(score) {
  if (!score) return "–";
  if (score.mate != null) return (score.mate > 0 ? "#" : "#-") + Math.abs(score.mate);
  const v = (score.cp / 100).toFixed(1);
  return score.cp > 0 ? "+" + v : v;
}
function uciLineToSan(fen, uciMoves, maxPlies = 6) {
  const c = new Chess(fen); const out = [];
  let fm = parseInt(fen.split(" ")[5], 10) || 1;
  let white = fen.split(" ")[1] === "w";
  for (const u of uciMoves.slice(0, maxPlies)) {
    let mv;
    try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined }); }
    catch { break; }
    if (!mv) break;
    out.push(white ? `${fm}. ${mv.san}` : mv.san);
    if (!white) fm++;
    white = !white;
  }
  return out;
}

/* ===================================================================
   UI skeleton
   =================================================================== */
function buildUI() {
  const root = document.getElementById("root");
  root.innerHTML = "";

  const topbar = el("header", { class: "topbar" },
    el("div", { class: "brand" },
      el("div", { class: "brand-mark" }, el("img", { class: "brand-img", src: _url("pieces-img/cburnett/wN.svg"), alt: "" })),
      el("div", { class: "brand-name", html: 'Chess <span>/ Review</span>' }),
    ),
    el("div", { class: "topbar-meta", id: "meta" }),
    el("div", { class: "topbar-right" },
      // aria-label (not title) → keeps the buttons labelled for screen readers without the native
      // hover tooltip the user found unnecessary.
      el("button", { class: "icon-btn", "aria-label": "Flip board", onclick: toggleFlip }, icon("flip")),
      el("button", { class: "icon-btn", "aria-label": "Share game (copy link)", onclick: shareGame }, icon("share")),
      el("button", { class: "icon-btn", "aria-label": "Credits & attributions", onclick: openCredits }, icon("info")),
      el("button", { class: "icon-btn", "aria-label": "Settings", onclick: toggleSettings }, icon("gear")),
    ),
  );

  // board cluster (players + eval bar + board)
  const boardWrap = el("div", { class: "board-wrap", id: "boardWrap" });
  const playerTop = el("div", { id: "playerTop" });
  const playerBot = el("div", { id: "playerBot" });
  const controls = el("div", { class: "controls", id: "controls" });

  // moves panel skeleton (head + scroll body + foot)
  const movesBody = el("div", { class: "panel-body", id: "movesBody" });
  const movesCount = el("span", { class: "count", id: "movesCount" });
  const movesFoot = el("div", { class: "moves-foot", id: "movesFoot", hidden: true });
  const movesPanel = el("div", { class: "panel moves-panel" },
    el("div", { class: "panel-head" }, el("h3", {}, "Moves"), movesCount),
    movesBody, movesFoot,
  );

  const coachMount = el("div", { id: "coachMount", class: "coach-mount" });
  const evalbarMount = el("div", { id: "evalbarMount", class: "evalbar-mount" });
  const reviewMount = el("div", { id: "reviewMount" });
  const graphMount = el("div", { id: "graphMount" });
  const statsMount = el("div", { id: "statsMount" });
  const engineMount = el("div", { id: "engineMount" });

  // free canvas with movable/resizable modules
  const canvas = el("div", { class: "stage canvas", id: "canvas" },
    makeMod("board", playerTop, boardWrap, playerBot),
    makeMod("evalbar", evalbarMount),
    makeMod("controls", controls),
    makeMod("coach", coachMount),
    makeMod("review", reviewMount),
    makeMod("moves", movesPanel),
    makeMod("graph", graphMount),
    makeMod("accuracy", statsMount),
    makeMod("engine", engineMount),
  );

  const settings = el("div", { class: "settings-pop", id: "settings", hidden: true });

  // Library sidebar — a thin strip on the far left that slides open on hover (pure CSS :hover
  // on the rail, which also covers the panel since it's a descendant). Lives outside the canvas
  // so it overlays the board cluster without disturbing the movable-module layout.
  const libCount = el("span", { class: "count", id: "libCount" }, "0");
  const libControls = el("div", { class: "lib-controls", id: "libControls" });
  const libList = el("div", { class: "lib-list", id: "libList" });
  const libRail = el("aside", { class: "library-rail", id: "libraryRail" },
    el("div", { class: "lib-tab" }, icon("library"), el("span", { class: "lib-tab-txt" }, "Library")),
    el("div", { class: "lib-panel" },
      el("div", { class: "lib-head" }, el("h3", {}, "Your games"), libCount),
      libControls, libList),
  );
  // Close any open library dropdown when clicking elsewhere.
  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".lib-dd-field")) document.querySelectorAll(".lib-dd-field.open").forEach((d) => d.classList.remove("open"));
  });

  root.append(el("div", { class: "app" }, topbar, canvas, settings, libRail));

  UI = {
    meta: document.getElementById("meta"), settings, canvas, boardWrap,
    playerTop, playerBot, controls, coach: coachMount, evalbar: evalbarMount,
    review: reviewMount, movesBody, movesCount, movesFoot,
    graph: graphMount, stats: statsMount, engine: engineMount,
    libRail, libControls, libList, libCount,
  };

  applyLayout();
  growCanvas();
  initBoardInput();
  renderCoachAvatar();     // mount the animated coach portrait for the active personality
  renderLibrary();
  window.addEventListener("resize", () => { growCanvas(); alignPlayers(); });
}

/* ---------------- Loading indicator ----------------
   Selectable animation shown in place of the accuracy/elo number while Stockfish
   is still analyzing. The color is inherited from the parent (currentColor). */
function loaderNode(extraClass = "", color = null) {
  const variant = LOADERS[S.settings.loaderStyle] || "pulse";
  const props = { class: "ld ld-" + variant + (extraClass ? " " + extraClass : "") };
  if (color) props.style = { color };
  if (variant === "pulse")  return el("span", props, "•••");
  if (variant === "bounce") return el("span", props, el("i"), el("i"), el("i"));
  if (variant === "wave")   return el("span", props, el("i"), el("i"), el("i"), el("i"));
  return el("span", props); // spin (pure CSS ring)
}

/* ---------------- Movable modules (drag + resize + storage) ---------------- */
function makeMod(key, ...inner) {
  const handle = el("div", { class: "mod-handle", title: "Drag to move", html: HANDLE_SVG });
  const innerWrap = el("div", { class: "mod-inner" }, ...inner);
  // Three resize grips: east (width), south (height) and corner (both) — so the size
  // can be adjusted reliably in both directions on each axis.
  const gripE = el("div", { class: "mod-resize e", title: "Drag to change width" });
  const gripS = el("div", { class: "mod-resize s", title: "Drag to change height" });
  const gripSE = el("div", { class: "mod-resize se", title: "Drag to resize", html: GRIP_SVG });
  const mod = el("div", { class: "mod", "data-mod": key }, handle, innerWrap, gripE, gripS, gripSE);
  makeMovable(mod, handle, { e: gripE, s: gripS, se: gripSE }, key);
  return mod;
}
let _saveLayoutT = null;
// Persist the EXPANDED layout baseline. While the accuracy breakdown is collapsed, S.layout holds
// the shrunk geometry (accuracy panel shorter, modules below pulled up by `delta`). Saving that
// as-is would let the next boot's collapse subtract `delta` a second time, so each session the
// modules below Accuracy (e.g. the Engine panel) would creep upward. Adding the offset back before
// persisting keeps the stored baseline expanded, so the boot collapse subtracts `delta` exactly once.
function layoutForSave() {
  if (!S._accReflow) return S.layout;
  const { delta, belowKeys } = S._accReflow;
  const out = structuredClone(S.layout);
  if (out.accuracy) out.accuracy.h += delta;
  for (const k of belowKeys) if (out[k]) out[k].y += delta;
  return out;
}
function saveLayout() {
  clearTimeout(_saveLayoutT);
  _saveLayoutT = setTimeout(() => chrome.storage.local.set({ layout: layoutForSave(), layoutVersion: LAYOUT_VERSION }), 250);
}
function applyLayout() {
  for (const mod of UI.canvas.querySelectorAll(".mod")) {
    const b = S.layout[mod.getAttribute("data-mod")];
    if (!b) continue;
    mod.style.left = b.x + "px"; mod.style.top = b.y + "px";
    mod.style.width = b.w + "px"; mod.style.height = b.h + "px";
  }
}
function growCanvas() {
  let maxB = 600, maxR = 600;
  for (const b of Object.values(S.layout)) { maxB = Math.max(maxB, b.y + b.h); maxR = Math.max(maxR, b.x + b.w); }
  UI.canvas.style.minHeight = maxB + 24 + "px";
  UI.canvas.style.minWidth = maxR + 24 + "px";
}
// Keep the Accuracy module and everything stacked below it glued together when the category list
// expands/collapses. The default layout (and any saved one) is sized for the EXPANDED list, so
// that's the baseline: collapsing SHRINKS the module by the hidden rows' height and pulls every
// module below it up by the same amount (constant gap); expanding restores it. Not persisted, so
// the saved baseline stays the expanded one.
function reflowAccuracy(expanded) {
  const accMod = UI.canvas && UI.canvas.querySelector('.mod[data-mod="accuracy"]');
  if (!accMod) return;
  const acc = S.layout.accuracy; if (!acc) return;
  // All modules in the same column sitting at/below the accuracy panel's bottom edge.
  const below = () => {
    const keys = [];
    for (const [k, o] of Object.entries(S.layout)) {
      if (k === "accuracy") continue;
      const overlapX = o.x < acc.x + acc.w && o.x + o.w > acc.x;
      if (overlapX && o.y >= acc.y + acc.h - 1) keys.push(k);
    }
    return keys;
  };
  if (!expanded && !S._accReflow) {
    // Collapse: measure one row (+ the column row-gap) to know what the hidden rows were worth.
    const row = accMod.querySelector(".qbreak-row");
    const qb = accMod.querySelector(".qbreak");
    const gap = qb ? (parseFloat(getComputedStyle(qb).rowGap) || 0) : 0;
    const rowH = row ? row.offsetHeight : 24;
    const delta = Math.round((QBREAK_FULL.length - QBREAK_SUMMARY.length) * (rowH + gap));
    const belowKeys = below();
    acc.h = Math.max(MINH, acc.h - delta);
    for (const k of belowKeys) S.layout[k].y = Math.max(0, S.layout[k].y - delta);
    S._accReflow = { delta, belowKeys };
  } else if (expanded && S._accReflow) {
    // Expand: restore the panel's height and push the same modules back down.
    const { delta, belowKeys } = S._accReflow;
    acc.h += delta;
    for (const k of belowKeys) if (S.layout[k]) S.layout[k].y += delta;
    S._accReflow = null;
  }
  applyLayout(); growCanvas();
}
// Snap only to a fine grid — no magnetic pull toward neighbor modules' edges, so a panel goes
// exactly where you drop it. The 2px grid just avoids sub-pixel positions.
function snapGrid(v) { return Math.round(v / GRID) * GRID; }
function snapDrag(b) {
  return { x: Math.max(0, snapGrid(b.x)), y: Math.max(0, snapGrid(b.y)) };
}
function snapResize(b, mw = MINW) {
  return { w: Math.max(mw, snapGrid(b.w)), h: Math.max(MINH, snapGrid(b.h)) };
}
function makeMovable(mod, handle, grips, key) {
  // Move the module (drag the handle in the top-left).
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    const b = S.layout[key];
    const sx = e.clientX, sy = e.clientY, ox = b.x, oy = b.y;
    try { handle.setPointerCapture(e.pointerId); } catch {}
    mod.classList.add("dragging");
    const move = (ev) => {
      const s = snapDrag({ x: Math.max(0, ox + (ev.clientX - sx)), y: Math.max(0, oy + (ev.clientY - sy)), w: b.w, h: b.h });
      b.x = s.x; b.y = s.y;
      mod.style.left = b.x + "px"; mod.style.top = b.y + "px";
    };
    const up = (ev) => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      try { handle.releasePointerCapture(ev.pointerId); } catch {}
      const s = snapDrag({ x: b.x, y: b.y, w: b.w, h: b.h }); // settle on the grid
      b.x = s.x; b.y = s.y;
      mod.style.left = b.x + "px"; mod.style.top = b.y + "px";
      mod.classList.remove("dragging");
      growCanvas(); saveLayout();
      if (key === "board") alignPlayers();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
  // Resize. dir = "e" (width), "s" (height) or "se" (both).
  const startResize = (dir, gripEl) => (e) => {
    e.preventDefault(); e.stopPropagation();
    const b = S.layout[key];
    const sx = e.clientX, sy = e.clientY, ow = b.w, oh = b.h;
    try { gripEl.setPointerCapture(e.pointerId); } catch {} // reliable tracking even over the board/other modules
    mod.classList.add("resizing");
    const apply = (ev) => {
      const w = dir.includes("e") ? Math.max(modMinW(key), ow + (ev.clientX - sx)) : ow;
      const h = dir.includes("s") ? Math.max(MINH, oh + (ev.clientY - sy)) : oh;
      const s = snapResize({ x: b.x, y: b.y, w, h }, modMinW(key));
      if (dir.includes("e")) { b.w = s.w; mod.style.width = b.w + "px"; }
      if (dir.includes("s")) { b.h = s.h; mod.style.height = b.h + "px"; }
      if (key === "board") alignPlayers();
    };
    const move = (ev) => apply(ev);
    const up = (ev) => {
      gripEl.removeEventListener("pointermove", move);
      gripEl.removeEventListener("pointerup", up);
      try { gripEl.releasePointerCapture(ev.pointerId); } catch {}
      apply(ev); // settle on the grid
      mod.classList.remove("resizing");
      growCanvas(); saveLayout();
      if (key === "board") alignPlayers();
    };
    gripEl.addEventListener("pointermove", move);
    gripEl.addEventListener("pointerup", up);
  };
  grips.e.addEventListener("pointerdown", startResize("e", grips.e));
  grips.s.addEventListener("pointerdown", startResize("s", grips.s));
  grips.se.addEventListener("pointerdown", startResize("se", grips.se));
}
function resetLayout() {
  S._accReflow = null;   // drop any collapse offset so the fresh layout isn't double-adjusted
  S.layout = structuredClone(DEFAULT_LAYOUT);
  applyLayout(); growCanvas();
  if (!S.qbreakExpanded) reflowAccuracy(false);   // keep modules tight under the collapsed breakdown
  saveLayout();   // persists the expanded baseline via layoutForSave()
}
// Reorganize mode: while ON, panels can be dragged/resized (handles + grips appear); while OFF
// they're locked and hover shows nothing. The arranged layout auto-saves and persists.
function toggleReorganize() {
  S.reorganize = !S.reorganize;
  UI.canvas.classList.toggle("reorganizing", S.reorganize);
  if (S.reorganize && UI.settings) UI.settings.hidden = true; // move the settings panel out of the way
  renderReorgBanner();
  if (UI.settings && !UI.settings.hidden) renderSettings();   // refresh the button label if open
}
function renderReorgBanner() {
  let b = document.querySelector(".reorg-banner");
  if (!S.reorganize) { if (b) b.remove(); return; }
  if (b) return;
  // Just a "Done" button to leave reorganize mode — dragging the handle / edges is self-explanatory,
  // so no instruction bar. (Settings is hidden while reorganizing, so this is the way back out.)
  b = el("div", { class: "reorg-banner" },
    el("button", { class: "reorg-done", onclick: toggleReorganize }, "Done"),
  );
  document.body.append(b);
}

/* ---------------- Board ---------------- */
function makePiece(type, side) {
  // Only the two bundled SVG sets remain (Cburnett = "image", Merida); anything else → default set.
  const setFolder = BUNDLED_PIECE_SETS[S.settings.pieceStyle] || BUNDLED_PIECE_SETS.image;
  const code = (side === "w" ? "w" : "b") + type.toUpperCase(); // wK, bN …
  return el("img", { class: "piece-img", src: _url(`pieces-img/${setFolder}/${code}.svg`), alt: "", draggable: "false" });
}
function buildBoard() {
  const files = ["a","b","c","d","e","f","g","h"];
  const ranks = [8,7,6,5,4,3,2,1];
  const rowOrder = S.flipped ? [...ranks].reverse() : ranks;
  const colOrder = S.flipped ? [...files].reverse() : files;
  const board = el("div", { class: "board ps-" + S.settings.pieceStyle });
  sqByName = {};
  rowOrder.forEach((rank, ri) => {
    colOrder.forEach((file, ci) => {
      const name = file + rank;
      const rIdx = 8 - rank, cIdx = files.indexOf(file);
      const light = (rIdx + cIdx) % 2 === 0;
      const sq = el("div", { class: "sq " + (light ? "light" : "dark") + (ri === 0 ? " top-row" : "") + (ci === colOrder.length - 1 ? " right-col" : "") });
      if (ci === 0) sq.append(el("span", { class: "coord rank" }, rank));
      if (ri === rowOrder.length - 1) sq.append(el("span", { class: "coord file" }, file));
      sqByName[name] = sq;
      board.append(sq);
    });
  });
  const existing = UI.boardWrap.querySelector(".board");
  if (existing) existing.replaceWith(board);
  else UI.boardWrap.append(board);
  applyBoardArt(board);
  paintBoard();
}
function paintBoard() {
  const pos = activePos();
  const boardEl = UI.boardWrap.querySelector(".board");
  if (boardEl) boardEl.classList.toggle("analysis", S.analysisMode);
  const rows = pos.fen.split(" ")[0].split("/");
  const occ = {};
  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const ch of rows[r]) { if (/\d/.test(ch)) c += +ch; else { occ["abcdefgh"[c] + (8 - r)] = ch; c++; } }
  }
  // In practice the board stays clean: the solve position shows no last-move highlight, and NO
  // move is categorized except the actual mistake being practiced (S.idx = solvePos+1, shown
  // during the slow replay). This keeps the board from hinting anything while you think.
  const solvePly = S.practice ? S.practice.spots[S.practice.i] - 1 : -1;
  const clean = !!S.practice && S.idx === solvePly;
  const showCat = !S.practice || S.idx === solvePly + 1;
  const hl = clean ? new Set() : new Set([pos.from, pos.to].filter(Boolean));
  // Variation moves aren't classified either.
  const cls = (S.analysisMode || !showCat) ? null : S.classif[S.idx];
  // The from/to squares are tinted with the classification color (chess.com style) at 0.5 alpha;
  // without a classification we fall back to the neutral yellow highlight.
  const tint = cls && QUALITY[cls]
    ? `color-mix(in srgb, ${QUALITY[cls].color} 50%, transparent)`
    : null;
  for (const [name, sq] of Object.entries(sqByName)) {
    sq.querySelectorAll(".piece, .piece-svg, .piece-img, .sq-badge").forEach((n) => n.remove());
    const isHl = hl.has(name);
    sq.classList.toggle("hl", isHl);
    sq.classList.toggle("has-badge", name === pos.to && !!(cls && QUALITY[cls]));
    if (isHl && tint) sq.style.setProperty("--hl-color", tint);
    else sq.style.removeProperty("--hl-color");
    const ch = occ[name];
    if (ch) sq.append(makePiece(ch.toUpperCase(), ch === ch.toUpperCase() ? "w" : "b"));
    if (name === pos.to && cls && QUALITY[cls]) {
      sq.append(el("img", { class: "sq-badge", src: qIcon(cls), alt: QUALITY[cls].name, draggable: "false" }));
    }
  }
  renderBestArrow();
  renderUserArrows();
  renderThreatArrow();
  renderUserMarks();
  renderSelection();
  renderPracticeHint();
}

/* ---------------- Best-move arrow ----------------
   Geometry engine ported from "Chess Move Arrow.html". Coordinate space: an 8×8 SVG
   with viewBox "0 0 8 8" placed exactly over the board. Square center = (file+0.5, rank+0.5).
   Respects S.flipped, so the arrow turns with the board. */
function arrowXY(sq) {
  const f = sq.charCodeAt(0) - 97;          // a..h -> 0..7
  const r = parseInt(sq.slice(1), 10) - 1;  // 1..8 -> 0..7
  return S.flipped
    ? { x: (7 - f) + 0.5, y: r + 0.5 }      // black at the bottom
    : { x: f + 0.5, y: (7 - r) + 0.5 };     // white at the bottom
}
function arrowIsKnight(a, b) {
  const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
  return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
}
function arrowWaypoints(a, b) {
  if (!arrowIsKnight(a, b)) return [a, b];
  // Knight: go the LONG axis (the side with length 2) first, then a 90° elbow.
  const longHorizontal = Math.abs(b.x - a.x) === 2;
  const elbow = longHorizontal ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
  return [a, elbow, b];
}
function arrowBuild(pts, headLen, headHalf) {
  const n = pts.length;
  const tip = pts[n - 1], prev = pts[n - 2];
  const dx = tip.x - prev.x, dy = tip.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;                  // direction of the last leg
  const base = { x: tip.x - ux * headLen, y: tip.y - uy * headLen };
  const shaft = pts.slice(0, n - 1).concat([base]);
  const nx = -uy, ny = ux;                             // perpendicular
  const head = [
    { x: base.x + nx * headHalf, y: base.y + ny * headHalf },
    { x: base.x - nx * headHalf, y: base.y - ny * headHalf },
    tip,
  ];
  return { shaft, head };
}
const arrowFmt = (p) => `${+p.x.toFixed(4)},${+p.y.toFixed(4)}`;
function renderBestArrow() {
  const board = UI.boardWrap.querySelector(".board");
  if (!board) return;
  let svg = board.querySelector("svg.best-arrow");
  // While a clicked engine line auto-plays, hide the arrow — its per-position best move often
  // diverges from the line being shown (especially deeper in), which is misleading.
  if (S.lineWalking) { if (svg) svg.remove(); return; }
  // During mistake practice the arrow would give the answer away → hide it.
  if (S.practice) { if (svg) svg.remove(); return; }
  // If the user played the best move themselves (Best/Great/Brilliant), the arrow is redundant;
  // on a Book move it's meaningless (it's opening theory, not a single "best" move) — so the
  // arrow isn't shown on the mainline for any of those classifications.
  const cls = (!S.analysisMode && S.idx > 0) ? S.classif[S.idx] : null;
  if (cls === "best" || cls === "great" || cls === "brilliant" || cls === "book") { if (svg) svg.remove(); return; }
  // On the mainline: the best move in the position BEFORE the current one (the alternative to
  // the played move). In analysis mode: the current position's best move (live). See activeBest().
  const best = activeBest();
  const uci = S.settings.bestArrow && best ? best.bestmove : null;
  if (!uci || uci.length < 4) { if (svg) svg.remove(); return; }
  const a = arrowXY(uci.slice(0, 2)), b = arrowXY(uci.slice(2, 4));
  const headLen = S.settings.arrowHead;
  const headHalf = headLen * 0.70;                     // full head width ≈ 1.4× the length
  const { shaft, head } = arrowBuild(arrowWaypoints(a, b), headLen, headHalf);
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "best-arrow");
    svg.setAttribute("viewBox", "0 0 8 8");
    svg.setAttribute("preserveAspectRatio", "none");
    board.append(svg);
  }
  // Group opacity flattens shaft+head together BEFORE fading — no double-alpha seam.
  svg.innerHTML =
    `<g fill="${ARROW_COLOR}" opacity="${S.settings.arrowOpacity}">`
    + `<polyline points="${shaft.map(arrowFmt).join(" ")}" fill="none" stroke="${ARROW_COLOR}" `
    + `stroke-width="${S.settings.arrowShaft}" stroke-linejoin="round" stroke-linecap="butt"/>`
    + `<polygon points="${head.map(arrowFmt).join(" ")}" stroke="none"/></g>`;
}

/* ---------------- User arrows + square marking (analysis) ----------------
   The user marks/draws on the board with the RIGHT mouse button (like chess.com/lichess):
   • right-click + drag  → arrow (knight moves in an L-shape via the same geometry as the
     best-move arrow; same style settings opacity/shaft/head, just yellow/orange).
   • right-click on a single square (no drag) → mark the square (red tint, --mc-marked).
   Arrows/marks toggle by repeating the same action, are all cleared by a left-click
   on the board, and reset automatically when you change moves. */
function squareFromEvent(e) {
  const board = UI.boardWrap.querySelector(".board");
  if (!board) return null;
  const r = board.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  if (x < 0 || y < 0 || x >= r.width || y >= r.height) return null;
  const col = Math.max(0, Math.min(7, Math.floor(x / (r.width / 8))));
  const row = Math.max(0, Math.min(7, Math.floor(y / (r.height / 8))));
  const files = ["a","b","c","d","e","f","g","h"];
  const ranks = [8,7,6,5,4,3,2,1];
  const file = (S.flipped ? [...files].reverse() : files)[col];
  const rank = (S.flipped ? [...ranks].reverse() : ranks)[row];
  return file + rank;
}
function toggleUserArrow(from, to) {
  if (!from || !to || from === to) return;
  const i = S.userArrows.findIndex((a) => a.from === from && a.to === to);
  if (i >= 0) S.userArrows.splice(i, 1);   // same arrow again → remove it
  else S.userArrows.push({ from, to });
  renderUserArrows();
}
// preview: temporary arrow during dragging (drawn on top of the saved ones).
function renderUserArrows(preview) {
  const board = UI.boardWrap.querySelector(".board");
  if (!board) return;
  let svg = board.querySelector("svg.user-arrows");
  const arrows = preview ? S.userArrows.concat([preview]) : S.userArrows;
  if (!arrows.length) { if (svg) svg.remove(); return; }
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "user-arrows");
    svg.setAttribute("viewBox", "0 0 8 8");
    svg.setAttribute("preserveAspectRatio", "none");
    board.append(svg);
  }
  const headLen = S.settings.arrowHead;
  const headHalf = headLen * 0.70;
  svg.innerHTML = arrows.map((ar) => {
    const a = arrowXY(ar.from), b = arrowXY(ar.to);
    const { shaft, head } = arrowBuild(arrowWaypoints(a, b), headLen, headHalf);
    return `<g fill="${USER_ARROW_COLOR}" opacity="${S.settings.arrowOpacity}">`
      + `<polyline points="${shaft.map(arrowFmt).join(" ")}" fill="none" stroke="${USER_ARROW_COLOR}" `
      + `stroke-width="${S.settings.arrowShaft}" stroke-linejoin="round" stroke-linecap="butt"/>`
      + `<polygon points="${head.map(arrowFmt).join(" ")}" stroke="none"/></g>`;
  }).join("");
}
function refreshArrows() { renderBestArrow(); renderUserArrows(); renderThreatArrow(); }
// Create a ready Engine, trying the user's chosen build first and then falling back DOWN the
// strength chain (nnue → wasm → asm) if it can't load. Every build is bundled, so a fallback never
// needs the network. The build that actually started is recorded in S.activeEngineBuild so the
// Engine tab reflects what's really running — essential if e.g. NNUE ever stops working. `opts` are
// the UCI options (Hash / Skill Level); applying them also awaits the handshake, which now REJECTS
// on a dead build (timeout / worker error) instead of hanging forever.
let _engineFellBack = false; // warn once per page if we ever leave the preferred build
async function createEngine(opts = {}) {
  const preferred = ENGINE_BUILDS[S.settings.enginePath] ? S.settings.enginePath : "nnue";
  // Preferred build first, then the remaining builds in fixed strongest→weakest order (no repeats).
  const order = [preferred, ...ENGINE_FALLBACK_ORDER.filter((k) => k !== preferred)];
  let lastErr = null;
  for (const key of order) {
    const eng = new Engine(ENGINE_BUILDS[key]);
    try {
      await eng.setOptions(opts); // awaits the handshake; throws if this build failed to load
      eng.buildKey = key;
      setActiveEngineBuild(key);
      if (key !== preferred && !_engineFellBack) {
        _engineFellBack = true;
        console.warn(`[Chess Review] engine build '${preferred}' failed to load — fell back to '${key}'. ` +
          `The Engine tab now shows the build that's actually running.`);
      }
      return eng;
    } catch (e) {
      lastErr = e;
      try { eng.terminate(); } catch {}
    }
  }
  throw lastErr || new Error("No Stockfish build could be started.");
}
// Record (and surface) which build is actually running. Re-render the spots that name the engine so
// a fallback is visible immediately, both in the live Engine panel and the settings Build row.
function setActiveEngineBuild(key) {
  if (S.activeEngineBuild === key) return;
  S.activeEngineBuild = key;
  try { renderEngineCurrent(); } catch {}
  if (UI.settings && !UI.settings.hidden && S.settingsTab === "engine") { try { renderSettings(); } catch {} }
}
// The build name to display: what's actually running if known, else the user's selection.
function activeEngineName() {
  const key = S.activeEngineBuild || S.settings.enginePath;
  const name = ENGINE_NAME[key] || "Stockfish";
  // Flag a fallback explicitly so it's obvious the chosen build isn't the one in use.
  return (S.activeEngineBuild && S.activeEngineBuild !== S.settings.enginePath) ? `${name} (fallback)` : name;
}

// Shared on-demand engine for the lightweight extras (threat preview + practice judging),
// kept separate from the analysis batch + the analysis-mode live engine.
async function getHelperEngine() {
  if (!S.helperEngine) {
    S.helperEngine = await createEngine({ Hash: S.settings.engineHash, "Skill Level": S.settings.engineSkill });
  }
  return S.helperEngine;
}
// FEN with the OPPONENT (the side that isn't yours) to move: if it's already their turn this is
// the position itself (their best reply); otherwise it's a "pass" (null move) — what they'd play
// if it were their turn, i.e. the threat against the move you just made.
function threatFen(fen) {
  const opp = S.meSide === "w" ? "b" : "w";
  const p = fen.split(" ");
  if (p[1] === opp) return fen;
  p[1] = opp;
  p[3] = "-"; // en-passant target is no longer valid after a "pass"
  return p.join(" ");
}
// "Show the threat": draw the opponent's best move (as if it were their turn) as a yellow arrow.
let _threatToken = 0;
async function renderThreatArrow() {
  const board = UI.boardWrap.querySelector(".board");
  if (!board) return;
  let svg = board.querySelector("svg.threat-arrow");
  const clear = () => { if (svg) svg.remove(); };
  // Off, mid-analysis, during a line walk or practice → no threat arrow.
  if (!S.settings.showThreat || S.analyzing || S.lineWalking || S.practice) { clear(); return; }
  const fen = activePos().fen;
  if (terminalScore(fen)) { clear(); return; }
  let uci = S.threatCache.get(fen);
  if (uci === undefined) {
    const token = ++_threatToken;
    let eng; try { eng = await getHelperEngine(); } catch { return; }
    if (token !== _threatToken) return;
    eng.stop();
    let res; try { res = await eng.analyse(threatFen(fen), Math.min(14, S.settings.engineDepth), 1); } catch { return; }
    if (token !== _threatToken) return;
    uci = res && res.bestmove ? res.bestmove : null;
    S.threatCache.set(fen, uci);
    if (activePos().fen !== fen) return;          // position changed while we searched
    svg = board.querySelector("svg.threat-arrow"); // (board may have been rebuilt)
  }
  if (!uci || uci.length < 4) { clear(); return; }
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "threat-arrow");
    svg.setAttribute("viewBox", "0 0 8 8");
    svg.setAttribute("preserveAspectRatio", "none");
    board.append(svg);
  }
  const a = arrowXY(uci.slice(0, 2)), b = arrowXY(uci.slice(2, 4));
  const headLen = S.settings.arrowHead, headHalf = headLen * 0.70;
  const { shaft, head } = arrowBuild(arrowWaypoints(a, b), headLen, headHalf);
  svg.innerHTML = `<g fill="${USER_ARROW_COLOR}" opacity="${S.settings.arrowOpacity}">`
    + `<polyline points="${shaft.map(arrowFmt).join(" ")}" fill="none" stroke="${USER_ARROW_COLOR}" `
    + `stroke-width="${S.settings.arrowShaft}" stroke-linejoin="round" stroke-linecap="butt"/>`
    + `<polygon points="${head.map(arrowFmt).join(" ")}" stroke="none"/></g>`;
}
// Single-square marking (red tint). Toggles on repeated right-click on the same square.
function toggleMark(sq) {
  if (!sq) return;
  const i = S.userMarks.indexOf(sq);
  if (i >= 0) S.userMarks.splice(i, 1);
  else S.userMarks.push(sq);
  renderUserMarks();
}
function renderUserMarks() {
  for (const [name, sq] of Object.entries(sqByName)) {
    const on = S.userMarks.includes(name);
    sq.classList.toggle("marked", on);
  }
}
// Clear all user arrows and marks (e.g. on left-click or move change).
function clearUserMarkup() {
  let changed = false;
  if (S.userArrows.length) { S.userArrows = []; changed = true; }
  if (S.userMarks.length) { S.userMarks = []; changed = true; }
  if (changed) { renderUserArrows(); renderUserMarks(); }
}
/* ---------------- Legal moves + piece selection (analysis mode) ---------------- */
function sideToMove(fen) { return fen.split(" ")[1]; }
function pieceOn(fen, sq) { try { return new Chess(fen).get(sq) || null; } catch { return null; } }
function legalTargets(fen, sq) {
  try { return new Chess(fen).moves({ square: sq, verbose: true }); } catch { return []; }
}
function isLegalTarget(fen, from, to) {
  return legalTargets(fen, from).some((m) => m.to === to);
}
// Draw the selected piece + legal target squares (dot / capture ring).
function renderSelection() {
  for (const sq of Object.values(sqByName)) sq.classList.remove("sel", "legal", "legal-cap");
  const from = S.selectedSq;
  if (!from || !sqByName[from]) return;
  sqByName[from].classList.add("sel");
  for (const m of legalTargets(activePos().fen, from)) {
    const t = sqByName[m.to]; if (!t) continue;
    t.classList.add(m.captured || m.flags.includes("e") ? "legal-cap" : "legal");
  }
}

/* ---------------- Board input: moves (click + drag) + right-click arrows/marks ---------------- */
function initBoardInput() {
  const wrap = UI.boardWrap;
  wrap.addEventListener("contextmenu", (e) => e.preventDefault());
  // Never let the browser start its own image/element drag on the board (the stray ghost image).
  wrap.addEventListener("dragstart", (e) => e.preventDefault());
  wrap.addEventListener("pointerdown", (e) => {
    if (e.button === 2) { rightPointerDown(e); return; }
    if (e.button !== 0) return;
    // During practice the board only accepts moves while you're actively solving (not while it's
    // rolling to the next mistake or checking your answer).
    if (S.practice && (!S.practice.solving || S.practice.busy)) { e.preventDefault(); return; }
    // Any left-click clears the user's own arrows and square marks.
    clearUserMarkup();
    const sq = squareFromEvent(e);
    const fen = activePos().fen;
    const pc = sq ? pieceOn(fen, sq) : null;
    const own = pc && pc.color === sideToMove(fen);
    // 1) click-to-move: a piece is selected and this is a legal target
    if (sq && S.selectedSq && sq !== S.selectedSq && isLegalTarget(fen, S.selectedSq, sq)) {
      const from = S.selectedSq; S.selectedSq = null;
      e.preventDefault(); applyUserMove(from, sq); return;
    }
    // 2) grab a piece → lift it with a drag ghost (also takes over from an auto best-move walk).
    //    Your own piece gets selected (legal-move dots + click-to-move). A wrong-side piece can
    //    still be picked up and dragged, but it has no legal moves — so releasing it does nothing
    //    and the piece snaps back, signalling that it's not that side's turn. preventDefault also
    //    stops the browser's own image-drag (the stray "ghost image" you could drag off the board).
    if (sq && pc) {
      e.preventDefault();
      stopLineWalk();
      if (own) { S.selectedSq = sq; renderSelection(); }
      else { S.selectedSq = null; renderSelection(); }
      startDrag(e, sq);
      return;
    }
    // 3) otherwise: deselect (arrows/marks already cleared above)
    S.selectedSq = null; renderSelection();
  });
}
function rightPointerDown(e) {
  const from = squareFromEvent(e);
  if (!from) return;
  e.preventDefault();
  // No live preview during the drag: the arrow is only drawn when the user releases
  // (i.e. once the decision about where the arrow should point has been made).
  const up = (ev) => {
    window.removeEventListener("pointerup", up);
    const sq = squareFromEvent(ev);
    if (sq && sq !== from) toggleUserArrow(from, sq);   // drag → arrow
    else if (sq === from) toggleMark(from);             // click on a single square → mark
  };
  window.addEventListener("pointerup", up);
}
// Drag: a floating piece clone follows the mouse; release on a legal square → move.
function startDrag(e, from) {
  const board = UI.boardWrap.querySelector(".board");
  if (!board) return;
  const cell = board.getBoundingClientRect().width / 8;
  const orig = sqByName[from] && sqByName[from].querySelector(".piece, .piece-svg, .piece-img");
  const ghost = el("div", { class: "drag-piece ps-" + S.settings.pieceStyle });
  if (orig) ghost.append(orig.cloneNode(true));
  ghost.style.width = ghost.style.height = cell + "px";
  document.body.append(ghost);
  const place = (ev) => { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; };
  place(e);
  if (orig) orig.style.visibility = "hidden";
  let moved = false, lastHover = null, done = false;
  const setHover = (sq) => {
    if (lastHover && sqByName[lastHover]) sqByName[lastHover].classList.remove("drag-over");
    if (sq && sqByName[sq] && isLegalTarget(activePos().fen, from, sq)) { sqByName[sq].classList.add("drag-over"); lastHover = sq; }
    else lastHover = null;
  };
  // Shared cleanup (idempotent): remove listeners + ghost, show the original piece again.
  const finish = () => {
    if (done) return; done = true;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("contextmenu", onCtx);
    ghost.remove();
    if (orig) orig.style.visibility = "";
    if (lastHover && sqByName[lastHover]) sqByName[lastHover].classList.remove("drag-over");
  };
  // Cancel: put the piece back where it was picked up, and deselect.
  const cancel = () => { if (done) return; finish(); S.selectedSq = null; renderSelection(); };
  // Right-click while dragging → cancel (both via contextmenu and the button bitmask).
  const onCtx = (ev) => { ev.preventDefault(); cancel(); };
  const move = (ev) => {
    if (ev.buttons & 2) { cancel(); return; }
    moved = true; place(ev); setHover(squareFromEvent(ev));
  };
  const up = (ev) => {
    if (done) return;                 // already cancelled via right-click
    finish();
    const target = squareFromEvent(ev);
    if (moved) {
      if (target && target !== from && isLegalTarget(activePos().fen, from, target)) {
        S.selectedSq = null; applyUserMove(from, target, false);   // drag → no animation
      } else { S.selectedSq = null; renderSelection(); }   // drag without a legal target → deselect
    }
    // pure click (not moved) → keep the selection for click-to-move
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("contextmenu", onCtx);
}

/* ---------------- Analysis mode: moves, variations, live engine ---------------- */
function playSanSound(san) {
  if (!S.settings.sound) return;
  playEvent(sanSound(san));
}
// Make a user move from the shown position. Starts/extends a variation (analysis mode),
// unless the move on the mainline is simply the next mainline move.
function applyUserMove(from, to, animate = true) {
  // During mistake practice a move is an answer attempt, not a variation — route it there.
  if (S.practice) { if (S.practice.solving && !S.practice.busy) practiceAttempt(from, to); return; }
  stopLineWalk();
  const fen = activePos().fen;
  let c, mv;
  try { c = new Chess(fen); mv = c.move({ from, to, promotion: "q" }); } catch { mv = null; }
  if (!mv) { S.selectedSq = null; renderSelection(); return; }
  const node = { fen: c.fen(), san: mv.san, from: mv.from, to: mv.to, color: mv.color, eval: null, best: null };
  if (!S.analysisMode) {
    // On the mainline (and only if the position is analyzed): if the move matches the next
    // mainline move, just stay on the mainline.
    const nextMain = S.positions[S.idx + 1];
    const reachable = !S.analyzing || S.idx < S.progress;
    if (reachable && nextMain && nextMain.from === from && nextMain.to === to) {
      S.selectedSq = null; go(S.idx + 1); return;
    }
    S.variation = { branchIdx: S.idx, positions: [{ fen: S.positions[S.idx].fen, san: null }, node], idx: 1 };
    S.analysisMode = true;
  } else {
    const v = S.variation;
    v.positions = v.positions.slice(0, v.idx + 1);   // truncate on a new branch
    v.positions.push(node);
    v.idx = v.positions.length - 1;
  }
  S.selectedSq = null;
  playSanSound(mv.san);
  paintBoard();
  // On drag the piece is already where you released it — so no slide animation
  // (otherwise it "jumps" back to the start square and slides forward again).
  if (animate && S.settings.moveAnim) animateMove(from, to);
  renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
  requestLiveEval();
}
// Click an engine line → play the whole PV out as a variation from the shown position.
function playLine(pv) {
  const ucis = (pv || "").split(/\s+/).filter(Boolean);
  if (!ucis.length) return;
  if (!S.analysisMode) {
    S.variation = { branchIdx: S.idx, positions: [{ fen: activePos().fen, san: null }], idx: 0 };
    S.analysisMode = true;
  } else {
    const v = S.variation;
    v.positions = v.positions.slice(0, v.idx + 1);
  }
  const v = S.variation;
  const startIdx = v.idx; // the position the user was on when the line was clicked
  let c; try { c = new Chess(v.positions[v.idx].fen); } catch { return; }
  for (const u of ucis) {
    let mv; try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || "q" }); } catch { mv = null; }
    if (!mv) break;
    v.positions.push({ fen: c.fen(), san: mv.san, from: mv.from, to: mv.to, color: mv.color, eval: null, best: null });
  }
  // Start just one move into the line (not at the end) — the rest plays out automatically.
  v.idx = Math.min(startIdx + 1, v.positions.length - 1);
  S.selectedSq = null;
  // No best-move arrow while a clicked line plays out: the engine's best move for each position
  // often differs from the line's next move (the PV tail is unreliable), which is confusing.
  S.lineWalking = true;
  playSanSound(v.positions[v.idx].san);
  paintBoard();
  renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
  requestLiveEval();
  startLineWalk();   // auto-step through the rest of the line (~2 s per move)
}
// Automatic walkthrough of the clicked engine line. Steps one move forward every
// LINE_WALK_MS until the end of the variation. Any manual navigation (keyboard,
// the on-screen buttons, board moves, exiting analysis) calls stopLineWalk(), so the
// walkthrough halts right where the user took over.
const LINE_WALK_MS = 2000;
function stopLineWalk() {
  if (S.lineWalkTimer) { clearTimeout(S.lineWalkTimer); S.lineWalkTimer = null; }
  S.lineWalking = false;   // user took over → best-move arrow allowed again
  stopBestWalk();
}
function startLineWalk() {
  stopLineWalk();
  S.lineWalking = true;    // suppress the best-move arrow for the auto-played line moves
  const tick = () => {
    S.lineWalkTimer = null;
    const v = S.variation;
    if (!S.analysisMode || !v || v.idx >= v.positions.length - 1) { S.lineWalking = false; return; } // ended / left analysis
    variationStep(1);   // auto-step (does NOT call stopLineWalk, unlike navNext/navPrev)
    if (S.analysisMode && S.variation && S.variation.idx < S.variation.positions.length - 1) {
      S.lineWalkTimer = setTimeout(tick, LINE_WALK_MS);
    } else {
      S.lineWalking = false;   // reached the end of the line
    }
  };
  S.lineWalkTimer = setTimeout(tick, LINE_WALK_MS);
}

/* ---------------- "Play best moves from here" ----------------
   Unlike clicking a line (which plays a fixed PV whose tail is unreliable), this re-analyzes
   EACH position at full depth and plays the engine's actual best move, building the variation
   move by move until checkmate/draw — or until the user takes over (any nav, a board move,
   picking up a piece, or exiting all call stopLineWalk → stopBestWalk). */
const BEST_WALK_MS = 850;       // pause to view the highlighted best move before it's played
const BEST_WALK_MAX = 300;      // safety cap so a dead-but-undetected draw can't loop forever
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function stopBestWalk() {
  S.bestWalkToken++;            // invalidate any in-flight walk
  if (S.bestWalking) { S.bestWalking = false; }
}
async function playBestMoves() {
  stopLineWalk();              // cancel any other walk (also bumps bestWalkToken)
  if (!S.analysisMode) {
    S.variation = { branchIdx: S.idx, positions: [{ fen: activePos().fen, san: null }], idx: 0 };
    S.analysisMode = true;
  } else {
    S.variation.positions = S.variation.positions.slice(0, S.variation.idx + 1); // play out from here
  }
  S.selectedSq = null;
  const token = ++S.bestWalkToken;
  S.bestWalking = true;
  paintBoard(); renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
  // Ensure the engine exists.
  if (!S.liveEngine) {
    S.liveEngine = await createEngine({ Hash: S.settings.engineHash, "Skill Level": S.settings.engineSkill });
    if (token !== S.bestWalkToken) return;
  }
  for (let n = 0; n < BEST_WALK_MAX; n++) {
    if (token !== S.bestWalkToken || !S.analysisMode || !S.variation) return;
    const v = S.variation;
    const pos = v.positions[v.idx];
    if (terminalScore(pos.fen)) break;                 // mate / stalemate / 50-move etc.
    // Best move for this position (analyze fresh unless we already have it).
    if (!pos.best) {
      S.liveEngine.stop();
      let res; try { res = await S.liveEngine.analyse(pos.fen, S.settings.engineDepth, S.settings.engineLines); } catch { return; }
      if (token !== S.bestWalkToken || !S.analysisMode || !S.variation) return;
      pos.eval = terminalScore(pos.fen) || whiteRel(res.score, pos.fen);
      pos.best = res;
    }
    renderEvalBar(); renderBestArrow(); renderEngineCurrent();
    const uci = (pos.best.bestmove || "");
    if (uci.length < 4) break;                          // no legal move → done
    await sleep(BEST_WALK_MS);                          // let the user see the suggested move
    if (token !== S.bestWalkToken || !S.analysisMode || !S.variation) return;
    // Play the best move.
    let c, mv;
    try { c = new Chess(pos.fen); mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || "q" }); } catch { mv = null; }
    if (!mv) break;
    v.positions.push({ fen: c.fen(), san: mv.san, from: mv.from, to: mv.to, color: mv.color, eval: null, best: null });
    v.idx = v.positions.length - 1;
    playSanSound(mv.san);
    paintBoard(); renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
  }
  if (token === S.bestWalkToken) { S.bestWalking = false; renderControls(); renderEngineCurrent(); }
}
// Live analysis of the current variation position (its own engine instance, so the batch isn't disturbed).
async function requestLiveEval() {
  if (!S.analysisMode || !S.variation) return;
  const pos = activePos();
  if (pos.best) { renderEvalBar(); renderBestArrow(); renderEngineCurrent(); return; } // already computed
  const token = ++S.liveToken;
  if (!S.liveEngine) {
    S.liveEngine = await createEngine({ Hash: S.settings.engineHash, "Skill Level": S.settings.engineSkill });
    if (token !== S.liveToken) return;
  }
  S.liveEngine.stop();
  const fen = pos.fen;
  let res;
  try { res = await S.liveEngine.analyse(fen, S.settings.engineDepth, S.settings.engineLines); }
  catch { return; }
  if (token !== S.liveToken || !S.analysisMode) return;
  pos.eval = terminalScore(fen) || whiteRel(res.score, fen);
  pos.best = res;
  renderEvalBar(); renderBestArrow(); renderEngineCurrent();
}
// Exit analysis mode. With mainIdx: jump to that mainline position; otherwise stay put.
// (Analysis mode is indicated/closed via the Exit button in the controls bar.)
function exitAnalysis(mainIdx) {
  stopLineWalk();
  if (!S.analysisMode) { if (mainIdx != null) go(mainIdx); return; }
  S.analysisMode = false; S.variation = null; S.selectedSq = null; S.liveToken++;
  if (mainIdx != null) { go(mainIdx); return; }
  paintBoard(); renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
}

/* ---------------- Move animation ----------------
   Minimalist slide: the piece is already on the destination square (paintBoard has
   drawn the final position) — we offset it back to the start square and let it
   slide into place via a transform transition. animSpeed 1..10 → duration 400..40 ms. */
function animDuration() { return 440 - S.settings.animSpeed * 40; }
function animateMove(fromName, toName, ms) {
  const fromSq = sqByName[fromName], toSq = sqByName[toName];
  if (!fromSq || !toSq) return;
  const piece = toSq.querySelector(".piece, .piece-svg, .piece-img");
  if (!piece) return;
  const fr = fromSq.getBoundingClientRect(), tr = toSq.getBoundingClientRect();
  const dx = fr.left - tr.left, dy = fr.top - tr.top;
  if (!dx && !dy) return;
  const dur = ms || animDuration();
  toSq.classList.add("anim-top");
  piece.style.transition = "none";
  piece.style.transform = `translate(${dx}px, ${dy}px)`;
  void piece.offsetWidth;                       // force reflow before enabling the transition
  requestAnimationFrame(() => {
    piece.style.transition = `transform ${dur}ms cubic-bezier(.22,.61,.36,1)`;
    piece.style.transform = "translate(0, 0)";
  });
  const cleanup = () => {
    piece.style.transition = ""; piece.style.transform = "";
    toSq.classList.remove("anim-top");
    piece.removeEventListener("transitionend", cleanup);
  };
  piece.addEventListener("transitionend", cleanup);
  setTimeout(cleanup, dur + 80);                // fallback if transitionend doesn't fire
}

/* ---------------- Eval bar ---------------- */
// Eval text for the bar: just the magnitude — no leading +/- sign (which crops out of the narrow
// bar on multi-digit evals). Mate stays as "#N".
function evalBarText(e) {
  return evalText(e).replace("#-", "#").replace(/^[+-]/, "");
}
function renderEvalBar() {
  // The eval bar is now its own movable/resizable module — render into its mount and hide the whole
  // module when the bar isn't part of the chosen eval view.
  const mod = UI.canvas && UI.canvas.querySelector('.mod[data-mod="evalbar"]');
  const show = S.settings.evalView === "both" || S.settings.evalView === "bar";
  if (mod) mod.style.display = show ? "" : "none";
  if (!show || !UI.evalbar) return;
  let bar = UI.evalbar.querySelector(".evalbar");
  const e = activeEval();
  // Reuse the existing element, so the CSS transition on .white-fill animates
  // smoothly between moves (instead of jumping). Create it (once) at a neutral 50%.
  if (!bar) {
    bar = el("div", { class: "evalbar" },
      el("div", { class: "white-fill", style: { height: "50%" } }),
      el("div", { class: "score top" }),
      el("div", { class: "score bot" }),
    );
    UI.evalbar.append(bar);
  }
  // Reapply the look variant on every render (so switching it in settings updates live).
  // The bar always follows the board orientation: when the player is viewing from Black's side
  // (S.flipped), the whole bar is turned upside-down so Black's share sits at the bottom — just
  // like the player's own pieces. (CSS rotates the bar 180° and counter-rotates the score labels.)
  bar.className = "evalbar eb-" + (S.settings.barStyle || "classic") + (S.flipped ? " flipped" : "");
  // While this position's eval is still being computed (analysis mode: the live engine hasn't
  // returned yet → e is null), DON'T snap the bar to 50% and back. Keep the previous fill until
  // the real eval arrives, so making a move doesn't make the bar flicker through the middle.
  if (e == null) { bar.title = "Eval …"; return; }
  const cp = scoreToCp(e);
  // On forced mate the bar should be completely full (100% / 0%) — no opposite sliver.
  // Otherwise the swing is limited to 4–96%, so a big advantage doesn't look like mate.
  const clamp = Math.max(-600, Math.min(600, cp));
  const whiteShare = e.mate != null ? (e.mate > 0 ? 100 : 0) : 50 + (clamp / 600) * 46;
  bar.title = "Eval " + evalText(e);
  bar.querySelector(".white-fill").style.height = whiteShare + "%";
  bar.querySelector(".score.top").textContent = cp < 0 ? evalBarText(e) : "";
  bar.querySelector(".score.bot").textContent = cp >= 0 ? evalBarText(e) : "";
}

/* ---------------- Player strips ---------------- */
// Starting time on the clock, derived from the PGN's TimeControl header (e.g. "600+5" → "10:00").
// Returns "" for no/unlimited/correspondence ("-", "1/86400") time controls or unparseable values.
function initialClock() {
  const tc = (S.headers?.TimeControl || "").toString();
  if (!tc || tc === "-" || tc.includes("/")) return "";
  const base = parseInt(tc.split("+")[0], 10);
  if (!Number.isFinite(base) || base <= 0) return "";
  return `${Math.floor(base / 60)}:${String(base % 60).padStart(2, "0")}`;
}
function clockFor(side) {
  let last = "";
  for (let p = 1; p <= S.idx; p++) if (S.positions[p].color === side && S.clocks[p]) last = S.clocks[p];
  // Before this side's first clocked move (incl. the starting position) there's no recorded clock,
  // so fall back to the base time — but only for games that actually carry clock data, so a
  // clockless PGN doesn't get a frozen clock.
  if (!last && S.clocks.some(Boolean)) return initialClock();
  return last;
}
// Captured material at the currently-viewed position, read off the FEN board. For a side it returns
// the opponent pieces that side has captured (as cburnett image codes like "bP"), plus the running
// material difference (white − black, in pawns) that drives the "+N" advantage label.
function capturedInfo() {
  const board = activePos().fen.split(" ")[0];
  const start = { P: 8, N: 2, B: 2, R: 2, Q: 1 };
  const value = { P: 1, N: 3, B: 3, R: 5, Q: 9 };
  const cnt = { w: {}, b: {} };
  for (const ch of board) {
    if (ch >= "a" && ch <= "z") { const t = ch.toUpperCase(); if (start[t]) cnt.b[t] = (cnt.b[t] || 0) + 1; }
    else if (ch >= "A" && ch <= "Z") { if (start[ch]) cnt.w[ch] = (cnt.w[ch] || 0) + 1; }
  }
  // Pieces `side` has captured = the opponent's pieces missing from the starting count.
  const capturedBy = (side) => {
    const opp = side === "w" ? "b" : "w";
    const out = [];
    for (const t of ["P", "N", "B", "R", "Q"]) for (let i = (cnt[opp][t] || 0); i < start[t]; i++) out.push(opp + t);
    return out;
  };
  let diff = 0;
  for (const t in value) diff += ((cnt.w[t] || 0) - (cnt.b[t] || 0)) * value[t];
  return { capturedBy, diff };
}
function playerStrip(side) {
  const p = S.players[side];
  const toMove = activePos().fen.split(" ")[1] === side;
  const clock = clockFor(side);
  const { capturedBy, diff } = capturedInfo();
  const caps = capturedBy(side);
  // The "+N" sits next to whichever side is ahead; nothing when equal or on the trailing side.
  const ahead = side === "w" ? diff > 0 : diff < 0;
  const advText = ahead && diff !== 0 ? "+" + Math.abs(diff) : "";
  const captured = (caps.length || advText)
    ? el("div", { class: "captured" },
        ...caps.map((code) => el("img", { class: "cap-pc", src: _url(`pieces-img/cburnett/${code}.svg`), alt: "" })),
        advText ? el("span", { class: "adv" }, advText) : null)
    : null;
  // Avatar: the player's country flag when we scraped one off chess.com, otherwise the original
  // username-initial chip. (Lichess and pasted-PGN games carry no country, so they keep the chip.)
  // Hovering the flag shows the country name in the same styled tooltip the accuracy panel uses.
  const avatar = p.country
    ? el("img", { class: "avatar avatar-flag", src: _url(`flags/${p.country}.svg`), alt: p.countryName || "", draggable: "false",
        onmouseenter: p.countryName ? (e) => showLabelTip(e.currentTarget, p.countryName) : null,
        onmouseleave: p.countryName ? hideQTip : null })
    : el("span", { class: "avatar", style: { background: side === "w" ? "#3f7d3a" : "#5a5a5a" } }, (p.name[0] || "?").toUpperCase());
  return el("div", { class: "player-strip" + (toMove ? " active" : "") },
    avatar,
    el("div", { class: "who" },
      el("span", { class: "name" }, p.name, p.rating ? el("span", { class: "elo" }, ` (${p.rating})`) : null),
      captured,
    ),
    clock ? el("span", { class: "clock tnum" }, clock) : null,
  );
}
function renderPlayers() {
  UI.playerTop.replaceChildren(playerStrip(S.flipped ? "w" : "b"));
  UI.playerBot.replaceChildren(playerStrip(S.flipped ? "b" : "w"));
  alignPlayers();
}
// Align the player strip with the board's actual left edge (the board can be
// centered in its module, so we measure instead of guessing a fixed offset).
function alignPlayers() {
  const board = UI.boardWrap && UI.boardWrap.querySelector(".board");
  const top = UI.playerTop && UI.playerTop.querySelector(".player-strip");
  if (!board || !top) return;
  const off = Math.max(4, Math.round(board.getBoundingClientRect().left - UI.boardWrap.getBoundingClientRect().left));
  top.style.paddingLeft = off + "px";
  const bot = UI.playerBot.querySelector(".player-strip");
  if (bot) bot.style.paddingLeft = off + "px";
}

/* ---------------- Controls ---------------- */
function renderControls() {
  const playing = !!S.autoTimer;
  if (S.practice) {
    const p = S.practice;
    const cur = Math.min(p.i + 1, p.spots.length);
    const status = p.rolling ? "Rolling to your mistake…"
      : p.demoing ? "Replaying your move…"
      : p.busy ? "Checking…"
      : p.solving ? "Find a stronger move" : "✓ Correct!";
    UI.controls.replaceChildren(
      el("span", { class: "pos practice-pos" }, `Mistake ${cur}/${p.spots.length}`),
      el("span", { class: "practice-status" }, status),
      el("button", { class: "exit-analysis", title: "Exit practice (Esc)", onclick: exitPractice }, el("span", { class: "ea-x" }, "✕"), "Exit"),
    );
    return;
  }
  if (S.analysisMode && S.variation) {
    const v = S.variation;
    const atEnd = v.idx >= v.positions.length - 1;
    // Same layout as the normal controls — the central green Play slot becomes a red Exit button.
    const atStart = v.idx <= 0;
    const gotoVar = (i) => { stopLineWalk(); v.idx = Math.max(0, Math.min(v.positions.length - 1, i)); paintBoard(); renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent(); requestLiveEval(); };
    UI.controls.replaceChildren(
      el("button", { "aria-label": "Variation start", disabled: atStart, onclick: () => gotoVar(0) }, icon("first")),
      el("button", { "aria-label": "Previous move", onclick: navPrev }, icon("prev")),
      el("button", { class: "exit-analysis", title: "Exit analysis (Esc)", onclick: () => exitAnalysis(v.branchIdx) }, el("span", { class: "ea-x" }, "✕"), "Exit"),
      el("button", { "aria-label": "Next move", disabled: atEnd, onclick: navNext }, icon("next")),
      el("button", { "aria-label": "Variation end", disabled: atEnd, onclick: () => gotoVar(v.positions.length - 1) }, icon("last")),
    );
    return;
  }
  // The forward buttons are blocked when at the analysis front (only during analysis).
  const maxPly = S.analyzing ? S.progress : S.total;
  const atEnd = S.idx >= maxPly;
  UI.controls.replaceChildren(
    el("button", { "aria-label": "Start", onclick: () => go(0) }, icon("first")),
    el("button", { "aria-label": "Previous", onclick: navPrev }, icon("prev")),
    el("button", { class: "play", "aria-label": playing ? "Pause" : "Play", onclick: toggleAuto }, icon(playing ? "pause" : "play")),
    el("button", { "aria-label": "Next", disabled: atEnd, onclick: navNext }, icon("next")),
    el("button", { "aria-label": "End", disabled: atEnd, onclick: () => go(maxPly) }, icon("last")),
  );
}

/* ---------------- Insight panel (move commentary + practice coaching) ----------------
   Replaces the old accuracy/verdict mini. As you step through the game it narrates the
   move you're on ("Bd4 is a mistake", "Be7 is excellent"), typed out for a live feel. The
   opening name stays at the top, and during practice this panel becomes the coach: it tells
   you what to do and surfaces a Hint button after a few failed tries. */

// Natural phrasing for the move that led to the current position, keyed by classification.
const COMMENT_PHRASE = {
  brilliant: (m) => `${m} is a brilliant find.`,
  great:     (m) => `${m} is a great move.`,
  best:      (m) => `${m} is the best move.`,
  excellent: (m) => `${m} is excellent.`,
  good:      (m) => `${m} is a good move.`,
  book:      (m) => `${m} is a book move.`,
  inacc:     (m) => `${m} is an inaccuracy.`,
  mistake:   (m) => `${m} is a mistake.`,
  miss:      (m) => `${m} misses a stronger chance.`,
  blunder:   (m) => `${m} is a blunder.`,
};
// SAN of the engine's best move in the position BEFORE ply `idx` (the alternative to what was played).
function bestSanBefore(idx) {
  const b = S.bests[idx - 1];
  if (!b || !b.bestmove) return null;
  try {
    const c = new Chess(S.positions[idx - 1].fen);
    const mv = c.move({ from: b.bestmove.slice(0, 2), to: b.bestmove.slice(2, 4), promotion: b.bestmove.slice(4, 5) || undefined });
    return mv ? mv.san : null;
  } catch { return null; }
}
let _typeT = null;
let _lastCommentKey = -1;   // which ply the move-comment last typed out (so it isn't re-typed in place)
// Insight-panel display signature: a string identifying exactly what's shown (ply/state + coach).
// While it's unchanged we keep the same text (no re-pick, no re-type); when it changes we pick a
// fresh coach line and type it out — which is what makes switching coach mid-game seamless.
let _ipSig = null, _ipText = "";
let _coachPickHist = {};    // event key → last variant shown, so we don't repeat back-to-back
// Type `text` into `node` character by character (cancelling any previous run). ~16ms/char.
function typeWrite(node, text) {
  clearTimeout(_typeT);
  node.textContent = "";
  coachTalk(true);                      // the coach "speaks" while the line types out
  let i = 0;
  const step = () => {
    i = Math.min(text.length, i + 2);   // two chars per tick + a short delay = snappier reveal
    node.textContent = text.slice(0, i);
    if (i < text.length) _typeT = setTimeout(step, 7);
    else coachTalk(false);             // mouth stops when the line is fully revealed
  };
  step();
}
function openingStrip() {
  const o = S.opening;
  const line = o ? `${o.eco}${o.eco && o.name ? " · " : ""}${o.name}` : "Opening unknown";
  return el("div", { class: "ip-opening", title: line },
    el("span", { class: "ip-op-ic", html: ICONS.book || "" }),
    el("span", { class: "ip-op-txt" }, line));
}
/* ---------------- Coach personalities ----------------
   Each coach is a phrase bank (data/coaches/<id>.json) keyed to game events. We resolve the most
   salient event for a position, pick a random variant in the chosen coach's voice, and fill in the
   {tokens}. Anything the bank can't supply falls back to the legacy generic line, so a missing or
   malformed file never breaks the panel. */
const COACH_LIST = [
  ["mentor", "Ralph"], ["wise_grandma", "Wise Grandma"],
  ["life_coach", "Julie"], ["charmer", "Charmer"], ["hype_beast", "Hype Beast"],
  ["streamer", "Streamer"], ["sportscaster", "Sportscaster"], ["old_soviet", "Old Soviet"],
  ["drill_sergeant", "Drill Sergeant"], ["hustler", "Hustler"], ["kid_prodigy", "Kid Prodigy"],
  ["professor", "Professor"], ["analyst", "Analyst"], ["noob", "Noob"],
  ["drunk_uncle", "Drunk Uncle"], ["conspiracy_theorist", "Conspiracy Theorist"],
  ["noir_detective", "Noir Detective"], ["nature_documentarian", "Nature Documentarian"],
];
const _coachCache = {};   // id → parsed bank (loaded once)
async function loadCoach(id) {
  if (!id) return null;
  if (_coachCache[id]) return _coachCache[id];
  try {
    const res = await fetch(chrome.runtime.getURL("data/coaches/" + id + ".json"));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const bank = await res.json();
    _coachCache[id] = bank;
    return bank;
  } catch (e) { console.warn("[coach] couldn't load", id, e); return null; }
}
// Switch coach: load the bank, then re-render the panel so the CURRENT position is narrated in the
// new voice — a seamless mid-game hand-off (no jump, no reset of where you are in the game).
async function setCoach(id) {
  S.settings.coach = id;
  await chrome.storage.local.set({ settings: S.settings });
  // The avatar always reflects the chosen coach; the reply bank is only loaded when special replies are on.
  S.coach = S.settings.coachPlain ? null : await loadCoach(id);
  _ipSig = null;                                   // force a fresh pick + re-type in the new voice
  if (S.practice) S.practice.coachTyped = false;
  renderCoachAvatar();                             // swap in the new personality's animated portrait
  renderReview();
  if (UI.settings && !UI.settings.hidden) renderSettings();
}
// Toggle the coach's special replies without changing who's on screen. The avatar (and its board
// reactions) stay; only the narration switches between the coach's own voice and neutral plain lines.
async function setCoachPlain(plain) {
  S.settings.coachPlain = plain;
  await chrome.storage.local.set({ settings: S.settings });
  S.coach = plain ? null : await loadCoach(S.settings.coach);
  _ipSig = null;                                   // re-pick + re-type in the new voice
  if (S.practice) S.practice.coachTyped = false;
  renderReview();
  if (UI.settings && !UI.settings.hidden) renderSettings();
}

/* ---------------- Animated coach avatar ----------------
   The lifelike portraits live as self-contained rig HTML files (one per personality) that expose a
   uniform postMessage API. They use inline scripts, so they're declared as sandboxed pages in the
   manifest and embedded via <iframe> here; we drive them purely with postMessage (emotion/look/
   talk/gestures/prop). Personalities without a built rig (or "Off") simply hide the module. */
const COACH_RIG_DIR = "data/coaches-anim/rigs/";
const COACH_RIGS = {
  mentor: "animated_mentor_rig.html",
  wise_grandma: "animated_grandma_rig.html",
  life_coach: "animated_lifecoach_rig.html",
  old_soviet: "old_soviet_rework_rig.html",
  hustler: "animated_hustler_rig.html",
  kid_prodigy: "animated_kid_rig.html",
  professor: "animated_professor_rig.html",
  drunk_uncle: "animated_drunk_uncle_rig.html",
  conspiracy_theorist: "animated_conspiracy_rig.html",
  nature_documentarian: "animated_naturalist_rig.html",
};
// Move quality → facial expression the coach wears when you land on that move.
const COACH_QUALITY_EMOTION = {
  brilliant: "surprised", great: "happy", best: "happy", excellent: "happy",
  good: "happy", book: "neutral", inacc: "skeptical", mistake: "sad",
  miss: "sad", blunder: "angry",
};
let _coachFrame = null;        // the live <iframe>, or null when hidden
let _coachReady = false;       // iframe loaded → safe to postMessage
let _coachId = null;           // which rig is currently mounted
let _coachIdleT = null, _coachGlanceT = null, _coachIdleStarted = false;
let _coachGlanceUntil = 0;     // suppress idle look-around until this timestamp (board glance in progress)
let _coachTalking = false;

function coachSend(cmd) {
  if (_coachFrame && _coachReady && _coachFrame.contentWindow) {
    try { _coachFrame.contentWindow.postMessage(cmd, "*"); } catch {}
  }
}
// (Re)mount the iframe for the active personality. Reuses the frame if the coach hasn't changed.
function renderCoachAvatar() {
  if (!UI || !UI.coach) return;
  const id = S.settings.coach || "";
  const rig = COACH_RIGS[id] || null;
  const mod = UI.coach.closest(".mod");
  if (!rig) {                                   // "Off" or no rig built yet → hide the module entirely
    _coachFrame = null; _coachReady = false; _coachId = null;
    UI.coach.replaceChildren();
    if (mod) mod.hidden = true;
    return;
  }
  if (mod) mod.hidden = false;
  if (id === _coachId && _coachFrame) return;   // same coach already mounted → keep it (no fl/reset)
  _coachId = id; _coachReady = false;
  const frame = el("iframe", {
    class: "coach-frame", title: "Coach", scrolling: "no",
    src: chrome.runtime.getURL(COACH_RIG_DIR + rig),
  });
  frame.addEventListener("load", () => {
    _coachReady = true;
    frame.classList.add("ready");   // fade the portrait in now that its document has loaded

    _coachCupUp = false; clearTimeout(_coachCupT);   // fresh rig → its cup is down; keep our flag in sync
    coachSend({ coachCmd: "look", value: "center" });
    coachReactPly(S.idx);          // react to wherever we currently are in the game
    startCoachIdle();
  });
  _coachFrame = frame;
  UI.coach.replaceChildren(frame);
}
// Talk on/off — called by the typewriter so the mouth moves while a line is being "spoken".
function coachTalk(on) {
  on = !!on;
  if (on === _coachTalking) return;
  _coachTalking = on;
  coachSend({ coachCmd: "talk", value: on });
}
// Each rig's signature ability. One-shots play once (sip/photo/thread/pawn-toss); toggle props are
// lifted then lowered again so the gesture reads as a discrete action; ambient-special coaches
// (grandma's crochet, hustler's finger-tap) are already animating, so they get a nod instead.
const COACH_SPECIAL = {
  mentor: { cmd: "tossPawn" },
  drunk_uncle: { cmd: "sip" },
  conspiracy_theorist: { cmd: "findThread" },
  nature_documentarian: { cmd: "takePhoto" },
  professor: { toggle: true },     // raise book, then lower
  kid_prodigy: { toggle: true },   // hoist trophy, then lower
  life_coach: { journal: true },   // open journal, then close
};
let _coachSpecialT = null;
let _coachCupT = null, _coachCupUp = false;
// old_soviet's sip: raise the cup, hold 2–4s, then lower — on its OWN timer, so moving to the
// next move can't cut it short, and a re-trigger while it's already up is ignored. Never touches his
// emotion (raise only moves the cup), and it's thinned a little so it's not on every eligible move.
function coachSipCup() {
  if (_coachCupUp || Math.random() > 0.21) return;   // only ~21% of eligible triggers raise the cup
  _coachCupUp = true;
  coachSend({ coachCmd: "raise", value: true });
  clearTimeout(_coachCupT);
  _coachCupT = setTimeout(() => { coachSend({ coachCmd: "raise", value: false }); _coachCupUp = false; }, 2000 + Math.random() * 2000);
}
function coachSpecial() {
  if (_coachId === "old_soviet") { coachSipCup(); return; }
  const sp = COACH_SPECIAL[_coachId];
  if (!sp) { coachSend({ coachCmd: "nod" }); return; }   // ambient-special coaches → small nod
  clearTimeout(_coachSpecialT);
  if (sp.journal) {
    coachSend({ coachCmd: "openJournal", value: true });
    _coachSpecialT = setTimeout(() => coachSend({ coachCmd: "openJournal", value: false }), 2600);
  } else if (sp.toggle) {
    coachSend({ coachCmd: "raise" });
    _coachSpecialT = setTimeout(() => coachSend({ coachCmd: "raise" }), 2400);
  } else {
    coachSend({ coachCmd: sp.cmd });
  }
}
// React to landing on a ply: wear the move's expression, glance down-left at the board, and use the
// coach's gestures + signature ability so all of the rig's abilities get exercised over a game.
function coachReactPly(idx) {
  if (!_coachReady) return;
  const cls = idx > 0 ? S.classif[idx] : null;
  const emo = idx === 0 ? "neutral" : (COACH_QUALITY_EMOTION[cls] || "neutral");
  coachSend({ coachCmd: "emotion", value: emo });
  // glance down-and-to-the-left at the board, then return to centre
  coachSend({ coachCmd: "look", value: "downleft" });
  _coachGlanceUntil = performance.now() + 1700;
  clearTimeout(_coachGlanceT);
  _coachGlanceT = setTimeout(() => coachSend({ coachCmd: "look", value: "center" }), 1500);
  if (idx > 0) {
    const r = Math.random();
    if (cls === "brilliant" || cls === "great") { coachSend({ coachCmd: "nod" }); coachSpecial(); }
    else if (cls === "best" || cls === "excellent") { coachSend({ coachCmd: "nod" }); if (r < 0.5) coachSpecial(); }
    else if (cls === "good" || cls === "book") { if (r < 0.35) coachSpecial(); }
    else if (cls === "inacc" || cls === "mistake" || cls === "miss") {
      // disapproval — frequently an eye-roll, otherwise a head-shake
      coachSend({ coachCmd: r < 0.55 ? "eyeRoll" : "shake" });
    } else if (cls === "blunder") {
      coachSend({ coachCmd: r < 0.3 ? "eyeRoll" : "shake" });
    }
  }
}
// Lifelike idle: glance around at random intervals (unless a board-glance is mid-flight), with the
// occasional small gesture. One shared loop drives whichever rig is mounted.
function startCoachIdle() {
  if (_coachIdleStarted) return;
  _coachIdleStarted = true;
  const dirs = ["left", "right", "up", "upleft", "upright", "downright", "center", "center"];
  const tick = () => {
    _coachIdleT = setTimeout(() => {
      if (_coachReady && !document.hidden && performance.now() > _coachGlanceUntil && !_coachTalking) {
        coachSend({ coachCmd: "look", value: dirs[Math.floor(Math.random() * dirs.length)] });
        const r = Math.random();
        if (r < 0.10) coachSend({ coachCmd: "nod" });
        else if (r < 0.16) coachSend({ coachCmd: "shrug" });
        else if (r < 0.24) coachSpecial();   // ~8%: show the signature ability during idle too
        else if (r < 0.30) coachSend({ coachCmd: "eyeRoll" });
      }
      tick();
    }, 2600 + Math.random() * 3400);
  };
  tick();
}
// Pick a random variant, avoiding an immediate repeat of the last one shown for this event.
function coachPick(arr, histKey) {
  if (!Array.isArray(arr) || !arr.length) return null;
  if (arr.length === 1) return arr[0];
  let i = Math.floor(Math.random() * arr.length);
  if (arr[i] === _coachPickHist[histKey]) i = (i + 1) % arr.length;
  _coachPickHist[histKey] = arr[i];
  return arr[i];
}
// Substitute {tokens}; leave any token we have no value for untouched (caller avoids those events).
function coachFill(text, tok) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (tok && tok[k] != null && tok[k] !== "") ? tok[k] : m);
}
// Grab the array for an event: top-level (weak_move_suffix / move_fallback) or nested section.key.
function coachArr(section, key) {
  const b = S.coach; if (!b) return null;
  return key == null ? (Array.isArray(b[section]) ? b[section] : null) : (b[section] ? b[section][key] : null);
}
// Max length of a coach reply — it must fit two lines at 18px in the insight panel. Bank variants
// whose filled text exceeds this are skipped (not deleted); if none fit, coachLine returns null and
// the caller falls back to the short legacy line.
const COACH_MAX_LEN = 115;
function coachLine(section, key, tok) {
  const all = coachArr(section, key);
  if (!Array.isArray(all) || !all.length) return null;
  const fit = all.filter((v) => coachFill(v, tok).length <= COACH_MAX_LEN);
  const v = coachPick(fit.length ? fit : null, section + "." + (key || ""));
  return v ? coachFill(v, tok) : null;
}
// --- cheap, reliable event detectors (SAN / FEN / eval only) ---
function _cpAt(i) { return S.evals[i] ? scoreToCp(S.evals[i]) : null; }
function _zone(cp) { if (cp == null) return null; return cp > 100 ? "w" : cp < -100 ? "b" : "e"; }
function _countMatch(fen, re) { return (fen.split(" ")[0].match(re) || []).length; }
function coachTurningPly() {
  if (S._turnPly !== undefined && S._turnPly !== null) return S._turnPly;
  let ply = -1, big = 0;
  for (let i = 1; i <= S.total; i++) {
    if (!S.evals[i] || !S.evals[i - 1]) continue;
    const sw = Math.abs(_cpAt(i) - _cpAt(i - 1));
    if (sw > big) { big = sw; ply = i; }
  }
  S._turnPly = big >= 150 ? ply : -1;
  return S._turnPly;
}
function coachSummaryKey() {
  const r = myResult();
  if (r === "draw") return "hard_fought_draw";
  if (r === "win") return "clean_win";
  if (r === "loss") {
    let maxUser = -Infinity;
    for (let i = 0; i <= S.total; i++) { if (!S.evals[i]) continue; let cp = _cpAt(i); if (S.meSide === "b") cp = -cp; if (cp > maxUser) maxUser = cp; }
    return maxUser >= 300 ? "slipped_win" : "loss";
  }
  return null;
}
// Decide the single most salient event for the played move at ply idx → { section, key, n? }.
function coachMoveEvent(idx) {
  const san = S.positions[idx].san || "";
  let cls = S.classif[idx]; if (cls === "inacc") cls = "inaccuracy";
  const weak = ["inaccuracy", "mistake", "miss", "blunder"].includes(cls);
  const cpNow = _cpAt(idx), cpPrev = _cpAt(idx - 1);
  const bestLine = S.bests[idx - 1] && S.bests[idx - 1].lines && S.bests[idx - 1].lines[0];
  const bestMate = bestLine && bestLine.score && bestLine.score.mate > 0;

  if (san.includes("#")) return { section: "derived_events", key: "checkmate" };
  if (idx === S.total) { const s = coachSummaryKey(); if (s) return { section: "summary", key: s }; }
  if (weak && bestMate && !(S.evals[idx] && S.evals[idx].mate)) return { section: "derived_events", key: "missed_mate" };
  if (weak) return { section: "move_quality", key: cls };
  if (cls === "brilliant" || cls === "great") return { section: "move_quality", key: cls };
  if (S.positions[idx].promotion || san.includes("=")) return { section: "derived_events", key: "promotion" };
  if (san.startsWith("O-O-O")) return { section: "derived_events", key: "castle_long" };
  if (san.startsWith("O-O")) return { section: "derived_events", key: "castle_short" };
  if (S.evals[idx] && S.evals[idx].mate) return { section: "derived_events", key: "mate_on_board" };
  const a = _zone(cpPrev), b = _zone(cpNow);
  if (a && b && a !== b) return { section: "derived_events", key: b === "w" ? "lead_change_white" : b === "b" ? "lead_change_black" : "lead_change_equal" };
  if (san.includes("+")) return { section: "derived_events", key: "check" };
  if (idx >= 1 && _countMatch(S.positions[idx - 1].fen, /[Qq]/g) > 0 && _countMatch(S.positions[idx].fen, /[Qq]/g) === 0) return { section: "derived_events", key: "queens_off" };
  if (idx >= 1 && _countMatch(S.positions[idx - 1].fen, /[QRBNqrbn]/g) > 6 && _countMatch(S.positions[idx].fen, /[QRBNqrbn]/g) <= 6) return { section: "derived_events", key: "enter_endgame" };
  if (idx >= 2 && S.classif[idx - 1] === "book" && S.classif[idx] !== "book") return { section: "derived_events", key: "leaving_theory" };
  if (cpPrev != null && cpNow != null && Math.abs(cpNow - cpPrev) >= 200) return { section: "derived_events", key: "eval_swing_large" };
  const runOf = (set) => { let n = 0; for (let i = idx; i >= 1; i--) { if (set.has(S.classif[i])) n++; else break; } return n; };
  if (runOf(new Set(["brilliant", "great", "best", "excellent"])) === 3) return { section: "derived_events", key: "streak_good", n: 3 };
  if (runOf(new Set(["blunder", "mistake"])) === 3) return { section: "derived_events", key: "streak_bad", n: 3 };
  if (cls && coachArr("move_quality", cls)) return { section: "move_quality", key: cls };
  if (idx === coachTurningPly()) return { section: "derived_events", key: "turning_point" };
  return { section: "move_fallback", key: null };
}
function coachTokens(idx, extra) {
  const o = S.opening || {}, ev = S.evals[idx];
  const cpNow = _cpAt(idx), cpPrev = _cpAt(idx - 1);
  let cls = S.classif[idx]; const q = cls && QUALITY[cls];
  const tok = {
    move: (S.positions[idx] && S.positions[idx].san) || "", best_move: bestSanBefore(idx) || "",
    eval: ev ? evalText(ev) : "", eco: o.eco || "", opening: o.name || "",
    label: q ? q.name.toLowerCase() : "",
    swing: (cpPrev != null && cpNow != null) ? (Math.abs(cpNow - cpPrev) / 100).toFixed(1) : "",
  };
  if (ev && ev.mate) tok.mate_n = String(Math.abs(ev.mate));
  else { const bl = S.bests[idx - 1] && S.bests[idx - 1].lines && S.bests[idx - 1].lines[0]; if (bl && bl.score && bl.score.mate) tok.mate_n = String(Math.abs(bl.score.mate)); }
  return Object.assign(tok, extra || {});
}
// The coach's sentence for the played move at ply idx (null → caller uses the legacy line).
function coachMoveSentence(idx) {
  if (!S.coach) return null;
  const ev = coachMoveEvent(idx);
  const tok = coachTokens(idx, ev.n != null ? { n: String(ev.n) } : null);
  let line = coachLine(ev.section, ev.key, tok);
  if (line == null) {  // graceful fallback inside the bank
    let cls = S.classif[idx]; if (cls === "inacc") cls = "inaccuracy";
    line = (cls && coachLine("move_quality", cls, tok)) || coachLine("move_fallback", null, tok);
  }
  if (line == null) return null;
  // weak-move suffix, same rule as the legacy line (good / inacc / mistake / miss / blunder)
  let cls = S.classif[idx]; if (cls === "inacc") cls = "inaccuracy";
  if (ev.section === "move_quality" && ["good", "inaccuracy", "mistake", "miss", "blunder"].includes(ev.key)) {
    const bs = bestSanBefore(idx);
    if (bs && bs !== (S.positions[idx].san || "")) { const suf = coachLine("weak_move_suffix", null, tok); if (suf && (line + "  " + suf).length <= COACH_MAX_LEN) line += "  " + suf; }
  }
  return line;
}
function renderReview() {
  // In-place progress text during analysis (so the loader animation doesn't restart each move).
  if (S.analyzing && revRefs) { revRefs.head.textContent = `Analyzing … ${S.progress}/${S.total}`; return; }

  const panel = el("div", { class: "panel insight-panel" }, openingStrip());

  if (S.analyzing) {
    const headEl = el("span", {}, `Analyzing … ${S.progress}/${S.total}`);
    panel.append(el("div", { class: "ip-body" }, el("div", { class: "ip-analyzing" }, loaderNode("", "var(--accent)"), headEl)));
    revRefs = { head: headEl };
    UI.review.replaceChildren(panel);
    return;
  }
  revRefs = null;

  if (S.practice) { _ipSig = null; panel.append(renderPracticeCoach()); UI.review.replaceChildren(panel); return; }

  if (S.analysisMode && S.variation) {
    _ipSig = null;
    // Exploring an engine sideline is not part of the played game, so the coach stays quiet here —
    // we show a plain, neutral note instead of a coach line (the eval still updates live below).
    // Mirror a move comment's layout exactly (empty .ip-head for the same top spacing + the note in
    // .ip-text) so the font, colour and vertical position match the mainline commentary.
    const body = el("div", { class: "ip-body" });
    body.append(el("div", { class: "ip-head" }));
    body.append(el("div", { class: "ip-text" }, "Exploring a variation."));
    panel.append(body);
    UI.review.replaceChildren(panel);
    return;
  }

  panel.append(renderMoveComment());
  UI.review.replaceChildren(panel);
}
// Commentary for the move on the mainline at S.idx.
function renderMoveComment() {
  const body = el("div", { class: "ip-body" });
  if (S.idx === 0) {
    // Mirror a move comment's layout: an empty head row keeps the panel the same height, and the
    // note uses .ip-text so it shares the move comment's font/colour/position.
    body.append(el("div", { class: "ip-head" }));
    const sig = "start:" + (S.settings.coach || "");
    const fresh = sig !== _ipSig;
    if (fresh) { _ipText = (S.coach && coachLine("non_move_states", "starting_position", {})) || "Use ← and → to step through the game."; _ipSig = sig; }
    const txt = el("div", { class: "ip-text" });
    body.append(txt);
    if (fresh) { coachReactPly(0); typeWrite(txt, _ipText); } else txt.textContent = _ipText;
    return body;
  }
  const cls = S.classif[S.idx];
  const san = S.positions[S.idx].san || "";
  const cfg = cls && QUALITY[cls];
  // The exact number shown on the eval bar for this position (white-relative), on the right
  // instead of the quality label (the quality is already in the sentence below).
  const ev = S.evals[S.idx];
  const evCp = ev ? scoreToCp(ev) : null;
  const evTxt = ev ? evalText(ev) : "";

  const head = el("div", { class: "ip-head" });
  if (cfg) head.append(el("img", { class: "ip-badge", src: qIcon(cls), alt: "", draggable: "false" }));
  head.append(el("span", { class: "ip-move" }, san));
  if (evTxt) head.append(el("span", { class: "ip-eval " + (evCp >= 0 ? "pos" : "neg") }, evTxt));
  body.append(head);

  // Pick the line once per (ply + coach): a fresh signature → choose + type; otherwise reuse the
  // shown text (so unrelated re-renders don't re-pick or re-animate, and a coach switch re-types).
  const sig = "m:" + S.idx + ":" + (S.settings.coach || "");
  const fresh = sig !== _ipSig;
  if (fresh) {
    let sentence = S.coach ? coachMoveSentence(S.idx) : null;
    if (sentence == null) {   // legacy generic line
      sentence = (cfg && COMMENT_PHRASE[cls]) ? COMMENT_PHRASE[cls](san) : `${san}.`;
    }
    _ipText = sentence; _ipSig = sig;
  }
  const txt = el("div", { class: "ip-text" });
  body.append(txt);
  if (fresh) { coachReactPly(S.idx); typeWrite(txt, _ipText); } else txt.textContent = _ipText;
  return body;
}
// Practice coaching: what to do, attempt count, and a Hint button after 3 failed tries.
function renderPracticeCoach() {
  const p = S.practice;
  const body = el("div", { class: "ip-body practice-coach" });
  // Hint becomes available after 3 failed tries and lives in the top-right of the header — so the
  // panel's layout (and height) never shifts as you try (no attempt counter, no extra button row).
  const showHint = p.solving && (p.fails >= 3 || p.hinted);
  body.append(el("div", { class: "ip-head" },
    el("span", { class: "ip-tag practice" }, "Practice"),
    showHint ? el("button", { class: "ip-hint-btn ip-hint-top" + (S.practiceHint ? " on" : ""), title: "Highlight the piece to move", onclick: showPracticeHint }, "Hint") : null));

  // Coach phrase (or null) → otherwise the built-in default for each practice state.
  const cl = (key, tok) => S.coach ? coachLine("practice", key, tok) : null;
  if (p.rolling) {
    // After a correct answer keep the success message during the roll; only the very first
    // roll (before any solve) shows a neutral "getting ready" line.
    body.append(p.advancing
      ? el("div", { class: "ip-text ip-good" }, cl("correct_continue", {}) || "✓ Correct! Moving on…")
      : el("div", { class: "ip-text" }, cl("loading_first", {}) || "Getting your first mistake ready…"));
    return body;
  }
  if (!p.solving && !p.demoing) {
    const last = p.i >= p.spots.length - 1;   // just solved the final mistake → nothing to move on to
    body.append(el("div", { class: "ip-text ip-good" },
      last ? (cl("correct_final", {}) || "✓ Correct — last one. Well done!")
           : (cl("correct_continue", {}) || "✓ Correct! Moving on…")));
    return body;
  }
  // Demo replay OR solving — the SAME message, picked + typed once when we land on the spot so the
  // demo and the solve phase don't show two different lines back to back.
  const spot = p.spots[p.i];
  const badSan = S.positions[spot].san || "your move";
  const badCls = S.classif[spot];
  const label = (badCls && QUALITY[badCls]) ? QUALITY[badCls].name.toLowerCase() : "weak move";
  if (!p.coachTyped) {
    const tok = { move: badSan, label };
    // After a hint has been surfaced, switch to the coach's after-hint line if it has one.
    p.coachLine = (p.hinted && cl("after_hint", tok))
      || cl("prompt_find_better", tok)
      || `${badSan} is ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label}.`;
  }
  const txt = el("div", { class: "ip-text" });
  body.append(txt);
  if (p.coachTyped) txt.textContent = p.coachLine;
  else { typeWrite(txt, p.coachLine); p.coachTyped = true; }
  return body;
}

/* ---------------- Accuracy + breakdown ---------------- */
// Small explanation tooltip for a move category. Anchored to the row (preferably on the
// left; otherwise on the right if there's no room), and kept within the screen.
function tipEl() {
  let tip = document.querySelector(".q-tip");
  if (!tip) { tip = el("div", { class: "q-tip" }); document.body.append(tip); }
  return tip;
}
// Position the tooltip (preferably to the left of the anchor, otherwise to the right), within the screen.
function positionTip(tip, target) {
  tip.style.visibility = "hidden";
  tip.classList.add("show");
  const r = target.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight, M = 10;
  let left = r.left - tw - M;
  if (left < 8) left = Math.min(r.right + M, window.innerWidth - tw - 8);
  let top = r.top + r.height / 2 - th / 2;
  top = Math.max(8, Math.min(window.innerHeight - th - 8, top));
  tip.style.left = left + "px";
  tip.style.top = top + "px";
  tip.style.visibility = "";
}
function showQTip(target, cls) {
  const cfg = QUALITY[cls];
  if (!cfg) return;
  const tip = tipEl();
  tip.replaceChildren(
    el("div", { class: "q-tip-head" },
      el("img", { class: "q-tip-ic", src: qIcon(cls), alt: "", draggable: "false" }),
      el("span", { class: "q-tip-nm", style: { color: cfg.color } }, cfg.name)),
    el("div", { class: "q-tip-body" }, QUALITY_DESC[cls] || ""),
  );
  positionTip(tip, target);
}
// General explanation tooltip (same look/placement as the category tooltip).
function showInfoTip(target, title, body) {
  const tip = tipEl();
  tip.replaceChildren(
    el("div", { class: "q-tip-head" }, el("span", { class: "q-tip-nm" }, title)),
    el("div", { class: "q-tip-body" }, body),
  );
  positionTip(tip, target);
}
// Compact single-line tooltip (just a label) — same .q-tip surface/placement as the panels, but
// without the head/body split. Used for the player flag's country name.
function showLabelTip(target, label) {
  const tip = tipEl();
  tip.replaceChildren(el("div", { class: "q-tip-nm" }, label));
  positionTip(tip, target);
}
function hideQTip() {
  const tip = document.querySelector(".q-tip");
  if (tip) tip.classList.remove("show");
}
function renderStats() {
  const opSide = S.meSide === "w" ? "b" : "w";
  const meAcc = S.acc[S.meSide], opAcc = S.acc[opSide];
  // The Elo model is fit to reference accuracy values, so feed it our best estimate of that number:
  // the accBias-corrected win%-based accuracy (same quantity the displayed accuracy uses in
  // win% mode). The actual rating anchors the estimate; accuracy nudges it.
  const meRating = S.players[S.meSide]?.rating, opRating = S.players[opSide]?.rating;
  const meEloAcc = calAccBias(S.accElo[S.meSide], meRating), opEloAcc = calAccBias(S.accElo[opSide], opRating);
  // Compact list by default; the expander arrow unfolds the whole list (incl. book moves).
  const list = S.qbreakExpanded ? QBREAK_FULL : QBREAK_SUMMARY;

  // In-place counter update during analysis (so the loader animation doesn't restart).
  if (S.analyzing && statsRefs && statsRefs.expanded === S.qbreakExpanded) {
    for (const k of list) {
      const r = statsRefs.rows[k]; if (!r) continue;
      const cMe = S.counts[S.meSide][k] || 0, cOp = S.counts[opSide][k] || 0;
      r.me.textContent = cMe; r.me.classList.toggle("zero", !cMe);
      r.op.textContent = cOp; r.op.classList.toggle("zero", !cOp);
    }
    return;
  }

  const rows = {};
  const qrows = list.map((k) => {
    const cfg = QUALITY[k];
    const cMe = S.counts[S.meSide][k] || 0, cOp = S.counts[opSide][k] || 0;
    const meCt = el("span", { class: "ct left " + (cMe ? "" : "zero") }, cMe);
    const opCt = el("span", { class: "ct " + (cOp ? "" : "zero") }, cOp);
    rows[k] = { me: meCt, op: opCt };
    return el("div", {
      class: "qbreak-row",
      onmouseenter: (e) => showQTip(e.currentTarget, k),
      onmouseleave: hideQTip,
    },
      meCt,
      el("span", { class: "qlabel" },
        el("img", { class: "qsym", src: qIcon(k), alt: "", draggable: "false" }),
        el("span", { class: "nm" }, cfg.name)),
      opCt,
    );
  });
  const expander = el("button", {
    class: "qbreak-toggle" + (S.qbreakExpanded ? " open" : ""),
    title: S.qbreakExpanded ? "Show fewer categories" : "Show all categories",
    "aria-expanded": S.qbreakExpanded ? "true" : "false",
    onclick: () => { S.qbreakExpanded = !S.qbreakExpanded; renderStats(); reflowAccuracy(S.qbreakExpanded); },
  }, icon("chevron"));
  const qbreak = el("div", { class: "qbreak" }, ...qrows, expander);

  UI.stats.replaceChildren(el("div", { class: "panel" },
    // The button is always rendered (disabled while analyzing or already practicing) so the
    // header height never changes between states.
    el("div", { class: "panel-head acc-head" }, el("h3", {}, "Accuracy"),
      el("button", { class: "practice-btn", disabled: S.analyzing || !!S.practice, title: "Replay the game and re-solve every mistake you made", onclick: startPractice }, "Practice your mistakes")),
    el("div", { class: "panel-body" },
      el("div", { class: "acc-row" },
        el("div", { class: "acc-cell" },
          el("span", { class: "acc-name" }, S.players[S.meSide].name),
          S.analyzing
            ? loaderNode("acc-val", "var(--accent)")
            : el("span", { class: "acc-val", style: { color: "var(--accent)" }, onmouseenter: (e) => showInfoTip(e.currentTarget, "Accuracy", ACCURACY_INFO), onmouseleave: hideQTip }, meAcc == null ? "—" : meAcc.toFixed(1)),
          el("span", { class: "acc-bar" }, el("i", { style: { width: (S.analyzing ? 0 : (meAcc || 0)) + "%", background: "var(--accent)" } })),
          el("span", { class: "est-rating", onmouseenter: (e) => showInfoTip(e.currentTarget, "Estimated Elo", ELO_INFO), onmouseleave: hideQTip }, S.analyzing ? "≈ ··· elo" : "≈ " + (estimateElo(meEloAcc, meRating) ?? "—") + " elo")),
        el("span", { class: "acc-vs" }, "VS"),
        el("div", { class: "acc-cell right" },
          el("span", { class: "acc-name" }, S.players[opSide].name),
          S.analyzing
            ? loaderNode("acc-val", "var(--accent)")
            : el("span", { class: "acc-val", style: { color: "var(--ink-2)" }, onmouseenter: (e) => showInfoTip(e.currentTarget, "Accuracy", ACCURACY_INFO), onmouseleave: hideQTip }, opAcc == null ? "—" : opAcc.toFixed(1)),
          el("span", { class: "acc-bar" }, el("i", { style: { width: (S.analyzing ? 0 : (opAcc || 0)) + "%", background: "var(--ink-3)", marginLeft: (100 - (S.analyzing ? 100 : (opAcc || 0))) + "%" } })),
          el("span", { class: "est-rating", onmouseenter: (e) => showInfoTip(e.currentTarget, "Estimated Elo", ELO_INFO), onmouseleave: hideQTip }, S.analyzing ? "≈ ··· elo" : "≈ " + (estimateElo(opEloAcc, opRating) ?? "—") + " elo")),
      ),
      qbreak,
    ),
  ));
  statsRefs = S.analyzing ? { expanded: S.qbreakExpanded, rows } : null;
}

/* ---------------- Eval graph ---------------- */
function renderGraph() {
  const show = S.settings.evalView === "both" || S.settings.evalView === "graph";
  if (!show) { UI.graph.replaceChildren(); return; }
  const W = 384, H = 120, mid = H / 2;
  const maxPly = Math.max(1, S.total);
  const toX = (p) => (p / maxPly) * W;
  const toY = (cp) => { const c = Math.max(-500, Math.min(500, cp)); return mid - (c / 500) * (mid - 8); };
  // The "color" style flips the y-axis (White advantage pushes the boundary DOWN); the hover marker
  // re-uses whichever mapping the active style draws with, so the dot rides the visible curve.
  const toYc = (cp) => { const c = Math.max(-500, Math.min(500, cp)); return mid + (c / 500) * (mid - 8); };
  const pts = [];
  for (let p = 0; p <= S.total; p++) { if (!S.evals[p]) break; pts.push({ ply: p, cp: scoreToCp(S.evals[p]) }); }
  let line = "", fill = "";
  if (pts.length) {
    line = "M" + pts.map((s) => `${toX(s.ply).toFixed(1)},${toY(s.cp).toFixed(1)}`).join(" L");
    fill = line + ` L${toX(pts[pts.length - 1].ply)},${mid} L0,${mid} Z`;
  }
  const dots = pts.filter((s) => ["blunder", "mistake", "miss", "brilliant", "great"].includes(S.classif[s.ply]));
  const markerX = toX(Math.min(S.idx, maxPly));
  const midLine = `<line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>`;
  const marker = `<line x1="${markerX}" y1="0" x2="${markerX}" y2="${H}" stroke="var(--accent)" stroke-width="1.5" opacity="0.7"/>`;
  const style = S.settings.graphStyle || "area";
  // Classification dots are drawn on every style except the bare "minimal" one.
  const dotsSvg = style === "minimal" ? "" : dots.map((s) =>
    `<circle cx="${toX(s.ply)}" cy="${toY(s.cp)}" r="3.2" fill="${QUALITY[S.classif[s.ply]].color}" stroke="var(--panel)" stroke-width="1.4"/>`).join("");
  let inner;
  if (style === "color") {
    // Black/White: the graph is split into a white field (top) and a black field (bottom) by the
    // eval curve, so a single glance tells you who's ahead — when White is winning the white field
    // swells downward and dominates the chart, and vice-versa. (Uses its own y-mapping where a White
    // advantage pushes the boundary DOWN, matching the familiar eval-graph look.)
    const cpts = pts.map((s) => ({ x: toX(s.ply), y: toYc(s.cp) }));
    const boundary = cpts.length ? "M" + cpts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L") : "";
    // Black field = area below the boundary curve; the white background shows through above it.
    const blackArea = cpts.length
      ? boundary + ` L${cpts[cpts.length - 1].x.toFixed(1)},${H} L0,${H} Z`
      : "";
    // Classification dots ride on the boundary (re-projected with this style's y-mapping).
    const dotsC = dots.map((s) =>
      `<circle cx="${toX(s.ply)}" cy="${toYc(s.cp)}" r="3.2" fill="${QUALITY[S.classif[s.ply]].color}" stroke="var(--panel)" stroke-width="1.4"/>`).join("");
    // The 0.00 "ground" line sits dead-centre, drawn over both fields in a light grey so it reads
    // against the white above and the black below.
    const groundLine = `<line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#c7c5bc" stroke-width="1.4"/>`;
    inner = `<rect x="0" y="0" width="${W}" height="${H}" fill="#f4f2ea"/>`
      + (blackArea ? `<path d="${blackArea}" fill="#262626"/>` : "")
      + groundLine
      + (boundary ? `<path d="${boundary}" fill="none" stroke="#9a9a9a" stroke-width="1.2" stroke-linejoin="round"/>` : "")
      + dotsC + marker;
  } else if (style === "line") {
    // Just the evaluation curve (no fill) + dots.
    inner = midLine + (line ? `<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>` : "") + dotsSvg + marker;
  } else if (style === "minimal") {
    // Thin, quiet curve — no fill, no dots.
    inner = midLine + (line ? `<path d="${line}" fill="none" stroke="color-mix(in oklab, var(--accent) 80%, var(--ink-3))" stroke-width="1.4" stroke-linejoin="round"/>` : "") + marker;
  } else {
    // "area" (default): tinted top half + filled area under the curve + curve + dots.
    inner = `<rect x="0" y="0" width="${W}" height="${mid}" fill="color-mix(in oklab, var(--accent) 8%, transparent)"/>`
      + (fill ? `<path d="${fill}" fill="color-mix(in oklab, var(--accent) 22%, transparent)"/>` : "")
      + midLine
      + (line ? `<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>` : "")
      + dotsSvg + marker;
  }
  // Hover marker: a vertical guide + a dot that rides the curve, both hidden until the mouse enters.
  const hoverY = style === "color" ? toYc : toY;
  const hover = `<g class="eval-hover" style="display:none"><line class="eval-hover-line" x1="0" y1="0" x2="0" y2="${H}" vector-effect="non-scaling-stroke"/><circle class="eval-hover-dot" cx="0" cy="0" r="4.7"/></g>`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${inner}${hover}</svg>`;
  // Map a pointer event to the nearest plotted ply (0..last ply that has an eval).
  const plyFromEvent = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !pts.length) return null;
    return Math.max(0, Math.min(pts.length - 1, Math.round(((e.clientX - r.left) / r.width) * maxPly)));
  };
  // Click anywhere on the graph → jump straight to that move (instant, no stepping through).
  const jumpFromEvent = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width) return;
    const ply = Math.max(0, Math.min(S.total, Math.round(((e.clientX - r.left) / r.width) * S.total)));
    gotoMainline(ply);
  };
  // Move the hover marker to the pointed ply and float its eval value above the dot.
  const evalTip = () => { let t = document.querySelector(".eval-tip"); if (!t) { t = el("div", { class: "eval-tip" }); document.body.append(t); } return t; };
  const hideHover = () => {
    const g = UI.graph.querySelector(".eval-hover"); if (g) g.style.display = "none";
    const t = document.querySelector(".eval-tip"); if (t) t.classList.remove("show");
  };
  const hoverMove = (e) => {
    const ply = plyFromEvent(e);
    if (ply == null) return;
    const x = toX(ply), y = hoverY(pts[ply].cp);
    const g = e.currentTarget.querySelector(".eval-hover");
    if (g) {
      g.querySelector(".eval-hover-line").setAttribute("x1", x);
      g.querySelector(".eval-hover-line").setAttribute("x2", x);
      const dot = g.querySelector(".eval-hover-dot");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y);
      g.style.display = "";
    }
    const r = e.currentTarget.getBoundingClientRect();
    const t = evalTip();
    t.textContent = evalText(S.evals[ply]);
    t.style.left = (r.left + (x / W) * r.width) + "px";
    t.style.top = (r.top + (y / H) * r.height - 10) + "px";
    t.classList.add("show");
  };
  UI.graph.replaceChildren(el("div", { class: "panel eval-side" },
    el("div", { class: "panel-head" }, el("h3", {}, "Evaluation")),
    el("div", { class: "panel-body", style: { paddingTop: "8px", paddingBottom: "8px" } },
      el("div", { class: "evalgraph clickable-graph", title: "Click to jump to a move", html: svg, onclick: jumpFromEvent, onmousemove: hoverMove, onmouseleave: hideHover })),
  ));
}

/* ---------------- Move list ---------------- */
function moveCell(ply) {
  if (ply > S.total || ply < 1) return el("span");
  const pos = S.positions[ply];
  const cls = S.classif[ply];
  const showBadge = cls && (NOTEWORTHY.has(cls) || S.settings.badgeStyle === "dot");
  const glyph = GLYPH[pos.san && /^[KQRBN]/.test(pos.san) ? pos.san[0] : "P"];
  return el("span", { class: "ml-move" + (!S.analysisMode && ply === S.idx ? " current" : ""), "data-ply": ply, onclick: () => gotoMainline(ply) },
    el("span", { class: "pc", style: { color: pos.color === "w" ? "var(--ink)" : "var(--ink-2)" } }, glyph),
    el("span", {}, pos.san),
    showBadge ? qBadge(cls) : null,
  );
}
function qBadge(k) {
  const cfg = QUALITY[k]; const st = S.settings.badgeStyle;
  if (st === "dot") return el("span", { class: "qb dot", style: { background: cfg.color }, title: cfg.name });
  if (st === "label") return el("span", { class: "qb label", style: { background: cfg.color } }, cfg.name);
  // "icon" → the real SVG badge
  return el("img", { class: "qb icon", src: qIcon(k), alt: cfg.name, title: cfg.name, draggable: "false" });
}
// Move the .current highlight to the cell for S.idx and auto-scroll it into view, without
// touching the rest of the list. Used both after a full rebuild and on a plain step.
function highlightCurrentMove() {
  const prev = UI.movesBody.querySelector(".ml-move.current");
  if (prev) prev.classList.remove("current");
  // In analysis mode no mainline cell is "current" (the original render never marked one).
  const cur = S.analysisMode ? null : UI.movesBody.querySelector('.ml-move[data-ply="' + S.idx + '"]');
  if (cur) {
    cur.classList.add("current");
    const cr = cur.getBoundingClientRect(), sr = UI.movesBody.getBoundingClientRect();
    UI.movesBody.scrollTop += (cr.top - sr.top) - (UI.movesBody.clientHeight - cr.height - 14);
  }
}
let _movesSig = null;
function renderMoves() {
  const nMoves = Math.ceil(S.total / 2);
  const ml = S.settings.mlStyle;
  // The list's CONTENT only changes with the game, the layout/badge style, or the classifications
  // (which fill in during analysis) — NOT when you merely step to another move. Rebuilding every
  // cell (each with a badge <img>) plus forcing a reflow on every step is what made stepping feel
  // laggy. Cache by a signature; on a plain step just slide the .current marker (cheap).
  const sig = ml + "|" + S.settings.badgeStyle + "|" + S.total + "|" + (S.analysisMode ? 1 : 0) + "|" + S.classif.join("");
  if (sig === _movesSig && UI.movesBody.firstChild) { highlightCurrentMove(); return; }
  _movesSig = sig;
  let list;
  if (ml === "compact") {
    list = el("div", { class: "movelist ml-compact ml-scroll" });
    for (let n = 1; n <= nMoves; n++) list.append(el("span", { class: "ml-num" }, n + "."), moveCell(n * 2 - 1), moveCell(n * 2));
  } else {
    list = el("div", { class: "movelist " + (ml === "cards" ? "ml-cards" : "ml-rows") + " ml-scroll" });
    for (let n = 1; n <= nMoves; n++) list.append(el("div", { class: "ml-pair" }, el("span", { class: "ml-num" }, n), moveCell(n * 2 - 1), moveCell(n * 2)));
  }
  UI.movesBody.style.padding = ml === "rows" ? "0" : "var(--pad)";
  UI.movesBody.replaceChildren(list);
  // The Moves header stays clean — no "Start" placeholder and no running current-move readout.
  UI.movesCount.textContent = "";
  // Book moves are now shown in the Accuracy breakdown (expanded), no longer here in "Moves".
  UI.movesFoot.hidden = true;
  // auto-scroll to the current move
  highlightCurrentMove();
}

/* ---------------- Engine lines ---------------- */
// While solving a practice position, the engine lines would give the answer away → hide them.
function renderEnginePractice() {
  UI.engine.replaceChildren(el("div", { class: "panel" },
    el("div", { class: "panel-head" }, el("h3", {}, "Engine"), el("span", { class: "count" }, "Practice")),
    el("div", { class: "panel-body engine-body" },
      el("div", { class: "engine-empty" }, "Find a stronger move — engine lines are hidden until you solve it.")),
  ));
}
// Choose the source of the engine lines for the shown position and draw the panel.
function renderEngineCurrent() {
  // Hide the engine lines for the whole practice flow, not just the solve: while rolling/skipping to
  // the next mistake (or replaying the demo) the lines would briefly flash the answer for the upcoming
  // position. They only reappear once practice is fully finished/exited.
  if (S.practice && (S.practice.solving || S.practice.rolling || S.practice.demoing)) { renderEnginePractice(); return; }
  if (S.analysisMode && S.variation) {
    const b = activePos().best;
    renderEngine(b ? b.lines : null);
  } else {
    const b = S.bests[S.idx];
    let lines = b ? b.lines : null;
    // The batch only stored the single best line. If the user wants more, show the richer set we
    // searched on demand for THIS position (requestPanelLines), then ensure that search is running.
    const panelReady = !!(S._panelCache && S._panelCache.idx === S.idx && S._panelCache.lines);
    if (panelReady && (!lines || S._panelCache.lines.length > lines.length)) lines = S._panelCache.lines;
    // While the richer search for THIS position is still pending, keep the previous render's extra
    // lines on screen so the panel doesn't shrink to one line then grow back on every move.
    const padFromCache = S.settings.engineLines > 1 && !panelReady && !!lines && lines.length < S.settings.engineLines;
    renderEngine(lines, padFromCache);
    requestPanelLines();
  }
}
// Live, on-demand search of the position you're viewing on the mainline, to fill the extra engine-
// panel candidate lines beyond the single line the batch stored. Cheap: it only runs for the
// position currently shown, is cancelled when you navigate away, and no-ops when 1 line is enough.
async function requestPanelLines() {
  if (S.analyzing || S.analysisMode) return;          // not during the batch, not in variation mode
  const want = S.settings.engineLines;
  if (!want || want <= 1) return;                     // user only wants the single line
  const i = S.idx;
  const stored = S.bests[i];
  if (!stored || !stored.lines) return;               // position not analysed yet
  if (stored.lines.length >= want) return;            // batch already has enough (old saved games)
  if (S._panelCache && S._panelCache.idx === i && S._panelCache.lines.length >= want) return; // cached
  const fen = S.positions[i].fen;
  if (terminalScore(fen)) return;
  const token = ++S.panelToken;
  if (!S.liveEngine) {
    S.liveEngine = await createEngine({ Hash: S.settings.engineHash, "Skill Level": S.settings.engineSkill });
    if (token !== S.panelToken) return;
  }
  S.liveEngine.stop();
  let res; try { res = await S.liveEngine.analyse(fen, S.settings.engineDepth, want); } catch { return; }
  if (token !== S.panelToken || S.idx !== i || S.analysisMode) return;   // navigated away → drop it
  S._panelCache = { idx: i, fen, lines: res.lines };
  renderEngineCurrent();
}
const ENGINE_NAME = { nnue: "Stockfish 18 NNUE", wasm: "Stockfish 10", asm: "Stockfish 10 (asm.js)" };
function renderEngine(lines, padFromCache = false) {
  const curFen = activePos().fen;
  const want = S.settings.engineLines;
  // The last full set of real lines we rendered, kept (with the fen they were computed for, so the
  // SAN stays correct) to fill slots that the new position hasn't searched yet — and to hold the
  // panel steady while the engine re-computes (lines === null, e.g. "Play best moves from here").
  const cached = S._lastEngineLines;
  let body;
  if (lines && !lines.length) {
    S._lastEngineLines = null; // final position: nothing worth keeping
    body = el("div", { class: "engine-empty" }, "Final position.");
  } else if (!lines && !cached) {
    body = el("div", { class: "engine-empty" }, "Analyzing …");
  } else {
    // Build up to `want` slots. Each slot carries its OWN fen: new lines use the current position,
    // any slot the new search hasn't filled yet falls back to the previous render's line for that
    // slot — so the second line stays visible until the new one lands and the panel never resizes.
    const cur = lines || [];
    const useCache = padFromCache || !lines; // null lines → keep the whole previous set on screen
    const slots = [];
    for (let i = 0; i < want; i++) {
      if (cur[i]) slots.push({ l: cur[i], fen: curFen });
      else if (useCache && cached && cached.lines[i]) slots.push({ l: cached.lines[i], fen: cached.fen });
      else slots.push(null); // no line for this slot (e.g. a forced move) → keep a blank row so the panel height never changes
    }
    // Only overwrite the cache with a complete fresh set, so partial (single-line) batch renders
    // don't wipe the previous second line we still want to show.
    if (cur.length >= want) S._lastEngineLines = { lines: cur, fen: curFen };
    body = el("div", {},
      ...slots.map((slot) => {
        // Empty slot (a forced move with no second line, etc.) → a blank row of the same height so
        // the panel keeps the size of `want` lines and never resizes between moves.
        if (!slot) return el("div", { class: "engine-line" }, el("span", { class: "ev" }, " "), el("span", { class: "moves" }, " "));
        const { l, fen } = slot;
        const wr = whiteRel(l.score, fen); const cp = scoreToCp(wr);
        const evTxt = wr.mate != null ? evalText(wr) : (cp >= 0 ? "+" : "") + (cp / 100).toFixed(2);
        const toks = uciLineToSan(fen, (l.pv || "").split(/\s+/).filter(Boolean), 6);
        // Click a line → play the whole line out as a variation (analysis mode).
        return el("div", { class: "engine-line clickable", onclick: () => playLine(l.pv) },
          el("span", { class: "ev " + (cp >= 0 ? "pos" : "neg") }, evTxt),
          el("span", { class: "moves" }, ...toks.map((t) => /^\d/.test(t) ? el("b", {}, t + " ") : el("span", {}, t + " "))),
        );
      }),
    );
  }
  // "Play best moves from here": re-analyzes each position and plays the engine's actual best
  // move until mate/draw (or until the user takes over). Not a fixed line — so the moves are
  // always the genuine best, unlike an engine line's (unreliable) tail.
  const bestWalkBtn = el("button", {
    class: "engine-bestwalk" + (S.bestWalking ? " on" : ""),
    onclick: () => { if (S.bestWalking) { stopBestWalk(); renderControls(); renderEngineCurrent(); } else playBestMoves(); },
  }, S.bestWalking ? "■ Stop" : "▶ Play best moves from here");
  UI.engine.replaceChildren(el("div", { class: "panel" },
    el("div", { class: "panel-head" }, el("h3", {}, "Engine"),
      el("span", { class: "count" }, `${activeEngineName()} · depth ${S.settings.engineDepth}`)),
    el("div", { class: "panel-body engine-body" }, body, bestWalkBtn),
  ));
}

/* ---------------- Topbar meta ---------------- */
function metaChips() {
  const res = S.players[S.meSide].result;
  let outcome = "Result unknown";
  if (res === "1-0") outcome = S.meSide === "w" ? "Victory" : "Loss";
  else if (res === "0-1") outcome = S.meSide === "b" ? "Victory" : "Loss";
  else if (res && res.includes("1/2")) outcome = "Draw";
  const tcRaw = S.meta.timeClass || S.headers.TimeControl || "";
  const tc = tcRaw ? tcRaw.charAt(0).toUpperCase() + tcRaw.slice(1) : ""; // "bullet" → "Bullet"
  const date = S.headers.UTCDate || S.headers.Date || "";
  const chips = [el("span", { class: "meta-chip" }, el("b", {}, outcome))];
  if (tc) chips.push(el("span", { class: "meta-dot" }), el("span", { class: "meta-chip" }, icon("bolt"), el("b", {}, tc)));
  if (date) chips.push(el("span", { class: "meta-dot" }), el("span", { class: "meta-chip" }, el("b", {}, date.replace(/\./g, "-"))));
  return chips;
}

/* ---------------- Settings ---------------- */
// A setting label. If `info` is given, hovering it shows the same explanation tooltip as the
// accuracy panel (with a subtle dotted underline to hint it's there).
function setLabel(label, info) {
  const props = { class: "set-lbl" + (info ? " has-info" : "") };
  if (info) {
    props.onmouseenter = (e) => showInfoTip(e.currentTarget, label, info);
    props.onmouseleave = hideQTip;
  }
  return el("span", props, label);
}
// Collapsible settings section. Open/closed is remembered per title in S.setOpen (default open).
function section(title, ...children) {
  const kids = children.filter(Boolean);
  if (S.setOpen[title] == null) S.setOpen[title] = false; // default closed for a cleaner overview
  const open = S.setOpen[title];
  const head = el("button", {
    class: "set-sect-head" + (open ? " open" : ""),
    "aria-expanded": open ? "true" : "false",
    onclick: () => { S.setOpen[title] = !S.setOpen[title]; renderSettings(); },
  }, el("span", {}, title), icon("chevron"));
  const body = el("div", { class: "set-sect-body" }, ...kids);
  return el("div", { class: "set-section" + (open ? " open" : "") }, head, body);
}
function seg(label, key, options, info) {
  return el("div", { class: "set-row" },
    setLabel(label, info),
    el("div", { class: "set-seg" },
      ...options.map((o) => el("button", { class: S.settings[key] === o ? "on" : "", onclick: () => setSetting(key, o) }, o))),
  );
}
// Generic slider. opts: { fmt(v)→text, onChange(v) }. Updates + saves live
// without rebuilding the whole panel (so you can drag smoothly without losing the slider).
function slider(label, key, min, max, step, opts = {}) {
  const fmt = opts.fmt || ((v) => v.toFixed(2));
  const out = el("b", {}, fmt(+S.settings[key]));
  return el("div", { class: "set-ctrl" },
    el("div", { class: "set-ctrl-top" }, setLabel(label, opts.info), out),
    el("input", {
      type: "range", min, max, step, value: S.settings[key],
      oninput: (e) => {
        const v = +e.target.value;
        out.textContent = fmt(v);
        S.settings[key] = v;
        chrome.storage.local.set({ settings: S.settings });
        opts.onChange?.(v);
      },
    }),
  );
}
function pieceGrid() {
  return el("div", { class: "set-row" },
    el("span", { class: "set-lbl" }, "Pieces"),
    el("div", { class: "set-pieces" },
      ...PIECE_STYLES.map((o) => el("button", { class: S.settings.pieceStyle === o ? "on" : "", onclick: () => setSetting("pieceStyle", o) }, PIECE_STYLE_LABEL[o] || o))),
  );
}
function colorChips(label, key, entries) {
  return el("div", { class: "set-row" },
    label ? el("span", { class: "set-lbl" }, label) : null,
    el("div", { class: "set-chips" },
      ...entries.map((e) => { const chip = el("button", { class: "set-chip" + (S.settings[key] === e.value ? " on" : ""), title: e.title || e.value, onclick: e.onClick || (() => setSetting(key, e.value)) }); e.render(chip); return chip; })),
  );
}
// Current custom board colours [light, dark] (with sane fallbacks).
function customBoardColors() {
  return [S.settings.boardCustomLight || "#e6e1d4", S.settings.boardCustomDark || "#7d6b58"];
}
// --- colour maths (hex ↔ HSV) for the in-app picker ---
const _clamp01 = (x) => Math.max(0, Math.min(1, x));
function hexToRgb(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16) || 0;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  const t = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + t(r) + t(g) + t(b);
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60; if (h < 0) h += 360;
  }
  return { h, s: mx ? d / mx : 0, v: mx };
}
function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}
const hexToHsv = (hex) => { const { r, g, b } = hexToRgb(hex); return rgbToHsv(r, g, b); };
const hsvToHex = (h, s, v) => { const { r, g, b } = hsvToRgb(h, s, v); return rgbToHex(r, g, b); };

// A themed HSV colour picker (saturation/value square + hue slider + hex input). onLive fires
// continuously while dragging; onCommit fires when a drag/edit settles. Returns { el, setHex }.
function buildColorPicker(initialHex, onLive, onCommit) {
  let { h, s, v } = hexToHsv(initialHex);
  const sv = el("div", { class: "cpick-sv" }), svThumb = el("div", { class: "cpick-sv-thumb" });
  sv.append(svThumb);
  const hue = el("div", { class: "cpick-hue" }), hueThumb = el("div", { class: "cpick-hue-thumb" });
  hue.append(hueThumb);
  const hex = el("input", { class: "cpick-hexin mono", type: "text", spellcheck: "false", maxlength: "7" });
  const render = () => {
    const cur = hsvToHex(h, s, v);
    sv.style.backgroundColor = `hsl(${h} 100% 50%)`;
    svThumb.style.left = (s * 100) + "%";
    svThumb.style.top = ((1 - v) * 100) + "%";
    svThumb.style.background = cur;
    hueThumb.style.left = (h / 360 * 100) + "%";
    if (document.activeElement !== hex) hex.value = cur.toUpperCase();
  };
  const live = () => { render(); onLive(hsvToHex(h, s, v)); };
  const drag = (elm, onPos) => {
    const at = (e) => { const r = elm.getBoundingClientRect(); onPos(_clamp01((e.clientX - r.left) / r.width), _clamp01((e.clientY - r.top) / r.height)); live(); };
    elm.addEventListener("pointerdown", (e) => {
      e.preventDefault(); try { elm.setPointerCapture(e.pointerId); } catch {} at(e);
      const mv = (ev) => at(ev);
      const up = (ev) => { elm.removeEventListener("pointermove", mv); elm.removeEventListener("pointerup", up); try { elm.releasePointerCapture(ev.pointerId); } catch {} onCommit(hsvToHex(h, s, v)); };
      elm.addEventListener("pointermove", mv); elm.addEventListener("pointerup", up);
    });
  };
  drag(sv, (x, y) => { s = x; v = 1 - y; });
  drag(hue, (x) => { h = x * 360; });
  hex.addEventListener("input", () => {
    const m = hex.value.trim().match(/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
    if (m) { const o = hexToHsv("#" + m[1]); h = o.h; s = o.s; v = o.v; render(); onLive(hsvToHex(h, s, v)); }
  });
  hex.addEventListener("change", () => { render(); onCommit(hsvToHex(h, s, v)); });
  render();
  return {
    el: el("div", { class: "cpick-pick" }, sv, hue, el("div", { class: "cpick-hexrow" }, hex)),
    setHex: (hx) => { const o = hexToHsv(hx); h = o.h; s = o.s; v = o.v; render(); },
  };
}

// Themed colour-picker popover for the custom board chip: pick Light/Dark squares with an in-app
// HSV picker (matches the app's dark theme). The board updates live; the choice persists on commit.
let _boardPickCleanup = null;
function closeBoardColorPicker() { if (_boardPickCleanup) { _boardPickCleanup(); _boardPickCleanup = null; } }
function openBoardColorPicker(anchor) {
  closeBoardColorPicker();
  setSetting("boardTheme", "custom"); // select custom so these colours are shown on the board now
  let target = "boardCustomLight"; // which square colour is being edited
  const swL = el("button", { class: "cpick-target on" }), swD = el("button", { class: "cpick-target" });
  const paint = () => {
    const [lt, dk] = customBoardColors();
    swL.replaceChildren(el("span", { class: "cpick-tsw", style: { background: lt } }), el("span", {}, "Light"));
    swD.replaceChildren(el("span", { class: "cpick-tsw", style: { background: dk } }), el("span", {}, "Dark"));
  };
  const picker = buildColorPicker(S.settings[target],
    (hex) => { S.settings[target] = hex; applySettings(); paint(); },         // live
    (hex) => { S.settings[target] = hex; chrome.storage.local.set({ settings: S.settings }); }, // commit
  );
  const setActive = (key, btn) => {
    target = key;
    swL.classList.toggle("on", btn === swL); swD.classList.toggle("on", btn === swD);
    picker.setHex(S.settings[key]);
  };
  swL.addEventListener("click", () => setActive("boardCustomLight", swL));
  swD.addEventListener("click", () => setActive("boardCustomDark", swD));
  paint();
  const pop = el("div", { class: "board-cpick" },
    el("div", { class: "cpick-title" }, "Custom board"),
    el("div", { class: "cpick-targets" }, swL, swD),
    picker.el,
  );
  document.body.append(pop);
  // Anchor under the chip, kept inside the viewport.
  const r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
  let left = r.left, top = r.bottom + 6;
  if (left + pr.width > window.innerWidth - 8) left = window.innerWidth - 8 - pr.width;
  if (top + pr.height > window.innerHeight - 8) top = r.top - 6 - pr.height;
  pop.style.left = Math.max(8, left) + "px";
  pop.style.top = Math.max(8, top) + "px";
  const onDown = (e) => { if (!pop.contains(e.target)) closeBoardColorPicker(); };
  const onKey = (e) => { if (e.key === "Escape") closeBoardColorPicker(); };
  setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
  document.addEventListener("keydown", onKey);
  _boardPickCleanup = () => {
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("keydown", onKey);
    pop.remove();
    // refresh the chip preview behind the popover
    if (UI.settings && !UI.settings.hidden) { const sc = UI.settings.scrollTop; renderSettings(); UI.settings.scrollTop = sc; }
  };
}
// On/Off toggle row (reused in several places).
function toggleRow(label, key, onSet = setSetting, info) {
  return el("div", { class: "set-row" },
    setLabel(label, info),
    el("div", { class: "set-seg" },
      el("button", { class: S.settings[key] ? "on" : "", onclick: () => onSet(key, true) }, "On"),
      el("button", { class: !S.settings[key] ? "on" : "", onclick: () => onSet(key, false) }, "Off"),
    ),
  );
}
// Engine segment/slider: changing it saves + triggers re-analysis (scheduleReanalyze via setEngineSetting).
function engineSeg(label, key, options, fmt, info) {
  return el("div", { class: "set-row" },
    setLabel(label, info),
    el("div", { class: "set-seg" },
      ...options.map((o) => el("button", { class: S.settings[key] === o ? "on" : "", onclick: () => setEngineSetting(key, o) }, fmt ? fmt(o) : String(o)))),
  );
}
function engineSlider(label, key, min, max, step, opts = {}) {
  const fmt = opts.fmt || ((v) => String(v));
  const out = el("b", {}, fmt(+S.settings[key]));
  return el("div", { class: "set-ctrl" },
    el("div", { class: "set-ctrl-top" }, setLabel(label, opts.info), out),
    el("input", {
      type: "range", min, max, step, value: S.settings[key],
      oninput: (e) => {
        const v = +e.target.value;
        out.textContent = fmt(v);
        S.settings[key] = v;
        chrome.storage.local.set({ settings: S.settings });
        if (S.liveEngine) { try { S.liveEngine.terminate(); } catch {} S.liveEngine = null; S.liveToken++; }
        scheduleReanalyze();
      },
    }),
  );
}
// A live-tuning slider for the classification / accuracy knobs: saves the value and re-labels the
// game from the already-searched evals — no engine work, so dragging gives instant feedback.
function clsSlider(label, key, min, max, step, opts = {}) {
  const fmt = opts.fmt || ((v) => String(v));
  const out = el("b", {}, fmt(+S.settings[key]));
  return el("div", { class: "set-ctrl" },
    el("div", { class: "set-ctrl-top" }, setLabel(label, opts.info), out),
    el("input", {
      type: "range", min, max, step, value: S.settings[key],
      oninput: (e) => {
        const v = +e.target.value;
        out.textContent = fmt(v);
        S.settings[key] = v;
        chrome.storage.local.set({ settings: S.settings });
        applyClassificationChange();
      },
    }),
  );
}
let _clsT = null;
// Re-run only the classification + accuracy (computeDerived) on the existing engine evals and
// refresh everything the labels feed. Debounced so dragging a slider stays smooth.
function applyClassificationChange() {
  if (!S.positions || !S.positions.length) return;
  clearTimeout(_clsT);
  _clsT = setTimeout(() => {
    computeDerived();
    renderStats(); renderMoves(); renderReview(); renderGraph();
    if (!S.analysisMode) { renderBestArrow(); renderEngineCurrent(); }
  }, 60);
}
// Reset every Engine-tab setting to its default and re-run the analysis.
async function resetEngineSettings() {
  for (const k of ENGINE_SETTING_KEYS) S.settings[k] = DEFAULT_SETTINGS[k];
  await chrome.storage.local.set({ settings: S.settings });
  if (S.liveEngine) { try { S.liveEngine.terminate(); } catch {} S.liveEngine = null; S.liveToken++; }
  scheduleReanalyze();
  renderEngineCurrent();
  if (UI.settings && !UI.settings.hidden) renderSettings();
  toast("Engine settings reset");
}
// Controls for the "Background" section: preset/custom picker, fit mode, tile size, upload button.
function bgControls() {
  const swatch = (c, css) => { c.style.background = css; c.style.backgroundSize = "cover"; c.style.backgroundPosition = "center"; };
  const h = S.settings.bgHue ?? 45, s = S.settings.bgSat ?? 14, l = S.settings.bgLight ?? 7;
  const colorCss = `radial-gradient(120% 80% at 50% -10%, hsl(${h} ${s}% ${Math.min(100, l + 12)}%), hsl(${h} ${s}% ${l}%) 60%)`;
  const isColor = S.settings.bg === "color";
  const entries = [
    { value: "color", render: (c) => { c.title = "Custom colour"; swatch(c, colorCss); } },
    { value: "olive", render: (c) => { c.title = "Dark"; swatch(c, "radial-gradient(120% 80% at 50% -10%, #141414, #0a0a0a 60%)"); } },
    { value: "ember", render: (c) => { c.title = "Ember"; swatch(c, `url("${BG_PRESETS.ember}")`); } },
    { value: "slate", render: (c) => { c.title = "Slate"; swatch(c, `url("${BG_PRESETS.slate}")`); } },
  ];
  if (S.settings.bgCustom) entries.push({ value: "custom", render: (c) => { c.title = "Your image"; swatch(c, `url("${S.settings.bgCustom}")`); } });
  return [
    colorChips("Image", "bg", entries),
    // HSL pickers — only when the "Custom colour" tone is selected. onChange repaints live.
    isColor ? slider("Hue", "bgHue", 0, 360, 1, { fmt: (v) => Math.round(v) + "°", onChange: applyBackground }) : null,
    isColor ? slider("Saturation", "bgSat", 0, 100, 1, { fmt: (v) => Math.round(v) + "%", onChange: applyBackground }) : null,
    isColor ? slider("Lightness", "bgLight", 0, 100, 1, { fmt: (v) => Math.round(v) + "%", onChange: applyBackground }) : null,
    // Fit / tiling only apply to image backgrounds.
    isColor ? null : seg("Fit", "bgFit", ["cover", "tile"]),
    (!isColor && S.settings.bgFit === "tile") ? seg("Tile size", "bgTile", ["small", "medium", "large"]) : null,
    el("div", { class: "set-row" },
      el("span", { class: "set-lbl" }, "Custom"),
      el("button", { class: "set-reset", style: { margin: 0 }, onclick: uploadBackground }, "Upload image…")),
    el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "PNG, JPEG, WebP, GIF or AVIF.")),
  ];
}
function visualSettings() {
  const boardEntries = Object.entries(BOARD_THEMES).map(([k, [lt, dk]]) => ({
    value: k, render: (chip) => chip.append(el("span", { class: "half l", style: { background: lt } }), el("span", { class: "half r", style: { background: dk } })),
  }));
  // Bundled Kadagaden boards — each chip previews the real artwork (the SVG as the chip background).
  for (const [k, b] of Object.entries(BUNDLED_BOARDS)) {
    boardEntries.push({
      value: k, title: b.label,
      render: (chip) => { chip.classList.add("chip-board-art"); chip.style.backgroundImage = `url("${_url("boards-img/" + b.file)}")`; },
    });
  }
  // The detected chess.com board is shown as an extra chip at the front (can be selected/deselected).
  if (S.settings.ccBoardUrl || S.settings.ccBoardTheme) {
    const [lt, dk] = CC_BOARD_COLORS[S.settings.ccBoardTheme] || BOARD_THEMES.green;
    boardEntries.unshift({
      value: "chesscom",
      render: (chip) => {
        chip.title = "Matched board";
        chip.append(el("span", { class: "half l", style: { background: lt } }), el("span", { class: "half r", style: { background: dk } }));
      },
    });
  }
  // Custom colour chip — always first. Clicking it selects custom and opens the colour picker.
  {
    const [lt, dk] = customBoardColors();
    boardEntries.unshift({
      value: "custom",
      title: "Custom colours — click to pick",
      onClick: (e) => openBoardColorPicker(e.currentTarget),
      render: (chip) => {
        chip.classList.add("chip-custom");
        chip.append(
          el("span", { class: "half l", style: { background: lt } }),
          el("span", { class: "half r", style: { background: dk } }),
          el("span", { class: "chip-edit" }, "✎"),
        );
      },
    });
  }
  const accentEntries = Object.keys(ACCENTS).map((hex) => ({
    value: hex, render: (chip) => { chip.style.background = "transparent"; chip.append(el("span", { class: "set-accent", style: { background: hex } })); },
  }));
  return el("div", {},
    section("Theme",
      colorChips("Accent", "accent", accentEntries),
    ),
    section("Board / Pieces",
      colorChips("", "boardTheme", boardEntries),
      pieceGrid(),
    ),
    section("Best-move arrow",
      toggleRow("Show arrow", "bestArrow"),
      toggleRow("Show the threat", "showThreat", setSetting, "Draws a yellow arrow with the opponent's best move as if it were their turn — i.e. the threat against the move you just played. Helps answer \"why was that bad / what am I missing?\""),
      slider("Opacity", "arrowOpacity", 0.3, 1, 0.02, { onChange: refreshArrows }),
      slider("Shaft width", "arrowShaft", 0.14, 0.42, 0.01, { onChange: refreshArrows }),
      slider("Head size", "arrowHead", 0.22, 0.55, 0.01, { onChange: refreshArrows }),
      el("div", { class: "set-row hint" },
        el("span", { class: "set-lbl" }, "Own arrows/moves"),
        el("span", { class: "set-note" }, "Right-click + drag = arrow · left-click-drag a piece = analysis"),
      ),
    ),
    section("Loading",
      seg("Animation", "loaderStyle", ["dots", "bounce", "spinner", "wave"]),
    ),
    section("Move animation",
      toggleRow("Animation", "moveAnim"),
      slider("Speed", "animSpeed", 1, 10, 1, { fmt: (v) => (440 - v * 40) + " ms" }),
    ),
    section("Layout",
      seg("Eval", "evalView", ["both", "bar", "graph"]),
      seg("Bar", "barStyle", ["classic", "gradient", "mono", "accent"]),
      seg("Graph", "graphStyle", ["area", "line", "color", "minimal"]),
      el("button", { class: "set-reset reorg-toggle-btn", onclick: toggleReorganize }, S.reorganize ? "Done reorganizing" : "Reorganize panels"),
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Reorganize lets you drag & resize the panels; your arrangement is saved automatically.")),
      el("button", { class: "set-reset", onclick: () => { resetLayout(); toast("Layout reset"); } }, "Reset modules"),
    ),
    section("Move list",
      seg("Style", "mlStyle", ["rows", "cards", "compact"]),
      seg("Badges", "badgeStyle", ["icon", "dot", "label"]),
      slider("Badge size", "badgeScale", 0.7, 1.6, 0.05, {
        fmt: (v) => Math.round(v * 100) + " %",
        onChange: (v) => document.documentElement.style.setProperty("--badge-scale", v),
      }),
    ),
    section("Coach",
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Who appears and narrates. Switch any time — the new coach picks up right where you are.")),
      coachPicker(),
      el("div", { class: "set-row" },
        setLabel("Special replies", "On = the coach narrates in their own voice. Off = neutral, plain commentary (the coach still appears and reacts on the board)."),
        el("div", { class: "set-seg" },
          el("button", { class: !S.settings.coachPlain ? "on" : "", onclick: () => setCoachPlain(false) }, "On"),
          el("button", { class: S.settings.coachPlain ? "on" : "", onclick: () => setCoachPlain(true) }, "Off"),
        ),
      ),
    ),
    section("Background", ...bgControls()),
    section("Insights",
      slider("Text size", "insightFont", 11, 25, 1, {
        fmt: (v) => v + " px",
        onChange: (v) => document.documentElement.style.setProperty("--ip-font", v + "px"),
      }),
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Font size of the move commentary in the Insight panel.")),
    ),
    section("Sound",
      toggleRow("Move sound", "sound"),
      slider("Volume", "soundVolume", 0, 100, 1, { fmt: (v) => v + " %" }),
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Pick a sound for each board event, then shape it with the pitch and speed knobs. Changes preview as you make them.")),
      ...SOUND_EVENTS.map(([key, label]) => fxEventControls(key, label)),
      wrongSoundPicker(),
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "The \"Wrong answer\" effect plays when you miss a move in practice mode. Pick one to preview it.")),
    ),
  );
}
// Coach personality dropdown — only personalities that have a built animated character. Uses the
// library's custom dropdown (ddField) rather than a native <select> so the option hover matches the
// app theme instead of the OS's blue highlight.
function coachPicker() {
  const cur = S.settings.coach || "";
  const opts = COACH_LIST.filter(([id]) => COACH_RIGS[id]);
  return el("div", { class: "set-row" }, el("span", { class: "set-lbl" }, "Personality"),
    ddField(cur, opts, (v) => setCoach(v)));
}
// Dropdown for the practice-mode "wrong answer" effect; previews the choice on change. Uses the
// same custom dropdown (ddField) as the coach picker, so it matches the app theme (no OS-blue select).
function wrongSoundPicker() {
  const cur = currentWrongFile();
  return el("div", { class: "set-row" }, el("span", { class: "set-lbl" }, "Wrong answer"),
    ddField(cur, WRONG_SOUNDS, (v) => { setSetting("wrongSound", v); playWrongSound(); }));
}
// Controls for one board event: a sound dropdown (the 9 base sounds + the original cue) plus pitch and
// speed knobs. Everything previews on change. The dropdown re-renders the panel so its label updates;
// the sliders save + preview live without a rebuild (so the drag isn't interrupted).
function fxEventControls(ev, label) {
  const cfg = fxConfig(ev);
  const opts = [["default", "Lichess"], ...FX_SOUNDS.map(([id, l]) => [id, l])];
  return el("div", { class: "set-fx" },
    el("div", { class: "set-row" }, el("span", { class: "set-lbl" }, label),
      ddField(cfg.snd, opts, (v) => {
        setFx(ev, "snd", v);
        triggerFx(ev);
        if (UI.settings && !UI.settings.hidden) renderSettings();
      })),
    fxSlider(ev, "pitch", "Pitch", -12, 12, 1, (v) => (v > 0 ? "+" : "") + v + " st"),
    fxSlider(ev, "speed", "Speed", 0.5, 2, 0.05, (v) => (+v).toFixed(2) + "×"),
  );
}
// Slider bound to a nested soundFx field. oninput saves + updates the readout live (no rebuild, so the
// drag survives); previewing on change (release) keeps the cue from machine-gunning while dragging.
function fxSlider(ev, field, label, min, max, step, fmt) {
  const out = el("b", {}, fmt(fxConfig(ev)[field]));
  return el("div", { class: "set-ctrl set-fx-knob" },
    el("div", { class: "set-ctrl-top" }, el("span", { class: "set-lbl" }, label), out),
    el("input", {
      type: "range", min, max, step, value: fxConfig(ev)[field],
      oninput: (e) => { const v = +e.target.value; out.textContent = fmt(v); setFx(ev, field, v); },
      onchange: () => triggerFx(ev),
    }),
  );
}
function motorSettings() {
  return el("div", {},
    section("Search",
      engineSeg("Analysis lines", "classifyLines", [1, 2, 3, 4], null, ENGINE_INFO.classifyLines),
      engineSlider("Depth", "engineDepth", 8, 22, 1, { info: ENGINE_INFO.engineDepth }),
      engineSlider("Workers", "engineWorkers", 1, 8, 1, { fmt: (v) => v + (v === 1 ? " (single)" : " parallel"), info: ENGINE_INFO.engineWorkers }),
      engineSeg("Panel lines", "engineLines", [1, 2, 3, 4], null, ENGINE_INFO.engineLines),
      el("div", { class: "set-row hint" },
        el("span", { class: "set-note" }, "1 analysis line = fastest, and all the move grades need. More lines steady the accuracy/Elo and pre-fill the panel. Panel lines are searched live as you reach each move.")),
    ),
    section("Move classification",
      el("div", { class: "set-row hint" },
        el("span", { class: "set-note" }, "How move quality is graded, in pawns of evaluation lost vs the engine's best move. Changes re-label the game instantly — no re-analysis.")),
      clsSlider("Good above", "clsGood", 0.1, 1.5, 0.05, { fmt: pawnsFmt, info: ENGINE_INFO.clsGood }),
      clsSlider("Inaccuracy above", "clsInacc", 0.3, 2.5, 0.05, { fmt: pawnsFmt, info: ENGINE_INFO.clsInacc }),
      clsSlider("Blunder above", "clsBlunder", 1.5, 8, 0.1, { fmt: pawnsFmt, info: ENGINE_INFO.clsBlunder }),
      clsSlider("Clear advantage", "clsClearAdv", 1, 5, 0.1, { fmt: pawnsFmt, info: ENGINE_INFO.clsClearAdv }),
      clsSlider("Mistake min. loss", "clsMistakeLoss", 0.5, 3, 0.05, { fmt: pawnsFmt, info: ENGINE_INFO.clsMistakeLoss }),
      clsSlider("Miss tolerance", "clsMissTol", 0, 1.5, 0.05, { fmt: pawnsFmt, info: ENGINE_INFO.clsMissTol }),
    ),
    section("Accuracy points",
      el("div", { class: "set-row hint" },
        el("span", { class: "set-note" }, "The displayed accuracy is the average of these per-move scores (Best / Brilliant / Great / Book are always 100). The Elo estimate uses a separate win%-based calculation.")),
      clsSlider("Excellent", "accExcellent", 0, 100, 1, { fmt: ptsFmt }),
      clsSlider("Good", "accGood", 0, 100, 1, { fmt: ptsFmt }),
      clsSlider("Inaccuracy", "accInacc", 0, 100, 1, { fmt: ptsFmt }),
      clsSlider("Miss", "accMiss", 0, 100, 1, { fmt: ptsFmt }),
      clsSlider("Mistake", "accMistake", 0, 100, 1, { fmt: ptsFmt }),
      clsSlider("Blunder", "accBlunder", 0, 100, 1, { fmt: ptsFmt }),
    ),
    section("Engine",
      el("div", { class: "set-row" },
        setLabel("Build", ENGINE_INFO.enginePath),
        el("div", { class: "set-seg" },
          el("button", { class: S.settings.enginePath === "nnue" ? "on" : "", onclick: () => setEngineSetting("enginePath", "nnue") }, "Stockfish 18 NNUE"),
          el("button", { class: S.settings.enginePath === "wasm" ? "on" : "", onclick: () => setEngineSetting("enginePath", "wasm") }, "Stockfish 10"),
          el("button", { class: S.settings.enginePath === "asm" ? "on" : "", onclick: () => setEngineSetting("enginePath", "asm") }, "asm.js"),
        ),
      ),
      // Only shown when the chosen build couldn't load and we fell back — so it's always clear which
      // engine is actually producing the analysis, not just which one was selected.
      (S.activeEngineBuild && S.activeEngineBuild !== S.settings.enginePath)
        ? el("div", { class: "set-row hint" },
            el("span", { class: "set-note" },
              `⚠ "${ENGINE_NAME[S.settings.enginePath] || S.settings.enginePath}" couldn't start in this browser — actually running ${ENGINE_NAME[S.activeEngineBuild] || S.activeEngineBuild}.`))
        : null,
      engineSlider("Strength (Skill)", "engineSkill", 0, 20, 1, { fmt: (v) => (v >= 20 ? "Max (20)" : String(v)), info: ENGINE_INFO.engineSkill }),
      engineSlider("Hash (MB)", "engineHash", 16, 256, 16, { fmt: (v) => v + " MB", info: ENGINE_INFO.engineHash }),
      el("div", { class: "set-row hint" },
        el("span", { class: "set-note" }, "Engine build & search options. Changes here re-analyze the game.")),
    ),
    el("button", { class: "set-reset", onclick: resetEngineSettings }, "Reset engine defaults"),
  );
}
function renderSettings() {
  const scroll = UI.settings.scrollTop; // keep scroll position when a setting changes
  const tabs = el("div", { class: "set-tabs" },
    el("button", { class: "set-tab" + (S.settingsTab === "visual" ? " on" : ""), onclick: () => { S.settingsTab = "visual"; renderSettings(); } }, "Visual"),
    el("button", { class: "set-tab" + (S.settingsTab === "engine" ? " on" : ""), onclick: () => { S.settingsTab = "engine"; renderSettings(); } }, "Engine"),
  );
  UI.settings.replaceChildren(tabs, S.settingsTab === "engine" ? motorSettings() : visualSettings());
  UI.settings.scrollTop = scroll;
}
function toggleSettings() {
  UI.settings.hidden = !UI.settings.hidden;
  if (!UI.settings.hidden) renderSettings();
}

/* ---------------- Credits & attributions ----------------
   The legal disclaimer and third-party asset credits live here, behind the
   info button in the top bar — kept out of the way but one click from anywhere. */
const CREDITS = [
  {
    title: "Chess pieces — Cburnett",
    by: "Colin M.L. Burnett (“Cburnett”), distributed by Lichess.",
    lic: "GPLv2+",
    href: "https://github.com/lichess-org/lila/tree/master/public/piece/cburnett",
  },
  {
    title: "Chess pieces — Merida",
    by: "Armando Hernández Marroquín, distributed by Lichess.",
    lic: "GPLv2+",
    href: "https://github.com/lichess-org/lila/tree/master/public/piece/merida",
  },
  {
    title: "Chess pieces — Kaneo, Kaneo Midnight, 1Kbyte Gambit",
    by: "Kadagaden — chess-pieces.",
    lic: "CC BY 4.0",
    href: "https://github.com/Kadagaden/chess-pieces",
  },
  {
    title: "Board & move sounds",
    by: "Lichess sound set (lila)",
    lic: "AGPL-3.0",
    href: "https://github.com/lichess-org/lila/blob/master/LICENSE",
  },
  {
    title: "Stockfish 18 NNUE (default)",
    by: "NNUE build © Chess.com, LLC — distributed as JS/WASM via Nathan Rugg’s (“nmrugg”) Stockfish.js.",
    lic: "GPLv3",
    href: "https://github.com/nmrugg/stockfish.js",
  },
  {
    title: "Stockfish 10 (WASM / asm.js)",
    by: "Fallback builds — JS/WASM port by Nathan Rugg (“nmrugg”), Stockfish.js.",
    lic: "GPLv3",
    href: "https://github.com/nmrugg/stockfish.js",
  },
  {
    title: "Chess engine — upstream",
    by: "Official Stockfish by T. Romstad, M. Costalba, J. Kiiski, G. Linscott & contributors.",
    lic: "GPLv3",
    href: "https://github.com/official-stockfish/Stockfish",
  },
  {
    title: "Neural network (NNUE)",
    by: "Stockfish evaluation net by Linmiao Xu (“linrock”).",
    lic: "GPLv3",
    href: "https://tests.stockfishchess.org/nns",
  },
];
const REPO_URL = "https://github.com/T-Julsgaard/Chess-Review";
function openCredits() {
  document.querySelector(".credits-overlay")?.remove();
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };

  const entries = CREDITS.map((c) =>
    el("a", { class: "credit-row", href: c.href, target: "_blank", rel: "noopener noreferrer" },
      el("div", { class: "credit-main" },
        el("div", { class: "credit-title" }, c.title),
        el("div", { class: "credit-by" }, c.by),
      ),
      el("span", { class: "credit-lic" }, c.lic),
    ),
  );

  // Prominent source-code link at the very top — the canonical answer to "how do I get the source".
  const sourceRow = el("a", { class: "credits-source", href: REPO_URL, target: "_blank", rel: "noopener noreferrer" },
    el("div", { class: "credit-main" },
      el("div", { class: "credit-title" }, "Source code on GitHub"),
      el("div", { class: "credit-by" }, "Free & open source (GPLv3) — view, build, or contribute."),
    ),
    icon("share"),
  );

  const card = el("div", { class: "credits-card", role: "dialog", "aria-label": "Credits and attributions" },
    el("div", { class: "credits-head" },
      el("h3", {}, "Credits & attributions"),
      el("button", { class: "icon-btn", title: "Close", onclick: close }, icon("close")),
    ),
    sourceRow,
    el("p", { class: "credits-disclaimer" },
      "Chess Review is an independent, unofficial tool. It is not affiliated with, endorsed by, " +
      "or sponsored by Chess.com or Lichess. All trademarks belong to their respective owners."),
    el("div", { class: "credits-list" }, ...entries),
    el("div", { class: "credits-foot" },
      "Each asset is used under the license shown. Tap a row for the source. ",
      el("a", { href: REPO_URL + "/blob/main/LICENSE", target: "_blank", rel: "noopener noreferrer" }, "Full license (GPLv3)"),
      " · ",
      el("a", { href: REPO_URL + "/blob/main/ATTRIBUTIONS.md", target: "_blank", rel: "noopener noreferrer" }, "All attributions"),
    ),
  );

  const overlay = el("div", { class: "credits-overlay", onclick: (e) => { if (e.target === overlay) close(); } }, card);
  document.body.append(overlay);
  document.addEventListener("keydown", onKey);
}
async function setSetting(key, value) {
  S.settings[key] = value;
  await chrome.storage.local.set({ settings: S.settings });
  applySettings();
  if (key === "pieceStyle") buildBoard();
  if (key === "mlStyle" || key === "badgeStyle") renderMoves();
  if (key === "evalView" || key === "graphStyle" || key === "barStyle") { renderEvalBar(); renderGraph(); }
  if (key === "bestArrow") renderBestArrow();
  if (key === "showThreat") renderThreatArrow();
  if (key === "loaderStyle") { renderReview(); renderStats(); }
  if (UI.settings && !UI.settings.hidden) renderSettings();
}
// Engine setting: save, discard the live engine (new build/options), and re-analyze.
async function setEngineSetting(key, value) {
  S.settings[key] = value;
  await chrome.storage.local.set({ settings: S.settings });
  if (S.liveEngine) { try { S.liveEngine.terminate(); } catch {} S.liveEngine = null; S.liveToken++; }
  // The helper engine (threat preview / practice judging) must also be rebuilt with the new
  // build/options, and any cached threat arrows recomputed.
  if (S.helperEngine) { try { S.helperEngine.terminate(); } catch {} S.helperEngine = null; }
  S.threatCache.clear();
  // In analysis mode: reset the variation's cached evals, so they're recomputed with new options.
  if (S.analysisMode && S.variation) {
    for (const p of S.variation.positions) { p.eval = null; p.best = null; }
    requestLiveEval();
  }
  // Classification always searches a single line now, and the engine panel fills extra candidate
  // lines on demand for the position you're viewing. So the line-count settings (panel "Lines",
  // fast-mode lines/toggle) are purely a display choice — they never require re-analysis; just
  // refresh the panel (which kicks off an on-demand search if more lines are wanted).
  const lineKey = key === "engineLines" || key === "fastLines" || key === "fastAnalysis";
  const displayOnly = lineKey && !S.analyzing;
  if (!displayOnly) scheduleReanalyze();
  renderEngineCurrent();
  if (UI.settings && !UI.settings.hidden) renderSettings();
}
// Apply a detected theme from the source tab: match the board by COLOUR using the detected theme
// name. Pieces are never imported — they always use a bundled set (Cburnett/Merida). The user can
// change the board afterwards (saved until the next detection).
function applyDetectedTheme(theme) {
  if (!theme) return;
  if (theme.boardUrl || theme.boardTheme) {
    // Match the board by COLOUR only (theme name → our own palette). The source site's board
    // image is never hotlinked — colours aren't copyrightable, the image is.
    S.settings.ccBoardTheme = theme.boardTheme || null;
    S.settings.ccBoardUrl = null;
    S.settings.boardTheme = "chesscom";
  }
  chrome.storage.local.set({ settings: S.settings });
}
function applySettings() {
  const r = document.documentElement;
  // Only the dark theme is supported now — force it (also for old saved "light").
  S.settings.theme = "dark";
  r.setAttribute("data-theme", "dark");
  r.setAttribute("data-density", S.settings.density);
  const a = ACCENTS[S.settings.accent] || ACCENTS["#7fb45f"];
  r.style.setProperty("--accent", a.accent);
  r.style.setProperty("--accent-strong", a.strong);
  r.style.setProperty("--accent-ink", a.ink);
  const bt =
    BUNDLED_BOARDS[S.settings.boardTheme]
      ? BUNDLED_BOARDS[S.settings.boardTheme].colors
      : S.settings.boardTheme === "custom"
      ? customBoardColors()
      : S.settings.boardTheme === "chesscom"
      ? (CC_BOARD_COLORS[S.settings.ccBoardTheme] || BOARD_THEMES.green)
      : (BOARD_THEMES[S.settings.boardTheme] || BOARD_THEMES.green);
  r.style.setProperty("--sq-light", bt[0]);
  r.style.setProperty("--sq-dark", bt[1]);
  r.style.setProperty("--badge-scale", S.settings.badgeScale ?? 1);
  r.style.setProperty("--ip-font", (S.settings.insightFont ?? 13) + "px");
  applyBoardArt(UI.boardWrap && UI.boardWrap.querySelector(".board"));
  applyBackground();
}
// Bundled background presets (relative to the extension's analysis page).
const BG_PRESETS = { ember: "backgrounds/bg-ember.webp", slate: "backgrounds/bg-slate.webp" };
const BG_TILE_PX = { small: 240, medium: 440, large: 760 };
// Paint the chosen background on the .app shell. "color" paints an HSL tone (with a faint top
// vignette, like the original gradient); a preset/custom image is shown stretched ("cover") or
// repeated ("tile"). Anything unrecognised clears the inline image so the CSS gradient shows.
function applyBackground() {
  const app = document.querySelector(".app");
  if (!app) return;
  if (S.settings.bg === "color") {
    const h = S.settings.bgHue ?? 45, s = S.settings.bgSat ?? 14, l = S.settings.bgLight ?? 7;
    // base tone at the bottom, ~5% lighter toward the top edge for a subtle sense of depth
    app.style.backgroundImage = `radial-gradient(120% 80% at 50% -10%, hsl(${h} ${s}% ${Math.min(100, l + 5)}%), hsl(${h} ${s}% ${l}%) 60%)`;
    app.style.backgroundSize = app.style.backgroundRepeat = app.style.backgroundPosition = "";
    return;
  }
  // "Dark" — a fixed near-black tone (no image file; replaces the old "Dark oak" preset).
  if (S.settings.bg === "olive") {
    app.style.backgroundImage = "radial-gradient(120% 80% at 50% -10%, #141414, #0a0a0a 60%)";
    app.style.backgroundSize = app.style.backgroundRepeat = app.style.backgroundPosition = "";
    return;
  }
  const url = S.settings.bg === "custom" ? (S.settings.bgCustom || null) : BG_PRESETS[S.settings.bg] || null;
  if (!url) {
    app.style.backgroundImage = app.style.backgroundSize = app.style.backgroundRepeat = app.style.backgroundPosition = "";
    return;
  }
  app.style.backgroundImage = `url("${url}")`;
  if (S.settings.bgFit === "tile") {
    const w = BG_TILE_PX[S.settings.bgTile] || BG_TILE_PX.medium;
    app.style.backgroundSize = w + "px auto";   // keep the image's aspect ratio while repeating
    app.style.backgroundRepeat = "repeat";
    app.style.backgroundPosition = "top left";
  } else {
    app.style.backgroundSize = "cover";
    app.style.backgroundRepeat = "no-repeat";
    app.style.backgroundPosition = "center";
  }
}
// Custom upload: read an image file as a data URL, store it, and switch to it.
function uploadBackground() {
  const inp = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp", style: { display: "none" } });
  inp.addEventListener("change", () => {
    const f = inp.files && inp.files[0];
    if (!f) { inp.remove(); return; }
    if (f.size > 25 * 1024 * 1024) { toast("That image is very large (>25 MB) — try a smaller one."); inp.remove(); return; }
    const rd = new FileReader();
    rd.onload = async () => {
      S.settings.bgCustom = String(rd.result);
      S.settings.bg = "custom";
      await chrome.storage.local.set({ settings: S.settings });
      applySettings();
      if (UI.settings && !UI.settings.hidden) renderSettings();
    };
    rd.onerror = () => toast("Couldn't read that image.");
    rd.readAsDataURL(f);
    inp.remove();
  });
  document.body.append(inp);
  inp.click();
}
// Boards are rendered with COLOURS only (see applySettings); we never hotlink an external
// board image. This clears any image a previous version may have applied, so existing installs
// stop fetching the source site's board art immediately.
// Paint the board background. A bundled Kadagaden board (boardTheme = a BUNDLED_BOARDS key) is shown
// as the real SVG artwork with the squares transparent (.cc-board); any other theme clears the image
// so the flat --sq-light/--sq-dark squares show through.
function applyBoardArt(boardEl) {
  if (!boardEl) return;
  const b = BUNDLED_BOARDS[S.settings.boardTheme];
  if (b) {
    boardEl.classList.add("cc-board");
    boardEl.style.backgroundImage = `url("${_url("boards-img/" + b.file)}")`;
    boardEl.style.backgroundSize = "100% 100%";
  } else {
    boardEl.classList.remove("cc-board");
    boardEl.style.backgroundImage = "";
    boardEl.style.backgroundSize = "";
  }
}

/* ---------------- Practice your mistakes ----------------
   Replays the game and stops at every position where YOU (S.meSide) blundered/mistook/missed,
   asking you to find a better move. A move passes only if it's Best/Excellent (or better);
   otherwise you try again. Between solves it fast-rolls through the intervening moves rather
   than teleporting, so you keep the thread of the game. */
function practiceSpots() {
  const out = [];
  for (let i = 1; i <= S.total; i++) {
    if (S.positions[i].color !== S.meSide) continue;
    const cls = S.classif[i];
    if ((cls === "blunder" || cls === "mistake" || cls === "miss")
        && S.bests[i - 1] && S.bests[i - 1].lines && S.bests[i - 1].lines.length) out.push(i);
  }
  return out;
}
function startPractice() {
  if (S.analyzing || S.practice) return;
  if (S.analysisMode) exitAnalysis();
  if (S.autoTimer) { clearInterval(S.autoTimer); S.autoTimer = null; }
  const spots = practiceSpots();
  if (!spots.length) { toast("No mistakes to practice — clean game!"); return; }
  S.practice = { spots, i: 0, solving: false, busy: false, rolling: false, rollT: null, advancing: false };
  S.selectedSq = null;
  renderStats();
  // Replay from wherever the user currently is to the first mistake — forward if it's ahead,
  // backward if they've already moved past it (no more fixed jump near the opening).
  practiceRoll(spots[0] - 1, practiceEnterSolve);
}
function clearDemoTimers() {
  const p = S.practice; if (!p || !p.demoT) return;
  for (const t of p.demoT) clearTimeout(t);
  p.demoT = [];
}
function removeMoveCallout() {
  const co = UI.boardWrap && UI.boardWrap.querySelector(".move-callout");
  if (co) co.remove();
}
function exitPractice() {
  if (!S.practice) return;
  if (S.practice.rollT) clearTimeout(S.practice.rollT);
  clearDemoTimers();
  S.practice = null;
  S.practiceHint = null;
  S.selectedSq = null;
  removeMoveCallout();
  renderStats(); paintBoard(); renderEvalBar(); renderPlayers();
  renderControls(); renderReview(); renderMoves(); renderGraph(); renderEngineCurrent();
}
function finishPractice() {
  markCurrentSolved();   // every mistake re-solved → this game is now "solved"
  exitPractice();
  toast("Practice complete — well done!");
}
// Mark the current game as solved in the library (after completing its practice).
function markCurrentSolved() {
  const rec = S.library.find((r) => r.id === currentGameId());
  if (rec && !rec.solved) {
    rec.solved = true;
    chrome.storage.local.set({ library: S.library });
    renderLibrary();
  }
}
// Replay roll: step from the CURRENT position to `target`, forward or backward, playing the
// move tick each step (lightweight renders only, so it stays snappy). Calls done() on arrival.
function practiceRoll(target, done) {
  const p = S.practice; if (!p) return;
  p.solving = false; p.rolling = true;
  target = Math.max(0, Math.min(S.total, target));
  paintBoard(); renderEvalBar(); renderMoves(); renderGraph(); renderControls(); renderReview();
  const step = () => {
    if (!S.practice) return;
    if (S.idx === target) { S.practice.rolling = false; done(); return; }
    S.idx += S.idx < target ? 1 : -1;
    paintBoard(); renderEvalBar(); renderMoves(); renderGraph();
    playMoveSound(S.idx);
    S.practice.rollT = setTimeout(step, 95);
  };
  if (S.idx === target) { p.rolling = false; done(); }
  else p.rollT = setTimeout(step, 240);
}
// We've rolled to the position right before the mistake. Reset per-spot state and replay the
// actual wrong move (so the player remembers what they did) before handing control over.
function practiceEnterSolve() {
  const p = S.practice; if (!p) return;
  const solvePos = p.spots[p.i] - 1;
  clearDemoTimers(); removeMoveCallout();
  S.idx = solvePos;
  p.solving = false; p.busy = false; p.fails = 0; p.hinted = false; p.coachTyped = false; p.advancing = false; p.demoing = true;
  p.demoT = [];
  S.selectedSq = null;
  S.practiceHint = null;
  paintBoard(); renderEvalBar(); renderPlayers(); renderMoves(); renderGraph();
  renderControls(); renderReview(); renderEngineCurrent();
  practiceDemo(solvePos);
}
// Replay the mistake: pause, slowly play the wrong move (with its category shown on the board),
// flag it as wrong (buzz + red flash), then put the piece back and let the player guess.
function practiceDemo(solvePos) {
  const p = S.practice; if (!p) return;
  const spot = solvePos + 1;
  const mv = S.positions[spot];
  if (!mv || !mv.from || !mv.to) { practiceBeginSolve(solvePos); return; } // nothing to show
  p.demoT.push(setTimeout(() => {
    if (!S.practice) return;
    S.idx = spot;                          // show the position after the wrong move (badge + tint)
    paintBoard(); renderEvalBar(); renderMoves(); renderGraph(); renderControls(); renderReview();
    animateMove(mv.from, mv.to, 620);      // slow slide (category shows as the board badge + the coach text)
    p.demoT.push(setTimeout(() => {
      if (!S.practice) return;
      flashSquares([mv.from, mv.to], "bad");   // signal it was a mistake
      buzzBoard();
      playWrongSound();                        // the same "wrong" cue as a failed attempt, once
      p.demoT.push(setTimeout(() => {
        if (!S.practice) return;
        removeMoveCallout();
        S.idx = solvePos;
        practiceBeginSolve(solvePos);          // piece back → the player's turn to find better
      }, 780));
    }, 760));
  }, 650));
}
function practiceBeginSolve(solvePos) {
  const p = S.practice; if (!p) return;
  S.idx = solvePos;
  p.solving = true; p.demoing = false; p.busy = false;
  S.selectedSq = null; S.practiceHint = null;
  paintBoard(); renderEvalBar(); renderPlayers(); renderMoves(); renderGraph();
  renderControls(); renderReview(); renderEngineCurrent();
}
function practiceAdvance() {
  const p = S.practice; if (!p) return;
  p.i++;
  p.solving = false;
  p.advancing = true;   // keep the "✓ Correct! Moving on…" message during the roll to the next spot
  S.practiceHint = null;
  if (p.i >= p.spots.length) { finishPractice(); return; }
  practiceRoll(p.spots[p.i] - 1, practiceEnterSolve);   // roll from where we are to the next mistake
}
// Flash the from/to squares green (good) or red (bad) as quick feedback.
function flashSquares(names, kind) {
  const cls = kind === "good" ? "flash-good" : "flash-bad";
  for (const n of names) {
    const sq = sqByName[n]; if (!sq) continue;
    sq.classList.add(cls);
    setTimeout(() => sq.classList.remove(cls), 680);
  }
}
// Short "buzz" on the board to make a rejected move feel like a wrong answer (instead of the
// piece just silently snapping back). The class is removed once the keyframes finish.
function buzzBoard() {
  const board = UI.boardWrap && UI.boardWrap.querySelector(".board");
  if (!board) return;
  board.classList.remove("buzz");
  void board.offsetWidth;             // restart the animation if it's still mid-buzz
  board.classList.add("buzz");
  setTimeout(() => board.classList.remove("buzz"), 420);
}
// Reveal the answer for the current practice spot: light up the engine's best move (the piece
// it starts from + its target square) with the analytical highlight.
function showPracticeHint() {
  const p = S.practice; if (!p || !p.solving) return;
  const solvePos = p.spots[p.i] - 1;
  const best = S.bests[solvePos];
  const uci = best && best.bestmove;
  if (!uci) { toast("No hint available for this position."); return; }
  p.hinted = true;
  S.practiceHint = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  paintBoard(); renderReview();
}
// Paint the practice hint (called from paintBoard so it survives re-renders). The hint just
// lights up the square of the PIECE to move — same red highlight as a right-clicked square — and
// nothing else (no destination, no arrow), so it points you at the piece without giving it all away.
function renderPracticeHint() {
  for (const sq of Object.values(sqByName)) sq.classList.remove("hint-from");
  const h = S.practiceHint; if (!h) return;
  if (sqByName[h.from]) sqByName[h.from].classList.add("hint-from");
}
// Judge a practice attempt instantly from the analysis we already ran — no live engine call.
// Pass if it's the engine's top move, delivers mate, or loses ≤2% winning chance (Excellent or
// better). A move that isn't among the searched top lines is, by definition, worse than every
// line we kept → it can't be Excellent, so it fails immediately.
function judgePass(solvePos, userUci, fenAfter) {
  const best = S.bests[solvePos];
  if (!best || !best.lines || !best.lines.length) return true;        // no data → be lenient
  if ((best.bestmove || "").slice(0, 4) === userUci.slice(0, 4)) return true; // the top move
  const mover = sideToMove(S.positions[solvePos].fen);
  const term = terminalScore(fenAfter);                               // checkmate/stalemate?
  if (term && moverWin(term, mover) >= 99) return true;               // forcing mate is always best
  const winBefore = winPct(scoreToCp(best.lines[0].score));           // mover's POV
  for (const ln of best.lines) {                                      // measured in the same search
    if ((ln.pv || "").split(" ")[0] === userUci) {
      return Math.max(0, winBefore - winPct(scoreToCp(ln.score))) <= 2;
    }
  }
  return false;                                                       // not a top line → not Excellent
}
function practiceAttempt(from, to) {
  const p = S.practice;
  if (!p || !p.solving) return;
  const solvePos = p.spots[p.i] - 1;
  const fen = S.positions[solvePos].fen;
  let c, mv;
  try { c = new Chess(fen); mv = c.move({ from, to, promotion: "q" }); } catch { mv = null; }
  if (!mv) { S.selectedSq = null; renderSelection(); return; }
  const userUci = mv.from + mv.to + (mv.promotion || "");
  if (judgePass(solvePos, userUci, c.fen())) {
    p.solving = false;              // lock out further attempts until the next spot
    S.practiceHint = null;
    // Visually play the correct move so the piece lands on its square and STAYS there for a beat
    // — confirming the answer instead of snapping straight back.
    const fromSq = sqByName[mv.from], toSq = sqByName[mv.to];
    if (fromSq && toSq) {
      const pieceEl = fromSq.querySelector(".piece, .piece-svg, .piece-img");
      toSq.querySelectorAll(".piece, .piece-svg, .piece-img, .sq-badge").forEach((n) => n.remove());
      if (pieceEl) toSq.append(pieceEl);   // place it instantly on the square you dropped it on (no slide)
      // Castling: the king lands on its square above, but the rook must move too — slide both so
      // the full castle plays out instead of leaving the rook stranded.
      const isCastle = /[kq]/.test(mv.flags || "") || /^[O0]-[O0]/.test(mv.san);
      if (isCastle) {
        const rank = mv.to[1], kingside = mv.to[0] === "g";
        const rookFrom = (kingside ? "h" : "a") + rank, rookTo = (kingside ? "f" : "d") + rank;
        const rfSq = sqByName[rookFrom], rtSq = sqByName[rookTo];
        if (rfSq && rtSq) {
          const rookEl = rfSq.querySelector(".piece, .piece-svg, .piece-img");
          rtSq.querySelectorAll(".piece, .piece-svg, .piece-img").forEach((n) => n.remove());
          if (rookEl) rtSq.append(rookEl);
          if (S.settings.moveAnim) { animateMove(mv.from, mv.to); animateMove(rookFrom, rookTo); }
        }
      }
      // Mark it as the "Best move" to confirm they found a strong move.
      toSq.classList.add("has-badge");
      toSq.append(el("img", { class: "sq-badge", src: qIcon("best"), alt: "Best", draggable: "false" }));
    }
    flashSquares([mv.from, mv.to], "good");
    playSanSound(mv.san);
    renderControls(); renderReview();
    setTimeout(() => { if (S.practice) practiceAdvance(); }, 1300);
  } else {
    p.fails = (p.fails || 0) + 1;
    flashSquares([mv.from, mv.to], "bad");
    buzzBoard();
    playWrongSound();
    S.selectedSq = null; paintBoard(); renderControls(); renderReview();
  }
}

/* ---------------- Library (left hover-sidebar) ----------------
   Every fully-analyzed game is saved to chrome.storage.local under "library". The sidebar
   lives off the left edge and slides in on hover; games can be sorted (recent / your accuracy /
   opponent rating) and filtered (result, time class). Clicking a game re-opens it for analysis. */
function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
// "win" / "loss" / "draw" / "" from the result, relative to the user's side.
function myResult() {
  const res = S.players[S.meSide].result;
  if (res === "1-0") return S.meSide === "w" ? "win" : "loss";
  if (res === "0-1") return S.meSide === "b" ? "win" : "loss";
  if (res && res.includes("1/2")) return "draw";
  return "";
}
// Normalize the game's time class to Bullet / Blitz / Rapid / Classical / Daily.
function gameType() {
  const tc = (S.meta && S.meta.timeClass) || "";
  if (tc) return tc.charAt(0).toUpperCase() + tc.slice(1);
  const base = parseInt((S.headers.TimeControl || "").toString().split("+")[0], 10);
  if (!isNaN(base)) {
    if (base < 180) return "Bullet";
    if (base < 600) return "Blitz";
    if (base < 1800) return "Rapid";
    return "Classical";
  }
  return "";
}
function currentGameId() {
  return (S.meta && S.meta.gameId) || ("pgn:" + simpleHash(S.pgn || ""));
}
function saveToLibrary() {
  try {
    if (!S.pgn) return;
    const id = currentGameId();
    const opSide = S.meSide === "w" ? "b" : "w";
    const prev = S.library.find((g) => g.id === id);
    // "solved" = no mistakes to practice (clean game) OR practice was already completed before.
    const noMistakes = practiceSpots().length === 0;
    const solved = noMistakes || !!(prev && prev.solved);
    const rec = {
      id, savedAt: Date.now(), pgn: S.pgn, meta: S.meta || {},
      meSide: S.meSide,
      myName: S.players[S.meSide].name, opName: S.players[opSide].name,
      myAcc: S.acc[S.meSide], opAcc: S.acc[opSide],
      myRating: parseInt(S.players[S.meSide].rating, 10) || null,
      opRating: parseInt(S.players[opSide].rating, 10) || null,
      result: myResult(), type: gameType(),
      eco: S.opening ? S.opening.eco : "", opening: S.opening ? S.opening.name : "",
      date: S.headers.UTCDate || S.headers.Date || "",
      url: (S.meta && S.meta.url) || "",
      fav: !!(prev && prev.fav), solved,
    };
    const lib = S.library.filter((g) => g.id !== id);   // replace on re-analysis (no duplicates)
    lib.unshift(rec);
    // Cap the list; drop the analysis blobs of any games that fall off the end.
    let dropped = [];
    if (lib.length > 300) { dropped = lib.slice(300); lib.length = 300; }
    S.library = lib;
    // The heavy analysis (evals + engine lines) is stored under its own key so the library list
    // stays light, and so re-opening a saved game can render instantly WITHOUT re-analyzing.
    const writes = { library: lib, ["analysis:" + id]: { evals: S.evals, bests: S.bests, multipv: S.analyzedMultipv } };
    chrome.storage.local.set(writes);
    if (dropped.length) chrome.storage.local.remove(dropped.map((d) => "analysis:" + d.id));
    renderLibrary();
  } catch (e) { console.warn("library save failed", e); }
}
async function openLibraryGame(rec) {
  if (rec.id === currentGameId()) return;   // already open
  // Pull the stored analysis so the re-opened game shows up already analyzed (no re-run).
  let analysis = null;
  try { const s = await chrome.storage.local.get("analysis:" + rec.id); analysis = s["analysis:" + rec.id] || null; } catch {}
  // Switch in place — no page reload, no black flash. The sidebar stays open (it only closes when
  // the mouse leaves the library area), so you can pick another game right away. Reproduce the exact
  // perspective the game was saved with: prefer a stored flip hint, else the saved meSide — so a
  // re-opened game is never seated the wrong way up regardless of the current stored username.
  const flip = (rec.meta && rec.meta.flip != null) ? rec.meta.flip : (rec.meSide === "b");
  applyGame({ pgn: rec.pgn, meta: { ...(rec.meta || {}), flip }, source: "library", analysis });
}
// Toggle a game's favorite flag and persist it.
function toggleFav(id) {
  const rec = S.library.find((r) => r.id === id);
  if (!rec) return;
  rec.fav = !rec.fav;
  chrome.storage.local.set({ library: S.library });
  renderLibrary();
}
// Apply the active sort + filters.
function libRecords() {
  let recs = S.library.slice();
  if (S.libResult !== "all") recs = recs.filter((r) => r.result === S.libResult);
  if (S.libType !== "all") recs = recs.filter((r) => r.type === S.libType);
  // "Unsolved" and "Favorites" live in the Sort dropdown — they filter, then fall back to recency order.
  if (S.libSort === "unsolved") recs = recs.filter((r) => !r.solved);
  else if (S.libSort === "favorite") recs = recs.filter((r) => r.fav);
  if (S.libSort === "accuracy") recs.sort((a, b) => (b.myAcc ?? -1) - (a.myAcc ?? -1));
  else if (S.libSort === "rating") recs.sort((a, b) => (b.opRating ?? -1) - (a.opRating ?? -1));
  else recs.sort((a, b) => b.savedAt - a.savedAt);
  return recs;
}
// A sleek custom dropdown (native <select> popups can't be de-blued on Windows). `options` is
// [[value, label], …]. Clicking outside closes it (handled by a global listener in buildUI).
// ddField is the standalone control (button + menu); libDropdown wraps it with an inline label for
// the library rail, and the settings panel reuses ddField on its own so its menus match (no blue).
function ddField(value, options, onChange) {
  const current = (options.find(([v]) => v === value) || options[0] || ["", "—"])[1];
  const menu = el("div", { class: "lib-dd-menu" },
    ...options.map(([v, t]) => el("button", { class: "lib-dd-opt" + (v === value ? " sel" : ""),
      onclick: (e) => { e.stopPropagation(); onChange(v); } }, t)));
  const field = el("div", { class: "lib-dd-field" },
    el("button", { class: "lib-dd-btn", onclick: (e) => {
      e.stopPropagation();
      const willOpen = !field.classList.contains("open");
      document.querySelectorAll(".lib-dd-field.open").forEach((d) => d.classList.remove("open"));
      field.classList.toggle("open", willOpen);
    } }, el("span", { class: "lib-dd-cur" }, current), el("span", { class: "lib-dd-chev", html: ICONS.chevron })),
    menu);
  return field;
}
function libDropdown(label, value, options, onChange) {
  return el("div", { class: "lib-dd" }, el("span", { class: "lib-dd-lbl" }, label), ddField(value, options, onChange));
}
function libCard(r) {
  const curId = currentGameId();
  const rLetter = r.result === "win" ? "W" : r.result === "loss" ? "L" : r.result === "draw" ? "D" : "·";
  return el("div", { class: "lib-card" + (r.id === curId ? " active" : ""), onclick: () => openLibraryGame(r) },
    el("button", { class: "lc-fav" + (r.fav ? " on" : ""), title: r.fav ? "Remove favorite" : "Favorite",
      onclick: (e) => { e.stopPropagation(); toggleFav(r.id); } }, r.fav ? "★" : "☆"),
    el("div", { class: "lc-top" },
      el("span", { class: "lc-result lc-" + (r.result || "none") }, rLetter),
      el("span", { class: "lc-opp" }, "vs " + (r.opName || "?")),
      r.type ? el("span", { class: "lc-type" }, r.type) : null),
    el("div", { class: "lc-bot" },
      el("span", { class: "lc-acc" }, r.myAcc == null ? "—" : r.myAcc.toFixed(1), el("i", {}, "%")),
      el("span", { class: "lc-status " + (r.solved ? "solved" : "unsolved") }, r.solved ? "Solved" : "Unsolved")));
}
function renderLibrary() {
  if (!UI.libList) return;
  const recs = libRecords();
  if (UI.libCount) UI.libCount.textContent = String(S.library.length);

  const setSort = (v) => { S.libSort = v; renderLibrary(); };
  const setRes  = (v) => { S.libResult = v; renderLibrary(); };
  const setType = (v) => { S.libType = v; renderLibrary(); };
  const types = Array.from(new Set(S.library.map((r) => r.type).filter(Boolean)));
  UI.libControls.replaceChildren(
    libDropdown("Sort", S.libSort, [["history", "Most recent"], ["accuracy", "Highest accuracy"], ["rating", "Highest rating"], ["unsolved", "Unsolved"], ["favorite", "Favorites"]], setSort),
    libDropdown("Result", S.libResult, [["all", "All results"], ["win", "Wins"], ["loss", "Losses"], ["draw", "Draws"]], setRes),
    libDropdown("Type", S.libType, [["all", "All types"], ...types.map((t) => [t, t])], setType),
  );

  if (!recs.length) {
    UI.libList.replaceChildren(el("div", { class: "lib-empty" },
      S.library.length ? "No games match these filters." : "Analyzed games are saved here automatically. Analyze a game to start your library."));
    return;
  }
  UI.libList.replaceChildren(...recs.map(libCard));
}

/* ---------------- Navigation ---------------- */
function go(to) {
  const prev = S.idx;
  // During analysis you can't go further than the move that HAS been analyzed (S.progress).
  // When the analysis is done, the whole game (S.total) is free.
  const maxPly = S.analyzing ? S.progress : S.total;
  S.idx = Math.max(0, Math.min(maxPly, to));
  // Changing moves resets the user's own arrows, square marks and piece selection. The sound must
  // match the move that actually animates: stepping FORWARD = the move just made (lands on idx);
  // stepping BACK = the move being UNDONE (the one that left `prev`). Keying both on idx made
  // stepping back onto a quiet move play the capture sound of whatever move had created that
  // position (e.g. back off g5 onto fxe5 buzzed a capture though only a pawn slid back).
  if (S.idx !== prev) { S.userArrows = []; S.userMarks = []; S.selectedSq = null; playMoveSound(S.idx > prev ? S.idx : prev); }
  paintBoard();
  // Smooth animation on single-step navigation (forward OR backward) — but snap instead of sliding
  // when the user is scrubbing fast, so the board keeps up with the keys instead of lagging behind.
  if (S.settings.moveAnim && Math.abs(S.idx - prev) === 1 && !navFastScrub()) {
    if (S.idx === prev + 1) { const m = S.positions[S.idx]; if (m.from && m.to) animateMove(m.from, m.to); }
    else { const m = S.positions[prev]; if (m.from && m.to) animateMove(m.to, m.from); }
  }
  renderEvalBar();
  renderPlayers();
  renderControls();
  renderReview();
  renderMoves();
  renderGraph();
  renderEngineCurrent();
}
// Navigation buttons/keys: in analysis mode we page through the variation, otherwise the mainline.
// User-initiated navigation: stop any running engine-line walkthrough at the current spot.
function navNext() { if (S.practice) return; stopLineWalk(); if (S.analysisMode) variationStep(1); else go(S.idx + 1); }
function navPrev() { if (S.practice) return; stopLineWalk(); if (S.analysisMode) variationStep(-1); else go(S.idx - 1); }
// Jump to a mainline position (exits analysis mode if active).
function gotoMainline(ply) { if (S.practice) return; stopLineWalk(); if (S.analysisMode) exitAnalysis(); go(ply); }
function variationStep(delta) {
  const v = S.variation; if (!v) return;
  const ni = v.idx + delta;
  if (ni <= 0) { exitAnalysis(v.branchIdx); return; }   // back before the branch → exit mode
  if (ni >= v.positions.length) return;                  // no more variation moves
  v.idx = ni;
  S.selectedSq = null;
  paintBoard();
  // Same rule as the mainline: forward = the move just played (idx); back = the move being undone
  // (idx+1) — so stepping back doesn't buzz the landed move's (possibly capture) sound.
  playSanSound((delta > 0 ? v.positions[v.idx] : v.positions[v.idx + 1])?.san);
  if (S.settings.moveAnim && !navFastScrub()) {
    const cur = v.positions[v.idx];
    if (delta > 0 && cur.from && cur.to) animateMove(cur.from, cur.to);
    else if (delta < 0) { const m = v.positions[v.idx + 1]; if (m && m.from && m.to) animateMove(m.to, m.from); }
  }
  renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
  requestLiveEval();
}
function toggleFlip() { S.flipped = !S.flipped; buildBoard(); renderPlayers(); renderEvalBar(); }
function toggleAuto() {
  if (S.autoTimer) { clearInterval(S.autoTimer); S.autoTimer = null; }
  else S.autoTimer = setInterval(() => {
    if (S.analysisMode || S.idx >= S.total) { clearInterval(S.autoTimer); S.autoTimer = null; renderControls(); return; }
    go(S.idx + 1);
  }, 900);
  renderControls();
}
document.addEventListener("keydown", (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  // During practice the only shortcut is Escape to exit; nav keys are disabled.
  if (S.practice) { if (e.key === "Escape") exitPractice(); return; }
  if (e.key === "ArrowLeft") navPrev();
  else if (e.key === "ArrowRight") navNext();
  else if (e.key === "Home") gotoMainline(0);
  else if (e.key === "End") gotoMainline(S.total);
  else if (e.key === "Escape") { if (S.analysisMode) exitAnalysis(); }
  else if (e.key === "f") toggleFlip();
});

/* ---------------- Analysis batch + re-analysis ----------------
   The game is analyzed by a POOL of independent Stockfish workers pulling positions from a
   shared queue. Each position is searched exactly as before (cold ucinewgame + go depth), so
   the results are bit-identical to a sequential run — only the wall-clock is parallelized
   across CPU cores. If the engine settings change, startAnalysis() runs again: a generation
   token (S.batchGen) invalidates the old pool so only the newest analysis continues.
   UI updates during analysis are throttled: computeDerived()+renders are O(N), so doing them
   on every completion is O(N²) and stalls the message loop that feeds the workers. */
let _reanalyzeT = null;
function scheduleReanalyze() {
  clearTimeout(_reanalyzeT);
  _reanalyzeT = setTimeout(() => startAnalysis(), 400);
}
function terminateEngines() {
  if (S.evalEngines) for (const e of S.evalEngines) { try { e.terminate(); } catch {} }
  S.evalEngines = [];
}
// Throttled progress render (~7 fps) so the worker pool isn't starved by O(N) recompute/render.
let _progScheduled = false, _progLast = 0;
function flushProgress(gen) {
  _progScheduled = false; _progLast = Date.now();
  if (gen !== S.batchGen) return;
  computeDerived();
  if (!S.analysisMode) { paintBoard(); renderEvalBar(); renderBestArrow(); renderEngineCurrent(); }
  renderControls(); renderReview(); renderStats(); renderGraph(); renderMoves();
}
function requestProgress(gen) {
  if (_progScheduled) return;
  _progScheduled = true;
  setTimeout(() => flushProgress(gen), Math.max(0, 140 - (Date.now() - _progLast)));
}
async function startAnalysis() {
  const gen = ++S.batchGen;
  terminateEngines();
  S.evals = new Array(S.total + 1).fill(null);
  S.bests = new Array(S.total + 1).fill(null);
  S._sacCache = []; S._forcedCache = []; S._panelCache = null;
  S.progress = 0;
  S.analyzing = true;
  revRefs = null; statsRefs = null;
  computeDerived();
  renderControls(); renderReview(); renderStats(); renderGraph(); renderMoves();
  if (!S.analysisMode) { renderEvalBar(); renderBestArrow(); renderEngineCurrent(); }

  // The classification logic needs only the single best line, so the batch defaults to MultiPV=1
  // (markedly faster than the old ≥4); the engine panel fills extra lines on demand. The user can
  // raise "Analysis lines" (classifyLines) to search more per position for steadier accuracy/Elo.
  const multipv = Math.max(1, Math.min(ENGINE_MAX_LINES, S.settings.classifyLines || 1));
  S.analyzedMultipv = multipv; // remember how many lines this run computed (for setEngineSetting)
  const nWorkers = Math.max(1, Math.min(S.settings.engineWorkers || 1, S.total + 1));
  // createEngine() readies each worker AND falls back down the build chain if the chosen build can't
  // load — so the whole batch survives e.g. NNUE failing, and S.activeEngineBuild reflects the build
  // actually in use. If no build can start at all, surface it instead of leaving a stuck "Analyzing…".
  let engines;
  try {
    engines = await Promise.all(
      Array.from({ length: nWorkers }, () => createEngine({ Hash: S.settings.engineHash, "Skill Level": S.settings.engineSkill }))
    );
  } catch (e) {
    console.error("[Chess Review] no Stockfish build could be started:", e);
    S.evalEngines = []; S.analyzing = false;
    S.verdict = "Engine unavailable — couldn't start Stockfish in this browser.";
    try { renderReview(); } catch {}
    return;
  }
  S.evalEngines = engines;
  if (gen !== S.batchGen) { terminateEngines(); return; }

  // Shared work queue. `nextIdx++` is atomic (no await between read and increment in a
  // single-threaded runtime), so each position is handed to exactly one worker. Completion
  // order doesn't affect the final values — computeDerived() is a pure function of the
  // filled arrays. `contig` tracks the contiguous-analyzed prefix that navigation/eval-graph
  // are allowed to expose during analysis.
  let nextIdx = 0, contig = -1;
  async function worker(eng) {
    while (gen === S.batchGen) {
      const i = nextIdx++;
      if (i > S.total) return;
      const res = await eng.analyse(S.positions[i].fen, S.settings.engineDepth, multipv);
      if (gen !== S.batchGen) return;
      S.bests[i] = res;
      // Terminal positions (mate/stalemate) are decided from the board — not from the engine's "mate 0".
      S.evals[i] = terminalScore(S.positions[i].fen) || whiteRel(res.score, S.positions[i].fen);
      while (contig + 1 <= S.total && S.bests[contig + 1]) contig++;
      S.progress = Math.max(0, contig);
      requestProgress(gen);
    }
  }
  await Promise.all(engines.map((e) => worker(e)));
  if (gen !== S.batchGen) return;            // a newer analysis took over
  terminateEngines();
  S.analyzing = false;
  S.progress = S.total;
  flushProgress(gen);
  renderReview();
  renderStats();
  if (!S.analysisMode) renderEngineCurrent();
  saveToLibrary();   // the game is fully analyzed → keep it in the user's library
}

/* ---------------- Render everything ---------------- */
function renderAll() {
  UI.meta.replaceChildren(...metaChips());
  buildBoard();
  renderEvalBar();
  renderPlayers();
  renderControls();
  renderReview();
  renderStats();
  renderGraph();
  renderMoves();
  renderEngineCurrent();
}

/* ---------------- Load / switch a game ----------------
   Loads a game's data into the already-built UI and renders it. Used both for the first load
   and for switching to another library game in place — no page reload, so there's no black flash
   between games; only the panels' data and the board orientation change. */
async function applyGame(payload) {
  // Tear down anything tied to the previous game.
  S.batchGen++;                 // invalidate any in-flight analysis workers
  terminateEngines();
  if (S.autoTimer) { clearInterval(S.autoTimer); S.autoTimer = null; }
  stopLineWalk();
  if (S.practice && S.practice.rollT) clearTimeout(S.practice.rollT);
  clearDemoTimers(); removeMoveCallout();
  S.practice = null; S.practiceHint = null;
  S.analysisMode = false; S.variation = null; S.liveToken++;
  S.selectedSq = null; S.userArrows = []; S.userMarks = []; S.lineWalking = false;
  revRefs = null; statsRefs = null; _lastCommentKey = -1; _ipSig = null; S._turnPly = null;
  S._lastEngineLines = null;

  applyDetectedTheme(payload.theme); // match the chess.com theme if the payload carries one (else no-op)
  applySettings();                   // (re)apply CSS vars + board image now that the board exists

  S.analyzing = true;
  S.pgn = payload.pgn;
  S.meta = payload.meta || {};
  S.headers = parseHeaders(payload.pgn);
  S.clocks = parseClocks(payload.pgn);
  S.positions = buildPositions(payload.pgn);
  S.total = S.positions.length - 1;
  S.evals = new Array(S.total + 1).fill(null);
  S.bests = new Array(S.total + 1).fill(null);
  S._sacCache = []; S._forcedCache = []; S._panelCache = null;
  S.progress = 0;
  S.openingHeader = deriveOpening(S.headers);
  S.opening = S.openingHeader; // possibly refined by the book in computeDerived()
  const { players, meSide } = derivePlayers(S.headers, S.meta, S.username);
  S.players = players;
  // Perspective: the source page's own orientation (chess.com ?flip=true, Lichess board side) is
  // the user's actual POV, so it wins when present. Otherwise fall back to matching the stored
  // username against the PGN players — a deliberate second layer so we don't seat the user at the
  // wrong end of the board. Default (no signal at all) is White at the bottom.
  const flip = S.meta && S.meta.flip;
  const side = flip === true ? "b" : flip === false ? "w" : meSide;
  S.meSide = side; S.flipped = side === "b"; S.idx = 0;

  // Restore a previously-stored analysis instead of re-running the engine. Both callers (library +
  // boot) resolve this by id *before* calling applyGame, so there's no await between buildUI() and
  // renderAll() — that gap is what let the Moves panel paint on its own for a frame. Only fall back
  // to the lookup here if no caller supplied the field at all.
  let saved = payload.analysis;
  if (saved == null && !("analysis" in payload)) {
    try { const k = "analysis:" + currentGameId(); const s = await chrome.storage.local.get(k); saved = s[k] || null; } catch {}
  }
  const restored = saved && Array.isArray(saved.bests) && saved.bests.length === S.total + 1 && Array.isArray(saved.evals);
  if (restored) {
    S.evals = saved.evals;
    S.bests = saved.bests;
    S.analyzedMultipv = saved.multipv || null;
    S.analyzing = false;
    S.progress = S.total;
  }

  document.title = `${players.w.name} vs ${players.b.name} — Chess Review`;
  computeDerived();
  renderAll();
  // The saved layout baseline is sized for the EXPANDED breakdown; since it now starts collapsed,
  // pull the modules below the Accuracy panel up to close the gap (same as clicking collapse).
  if (!S.qbreakExpanded) reflowAccuracy(false);
  renderLibrary();             // refresh the "currently open" highlight in the sidebar
  requestAnimationFrame(alignPlayers);
  if (!restored) startAnalysis();
}

/* ---------------- Start ---------------- */
// Nudge the analysis page to 90% zoom — the size the default free-canvas layout is tuned for, so the
// panels fit the window out of the box. We use real Chrome zoom (not CSS zoom, which would throw off
// the pointer-coordinate maths the board/panel dragging relies on).
//
// Scope is PER-ORIGIN: the 90% persists for the extension's OWN pages (origin chrome-extension://<id>),
// which is what kills the "90%" zoom-indicator bubble that used to flash on every open. Chrome only
// shows that bubble when the zoom *changes*; with per-tab scope every fresh game tab started at 100%
// and we changed it to 90% → a popup every single time. With per-origin the tab already loads at the
// remembered 90%, so our setZoom is a no-op and nothing pops up. It can still appear once — the very
// first time the zoom is established — then never again. (Per-origin here only affects this extension's
// pages, never the user's other tabs or sites.) Failures are swallowed silently.
function fitTabZoom() {
  try {
    if (!chrome.tabs || !chrome.tabs.getCurrent) return;
    chrome.tabs.getCurrent((tab) => {
      if (chrome.runtime.lastError || !tab || tab.id == null) return;
      chrome.tabs.setZoomSettings(tab.id, { scope: "per-origin", mode: "automatic" }, () => {
        if (chrome.runtime.lastError) return;
        // Only set it when it isn't already ~90%, so we never trigger a needless zoom-change bubble.
        chrome.tabs.getZoom(tab.id, (z) => {
          if (chrome.runtime.lastError) return;
          if (Math.abs((z || 1) - 0.9) > 0.005) chrome.tabs.setZoom(tab.id, 0.9, () => void chrome.runtime.lastError);
        });
      });
    });
  } catch {}
}
(async function main() {
  fitTabZoom();   // fit-to-layout zoom, scoped to this tab only — see fitTabZoom()
  try {
    // Only the job + stored prefs are needed to build and show the UI. The opening book (~690 KB)
    // and the calibration file are only consumed once scoring/opening refinement runs, so we load
    // them in parallel and don't block the first paint on them — buildUI() can run as soon as the
    // job and settings are in, while the book is still downloading.
    const dataReady = Promise.all([loadBook(), loadCalibration()]);
    const [payload, store] = await Promise.all([loadJob(), chrome.storage.local.get(["settings", "username", "layout", "layoutVersion", "library"])]);
    S.library = Array.isArray(store.library) ? store.library : [];
    S.settings = { ...DEFAULT_SETTINGS, ...(store.settings || {}) };
    // Only the two bundled SVG sets remain (Cburnett = "image", Merida). Every older or removed
    // style — solid/billede/chesscom/flat/outline/bold/minimal and the now-dropped classic/modern —
    // falls back to the default Cburnett set.
    if (!PIECE_STYLES.includes(S.settings.pieceStyle)) S.settings.pieceStyle = "image";
    { const lm = { prikker: "dots", hop: "bounce", "bølge": "wave" }; if (lm[S.settings.loaderStyle]) S.settings.loaderStyle = lm[S.settings.loaderStyle]; } // migrate renamed loader keys
    if (S.settings.bg === "default") S.settings.bg = "color"; // the old gradient slot is now the HSL colour picker
    if (S.settings.coach === "old_soviet_rework") S.settings.coach = "old_soviet"; // the rework became the canonical "Old Soviet"
    S.settings.density = "compact"; // density picker removed — compact is the only layout now
    // New default coach is Old Soviet with plain replies — bump anyone still on the old "mentor" default
    // (one-time, so a later deliberate choice of any coach/voice sticks).
    if (!S.settings.coachDefaulted) {
      if (!store.settings || store.settings.coach == null || store.settings.coach === "mentor") {
        S.settings.coach = "old_soviet"; S.settings.coachPlain = true;
      }
      S.settings.coachDefaulted = true;
      chrome.storage.local.set({ settings: S.settings });
    }
    // The avatar always reflects the chosen coach; the reply bank loads only when special replies are on.
    S.coach = S.settings.coachPlain ? null : await loadCoach(S.settings.coach);
    // One-time bump of the old shallow default depth (12) to the new classification depth.
    // Keyed on a flag so a deliberate later choice of a low depth isn't overridden again.
    if (!S.settings.depthBumped) {
      if ((store.settings?.engineDepth ?? 12) <= 12) S.settings.engineDepth = Math.max(S.settings.engineDepth, 16);
      S.settings.depthBumped = true;
      chrome.storage.local.set({ settings: S.settings });
    }
    // One-time switch to the strong Stockfish 18 NNUE build for anyone still on the old SF10 WASM
    // default (asm.js users keep asm — they may lack WASM). A later deliberate choice sticks.
    if (!S.settings.nnueDefaulted) {
      if (S.settings.enginePath === "wasm") S.settings.enginePath = "nnue";
      S.settings.nnueDefaulted = true;
      chrome.storage.local.set({ settings: S.settings });
    }
    // The 5-line option was removed — clamp any stored value to the new max.
    if (S.settings.engineLines > ENGINE_MAX_LINES) { S.settings.engineLines = ENGINE_MAX_LINES; chrome.storage.local.set({ settings: S.settings }); }
    // MultiPV 1 is the analysis-batch default (fast + tracks the reference values as well as mpv2, per
    // tools/dataset/compare-mpv.mjs). Undo the brief mpv2 experiment for anyone it bumped.
    if (S.settings.mpv2Calibrated) {
      if (S.settings.classifyLines === 2) S.settings.classifyLines = 1;
      delete S.settings.mpv2Calibrated;
      chrome.storage.local.set({ settings: S.settings });
    }
    applyDetectedTheme(payload.theme); // match the user's chess.com piece/board theme (if opened from a chess.com tab)
    // Use the saved layout if it matches the current version; otherwise the new default.
    const useStored = store.layoutVersion === LAYOUT_VERSION && store.layout;
    S.layout = useStored ? { ...structuredClone(DEFAULT_LAYOUT), ...store.layout } : structuredClone(DEFAULT_LAYOUT);
    if (!useStored) saveLayout();
    S.username = store.username || "";

    // Everything the first render needs must be resolved BEFORE buildUI(), so that buildUI() and
    // applyGame() run back-to-back with no await between them — i.e. the browser paints the whole
    // page in one frame. Any await in that gap lets the empty shell paint first, and since the
    // Moves panel is the only module whose header is built in buildUI() (the rest are empty mounts
    // filled by renderAll()), that intermediate frame showed the Moves panel sitting on its own.
    await dataReady;         // book + calibration (downloaded in parallel; usually already resolved)
    // Resolve any stored analysis for this game by id (same derivation as currentGameId(), but from
    // the payload since S isn't populated yet) so applyGame() needs no lookup await of its own.
    if (!("analysis" in payload)) {
      let saved = null;
      try {
        const k = "analysis:" + ((payload.meta && payload.meta.gameId) || ("pgn:" + simpleHash(payload.pgn || "")));
        const s = await chrome.storage.local.get(k);
        saved = s[k] || null;
      } catch {}
      payload.analysis = saved;
    }
    buildUI();               // built once; switching games re-uses it (no full page reload)
    await applyGame(payload);
    requestAnimationFrame(alignPlayers); // measure the board after the first layout
  } catch (err) {
    const e = document.getElementById("error");
    e.hidden = false;
    e.textContent = "Error: " + err.message;
    console.error(err);
  }
})();
