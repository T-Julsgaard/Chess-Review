// analyze-flow.js — shared flow used by both the popup (click) and background
// (shortcut): find the game from the active chess.com tab and open the analysis page.

import { findGameById, gameMeta, parseFlip, parseGameId } from "./chesscom.js";
import { parseLichessGameId, parseLichessFlip, fetchGamePgn as fetchLichessPgn } from "./lichess.js";

/** Save the analysis payload and open analysis.html in a new tab. */
export async function openAnalysisTab(payload) {
  const jobId = String(Date.now());
  await chrome.storage.local.set({ [`job:${jobId}`]: payload });
  await chrome.tabs.create({
    url: chrome.runtime.getURL(`analysis.html#${jobId}`),
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// True for chess.com / lichess.org pages — the only sites where the analyze flow can find a game.
export function isSupportedChessUrl(url) {
  return /^https:\/\/(www\.)?chess\.com\//.test(url || "") || /^https:\/\/(www\.)?lichess\.org\//.test(url || "");
}

// Reload the active chess tab, wait for it to finish loading, let the SPA settle, then analyze again.
// Used as a one-shot retry when the just-finished game hasn't been exposed by the page SPA yet.
export async function reloadActiveAndAnalyze(username) {
  const tab = await getActiveTab();
  if (!tab || tab.id == null) throw new Error("No active tab");
  if (!isSupportedChessUrl(tab.url)) throw new Error("Not a supported chess site");
  await new Promise((resolve, reject) => {
    const onUpdated = (id, info) => {
      if (id === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        clearTimeout(timer);
        resolve();
      }
    };
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("reload timed out"));
    }, 12000);
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.reload(tab.id);
  });
  await new Promise((r) => setTimeout(r, 900)); // let the chess.com SPA hydrate the game page
  await analyzeActiveTab(username);
}

/** Ask the content script in a tab for the game ID, etc. */
async function getGameInfoFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "getGameInfo" });
  } catch {
    return null; // no content script on the page (not chess.com)
  }
}

/**
 * Primary flow: use the active tab's game ID, fetch the PGN from the API, and open
 * the analysis. Throws an error with a user-friendly message if something is missing.
 */
export async function analyzeActiveTab(username) {
  const tab = await getActiveTab();
  if (!tab) throw new Error("Could not find the active tab.");

  const info = await getGameInfoFromTab(tab.id);

  // Lichess: the content script reports site:"lichess" (or we recognise the URL). Lichess gives us
  // the full PGN directly from a game id — no username/archive search needed.
  const isLichess = (info && info.site === "lichess") || /:\/\/(www\.)?lichess\.org\//i.test(tab.url || "");
  if (isLichess) return analyzeLichessTab(info, tab.url || "");

  // Game id: prefer parsing the tab URL with the canonical parser (authoritative, and works even if
  // the content script is stale or its copy of the regex has drifted), then fall back to whatever the
  // content script reported. This keeps the lookup working off the module's single source of truth.
  const gameId = parseGameId(tab.url)?.id || (info && info.gameId) || null;
  if (!gameId) {
    // Surface a diagnostic when the page clearly IS a game page but no id parsed — that means the URL
    // scheme changed and GAME_ID_RE (chesscom.js + content.js) needs widening.
    if (/\/(?:game|analysis)\b/.test(tab.url || "")) {
      console.warn("[Chess Review] a chess.com game/analysis URL was open but no game id parsed — the " +
        "URL scheme may have changed; widen GAME_ID_RE in chesscom.js (and the synced copy in content.js):", tab.url);
    }
    // Tagged so the background can reload the tab once and retry (the SPA often hasn't exposed
    // the just-finished game's URL yet — a reload fixes it without the user doing it manually).
    const e = new Error("No open chess.com game page found.\nPaste a URL/PGN instead.");
    e.code = "NO_GAME";
    throw e;
  }

  // Build the list of usernames whose archive might hold this game, best → worst:
  // the player(s) read off the page first, then any provided/stored handle. A game lives in BOTH
  // players' archives, so trying each in turn means a wrong or own stored username (e.g. when you
  // open SOMEONE ELSE'S game) no longer blocks the lookup.
  const provided = (username || "").trim();
  const detected = Array.isArray(info.usernames) ? info.usernames : (info.username ? [info.username] : []);
  const candidates = [];
  const addCand = (n) => {
    n = (n || "").trim();
    if (n && !candidates.some((x) => x.toLowerCase() === n.toLowerCase())) candidates.push(n);
  };
  detected.forEach(addCand);
  addCand(provided);
  // Bound the archive lookups: on a busy page the sweep may surface a few extra handles, but the
  // two players + the stored handle are always at the front, so 4 candidates is plenty.
  candidates.length = Math.min(candidates.length, 4);
  if (!candidates.length) {
    const e = new Error("Couldn't detect a username automatically — enter it below.");
    e.code = "NO_USERNAME"; // the popup uses this code to open the manual section
    throw e;
  }

  // Try each candidate's archive; the first one that actually contains the game wins. A bad handle
  // (404) or transient network error on one candidate just falls through to the next. findGameById is
  // cache-first (a previously fetched game costs no request) then fast-then-deep: the current/prev
  // month in parallel resolves a just-finished game in ~one hop, and only an older game opened from a
  // review URL falls through to the serial page-back.
  let game = null;
  for (const user of candidates) {
    try {
      const hit = await findGameById(user, gameId);
      if (hit && hit.pgn) { game = hit; break; }
    } catch { /* invalid user / network error for this candidate → try the next */ }
  }
  if (!game || !game.pgn) {
    throw new Error(
      "Couldn't find this game in either player's public archive (a game that just finished can take a few seconds to appear). Try again, or paste the PGN."
    );
  }

  // Remember the user's OWN handle for next time — but never overwrite it with an opponent's name
  // picked up from someone else's game. Only persist an explicitly typed handle, or seed an empty
  // store with the page's POV player on first run.
  if (provided) {
    await chrome.storage.local.set({ username: provided });
  } else {
    const { username: stored } = await chrome.storage.local.get("username");
    if (!stored && detected[0]) await chrome.storage.local.set({ username: detected[0] });
  }

  // Board perspective: the page's own ?flip= hint is the user's actual POV, so it's the primary
  // signal. Read it straight from the tab URL (works even if the content script is stale), falling
  // back to whatever the content script reported. Null = no hint → the analysis page uses the
  // username match (defaults to White at the bottom).
  const flip = parseFlip(tab.url) ?? (info && info.flip != null ? info.flip : null);
  const meta = { ...gameMeta(game), flip };
  // Country flags: the API knows WHO is white/black; the page knows each player's country id. Match
  // them by username so the right flag lands on the right side (analysis.js resolves id → flag art).
  attachCountries(meta, info && info.countries);
  await openAnalysisTab({ pgn: game.pgn, meta, source: "active-tab", theme: info.theme || null });
}

// Stamp the scraped { usernameLower: countryId } map onto meta.white/black by matching usernames.
// A player not present in the map (no flag on the page) just keeps countryId undefined → the
// analysis page renders the username-initial avatar for them, exactly as before.
function attachCountries(meta, countries) {
  if (!countries) return;
  const idFor = (user) => {
    const k = (user || "").toLowerCase();
    return (k && countries[k]) || null;
  };
  if (meta.white) meta.white.countryId = idFor(meta.white.user);
  if (meta.black) meta.black.countryId = idFor(meta.black.user);
}

/**
 * Lichess flow: the game id is in the page URL itself (lichess.org/<id>…), so we read it straight
 * from the tab URL and fetch the PGN from Lichess's public export API. This means a single icon
 * click works even when the content script hasn't injected yet (e.g. a tab opened before the
 * extension was reloaded) — no page reload needed. The content script, when present, only adds the
 * board/piece theme and a DOM move-list fallback. The PGN's own tags carry players/result.
 */
async function analyzeLichessTab(info, tabUrl) {
  const fromUrl = parseLichessGameId(tabUrl);
  const gameId = (info && info.gameId) || (fromUrl && fromUrl.id) || null;
  if (!gameId) {
    // No game id in the URL or on the page → let the popup take over (paste a URL/PGN).
    const e = new Error("No Lichess game found here. Open a game page, or paste its URL/PGN.");
    e.code = "NO_GAME";
    throw e;
  }
  let pgn = null;
  try {
    pgn = await fetchLichessPgn(gameId);
  } catch (err) {
    // API unreachable → use the moves scraped from the page, if the content script found any.
    const fallback = info && info.movetext ? info.movetext.trim() : "";
    if (fallback) pgn = fallback;
    else throw new Error("Couldn't fetch this game from Lichess (try again in a moment, or paste the PGN).");
  }
  // Perspective for Lichess: the stored handle is usually the chess.com one, so it won't match the
  // Lichess players — which is exactly why opening a game you played as Black used to seat the
  // opponent at the bottom. Take the board orientation the content script read (chessground's
  // orientation-black/-white), falling back to a /black|/white segment in the URL.
  const flip = (info && info.flip != null) ? info.flip : parseLichessFlip(tabUrl);
  await openAnalysisTab({
    pgn,
    meta: { url: `https://lichess.org/${gameId}`, gameId, flip },
    source: "active-tab-lichess",
    theme: (info && info.theme) || null,
  });
}
