// Local, per-site evidence. A viewed game is evidence about recurring players,
// never proof of account ownership. Keep ambiguous histories anonymous.
import {flagCodeForCountryId,countryNameForId} from '../flags.js';
export const PLAYER_HISTORY_KEY = "playerHistory:v1";
const RECENT_LIMIT = 50;

function headers(pgn) {
  return Object.fromEntries([...String(pgn || "").matchAll(/^\[(\w+)\s+"([^"\r\n]*)"\]\s*$/gm)].map(m => [m[1], m[2]]));
}
function account(name) {
  const value = String(name || "").trim();
  return /^[\w-]{2,30}$/.test(value) && !/^(white|black|anonymous|guest|computer|stockfish)$/i.test(value) ? value : "";
}
function siteUrl(value) {
  if (/^(?:www\.)?chess\.com$/i.test(value || "")) return {site:"chesscom", path:""};
  try {
    const url = new URL(value);
    if (/^(?:www\.)?chess\.com$/i.test(url.hostname)) return {site:"chesscom", path:url.pathname};
    if (/^(?:www\.)?lichess\.org$/i.test(url.hostname)) return {site:"lichess", path:url.pathname};
  } catch {}
  return null;
}
export function historyGame({pgn, meta = {}, url} = {}) {
  const h = headers(pgn);
  const location = [meta.url, url, h.Link, h.Site].map(siteUrl).find(Boolean);
  if (!location) return null;
  const white = account(h.White || meta.white?.user), black = account(h.Black || meta.black?.user);
  if (!white || !black || white.toLowerCase() === black.toLowerCase()) return null;
  const id = meta.gameId || (location.site === "chesscom"
    ? location.path.match(/\/game\/(?:[a-z-]+\/)?(\d+)/i)?.[1]
    : location.path.match(/^\/([a-z0-9]{8})(?:[a-z0-9]{4})?(?:\/|$)/i)?.[1]);
  const countries={};
  if(location.site==='chesscom')for(const [side,name] of [['white',white],['black',black]]){
    const player=meta[side],token=player?.countryId;
    if(account(player?.user).toLowerCase()===name.toLowerCase()&&typeof token==='string'&&flagCodeForCountryId(token)&&countryNameForId(token))countries[side+'Country']=token.trim().toUpperCase();
  }
  return {site:location.site, id:String(id || pgn).trim(), white, black,...countries};
}
function evidence(store, site, current) {
  const recent = Array.isArray(store[PLAYER_HISTORY_KEY]?.[site]) ? store[PLAYER_HISTORY_KEY][site] : [];
  const library = Array.isArray(store.library) ? store.library : [];
  const seen = new Set();
  return [current, ...recent, ...library.map(historyGame)].filter(game => {
    if (!game || game.site !== site || !game.id || !account(game.white) || !account(game.black)
      || game.white.toLowerCase() === game.black.toLowerCase() || seen.has(game.id)) return false;
    seen.add(game.id);return true;
  });
}
export function rankPlayers(store, site, current) {
  const players = new Map();
  for (const game of evidence(store, site, current)) {
    for (const [name, opponent] of [[game.white,game.black],[game.black,game.white]]) {
      const key = name.toLowerCase();
      if (!players.has(key)) players.set(key, {name, games:0, opponents:new Set()});
      const player = players.get(key);player.games++;player.opponents.add(opponent.toLowerCase());
    }
  }
  return [...players.values()].sort((a,b) => b.games-a.games || b.opponents.size-a.opponents.size);
}
export function inferredPlayer(store, site, current) {
  const [first, second] = rankPlayers(store, site, current);
  // Repeated matches with one friend give both players the same vote. Require
  // several opponents AND a clear frequency lead, rather than breaking that tie.
  return first && first.opponents.size >= 3 && first.games >= (second?.games || 0) + 2 ? first.name : "";
}
export async function archivePlayers(storage, provided = "") {
  const store = await storage.get([PLAYER_HISTORY_KEY, "library", "username"]);
  // These are lookup candidates, not ownership claims. A legacy username can
  // still locate an old game's public archive without becoming the user's identity.
  return [...new Set([provided, ...rankPlayers(store, "chesscom").map(p => p.name), store.username]
    .map(account).filter(Boolean).map(name => name.toLowerCase()))].slice(0,4);
}
export function inferredPlayerProfile(store,site='chesscom') {
  const name=inferredPlayer(store,site);
  if(!name)return null;
  for(const game of evidence(store,site))for(const side of ['white','black']){
    const country=game[side+'Country'];
    if(game[side].toLowerCase()===name.toLowerCase()&&typeof country==='string'&&flagCodeForCountryId(country)&&countryNameForId(country))return {name,country};
  }
  return {name,country:null};
}

let writeQueue = Promise.resolve();
export async function rememberAnalyzedGame(payload, storage) {
  const current = historyGame(payload);
  if (!current) return "";
  const commit = async () => {
    const store = await storage.get([PLAYER_HISTORY_KEY, "library"]);
    const previous = store[PLAYER_HISTORY_KEY] || {};
    const recent = Array.isArray(previous[current.site]) ? previous[current.site] : [];
    // Reopening a saved game without scraped flags must not erase its evidence.
    const prior=recent.find(g=>g?.id===current.id),entry={...current};
    for(const side of ['white','black'])if(!entry[side+'Country']&&prior?.[side]?.toLowerCase()===entry[side].toLowerCase()&&prior[side+'Country'])entry[side+'Country']=prior[side+'Country'];
    const history = {...previous, [current.site]:[entry, ...recent.filter(g => g?.id !== current.id)].slice(0,RECENT_LIMIT)};
    const name = inferredPlayer({...store, [PLAYER_HISTORY_KEY]:history}, current.site);
    try { await storage.set({[PLAYER_HISTORY_KEY]:history}); } catch { /* history is optional */ }
    return name;
  };
  try {
    if (globalThis.navigator?.locks?.request) return await navigator.locks.request("chess-review-player-history", commit);
    const pending = writeQueue.catch(() => {}).then(commit);writeQueue = pending;
    return await pending;
  } catch { return ""; }
}
