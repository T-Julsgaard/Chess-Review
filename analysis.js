// analysis.js — Chess Review analysis page.
// Parses the PGN, runs Stockfish through the game and fills every panel with real
// data: eval bar/graph, accuracy, mistake classification, engine lines (MultiPV),
// opening (from the PGN), player/clock/result. Board + 2 piece styles + theme are selectable.

import { Chess } from "./lib/chess.js";
import { Engine } from "./engine/uci.js";
import { flagCodeForCountryId, countryNameForId } from "./flags.js";
import { BADGE_FONTS, MOVE_GRADE_CONFIG, moveGrade, gradeText, gradeLabel, gradeSvg } from "./move-grades.js";
import { puzzleResultBadge } from "./lib/puzzle-badge.js";
import { matedKingSquare, mateMark } from "./lib/mate-mark.js";
import { moveAnimationDuration, MOVE_ANIMATION_EASING } from "./lib/move-animation.js";
import { CATEGORY_LABEL_FONT, categoryLabelPng } from "./lib/category-label.js";
import { browserAPI as platformAPI } from "./browser-compat.js";
import { resetSettingsForRelease } from "./release-settings.js";
import { expectedPoints, SF19_OUTCOME } from "./lib/public-scoring.js";
import { calibratedReview, scoringEvidenceComplete } from "./lib/calibrated-review.js";
import { gameStatistics, GAME_PHASES } from "./lib/game-statistics.js";
import { PANEL_DESIGNS, panelDesign, normalizePanelDesigns } from "./lib/panel-designs.js";
import { UI_SETUPS, MODERN_LAYOUT } from "./lib/ui-setups.js";
import { createOverviewReveal } from "./lib/overview-reveal.js";
import { createAccuracyNavigation } from "./lib/accuracy-navigation.js";
import { phasePerformance } from "./lib/phase-performance.js";
import { analyseCalibratedPosition } from "./lib/calibrated-search.js";
import { loadLearningWorkspace, presentationFor } from "./lib/learning-loader.js";
import { mountLearningAnnouncement } from "./lib/learning-announcement.js";
import { panelScale, panelGroupBounds, scalePanelGroup, movePanelGroup } from "./lib/panel-layout.js";
import { fullHdReferenceLayout, viewportGrowth } from "./lib/full-hd-layout.js";
import { createScreenPreviewContext, loadScreenPreviewController } from "./lib/screen-previews.js";
import { rememberAnalyzedGame, historyGame } from "./lib/player-history.js";

const screenPreview = createScreenPreviewContext(location);
const blankLaunch = new window.URLSearchParams(location.search).get("workspace") === "blank";
// Previews use isolated storage and their actual iframe viewport at 100%.
const browserAPI = screenPreview ? {...platformAPI,storage:{...platformAPI.storage,local:screenPreview.storage}} : platformAPI;

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
let _calibrationPromise = null;
function validCalibration(data) {
  return data?.schema === "chess-review-public-calibration-v1" && typeof data.version === "string" && !!data.version
    && data.quality?.outcome?.schema === "human-outcome-v1" && Number.isFinite(data.quality.outcome.slopePerPawn) && data.quality.outcome.slopePerPawn > 0
    && data.quality?.choice?.schema === "human-choice-v1" && !!data.quality.candidateVersion
    && data.context?.model?.schema === "fullgame-equivalent-context-v1" && !!data.context.candidateVersion
    && data.context?.sf19?.model?.schema === "fullgame-equivalent-context-v1" && !!data.context.sf19.candidateVersion
    && ["sf18","sf19"].every(build => data.movesOnly?.[build]?.model && !!data.movesOnly[build].candidateVersion)
    && ["good","inacc","mistake","blunder"].every(key => Number.isFinite(data.clsWp?.[key]));
}
async function loadCalibration() {
  if (validCalibration(CALIB)) return CALIB;
  if (!_calibrationPromise) _calibrationPromise = (async () => {
    try {
      const response = await fetch(browserAPI.runtime.getURL("data/calibration.json"));
      if (!response.ok) throw Error("Analysis data resource failed");
      const data = await response.json();
      if (!validCalibration(data)) throw Error("Analysis data is invalid");
      CALIB = data; return data;
    } catch (cause) {
      CALIB = null;
      const error = Error("Required analysis data could not be loaded. Please retry analysis.");
      error.code = "CALIBRATION_DATA"; error.cause = cause; throw error;
    }
  })();
  const pending = _calibrationPromise;
  try {return await pending;} finally {if(_calibrationPromise === pending)_calibrationPromise = null;}
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
  porcelain: ["#f1eee6", "#64849a"], // warm cream and muted blue
};
// Display names are separate from persisted keys so existing board preferences keep working.
const BOARD_THEME_LABEL = { green: "Meadow", walnut: "Hazel", slate: "Mist", ocean: "Harbor",
  ink: "Graphite", maple: "Honeywood", emerald: "Forest", coral: "Terracotta", lavender: "Lavender",
  patina: "Patina", mulberry: "Mulberry", reed: "Reed", dusk: "Dusk", plum: "Plum", porcelain: "Porcelain" };
const ACCENTS = {
  "#7fb45f": { accent: "#7fb45f", strong: "#6aa14a", ink: "#11210a" },
  "#5a8bef": { accent: "#5a8bef", strong: "#4574db", ink: "#06122e" },
  "#d9a544": { accent: "#d9a544", strong: "#c4902f", ink: "#2a1c05" },
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
// The move-quality page keeps the complete category list, with Book last.
const QBREAK_FULL = ["brilliant","great","best","excellent","good","inacc","mistake","miss","blunder","book"];
const QBREAK_SUMMARY = ["brilliant","great","best","inacc","mistake","miss","blunder"];
const ACCURACY_PAGES = ['Accuracy', 'Move quality', 'Advanced'];
const NOTEWORTHY = new Set(["brilliant","great","inacc","mistake","miss","blunder"]);
// Explanation for each category (shown as a tooltip in the accuracy panel). The classifier
// (computeDerived → classifyMove) works on the engine's eval in PAWNS: "loss" is how much the
// eval drops after your move vs. the best continuation; a "sacrifice" is a real, voluntary
// give-up of material (not a recapture/trade), detected on the board.
const QUALITY_DESC = {
  brilliant: "A strong, sound piece sacrifice with a lasting material investment. Ordinary trades, offers repaid by a short capture sequence, and unnecessary sacrifices in clearly winning positions do not count.",
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
  classifyLines: "How many candidate moves the engine analyzes and shows in the panel. You can remove displayed lines in the panel. Results appear after the first analysis line. Additional lines run in the background to check move categories, including Great. Background work uses one worker, pauses between positions and yields while you interact. Accuracy and rating scores stay unchanged.",
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
  if (settings.accent === "#c77edb") {
    settings.accent = "#7fb45f";
    changed = true;
  }
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
  ...Object.fromEntries(PANEL_DESIGNS.map(design => [design.setting, design.default])),
  categoryNames: {},
  layoutGridSize: 16,
  uiSetup: "custom", uiSetupBase: "", // Custom retains its starting preset for resets.
  theme: "dark", accent: "#7fb45f", accentCustom: "#9b72d0", density: "compact",
  evalView: "both", mlStyle: "rows", badgeStyle: "icon", badgeScale: 1,
  badgeFont: "spacemono", badgeTooltip: "off",
  // Eval-graph look (see renderGraph), eval-BAR look (see renderEvalBar) and the Insight-panel text size (px).
  graphStyle: "area", barStyle: "gradient", insightFont: 16, nativeSizingVersion: 1,
  // Board coordinate labels (the a–h / 1–8 ticks in the squares' corners): on/off + size in px.
  showCoords: true, coordSize: 12,
  // App background: "color" (a tone picked with the HSL sliders), a bundled preset (slate / olive
  // = "Dark", a fixed near-black tone), or "custom" (uploaded). bgFit is "cover" (stretched) or "tile" (repeated
  // at bgTile size). bgCustom holds the uploaded data URL. bgHue/Sat/Light define the "color" tone.
  // Default = a near-black neutral colour tone (HSL 0/0/8).
  bg: "color", bgFit: "tile", bgTile: "large", bgCustom: null,
  bgHue: 0, bgSat: 0, bgLight: 8,
  // Commentary coach (data/coaches/<id>.json) — drives the animated avatar that's shown.
  // coachPlain toggles only the reply VOICE: false = the coach's special phrasing,
  // true = neutral "plain" commentary (the coach still appears and reacts on the board).
  coach: "old_soviet", coachPlain: true,
  // Start with Honeywood (persisted as "maple") and bundled Cburnett pieces.
  boardTheme: "maple", pieceStyle: "image", sound: true,
  // Master volume (0–100) applied to every sound the extension plays.
  soundVolume: 50,
  puzzleSuccessSound: "soft-retro",
  puzzleIncorrectSound: "default",
  // Custom board colours (used when boardTheme === "custom" — the colour-picker chip, shown first).
  boardCustomLight: "#f9f9f9", boardCustomDark: "#e1a652",
  // Per-event sound mapping + knobs (see FX_SOUNDS / SOUND_EVENTS). snd = an FX_SOUNDS id or "default"
  // (the original cue); pitch in semitones; speed is a duration multiplier (1 = unchanged), volume 0–100.
  soundFx: {
    move:    { snd: "default", pitch: 0, speed: 1, volume: 100 },
    capture: { snd: "default", pitch: 0, speed: 1, volume: 100 },
    check:   { snd: "default", pitch: 0, speed: 1, volume: 100 },
    castle:  { snd: "default", pitch: 0, speed: 1, volume: 100 },
    puzzleSuccess: { pitch: 0, speed: 1, volume: 100 },
    puzzleIncorrect: { pitch: 0, speed: 1, volume: 100 },
    runStart: { volume: 100 },
  },
  // Best-move arrow (the engine's recommendation in the current position)
  bestArrow: true, bestArrowColor: "#85ae4a", arrowOpacity: 0.65, arrowShaft: 0.2, arrowHead: 0.4,
  // The opponent's best move as if it were their turn.
  showThreat: false, threatArrowColor: "#E89B3C",
  // Move animation (sliding piece on single-step navigation). 1 = slow, 10 = fast.
  moveAnim: true, animSpeed: 7,
  learningTransition: "morph3",
  // Display the selected analysis lines unless the user adds or removes lines in the panel.
  // Extra candidates are searched after scoring or on demand without re-analyzing the game.
  // Default SF18 searches match the published depth16/Hash16 quality model.
  engineLines: 2, engineDepth: 16, enginePath: "nnue", engineHash: 16, engineSkill: 20,
  // Parallel analysis workers: independent single-threaded Stockfish instances that pull
  // positions from a shared queue. Each position is still searched identically (cold, same
  // depth/lines), so results are unchanged — only the wall-clock is parallelized. Default ≈
  // (CPU cores − 1), capped at 4. Manual selections are respected.
  engineWorkers: engineWorkerCount(),
  // Extra lines serve annotation and candidate inspection. Calibrated SF18 scores use one line.
  classifyLines: 2,
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
  for (const key of ['engineLines', 'classifyLines']) {
    if (settings[key] != null) settings[key] = normalizeEngineLineCount(settings[key]);
  }
  // Upgrade the former single-line default once; subsequent explicit choices stick.
  if (!settings.backgroundAnalysisVersion) {
    if (settings.classifyLines === 1 || settings.classifyLines == null) settings.classifyLines = 2;
    settings.backgroundAnalysisVersion = 1;
  }
  // Replace the former independent panel preference with the analysis count once.
  // Later additions or removals in the panel remain saved across reloads.
  if (!settings.analysisPanelLinesVersion) {
    settings.engineLines = settings.classifyLines ?? DEFAULT_SETTINGS.classifyLines;
    settings.analysisPanelLinesVersion = 1;
  }
}
// The engine panel shows up to this many candidate lines (searched on demand for the viewed position).
const ENGINE_MAX_LINES = 3;
function normalizeEngineLineCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(1, Math.min(ENGINE_MAX_LINES, Math.trunc(count))) : 1;
}
// Best-move arrow color — a muted hint green.
const ARROW_COLOR = "#85ae4a";
// User arrow color — yellow/orange.
const USER_ARROW_COLOR = "#E89B3C";
// Default placement of the movable modules (free canvas). Saved per user.
// When LAYOUT_VERSION is bumped, saved layouts are reset to this default once.
// Responsive placement is the default. Custom layouts start from the current screen.
// These boxes preserve saved canvas coordinates and hidden-module fallback geometry.
// Automatic placement uses the responsive CSS grid at 100% browser zoom.
const LAYOUT_VERSION = 9;
// Exported panel placements, with the expanded Accuracy baseline and content scales.
const DEFAULT_LAYOUT = {
  board: { x: 350.1796861323378, y: 0, w: 853.9946785853867, h: 970.3540508500623, scale: 1.038922966648889 },
  evalbar: { x: 292, y: 60.25753206563556, w: 31.16768899946667, h: 847.7611407854935, scale: 1.038922966648889 },
  controls: { x: 1223.2642077838934, y: 855.2197936272515, w: 315.2415410516622, h: 54.913042634805684, scale: 1.0169081969408462 },
  coach: { x: 1609.5369298642804, y: 0, w: 195.24637381264242, h: 199.3140066004058, scale: 1.0169081969408462 },
  review: { x: 1231.3232769808528, y: 61.01449181645075, w: 618.607924839354, h: 137.03340107200881, scale: 1.0169081969408462 },
  moves: { x: 1229.3656569655382, y: 219.65217053922274, w: 305.07245908225383, h: 426.0845345182144, scale: 1.0169081969408462 },
  accuracy: { x: 1550.480058063144, y: 219.65217053922274, w: 298.9710099006087, h: 514.5555476520681, scale: 1.0169081969408462 },
  graph: { x: 1229.3656569655382, y: 659.9734198146091, w: 305.07245908225383, h: 181.0096590554706, scale: 1.0169081969408462 },
  engine: { x: 1550.480058063144, y: 748.4444329484627, w: 298.9710099006087, h: 181.00965905547062, scale: 1.0169081969408462 },
  learn: { x: 1550.480058063144, y: 943.6908067611051, w: 298.9710099006087, h: 54.913042634805684, scale: 1.0169081969408462 },
};
const GRIP_SVG = `<svg viewBox="0 0 12 12" width="12" height="12"><path d="M11 4 4 11M11 8 8 11" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;
const HANDLE_SVG = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="5" cy="4" r="1.3"/><circle cx="11" cy="4" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="12" r="1.3"/><circle cx="11" cy="12" r="1.3"/></svg>`;
// Engine depth/lines are now controlled via S.settings (engineDepth/engineLines).
const LAYOUT_GRIDS = [[16, 'Standard'], [8, 'Fine'], [2, 'Extra fine']];
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
    // Preserve board orientation and only an identified playing side. A flipped
    // anonymous import must remain anonymous when reopened through a share link.
    const meta = { ...S.meta, flip: S.flipped, myName: S.playerKnown === false ? "" : (S.players?.[S.meSide]?.name) || S.username || "" };
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
const PUZZLE_SUCCESS_SOUNDS = [
  ["soft-retro", "Soft Retro", "sounds/success/04-soft-retro.wav", .25],
  ["warm-marimba", "Warm Marimba", "sounds/success/01-warm-marimba.wav"],
  ["crystal-chime", "Crystal Chime", "sounds/success/02-crystal-chime.wav"],
  ["gentle-piano", "Gentle Piano", "sounds/success/03-gentle-piano.wav"],
  ["airy-bloom", "Airy Bloom", "sounds/success/05-airy-bloom.wav"],
];
const PUZZLE_INCORRECT_SOUNDS = [
  ["default", "Try Again", "sounds/Wrong/Incorrect.mp3"],
  ["soft-descent", "Soft Descent", "sounds/Wrong/soft-descent.wav"],
  ["retro-wobble", "Retro Wobble", "sounds/Wrong/retro-wobble.wav"],
  ["wooden-knock", "Wooden Knock", "sounds/Wrong/wooden-knock.wav"],
];
function puzzleSuccessChoice() {
  const id = S.settings.puzzleSuccessSound;
  return id === "none" ? null : PUZZLE_SUCCESS_SOUNDS.find(([key]) => key === id) || PUZZLE_SUCCESS_SOUNDS[0];
}
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
// Per-event config { snd, pitch, speed, volume }, with safe fallbacks for old/missing stored settings.
function fxConfig(ev) {
  const c = (S.settings.soundFx && S.settings.soundFx[ev]) || {};
  let snd = c.snd === "default" || _fxFileById(c.snd) ? c.snd : "default";
  if (ev === "puzzleSuccess") snd = puzzleSuccessChoice()?.[0] || "none";
  if (ev === "puzzleIncorrect") {
    const id = S.settings.puzzleIncorrectSound;
    // Preserve On/Off choices saved by the earlier toggle.
    snd = id === false || id === "none" ? "none" : PUZZLE_INCORRECT_SOUNDS.some(([key]) => key === id) ? id : "default";
  }
  const volume = c.volume == null || !Number.isFinite(+c.volume) ? 100 : Math.max(0, Math.min(100, +c.volume));
  return { snd, pitch: Number.isFinite(+c.pitch) ? +c.pitch : 0, speed: +c.speed > 0 ? +c.speed : 1, volume };
}
function setFx(ev, field, val) {
  if (field === "snd" && (ev === "puzzleSuccess" || ev === "puzzleIncorrect")) {
    const key = ev === "puzzleSuccess" ? "puzzleSuccessSound" : "puzzleIncorrectSound";
    S.settings[key] = val;
    return writeSettings({ [key]: val });
  }
  // Write fresh objects rather than mutating in place — S.settings.soundFx may still be aliased to the
  // shared DEFAULT_SETTINGS object (settings are loaded with a shallow spread).
  const fx = { ...(S.settings.soundFx || {}) };
  fx[ev] = { ...fxConfig(ev), [field]: val };
  if (ev === "puzzleSuccess" || ev === "puzzleIncorrect" || ev === "runStart") delete fx[ev].snd;
  S.settings.soundFx = fx;
  return writeSettings({ soundFx: { [ev]: { [field]: val } } });
}
// Resolve an event's chosen sound to a packaged URL.
function fxUrl(ev) {
  const cfg = fxConfig(ev);
  if (cfg.snd === "none") return null;
  if (ev === "puzzleSuccess") return _url(puzzleSuccessChoice()[2]);
  if (ev === "puzzleIncorrect") return _url(PUZZLE_INCORRECT_SOUNDS.find(([id]) => id === cfg.snd)[2]);
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
  const cfg = fxConfig(ev);
  const url = fxUrl(ev);
  if (!url) return;
  const volume = ev === "puzzleSuccess" ? puzzleSuccessChoice()?.[3] ?? 1 : 1;
  triggerAudio(url, cfg.pitch, cfg.speed, volume * cfg.volume / 100);
}
function triggerAudio(url, pitch = 0, speed = 1, volume = 1) {
  const ctx = audioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  processedFx(url, pitch, speed).then((fx) => {
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = fx.buffer; src.playbackRate.value = fx.rate;
    gain.gain.value = masterVol() * volume;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }).catch(() => {});
}
function playPuzzleSuccess(preview = false) {
  if (!preview && !S.settings.sound) return;
  triggerFx("puzzleSuccess");
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
// Puzzles and practice share the selected incorrect-puzzle effect and tuning.
function playWrongSound() {
  if (!S.settings.sound) return;
  triggerFx("puzzleIncorrect");
}

/* ---------------- State ---------------- */
const S = {
  pgn: "", headers: {}, meta: {}, blank: false,
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
  analyzing: true, progress: 0, completed: 0, analysisError: null, userArrows: [], userMarks: [], qbreakExpanded: false, accuracyPage: 0, originalAccuracyExpanded: false,
  restoredAnalysis: false, progressiveAccuracy: false,
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
  // "Play best moves from here": auto-walk that analyzes missing positions and plays the engine's
  // best move until mate/draw or the user takes over. Token invalidates an in-flight walk.
  bestWalkToken: 0, bestWalking: false,
  // Commentary coach: the loaded phrase bank (null = plain lines). _turnPly caches the game's
  // biggest-swing ply for the "turning point" line.
  coach: null, _turnPly: null,
  // Mistake-practice session (null when inactive). "Show the threat" helper engine + cache.
  practice: null, helperEngine: null, helperEnginePromise: null, helperEngineGeneration: 0, threatCache: new Map(),
  // Practice hint squares (the engine's best move) — available after the first failed attempt.
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
const overviewReveal = createOverviewReveal({requestFrame: callback => requestAnimationFrame(callback), cancelFrame: id => cancelAnimationFrame(id)});
const phaseReveals = Object.fromEntries(GAME_PHASES.map(phase => [phase,
  createOverviewReveal({requestFrame: callback => requestAnimationFrame(callback), cancelFrame: id => cancelAnimationFrame(id)})]));

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
  if(screenPreview)return structuredClone(screenPreview.job);
  const hash = location.hash.replace(/^#/, "");
  const jobId = hash || (blankLaunch ? "blank-workspace" : "");
  if (!jobId) throw new Error("No analysis job specified.");

  const key = `job:${jobId}`;
  // The one-shot storage handoff is removed after startup. Keep the current
  // game's lightweight payload in this tab's session so Reload still works,
  // including after the user switches to a different library game.
  try {
    const session = JSON.parse(window.sessionStorage.getItem(key));
    if (session && typeof session.pgn === "string") return session;
  } catch { /* Unavailable or corrupt session storage: use the launch handoff. */ }
  if(blankLaunch&&!hash)return {source:"blank",analysis:null};
  const data = await browserAPI.storage.local.get(key);
  const payload = data[key];
  if (!payload) throw new Error("Analysis data not found (open via the popup).");
  // NOTE: Do NOT remove the job here — two-phase load: keep it until applyGame succeeds,
  // so a failed initialization (corrupt PGN, engine crash, etc.) leaves the data for a retry.
  return payload;
}
function rememberReviewJob() {
  if(screenPreview)return false;
  const jobId = location.hash.replace(/^#/, "") || (blankLaunch ? "blank-workspace" : "");
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
function parseClocks(pgn, precise = false) {
  const chess = new Chess(); chess.loadPgn(pgn);
  const comments = new Map(chess.getComments().map(({ fen, comment }) => [fen, comment]));
  // Clock tags are optional. Match comments to their actual mainline positions
  // rather than shifting every later clock when one move has no tag.
  return [null, ...chess.history({ verbose: true }).map(move => {
    const m = (comments.get(move.after) || "").match(/\[%clk\s+([\d:.]+)\]/);
    if (!m) return null;
    const fraction = precise && m[1].includes('.') ? '.' + m[1].split('.')[1] : '';
    let t = m[1].split(".")[0];
    const p = t.split(":").map(Number);
    if (p.length === 3) t = `${p[0] * 60 + p[1]}:${String(p[2]).padStart(2, "0")}`;
    return t + fraction;
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
  const me = meta.playerKnown === false ? "" : (meta.myName || username || "").toLowerCase();
  // country = flag basename ("US", "GB_ENG") resolved from the chess.com country id the page
  // scraped, or null when we have no flag for it → the avatar falls back to the username initial.
  // countryName labels the flag's hover tooltip.
  const w = { name: h.White || meta.white?.user || "White", rating: h.WhiteElo || "", result: res, country: flagCodeForCountryId(meta.white?.countryId), countryName: countryNameForId(meta.white?.countryId) };
  const b = { name: h.Black || meta.black?.user || "Black", rating: h.BlackElo || "", result: res, country: flagCodeForCountryId(meta.black?.countryId), countryName: countryNameForId(meta.black?.countryId) };
  let meSide = "w";
  if (me && b.name.toLowerCase() === me && w.name.toLowerCase() !== me) meSide = "b";
  const playerKnown = !!me && (w.name.toLowerCase() === me) !== (b.name.toLowerCase() === me);
  return { players: { w, b }, meSide, playerKnown };
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
  // Check the line actually supplying the played score, including in variations.
  // A valid root top does not make an older or bounded secondary score exact.
  if (actual) {
    const first = (top?.pv || "").split(" ")[0];
    if (!top || top.bound !== "exact" || actual.bound !== "exact"
      || !Number.isInteger(top.depth) || top.depth <= 0 || actual.depth !== top.depth
      || top.multipv !== 1 || !root.bestmove || first !== root.bestmove
      || !Number.isInteger(actual.multipv) || (played === first ? actual.multipv !== 1 : actual.multipv < 2)) return null;
    try {
      const legal = new Chess(state.positions[i - 1].fen).moves({ verbose: true }).map(move => move.lan);
      if (!legal.includes(first) || !legal.includes(played)) return null;
    } catch { return null; }
  }
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
function captureMaterial(move) {
  return (SAC_VAL[move.captured] || 0) + (move.promotion ? SAC_VAL[move.promotion] - SAC_VAL.p : 0);
}
// A short material-only search across ALL squares detects apparent sacrifices repaid by an
// immediate countercapture (or a short forcing capture sequence). Quiet check evasions are real
// moves, not permission to pass while checked. At the horizon, finish each local exchange rather
// than crediting a hanging queen/rook at face value. Mate/stalemate has no material reward here:
// the independent engine evidence still decides whether a lasting investment is sound.
function shortCaptureGain(chess, plies, budget) {
  const memo = budget.captureMemo || (budget.captureMemo = new Map());
  const key = chess.fen().split(" ").slice(0, 4).join(" ") + ":" + plies;
  if (memo.has(key)) return memo.get(key);
  if (++budget.nodes > budget.maxNodes) return null;
  const legal = chess.moves({ verbose: true });
  if (!legal.length) { memo.set(key, 0); return 0; }
  const mustEvade = plies > 0 && chess.isCheck();
  const candidates = legal.filter(m => m.captured || m.promotion || mustEvade);
  let best = legal.length > candidates.length ? 0 : -Infinity;
  for (const m of candidates) {
    const after = new Chess(m.after);
    const reply = plies > 0 ? shortCaptureGain(after, plies - 1, budget) : exchangeGain(after, m.to, budget);
    if (reply == null) return null;
    best = Math.max(best, captureMaterial(m) - reply);
  }
  memo.set(key, best);
  return best;
}
function hasLastingOffer(chess, square, credit, budget) {
  for (const m of chess.moves({ verbose: true }).filter(m => m.to === square && m.captured)) {
    const recovery = shortCaptureGain(new Chess(m.after), 3, budget);
    if (recovery == null) return false;
    if (captureMaterial(m) - credit - recovery > 0) return true;
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
  const recoveryBudget = { nodes: 0, maxNodes: 512 };
  const captured = captureMaterial(move);
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
    if (couldBeSaved(before, source, move.color, budget)
      && hasLastingOffer(after, square, captured, recoveryBudget)) return true;
  }
  return false;
}
// Independent annotation policy, deliberately not coefficients fitted to recorded ratings.
const BRILLIANT_POLICY = { minAfterPawns: -0.5, clearlyWinningPawns: 5 };
function brilliantEligible(i, mover, std, wpDrop, state) {
  if (std[i] !== "excellent" || !Number.isFinite(wpDrop?.[i])) return false;
  const root = annotationRoot(i - 1, state), topLine = root?.lines?.[0];
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
// Annotation searches never replace the original best/played pair used by numerical scoring.
function annotationRoot(index, state = S) {
  const root = state.bests[index], extra = root?.annotationSearch;
  return state.settings.classifyLines > 1 && extra?.key === engineContextKey(state.positions[index].fen, searchHistory(state.positions, index))
    ? extra.result : root;
}
// Great means finding the only good reply, not merely replying after an error. The runner-up
// must be worse than the Good band in the same completed root depth. With one line, this is
// unknown; retain the ordinary category without scheduling more engine searches.
function onlyGoodReply(i, state) {
  const root = annotationRoot(i - 1, state), top = root?.lines?.find(l => l.multipv === 1);
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
// engine's #1; `book` = the resulting position is theory; std/loss are indexed by ply.
function classifyMove(i, mover, isTop, book, std, loss, wpDrop, state = S) {
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
  // Legal exchange searches are needed only after the cheap scoring conditions pass.
  if (soundMate && brilliantEligible(i, mover, std, wpDrop, state) && _sacAt(i, state)) return "brilliant";

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
  }
  // Second pass: final category per ply (Brilliant-Chess logic). A move stays unlabelled until both
  // its own and the previous position's eval are in, so the panel fills in cleanly during analysis.
  for (let i = 1; i <= N; i++) {
    if (!state.annotationEvidence[i] || wpDrop[i] == null) { state.classif[i] = null; continue; }
    // Some opening datasets include traps from the losing side. Never let theory
    // hide a losing mate or a move the engine rates as an error.
    const safeBook = bookAt[i] && !((decisionMate(i, "played", state.positions[i].color, state) ?? 0) < 0)
      && wpDrop[i] != null && wpDrop[i] < (CALIB?.clsWp?.inacc ?? 5);
    state.classif[i] = classifyMove(i, state.positions[i].color, isTop[i], safeBook, std, loss, wpDrop, state);
    const root = annotationRoot(i - 1, state);
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
  S.gameStats = gameStatistics(S.positions, S.bests, S.calibrated,
    {classifications: completedClasses, clocks: S.clocks, headers: S.headers});
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
  bindBackgroundAnalysisActivity();
  learningAnnouncement?.dispose();
  UI.boardObserver?.disconnect();
  const root = document.getElementById("root");
  root.replaceChildren();

  const topbar = el("header", { class: "topbar" },
    el("div", { class: "brand" },
      el("div", { class: "brand-mark" }, el("img", { class: "brand-img", src: _url("pieces-img/cburnett/wN.svg"), alt: "" })),
      el("div", { class: "brand-name", html: 'Chess <span>/ Review</span>' }),
    ),
    el("div", { class: "topbar-meta", id: "meta" }),
    el("div", { class: "topbar-right" },
      el("button", { type:"button", id:"learningToggle", class:"icon-btn learning-toggle", onclick:toggleLearning },
        el("span", {class:"learning-toggle-icon", "aria-hidden":"true"}, icon("book")),
        el("span", {class:"learning-toggle-label"}, "Learn with Chess review")),
      // aria-label (not title) → keeps the buttons labelled for screen readers without the native
      // hover tooltip the user found unnecessary.
      el("button", { class: "icon-btn", "data-game-action":"", "aria-label": "Flip board", onclick: toggleFlip }, icon("flip")),
      el("button", { class: "icon-btn", "data-game-action":"", "aria-label": "Share game (copy link)", onclick: shareGame }, icon("share")),
      el("button", { class: "icon-btn", "aria-label": "Credits & attributions", onclick: openCredits }, icon("info")),
      el("button", { class: "icon-btn", "aria-label": "Settings", onclick: toggleSettings }, icon("gear")),
    ),
  );

  // board cluster (players + eval bar + board)
  const boardWrap = el("div", { class: "board-wrap", id: "boardWrap" });
  const playerTop = el("div", { id: "playerTop" });
  const playerBot = el("div", { id: "playerBot" });
  const controls = el("div", { class: "controls", id: "controls" });

  // The move list starts directly with moves; keep its name accessible.
  const movesBody = el("div", { class: "panel-body", id: "movesBody" });
  const movesPanel = el("div", { class: "panel moves-panel", "aria-label": "Moves" },
    movesBody,
  );

  const coachMount = el("div", { id: "coachMount", class: "coach-mount" });
  const evalbarMount = el("div", { id: "evalbarMount", class: "evalbar-mount" });
  const reviewMount = el("div", { id: "reviewMount" });
  const graphMount = el("div", { id: "graphMount" });
  const statsMount = el("div", { id: "statsMount" });
  const engineMount = el("div", { id: "engineMount" });
  const learnMount = el("div", { class: "learn-entry" },
    el("button", { class: "learn-entry-button", "data-motion": S.settings.moveAnim===false?"off":"on", onclick: openPuzzles },
      icon("book"), el("span", {class:"learn-entry-label"}, "Solve Puzzles")));

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
        el("div", { class: "side-b" }, makeMod("accuracy", statsMount), makeMod("engine", engineMount), makeMod("learn", learnMount)),
      ),
      makeMod("coach", coachMount),
    ),
  );

  const settings = el("div", { class: "settings-pop", id: "settings", hidden: true });

  // Library sidebar — a thin strip on the far left, opened by hover or its native button.
  // Hidden panel controls are inert. Lives outside the canvas
  // so it overlays the board cluster without disturbing the movable-module layout.
  const libCount = el("span", { class: "count", id: "libCount" }, "0");
  const libControls = el("div", { class: "lib-controls", id: "libControls" });
  const libList = el("div", { class: "lib-list", id: "libList" });
  const libRail = el("aside", { class: "library-rail", id: "libraryRail" },
    el("button", { type:"button", class: "lib-tab", tabindex:"-1", "aria-label":"Saved games", "aria-controls":"savedLibraryPanel", "aria-expanded":"false", onclick:()=>setLibraryOpen(!S.libraryOpen) }, icon("library"), el("span", { class: "lib-tab-txt" }, "Library")),
    el("div", { class: "lib-panel", id:"savedLibraryPanel" },
      el("div", { class: "lib-head" }, el("h3", {}, "Your games"), libCount),
      libControls, libList),
  );
  libRail.addEventListener("mouseenter", () => setLibraryOpen(true));
  libRail.addEventListener("mouseleave", () => setLibraryOpen(false));
  // Rerendering a focused card briefly blurs it before restoring its replacement.
  libRail.addEventListener("focusout", () => {Promise.resolve().then(()=>{
    if(!libRail.contains(document.activeElement)&&!libRail.matches(":hover"))setLibraryOpen(false);
  });});
  libRail.addEventListener("keydown", e => {if(e.key==="Escape"){e.preventDefault();e.stopPropagation();setLibraryOpen(false);libRail.querySelector(".lib-tab").focus();}});
  // Close any open library dropdown when clicking elsewhere.
  document.addEventListener("mousedown", (e) => {
    if (!libRail.contains(e.target)) setLibraryOpen(false);
    if (!e.target.closest(".lib-dd-field")) closeDropdowns();
  });

  const saveStatus = el("div", {class:"review-save-status", hidden:true, "aria-live":"polite"});
  root.append(el("div", { class: "app" }, topbar, el("div", {class:"review-viewport"}, canvas), settings, libRail, saveStatus,
    feedbackLink("feedback-floating", el("span", {}, "Feedback"))));

  UI = {
    meta: document.getElementById("meta"), settings, canvas, boardWrap,
    playerTop, playerBot, controls, coach: coachMount, evalbar: evalbarMount,
    review: reviewMount, movesBody,
    graph: graphMount, stats: statsMount, engine: engineMount,
    libRail, libControls, libList, libCount, libPanel:libRail.querySelector(".lib-panel"), saveStatus,
  };

  applyLayoutMode();
  if (!accuracyLayoutExpanded()) reflowAccuracy(false);
  initBoardInput();
  if(!S.blank)renderCoachAvatar(); // no unused animated portrait in the blank workspace
  renderLibrary();
  setLibraryOpen(false);
  renderReviewSaveStatus();
  window.addEventListener("resize", () => { fitEnginePanel(); growCanvas(); alignPlayers(); positionSettings(); });
  if (window.ResizeObserver) {
    UI.boardObserver = new window.ResizeObserver(alignPlayers);
    UI.boardObserver.observe(boardWrap);
  }
}

let learningWorkspace = null;
let learningAnnouncement = null;
let openingLearning = false;
let deferredPracticeAdvance = false;
function openPuzzles(event) {
  const button=event.currentTarget;
  button.classList.add("is-activating");
  setTimeout(()=>button.classList.remove("is-activating"),460);
  return openLearning();
}
function toggleLearning() {
  if (learningWorkspace) return learningWorkspace.close();
  return openLearning();
}
function syncLearningToggle() {
  const button=document.getElementById("learningToggle");
  if(!button)return;
  const learning=!!learningWorkspace&&!learningWorkspace.closing, mode=learning?"learning":"review";
  button.dataset.motion=S.settings.moveAnim===false?"off":"on";
  if(button.dataset.mode===mode)return;
  button.querySelector(".learning-toggle-label").textContent=learning?"Return to Game review":"Learn with Chess review";
  button.querySelector(".learning-toggle-icon").replaceChildren(icon(learning?"prev":"book"));
  button.dataset.mode=mode;
}
async function openLearning() {
  pauseBackgroundAnalysis();
  if (learningWorkspace || openingLearning) return;
  learningAnnouncement?.close();
  openingLearning = true;
  const positions = S.positions;
  let LearningWorkspace;
  try { ({LearningWorkspace} = await loadLearningWorkspace()); }
  catch (error) { console.warn(error); toast("Learning could not load. Try opening it again."); return; }
  finally { openingLearning = false; }
  if (S.positions !== positions) return;
  _cancelPromotion?.();
  _cancelBoardDrag?.();
  if (learningWorkspace) return;
  // Finish an already-started practice animation before freezing its exact board.
  if (S.practice && (S.practice.rolling || S.practice.demoing || S.practice.busy)) {
    toast("Let the current practice move finish, then open learning."); return;
  }
  const playing = !!S.autoTimer;
  if (playing) { clearInterval(S.autoTimer); S.autoTimer = null; renderControls(); }
  const sourceFen=activePos().fen, wasAnalysis=S.analysisMode, wasBlank=S.blank;
  const snapshot = {idx:S.idx, flipped:S.flipped, selectedSq:wasAnalysis?null:S.selectedSq,
    lineWalking:!wasAnalysis&&S.lineWalking, bestWalking:!wasAnalysis&&S.bestWalking};
  stopLineWalk();
  if(wasAnalysis)exitAnalysis(undefined,{render:false});
  UI.settings.hidden = true;
  hideBoardBadgeTip();
  learningWorkspace = new LearningWorkspace({document, storage:browserAPI.storage.local, makePiece, url:_url,
    settings:()=>S.settings, flipped:S.flipped, book:()=>BOOK || {}, startDrag, onPuzzleWrong:playWrongSound, onPuzzleMove:playSanSound, onOpeningMove:playSanSound, onFreeMove:playSanSound, onPuzzleSuccess:playPuzzleSuccess,
    createAnalysisEngine:()=>createEngine({Hash:S.settings.engineHash, "Skill Level":S.settings.engineSkill}),
    navigationButton:document.getElementById("learningToggle"),
    embedded:{stage:UI.canvas, boardWrap:UI.boardWrap, fen:sourceFen, reviewFen:activePos().fen, startDrag,
      restoreBoard:()=>{
        paintBoard({restoring:true});
        if(wasAnalysis){renderEvalBar();renderPlayers();renderControls();renderReview();renderEngineCurrent();}
      },
      drawArrow:(from,to,flipped)=>learningArrow(from,to,flipped,USER_ARROW_COLOR),
      drawBestArrow:(from,to,flipped)=>learningArrow(from,to,flipped,/^#[0-9a-f]{6}$/i.test(S.settings.bestArrowColor || "")?S.settings.bestArrowColor:ARROW_COLOR)},
    onClosing:syncLearningToggle,
    onClose:()=>{
      learningWorkspace = null;
      syncLearningToggle();
      alignPlayers();
      if(wasBlank){document.getElementById("learningToggle")?.focus();return;}
      S.idx=snapshot.idx; S.flipped=snapshot.flipped; S.selectedSq=snapshot.selectedSq;
      if(!S.practice){paintBoard();}
      renderControls();
      if(deferredPracticeAdvance){
        deferredPracticeAdvance=false;
        const practice=S.practice;
        setTimeout(()=>{if(S.practice===practice)practiceAdvance();},1300);
      }
      if(playing&&!S.practice&&!S.analysisMode)toggleAuto();
      if(snapshot.bestWalking)playBestMoves();
      else if(snapshot.lineWalking)startLineWalk();
    }});
  syncLearningToggle();
  await learningWorkspace.open();
}

/* ---------------- Loading indicator ----------------
   Animation shown in place of the accuracy/elo number while Stockfish
   is still analyzing. The color is inherited from the parent (currentColor). */
function loaderNode(extraClass = "", color = null, style = "wave") {
  const variant = style === "bounce" ? "bounce" : "wave";
  const props = { class: "ld ld-" + variant + (extraClass ? " " + extraClass : "") };
  if (color) props.style = { color };
  if (variant === "bounce") return el("span", props, el("i"), el("i"), el("i"));
  return el("span", props, el("i"), el("i"), el("i"), el("i"));
}
function accuracyPendingValue() {
  const loader = loaderNode('', null, 'bounce');
  loader.setAttribute('role', 'img');
  loader.setAttribute('aria-label', 'Calculating');
  return loader;
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
  const select = el("button", {type:"button",class:"mod-select","aria-label":"Select "+key+" panel","aria-pressed":"false",
    onclick:e=>{e.stopPropagation();togglePanelSelection(key);}}, "✓");
  const mod = el("div", { class: "mod", "data-mod": key }, handle, select, innerWrap, gripE, gripS, gripSE);
  makeMovable(mod, handle, { e: gripE, s: gripS, se: gripSE }, key);
  return mod;
}
let _saveLayoutT = null;
let canvasScale = 1;
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
function saveLayout(immediate = false) {
  clearTimeout(_saveLayoutT);
  const persist = () => browserAPI.storage.local.set({ layout: layoutForSave(), layoutMode: S.layoutMode, layoutVersion: LAYOUT_VERSION });
  if (immediate) return persist();
  _saveLayoutT = setTimeout(persist, 250);
}
// "auto" = the responsive layout in styles.css, which fits any window. "custom" = the free canvas the
// user arranged in Reorganize mode, placed from S.layout and zoomed to fit the window.
const isCustomLayout = () => S.layoutMode === "custom";
function isResponsiveModern() {
  // Panel-design edits may label the setup Custom without changing its geometry.
  // Only genuine panel arrangement edits should switch to a fitted free canvas.
  return isCustomLayout() && baseUiSetup() === 'modern' && setupLayoutMatches(layoutForSave(), S.layoutMode);
}
function referenceLayout() {
  const modern = isResponsiveModern();
  return fullHdReferenceLayout(modern ? MODERN_LAYOUT : DEFAULT_LAYOUT,
    window.innerWidth, window.innerHeight, accuracyLayoutExpanded(), modern);
}
const selectedPanels = new Set();
let cancelPanelGesture = null;
function visiblePanelKeys() {
  return [...UI.canvas.querySelectorAll('.mod')].filter(mod=>!mod.hidden&&getComputedStyle(mod).display!=="none"&&S.layout[mod.dataset.mod]).map(mod=>mod.dataset.mod);
}
function selectedPanelKeys() {return visiblePanelKeys().filter(key=>selectedPanels.has(key));}
function togglePanelSelection(key) {
  if(!S.reorganize)return;
  if(selectedPanels.has(key))selectedPanels.delete(key);else selectedPanels.add(key);
  syncPanelSelection();
}
function syncPanelSelection() {
  const group=selectedPanelKeys().length>1;
  for(const mod of UI.canvas.querySelectorAll('.mod')){
    const selected=S.reorganize&&selectedPanels.has(mod.dataset.mod);
    mod.classList.toggle('panel-selected',selected);
    mod.querySelector('.mod-select').setAttribute('aria-pressed',String(selected));
    mod.querySelector('.mod-handle').title=selected&&group?'Drag to move selected panels':'Drag to move';
    for(const grip of mod.querySelectorAll('.mod-resize'))grip.title=selected&&group?'Drag to scale selected panels':grip.classList.contains('e')?'Drag to change width':grip.classList.contains('s')?'Drag to change height':'Drag to resize';
  }
  renderReorgBanner();
}
function selectPanels(keys) {
  selectedPanels.clear();for(const key of keys)selectedPanels.add(key);syncPanelSelection();
}
function selectRightPanels() {
  const board=S.layout.board;if(!board)return;
  selectPanels(visiblePanelKeys().filter(key=>S.layout[key].x>=board.x+board.w-2));
}
function panelLayoutExport() {
  return {schema:"chess-review-layout-v1",layoutVersion:LAYOUT_VERSION,layoutMode:S.layoutMode,
    layout:structuredClone(layoutForSave()),displayedLayout:structuredClone(isCustomLayout()?S.layout:snapshotLayout()),accuracyExpanded:S.qbreakExpanded,
    visiblePanels:visiblePanelKeys(),viewport:{width:window.innerWidth,height:window.innerHeight,devicePixelRatio:window.devicePixelRatio||1}};
}
function exportPanelLayout() {
  const blob=new window.Blob([JSON.stringify(panelLayoutExport(),null,2)+"\n"],{type:"application/json"});
  const url=window.URL.createObjectURL(blob),link=el("a",{href:url,download:"chess-review-layout.json"});
  document.body.append(link);link.click();link.remove();setTimeout(()=>window.URL.revokeObjectURL(url),1000);
}
function applyPanelBox(mod,b) {
  mod.style.left=b?b.x+"px":"";mod.style.top=b?b.y+"px":"";
  mod.style.width=b?b.w+"px":"";mod.style.height=b?b.h+"px":"";
  const scale=b?panelScale(b):1,inner=mod.querySelector('.mod-inner');
  inner.style.flex=scale===1?"":"none";
  inner.style.width=scale===1?"":b.w/scale+"px";inner.style.height=scale===1?"":b.h/scale+"px";
  inner.style.transform=scale===1?"":"scale("+scale+")";inner.style.transformOrigin=scale===1?"":"top left";
}
function panelContentScale(key) {
  return isCustomLayout() && !isResponsiveModern() ? panelScale(S.layout[key]) : panelScale(referenceLayout()?.[key]);
}
function accuracyLayoutExpanded() {
  return panelDesign('accuracy', S.settings) === 'original' ? S.originalAccuracyExpanded : S.qbreakExpanded;
}
function applyLayoutMode() {
  applyLayout(); growCanvas();
}
function applyLayout() {
  UI.canvas.classList.add("no-concepts");
  UI.canvas.classList.remove("desktop-layout");
  const custom = isCustomLayout() && !isResponsiveModern(), reference = referenceLayout();
  UI.canvas.classList.toggle('auto', !custom);
  UI.canvas.classList.toggle('canvas', custom);
  UI.canvas.classList.toggle('original-accuracy-expanded',panelDesign('accuracy',S.settings)==='original'&&S.originalAccuracyExpanded);
  UI.canvas.classList.toggle('full-hd-reference',!!reference);
  UI.canvas.classList.toggle('reference-components',!custom||!!reference);
  UI.canvas.style.setProperty('--reference-factor',reference?reference.review.scale/(DEFAULT_LAYOUT.review.scale*.87):1);
  UI.canvas.closest('.app').style.setProperty('--reference-chrome-scale',reference?Math.max(1,reference.review.scale/(DEFAULT_LAYOUT.review.scale*.87)):1);
  const boxes=custom?S.layout:reference;
  for (const mod of UI.canvas.querySelectorAll(".mod")) applyPanelBox(mod,boxes?.[mod.dataset.mod]);
  fitEnginePanel();
  scheduleAccuracyFit();
  requestAnimationFrame(positionSettings);
}
// Freeze the automatic layout into free-canvas boxes, so Reorganize starts from exactly what is on
// screen. Hidden modules (eval bar or coach switched off) keep their default box.
function snapshotLayout() {
  const base = UI.canvas.parentElement.getBoundingClientRect();
  const out = structuredClone(DEFAULT_LAYOUT);
  const reference=referenceLayout();
  for (const mod of UI.canvas.querySelectorAll(".mod")) {
    if(reference&&(!isCustomLayout()||isResponsiveModern())) {out[mod.dataset.mod]={...reference[mod.dataset.mod]};continue;}
    const r = mod.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    // Preserve the rendered geometry when unlocking panels; grid snapping applies
    // only to an actual user drag, not to the responsive layout snapshot.
    out[mod.getAttribute("data-mod")] = { x:r.left-base.left, y:r.top-base.top, w:r.width, h:r.height };
  }
  return out;
}
// Space kept right of and below layouts extending beyond the default desktop envelope.
const CANVAS_MARGIN = 12;
// Right and bottom edge of a module layout (px), floored at 600 so a near-empty canvas keeps a sane size.
function layoutExtent(layout) {
  let maxB = 600, maxR = 600;
  for (const [key, b] of Object.entries(layout)) { if(key === "concepts")continue; maxB = Math.max(maxB, b.y + b.h); maxR = Math.max(maxR, b.x + b.w); }
  return { maxR, maxB };
}
function growCanvas() {
  const viewport=UI.canvas.parentElement;
  if (!isCustomLayout() || isResponsiveModern()) {
    canvasScale=1;
    for(const key of ['minHeight','minWidth','width','height','transform','transformOrigin','marginLeft'])UI.canvas.style[key]="";
    viewport.style.height="";viewport.classList.remove('custom-viewport');
    return;
  }
  const {pageW,pageH}=layoutPageSize(S.layout),height=pageH-TOPBAR_H;
  const top=viewport.getBoundingClientRect().top||TOPBAR_H;
  const width=window.innerWidth||innerWidth,availableHeight=(window.innerHeight||innerHeight)-top;
  canvasScale=Math.min(2,viewportGrowth(window.innerHeight||innerHeight),width/pageW,Math.max(1,availableHeight)/height);
  UI.canvas.style.setProperty('--layout-grid-line',1/canvasScale+'px');
  UI.canvas.style.minWidth=UI.canvas.style.width=pageW+'px';
  UI.canvas.style.minHeight=UI.canvas.style.height=height+'px';
  UI.canvas.style.transform='scale('+canvasScale+')';UI.canvas.style.transformOrigin='top left';
  UI.canvas.style.marginLeft='0px';
  viewport.style.height=height*canvasScale+'px';viewport.classList.add('custom-viewport');
}
// What collapsing the accuracy breakdown is worth on the canvas: the hidden rows' height (+ the
// column row-gap), and modules below it in the same column. Playback controls stay anchored.
function accuracyReflowInfo(layout = S.layout) {
  const acc = layout.accuracy;
  // Saved custom layouts use the old expanded baseline. Its original compact
  // inset was three 22px rows plus 7px gaps, independent of the selected page.
  const delta = 87 * panelScale(acc);
  const belowKeys = [];
  for (const [k, o] of Object.entries(layout)) {
    if (k === "accuracy" || k === "controls") continue;
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
    acc.h = Math.max(MINH*panelScale(acc), acc.h - delta);
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
// The visible grid and snapping share the canvas origin, even when zoomed to fit.
function layoutGridSize() {
  return LAYOUT_GRIDS.some(([size])=>size===S.settings.layoutGridSize) ? S.settings.layoutGridSize : DEFAULT_SETTINGS.layoutGridSize;
}
function snapGrid(v) { const size=layoutGridSize();return Math.round(v/size)*size; }
function snapPanelEdge(origin, size, delta, minimum) {
  if(!delta)return size;
  const grid=layoutGridSize(),edge=Math.max(snapGrid(origin+size+delta),Math.ceil((origin+minimum)/grid)*grid);
  return edge-origin;
}
function setLayoutGridSize(value) {
  cancelPanelGesture?.();
  S.settings.layoutGridSize=Number(value);
  S.settings.layoutGridSize=layoutGridSize();
  renderReorgBanner();
  return writeSettings({layoutGridSize:S.settings.layoutGridSize});
}
function makeMovable(mod, handle, grips, key) {
  const begin=(kind,target)=>(e)=>{
    if(!S.reorganize||e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    cancelPanelGesture?.();
    if(e.ctrlKey||e.metaKey||e.shiftKey){togglePanelSelection(key);return;}
    if(!selectedPanels.has(key))selectPanels([key]);
    const responsive = isResponsiveModern() ? {layout:structuredClone(S.layout), reflow:S._accReflow&&structuredClone(S._accReflow)} : null;
    if (responsive) {
      // Materialize the displayed preset only when a gesture begins. Cancelled
      // gestures and clicks restore its responsive baseline without saving edits.
      S.layout = snapshotLayout();
      S._accReflow = responsive.reflow ? accuracyReflowInfo() : null;
    }
    const keys=selectedPanelKeys(),group=keys.length>1,start=structuredClone(S.layout),reflow=S._accReflow&&structuredClone(S._accReflow);
    const bounds=panelGroupBounds(start,keys),box=start[key],sx=e.clientX,sy=e.clientY,gestureScale=canvasScale;
    if(!bounds||!box)return;
    clearTimeout(_saveLayoutT);
    for(const name of keys)UI.canvas.querySelector('[data-mod="'+name+'"]').classList.add(kind==='move'?'dragging':'resizing');
    try{target.setPointerCapture(e.pointerId);}catch{}
    const apply=ev=>{
      const dx=(ev.clientX-sx)/gestureScale,dy=(ev.clientY-sy)/gestureScale;
      if(kind==='move')S.layout=movePanelGroup(start,keys,dx?snapGrid(bounds.x+dx)-bounds.x:0,dy?snapGrid(bounds.y+dy)-bounds.y:0);
      else if(group){
        const rx=box.x+box.w-bounds.x,ry=box.y+box.h-bounds.y;
        const factor=kind==='e'?1+dx/rx:kind==='s'?1+dy/ry:1+(dx*rx+dy*ry)/(rx*rx+ry*ry);
        S.layout=scalePanelGroup(start,keys,factor);
        if(reflow&&keys.includes('accuracy'))S._accReflow={...reflow,delta:reflow.delta*S.layout.accuracy.w/start.accuracy.w};
      }else{
        const b={...box};
        if(kind.includes('e'))b.w=snapPanelEdge(box.x,box.w,dx,modMinW(key));
        if(kind.includes('s'))b.h=snapPanelEdge(box.y,box.h,dy,MINH);
        S.layout={...start,[key]:b};
      }
      applyLayout();growCanvas();if(keys.includes('board'))alignPlayers();
    };
    const move=ev=>{if(ev.pointerId===e.pointerId)apply(ev);};
    const finish=(cancelled,ev)=>{
      if(ev&&ev.pointerId!==e.pointerId)return;
      window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',blur);
      try{target.releasePointerCapture(e.pointerId);}catch{}
      cancelPanelGesture=null;
      if(cancelled){S.layout=responsive?.layout||start;S._accReflow=responsive?responsive.reflow:reflow;applyLayout();growCanvas();}
      else if(ev)apply(ev);
      for(const name of keys)UI.canvas.querySelector('[data-mod="'+name+'"]').classList.remove('dragging','resizing');
      if(!cancelled&&JSON.stringify(S.layout)!==JSON.stringify(start))writeSettings(customUiSetupPatch());
      else if(responsive&&!cancelled){S.layout=responsive.layout;S._accReflow=responsive.reflow;applyLayout();growCanvas();}
      saveLayout();if(keys.includes('board'))alignPlayers();
    };
    const up=ev=>finish(false,ev),cancel=ev=>finish(true,ev),blur=()=>finish(true);
    cancelPanelGesture=blur;
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',blur);
  };
  handle.addEventListener('pointerdown',begin('move',handle));
  for(const dir of ['e','s','se'])grips[dir].addEventListener('pointerdown',begin(dir,grips[dir]));
}
function baseUiSetup() {
  return UI_SETUPS[S.settings.uiSetup]?.designs ? S.settings.uiSetup
    : UI_SETUPS[S.settings.uiSetupBase]?.designs ? S.settings.uiSetupBase : '';
}
function customUiSetupPatch() {
  const patch = {uiSetup:'custom', uiSetupBase:baseUiSetup()};
  Object.assign(S.settings,patch);
  return patch;
}
function setupDesignsMatch() {
  const setup = UI_SETUPS[baseUiSetup()];
  return !!setup && Object.entries(setup.designs).every(([key,value])=>S.settings[key]===value);
}
function setupLayout() {
  return structuredClone(baseUiSetup() === 'modern' ? MODERN_LAYOUT : DEFAULT_LAYOUT);
}
function setupLayoutMode() {
  return UI_SETUPS[baseUiSetup()]?.layoutMode || 'auto';
}
function setupLayoutMatches(layout,mode) {
  const baseline=setupLayout();
  return mode===setupLayoutMode()&&Object.keys(layout).every(key=>key in baseline)&&Object.entries(baseline).every(([key,box])=>
    ['x','y','w','h','scale'].every(prop=>Math.abs((layout[key]?.[prop]??(prop==='scale'?1:NaN))-(box[prop]??1))<1e-6));
}
// Restore the selected setup's starting arrangement and window-dependent fit.
async function resetLayout() {
  cancelPanelGesture?.();
  S._accReflow = null;   // drop any collapse offset so the fresh layout isn't double-adjusted
  S.layout = setupLayout();
  S.layoutMode = setupLayoutMode();
  if (S.reorganize) toggleReorganize();
  if (!accuracyLayoutExpanded()) reflowAccuracy(false);
  applyLayoutMode();
  // Reset is a committed action: a reload must not cancel a pending debounce.
  const uiSetup = setupDesignsMatch() ? baseUiSetup() : 'custom';
  const savedSettings = S.settings.uiSetup === uiSetup ? Promise.resolve() : writeSettings({uiSetup,uiSetupBase:baseUiSetup()});
  S.settings.uiSetup = uiSetup;
  const saved = saveLayout(true);
  requestAnimationFrame(alignPlayers);
  await Promise.all([saved, savedSettings, initTabZoom()]);
  if (UI.settings && !UI.settings.hidden) renderSettings();
}
// Reorganize mode: while ON, panels can be dragged/resized (handles + grips appear); while OFF
// they're locked and hover shows nothing. The arranged layout auto-saves and persists. Entering it
// from the automatic layout freezes what is on screen into a custom canvas first.
function toggleReorganize() {
  if(S.blank){toast("Open a game to reorganize review panels.");return;}
  if (!S.reorganize && !isCustomLayout()) {
    S.layout = snapshotLayout();
    // The snapshot holds the breakdown as it is shown; record the collapse offset so the saved
    // baseline is the expanded one, like every other canvas layout (see layoutForSave()).
    S._accReflow = accuracyLayoutExpanded() ? null : accuracyReflowInfo();
    S.layoutMode = "custom";
    applyLayoutMode();
    saveLayout();
    // The snapshot already fits at the current zoom. Refitting here would change
    // every panel's apparent size just for unlocking its drag handles.
  }
  cancelPanelGesture?.();
  S.reorganize = !S.reorganize;
  if(!S.reorganize)selectedPanels.clear();
  UI.canvas.classList.toggle("reorganizing", S.reorganize);
  if (S.reorganize && UI.settings) UI.settings.hidden = true; // move the settings panel out of the way
  syncPanelSelection();
  if (UI.settings && !UI.settings.hidden) renderSettings();   // refresh the button label if open
}
let reorgToolbarPosition = null, reorgToolbarMinimized = false, cleanupReorgToolbar = null;
function positionReorgToolbar(banner, x, y) {
  const rect=banner.getBoundingClientRect(),margin=8;
  const left=Math.max(margin,Math.min(x,window.innerWidth-rect.width-margin));
  const top=Math.max(margin,Math.min(y,window.innerHeight-rect.height-margin));
  reorgToolbarPosition={x:left,y:top};
  Object.assign(banner.style,{left:left+'px',top:top+'px',bottom:'auto',transform:'none'});
}
function makeReorgToolbarMovable(banner) {
  const handle=banner.querySelector('.reorg-drag');
  let cancelDrag=null;
  handle.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    e.preventDefault();e.stopPropagation();cancelDrag?.();
    const rect=banner.getBoundingClientRect(),previous=reorgToolbarPosition&&{...reorgToolbarPosition};
    try{handle.setPointerCapture(e.pointerId);}catch{}
    banner.classList.add('toolbar-dragging');
    const move=ev=>{
      if(ev.pointerId!==e.pointerId)return;
      positionReorgToolbar(banner,rect.left+ev.clientX-e.clientX,rect.top+ev.clientY-e.clientY);
    };
    const finish=(cancelled,ev)=>{
      if(ev&&ev.pointerId!==e.pointerId)return;
      if(!cancelled&&ev)move(ev);
      window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',blur);
      try{handle.releasePointerCapture(e.pointerId);}catch{}
      banner.classList.remove('toolbar-dragging');cancelDrag=null;
      if(cancelled){
        reorgToolbarPosition=previous;
        if(previous)positionReorgToolbar(banner,previous.x,previous.y);
        else for(const key of ['left','top','bottom','transform'])banner.style[key]='';
      }
    };
    const up=ev=>finish(false,ev),cancel=ev=>finish(true,ev),blur=()=>finish(true);
    cancelDrag=blur;
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',cancel);window.addEventListener('blur',blur);
  });
  handle.addEventListener('keydown',e=>{
    const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(!direction)return;
    e.preventDefault();e.stopPropagation();
    const rect=banner.getBoundingClientRect(),step=e.shiftKey?10:1;
    positionReorgToolbar(banner,rect.left+direction[0]*step,rect.top+direction[1]*step);
  });
  const resize=()=>{cancelDrag?.();if(reorgToolbarPosition)positionReorgToolbar(banner,reorgToolbarPosition.x,reorgToolbarPosition.y);};
  window.addEventListener('resize',resize);
  return ()=>{cancelDrag?.();window.removeEventListener('resize',resize);};
}
function renderReorgBanner() {
  let banner=document.querySelector('.reorg-banner');
  if(!S.reorganize){cleanupReorgToolbar?.();cleanupReorgToolbar=null;banner?.remove();return;}
  if(!banner){
    banner=el('div',{class:'reorg-banner',role:'toolbar','aria-label':'Reorganize panels'},
      el('div',{class:'reorg-bar'},
        el('button',{type:'button',class:'reorg-drag','aria-label':'Move layout toolbar',
          title:'Drag to move the toolbar, or use arrow keys. Select panels to move or scale them together.'},el('span',{'aria-hidden':'true',html:HANDLE_SVG}),el('span',{},'Layout')),
        el('label',{class:'reorg-grid'},'Grid',
          el('select',{'aria-label':'Layout grid spacing',onchange:e=>setLayoutGridSize(e.target.value)},
            ...LAYOUT_GRIDS.map(([size,name])=>el('option',{value:String(size)},name+' · '+size+' px')))),
        el('button',{type:'button',class:'reorg-minimize',onclick:()=>{reorgToolbarMinimized=!reorgToolbarMinimized;renderReorgBanner();}}),
        el('button',{type:'button',class:'reorg-done',onclick:toggleReorganize},'Done')),
      el('div',{class:'reorg-actions'},
        el('button',{type:'button','data-reorg':'right',onclick:selectRightPanels},'Right panels'),
        el('button',{type:'button','data-reorg':'all',onclick:()=>selectPanels(visiblePanelKeys())},'All'),
        el('button',{type:'button','data-reorg':'clear',onclick:()=>selectPanels([])},'Clear'),
        el('span',{class:'reorg-count',role:'status'}),
        el('button',{type:'button','data-reorg':'export',onclick:exportPanelLayout},'Export')));
    document.body.append(banner);
    cleanupReorgToolbar=makeReorgToolbarMovable(banner);
  }
  banner.classList.toggle('is-minimized',reorgToolbarMinimized);
  banner.querySelector('.reorg-grid').hidden=reorgToolbarMinimized;
  banner.querySelector('.reorg-actions').hidden=reorgToolbarMinimized;
  const minimize=banner.querySelector('.reorg-minimize'),label=reorgToolbarMinimized?'Expand layout toolbar':'Minimize layout toolbar';
  minimize.textContent=reorgToolbarMinimized?'+':'−';
  minimize.setAttribute('aria-label',label);minimize.title=label;
  minimize.setAttribute('aria-expanded',String(!reorgToolbarMinimized));
  if(reorgToolbarPosition)positionReorgToolbar(banner,reorgToolbarPosition.x,reorgToolbarPosition.y);
  const count=selectedPanelKeys().length;
  const grid=layoutGridSize();
  UI.canvas.style.setProperty('--layout-grid-size',grid+'px');
  UI.canvas.style.setProperty('--layout-grid-major',grid*4+'px');
  banner.querySelector('.reorg-grid select').value=String(grid);
  banner.querySelector('.reorg-count').textContent=count+' panel'+(count===1?'':'s')+' selected';
  banner.querySelector('[data-reorg=clear]').disabled=!count;
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
  _cancelBoardDrag?.();
  if (learningWorkspace?.embedded) return;
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
let mateMarkFen = null, mateMarkSquare = null;
function matedSquare(fen) {
  if (fen !== mateMarkFen) {
    mateMarkFen = fen;
    try { mateMarkSquare = matedKingSquare(new Chess(fen)); } catch { mateMarkSquare = null; }
  }
  return mateMarkSquare;
}
function paintBoard({restoring=false}={}) {
  if (learningWorkspace?.embedded&&!restoring) return;
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
  const mated = matedSquare(pos.fen);
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
  if (boardEl) mateMark(boardEl, sqByName[mated], mated, S.flipped);
  if (clean && S.practice.resultBadge?.solvePos === solvePly) {
    const result = S.practice.resultBadge, square = sqByName[result.square];
    square?.classList.add("has-badge");
    square?.append(puzzleResultBadge(document, result.status));
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
function arrowXY(sq, flipped = S.flipped) {
  const f = sq.charCodeAt(0) - 97;          // a..h -> 0..7
  const r = parseInt(sq.slice(1), 10) - 1;  // 1..8 -> 0..7
  return flipped
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
  if (learningWorkspace?.embedded) return;
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

function learningArrow(from, to, flipped, color) {
  const a = arrowXY(from, flipped), b = arrowXY(to, flipped);
  const {shaft, head} = arrowBuild(arrowWaypoints(a, b), S.settings.arrowHead, S.settings.arrowHead * .70);
  return arrowNode(shaft, head, color);
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
  if (learningWorkspace?.embedded) return;
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
  pauseBackgroundAnalysis();
  if (S.helperEngine?.dead) resetHelperEngine();
  if (S.helperEngine) return S.helperEngine;
  if (!S.helperEnginePromise) {
    const generation = S.helperEngineGeneration;
    S.helperEnginePromise = (async () => {
      const engine = await createEngine({ Hash: S.settings.engineHash, "Skill Level": S.settings.engineSkill });
      if (generation !== S.helperEngineGeneration) {
        engine.terminate();
        throw new Error("Helper analysis cancelled");
      }
      S.helperEngine = engine;
      return engine;
    })();
  }
  const pending = S.helperEnginePromise;
  try { return await pending; }
  finally { if (S.helperEnginePromise === pending) S.helperEnginePromise = null; }
}
function resetHelperEngine() {
  S.helperEngineGeneration++;
  S.helperEnginePromise = null;
  try { S.helperEngine?.terminate(); } catch {}
  S.helperEngine = null;
  S.threatCache.clear();
  ++_threatToken;
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
// Draw the opponent's best move as if it were their turn.
let _threatToken = 0;
async function renderThreatArrow() {
  if (S.helperEngine?.dead) resetHelperEngine();
  const token = ++_threatToken;
  if (learningWorkspace?.embedded) return;
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
    let eng; try { eng = await getHelperEngine(); } catch { return; }
    if (token !== _threatToken || learningWorkspace?.embedded || !S.settings.showThreat) return;
    eng.stop();
    const targetFen = threatFen(fen);
    let res; try { res = await eng.analyse(targetFen, Math.min(14, S.settings.engineDepth), 1, targetFen === fen ? history : null); } catch { return; }
    if (token !== _threatToken || learningWorkspace?.embedded || !S.settings.showThreat) return;
    uci = res && res.bestmove ? res.bestmove : null;
    S.threatCache.set(cacheKey, uci);
    if (activePos().fen !== fen || JSON.stringify(activeSearchHistory()) !== historyKey || UI.boardWrap.querySelector(".board") !== board) return;
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
  const color = /^#[0-9a-f]{6}$/i.test(S.settings.threatArrowColor || "")
    ? S.settings.threatArrowColor : DEFAULT_SETTINGS.threatArrowColor;
  svg.replaceChildren(arrowNode(shaft, head, color));
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
let _cancelBoardDrag = null;
let _cancelPromotion = null;
function requestPromotion(from, to, animate) {
  _cancelPromotion?.();
  const fen = activePos().fen, pgn = S.pgn, practice = S.practice, previous = document.activeElement;
  const app = document.querySelector(".app"), wasInert = !!app.inert;
  const close = () => { overlay.remove(); app.inert = wasInert; document.removeEventListener("keydown", key, true); _cancelPromotion = null; previous?.focus(); };
  const key = e => {
    if(e.key === "Escape"){e.preventDefault();e.stopImmediatePropagation();close();}
    else if(e.key === "Tab") {const nodes=[...card.querySelectorAll("button")];if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes[nodes.length-1].focus();}else if(!e.shiftKey&&document.activeElement===nodes[nodes.length-1]){e.preventDefault();nodes[0].focus();}}
    else if(e.key === 'ArrowUp' || e.key === 'ArrowDown') {e.preventDefault();e.stopImmediatePropagation();const nodes=[...card.querySelectorAll('.promotion-options button')],index=nodes.indexOf(document.activeElement);nodes[(index+(e.key==='ArrowUp'?-1:1)+nodes.length)%nodes.length].focus();}
    else if(e.key.startsWith("Arrow")||["Home","End","f"].includes(e.key))e.stopImmediatePropagation();
  };
  const card = el("div", {class:"promotion-picker", 'data-color':sideToMove(fen), role:"dialog", "aria-modal":"true", "aria-label":"Choose promotion piece"},
    el("h3", {}, "Promote to"),
    el("div", {class:"promotion-options"}, ...[["q","Queen"],["r","Rook"],["b","Bishop"],["n","Knight"]].map(([piece,label]) =>
      el("button", {type:"button", 'aria-label':'Promote to '+label.toLowerCase(), title:label, onclick:()=>{close();if(S.pgn===pgn&&activePos().fen===fen&&S.practice===practice)applyUserMove(from,to,animate,piece);}}, makePiece(piece,sideToMove(fen))))),
    el("button", {type:"button", class:"promotion-cancel", onclick:close}, "Cancel"));
  const overlay = el("div", {class:"promotion-overlay"}, card);
  document.body.append(overlay); app.inert = true; _cancelPromotion = close;
  document.addEventListener("keydown",key,true);card.querySelector("button").focus();
}
function initBoardInput() {
  const wrap = UI.boardWrap;
  wrap.addEventListener("contextmenu", (e) => e.preventDefault());
  // Never let the browser start its own image/element drag on the board (the stray ghost image).
  wrap.addEventListener("dragstart", (e) => {if (!learningWorkspace?.embedded) e.preventDefault();});
  wrap.addEventListener("pointerdown", (e) => {
    if (learningWorkspace || S.blank) return;
    if (e.button === 2) { rightPointerDown(e); return; }
    if (e.button !== 0) return;
    // During practice the board only accepts moves while you're actively solving (not while it's
    // rolling to the next mistake or checking your answer).
    if (S.practice && (!S.practice.solving || S.practice.busy)) { e.preventDefault(); return; }
    clearPracticeResult();
    _cancelBoardDrag?.();
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
  _cancelBoardDrag?.();
  const from = squareFromEvent(e);
  if (!from) return;
  e.preventDefault();
  // No live preview during the drag: the arrow is only drawn when the user releases
  // (i.e. once the decision about where the arrow should point has been made).
  const cleanup = () => {
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancelled);
    window.removeEventListener("blur", cleanup);
    if (_cancelBoardDrag === cleanup) _cancelBoardDrag = null;
  };
  const cancelled = ev => { if (ev.pointerId === e.pointerId) cleanup(); };
  const up = (ev) => {
    if (ev.pointerId !== e.pointerId) return;
    cleanup();
    const sq = squareFromEvent(ev);
    if (sq && sq !== from) toggleUserArrow(from, sq);   // drag → arrow
    else if (sq === from) toggleMark(from);             // click on a single square → mark
  };
  _cancelBoardDrag = cleanup;
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancelled);
  window.addEventListener("blur", cleanup);
}
// Drag: a floating piece clone follows the mouse; release on a legal square → move.
function startDrag(e, from, input = null) {
  let squares = input?.squares || sqByName;
  const fen = () => typeof input?.fen === 'function' ? input.fen() : input?.fen || activePos().fen;
  const squareAt = input?.squareAt || squareFromEvent;
  const deselect = () => {if(input)input.deselect();else {S.selectedSq=null;renderSelection();}};
  _cancelBoardDrag?.();
  let board = input?.board || UI.boardWrap.querySelector(".board");
  if (!board) return;
  const cell = board.getBoundingClientRect().width / 8;
  let orig = squares[from] && squares[from].querySelector(".piece, .piece-svg, .piece-img");
  const ghost = el("div", { class: "drag-piece ps-" + S.settings.pieceStyle });
  if (orig) ghost.append(orig.cloneNode(true));
  ghost.style.width = ghost.style.height = cell + "px";
  document.body.append(ghost);
  const place = (ev) => {
    const r = board.getBoundingClientRect();
    // The ghost is centered here: stop at the edge with at most half the piece outside.
    ghost.style.left = Math.max(r.left, Math.min(r.left + r.width, ev.clientX)) + "px";
    ghost.style.top = Math.max(r.top, Math.min(r.top + r.height, ev.clientY)) + "px";
  };
  place(e);
  if (orig) orig.style.visibility = "hidden";
  let moved = false, lastHover = null, done = false;
  const setHover = (sq) => {
    if (lastHover && squares[lastHover]) squares[lastHover].classList.remove("drag-over");
    if (sq && squares[sq] && isLegalTarget(fen(), from, sq)) { squares[sq].classList.add("drag-over"); lastHover = sq; }
    else lastHover = null;
  };
  // Shared cleanup (idempotent): remove listeners + ghost, show the original piece again.
  const finish = () => {
    if (done) return; done = true;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("blur", cancel);
    window.removeEventListener("contextmenu", onCtx);
    if (_cancelBoardDrag === cancel) _cancelBoardDrag = null;
    ghost.remove();
    if (orig) orig.style.visibility = "";
    if (lastHover && squares[lastHover]) squares[lastHover].classList.remove("drag-over");
  };
  // Cancel: put the piece back where it was picked up, and deselect.
  const cancel = () => { if (done) return; finish(); deselect(); };
  // Learning can paint the opponent's reply while the solver holds a piece.
  // Keep the pointer session and ghost, and hide the newly painted original.
  cancel.active = () => !done;
  cancel.refresh = next => {
    if (done) return;
    if (orig) orig.style.visibility = '';
    if (lastHover) squares[lastHover]?.classList.remove('drag-over');
    squares = next;
    orig = squares[from]?.querySelector('.piece, .piece-svg, .piece-img');
    if (!orig || orig.dataset.piece !== ghost.firstElementChild?.dataset.piece) {cancel();return;}
    board = orig.closest('.board, .learn-board') || board;
    orig.style.visibility = 'hidden';
    if (lastHover) setHover(lastHover);
  };
  const onCancel = ev => { if (ev.pointerId === e.pointerId) cancel(); };
  _cancelBoardDrag = cancel;
  // Right-click while dragging → cancel (both via contextmenu and the button bitmask).
  const onCtx = (ev) => { ev.preventDefault(); cancel(); };
  const move = (ev) => {
    if (ev.pointerId !== e.pointerId) return;
    if (ev.buttons & 2) { cancel(); return; }
    moved = true; place(ev); setHover(squareAt(ev));
  };
  const up = (ev) => {
    if (ev.pointerId !== e.pointerId) return;
    if (done) return;                 // already cancelled via right-click
    finish();
    const target = squareAt(ev);
    if (moved) {
      if (target && target !== from && isLegalTarget(fen(), from, target)) {
        if(input)input.move(from,target);else {S.selectedSq = null; applyUserMove(from, target, false);}   // drag → no animation
      } else { deselect(); }   // drag without a legal target → deselect
    }
    // pure click (not moved) → keep the selection for click-to-move
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("blur", cancel);
  window.addEventListener("contextmenu", onCtx);
  return cancel;
}

/* ---------------- Analysis mode: moves, variations, live engine ---------------- */
function playSanSound(san) {
  if (!S.settings.sound) return;
  playEvent(sanSound(san));
}
// Make a user move from the shown position. Starts/extends a variation (analysis mode),
// unless the move on the mainline is simply the next mainline move.
function applyUserMove(from, to, animate = true, promotion = null) {
  if(S.blank)return;
  if (S.practice && (!S.practice.solving || S.practice.busy)) return;
  if (promotion == null && new Chess(activePos().fen).moves({verbose:true}).some(move=>move.from===from&&move.to===to&&move.promotion)) {
    requestPromotion(from,to,animate);return;
  }
  // During mistake practice a move is an answer attempt, not a variation — route it there.
  if (S.practice) return practiceAttempt(from, to, promotion || "q");
  stopLineWalk();
  const fen = activePos().fen;
  let c, mv;
  try { c = new Chess(fen); mv = c.move({ from, to, promotion: promotion || "q" }); } catch { mv = null; }
  if (!mv) { S.selectedSq = null; renderSelection(); return; }
  const node = { fen: c.fen(), san: mv.san, from: mv.from, to: mv.to, color: mv.color, promotion: mv.promotion || "", captured: mv.captured || "", eval: null, best: null };
  if (!S.analysisMode) {
    // Following the recorded game stays on the mainline, including pending gaps
    // before a later completed evaluation. Never turn a locked move into a variation.
    const nextMain = S.positions[S.idx + 1];
    if (nextMain && nextMain.from === from && nextMain.to === to && (nextMain.promotion || "") === (mv.promotion || "")) {
      S.selectedSq = null;
      if (S.idx < mainlineNavigationLimit()) go(S.idx + 1);
      else renderSelection();
      return;
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
// Open a candidate at its first move; navigation through the rest stays manual.
function playLine(pv) {
  const ucis = (pv || "").split(/\s+/).filter(Boolean);
  if (!ucis.length) return;
  stopLineWalk();
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
  // Show the candidate move and leave the remaining continuation for manual navigation.
  v.idx = Math.min(startIdx + 1, v.positions.length - 1);
  S.selectedSq = null;
  playSanSound(v.positions[v.idx].san);
  paintBoard();
  renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
  requestLiveEval();
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
   Unlike clicking a line (which plays a fixed PV whose tail is unreliable), this uses each
   position's own analysis, reusing completed searches and analyzing missing positions, building the variation
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
  pauseBackgroundAnalysis();
  const token = ++S.liveToken; // navigation always invalidates pending work, even on cache hits
  if (!S.analysisMode || !S.variation) return;
  const v = S.variation, idx = v.idx, pos = v.positions[idx], count = enginePanelLineCount();
  const valid = () => token === S.liveToken && S.analysisMode && S.variation === v
    && v.idx === idx && v.positions[idx] === pos;
  for (const node of v.positions) node.searchPreview = null;
  S.liveError = null;
  S.liveEngine?.cancelPending();
  S.liveEngine?.stop();
  for (let i = idx; i >= Math.max(0, idx - 4); i--) reuseVariationAnalysis(v, i);
  refreshVariation();
  try {
    // The classifier looks back up to three moves, requiring four prior positions.
    const missing = [];
    for (let i = idx; i >= Math.max(0, idx - 4); i--) {
      const node = v.positions[i];
      if (!node.best || !node.eval || i === idx && variationNeedsLines(node)) missing.push(i);
    }
    if (!missing.length) return;
    const eng = await ensureLiveEngine();
    if (!valid()) return;
    for (const i of missing) {
      const node = v.positions[i];
      const terminal = variationTerminal(v, i);
      const res = terminal ? { score: terminal, bestmove: null, pv: "", lines: [] }
        : await eng.analyse(node.fen, S.settings.engineDepth, count, variationSearchHistory(v, i), preview => {
          if (!valid()) return;
          node.searchPreview = preview; node.searchPreviewToken = token;
          refreshVariation();
        });
      if (!valid()) return;
      node.eval = terminal || whiteRel(res.score, node.fen);
      node.best = res;
      node.analysisLineCount = count;
      const entry = rememberPanelLines(i, variationContextKey(v, i), count, res.lines || [], node.fen);
      if (entry.count === node.analysisLineCount) entry.result = res;
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

function variationContextKey(v, idx) {
  return engineContextKey(v.positions[idx].fen, variationSearchHistory(v, idx));
}
function reuseVariationAnalysis(v, idx) {
  const node = v.positions[idx], mainIdx = v.branchIdx + idx;
  const compatible = !S._panelNeedsLive && (!S.analyzedSettingsKey || S.analyzedSettingsKey === analysisSettingsKey());
  if (!compatible && node.best === S.bests[mainIdx]) { node.best = null; node.eval = null; }
  // Equal boards alone are insufficient: repetition and fifty-move history affect the search.
  if ((!node.best || !node.eval) && compatible
      && S.positions[mainIdx]?.fen === node.fen
      && JSON.stringify(variationSearchHistory(v, idx)) === JSON.stringify(searchHistory(S.positions, mainIdx))) {
    node.best = S.bests[mainIdx] || null;
    node.eval = S.evals[mainIdx] || null;
  }
  const cached = panelLineCache.get(variationContextKey(v, idx));
  if (!cached) return;
  const first = cached.lines?.[0];
  if (cached.result || first && (!node.best || cached.lines.length > (node.best.lines?.length || 0))) {
    node.best = cached.result || {score: first.score, bestmove: first.pv.trim().split(/\s+/)[0], lines: cached.lines};
    // Cached terminal results already use White's perspective; converting again reverses a White win.
    const terminal = !node.best.bestmove && variationTerminal(v, idx);
    node.eval = terminal || whiteRel(node.best.score, node.fen);
  }
  node.analysisLineCount = Math.max(node.analysisLineCount || 0, cached.count);
}
function variationNeedsLines(node) {
  return enginePanelLineCount() > Math.max(node.analysisLineCount || 1, node.best?.lines?.length || 0)
    && !terminalScore(node.fen);
}

function refreshVariation() {
  if (!S.analysisMode || !S.variation) return;
  classifyVariationMoves();
  paintBoard(); renderEvalBar(); renderMoves(); renderPlayers(); renderControls();
  renderReview(); renderStats(); renderEngineCurrent();
}

function invalidateVariationEvals() {
  if (!S.variation) return;
  for (const p of S.variation.positions) { p.eval = null; p.best = null; p.classif = null; p.moveGrade = null; p.searchPreview = null; p.analysisLineCount = 0; }
}

function resetLiveEngine() {
  stopPanelPrecalculation();
  S._lastEngineLines = null;
  S._panelCache = null;
  panelLineCache.clear();
  S._panelRequest = null;
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
function exitAnalysis(mainIdx,{render=true}={}) {
  stopLineWalk();
  if (!S.analysisMode) { if (mainIdx != null) go(mainIdx); return; }
  S.analysisMode = false; S.variation = null; S.selectedSq = null; S.liveToken++;
  if(!render)return;
  if (mainIdx != null) { go(mainIdx); return; }
  paintBoard(); renderEvalBar(); renderPlayers(); renderControls(); renderReview(); renderEngineCurrent();
}

/* ---------------- Move animation ----------------
   Minimalist slide: the piece is already on the destination square (paintBoard has
   drawn the final position) — we offset it back to the start square and let it
   slide into place via a transform transition. animSpeed 1..10 → duration 400..40 ms. */
function animDuration() { return moveAnimationDuration(S.settings); }
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
    piece.style.transition = `transform ${dur}ms ${MOVE_ANIMATION_EASING}`;
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
function renderBalanceBar(bar, e) {
  if (!bar.querySelector('.eval-balance-track')) {
    bar.replaceChildren(
      el('span', {class: 'eval-side eval-side-black', 'aria-hidden': 'true'}, 'B'),
      el('div', {class: 'eval-balance-track', 'aria-hidden': 'true'},
        el('div', {class: 'white-fill', style: {height: '50%'}}),
        el('span', {class: 'eval-midpoint'})),
      el('span', {class: 'eval-side eval-side-white', 'aria-hidden': 'true'}, 'W'),
      el('div', {class: 'eval-balance-readout', 'aria-hidden': 'true'},
        el('span', {class: 'eval-balance-score'}, '…')));
  }
  bar.className = 'evalbar eval-balance eb-' + (S.settings.barStyle || 'classic') + (S.flipped ? ' flipped' : '');
  bar.dataset.motion = S.settings.moveAnim === false ? 'off' : 'on';
  bar.dataset.pending = String(e == null);
  bar.setAttribute('role', 'img');
  bar.setAttribute('tabindex', '0');
  const score = bar.querySelector('.eval-balance-score');
  let description = 'Position evaluation: calculating…';
  if (e == null) score.textContent = '…';
  else {
    const cp = scoreToCp(e), side = cp >= 0 ? 'White' : 'Black';
    const share = e.mate != null ? (cp > 0 ? 100 : 0) : 50 + Math.max(-600, Math.min(600, cp)) / 600 * 46;
    // Use the same scale as Original. The rail shows advantage, not win probability.
    bar.querySelector('.white-fill').style.height = share + '%';
    bar.style.setProperty('--balance-white', share + '%');
    const rounded = Math.abs(cp / 100).toFixed(1);
    bar.dataset.favored = e.mate == null && rounded === '0.0' ? 'equal' : cp > 0 ? 'white' : 'black';
    score.textContent = e.mate != null ? 'M' + Math.abs(e.mate) : (rounded === '0.0' ? '0.0' : evalText(e));
    bar.style.setProperty('--balance-chars', score.textContent.length);
    description = e.mate != null ? `${side} has mate in ${Math.abs(e.mate)}.`
      : rounded === '0.0' ? 'Equal position.' : `${side} is ahead by ${rounded} pawns.`;
    description += ' Evaluation from White’s perspective: positive favors White; negative favors Black.';
  }
  // Keep the previous fill during live search, but never present its score as current.
  bar.title = description;
  bar.setAttribute('aria-label', description);
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
  const design = panelDesign('evalbar', S.settings);
  if (design === 'balance') {
    if (!bar) { bar = el('div'); UI.evalbar.append(bar); }
    bar.dataset.design = design;
    renderBalanceBar(bar, e);
    return;
  }
  if (bar?.dataset.design !== 'original') { bar?.remove(); bar = null; }
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
  bar.dataset.design = design;
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
  const text = evalBarText(e);
  bar.style.setProperty("--score-chars", text.length);
  bar.querySelector(".white-fill").style.height = whiteShare + "%";
  bar.querySelector(".score.top").textContent = cp < 0 ? text : "";
  bar.querySelector(".score.bot").textContent = cp >= 0 ? text : "";
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
  return last?.split('.')[0] || last;
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
function playerStrip(side, material = capturedInfo()) {
  const p = S.players[side];
  const toMove = activePos().fen.split(" ")[1] === side;
  const clock = clockFor(side);
  const { capturedBy, diff } = material;
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
  return el("div", { class: "player-strip" + (toMove ? " active" : ""),
    "data-player-key": JSON.stringify([side,p.name,p.rating,p.country,p.countryName]),
    "data-capture-key": caps.join(",") + "|" + advText },
    avatar,
    el("div", { class: "who" },
      el("span", { class: "name" }, p.name, p.rating ? el("span", { class: "elo" }, ` (${p.rating})`) : null),
      captured,
    ),
    clock ? el("span", { class: "clock tnum" }, clock) : null,
  );
}
function renderPlayers() {
  const material = capturedInfo();
  let replaced = false;
  for (const [mount, side] of [[UI.playerTop,S.flipped ? "w" : "b"],[UI.playerBot,S.flipped ? "b" : "w"]]) {
    const p = S.players[side], key = JSON.stringify([side,p.name,p.rating,p.country,p.countryName]);
    const strip = mount.firstElementChild;
    if (!strip || strip.dataset.playerKey !== key) { mount.replaceChildren(playerStrip(side,material)); replaced = true; continue; }
    strip.classList.toggle("active",activePos().fen.split(" ")[1] === side);
    const clock = clockFor(side), clockNode = strip.querySelector(".clock");
    if (clockNode) { if (!clock) clockNode.remove(); else if (clockNode.textContent !== clock) clockNode.textContent = clock; }
    else if (clock) strip.append(el("span",{class:"clock tnum"},clock));
    const caps = material.capturedBy(side), ahead = side === "w" ? material.diff > 0 : material.diff < 0;
    const advantage = ahead ? "+" + Math.abs(material.diff) : "", captureKey = caps.join(",") + "|" + advantage;
    if (strip.dataset.captureKey !== captureKey) {
      strip.dataset.captureKey = captureKey;
      const tray = strip.querySelector(".cap-tray");
      tray.classList.toggle("is-empty",!caps.length);
      tray.replaceChildren(...caps.map(code=>el("img",{class:"cap-pc",src:_url(`pieces-img/cburnett/${code}.svg`),alt:""})));
      const adv = strip.querySelector(".adv");
      if (advantage) { if (adv) adv.textContent = advantage; else tray.after(el("span",{class:"adv"},advantage)); }
      else adv?.remove();
    }
  }
  if (replaced) alignPlayers();
}
// Align the player strip with the board's actual left edge (the board can be
// centered in its module, so we measure instead of guessing a fixed offset).
function alignPlayers() {
  // The learning board has its own geometry; keep the saved review labels still.
  if (learningWorkspace?.embedded) return;
  const board = UI.boardWrap && UI.boardWrap.querySelector(".board");
  const top = UI.playerTop && UI.playerTop.querySelector(".player-strip");
  if (!board || !top) return;
  const scale=panelContentScale('board')*canvasScale;
  const off = Math.max(4, Math.round((board.getBoundingClientRect().left - UI.boardWrap.getBoundingClientRect().left)/scale));
  top.style.paddingLeft = off + "px";
  const bot = UI.playerBot.querySelector(".player-strip");
  if (bot) bot.style.paddingLeft = off + "px";
}

/* ---------------- Controls ---------------- */
function renderControls() {
  const mode = S.practice ? "practice" : S.analysisMode && S.variation ? "variation" : "mainline";
  let refs = UI.controlRefs;
  // Progress updates can arrive between mouse-down and mouse-up. Keep the buttons
  // (and their icons) mounted so clicks, focus and hover survive those updates.
  if (!refs || refs.mode !== mode) {
    refs = UI.controlRefs = { mode };
    if (mode === "practice") {
      refs.position = el("span", { class: "pos practice-pos" });
      refs.status = el("span", { class: "practice-status" });
      UI.controls.replaceChildren(refs.position, refs.status,
        el("button", { class: "exit-analysis", title: "Exit practice (Esc)", onclick: exitPractice }, el("span", { class: "ea-x" }, "✕"), "Exit"));
    } else {
      const variation = mode === "variation";
      refs.first = el("button", { "aria-label": variation ? "Variation start" : "Start",
        onclick: variation ? () => gotoVar(0) : () => go(0) }, icon("first"));
      refs.previous = el("button", { "aria-label": variation ? "Previous move" : "Previous", onclick: navPrev }, icon("prev"));
      refs.center = variation
        ? el("button", { class: "exit-analysis", title: "Exit analysis (Esc)", onclick: () => exitAnalysis(S.variation.branchIdx) }, el("span", { class: "ea-x" }, "✕"), "Exit")
        : el("button", { class: "play", onclick: toggleAuto });
      refs.next = el("button", { "aria-label": variation ? "Next move" : "Next", onclick: navNext }, icon("next"));
      // Read the current endpoint on click; the game or variation can change.
      refs.last = el("button", { "aria-label": variation ? "Variation end" : "End",
        onclick: variation ? () => gotoVar(S.variation.positions.length - 1) : () => go(mainlineNavigationLimit()) }, icon("last"));
      UI.controls.replaceChildren(refs.first, refs.previous, refs.center, refs.next, refs.last);
    }
  }
  if (S.practice) {
    const p = S.practice;
    const cur = Math.min(p.i + 1, p.spots.length);
    const status = p.rolling ? "Rolling to your misstep…"
      : p.demoing ? "Replaying your move…"
      : p.busy ? "Checking…"
      : p.solving ? "Find a stronger move" : "✓ Correct!";
    const position = `Practice ${cur}/${p.spots.length}`;
    if (refs.position.textContent !== position) refs.position.textContent = position;
    if (refs.status.textContent !== status) refs.status.textContent = status;
    return;
  }
  if (S.analysisMode && S.variation) {
    const v = S.variation;
    const atEnd = v.idx >= v.positions.length - 1;
    // Same layout as the normal controls — the central green Play slot becomes a red Exit button.
    const atStart = v.idx <= 0;
    if (refs.first.disabled !== atStart) refs.first.disabled = atStart;
    if (refs.next.disabled !== atEnd) refs.next.disabled = atEnd;
    if (refs.last.disabled !== atEnd) refs.last.disabled = atEnd;
    return;
  }
  // Pending gaps can be crossed, but moves after the furthest result stay locked.
  const atEnd = S.blank || S.idx >= mainlineNavigationLimit();
  refs.first.disabled = S.blank;
  refs.previous.disabled = S.blank;
  if (refs.next.disabled !== atEnd) refs.next.disabled = atEnd;
  if (refs.last.disabled !== atEnd) refs.last.disabled = atEnd;
  const playing = !!S.autoTimer;
  refs.center.disabled = S.blank;
  const label = playing ? "Pause" : "Play";
  if (refs.center.getAttribute("aria-label") !== label) {
    refs.center.setAttribute("aria-label", label);
    refs.center.replaceChildren(icon(playing ? "pause" : "play"));
  }
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
  ["old_soviet", "Old Soviet"], ["mentor", "Ralph"], ["wise_grandma", "Wise Grandma"],
  ["life_coach", "Julie"], ["charmer", "Charmer"], ["hype_beast", "Hype Beast"],
  ["streamer", "Streamer"], ["sportscaster", "Sportscaster"],
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
  await writeSettings({ coach: id });
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
  await writeSettings({ coachPlain: plain });
  S.coach = plain ? null : await loadCoach(S.settings.coach);
  _ipSig = null;                                   // re-pick + re-type in the new voice
  if (S.practice) S.practice.coachTyped = false;
  renderReview();
  if (UI.settings && !UI.settings.hidden) renderSettings();
}

/* ---------------- Animated coach avatar ----------------
   The lifelike portraits live as self-contained rig HTML files (one per personality) that expose a
   uniform postMessage API. They load as extension pages in an <iframe>; animation commands use
   postMessage (emotion/look/talk/gestures/prop). The parent also hit-tests the painted SVG so pressing
   the character reacts without blocking the transparent space. Unbuilt rigs and "Off" hide the module. */
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
let _coachPointerActive = false, _coachPointerRAF = null, _coachPointerPoint = null;
let _coachPointerBound = false;
const COACH_SETTLE_MS = 250, COACH_REACTION_HOLD_MS = 1200;
let _coachReactionT = null, _coachReactAt = -Infinity, _coachEmotion = null;
let _coachSovietHeadAt = -Infinity;

function resetCoachAnimation() {
  clearCoachPointer();
  for (const timer of [_coachReactionT, _coachIdleT, _coachGlanceT, _coachSpecialT, _coachCupT]) clearTimeout(timer);
  _coachReactionT = _coachIdleT = _coachGlanceT = _coachSpecialT = _coachCupT = null;
  _coachIdleStarted = false; _coachGlanceUntil = 0; _coachCupUp = false;
  _coachTalking = false; _coachReactAt = -Infinity; _coachEmotion = null;
  _coachSovietHeadAt = -Infinity;
}

function coachSend(cmd) {
  if (_coachFrame && _coachReady && _coachFrame.contentWindow) {
    try { _coachFrame.contentWindow.postMessage(cmd, "*"); } catch {}
  }
}
// The portrait lets clicks pass through, so observe the pointer in the parent document.
// Coalesce movement into one message per paint, using the current scaled frame bounds.
function clearCoachPointer() {
  if (_coachPointerRAF !== null) cancelAnimationFrame(_coachPointerRAF);
  _coachPointerRAF = null; _coachPointerPoint = null;
  if (_coachPointerActive) coachSend({ coachCmd: "pointer", value: null });
  _coachPointerActive = false;
}
function coachHitTest(x, y) {
  if (!_coachReady || !_coachFrame || S.reorganize) return false;
  const rect = _coachFrame.getBoundingClientRect();
  if (!rect.width || !rect.height || x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return false;
  try {
    // Probe the stacking order without letting the otherwise transparent iframe capture input.
    const previous = _coachFrame.style.pointerEvents;
    try {
      _coachFrame.style.pointerEvents = "auto";
      if (document.elementFromPoint(x, y) !== _coachFrame) return false;
    } finally { _coachFrame.style.pointerEvents = previous; }
    // Use the rig's painted SVG shapes; its empty background must still pass clicks through.
    const target = _coachFrame.contentDocument?.elementFromPoint(
      (x - rect.left) * _coachFrame.clientWidth / rect.width,
      (y - rect.top) * _coachFrame.clientHeight / rect.height);
    return !!target?.closest("#figure");
  } catch { return false; }
}
function bindCoachPointer() {
  if (_coachPointerBound) return;
  _coachPointerBound = true;
  let pressedPointer = null, suppressClick = false;
  const consume = ev => { ev.preventDefault(); ev.stopImmediatePropagation(); };
  document.addEventListener("pointerdown", ev => {
    if (ev.button !== 0 || ev.isPrimary === false) return;
    pressedPointer = null; suppressClick = false;
    if (!coachHitTest(ev.clientX, ev.clientY)) return;
    pressedPointer = ev.pointerId; suppressClick = true;
    consume(ev);
    coachSend({ coachCmd: "shake" });
  }, true);
  document.addEventListener("pointerup", ev => {
    if (pressedPointer === null || ev.pointerId !== pressedPointer) return;
    pressedPointer = null; consume(ev);
  }, true);
  document.addEventListener("click", ev => {
    if (!suppressClick) return;
    suppressClick = false; consume(ev);
  }, true);
  const cancelPress = () => { pressedPointer = null; suppressClick = false; };
  document.addEventListener("pointercancel", cancelPress);
  window.addEventListener("blur", cancelPress);
  document.addEventListener("pointermove", ev => {
    if (ev.pointerType === "touch" || !_coachReady || document.hidden) return;
    _coachPointerPoint = { x: ev.clientX, y: ev.clientY };
    if (_coachPointerRAF !== null) return;
    _coachPointerRAF = requestAnimationFrame(() => {
      _coachPointerRAF = null;
      if (!_coachFrame || !_coachReady || !_coachPointerPoint) return;
      const rect = _coachFrame.getBoundingClientRect(), p = _coachPointerPoint;
      const dx = Math.max(rect.left - p.x, 0, p.x - rect.right);
      const dy = Math.max(rect.top - p.y, 0, p.y - rect.bottom);
      if (!rect.width || !rect.height || Math.hypot(dx, dy) > 100) { clearCoachPointer(); return; }
      _coachPointerActive = true;
      coachSend({ coachCmd: "pointer", value: { x: (p.x - rect.left) / rect.width, y: (p.y - rect.top) / rect.height } });
    });
  }, { passive: true });
  document.addEventListener("pointerleave", clearCoachPointer);
  document.addEventListener("pointercancel", clearCoachPointer);
  document.addEventListener("scroll", clearCoachPointer, { capture: true, passive: true });
  document.addEventListener("visibilitychange", clearCoachPointer);
  window.addEventListener("blur", clearCoachPointer);
  window.addEventListener("resize", clearCoachPointer);
}
// (Re)mount the iframe for the active personality. Reuses the frame if the coach hasn't changed.
function renderCoachAvatar() {
  if (!UI || !UI.coach) return;
  const id = S.settings.coach || "";
  const rig = COACH_RIGS[id] || null;
  const mod = UI.coach.closest(".mod");
  UI.canvas.classList.toggle("has-coach", !!rig);   // the insight text leaves room for the portrait
  if (!rig) {                                   // "Off" or no rig built yet → hide the module entirely
    resetCoachAnimation();
    _coachFrame = null; _coachReady = false; _coachId = null;
    UI.coach.replaceChildren();
    if (mod) mod.hidden = true;
    return;
  }
  if (mod) mod.hidden = false;
  bindCoachPointer();
  if (id === _coachId && _coachFrame) return;   // same coach already mounted → keep it (no fl/reset)
  resetCoachAnimation();
  _coachId = id; _coachReady = false;
  const frame = el("iframe", {
    class: "coach-frame", title: "Coach", scrolling: "no",
    src: browserAPI.runtime.getURL(COACH_RIG_DIR + rig),
  });
  frame.addEventListener("load", () => {
    if (_coachFrame !== frame) return;   // a removed portrait may finish loading after a switch
    _coachReady = true;
    frame.classList.add("ready");   // fade the portrait in now that its document has loaded

    coachSend({ coachCmd: "look", value: "center" });
    coachSend({ coachCmd: "talk", value: _coachTalking });
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
function coachSipCup(chance = 0.21) {
  if (_coachCupUp || (chance < 1 && Math.random() >= chance)) return;
  _coachCupUp = true;
  coachSend({ coachCmd: "raise", value: true });
  clearTimeout(_coachCupT);
  _coachCupT = setTimeout(() => { coachSend({ coachCmd: "raise", value: false }); _coachCupUp = false; }, 2000 + Math.random() * 2000);
}
// Mutually exclusive actions leave room for expression-only reactions. Head gestures are
// restrained even when rapidly browsing a run of good moves; tea keeps its own lowering timer.
const SOVIET_REACTIONS = {
  exceptional: [["nod", 0.35], ["tea", 0.15]],
  positive: [["nod", 0.18], ["tea", 0.10]],
  ordinary: [["tea", 0.05]],
  negative: [["shake", 0.12], ["eyeRoll", 0.28]],
  blunder: [["shake", 0.25], ["eyeRoll", 0.30]],
};
function coachSovietReaction(cls) {
  const group = {brilliant:"exceptional", great:"exceptional", best:"positive", excellent:"positive",
    good:"ordinary", book:"ordinary", inacc:"negative", mistake:"negative", miss:"negative", blunder:"blunder"}[cls];
  let r = Math.random();
  for (const [cmd, chance] of SOVIET_REACTIONS[group] || []) {
    r -= chance;
    if (r >= 0) continue;
    if (cmd === "tea") coachSipCup(1);
    else {
      if (cmd === "nod" || cmd === "shake") {
        const now = performance.now();
        if (now - _coachSovietHeadAt < 8000) return;
        _coachSovietHeadAt = now;
      }
      coachSend({coachCmd:cmd});
    }
    return;
  }
}
function coachSpecial() {
  if (_coachId === "old_soviet") { coachSipCup(); return; }
  const sp = COACH_SPECIAL[_coachId];
  if (!sp) { coachSend({ coachCmd: "nod" }); return; }   // ambient-special coaches → small nod
  if (_coachSpecialT) return;   // let an existing prop gesture finish before starting another
  if (sp.journal) {
    coachSend({ coachCmd: "openJournal", value: true });
    _coachSpecialT = setTimeout(() => { _coachSpecialT = null; coachSend({ coachCmd: "openJournal", value: false }); }, 2600);
  } else if (sp.toggle) {
    coachSend({ coachCmd: "raise" });
    _coachSpecialT = setTimeout(() => { _coachSpecialT = null; coachSend({ coachCmd: "raise" }); }, 2400);
  } else {
    coachSend({ coachCmd: sp.cmd });
  }
}
// Wait for navigation to settle and hold each reaction long enough to read naturally.
// Replace pending moves instead of replaying the expressions of skipped positions.
function coachReactPly(idx) {
  if (!_coachReady) return;
  clearTimeout(_coachReactionT);
  const now = performance.now();
  const delay = Math.max(COACH_SETTLE_MS, _coachReactAt + COACH_REACTION_HOLD_MS - now);
  _coachGlanceUntil = now + delay + 1700;
  _coachReactionT = setTimeout(() => {
    _coachReactionT = null;
    if (!_coachReady || S.idx !== idx) return;
    _coachReactAt = performance.now();
    coachApplyReaction(idx);
  }, delay);
}
function coachApplyReaction(idx) {
  const cls = idx > 0 ? S.classif[idx] : null;
  const emo = idx === 0 ? "neutral" : (COACH_QUALITY_EMOTION[cls] || "neutral");
  if (emo !== _coachEmotion) {
    _coachEmotion = emo;
    coachSend({ coachCmd: "emotion", value: emo });
  }
  // glance down-and-to-the-left at the board, then return to centre
  coachSend({ coachCmd: "look", value: "downleft" });
  _coachGlanceUntil = performance.now() + 1700;
  clearTimeout(_coachGlanceT);
  _coachGlanceT = setTimeout(() => coachSend({ coachCmd: "look", value: "center" }), 1500);
  if (idx > 0) {
    if (_coachId === "old_soviet") { coachSovietReaction(cls); return; }
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
      if (_coachReady && !document.hidden && !_coachPointerActive && performance.now() > _coachGlanceUntil && !_coachTalking) {
        // His longer vignettes own the head, face and tea until a review reaction interrupts.
        if (_coachId === "old_soviet") { coachSend({ coachCmd: "ambient" }); tick(); return; }
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
  if(S.blank){
    UI.review.replaceChildren(el("div",{class:"panel insight-panel"},
      el("div",{class:"ip-body"},el("div",{class:"ip-text"},"No game loaded."))));
    return;
  }
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
    body.append(el("div", { class: "ip-head" },
      el("button", { type: "button", class: "practice-btn", title: "Replay the game and re-solve every mistake you made", onclick: startPractice }, "Practice your mistakes")));
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
  // Modern already shows the evaluation in its evaluation panel.
  const ev = S.evals[S.idx];
  const evCp = ev ? scoreToCp(ev) : null;
  const evTxt = ev ? evalText(ev) : "";

  const head = el("div", { class: "ip-head" });
  if (cfg) head.append(gradeBadge(cls, S.moveGrades[S.idx], "ip-badge"));
  // Special coach phrasing can omit the category, so name it beside the move.
  const sanDisplay = S.settings.coach && !S.settings.coachPlain && cfg ? `${san} ${categoryName(cls)}` : san;
  head.append(el("span", { class: "ip-move" }, sanDisplay));
  if (evTxt && baseUiSetup() !== 'modern') head.append(el("span", { class: "ip-eval " + (evCp >= 0 ? "pos" : "neg") }, evTxt));
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
// Practice coaching: what to do, with an inline Hint button after the first failed try.
function renderPracticeCoach() {
  const p = S.practice;
  const body = el("div", { class: "ip-body practice-coach" });
  body.append(el("div", { class: "ip-head" },
    el("span", { class: "ip-tag practice" }, "Practice")));

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
  if (p.solving && (p.fails >= 1 || p.hinted)) {
    body.append(el("div", { class: "ip-text" }, "Click to get a ",
      el("button", { class: "ip-hint-btn ip-hint-inline" + (S.practiceHint ? " on" : ""), title: "Highlight the piece to move", onclick: showPracticeHint }, "Hint")));
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
// Repeated category clicks cycle chronologically, wrapping after the last match.
// Other navigation starts a fresh cycle at the first match.
let _categoryJump = null;
function jumpToCategory(side, k) {
  if (S.blank || S.practice) return;
  const plies = [];
  for (let i = 1; i <= S.total; i++) {
    const pos = S.positions[i];
    if (pos && pos.color === side && S.classif[i] === k) plies.push(i);
  }
  if (!plies.length) return;
  const repeat = !S.analysisMode && _categoryJump?.positions === S.positions &&
    _categoryJump.side === side && _categoryJump.k === k && _categoryJump.ply === S.idx;
  const ply = plies[repeat ? (plies.indexOf(S.idx) + 1) % plies.length : 0];
  gotoMainline(ply);
  _categoryJump = {positions: S.positions, side, k, ply};
}
function setCategoryName(cls, value) {
  const name = cleanCategoryName(value);
  const names = { ...S.settings.categoryNames };
  if (!name || name === QUALITY[cls].name) delete names[cls];
  else names[cls] = name;
  S.settings.categoryNames = names;
  writeSettings({ categoryNames: { [cls]: names[cls] } });
  hideQTip(); hideBoardBadgeTip();
  _movesSig = null; _ipSig = null;
  if (S.practice) { S.practice.coachLine = null; S.practice.coachTyped = false; }
  UI.stats.querySelectorAll("[data-category]").forEach(label => {
    label.replaceWith(categoryLabel(label.dataset.category));
  });
  renderMoves(); buildBoard(); renderReview();
}
function categoryLabel(cls) {
  const explain = panelDesign('accuracy', S.settings) === 'original';
  return el("span", {
    class: "qlabel", "data-category": cls, tabindex: 0,
    onmouseenter: explain ? e => showQTip(e.currentTarget, cls) : undefined,
    onmouseleave: explain ? hideQTip : undefined,
    onfocus: explain ? e => showQTip(e.currentTarget, cls) : undefined,
    onblur: explain ? hideQTip : undefined,
  }, gradeBadge(cls, null, "qsym", {}, true),
  el("span", { class: "nm" }, categoryName(cls)));
}
function setAccuracyPage(page, focus = false) {
  const previous = S.accuracyPage || 0;
  const next = (page + ACCURACY_PAGES.length) % ACCURACY_PAGES.length;
  const oldPage = UI.stats.querySelector('.acc-page');
  const motion = S.settings.moveAnim !== false && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  overviewReveal.stop();
  Object.values(phaseReveals).forEach(reveal => reveal.stop());
  const leaf = motion && previous !== next && oldPage?.animate ? oldPage.cloneNode(true) : null;
  const scrollTop = oldPage?.scrollTop || 0;
  if (leaf && oldPage.closest('.accuracy-phase-report-2')) leaf.classList.add('accuracy-phase-report-2');
  S.accuracyPage = (page + ACCURACY_PAGES.length) % ACCURACY_PAGES.length;
  statsRefs = null;
  hideQTip();
  renderStats();
  if (leaf) {
    const panel = UI.stats.querySelector('.accuracy-panel'), incoming = panel.querySelector('.acc-page');
    leaf.removeAttribute('id'); leaf.removeAttribute('aria-labelledby');
    leaf.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    leaf.setAttribute('aria-hidden', 'true'); leaf.inert = true;
    leaf.classList.add('acc-turn-leaf');
    // Match the incoming page in local coordinates, including content scaling.
    Object.assign(leaf.style, {top: incoming.offsetTop + 'px', height: incoming.offsetHeight + 'px'});
    panel.append(leaf);
    leaf.scrollTop = scrollTop;
    const forward = page > previous || previous === 2 && next === 0;
    const direction = forward ? 1 : -1;
    const turn = leaf.animate([
      {transform: 'translateX(0)', opacity: 1},
      {transform: 'translateX(' + (-direction * 10) + 'px)', opacity: 0},
    ], {duration: 180, easing: 'cubic-bezier(.22,.65,.3,1)', fill: 'forwards'});
    turn.onfinish = turn.oncancel = () => leaf.remove();
    for (const content of (incoming.querySelector('.acc-fit-content') || incoming).children) {
      if (content.classList.contains('acc-players')) continue;
      content.animate([{transform: 'translateX(' + (direction * 10) + 'px)', opacity: .35},
        {transform: 'translateX(0)', opacity: 1}], {duration: 280, easing: 'cubic-bezier(.22,.65,.3,1)'});
    }
  }
  if (focus) UI.stats.querySelector(typeof focus === 'string' ? focus : '[aria-selected="true"]')?.focus({preventScroll: true});
}

// Retain the same controls while the result panel is refreshed.
let accuracyNavigation = null;
function accuracyPager() {
  accuracyNavigation ||= createAccuracyNavigation({doc: document, el, names: ACCURACY_PAGES,
    select: (page, focus = false) => setAccuracyPage(page, focus),
    motion: () => S.settings.moveAnim !== false && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches});
  return accuracyNavigation.element;
}
function accuracyDial(value, busy) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('aria-hidden', 'true');
  for (const [className, length] of [['acc-dial-track', 75], ['acc-dial-fill', busy || value == null ? 0 : .75 * Math.max(0, Math.min(100, value))]]) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (const [key, val] of Object.entries({cx: 60, cy: 60, r: 51, pathLength: 100,
      fill: 'none', transform: 'rotate(135 60 60)', class: className, 'stroke-dasharray': length + ' 100'})) circle.setAttribute(key, val);
    if (className === 'acc-dial-fill' && length === 0) circle.setAttribute('stroke-opacity', 0);
    svg.append(circle);
  }
  return el('div', {class: 'acc-dial'}, svg,
    busy ? loaderNode('acc-val', 'var(--accent)') : el('strong', {class: 'acc-val'},
      value == null ? '—' : value >= 100 ? '100' : value.toFixed(1)),
    el('span', {class: 'acc-dial-label'}, 'Accuracy'));
}
function updateQualityDistribution(root, sides) {
  if (!root) return;
  const totals = sides.map(side => QBREAK_FULL.reduce((sum, k) => sum + (S.counts[side][k] || 0), 0));
  sides.forEach((side, i) => {
    root.querySelectorAll('[data-quality-total="' + side + '"]').forEach(node => {
      node.textContent = totals[i];
      node.setAttribute('aria-label', S.players[side].name + ': ' + totals[i] + ' moves classified' + (S.analyzing ? ' so far' : ''));
    });
    for (const k of QBREAK_FULL) {
      const share = totals[i] ? (S.counts[side][k] || 0) / totals[i] * 100 : 0;
      root.querySelector('[data-quality-segment="' + side + '-' + k + '"]')?.style.setProperty('width', share + '%');
      root.querySelector('.quality-distribution [data-category="' + k + '"]')?.closest('.qbreak-row')
        .style.setProperty(i === 0 ? '--share-left' : '--share-right', share + '%');
    }
  });
}
function renderMoveQuality(sides, rows) {
  const design = panelDesign('accuracyQuality', S.settings), distribution = design === 'distribution';
  if (!distribution) return el('div', {class: 'acc-quality quality-original', 'data-quality-design': design},
    originalQualityBreakdown(sides, rows, S.originalAccuracyExpanded, () => {
      S.originalAccuracyExpanded = !S.originalAccuracyExpanded;
      statsRefs = null; renderStats();
      UI.stats.querySelector('.qbreak-toggle')?.focus({preventScroll: true});
    }));
  const modern = ['phases-modern', 'phases-modern-v2'].includes(panelDesign('accuracy', S.settings));
  const content = el('div', {class: 'acc-quality' + (distribution ? ' quality-distribution' : ''), 'data-quality-design': design},
    distribution && !modern ? el('div', {class: 'quality-summary'},
      el('div', {class: 'quality-totals'},
        el('strong', {'data-quality-total': sides[0]}),
        el('span', {}, S.analyzing && !S.blank ? 'Classified so far' : 'Moves classified'),
        el('strong', {'data-quality-total': sides[1]})),
      el('div', {class: 'quality-spectrums', 'aria-hidden': 'true'}, ...sides.map(side =>
        el('div', {class: 'quality-spectrum'}, ...QBREAK_FULL.map(k =>
          el('i', {'data-quality-segment': side + '-' + k, style: {background: QUALITY[k].color}})))))) : null,
    el('div', {class: 'qbreak'}, ...QBREAK_FULL.map(k => {
      const counts = sides.map((side, i) => {
        const count = S.counts[side][k] || 0;
        return el('button', {type: 'button', class: 'ct ' + (i === 0 ? 'left ' : '') + (count ? '' : 'zero'),
          disabled: !count, 'aria-label': S.players[side].name + ': ' + count + ' ' + categoryName(k) + ' moves. Cycle through moves.',
          onclick: event => { if (event.detail) event.currentTarget.blur(); jumpToCategory(side, k); }}, count);
      });
      rows[k] = counts;
      return el('div', {class: 'qbreak-row', style: distribution ? {'--quality-color': QUALITY[k].color} : {}},
        counts[0], categoryLabel(k), counts[1]);
    })));
  if (distribution) updateQualityDistribution(content, sides);
  return content;
}
// Share Old's compact breakdown and category order with the Original page option.
function originalQualityBreakdown(sides, rows, expanded, onToggle) {
  const keys = expanded ? QBREAK_FULL : QBREAK_SUMMARY;
  return el('div', {class: 'qbreak'}, ...keys.map(k => {
    const counts = sides.map((side, i) => {
      const count = S.counts[side][k] || 0;
      return el('button', {type: 'button', class: 'ct ' + (i === 0 ? 'left ' : '') + (count ? '' : 'zero'),
        disabled: !count, 'aria-label': S.players[side].name + ': ' + count + ' ' + categoryName(k) + ' moves. Cycle through moves.',
        onclick: event => { if (event.detail) event.currentTarget.blur(); jumpToCategory(side, k); }}, count);
    });
    rows[k] = counts;
    return el('div', {class: 'qbreak-row'}, counts[0], categoryLabel(k), counts[1]);
  }), el('button', {type: 'button', class: 'qbreak-toggle' + (expanded ? ' open' : ''),
    title: expanded ? 'Show fewer categories' : 'Show all categories',
    'aria-expanded': String(expanded), onclick: onToggle}, icon('chevron')));
}
// Wait for completed evidence on both sides and keep later phases behind earlier
// ones, even when pool workers finish positions out of order.
function accuracyPhasePending(phase, busy) {
  return busy && GAME_PHASES.slice(0, GAME_PHASES.indexOf(phase) + 1).some(key =>
    ['w', 'b'].some(side => !S.gameStats?.[side]?.phases[key]?.complete));
}
function renderAccuracyPhases(sides, busy, bars = true) {
  return el('div', {class: 'acc-phases', 'aria-label': 'Accuracy by game phase'},
    bars ? null : el('h4', {}, 'Accuracy by phase'),
    ...GAME_PHASES.map((phase, i) => {
      const pending = accuracyPhasePending(phase, busy);
      const values = sides.map(side => S.gameStats?.[side]?.phases[phase]?.accuracy);
      const scores = values.map(value => el('strong', {}, pending ? accuracyPendingValue() : value == null ? '—' : value.toFixed(1)));
      const label = el('span', {}, ['Opening', 'Middlegame', 'Endgame'][i]);
      return el('div', {class: 'acc-phase-row', 'data-phase': phase, 'data-pending': String(pending)},
        ...(bars ? [el('div', {class: 'acc-phase-values'}, scores[0], label, scores[1]),
          el('div', {class: 'acc-phase-bars'}, ...values.map(value =>
            el('span', {class: 'acc-phase-track', 'aria-hidden': 'true'},
              el('i', {style: {width: (pending || value == null ? 0 : value) + '%'}}))))]
          : [scores[0], label, scores[1]]));
    }));
}
function updateAccuracyPhases(sides, busy, design) {
  const current = UI.stats.querySelector('.acc-phases,.phase-report');
  if (!current) return;
  const next = design.startsWith('phases')
    ? renderPhaseReport(sides, busy, design === 'phases2') : renderAccuracyPhases(sides, busy, design !== 'pages');
  statsRefs.phaseKeys ||= {};
  for (const phase of GAME_PHASES) {
    const key = accuracyPhasePending(phase, busy) ? 'pending' : JSON.stringify(sides.map(side => S.gameStats?.[side]?.phases[phase]));
    if (statsRefs.phaseKeys[phase] === key) continue;
    statsRefs.phaseKeys[phase] = key;
    const oldRow = current.querySelector('[data-phase="' + phase + '"]');
    const row = next.querySelector('[data-phase="' + phase + '"]');
    if (oldRow.dataset.pending === 'true' && row.dataset.pending === 'true') continue;
    const reveal = oldRow.dataset.pending === 'true' && row.dataset.pending === 'false';
    phaseReveals[phase].stop();
    oldRow.replaceWith(row);
    if (reveal) phaseReveals[phase].mount(row, {game: S.positions, key: JSON.stringify([design, S.batchGen, phase, key]),
      enabled: S.settings.moveAnim !== false && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches});
  }
}
function renderModernAdvanced(sides, busy) {
  const stats = sides.map(side => S.gameStats?.[side]);
  const decimal = value => value == null ? null : value.toFixed(1);
  const percent = value => value == null ? null : Math.round(value) + '%';
  const duration = value => value == null ? null : value < 60 ? value.toFixed(1) + 's'
    : Math.floor(Math.round(value) / 60) + ':' + String(Math.round(value) % 60).padStart(2, '0');
  const moveName = ply => {
    if (ply == null || !S.positions[ply]) return '';
    return Number(S.positions[ply - 1].fen.split(' ')[5]) + (S.positions[ply].color === 'w' ? '. ' : '… ') + S.positions[ply].san;
  };
  const root = el('div', {class: 'acc-advanced advanced-report'});
  const cell = (index, value, {detail = '', jump = null, className = ''} = {}) => {
    const available = value != null && !busy;
    return el(jump != null && available ? 'button' : 'div', {class: 'advanced-value ' + className,
      ...(jump != null && available ? {type: 'button', onclick: () => gotoMainline(jump)} : {}),
      'aria-label': S.players[sides[index]].name + ': ' + (busy ? 'Analyzing' : value ?? 'Not enough data') + (available && detail ? '. ' + detail : '')},
      el('strong', {class: 'acc-stat-value'}, busy ? accuracyPendingValue() : value ?? '—'),
      detail ? el('span', {class: 'advanced-detail'}, busy ? ' ' : detail) : null);
  };
  const closeInfo = () => {
    root.querySelectorAll('.advanced-info[aria-expanded="true"]').forEach(button => {
      button.setAttribute('aria-expanded', 'false');
      root.querySelector('#' + button.getAttribute('aria-controls')).hidden = true;
    });
  };
  const row = (id, label, explanation, cells) => {
    const description = el('p', {class: 'advanced-explainer', id: 'advanced-info-' + id, hidden: true}, explanation);
    const info = el('button', {class: 'advanced-info', type: 'button', 'aria-label': 'About ' + label,
      'aria-expanded': 'false', 'aria-controls': description.id, onclick: () => {
        const open = info.getAttribute('aria-expanded') !== 'true';
        closeInfo(); info.setAttribute('aria-expanded', String(open)); description.hidden = !open;
        if (open) section.scrollIntoView?.({block: 'nearest'});
      }}, el('span', {'aria-hidden': 'true'}, 'i'));
    const section = el('section', {class: 'advanced-row', 'data-metric': id, 'aria-label': label},
      el('div', {class: 'advanced-label'}, el('span', {}, label), info),
      el('div', {class: 'advanced-pair'}, ...cells), description);
    return section;
  };
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const info = root.querySelector('.advanced-info[aria-expanded="true"]');
    if (info) { event.stopPropagation(); closeInfo(); info.focus(); }
  });
  const group = (name, rows) => root.append(el('div', {class: 'advanced-group'},
    el('h4', {class: 'advanced-group-label'}, name), ...rows));
  const sampleCells = key => stats.map((stat, i) => {
    const sample = stat?.insights?.[key];
    return cell(i, decimal(sample?.accuracy), {detail: sample?.count ? sample.count + ' decisions' : 'No scored decisions'});
  });
  group('Decision quality', [
    row('loss', 'Average centipawn loss', 'How much your moves gave away on average compared with the engine’s best move. Lower is better. 100 centipawns is roughly one pawn. Forced moves and mate scores are left out.', stats.map((stat, i) =>
      cell(i, decimal(stat?.averageCpLoss), {detail: stat?.cpMoves ? stat.cpMoves + ' decisions' : 'No scored decisions'}))),
    row('match', 'Engine top-move match', 'How often you chose the engine’s first-choice move. A different move can still be very good, so a lower match rate does not automatically mean poor play. Forced replies are left out.', stats.map((stat, i) => cell(i, percent(stat?.topMatch)))),
    row('largest', 'Largest evaluation loss', 'Your single biggest drop compared with the engine’s best move, measured in centipawns. 100 centipawns is roughly one pawn. Select the move underneath to revisit it. Mate scores are left out.', stats.map((stat, i) => {
      const loss = stat?.largestLoss;
      return cell(i, loss ? Math.round(loss.loss) + ' cp' : null, {detail: loss?.loss > 0 ? moveName(loss.ply) + ' ↗' : 'No scored loss',
        jump: loss?.loss > 0 ? loss.ply : null, className: 'acc-loss'});
    })),
    row('streak', 'Longest clean streak', 'Your longest run of decisions rated Good or better, including opening-book moves. Inaccuracies, mistakes, missed chances and blunders end the run. Forced replies do not add to or break it. Select a value to revisit the start.', stats.map((stat, i) => {
      const streak = stat?.cleanStreak;
      return cell(i, streak ? String(streak.count) : null, {detail: streak?.count > 0 ? 'decisions · revisit ↗' : 'No clean decisions', jump: streak?.count > 0 ? streak.startPly : null});
    })),
    row('clean', 'Clean decisions', 'The percentage of your non-forced decisions rated Good or better, including Book. This shows how often you avoided a move rated as an error.', stats.map((stat, i) => cell(i, percent(stat?.insights?.cleanShare)))),
    row('best-five', 'Best five-decision stretch', 'Your highest accuracy across five consecutive non-forced decisions. It highlights a sustained stretch of strong play. You need at least five scored decisions. Select a value to revisit that stretch.', stats.map((stat, i) => {
      const best = stat?.insights?.bestStretch;
      return cell(i, decimal(best?.accuracy), {detail: best ? 'accuracy · revisit ↗' : 'Needs five decisions', jump: best?.startPly});
    })),
    row('balanced', 'Accuracy in balanced positions', 'How accurately you played when the engine’s evaluation before your move was less than one pawn in either direction. A useful look at your decisions when neither side had a clear advantage. Mate scores and forced replies are left out.', sampleCells('balanced')),
    row('defending', 'Accuracy while defending', 'How accurately you played when you started your turn at least one pawn behind in the engine’s evaluation. It shows the quality of your resistance, even if you eventually lost. Mate scores and forced replies are left out.', sampleCells('defending')),
    row('winning', 'Accuracy while ahead', 'How accurately you played when you started your turn at least one pawn ahead in the engine’s evaluation. It helps you see how well you handled an advantage. Mate scores and forced replies are left out.', sampleCells('winning')),
  ]);
  group('On the clock', [
    row('clock', 'Clock advantage', 'How often you had more time left than your opponent. We compare after each full move: one turn by each player. For example, 70% means you were ahead after 7 of 10 compared moves. Ties count for neither player; moves with missing clock data are skipped.', stats.map((stat, i) => {
      const clock = stat?.clock?.advantage;
      return cell(i, percent(clock?.percent));
    })),
    row('clock-lead', 'Biggest clock lead', 'The most extra time you had compared with your opponent after any full move, once both players had moved. Select a value to see the position. Zero means you were never ahead at those points.', stats.map((stat, i) => {
      const lead = stat?.clock?.largestLead;
      return cell(i, duration(lead?.seconds), {detail: lead?.seconds > 0 ? moveName(lead.ply) + ' ↗' : lead ? 'Never ahead' : 'Clock data needed', jump: lead?.seconds > 0 ? lead.ply : null});
    })),
    row('think-average', 'Average thinking time', 'How long you spent on a move on average. We subtract the increment so bonus seconds are not mistaken for thinking time. Only moves with usable before-and-after clocks are included. Some time controls do not provide enough information.', stats.map((stat, i) =>
      cell(i, duration(stat?.clock?.averageThink), {detail: stat?.clock?.thinkMoves ? stat.clock.thinkMoves + ' clocked moves' : 'Clock data needed'}))),
    row('think-longest', 'Longest think', 'The most time you spent on a single recorded move, with any increment removed. Select the value to revisit the decision that made you pause.', stats.map((stat, i) => {
      const think = stat?.clock?.longestThink;
      return cell(i, duration(think?.seconds), {detail: think ? moveName(think.ply) + ' ↗' : 'Clock data needed', jump: think?.ply});
    })),
  ]);
  return root;
}
function renderStats() {
  const design = panelDesign('accuracy', S.settings);
  const phaseReport2 = design === 'phases2';
  const phaseModern = design === 'phases-modern' || design === 'phases-modern-v2';
  const phaseReport = design === 'phases' || phaseReport2 || phaseModern;
  const reveal = design === 'reveal' || phaseReport;
  const revealKey = JSON.stringify([design, S.batchGen, S.meSide, S.acc, S.calibrated?.w.rating, S.calibrated?.b.rating, S.gameStats]);
  const animate = S.settings.moveAnim !== false && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reveal && !S.analyzing && !S.accuracyPage && animate
      && overviewReveal.matches(UI.stats.firstChild, S.positions, revealKey)) return;
  overviewReveal.stop();
  if (design === 'original') {
    Object.values(phaseReveals).forEach(reveal => reveal.stop());
    return renderOriginalStats();
  }
  if (design === 'pages') return renderPagedStats();
  const sides = [S.meSide, S.meSide === "w" ? "b" : "w"];
  const page = S.accuracyPage || 0, busy = S.analyzing && !S.blank;
  // Keep the analysis animation and keyboard focus intact while results arrive.
  if (busy && statsRefs?.design === design && statsRefs.page === page) {
    if (page === 0) updateAccuracyPhases(sides, busy, design);
    for (const [k, row] of Object.entries(statsRefs.rows)) sides.forEach((side, i) => {
      const count = S.counts[side][k] || 0;
      row[i].textContent = count;
      row[i].disabled = !count;
      row[i].classList.toggle('zero', !count);
      row[i].setAttribute('aria-label', S.players[side].name + ': ' + count + ' ' + categoryName(k) + ' moves. Cycle through moves.');
    });
    if (page === 1) updateQualityDistribution(UI.stats, sides);
    scheduleAccuracyFit();
    return;
  }
  // Preserve phases already counting up when the overall results finish.
  let livePhases = null;
  if (!busy && page === 0 && S.progressiveAccuracy && statsRefs?.design === design && statsRefs.page === page) {
    updateAccuracyPhases(sides, busy, design);
    livePhases = UI.stats.querySelector('.acc-phases,.phase-report');
  } else Object.values(phaseReveals).forEach(reveal => reveal.stop());
  const pair = (className, values) => el('div', {class: className}, ...values);
  const number = value => value == null ? '—' : value.toFixed(1) + '%';
  const pending = value => busy ? '···' : value;
  const comparison = (label, values, note = null, className = '') => el('div', {class: 'acc-comparison ' + className},
    el('div', {class: 'acc-metric-label'}, label), pair('acc-metric-values', values),
    note ? el('p', {class: 'acc-note'}, note) : null);
  const players = pair('acc-players' + (phaseReport2 && page === 0 ? ' phase2-players' : ''), [
    phaseReport2 && page === 0 ? el('span', {'aria-hidden': 'true'}) : null,
    ...sides.map(side => el('div', {class: 'acc-player'},
    page === 0 || phaseModern ? null : el('span', {class: 'acc-side ' + side, 'aria-label': side === 'w' ? 'White' : 'Black'}),
    el('span', {class: 'acc-name'}, S.players[side].name)))]);
  const rows = {};
  let content;
  if (page === 0 && phaseReport2) {
    content = renderPhaseOverview2(sides, busy);
  } else if (page === 0 && phaseReport) {
    content = renderPhaseOverview(sides, busy, phaseModern);
  } else if (page === 0) {
    content = el('div', {class: 'acc-overview'},
      pair('acc-scorecards', sides.map(side => {
        const rating = estimateElo(S.accElo[side], S.players[side]?.rating, side);
        return el('div', {class: 'acc-scorecard'}, accuracyDial(S.acc[side], busy),
          el('div', {class: 'acc-estimate'}, el('strong', {class: 'acc-elo'}, busy ? accuracyPendingValue() : rating == null ? '—' : '≈ ' + rating),
            el('span', {class: 'acc-elo-label'}, reveal ? 'Estimated rating' : 'Estimated Elo')));
      })),
      renderAccuracyPhases(sides, busy));
  } else if (page === 1) {
    content = renderMoveQuality(sides, rows);
  } else if (phaseModern) {
    content = renderModernAdvanced(sides, busy);
  } else {
    const stats = sides.map(side => S.gameStats?.[side]);
    content = el('div', {class: 'acc-advanced'},
      comparison('Average centipawn loss', stats.map(stat => el('strong', {class: 'acc-stat-value',
        'aria-label': busy ? 'Analyzing' : (stat?.averageCpLoss == null ? 'Unavailable' : stat.averageCpLoss.toFixed(1) + ' centipawns, from ' + stat.cpMoves + ' moves')},
        pending(stat?.averageCpLoss == null ? '—' : stat.averageCpLoss.toFixed(1)))), 'Lower is better · 100 cp = 1 pawn'),
      comparison('Engine top-move match', stats.map(stat => el('strong', {class: 'acc-stat-value'}, pending(number(stat?.topMatch))))),
      comparison('Largest evaluation loss', stats.map((stat, i) => {
        const loss = busy ? null : stat?.largestLoss, position = loss && S.positions[loss.ply];
        return el('button', {type: 'button', class: 'acc-loss', disabled: !loss || loss.loss === 0,
          'aria-label': S.players[sides[i]].name + ': ' + (loss ? loss.loss + ' centipawns lost on ' + position.san + '. Jump to move.' : 'No scored loss'),
          onclick: () => gotoMainline(loss.ply)},
          el('strong', {class: 'acc-stat-value'}, pending(loss ? Math.round(loss.loss) + ' cp' : '—')),
          loss && loss.loss > 0 ? el('span', {}, Math.ceil(loss.ply / 2) + (position.color === 'w' ? '. ' : '… ') + position.san + ' ↗') : null);
      })));
  }
  if (livePhases) content.querySelector('.acc-phases,.phase-report')?.replaceWith(livePhases);
  const fitPage = phaseModern && page < 2;
  UI.stats.replaceChildren(el('div', {class: 'panel accuracy-panel accuracy-dials accuracy-book' + (reveal ? ' accuracy-reveal' : '') + (phaseReport ? ' accuracy-phase-report' : '') + (phaseReport2 && page === 0 ? ' accuracy-phase-report-2' : '') + (phaseModern ? ' accuracy-phase-modern' : '') + (design === 'phases-modern-v2' ? ' accuracy-phase-modern-v2' : ''), 'data-design': design, 'aria-label': 'Accuracy'},
    accuracyPager(),
    el('div', {class: 'panel-body acc-page' + (fitPage ? ' acc-fit-page' : '') + (page === 0 ? ' acc-page-overview' : phaseModern ? page === 1 ? ' acc-page-quality' : ' acc-page-advanced' : ''), id: 'accuracy-page', role: 'tabpanel', tabindex: 0,
      'aria-labelledby': 'accuracy-tab-' + page}, ...(fitPage ? [el('div', {class: 'acc-fit-content'}, players, content)] : [players, content]))));
  statsRefs = busy ? {design, page, rows} : null;
  if (UI.canvas.classList.contains('full-hd-reference')) applyLayout();
  accuracyNavigation?.sync(page);
  scheduleAccuracyFit();
  // Saved reviews open with their full results. Live reviews have already shown
  // their phases, so finishing must not count those scores up from zero again.
  if (reveal && page === 0 && !busy && !S.blank && !S.restoredAnalysis && Object.values(S.acc).some(Number.isFinite)) {
    overviewReveal.mount(UI.stats.firstChild, {game: S.positions, key: revealKey, enabled: animate, includePhases: !S.progressiveAccuracy});
  }
}

let accuracyFitPending = false;
function scheduleAccuracyFit() {
  if (accuracyFitPending) return;
  accuracyFitPending = true;
  // Resize and result updates also run in background/offscreen review frames,
  // where animation frames may be suspended. Fit before the next paint anyway.
  Promise.resolve().then(() => {
    accuracyFitPending = false;
    const page = UI.stats?.querySelector('.acc-fit-page'), content = page?.querySelector('.acc-fit-content');
    if (!content || !page.clientHeight) return;
    const style = getComputedStyle(page);
    const available = page.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 1;
    if (available <= 0) return;
    // Keep the original design and fit its contents proportionally. Reset before
    // measuring so a larger window restores the full size; never enlarge it.
    content.style.zoom = '1';
    if (page.scrollHeight <= page.clientHeight) return;
    for (let i = 0; i < 3; i++) {
      const scale = Math.min(1, available / content.scrollHeight);
      if (!Number.isFinite(scale) || scale <= 0) break;
      content.style.zoom = String(scale);
      if (page.scrollHeight <= page.clientHeight) break;
    }
  });
}

function renderPhaseOverview2(sides, busy) {
  return el('div', {class: 'phase-overview phase-overview-2'},
    el('div', {class: 'phase2-overall'},
      el('span', {class: 'phase-summary-label phase2-label'}, 'Accuracy'),
      ...sides.map(side => busy ? loaderNode('acc-val', 'var(--accent)')
        : el('strong', {class: 'acc-val'}, S.acc[side] == null ? '—' : S.acc[side] >= 100 ? '100' : S.acc[side].toFixed(1)))),
    renderPhaseReport(sides, busy, true),
    el('div', {class: 'phase-rating phase2-rating'},
      el('span', {class: 'acc-elo-label phase2-label'}, 'Estimated rating'),
      ...sides.map(side => {
        const rating = estimateElo(S.accElo[side], S.players[side]?.rating, side);
        return el('strong', {class: 'acc-elo'}, busy ? accuracyPendingValue() : rating == null ? '—' : '≈ ' + rating);
      })));
}

function renderPhaseReport(sides, busy, compact = false) {
  return el('div', {class: 'phase-report' + (compact ? ' phase2-report' : ''), 'aria-label': 'Accuracy by game phase'}, ...GAME_PHASES.map((phase, index) => {
    const pending = accuracyPhasePending(phase, busy);
    const name = ['Opening', 'Middlegame', 'Endgame'][index];
    const cells = sides.map(side => {
      const stats = S.gameStats?.[side]?.phases[phase], value = stats?.accuracy;
      const band = pending ? null : phasePerformance(value), label = band ? categoryName(band.category) : pending ? 'Analyzing' : 'Not scored';
      return el('div', {class: 'phase-report-cell' + (band ? '' : ' unavailable'), 'data-phase-category': band?.category || '',
        style: {'--phase-color': band ? QUALITY[band.category].color : 'var(--ink-3)'},
        'aria-label': S.players[side].name + ', ' + name + ': ' + (pending ? 'analyzing' : value == null ? 'not scored' : value.toFixed(1) + ' accuracy, ' + label + ', ' + stats.decisions + ' scored decisions')},
        el('strong', {class: 'phase-report-score'}, pending ? accuracyPendingValue() : value == null ? '—' : value.toFixed(1)));
    });
    return el('div', {class: 'phase-report-row' + (compact ? ' phase2-row' : ''), 'data-phase': phase, 'data-pending': String(pending)},
      el(compact ? 'span' : 'div', {class: 'phase-report-name'}, name),
      ...(compact ? cells : [el('div', {class: 'phase-report-cells'}, ...cells)]));
  }));
}
function renderPhaseOverview(sides, busy, modern = false) {
  return el('div', {class: 'phase-overview'},
    el('div', {class: 'phase-summary'},
      el('span', {class: 'phase-summary-label'}, 'Accuracy'),
      el('div', {class: 'phase-overall-values'}, ...sides.map(side => modern ? accuracyDial(S.acc[side], busy)
        : busy ? loaderNode('acc-val', 'var(--accent)')
        : el('strong', {class: 'acc-val'}, S.acc[side] == null ? '—' : S.acc[side] >= 100 ? '100' : S.acc[side].toFixed(1))))),
    renderPhaseReport(sides, busy),
    el('div', {class: 'phase-rating'},
      el('span', {class: 'acc-elo-label'}, 'Estimated rating'),
      el('div', {class: 'phase-rating-values'}, ...sides.map(side => {
        const rating = estimateElo(S.accElo[side], S.players[side]?.rating, side);
        return el('strong', {class: 'acc-elo'}, busy ? accuracyPendingValue() : rating == null ? '—' : '≈ ' + rating);
      }))));
}

function renderOriginalStats() {
  const opSide = S.meSide === "w" ? "b" : "w";
  const meAcc = S.acc[S.meSide], opAcc = S.acc[opSide];
  const meRating = S.players[S.meSide]?.rating, opRating = S.players[opSide]?.rating;
  const meEloAcc = S.accElo[S.meSide], opEloAcc = S.accElo[opSide];
  // Compact list by default; the expander arrow unfolds the whole list (incl. book moves).
  const list = S.originalAccuracyExpanded ? QBREAK_FULL : QBREAK_SUMMARY;

  // In-place counter update during analysis (so the loader animation doesn't restart).
  if (S.analyzing && statsRefs?.design === 'original' && statsRefs.expanded === S.originalAccuracyExpanded) {
    for (const k of list) {
      const r = statsRefs.rows[k]; if (!r) continue;
      const cMe = S.counts[S.meSide][k] || 0, cOp = S.counts[opSide][k] || 0;
      for (const [i, count] of [cMe, cOp].entries()) {
        r[i].textContent = count; r[i].classList.toggle("zero", !count); r[i].disabled = !count;
        r[i].setAttribute('aria-label', S.players[i === 0 ? S.meSide : opSide].name + ': ' + count + ' ' + categoryName(k) + ' moves. Cycle through moves.');
      }
    }
    return;
  }

  const rows = {};
  const qbreak = originalQualityBreakdown([S.meSide, opSide], rows, S.originalAccuracyExpanded, () => {
    S.originalAccuracyExpanded = !S.originalAccuracyExpanded;
    renderStats(); reflowAccuracy(S.originalAccuracyExpanded); applyLayout();
    UI.stats.querySelector('.qbreak-toggle')?.focus({preventScroll: true});
  });

  UI.stats.replaceChildren(el("div", { class: "panel accuracy-panel accuracy-original", "data-design": "original", "aria-label": "Accuracy" },
    el("div", { class: "panel-head acc-head" }, el("h3", {}, "Accuracy")),
    el("div", { class: "panel-body" },
      el("div", { class: "acc-row" },
        el("div", { class: "acc-cell" },
          el("span", { class: "acc-name" }, S.players[S.meSide].name),
          S.analyzing
            ? loaderNode("acc-val", "var(--accent)")
            : el("span", { class: "acc-val", style: { color: "var(--accent)" }, onmouseenter: (e) => showInfoTip(e.currentTarget, "Accuracy", ACCURACY_INFO), onmouseleave: hideQTip }, meAcc == null ? "—" : meAcc.toFixed(1)),
          el("span", { class: "acc-bar" }, el("i", { style: { width: (S.analyzing ? 0 : (meAcc || 0)) + "%", background: "var(--accent)" } })),
          el("span", { class: "est-rating", onmouseenter: (e) => showInfoTip(e.currentTarget, "Estimated Elo", ELO_INFO), onmouseleave: hideQTip }, S.analyzing ? accuracyPendingValue() : "≈ " + (estimateElo(meEloAcc, meRating, S.meSide) ?? "—") + " elo")),
        el("span", { class: "acc-vs" }, "VS"),
        el("div", { class: "acc-cell right" },
          el("span", { class: "acc-name" }, S.players[opSide].name),
          S.analyzing
            ? loaderNode("acc-val", "var(--accent)")
            : el("span", { class: "acc-val", style: { color: "var(--ink-2)" }, onmouseenter: (e) => showInfoTip(e.currentTarget, "Accuracy", ACCURACY_INFO), onmouseleave: hideQTip }, opAcc == null ? "—" : opAcc.toFixed(1)),
          el("span", { class: "acc-bar" }, el("i", { style: { width: (S.analyzing ? 0 : (opAcc || 0)) + "%", background: "var(--ink-3)", marginLeft: (100 - (S.analyzing ? 100 : (opAcc || 0))) + "%" } })),
          el("span", { class: "est-rating", onmouseenter: (e) => showInfoTip(e.currentTarget, "Estimated Elo", ELO_INFO), onmouseleave: hideQTip }, S.analyzing ? accuracyPendingValue() : "≈ " + (estimateElo(opEloAcc, opRating, opSide) ?? "—") + " elo")),
      ),
      qbreak,
    ),
  ));
  statsRefs = S.analyzing ? { design: 'original', expanded: S.originalAccuracyExpanded, rows } : null;
  if(UI.canvas.classList.contains("full-hd-reference"))applyLayout();
}

function renderPagedStats() {
  const sides = [S.meSide, S.meSide === "w" ? "b" : "w"];
  const page = S.accuracyPage || 0, busy = S.analyzing && !S.blank;
  // Keep the analysis animation and keyboard focus intact while results arrive.
  if (busy && statsRefs?.design === 'pages' && statsRefs.page === page) {
    if (page === 0) updateAccuracyPhases(sides, busy, 'pages');
    for (const [k, row] of Object.entries(statsRefs.rows)) sides.forEach((side, i) => {
      const count = S.counts[side][k] || 0;
      row[i].textContent = count;
      row[i].disabled = !count;
      row[i].classList.toggle('zero', !count);
      row[i].setAttribute('aria-label', S.players[side].name + ': ' + count + ' ' + categoryName(k) + ' moves. Cycle through moves.');
    });
    if (page === 1) updateQualityDistribution(UI.stats, sides);
    return;
  }
  Object.values(phaseReveals).forEach(reveal => reveal.stop());
  const pair = (className, values) => el('div', {class: className}, ...values);
  const number = value => value == null ? '—' : value.toFixed(1) + '%';
  const pending = value => busy ? '···' : value;
  const comparison = (label, values, note = null, className = '') => el('div', {class: 'acc-comparison ' + className},
    el('div', {class: 'acc-metric-label'}, label), pair('acc-metric-values', values),
    note ? el('p', {class: 'acc-note'}, note) : null);
  const players = pair('acc-players', sides.map(side => el('div', {class: 'acc-player'},
    page === 0 ? null : el('span', {class: 'acc-side ' + side, 'aria-label': side === 'w' ? 'White' : 'Black'}),
    el('span', {class: 'acc-name'}, S.players[side].name))));
  const rows = {};
  let content;
  if (page === 0) {
    content = el('div', {class: 'acc-overview'},
      comparison('Game accuracy', sides.map(side => busy ? loaderNode('acc-val', 'var(--accent)')
        : el('strong', {class: 'acc-val'}, S.acc[side] == null ? '—' : S.acc[side].toFixed(1))), null, 'acc-overall'),
      comparison('Estimated Elo', sides.map(side => el('strong', {class: 'acc-elo'}, busy ? accuracyPendingValue() : (
        estimateElo(S.accElo[side], S.players[side]?.rating, side) == null ? '—'
          : '≈ ' + estimateElo(S.accElo[side], S.players[side]?.rating, side))))),
      renderAccuracyPhases(sides, busy, false),
      el('p', {class: 'acc-note'}, S.blank ? 'Load a game to see its accuracy.'
        : busy ? 'Phase scores appear as analysis progresses.' : '— Phase not reached or no scored decisions.'));
  } else if (page === 1) {
    content = renderMoveQuality(sides, rows);
  } else {
    const stats = sides.map(side => S.gameStats?.[side]);
    content = el('div', {class: 'acc-advanced'},
      comparison('Average centipawn loss', stats.map(stat => el('strong', {class: 'acc-stat-value',
        'aria-label': busy ? 'Analyzing' : (stat?.averageCpLoss == null ? 'Unavailable' : stat.averageCpLoss.toFixed(1) + ' centipawns, from ' + stat.cpMoves + ' moves')},
        pending(stat?.averageCpLoss == null ? '—' : stat.averageCpLoss.toFixed(1)))), 'Lower is better · 100 cp = 1 pawn'),
      comparison('Engine top-move match', stats.map(stat => el('strong', {class: 'acc-stat-value'}, pending(number(stat?.topMatch))))),
      comparison('Largest evaluation loss', stats.map((stat, i) => {
        const loss = busy ? null : stat?.largestLoss, position = loss && S.positions[loss.ply];
        return el('button', {type: 'button', class: 'acc-loss', disabled: !loss || loss.loss === 0,
          'aria-label': S.players[sides[i]].name + ': ' + (loss ? loss.loss + ' centipawns lost on ' + position.san + '. Jump to move.' : 'No scored loss'),
          onclick: () => gotoMainline(loss.ply)},
          el('strong', {class: 'acc-stat-value'}, pending(loss ? Math.round(loss.loss) + ' cp' : '—')),
          loss && loss.loss > 0 ? el('span', {}, Math.ceil(loss.ply / 2) + (position.color === 'w' ? '. ' : '… ') + position.san + ' ↗') : null);
      })),
      el('p', {class: 'acc-note acc-evidence'}, busy ? 'Stats appear when analysis finishes.'
        : 'Forced moves excluded. Centipawn stats omit mate scores.'));
  }
  UI.stats.replaceChildren(el('div', {class: 'panel accuracy-panel accuracy-pages accuracy-book', 'data-design': 'pages', 'aria-label': 'Accuracy'},
    el('div', {class: 'panel-head acc-head'}, el('h3', {}, 'Accuracy'), el('span', {class: 'acc-page-count'}, (page + 1) + ' / 3')),
    accuracyPager(),
    el('div', {class: 'panel-body acc-page', id: 'accuracy-page', role: 'tabpanel', tabindex: 0,
      'aria-labelledby': 'accuracy-tab-' + page}, players, content)));
  statsRefs = busy ? {design: 'pages', page, rows} : null;
  if (UI.canvas.classList.contains('full-hd-reference')) applyLayout();
  accuracyNavigation?.sync(page);
}

/* ---------------- Eval graph ---------------- */
function graphPositionText(ply) {
  if (!ply) return 'Starting position';
  return `${Math.ceil(ply / 2)}${ply % 2 ? '.' : '…'} ${S.positions[ply]?.san || ''}`.trim();
}
function updateGraphReadout(refs) {
  if (!refs.chart) return;
  const e = S.evals[S.idx], cp = e == null ? null : scoreToCp(e);
  const rounded = cp == null ? null : Math.abs(cp / 100).toFixed(1);
  const side = cp > 0 ? 'White' : 'Black';
  const label = e == null ? (S.blank ? 'Load a game' : 'Calculating…')
    : e.mate != null ? `${side} mates` : rounded === '0.0' ? 'Equal position' : `${side} ahead`;
  if (refs.readout) {
    refs.readout.textContent = e == null ? '—' : e.mate != null ? 'M' + Math.abs(e.mate) : rounded === '0.0' ? '0.0' : evalText(e);
    refs.readout.dataset.side = cp == null || rounded === '0.0' && e.mate == null ? 'equal' : cp > 0 ? 'white' : 'black';
  }
  const description = e == null ? label : e.mate != null ? `${side} has mate in ${Math.abs(e.mate)}`
    : rounded === '0.0' ? label : `${side} is ahead by ${rounded} pawns`;
  const category = ['timeline2', 'bars', 'bars2'].includes(panelDesign('graph', S.settings)) && S.idx > 0 && e && S.classif[S.idx]
    ? ` ${gradeLabel(S.classif[S.idx], S.moveGrades[S.idx], categoryName(S.classif[S.idx]))}.` : '';
  refs.chart.setAttribute('aria-valuenow', Math.min(S.idx, refs.lastPly));
  refs.chart.setAttribute('aria-valuetext', `${graphPositionText(S.idx)}. ${description}.${category} Positive scores favor White; negative scores favor Black.`);
  refs.chart.setAttribute('aria-disabled', String(!!S.practice || refs.lastPly === 0));
  for (const badge of refs.chart.querySelectorAll('.evaluation-move-badge')) {
    badge.classList.toggle('current', Number(badge.dataset.ply) === S.idx);
  }
}
function renderGraph() {
  const restoreFocus = document.activeElement === UI.graphRefs?.chart;
  const show = S.settings.evalView === "both" || S.settings.evalView === "graph";
  const mod = UI.graph.closest(".mod");
  if (mod) mod.hidden = !show;   // hidden, not just emptied, so the layout closes the gap
  if (!show) { UI.graph.replaceChildren(); UI.graphRefs = null; return; }
  const design = panelDesign('graph', S.settings), modern = design !== 'original', compact = design === 'minimal';
  const bars = design === 'bars' || design === 'bars2';
  const W = 384, H = 120, mid = H / 2;
  const maxPly = Math.max(1, S.total);
  const toX = (p) => bars ? ((p + .5) / (maxPly + 1)) * W : (p / maxPly) * W;
  const fromFraction = fraction => Math.round(bars ? fraction * (maxPly + 1) - .5 : fraction * maxPly);
  // Workers finish out of order. Draw every returned evaluation, leaving gaps
  // for pending positions instead of letting one slow search hide later results.
  const pts = [], runs = [];
  for (let p = 0; p <= S.total; p++) {
    if (!S.evals[p]) continue;
    const point = {ply: p, cp: scoreToCp(S.evals[p])};
    if (pts.at(-1)?.ply !== p - 1) runs.push([]);
    runs.at(-1).push(point); pts.push(point);
  }
  // A slow earlier search must not lock out later results or the gaps before
  // them. Keep the rest of the game locked until a completed evaluation arrives.
  const lastPly = mainlineNavigationLimit();
  const pathFor = (run, y, closeY) => {
    let points = run.map(p => ({x: toX(p.ply), y: y(p.cp)}));
    if (points.length === 1) {
      // Give an isolated result a visible sliver until its neighbors arrive.
      const {x, y} = points[0], half = Math.min(1, W / maxPly / 2);
      points = [{x: Math.max(0, x - half), y}, {x: Math.min(W, x + half), y}];
    }
    const path = 'M' + points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
    return closeY == null ? path : path + ` L${points.at(-1).x.toFixed(1)},${closeY} L${points[0].x.toFixed(1)},${closeY} Z`;
  };
  // Move bars fit the analyzed game's range (at least one pawn, at most ten).
  // asinh is nearly linear near equality and compresses large advantages smoothly,
  // keeping small changes legible without flattening everything beyond five pawns.
  // Mate scores reach the edge but do not squeeze the finite evaluations.
  const barLimit = pts.reduce((limit, p) => S.evals[p.ply].mate != null ? limit
    : Math.max(limit, Math.min(1000, Math.abs(p.cp))), 100);
  const toY = (cp) => {
    const fraction = bars ? Math.asinh(Math.max(-barLimit, Math.min(barLimit, cp)) / 100) / Math.asinh(barLimit / 100)
      : Math.max(-500, Math.min(500, cp)) / 500;
    return mid - fraction * (mid - 8);
  };
  // The "color" style flips the y-axis (White advantage pushes the boundary DOWN); the hover marker
  // re-uses whichever mapping the active style draws with, so the dot rides the visible curve.
  const toYc = (cp) => { const c = Math.max(-500, Math.min(500, cp)); return mid + (c / 500) * (mid - 8); };
  const graphKey = JSON.stringify([design,S.total,S.settings.graphStyle || "area",pts,S.classif,S.blank,
    design === 'timeline2' ? S.moveGrades : null, bars ? barLimit : null, lastPly]);
  const markerVisible = modern ? !!S.evals[S.idx] : S.idx > 0 && S.idx < S.total;
  const retained = UI.graphRefs;
  if (retained?.key === graphKey && retained.marker.isConnected) {
    const x = toX(Math.min(S.idx,maxPly));
    if (bars) retained.marker.style.left = `${x / W * 100}%`;
    else if (retained.marker.getAttribute("x1") !== String(x)) { retained.marker.setAttribute("x1",x); retained.marker.setAttribute("x2",x); }
    retained.marker.style.display = markerVisible ? "" : "none";
    updateGraphReadout(retained);
    return;
  }
  const line = runs.map(run => pathFor(run, toY)).join(' ');
  const fill = runs.map(run => pathFor(run, toY, mid)).join(' ');
  const dots = pts.filter((s) => ["blunder", "mistake", "miss", "brilliant", "great"].includes(S.classif[s.ply]));
  const markerX = toX(Math.min(S.idx, maxPly));
  const midLine = `<line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>`;
  const marker = `<line class="eval-position" x1="${markerX}" y1="0" x2="${markerX}" y2="${H}" stroke="var(--accent)" stroke-width="1.5" opacity="0.7" style="display:${markerVisible ? "" : "none"}"/>`;
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
    const boundary = runs.map(run => pathFor(run, toYc)).join(' ');
    const whiteArea = runs.map(run => pathFor(run, toYc, 0)).join(' ');
    const blackArea = runs.map(run => pathFor(run, toYc, H)).join(' ');
    // Classification dots ride on the boundary (re-projected with this style's y-mapping).
    const dotsC = dots.map((s) =>
      `<circle cx="${toX(s.ply)}" cy="${toYc(s.cp)}" r="3.2" fill="${QUALITY[S.classif[s.ply]].color}" stroke="var(--panel)" stroke-width="1.4"/>`).join("");
    // The 0.00 "ground" line sits dead-centre, drawn over both fields in a light grey so it reads
    // against the white above and the black below.
    const groundLine = `<line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#c7c5bc" stroke-width="1.4"/>`;
    inner = (whiteArea ? `<path d="${whiteArea}" fill="#f4f2ea"/>` : '')
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
  if (modern) {
    const guides = `<line x1="0" y1="${mid}" x2="${W}" y2="${mid}" class="evaluation-zero"/>`;
    if (compact) {
      // White grows downward as its advantage increases. Leave pending positions empty.
      const whiteArea = runs.map(run => pathFor(run, toYc, 0)).join(' ');
      const blackArea = runs.map(run => pathFor(run, toYc, H)).join(' ');
      inner = pts.length
        ? `<path class="evaluation-field-white" d="${whiteArea}" fill="#fff"/>`
          + `<path class="evaluation-field-black" d="${blackArea}" fill="#000"/>` + marker
        : marker;
    } else if (design === 'timeline' || design === 'timeline2') {
      inner = guides + (fill ? `<path d="${fill}" class="evaluation-area"/>` : '')
        + (line ? `<path d="${line}" class="evaluation-curve" vector-effect="non-scaling-stroke"/>` : '')
        + (design === 'timeline2' ? '' : dotsSvg) + marker;
    } else {
      // Keep every analyzed position: a bar represents its evaluation, not a score change.
      const unit = W / (maxPly + 1), width = Math.max(.25, unit * .72);
      inner = pts.map(p => {
        const y = toY(p.cp), height = Math.max(.8, Math.abs(y - mid));
        return `<rect class="evaluation-column ${p.cp >= 0 ? 'white' : 'black'}" x="${p.ply * unit + (unit - width) / 2}" y="${p.cp >= 0 ? mid - height : mid}" width="${width}" height="${height}" rx="${Math.min(1.5,width/3)}"/>`;
      }).join('') + guides;
    }
  }
  const hoverY = compact || !modern && style === "color" ? toYc : toY;
  const hover = `<g class="eval-hover" style="display:none">${bars ? '' : `<line class="eval-hover-line" x1="0" y1="0" x2="0" y2="${H}" vector-effect="non-scaling-stroke"/>`}<circle class="eval-hover-dot" cx="0" cy="0" r="4.7"/></g>`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${inner}${hover}</svg>`;
  // Map a pointer event to the nearest plotted ply (0..last ply that has an eval).
  const plyFromEvent = (e) => {
    const badge = e.target.closest?.('.evaluation-move-badge');
    if (badge) return Number(badge.dataset.ply);
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !pts.length) return null;
    const ply = Math.max(0, Math.min(pts.at(-1).ply, fromFraction((e.clientX - r.left) / r.width)));
    return S.evals[ply] ? ply : null;
  };
  // Click anywhere on the graph → jump straight to that move (instant, no stepping through).
  const jumpFromEvent = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width) return;
    const ply = Math.max(0, Math.min(lastPly, fromFraction((e.clientX - r.left) / r.width)));
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
    if (ply == null) { hideHover(); return; }
    const x = toX(ply), y = hoverY(scoreToCp(S.evals[ply]));
    const g = e.currentTarget.querySelector(".eval-hover");
    if (g) {
      const guide = g.querySelector(".eval-hover-line");
      guide?.setAttribute("x1", x);
      guide?.setAttribute("x2", x);
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
  hideHover();
  if (modern) {
    const onkey = e => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      if (S.practice || S.blank) return;
      const target = e.key === 'Home' ? 0 : e.key === 'End' ? lastPly
        : S.idx + (['ArrowLeft','ArrowDown'].includes(e.key) ? -1 : 1);
      gotoMainline(Math.max(0, Math.min(lastPly, target)));
    };
    const chart = el('div', {class: 'evalgraph clickable-graph', html: svg, role: 'slider', tabindex: 0,
      'aria-label': 'Game evaluation. Use arrow keys to explore moves.', 'aria-valuemin': 0, 'aria-valuemax': lastPly,
      onclick: jumpFromEvent, onmousemove: hoverMove, onmouseleave: hideHover, onblur: hideHover, onkeydown: onkey});
    if (bars) {
      chart.append(el('span', {class: 'eval-position evaluation-position-marker', 'aria-hidden': 'true',
        style: {left: `${markerX / W * 100}%`, display: markerVisible ? '' : 'none'}}));
      // Fixed-size HTML circles stay round even when the underlying SVG is stretched.
      for (const p of dots.filter(p => p.ply > 0 && (design === 'bars2' || S.classif[p.ply] !== 'mistake'))) {
        chart.append(el('span', {class: 'evaluation-move-dot', 'data-ply': p.ply,
          'data-category': S.classif[p.ply], 'aria-hidden': 'true',
          style: {left: `clamp(3.5px, ${toX(p.ply) / W * 100}%, calc(100% - 3.5px))`,
            top: `clamp(3.5px, ${toY(p.cp) / H * 100}%, calc(100% - 3.5px))`,
            background: QUALITY[S.classif[p.ply]].color}}));
      }
    }
    if (design === 'timeline2') {
      // HTML overlays keep the shared badges circular when the SVG stretches to fit the panel.
      for (const p of pts.filter(p => p.ply > 0 && NOTEWORTHY.has(S.classif[p.ply]))) {
        chart.append(gradeBadge(S.classif[p.ply], S.moveGrades[p.ply], 'evaluation-move-badge', {
          'data-ply': p.ply,
          style: {left: `clamp(var(--evaluation-badge-radius), ${toX(p.ply) / W * 100}%, calc(100% - var(--evaluation-badge-radius)))`,
            top: `clamp(var(--evaluation-badge-radius), ${toY(p.cp) / H * 100}%, calc(100% - var(--evaluation-badge-radius)))`},
          onclick: e => { e.stopPropagation(); gotoMainline(p.ply); },
        }));
      }
    }
    if (compact) {
      UI.graph.replaceChildren(el('div', {class: 'panel eval-side evaluation-panel evaluation-minimal', 'data-design': design, 'aria-label': 'Evaluation'},
        chart, !pts.length ? el('span', {class: 'evaluation-empty'}, S.blank ? 'Load a game to see its evaluation' : 'Waiting for analysis…') : null));
      UI.graphRefs = {key:graphKey, marker:chart.querySelector('.eval-position'), chart, lastPly};
      updateGraphReadout(UI.graphRefs);
      if (restoreFocus) chart.focus({preventScroll: true});
      return;
    }
    const readout = el('strong', {class: 'evaluation-score', title: 'Positive favors White; negative favors Black. M means mate.'});
    UI.graph.replaceChildren(el('div', {class: 'panel eval-side evaluation-panel evaluation-' + design + (design === 'bars2' ? ' evaluation-bars' : ''), 'data-design': design, 'aria-label': 'Evaluation'},
      readout,
      el('div', {class: 'evaluation-plot'}, chart,
        !pts.length ? el('span', {class: 'evaluation-empty'}, S.blank ? 'Load a game to see its evaluation' : 'Waiting for analysis…') : null)));
    UI.graphRefs = {key:graphKey, marker:chart.querySelector('.eval-position'), readout, chart, lastPly};
    updateGraphReadout(UI.graphRefs);
    if (restoreFocus) chart.focus({preventScroll: true});
    return;
  }
  UI.graph.replaceChildren(el("div", { class: "panel eval-side", 'data-design': design },
    el("div", { class: "panel-head" }, el("h3", {}, "Evaluation")),
    el("div", { class: "panel-body", style: { paddingTop: "8px", paddingBottom: "8px" } },
      el("div", { class: "evalgraph clickable-graph", html: svg, onclick: jumpFromEvent, onmousemove: hoverMove, onmouseleave: hideHover })),
  ));
  UI.graphRefs = {key:graphKey,marker:UI.graph.querySelector(".eval-position")};
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
    el("span", { title: pos.san }, pos.san),
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
      // Rectangles are screen pixels, while scrollTop/clientHeight are unscaled
      // layout pixels. Convert before scrolling the scaled Full HD panel.
      const scale=UI.movesBody.offsetHeight?sr.height/UI.movesBody.offsetHeight:1;
      const top=sr.top+UI.movesBody.clientTop*scale,bottom=top+UI.movesBody.clientHeight*scale;
      const padding=8*scale;
      if(cr.bottom>bottom-padding)UI.movesBody.scrollTop+=(cr.bottom-bottom+padding)/scale;
      else if(cr.top<top+padding)UI.movesBody.scrollTop+=(cr.top-top-padding)/scale;
    }
  }
}
let _movesSig = null;
let _movesClassSig = null;
function updateMovesDesign() {
  const panel = UI.movesBody.closest('.moves-panel'), design = panelDesign('moves', S.settings);
  if (panel.dataset.design === design) return;
  const scroll = UI.movesBody.scrollTop;
  panel.querySelector('.moves-head')?.remove();
  panel.querySelector('.moves-foot')?.remove();
  panel.dataset.design = design;
  if (design === 'original') {
    panel.prepend(el('div', {class: 'panel-head moves-head'}, el('h3', {}, 'Moves')));
    panel.append(el('div', {class: 'moves-foot', 'aria-hidden': 'true'}));
  }
  UI.movesBody.scrollTop = scroll;
  highlightCurrentMove(true);
}
function renderMoves() {
  updateMovesDesign();
  const ml = S.settings.mlStyle;
  // Keep move cells mounted while classifications arrive. Replacing the list during analysis
  // drops the hovered element and makes its hover state flicker; only changed badges need updates.
  const sig = ml + "|" + S.settings.badgeStyle + "|" + S.total + "|" + (S.analysisMode ? 1 : 0) + "|" + S.pgn;
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
  const rows = [];
  for (let ply = 1; ply <= S.total; ply++) {
    const number = Number(S.positions[ply - 1].fen.split(" ")[5]);
    if (!rows.length || rows[rows.length - 1].number !== number) rows.push({number, w:0, b:0});
    rows[rows.length - 1][S.positions[ply].color] = ply;
  }
  let list;
  if (ml === "compact") {
    list = el("div", { class: "movelist ml-compact ml-scroll" });
    for (const row of rows) list.append(el("span", { class: "ml-num" }, row.number + (row.w ? "." : "...")), moveCell(row.w), moveCell(row.b));
  } else {
    list = el("div", { class: "movelist " + (ml === "cards" ? "ml-cards" : "ml-rows") + " ml-scroll" });
    for (const row of rows) list.append(el("div", { class: "ml-pair" }, el("span", { class: "ml-num" }, row.number), moveCell(row.w), moveCell(row.b)));
  }
  UI.movesBody.style.padding = ml === "rows" ? "0" : "var(--pad)";
  UI.movesBody.replaceChildren(list);
  // auto-scroll to the current move
  highlightCurrentMove(true);
}

/* ---------------- Engine lines ---------------- */
function enginePanelLineLimit() {
  return ENGINE_MAX_LINES;
}
function enginePanelLineCount() {
  return normalizeEngineLineCount(S.settings.engineLines);
}
// Focus and Minimal share variation controls; Minimal moves playback into the header.
function focusedEnginePanel(content, {locked = false, playable = false} = {}) {
  const name = activeEngineName();
  const minimal = panelDesign('engine', S.settings) === 'minimal';
  const count = enginePanelLineCount();
  const lineControl = (delta, label) => el('button', {
    type: 'button', class: delta > 0 ? 'engine-minimal-add' : 'engine-minimal-remove',
    disabled: locked || (delta > 0 ? !playable : S.blank),
    'aria-label': delta > 0 ? 'Add another engine line' : 'Remove the last engine line',
    onclick: async e => {
      e.currentTarget.disabled = true;
      await setEngineSetting('engineLines', Math.max(1, Math.min(enginePanelLineLimit(), enginePanelLineCount() + delta)));
      const target = UI.engine.querySelector(delta > 0 ? '.engine-minimal-add' : '.engine-minimal-remove')
        || UI.engine.querySelector('.engine-minimal-controls button');
      target?.focus({preventScroll: true});
    },
  }, label);
  const play = el('button', {type: 'button', class: 'engine-focus-play' + (S.bestWalking ? ' on' : ''),
    disabled: locked || !playable && !S.bestWalking,
    'aria-label': S.bestWalking ? 'Stop playing best moves' : 'Play best moves from this position',
    onclick: () => { if (S.bestWalking) { stopBestWalk(); renderControls(); renderEngineCurrent(); } else playBestMoves(); },
  }, minimal ? (S.bestWalking ? '■' : '▶') : S.bestWalking ? '■ Stop' : '▶ Play best moves from here');
  const panel = el('div', {class: 'panel engine-focus' + (minimal ? ' engine-minimal' : ''), 'data-design': minimal ? 'minimal' : 'focus', 'aria-label': 'Engine'},
    el('div', {class: 'panel-head engine-focus-head'}, el('h3', {}, 'Engine'),
      el('span', {class: 'count', title: locked ? 'Engine lines are hidden during practice' : name + ' · target search depth ' + S.settings.engineDepth},
        locked ? 'Practice' : minimal ? 'Depth ' + S.settings.engineDepth : name + ' · depth ' + S.settings.engineDepth),
      minimal ? play : null),
    el('div', {class: 'panel-body engine-body'}, content,
      minimal ? el('div', {class: 'engine-minimal-controls'},
        count > 1 ? lineControl(-1, '− Remove line') : null,
        count < enginePanelLineLimit() ? lineControl(1, '+ Add line') : null) : null),
    minimal ? null : el('div', {class: 'engine-focus-foot'}, play));
  UI.engine.replaceChildren(panel);
  fitEnginePanel();
}
// While solving a practice position, the engine lines would give the answer away → hide them.
function renderEnginePractice() {
  if (panelDesign('engine', S.settings) !== 'original') {
    focusedEnginePanel(el('div', {class: 'engine-empty', role: 'status'}, 'Find the best move — engine lines are hidden until you solve it.'), {locked: true});
    return;
  }
  UI.engine.replaceChildren(el("div", { class: "panel" },
    el("div", { class: "panel-head" }, el("h3", {}, "Engine"), el("span", { class: "count" }, "Practice")),
    el("div", { class: "panel-body engine-body" },
      el("div", { class: "engine-empty", role:"status" }, "Find the best move — engine lines are hidden until you solve it.")),
  ));
  fitEnginePanel();
}
// Choose the source of the engine lines for the shown position and draw the panel.
function renderEngineCurrent() {
  if(S.blank){
    if (panelDesign('engine', S.settings) !== 'original') {
      focusedEnginePanel(el('div', {class: 'engine-empty'}, 'Load a game to explore the best moves.'));
      return;
    }
    UI.engine.replaceChildren(el("div",{class:"panel"},
      el("div",{class:"panel-head"},el("h3",{},"Engine")),
      el("div",{class:"panel-body engine-body"},el("div",{class:"engine-empty"},"No game loaded."))));
    fitEnginePanel();
    return;
  }
  // Hide the engine lines for the whole practice flow, not just the solve: while rolling/skipping to
  // the next mistake (or replaying the demo) the lines would briefly flash the answer for the upcoming
  // position. They only reappear once practice is fully finished/exited.
  if (S.practice && (S.practice.solving || S.practice.rolling || S.practice.demoing)) { renderEnginePractice(); return; }
  if (S.analysisMode && S.variation) {
    reuseVariationAnalysis(S.variation, S.variation.idx);
    const pos = activePos(), b = pos.best;
    renderEngine(b ? b.lines : null, !!b && variationNeedsLines(pos));
  } else {
    const b = S.bests[S.idx];
    let lines = b ? b.lines : null;
    if (S._panelNeedsLive && !terminalScore(S.positions[S.idx].fen)) lines = null;
    // The scoring batch stores its own evidence; prefer the richer candidates from panel searches.
    const panel = cachedPanelLines();
    const want = enginePanelLineCount();
    const panelReady = panel?.count >= want;
    if (panel && (!lines || panel.lines.length > lines.length)) lines = panel.lines;
    // Keep this position's known candidates visible while a newly requested rank is pending.
    const padFromCache = want > 1 && !panelReady && !!lines && lines.length < want;
    renderEngine(lines, padFromCache);
    requestPanelLines();
  }
}
// Panel evidence is separate from calibrated scoring. Keep the richest result for each
// position/settings/history, including when the displayed candidate count changes.
const panelLineCache = new Map();
function engineContextKey(fen, history) {
  return JSON.stringify([fen, history,
    S.settings.enginePath, S.engineFallbackBuild || S.activeEngineBuild || S.settings.enginePath,
    S.settings.engineDepth, S.settings.engineHash, S.settings.engineSkill]);
}
function panelContextKey(i = S.idx) {
  return engineContextKey(S.positions[i]?.fen, searchHistory(S.positions, i));
}
function cachedPanelLines(i = S.idx) {
  if (!panelLineCache.size) return null;
  const key = panelContextKey(i), entry = panelLineCache.get(key);
  if (entry) { panelLineCache.delete(key); panelLineCache.set(key, entry); }
  return entry;
}
function rememberPanelLines(i, key, count, lines, fen = S.positions[i]?.fen) {
  const entry = {idx: i, fen, count, lines};
  if ((panelLineCache.get(key)?.count || 0) > count) return panelLineCache.get(key);
  if (key.length <= 16384) {
    panelLineCache.set(key, entry);
    // Retain an entire game's precalculated positions, with a small minimum for navigation.
    if (panelLineCache.size > Math.max(16, S.positions.length)) panelLineCache.delete(panelLineCache.keys().next().value);
  }
  return entry;
}
let panelWarmJob = null;
let backgroundActivityBound = false, backgroundInteractionAt = 0;
function pauseBackgroundAnalysis() {
  backgroundInteractionAt = Date.now();
  const job = panelWarmJob;
  if (job?.pending) {
    job.interrupted = true;
    job.engine?.cancelPending(); job.engine?.stop();
  }
}
function bindBackgroundAnalysisActivity() {
  if (backgroundActivityBound) return;
  backgroundActivityBound = true;
  for (const type of ['pointerdown', 'keydown', 'wheel']) document.addEventListener(type, pauseBackgroundAnalysis, {capture: true, passive: true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseBackgroundAnalysis(); });
}
function waitForBackgroundAnalysis(job, delay) {
  return new Promise(resolve => {
    job.resume = resolve;
    job.timer = setTimeout(() => { job.resume = null; resolve(!job.cancelled); }, delay);
  });
}
function backgroundAnalysisBusy() {
  return document.hidden || learningWorkspace?.embedded || S.analysisMode || !!S.practice || S.bestWalking || S.lineWalking
    || !!S._panelRequest || !!S.liveEngine?.current || !!S.helperEngine?.current
    || Date.now() - backgroundInteractionAt < 500;
}
function rememberAnnotationSearch(i, key, count, result) {
  const root = S.bests[i], top = result?.lines?.find(line => line.multipv === 1);
  if (S.settings.classifyLines <= 1 || !root || i >= S.total || count < 2
    || key !== panelContextKey(i) || !top || !Number.isInteger(top.depth) || top.depth < S.settings.engineDepth
    || result.bestmove !== (top.pv || '').split(' ')[0]) return false;
  const legal = new Set(new Chess(S.positions[i].fen).moves({verbose: true}).map(move => move.lan));
  const lines = result.lines.slice(0, Math.min(count, legal.size));
  if (lines.length < Math.min(count, legal.size) || lines.some((line, rank) => line.multipv !== rank + 1
    || line.depth !== top.depth || line.bound !== 'exact' || !legal.has((line.pv || '').split(' ')[0])
    || (line.score?.mate != null ? !Number.isInteger(line.score.mate) || line.score.mate === 0 : !Number.isFinite(line.score?.cp)))
    || new Set(lines.map(line => line.pv.split(' ')[0])).size !== lines.length) return false;
  root.annotationSearch = {key, count, result: {...result, lines}};
  if (!['best', 'excellent', 'great', 'brilliant'].includes(S.classif[i + 1])) return true;
  const before = JSON.stringify({classif: S.classif, grades: S.moveGrades});
  computeDerived();
  if (before !== JSON.stringify({classif: S.classif, grades: S.moveGrades})) {
    if (S.analysisMode) classifyVariationMoves();
    paintBoard(); renderBestArrow(); renderReview(); renderStats(); renderGraph(); renderMoves();
    saveToLibrary();
  }
  return true;
}
function stopPanelPrecalculation() {
  if (!panelWarmJob) return;
  panelWarmJob.cancelled = true;
  clearTimeout(panelWarmJob.timer);
  panelWarmJob.resume?.(false);
  panelWarmJob.engine?.terminate();
  panelWarmJob = null;
}
function schedulePanelPrecalculation() {
  const count = Math.max(enginePanelLineCount(), S.settings.classifyLines || 1);
  if (S.blank || S.analyzing || S.analysisError || count <= 1 && !S._panelNeedsLive) return;
  const context = JSON.stringify([S.batchGen, S.pgn, panelContextKey(0), count, S.settings.classifyLines]);
  if (panelWarmJob?.context === context) return;
  stopPanelPrecalculation();
  const job = {context, cancelled: false, engine: null, idx: null, pending: null, interrupted: false, dirty: false};
  panelWarmJob = job;
  const positions = S.positions;
  // Let the foreground request claim the visible position first. Statistics never await this job.
  job.timer = setTimeout(() => { job.promise = (async () => {
    try {
      if (!await waitForBackgroundAnalysis(job, 500)) return;
      const order = [S.idx, ...positions.map((_, i) => i).filter(i => i !== S.idx)];
      for (let cursor = 0; cursor < order.length; cursor++) {
        const i = order[cursor];
        if (job.cancelled || S.positions !== positions || S.analyzing) return;
        if (!S.bests[i]?.lines || terminalScore(positions[i].fen)) continue;
        const key = panelContextKey(i);
        if (S._panelRequest?.key === key && S._panelRequest.count >= count) await S._panelRequest.promise;
        if (job.cancelled) return;
        const cached = cachedPanelLines(i);
        if (cached?.count >= count || !S._panelNeedsLive && S.bests[i].lines.length >= count) continue;
        const extra = S.bests[i].annotationSearch;
        if (extra?.key === key && extra.count >= count) {
          rememberPanelLines(i, key, count, extra.result.lines); continue;
        }
        while (backgroundAnalysisBusy()) { if (!await waitForBackgroundAnalysis(job, 500)) return; }
        // One worker regardless of the foreground pool size; cap hash and leave
        // three times the search duration idle (at most 25% of one core on average).
        if (!job.engine) job.engine = await createEngine({Threads: 1, Hash: 16, 'Skill Level': S.settings.engineSkill});
        if (job.cancelled) { job.engine.terminate(); return; }
        while (backgroundAnalysisBusy()) { if (!await waitForBackgroundAnalysis(job, 500)) return; }
        job.idx = i;
        job.interrupted = false;
        const started = Date.now();
        job.pending = job.engine.analyse(positions[i].fen, S.settings.engineDepth, count, searchHistory(positions, i));
        const result = await job.pending;
        if (job.cancelled || S.positions !== positions || panelContextKey(i) !== key) return;
        job.idx = null; job.pending = null;
        if (job.interrupted) {
          // Resume this position after interaction settles. An interrupted search
          // cannot certify a category or leave a partial result in the cache.
          if (!await waitForBackgroundAnalysis(job, 500)) return;
          cursor--; continue;
        }
        const entry = rememberPanelLines(i, key, count, result.lines);
        job.dirty = rememberAnnotationSearch(i, key, count, result) || job.dirty;
        if (!S.analysisMode && S.idx === i) {
          S._panelCache = entry;
          renderEngineCurrent();
        }
        if (!await waitForBackgroundAnalysis(job, Math.max(250, (Date.now() - started) * 3))) return;
      }
    } catch { /* Foreground navigation can retry an interrupted or failed background search. */ }
    finally {
      job.engine?.terminate(); job.engine = null; job.idx = null; job.pending = null;
      if (job.dirty && !job.cancelled && S.positions === positions) saveToLibrary();
    }
  })(); }, 0);
}
async function requestPanelLines() {
  if (S.analyzing || S.analysisMode) return;          // not during the batch, not in variation mode
  schedulePanelPrecalculation();
  const want = enginePanelLineCount();
  if (!want || want <= 1 && !S._panelNeedsLive) {
    if (S._panelRequest) { S.panelToken++; S._panelRequest = null; S.liveEngine?.cancelPending(); S.liveEngine?.stop(); }
    return;
  }
  const key = panelContextKey();
  if (S._panelRequest && (S._panelRequest.key !== key || S._panelRequest.count !== want)) {
    S.panelToken++; S._panelRequest = null;
    S.liveEngine?.cancelPending(); S.liveEngine?.stop();
  }
  const i = S.idx;
  const stored = S.bests[i];
  if (!stored || !stored.lines) return;               // position not analysed yet
  if (stored.lines.length >= want && !S._panelNeedsLive) return;
  if (cachedPanelLines()?.count >= want) return; // includes forced positions with fewer legal moves
  if (S._panelRequest?.key === key) return S._panelRequest.promise;
  if (panelWarmJob?.idx === i && panelWarmJob.pending) return panelWarmJob.pending;
  const fen = S.positions[i].fen;
  if (terminalScore(fen)) return;
  const token = ++S.panelToken;
  const entry = {key, count: want, promise: null};
  S._panelRequest = entry;
  entry.promise = (async () => { try {
    // Publish ownership before engine startup can re-render the panel.
    await Promise.resolve();
    pauseBackgroundAnalysis();
    const eng = await ensureLiveEngine();
    if (token !== S.panelToken || S.analysisMode || panelContextKey() !== key) return;
    eng.cancelPending(); eng.stop();
    const res = await eng.analyse(fen, S.settings.engineDepth, want, searchHistory(S.positions, i));
    if (token !== S.panelToken || S.idx !== i || S.analysisMode || panelContextKey() !== key) return;
    S._panelCache = rememberPanelLines(i, key, want, res.lines);
    rememberAnnotationSearch(i, key, want, res);
    // Clear before rendering so a failed/uncacheable result cannot leave stale ownership.
    if (S._panelRequest === entry) S._panelRequest = null;
    renderEngine(res.lines);
  } catch { /* A later explicit request can retry a failed panel search. */ }
  finally { if (S._panelRequest === entry) S._panelRequest = null; } })();
  return entry.promise;
}
const ENGINE_NAME = { nnue: "Stockfish 18 NNUE", sf19lite: "Stockfish 19 Lite" };
// Keep Engine in its allotted panel. Candidate lines scroll instead of pushing
// playback or learning controls outside the viewport when more lines are shown.
function fitEnginePanel() {
  const mod=UI.engine?.closest('.mod');if(!mod)return;
  if(!isCustomLayout()||isResponsiveModern()){mod.style.minHeight="";return;}
  if(!S.layout.engine){mod.style.minHeight="";return;}
  const height=(panelDesign('engine', S.settings) === 'minimal' ? 128 : 120)*panelScale(S.layout.engine);
  mod.style.minHeight=height+'px';
  S.layout.engine.h=Math.max(S.layout.engine.h,height);
  applyPanelBox(mod,S.layout.engine);growCanvas();
}
function renderEngine(lines, padFromCache = false) {
  const design = panelDesign('engine', S.settings), focus = design !== 'original';
  const curFen = activePos().fen;
  const historyKey = JSON.stringify(activeSearchHistory());
  const configKey = JSON.stringify([S.settings.enginePath, S.activeEngineBuild, S.engineFallbackBuild,
    S.settings.engineDepth, S.settings.engineHash, S.settings.engineSkill, S.settings.classifyLines]);
  const want = enginePanelLineCount();
  // The last full set of real lines we rendered, kept (with the fen they were computed for, so the
  // SAN stays correct) to fill slots that the new position hasn't searched yet — and to hold the
  // panel steady while the engine re-computes (lines === null, e.g. "Play best moves from here").
  const cached = S._lastEngineLines?.fen === curFen && S._lastEngineLines?.historyKey === historyKey && S._lastEngineLines?.configKey === configKey ? S._lastEngineLines : null;
  const renderKey = JSON.stringify([design,curFen,historyKey,configKey,want,S.analysisMode,S.liveError,S.bestWalking,
    padFromCache,lines,(!lines || padFromCache) && cached?.lines]);
  if (UI.engineRenderKey === renderKey && UI.engineRenderNode === UI.engine.firstChild) return;
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
    if (cur.length >= want) S._lastEngineLines = { lines: cur, fen: curFen, historyKey, configKey };
    body = el("div", {},
      ...slots.map((slot, index) => {
        // Empty slot (a forced move with no second line, etc.) → a blank row of the same height so
        // the panel keeps the size of `want` lines and never resizes between moves.
        if (!slot) return focus ? el('div', {class: 'engine-focus-pending', role: 'status'},
          padFromCache ? 'Finding another line…' : 'No other candidate')
          : el("div", { class: "engine-line" }, el("span", { class: "ev" }, " "), el("span", { class: "moves" }, " "));
        const { l, fen } = slot;
        const wr = whiteRel(l.score, fen); const cp = scoreToCp(wr);
        const evTxt = wr.mate != null ? evalText(wr) : (cp >= 0 ? "+" : "") + (cp / 100).toFixed(2);
        const toks = uciLineToSan(fen, (l.pv || "").split(/\s+/).filter(Boolean), 6);
        if (focus) {
          const moves = [...toks];
          if (moves.length && fen.split(' ')[1] === 'b') moves[0] = fen.split(' ')[5] + '… ' + moves[0];
          const evaluation = wr.mate != null ? `${cp >= 0 ? 'White' : 'Black'} can force mate in ${Math.abs(wr.mate)}`
            : cp === 0 ? 'Equal position' : `${cp > 0 ? 'White' : 'Black'} has an advantage of ${Math.abs(cp / 100).toFixed(2)} pawns`;
          return el('button', {type: 'button', class: 'engine-focus-candidate', disabled: !moves.length,
            'aria-label': `${index === 0 ? 'Best line' : 'Alternative ' + (index + 1)}: ${moves.join(' ')}. ${evaluation}. Explore variation.`,
            onclick: () => playLine(l.pv)},
            el('span', {class: 'ev engine-focus-eval ' + (cp >= 0 ? 'pos' : 'neg')}, evTxt),
            el('span', {class: 'moves engine-focus-variation'}, ...moves.flatMap((move, i) => {
              const number = move.match(/^\d+[.…]\s*/)?.[0] || '';
              return [el('span', {class: 'engine-focus-token'},
                number ? el('span', {class: 'engine-focus-number'}, number) : null,
                el(i === 0 ? 'strong' : 'span', {}, move.slice(number.length))), ' '];
            })));
        }
        // Click a line to open a variation for manual navigation.
        return el("button", { type:"button", class: "engine-line clickable", tabindex:"-1", "aria-label":"Explore variation " + toks.join(" ") + ", evaluation " + evTxt, onclick: () => playLine(l.pv) },
          el("span", { class: "ev " + (cp >= 0 ? "pos" : "neg") }, evTxt),
          el("span", { class: "moves" }, ...toks.map((t) => /^\d/.test(t) ? el("b", {}, t + " ") : el("span", {}, t + " "))),
        );
      }),
    );
  }
  if (focus) {
    focusedEnginePanel(el('div', {class: 'engine-candidates'}, body), {
      playable: !S.liveError && lines?.length !== 0 && !!(lines?.some(line => line.pv?.trim()) || cached?.lines.some(line => line.pv?.trim())),
    });
    UI.engineRenderKey = renderKey; UI.engineRenderNode = UI.engine.firstChild;
    return;
  }
  // Play each position's best move until mate/draw or the user takes over, reusing completed
  // searches rather than treating an engine line's unsearched tail as position analysis.
  const bestWalkBtn = el("button", {
    class: "engine-bestwalk" + (S.bestWalking ? " on" : ""),
    onclick: () => { if (S.bestWalking) { stopBestWalk(); renderControls(); renderEngineCurrent(); } else playBestMoves(); },
  }, S.bestWalking ? "■ Stop" : "▶ Play best moves from here");
  UI.engine.replaceChildren(el("div", { class: "panel" },
    el("div", { class: "panel-head" }, el("h3", {}, "Engine"),
      el("span", { class: "count" }, `${activeEngineName()} · depth ${S.settings.engineDepth}`)),
    el("div", { class: "panel-body engine-body" },
      el("div", { class: "engine-candidates", style: { minHeight: `calc(${want} * var(--engine-line-h, 46px))` } }, body), bestWalkBtn),
  ));
  UI.engineRenderKey = renderKey; UI.engineRenderNode = UI.engine.firstChild;
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
      ...options.map((o) => el("button", { type:"button", "data-setting":key, "data-value":String(o), class: S.settings[key] === o ? "on" : "", onclick: () => setSetting(key, o) }, fmt(o)))),
  );
}
function settingDropdown(label, key, options) {
  const field = ddField(S.settings[key], options, async value => {
    await setSetting(key, value);
    UI.settings.querySelector('.lib-dd-btn[data-setting="' + key + '"]')?.focus({preventScroll: true});
  });
  field.classList.add("set-dropdown");
  const button = field.querySelector(".lib-dd-btn");
  button.dataset.setting = key;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-haspopup", "listbox");
  field.querySelector(".lib-dd-menu").setAttribute("role", "listbox");
  field.querySelector(".lib-dd-menu").setAttribute("aria-label", label);
  field.querySelectorAll(".lib-dd-opt").forEach((option, index) => {
    option.dataset.setting = key;
    option.dataset.value = options[index][0];
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(options[index][0] === S.settings[key]));
  });
  return el("div", {class: "set-row"}, setLabel(label), field);
}
// Generic slider. opts: { fmt(v)→text, onChange(v) }. Updates + saves live
// without rebuilding the whole panel (so you can drag smoothly without losing the slider).
function slider(label, key, min, max, step, opts = {}) {
  const fmt = opts.fmt || ((v) => v.toFixed(2));
  const out = el("b", {}, fmt(+S.settings[key]));
  return el("div", { class: "set-ctrl" },
    el("div", { class: "set-ctrl-top" }, setLabel(label, opts.info), out),
    el("input", {
      type: "range", "data-setting":key, min, max, step, value: S.settings[key],
      oninput: (e) => {
        const v = +e.target.value;
        out.textContent = fmt(v);
        S.settings[key] = v;
        writeSettings({ [key]: v });
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
let _accentPickCleanup = null;
function openAccentColorPicker(anchor) {
  if (_accentPickCleanup) _accentPickCleanup();
  S.settings.accent = "custom";
  writeSettings({ accent: "custom" });
  applySettings();
  anchor.parentElement.querySelectorAll(".set-chip").forEach((chip) => chip.classList.toggle("on", chip === anchor));
  const picker = buildColorPicker(S.settings.accentCustom || DEFAULT_SETTINGS.accentCustom,
    (hex) => { S.settings.accentCustom = hex; paintColorPickerChip(anchor, [hex]); applySettings(); },
    (hex) => { S.settings.accentCustom = hex; paintColorPickerChip(anchor, [hex]);
      writeSettings({ accentCustom: S.settings.accentCustom }); },
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
    writeSettings({ accentCustom: S.settings.accentCustom });
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
function openArrowColorPicker(anchor, key = "bestArrowColor") {
  closeArrowColorPicker();
  const title = key === "threatArrowColor" ? "Threat arrow" : "Best-move arrow";
  const update = (hex) => {
    S.settings[key] = hex;
    paintColorPickerChip(anchor, [hex]);
    refreshArrows();
  };
  const save = () => writeSettings({ [key]: S.settings[key] });
  const picker = buildColorPicker(S.settings[key] || DEFAULT_SETTINGS[key], update, save);
  const pop = el("div", { class: "board-cpick", role: "dialog", "aria-label": title + " color" },
    el("div", { class: "cpick-title" }, title), picker.el);
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
  writeSettings({ boardTheme: "custom" });
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
    (hex) => { S.settings[target] = hex; writeSettings({ [target]: hex }); }, // commit
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
      el("button", { type:"button", "data-setting":key, "data-value":"true", class: S.settings[key] ? "on" : "", onclick: () => onSet(key, true) }, "On"),
      el("button", { type:"button", "data-setting":key, "data-value":"false", class: !S.settings[key] ? "on" : "", onclick: () => onSet(key, false) }, "Off"),
    ),
  );
}
// Engine segment/slider: changing it saves + triggers re-analysis (scheduleReanalyze via setEngineSetting).
function engineSeg(label, key, options, fmt, info) {
  const selected = key === 'engineLines' ? enginePanelLineCount() : S.settings[key];
  return el("div", { class: "set-row" },
    setLabel(label, info),
    el("div", { class: "set-seg" },
      ...options.map((o) => el("button", { type:"button", "data-setting":key, "data-value":String(o), class: selected === o ? "on" : "", onclick: () => setEngineSetting(key, o) }, fmt ? fmt(o) : String(o)))),
  );
}
function engineSlider(label, key, min, max, step, opts = {}) {
  const fmt = opts.fmt || ((v) => String(v));
  const out = el("b", {}, fmt(+S.settings[key]));
  return el("div", { class: "set-ctrl" },
    el("div", { class: "set-ctrl-top" }, setLabel(label, opts.info), out),
    el("input", {
      type: "range", "data-setting":key, min, max, step, value: S.settings[key],
      oninput: (e) => {
        const v = +e.target.value;
        out.textContent = fmt(v);
        if (key === "engineDepth") return; // preview while dragging; confirm once on release
        S.settings[key] = v;
        writeSettings({ [key]: v });
        S.engineFallbackBuild = null; S.activeEngineBuild = null;
        resetLiveEngine();
        invalidateVariationEvals();
        resetHelperEngine();
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
  await writeSettings(Object.fromEntries(ENGINE_SETTING_KEYS.map(key => [key, S.settings[key]])), ENGINE_SETTING_KEYS);
  resetLiveEngine();
  invalidateVariationEvals();
  resetHelperEngine();
  S.threatCache.clear();
  scheduleReanalyze();
  if (UI.settings && !UI.settings.hidden) renderSettings();
}
const ARROW_SETTING_KEYS = ["bestArrow", "showThreat", "bestArrowColor", "threatArrowColor", "arrowOpacity", "arrowShaft", "arrowHead"];
const BACKGROUND_SETTING_KEYS = ["bg", "bgFit", "bgTile", "bgCustom", "bgHue", "bgSat", "bgLight"];
const BADGE_SETTING_KEYS = ["badgeFont", "badgeTooltip"];
const VISUAL_SETTING_KEYS = [
  ...PANEL_DESIGNS.map(design => design.setting),
  "theme", "accent", "accentCustom", "density", "evalView", "mlStyle", "badgeStyle", "badgeScale",
  ...BADGE_SETTING_KEYS,
  "graphStyle", "barStyle", "insightFont", "showCoords", "coordSize", ...BACKGROUND_SETTING_KEYS,
  "coach", "coachPlain", "boardTheme", "pieceStyle", "boardCustomLight", "boardCustomDark",
  "sound", "soundVolume", "soundFx", "puzzleSuccessSound", "puzzleIncorrectSound", ...ARROW_SETTING_KEYS,
  "moveAnim", "animSpeed", "learningTransition",
];
function resetSettingKeys(keys) {
  for (const key of keys) S.settings[key] = structuredClone(DEFAULT_SETTINGS[key]);
  return writeSettings(Object.fromEntries(keys.map(key => [key, S.settings[key]])), keys);
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
  await applyUiSetup('modern');
  applySettings(); buildBoard(); renderEvalBar(); renderGraph(); renderMoves();
  renderCoachAvatar(); renderReview(); renderStats(); renderControls(); renderEngineCurrent();
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
    section("Interface presets",
      seg("Setup", "uiSetup", Object.keys(UI_SETUPS), null, value => UI_SETUPS[value].label),
    ),
    section("Tabs",
      ...PANEL_DESIGNS.filter(design => design.panel === "evalbar" || design.versions.length > 1).map(design =>
        design.panel === "evalbar" ? settingDropdown("Evaluation bar", "barStyle",
          [["gradient", "Gradient"], ["classic", "Solid"], ["mono", "Mono"], ["accent", "Accent"]])
          : settingDropdown(design.label, design.setting, design.versions.map(version => [version.id, version.label]))),
    ),
    section("Theme",
      colorChips("Accent", "accent", accentEntries),
    ),
    section("Board & Pieces",
      colorChips("", "boardTheme", boardEntries),
      pieceGrid(),
      toggleRow("Board coordinates", "showCoords"),
      slider("Size", "coordSize", 10, 25, 1, {
        fmt: (v) => v + " px",
        onChange: (v) => document.documentElement.style.setProperty("--coord-size", v + "px"),
      }),
    ),
    section("Best-move/Threat arrow",
      toggleRow("Show best-move arrow", "bestArrow"),
      arrowColorSetting("Best-move color", "bestArrowColor"),
      toggleRow("Show threat arrow", "showThreat"),
      arrowColorSetting("Threat color", "threatArrowColor"),
      slider("Opacity", "arrowOpacity", 0.3, 1, 0.02, { onChange: refreshArrows }),
      slider("Shaft width", "arrowShaft", 0.14, 0.42, 0.01, { onChange: refreshArrows }),
      slider("Head size", "arrowHead", 0.22, 0.55, 0.01, { onChange: refreshArrows }),
      el("button", { class: "set-reset", onclick: resetArrowSettings }, "Reset to default"),
    ),
    section("Move animation",
      toggleRow("Animation", "moveAnim"),
      slider("Speed", "animSpeed", 1, 10, 1, { fmt: (v) => (440 - v * 40) + " ms" }),
    ),
    section("Layout",
      el("button", { class: "set-reset reorg-toggle-btn", onclick: toggleReorganize }, S.reorganize ? "Done reorganizing" : "Reorganize panels"),
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Drag to move panels; use their edges to resize.")),
      el("button", { class: "set-reset", onclick: exportPanelLayout }, "Export panel layout"),
      el("button", { class: "set-reset", onclick: resetLayout }, "Reset layout"),
    ),
    section("Move list",
      seg("Style", "mlStyle", ["rows", "cards", "compact"]),
      seg("Badges", "badgeStyle", ["icon", "dot", "label"]),
    ),
    section("Category badges", badgeSettings()),
    section("Coach",
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Who appears and narrates. Choose No coach to remove the character and keep plain move commentary. Switch any time.")),
      coachPicker(),
      S.settings.coach ? el("div", { class: "set-row" },
        setLabel("Special replies", "On = the coach narrates in their own voice. Off = neutral, plain commentary (the coach still appears and reacts on the board)."),
        el("div", { class: "set-seg" },
          el("button", { class: !S.settings.coachPlain ? "on" : "", onclick: () => setCoachPlain(false) }, "On"),
          el("button", { class: S.settings.coachPlain ? "on" : "", onclick: () => setCoachPlain(true) }, "Off"),
        ),
      ) : null,
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
      toggleRow("Sound effects", "sound"),
      slider("Master volume", "soundVolume", 0, 100, 1, { fmt: (v) => v + " %" }),
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Pick a sound for each event, then adjust its volume, pitch and speed. Each volume is relative to the master volume. Changes preview as you make them.")),
      fxEventControls("puzzleSuccess", "Puzzle success"),
      fxEventControls("puzzleIncorrect", "Incorrect puzzle"),
      ...SOUND_EVENTS.map(([key, label]) => fxEventControls(key, label)),
      el("div", { class: "set-fx", "data-sound-event": "runStart" },
        fxSlider("runStart", "volume", "Puzzle intro volume", 0, 100, 1, (v) => v + " %")),
    ),
    section("Developer debugger",
      el("button", {class:"set-reset","data-debug":"screen-previews",onclick:openScreenSizePreview}, "Open screen-size preview"),
      el("div", {class:"set-row hint"},el("span",{class:"set-note"},"Preview layouts at different screen sizes. Changes are not saved.")),
    ),
    el("button", { class: "set-reset", onclick: resetVisualSettings }, "Reset all visual settings"),
  );
}
function arrowColorSetting(label, key) {
  return colorChips(label, key, [{
    value: S.settings[key] || DEFAULT_SETTINGS[key], title: "Choose " + label.toLowerCase(),
    onClick: event => openArrowColorPicker(event.currentTarget, key),
    render: chip => colorPickerChip(chip, [S.settings[key] || DEFAULT_SETTINGS[key]]),
  }]);
}
// Coach dropdown — only coaches that have a built animated character. Uses the
// library's custom dropdown (ddField) rather than a native <select> so the option hover matches the
// app theme instead of the OS's blue highlight.
function coachPicker() {
  const cur = S.settings.coach || "";
  const opts = [["", "No coach"], ...COACH_LIST.filter(([id]) => COACH_RIGS[id])];
  const portrait = (id, label) => el("span", { class: "coach-choice" },
    id ? el("img", { class: "coach-thumbnail", src: browserAPI.runtime.getURL("data/coaches-anim/thumbnails/" + id + ".svg"), alt: "", width: 28, height: 32 }) : null,
    el("span", {}, label));
  const dropdown = ddField(cur, opts, (v) => setCoach(v), portrait);
  dropdown.classList.add("coach-dropdown");
  return el("div", { class: "set-row" }, el("span", { class: "set-lbl" }, "Coach"), dropdown);
}
// Controls for one event: a sound dropdown plus volume, pitch and speed knobs.
// Everything previews on change. The dropdown re-renders the panel so its label updates;
// the sliders save + preview live without a rebuild (so the drag isn't interrupted).
function fxEventControls(ev, label) {
  const cfg = fxConfig(ev);
  let opts = [["default", "Lichess"], ...FX_SOUNDS.map(([id, l]) => [id, l])];
  if (ev === "puzzleSuccess") opts = [...PUZZLE_SUCCESS_SOUNDS.map(([id, label]) => [id, label]), ["none", "Off"]];
  else if (ev === "puzzleIncorrect") opts = [...PUZZLE_INCORRECT_SOUNDS.map(([id, label]) => [id, label]), ["none", "Off"]];
  const cls = ev === "puzzleSuccess" ? " set-puzzle-success" : ev === "puzzleIncorrect" ? " set-puzzle-incorrect" : "";
  return el("div", { class: "set-fx" + cls, "data-sound-event": ev },
    el("div", { class: "set-row" }, el("span", { class: "set-lbl" }, label),
      ddField(cfg.snd, opts, async (v) => {
        await setFx(ev, "snd", v);
        triggerFx(ev);
        if (UI.settings && !UI.settings.hidden) renderSettings();
      })),
    fxSlider(ev, "volume", "Volume", 0, 100, 1, (v) => v + " %"),
    fxSlider(ev, "pitch", "Pitch", -12, 12, 1, (v) => (v > 0 ? "+" : "") + v + " st"),
    fxSlider(ev, "speed", "Speed", 0.5, 2, 0.05, (v) => (+v).toFixed(2) + "×"),
  );
}
// Slider bound to a nested soundFx field. oninput saves + updates the readout live (no rebuild, so the
// drag survives); previewing on change (release) keeps the cue from machine-gunning while dragging.
function fxSlider(ev, field, label, min, max, step, fmt) {
  const out = el("b", {}, fmt(fxConfig(ev)[field]));
  const eventLabel = {puzzleSuccess: "Puzzle success", puzzleIncorrect: "Incorrect puzzle", runStart: "Puzzle intro"}[ev] || _eventDef(ev)[1];
  return el("div", { class: "set-ctrl set-fx-knob" },
    el("div", { class: "set-ctrl-top" }, el("span", { class: "set-lbl" }, label), out),
    el("input", {
      type: "range", min, max, step, value: fxConfig(ev)[field], "aria-label": eventLabel + " " + field,
      oninput: (e) => { const v = +e.target.value; out.textContent = fmt(v); setFx(ev, field, v); },
      onchange: () => { if (ev !== "runStart") triggerFx(ev); },
    }),
  );
}
function motorSettings() {
  return el("div", {},
    section("Search",
      engineSeg("Analysis lines", "classifyLines", [1, 2, 3], null, ENGINE_INFO.classifyLines),
      engineSlider("Depth", "engineDepth", 8, 22, 1, { info: ENGINE_INFO.engineDepth }),
      engineSlider("Workers", "engineWorkers", 1, 8, 1, { fmt: (v) => v + (v === 1 ? " (single)" : " parallel"), info: ENGINE_INFO.engineWorkers }),
      el("div", { class: "set-row hint" },
        el("span", { class: "set-note" }, "Results appear after the first line. Extra analysis lines check move quality in the background and update categories such as Great. One background worker pauses between positions and yields while you interact. Accuracy and rating scores stay unchanged.")),
    ),
    section("Estimated rating",
      el("div", { class: "set-row" }, setLabel("Rating mode", ELO_INFO),
        ddField(S.settings.ratingMode || "context", [["context", "Use recorded rating"], ["moves", "Moves only"]], value => setEngineSetting("ratingMode", value))),
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" },
        "Use recorded rating: shows how well you played compared with players around the rating saved in this game, using the selected engine's own model. If no rating is saved, we use Moves only instead.")),
      S.settings.enginePath === "sf19lite" ? el("div", { class: "set-row hint" }, el("span", { class: "set-note" },
        "Stockfish 19 compares expected-point losses with its own public peers. This rating comparison is separate from displayed accuracy.")) : null,
      el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Moves only: ignores the saved rating and estimates a blitz rating level from your move choices. Needs at least 10 moves with more than one legal choice. These estimates do not change your account rating.")),
      (S.settings.enginePath === "nnue" && (S.settings.engineDepth !== 16 || S.settings.engineHash !== 16 || S.settings.engineSkill !== 20))
        ? el("div", { class: "set-row hint" }, el("span", { class: "set-note" }, "Use depth 16, hash 16 MB and maximum strength for calibrated SF18 numerical scores.")) : null,
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
    el("button", { class: "set-reset", onclick: resetEngineSettings }, "Reset all engine settings"),
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
  const activeSetting = UI.settings.contains(document.activeElement) ? document.activeElement.dataset.setting : null;
  const activeValue = document.activeElement?.dataset.value;
  const focusContext = node => ({section:node.closest(".set-section")?.querySelector(".set-sect-head span")?.textContent,
    row:node.closest(".set-row,.set-ctrl")?.querySelector(".set-lbl")?.textContent, text:node.textContent,
    kind:node.className.replace(/\bon\b/g, "").trim()});
  const activeButton = UI.settings.contains(document.activeElement) && document.activeElement.tagName === "BUTTON" ? focusContext(document.activeElement) : null;
  const tabs = el("div", { class: "set-tabs" },
    el("button", { class: "set-tab" + (S.settingsTab === "visual" ? " on" : ""), onclick: () => { S.settingsTab = "visual"; renderSettings(); } }, "Visual"),
    el("button", { class: "set-tab" + (S.settingsTab === "engine" ? " on" : ""), onclick: () => { S.settingsTab = "engine"; renderSettings(); } }, "Engine"),
  );
  UI.settings.replaceChildren(tabs, S.settingsTab === "engine" ? motorSettings() : visualSettings());
  UI.settings.scrollTop = scroll;
  const fonts = UI.settings.querySelector(".badge-font-options");
  if (fonts && fontScroll != null) fonts.scrollTop = fontScroll;
  if (focusedFont) UI.settings.querySelector(`[data-font="${focusedFont}"]`)?.focus({ preventScroll: true });
  if (focusedLabelStyle) UI.settings.querySelector(`[data-label-style="${focusedLabelStyle}"]`)?.focus({ preventScroll: true });
  if (focusedSection) [...UI.settings.querySelectorAll(".set-sect-head")].find(head => head.querySelector("span")?.textContent === focusedSection)?.focus({ preventScroll: true });
  if (activeSetting) {
    const candidates = [...UI.settings.querySelectorAll("[data-setting]")].filter(node => node.dataset.setting === activeSetting);
    (candidates.find(node => node.classList.contains("lib-dd-btn")) || candidates.find(node => node.dataset.value === activeValue))?.focus({preventScroll:true});
  }
  else if (activeButton && !UI.settings.contains(document.activeElement)) {
    const matches = [...UI.settings.querySelectorAll("button")].filter(node => JSON.stringify(focusContext(node)) === JSON.stringify(activeButton));
    if(matches.length === 1)matches[0].focus({preventScroll:true});
  }
  positionSettings();
}
function positionSettings() {
  if (!UI.settings || UI.settings.hidden) return;
  const app=UI.canvas.closest('.app'),reference=UI.canvas.classList.contains('full-hd-reference');
  const chromeScale=reference?parseFloat(app.style.getPropertyValue('--reference-chrome-scale'))||1:1;
  let scale=chromeScale;
  if(reference){
    const currentScale=parseFloat(getComputedStyle(UI.settings).zoom)||1;
    const width=UI.settings.getBoundingClientRect().width/currentScale;
    const right=Math.max(0,...[...UI.canvas.querySelectorAll('.mod')]
      .filter(mod=>!mod.hidden&&getComputedStyle(mod).display!=='none')
      .map(mod=>mod.getBoundingClientRect().right));
    const available=window.innerWidth-right-24-12;
    // Fit the remaining desktop gutter independently of the growing panels.
    // Small windows retain the regular popover rather than illegible controls.
    if(width>0&&available>=width*.6)scale=Math.min(scale,available/width);
  }
  UI.settings.style.setProperty('--settings-scale',scale);
  // Fixed offsets are in the popover's zoomed coordinates; keep the screen inset constant.
  UI.settings.style.right = window.innerWidth <= 520 ? "" : 24/scale+"px";
}
async function toggleSettings() {
  closeArrowColorPicker();
  UI.settings.hidden = !UI.settings.hidden;
  if (!UI.settings.hidden) renderSettings();
  learningWorkspace?.settingsLayoutChanged();
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
  { name: "Thomas Murray", username: "MurrayThomas", role: "Contributor" },
  { name: "lautpuspa", username: "lautpuspa", role: "Contributor" },
  { name: "T-Julsgaard", username: "T-Julsgaard", role: "Creator & lead developer" },
];
const REPO_URL = "https://github.com/T-Julsgaard/Chess-Review";
let _closeCredits = null;
function openCredits() {
  _closeCredits?.();
  const previousFocus = document.activeElement, app = document.querySelector(".app"), previousInert = !!app.inert;
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey, true); app.inert = previousInert; _closeCredits = null; if(previousFocus?.isConnected)previousFocus.focus(); };
  const onKey = e => {
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (e.key === "Tab") {
      const nodes = [...card.querySelectorAll("button,a[href]")], first = nodes[0], last = nodes[nodes.length-1];
      if (e.shiftKey && (document.activeElement === first || !card.contains(document.activeElement))) {e.preventDefault();last.focus();}
      else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
    } else if (e.key.startsWith("Arrow") || ["Home","End","f"].includes(e.key)) e.stopImmediatePropagation();
  };

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

  const card = el("div", { class: "credits-card", role: "dialog", "aria-modal":"true", "aria-label": "Credits and attributions" },
    el("div", { class: "credits-head" },
      el("h3", {}, "Credits & attributions"),
      el("button", { type:"button", class: "icon-btn", "aria-label": "Close credits", onclick: close }, icon("close")),
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
  app.inert = true; _closeCredits = close;
  document.addEventListener("keydown", onKey, true); card.querySelector("button").focus();
}
let _settingsWriteQueue = Promise.resolve();
function mergeSettingsPatch(base, patch, replaceKeys = [], path = "") {
  const result = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    const field = path ? path + "." + key : key;
    if (value === undefined) delete result[key];
    else if (value && typeof value === "object" && !Array.isArray(value) && !replaceKeys.includes(field)) {
      result[key] = mergeSettingsPatch(result[key], value, replaceKeys, field);
    } else result[key] = structuredClone(value);
  }
  return result;
}
// Persist only the user's deliberate edit. Other open reviews retain their active
// configuration until reloaded, so their cached analysis remains tied to that configuration.
function writeSettings(patch, replaceKeys = []) {
  patch = structuredClone(patch);
  const commit = async () => {
    const stored = await browserAPI.storage.local.get("settings");
    await browserAPI.storage.local.set({ settings: mergeSettingsPatch(stored.settings, patch, replaceKeys) });
  };
  const pending = navigator.locks?.request
    ? navigator.locks.request("chess-review-settings", commit)
    : (_settingsWriteQueue = _settingsWriteQueue.catch(() => {}).then(commit));
  pending.catch(error => console.warn("Settings save failed", error));
  return pending;
}
async function setSetting(key, value) {
  if (key === 'uiSetup') return applyUiSetup(value);
  const design = PANEL_DESIGNS.find(item => item.setting === key);
  if (design) value = panelDesign(design.panel, {[key]: value});
  if (key === "badgeTooltip") value = badgeLabelStyle(value);
  const setupPatch = design && S.settings[key] !== value ? customUiSetupPatch() : {};
  S.settings[key] = value;
  await writeSettings({ [key]: value, ...setupPatch });
  applySettings();
  if (design?.panel.startsWith('accuracy')) { statsRefs = null; hideQTip(); renderStats(); if(key==='accuracyDesign')reflowAccuracy(accuracyLayoutExpanded()); }
  if (key === 'movesDesign') updateMovesDesign();
  if (key === 'engineDesign') renderEngineCurrent();
  if (key === 'moveAnim' && S.settings.moveAnim === false) {
    overviewReveal.stop();
    Object.values(phaseReveals).forEach(reveal => reveal.stop());
  }
  if (key === "pieceStyle") buildBoard();
  if (key === "mlStyle" || key === "badgeStyle") renderMoves();
  if (key === "evalView" || key === "graphStyle" || key === "barStyle" || key === "evalbarDesign" || key === "graphDesign" || key === "moveAnim") { renderEvalBar(); renderGraph(); }
  if (key === "bestArrow") renderBestArrow();
  if (key === "showThreat") renderThreatArrow();
  if (key === "bestArrowColor" || key === "threatArrowColor") refreshArrows();
  if (BADGE_SETTING_KEYS.includes(key)) refreshBadgeAppearance();
  if (key === "badgeTooltip") syncBoardBadgeLabel(true);
  if (UI.settings && !UI.settings.hidden) renderSettings();
}
async function applyUiSetup(value) {
  const setup = UI_SETUPS[value];
  if (!setup) return;
  if (value === 'custom') {
    await writeSettings(customUiSetupPatch());
    if (UI.settings && !UI.settings.hidden) renderSettings();
    return;
  }
  cancelPanelGesture?.();
  const patch = {uiSetup:value, uiSetupBase:value, ...setup.designs, evalView:'both', ...(value === 'modern' ? {modernEngineVersion:1,modernMovesVersion:1,modernGraphVersion:1,modernQualityVersion:1} : {})};
  Object.assign(S.settings, patch);
  S.originalAccuracyExpanded = false; S.qbreakExpanded = false; S.accuracyPage = 0;
  statsRefs = null; hideQTip(); overviewReveal.stop();
  applySettings(); renderEvalBar(); renderGraph(); renderMoves(); renderStats(); renderEngineCurrent(); renderReview();
  const savedSettings = writeSettings(patch);
  await Promise.all([savedSettings, resetLayout()]);
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
  if (key === 'engineLines' || key === 'classifyLines') value = normalizeEngineLineCount(value);
  const patch = {[key]: value};
  // Selecting analysis lines also selects the candidates shown in the evaluation panel.
  if (key === 'classifyLines') patch.engineLines = value;
  if (Object.entries(patch).every(([name, next]) => S.settings[name] === next)) return;
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
  const previous = {pgn:S.pgn, settingsKey:analysisSettingsKey(), bests:S.bests, evals:S.evals,
    engineBuild:S.engineFallbackBuild || S.activeEngineBuild};
  Object.assign(S.settings, patch);
  await writeSettings(patch);
  if (key === "engineWorkers") {
    if (S.analyzing) scheduleReanalyze(true);
    if (UI.settings && !UI.settings.hidden) renderSettings();
    return;
  }
  if (Object.hasOwn(patch, 'engineLines')) {
    // A display-count change must not discard previously calculated candidates or scores.
    stopPanelPrecalculation();
    S.panelToken++; S._panelRequest = null;
    if (!S.analysisMode) { S.liveEngine?.cancelPending(); S.liveEngine?.stop(); }
    if (key === 'classifyLines') {
      computeDerived();
      if (S.analysisMode) classifyVariationMoves();
      paintBoard(); renderReview(); renderStats(); renderGraph(); renderMoves();
      if (!S.analyzing) saveToLibrary();
    }
    schedulePanelPrecalculation();
    renderEngineCurrent();
    if (S.analysisMode && S.variation) requestLiveEval();
    if (UI.settings && !UI.settings.hidden) renderSettings();
    return;
  }
  const lineKey = key === "engineLines" || key === "fastLines" || key === "fastAnalysis";
  const scoringBuild = S.analyzing ? S.evalEngines[0]?.buildKey : previous.engineBuild;
  const fixedProtocol = ["engineDepth","engineHash","engineSkill","classifyLines","ratingMode"].includes(key)
    && S.settings.enginePath === "sf19lite" && scoringBuild === "sf19lite"
    && (S.analyzing || reusableSf19Analysis(previous));
  if (!lineKey && !fixedProtocol) { S.engineFallbackBuild = null; S.activeEngineBuild = null; }
  resetLiveEngine();
  invalidateVariationEvals();
  // The helper engine (threat preview / practice judging) must also be rebuilt with the new
  // build/options, and any cached threat arrows recomputed.
  resetHelperEngine();
  S.threatCache.clear();
  // In analysis mode: reset the variation's cached evals, so they're recomputed with new options.
  if (S.analysisMode && S.variation) {
    requestLiveEval();
  }
  // Classification always searches a single line now, and the engine panel fills extra candidate
  // lines on demand for the position you're viewing. So the line-count settings (panel "Lines",
  // fast-mode lines/toggle) are purely a display choice — they never require re-analysis; just
  // refresh the panel (which kicks off an on-demand search if more lines are wanted).
  if (fixedProtocol) {
    if (["engineDepth","engineHash","engineSkill"].includes(key)) S._panelNeedsLive = true;
    computeDerived(); renderReview(); renderStats(); renderGraph(); renderMoves();
    if (!S.analyzing) saveToLibrary();
  } else if (!lineKey) scheduleReanalyze();
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
  const learnEntry=document.querySelector(".learn-entry-button");
  if(learnEntry)learnEntry.dataset.motion=S.settings.moveAnim===false?"off":"on";
  applyBackground();
  const learningToggle=document.getElementById("learningToggle");
  if(learningToggle)learningToggle.dataset.motion=S.settings.moveAnim===false?"off":"on";
  learningWorkspace?.refreshSettings();
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
      await writeSettings({ bgCustom: S.settings.bgCustom, bg: S.settings.bg });
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
   asking you to find the stored best move. Other moves fail immediately without another search.
   Between solves it fast-rolls through the intervening moves rather
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
  pauseBackgroundAnalysis();
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
function clearPracticeResult() {
  if (!S.practice?.resultBadge) return;
  const square = sqByName[S.practice.resultBadge.square];
  S.practice.resultBadge = null;
  square?.classList.remove('has-badge');
  square?.querySelectorAll('.puzzle-result-badge').forEach(n => n.remove());
}
function exitPractice() {
  if (!S.practice) return;
  _cancelPromotion?.();
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
// Replay the mistake: pause, play the wrong move (with its category shown on the board),
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
    if (S.settings.moveAnim) animateMove(mv.from, mv.to);
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
  p.resultBadge = null;
  S.selectedSq = null; S.practiceHint = null;
  paintBoard(); renderEvalBar(); renderPlayers(); renderMoves(); renderGraph();
  renderControls(); renderReview(); renderEngineCurrent();
}
function practiceAdvance() {
  if (learningWorkspace) { deferredPracticeAdvance = true; return; }
  const p = S.practice; if (!p) return;
  p.i++;
  p.solving = false;
  p.advancing = true;   // keep the "✓ Correct! Moving on…" message during the roll to the next spot
  S.practiceHint = null;
  if (p.i >= p.spots.length) { finishPractice(); return; }
  practiceRoll(p.spots[p.i] - 1, practiceEnterSolve);   // roll from where we are to the next mistake
}
// Flash the from/to squares green (good) or red (bad) as quick feedback.
const practiceFlashTimers = new WeakMap();
function flashSquares(names, kind) {
  const cls = kind === "good" ? "flash-good" : "flash-bad";
  const squares = names.map(n => sqByName[n]).filter(Boolean);
  for (const sq of squares) {
    clearTimeout(practiceFlashTimers.get(sq));
    sq.classList.remove("flash-good", "flash-bad");
  }
  // Repeated attempts on the same squares must replay the fade from its start.
  if (squares.length) void squares[0].offsetWidth;
  for (const sq of squares) {
    sq.classList.add(cls);
    practiceFlashTimers.set(sq, setTimeout(() => {
      sq.classList.remove(cls); practiceFlashTimers.delete(sq);
    }, 680));
  }
}
// Short "buzz" on the board to make a rejected move feel like a wrong answer (instead of the
// piece just silently snapping back). The class is removed once the keyframes finish.
const practiceBuzzTimers = new WeakMap();
function buzzBoard() {
  const board = UI.boardWrap && UI.boardWrap.querySelector(".board");
  if (!board) return;
  clearTimeout(practiceBuzzTimers.get(board));
  board.classList.remove("buzz");
  void board.offsetWidth;             // restart the animation if it's still mid-buzz
  board.classList.add("buzz");
  practiceBuzzTimers.set(board, setTimeout(() => {
    board.classList.remove("buzz"); practiceBuzzTimers.delete(board);
  }, 420));
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
// Compare the complete move, including promotion, with the stored answer.
function judgePass(solvePos, userUci) {
  return S.bests[solvePos]?.bestmove === userUci;
}
async function practiceAttempt(from, to, promotion = "q") {
  const p = S.practice;
  if (!p || !p.solving || p.busy) return;
  const solvePos = p.spots[p.i] - 1;
  const fen = S.positions[solvePos].fen;
  let c, mv;
  try { c = new Chess(fen); mv = c.move({ from, to, promotion }); } catch { mv = null; }
  if (!mv) { S.selectedSq = null; renderSelection(); return; }
  const userUci = mv.from + mv.to + (mv.promotion || "");
  if (judgePass(solvePos, userUci)) {
    p.resultBadge = null;
    UI.boardWrap.querySelectorAll('.puzzle-result-badge').forEach(n => {n.parentElement.classList.remove('has-badge');n.remove();});
    p.solving = false;              // lock out further attempts until the next spot
    S.practiceHint = null;
    renderPracticeHint();           // remove the tint before the success flash can fade
    S.selectedSq = null; renderSelection();
    // Visually play the correct move so the piece lands on its square and STAYS there for a beat
    // — confirming the answer instead of snapping straight back.
    const fromSq = sqByName[mv.from], toSq = sqByName[mv.to];
    if (fromSq && toSq) {
      const pieceEl = fromSq.querySelector(".piece, .piece-svg, .piece-img");
      toSq.querySelectorAll(".piece, .piece-svg, .piece-img, .sq-badge").forEach((n) => n.remove());
      if (mv.promotion) {pieceEl?.remove();toSq.append(makePiece(mv.promotion,mv.color));}
      else if (pieceEl) toSq.append(pieceEl);
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
      // Confirm the puzzle outcome without assigning an engine review grade.
      toSq.classList.add("has-badge");
      toSq.append(puzzleResultBadge(document, "correct"));
    }
    flashSquares([mv.from, mv.to], "good");
    playSanSound(mv.san);
    playPuzzleSuccess();
    renderControls(); renderReview();
    setTimeout(() => { if (S.practice === p) practiceAdvance(); }, 1300);
  } else {
    const result = p.resultBadge = {solvePos, square:mv.from, status:"incorrect"};
    setTimeout(() => {
      if (S.practice === p && p.resultBadge === result) clearPracticeResult();
    }, 1000);
    p.fails = (p.fails || 0) + 1;
    S.selectedSq = null; paintBoard(); renderControls(); renderReview();
    flashSquares([mv.from, mv.to], "bad");
    buzzBoard();
    playWrongSound();
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
  return (S.meta && (S.meta.gameId || S.meta.libraryId)) || ("pgn:" + simpleHash(S.pgn || ""));
}

function scoringSettingsSnapshot() {
  return {...S.settings, classifyLines: 1};
}
function analysisSettingsKey() {
  const settings = scoringSettingsSnapshot();
  return JSON.stringify(["public-scoring-v4", CALIB?.version, CALIB?.context?.sf19?.candidateVersion, settings.ratingMode, settings.enginePath, settings.engineDepth, settings.classifyLines,
    settings.engineHash, settings.engineSkill]);
}

function reusableSf19Analysis(saved) {
  if (S.settings.enginePath !== "sf19lite" || saved?.engineBuild !== "sf19lite"
    || saved.pgn !== S.pgn || !completeAnalysis(saved, S.total + 1)
    || !scoringEvidenceComplete(saved.bests, S.total, CALIB)) return false;
  let previous, current;
  try { previous = JSON.parse(saved.settingsKey); current = JSON.parse(analysisSettingsKey()); } catch { return false; }
  if (!Array.isArray(previous) || previous.length !== current.length
    || [0,1,2,4].some(i => previous[i] !== current[i])) return false;
  const expectedContext = S.positions[0].fen === new Chess().fen() ? CALIB.context.sf19.candidateVersion : null;
  const wdl = score => Array.isArray(score?.wdl) && score.wdl.length === 3
    && score.wdl.every(n => Number.isInteger(n) && n >= 0) && score.wdl.reduce((a,b)=>a+b,0) === 1000;
  return saved.bests.slice(0,S.total).every(root => root.calibration.contextVersion === expectedContext
    && root.ratingEvidence?.candidateVersion === CALIB.movesOnly.sf19.candidateVersion
    && root.ratingEvidence.bestmove === root.bestmove && wdl(root.ratingEvidence.best) && wdl(root.ratingEvidence.played));
}

function completeAnalysis(saved, count) {
  return !!saved && Array.isArray(saved.bests) && saved.bests.length === count
    && saved.bests.every(Boolean) && Array.isArray(saved.evals) && saved.evals.length === count
    && saved.evals.every(e => e && (Number.isFinite(e.cp) || Number.isFinite(e.mate)));
}

function canRestoreAnalysis(saved) {
  return completeAnalysis(saved, S.total + 1) && saved.pgn === S.pgn
    && (!saved.engineBuild || Object.hasOwn(ENGINE_BUILDS, saved.engineBuild))
    && (saved.settingsKey === analysisSettingsKey() || reusableSf19Analysis(saved))
    && scoringEvidenceComplete(saved.bests, S.total, CALIB);
}

let _libraryWriteQueue = Promise.resolve();
const _libraryCleanup = new Set();
const _pendingReviewSaves = new Map();
const _savingReviewSnapshots = new WeakMap();
let _reviewSaveRetry = null;
let _reviewSaveWarning = false;
function warnUnsavedReview(event) { if (_pendingReviewSaves.size) { event.preventDefault(); event.returnValue = ""; } }
function renderReviewSaveStatus() {
  if (_pendingReviewSaves.size && !_reviewSaveWarning) { window.addEventListener("beforeunload", warnUnsavedReview); _reviewSaveWarning = true; }
  if (!_pendingReviewSaves.size && _reviewSaveWarning) { window.removeEventListener("beforeunload", warnUnsavedReview); _reviewSaveWarning = false; }
  if (!UI.saveStatus) return;
  const failures = [..._pendingReviewSaves.values()].filter(snapshot => snapshot.failed);
  const hadFocus = UI.saveStatus.contains(document.activeElement);
  UI.saveStatus.hidden = failures.length === 0;
  if (!failures.length) {
    UI.saveStatus.replaceChildren();
    if (hadFocus) UI.controls?.querySelector("button")?.focus({preventScroll:true});
    return;
  }
  const busy = !!_reviewSaveRetry || failures.some(snapshot => _savingReviewSnapshots.has(snapshot));
  if (!UI.saveStatus.firstChild) UI.saveStatus.append(el("span"), el("button", {type:"button", onclick:retryReviewSaves}));
  UI.saveStatus.firstChild.textContent = failures.length === 1 ? "1 review has not been saved." : failures.length + " reviews have not been saved.";
  const retry = UI.saveStatus.querySelector("button");
  retry.textContent = busy ? "Saving…" : "Retry saving";
  retry.setAttribute("aria-disabled", String(busy));
}
async function retryReviewSaves() {
  if (_reviewSaveRetry) return _reviewSaveRetry;
  _reviewSaveRetry = (async () => { for (const snapshot of [..._pendingReviewSaves.values()]) await persistReviewSnapshot(snapshot); })();
  renderReviewSaveStatus();
  try { await _reviewSaveRetry; } finally { _reviewSaveRetry = null; renderReviewSaveStatus(); }
}
function updateLibrary(update, analysisWrites = {}) {
  const commit = async () => {
    const stored = await browserAPI.storage.local.get("library");
    const current = Array.isArray(stored.library) ? stored.library : S.library;
    const change = update(current);
    const next = Array.isArray(change) ? change : change.library;
    const writes = Array.isArray(change) ? analysisWrites : change.analysisWrites;
    const dropped = next.slice(300);
    const library = next.slice(0, 300);
    await browserAPI.storage.local.set({ ...writes, library });
    S.library = library;
    renderLibrary();
    for (const rec of dropped) _libraryCleanup.add("analysis:" + rec.id);
    const retained = new Set(library.map(rec => "analysis:" + rec.id));
    for (const key of retained) _libraryCleanup.delete(key);
    const cleanup = [..._libraryCleanup];
    if (cleanup.length) {
      try { await browserAPI.storage.local.remove(cleanup); cleanup.forEach(key => _libraryCleanup.delete(key)); }
      catch (error) { console.warn("Library cleanup will be retried", error); }
    }
    return true;
  };
  // Every analysis tab shares storage. Serialize read/modify/write across the
  // extension origin so an older tab cannot overwrite games or favorites saved
  // by another tab. The local queue also supports test/non-browser contexts.
  const task = navigator.locks?.request
    ? navigator.locks.request("chess-review-library", commit)
    : (_libraryWriteQueue = _libraryWriteQueue.catch(() => {}).then(commit));
  return task.catch(error => { console.warn("library save failed", error); return false; });
}
function persistReviewSnapshot(snapshot) {
  if (_savingReviewSnapshots.has(snapshot)) return _savingReviewSnapshots.get(snapshot);
  const pending = (async () => {
    let resolvedId = snapshot.id;
    const saved = await updateLibrary(library => {
      if (!snapshot.rec.meta.gameId) {
        const same = library.find(game => game.pgn === snapshot.rec.pgn && (game.id === snapshot.id || (typeof game.id === "string" && game.id.startsWith(snapshot.id + ":"))));
        resolvedId = same?.id || snapshot.id;
        let suffix = 1;
        while (library.some(game => game.id === resolvedId && game.pgn !== snapshot.rec.pgn)) resolvedId = snapshot.id + ":" + suffix++;
      }
      const prev = library.find(game => game.id === resolvedId);
      const rec = {...snapshot.rec, id:resolvedId, meta:{...snapshot.rec.meta, libraryId:resolvedId}, fav:!!prev?.fav, solved:snapshot.noMistakes || !!prev?.solved};
      return {library:[rec, ...library.filter(game => game.id !== resolvedId)], analysisWrites:{["analysis:" + resolvedId]:snapshot.analysis}};
    });
    snapshot.failed = !saved;
    if (saved) {
      if (_pendingReviewSaves.get(snapshot.pendingKey) === snapshot) _pendingReviewSaves.delete(snapshot.pendingKey);
      if (S.pgn === snapshot.rec.pgn && !S.meta.gameId) { S.meta.libraryId = resolvedId; rememberReviewJob(); }
    }
    return saved;
  })();
  _savingReviewSnapshots.set(snapshot, pending);
  pending.finally(() => { _savingReviewSnapshots.delete(snapshot); renderReviewSaveStatus(); });
  return pending;
}
function openScreenSizePreview() {
  if(screenPreview?.viewport){window.parent.focus();return;}
  const job=S.blank?{source:"blank",analysis:null}:{pgn:S.pgn,meta:S.meta||{},source:"pgn"};
  if(!S.blank&&!S.analyzing&&!S.analysisError&&completeAnalysis(S,S.total+1))job.analysis={
    pgn:S.pgn,settingsKey:analysisSettingsKey(),engineBuild:S.activeEngineBuild,
    panelNeedsLive:!!S._panelNeedsLive,evals:S.evals,bests:S.bests,multipv:S.analyzedMultipv,
  };
  // window.open copies this tab's session storage synchronously. The preview
  // receives a snapshot without writing a handoff into persistent account data.
  const key="screen-size-preview",previous=window.sessionStorage.getItem(key);
  const display={width:window.innerWidth,height:window.innerHeight,pixelRatio:window.devicePixelRatio||1,
    insetWidth:Math.max(0,window.outerWidth-window.innerWidth)+Math.max(0,window.screen.width-window.screen.availWidth),
    insetHeight:Math.max(0,window.outerHeight-window.innerHeight)+Math.max(0,window.screen.height-window.screen.availHeight)};
  try {
    window.sessionStorage.setItem(key,JSON.stringify({job,idx:S.idx,display,preferences:{settings:S.settings,
      layout:layoutForSave(),layoutMode:S.layoutMode,layoutVersion:LAYOUT_VERSION}}));
    const opened=window.open(_url("screen-preview.html"),"_blank");
    if(!opened)return browserAPI.tabs.create({url:_url("screen-preview.html")});
  } finally {
    if(previous==null)window.sessionStorage.removeItem(key);else window.sessionStorage.setItem(key,previous);
  }
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
      meSide: S.meSide, playerKnown: S.playerKnown === true,
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
    const analysis = {
      pgn: S.pgn, settingsKey: analysisSettingsKey(), engineBuild: S.activeEngineBuild,
      panelNeedsLive: !!S._panelNeedsLive,
      evals: S.evals, bests: S.bests, multipv: S.analyzedMultipv,
    };
    // Before library collision resolution, distinct PGNs may share the short ID.
    const pendingKey = S.meta.gameId ? "game:" + id : "pgn:" + S.pgn;
    const snapshot = structuredClone({id, pendingKey, rec, analysis, noMistakes, failed:false});
    _pendingReviewSaves.set(pendingKey, snapshot);
    renderReviewSaveStatus();
    return persistReviewSnapshot(snapshot);
  } catch (e) { console.warn("library save failed", e); }
}
let _librarySelection = 0;
async function openLibraryGame(rec) {
  const selection = ++_librarySelection;
  if (rec.id === currentGameId()) return;   // already open
  // Pull the stored analysis so the re-opened game shows up already analyzed (no re-run).
  let analysis = null;
  try { const s = await browserAPI.storage.local.get("analysis:" + rec.id); analysis = s["analysis:" + rec.id] || null; } catch {}
  if (selection !== _librarySelection) return;
  // Switch in place — no page reload, no black flash. The sidebar stays open (it only closes when
  // the mouse leaves the library area), so you can pick another game right away. Preserve an
  // explicit orientation. Platform games without one can use newly learned account evidence;
  // legacy records without a known platform retain their saved side.
  const flip = (rec.meta && rec.meta.flip != null) ? rec.meta.flip : historyGame(rec) ? null : (rec.meSide === "b");
  const known = rec.playerKnown === true || (rec.playerKnown == null && !!rec.myName && (rec.meSide === "b" || rec.myName.toLowerCase() === S.username.toLowerCase()));
  const meta = {...(rec.meta || {}), libraryId:rec.id, flip, playerKnown:known, myName:known ? rec.myName : ""};
  return applyGame({ pgn: rec.pgn, meta, source: "library", analysis });
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
function closeDropdowns() {
  document.querySelectorAll(".lib-dd-field.open").forEach(field => {
    field.classList.remove("open");
    field.querySelector(".lib-dd-btn").setAttribute("aria-expanded", "false");
  });
}
function positionSettingsDropdown(field) {
  const settings = field.closest('#settings');
  if (!settings) return;
  const menu = field.querySelector('.lib-dd-menu');
  menu.classList.remove('above'); menu.style.maxHeight = '';
  const bounds = settings.getBoundingClientRect(), rect = field.getBoundingClientRect();
  const below = Math.min(bounds.bottom, window.innerHeight) - rect.bottom - 8;
  const above = rect.top - Math.max(0, bounds.top) - 8;
  const flip = below < menu.getBoundingClientRect().height && above > below;
  menu.classList.toggle('above', flip);
  menu.style.maxHeight = Math.max(40, Math.min(300, window.innerHeight * .4, flip ? above : below)) + 'px';
}
function ddField(value, options, onChange, renderOption = (_value, label) => label) {
  const [currentValue, currentLabel] = options.find(([v]) => v === value) || options[0] || ["", "—"];
  const menu = el("div", { class: "lib-dd-menu" },
    ...options.map(([v, t]) => el("button", { class: "lib-dd-opt" + (v === value ? " sel" : ""),
      onclick: (e) => { e.stopPropagation(); closeDropdowns(); onChange(v); } }, renderOption(v, t))));
  const field = el("div", { class: "lib-dd-field" },
    el("button", { class: "lib-dd-btn", "aria-expanded": "false", onclick: (e) => {
      e.stopPropagation();
      const willOpen = !field.classList.contains("open");
      closeDropdowns();
      field.classList.toggle("open", willOpen);
      e.currentTarget.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) positionSettingsDropdown(field);
    } }, el("span", { class: "lib-dd-cur" }, renderOption(currentValue, currentLabel)), el("span", { class: "lib-dd-chev", html: ICONS.chevron })),
    menu);
  field.addEventListener("keydown", event => {
    const button = field.querySelector(".lib-dd-btn"), items = [...menu.children];
    if (event.key === "Escape") {
      if (!field.classList.contains("open")) return;
      event.preventDefault(); event.stopPropagation(); closeDropdowns(); button.focus();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault(); event.stopPropagation(); closeDropdowns();
      field.classList.add("open"); button.setAttribute("aria-expanded", "true");
      positionSettingsDropdown(field);
      const index = items.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
        : index < 0 ? Math.max(0, items.findIndex(item => item.classList.contains("sel")))
        : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === "Tab") closeDropdowns();
  });
  return field;
}
function libDropdown(label, value, options, onChange) {
  return el("div", { class: "lib-dd" }, el("span", { class: "lib-dd-lbl" }, label), ddField(value, options, onChange));
}
function setLibraryOpen(open) {
  S.libraryOpen = open;
  if (!UI.libRail) return;
  UI.libRail.classList.toggle("open", open);
  UI.libPanel.inert = !open;
  UI.libRail.querySelector(".lib-tab").setAttribute("aria-expanded", String(open));
}
function libCard(r) {
  const curId = currentGameId();
  const rLetter = r.result === "win" ? "W" : r.result === "loss" ? "L" : r.result === "draw" ? "D" : "·";
  return el("div", { class: "lib-card" + (r.id === curId ? " active" : ""), "data-game-id":r.id },
    el("button", { tabindex:"-1", class: "lc-fav" + (r.fav ? " on" : ""), title: r.fav ? "Remove favorite" : "Favorite",
      onclick: (e) => { e.stopPropagation(); toggleFav(r.id); } }, r.fav ? "★" : "☆"),
    el("button", {type:"button", class:"lc-open", tabindex:"-1", "aria-label":"Open game against " + (r.opName || "unknown player"), onclick:()=>openLibraryGame(UI.libraryCards?.get(r.id)?.rec || r)},
    el("div", { class: "lc-top" },
      el("span", { class: "lc-result lc-" + (r.result || "none") }, rLetter),
      el("span", { class: "lc-opp" }, "vs " + (r.opName || "?")),
      r.type ? el("span", { class: "lc-type" }, r.type) : null),
    el("div", { class: "lc-bot" },
      el("span", { class: "lc-acc" }, r.myAcc == null ? "—" : r.myAcc.toFixed(1), el("i", {}, "%")),
      el("span", { class: "lc-status " + (r.solved ? "solved" : "unsolved") }, r.solved ? "Solved" : "Unsolved"))));
}
function renderLibrary() {
  if (!UI.libList) return;
  const active = document.activeElement, focusedCard = active.closest(".lib-card"), focusedFilter = active.closest(".lib-dd");
  const restore = () => {
    if (focusedCard) {
      const card = [...UI.libList.querySelectorAll(".lib-card")].find(node => node.dataset.gameId === focusedCard.dataset.gameId);
      (card?.querySelector(active.classList.contains("lc-fav") ? ".lc-fav" : ".lc-open") || UI.libControls.querySelector("button"))?.focus({preventScroll:true});
    } else if (focusedFilter) [...UI.libControls.querySelectorAll(".lib-dd")].find(node => node.querySelector(".lib-dd-lbl").textContent === focusedFilter.querySelector(".lib-dd-lbl").textContent)?.querySelector("button")?.focus({preventScroll:true});
  };
  const recs = libRecords();
  if (UI.libCount) UI.libCount.textContent = String(S.library.length);

  const setSort = (v) => { S.libSort = v; renderLibrary(); };
  const setRes  = (v) => { S.libResult = v; renderLibrary(); };
  const setType = (v) => { S.libType = v; renderLibrary(); };
  const types = Array.from(new Set(S.library.map((r) => r.type).filter(Boolean)));
  const controlsKey = JSON.stringify([S.libSort,S.libResult,S.libType,types]);
  if (UI.libraryControlsKey !== controlsKey) UI.libControls.replaceChildren(
    libDropdown("Sort", S.libSort, [["history", "Most recent"], ["accuracy", "Highest accuracy"], ["rating", "Highest rating"], ["unsolved", "Unsolved"], ["favorite", "Favorites"]], setSort),
    libDropdown("Result", S.libResult, [["all", "All results"], ["win", "Wins"], ["loss", "Losses"], ["draw", "Draws"]], setRes),
    libDropdown("Type", S.libType, [["all", "All types"], ...types.map((t) => [t, t])], setType),
  );
  UI.libraryControlsKey = controlsKey;
  UI.libraryCards ||= new Map();
  const ids = new Set(S.library.map(rec=>rec.id));
  for (const id of UI.libraryCards.keys()) if (!ids.has(id)) UI.libraryCards.delete(id);

  if (!recs.length) {
    const message = S.library.length ? "No games match these filters." : "Analyzed games are saved here automatically. Analyze a game to start your library.";
    if (UI.libList.firstChild?.textContent !== message) UI.libList.replaceChildren(el("div", { class: "lib-empty" },message));
    restore();
    return;
  }
  let cursor = UI.libList.firstChild;
  const current = currentGameId();
  for (const rec of recs) {
    const key = JSON.stringify([rec.fav,rec.result,rec.opName,rec.type,rec.myAcc,rec.solved]);
    let entry = UI.libraryCards.get(rec.id);
    if (!entry || entry.key !== key) { entry = {key,node:libCard(rec),rec}; UI.libraryCards.set(rec.id,entry); }
    else entry.rec = rec;
    entry.node.classList.toggle("active",rec.id === current);
    if (entry.node !== cursor) UI.libList.insertBefore(entry.node,cursor);
    cursor = entry.node.nextSibling;
  }
  while (cursor) { const next = cursor.nextSibling; cursor.remove(); cursor = next; }
  restore();
}

/* ---------------- Navigation ---------------- */
function mainlineNavigationLimit() {
  // Completion order is independent of game order. Use the furthest published
  // evaluation, not the uninterrupted prefix or number of completed positions.
  for (let ply = Math.min(S.total, S.evals.length - 1); ply > 0; ply--) {
    if (S.evals[ply] != null) return ply;
  }
  return 0;
}
function go(to) {
  _categoryJump = null;
  _cancelPromotion?.();
  _cancelBoardDrag?.();
  const prev = S.idx;
  // Cross unfinished earlier positions, stopping at the furthest completed one.
  S.idx = Math.max(0, Math.min(mainlineNavigationLimit(), to));
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
function toggleFlip() {
  if (learningWorkspace?.embedded) {
    learningWorkspace.flipBoard();
    return;
  }
  S.flipped = !S.flipped; buildBoard(); renderPlayers(); renderEvalBar();
}
function toggleAuto() {
  if (S.autoTimer) { clearInterval(S.autoTimer); S.autoTimer = null; }
  else S.autoTimer = setInterval(() => {
    if (S.analysisMode || S.idx >= S.total) { clearInterval(S.autoTimer); S.autoTimer = null; renderControls(); return; }
    if (S.idx >= mainlineNavigationLimit()) {
      // Wait without repeating a move; resume when another result extends the limit.
      if (S.analyzing) return;
      clearInterval(S.autoTimer); S.autoTimer = null; renderControls(); return;
    }
    go(S.idx + 1);
  }, 900);
  renderControls();
}
document.addEventListener("keydown", (e) => {
  if (learningWorkspace?.closing && e.target?.closest?.('#learningToggle,.learn-entry-button')
      && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
    e.preventDefault();
    document.activeElement?.blur();
    // The return animation must not restore button focus after navigation starts.
    learningWorkspace.previousFocus = null;
  }
  if (learningWorkspace || S.blank) return;
  if (e.key === "Tab" && !e.target?.closest?.('#settings,.accuracy-panel,.engine-focus,[role="dialog"],[role="alertdialog"]')) {
    e.preventDefault(); return;
  }
  if (UI.settings?.contains(e.target) || UI.libRail?.contains(e.target)) return;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  // During practice the only shortcut is Escape to exit; nav keys are disabled.
  if (S.practice) { if (e.key === "Escape") exitPractice(); return; }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
    // Navigation takes focus away from the last clicked control (e.g. Feedback).
    document.activeElement?.blur();
  }
  if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) e.preventDefault();
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
function scheduleReanalyze(preserveCompleted = false) {
  clearTimeout(_reanalyzeT);
  if(S.blank)return;
  _reanalyzeT = setTimeout(() => {
    startAnalysis({preserveCompleted});
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
async function startAnalysis({preserveCompleted = false} = {}) {
  if(S.blank)return;
  stopPanelPrecalculation();
  S.progressiveAccuracy = true;
  if (S.practice) exitPractice();
  S._lastEngineLines = null;
  panelLineCache.clear(); S._panelRequest = null; S.panelToken++;
  S.liveEngine?.cancelPending(); S.liveEngine?.stop();
  preserveCompleted = preserveCompleted && S.analyzedSettingsKey === analysisSettingsKey()
    && !S.engineFallbackBuild && S.activeEngineBuild === S.settings.enginePath;
  const priorBuild = preserveCompleted ? S.activeEngineBuild : null;
  S.analyzedSettingsKey = analysisSettingsKey();
  S.analyzedSettings = Object.fromEntries(["enginePath","engineDepth","engineHash","engineSkill","classifyLines"].map(key => [key,S.settings[key]]));
  const gen = ++S.batchGen;
  // Freeze the scoring protocol for this run. Candidate preferences can change mid-search.
  const scoringSettings = scoringSettingsSnapshot();
  S.engineFallbackBuild = null;
  S.activeEngineBuild = null;
  terminateEngines();
  if (!preserveCompleted) {
    S.evals = new Array(S.total + 1).fill(null);
    S.bests = new Array(S.total + 1).fill(null);
    S._panelNeedsLive = false;
  }
  S.searchPreviews = new Array(S.total + 1).fill(null);
  S._sacCache = []; S._forcedCache = []; S._panelCache = null;
  S.progress = 0;
  while (S.progress < S.total && S.bests[S.progress] && S.bests[S.progress + 1]) S.progress++;
  S.completed = S.bests.slice(1).filter(Boolean).length;
  S.analysisError = null;
  S.analyzing = true;
  revRefs = null; statsRefs = null;
  computeDerived();
  renderControls(); renderReview(); renderStats(); renderGraph(); renderMoves();
  if (!S.analysisMode) { renderEvalBar(); renderBestArrow(); renderEngineCurrent(); }

  try { await loadCalibration(); }
  catch (error) {
    if (gen !== S.batchGen) return;
    S.analyzing = false; S.analysisError = error.message;
    computeDerived(); renderControls(); renderReview(); renderStats(); renderEngineCurrent(); return;
  }
  if (gen !== S.batchGen) return;

  // Publish the single-line scoring pass before any extra annotation/candidate work.
  const multipv = scoringSettings.classifyLines;
  S.analyzedSettingsKey = analysisSettingsKey();
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
  if (priorBuild && build !== priorBuild) {
    S.bests.fill(null); S.evals.fill(null); S.progress = 0; S.completed = 0;
  }
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
  // filled arrays. `contig` tracks the completed prefix; navigation uses the
  // furthest completed evaluation and the graph keeps gaps for pending scores.
  let nextIdx = 0, contig = -1;
  while (contig + 1 <= S.total && S.bests[contig + 1]) contig++;
  async function worker(eng) {
    while (gen === S.batchGen) {
      const i = nextIdx++;
      if (i > S.total) return;
      if (S.bests[i]) continue;
      const terminal = terminalScore(S.positions[i].fen, i);
      const res = terminal ? { score: terminal, bestmove: null, pv: "", lines: [] }
        : await analyseCalibratedPosition(eng, {fen: S.positions[i].fen, history: searchHistory(S.positions, i),
          played: i < S.total ? S.positions[i + 1].from + S.positions[i + 1].to + (S.positions[i + 1].promotion || "") : null,
          settings: scoringSettings, calibration: CALIB,
          needMovesOnly: scoringSettings.ratingMode === "moves" || !Number(S.players.w?.rating) || !Number(S.players.b?.rating),
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
  schedulePanelPrecalculation();
}

/* ---------------- Render everything ---------------- */
function renderAll() {
  UI.meta.replaceChildren(...(S.blank?[]:metaChips()));
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

/* A blank launch has no game or engine work; learning and saved games stay available. */
function setBlankWorkspace(blank) {
  S.blank=blank;
  for(const button of document.querySelectorAll('[data-game-action]'))button.hidden=blank;
}
function showBlankWorkspace() {
  S.analyzing=false;S.pgn="";S.total=0;S.idx=0;
  S.positions=[{fen:new Chess().fen()}];
  S.evals=[null];S.bests=[null];S.meta={};S.headers={};
  S.players={w:{name:"White"},b:{name:"Black"}};
  document.title="Chess Review";
  applySettings();
  setBlankWorkspace(true);
  renderAll();
}

/* ---------------- Load / switch a game ----------------
   Loads a game's data into the already-built UI and renders it. Used both for the first load
   and for switching to another library game in place — no page reload, so there's no black flash
   between games; only the panels' data and the board orientation change. */
async function applyGame(payload) {
  const positions = buildPositions(payload.pgn);
  if (positions.length < 2) throw new Error("Load a game with moves to review. Standalone positions are not supported.");
  const wasBlank=S.blank, selection=++_librarySelection;
  const inferredName = await rememberAnalyzedGame(payload, browserAPI.storage.local);
  if(selection!==_librarySelection)return;
  const automaticIdentity = !!historyGame(payload) || payload.meta?.identityMode === "automatic" || (!payload.meta?.myName && payload.meta?.playerKnown == null);
  if(automaticIdentity)payload={...payload,meta:{...payload.meta,identityMode:"automatic",myName:inferredName,playerKnown:!!inferredName}};
  if(wasBlank){
    await Promise.all([loadBook(),loadCalibration().catch(error=>{console.warn(error);return null;})]);
    if(selection!==_librarySelection)return;
  }
  if(wasBlank){setBlankWorkspace(false);renderCoachAvatar();}
  _cancelPromotion?.();
  _cancelBoardDrag?.();

  // Tear down anything tied to the previous game.
  clearTimeout(_reanalyzeT);
  resetLiveEngine();
  S.batchGen++;                 // invalidate any in-flight analysis workers
  S.engineFallbackBuild = null;
  S.activeEngineBuild = null;
  terminateEngines();
  resetHelperEngine();
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
  S.clocks = parseClocks(payload.pgn, true);
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
  const { players, meSide, playerKnown } = derivePlayers(S.headers, S.meta, "");
  S.players = players;
  const flip = S.meta && S.meta.flip;
  const side = flip === true ? "b" : flip === false ? "w" : meSide;
  S.meSide = meSide; S.playerKnown = playerKnown; S.flipped = side === "b"; S.idx = 0;

  // Restore saved game analysis or start fresh
  let saved = payload.analysis;
  if (saved == null && !("analysis" in payload)) {
    try { const k = "analysis:" + currentGameId(); const s = await browserAPI.storage.local.get(k); saved = s[k] || null; } catch {}
  }
  const restored = canRestoreAnalysis(saved);
  S.restoredAnalysis = restored;
  S.progressiveAccuracy = false;
  S._panelNeedsLive = false;
  if (restored) {
    const oldSettings = JSON.parse(saved.settingsKey), currentSettings = JSON.parse(analysisSettingsKey());
    S._panelNeedsLive = !!saved.panelNeedsLive || [5,7,8].some(i => oldSettings[i] !== currentSettings[i]);
    S.analyzedSettings = Object.fromEntries(["enginePath","engineDepth","engineHash","engineSkill","classifyLines"].map(key => [key,S.settings[key]]));
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
  if (!accuracyLayoutExpanded()) reflowAccuracy(false);
  renderLibrary();
  requestAnimationFrame(alignPlayers);
  rememberReviewJob();
  if (!restored) startAnalysis();
  if(wasBlank)initTabZoom();
}

/* ---------------- Start ---------------- */
// Layout follows the CSS viewport. Browser zoom is normalized once on open/reset;
// resizing never changes it, and manual zoom remains an accessibility choice.
const TOPBAR_H = 52;
let _fittedDip = null;
let _zoomInit = null;
let _zoomResizeBound = false;
function layoutPageSize(layout) {
  const {maxR,maxB}=layoutExtent(layout);
  return {pageW:maxR+CANVAS_MARGIN,pageH:TOPBAR_H+maxB+CANVAS_MARGIN};
}
function fitViewport() {
  if(!UI.canvas)return;
  _fittedDip={w:window.innerWidth,h:window.innerHeight};
  applyLayout();growCanvas();requestAnimationFrame(alignPlayers);
}
async function initTabZoom() {
  if(!_zoomInit)_zoomInit=(async()=>{
    try {
      const tabs=browserAPI?.tabs;
      // Iframes always render their requested CSS size and never change the host tab.
      if(!screenPreview&&tabs?.getCurrent){
        const tab=await tabs.getCurrent();
        if(tab?.id!=null){
          await tabs.setZoomSettings(tab.id,{scope:"per-tab",mode:"automatic"}).catch(()=>{});
          if(Math.abs((await tabs.getZoom(tab.id))-1)>.005)await tabs.setZoom(tab.id,1);
        }
      }
    } finally {fitViewport();}
  })().catch(()=>{_zoomInit=null;fitViewport();});
  await _zoomInit;
  if(!_zoomResizeBound){
    _zoomResizeBound=true;
    window.addEventListener('resize',fitViewport);
  }
  // A reset also restores 100% after deliberate manual browser zoom.
  _zoomInit=null;
}
function dismissStartup() {
  document.body.removeAttribute("data-starting");
  const root = document.getElementById("root");
  root.removeAttribute("inert");
  root.removeAttribute("aria-busy");
  document.getElementById("startup")?.remove();
}
async function showReadyWorkspace() {
  if (!document.body.hasAttribute("data-starting")) return;
  // Decode the actual saved piece set, including a flipped board, before revealing it.
  // A missing image must not leave the workspace stuck behind the startup screen.
  await Promise.all([...document.querySelectorAll("#boardWrap .piece-img")].map(img => img.decode?.().catch(() => {})));
  await new Promise(resolve => requestAnimationFrame(() => {
    alignPlayers();
    document.body.removeAttribute("data-starting");
    resolve();
  }));
  const startup = document.getElementById("startup");
  if (startup && S.settings.moveAnim !== false && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    // Paint the closed shutters before changing their transforms, even on a warm launch.
    // Keep the workspace inert until the reveal finishes. A fallback also handles
    // background tabs or a motion preference changing during the transition.
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => {
      const finish = event => {
        if (event && (event.target !== shutter || event.propertyName !== "transform")) return;
        clearTimeout(timer);
        shutter.removeEventListener("transitionend", finish);
        resolve();
      };
      const shutter = startup.querySelector(".startup-top");
      const timer = setTimeout(finish, 650);
      shutter.addEventListener("transitionend", finish);
      startup.classList.add("opening");
    });
  }
  dismissStartup();
}
(async function main() {
  try {
    if(screenPreview){
      let snapshot=null;
      if(screenPreview.viewport)try{snapshot=JSON.parse(window.sessionStorage.getItem("screen-size-preview"));}catch{}
      await screenPreview.configure(await platformAPI.storage.local.get(screenPreview.viewport?null:["settings","layout","layoutMode","layoutVersion"]),snapshot);
    }
    else await resetSettingsForRelease({ reason: "startup" });
    // Load review data alongside the job and preferences while the startup mark is visible.
    const dataReady = blankLaunch&&!location.hash&&!screenPreview ? Promise.resolve()
      : Promise.all([loadBook(), loadCalibration().catch(error => {console.warn(error);return null;})]);
    const [payload, store] = await Promise.all([loadJob(), browserAPI.storage.local.get(["settings", "username", "layout", "layoutMode", "layoutVersion", "library"])]);
    S.library = Array.isArray(store.library) ? store.library : [];
    S.settings = { ...DEFAULT_SETTINGS, ...(store.settings || {}) };
    const loadedSettings = structuredClone(S.settings);
    if (!store.settings?.uiSetup && !store.layout && !PANEL_DESIGNS.some(design => store.settings?.[design.setting] != null)) {
      Object.assign(S.settings, UI_SETUPS.modern.designs, {uiSetup: 'modern', uiSetupBase: 'modern'});
    }
    if (!store.settings?.nativeSizingVersion) {
      if (S.settings.insightFont === 18) S.settings.insightFont = 16;
      S.settings.nativeSizingVersion = 1;
    }
    S.settings.learningTransition = presentationFor(store.settings || {});
    for (const key of ["showConcepts", "conceptsEnabled", "conceptGroups", "disabledConcepts", "conceptsView", "conceptsDefaultedOff"]) delete S.settings[key];
    migrateVisualAssetSettings(S.settings);
    normalizePanelDesigns(S.settings);
    // Upgrade Modern's former default once; later individual design choices stick.
    if (S.settings.uiSetup === 'modern' && !S.settings.modernEngineVersion) {
      if (S.settings.engineDesign === 'original') S.settings.engineDesign = 'minimal';
      S.settings.modernEngineVersion = 1;
    }
    if (S.settings.uiSetup === 'modern' && !S.settings.modernMovesVersion) {
      if (['original', 'full'].includes(S.settings.movesDesign)) S.settings.movesDesign = 'zoom20';
      S.settings.modernMovesVersion = 1;
    }
    if (S.settings.uiSetup === 'modern' && !S.settings.modernGraphVersion) {
      if (S.settings.graphDesign === 'original') S.settings.graphDesign = 'bars';
      S.settings.modernGraphVersion = 1;
    }
    if (S.settings.uiSetup === 'modern' && !S.settings.modernQualityVersion) {
      if (S.settings.accuracyQualityDesign === 'original') S.settings.accuracyQualityDesign = 'distribution';
      S.settings.modernQualityVersion = 1;
    }
    migrateEngineSettings(S.settings);
    delete S.settings.wrongSound; // older selectable mistake cues were removed
    delete S.settings.loaderStyle;
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
    }
    // The avatar always reflects the chosen coach; the reply bank loads only when special replies are on.
    S.coach = S.settings.coachPlain ? null : await loadCoach(S.settings.coach);
    // One-time bump of the old shallow default depth (12) to the new classification depth.
    // Keyed on a flag so a deliberate later choice of a low depth isn't overridden again.
    if (!S.settings.depthBumped) {
      if ((store.settings?.engineDepth ?? 12) <= 12) S.settings.engineDepth = Math.max(S.settings.engineDepth, 16);
      S.settings.depthBumped = true;
    }
    // Retain older saved preferences within the current three-line limit.
    if (S.settings.engineLines > ENGINE_MAX_LINES) S.settings.engineLines = ENGINE_MAX_LINES;
    // Existing edited presets become Custom without changing their designs or saved boxes.
    const savedLayout = store.layoutVersion === LAYOUT_VERSION && store.layout;
    const trackedSetup = store.settings?.uiSetupBase === S.settings.uiSetup;
    if (!UI_SETUPS[S.settings.uiSetup] || (S.settings.uiSetup !== 'custom' &&
      (!setupDesignsMatch() || !trackedSetup && savedLayout && !setupLayoutMatches(savedLayout,store.layoutMode)))) {
      customUiSetupPatch();
    }
    const migration = {};
    if (!store.settings?.nativeSizingVersion) migration.nativeSizingVersion = 1;
    for (const key of new Set([...Object.keys(loadedSettings), ...Object.keys(S.settings)])) {
      if (JSON.stringify(loadedSettings[key]) !== JSON.stringify(S.settings[key])) migration[key] = S.settings[key];
    }
    if (Object.keys(migration).length) await writeSettings(migration, Object.keys(migration));
    // Use the saved layout if it matches the current version; otherwise the new default.
    const useStored = store.layoutVersion === LAYOUT_VERSION && store.layout;
    S.layout = useStored ? { ...setupLayout(), ...store.layout } : setupLayout();
    S.layoutMode = useStored ? (store.layoutMode === "custom" ? "custom" : "auto") : setupLayoutMode();
    S._accReflow = null;
    if (!useStored) saveLayout();

    S.username = store.username || "";

    // Resolve review data before mounting. The startup screen also covers async work inside
    // applyGame(), such as remembering the player's identity, so the empty shell never paints.
    await dataReady;         // book + calibration (downloaded in parallel; usually already resolved)
    if(blankLaunch&&!location.hash&&payload.source!=="blank"&&!screenPreview)
      await Promise.all([loadBook(),loadCalibration().catch(error=>{console.warn(error);return null;})]);
    // Resolve any stored analysis for this game by id (same derivation as currentGameId(), but from
    // the payload since S isn't populated yet) so applyGame() needs no lookup await of its own.
    if (payload.source!=="blank"&&!("analysis" in payload)) {
      let saved = null;
      try {
        const k = "analysis:" + ((payload.meta && (payload.meta.gameId || payload.meta.libraryId)) || ("pgn:" + simpleHash(payload.pgn || "")));
        const s = await browserAPI.storage.local.get(k);
        saved = s[k] || null;
      } catch {}
      payload.analysis = saved;
    }
    S.blank=payload.source==="blank"&&((blankLaunch&&!location.hash)||screenPreview?.id==="workspace-blank"||screenPreview?.viewport===true);
    buildUI();               // built once; switching games re-uses it (no full page reload)
    if(S.blank)showBlankWorkspace();
    else await applyGame(payload);
    // Fit and reveal the board as soon as it can paint; engine analysis continues normally.
    await initTabZoom();
    await showReadyWorkspace();
    // Two-phase load: now that initialization succeeded, remove the job data so it doesn't accumulate.
    const jobId = location.hash.replace(/^#/, "");
    if (jobId && rememberReviewJob()) {
      await browserAPI.storage.local.remove(`job:${jobId}`);
    }
    if (!screenPreview) learningAnnouncement = mountLearningAnnouncement({document, storage:browserAPI.storage.local,
      motion:()=>S.settings.moveAnim!==false});
    if(screenPreview?.viewport){
      if(!S.blank&&Number.isInteger(screenPreview.idx))go(screenPreview.idx);
      document.body.dataset.previewReady="true";
    }else if(screenPreview){
      const {mountScreenPreview}=await loadScreenPreviewController();
      await mountScreenPreview({context:screenPreview,document,state:S,openLearning,workspace:()=>learningWorkspace,
        renderAll,renderSettings,toggleSettings,toggleReorganize,openCredits,go,applyUserMove,startPractice,
        stopAnalysis:()=>{S.batchGen++;terminateEngines();S.analyzing=false;},
        close:async()=>{const tab=await platformAPI.tabs.getCurrent();if(tab?.id!=null)await platformAPI.tabs.remove(tab.id);}});
    }
  } catch (err) {
    document.getElementById("root").hidden = true;
    dismissStartup();
    const e = document.getElementById("error");
    e.hidden = false;
    e.textContent = "Error: " + err.message;
    console.error(err);
  }
})();
