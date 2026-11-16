// Player profile — PGN lookup for sampled games. Feature rows keep no movetext,
// so the engine pass fetches it back: Chess.com from the cached monthly archive
// (one request per month at most), Lichess from the single-game export, which
// goes through the shared game cache.
import {fetchMonthGames} from '../../chesscom.js';
import {getCachedMonth, setCachedMonth} from '../../gamecache.js';
import {fetchGamePgn} from '../../lichess.js';
import {importDelay} from '../import-request.js';

const inflight = new Map();
export function monthUrl(account, t) {
  const d = new Date(t * 1000);
  return `https://api.chess.com/pub/player/${encodeURIComponent(String(account).toLowerCase())}/games/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
async function monthGames(url, signal, now = new Date()) {
  const cached = await getCachedMonth(url);
  if (cached) return cached;
  if (!inflight.has(url)) {
    inflight.set(url, (async () => {
      const games = await fetchMonthGames(url, {signal});
      const current = url.endsWith(`/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`);
      if (!current && games.length) setCachedMonth(url, games);
      await importDelay(150, signal);
      return games;
    })().finally(() => inflight.delete(url)));
  }
  return inflight.get(url);
}
export async function loadProfilePgn(site, row, signal, account) {
  if (site === 'lichess') return fetchGamePgn(row.id, {signal});
  if (site !== 'chesscom' || !row.t) return null;
  const url = monthUrl(account, row.t);
  const games = await monthGames(url, signal);
  const game = games.find(g => String(g.url || '').match(/\/game\/(?:[a-z-]+\/)?(\d+)/i)?.[1] === row.id);
  return game?.pgn || null;
}
