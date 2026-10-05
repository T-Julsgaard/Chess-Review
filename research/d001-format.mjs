// D001 sampler from 17a0e9443776d6089364f34ab9327922e38a9cb7.
// The historical algorithm below is unchanged; acquisition is handled separately.
import {createHash} from 'node:crypto';
import {firstFrame} from './fresh-format.mjs';
import {Chess} from '../lib/chess.js';
import {assertDisjoint} from '../tools/calibration/core.mjs';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const historicalRevision = '17a0e9443776d6089364f34ab9327922e38a9cb7';

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
export function selectGames(reservoirs, count, seed, excludedGames=[]) {
  if (count % 100) throw Error('Game count must be a multiple of 100 for exact 70/15/15 splits in five bands');
  const perBand = count / 5, used = new Set(excludedGames.flatMap(g=>g.players.map(p=>p.id))), sites = new Set(excludedGames.map(g=>g.source)), games = [];
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

export const seed = 'overnight-sf18-v1';
export const pinnedFiles = [
  'research/d001-format.mjs',
  'research/datasets/D001-public-baseline/reconstruct.mjs',
  'research/fresh-format.mjs',
  'lib/chess.js', 'tools/calibration/core.mjs',
];
export const codeHash = bytes => hash(bytes.toString('utf8').replace(/\r\n/g, '\n'));

export function decodeFragment(raw, frame) {
  if (raw.length !== frame.bytes || hash(raw) !== frame.sha256) throw Error('Fragment hash/size differs');
  if (raw.length > 8 * 1024 * 1024) throw Error('Fragment exceeds size bound');
  let compressed = raw;
  if (raw.readUInt32LE(0) === 0x184d2a50) {
    if (raw.length < 16 || raw.readUInt32LE(4) !== 4 || raw.readUInt32LE(8) + 12 !== raw.length)
      throw Error('Invalid historical PZstandard fragment');
    compressed = raw.subarray(12);
  }
  const parsed = firstFrame(compressed);
  if (!parsed || parsed.start !== 0 || parsed.frame.length !== compressed.length || parsed.decoded.length > 32 * 1024 * 1024)
    throw Error('Incomplete/oversized historical Zstandard fragment');
  return parsed.decoded;
}

export function createReconstruction() {
  return {reservoirs: Array.from({length: 5}, () => new Reservoir(3200)),
    frames: [], completeRecords: 0, eligibleHeaders: 0};
}

export function scanFragment(state, decoded, month, frameIndex, frame) {
  const text = decoded.toString('utf8'), starts = [...text.matchAll(/^\[Event /gm)].map(m => m.index);
  if (!Buffer.from(text, 'utf8').equals(decoded)) throw Error('Invalid fragment UTF-8');
  let byteStart = Buffer.byteLength(text.slice(0, starts[0] ?? 0), 'utf8');
  let records = 0;
  for (let i = 0; i + 1 < starts.length; i++) {
    // Copy to avoid retaining a whole 32 MiB decoded string for each reservoir row.
    const pgn = Buffer.from(text.slice(starts[i], starts[i + 1]), 'utf8').toString('utf8');
    const bytes = Buffer.byteLength(pgn, 'utf8'), c = candidate(pgn, seed);
    records++; state.completeRecords++;
    if (c) {
      state.eligibleHeaders++;
      state.reservoirs[c.band].add({...c, month,
        locator: {month, frame: frameIndex, start: byteStart, end: byteStart + bytes, sha256: hash(pgn)}});
    }
    byteStart += bytes;
  }
  state.frames.push({month, frame: frameIndex, compressedSha256: frame.sha256,
    decodedSha256: hash(decoded), decodedBytes: decoded.length, completeRecords: records});
}

export function finishReconstruction(state, expected, sources, inputHashes) {
  const rebuilt = selectGames(state.reservoirs, 2000, seed);
  const jsonlSha256 = hash(rebuilt.games.map(g => JSON.stringify(g)).join('\n') + '\n');
  if (JSON.stringify(rebuilt.games) !== JSON.stringify(expected) || jsonlSha256 !== sources.datasetSha256)
    throw Error('Reconstructed normalization, selection or splits differ');
  const games = rebuilt.games.map(game => {
    const matches = state.reservoirs.flatMap(r => r.rows).filter(c => c.h.Site === game.source);
    if (matches.length !== 1) throw Error('Missing/ambiguous raw game locator');
    return {gameId: game.id, ...matches[0].locator};
  });
  const locators = {schema: 'd001-raw-locators-v1', inputHashes, entries: games};
  const result = {schema: 'd001-reconstruction-v1', passed: true, seed, historicalRevision,
    inputHashes, frames: state.frames, completeRecords: state.completeRecords,
    eligibleHeaders: state.eligibleHeaders, games: rebuilt.games.length,
    splits: Object.fromEntries(['train', 'validation', 'test'].map(s => [s, rebuilt.games.filter(g => g.split === s).length])),
    rejectionCounts: rebuilt.counts, normalizedJsonlSha256: jsonlSha256,
    locatorsDecodedSha256: hash(JSON.stringify(locators) + '\n'),
    exactNormalizedRebuild: true, individualRawMembership: true, engineSearches: 0, modelFits: 0};
  return {result, locators};
}

// Admission verifies the retained reconstruction and locator bindings offline.
// Actual raw membership/selection is rechecked by reconstruct.mjs over cached or downloaded fragments.
export function validateReconstruction(manifest, records, hashes) {
  const p = manifest.provenance.reconstruction, record = records.get(p.record), locators = records.get(p.locators);
  const sources = records.get(manifest.sourceRecord), games = records.get(manifest.normalized), r = record?.result;
  const inputs = Object.fromEntries([manifest.sourceRecord, manifest.normalized].map(n => [n, hashes[n]]));
  if (!r?.passed || r.schema !== 'd001-reconstruction-v1' || r.seed !== seed || r.historicalRevision !== historicalRevision
      || !r.exactNormalizedRebuild || !r.individualRawMembership || r.engineSearches !== 0 || r.modelFits !== 0
      || JSON.stringify(record.codeSha256) !== JSON.stringify(p.codeSha256)
      || JSON.stringify(r.inputHashes) !== JSON.stringify(inputs) || JSON.stringify(locators?.inputHashes) !== JSON.stringify(inputs)
      || locators.schema !== 'd001-raw-locators-v1' || r.locatorsDecodedSha256 !== hash(JSON.stringify(locators) + '\n')
      || r.games !== games.length || games.length !== 2000 || locators.entries.length !== games.length
      || JSON.stringify(r.splits) !== JSON.stringify({train: 1400, validation: 300, test: 300})
      || r.normalizedJsonlSha256 !== sources.datasetSha256
      || hash(games.map(g => JSON.stringify(g)).join('\n') + '\n') !== r.normalizedJsonlSha256)
    throw Error('D001 reconstruction binding differs');
  if (sources.sources.map(s => s.month).join() !== '2026-06,2026-07,2026-08'
      || sources.sources.some(s => s.frames.length !== 20) || r.frames.length !== 60)
    throw Error('D001 reconstruction frame coverage differs');
  const frames = new Map();
  for (const s of sources.sources) s.frames.forEach((f, i) => {
    const key = s.month + ':' + i, row = r.frames.find(x => x.month + ':' + x.frame === key);
    if (!row || row.compressedSha256 !== f.sha256 || !/^[a-f0-9]{64}$/.test(row.decodedSha256)
        || !Number.isSafeInteger(row.decodedBytes) || row.decodedBytes < 1 || row.decodedBytes > 32 * 1024 * 1024
        || !Number.isSafeInteger(row.completeRecords) || row.completeRecords < 1)
      throw Error('D001 reconstruction frame binding differs');
    frames.set(key, row);
  });
  const ids = new Set();
  for (let i = 0; i < games.length; i++) {
    const g = games[i], l = locators.entries[i], f = frames.get(l.month + ':' + l.frame);
    if (l.gameId !== g.id || ids.has(l.gameId) || l.month !== g.sourceMonth || !f
        || !Number.isSafeInteger(l.start) || !Number.isSafeInteger(l.end)
        || l.start < 0 || l.end <= l.start || l.end > f.decodedBytes || !/^[a-f0-9]{64}$/.test(l.sha256))
      throw Error('D001 raw locator binding differs');
    ids.add(l.gameId);
  }
  if (frames.size !== 60 || r.completeRecords !== r.frames.reduce((sum, f) => sum + f.completeRecords, 0))
    throw Error('D001 reconstruction counts differ');
  return true;
}
