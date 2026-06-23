// lichess.js — helpers for fetching a game's PGN from Lichess's public API.
// Imported as an ES module by analyze-flow.js and popup.js.
//
// Public API (no key/login required):
//   Export one game:  GET https://lichess.org/game/export/{gameId}
//     Accept: application/x-chess-pgn  → returns the full PGN (tags + moves).
//
// Lichess game IDs are 8 characters. A URL may carry a 12-char id (the 8-char id plus a
// 4-char player token, e.g. while/just after playing) and/or a trailing /white | /black |
// /analysis segment — we always reduce to the canonical 8-char base id.

import { getCachedGame, setCachedGame } from "./gamecache.js";

const SITE = "https://lichess.org";

// 8-char first-path segments that are Lichess routes, not games (so /training, /analysis,
// /practice, /streamer … are never mistaken for a game id).
const RESERVED = /^(training|analysis|practice|streamer|tournament|broadcast)$/i;

/** Parse the 8-char Lichess game id from a URL or path. Returns { id } or null. */
export function parseLichessGameId(urlOrPath) {
  if (!urlOrPath) return null;
  let path;
  try {
    path = new URL(urlOrPath, SITE).pathname;
  } catch {
    path = String(urlOrPath);
  }
  const seg = path.replace(/^\/+/, "").split(/[/?#]/)[0] || "";
  // Game ids are 8 chars; URLs sometimes append the 4-char player token (12 total).
  if (!/^[A-Za-z0-9]{8,12}$/.test(seg)) return null;
  if (RESERVED.test(seg)) return null;
  return { id: seg.slice(0, 8) };
}

/**
 * Read the board perspective from a Lichess URL. A game URL may carry a trailing colour segment
 * (/<id>/black or /<id>/white) naming the side shown at the bottom. Tri-state: true (Black at
 * bottom) / false (White) / null (no hint — defer to the board orientation or username match).
 */
export function parseLichessFlip(urlOrPath) {
  if (!urlOrPath) return null;
  let path;
  try { path = new URL(urlOrPath, SITE).pathname; } catch { path = String(urlOrPath); }
  if (/\/black(?:\/|$)/i.test(path)) return true;
  if (/\/white(?:\/|$)/i.test(path)) return false;
  return null;
}

/**
 * Fetch the PGN for a Lichess game by id. Clocks/evals/literate annotations are turned off so
 * the movetext stays clean for the analyzer. Returns the PGN string (throws on failure).
 */
export async function fetchGamePgn(gameId) {
  const id = String(gameId || "").slice(0, 8);
  if (!/^[A-Za-z0-9]{8}$/.test(id)) throw new Error("Invalid Lichess game id.");
  // Cache first: a finished game's PGN is immutable, so a re-analysis costs no API call.
  const cached = await getCachedGame("lichess", id);
  if (typeof cached === "string" && cached.trim()) return cached;
  const url = `${SITE}/game/export/${encodeURIComponent(id)}?clocks=false&evals=false&literate=false`;
  const res = await fetch(url, { headers: { Accept: "application/x-chess-pgn" } });
  if (!res.ok) throw new Error(`Lichess returned HTTP ${res.status} for game ${id}.`);
  const pgn = (await res.text()).trim();
  if (!pgn) throw new Error("Lichess returned an empty PGN.");
  // Only cache a finished game — an in-progress game exports a partial PGN with [Result "*"], which we
  // must not freeze (the next analysis should re-fetch the completed game).
  if (!/\[Result\s+"\*"\]/.test(pgn)) setCachedGame("lichess", id, pgn);
  return pgn;
}
