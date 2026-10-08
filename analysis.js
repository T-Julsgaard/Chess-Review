// analysis.js — Chess Review analysis page.
// Parses the PGN, runs Stockfish through the game and fills every panel with real
// data: eval bar/graph, accuracy, mistake classification, engine lines (MultiPV),
// opening (from the PGN), player/clock/result. Board + 2 piece styles + theme are selectable.

import { Chess } from "./lib/chess.js";
import { Engine } from "./engine/uci.js";
import { flagCodeForCountryId, countryNameForId } from "./flags.js";
import { BADGE_FONTS, MOVE_GRADE_CONFIG, moveGrade, gradeText, gradeLabel, gradeSvg } from "./move-grades.js";
import { CATEGORY_LABEL_FONT, categoryLabelPng } from "./lib/category-label.js";
import { browserAPI } from "./browser-compat.js";
import { resetSettingsForRelease } from "./release-settings.js";
import { expectedPoints, SF19_OUTCOME } from "./lib/public-scoring.js";
import { calibratedReview, scoringEvidenceComplete } from "./lib/calibrated-review.js";
import { analyseCalibratedPosition } from "./lib/calibrated-search.js";
import { ConceptSession, conceptKey } from "./lib/concepts/session.js";

/* ---------------- Opening book ----------------
 * Offline lookup table built from lichess-org/chess-openings (bundled in data/book.json).
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
    const res = await fetch(browserAPI.runtime.getURL("data/book.json"));
    BOOK = (await res.json()).epd || {};
  } catch {
    BOOK = {}; // book missing/unreadable → fall back to pure engine classification
  }
  return BOOK;
}

/* ---------------- Public calibration ----------------
 * Published evidence, fitting definitions and reproduction commands live in
 * tools/calibration. Annotations are independent of numerical accuracy/rating. */
let CALIB = null;
async function loadCalibration() {
  if (CALIB) return CALIB;
  try { CALIB = await (await fetch(browserAPI.runtime.getURL("data/calibration.json"))).json(); }
  catch { CALIB = {}; }
  return CALIB;
}

/* ---------------- Configuration ---------------- */
const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };  // used for the move-list piece icons
const FEEDBACK_URL = "https://chromewebstore.google.com/detail/chess-review/pdbffcjdmcadihmnmenkadndbdbigfam";

const BOARD_THEMES = {
  // Display order: custom colors are prepended in visualSettings, then Honeywood.
  maple:   ["#e8cfa0", "#a4703c"],   // warm maple wood
  patina:  ["#f0dec6", "#487a78"],   // warm cream and aged teal
  lavender: ["#eae4f3", "#9580b3"], // soft purple
  emerald: ["#e4ead4", "#46683f"],   // deep forest green
  slate:   ["#dfe3e9", "#8a97a8"],
  mulberry: ["#eadbd4", "#985e73"], // rose clay and muted berry
  ocean:   ["#dbe7f3", "#6f8fb4"],
  reed:    ["#dce6db", "#958448"],   // pale mint and olive ochre
  walnut:  ["#efd8b6", "#b48764"],
  ink:     ["#b9bdc6", "#474c57"],
  dusk:    ["#eadfbd", "#526b8c"],   // warm ivory and evening blue
  coral:   ["#f7dfca", "#c8835a"],   // warm terracotta
  green:   ["#e9edcc", "#6f9c54"],
  plum:    ["#e8dfca", "#6d5c79"],   // parchment and smoky aubergine
};
// Display names are separate from persisted keys so existing board preferences keep working.
const BOARD_THEME_LABEL = { green: "Meadow", walnut: "Hazel", slate: "Mist", ocean: "Harbor",
  ink: "Graphite", maple: "Honeywood", emerald: "Forest", coral: "Terracotta", lavender: "Lavender",
  patina: "Patina", mulberry: "Mulberry", reed: "Reed", dusk: "Dusk", plum: "Plum" };
const ACCENTS = {
  "#7fb45f": { accent: "#7fb45f", strong: "#6aa14a", ink: "#11210a" },
  "#5a8bef": { accent: "#5a8bef", strong: "#4574db", ink: "#06122e" },
  "#d9a544": { accent: "#d9a544", strong: "#c4902f", ink: "#2a1c05" },
  "#c77edb": { accent: "#c77edb", strong: "#aa5fc1", ink: "#260d30" },
};
// Display names are independent of stored classification keys and scoring rules.
// Annotation names and colors stay independent of move grades.
// Move glyphs are rendered per ply by the shared numerical SVG renderer.
const QUALITY = {
  brilliant: { name: "Brilliant",  color: "var(--q-brilliant)" },
  great:     { name: "Great",      color: "var(--q-great)" },
  best:      { name: "Best",       color: "var(--q-best)" },
  excellent: { name: "Excellent",  color: "var(--q-excellent)" },
  good:      { name: "Good",       color: "var(--q-good)" },
  book:      { name: "Book",       color: "var(--q-book)" },
  inacc:     { name: "Inaccuracy", color: "var(--q-inacc)" },
  mistake:   { name: "Mistake",    color: "var(--q-mistake)" },
  miss:      { name: "Miss",       color: "var(--q-miss)" },
  blunder:   { name: "Blunder",    color: "var(--q-blunder)" },
};
const QUALITY_ORDER = ["brilliant","great","best","excellent","good","book","inacc","mistake","miss","blunder"];
const BADGE_LABEL_STYLES = {
  off: { name: "Off", description: "Keep the board quiet" },
  editorial: { name: "Editorial", description: "Warm serif · fine rules" },
  studio: { name: "Studio", description: "Crisp type · graphite" },
  soft: { name: "Soft", description: "Rounded type · gentle tint" },
  minimal: { name: "Minimal", description: "Small type · subtle accent" },
  original: { name: "Expressive", description: "Illustrated lettering · pop" },
};
function badgeLabelStyle(value = S.settings.badgeTooltip) {
  // Preserve the former on/off choice when upgrading saved preferences.
  if (value === true) return "original";
  return Object.hasOwn(BADGE_LABEL_STYLES, value) ? value : "off";
}
// Accuracy breakdown: compact (default) vs. full list (expanded via the expander arrow).
const QBREAK_SUMMARY = ["brilliant","great","best","mistake","miss","blunder"];
const QBREAK_FULL = ["brilliant","great","best","excellent","good","inacc","mistake","miss","blunder","book"];
const NOTEWORTHY = new Set(["brilliant","great","inacc","mistake","miss","blunder"]);
// Explanation for each category (shown as a tooltip in the accuracy panel). The classifier
// (computeDerived → classifyMove) works on the engine's eval in PAWNS: "loss" is how much the
// eval drops after your move vs. the best continuation; a "sacrifice" is a real, voluntary
// give-up of material (not a recapture/trade), detected on the board.
const QUALITY_DESC = {
  brilliant: "A strong, sound piece sacrifice: you voluntarily offer material while keeping a satisfactory position. Ordinary trades and unnecessary sacrifices in clearly winning positions do not count.",
  great:     "An only-good move that capitalises on the opponent's mistake or blunder.",
  best:      "Exactly the engine's top move — the best possible move in the position (also shown for forced, only-legal moves).",
  excellent: "An alternative nearly as strong as the engine's top move: loses less than 2 percentage points in estimated winning chances, or begins or preserves a forced mate.",
  good:      "A small loss of estimated winning chances (2–5 percentage points), or a move that takes longer to deliver a forced mate.",
  book:      "A known opening move — the resulting position is in the bundled opening book.",
  inacc:     "A loss of about 5–10 percentage points in estimated winning chances. Context can turn a slip into a Mistake or Miss instead.",
  mistake:   "A loss of about 10–20 percentage points in estimated winning chances, or a move that gives away a clear advantage or hands one to the opponent.",
  miss:      "Missed chance: the opponent erred and you failed to punish it — or you let a forced mate slip.",
  blunder:   "A loss of at least 20 percentage points in estimated winning chances, or a severe forced-mate error. Special cases such as a missed opportunity can receive another label.",
};
// Explanations for the accuracy and elo numbers (shown as a tooltip like the categories).
const ACCURACY_INFO = "SF18 uses the published public-data move-quality model. SF19 estimates accuracy from centipawn evaluations using a public winning-chance curve and combines ordinary and harmonic move averages to give mistakes more weight. Forced moves are excluded and opening moves are included. Annotations do not alter accuracy. Scores are estimates, not official platform scores.";
const ELO_INFO = "Both engines support both rating modes using their own models. Use recorded rating compares this game's performance with players around the rating saved in the game. Stockfish 18 uses calibrated accuracy; Stockfish 19 uses its own expected-point losses, separately from displayed accuracy. Moves only ignores the saved rating and estimates a blitz rating level from the moves themselves; it needs at least 10 moves with more than one legal choice. Neither estimate changes your account rating.";
// Explanations for the engine settings (shown on hover, same tooltip as the accuracy panel).
const ENGINE_INFO = {
  engineLines:   "How many candidate moves (lines) the engine panel shows for the position you're viewing. Extra lines are searched on demand — changing this doesn't re-analyze the game.",
  classifyLines: "Lines searched for annotation and candidate inspection. Calibrated SF18 numerical scores require one analysis line. Changing this re-analyzes the game.",
  engineDepth:   "How many plies (half-moves) deep Stockfish searches each position. Higher depth gives more accurate evaluations and fewer false mistakes, but takes longer.",
  engineWorkers: "Number of Stockfish instances analysing positions in parallel. The default uses available CPU cores, up to four workers. Your selection is respected; if a worker fails to start, the review continues with the workers that did start. Search depth and scoring settings stay the same.",
  fastAnalysis:  "Trades quality for speed: the classification pass uses fewer engine lines. ~1.3×/1.6× faster, but evals shift slightly and clean games can pick up a few false inaccuracies.",
  enginePath:    "Stockfish 18 NNUE is the default. Stockfish 19 Lite uses a smaller evaluation network for a compact alternative. Both run locally; Lite is not the full-strength Stockfish 19 build.",
  engineSkill:   "Caps the engine's playing strength (Stockfish 'Skill Level'). Max (20) = full strength. Lower values play deliberately weaker — useful for more human-like suggestions.",
  engineHash:    "Recommended: 16 MB for most reviews (the default). Try 32–64 MB for deeper analysis if your computer has spare memory. Each parallel worker uses its own hash table, so memory use is roughly Hash × Workers.",
};
// Move-specific glyphs use the shared vector renderer; summary glyphs show an
// illustrative midpoint and expose the full category range to assistive tools.
function gradeBadge(cls, score, className, attrs = {}, example = false) {
  const label = gradeLabel(cls, score, categoryName(cls), example);
  return el("span", { class: className + " grade-badge", role: "img", "aria-label": label,
    "data-grade": cls === "book" ? "book" : gradeText(score, true),
    "data-badge-category": cls, "data-score": Number.isFinite(score) ? score : "",
    "data-example": String(example), "data-render-key": badgeRenderKey(cls, score, example), ...attrs,
    html: gradeSvg(cls, score, categoryName(cls), example, S.settings).replace('role="img"', 'aria-hidden="true"'),
  });
}
function badgeRenderKey(cls, score, example) {
  return JSON.stringify([cls, score, example, categoryName(cls), S.settings.badgeFont]);
}
function activeMoveGrade() {
  return S.analysisMode ? activePos().moveGrade : S.moveGrades[S.idx];
}
function updateGradeBadge(node, cls, score, example = false) {
  const key = badgeRenderKey(cls, score, example);
  if (node.dataset.renderKey === key) return;
  const next = cls === "book" ? "book" : gradeText(score, true);
  node.dataset.grade = next;
  node.dataset.score = Number.isFinite(score) ? score : "";
  node.dataset.renderKey = key;
  const label = gradeLabel(cls, score, categoryName(cls), example);
  node.setAttribute("aria-label", label);
  if (node.hasAttribute("title")) node.title = label;
  node.replaceChildren(gradeBadge(cls, score, "", {}, example).firstElementChild);
}
function refreshBadgeAppearance() {
  if (badgeLabelStyle() === "off") hideBoardBadgeTip();
  hideQTip();
  for (const node of document.querySelectorAll(".grade-badge")) {
    updateGradeBadge(node, node.dataset.badgeCategory,
      node.dataset.score === "" ? null : Number(node.dataset.score), node.dataset.example === "true");
    node.removeAttribute("title");
  }
  for (const node of document.querySelectorAll(".qb.dot")) {
    node.removeAttribute("title");
  }
}
const PIECE_STYLES = ["image","merida"];
// Persisted "image" selects Cburnett; both remaining sets are bundled GPLv2+ SVGs.
const PIECE_STYLE_LABEL = { image: "Cburnett", merida: "Merida" };
const CATEGORY_NAME_LIMIT = 24;
function cleanCategoryName(value) {
  return typeof value === "string"
    ? Array.from(value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().replace(/\s+/g, " ")).slice(0, CATEGORY_NAME_LIMIT).join("")
    : "";
}
function categoryName(cls) {
  return cleanCategoryName(S.settings.categoryNames?.[cls]) || QUALITY[cls]?.name || "";
}
// Replace category vocabulary before filling coach tokens, so user names never become tokens.
// A single pass also prevents one custom name from being replaced by another category's alias.
function categoryText(text) {
  const names = QUALITY_ORDER.filter(k => categoryName(k) !== QUALITY[k].name);
  if (!names.length) return text;
  const byName = new Map(names.map(k => [QUALITY[k].name.toLowerCase(), categoryName(k)]));
  const pattern = names.map(k => QUALITY[k].name).sort((a, b) => b.length - a.length).join("|");
  return text.replace(new RegExp("\\b(" + pattern + ")\\b", "gi"), match => byName.get(match.toLowerCase()));
}
// "image" = real piece images (cburnett). Filenames per piece+color (l=white, d=black).
// Bundled high-quality SVG piece sets (from Lichess; GPLv2+). Maps a piece-style key to its folder
// under pieces-img/<set>/<code>.svg, where <code> is e.g. wK / bN (white King, black kNight). SVG =
// crisp at any board size.
const BUNDLED_PIECE_SETS = { image: "cburnett", merida: "merida" };
// Saved board preferences migrate to supported flat-color palettes.
const REMOVED_BOARD_THEMES = {
  chesscom: "maple",
  kada_green: "green", kada_sand: "walnut", kada_amber: "maple",
  kada_clay: "coral", kada_wood: "maple",
};
function migrateVisualAssetSettings(settings) {
  let changed = false;
  const labelStyle = badgeLabelStyle(settings.badgeTooltip ?? "off");
  if (settings.badgeTooltip !== labelStyle) {
    settings.badgeTooltip = labelStyle;
    changed = true;
  }
  // Upgrade the former default once; explicit selections of other fonts survive.
  // badgeDecimals identifies legacy settings and is removed below.
  if (settings.badgeFont === "original" && Object.hasOwn(settings, "badgeDecimals")) {
    settings.badgeFont = "spacemono";
    changed = true;
  }
  if (!PIECE_STYLES.includes(settings.pieceStyle)) {
    settings.pieceStyle = "image";
    changed = true;
  }
  const replacement = REMOVED_BOARD_THEMES[settings.boardTheme];
  if (replacement) {
    settings.boardTheme = replacement;
    changed = true;
  }
  // Remove obsolete visual preferences and source artwork metadata from older versions.
  for (const key of ["ccPieceSet", "ccPieceUrlTemplate", "ccPieceUrlMap", "ccBoardTheme", "ccBoardUrl", "badgeFlicker", "badgeDecimals"]) {
    if (Object.hasOwn(settings, key)) {
      delete settings[key];
      changed = true;
    }
  }
  return changed;
}

// Preserve the original CPU-based default and explicit worker choices. Missing
// or approximate memory hints do not prove that a working pool needs shrinking.
// Recover from actual startup failures below instead of preemptively slowing it.
function engineWorkerCount(requested = null, positions = Infinity,
  hardware = typeof navigator === "undefined" ? {} : navigator) {
  const cores = Number(hardware.hardwareConcurrency);
  const defaults = Math.max(1, Math.min(4,
    (Number.isFinite(cores) && cores >= 1 ? Math.floor(cores) : 4) - 1));
  const value = requested == null ? defaults : Number(requested);
  const desired = Number.isFinite(value) ? Math.max(1, Math.min(8, Math.floor(value))) : defaults;
  return Math.max(1, Math.min(desired, positions));
}

const DEFAULT_SETTINGS = {
  conceptsEnabled: false,
  categoryNames: {},
  theme: "dark", accent: "#7fb45f", accentCustom: "#9b72d0", density: "compact",
  evalView: "both", mlStyle: "rows", badgeStyle: "icon", badgeScale: 1,
  badgeFont: "spacemono", badgeTooltip: "off",
  // Eval-graph look (see renderGraph), eval-BAR look (see renderEvalBar) and the Insight-panel text size (px).
  graphStyle: "area", barStyle: "gradient", insightFont: 18,
  // Board coordinate labels (the a–h / 1–8 ticks in the squares' corners): on/off + size in px.
  showCoords: true, coordSize: 12,
  // App background: "color" (a tone picked with the HSL sliders), a bundled preset (slate / olive
  // = "Dark", a fixed near-black tone), or "custom" (uploaded). bgFit is "cover" (stretched) or "tile" (repeated
  // at bgTile size). bgCustom holds the uploaded data URL. bgHue/Sat/Light define the "color" tone.
  // Default = a near-black neutral colour tone (HSL 0/0/10).
  bg: "color", bgFit: "tile", bgTile: "large", bgCustom: null,
  bgHue: 0, bgSat: 0, bgLight: 10,
  // Commentary coach (data/coaches/<id>.json) — drives the animated avatar that's shown.
  // coachPlain toggles only the reply VOICE: false = the coach's special phrasing,
  // true = neutral "plain" commentary (the coach still appears and reacts on the board).
  coach: "old_soviet", coachPlain: true,
  // Start with Honeywood (persisted as "maple") and bundled Cburnett pieces.
  boardTheme: "maple", pieceStyle: "image", sound: true,
  // Master volume (0–100) applied to every sound the extension plays.
  soundVolume: 50,
  // Custom board colours (used when boardTheme === "custom" — the colour-picker chip, shown first).
  boardCustomLight: "#f9f9f9", boardCustomDark: "#e1a652",
  // Per-event sound mapping + knobs (see FX_SOUNDS / SOUND_EVENTS). snd = an FX_SOUNDS id or "default"
  // (the original cue); pitch in semitones; speed is a duration multiplier (1 = unchanged).
  soundFx: {
    move:    { snd: "default", pitch: 0, speed: 1 },
    capture: { snd: "default", pitch: 0, speed: 1 },
    check:   { snd: "default", pitch: 0, speed: 1 },
    castle:  { snd: "default", pitch: 0, speed: 1 },
  },
  // Best-move arrow (the engine's recommendation in the current position)
  bestArrow: true, bestArrowColor: "#85ae4a", arrowOpacity: 0.65, arrowShaft: 0.2, arrowHead: 0.4,
  // "Show the threat": a yellow arrow with the opponent's best move as if it were their turn.
  showThreat: false,
  // Move animation (sliding piece on single-step navigation). 1 = slow, 10 = fast.
  moveAnim: true, animSpeed: 7,
  // Loading animation while the analysis runs (selectable style).
  loaderStyle: "wave",
  // Engine panel: how many candidate lines to show. The batch only searches the single best line
  // (all the classification logic needs); extra lines are searched on demand for the position you're
  // viewing, so changing this never re-analyzes — it just refreshes the panel.
  // Default SF18 searches match the published depth16/Hash16 quality model.
  engineLines: 1, engineDepth: 16, enginePath: "nnue", engineHash: 16, engineSkill: 20,
  // Parallel analysis workers: independent single-threaded Stockfish instances that pull
  // positions from a shared queue. Each position is still searched identically (cold, same
  // depth/lines), so results are unchanged — only the wall-clock is parallelized. Default ≈
  // (CPU cores − 1), capped at 4. Manual selections are respected.
  engineWorkers: engineWorkerCount(),
  // Extra lines serve annotation and candidate inspection. Calibrated SF18 scores use one line.
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
  ratingMode: "context",
};
// Keys reset by "Reset engine defaults" (everything in the Engine tab), and their default values.
const ENGINE_SETTING_KEYS = [
  "engineDepth", "classifyLines", "engineLines", "engineWorkers", "enginePath", "engineHash", "engineSkill",
  "clsGood", "clsInacc", "clsBlunder", "clsClearAdv", "clsMistakeLoss", "clsMissTol",
  "ratingMode",
];
// Two single-threaded builds; the app parallelizes positions across independent workers.
const ENGINE_BUILDS = { nnue: "engine/stockfish-nnue.js", sf19lite: "engine/stockfish-19-lite-single.js" };
const ENGINE_FALLBACK_ORDER = ["nnue", "sf19lite"];

function migrateEngineSettings(settings) {
  if (settings.enginePath === "sf19") settings.enginePath = "sf19lite";
  if (!Object.hasOwn(ENGINE_BUILDS, settings.enginePath)) settings.enginePath = DEFAULT_SETTINGS.enginePath;
}
// The engine panel shows up to this many candidate lines (searched on demand for the viewed position).
const ENGINE_MAX_LINES = 4;
// Best-move arrow color — a muted hint green.
const ARROW_COLOR = "#85ae4a";
// User arrow color — yellow/orange.
const USER_ARROW_COLOR = "#E89B3C";
// Loading style → CSS variant. The keys are shown directly in the settings.
const LOADERS = { dots: "pulse", bounce: "bounce", spinner: "spin", wave: "wave" };
// Default placement of the movable modules (free canvas). Saved per user.
// When LAYOUT_VERSION is bumped, saved layouts are reset to this default once.
// Responsive placement is the default. Custom layouts start from the current screen.
// These boxes also provide desktop placement and hidden-module fallback geometry.
const LAYOUT_VERSION = 8;
const DEFAULT_LAYOUT = {
  board:    { x: 344,  y: 0,   w: 822, h: 934 },
  evalbar:  { x: 288,  y: 58,  w: 30,  h: 816 },
  controls: { x: 1194, y: 812, w: 310, h: 54  },
  coach:    { x: 1570, y: 0,   w: 192, h: 196 },
  review:   { x: 1200, y: 60,  w: 604, h: 136 },
  moves:    { x: 1200, y: 216, w: 300, h: 390 },
  accuracy: { x: 1510, y: 216, w: 294, h: 506 },
  graph:    { x: 1200, y: 620, w: 300, h: 178 },
  engine:   { x: 1510, y: 736, w: 294, h: 178 },
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
  feedback: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/><path d="M8 10h8M8 14h5"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.6-3.2 1.8 1.8 0 0 1 1.4-2.9h1a4 4 0 0 0 4-4C21 6.5 17 3 12 3Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10" cy="6.8" r=".8"/><circle cx="14" cy="6.8" r=".8"/><circle cx="17" cy="10" r=".8"/></svg>`,
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
function feedbackLink(className, ...kids) {
  return el("a", { class: className, href: FEEDBACK_URL, target: "_blank", rel: "noopener noreferrer",
    "aria-label": "Give feedback on the Chrome Web Store (opens in a new tab)" },
    el("span", { "aria-hidden": "true", style: { display: "contents" } }, icon("feedback")), ...kids);
}

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
const _url = (p) => (browserAPI?.runtime?.getURL ? browserAPI.runtime.getURL(p) : p);
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
  browserAPI.storage.local.set({ settings: S.settings });
}
// Resolve an event's chosen sound to a packaged URL.
function fxUrl(ev) {
  const cfg = fxConfig(ev);
  if (cfg.snd === "default") return _url(_eventDef(ev)[2]);
  return _url(_fxFileById(cfg.snd) || _eventDef(ev)[2]);
}
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
// Pick the event for a SAN string. Priority: capture > check/mate > castle > plain move.
function sanSound(san) {
  san = san || "";
  if (/x/.test(san)) return "capture";
  if (/[+#]/.test(san)) return "check";
  if (/^[O0]-[O0]/.test(san)) return "castle";
  return "move";
}
// Play the move sound for the position you land on (capture/check/castle/move, from its SAN).
function playMoveSound(ply) {
  if (!S.settings.sound || ply < 1 || !S.positions[ply]) return;
  playEvent(sanSound(S.positions[ply].san));
}
// The practice mistake cue is fixed to Incorrect.
let _wrongAudio = null;
function playWrongSound() {
  if (!S.settings.sound) return;
  if (!_wrongAudio) _wrongAudio = new Audio(_url("sounds/Wrong/Incorrect.mp3"));
  try { _wrongAudio.volume = masterVol(); _wrongAudio.currentTime = 0; _wrongAudio.play().catch(() => {}); } catch {}
}

/* ---------------- State ---------------- */
const S = {
  pgn: "", headers: {}, meta: {},
  positions: [], clocks: [], evals: [], bests: [],
  classif: [], accMove: [], moveGrades: [], searchPreviews: [], _sacCache: [], _forcedCache: [],
  players: { w: {}, b: {} }, meSide: "w",
  // Both accuracy aliases use the active engine's scorer, independent of annotations.
  acc: { w: null, b: null }, accElo: { w: null, b: null }, counts: { w: {}, b: {} },
  bookCount: 0, opening: null, verdict: "Analyzing …",
  idx: 0, total: 0, flipped: false,
  // `progress` is the contiguous prefix that is safe to navigate to while a batch is
  // still running. `completed` is the total number of game plies already returned by
  // any worker. They differ when parallel workers finish out of order.
  analyzing: true, progress: 0, completed: 0, analysisError: null, userArrows: [], userMarks: [], qbreakExpanded: false,
  // Collapsible settings sections: open/closed state, keyed by section title.
  setOpen: {},
  settings: { ...DEFAULT_SETTINGS },
  layout: structuredClone(DEFAULT_LAYOUT), layoutMode: "auto",
  evalEngines: [], autoTimer: null,
  // Re-analysis + analysis mode
  batchGen: 0, settingsTab: "visual", analyzedMultipv: null,
  analysisMode: false, variation: null, liveEngine: null, liveEnginePromise: null, liveEngineGeneration: 0, liveError: null, liveToken: 0, panelToken: 0, _panelCache: null, selectedSq: null,
  // The build that is ACTUALLY running (set by createEngine; may differ from settings.enginePath if
  // the chosen build failed to load and we fell back). The Engine tab shows this, not the selection.
  activeEngineBuild: null, engineFallbackBuild: null,
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
  // The one-shot storage handoff is removed after startup. Keep the current
  // game's lightweight payload in this tab's session so Reload still works,
  // including after the user switches to a different library game.
  try {
    const session = JSON.parse(window.sessionStorage.getItem(key));
    if (session && typeof session.pgn === "string") return session;
  } catch { /* Unavailable or corrupt session storage: use the launch handoff. */ }
  const data = await browserAPI.storage.local.get(key);
  const payload = data[key];
  if (!payload) throw new Error("Analysis data not found (open via the popup).");
  // NOTE: Do NOT remove the job here — two-phase load: keep it until applyGame succeeds,
  // so a failed initialization (corrupt PGN, engine crash, etc.) leaves the data for a retry.
  return payload;
}
function rememberReviewJob() {
  const jobId = location.hash.replace(/^#/, "");
  if (!jobId || !S.pgn) return false;
  try {
    // Analysis is looked up separately using the current scoring/settings key.
    window.sessionStorage.setItem(`job:${jobId}`, JSON.stringify({ pgn: S.pgn, meta: S.meta }));
    return true;
  } catch { return false; }
}
function parseHeaders(pgn) {
  const h = {}; const re = /\[(\w+)\s+"([^"]*)"\]/g; let m;
  while ((m = re.exec(pgn))) h[m[1]] = m[2];
  return h;
}
function parseClocks(pgn) {
  const chess = new Chess(); chess.loadPgn(pgn);
  const comments = new Map(chess.getComments().map(({ fen, comment }) => [fen, comment]));
  // Clock tags are optional. Match comments to their actual mainline positions
  // rather than shifting every later clock when one move has no tag.
  return [null, ...chess.history({ verbose: true }).map(move => {
    const m = (comments.get(move.after) || "").match(/\[%clk\s+([\d:.]+)\]/);
    if (!m) return null;
    let t = m[1].split(".")[0];
    const p = t.split(":").map(Number);
    if (p.length === 3) t = `${p[0] * 60 + p[1]}:${String(p[2]).padStart(2, "0")}`;
    return t;
  })];
}
function buildPositions(pgn) {
  const c = new Chess(); c.loadPgn(pgn);
  const moves = c.history({ verbose: true });
  // No moves → keep whatever position the PGN set up (a [FEN] header for a pasted FEN), not the
  // standard start. With moves, the start is the position before the first one.
  const startFen = moves.length ? moves[0].before : c.fen();
  
  // Replay the game move by move to track draw conditions at each position.
  // This correctly detects threefold repetition, 50-move rule, etc.
  const pos = [];
  const replay = new Chess(startFen);
  
  function getDrawType(chess) {
    if (chess.isCheckmate()) return "checkmate";
    if (chess.isStalemate()) return "stalemate";
    if (chess.isDrawByFiftyMoves()) return "fifty-move";
    if (chess.isInsufficientMaterial()) return "insufficient-material";
    if (chess.isThreefoldRepetition()) return "threefold";
    return null;
  }
  
  // Initial position
  const startDraw = getDrawType(replay);
  pos.push({ fen: startFen, san: null, draw: startDraw });
  
  for (const mv of moves) {
    replay.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
    const fen = mv.after;
    
    const draw = getDrawType(replay);
    pos.push({ fen, san: mv.san, from: mv.from, to: mv.to, color: mv.color, promotion: mv.promotion || "", captured: mv.captured || "", draw });
  }
  return pos;
}
function searchHistory(positions, idx = positions.length - 1) {
  if (!Number.isInteger(idx) || idx < 0 || idx >= positions.length) throw new Error("Invalid search position");
  return { initialFen: positions[0].fen,
    moves: positions.slice(1, idx + 1).map(p => p.from + p.to + (p.promotion || "")) };
}
function variationSearchHistory(v, idx) {
  return searchHistory([...S.positions.slice(0, v.branchIdx + 1), ...v.positions.slice(1, idx + 1)]);
}
function activeSearchHistory() {
  return S.analysisMode && S.variation ? variationSearchHistory(S.variation, S.variation.idx) : searchHistory(S.positions, S.idx);
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
// Convert score to centipawns, preserving mate distance.
// Mate scores are mapped to large but finite values: mate in N → ±(10000 - N*100)
// This preserves the ordering: Mate in 1 > Mate in 2 > ... > large advantage
function scoreToCp(s) {
  if (!s) return 0;
  if (s.mate != null) {
    const m = s.mate;
    // Cap at reasonable distance to avoid overflow; mate > 50 treated as "mate in many"
    const dist = Math.min(Math.abs(m), 50);
    return m > 0 ? 10000 - dist * 100 : -10000 + dist * 100;
  }
  return s.cp;
}
function whiteRel(score, fen) {
  if (!score) return null;
  const flip = fen.split(" ")[1] === "b" ? -1 : 1;
  return score.mate != null ? { mate: score.mate * flip } : { cp: score.cp * flip };
}
// Terminal positions (checkmate/stalemate/draw) must not be read from the engine: a mate
// position has no legal moves, and Stockfish typically reports "score mate 0" — an unsigned
// zero, which would otherwise always be interpreted as the same side (wrong eval bar on mate).
// We decide the result directly from the board and return a white-relative score.
// Uses pre-computed draw info from S.positions when available to correctly detect
// threefold repetition, 50-move rule, etc.
function terminalScore(fen, plyIndex) {
  // Try to find the position in S.positions to use pre-computed draw info
  if (plyIndex != null && S.positions && S.positions[plyIndex]) {
    const pos = S.positions[plyIndex];
    if (pos.fen === fen && pos.draw) {
      if (pos.draw === "checkmate") return { mate: fen.split(" ")[1] === "w" ? -1 : 1 };
      if (pos.draw !== "checkmate") return { cp: 0 }; // stalemate, fifty-move, insufficient-material, threefold
    }
  }
  
  // Fallback: try to find by FEN in all positions (for variation positions, etc.)
  if (S.positions) {
    const found = S.positions.find((p) => p.fen === fen);
    if (found && found.draw) {
      if (found.draw === "checkmate") return { mate: fen.split(" ")[1] === "w" ? -1 : 1 };
      if (found.draw !== "checkmate") return { cp: 0 };
    }
  }
  
  // Last resort: create Chess instance (won't detect threefold correctly without history)
  let c; try { c = new Chess(fen); } catch { return null; }
  if (c.isCheckmate()) return { mate: fen.split(" ")[1] === "w" ? -1 : 1 };
  if (c.isDraw()) return { cp: 0 };
  return null;
}
function winPct(cp) { return Number.isFinite(cp) && CALIB?.quality?.outcome ? 100 * expectedPoints({cp}, CALIB.quality.outcome) : NaN; }
function moverWin(wr, mover) { const wp = winPct(scoreToCp(wr)); return mover === "w" ? wp : 100 - wp; }
function annotationOutcome(i, state) {
  const build = state.bests[i - 1]?.calibration?.build || state.settings.enginePath;
  return build === "sf19lite" ? SF19_OUTCOME : CALIB?.quality?.outcome;
}
function annotationPoints(score, i, state) {
  try { return 100 * expectedPoints(score, annotationOutcome(i, state)); } catch { return null; }
}
// Completed review decisions use best and played scores from one original root.
// Position evaluations remain useful for streamed/variation annotations only.
function annotationPair(i, state) {
  const root = state.bests[i - 1], p = state.positions[i];
  const played = p.from + p.to + (p.promotion || "");
  const valid = score => score?.mate != null ? Number.isInteger(score.mate) && score.mate !== 0 : Number.isFinite(score?.cp);
  if (root && Object.hasOwn(root, "playedScore")) {
    const best = root.score, actual = root.bestmove === played ? best : root.playedScore;
    return valid(best) && valid(actual) ? {best, played: actual, paired: true} : null;
  }
  if (!state.evals[i - 1] || !state.evals[i]) return null;
  const sign = p.color === "w" ? 1 : -1;
  const relative = score => score.mate != null ? {mate: score.mate * sign} : {cp: score.cp * sign};
  const lines = root?.lines || [], top = lines.find(line => line.multipv === 1) || lines[0];
  const actual = lines.find(line => (line.pv || "").split(" ")[0] === played);
  const best = top?.score || relative(state.evals[i - 1]);
  const after = actual?.score || relative(state.evals[i]);
  return valid(best) && valid(after) ? {best, played: after, paired: false} : null;
}
function decisionScore(i, which, mover, state) {
  const score = state.annotationEvidence?.[i]?.[which];
  if (!score) return null;
  const sign = state.positions[i].color === mover ? 1 : -1;
  return score.mate != null ? {mate: score.mate * sign} : {cp: score.cp * sign};
}
function decisionPawns(i, which, mover, state) {
  const score = decisionScore(i, which, mover, state);
  return score ? scoreToCp(score) / 100 : null;
}
function decisionMate(i, which, mover, state) {
  return decisionScore(i, which, mover, state)?.mate ?? null;
}
function sideAccuracies() {
  S.calibrated = calibratedReview(S.positions, S.bests, CALIB, S.players, S.settings.ratingMode || "context");
  for (const side of ["w", "b"]) for (const move of S.calibrated[side].moves) S.accMove[move.ply] = move.quality;
  return {w: S.calibrated.w.accuracy, b: S.calibrated.b.accuracy};
}

/* ---------------- Move classification (adapted from Brilliant-Chess, MIT) -----------------------
   Copyright (c) 2025 Delo <https://github.com/wdeloo>.
   Full upstream copyright and permission notice: THIRD_PARTY_NOTICES.md.
   The category chains use mover-relative evaluations. Brilliant is a separate, conservative
   annotation: legal material-offer evidence plus soundness and competitive-position evidence.
   It does not change the evaluation-based accuracy or rating inputs. */
const SAC_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function _opp(c) { return c === "w" ? "b" : "w"; }
// Material gain available to the side to move through captures on one square. Enumerating legal
// moves handles pins, king safety, x-rays and promotion recaptures. This is bounded local exchange
// evidence, not a tactical engine: checks/intermediate moves elsewhere belong to the engine eval.
// A side can stop exchanging only when a legal move outside this capture sequence exists.
function exchangeGain(chess, square, budget) {
  // Capture trees can reach the same board in different orders. Reuse only completed results;
  // never memoize unknown/exhausted branches. Clock counters do not affect local material gain.
  const memo = budget.memo || (budget.memo = new Map());
  const key = chess.fen().split(" ").slice(0, 4).join(" ") + ":" + square;
  if (memo.has(key)) return memo.get(key);
  if (++budget.nodes > budget.maxNodes) return null;
  if (!chess.get(square) || !chess.attackers(square, chess.turn()).length) { memo.set(key, 0); return 0; }
  const legal = chess.moves({ verbose: true });
  const captures = legal.filter(m => m.to === square && m.captured);
  if (!captures.length) { memo.set(key, 0); return 0; }
  let best = legal.length > captures.length ? 0 : -Infinity;
  for (const m of captures) {
    const reply = exchangeGain(new Chess(m.after), square, budget);
    if (reply == null) return null;
    const promotion = m.promotion ? SAC_VAL[m.promotion] - SAC_VAL.p : 0;
    best = Math.max(best, SAC_VAL[m.captured] + promotion - reply);
  }
  memo.set(key, best);
  return best;
}
// An attacked piece is voluntary only if some legal move could avoid its material loss. This
// includes moving it, removing the attacker, adding a defender, or an equal-value exchange.
function couldBeSaved(chess, square, color, budget = { nodes: 0, maxNodes: 128 }) {
  const piece = chess.get(square);
  if (!piece || piece.color !== color) return false;
  const legal = chess.moves({ verbose: true });
  if (!chess.attackers(square, _opp(color)).length && legal.some(m => m.from !== square)) return true;
  for (const m of legal.sort((a, b) => Number(a.from !== square) - Number(b.from !== square))) {
    const after = new Chess(m.after), to = m.from === square ? m.to : square;
    if (after.get(to)?.color !== color) continue;
    const gain = exchangeGain(after, to, budget);
    if (gain == null) return false;
    if (gain <= (SAC_VAL[m.captured] || 0)) return true;
  }
  return false;
}
// A voluntary offer of a non-pawn piece with a strictly positive local material cost. Material
// captured by the played move is credited first, so equal/profitable trades do not count. A rook
// for a minor and pawn can still count (one pawn net); there is no fitted sacrifice-size threshold.
// The opponent need not accept the offer in the game. Budget exhaustion withholds the annotation.
function isSacrifice(move) {
  let after, before;
  try { after = new Chess(move.after); before = new Chess(move.before); } catch { return false; }
  if (before.turn() !== move.color || after.turn() !== _opp(move.color)) return false;
  const budget = { nodes: 0, maxNodes: 128 };
  const captured = (SAC_VAL[move.captured] || 0) + (move.promotion ? SAC_VAL[move.promotion] - SAC_VAL.p : 0);
  let priorThreats = null;
  const targets = after.board().flat().filter(p => p && p.color === move.color
    && ["n", "b", "r", "q"].includes(p.type) && after.attackers(p.square, _opp(move.color)).length);
  for (const piece of targets) {
    const square = piece.square;
    const same = before.get(square)?.color === piece.color && before.get(square)?.type === piece.type;
    const source = same ? square : move.from;
    // Do not treat a newly promoted piece or an ambiguous relocated rook as an existing offer.
    if (before.get(source)?.color !== piece.color || before.get(source)?.type !== piece.type) continue;
    const gain = exchangeGain(after, square, budget);
    if (gain == null) return false;
    if (gain <= captured) continue;
    if (same) {
      // A quiet move does not sacrifice an unrelated piece that was already hanging. Compare
      // legal capture consequences, since removing a pin/defender can create a genuine offer.
      // The hypothetical opponent turn has no en-passant right from its own preceding move.
      if (!priorThreats) {
        const fields = before.fen().split(" "); fields[1] = _opp(move.color); fields[3] = "-";
        priorThreats = new Chess(fields.join(" "));
      }
      const previousGain = exchangeGain(priorThreats, square, budget);
      if (previousGain == null) return false;
      // A new check changes the opponent's response obligation. An accepted offer must still
      // be a legal check evasion, as established by exchangeGain after the played move.
      if (gain - captured <= previousGain && !after.isCheck()) {
        // Ignoring a NEW opponent threat can be a tempo sacrifice. History distinguishes that
        // choice from inheriting an offer already present after the mover's previous turn.
        let earlier;
        try { if (move.prior) earlier = new Chess(move.prior); } catch {}
        if (!earlier || earlier.turn() !== _opp(move.color)
          || earlier.get(square)?.color !== piece.color || earlier.get(square)?.type !== piece.type) continue;
        const earlierGain = exchangeGain(earlier, square, budget);
        if (earlierGain == null) return false;
        if (previousGain <= earlierGain) continue;
      }
    }
    if (couldBeSaved(before, source, move.color, budget)) return true;
  }
  return false;
}
// Independent annotation policy, deliberately not coefficients fitted to recorded ratings.
const BRILLIANT_POLICY = { minAfterPawns: -0.5, clearlyWinningPawns: 5 };
function brilliantEligible(i, mover, std, wpDrop, state) {
  if (std[i] !== "excellent" || !Number.isFinite(wpDrop?.[i])) return false;
  const root = state.bests[i - 1], topLine = root?.lines?.[0];
  const afterLine = state.bests[i]?.lines?.[0];
  if ([topLine, ...(state.annotationEvidence[i]?.paired ? [] : [afterLine])].some(l => l?.bound && l.bound !== "exact")) return false;
  const after = decisionPawns(i, "played", mover, state), before = decisionPawns(i, "best", mover, state);
  const mateAfter = decisionMate(i, "played", mover, state), mateBefore = decisionMate(i, "best", mover, state);
  if (!Number.isFinite(after) || !Number.isFinite(before)
    || (mateAfter != null ? mateAfter <= 0 : after < BRILLIANT_POLICY.minAfterPawns)) return false;
  // A sound offer in an undecided position does not depend on a preceding opponent error.
  if (!(mateBefore > 0) && before < BRILLIANT_POLICY.clearlyWinningPawns) return true;
  // Root MultiPV scores are already from the mover's perspective, unlike state.evals. The
  // highest-ranked other move tests whether a clearly winning alternative is available. With
  // only one line this counterfactual is unknown: keep Best/Excellent instead of inventing it.
  const p = state.positions[i], played = (p.from || "") + (p.to || "") + (p.promotion || "");
  const topMove = (topLine?.pv || "").split(" ")[0];
  if (!topMove || topMove !== root?.bestmove || topLine?.multipv !== 1 || !topLine.depth) return false;
  const rank = topMove === played ? 2 : 1;
  const line = root.lines.find(l => l.multipv === rank);
  if (!line || line.bound !== "exact" || line.depth !== topLine.depth) return false;
  const alternative = line.score;
  if (!alternative) return false;
  if (alternative.mate != null) return alternative.mate < 0;
  return Number.isFinite(alternative.cp) && alternative.cp / 100 < BRILLIANT_POLICY.clearlyWinningPawns;
}
// Great means finding the only good reply, not merely replying after an error. The runner-up
// must be worse than the Good band in the same completed root depth. With one line, this is
// unknown; retain the ordinary category without scheduling more engine searches.
function onlyGoodReply(i, state) {
  const root = state.bests[i - 1], top = root?.lines?.find(l => l.multipv === 1);
  const next = root?.lines?.find(l => l.multipv === 2);
  const move = state.positions[i];
  const played = (move.from || "") + (move.to || "") + (move.promotion || "");
  const topMove = (top?.pv || "").split(" ")[0], nextMove = (next?.pv || "").split(" ")[0];
  if (!top || !next || top.bound !== "exact" || next.bound !== "exact"
    || !Number.isInteger(top.depth) || top.depth <= 0 || next.depth !== top.depth
    || topMove !== played || topMove !== root.bestmove || !nextMove || nextMove === topMove
    || !Number.isFinite(top.score?.cp)) return false;
  if (!state.annotationEvidence[i]?.paired && state.bests[i]?.lines?.some(l => l.multipv === 1 && l.bound && l.bound !== "exact")) return false;
  const other = next.score;
  if (!other || (other.mate != null ? !Number.isFinite(other.mate) || other.mate === 0 : !Number.isFinite(other.cp))) return false;
  // Root PVs must identify distinct legal moves, including promotion identity.
  try {
    const before = new Chess(state.positions[i - 1].fen);
    if (before.turn() !== move.color) return false;
    const legal = before.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || ""));
    if (!legal.includes(topMove) || !legal.includes(nextMove)) return false;
  } catch { return false; }
  const threshold = CALIB?.clsWp?.inacc ?? 5;
  return Number.isFinite(threshold) && threshold > 0
    && annotationPoints(top.score, i, state) - annotationPoints(other, i, state) >= threshold;
}
function _isCheckmate(k, state = S) { try { return new Chess(state.positions[k].fen).isCheckmate(); } catch { return false; } }
// Baseline bucket on the WIN%-DROP (the "expected points" model),
// not raw pawns: losing 0.8 pawns at +0.2 is a real slip, but at +6 it's nothing. Thresholds are
// in win% points (0–100); defaults mirror the standard table (≤2 excellent … >20 blunder,
// with the add-on deriving Mistake from the clear-advantage logic). Overridable via calibration.json.
function getStandardRating(wp) {
  if (!Number.isFinite(wp)) return null;
  const t = (typeof CALIB !== "undefined" && CALIB?.clsWp) || { good: 2, inacc: 5, blunder: 20 };
  let r = "excellent";
  if (wp >= t.good) r = "good";
  if (wp >= t.inacc) r = "inacc";
  if (wp >= t.blunder) r = "blunder";
  return r;
}
// Per-ply move category, ported from getMoveRating(). `mover` made move i; `isTop` = it was the
// engine's #1; `book` = the resulting position is theory; arrays sac/std/loss are indexed by ply.
function classifyMove(i, mover, isTop, book, sac, std, loss, wpDrop, state = S) {
  if (book) return "book";
  // "Forced": only one legal move in the position before — we have no separate icon, so it reads
  // as Best (you couldn't have done better).
  if (_forcedAt(i, state)) return "best";   // only one legal move — you couldn't have done better

  // Contextual thresholds in pawns of eval; retain saved values from earlier versions.
  const CA = state.settings.clsClearAdv, ML = state.settings.clsMistakeLoss, MT = state.settings.clsMissTol;
  const mate = (k) => decisionMate(i, k === i ? "played" : "best", mover, state) != null;
  const evalFor = (k) => decisionPawns(i, k === i ? "played" : "best", mover, state);
  const winningNow = (evalFor(i) ?? 0) > 0;
  const prevWinning = (evalFor(i - 1) ?? 0) > 0;
  const notMateRel = !mate(i) && !mate(i - 1);
  const wasNotMateRel = (n) => { const k = i - 1 - n; return k >= 1 && state.annotationEvidence[k]
    && decisionMate(k, "best", state.positions[k].color, state) == null
    && decisionMate(k, "played", state.positions[k].color, state) == null; };
  const pStd = (n) => (i - 1 - n >= 1 ? std[i - 1 - n] : null);
  const pLoss = (n) => (i - 1 - n >= 1 ? loss[i - 1 - n] : null);
  // mover-POV "lost a clear advantage" / "fell into a clear disadvantage" (CA pawns) for move k.
  const losingAdvAt = (k) => { const m = state.positions[k].color; const a = decisionPawns(k, "best", m, state), b = decisionPawns(k, "played", m, state); return a != null && b != null && a >= CA && b < CA; };
  const givingAdvAt = (k) => { const m = state.positions[k].color; const a = decisionPawns(k, "best", m, state), b = decisionPawns(k, "played", m, state); return a != null && b != null && a >= -CA && b < -CA; };
  const keepMating = (k) => { const m = state.positions[k].color, c = decisionMate(k, "played", m, state), p = decisionMate(k, "best", m, state); return c != null && p != null && c > 0 && p > 0 && c <= p; };

  const previousMistake = wasNotMateRel(0) && pStd(0) === "inacc" && pLoss(0) >= ML && (losingAdvAt(i - 1) || givingAdvAt(i - 1));
  const previousPreviousMistake = wasNotMateRel(1) && pStd(1) === "inacc" && pLoss(1) >= ML && (losingAdvAt(i - 2) || givingAdvAt(i - 2));
  const previousMiss = wasNotMateRel(0) && (previousPreviousMistake || pStd(1) === "blunder")
    && (pStd(0) === "blunder" || pStd(0) === "inacc") && (pLoss(0) != null && pLoss(1) != null && pLoss(0) <= pLoss(1) + MT);

  // Material offer and engine quality are separate: board evidence alone cannot prove soundness.
  // Do not reward delays of a known mate or moves that merely remain best in a decided position.
  const beforeMate = decisionMate(i, "best", mover, state), afterMate = decisionMate(i, "played", mover, state);
  const soundMate = !(beforeMate > 0) || (afterMate > 0 && keepMating(i));
  if (sac[i] && soundMate && brilliantEligible(i, mover, std, wpDrop, state)) return "brilliant";

  // Great — an only-good move that capitalises on the opponent's mistake/blunder.
  if (!previousMiss && wasNotMateRel(0) && notMateRel && std[i] === "excellent"
    && (previousMistake || pStd(0) === "blunder") && onlyGoodReply(i, state)) return "great";

  // Mate signs are relative to the mover. Reversing who wins is not delaying one's own mate;
  // already being mated supplies no expected-result reason to reward faster defeat.
  if (beforeMate > 0 && afterMate < 0) return "blunder";
  if (beforeMate > 0 && afterMate > beforeMate) return "good";
  if (beforeMate < 0 && afterMate > 0) return isTop ? "best" : "excellent";
  if (beforeMate < 0 && afterMate < 0) return isTop ? "best" : std[i];

  if (isTop && _isCheckmate(i, state)) return "best";
  if (isTop) return "best";

  if (_isCheckmate(i, state)) return "excellent";
  if (!mate(i - 1) && mate(i) && winningNow) return "excellent";                                             // starts a mate
  if (mate(i - 1) && mate(i) && keepMating(i) && winningNow) return "excellent";                             // keeps the mate

  if (mate(i - 1) && !mate(i) && prevWinning) return "miss";                                                 // threw away a forced mate
  if (!previousMiss && notMateRel && (previousMistake || pStd(0) === "blunder")
    && (std[i] === "blunder" || std[i] === "inacc")
    && evalFor(i) < CA
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

// Include the played game's history before the branch so Great/Miss/Brilliant
// have exactly the same context as normal review. Never overwrite the mainline.
function classifyVariationMoves() {
  const v = S.variation;
  if (!v) return;
  const branch = v.branchIdx;
  const nodes = v.positions.slice(1);
  const bests = [...S.bests.slice(0, branch), ...v.positions.map(p => p.searchPreview || p.best)];
  const original = S.positions[branch + 1], first = nodes[0];
  // The inherited root's paired playedScore belongs to the original game move.
  // Keep it only when that same move is replayed, including promotion identity.
  // Other replies use their candidate/position evaluation; copy before discarding
  // the pair so entering a variation cannot change completed mainline evidence.
  if (first && Object.hasOwn(bests[branch] || {}, "playedScore")
    && (!original || first.from !== original.from || first.to !== original.to
      || (first.promotion || "") !== (original.promotion || ""))) {
    bests[branch] = { ...bests[branch] };
    delete bests[branch].playedScore;
  }
  const state = {
    positions: [...S.positions.slice(0, branch + 1), ...nodes],
    evals: [...S.evals.slice(0, branch), ...v.positions.map(p => p.searchPreview ? whiteRel(p.searchPreview.score, p.fen) : p.eval)],
    bests,
    settings: S.settings, players: S.players, openingHeader: S.openingHeader,
    _sacCache: [...S._sacCache.slice(0, branch + 1), ...nodes.map(p => p._sac)],
    _forcedCache: [...S._forcedCache.slice(0, branch + 1), ...nodes.map(p => p._forced)],
    total: branch + nodes.length,
  };
  classifyLine(state);
  nodes.forEach((p, i) => {
    const ply = branch + i + 1;
    p.classif = state.classif[ply];
    p.moveGrade = state.moveGrades[ply];
    p._sac = state._sacCache[ply];
    p._forced = state._forcedCache[ply];
  });
}

function variationOpening() {
  const v = S.variation;
  let opening = S.openingHeader;
  const positions = [...S.positions.slice(0, v.branchIdx), ...v.positions.slice(0, v.idx + 1)];
  for (const pos of positions) {
    const bk = bookLookup(pos.fen);
    if (Array.isArray(bk) && bk[1]) opening = { eco: bk[0], name: bk[1] };
  }
  return opening;
}

// Sacrifice/forced are functions of the board only (not the eval), so they're cached per ply for
// the whole analysis — computeDerived runs many times while the batch fills in, and isSacrifice is
// the one non-trivial cost here. Caches are reset whenever a new game's positions are built.
function _sacAt(i, state = S) {
  if (state._sacCache[i] !== undefined) return state._sacCache[i];
  const p = state.positions[i];
  let v = false;
  if (p) v = isSacrifice({ before: state.positions[i - 1].fen, after: p.fen,
    prior: state.positions[i - 2]?.fen, color: p.color, captured: p.captured, from: p.from, promotion: p.promotion });
  state._sacCache[i] = v;
  return v;
}
function _forcedAt(i, state = S) {
  if (state._forcedCache[i] !== undefined) return state._forcedCache[i];
  let v = false;
  try { v = new Chess(state.positions[i - 1].fen).moves().length === 1; } catch {}
  state._forcedCache[i] = v;
  return v;
}
// Estimated ratings are reported in steps of 50, so we quantize to the NEAREST 50 (round-to-nearest
// keeps the average bias ~0; a ceiling would add a spurious ~+26 upward bias for nothing).
const round50 = (v) => Math.round(v / 50) * 50;
// Display rounding is separate from the full-precision published models.
function estimateElo(acc, rating, side = null) {
  side ||= ["w", "b"].find(color => Number(S.players[color]?.rating) === Number(rating));
  const value = S.calibrated?.[side]?.rating;
  return Number.isFinite(value) ? round50(Math.max(0, Math.min(5000, value))) : null;
}

function classifyLine(state) {
  const N = state.total;
  state.classif = new Array(N + 1).fill(null);
  state.accMove = new Array(N + 1).fill(null);
  state.moveGrades = new Array(N + 1).fill(null);
  state.annotationEvidence = new Array(N + 1).fill(null);
  if (!state._sacCache || state._sacCache.length !== N + 1) { state._sacCache = new Array(N + 1).fill(undefined); state._forcedCache = new Array(N + 1).fill(undefined); }

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
  state.bookCount = 0;
  let bookOpening = null;
  for (let i = 1; i <= N; i++) {
    const bk = bookLookup(state.positions[i].fen);
    if (Array.isArray(bk)) bookOpening = { eco: bk[0], name: bk[1] };
    bookAt[i] = bk !== undefined;

    const mover = state.positions[i].color;
    const bestSearch = state.bests[i - 1];

    const evidence = state.annotationEvidence[i] = annotationPair(i, state);
    if (evidence) {
      const playedUci = (state.positions[i].from || "") + (state.positions[i].to || "") + (state.positions[i].promotion || "");
      const winBefore = annotationPoints(evidence.best, i, state), winAfter = annotationPoints(evidence.played, i, state);
      if (winBefore != null && winAfter != null) wpDrop[i] = Math.max(0, winBefore - winAfter);
      const bestUci = bestSearch?.bestmove || "";
      isTop[i] = !!bestUci && bestUci === playedUci;
      loss[i] = (scoreToCp(evidence.best) - scoreToCp(evidence.played)) / 100;
    }
    std[i] = getStandardRating(wpDrop[i]);   // bucket on win%-drop, not raw pawns
    sac[i] = _sacAt(i, state);
  }
  // Second pass: final category per ply (Brilliant-Chess logic). A move stays unlabelled until both
  // its own and the previous position's eval are in, so the panel fills in cleanly during analysis.
  for (let i = 1; i <= N; i++) {
    if (!state.annotationEvidence[i] || wpDrop[i] == null) { state.classif[i] = null; continue; }
    // Some opening datasets include traps from the losing side. Never let theory
    // hide a losing mate or a move the engine rates as an error.
    const safeBook = bookAt[i] && !((decisionMate(i, "played", state.positions[i].color, state) ?? 0) < 0)
      && wpDrop[i] != null && wpDrop[i] < (CALIB?.clsWp?.inacc ?? 5);
    state.classif[i] = classifyMove(i, state.positions[i].color, isTop[i], safeBook, sac, std, loss, wpDrop, state);
    const root = state.bests[i - 1];
    const top = root?.lines?.find(l => l.multipv === 1), runnerUp = root?.lines?.find(l => l.multipv === 2);
    const criticalLoss = top && runnerUp ? Math.max(0, annotationPoints(top.score, i, state) - annotationPoints(runnerUp.score, i, state)) : null;
    state.moveGrades[i] = moveGrade(state.classif[i], wpDrop[i], CALIB?.clsWp, criticalLoss);
    if (state.classif[i] === "book") state.bookCount++;
  }
  // Opening name: prefer the book's clean name over the chess.com header's ECOUrl slug.
  state.opening = bookOpening || state.openingHeader;
}

function computeDerived() {
  classifyLine(S);
  const completedClasses = S.classif;
  // Provisional searches affect the visible annotation only. Keep completed
  // evaluations, accuracy/rating inputs and saved search results untouched.
  if (S.searchPreviews.some(Boolean)) {
    const preview = { ...S,
      evals: S.evals.map((e, i) => S.searchPreviews[i] ? whiteRel(S.searchPreviews[i].score, S.positions[i].fen) : e),
      bests: S.bests.map((b, i) => S.searchPreviews[i] || b),
      _sacCache: [...S._sacCache], _forcedCache: [...S._forcedCache],
    };
    classifyLine(preview);
    S.classif = preview.classif; S.moveGrades = preview.moveGrades;
  }
  const N = S.total;
  const eloAccs = sideAccuracies();
  for (const side of ["w", "b"]) {
    const counts = {}; QUALITY_ORDER.forEach((k) => (counts[k] = 0));
    for (let i = 1; i <= N; i++) {
      if (S.positions[i].color !== side) continue;
      const c = S.classif[i];
      if (c) counts[c]++;
    }
    S.acc[side] = eloAccs[side];
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
const sanLineCache = new Map();
function uciLineToSan(fen, uciMoves, maxPlies = 6) {
  const moves = uciMoves.slice(0, maxPlies);
  const key = JSON.stringify([fen, moves]);
  if (sanLineCache.has(key)) return [...sanLineCache.get(key)];
  const c = new Chess(fen); const out = [];
  let fm = parseInt(fen.split(" ")[5], 10) || 1;
  let white = fen.split(" ")[1] === "w";
  for (const u of moves) {
    let mv;
    try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined }); }
    catch { break; }
    if (!mv) break;
    out.push(white ? `${fm}. ${mv.san}` : mv.san);
    if (!white) fm++;
    white = !white;
  }
  // Formatting is independent of engine/scoring state. Bound the cache so
  // exploring many games cannot retain an unbounded number of variations.
  if (sanLineCache.size >= 128) sanLineCache.delete(sanLineCache.keys().next().value);
  sanLineCache.set(key, out);
  return [...out];
}

/* ===================================================================
   UI skeleton
   =================================================================== */
function buildUI() {
  const root = document.getElementById("root");
  root.replaceChildren();

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

  // The stage holds every module. In the automatic layout the side wrappers group the panels into
  // columns (styles.css picks wide / medium / narrow by window size); in the custom layout they are
  // display:contents, so each module is placed on the free canvas on its own.
  const canvas = el("div", { class: "stage auto", id: "canvas" },
    makeMod("evalbar", evalbarMount),
    makeMod("board", playerTop, boardWrap, playerBot),
    el("div", { class: "side" },
      makeMod("review", reviewMount),
      el("div", { class: "side-cols" },
        el("div", { class: "side-a" }, makeMod("moves", movesPanel), makeMod("graph", graphMount), makeMod("controls", controls)),
        el("div", { class: "side-b" }, makeMod("accuracy", statsMount), makeMod("engine", engineMount)),
      ),
      makeMod("coach", coachMount),
    ),
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

  root.append(el("div", { class: "app" }, topbar, canvas, settings, libRail,
    feedbackLink("feedback-floating", el("span", {}, "Feedback"))));

  UI = {
    meta: document.getElementById("meta"), settings, canvas, boardWrap,
    playerTop, playerBot, controls, coach: coachMount, evalbar: evalbarMount,
    review: reviewMount, movesBody, movesCount, movesFoot,
    graph: graphMount, stats: statsMount, engine: engineMount,
    libRail, libControls, libList, libCount,
  };

  applyLayoutMode();
  initBoardInput();
  renderCoachAvatar();     // mount the animated coach portrait for the active personality
  renderLibrary();
  window.addEventListener("resize", () => { fitEnginePanel(); growCanvas(); alignPlayers(); positionSettings(); });
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
  _saveLayoutT = setTimeout(() => browserAPI.storage.local.set({ layout: layoutForSave(), layoutMode: S.layoutMode, layoutVersion: LAYOUT_VERSION }), 250);
}
// "auto" = the responsive layout in styles.css, which fits any window. "custom" = the free canvas the
// user arranged in Reorganize mode, placed from S.layout and zoomed to fit the window.
const isCustomLayout = () => S.layoutMode === "custom";
function applyLayoutMode() {
  const custom = isCustomLayout();
  UI.canvas.classList.toggle("auto", !custom);
  UI.canvas.classList.toggle("canvas", custom);
  if (custom) UI.canvas.classList.remove("desktop-layout");
  applyLayout(); growCanvas();
}
function applyLayout() {
  const custom = isCustomLayout();
  const desktop = !custom && UI.canvas.classList.contains("desktop-layout");
  const collapse = desktop && !S.qbreakExpanded ? accuracyReflowInfo(DEFAULT_LAYOUT) : null;
  for (const mod of UI.canvas.querySelectorAll(".mod")) {
    const key = mod.getAttribute("data-mod");
    const source = custom ? S.layout[key] : desktop ? DEFAULT_LAYOUT[key] : null;
    const b = source && { ...source };
    if (b && collapse) {
      if (key === "accuracy") b.h = Math.max(MINH, b.h - collapse.delta);
      if (collapse.belowKeys.includes(key)) b.y = Math.max(0, b.y - collapse.delta);
    }
    mod.style.left = b ? b.x + "px" : ""; mod.style.top = b ? b.y + "px" : "";
    mod.style.width = b ? b.w + "px" : ""; mod.style.height = b ? b.h + "px" : "";
  }
  fitEnginePanel();
  requestAnimationFrame(positionSettings);
}
// Freeze the automatic layout into free-canvas boxes, so Reorganize starts from exactly what is on
// screen. Hidden modules (eval bar or coach switched off) keep their default box.
function snapshotLayout() {
  const base = UI.canvas.getBoundingClientRect();
  const out = structuredClone(DEFAULT_LAYOUT);
  const desktop = UI.canvas.classList.contains("desktop-layout");
  for (const mod of UI.canvas.querySelectorAll(".mod")) {
    if (desktop) {
      // These boxes already have exact geometry, including the collapsed Accuracy panel.
      // Measuring at browser zoom can turn 294px into 293.993px; snapping down then
      // shrinks the panel by 2px and introduces scrollbars when Reorganize is opened.
      out[mod.getAttribute("data-mod")] = {
        x: parseFloat(mod.style.left), y: parseFloat(mod.style.top),
        w: parseFloat(mod.style.width), h: parseFloat(mod.style.height),
      };
      continue;
    }
    const r = mod.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // Round DOWN to the grid, so the canvas never needs more room than the screen it came from.
    const down = (v) => Math.floor(v / GRID) * GRID;
    out[mod.getAttribute("data-mod")] = { x: down(r.left - base.left), y: down(r.top - base.top), w: down(r.width), h: down(r.height) };
  }
  return out;
}
// Space kept right of and below layouts extending beyond the default desktop envelope.
const CANVAS_MARGIN = 12;
// Right and bottom edge of a module layout (px), floored at 600 so a near-empty canvas keeps a sane size.
function layoutExtent(layout) {
  let maxB = 600, maxR = 600;
  for (const b of Object.values(layout)) { maxB = Math.max(maxB, b.y + b.h); maxR = Math.max(maxR, b.x + b.w); }
  return { maxR, maxB };
}
function growCanvas() {
  if (!isCustomLayout()) { UI.canvas.style.minHeight = ""; UI.canvas.style.minWidth = ""; return; }
  const { pageW, pageH } = layoutPageSize(S.layout);
  UI.canvas.style.minHeight = pageH - TOPBAR_H + "px";
  UI.canvas.style.minWidth = pageW + "px";
}
// What collapsing the accuracy breakdown is worth on the canvas: the hidden rows' height (+ the
// column row-gap), and every module in the same column sitting at/below the accuracy panel.
function accuracyReflowInfo(layout = S.layout) {
  const accMod = UI.canvas.querySelector('.mod[data-mod="accuracy"]');
  const acc = layout.accuracy;
  const row = accMod && accMod.querySelector(".qbreak-row");
  const qb = accMod && accMod.querySelector(".qbreak");
  const gap = qb ? (parseFloat(getComputedStyle(qb).rowGap) || 0) : 0;
  const rowH = row ? row.offsetHeight : 24;
  const delta = Math.round((QBREAK_FULL.length - QBREAK_SUMMARY.length) * (rowH + gap));
  const belowKeys = [];
  for (const [k, o] of Object.entries(layout)) {
    if (k === "accuracy") continue;
    const overlapX = o.x < acc.x + acc.w && o.x + o.w > acc.x;
    if (overlapX && o.y >= acc.y + acc.h - 1) belowKeys.push(k);
  }
  return { delta, belowKeys };
}
// Keep the Accuracy module and everything stacked below it glued together when the category list
// expands/collapses on the custom canvas (the automatic layout reflows on its own). The saved
// layout is sized for the EXPANDED list, so that's the baseline: collapsing SHRINKS the module by
// the hidden rows' height and pulls every module below it up by the same amount (constant gap);
// expanding restores it. Not persisted, so the saved baseline stays the expanded one.
function reflowAccuracy(expanded) {
  if (!UI.canvas || !isCustomLayout()) return;
  const acc = S.layout.accuracy; if (!acc) return;
  if (!expanded && !S._accReflow) {
    const { delta, belowKeys } = accuracyReflowInfo();
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
      if (key === "engine") fitEnginePanel();
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
// Back to the automatic layout and its window-dependent fit.
function resetLayout() {
  S._accReflow = null;   // drop any collapse offset so the fresh layout isn't double-adjusted
  S.layout = structuredClone(DEFAULT_LAYOUT);
  S.layoutMode = "auto";
  if (S.reorganize) toggleReorganize();
  applyLayoutMode();
  saveLayout();
  requestAnimationFrame(alignPlayers);
  return initTabZoom();
}
// Reorganize mode: while ON, panels can be dragged/resized (handles + grips appear); while OFF
// they're locked and hover shows nothing. The arranged layout auto-saves and persists. Entering it
// from the automatic layout freezes what is on screen into a custom canvas first.
function toggleReorganize() {
  if (!S.reorganize && !isCustomLayout()) {
    S.layout = snapshotLayout();
    // The snapshot holds the breakdown as it is shown; record the collapse offset so the saved
    // baseline is the expanded one, like every other canvas layout (see layoutForSave()).
    S._accReflow = S.qbreakExpanded ? null : accuracyReflowInfo();
    S.layoutMode = "custom";
    applyLayoutMode();
    saveLayout();
    // The snapshot already fits at the current zoom. Refitting here would change
    // every panel's apparent size just for unlocking its drag handles.
  }
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
function makeBoardBadge(cls, score = null) {
  return gradeBadge(cls, score, "sq-badge", {
    tabindex: "0",
    onkeydown: (e) => { if (e.key === "Escape") hideBoardBadgeTip(); },
  });
}
let boardBadgeTipTarget = null;
let boardBadgeTipTimer = null, boardBadgeTipEndTimer = null, boardBadgeTipRequest = 0;
let boardBadgeLabelKey = null;
const categoryLabelImages = new Map();
// Shared by the board and settings previews, so a preview is the actual design.
// Text nodes also let every new style support renamed categories without artwork generation.
function categoryLabelArtwork(cls, style) {
  const name = categoryName(cls);
  if (style === "original") {
    const img = el("img", { alt: "", draggable: "false" });
    const source = categoryLabelSource(cls);
    if (typeof source === "string") img.src = source;
    else source.then(src => { img.src = src; }).catch(() => { img.alt = name; });
    return img;
  }
  return el("span", { class: "category-label category-label--" + style,
    style: { "--label-color": QUALITY[cls].color }, "aria-hidden": "true" },
    style === "soft" ? null : el("span", { class: "category-label-mark" }),
    el("span", { class: "category-label-name" }, name));
}
function categoryLabelSource(cls) {
  const name = categoryName(cls);
  if (name === QUALITY[cls].name) return _url(`icons/labels/${cls}.png`);
  const key = JSON.stringify([cls, name]);
  if (!categoryLabelImages.has(key)) {
    const ready = document.fonts?.load(CATEGORY_LABEL_FONT, name) || Promise.resolve();
    categoryLabelImages.set(key, ready.then(() => categoryLabelPng(document, name, MOVE_GRADE_CONFIG[cls].color)));
    // Bound artwork retained after repeated renames.
    if (categoryLabelImages.size > 32) categoryLabelImages.delete(categoryLabelImages.keys().next().value);
  }
  return categoryLabelImages.get(key);
}
function positionBoardBadgeTip() {
  const tip = document.getElementById("boardBadgeTip"), target = boardBadgeTipTarget;
  if (!tip || !target?.isConnected) { hideBoardBadgeTip(); return; }
  const r = target.getBoundingClientRect();
  // Original artwork needs room for its overshoot; the new styles have a quiet slide.
  const w = tip.offsetWidth, h = tip.offsetHeight;
  const original = tip.dataset.style === "original", gap = original ? 2 : 8, margin = original ? 20 : 12;
  const left = Math.max(margin, Math.min(window.innerWidth - w - margin, r.left + r.width / 2 - w / 2));
  const above = r.top - h - gap;
  const top = Math.max(margin, Math.min(window.innerHeight - h - margin, above >= margin ? above : r.bottom + gap));
  tip.style.left = left + "px"; tip.style.top = top + "px";
}
function showBoardBadgeTip(target, cls) {
  const style = badgeLabelStyle();
  if (style === "off" || !QUALITY[cls] || !target.isConnected) return;
  hideBoardBadgeTip();
  const request = boardBadgeTipRequest;
  boardBadgeTipTarget = target;
  let tip = document.getElementById("boardBadgeTip");
  if (!tip) {
    tip = el("div", { id: "boardBadgeTip", class: "board-badge-tip", role: "img", "aria-hidden": "true" });
    document.body.append(tip);
    window.addEventListener("resize", positionBoardBadgeTip);
    window.addEventListener("scroll", positionBoardBadgeTip, true);
    window.addEventListener("blur", hideBoardBadgeTip);
  }
  tip.dataset.style = style;
  tip.setAttribute("aria-label", categoryName(cls));
  const reveal = () => {
    if (request !== boardBadgeTipRequest || !boardBadgeTipTarget?.isConnected || badgeLabelStyle() !== style) return;
    positionBoardBadgeTip();
    // Restart the entrance animation when the next move uses the same category.
    void tip.offsetWidth;
    tip.setAttribute("aria-hidden", "false"); tip.classList.add("show");
    boardBadgeTipTimer = setTimeout(() => {
      tip.classList.remove("show"); tip.classList.add("leaving");
    }, 1800);
    boardBadgeTipEndTimer = setTimeout(hideBoardBadgeTip, 2000);
  };
  if (style !== "original") {
    tip.replaceChildren(categoryLabelArtwork(cls, style));
    reveal();
    // Local fonts can finish loading after first paint. Re-anchor without restarting the timer.
    document.fonts?.ready.then(() => { if (request === boardBadgeTipRequest) positionBoardBadgeTip(); });
    return;
  }
  const img = el("img", { alt: "", draggable: "false", width: 280, height: 60 });
  tip.replaceChildren(img);
  img.onload = reveal;
  img.onerror = () => { if (request === boardBadgeTipRequest) hideBoardBadgeTip(); };
  const source = categoryLabelSource(cls);
  if (typeof source === "string") img.src = source;
  else source.then(src => { if (request === boardBadgeTipRequest) img.src = src; }).catch(() => {
    if (request === boardBadgeTipRequest) hideBoardBadgeTip();
  });
}
function hideBoardBadgeTip() {
  boardBadgeTipRequest++;
  clearTimeout(boardBadgeTipTimer); clearTimeout(boardBadgeTipEndTimer);
  boardBadgeTipTimer = boardBadgeTipEndTimer = null;
  boardBadgeTipTarget = null;
  const tip = document.getElementById("boardBadgeTip");
  if (tip) { tip.classList.remove("show", "leaving"); tip.setAttribute("aria-hidden", "true"); }
}
function syncBoardBadgeLabel(force = false) {
  const badge = UI.boardWrap.querySelector(".sq-badge");
  const cls = badge?.dataset.category;
  const key = badge ? JSON.stringify([S.analysisMode, S.idx, S.variation?.branchIdx, S.variation?.idx,
    badge.dataset.move, cls, categoryName(cls), badgeLabelStyle()]) : null;
  if (badgeLabelStyle() === "off" || !cls) { hideBoardBadgeTip(); boardBadgeLabelKey = null; return; }
  if (!force && key === boardBadgeLabelKey) {
    // Rebuilding or flipping the board must keep a live label attached to its badge.
    if (boardBadgeTipTarget && boardBadgeTipTarget !== badge) boardBadgeTipTarget = badge;
    if (boardBadgeTipTarget) positionBoardBadgeTip();
    return;
  }
  boardBadgeLabelKey = key;
  showBoardBadgeTip(badge, cls);
}
function makePiece(type, side) {
  // Only the two bundled SVG sets remain (Cburnett = "image", Merida); anything else → default set.
  const setFolder = BUNDLED_PIECE_SETS[S.settings.pieceStyle] || BUNDLED_PIECE_SETS.image;
  const code = (side === "w" ? "w" : "b") + type.toUpperCase(); // wK, bN …
  return el("img", { class: "piece-img", "data-piece": code, "data-set": setFolder,
    src: _url(`pieces-img/${setFolder}/${code}.svg`), alt: "", draggable: "false" });
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
  clearBoardArt(board);
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
  // Get classification for the current position (mainline or variation)
  let cls = null;
  if (showCat) {
    if (S.analysisMode && S.variation && S.variation.idx > 0) {
      // In analysis mode with variation: use the variation position's classification
      cls = pos.classif || null;
    } else if (!S.analysisMode) {
      // Mainline: use the mainline classification
      cls = S.classif[S.idx] || null;
    }
  }
  // The from/to squares are tinted with the classification color at 0.5 alpha;
  // without a classification we fall back to the neutral yellow highlight.
  const tint = cls && QUALITY[cls]
    ? `color-mix(in srgb, ${QUALITY[cls].color} 50%, transparent)`
    : null;
  const set = BUNDLED_PIECE_SETS[S.settings.pieceStyle] || BUNDLED_PIECE_SETS.image;
  for (const [name, sq] of Object.entries(sqByName)) {
    const oldBadge = sq.querySelector(".sq-badge");
    const keepBadge = oldBadge && name === pos.to && cls && oldBadge.dataset.category === cls
      && oldBadge.dataset.move === pos.fen;
    const ch = occ[name];
    const code = ch ? (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase() : null;
    // Progress updates must not replace unchanged images mid-animation.
    let keepPiece = null;
    for (const piece of sq.querySelectorAll(".piece, .piece-svg, .piece-img")) {
      if (!keepPiece && code && piece.dataset.piece === code && piece.dataset.set === set) keepPiece = piece;
      else piece.remove();
    }
    if (oldBadge && !keepBadge) oldBadge.remove();
    const isHl = hl.has(name);
    sq.classList.toggle("hl", isHl);
    sq.classList.toggle("has-badge", name === pos.to && !!(cls && QUALITY[cls]));
    if (isHl && tint) sq.style.setProperty("--hl-color", tint);
    else sq.style.removeProperty("--hl-color");
    if (ch && !keepPiece) sq.append(makePiece(ch.toUpperCase(), ch === ch.toUpperCase() ? "w" : "b"));
    if (name === pos.to && cls && QUALITY[cls]) {
      if (keepBadge) updateGradeBadge(oldBadge, cls, activeMoveGrade());
      else {
        const badge = makeBoardBadge(cls, activeMoveGrade());
        badge.dataset.category = cls; badge.dataset.move = pos.fen;
        sq.append(badge);
      }
    }
  }
  syncBoardBadgeLabel();
  renderBestArrow();
  renderUserArrows();
  renderThreatArrow();
  renderUserMarks();
  renderSelection();
  renderPracticeHint();
}

/* ---------------- Best-move arrow ----------------
   Coordinate space: an 8×8 SVG over the board. The arrow starts near the outgoing
   edge of its origin square so its tail does not cover the piece. Respects S.flipped. */
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
  // Move the tail toward the first leg's exit edge. On a straight arrow this
  // follows the move; on a knight arrow it follows the long leg to its elbow.
  const firstDx = pts[1].x - pts[0].x, firstDy = pts[1].y - pts[0].y;
  const firstMax = Math.max(Math.abs(firstDx), Math.abs(firstDy)) || 1;
  shaft[0] = { x: pts[0].x + firstDx / firstMax * 0.4,
               y: pts[0].y + firstDy / firstMax * 0.4 };
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
  const arrowColor = /^#[0-9a-f]{6}$/i.test(S.settings.bestArrowColor || "")
    ? S.settings.bestArrowColor : ARROW_COLOR;
  svg.replaceChildren(arrowNode(shaft, head, arrowColor));
}

// Keep saved arrow settings in attributes, never interpolate them into markup.
function arrowNode(shaft, head, color) {
  const node = (tag, attrs) => {
    const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) n.setAttribute(key, String(value));
    return n;
  };
  const group = node("g", { fill: color, opacity: S.settings.arrowOpacity });
  group.append(
    node("polyline", { points: shaft.map(arrowFmt).join(" "), fill: "none", stroke: color,
      "stroke-width": S.settings.arrowShaft, "stroke-linejoin": "round", "stroke-linecap": "butt" }),
    node("polygon", { points: head.map(arrowFmt).join(" "), stroke: "none" }),
  );
  return group;
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
  svg.replaceChildren(...arrows.map((ar) => {
    const a = arrowXY(ar.from), b = arrowXY(ar.to);
    const { shaft, head } = arrowBuild(arrowWaypoints(a, b), headLen, headHalf);
    return arrowNode(shaft, head, USER_ARROW_COLOR);
  }));
}
function refreshArrows() { renderBestArrow(); renderUserArrows(); renderThreatArrow(); }
// Create a ready Engine, trying the user's chosen build and then the other bundled build
// if it can't load. Every build is bundled, so a fallback never
// needs the network. The build that actually started is recorded in S.activeEngineBuild so the
// Engine tab reflects what's really running — essential if e.g. NNUE ever stops working. `opts` are
// the UCI options (Hash / Skill Level); applying them also awaits the handshake, which now REJECTS
// on a dead build (timeout / worker error) instead of hanging forever.
let _engineFellBack = false; // warn once per page if we ever leave the preferred build
async function createEngine(opts = {}) {
  const preferred = ENGINE_BUILDS[S.settings.enginePath] ? S.settings.enginePath : DEFAULT_SETTINGS.enginePath;
  const order = [preferred, ...ENGINE_FALLBACK_ORDER.filter(key => key !== preferred)];
  let lastErr = null;
  for (const key of order) {
    const eng = new Engine(ENGINE_BUILDS[key]);
    try {
      await eng.setOptions(opts); // awaits the handshake; throws if this build failed to load
      eng.buildKey = key;
      if (S.settings.enginePath === preferred) {
        if (key !== preferred) S.engineFallbackBuild = key;
        setActiveEngineBuild(key);
      }
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
  if (S.activeEngineBuild === key && !S.engineFallbackBuild) return;
  S.activeEngineBuild = key;
  try { renderEngineCurrent(); } catch {}
  if (UI.settings && !UI.settings.hidden && S.settingsTab === "engine") { try { renderSettings(); } catch {} }
}
// The build name to display: what's actually running if known, else the user's selection.
function activeEngineName() {
  const key = S.engineFallbackBuild || S.activeEngineBuild || S.settings.enginePath;
  const name = ENGINE_NAME[key] || "Stockfish";
  // Flag a fallback explicitly so it's obvious the chosen build isn't the one in use.
  return (S.engineFallbackBuild && S.engineFallbackBuild !== S.settings.enginePath) ? `${name} (fallback)` : name;
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
  const history = activeSearchHistory(), historyKey = JSON.stringify(history), cacheKey = fen + historyKey;
  let uci = S.threatCache.get(cacheKey);
  if (uci === undefined) {
    const token = ++_threatToken;
    let eng; try { eng = await getHelperEngine(); } catch { return; }
    if (token !== _threatToken) return;
    eng.stop();
    const targetFen = threatFen(fen);
    let res; try { res = await eng.analyse(targetFen, Math.min(14, S.settings.engineDepth), 1, targetFen === fen ? history : null); } catch { return; }
    if (token !== _threatToken) return;
    uci = res && res.bestmove ? res.bestmove : null;
    S.threatCache.set(cacheKey, uci);
    if (activePos().fen !== fen || JSON.stringify(activeSearchHistory()) !== historyKey) return;
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
  svg.replaceChildren(arrowNode(shaft, head, USER_ARROW_COLOR));
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
  const node = { fen: c.fen(), san: mv.san, from: mv.from, to: mv.to, color: mv.color, promotion: mv.promotion || "", captured: mv.captured || "", eval: null, best: null };
  if (!S.analysisMode) {
    // On the mainline (and only if the position is analyzed): if the move matches the next
    // mainline move, just stay on the mainline.
    const nextMain = S.positions[S.idx + 1];
    const reachable = !S.analyzing || S.idx < S.progress;
    if (reachable && nextMain && nextMain.from === from && nextMain.to === to) {
      S.selectedSq = null; go(S.idx + 1); return;
    }
    S.variation = { 
      branchIdx: S.idx, 
      positions: [{ 
        fen: S.positions[S.idx].fen, 
        san: null, 
        eval: S.evals[S.idx] || null, 
        best: S.bests[S.idx] || null 
      }, node], 
      idx: 1 
    };
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
    const currentPos = activePos();
    const currentIdx = S.analysisMode && S.variation ? S.variation.idx : S.idx;
    const isMainline = !S.analysisMode;
    S.variation = { 
      branchIdx: isMainline ? S.idx : S.variation.branchIdx, 
      positions: [{ 
        fen: currentPos.fen, 
        san: null, 
        eval: isMainline ? (S.evals[S.idx] || null) : (currentPos.eval || null),
        best: isMainline ? (S.bests[S.idx] || null) : (currentPos.best || null)
      }], 
      idx: 0 
    };
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
    v.positions.push({ fen: c.fen(), san: mv.san, from: mv.from, to: mv.to, color: mv.color, promotion: mv.promotion || "", captured: mv.captured || "", eval: null, best: null });
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
    const currentPos = activePos();
    const isMainline = true;
    S.variation = { 
      branchIdx: S.idx, 
      positions: [{ 
        fen: currentPos.fen, 
        san: null, 
        eval: isMainline ? (S.evals[S.idx] || null) : (currentPos.eval || null),
        best: isMainline ? (S.bests[S.idx] || null) : (currentPos.best || null)
      }], 
      idx: 0 
    };
    S.analysisMode = true;
  } else {
    S.variation.positions = S.variation.positions.slice(0, S.variation.idx + 1); // play out from here
  }
  S.selectedSq = null;
  const token = ++S.bestWalkToken;
  S.bestWalking = true;
  paintBoard(); renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
  for (let n = 0; n < BEST_WALK_MAX; n++) {
    if (token !== S.bestWalkToken || !S.analysisMode || !S.variation) return;
    const v = S.variation;
    const pos = v.positions[v.idx];
    await requestLiveEval();
    if (token !== S.bestWalkToken || !S.analysisMode || S.variation !== v) return;
    if (S.liveError || variationTerminal(v, v.idx) || !pos.best) break;
    renderEvalBar(); renderBestArrow(); renderEngineCurrent();
    const uci = (pos.best.bestmove || "");
    if (uci.length < 4) break;                          // no legal move → done
    await sleep(BEST_WALK_MS);                          // let the user see the suggested move
    if (token !== S.bestWalkToken || !S.analysisMode || !S.variation) return;
    // Play the best move.
    let c, mv;
    try { c = new Chess(pos.fen); mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || "q" }); } catch { mv = null; }
    if (!mv) break;
    v.positions.push({ fen: c.fen(), san: mv.san, from: mv.from, to: mv.to, color: mv.color, promotion: mv.promotion || "", captured: mv.captured || "", eval: null, best: null });
    v.idx = v.positions.length - 1;
    playSanSound(mv.san);
    paintBoard(); renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
    // Classify the move that was just played
    await requestLiveEval();
  }
  if (token === S.bestWalkToken) { S.bestWalking = false; renderControls(); renderEngineCurrent(); }
}
// Live analysis of the current variation position (its own engine instance, so the batch isn't disturbed).
async function requestLiveEval() {
  const token = ++S.liveToken; // navigation always invalidates pending work, even on cache hits
  if (!S.analysisMode || !S.variation) return;
  const v = S.variation, idx = v.idx, pos = v.positions[idx];
  const valid = () => token === S.liveToken && S.analysisMode && S.variation === v
    && v.idx === idx && v.positions[idx] === pos;
  for (const node of v.positions) node.searchPreview = null;
  S.liveError = null;
  S.liveEngine?.cancelPending();
  S.liveEngine?.stop();
  refreshVariation();
  try {
    // The classifier looks back up to three moves, requiring four prior positions.
    const missing = [];
    for (let i = idx; i >= Math.max(0, idx - 4); i--) {
      if (!v.positions[i].best || !v.positions[i].eval) missing.push(i);
    }
    if (!missing.length) return;
    const eng = await ensureLiveEngine();
    if (!valid()) return;
    for (const i of missing) {
      const node = v.positions[i];
      const terminal = variationTerminal(v, i);
      const res = terminal ? { score: terminal, bestmove: null, pv: "", lines: [] }
        : await eng.analyse(node.fen, S.settings.engineDepth, S.settings.engineLines, variationSearchHistory(v, i), preview => {
          if (!valid()) return;
          node.searchPreview = preview; node.searchPreviewToken = token;
          refreshVariation();
        });
      if (!valid()) return;
      node.eval = terminal || whiteRel(res.score, node.fen);
      node.best = res;
      node.searchPreview = null;
      refreshVariation();
    }
  } catch (e) {
    if (!valid()) return;
    S.liveError = "Stockfish stopped before this position was ready.";
    if (S.liveEngine?.dead) { S.liveEngine.terminate(); S.liveEngine = null; }
    refreshVariation();
  } finally {
    for (const node of v.positions) {
      if (node.searchPreviewToken === token) node.searchPreview = null;
    }
    if (valid()) refreshVariation();
  }
}

function refreshVariation() {
  if (!S.analysisMode || !S.variation) return;
  classifyVariationMoves();
  paintBoard(); renderEvalBar(); renderMoves(); renderPlayers(); renderControls();
  renderReview(); renderStats(); renderEngineCurrent();
}

function invalidateVariationEvals() {
  if (!S.variation) return;
  for (const p of S.variation.positions) { p.eval = null; p.best = null; p.classif = null; p.moveGrade = null; p.searchPreview = null; }
}

function resetLiveEngine() {
  S.liveToken++; S.panelToken++; S.liveEngineGeneration++;
  S.liveEngine?.terminate();
  S.liveEngine = null; S.liveEnginePromise = null; S.liveError = null;
}

async function ensureLiveEngine() {
  if (S.liveEngine && !S.liveEngine.dead) return S.liveEngine;
  if (!S.liveEnginePromise) {
    const generation = S.liveEngineGeneration;
    const pending = createEngine({ Hash: S.settings.engineHash, "Skill Level": S.settings.engineSkill })
      .then(eng => {
        if (generation !== S.liveEngineGeneration) { eng.terminate(); throw new Error("Analysis cancelled"); }
        S.liveEngine = eng;
        return eng;
      });
    S.liveEnginePromise = pending;
    pending.finally(() => { if (S.liveEnginePromise === pending) S.liveEnginePromise = null; }).catch(() => {});
  }
  return S.liveEnginePromise;
}

function variationTerminal(v, idx) {
  // Preserve repetition history rather than asking a fresh board about a single FEN.
  const chess = new Chess(S.positions[0].fen);
  const positions = [...S.positions.slice(1, v.branchIdx + 1), ...v.positions.slice(1, idx + 1)];
  for (const p of positions) chess.move({ from: p.from, to: p.to, promotion: p.promotion || undefined });
  if (chess.isCheckmate()) return { mate: chess.turn() === "w" ? -1 : 1 };
  return chess.isDraw() ? { cp: 0 } : null;
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
  if (UI.canvas) UI.canvas.classList.toggle("no-evalbar", !show);   // the automatic layout drops its column
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
  // Captured pieces sit on a rounded backing tray that gives the dark icons a legible backdrop
  // (black pieces vanished against the dark board). The tray's tone CONTRASTS its pieces — a light
  // tray under captured black pieces, a dark tray under captured white ones — and it hugs the row,
  // growing as more pieces come off the board. The captured row is ALWAYS rendered (even empty) so
  // the name above it keeps its place whether or not anything has been captured yet.
  const capTone = side === "w" ? "light" : "dark"; // white captures black pieces → light tray
  const captured = el("div", { class: "captured" },
    el("div", { class: "cap-tray cap-tray-" + capTone + (caps.length ? "" : " is-empty") },
      ...caps.map((code) => el("img", { class: "cap-pc", src: _url(`pieces-img/cburnett/${code}.svg`), alt: "" }))),
    advText ? el("span", { class: "adv" }, advText) : null);
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
    const status = p.rolling ? "Rolling to your misstep…"
      : p.demoing ? "Replaying your move…"
      : p.busy ? "Checking…"
      : p.solving ? "Find a stronger move" : "✓ Correct!";
    UI.controls.replaceChildren(
      el("span", { class: "pos practice-pos" }, `Practice ${cur}/${p.spots.length}`),
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
  const o = (S.analysisMode && S.variation ? variationOpening() : S.opening);
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
    const res = await fetch(browserAPI.runtime.getURL("data/coaches/" + id + ".json"));
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
  await browserAPI.storage.local.set({ settings: S.settings });
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
  await browserAPI.storage.local.set({ settings: S.settings });
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
  UI.canvas.classList.toggle("has-coach", !!rig);   // the insight text leaves room for the portrait
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
    src: browserAPI.runtime.getURL(COACH_RIG_DIR + rig),
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
  return text.split(/(\{\w+\})/g).map(part => {
    const token = /^\{(\w+)\}$/.exec(part);
    if (!token) return categoryText(part);
    const k = token[1];
    return (tok && tok[k] != null && tok[k] !== "") ? tok[k] : part;
  }).join("");
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
    label: q ? categoryName(cls) : "",
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
function analysisProgressText() {
  // The initial position is searched too, but is not a played ply; keep the displayed
  // denominator aligned with the game's move count.
  const done = Math.min(S.total, S.completed == null ? S.progress : S.completed);
  return `Analyzing … ${done}/${S.total}`;
}
function renderReview() {
  refreshConcepts();
  // In-place progress text during analysis (so the loader animation doesn't restart each move).
  if (S.analyzing && revRefs) { revRefs.head.textContent = analysisProgressText(); return; }

  const panel = el("div", { class: "panel insight-panel" }, openingStrip());

  if (S.analyzing) {
    const headEl = el("span", {}, analysisProgressText());
    panel.append(el("div", { class: "ip-body" }, el("div", { class: "ip-analyzing" }, loaderNode("", "var(--accent)"), headEl)));
    revRefs = { head: headEl };
    UI.review.replaceChildren(panel);
    return;
  }
  revRefs = null;

  if (S.analysisError) {
    _ipSig = null;
    panel.append(el("div", { class: "ip-body" },
      el("div", { class: "ip-head" }),
      el("div", { class: "ip-text" }, `Analysis stopped early: ${S.analysisError}`),
      el("button", { class: "engine-bestwalk", onclick: () => startAnalysis() }, "Retry analysis"),
    ));
    UI.review.replaceChildren(panel);
    return;
  }

  if (S.practice) { _ipSig = null; panel.append(renderPracticeCoach()); UI.review.replaceChildren(panel); return; }

  if (S.analysisMode && S.variation) {
    _ipSig = null;
    if (S.liveError) {
      panel.append(el("div", { class: "ip-body" },
        el("div", { class: "ip-text" }, S.liveError),
        el("button", { class: "engine-bestwalk", onclick: () => requestLiveEval() }, "Retry analysis")));
      UI.review.replaceChildren(panel);
      return;
    }
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
  if (cfg) head.append(gradeBadge(cls, S.moveGrades[S.idx], "ip-badge"));
  // Special coach phrasing can omit the category, so name it beside the move.
  const sanDisplay = !S.settings.coachPlain && cfg ? `${san} ${categoryName(cls)}` : san;
  head.append(el("span", { class: "ip-move" }, sanDisplay));
  if (evTxt) head.append(el("span", { class: "ip-eval " + (evCp >= 0 ? "pos" : "neg") }, evTxt));
  body.append(head);

  // Pick the line once per (ply + coach): a fresh signature → choose + type; otherwise reuse the
  // shown text (so unrelated re-renders don't re-pick or re-animate, and a coach switch re-types).
  const sig = "m:" + S.idx + ":" + (S.settings.coach || "") + ":" + (cls || "");
  const fresh = sig !== _ipSig;
  if (fresh) {
    let sentence = S.coach ? coachMoveSentence(S.idx) : null;
    if (sentence == null) {   // legacy generic line
      sentence = (cfg && COMMENT_PHRASE[cls]) ? categoryText(COMMENT_PHRASE[cls](san)) : `${san}.`;
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
  const label = (badCls && QUALITY[badCls]) ? categoryName(badCls) : "weak move";
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
      gradeBadge(cls, null, "q-tip-ic", {}, true),
      el("span", { class: "q-tip-nm", style: { color: cfg.color } }, categoryName(cls))),
    el("div", { class: "q-tip-body" }, categoryText(QUALITY_DESC[cls] || "")),
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
// Clicking a count in the accuracy breakdown jumps to that player's FIRST move of that category
// (e.g. your first Blunder). A category with a 0 count finds no ply and does nothing — so clicking
// the opponent's "0 blunders" is a harmless no-op, exactly as expected.
function firstPlyForCategory(side, k) {
  for (let i = 1; i <= S.total; i++) {
    const pos = S.positions[i];
    if (pos && pos.color === side && S.classif[i] === k) return i;
  }
  return -1;
}
function jumpToCategory(side, k) {
  const ply = firstPlyForCategory(side, k);
  if (ply > 0) gotoMainline(ply);
}
function setCategoryName(cls, value) {
  const name = cleanCategoryName(value);
  const names = { ...S.settings.categoryNames };
  if (!name || name === QUALITY[cls].name) delete names[cls];
  else names[cls] = name;
  S.settings.categoryNames = names;
  browserAPI.storage.local.set({ settings: S.settings });
  hideQTip(); hideBoardBadgeTip();
  _movesSig = null; _ipSig = null;
  if (S.practice) { S.practice.coachLine = null; S.practice.coachTyped = false; }
  UI.stats.querySelectorAll("[data-category]").forEach(label => {
    label.replaceWith(categoryLabel(label.dataset.category));
  });
  renderMoves(); buildBoard(); renderReview();
}
function categoryLabel(cls) {
  const label = el("button", {
    type: "button", class: "qlabel", "data-category": cls,
    "aria-label": "Rename " + categoryName(cls),
    onmouseenter: e => showQTip(e.currentTarget, cls), onmouseleave: hideQTip,
    onfocus: e => showQTip(e.currentTarget, cls), onblur: hideQTip,
    onclick: () => {
      hideQTip();
      let finished = false;
      const finish = (save, value = input.value, focus = false) => {
        if (finished) return;
        finished = true;
        if (save) setCategoryName(cls, value);
        else editor.replaceWith(categoryLabel(cls));
        if (focus) UI.stats.querySelector('[data-category="' + cls + '"]')?.focus();
      };
      const input = el("input", {
        class: "category-name-input", type: "text", maxlength: CATEGORY_NAME_LIMIT,
        value: categoryName(cls), "aria-label": "Name for " + QUALITY[cls].name,
        onkeydown: e => {
          e.stopPropagation();
          if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); finish(e.key === "Enter", input.value, true); }
        },
      });
      const editor = el("div", {
        class: "qlabel category-name-editor", "data-category": cls,
        onfocusout: e => { if (!editor.contains(e.relatedTarget)) finish(true); },
        onkeydown: e => { e.stopPropagation(); if (e.key === "Escape") { e.preventDefault(); finish(false, input.value, true); } },
      }, input,
        el("button", {
          type: "button", class: "category-name-reset", title: "Restore default name",
          "aria-label": "Restore " + QUALITY[cls].name,
          onpointerdown: e => e.preventDefault(), onmousedown: e => e.preventDefault(),
          onclick: () => finish(true, "", true),
        }, "↺"));
      label.replaceWith(editor); input.focus(); input.select();
    },
  }, gradeBadge(cls, null, "qsym", {}, true),
  el("span", { class: "nm" }, categoryName(cls)));
  return label;
}
function renderStats() {
  const opSide = S.meSide === "w" ? "b" : "w";
  const meAcc = S.acc[S.meSide], opAcc = S.acc[opSide];
  const meRating = S.players[S.meSide]?.rating, opRating = S.players[opSide]?.rating;
  const meEloAcc = S.accElo[S.meSide], opEloAcc = S.accElo[opSide];
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
    const cMe = S.counts[S.meSide][k] || 0, cOp = S.counts[opSide][k] || 0;
    const meCt = el("span", { class: "ct left " + (cMe ? "" : "zero"), onclick: () => jumpToCategory(S.meSide, k) }, cMe);
    const opCt = el("span", { class: "ct " + (cOp ? "" : "zero"), onclick: () => jumpToCategory(opSide, k) }, cOp);
    rows[k] = { me: meCt, op: opCt };
    return el("div", { class: "qbreak-row" },
      meCt,
      // The category explainer tooltip lives on the label only — hovering the counts (which are
      // clickable jump targets) must not trigger it.
      categoryLabel(k),
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
          el("span", { class: "est-rating", onmouseenter: (e) => showInfoTip(e.currentTarget, "Estimated Elo", ELO_INFO), onmouseleave: hideQTip }, S.analyzing ? "≈ ··· elo" : "≈ " + (estimateElo(meEloAcc, meRating, S.meSide) ?? "—") + " elo")),
        el("span", { class: "acc-vs" }, "VS"),
        el("div", { class: "acc-cell right" },
          el("span", { class: "acc-name" }, S.players[opSide].name),
          S.analyzing
            ? loaderNode("acc-val", "var(--accent)")
            : el("span", { class: "acc-val", style: { color: "var(--ink-2)" }, onmouseenter: (e) => showInfoTip(e.currentTarget, "Accuracy", ACCURACY_INFO), onmouseleave: hideQTip }, opAcc == null ? "—" : opAcc.toFixed(1)),
          el("span", { class: "acc-bar" }, el("i", { style: { width: (S.analyzing ? 0 : (opAcc || 0)) + "%", background: "var(--ink-3)", marginLeft: (100 - (S.analyzing ? 100 : (opAcc || 0))) + "%" } })),
          el("span", { class: "est-rating", onmouseenter: (e) => showInfoTip(e.currentTarget, "Estimated Elo", ELO_INFO), onmouseleave: hideQTip }, S.analyzing ? "≈ ··· elo" : "≈ " + (estimateElo(opEloAcc, opRating, opSide) ?? "—") + " elo")),
      ),
      qbreak,
    ),
  ));
  statsRefs = S.analyzing ? { expanded: S.qbreakExpanded, rows } : null;
  if (UI.canvas.classList.contains("desktop-layout")) applyLayout();
}

/* ---------------- Eval graph ---------------- */
function renderGraph() {
  const show = S.settings.evalView === "both" || S.settings.evalView === "graph";
  const mod = UI.graph.closest(".mod");
  if (mod) mod.hidden = !show;   // hidden, not just emptied, so the layout closes the gap
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
  return el("span", { class: "ml-move" + (!S.analysisMode && ply === S.idx ? " current" : ""), "data-ply": ply,
    "data-class": cls || "", onclick: () => gotoMainline(ply) },
    el("span", { class: "pc", style: { color: pos.color === "w" ? "var(--ink)" : "var(--ink-2)" } }, glyph),
    el("span", {}, pos.san),
    showBadge ? qBadge(cls, S.moveGrades[ply]) : null,
  );
}
function qBadge(k, score = null) {
  const cfg = QUALITY[k]; const st = S.settings.badgeStyle;
  if (st === "dot") return el("span", { class: "qb dot", "data-badge-category": k,
    role: "img", "aria-label": categoryName(k), style: { background: cfg.color } });
  if (st === "label") return el("span", { class: "qb label", style: { background: cfg.color } }, categoryName(k));
  // "icon" → the real SVG badge
  return gradeBadge(k, score, "qb icon");
}
// Move the .current highlight to the cell for S.idx and auto-scroll it into view, without
// touching the rest of the list. Used both after a full rebuild and on a plain step.
function highlightCurrentMove(forceScroll = false) {
  const prev = UI.movesBody.querySelector(".ml-move.current");
  const previousPly = prev?.dataset.ply;
  if (prev) prev.classList.remove("current");
  // In analysis mode no mainline cell is "current" (the original render never marked one).
  const cur = S.analysisMode ? null : UI.movesBody.querySelector('.ml-move[data-ply="' + S.idx + '"]');
  if (cur) {
    cur.classList.add("current");
    if (forceScroll || previousPly !== cur.dataset.ply) {
      const cr = cur.getBoundingClientRect(), sr = UI.movesBody.getBoundingClientRect();
      UI.movesBody.scrollTop += (cr.top - sr.top) - (UI.movesBody.clientHeight - cr.height - 14);
    }
  }
}
let _movesSig = null;
let _movesClassSig = null;
function renderMoves() {
  const nMoves = Math.ceil(S.total / 2);
  const ml = S.settings.mlStyle;
  // Keep move cells mounted while classifications arrive. Replacing the list during analysis
  // drops the hovered element and makes its hover state flicker; only changed badges need updates.
  const sig = ml + "|" + S.settings.badgeStyle + "|" + S.total + "|" + (S.analysisMode ? 1 : 0);
  const classSig = JSON.stringify([S.classif, S.moveGrades]);
  if (sig === _movesSig && UI.movesBody.firstChild) {
    if (classSig !== _movesClassSig) {
      for (const cell of UI.movesBody.querySelectorAll(".ml-move[data-ply]")) {
        const cls = S.classif[+cell.dataset.ply];
        if (cell.dataset.class === (cls || "")) {
          const badge = cell.querySelector(".grade-badge");
          if (badge) updateGradeBadge(badge, cls, S.moveGrades[+cell.dataset.ply]);
          continue;
        }
        cell.dataset.class = cls || "";
        const old = cell.querySelector(".qb");
        if (old) old.remove();
        if (cls && (NOTEWORTHY.has(cls) || S.settings.badgeStyle === "dot")) cell.append(qBadge(cls, S.moveGrades[+cell.dataset.ply]));
      }
      _movesClassSig = classSig;
    }
    highlightCurrentMove(); return;
  }
  _movesSig = sig;
  _movesClassSig = classSig;
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
  highlightCurrentMove(true);
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
  let res;
  try {
    const eng = await ensureLiveEngine();
    if (token !== S.panelToken || S.analysisMode || activePos().fen !== fen) return;
    eng.cancelPending(); eng.stop();
    res = await eng.analyse(fen, S.settings.engineDepth, want, searchHistory(S.positions, i));
  } catch { return; }
  if (token !== S.panelToken || S.idx !== i || S.analysisMode || activePos().fen !== fen) return;
  S._panelCache = { idx: i, fen, lines: res.lines };
  renderEngineCurrent();
}
const ENGINE_NAME = { nnue: "Stockfish 18 NNUE", sf19lite: "Stockfish 19 Lite" };
// Keep all candidate lines and the action visible. Only the bottom edge moves, including
// when narrowing a custom panel wraps its heading/button or extra lines are selected.
function fitEnginePanel() {
  const mod = UI.engine?.closest('.mod');
  const head = UI.engine?.querySelector('.panel-head');
  const body = UI.engine?.querySelector('.engine-body');
  if (!mod || !head || !body) return;
  const height = Math.max(DEFAULT_LAYOUT.engine.h,
    Math.ceil((head.getBoundingClientRect().height + body.scrollHeight + 4) / GRID) * GRID);
  mod.style.minHeight = height + "px";
  if (isCustomLayout() && S.layout.engine) {
    S.layout.engine.h = Math.max(S.layout.engine.h, height);
    mod.style.height = S.layout.engine.h + "px";
    growCanvas();
  } else if (UI.canvas.classList.contains("desktop-layout")) {
    mod.style.height = height + "px";
  }
}
function renderEngine(lines, padFromCache = false) {
  const curFen = activePos().fen;
  const historyKey = JSON.stringify(activeSearchHistory());
  const want = S.settings.engineLines;
  // The last full set of real lines we rendered, kept (with the fen they were computed for, so the
  // SAN stays correct) to fill slots that the new position hasn't searched yet — and to hold the
  // panel steady while the engine re-computes (lines === null, e.g. "Play best moves from here").
  const cached = S._lastEngineLines?.fen === curFen && S._lastEngineLines?.historyKey === historyKey ? S._lastEngineLines : null;
  let body;
  if (S.analysisMode && S.liveError) {
    body = el("div", { class: "engine-empty" }, S.liveError);
  } else if (lines && !lines.length) {
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
    if (cur.length >= want) S._lastEngineLines = { lines: cur, fen: curFen, historyKey };
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
    el("div", { class: "panel-body engine-body" },
      el("div", { class: "engine-candidates", style: { minHeight: (want * 46) + "px" } }, body), bestWalkBtn),
  ));
  fitEnginePanel();
}

/* ---------------- Topbar meta ---------------- */
function metaChips() {
  const res = S.players[S.meSide].result;
  let outcome = "Result unknown";
  if (res === "1-0") outcome = S.meSide === "w" ? "Victory" : "Loss";
  else if (res === "0-1") outcome = S.meSide === "b" ? "Victory" : "Loss";
  else if (res && res.includes("1/2")) outcome = "Draw";
  const tcRaw = S.meta.timeClass || S.headers.TimeControl || "";
  const tc = tcRaw ? tcRaw.charAt(0).toUpperCase() + tcRaw.slice(1) : "";
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
// Settings accordion: opening one section closes the previously expanded section.
function section(title, ...children) {
  const kids = children.filter(Boolean);
  if (S.setOpen[title] == null) S.setOpen[title] = false; // default closed for a cleaner overview
  const open = S.setOpen[title];
  const head = el("button", {
    class: "set-sect-head" + (open ? " open" : ""),
    "aria-expanded": open ? "true" : "false",
    onclick: () => {
      const wasOpen = S.setOpen[title];
      for (const key of Object.keys(S.setOpen)) S.setOpen[key] = false;
      S.setOpen[title] = !wasOpen;
      renderSettings();
    },
  }, el("span", {}, title), icon("chevron"));
  const body = el("div", { class: "set-sect-body" }, ...kids);
  return el("div", { class: "set-section" + (open ? " open" : "") }, head, body);
}
function seg(label, key, options, info, fmt = (value) => value) {
  return el("div", { class: "set-row" },
    setLabel(label, info),
    el("div", { class: "set-seg" },
      ...options.map((o) => el("button", { class: S.settings[key] === o ? "on" : "", onclick: () => setSetting(key, o) }, fmt(o)))),
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
        browserAPI.storage.local.set({ settings: S.settings });
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
// Custom colors retain the preset swatch size, with a small palette icon to identify the picker.
function colorPickerChip(chip, colors) {
  chip.classList.add("chip-custom");
  chip.setAttribute("aria-label", chip.title);
  chip.setAttribute("aria-haspopup", "dialog");
  chip.append(el("span", { class: "chip-swatch", "aria-hidden": "true" }), icon("palette"));
  paintColorPickerChip(chip, colors);
}
function paintColorPickerChip(chip, colors) {
  const swatch = chip.querySelector(".chip-swatch");
  if (!swatch) return;
  swatch.style.background = colors[0];
  swatch.replaceChildren(...(colors.length > 1 ? [el("span", { class: "half r", style: { background: colors[1] } })] : []));
}
function loadingPreview() {
  return el("div", { class: "set-loader-preview", "aria-hidden": "true" },
    S.setOpen["Loading"] ? loaderNode("", "var(--accent)") : null);
}
let _accentPickCleanup = null;
function openAccentColorPicker(anchor) {
  if (_accentPickCleanup) _accentPickCleanup();
  S.settings.accent = "custom";
  applySettings();
  anchor.parentElement.querySelectorAll(".set-chip").forEach((chip) => chip.classList.toggle("on", chip === anchor));
  const picker = buildColorPicker(S.settings.accentCustom || DEFAULT_SETTINGS.accentCustom,
    (hex) => { S.settings.accentCustom = hex; paintColorPickerChip(anchor, [hex]); applySettings(); },
    (hex) => { S.settings.accentCustom = hex; paintColorPickerChip(anchor, [hex]);
      browserAPI.storage.local.set({ settings: S.settings }); },
  );
  const pop = el("div", { class: "board-cpick", role: "dialog", "aria-label": "Custom accent color" },
    el("div", { class: "cpick-title" }, "Custom accent"), picker.el);
  document.body.append(pop);
  const r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pr.width - 8)) + "px";
  pop.style.top = Math.max(8, r.bottom + pr.height + 6 > window.innerHeight ? r.top - pr.height - 6 : r.bottom + 6) + "px";
  const onDown = (e) => { if (!pop.contains(e.target)) close(); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const close = () => {
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("keydown", onKey);
    pop.remove(); _accentPickCleanup = null;
    browserAPI.storage.local.set({ settings: S.settings });
  };
  setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
  document.addEventListener("keydown", onKey);
  _accentPickCleanup = close;
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
function accentFromHex(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || "")) hex = DEFAULT_SETTINGS.accentCustom;
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return { accent: hex, strong: rgbToHex(r * .82, g * .82, b * .82),
    ink: luminance > .58 ? "#11111a" : "#ffffff" };
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

// Use the same themed picker and swatch as the custom board colours.
let _arrowPickCleanup = null;
function closeArrowColorPicker() { if (_arrowPickCleanup) _arrowPickCleanup(); }
function openArrowColorPicker(anchor) {
  closeArrowColorPicker();
  const update = (hex) => {
    S.settings.bestArrowColor = hex;
    paintColorPickerChip(anchor, [hex]);
    refreshArrows();
  };
  const save = () => browserAPI.storage.local.set({ settings: S.settings });
  const picker = buildColorPicker(S.settings.bestArrowColor || ARROW_COLOR, update, save);
  const pop = el("div", { class: "board-cpick", role: "dialog", "aria-label": "Best-move arrow color" },
    el("div", { class: "cpick-title" }, "Best-move arrow"), picker.el);
  document.body.append(pop);
  const r = anchor.getBoundingClientRect(), pr = pop.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pr.width - 8)) + "px";
  pop.style.top = Math.max(8, r.bottom + pr.height + 6 > window.innerHeight - 8
    ? r.top - pr.height - 6 : r.bottom + 6) + "px";
  const onDown = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) closeArrowColorPicker(); };
  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); closeArrowColorPicker(); anchor.focus(); }
  };
  const listenTimer = setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
  document.addEventListener("keydown", onKey);
  _arrowPickCleanup = () => {
    _arrowPickCleanup = null;
    clearTimeout(listenTimer);
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("keydown", onKey);
    pop.remove();
    save();
  };
}

// Themed colour-picker popover for the custom board chip: pick Light/Dark squares with an in-app
// HSV picker (matches the app's dark theme). The board updates live; the choice persists on commit.
let _boardPickCleanup = null;
function closeBoardColorPicker() { if (_boardPickCleanup) { _boardPickCleanup(); _boardPickCleanup = null; } }
function openBoardColorPicker(anchor) {
  closeBoardColorPicker();
  // Select custom without replacing the button that anchors the open picker.
  S.settings.boardTheme = "custom";
  applySettings();
  browserAPI.storage.local.set({ settings: S.settings });
  anchor.parentElement.querySelectorAll(".set-chip").forEach((chip) => chip.classList.toggle("on", chip === anchor));
  let target = "boardCustomLight"; // which square colour is being edited
  const swL = el("button", { class: "cpick-target on" }), swD = el("button", { class: "cpick-target" });
  const paint = () => {
    const [lt, dk] = customBoardColors();
    paintColorPickerChip(anchor, [lt, dk]);
    swL.replaceChildren(el("span", { class: "cpick-tsw", style: { background: lt } }), el("span", {}, "Light"));
    swD.replaceChildren(el("span", { class: "cpick-tsw", style: { background: dk } }), el("span", {}, "Dark"));
  };
  const picker = buildColorPicker(S.settings[target],
    (hex) => { S.settings[target] = hex; applySettings(); paint(); },         // live
    (hex) => { S.settings[target] = hex; browserAPI.storage.local.set({ settings: S.settings }); }, // commit
  );
  const setActive = (key, btn) => {
    target = key;
    swL.classList.toggle("on", btn === swL); swD.classList.toggle("on", btn === swD);
    picker.setHex(S.settings[key]);
  };
  swL.addEventListener("click", () => setActive("boardCustomLight", swL));
  swD.addEventListener("click", () => setActive("boardCustomDark", swD));
  paint();
  const pop = el("div", { class: "board-cpick", role: "dialog", "aria-label": "Custom board colors" },
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
        if (key === "engineDepth") return; // preview while dragging; confirm once on release
        S.settings[key] = v;
        browserAPI.storage.local.set({ settings: S.settings });
        S.engineFallbackBuild = null; S.activeEngineBuild = null;
        resetLiveEngine();
        invalidateVariationEvals();
        if (S.helperEngine) { try { S.helperEngine.terminate(); } catch {} S.helperEngine = null; }
        S.threatCache.clear();
        scheduleReanalyze();
      },
      onchange: async e => {
        if (key !== "engineDepth") return;
        await setEngineSetting(key, +e.target.value);
        e.target.value = S.settings[key]; out.textContent = fmt(+S.settings[key]);
      },
    }),
  );
}
// Reset every Engine-tab setting to its default and re-run the analysis.
async function resetEngineSettings() {
  for (const k of ENGINE_SETTING_KEYS) S.settings[k] = DEFAULT_SETTINGS[k];
  S.engineFallbackBuild = null;
  S.activeEngineBuild = null;
  await browserAPI.storage.local.set({ settings: S.settings });
  resetLiveEngine();
  invalidateVariationEvals();
  if (S.helperEngine) { try { S.helperEngine.terminate(); } catch {} S.helperEngine = null; }
  S.threatCache.clear();
  scheduleReanalyze();
  if (UI.settings && !UI.settings.hidden) renderSettings();
}
const ARROW_SETTING_KEYS = ["bestArrow", "showThreat", "bestArrowColor", "arrowOpacity", "arrowShaft", "arrowHead"];
const BACKGROUND_SETTING_KEYS = ["bg", "bgFit", "bgTile", "bgCustom", "bgHue", "bgSat", "bgLight"];
const BADGE_SETTING_KEYS = ["badgeFont", "badgeTooltip"];
const VISUAL_SETTING_KEYS = [
  "theme", "accent", "accentCustom", "density", "evalView", "mlStyle", "badgeStyle", "badgeScale",
  ...BADGE_SETTING_KEYS,
  "graphStyle", "barStyle", "insightFont", "showCoords", "coordSize", ...BACKGROUND_SETTING_KEYS,
  "coach", "coachPlain", "boardTheme", "pieceStyle", "boardCustomLight", "boardCustomDark",
  "sound", "soundVolume", "soundFx", ...ARROW_SETTING_KEYS,
  "moveAnim", "animSpeed", "loaderStyle",
];
function resetSettingKeys(keys) {
  for (const key of keys) S.settings[key] = structuredClone(DEFAULT_SETTINGS[key]);
  return browserAPI.storage.local.set({ settings: S.settings });
}
function resetArrowSettings() {
  closeArrowColorPicker();
  resetSettingKeys(ARROW_SETTING_KEYS);
  refreshArrows(); renderSettings();
}
function resetBackgroundSettings() {
  resetSettingKeys(BACKGROUND_SETTING_KEYS);
  applyBackground(); renderSettings();
}
async function resetVisualSettings() {
  closeArrowColorPicker();
  if (_accentPickCleanup) _accentPickCleanup();
  closeBoardColorPicker();
  delete S.settings.wrongSound; // remove obsolete saved choices from older versions
  await resetSettingKeys(VISUAL_SETTING_KEYS);
  S.coach = null;
  _ipSig = null;
  if (S.practice) S.practice.coachTyped = false;
  resetLayout();
  applySettings(); buildBoard(); renderEvalBar(); renderGraph(); renderMoves();
  renderCoachAvatar(); renderReview(); renderStats(); renderControls();
  renderSettings();
}
// Controls for the "Background" section: preset/custom picker, fit mode, tile size, upload button.
function bgControls() {
  const swatch = (c, css) => { c.style.background = css; c.style.backgroundSize = "cover"; c.style.backgroundPosition = "center"; };
  const h = S.settings.bgHue ?? DEFAULT_SETTINGS.bgHue, s = S.settings.bgSat ?? DEFAULT_SETTINGS.bgSat, l = S.settings.bgLight ?? DEFAULT_SETTINGS.bgLight;
  const colorCss = `radial-gradient(120% 80% at 50% -10%, hsl(${h} ${s}% ${Math.min(100, l + 12)}%), hsl(${h} ${s}% ${l}%) 60%)`;
  const isColor = S.settings.bg === "color";
  const entries = [
    { value: "color", render: (c) => { c.title = "Custom colour"; swatch(c, colorCss); } },
    { value: "olive", render: (c) => { c.title = "Dark"; swatch(c, "radial-gradient(120% 80% at 50% -10%, #141414, #0a0a0a 60%)"); } },
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
    el("button", { class: "set-reset", onclick: resetBackgroundSettings }, "Reset to default"),
  ];
}
function visualSettings() {
  const boardEntries = Object.entries(BOARD_THEMES).map(([k, [lt, dk]]) => ({
    value: k, title: BOARD_THEME_LABEL[k] || k,
    render: (chip) => chip.append(el("span", { class: "half l", style: { background: lt } }), el("span", { class: "half r", style: { background: dk } })),
  }));
  // Custom colour chip — always first. Clicking it selects custom and opens the colour picker.
  {
    const [lt, dk] = customBoardColors();
    boardEntries.unshift({
      value: "custom",
      title: "Choose custom board colors",
      onClick: (e) => openBoardColorPicker(e.currentTarget),
      render: (chip) => {
        colorPickerChip(chip, [lt, dk]);
      },
    });
  }
  const accentEntries = Object.keys(ACCENTS).map((hex) => ({
    value: hex, render: (chip) => { chip.style.background = "transparent"; chip.append(el("span", { class: "set-accent", style: { background: hex } })); },
  }));
  accentEntries.unshift({ value: "custom", title: "Choose custom accent color", onClick: (e) => openAccentColorPicker(e.currentTarget),
    render: (chip) => colorPickerChip(chip, [S.settings.accentCustom]) });
  return el("div", {},
    section("Theme",
      colorChips("Accent", "accent", accentEntries),
    ),
    section("Board / Pieces",
      colorChips("", "boardTheme", boardEntries),
      pieceGrid(),
      toggleRow("Board coordinates", "showCoords"),
      slider("Size", "coordSize", 10, 25, 1, {
        fmt: (v) => v + " px",
        onChange: (v) => document.documentElement.style.setProperty("--coord-size", v + "px"),
      }),
    ),
    section("Best-move arrow",
      colorChips("Arrow color", "bestArrowColor", [{
        value: S.settings.bestArrowColor || ARROW_COLOR,
        title: "Choose arrow color",
        onClick: (e) => openArrowColorPicker(e.currentTarget),
        render: (chip) => {
          colorPickerChip(chip, [S.settings.bestArrowColor || ARROW_COLOR]);
        },
      }]),
      toggleRow("Show arrow", "bestArrow"),
      toggleRow("Show the threat", "showThreat", setSetting, "Draws a yellow arrow with the opponent's best move as if it were their turn — i.e. the threat against the move you just played. Helps answer \"why was that bad / what am I missing?\""),
      slider("Opacity", "arrowOpacity", 0.3, 1, 0.02, { onChange: refreshArrows }),
      slider("Shaft width", "arrowShaft", 0.14, 0.42, 0.01, { onChange: refreshArrows }),
      slider("Head size", "arrowHead", 0.22, 0.55, 0.01, { onChange: refreshArrows }),
      el("button", { class: "set-reset", onclick: resetArrowSettings }, "Reset to default"),
    ),
    section("Loading",
      seg("Animation", "loaderStyle", ["wave", "dots", "bounce", "spinner"]),
      loadingPreview(),
    ),
    section("Move animation",
      toggleRow("Animation", "moveAnim"),
      slider("Speed", "animSpeed", 1, 10, 1, { fmt: (v) => (440 - v * 40) + " ms" }),
    ),
    section("Layout",
      seg("Eval", "evalView", ["both", "bar", "graph"]),
      seg("Bar", "barStyle", ["gradient", "classic", "mono", "accent"], null, (value) => value === "classic" ? "Solid" : value),
      seg("Graph", "graphStyle", ["area", "line", "color", "minimal"]),
      el("button", { class: "set-reset reorg-toggle-btn", onclick: toggleReorganize }, S.reorganize ? "Done reorganizing" : "Reorganize panels"),
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Reorganize lets you drag and resize the panels, and your arrangement is saved. Reset layout goes back to the automatic layout that fits any window.")),
      el("button", { class: "set-reset", onclick: resetLayout }, "Reset layout"),
    ),
    section("Move list",
      seg("Style", "mlStyle", ["rows", "cards", "compact"]),
      seg("Badges", "badgeStyle", ["icon", "dot", "label"]),
    ),
    section("Category badges", badgeSettings()),
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
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "A missed practice move plays the Incorrect cue.")),
    ),
    el("button", { class: "set-reset", onclick: resetVisualSettings }, "Reset to default"),
  );
}
// Coach dropdown — only coaches that have a built animated character. Uses the
// library's custom dropdown (ddField) rather than a native <select> so the option hover matches the
// app theme instead of the OS's blue highlight.
function coachPicker() {
  const cur = S.settings.coach || "";
  const opts = COACH_LIST.filter(([id]) => COACH_RIGS[id]);
  const portrait = (id, label) => el("span", { class: "coach-choice" },
    el("img", { class: "coach-thumbnail", src: browserAPI.runtime.getURL("data/coaches-anim/thumbnails/" + id + ".svg"), alt: "", width: 28, height: 32 }),
    el("span", {}, label));
  const dropdown = ddField(cur, opts, (v) => setCoach(v), portrait);
  dropdown.classList.add("coach-dropdown");
  return el("div", { class: "set-row" }, el("span", { class: "set-lbl" }, "Coach"), dropdown);
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
        el("span", { class: "set-note" }, "Additional analysis lines provide alternatives for move annotations. Calibrated SF18 numerical scores require 1 analysis line. Panel lines are searched live as you reach each move.")),
    ),
    section("Estimated rating",
      el("div", { class: "set-row" }, setLabel("Rating mode", ELO_INFO),
        ddField(S.settings.ratingMode || "context", [["context", "Use recorded rating"], ["moves", "Moves only"]], value => setEngineSetting("ratingMode", value))),
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" },
        "Use recorded rating: shows how well you played compared with players around the rating saved in this game, using the selected engine's own model. If no rating is saved, we use Moves only instead.")),
      S.settings.enginePath === "sf19lite" ? el("div", { class: "set-row hint" }, el("span", { class: "set-note" },
        "Stockfish 19 compares expected-point losses with its own public peers. This rating comparison is separate from displayed accuracy.")) : null,
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Moves only: ignores the saved rating and estimates a blitz rating level from your move choices. Needs at least 10 moves with more than one legal choice. These estimates do not change your account rating.")),
      (S.settings.enginePath === "nnue" && (S.settings.engineDepth !== 16 || S.settings.engineHash !== 16 || S.settings.engineSkill !== 20 || S.settings.classifyLines !== 1))
        ? el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Use depth 16, hash 16 MB, maximum strength and 1 analysis line for calibrated SF18 numerical scores.")) : null,
    ),
    section("Engine",
      el("div", { class: "set-row" },
        setLabel("Build", ENGINE_INFO.enginePath),
        el("div", { class: "set-seg" },
          el("button", { class: S.settings.enginePath === "nnue" ? "on" : "", onclick: () => setEngineSetting("enginePath", "nnue") }, "Stockfish 18 NNUE"),
          el("button", { class: S.settings.enginePath === "sf19lite" ? "on" : "", onclick: () => setEngineSetting("enginePath", "sf19lite") }, "Stockfish 19 Lite"),
        ),
      ),
      // Keep the warning visible when any analysis worker had to use a fallback.
      (S.engineFallbackBuild && S.engineFallbackBuild !== S.settings.enginePath)
        ? el("div", { class: "set-row hint" },
            el("span", { class: "set-note" },
              `⚠ At least one worker couldn't start "${ENGINE_NAME[S.settings.enginePath] || S.settings.enginePath}" and used ${ENGINE_NAME[S.engineFallbackBuild] || S.engineFallbackBuild} instead.`))
        : null,
      S.settings.enginePath === "sf19lite" ? el("div", { class: "set-row hint" },
        el("span", { class: "set-note" }, "SF19 reviews use fixed calibration settings at full strength. Depth and hash controls affect the live engine panel.")) : null,
      engineSlider("Strength (Skill)", "engineSkill", 0, 20, 1, { fmt: (v) => (v >= 20 ? "Max (20)" : String(v)), info: ENGINE_INFO.engineSkill }),
      engineSlider("Hash (MB)", "engineHash", 16, 256, 16, { fmt: (v) => v + " MB", info: ENGINE_INFO.engineHash }),
      el("div", { class: "set-row hint" },
        el("span", { class: "set-note" }, "Engine build & search options. Changes here re-analyze the game.")),
    ),
    el("button", { class: "set-reset", onclick: resetEngineSettings }, "Reset to default"),
  );
}
function badgeLabelPicker() {
  const selected = badgeLabelStyle(), styles = Object.keys(BADGE_LABEL_STYLES);
  return el("div", { class: "badge-label-options", role: "radiogroup", "aria-label": "Hover labels" },
    ...styles.map((id, index) => {
      const option = BADGE_LABEL_STYLES[id];
      return el("button", { type: "button", class: "badge-label-option" + (selected === id ? " on" : ""),
        role: "radio", "aria-checked": String(selected === id), "aria-label": option.name + ": " + option.description,
        tabindex: selected === id ? "0" : "-1", "data-label-style": id,
        onclick: () => setSetting("badgeTooltip", id),
        onkeydown: e => {
          const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (!direction && e.key !== "Home" && e.key !== "End") return;
          e.preventDefault(); e.stopPropagation();
          const next = styles[e.key === "Home" ? 0 : e.key === "End" ? styles.length - 1 : (index + direction + styles.length) % styles.length];
          setSetting("badgeTooltip", next).then(() => UI.settings.querySelector(`[data-label-style="${next}"]`)?.focus());
        },
      },
      el("span", { class: "badge-label-preview", "aria-hidden": "true" },
        id === "off" ? el("span", { class: "badge-label-off" }, "—") : categoryLabelArtwork("brilliant", id)),
      el("span", { class: "badge-label-caption" },
        el("span", { class: "badge-label-title" }, option.name, el("span", { class: "badge-label-check", "aria-hidden": "true" }, selected === id ? "✓" : ""))));
    }));
}
function badgeSettings() {
  const fonts = el("div", { class: "badge-font-options", role: "group", "aria-label": "Number font", tabindex: "0" },
    ...Object.entries(BADGE_FONTS).map(([id, font]) => el("button", {
      class: "badge-font-option" + (S.settings.badgeFont === id ? " on" : ""),
      "data-font": id,
      "aria-pressed": String(S.settings.badgeFont === id), onclick: () => setSetting("badgeFont", id),
    }, el("span", { class: "badge-font-name" }, font.name, el("small", {}, font.style)),
      el("span", { class: "badge-font-sample", "aria-hidden": "true",
        style: { fontFamily: font.family } }, "9.0 6.4"))));
  return el("div", { class: "badge-settings" },
    el("p", { class: "set-note" }, "Choose how move scores look across the board, move list and accuracy breakdown."),
    el("div", { class: "badge-preview", "aria-label": "Badge preview" },
      gradeBadge("best", 9, "badge-preview-item"), gradeBadge("good", 6.4, "badge-preview-item"),
      gradeBadge("brilliant", 10, "badge-preview-item"), gradeBadge("blunder", 0, "badge-preview-item"),
      gradeBadge("book", null, "badge-preview-item")),
    slider("Badge size", "badgeScale", 0.7, 1.6, 0.05, {
      fmt: (v) => Math.round(v * 100) + " %",
      onChange: (v) => document.documentElement.style.setProperty("--badge-scale", v),
    }),
    el("div", { class: "set-lbl" }, "Number font"), fonts,
    el("p", { class: "set-note" }, "Free, open-source fonts, bundled for offline use."),
    el("div", { class: "badge-label-heading" }, el("span", { class: "set-lbl" }, "Hover labels")),
    badgeLabelPicker(),
    el("p", { class: "set-note" }, "Show the category for two seconds after each move."));
}
function renderSettings() {
  closeArrowColorPicker();
  const scroll = UI.settings.scrollTop; // keep scroll position when a setting changes
  const fontScroll = UI.settings.querySelector(".badge-font-options")?.scrollTop;
  const focusedFont = UI.settings.contains(document.activeElement) && document.activeElement.closest(".badge-font-option")?.getAttribute("data-font");
  const focusedLabelStyle = UI.settings.contains(document.activeElement) && document.activeElement.closest(".badge-label-option")?.getAttribute("data-label-style");
  const focusedSection = UI.settings.contains(document.activeElement) && document.activeElement.closest(".set-sect-head")?.querySelector("span")?.textContent;
  const openConceptDetails = new Set([...UI.settings.querySelectorAll(".concepts-panel details[open]")].map(node => node.dataset.conceptDetail));
  const focusedConceptToggle = UI.settings.contains(document.activeElement) && document.activeElement.id === "conceptsEnabled";
  const tabs = el("div", { class: "set-tabs" },
    el("button", { class: "set-tab" + (S.settingsTab === "visual" ? " on" : ""), onclick: () => { S.settingsTab = "visual"; renderSettings(); } }, "Visual"),
    el("button", { class: "set-tab" + (S.settingsTab === "engine" ? " on" : ""), onclick: () => { S.settingsTab = "engine"; renderSettings(); } }, "Engine"),
    el("button", { class: "set-tab" + (S.settingsTab === "concepts" ? " on" : ""), onclick: () => { S.settingsTab = "concepts"; refreshConcepts(); renderSettings(); } }, "Concepts"),
  );
  UI.settings.classList.toggle("concepts-open", S.settingsTab === "concepts");
  UI.settings.replaceChildren(tabs, ...(S.settingsTab === "concepts" ? [conceptSettings()] : S.settingsTab === "engine" ? [motorSettings()]
    : [visualSettings()]));
  UI.settings.scrollTop = scroll;
  const fonts = UI.settings.querySelector(".badge-font-options");
  if (fonts && fontScroll != null) fonts.scrollTop = fontScroll;
  if (focusedFont) UI.settings.querySelector(`[data-font="${focusedFont}"]`)?.focus({ preventScroll: true });
  if (focusedLabelStyle) UI.settings.querySelector(`[data-label-style="${focusedLabelStyle}"]`)?.focus({ preventScroll: true });
  if (focusedSection) [...UI.settings.querySelectorAll(".set-sect-head")].find(head => head.querySelector("span")?.textContent === focusedSection)?.focus({ preventScroll: true });
  for (const detail of UI.settings.querySelectorAll(".concepts-panel details")) detail.open = openConceptDetails.has(detail.dataset.conceptDetail);
  if (focusedConceptToggle) UI.settings.querySelector("#conceptsEnabled")?.focus({preventScroll: true});
  positionSettings();
}
function positionSettings() {
  if (!UI.settings || UI.settings.hidden) return;
  // Keep the popover anchored to the right edge, beneath its toolbar button. Tying this
  // offset to the analysis panels made it drift left on wide windows and briefly reuse
  // stale panel geometry when the automatic/custom layout was reset.
  UI.settings.style.right = window.innerWidth <= 520 ? "" : "24px";
}
function toggleSettings() {
  closeArrowColorPicker();
  UI.settings.hidden = !UI.settings.hidden;
  if (!UI.settings.hidden) renderSettings();
}

/* ---------------- Optional, isolated concept analysis ---------------- */
let _conceptSession = null, _conceptPositions = null, _conceptEnabled = false, _conceptRenderTimer = null;
let _conceptGameKeys = [];
function conceptMoveInput(positions, ply) {
  if (ply < 1 || !positions[ply]?.from || !positions[ply]?.to) return null;
  const history = searchHistory(positions, ply - 1), move = positions[ply];
  return {fen: positions[ply - 1].fen, move: move.from + move.to + (move.promotion || ""),
    history: {fen: history.initialFen, moves: history.moves}};
}
function selectedConceptInput() {
  if (S.practice) return null;
  if (S.analysisMode && S.variation) {
    const v = S.variation, positions = [...S.positions.slice(0, v.branchIdx + 1), ...v.positions.slice(1, v.idx + 1)];
    return conceptMoveInput(positions, positions.length - 1);
  }
  return conceptMoveInput(S.positions, S.idx);
}
function refreshConcepts() {
  const enabled = S.settings.conceptsEnabled === true;
  if (!enabled && !_conceptSession) return;
  if (!_conceptSession) _conceptSession = new ConceptSession({setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: id => clearTimeout(id), changed: () => {
    if (_conceptRenderTimer) return;
    _conceptRenderTimer = setTimeout(() => {
      _conceptRenderTimer = null;
      if (UI.settings && !UI.settings.hidden && S.settingsTab === "concepts") renderSettings();
    }, 100);
  }});
  if (_conceptPositions !== S.positions || _conceptEnabled !== enabled) {
    const changedGame = _conceptPositions !== S.positions;
    _conceptPositions = S.positions; _conceptEnabled = enabled;
    // No history building or worker creation while the checkbox is off.
    const inputs = enabled ? S.positions.slice(1).map((_p, i) => conceptMoveInput(S.positions, i + 1)).filter(Boolean) : [];
    if (enabled || changedGame) _conceptGameKeys = inputs.map(conceptKey);
    _conceptSession.configure(inputs, enabled);
  }
  if (enabled) { const selected = selectedConceptInput(); if (selected) _conceptSession.include(selected, true); }
}
function conceptSettings() {
  const enabled = S.settings.conceptsEnabled === true;
  const checkbox = el("input", {type: "checkbox", id: "conceptsEnabled", checked: enabled, onchange: event => {
    S.settings.conceptsEnabled = event.target.checked;
    browserAPI.storage.local.set({settings: S.settings});
    // Let checkbox/label activation finish before the scheduled panel refresh.
    // Replacing this input during change can make a native label activate it twice.
    refreshConcepts();
  }});
  const panel = el("div", {class: "concepts-panel"},
    el("label", {class: "concepts-toggle"}, checkbox, "Enable concept analysis"),
    el("p", {class: "concepts-note"}, "E080 verified mechanics. Observations and bounded proofs; broader strategic benefits are unproven."));
  if (!enabled) {
    panel.append(el("p", {}, "Disabled — concept analysis is stopped. Enable to process this game."));
  }
  const input = selectedConceptInput(), entry = input && _conceptSession?.entries.get(conceptKey(input));
  if (enabled) panel.append(el("h3", {}, "Selected move"));
  if (!enabled) { /* Keep debug metrics visible while the analysis is stopped. */ }
  else if (!input) panel.append(el("p", {}, S.practice ? "Practice inputs unavailable for concept analysis." : "Select a played move. The initial position has no played-move context."));
  else if (!entry || entry.status !== "complete" && !entry.findings.length) panel.append(el("p", {}, "Concept analysis pending…"));
  else {
    if (entry.status !== "complete") panel.append(el("p", {class: "concepts-note"}, "Observations ready; bounded proof searches are running…"));
    if (!entry.findings.length) panel.append(el("p", {}, "No supported finding within the available inputs and budgets."));
    const list = el("ul", {class: "concepts-findings"});
    for (const finding of entry.findings) list.append(el("li", {},
      el("strong", {}, finding.name), el("p", {}, finding.text),
      el("span", {class: "concepts-kind"}, finding.kind),
      el("details", {"data-concept-detail": JSON.stringify([finding.event, finding.name, finding.text])}, el("summary", {}, "Verified scope"), ...finding.scopes.map(scope => el("p", {}, scope.occurrence + ": " + scope.scope)))));
    panel.append(list);
  }
  const metrics = _conceptSession?.metrics(_conceptGameKeys) || {timeMs: 0, processed: 0, total: 0, found: 0, reused: 0, errors: [], unavailable: [], issues: []};
  panel.append(el("h3", {}, "Game debug metrics"),
    el("p", {id: "conceptMetrics"}, `Total concept-analysis time: ${(metrics.timeMs / 1000).toFixed(2)} s · Positions processed: ${metrics.processed}/${metrics.total} · Concepts found: ${metrics.found} · Reused positions: ${metrics.reused}`),
    el("p", {class: "concepts-note"}, "Time sums per-position concept work, including reused work. Counts include every finding at each move. Variations are shown above and excluded from game totals."));
  const atPlies = field => _conceptGameKeys.flatMap((key, index) => (_conceptSession?.entries.get(key)?.[field] || []).map(message => `Ply ${index + 1}: ${message}`));
  const reports = [["Errors", atPlies("errors")], ["Unavailable inputs", atPlies("unavailable")], ["Exhausted budgets", atPlies("issues")]];
  for (const [label, messages] of reports) {
    const unique = [...new Set(messages)];
    const detail = el("details", {"data-concept-detail": "debug:" + label}, el("summary", {}, `${label}: ${messages.length}`));
    for (const message of unique) detail.append(el("p", {}, message));
    panel.append(detail);
  }
  if (enabled && entry && !_conceptGameKeys.includes(conceptKey(input))) {
    for (const message of [...entry.errors, ...entry.unavailable, ...entry.issues]) panel.append(el("p", {}, "Selected variation: " + message));
  }
  return panel;
}

/* ---------------- Credits & attributions ----------------
   The legal disclaimer and third-party asset credits live here, behind the
   info button in the top bar — kept out of the way but one click from anywhere. */
const CREDITS = [
  {
    title: "Move classifier — Brilliant-Chess",
    by: "Delo (wdeloo); adapted for Chess Review. Copyright © 2025 Delo.",
    lic: "MIT",
    note: "Full copyright and licence notice in THIRD_PARTY_NOTICES.md.",
    href: "https://github.com/wdeloo/Brilliant-Chess",
  },
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
    title: "Move sounds",
    by: "Lichess sound set (lila)",
    lic: "Licensed",
    href: "https://github.com/lichess-org/lila/blob/master/LICENSE",
  },
  {
    title: "Stockfish 19 Lite",
    by: "Lite single-threaded Stockfish.js 19.0.0 by Nathan Rugg (“nmrugg”), © 2026 Chess.com, LLC; lite network by sscg13; based on the Stockfish team's engine.",
    lic: "GPLv3",
    href: "https://github.com/nmrugg/stockfish.js/tree/v19.0.0",
  },
  {
    title: "Stockfish 18 NNUE (default)",
    by: "NNUE build © Chess.com, LLC — distributed as JS/WASM via Nathan Rugg’s (“nmrugg”) Stockfish.js.",
    lic: "GPLv3",
    href: "https://github.com/nmrugg/stockfish.js/tree/v18.0.0",
  },
  {
    title: "Chess engine — upstream",
    by: "Official Stockfish by T. Romstad, M. Costalba, J. Kiiski, G. Linscott & contributors.",
    lic: "GPLv3",
    href: "https://github.com/official-stockfish/Stockfish",
  },
  {
    title: "Neural networks (NNUE)",
    by: "Stockfish team and network contributors; Stockfish 18's lite network by Linmiao Xu (“linrock”).",
    lic: "GPLv3",
    href: "https://tests.stockfishchess.org/nns",
  },
];
const CONTRIBUTORS = [
  { name: "aciokie", username: "aciokie", role: "Contributor" },
  { name: "neuroflowinfinix", username: "neuroflowinfinix", role: "Contributor" },
  { name: "Kristian Julsgaard", username: "Julsgaard", role: "Contributor" },
  { name: "Arthur Guedes", username: "arthurhguedes", role: "Contributor" },
  { name: "T-Julsgaard", username: "T-Julsgaard", role: "Maintainer" },
];
const REPO_URL = "https://github.com/T-Julsgaard/Chess-Review";
function openCredits() {
  document.querySelector(".credits-overlay")?.remove();
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };

  const contributors = el("section", { class: "credits-team", "aria-label": "Contributors & Maintainers" },
    el("h4", {}, "Contributors & Maintainers"),
    ...CONTRIBUTORS.map((person) =>
      el("a", { class: "credit-person", href: "https://github.com/" + person.username, target: "_blank", rel: "noopener noreferrer" },
        el("span", { class: "credit-title" }, person.name),
        el("span", { class: "credit-by" }, person.role),
      ),
    ),
  );
  const entries = [...CREDITS].reverse().map((c) =>
    el("a", { class: "credit-row", href: c.href, target: "_blank", rel: "noopener noreferrer" },
      el("div", { class: "credit-main" },
        el("div", { class: "credit-title" }, c.title),
        el("div", { class: "credit-by" }, c.by),
        c.note ? el("div", { class: "credit-note" }, c.note) : null,
      ),
      el("span", { class: "credit-lic" }, c.lic),
    ),
  );

  // Prominent source-code link at the very top — the canonical answer to "how do I get the source".
  const sourceRow = el("a", { class: "credits-source", href: REPO_URL, target: "_blank", rel: "noopener noreferrer" },
    el("div", { class: "credit-main" },
      el("div", { class: "credit-title" }, "Source code on GitHub"),
      el("div", { class: "credit-by" }, "Free & open source (GPLv3)"),
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
      "or sponsored by Chess.com or Lichess.",
      el("br"),
      "All trademarks belong to their respective owners."),
    el("div", { class: "credits-list" }, contributors, ...entries),
    el("div", { class: "credits-foot" },
      el("div", { class: "credits-foot-links" },
        el("a", { href: REPO_URL + "/blob/main/LICENSE", target: "_blank", rel: "noopener noreferrer" }, "Full license (GPLv3)"),
        " · ",
        el("a", { href: REPO_URL + "/blob/main/ATTRIBUTIONS.md", target: "_blank", rel: "noopener noreferrer" }, "All attributions"),
      ),
    ),
  );

  const overlay = el("div", { class: "credits-overlay", onclick: (e) => { if (e.target === overlay) close(); } }, card);
  document.body.append(overlay);
  document.addEventListener("keydown", onKey);
}
async function setSetting(key, value) {
  if (key === "badgeTooltip") value = badgeLabelStyle(value);
  S.settings[key] = value;
  await browserAPI.storage.local.set({ settings: S.settings });
  applySettings();
  if (key === "pieceStyle") buildBoard();
  if (key === "mlStyle" || key === "badgeStyle") renderMoves();
  if (key === "evalView" || key === "graphStyle" || key === "barStyle") { renderEvalBar(); renderGraph(); }
  if (key === "bestArrow") renderBestArrow();
  if (key === "showThreat") renderThreatArrow();
  if (key === "loaderStyle") { renderReview(); renderStats(); }
  if (BADGE_SETTING_KEYS.includes(key)) refreshBadgeAppearance();
  if (key === "badgeTooltip") syncBoardBadgeLabel(true);
  if (UI.settings && !UI.settings.hidden) renderSettings();
}
// Engine setting: save, discard the live engine (new build/options), and re-analyze.
let calibrationWarningPending = null;
function calibrationWarning(title, message, remainLabel, recommended = false) {
  if (calibrationWarningPending) return calibrationWarningPending;
  calibrationWarningPending = new Promise(resolve => {
    const previousFocus = document.activeElement;
    const finish = proceed => {
      overlay.remove(); document.removeEventListener("keydown", onKey, true);
      calibrationWarningPending = null; previousFocus?.focus(); resolve(proceed);
    };
    const revert = el("button", { type: "button", class: recommended ? "recommended" : "", onclick: () => finish(false) },
      el("span", { class: "calibration-warning-choice-label" }, remainLabel),
      recommended ? el("small", {}, "Recommended") : null);
    const proceed = el("button", { type: "button", onclick: () => finish(true) }, "Continue");
    const overlay = el("div", { class: "calibration-warning-overlay" },
      el("div", { class: "calibration-warning", role: "alertdialog", "aria-modal": "true",
        "aria-labelledby": "calibrationWarningTitle calibrationWarningContext", "aria-describedby": "calibrationWarningBody" },
      el("h3", { id: "calibrationWarningTitle" }, "Warning"),
      el("h4", { id: "calibrationWarningContext" }, title),
      el("p", { id: "calibrationWarningBody" }, message),
      el("div", { class: "calibration-warning-actions" }, revert, proceed)));
    const onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); finish(false); }
      else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === revert ? proceed : revert).focus(); }
      else if (e.key.startsWith("Arrow") || ["Home", "End", "f"].includes(e.key)) e.stopImmediatePropagation();
    };
    document.body.append(overlay); document.addEventListener("keydown", onKey, true); revert.focus();
  });
  return calibrationWarningPending;
}
async function setEngineSetting(key, value) {
  if (S.settings[key] === value) return;
  if (key === "enginePath" && value === "sf19lite") {
    const proceed = await calibrationWarning("Switch to Stockfish 19 Lite?",
      "Our accuracy and estimated-rating calibration is built primarily around Stockfish 18 NNUE. Stockfish 19 Lite has less validation behind its review scores, so switching may produce less reliable results. We recommend remaining on Stockfish 18 for the most consistent game reviews.", "Remain on Stockfish 18", true);
    if (!proceed) { if (S.settings.enginePath !== "nnue") await setEngineSetting("enginePath", "nnue"); return; }
  }
  if (key === "engineDepth" && value !== 16 && S.settings.enginePath === "nnue" && S.settings.engineDepth === 16) {
    const proceed = await calibrationWarning("Change the calibrated depth?",
      "Our accuracy and estimated-rating calibration is built primarily around Stockfish 18 NNUE at depth 16. Other depths have less validation behind their review scores, so changing the depth may produce less reliable results. We recommend keeping depth 16 for the most consistent game reviews.", "Keep depth 16", true);
    if (!proceed) return;
  }
  S.settings[key] = value;
  S.engineFallbackBuild = null;
  S.activeEngineBuild = null;
  await browserAPI.storage.local.set({ settings: S.settings });
  resetLiveEngine();
  invalidateVariationEvals();
  // The helper engine (threat preview / practice judging) must also be rebuilt with the new
  // build/options, and any cached threat arrows recomputed.
  if (S.helperEngine) { try { S.helperEngine.terminate(); } catch {} S.helperEngine = null; }
  S.threatCache.clear();
  // In analysis mode: reset the variation's cached evals, so they're recomputed with new options.
  if (S.analysisMode && S.variation) {
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
function applySettings() {
  const r = document.documentElement;
  // Only the dark theme is supported now — force it (also for old saved "light").
  S.settings.theme = "dark";
  r.setAttribute("data-theme", "dark");
  r.setAttribute("data-density", S.settings.density);
  const a = S.settings.accent === "custom"
    ? accentFromHex(S.settings.accentCustom)
    : (ACCENTS[S.settings.accent] || ACCENTS["#7fb45f"]);
  r.style.setProperty("--accent", a.accent);
  r.style.setProperty("--accent-strong", a.strong);
  r.style.setProperty("--accent-ink", a.ink);
  const bt = S.settings.boardTheme === "custom"
      ? customBoardColors()
      : (BOARD_THEMES[S.settings.boardTheme] || BOARD_THEMES.maple);
  r.style.setProperty("--sq-light", bt[0]);
  r.style.setProperty("--sq-dark", bt[1]);
  r.style.setProperty("--badge-scale", S.settings.badgeScale ?? 1);
  r.style.setProperty("--ip-font", (S.settings.insightFont ?? 13) + "px");
  r.style.setProperty("--coord-size", (S.settings.coordSize ?? 12) + "px");
  r.classList.toggle("hide-coords", S.settings.showCoords === false);
  clearBoardArt(UI.boardWrap && UI.boardWrap.querySelector(".board"));
  applyBackground();
}
// Bundled background presets (relative to the extension's analysis page).
const BG_PRESETS = { slate: "backgrounds/bg-slate.webp" };
const BG_TILE_PX = { small: 240, medium: 440, large: 760 };
// Paint the chosen background on the .app shell. "color" paints an HSL tone (with a faint top
// vignette, like the original gradient); a preset/custom image is shown stretched ("cover") or
// repeated ("tile"). Anything unrecognised clears the inline image so the CSS gradient shows.
function applyBackground() {
  const app = document.querySelector(".app");
  if (!app) return;
  if (S.settings.bg === "color") {
    const h = S.settings.bgHue ?? DEFAULT_SETTINGS.bgHue, s = S.settings.bgSat ?? DEFAULT_SETTINGS.bgSat, l = S.settings.bgLight ?? DEFAULT_SETTINGS.bgLight;
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
      await browserAPI.storage.local.set({ settings: S.settings });
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
// Current boards use flat colors only. Clear image-based styling left by older versions.
function clearBoardArt(boardEl) {
  if (!boardEl) return;
  boardEl.classList.remove("cc-board");
  boardEl.style.backgroundImage = "";
  boardEl.style.backgroundSize = "";
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
  const id = currentGameId();
  return updateLibrary(library => library.map(rec => rec.id === id ? { ...rec, solved: true } : rec));
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
      toSq.append(makeBoardBadge("best", MOVE_GRADE_CONFIG.best.max));
    }
    flashSquares([mv.from, mv.to], "good");
    playSanSound(mv.san);
    renderControls(); renderReview();
    setTimeout(() => { if (S.practice === p) practiceAdvance(); }, 1300);
  } else {
    p.fails = (p.fails || 0) + 1;
    flashSquares([mv.from, mv.to], "bad");
    buzzBoard();
    playWrongSound();
    S.selectedSq = null; paintBoard(); renderControls(); renderReview();
  }
}

/* ---------------- Library (left hover-sidebar) ----------------
   Every fully-analyzed game is saved to browserAPI.storage.local under "library". The sidebar
   lives off the left edge and slides in on hover; games can be sorted (recent / your accuracy /
   opponent rating) and filtered (result, time class). Clicking a game re-opens it for analysis. */
// Preserve existing PGN-based library IDs.
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

function analysisSettingsKey() {
  return JSON.stringify(["public-scoring-v4", CALIB?.version, CALIB?.context?.sf19?.candidateVersion, S.settings.ratingMode, S.settings.enginePath, S.settings.engineDepth, S.settings.classifyLines,
    S.settings.engineHash, S.settings.engineSkill]);
}

function completeAnalysis(saved, count) {
  return !!saved && Array.isArray(saved.bests) && saved.bests.length === count
    && saved.bests.every(Boolean) && Array.isArray(saved.evals) && saved.evals.length === count
    && saved.evals.every(e => e && (Number.isFinite(e.cp) || Number.isFinite(e.mate)));
}

function canRestoreAnalysis(saved) {
  return completeAnalysis(saved, S.total + 1) && saved.pgn === S.pgn
    && (!saved.engineBuild || Object.hasOwn(ENGINE_BUILDS, saved.engineBuild))
    && saved.settingsKey === analysisSettingsKey()
    && scoringEvidenceComplete(saved.bests, S.total, CALIB);
}

let _libraryWriteQueue = Promise.resolve();
function updateLibrary(update, analysisWrites = {}) {
  const commit = async () => {
    const stored = await browserAPI.storage.local.get("library");
    const current = Array.isArray(stored.library) ? stored.library : S.library;
    const next = update(current);
    const dropped = next.slice(300);
    const library = next.slice(0, 300);
    await browserAPI.storage.local.set({ ...analysisWrites, library });
    if (dropped.length) await browserAPI.storage.local.remove(dropped.map(rec => "analysis:" + rec.id));
    S.library = library;
    renderLibrary();
  };
  // Every analysis tab shares storage. Serialize read/modify/write across the
  // extension origin so an older tab cannot overwrite games or favorites saved
  // by another tab. The local queue also supports test/non-browser contexts.
  const task = navigator.locks?.request
    ? navigator.locks.request("chess-review-library", commit)
    : (_libraryWriteQueue = _libraryWriteQueue.catch(() => {}).then(commit));
  return task.catch(error => console.warn("library save failed", error));
}
function saveToLibrary() {
  try {
    if (!S.pgn || S.total === 0 || S.analyzing || S.analysisError
      || !completeAnalysis(S, S.total + 1)) return;
    const id = currentGameId();
    const opSide = S.meSide === "w" ? "b" : "w";
    // "solved" = no mistakes to practice (clean game) OR practice was already completed before.
    const noMistakes = practiceSpots().length === 0;
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
    };
    // The heavy analysis (evals + engine lines) is stored under its own key so the library list
    // stays light, and so re-opening a saved game can render instantly WITHOUT re-analyzing.
    const writes = { ["analysis:" + id]: {
      pgn: S.pgn, settingsKey: analysisSettingsKey(), engineBuild: S.activeEngineBuild,
      evals: S.evals, bests: S.bests, multipv: S.analyzedMultipv,
    } };
    return updateLibrary(library => {
      const prev = library.find(game => game.id === id);
      return [{ ...rec, fav: !!prev?.fav, solved: noMistakes || !!prev?.solved }, ...library.filter(game => game.id !== id)];
    }, writes);
  } catch (e) { console.warn("library save failed", e); }
}
async function openLibraryGame(rec) {
  if (rec.id === currentGameId()) return;   // already open
  // Pull the stored analysis so the re-opened game shows up already analyzed (no re-run).
  let analysis = null;
  try { const s = await browserAPI.storage.local.get("analysis:" + rec.id); analysis = s["analysis:" + rec.id] || null; } catch {}
  // Switch in place — no page reload, no black flash. The sidebar stays open (it only closes when
  // the mouse leaves the library area), so you can pick another game right away. Reproduce the exact
  // perspective the game was saved with: prefer a stored flip hint, else the saved meSide — so a
  // re-opened game is never seated the wrong way up regardless of the current stored username.
  const flip = (rec.meta && rec.meta.flip != null) ? rec.meta.flip : (rec.meSide === "b");
  applyGame({ pgn: rec.pgn, meta: { ...(rec.meta || {}), flip }, source: "library", analysis });
}
// Toggle a game's favorite flag and persist it.
function toggleFav(id) {
  return updateLibrary(library => library.map(rec => rec.id === id ? { ...rec, fav: !rec.fav } : rec));
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
function ddField(value, options, onChange, renderOption = (_value, label) => label) {
  const [currentValue, currentLabel] = options.find(([v]) => v === value) || options[0] || ["", "—"];
  const menu = el("div", { class: "lib-dd-menu" },
    ...options.map(([v, t]) => el("button", { class: "lib-dd-opt" + (v === value ? " sel" : ""),
      onclick: (e) => { e.stopPropagation(); onChange(v); } }, renderOption(v, t))));
  const field = el("div", { class: "lib-dd-field" },
    el("button", { class: "lib-dd-btn", onclick: (e) => {
      e.stopPropagation();
      const willOpen = !field.classList.contains("open");
      document.querySelectorAll(".lib-dd-field.open").forEach((d) => d.classList.remove("open"));
      field.classList.toggle("open", willOpen);
    } }, el("span", { class: "lib-dd-cur" }, renderOption(currentValue, currentLabel)), el("span", { class: "lib-dd-chev", html: ICONS.chevron })),
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
// Jump to a variation position while reviewing a game.
function gotoVar(idx) {
  if (S.practice) return;
  stopLineWalk();
  if (!S.variation) return;
  const v = S.variation;
  if (idx < 0 || idx >= v.positions.length) return;
  v.idx = idx; S.selectedSq = null;
  paintBoard(); playSanSound(v.positions[v.idx]?.san); renderEvalBar(); renderPlayers(); renderControls();
  renderReview(); renderEngineCurrent(); requestLiveEval();
}
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
  else if (e.key === "Home") { if (S.analysisMode) gotoVar(0); else gotoMainline(0); }
  else if (e.key === "End") { if (S.analysisMode) gotoVar(S.variation.positions.length - 1); else gotoMainline(S.total); }
  else if (e.key === "Escape") { if (S.analysisMode) exitAnalysis(); }
  else if (e.key === "f" && !e.ctrlKey && !e.metaKey) toggleFlip(); // Ctrl+F must not flip the board
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
  _reanalyzeT = setTimeout(() => {
    startAnalysis();
  }, 400);
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
  S.engineFallbackBuild = null;
  S.activeEngineBuild = null;
  terminateEngines();
  S.evals = new Array(S.total + 1).fill(null);
  S.bests = new Array(S.total + 1).fill(null);
  S.searchPreviews = new Array(S.total + 1).fill(null);
  S._sacCache = []; S._forcedCache = []; S._panelCache = null;
  S.progress = 0;
  S.completed = 0;
  S.analysisError = null;
  S.analyzing = true;
  revRefs = null; statsRefs = null;
  computeDerived();
  renderControls(); renderReview(); renderStats(); renderGraph(); renderMoves();
  if (!S.analysisMode) { renderEvalBar(); renderBestArrow(); renderEngineCurrent(); }

  // Batch analysis defaults to MultiPV=1. Extra lines provide root alternatives for
  // annotations and inspection; the engine panel fills its lines on demand.
  const multipv = Math.max(1, Math.min(ENGINE_MAX_LINES, S.settings.classifyLines || 1));
  S.analyzedMultipv = multipv; // remember how many lines this run computed (for setEngineSetting)
  const nWorkers = engineWorkerCount(S.settings.engineWorkers, S.total + 1);
  // createEngine() readies each worker AND falls back down the build chain if the chosen build can't
  // load — so the whole batch survives e.g. NNUE failing, and S.activeEngineBuild reflects the build
  // actually in use. If no build can start at all, surface it instead of leaving a stuck "Analyzing…".
  const starts = await Promise.allSettled(
    Array.from({ length: nWorkers }, () => createEngine({ Hash: S.settings.engineHash, "Skill Level": S.settings.engineSkill }))
  );
  let engines = starts.filter(r => r.status === "fulfilled").map(r => r.value);
  if (gen !== S.batchGen) { engines.forEach(e => e.terminate()); return; }
  const failed = starts.find(r => r.status === "rejected");
  if (!engines.length) {
    console.error("[Chess Review] no Stockfish build could be started:", failed.reason);
    S.evalEngines = []; S.analyzing = false;
    S.analysisError = failed.reason?.code === "ENGINE_UNSUPPORTED"
      ? failed.reason.message : "the engine could not be started in this browser.";
    S.verdict = "Engine unavailable — couldn't start Stockfish in this browser.";
    flushProgress(gen);
    return;
  }
  // A failed allocation in one worker need not prevent the others reviewing
  // the game. Keep one build throughout the review so its scoring model agrees
  // with every position, even if individual startups took different fallbacks.
  const build = engines[0].buildKey;
  for (const eng of engines) if (eng.buildKey !== build) eng.terminate();
  engines = engines.filter(eng => eng.buildKey === build);
  if (build) {
    S.engineFallbackBuild = build === S.settings.enginePath ? null : build;
    setActiveEngineBuild(build);
  }
  if (failed) console.warn("[Chess Review] continuing with a smaller engine pool:", failed.reason);
  S.evalEngines = engines;

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
      const terminal = terminalScore(S.positions[i].fen, i);
      const res = terminal ? { score: terminal, bestmove: null, pv: "", lines: [] }
        : await analyseCalibratedPosition(eng, {fen: S.positions[i].fen, history: searchHistory(S.positions, i),
          played: i < S.total ? S.positions[i + 1].from + S.positions[i + 1].to + (S.positions[i + 1].promotion || "") : null,
          settings: S.settings, calibration: CALIB,
          needMovesOnly: S.settings.ratingMode === "moves" || !Number(S.players.w?.rating) || !Number(S.players.b?.rating),
          onProgress: preview => {
          if (gen !== S.batchGen) return;
          S.searchPreviews[i] = preview;
          requestProgress(gen);
        }});
      if (gen !== S.batchGen) return;
      S.bests[i] = res;
      S.searchPreviews[i] = null;
      // Terminal positions (mate/stalemate) are decided from the board — not from the engine's "mate 0".
      S.evals[i] = terminal || whiteRel(res.score, S.positions[i].fen);
      if (i > 0) S.completed++;
      while (contig + 1 <= S.total && S.bests[contig + 1]) contig++;
      S.progress = Math.max(0, contig);
      requestProgress(gen);
    }
  }
  try {
    await Promise.all(engines.map((e) => worker(e)));
  } catch (e) {
    if (gen !== S.batchGen) return;
    console.error("[Chess Review] engine stopped during batch analysis:", e);
    terminateEngines();
    S.searchPreviews.fill(null);
    S.analyzing = false;
    S.analysisError = "the engine stopped responding.";
    S.verdict = "Analysis stopped before the game was complete.";
    flushProgress(gen);
    renderReview();
    renderStats();
    if (!S.analysisMode) renderEngineCurrent();
    return;
  }
  if (gen !== S.batchGen) return;            // a newer analysis took over
  terminateEngines();
  S.analyzing = false;
  S.progress = S.total;
  S.completed = S.total;
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
  const positions = buildPositions(payload.pgn);
  if (positions.length < 2) throw new Error("Load a game with moves to review. Standalone positions are not supported.");

  // Tear down anything tied to the previous game.
  clearTimeout(_reanalyzeT);
  resetLiveEngine();
  S.batchGen++;                 // invalidate any in-flight analysis workers
  S.engineFallbackBuild = null;
  S.activeEngineBuild = null;
  terminateEngines();
  if (S.helperEngine) { try { S.helperEngine.terminate(); } catch {} S.helperEngine = null; }
  S.threatCache.clear();
  if (S.autoTimer) { clearInterval(S.autoTimer); S.autoTimer = null; }
  stopLineWalk();
  if (S.practice && S.practice.rollT) clearTimeout(S.practice.rollT);
  clearDemoTimers(); removeMoveCallout();
  S.practice = null; S.practiceHint = null;
  S.analysisMode = false; S.variation = null; S.liveToken++;
  S.selectedSq = null; S.userArrows = []; S.userMarks = []; S.lineWalking = false;
  revRefs = null; statsRefs = null; _lastCommentKey = -1; _ipSig = null; S._turnPly = null;
  S._lastEngineLines = null;
  _movesSig = null; _movesClassSig = null;

  applySettings();

  S.analyzing = true;
  S.pgn = payload.pgn;
  S.meta = payload.meta || {};
  S.headers = parseHeaders(payload.pgn);
  S.clocks = parseClocks(payload.pgn);
  S.positions = positions;
  S.total = S.positions.length - 1;
  S.evals = new Array(S.total + 1).fill(null);
  S.bests = new Array(S.total + 1).fill(null);
  S.searchPreviews = new Array(S.total + 1).fill(null);
  S._sacCache = []; S._forcedCache = []; S._panelCache = null;
  S.progress = 0;
  S.completed = 0;
  S.analysisError = null;
  S.openingHeader = deriveOpening(S.headers);
  S.opening = S.openingHeader;
  const { players, meSide } = derivePlayers(S.headers, S.meta, S.username);
  S.players = players;
  const flip = S.meta && S.meta.flip;
  const side = flip === true ? "b" : flip === false ? "w" : meSide;
  S.meSide = side; S.flipped = side === "b"; S.idx = 0;

  // Restore saved game analysis or start fresh
  let saved = payload.analysis;
  if (saved == null && !("analysis" in payload)) {
    try { const k = "analysis:" + currentGameId(); const s = await browserAPI.storage.local.get(k); saved = s[k] || null; } catch {}
  }
  const restored = canRestoreAnalysis(saved);
  if (restored) {
    S.evals = saved.evals;
    S.bests = saved.bests;
    S.analyzedMultipv = saved.multipv || null;
    S.activeEngineBuild = saved.engineBuild || S.settings.enginePath;
    S.analyzing = false;
    S.progress = S.total;
    S.completed = S.total;
  }

  document.title = `${players.w.name} vs ${players.b.name} — Chess Review`;
  computeDerived();
  renderAll();
  if (!S.qbreakExpanded) reflowAccuracy(false);
  renderLibrary();
  requestAnimationFrame(alignPlayers);
  rememberReviewJob();
  if (!restored) startAnalysis();
}

/* ---------------- Start ---------------- */
// Desktop auto layout preserves the v7 composition; narrow windows use the responsive grid.
// Desktop and custom layouts are fitted as a whole under the 60 px top bar to the WINDOW. Not the
// monitor (screen.*): a monitor-based zoom cuts off the right column as soon as the window isn't
// maximized, or is dragged to a smaller monitor after opening.
//
// The viewport is measured in device-independent pixels (innerWidth × current zoom), since
// innerWidth alone shrinks and grows with the zoom we are about to set. We use real Chrome zoom (not
// CSS zoom, which would throw off the pointer-coordinate maths the panel dragging relies on).
const TOPBAR_H = 60;                 // .topbar height in styles.css
const MIN_ZOOM = 0.5, MAX_ZOOM = 2;  // below 50% the text is unreadable; above 200% it balloons
let _zoomTabId = null;
let _defaultZoom = 1;
let _fittedDip = null;               // viewport size (device-independent px) the zoom was last fitted to
let _zoomFitQueue = Promise.resolve();
let _zoomInit = null;
function desktopLayoutFor(dipW, dipH) {
  return dipW / _defaultZoom >= 1100 && dipH / _defaultZoom >= 520;
}
function desktopZoomFor(dipW, dipH) {
  return fittedZoomFor(DEFAULT_LAYOUT, dipW, dipH);
}
function layoutPageSize(layout) {
  const { maxR, maxB } = layoutExtent(layout);
  const defaults = layoutExtent(DEFAULT_LAYOUT);
  const desktopSized = maxR >= defaults.maxR && maxB >= defaults.maxB;
  // Keep the desktop's breathing room on default-sized saved canvases too. Previously a snapshot
  // reopened against 1818 × 1006, while Reset fitted 1832 × 1020 (91% versus 89%).
  // Smaller arrangements (including snapshots of the narrow responsive grid) retain
  // their own extent, so unlocking one never creates a desktop-width canvas.
  return { pageW: Math.max(desktopSized ? 1832 : 0, maxR + CANVAS_MARGIN),
    pageH: Math.max(desktopSized ? 1020 : 0, TOPBAR_H + maxB + CANVAS_MARGIN) };
}
function fittedZoomFor(layout, dipW, dipH) {
  const { pageW, pageH } = layoutPageSize(layout);
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM,
    Math.floor(Math.min((dipW - 2) / pageW, (dipH - 2) / pageH) * 100) / 100));
}
function targetZoomFor(dipW, dipH) {
  return fittedZoomFor(S.layout, dipW, dipH);
}
function fitTabZoom(force = false) {
  // A reset can overlap a resize or startup. Never pair an old getZoom result
  // with viewport dimensions already changed by another fit.
  const next = _zoomFitQueue.catch(() => {}).then(() => performTabZoomFit(force));
  _zoomFitQueue = next;
  return next;
}
async function performTabZoomFit(force) {
  if (_zoomTabId == null) return;
  const z = (await browserAPI.tabs.getZoom(_zoomTabId)) || 1;
  // CSS viewport dimensions are rounded after browser zoom. Recover whole DIP pixels so
  // reopening a 920px-high window at 90% cannot drift to 89% (1022 × .9 = 919.8).
  const w = Math.round(innerWidth * z), h = Math.round(innerHeight * z);
  // Same device-pixel size as last time → this resize came from a zoom change (the user's Ctrl+/-,
  // our own setZoom, or another tab sharing the origin zoom), not from the window. Leave it.
  if (!force && _fittedDip && Math.abs(w - _fittedDip.w) < 3 && Math.abs(h - _fittedDip.h) < 3) return;
  const desktop = !isCustomLayout() && desktopLayoutFor(w, h);
  UI.canvas.classList.toggle("desktop-layout", desktop);
  applyLayout();
  requestAnimationFrame(alignPlayers);
  const target = isCustomLayout() ? targetZoomFor(w, h) : desktop ? desktopZoomFor(w, h) : _defaultZoom;
  // Only set it when it's off, so an unchanged window never triggers Chrome's zoom bubble.
  if (Math.abs(z - target) > 0.005) await browserAPI.tabs.setZoom(_zoomTabId, target);
  _fittedDip = { w, h };
}
// Isolate zoom before fitting, so two analysis windows on different monitors keep their own fit.
// Browsers rejecting per-tab scope retain their existing scope.
async function initTabZoom() {
  try {
    if (!browserAPI?.tabs?.getCurrent) return;
    if (!_zoomInit) _zoomInit = (async () => {
      const tab = await browserAPI.tabs.getCurrent();
      if (!tab || tab.id == null) return;
      const settings = await browserAPI.tabs.getZoomSettings(tab.id);
      _defaultZoom = settings.defaultZoomFactor || 1;
      // Keep a resized analysis window from changing other extension tabs' zoom.
      await browserAPI.tabs.setZoomSettings(tab.id, { scope: "per-tab", mode: "automatic" }).catch(() => {});
      _zoomTabId = tab.id;
    })();
    await _zoomInit;
    await fitTabZoom(true);
  } catch { _zoomInit = null; return; }
  // Refit after the window is resized, maximized or moved to a different monitor. Debounced so a
  // drag-resize zooms once when it settles, not on every frame. Registered once per page.
  if (_zoomResizeBound) return;
  _zoomResizeBound = true;
  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => fitTabZoom().catch(() => {}), 200);
  });
}
let _zoomResizeBound = false;
// Earlier versions zoomed the analysis page themselves (90–127%), and Chrome remembers that zoom for
// the extension's origin. The automatic layout is built for the browser's own zoom, so give it back
// once when an older install is migrated.
async function resetLegacyZoom() {
  try {
    if (!browserAPI?.tabs?.getCurrent) return;
    const tab = await browserAPI.tabs.getCurrent();
    if (!tab || tab.id == null) return;
    await browserAPI.tabs.setZoomSettings(tab.id, { scope: "per-origin", mode: "automatic" });
    const [z, zs] = await Promise.all([browserAPI.tabs.getZoom(tab.id), browserAPI.tabs.getZoomSettings(tab.id)]);
    if (Math.abs(z - (zs.defaultZoomFactor || 1)) > 0.005) await browserAPI.tabs.setZoom(tab.id, 0);
  } catch {}
}
(async function main() {
  try {
    await resetSettingsForRelease({ reason: "startup" });
    // Only the job + stored prefs are needed to build and show the UI. The opening book (~690 KB)
    // and the calibration file are only consumed once scoring/opening refinement runs, so we load
    // them in parallel and don't block the first paint on them — buildUI() can run as soon as the
    // job and settings are in, while the book is still downloading.
    const dataReady = Promise.all([loadBook(), loadCalibration()]);
    const [payload, store] = await Promise.all([loadJob(), browserAPI.storage.local.get(["settings", "username", "layout", "layoutMode", "layoutVersion", "library"])]);
    S.library = Array.isArray(store.library) ? store.library : [];
    S.settings = { ...DEFAULT_SETTINGS, ...(store.settings || {}) };
    const visualAssetsMigrated = migrateVisualAssetSettings(S.settings);
    migrateEngineSettings(S.settings);
    if (visualAssetsMigrated || S.settings.enginePath !== store.settings?.enginePath) {
      await browserAPI.storage.local.set({ settings: S.settings });
    }
    delete S.settings.wrongSound; // older selectable mistake cues were removed
    { const lm = { prikker: "dots", hop: "bounce", "bølge": "wave" }; if (lm[S.settings.loaderStyle]) S.settings.loaderStyle = lm[S.settings.loaderStyle]; } // migrate renamed loader keys
    if (S.settings.bg === "default" || S.settings.bg === "ember") S.settings.bg = "color";
    if (S.settings.coach === "old_soviet_rework") S.settings.coach = "old_soviet"; // the rework became the canonical "Old Soviet"
    S.settings.density = "compact"; // density picker removed — compact is the only layout now
    // New default coach is Old Soviet with plain replies — bump anyone still on the old "mentor" default
    // (one-time, so a later deliberate choice of any coach/voice sticks).
    if (!S.settings.coachDefaulted) {
      if (!store.settings || store.settings.coach == null || store.settings.coach === "mentor") {
        S.settings.coach = "old_soviet"; S.settings.coachPlain = true;
      }
      S.settings.coachDefaulted = true;
      browserAPI.storage.local.set({ settings: S.settings });
    }
    // The avatar always reflects the chosen coach; the reply bank loads only when special replies are on.
    S.coach = S.settings.coachPlain ? null : await loadCoach(S.settings.coach);
    // One-time bump of the old shallow default depth (12) to the new classification depth.
    // Keyed on a flag so a deliberate later choice of a low depth isn't overridden again.
    if (!S.settings.depthBumped) {
      if ((store.settings?.engineDepth ?? 12) <= 12) S.settings.engineDepth = Math.max(S.settings.engineDepth, 16);
      S.settings.depthBumped = true;
      browserAPI.storage.local.set({ settings: S.settings });
    }
    // The 5-line option was removed — clamp any stored value to the new max.
    if (S.settings.engineLines > ENGINE_MAX_LINES) { S.settings.engineLines = ENGINE_MAX_LINES; browserAPI.storage.local.set({ settings: S.settings }); }
    // Use the saved layout if it matches the current version; otherwise the new default.
    const useStored = store.layoutVersion === LAYOUT_VERSION && store.layout;
    S.layout = useStored ? { ...structuredClone(DEFAULT_LAYOUT), ...store.layout } : structuredClone(DEFAULT_LAYOUT);
    S.layoutMode = useStored && store.layoutMode === "custom" ? "custom" : "auto";
    if (!useStored) saveLayout();
    if (store.layoutVersion != null && store.layoutVersion !== LAYOUT_VERSION) await resetLegacyZoom();
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
        const s = await browserAPI.storage.local.get(k);
        saved = s[k] || null;
      } catch {}
      payload.analysis = saved;
    }
    buildUI();               // built once; switching games re-uses it (no full page reload)
    await applyGame(payload);
    // Two-phase load: now that initialization succeeded, remove the job data so it doesn't accumulate.
    const jobId = location.hash.replace(/^#/, "");
    if (jobId && rememberReviewJob()) {
      await browserAPI.storage.local.remove(`job:${jobId}`);
    }
    // Fit the desktop composition or custom canvas; narrow windows retain the responsive grid.
    initTabZoom();
    requestAnimationFrame(alignPlayers); // measure the board after the first layout
  } catch (err) {
    const e = document.getElementById("error");
    e.hidden = false;
    e.textContent = "Error: " + err.message;
    console.error(err);
  }
})();
