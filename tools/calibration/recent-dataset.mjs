import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from '../../lib/chess.js';
import { decompressArchive } from './zstd.mjs';
import { args, integer, hash, hashFile, json, save, codeIdentity } from './io.mjs';
import { assertDisjoint } from './core.mjs';

export const ratingBands = [[600, 1000], [1000, 1400], [1400, 1800], [1800, 2200], [2200, 10000]];
export const ratingBand = rating => ratingBands.findIndex(([lo, hi]) => rating >= lo && rating < hi);
export function frameHeader(buffer, start = 0) {
  for (let i = start; i + 16 <= buffer.length; i++) {
    if (buffer.readUInt32LE(i) === 0x184d2a50 && buffer.readUInt32LE(i + 4) === 4 &&
        buffer.readUInt32LE(i + 12) === 0xfd2fb528) {
      const size = buffer.readUInt32LE(i + 8);
      if (size > 0 && size <= 32 * 1024 * 1024) return { offset: i, size: size + 12 };
    }
  }
  throw Error('No PZstandard frame header in bounded window');
}
export class Reservoir {
  constructor(capacity) { this.capacity = capacity; this.rows = []; }
  add(row) {
    if (this.rows.length >= this.capacity && row.order >= this.rows.at(-1).order) return;
    let lo = 0, hi = this.rows.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (this.rows[mid].order < row.order) lo = mid + 1; else hi = mid; }
    this.rows.splice(lo, 0, row); if (this.rows.length > this.capacity) this.rows.pop();
  }
}
export function candidate(pgn, seed) {
  const h = Object.fromEntries([...pgn.matchAll(/^\[(\w+) "([^"\r\n]*)"\]/gm)].map(m => [m[1], m[2]]));
  const ratings = [Number(h.WhiteElo), Number(h.BlackElo)], ids = [h.White, h.Black].map(x => x?.toLowerCase());
  const tc = /^(\d+)\+(\d+)$/.exec(h.TimeControl || '');
  const seconds = tc ? Number(tc[1]) + 40 * Number(tc[2]) : NaN;
  if (!/^Rated Blitz\b/.test(h.Event || '') || seconds < 180 || seconds >= 480 || !Number.isFinite(seconds) ||
      h.FEN || h.SetUp || (h.Variant && h.Variant !== 'Standard') ||
      [h.WhiteTitle, h.BlackTitle].includes('BOT') || [h.WhiteElo, h.BlackElo].some(r => /\?/.test(r || '')) ||
      ids.some(id => !id || id === 'anonymous') || ids[0] === ids[1] || ratings.some(r => ratingBand(r) < 0) ||
      (h.Termination && !['Normal', 'Time forfeit'].includes(h.Termination)) ||
      !['1-0', '0-1', '1/2-1/2'].includes(h.Result) || !/^https:\/\/lichess.org\/\w{8}$/.test(h.Site || '')) return null;
  const order = hash(`${seed}:select:${h.Site}`), focal = parseInt(hash(`${seed}:focal:${h.Site}`).slice(0, 8), 16) % 2;
  return { pgn, h, ratings, ids, order, focal, band: ratingBand(ratings[focal]) };
}
export function legalMainline(pgn) {
  let body = pgn.replace(/^\[.*\]\s*$/gm, '').replace(/\{[^}]*\}/gs, ' ').replace(/;[^\n]*/g, ' ');
  while (/\([^()]*\)/s.test(body)) body = body.replace(/\([^()]*\)/gs, ' ');
  body = body.replace(/\$\d+/g, ' ').replace(/[!?]/g, '');
  if (/[{}()]/.test(body)) throw Error('Unbalanced PGN annotations');
  const chess = new Chess(); chess.loadPgn(body);
  return chess.history({ verbose: true }).map(m => m.from + m.to + (m.promotion || ''));
}
export function selectGames(reservoirs, count, seed) {
  if (count % 100) throw Error('Game count must be a multiple of 100 for exact 70/15/15 splits in five bands');
  const perBand = count / 5, used = new Set(), sites = new Set(), games = [];
  const counts = { invalid: 0, short: 0, sharedPlayer: 0, duplicate: 0 };
  for (let band = 0; band < 5; band++) {
    let accepted = 0;
    for (const c of reservoirs[band].rows) {
      if (accepted === perBand) break;
      if (sites.has(c.h.Site)) { counts.duplicate++; continue; }
      if (c.ids.some(id => used.has(id))) { counts.sharedPlayer++; continue; }
      let moves; try { moves = legalMainline(c.pgn); } catch { counts.invalid++; continue; }
      if (moves.length < 20) { counts.short++; continue; }
      const slot = accepted % 20, split = slot < 14 ? 'train' : slot < 17 ? 'validation' : 'test';
      games.push({ id: c.h.Site.split('/').pop(), source: c.h.Site, sourceMonth: c.month, band,
        focalColor: c.focal ? 'b' : 'w', split, order: hash(`${seed}:analysis:${c.h.Site}`),
        players: c.ids.map((id, i) => ({ id, rating: c.ratings[i], color: i ? 'b' : 'w' })),
        result: c.h.Result, timeControl: c.h.TimeControl, category: 'blitz', date: c.h.UTCDate || c.h.Date, moves });
      c.ids.forEach(id => used.add(id)); sites.add(c.h.Site); accepted++;
    }
    if (accepted !== perBand) throw Error(`Band ${band}: only ${accepted}/${perBand} disjoint legal games; increase --windows`);
  }
  // Balanced interleaving makes completed prefixes cover every band and both months.
  const balanced = [];
  for (const split of ['train', 'validation', 'test']) {
    const queues = [0, 1, 2, 3, 4].map(b => games.filter(g => g.split === split && g.band === b).sort((a, b) => a.order.localeCompare(b.order)));
    for (let i = 0; i < queues[0].length; i++) for (const queue of queues) balanced.push(queue[i]);
  }
  assertDisjoint(balanced); return { games: balanced, counts };
}
async function range(url, start, end) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(90000) });
      if (r.status !== 206) throw Error(`Range unsupported/HTTP ${r.status}`);
      const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(r.headers.get('content-range') || '');
      if (!match || Number(match[1]) !== start || Number(match[2]) !== end) throw Error('Unexpected range response');
      const bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length !== end - start + 1) throw Error('Truncated range response');
      return { bytes, total: Number(match[3]) };
    } catch (e) { if (attempt === 2) throw e; }
  }
}
async function main() {
  const o = args({ out: 'calibration-runs/overnight-2026-09-30/dataset', games: '2000', windows: '20',
    months: '2026-06,2026-07,2026-08', seed: 'overnight-sf18-v1' });
  const count = integer(o.games, 'games', 100, 20000), windows = integer(o.windows, 'windows', 1, 100);
  const months = o.months.split(',');
  if (months.some(m => !/^20\d{2}-(0[1-9]|1[0-2])$/.test(m))) throw Error('Invalid month');
  await mkdir(o.out, { recursive: true });
  try { await access(path.join(o.out, 'manifest.json')); const manifest = await json(path.join(o.out, 'manifest.json'));
    if (await hashFile(path.join(o.out, 'games.jsonl')) !== manifest.gamesSha256) throw Error('Frozen dataset checksum mismatch');
    if (manifest.seed !== o.seed || manifest.selectedGames !== count || JSON.stringify(manifest.sources.map(s => s.month)) !== JSON.stringify(months)) throw Error('Dataset options changed; choose new output');
    assertDisjoint((await readFile(path.join(o.out, 'games.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse));
    console.log('Using verified frozen recent dataset'); return; }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const reservoirs = Array.from({ length: 5 }, () => new Reservoir(count / 5 * 8));
  const sources = [], stats = { completeGamesScanned: 0, eligibleHeaders: 0, eligibleByBand: [0, 0, 0, 0, 0] };
  for (const month of months) {
    const url = `https://database.lichess.org/standard/lichess_db_standard_rated_${month}.pgn.zst`;
    const source = { url, month, license: 'CC0-1.0', fullArchiveChecksumVerified: false, frames: [] };
    const folder = path.join(o.out, 'frames', month); await mkdir(folder, { recursive: true });
    for (let w = 0; w < windows; w++) {
      const file = path.join(folder, `${w}.zst`), recordFile = path.join(folder, `${w}.json`);
      let bytes, record;
      try { bytes = await readFile(file); record = await json(recordFile); if (hash(bytes) !== record.sha256) throw Error('Cached frame hash mismatch'); }
      catch (e) {
        if (e.code !== 'ENOENT') throw e;
        if (!source.archiveBytes) source.archiveBytes = (await range(url, 0, 23)).total;
        const scanStart = Math.floor(source.archiveBytes * ((w + .25) / windows));
        const scanEnd = Math.min(source.archiveBytes - 1, scanStart + 8 * 1024 * 1024 - 1);
        const scan = await range(url, scanStart, scanEnd), header = frameHeader(scan.bytes);
        const start = scanStart + header.offset, end = start + header.size - 1;
        bytes = header.offset + header.size <= scan.bytes.length ? scan.bytes.subarray(header.offset, header.offset + header.size) : (await range(url, start, end)).bytes;
        record = { url, start, end, bytes: bytes.length, sha256: hash(bytes), archiveBytes: scan.total,
          retrievedAt: new Date().toISOString(), verification: 'TLS + exact HTTP range + local frame SHA256; not full archive checksum' };
        await writeFile(file, bytes); await save(recordFile, record);
      }
      source.archiveBytes = record.archiveBytes; source.frames.push(record);
      const text = decompressArchive(bytes).toString('utf8');
      // Arbitrary archive windows start/end inside games. Retain only fully bounded records.
      const starts = [...text.matchAll(/^\[Event /gm)].map(m => m.index);
      for (let i = 0; i + 1 < starts.length; i++) {
        const pgn = text.slice(starts[i], starts[i + 1]); stats.completeGamesScanned++;
        const c = candidate(pgn, o.seed);
        if (c) { stats.eligibleHeaders++; stats.eligibleByBand[c.band]++; reservoirs[c.band].add({ ...c, month }); }
      }
      console.log(`${month} window ${w + 1}/${windows}: ${stats.completeGamesScanned} games scanned; eligible bands ${stats.eligibleByBand.join('/')}`);
    }
    sources.push(source);
  }
  const { games, counts } = selectGames(reservoirs, count, o.seed);
  const data = games.map(g => JSON.stringify(g)).join('\n') + '\n'; await writeFile(path.join(o.out, 'games.jsonl'), data);
  await save(path.join(o.out, 'manifest.json'), { schemaVersion: 2, generatedAt: new Date().toISOString(),
    sources, license: 'CC0-1.0', licenseDocumentation: 'https://database.lichess.org/', gamesSha256: hash(data),
    seed: o.seed, category: 'blitz', selectedGames: games.length, uniquePlayers: games.length * 2,
    selection: 'bounded evenly spaced complete compressed frames per month; seeded rank reservoirs; focal-player bands; globally unique players',
    selectionLimitations: 'Temporal windows and equal rating quotas do not give a population-representative sample; no prevalence-weighted claims.',
    splitMethod: 'Preassigned 70/15/15 within each focal-player rating band; both sides together; no player appears twice anywhere',
    bands: ratingBands, stats, rejectionCounts: counts,
    provisionalRatings: 'Question-mark rating values excluded. Monthly PGNs do not reliably expose rating deviation/provisional flags; other provisional players cannot be reliably excluded.',
    headerExclusions: 'Non-rated/non-blitz, time control outside blitz, bots, nonstandard/FEN starts, missing/invalid ratings or identities, self-play, unfinished/abandoned results and invalid site IDs. Counts aggregated as scanned minus eligible; legal/short/shared-player attrition counted at selection.',
    splitCounts: Object.fromEntries(['train', 'validation', 'test'].map(s => [s, games.filter(g => g.split === s).length])),
    focalBandCounts: ratingBands.map((_, b) => games.filter(g => g.band === b).length),
    playerBandCounts: ratingBands.map((_, b) => games.flatMap(g => g.players).filter(p => ratingBand(p.rating) === b).length),
    nodeVersion: process.version, code: await codeIdentity(), oldCalibrationUsedForTraining: false, externalReviewScoresUsed: false });
  console.log(`Frozen ${games.length} recent games; final test reserved`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
