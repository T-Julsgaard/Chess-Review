// Player profile — share payload and card. The payload is the trimmed report,
// deflated and base64url-encoded into a URL fragment. Fragments never reach a
// server, so a viewer page can decode it entirely in the browser.
export const SHARE_VERSION = 1;
export const VIEWER_URL = 'https://t-julsgaard.github.io/Chess-Review/profile/';
export const STORE_URLS = {chrome: 'https://chromewebstore.google.com/detail/chess-review/pdbffcjdmcadihmnmenkadndbdbigfam', firefox: 'https://addons.mozilla.org/en-US/firefox/addon/chess-review/'};

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
  if (trimmed.habits?.bands) delete trimmed.habits.bands;
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
  return out;
}
export const profileLink = encoded => VIEWER_URL + '#p=' + encoded;

/** Render the 1200×630 share card on a canvas. `draw` is pure canvas code so it works on any page. */
export function drawCard(canvas, {account, periodLabel, site, totals, twin, opening, rival, rating, theme = 'dark', pieceImages = {}}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = 1200, H = canvas.height = 630;
  const dark = theme !== 'light';
  const bg = dark ? '#14130f' : '#efeee7', panel = dark ? '#1f1e1a' : '#ffffff', ink = dark ? '#f3f1ea' : '#232118', ink2 = dark ? '#b8b4a8' : '#6a6657', accent = '#7fb45f', line = dark ? '#34322c' : '#e2e0d4';
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, H); grad.addColorStop(0, dark ? '#1c2416' : '#e9f0df'); grad.addColorStop(1, bg);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  // Board motif on the right.
  const size = 44, bx = W - 8 * size - 60, by = (H - 8 * size) / 2;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { ctx.fillStyle = (r + c) % 2 ? '#b58863' : '#f0d9b5'; ctx.globalAlpha = 0.9; ctx.fillRect(bx + c * size, by + r * size, size, size); }
  ctx.globalAlpha = 1;
  for (const [square, img] of Object.entries(pieceImages)) {
    const file = 'abcdefgh'.indexOf(square[0]), rank = Number(square[1]);
    if (file >= 0 && rank >= 1 && img) try { ctx.drawImage(img, bx + file * size, by + (8 - rank) * size, size, size); } catch {}
  }
  ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.strokeRect(bx - 1, by - 1, 8 * size + 2, 8 * size + 2);
  const font = (weight, px) => `${weight} ${px}px "Hanken Grotesk", "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = accent; ctx.font = font(700, 20); ctx.fillText(('PLAYER PROFILE · ' + (periodLabel || '')).toUpperCase(), 64, 86);
  ctx.fillStyle = ink; ctx.font = font(800, 62); ctx.fillText(String(account || '').slice(0, 18), 64, 150);
  ctx.fillStyle = ink2; ctx.font = font(500, 22); ctx.fillText((site === 'lichess' ? 'Lichess' : site === 'both' ? 'Chess.com + Lichess' : 'Chess.com') + ' · ' + (totals ? `${totals.games} games · ${totals.winRate}% wins` : ''), 64, 188);
  const tiles = [twin ? ['Historical twin', twin] : null, opening ? ['Favourite opening', opening] : null, rating ? ['Rating', rating] : null, rival ? ['Rival', rival] : null].filter(Boolean);
  let y = 236;
  for (const [label, value] of tiles) {
    ctx.fillStyle = panel; roundRect(ctx, 64, y, 620, 72, 14); ctx.fill(); ctx.strokeStyle = line; ctx.stroke();
    ctx.fillStyle = ink2; ctx.font = font(600, 15); ctx.fillText(label.toUpperCase(), 84, y + 28);
    ctx.fillStyle = ink; ctx.font = font(700, 26); ctx.fillText(String(value).slice(0, 40), 84, y + 58);
    y += 84;
  }
  ctx.fillStyle = ink2; ctx.font = font(500, 18); ctx.fillText('Made with Chess Review, the free open-source local game review extension', 64, H - 56);
  ctx.fillStyle = accent; ctx.font = font(700, 18); ctx.fillText(VIEWER_URL.replace('https://', ''), 64, H - 28);
  return canvas;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
