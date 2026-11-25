// Player profile — game sources. Normalises a Chess.com monthly-archive game or a
// Lichess NDJSON export line into one shape for features.js. Fetching helpers
// follow the extension's API etiquette: serial requests, 429/Retry-After honoured
// by the shared helpers, finished months cached and never re-fetched.
import {fetchArchives, fetchMonthGames} from '../../chesscom.js';
import {getCachedMonth, setCachedMonth} from '../../gamecache.js';
import {fetchImport, checkImport, importDelay} from '../import-request.js';

const CHESSCOM_DRAWS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']);
const CHESSCOM_TERMS = {checkmated: 'mate', resigned: 'resign', timeout: 'time', abandoned: 'abandon', agreed: 'agree',
  repetition: 'repetition', stalemate: 'stalemate', insufficient: 'insufficient', '50move': 'fifty', timevsinsufficient: 'insufficient'};
const LICHESS_TERMS = {mate: 'mate', resign: 'resign', outoftime: 'time', timeout: 'abandon', draw: 'agree', stalemate: 'stalemate'};

export class ProfileAccountNotFoundError extends Error {
  constructor(site, username) {
    super(`${site === 'lichess' ? 'Lichess' : 'Chess.com'} has no player called ${username}.`);
    this.site = site;
  }
}

function headerMap(pgn) {
  return Object.fromEntries([...String(pgn || '').matchAll(/^\[(\w+)\s+"([^"\r\n]*)"\]\s*$/gm)].map(m => [m[1], m[2]]));
}
function clockSeconds(text) {
  const parts = String(text).split(':').map(Number);
  if (parts.some(part => !Number.isFinite(part))) return null;
  return parts.reduce((sum, part) => sum * 60 + part, 0);
}
/** Movetext → SAN tokens plus per-ply remaining clocks (seconds or null). No replay. */
export function parseMovetext(pgn) {
  const text = String(pgn || '').replace(/^\[.*\]\s*$/gm, '');
  const moves = [], clocks = [];
  const token = /\{([^}]*)\}|\([^)]*\)|;[^\n]*|\$\d+|\d+\.(?:\.\.)?|(1-0|0-1|1\/2-1\/2|\*)|([^\s{}()]+)/g;
  let m;
  while ((m = token.exec(text))) {
    if (m[1] != null) {
      const clk = /\[%clk\s+([\d:.]+)\]/.exec(m[1]);
      if (clk && moves.length) clocks[moves.length - 1] = clockSeconds(clk[1]);
    } else if (m[2]) break;
    else if (m[3]) { moves.push(m[3].replace(/[!?]+$/, '')); clocks.push(null); }
  }
  return {moves, clocks: clocks.slice(0, moves.length)};
}
function utcSeconds(date, time) {
  const d = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(date || ''), t = /^(\d{2}):(\d{2}):(\d{2})$/.exec(time || '');
  if (!d || !t) return null;
  return Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2], +t[3]) / 1000;
}

/** Chess.com monthly-archive game object → normalised game, or null when unusable. */
export function normalizeChesscom(game) {
  if (!game || typeof game.pgn !== 'string' || (game.rules && game.rules !== 'chess')) return null;
  const headers = headerMap(game.pgn);
  if (headers.SetUp === '1' || headers.FEN) return null;
  const {moves, clocks} = parseMovetext(game.pgn);
  if (!moves.length) return null;
  const white = game.white || {}, black = game.black || {};
  const wr = white.result, br = black.result;
  let result, termination;
  if (wr === 'win') { result = 'w'; termination = CHESSCOM_TERMS[br] || 'other'; }
  else if (br === 'win') { result = 'b'; termination = CHESSCOM_TERMS[wr] || 'other'; }
  else if (CHESSCOM_DRAWS.has(wr) || CHESSCOM_DRAWS.has(br) || headers.Result === '1/2-1/2') { result = 'd'; termination = CHESSCOM_TERMS[wr] || CHESSCOM_TERMS[br] || 'agree'; }
  else return null;
  const id = String(game.url || '').match(/\/game\/(?:[a-z-]+\/)?(\d+)/i)?.[1] || String(game.uuid || '');
  if (!id) return null;
  let startTime = utcSeconds(headers.UTCDate || headers.Date, headers.StartTime);
  const endTime = Number(game.end_time) || utcSeconds(headers.EndDate || headers.UTCDate, headers.EndTime);
  if (startTime != null && endTime != null && startTime > endTime) startTime -= 86400; // a game that crossed midnight UTC
  let opening = headers.Opening || '';
  if (!opening && (headers.ECOUrl || game.eco)) {
    try { opening = decodeURIComponent(String(headers.ECOUrl || game.eco).split('/').pop() || '').replace(/-/g, ' ').replace(/\s+\d+(\.\d+)?.*$/, '').trim(); } catch {}
  }
  return {site: 'chesscom', id, url: game.url || '', moves, clocks, endTime, startTime,
    timeClass: game.time_class || 'unknown', timeControl: game.time_control || headers.TimeControl || '', rated: game.rated !== false,
    white: {name: white.username || headers.White || '?', rating: white.rating ?? (Number(headers.WhiteElo) || null)},
    black: {name: black.username || headers.Black || '?', rating: black.rating ?? (Number(headers.BlackElo) || null)},
    result, termination, eco: headers.ECO || '', opening, bot: false, variant: 'standard'};
}

/** Lichess NDJSON export line (object) → normalised game, or null. */
export function normalizeLichess(game) {
  if (!game || typeof game !== 'object' || (game.variant && game.variant !== 'standard')) return null;
  if (['aborted', 'noStart', 'unknownFinish', 'cheat', 'variantEnd'].includes(game.status)) return null;
  const moves = typeof game.moves === 'string' ? game.moves.trim().split(/\s+/).filter(Boolean) : [];
  if (!moves.length) return null;
  const players = game.players || {}, w = players.white || {}, b = players.black || {};
  const nameOf = p => p.user?.name || (p.aiLevel ? 'Stockfish level ' + p.aiLevel : p.name || 'Anonymous');
  const result = game.winner === 'white' ? 'w' : game.winner === 'black' ? 'b' : 'd';
  const termination = LICHESS_TERMS[game.status] || (result === 'd' ? 'agree' : 'other');
  const clocks = Array.isArray(game.clocks) ? game.clocks.map(c => Number.isFinite(c) ? c / 100 : null) : [];
  const clock = game.clock || {};
  const control = Number.isFinite(clock.initial) ? clock.initial + '+' + (clock.increment || 0) : (game.daysPerTurn ? '1/' + game.daysPerTurn * 86400 : '');
  const speed = game.speed === 'correspondence' ? 'daily' : game.speed === 'ultraBullet' ? 'bullet' : game.speed || 'unknown';
  return {site: 'lichess', id: String(game.id), url: 'https://lichess.org/' + game.id, moves, clocks,
    endTime: game.lastMoveAt ? Math.round(game.lastMoveAt / 1000) : null, startTime: game.createdAt ? Math.round(game.createdAt / 1000) : null,
    timeClass: speed, timeControl: control, rated: !!game.rated,
    white: {name: nameOf(w), rating: w.rating ?? null}, black: {name: nameOf(b), rating: b.rating ?? null},
    result, termination, eco: game.opening?.eco || '', opening: game.opening?.name || '',
    bot: !!(w.aiLevel || b.aiLevel || w.user?.title === 'BOT' || b.user?.title === 'BOT'), variant: 'standard'};
}

const monthOf = url => /(\d{4})\/(\d{2})\/?$/.exec(url);
const isCurrentMonth = (url, now = new Date()) => {
  const m = monthOf(url);
  return !!m && Number(m[1]) === now.getUTCFullYear() && Number(m[2]) === now.getUTCMonth() + 1;
};

/**
 * Stream a Chess.com player's games month by month. `since` (seconds) limits how far
 * back to go; `known` is the set of month URLs already collected (immutable past
 * months are skipped entirely). Calls onMonth(url, normalisedGames, {cached}) per month.
 */
export async function collectChesscom(username, {since = 0, known = new Set(), signal, onMonth, onProgress, now = new Date()} = {}) {
  let archives;
  try { archives = await fetchArchives(username, {signal}); }
  catch (error) {
    if (error?.status === 404) throw new ProfileAccountNotFoundError('chesscom', username);
    throw error;
  }
  const wanted = archives.filter(url => {
    const m = monthOf(url);
    if (!m) return false;
    const end = Date.UTC(Number(m[1]), Number(m[2]), 1) / 1000; // first second of the next month
    return end >= since;
  });
  let done = 0;
  for (const url of wanted) {
    checkImport(signal);
    const current = isCurrentMonth(url, now);
    if (!current && known.has(url)) { done++; onProgress?.({done, total: wanted.length, url, skipped: true}); continue; }
    let games = current ? null : await getCachedMonth(url);
    let cached = games != null;
    if (games == null) {
      games = await fetchMonthGames(url, {signal});
      if (!current && games.length) setCachedMonth(url, games);
      await importDelay(150, signal);
    }
    done++;
    await onMonth?.(url, games.map(normalizeChesscom).filter(Boolean), {cached, current});
    onProgress?.({done, total: wanted.length, url, cached});
  }
  return wanted;
}

/**
 * Stream a Lichess player's games as NDJSON. `since` in seconds. Calls onBatch with
 * normalised games in chunks so the caller can yield between replays.
 */
export async function collectLichess(username, {since = 0, before = 0, includePgn = false, signal, onBatch, onProgress} = {}) {
  const params = new URLSearchParams({clocks: 'true', opening: 'true', moves: 'true', evals: 'false', tags: 'false'});
  if (since > 0) params.set('since', String(since * 1000));
  if (before > 0) params.set('until', String(before * 1000 - 1));
  if (includePgn) { params.set('pgnInJson', 'true'); params.set('tags', 'true'); }
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?${params}`;
  const res = await fetchImport(url, {headers: {Accept: 'application/x-ndjson'}, signal, stream: true});
  if (res.status === 404) throw new ProfileAccountNotFoundError('lichess', username);
  if (!res.ok) throw new Error('Lichess returned HTTP ' + res.status + '.');
  let batch = [], total = 0, published = performance.now();
  for await (const line of res.lines()) {
    checkImport(signal);
    let parsed = null;
    try { parsed = JSON.parse(line); } catch {}
    const game = normalizeLichess(parsed);
    if (game) {
      if (includePgn) game.pgn = parsed.pgn;
      batch.push(game);
    }
    total++;
    if (batch.length >= 20 || (batch.length && (includePgn && total === 1 || performance.now() - published > 100))) {
      checkImport(signal);
      await onBatch?.(batch); batch = [];
      published = performance.now();
      onProgress?.({done: total, total: null});
    }
  }
  if (batch.length) await onBatch?.(batch);
  onProgress?.({done: total, total, complete: true});
  return total;
}
