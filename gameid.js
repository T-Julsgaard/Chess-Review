// gameid.js — the single source of truth for *game identity* and every game-scoped cache key.
//
// Two different games must never be treated as one. A game's identity therefore has to be a
// property of that one game — never something two games can share: not the players, not the
// opening, not the URL path, not the browser tab, not a DOM-derived name, not the current session
// or tab. The platform's own immutable game id (chess.com numeric id / Lichess 8-char base62 id)
// is that identity. Only when a caller genuinely has no id — a pasted PGN/FEN, or a shared
// fragment — do we fall back to a content hash of the PGN, which still differs between any two
// distinct games.
//
// Every read and every write of a game's analysis goes through these helpers so one caller can
// never derive a "111" key while another derives a "players:A-B" key for the same game.

// djb2 string hash. Kept byte-identical to the historical implementation so previously saved
// pgn:-keyed library entries keep resolving after an upgrade.
export function simpleHash(str) {
  let h = 5381;
  const s = str == null ? "" : String(str);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// Normalise a platform game id to a stable string so a numeric id and a string id agree.
export function normalizeGameId(gameId) {
  return gameId == null ? "" : String(gameId).trim();
}

// The canonical identity of one game. Priority is ALWAYS the real game id; the PGN hash is a
// last-resort fallback for id-less pastes, never a username/URL/tab fallback.
//   canonicalGameId({ gameId: "222" }) -> "222"
//   canonicalGameId({ pgn })           -> "pgn:1a2b3c"
export function canonicalGameId({ gameId, pgn } = {}) {
  const id = normalizeGameId(gameId);
  return id || `pgn:${simpleHash(pgn || "")}`;
}

// Storage key for a game's heavy analysis blob. Centralised so a read and a write can never
// disagree. Never build this string by hand anywhere else.
export function analysisCacheKey(gameId) {
  return `analysis:${gameId}`;
}
