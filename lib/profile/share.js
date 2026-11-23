// Player profile — share payload and card. The payload is the trimmed report,
// deflated and base64url-encoded into a URL fragment. Fragments never reach a
// server, so a viewer page can decode it entirely in the browser.
import {fmt} from './deck.js';
import {classLabel} from './insights.js';

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

// ---------------------------------------------------------------------------
// Year-in-review card. A typographic summary drawn straight from the report:
// name, one hero number, a W/D/L bar and a grid of stat tiles. No board.
// Every string is measured and shrunk or ellipsized to its box, so long names
// and opening names never spill out of the 1200×630 canvas.
export const CARD_W = 1200, CARD_H = 630;
const CARD_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const CARD_THEMES = {
  dark: {bg: '#14130f', panel: '#1d1c18', line: '#2e2c26', ink: '#f4f1e8', ink2: '#a9a496', ink3: '#7d786c', accent: '#7fb069', draw: '#8a8579', loss: '#3a3832'},
  light: {bg: '#f5f3ec', panel: '#ffffff', line: '#e4e0d4', ink: '#1d1b16', ink2: '#625e52', ink3: '#8d8876', accent: '#4f8a3a', draw: '#b9b4a5', loss: '#dedad0'},
};
const siteLabel = site => site === 'lichess' ? 'Lichess' : site === 'both' ? 'Chess.com + Lichess' : 'Chess.com';
// Country as a two-letter code; a flag emoji is turned back into its letters,
// since Windows has no flag glyphs and would draw them as boxed letters anyway.
const countryCode = flag => {
  if (typeof flag !== 'string') return '';
  const letters = [...flag].map(c => c.codePointAt(0)).filter(n => n >= 0x1f1e6 && n <= 0x1f1ff).map(n => String.fromCharCode(n - 0x1f1a5)).join('');
  const code = letters || flag.trim();
  return /^[a-z]{2}$/i.test(code) ? code.toUpperCase() : '';
};
const finite = n => typeof n === 'number' && Number.isFinite(n);
const ratingText = n => finite(Number(n)) && n != null ? String(Math.round(n)) : '–';

/** Hours as a bare number plus its unit word: {value: '113', unit: 'hours'}. */
export function cardHours(h) {
  if (!finite(h) || h <= 0) return null;
  if (h < 1) { const m = Math.max(1, Math.round(h * 60)); return {value: String(m), unit: m === 1 ? 'minute' : 'minutes'}; }
  const value = h < 10 ? String(Math.round(h * 10) / 10) : fmt.int(h);
  return {value, unit: value === '1' ? 'hour' : 'hours'};
}

/** Pick up to `max` stat tiles from whatever the report has, most interesting first. */
export function cardTiles(report, max = 4) {
  const r = report || {}, T = r.totals || {}, tiles = [];
  const hours = cardHours(T.hours);
  if (hours) tiles.push({id: 'hours', label: 'Time at the board', value: hours.value, sub: `${hours.unit} played`, numeric: true});
  const fav = [...(r.openings?.w?.top || []), ...(r.openings?.b?.top || [])].filter(o => o && o.name).sort((a, b) => (b.games || 0) - (a.games || 0))[0];
  if (fav) tiles.push({id: 'opening', label: 'Favourite opening', value: fav.name, sub: [finite(fav.games) ? fmt.plural(fav.games, 'game') : '', finite(fav.winRate) ? `${fmt.pct(fav.winRate)} wins` : ''].filter(Boolean).join(' · ')});
  const twin = r.twin?.winner;
  if (twin?.name) tiles.push({id: 'twin', label: 'Historical twin', value: twin.name, sub: twin.tagline || ''});
  const rival = r.opponents?.rival;
  if (rival?.name) tiles.push({id: 'rival', label: 'Rival', value: rival.name, sub: `${fmt.int(rival.w || 0)} W · ${fmt.int(rival.d || 0)} D · ${fmt.int(rival.l || 0)} L`});
  const streak = r.streaks?.win?.length;
  if (finite(streak) && streak >= 2) tiles.push({id: 'streak', label: 'Longest win streak', value: fmt.int(streak), sub: 'wins in a row', numeric: true});
  const beaten = r.opponents?.strongestBeaten;
  if (finite(beaten?.rating)) tiles.push({id: 'beaten', label: 'Strongest win', value: ratingText(beaten.rating), sub: beaten.opp ? `rated opponent, ${beaten.opp}` : 'rated opponent', numeric: true});
  if (finite(r.engine?.average)) tiles.push({id: 'engine', label: 'Engine accuracy', value: fmt.pct(r.engine.average), sub: 'average per game', numeric: true});
  const mates = r.terminations?.mates;
  if (finite(mates) && mates > 0) tiles.push({id: 'mates', label: 'Checkmates', value: fmt.int(mates), sub: 'delivered on the board', numeric: true});
  if (finite(T.moves) && T.moves > 0) tiles.push({id: 'moves', label: 'Moves made', value: fmt.int(T.moves), sub: 'across every game', numeric: true});
  return tiles.slice(0, max);
}

/** The rating class with the most games, with its peak and series, or null. */
export function cardRating(report) {
  const entries = Object.entries(report?.ratings || {}).filter(([, v]) => v && (finite(v.end) || finite(v.peak?.rating)));
  if (!entries.length) return null;
  const games = cls => report.totals?.byClass?.[cls]?.games ?? report.ratings[cls].games ?? 0;
  const [cls, v] = entries.sort((a, b) => games(b[0]) - games(a[0]))[0];
  return {cls, label: classLabel(cls), peak: finite(v.peak?.rating) ? v.peak.rating : v.end, start: v.start, end: v.end,
    change: finite(v.change) ? v.change : finite(v.end) && finite(v.start) ? v.end - v.start : null, series: (v.series || []).filter(p => p && finite(p.r))};
}

/**
 * Render the 1200×630 "year in one card" from a profile report.
 * Pure canvas 2D calls, so it runs on any page (and against a stub in tests).
 */
export function drawProfileCard(canvas, report, {theme = 'dark', flag = null, accent = null} = {}) {
  const r = report || {}, T = r.totals || {};
  const ctx = canvas.getContext('2d');
  canvas.width = CARD_W; canvas.height = CARD_H;
  const light = theme === 'light', C = {...(light ? CARD_THEMES.light : CARD_THEMES.dark)};
  if (typeof accent === 'string' && accent) C.accent = accent;
  const font = (weight, px) => `${weight} ${px}px ${CARD_FONT}`;
  const track = px => { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; };
  // Shrink from maxPx to minPx until the text fits, then ellipsize at minPx.
  const fit = (s, maxW, weight, maxPx, minPx) => {
    s = String(s ?? '');
    for (let px = maxPx; px >= minPx; px -= 2) { ctx.font = font(weight, px); if (ctx.measureText(s).width <= maxW) return {text: s, px}; }
    ctx.font = font(weight, minPx);
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return {text: s.trimEnd() + '…', px: minPx};
  };
  const text = (s, x, y, {weight = 500, px = 16, color = C.ink, align = 'left', maxW = null, minPx = Math.round(px * 0.6), spacing = 0} = {}) => {
    track(spacing);
    const f = maxW ? fit(s, maxW, weight, px, minPx) : {text: String(s), px};
    ctx.font = font(weight, f.px); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillText(f.text, x, y);
    const width = ctx.measureText(f.text).width;
    track(0); ctx.textAlign = 'left';
    return {width, px: f.px};
  };
  // One line between maxPx and oneLineMin if it fits; otherwise two lines at twoPx,
  // broken at a space (or mid-word for long handles) with the second ellipsized.
  const wrap = (s, maxW, maxPx, oneLineMin, twoPx) => {
    s = String(s ?? '');
    track(-0.5);
    for (let px = maxPx; px >= oneLineMin; px -= 2) { ctx.font = font(700, px); if (ctx.measureText(s).width <= maxW) { track(0); return [{text: s, px}]; } }
    ctx.font = font(700, twoPx);
    const words = s.split(' ');
    let first = '';
    for (const word of words) { const next = first ? first + ' ' + word : word; if (ctx.measureText(next).width > maxW) break; first = next; }
    if (!first) { let n = s.length; while (n > 1 && ctx.measureText(s.slice(0, n)).width > maxW) n--; first = s.slice(0, n); }
    let rest = s.slice(first.length).trimStart();
    if (ctx.measureText(rest).width > maxW) { while (rest.length > 1 && ctx.measureText(rest + '…').width > maxW) rest = rest.slice(0, -1); rest = rest.trimEnd() + '…'; }
    track(0);
    return rest ? [{text: first, px: twoPx}, {text: rest, px: twoPx}] : [{text: first, px: twoPx}];
  };

  // Background: flat warm base with one very soft accent wash, top left.
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, CARD_W, CARD_H);
  const wash = ctx.createRadialGradient(120, 40, 0, 120, 40, 640);
  wash.addColorStop(0, withAlpha(C.accent, light ? 0.10 : 0.12)); wash.addColorStop(1, withAlpha(C.accent, 0));
  ctx.fillStyle = wash; ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ---- Left column: who, when, how many.
  const L = 64, LW = 470;
  const kicker = [r.periodLabel || 'Your year', siteLabel(r.site)].join('  ·  ').toUpperCase();
  text(kicker, L, 92, {weight: 700, px: 16, color: C.accent, maxW: LW, minPx: 12, spacing: 2.4});
  const code = countryCode(flag), badgeW = 46, badgeH = 26;
  const name = text(r.account || 'Player', L - 2, 160, {weight: 800, px: 64, minPx: 30, maxW: code ? LW - badgeW - 16 : LW, spacing: -1});
  if (code) {
    const bx = L - 2 + name.width + 14, by = 160 - name.px * 0.36 - badgeH / 2;
    ctx.strokeStyle = C.ink3; ctx.lineWidth = 1.5; roundRect(ctx, bx, by, badgeW, badgeH, 7); ctx.stroke();
    text(code, bx + badgeW / 2, by + 18, {weight: 700, px: 14, color: C.ink2, align: 'center', spacing: 1.5});
  }

  const w = T.w || 0, d = T.d || 0, l = T.l || 0, sum = w + d + l;
  const games = finite(T.games) ? T.games : sum;
  text(fmt.int(games), L - 6, 340, {weight: 800, px: 168, minPx: 56, maxW: LW, spacing: -6});
  text(games === 1 ? 'game played' : 'games played', L, 380, {weight: 600, px: 24, color: C.ink2});

  // W/D/L proportion bar with a legend underneath.
  const barY = 414, barH = 14;
  ctx.save(); roundRect(ctx, L, barY, LW, barH, barH / 2); ctx.clip();
  ctx.fillStyle = C.loss; ctx.fillRect(L, barY, LW, barH);
  if (sum > 0) {
    const ww = LW * w / sum, dw = LW * d / sum, gap = 3;
    ctx.fillStyle = C.accent; ctx.fillRect(L, barY, ww, barH);
    ctx.fillStyle = C.draw; ctx.fillRect(L + ww, barY, dw, barH);
    ctx.fillStyle = C.bg;
    if (w && d + l) ctx.fillRect(L + ww - gap / 2, barY, gap, barH);
    if (d && l) ctx.fillRect(L + ww + dw - gap / 2, barY, gap, barH);
  }
  ctx.restore();
  let lx = L;
  const legend = [[w, 'win', 'wins', C.accent], [d, 'draw', 'draws', C.draw], [l, 'loss', 'losses', C.loss]];
  for (const [n, one, many, color] of legend) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(lx + 5, 456, 5, 0, Math.PI * 2); ctx.fill();
    if (light && color === C.loss) { ctx.strokeStyle = C.draw; ctx.lineWidth = 1; ctx.stroke(); }
    const a = text(fmt.int(n), lx + 16, 462, {weight: 700, px: 18});
    const b = text(n === 1 ? one : many, lx + 16 + a.width + 6, 462, {weight: 500, px: 18, color: C.ink2});
    lx += 16 + a.width + 6 + b.width + 20;
  }
  const rate = finite(T.winRate) ? T.winRate : sum ? 100 * w / sum : null;
  if (rate != null) {
    ctx.font = font(500, 18); const ww = ctx.measureText('won').width;
    ctx.font = font(700, 18); const rw = ctx.measureText(fmt.pct(rate)).width;
    if (lx - 20 + 24 + rw + 6 + ww <= L + LW) {
      text('won', L + LW, 462, {weight: 500, px: 18, color: C.ink2, align: 'right'});
      text(fmt.pct(rate), L + LW - ww - 6, 462, {weight: 700, px: 18, align: 'right'});
    }
  }

  // Footer wordmark.
  ctx.fillStyle = C.accent; roundRect(ctx, L, 549, 22, 22, 6); ctx.fill();
  ctx.fillStyle = C.bg; roundRect(ctx, L + 7, 556, 8, 8, 2); ctx.fill();
  const mark = text('Chess Review', L + 32, 566, {weight: 700, px: 19});
  text('free, open-source game review', L + 32 + mark.width + 12, 566, {weight: 500, px: 16, color: C.ink3, maxW: LW - 32 - mark.width - 12, minPx: 11});

  // ---- Right column: a wide rating tile with a sparkline, then a 2-up grid.
  const RX = 600, RW = CARD_W - 64 - RX, top = 56, bottom = 574, gap = 16;
  const rating = cardRating(r);
  const tiles = cardTiles(r, rating ? 4 : 6);
  const rows = (rating ? 1 : 0) + Math.ceil(tiles.length / 2);
  if (!rows) return canvas;
  const rowH = Math.min(156, (bottom - top - gap * (Math.max(rows, 3) - 1)) / Math.max(rows, 3));
  const colW = (RW - gap) / 2;
  const panel = (x, y, w, h) => { ctx.fillStyle = C.panel; roundRect(ctx, x, y, w, h, 18); ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke(); };
  const label = (s, x, y, maxW) => text(s.toUpperCase(), x, y, {weight: 700, px: 13, color: C.ink3, maxW, minPx: 10, spacing: 1.6});
  let y = top + (bottom - top - (rows * rowH + (rows - 1) * gap)) / 2;

  if (rating) {
    panel(RX, y, RW, rowH);
    const pad = 24, half = 220;
    label(`Peak ${rating.label} rating`, RX + pad, y + 36, half);
    text(ratingText(rating.peak), RX + pad - 2, y + 96, {weight: 800, px: 56, minPx: 36, maxW: half, spacing: -2});
    const sub = finite(rating.change) && finite(rating.start) && finite(rating.end) ? `${ratingText(rating.start)} → ${ratingText(rating.end)} this period (${fmt.signed(rating.change)})` : finite(rating.end) ? `now ${ratingText(rating.end)}` : '';
    if (sub) text(sub, RX + pad, y + rowH - 26, {weight: 500, px: 16, color: C.ink2, maxW: half, minPx: 12});
    if (rating.series.length >= 2) sparkline(ctx, rating.series, RX + pad + half + 24, y + 28, RW - pad * 2 - half - 24, rowH - 56, C);
    y += rowH + gap;
  }
  tiles.forEach((t, i) => {
    const col = i % 2, pad = 22;
    // A lone last tile spans the full width so the grid never has a hole.
    const wide = col === 0 && i === tiles.length - 1, x = RX + col * (colW + gap), tw = wide ? RW : colW, inner = tw - pad * 2;
    panel(x, y, tw, rowH);
    label(t.label, x + pad, y + 34, inner);
    if (t.numeric) text(t.value, x + pad - 2, y + 90, {weight: 800, px: 48, minPx: 28, maxW: inner, spacing: -1.5});
    else {
      // Names and openings: one line if it fits at 24px or more, else two lines at 22px.
      const lines = wrap(t.value, inner, 30, 24, 22);
      if (lines.length === 1) text(lines[0].text, x + pad, y + 82, {weight: 700, px: lines[0].px, spacing: -0.5});
      else lines.forEach((ln, k) => text(ln.text, x + pad, y + 72 + k * 27, {weight: 700, px: ln.px, spacing: -0.3}));
    }
    if (t.sub) text(t.sub, x + pad, y + rowH - 24, {weight: 500, px: 16, color: C.ink2, maxW: inner, minPx: 12});
    if (col === 1 || wide) y += rowH + gap;
  });
  return canvas;
}

function sparkline(ctx, series, x, y, w, h, C) {
  const pts = series.slice(-80), rs = pts.map(p => p.r);
  let lo = Math.min(...rs), hi = Math.max(...rs);
  if (hi - lo < 10) { const mid = (hi + lo) / 2; lo = mid - 5; hi = mid + 5; }
  const px = i => x + w * i / (pts.length - 1), py = v => y + h - (v - lo) / (hi - lo) * h;
  const trace = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(px(i), py(p.r)) : ctx.moveTo(px(i), py(p.r))); };
  ctx.save();
  trace(); ctx.lineTo(px(pts.length - 1), y + h); ctx.lineTo(px(0), y + h); ctx.closePath();
  const fill = ctx.createLinearGradient(0, y, 0, y + h);
  fill.addColorStop(0, withAlpha(C.accent, 0.18)); fill.addColorStop(1, withAlpha(C.accent, 0));
  ctx.fillStyle = fill; ctx.fill();
  trace(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  const peak = rs.indexOf(Math.max(...rs));
  ctx.fillStyle = C.panel; ctx.beginPath(); ctx.arc(px(peak), py(rs[peak]), 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
}

/** '#rrggbb' (or '#rgb') to rgba() with the given alpha; other colour strings pass through. */
function withAlpha(color, alpha) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color || '');
  if (!m) return color;
  const hex = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  const n = parseInt(hex, 16);
  return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${alpha})`;
}
