// Player profile — tier 0 feature extraction. One finished game in, one compact
// feature row out. Pure: no storage, no network, no engine. Every number here is
// derived from the move list, the clocks and the game record alone, so a few
// thousand games replay in seconds.
import {Chess} from '../chess.js';

export const FEATURE_VERSION = 1;
/** Upper bounds (seconds) of the move-time buckets in `row.tb`; the last bucket is everything slower. */
export const THINK_BUCKETS = [1, 2, 3, 5, 10, 20, 30];
export const thinkBucket = seconds => { const i = THINK_BUCKETS.findIndex(limit => seconds < limit); return i < 0 ? THINK_BUCKETS.length : i; };
/**
 * Bullet's finer buckets in `row.tf`. Both sites record clocks to a tenth of a
 * second or better; a move that took at most PREMOVE seconds was premoved (or
 * played instantly). The last bucket is 10 seconds and slower.
 */
export const PREMOVE = 0.1;
export const BULLET_BUCKETS = [PREMOVE, 0.5, 1, 2, 3, 5, 10];
export const bulletBucket = seconds => {
  if (seconds <= PREMOVE + 1e-6) return 0;
  const i = BULLET_BUCKETS.findIndex((limit, n) => n && seconds < limit);
  return i < 0 ? BULLET_BUCKETS.length : i;
};
/**
 * Upper bounds (seconds) of the fine move-time histogram in `row.tg`, behind the
 * profile's "Increase granularity" switch: tenths of a second up to two seconds,
 * then seconds up to ten, then wider steps. Bucket 0 is a premove (PREMOVE
 * seconds or less); the last bucket is two minutes and slower. Every edge of
 * THINK_BUCKETS and BULLET_BUCKETS is one of these, so the fine view always
 * splits the coarse columns.
 */
export const GRAIN_EDGES = [...Array.from({length: 20}, (_, i) => (i + 1) / 10), 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 40, 50, 60, 90, 120];
export const grainBucket = seconds => {
  // Clock differences carry float noise (60 − 59.8 is 0.2000…03); thousandths are exact enough.
  const s = Math.round(seconds * 1000) / 1000;
  if (s <= PREMOVE) return 0;
  const i = GRAIN_EDGES.findIndex((limit, n) => n && s < limit);
  return i < 0 ? GRAIN_EDGES.length : i;
};
/** Rows replayed before move-time buckets existed: their games have clocks but no `tb` (bullet: no `tf`), or no fine `tg`. */
export const needsThinkBuckets = row => !!row && row.thinkN > 0 && (!Array.isArray(row.tb) || !Array.isArray(row.tg) || row.cls === 'bullet' && !Array.isArray(row.tf));
/** Rows replayed before the mate-in-one count (or the missed position, for the puzzles) existed. */
export const needsMateInOne = row => !!row && (!Number.isFinite(row.m1) || row.m1Missed > 0 && !row.m1Fen);
/** Rows the collector replays once more to fill in what newer versions count. */
export const needsReplay = row => needsThinkBuckets(row) || needsMateInOne(row);

/**
 * Whether the side to move can checkmate at once. Runs at every one of the
 * player's moves in every game, so it walks the vendored chess.js internals:
 * pseudo-legal moves, and the full legality test only for a move that gives
 * check. That is several times faster than asking for each move's SAN (which
 * marks mates with #), the fallback should the internals ever change.
 */
export function hasMateInOne(chess) {
  if (typeof chess._moves !== 'function' || typeof chess._makeMove !== 'function' || typeof chess._isKingAttacked !== 'function') return chess.moves().some(san => san.endsWith('#'));
  const us = chess.turn(), them = us === 'w' ? 'b' : 'w';
  for (const move of chess._moves({legal: false})) {
    chess._makeMove(move);
    const mate = chess._isKingAttacked(them) && !chess._isKingAttacked(us) && chess._moves().length === 0;
    chess._undoMove();
    if (mate) return true;
  }
  return false;
}
const VALUE = {p: 1, n: 3, b: 3, r: 5, q: 9, k: 0};
const FILES = 'abcdefgh';
export const SQUARES = [];
for (let rank = 1; rank <= 8; rank++) for (const file of FILES) SQUARES.push(file + rank);
export const squareIndex = square => FILES.indexOf(square[0]) + (Number(square[1]) - 1) * 8;

/** Parse "180+2", "600", "1/86400" (daily) into {base, inc} seconds or null. */
export function parseTimeControl(value) {
  const m = /^(\d+)(?:\+(\d+))?$/.exec(String(value || '').trim());
  if (!m) return null;
  return {base: Number(m[1]), inc: Number(m[2] || 0)};
}

function encodeHeat(counts) {
  let out = '';
  for (const count of counts) out += Math.min(35, count).toString(36);
  return out;
}
export function decodeHeat(text) {
  const counts = new Array(64).fill(0);
  if (typeof text !== 'string') return counts;
  for (let i = 0; i < 64 && i < text.length; i++) counts[i] = parseInt(text[i], 36) || 0;
  return counts;
}

function kingSquare(chess, color) {
  const board = chess.board();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const piece = board[r][c];
    if (piece && piece.type === 'k' && piece.color === color) return FILES[c] + (8 - r);
  }
  return null;
}
function neighbours(square) {
  const file = FILES.indexOf(square[0]), rank = Number(square[1]);
  const out = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const f = file + df, r = rank + dr;
    if (f >= 0 && f < 8 && r >= 1 && r <= 8) out.push(FILES[f] + r);
  }
  return out;
}

/**
 * Name the mating pattern of a finished checkmate. `last` is the verbose mating
 * move. Returns one of back-rank, smothered, ladder, queen-kiss, rook-knight,
 * discovered, other.
 */
export function matePattern(chess, last) {
  const loser = chess.turn(), winner = loser === 'w' ? 'b' : 'w';
  const king = kingSquare(chess, loser);
  if (!king) return 'other';
  const piece = last.promotion || last.piece;
  const kingRank = Number(king[1]), backRank = loser === 'w' ? 1 : 8;
  const attackers = chess.attackers(king, winner);
  const direct = attackers.includes(last.to);
  if (!direct && attackers.length) return 'discovered';
  if (piece === 'n' && neighbours(king).every(sq => { const p = chess.get(sq); return p && p.color === loser; })) return 'smothered';
  if (piece === 'q' && neighbours(king).includes(last.to)) return 'queen-kiss';
  if ((piece === 'r' || piece === 'q') && kingRank === backRank && Number(last.to[1]) === backRank) {
    const forward = loser === 'w' ? 1 : -1;
    const front = [-1, 0, 1].map(df => { const f = FILES.indexOf(king[0]) + df; return f >= 0 && f < 8 ? FILES[f] + (kingRank + forward) : null; }).filter(Boolean);
    if (front.every(sq => { const p = chess.get(sq); return p && p.color === loser; })) return 'back-rank';
  }
  if (piece === 'r' || piece === 'q') {
    const edge = kingRank === 1 || kingRank === 8 || king[0] === 'a' || king[0] === 'h';
    const heavy = [];
    chess.board().forEach((row, r) => row.forEach((p, c) => { if (p && p.color === winner && (p.type === 'r' || p.type === 'q')) heavy.push(FILES[c] + (8 - r)); }));
    const sameLine = (a, b) => a[0] === b[0] || a[1] === b[1];
    if (edge && heavy.length >= 2 && heavy.some(sq => sq !== last.to && !sameLine(sq, last.to)
      && (Math.abs(Number(sq[1]) - Number(last.to[1])) === 1 || Math.abs(FILES.indexOf(sq[0]) - FILES.indexOf(last.to[0])) === 1))) return 'ladder';
    const knights = [];
    chess.board().forEach((row, r) => row.forEach((p, c) => { if (p && p.color === winner && p.type === 'n') knights.push(FILES[c] + (8 - r)); }));
    if (piece === 'r' && knights.some(sq => Math.abs(FILES.indexOf(sq[0]) - FILES.indexOf(king[0])) <= 2 && Math.abs(Number(sq[1]) - kingRank) <= 2)) return 'rook-knight';
  }
  return 'other';
}

/**
 * Extract the feature row for one game. `game` is the normalised record from
 * sources.js; `account` is the lower-cased username whose profile this is.
 * Returns null when the game is not usable (variant, no moves, not this player).
 */
export function gameFeatures(game, account) {
  if (!game || !Array.isArray(game.moves) || game.moves.length < 2) return null;
  if (game.variant && game.variant !== 'standard') return null;
  const name = String(account || '').toLowerCase();
  const white = String(game.white?.name || '').toLowerCase(), black = String(game.black?.name || '').toLowerCase();
  const me = white === name ? 'w' : black === name ? 'b' : null;
  if (!me) return null;
  const opp = me === 'w' ? game.black : game.white, mine = me === 'w' ? game.white : game.black;
  const chess = new Chess();
  const mat = {w: 39, b: 39}, queens = {w: 1, b: 1}, bishops = {w: 2, b: 2}, pieces = {w: 7, b: 7};
  const heat = new Array(64).fill(0);
  const control = parseTimeControl(game.timeControl);
  const remaining = {w: control?.base ?? null, b: control?.base ?? null};
  const clocks = Array.isArray(game.clocks) ? game.clocks : [];
  const row = {
    v: FEATURE_VERSION, id: String(game.id), site: game.site, url: game.url || '', t: game.endTime || null,
    cls: game.timeClass || 'unknown', tc: game.timeControl || '', rated: !!game.rated, me,
    opp: opp?.name || '?', oppRating: Number(opp?.rating) || null, myRating: Number(mine?.rating) || null,
    res: game.result === 'd' ? 'd' : game.result === me ? 'w' : 'l', term: game.termination || 'other',
    eco: game.eco || '', op: game.opening || '', bot: !!game.bot, n: 0, myMoves: 0,
    knights4: false, castle: 0, castleSide: null, oppCastleSide: null, fian: false, qtrade: 0, qEarly: false,
    gambit: false, storm: false, pair25: false, ep: 0, promo: 0, under: 0, checks: 0, caps: 0,
    mateBy: null, matePattern: null, matedBy: null, m1: 0, m1Missed: 0, m1Ply: 0, m1Fen: '',
    matMin: 0, matMax: 0, matFinal: 0, lowPly: 0, highPly: 0, swings: 0, endgame: 0,
    think: null, thinkN: 0, snap: 0, tb: null, tf: null, longThink: null, longPly: 0, trouble: false, ahead: null,
    dur: null, line: '', first: '', fenEnd: '', fenMid: '', fenLow: '', fenHigh: '', heat: '',
  };
  let knightsOut = 0, balance = 0, swingState = 0, thinkSum = 0, aheadCount = 0, aheadSamples = 0;
  let bal20 = null, minBal20 = 0;
  const myFirst = [], midPly = Math.round(game.moves.length * .6);
  // Mate in one: each of the player's turns where a mate was on the board (the earliest is Black's second move).
  // The first one missed keeps its position, for the profile's mate-in-one puzzles.
  const mateChance = ply => ply >= 3 && (ply % 2 ? 'b' : 'w') === me && hasMateInOne(chess);
  const missedMate = (ply, fen) => { row.m1Missed++; if (!row.m1Ply) { row.m1Ply = ply + 1; row.m1Fen = fen; } };
  for (let ply = 0; ply < game.moves.length; ply++) {
    const chance = mateChance(ply), before = chance ? chess.fen() : '';
    let move;
    try { move = chess.move(game.moves[ply]); } catch { return null; }
    if (!move) return null;
    if (chance) { row.m1++; if (!move.san.endsWith('#')) missedMate(ply, before); }
    const color = move.color, own = color === me, moveNo = Math.floor(ply / 2) + 1;
    if (ply < 12) row.line += (row.line ? ' ' : '') + move.san;
    if (move.captured) {
      const victim = color === 'w' ? 'b' : 'w';
      mat[victim] -= VALUE[move.captured];
      if (move.captured === 'q') queens[victim]--;
      if (move.captured === 'b') bishops[victim]--;
      if (move.captured !== 'p') pieces[victim]--;
    }
    if (move.promotion) {
      mat[color] += VALUE[move.promotion] - 1; pieces[color]++;
      if (move.promotion === 'q') queens[color]++;
      if (move.promotion === 'b') bishops[color]++;
    }
    balance = mat[me] - mat[me === 'w' ? 'b' : 'w'];
    if (ply + 1 === midPly) row.fenMid = chess.fen();
    if (balance < row.matMin) { row.matMin = balance; row.lowPly = ply + 1; row.fenLow = chess.fen(); }
    if (balance > row.matMax) { row.matMax = balance; row.highPly = ply + 1; row.fenHigh = chess.fen(); }
    if (balance >= 2 && swingState <= 0) { if (swingState < 0) row.swings++; swingState = 1; }
    else if (balance <= -2 && swingState >= 0) { if (swingState > 0) row.swings++; swingState = -1; }
    if (ply === 19) { bal20 = balance; }
    if (ply < 20) minBal20 = Math.min(minBal20, balance);
    if (!row.endgame && pieces.w + pieces.b <= 6) row.endgame = ply + 1;
    if (!row.qtrade && queens.w === 0 && queens.b === 0) row.qtrade = moveNo;
    if (own) {
      row.myMoves++;
      if (myFirst.length < 2) myFirst.push(move.san);
      heat[squareIndex(move.to)]++;
      if (move.isCapture()) row.caps++;
      if (/[+#]$/.test(move.san)) row.checks++;
      if (move.isEnPassant()) row.ep++;
      if (move.promotion) { row.promo++; if (move.promotion !== 'q') row.under++; }
      if (move.piece === 'n' && moveNo <= 4 && /^[bg][18]$/.test(move.from)) knightsOut++;
      if (move.isKingsideCastle() || move.isQueensideCastle()) { row.castle = moveNo; row.castleSide = move.isKingsideCastle() ? 'k' : 'q'; }
      if (move.piece === 'b' && moveNo <= 15 && (me === 'w' ? /^[bg]2$/ : /^[bg]7$/).test(move.to)) row.fian = true;
      if (move.piece === 'q' && moveNo <= 5) row.qEarly = true;
      if (move.piece === 'p' && /^[gh]$/.test(move.to[0]) && (me === 'w' ? Number(move.to[1]) >= 5 : Number(move.to[1]) <= 4) && row.oppCastleSide === 'k') row.storm = true;
    } else if (move.isKingsideCastle() || move.isQueensideCastle()) row.oppCastleSide = move.isKingsideCastle() ? 'k' : 'q';
    if (ply === 49 && bishops[me] === 2) row.pair25 = true;
    const clock = clocks[ply];
    if (Number.isFinite(clock)) {
      const before = remaining[color];
      if (own && before != null && control) {
        const think = before + control.inc - clock;
        if (think >= 0 && think <= before + control.inc) {
          thinkSum += think; row.thinkN++;
          if (think < 5) row.snap++;
          (row.tb ||= new Array(THINK_BUCKETS.length + 1).fill(0))[thinkBucket(think)]++;
          if (row.cls === 'bullet') (row.tf ||= new Array(BULLET_BUCKETS.length + 1).fill(0))[bulletBucket(think)]++;
          (row.tg ||= new Array(GRAIN_EDGES.length + 1).fill(0))[grainBucket(think)]++;
          if (row.longThink == null || think > row.longThink) { row.longThink = think; row.longPly = ply + 1; }
        }
        if (before < Math.max(10, control.base / 10)) row.trouble = true;
      }
      remaining[color] = clock;
      if (ply % 2 === 1 && Number.isFinite(clocks[ply - 1])) {
        const w = color === 'w' ? clock : clocks[ply - 1], b = color === 'b' ? clock : clocks[ply - 1];
        aheadSamples++;
        if ((me === 'w' ? w : b) > (me === 'w' ? b : w)) aheadCount++;
      }
    }
  }
  row.n = game.moves.length;
  // The game stopped on the player's turn (time, resignation, a draw) with a mate on the board: missed too.
  if (!chess.isGameOver() && mateChance(row.n)) { row.m1++; missedMate(row.n, chess.fen()); }
  // Most of the fine histogram is empty past a game's slowest move; stored rows stay small.
  if (row.tg) { let used = row.tg.length; while (used && !row.tg[used - 1]) used--; row.tg.length = used; }
  row.knights4 = knightsOut >= 2;
  row.gambit = bal20 != null && bal20 <= -1 && bal20 >= -2 && minBal20 >= -2;
  row.matFinal = balance;
  row.fenEnd = chess.fen();
  row.first = myFirst.join(' ');
  row.heat = encodeHeat(heat);
  if (row.thinkN) row.think = thinkSum / row.thinkN;
  if (aheadSamples) row.ahead = aheadCount / aheadSamples;
  const last = chess.history({verbose: true}).at(-1);
  if (chess.isCheckmate() && last) {
    const pattern = matePattern(chess, last), piece = last.promotion || last.piece;
    if (last.color === me) { row.mateBy = piece; row.matePattern = pattern; row.term = 'mate'; }
    else { row.matedBy = piece; row.term = 'mate'; }
  }
  if (game.startTime && game.endTime && game.endTime > game.startTime && game.endTime - game.startTime < 86400) row.dur = game.endTime - game.startTime;
  else if (control && control.base > 0 && remaining.w != null && remaining.b != null && row.cls !== 'daily' && row.cls !== 'correspondence') {
    const spent = 2 * control.base + control.inc * row.n - remaining.w - remaining.b;
    if (spent > 0 && spent < 86400) row.dur = spent;
  }
  return row;
}

/** Sanity-check a stored row (schema drift, corruption) before using it. */
export function validRow(row) {
  return !!row && row.v === FEATURE_VERSION && typeof row.id === 'string' && (row.me === 'w' || row.me === 'b')
    && ['w', 'l', 'd'].includes(row.res) && Number.isFinite(row.n) && typeof row.heat === 'string';
}
