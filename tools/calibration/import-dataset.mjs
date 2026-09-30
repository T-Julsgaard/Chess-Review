import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { decompressArchive } from './zstd.mjs';
import path from 'node:path';
import { Chess } from '../../lib/chess.js';
import { args, integer, hash, save } from './io.mjs';
import { assertDisjoint } from './core.mjs';

const o = args({ out: 'calibration-runs/smoke/dataset', games: '24', seed: 'independent-pilot-v1',
  input: null, source: null, sha256: null, category: 'blitz', 'rating-min': '600', 'rating-max': '3000' });
const count = integer(o.games, 'games', 8, 20000);
const low = integer(o['rating-min'], 'rating-min'), high = integer(o['rating-max'], 'rating-max');
if (low >= high || !['blitz', 'rapid'].includes(o.category)) throw Error('Invalid rating range/category');
await mkdir(o.out, { recursive: true });
try { await access(path.join(o.out, 'manifest.json')); throw Error('Dataset already frozen; use another output directory'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
const url = o.source || 'https://database.lichess.org/standard/lichess_db_standard_rated_2013-01.pgn.zst';
if (!/^https:\/\/database\.lichess\.org\/standard\/lichess_db_standard_rated_\d{4}-\d{2}\.pgn\.zst$/.test(url))
  throw Error('Only documented Lichess CC0 monthly standard exports are supported; other sources need a provenance adapter');
const checksum = o.sha256 || (!o.input && !o.source ? 'aa40b3671fa3cf1072eb182892cd90b0e1e003a4a5943492f64b77e7f3fd1635' : null);
if (!checksum || (o.input && !o.source)) throw Error('Custom imports require --source and --sha256');
let bytes;
if (o.input) bytes = await readFile(o.input);
else {
  console.log(`Downloading CC0 archive: ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw Error(`Download HTTP ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
if (hash(bytes) !== checksum) throw Error('Archive checksum mismatch');
await writeFile(path.join(o.out, 'source' + ((o.input || url).endsWith('.zst') ? '.pgn.zst' : '.pgn')), bytes);
const text = ((o.input || url).endsWith('.zst') ? decompressArchive(bytes) : bytes).toString('utf8');
const records = text.split(/(?=^\[Event )/m).filter(p => p.startsWith('[Event '));
const counts = { archiveGames: records.length, eligibleHeaders: 0, invalidPgn: 0, sharedPlayer: 0, duplicateGame: 0 };
const candidates = [];
for (const pgn of records) {
  const headers = Object.fromEntries([...pgn.matchAll(/^\[(\w+) "([^"\r\n]*)"\]/gm)].map(m => [m[1], m[2]]));
  const h = headers;
  const ratings = [h.WhiteElo, h.BlackElo].map(Number);
  const ids = [h.White, h.Black].map(x => x?.toLowerCase());
  const tc = /^(\d+)\+(\d+)$/.exec(h.TimeControl || '');
  const seconds = tc ? Number(tc[1]) + 40 * Number(tc[2]) : NaN;
  const category = seconds >= 180 && seconds < 480 ? 'blitz' : seconds >= 480 && seconds < 1500 ? 'rapid' : 'other';
  if (!/^Rated /.test(h.Event) || category !== o.category || h.FEN || h.SetUp ||
    (h.Variant && h.Variant !== 'Standard') || [h.WhiteTitle, h.BlackTitle].includes('BOT') ||
    ids.some(x => !x || x === 'anonymous') || ids[0] === ids[1] ||
    ratings.some(r => !Number.isInteger(r) || r < low || r > high) ||
    !['1-0', '0-1', '1/2-1/2'].includes(h.Result) || !/^https:\/\/lichess.org\/[\w-]+$/.test(h.Site || '')) continue;
  counts.eligibleHeaders++;
  const band = Math.min(3, Math.max(0, Math.floor(((ratings[0] + ratings[1]) / 2 - 800) / 400)));
  candidates.push({ pgn, h, ids, ratings, band, order: hash(o.seed + ':' + h.Site) });
}
candidates.sort((a, b) => a.order.localeCompare(b.order));
const queues = [0, 1, 2, 3].map(b => candidates.filter(c => c.band === b));
const offsets = [0, 0, 0, 0], used = new Set(), sites = new Set(), games = [];
while (games.length < count) {
  let advanced = false;
  for (let band = 0; band < 4 && games.length < count; band++) {
    while (offsets[band] < queues[band].length) {
      advanced = true;
      const c = queues[band][offsets[band]++];
      if (sites.has(c.h.Site)) { counts.duplicateGame++; continue; }
      if (c.ids.some(id => used.has(id))) { counts.sharedPlayer++; continue; }
      // Strip nested variations, comments, NAGs and annotation punctuation before parsing.
      let body = c.pgn.replace(/^\[.*\]\s*$/gm, '').replace(/\{[^}]*\}/gs, ' ').replace(/;[^\n]*/g, ' ');
      while (/\([^()]*\)/s.test(body)) body = body.replace(/\([^()]*\)/gs, ' ');
      body = body.replace(/\$\d+/g, ' ').replace(/[!?]/g, '');
      let history;
      try { const chess = new Chess(); chess.loadPgn(body); history = chess.history({ verbose: true }); }
      catch { counts.invalidPgn++; continue; }
      if (history.length < 20) continue;
      const index = Math.floor(games.length / 4);
      const groups = Math.ceil(count / 4);
      const split = index < Math.floor(groups * .6) ? 'train' : index < Math.floor(groups * .8) ? 'validation' : 'test';
      games.push({ id: c.h.Site.split('/').pop(), source: c.h.Site, band, split,
        players: c.ids.map((id, i) => ({ id, rating: c.ratings[i], color: i ? 'b' : 'w' })),
        result: c.h.Result, timeControl: c.h.TimeControl, category: o.category,
        date: c.h.UTCDate || c.h.Date, moves: history.map(m => m.from + m.to + (m.promotion || '')) });
      c.ids.forEach(id => used.add(id)); sites.add(c.h.Site); break;
    }
  }
  if (!advanced) break;
}
if (games.length !== count) throw Error(`Insufficient disjoint legal games: ${games.length}/${count}`);
assertDisjoint(games);
const data = games.map(g => JSON.stringify(g)).join('\n') + '\n';
await writeFile(path.join(o.out, 'games.jsonl'), data);
await save(path.join(o.out, 'manifest.json'), { schemaVersion: 1, generatedAt: new Date().toISOString(),
  source: url, license: 'CC0-1.0', licenseDocumentation: 'https://database.lichess.org/',
  archiveSha256: checksum, gamesSha256: hash(data), seed: o.seed, category: o.category,
  purpose: 'plumbing pilot; historical data not validated for modern rating estimation',
  selection: 'seeded full-archive hash ranking, round-robin average-rating bands, globally unique players',
  bands: ['below 1200', '1200-1599', '1600-1999', '2000+'], ratingRange: [low, high],
  counts, selectedGames: games.length, uniquePlayers: used.size,
  splitCounts: Object.fromEntries(['train', 'validation', 'test'].map(s => [s, games.filter(g => g.split === s).length])),
  oldCalibrationUsedForTraining: false, externalReviewScoresUsed: false, nodeVersion: process.version });
console.log(JSON.stringify({ selected: games.length, counts, bands: queues.map((_, b) => games.filter(g => g.band === b).length) }));
