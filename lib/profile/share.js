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

/** Keep only what the deck renders; nothing identifying beyond the public username. */
export function trimReport(report) {
  const {library: _library, ...rest} = report;
  const trimmed = structuredClone(rest);
  if (trimmed.opponents?.top) trimmed.opponents.top = trimmed.opponents.top.slice(0, 3);
  if (trimmed.signature?.all) delete trimmed.signature.all;
  if (trimmed.twin?.ranking) trimmed.twin.ranking = trimmed.twin.ranking.slice(0, 3).map(({reasons: _r, ...a}) => a);
  if (trimmed.twin?.tendencies) delete trimmed.twin.tendencies;
  for (const cls of Object.keys(trimmed.ratings || {})) trimmed.ratings[cls].series = trimmed.ratings[cls].series.slice(-40);
  // The other site's rating is only ever drawn as a line beside the main one.
  for (const cls of Object.keys(trimmed.otherRatings || {})) trimmed.otherRatings[cls] = {series: trimmed.otherRatings[cls].series.slice(-40)};
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
/** A shared report is untrusted data: cap sizes and keep only platform game links. */
export function sanitizeReport(report) {
  const out = structuredClone(report);
  // The intro mosaic packs one character per game into long strings; mosaicRows (game-map.js) checks it on its own.
  const {mosaic} = out; delete out.mosaic;
  out.account = safeText(out.account, 40); out.site = ['lichess', 'both'].includes(out.site) ? out.site : 'chesscom';
  out.periodLabel = safeText(out.periodLabel, 40);
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 8) return;
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
