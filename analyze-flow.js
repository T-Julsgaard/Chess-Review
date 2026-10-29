// analyze-flow.js — shared flow used by both the popup (click) and background
// (shortcut): find the game from the active chess tab and open the analysis beside it.

import { findGameById, gameMeta, parseFlip, parseGameId, parseUsername, gameFlip } from "./chesscom.js";
import { parseLichessGameId, parseLichessFlip, fetchGamePgn as fetchLichessPgn } from "./lichess.js";
import { browserAPI } from "./browser-compat.js";
import {createImportRequest, checkImport, importDelay, waitImport} from "./lib/import-request.js";
import {archivePlayers} from "./lib/player-history.js";
import {getCachedGame} from "./gamecache.js";

/** Save the analysis payload and open analysis.html in a new tab. */
export async function openAnalysisTab(payload, {signal, sourceTabId} = {}) {
  const request = createImportRequest(signal);
  signal = request.signal;
  // The popup, keyboard shortcut, and in-page button can all launch a review. A timestamp
  // alone collides when two of those arrive in the same millisecond, causing one tab to read
  // the other tab's payload. UUIDs keep each storage handoff independent.
  const jobId = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let tab;
  const removeJob = async () => {try {await browserAPI.storage.local.remove(`job:${jobId}`);} catch {}};
  try {
    checkImport(signal);
    const storing = browserAPI.storage.local.set({ [`job:${jobId}`]: payload }).then(async () => {
      if(signal.aborted)await removeJob();
    });
    await waitImport(storing, signal);
    checkImport(signal);
    const opening = createAnalysisTab(browserAPI.runtime.getURL(`analysis.html#${jobId}`), sourceTabId, signal).then(async opened => {
      // Browser APIs cannot be aborted: clean up our own late result after cancellation.
      if(signal.aborted && opened?.id != null && browserAPI.tabs.remove) {
        try {await browserAPI.tabs.remove(opened.id);} catch {}
        await removeJob();
      }
      return opened;
    });
    tab = await waitImport(opening, signal);
    checkImport(signal); return tab;
  } catch (error) {
    if (signal?.aborted && tab?.id != null && browserAPI.tabs.remove) {try {await browserAPI.tabs.remove(tab.id);} catch {}}
    void removeJob();
    throw error;
  } finally {request.dispose();}
}

/** Open the app without a game handoff, preserving independent per-tab sessions. */
export async function openBlankWorkspaceTab({signal} = {}) {
  const request=createImportRequest(signal);
  try {
    checkImport(request.signal);
    const opening=browserAPI.tabs.create({url:browserAPI.runtime.getURL("analysis.html?workspace=blank")}).then(async tab=>{
      if(request.signal.aborted&&tab?.id!=null){
        try {await browserAPI.tabs.remove(tab.id);} catch {}
      }
      return tab;
    });
    return await waitImport(opening,request.signal);
  } finally {request.dispose();}
}

async function getActiveTab() {
  const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function createAnalysisTab(url, sourceTabId, signal) {
  let sourceTab;
  try {
    // Refresh the source just before opening: imports can outlast tab switches or moves.
    sourceTab = await waitImport(sourceTabId == null ? getActiveTab() : browserAPI.tabs.get(sourceTabId), signal);
  } catch {checkImport(signal);}
  checkImport(signal);
  const properties = {url};
  if (isSupportedChessUrl(sourceTab?.url)
      && Number.isInteger(sourceTab.index) && sourceTab.index >= 0
      && Number.isInteger(sourceTab.windowId) && sourceTab.windowId >= 0) {
    properties.index = sourceTab.index + 1;
    properties.windowId = sourceTab.windowId;
  }
  try {
    return await browserAPI.tabs.create(properties);
  } catch (error) {
    checkImport(signal);
    if (properties.index == null) throw error;
    // The source window may have closed between lookup and creation; keep reviews usable.
    return browserAPI.tabs.create({url});
  }
}

// True for chess.com / lichess.org pages — the only sites where the analyze flow can find a game.
export function isSupportedChessUrl(url) {
  return /^https:\/\/(www\.)?chess\.com\//.test(url || "") || /^https:\/\/(www\.)?lichess\.org\//.test(url || "");
}

// Reload the active chess tab, wait for it to finish loading, let the SPA settle, then analyze again.
// Used as a one-shot retry when the just-finished game hasn't been exposed by the page SPA yet.
export async function reloadActiveAndAnalyze(username, tabId = null, {signal} = {}) {
  checkImport(signal);
  const tab = await waitImport(tabId == null ? getActiveTab() : browserAPI.tabs.get(tabId), signal);
  if (!tab || tab.id == null) throw new Error("No active tab");
  if (!isSupportedChessUrl(tab.url)) throw new Error("Not a supported chess site");
  await new Promise((resolve, reject) => {
    let finished = false;
    const finish = (err) => {
      if(finished)return;finished=true;
      browserAPI.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (err) reject(err); else resolve();
    };
    const onUpdated = (id, info) => {
      if (id === tab.id && info.status === "complete") {
        finish();
      }
    };
    const abort = () => finish(signal.reason);
    const timer = setTimeout(() => {
      finish(new Error("reload timed out"));
    }, 12000);
    browserAPI.tabs.onUpdated.addListener(onUpdated);
    signal?.addEventListener("abort", abort, {once:true});
    if(signal?.aborted){abort();return;}
    Promise.resolve().then(() => browserAPI.tabs.reload(tab.id)).catch(finish);
  });
  await importDelay(900, signal);
  await analyzeActiveTab(username, tab.id, {signal});
}

/** Ask the content script in a tab for the game ID, etc. */
async function getGameInfoFromTab(tabId, signal) {
  try {
    return await waitImport(browserAPI.tabs.sendMessage(tabId, { type: "getGameInfo" }), signal);
  } catch {
    checkImport(signal);
    return null; // no content script on the page (not chess.com)
  }
}

/**
 * Primary flow: use the active tab's game ID, fetch the PGN from the API, and open
 * the analysis. Throws an error with a user-friendly message if something is missing.
 */
export async function analyzeActiveTab(username, tabId = null, {signal} = {}) {
  const request = createImportRequest(signal);
  try {
    checkImport(request.signal);
    const tab = await waitImport(tabId == null ? getActiveTab() : browserAPI.tabs.get(tabId), request.signal);
    if (!tab) throw new Error("Could not find the active tab.");
    try {
      await waitImport(analyzeTab(tab, username, request.signal), request.signal);
    } catch (err) {
      // Keep retries attached to this game even if the user changes the active tab.
      err.tabId = tab.id;
      throw err;
    }
  } finally {request.dispose();}
}

async function analyzeTab(tab, username, signal) {
  checkImport(signal);
  const info = (await getGameInfoFromTab(tab.id, signal)) || {};

  // Lichess: the content script reports site:"lichess" (or we recognise the URL). Lichess gives us
  // the full PGN directly from a game id — no username/archive search needed.
  const isLichess = (info && info.site === "lichess") || /:\/\/(www\.)?lichess\.org\//i.test(tab.url || "");
  if (isLichess) return analyzeLichessTab(info, tab, signal);

  // Game id: prefer the content script's real-time location.pathname (authoritative for SPA navigation
  // where tab.url may lag behind history.pushState), then fall back to the tab URL. The content script
  // reads location.pathname at message time, so it always reflects the current page even during SPA
  // transitions. The tab URL is kept as fallback for cases where the content script isn't injected yet.
  const gameId = (info && info.gameId) || parseGameId(tab.url)?.id || null;
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
  // the link's named player, the player(s) read off the page, then any provided/stored handle. A game lives in BOTH
  // players' archives, so trying each in turn means a wrong or own stored username (e.g. when you
  // open SOMEONE ELSE'S game) no longer blocks the lookup.
  const savedCandidates = await waitImport(archivePlayers(browserAPI.storage.local, username), signal);
  const detected = Array.isArray(info.usernames) ? info.usernames : (info.username ? [info.username] : []);
  const candidates = [];
  const addCand = (n) => {
    n = (n || "").trim();
    if (n && !candidates.some((x) => x.toLowerCase() === n.toLowerCase())) candidates.push(n);
  };
  addCand(parseUsername(tab.url));
  detected.forEach(addCand);
  savedCandidates.forEach(addCand);
  // Bound the archive lookups: on a busy page the sweep may surface a few extra handles, but the
  // linked player + two detected players + stored handle fit in four candidates.
  candidates.length = Math.min(candidates.length, 4);
  let game = await waitImport(getCachedGame("chesscom", gameId), signal);
  if (!candidates.length && !game?.pgn) {
    const e = new Error("Couldn't read the players on this page. Open the finished game on Chess.com and try again, or paste its PGN.");
    e.code = "NO_USERNAME";
    throw e;
  }

  // Try each candidate's archive; the first one that actually contains the game wins. A bad handle
  // (404) or transient network error on one candidate just falls through to the next. findGameById is
  // cache-first (a previously fetched game costs no request) then fast-then-deep: the current/prev
  // month checks resolve a just-finished game in ~one hop, and only an older game opened from a
  // review URL falls through to the serial page-back.
  let lookupError = null;
  for (const user of candidates) {
    if (game?.pgn) break;
    try {
      const hit = await findGameById(user, gameId, {signal});
      if (hit && hit.pgn) { game = hit; break; }
    } catch (error) {checkImport(signal);lookupError ||= error;}
  }
  if (!game || !game.pgn) {
    if(lookupError)throw new Error("Some game archives could not be loaded. Retry or paste the PGN.", {cause:lookupError});
    throw new Error(
      "Couldn't find this game in either player's public archive (a game that just finished can take a few seconds to appear). Try again, or paste the PGN."
    );
  }

  checkImport(signal);
  // Explicit URL flip, then the displayed board, then the link's named player. A fresh
  // install has no identity history, so links with only ?username= must resolve here.
  const flip = parseFlip(tab.url) ?? info.flip ?? gameFlip(game, tab.url);
  const meta = { ...gameMeta(game), flip };
  // Country flags: the API knows WHO is white/black; the page knows each player's country id. Match
  // them by username so the right flag lands on the right side (analysis.js resolves id → flag art).
  attachCountries(meta, info && info.countries);
  await openAnalysisTab({ pgn: game.pgn, meta, source: "active-tab" }, {signal, sourceTabId:tab.id});
}

/** Pasted Chess.com URLs use the named player and local evidence for public archive lookup. */
export async function analyzeChesscomUrl(url, {signal} = {}) {
  const request = createImportRequest(signal);
  try {
    signal = request.signal;
    const parsed = parseGameId(url);
    if (!parsed) throw new Error("Couldn't read a game ID from the URL.");
    let game = await waitImport(getCachedGame("chesscom", parsed.id), signal);
    if (!game?.pgn) {
      const candidates = await waitImport(archivePlayers(browserAPI.storage.local, parseUsername(url)), signal);
      if (!candidates.length) throw new Error("Open this game on Chess.com and choose Analyze this game, or paste its PGN.");
      let lookupError;
      for (const name of candidates) {
        try { game = await findGameById(name, parsed.id, {monthsBack:18, signal});if (game?.pgn) break; }
        catch (error) {checkImport(signal);lookupError ||= error;}
      }
      if (!game?.pgn) throw new Error("Couldn't find this game in the known players' archives. Open it on Chess.com and choose Analyze this game, or paste its PGN.", {cause:lookupError});
    }
    await openAnalysisTab({pgn:game.pgn, meta:{...gameMeta(game),flip:gameFlip(game,url)},source:"url"}, {signal});
  } finally {request.dispose();}
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
 * board orientation and a DOM move-list fallback. The PGN's own tags carry players/result.
 */
async function analyzeLichessTab(info, tab, signal) {
  const tabUrl = tab.url || "";
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
    pgn = await fetchLichessPgn(gameId, {signal});
  } catch (err) {
    checkImport(signal);
    // API unreachable → use the moves scraped from the page, if the content script found any.
    const fallback = (info?.pgn || info?.movetext || "").trim();
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
  }, {signal, sourceTabId:tab.id});
}
