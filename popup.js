// popup.js — UI logic. A module, so we can import the shared helper functions.
import { openAnalysisTab, analyzeActiveTab, reloadActiveAndAnalyze, isSupportedChessUrl } from "./analyze-flow.js";
import { findGameById, parseGameId, parseFlip, gameMeta } from "./chesscom.js";
import { parseLichessGameId, parseLichessFlip, fetchGamePgn as fetchLichessPgn } from "./lichess.js";

const $ = (id) => document.getElementById(id);
const statusEl = $("status");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("error", !!isError);
}

// A PGN has either header tags ([Event "…"]) or movetext (1. e4 …). Detect it FIRST, before any
// URL check: a chess.com/Lichess PGN export embeds the site URL in its [Site]/[Link] tags, so a
// substring test for "chess.com" would otherwise misroute the whole PGN into an archive lookup.
function looksLikePgn(s) {
  return /\[\s*\w+\s+"[^"]*"\s*\]/.test(s) || /\b1\.\s*[A-Za-z]/.test(s);
}

// A FEN is 8 ranks of piece data + side to move; castling/en-passant/clocks are optional, so we
// only require the first two fields to recognise one (the analysis page validates the rest).
function looksLikeFen(s) {
  const parts = s.trim().split(/\s+/);
  if (parts.length < 2 || !/^[wb]$/.test(parts[1])) return false;
  const ranks = parts[0].split("/");
  return ranks.length === 8 && ranks.every((r) => /^[pnbrqkPNBRQK1-8]+$/.test(r));
}

// Fill in any missing trailing fields so chess.js accepts the FEN, then wrap it in a header-only
// PGN — the analysis pipeline is PGN-based, and a no-move PGN with a [FEN] header sets the position.
function fenToPgn(s) {
  const [board, side = "w", castling = "-", ep = "-", half = "0", full = "1"] = s.trim().split(/\s+/);
  const fen = `${board} ${side} ${castling} ${ep} ${half} ${full}`;
  return `[SetUp "1"]\n[FEN "${fen}"]\n\n*`;
}

// The icon now uses a default_popup, so the popup opens on every click (pinned or in the overflow
// menu). On a chess game page it behaves like a one-click review — auto-analyzing the current game;
// anywhere else it shows the menu so you can paste a URL/PGN. The "Analyze this game" button re-runs
// the same flow.
async function runCurrentAnalysis() {
  const btn = $("analyzeCurrent");
  btn.disabled = true;
  setStatus("Fetching game …");
  try {
    // An empty field is fine: analyzeActiveTab auto-detects and saves the username.
    await analyzeActiveTab($("username").value.trim());
    setStatus("Opening analysis …");
    window.close();
  } catch (err) {
    if (err.code === "NO_GAME") {
      // The chess SPA may not have exposed the just-finished game yet → reload once and retry.
      try {
        setStatus("Loading the game page …");
        await reloadActiveAndAnalyze($("username").value.trim());
        setStatus("Opening analysis …");
        window.close();
        return;
      } catch (err2) { err = err2; }
    }
    setStatus(err.message, true);
    // Couldn't find the username? Expand the manual section and focus the field,
    // so the user can type it (or paste an older game).
    $("manual").open = true;
    if (err.code === "NO_USERNAME") $("username").focus();
  } finally {
    btn.disabled = false;
  }
}

async function init() {
  // Seed the saved username so the field and the analyze flow have it.
  try {
    const { username = "" } = await chrome.storage.local.get("username");
    if (username) $("username").value = username;
  } catch {}

  // If a background flow (keyboard shortcut / in-page button) just failed, surface that reason and
  // open the paste box instead of auto-retrying.
  try {
    const { pendingError } = await chrome.storage.local.get("pendingError");
    if (pendingError) {
      await chrome.storage.local.remove("pendingError");
      setStatus(pendingError, true);
      $("manual").open = true;
      $("manualInput").focus();
      return;
    }
  } catch {}

  let tab = null;
  try { [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); } catch {}
  if (isSupportedChessUrl(tab && tab.url)) {
    runCurrentAnalysis(); // on a chess game page → one-click review
  } else {
    // Not a chess game page → nothing to auto-analyze; invite a paste, but leave "Manual setup"
    // collapsed by default so the popup opens clean (the user can expand it when they want it).
    setStatus("Open a chess.com or Lichess game to review it — or use Manual setup below to paste a URL, PGN, or FEN.");
  }
}

$("saveUser").addEventListener("click", async () => {
  const username = $("username").value.trim();
  await chrome.storage.local.set({ username });
  setStatus(username ? `Saved: ${username}` : "Username cleared.");
});

$("analyzeCurrent").addEventListener("click", runCurrentAnalysis);

$("analyzeManual").addEventListener("click", async () => {
  const btn = $("analyzeManual");
  const raw = $("manualInput").value.trim();
  if (!raw) return setStatus("Paste a URL or PGN.", true);
  btn.disabled = true;
  try {
    // Order matters: pasted PGN/FEN text can contain site URLs in its tags, so detect those by
    // shape BEFORE any URL handling, or a chess.com PGN gets misrouted into an archive lookup.
    if (looksLikePgn(raw)) {
      // Full PGN (or bare movetext) → analyse directly, no username/archive needed.
      await openAnalysisTab({ pgn: raw, meta: {}, source: "pgn" });
    } else if (looksLikeFen(raw)) {
      // A FEN string → analyse from that position (no move history).
      await openAnalysisTab({ pgn: fenToPgn(raw), meta: {}, source: "fen" });
    } else if (/lichess\.org/i.test(raw)) {
      // Lichess URL → fetch the PGN straight from Lichess's public API (no username needed).
      const li = parseLichessGameId(raw);
      if (!li) throw new Error("Couldn't read a game ID from that Lichess URL.");
      setStatus("Fetching game from Lichess …");
      const pgn = await fetchLichessPgn(li.id);
      await openAnalysisTab({ pgn, meta: { url: `https://lichess.org/${li.id}`, gameId: li.id, flip: parseLichessFlip(raw) }, source: "url-lichess" });
    } else if (parseGameId(raw) || /chess\.com|^https?:/i.test(raw)) {
      // chess.com URL → look it up via the API by game ID. Manual paste is an explicit "older game"
      // request, so search far back (the active-tab flow stays shallow for speed).
      const parsed = parseGameId(raw);
      const username = $("username").value.trim();
      if (!username) throw new Error("Set a username to fetch via URL.");
      if (!parsed) throw new Error("Couldn't read a game ID from the URL.");
      setStatus("Searching your archive …");
      const game = await findGameById(username, parsed.id, { monthsBack: 18 });
      if (!game || !game.pgn) throw new Error("Couldn't find this game in the last 18 months of " + username + "'s archive. Paste the PGN instead.");
      await openAnalysisTab({ pgn: game.pgn, meta: { ...gameMeta(game), flip: parseFlip(raw) }, source: "url" });
    } else {
      // Unrecognised → last-ditch, treat as PGN so a stray paste still gets a chance.
      await openAnalysisTab({ pgn: raw, meta: {}, source: "pgn" });
    }
    window.close();
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

init();
