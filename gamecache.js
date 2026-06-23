// gamecache.js — local cache of fetched games/PGNs, keyed by site + game id, in chrome.storage.local.
// A finished game's PGN never changes and its id is immutable, so caching it lets a re-analysis of the
// same game cost ZERO calls to chess.com / Lichess. This is the main lever against API traffic as the
// user base grows: most repeat usage is re-opening games already seen. unlimitedStorage is granted and
// each entry is tiny (one PGN, ~2 KB), but we still cap the count with a simple LRU-ish index so the
// cache can't grow without bound over years of use.
//
// Everything no-ops gracefully when chrome.storage is absent (so the pure-Node tools that import the
// API modules keep working) and swallows storage errors — a cache miss is always safe to fall back on.

const DATA_PREFIX = "gamecache:";
const INDEX_KEY = "gamecache:index"; // array of data keys, oldest → newest (eviction order)
const MAX_ENTRIES = 1000;

function hasStorage() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}
const keyFor = (site, id) => `${DATA_PREFIX}${site}:${String(id)}`;

/** Cached payload for a game (the chess.com game object, or the Lichess PGN string), or null. */
export async function getCachedGame(site, id) {
  if (!hasStorage() || !id) return null;
  const k = keyFor(site, id);
  try {
    const got = await chrome.storage.local.get(k);
    return got[k] ? got[k].data : null;
  } catch {
    return null;
  }
}

/** Store a game's payload and keep the cache bounded by evicting the oldest entries over the cap. */
export async function setCachedGame(site, id, data) {
  if (!hasStorage() || !id || data == null) return;
  const k = keyFor(site, id);
  try {
    const got = await chrome.storage.local.get(INDEX_KEY);
    await chrome.storage.local.set({ [k]: { t: Date.now(), data } });
    // Move-to-newest in the index, then evict the oldest once over the cap.
    let index = Array.isArray(got[INDEX_KEY]) ? got[INDEX_KEY].filter((x) => x !== k) : [];
    index.push(k);
    const evict = index.length > MAX_ENTRIES ? index.splice(0, index.length - MAX_ENTRIES) : [];
    await chrome.storage.local.set({ [INDEX_KEY]: index });
    if (evict.length) await chrome.storage.local.remove(evict);
  } catch {
    /* a full/unavailable store just means no caching — the fetch already succeeded */
  }
}

// ---- Monthly-archive cache ---------------------------------------------------
// chess.com's archive endpoint returns a WHOLE month of games in one request. We already fetch
// months while hunting for a game, so instead of throwing the rest away we keep them: a later lookup
// of any game in that month then costs zero API calls. Keyed by the deterministic archive URL (which
// encodes the username + YYYY/MM). ONLY immutable (already-finished) months are ever stored — the
// caller never caches the current, still-growing month — so a cached month can confirm a hit but can
// never produce a false "not found". A miss/empty/error always falls back to a live fetch, exactly
// like before, so a cold or broken cache behaves identically to having no cache at all.
const MONTH_PREFIX = "gamecache:month:";
const MONTH_INDEX_KEY = "gamecache:monthindex"; // array of month keys, oldest → newest (eviction order)
const MAX_MONTHS = 60;                           // a busy month is a few hundred KB; 60 stays modest

/** Cached array of games for a monthly archive URL, or null if not cached. */
export async function getCachedMonth(archiveUrl) {
  if (!hasStorage() || !archiveUrl) return null;
  const k = MONTH_PREFIX + archiveUrl;
  try {
    const got = await chrome.storage.local.get(k);
    return got[k] && Array.isArray(got[k].games) ? got[k].games : null;
  } catch {
    return null;
  }
}

/** Store a month's games (caller guarantees the month is immutable) and bound the month cache. */
export async function setCachedMonth(archiveUrl, games) {
  if (!hasStorage() || !archiveUrl || !Array.isArray(games) || !games.length) return;
  const k = MONTH_PREFIX + archiveUrl;
  try {
    const got = await chrome.storage.local.get(MONTH_INDEX_KEY);
    await chrome.storage.local.set({ [k]: { t: Date.now(), games } });
    let index = Array.isArray(got[MONTH_INDEX_KEY]) ? got[MONTH_INDEX_KEY].filter((x) => x !== k) : [];
    index.push(k);
    const evict = index.length > MAX_MONTHS ? index.splice(0, index.length - MAX_MONTHS) : [];
    await chrome.storage.local.set({ [MONTH_INDEX_KEY]: index });
    if (evict.length) await chrome.storage.local.remove(evict);
  } catch {
    /* a full/unavailable store just means no caching — the fetch already succeeded */
  }
}
