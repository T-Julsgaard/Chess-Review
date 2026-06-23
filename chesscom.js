// chesscom.js — shared helper functions for fetching games from Chess.com's
// public API. Imported as an ES module by both popup.js and background.js.
//
// Public API (no key/login required):
//   https://api.chess.com/pub/player/{user}/games/archives
//   https://api.chess.com/pub/player/{user}/games/{YYYY}/{MM}
// Each game has, among other fields, { url, pgn, white, black, end_time, time_class, ... }

import { getCachedGame, setCachedGame, getCachedMonth, setCachedMonth } from "./gamecache.js";

const API = "https://api.chess.com/pub";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Canonical chess.com game-id parser. This is the SINGLE source of truth for the URL shapes we
// recognise — content.js carries a byte-for-byte copy of GAME_ID_RE (it runs as a plain content
// script and can't import this module); KEEP THE TWO IN SYNC. The matching elsewhere always keys on
// the numeric id, so a future new type word is handled without code changes.
//
// Recognised shapes (the type segment is optional and may be ANY word, so a new time class like
// "rapid" or a renamed segment still resolves):
//   /game/live/123        /game/daily/123        /game/123 (bare, just-finished)
//   /analysis/game/live/123/review        …/game/rapid/123 (hypothetical future word)
export const GAME_ID_RE = /\/game\/(?:([a-z][a-z-]*)\/)?(\d{4,})/i;

/** Parse a chess.com game ID + type from a URL/pathname. Returns { type, id } or null. */
export function parseGameId(urlOrPath) {
  if (!urlOrPath) return null;
  const m = String(urlOrPath).match(GAME_ID_RE);
  if (!m) return null;
  return { type: (m[1] || "live").toLowerCase(), id: m[2] };
}

/**
 * Read chess.com's board-flip hint from a URL. The review URL (/analysis/game/live/<id>/review)
 * carries ?flip=true when the board is shown from BLACK's side — i.e. when the user played Black.
 * Tri-state: true (flip → Black at bottom) / false (explicit White) / null (no hint, defer to the
 * username match). A few spellings are accepted so a slightly altered link still resolves.
 */
export function parseFlip(urlOrPath) {
  if (!urlOrPath) return null;
  try {
    const v = (new URL(urlOrPath, "https://www.chess.com").searchParams.get("flip") || "").trim().toLowerCase();
    if (/^(true|1|yes|on)$/.test(v)) return true;
    if (/^(false|0|no|off)$/.test(v)) return false;
  } catch {}
  return null;
}

// chess.com's public API is heavily CDN-cached and their guidance is to keep requests serial; when
// you do hit the rate limit it answers 429 (often with Retry-After). We honour that with a short
// backoff + a couple of retries so a transient throttle doesn't turn a findable game into "not found"
// (the deep search treats a thrown month as empty). 404/empty months still throw straight through.
async function getJSON(url, { retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return res.json();
    if (res.status === 429 && attempt < retries) {
      const ra = parseInt(res.headers.get("Retry-After") || "", 10);
      const waitMs = Number.isFinite(ra) ? ra * 1000 : 1000 * (attempt + 1);
      await sleep(Math.min(waitMs, 8000));
      continue;
    }
    throw new Error(`HTTP ${res.status} at ${url}`);
  }
}

/** List of monthly archive URLs (oldest → newest). */
export async function fetchArchives(username) {
  const data = await getJSON(`${API}/player/${encodeURIComponent(username.toLowerCase())}/games/archives`);
  return data.archives || [];
}

/** Fetch all games in a given monthly archive. */
export async function fetchMonthGames(archiveUrl) {
  const data = await getJSON(archiveUrl);
  return data.games || [];
}

const slug = (username) => encodeURIComponent(String(username).toLowerCase());
// The monthly-archive URL is fully deterministic (…/games/YYYY/MM, by UTC month), so we can hit a
// month directly without first downloading the archives index.
function monthArchiveUrl(username, date) {
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${API}/player/${slug(username)}/games/${date.getUTCFullYear()}/${mm}`;
}

/**
 * Find a specific game by its game ID. Tuned for snappy "analyze the game I'm on":
 *   1) Fast path — a just-finished game lives in the current (or previous) UTC-month archive, whose
 *      URL is deterministic. We fetch both directly and in PARALLEL, skipping the archives-index
 *      round-trip entirely. That's the overwhelmingly common case, now ~1 network hop.
 *   2) Slow path — only if that misses (an older game, opened from its review URL) do we pull the
 *      archives index and page back, newest → oldest, in small PARALLEL batches (one round-trip per
 *      batch instead of one per month). Stops at the first batch that contains the game.
 * Returns the game object (incl. .pgn) or null.
 */
export async function findGameById(username, gameId, opts = {}) {
  const want = String(gameId);
  // Cache first: a game's PGN is immutable, so if we've fetched this id before (from either player's
  // archive, in any session) we return it with zero API calls.
  const cached = await getCachedGame("chesscom", want);
  if (cached && cached.pgn) return cached;

  const game = await searchGameById(username, want, opts);
  if (game && game.pgn) setCachedGame("chesscom", want, game); // fire-and-forget; never blocks the result
  return game;
}

// The actual archive search behind findGameById's cache.
async function searchGameById(username, want, { monthsBack = 18 } = {}) {
  const matchIn = (games) => (games || []).find((g) => { const p = parseGameId(g.url); return p && p.id === want; }) || null;
  const safeMonth = (url) => fetchMonthGames(url).catch(() => []); // a 404/empty month → just skip it

  // 1) Fast path: current + previous UTC month, LIVE. The just-finished game is almost always here, so
  //    we never serve these two from cache (the current month is still growing — a cached copy could
  //    miss a brand-new game). The previous month IS immutable, so we opportunistically cache it for a
  //    future deep search. Two parallel requests: the latency win outweighs the (retry-guarded) risk.
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const curUrl = monthArchiveUrl(username, now);
  const prevUrl = monthArchiveUrl(username, prev);
  const [curGames, prevGames] = await Promise.all([safeMonth(curUrl), safeMonth(prevUrl)]);
  let hit = matchIn(curGames);
  if (hit) return hit;
  if (prevGames.length) setCachedMonth(prevUrl, prevGames); // immutable → safe; fire-and-forget
  hit = matchIn(prevGames);
  if (hit) return hit;

  // 2) Deep path: page back through the archive index newest → oldest, SERIALLY (chess.com asks for
  //    serial requests; parallel bursts trip the rate limit). Every month here is OLDER than the
  //    current one, hence immutable — so we read the month cache first (a hit costs no API call) and
  //    cache any month we do fetch. A cache miss/empty/error always falls through to a live fetch, so a
  //    cold or broken cache behaves exactly like before. Only runs for genuinely old games.
  let archives;
  try { archives = await fetchArchives(username); } catch { return null; }
  const done = new Set([curUrl, prevUrl]);
  const toSearch = archives.slice(-Math.max(1, monthsBack)).reverse().filter((u) => !done.has(u));
  for (const url of toSearch) {
    let games = await getCachedMonth(url);
    if (games == null) {
      games = await safeMonth(url);
      if (games.length) setCachedMonth(url, games); // immutable past month → cache forever
    }
    const m = matchIn(games);
    if (m) return m;
  }
  return null;
}

/** Fetch the most recent game for a user (newest archive, last game). */
export async function fetchLatestGame(username) {
  const archives = await fetchArchives(username);
  if (!archives.length) return null;
  const games = await fetchMonthGames(archives[archives.length - 1]);
  if (!games.length) return null;
  return games[games.length - 1];
}

/** Build a compact meta structure for display/storage from an API game. */
export function gameMeta(game) {
  if (!game) return {};
  return {
    url: game.url || "",
    gameId: parseGameId(game.url)?.id || "",
    timeClass: game.time_class || "",
    endTime: game.end_time || null,
    white: { user: game.white?.username || "?", result: game.white?.result || "" },
    black: { user: game.black?.username || "?", result: game.black?.result || "" },
  };
}
