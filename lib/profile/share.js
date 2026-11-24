// Player profile — share payload. The payload is the trimmed report,
// deflated and base64url-encoded into a URL fragment. Fragments never reach a
// server, so a viewer page can decode it entirely in the browser.

export const SHARE_VERSION = 1;
export const VIEWER_URL = 'https://t-julsgaard.github.io/Chess-Review/profile/';

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = text => { const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4); return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); };
async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/**
 * A rating line cut to at most `max` points spread over its whole span, so a
 * shared chart still starts, peaks and ends where the chapter's figures say:
 * the first, last, highest and lowest points always stay.
 */
export function thinSeries(series, max = 40) {
  if (series.length <= max) return series;
  let top = 0, low = 0;
  series.forEach((p, i) => { if (p.r > series[top].r) top = i; if (p.r < series[low].r) low = i; });
  // Evenly spaced points from the first to the last, plus the peak and the low wherever they fall.
  const keep = new Set([top, low]), slots = max - 2, last = series.length - 1;
  for (let k = 0; k < slots; k++) keep.add(Math.round(k * last / (slots - 1)));
  return [...keep].sort((a, b) => a - b).map(i => series[i]);
}

/** Keep only what the deck renders; nothing identifying beyond the public username. */
export function trimReport(report) {
  const {library: _library, ...rest} = report;
  const trimmed = structuredClone(rest);
  if (trimmed.opponents?.top) trimmed.opponents.top = trimmed.opponents.top.slice(0, 3);
  if (trimmed.signature?.all) delete trimmed.signature.all;
  // Each time control's chapters (workspace.js classSlices) are trimmed the same way.
  if (trimmed.byClass) trimmed.byClass = Object.fromEntries(Object.entries(trimmed.byClass).map(([cls, slice]) => [cls, trimReport(slice)]));
  if (trimmed.twin?.ranking) trimmed.twin.ranking = trimmed.twin.ranking.slice(0, 3).map(({reasons: _r, ...a}) => a);
  if (trimmed.twin?.tendencies) delete trimmed.twin.tendencies;
  for (const cls of Object.keys(trimmed.ratings || {})) trimmed.ratings[cls].series = thinSeries(trimmed.ratings[cls].series);
  // The other site's rating is only ever drawn as a line beside the main one.
  for (const cls of Object.keys(trimmed.otherRatings || {})) trimmed.otherRatings[cls] = {series: thinSeries(trimmed.otherRatings[cls].series)};
  if (trimmed.habits?.bands) delete trimmed.habits.bands;
  if (trimmed.mateInOne?.misses) { trimmed.mateInOne.misses = trimmed.mateInOne.misses.slice(0, 10); trimmed.mateInOne.lastMiss = trimmed.mateInOne.misses[0] || null; }
  if (trimmed.engine?.daily) trimmed.engine.daily = trimmed.engine.daily.slice(-366);
  for (const color of ['w', 'b']) if (trimmed.openings?.[color]?.top) trimmed.openings[color].top = trimmed.openings[color].top.map(o => ({...o, line: o.line.split(' ').slice(0, 12).join(' ')}));
  return trimmed;
}

export async function encodeProfile(report) {
  const json = JSON.stringify({v: SHARE_VERSION, report: trimReport(report)});
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream !== 'function') return 'r' + b64url(bytes);
  return 'z' + b64url(await pipe(bytes, new CompressionStream('deflate-raw')));
}
export async function decodeProfile(text) {
  if (typeof text !== 'string' || text.length < 2 || text.length > 200000) throw new Error('Invalid profile link.');
  const kind = text[0], bytes = fromB64url(text.slice(1));
  const raw = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : kind === 'r' ? bytes : null;
  if (!raw) throw new Error('Invalid profile link.');
  const parsed = JSON.parse(new TextDecoder().decode(raw));
  if (!parsed || parsed.v !== SHARE_VERSION || !parsed.report || typeof parsed.report !== 'object') throw new Error('This profile link is from a different version.');
  return sanitizeReport(parsed.report);
}
const safeText = (value, max = 80) => typeof value === 'string' ? value.slice(0, max) : '';
const safeUrl = value => { try { const u = new URL(value); return /^(www\.)?(chess\.com|lichess\.org)$/.test(u.hostname) && u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
/** What one time control's chapters read (buildInsights' parts, and the season). */
const SLICE_KEYS = new Set(['games', 'humanGames', 'botGames', 'totals', 'openings', 'opponents', 'streaks', 'habits', 'terminations', 'mateInOne', 'clock', 'material', 'signature', 'engine', 'span', 'season']);
/** A shared report is untrusted data: cap sizes and keep only platform game links. */
export function sanitizeReport(report) {
  const out = structuredClone(report);
  // The intro mosaic packs one character per game into long strings; mosaicRows (game-map.js) checks it on its own.
  const {mosaic} = out; delete out.mosaic;
  out.site = ['lichess', 'both'].includes(out.site) ? out.site : 'chesscom';
  out.account = safeText(out.account, out.site === 'both' ? 63 : 40);
  out.periodLabel = safeText(out.periodLabel, 40);
  const {start, end} = out.customPeriod || {};
  if (out.period === 'custom' && typeof start === 'string' && typeof end === 'string') out.customPeriod = {start: safeText(start, 10), end: safeText(end, 10)};
  else delete out.customPeriod;
  // The time-control switch offers only the time controls the link brought chapters for (older links: none).
  const byClass = out.byClass && typeof out.byClass === 'object' && !Array.isArray(out.byClass) ? out.byClass : {};
  // A slice is laid over the report when its time control is picked, so it keeps only the chapters' own parts.
  out.byClass = Object.fromEntries(Object.entries(byClass).filter(([cls, slice]) => /^[a-z]{1,16}$/.test(cls) && slice && typeof slice === 'object' && !Array.isArray(slice))
    .map(([cls, slice]) => [cls, Object.fromEntries(Object.entries(slice).filter(([key]) => SLICE_KEYS.has(key)))]));
  out.classOptions = (Array.isArray(out.classOptions) ? out.classOptions : []).filter(cls => typeof cls === 'string' && out.byClass[cls]);
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 10) return; // byClass puts a time control's chapters two levels down
    for (const [key, value] of Object.entries(node)) {
      if (key === 'url') node[key] = safeUrl(value);
      else if (typeof value === 'string' && value.length > 400) node[key] = value.slice(0, 400);
      else if (value && typeof value === 'object') walk(value, depth + 1);
    }
  };
  walk(out);
  if (mosaic && typeof mosaic === 'object') out.mosaic = mosaic;
  return out;
}
export const profileLink = encoded => VIEWER_URL + '#p=' + encoded;
