// Player profile — which games count. The gear in the profile header narrows
// every chapter at once: one colour, rated games only, no very short games, and
// opponents left out (a friend you play all the time, say). Choices are saved in
// the settings; the players left out are kept per account, since each account
// has its own opponents. Bots keep their own setting (profileIncludeBots), which
// the insights apply themselves.

/** Games shorter than this many moves (each side's move counted once) are skipped when asked. */
export const SHORT_GAME_MOVES = 10;
export const COLOURS = [['all', 'Both'], ['w', 'White'], ['b', 'Black']];

const lower = value => String(value || '').trim().toLowerCase();
/** The settings key for one account's left-out players. */
export const accountKey = (site, account) => `${site}:${lower(account)}`;

/** The opponents left out for one account, lowercased. */
export function excludedFor(settings, site, account) {
  const list = settings?.profileExcludedOpponents?.[accountKey(site, account)];
  return Array.isArray(list) ? list.map(lower).filter(Boolean) : [];
}

/** The settings patch that leaves `opponent` out (or brings them back) for one account. */
export function toggleExcluded(settings, site, account, opponent, leaveOut) {
  const all = {...(settings?.profileExcludedOpponents || {})}, key = accountKey(site, account), name = lower(opponent);
  const list = new Set(excludedFor(settings, site, account));
  if (leaveOut) list.add(name); else list.delete(name);
  if (list.size) all[key] = [...list].sort(); else delete all[key];
  return {profileExcludedOpponents: all};
}

/** What the gear has switched on, for the accounts on screen (accounts: {site: name}). */
export function activeFilters(settings, accounts = {}) {
  const s = settings || {}, excluded = {};
  for (const [site, account] of Object.entries(accounts)) if (account) { const list = excludedFor(s, site, account); if (list.length) excluded[site] = new Set(list); }
  return {
    colour: s.profileColor === 'w' || s.profileColor === 'b' ? s.profileColor : 'all',
    rated: !!s.profileRatedOnly,
    short: !!s.profileSkipShort,
    excluded,
  };
}

/** How many of the gear's choices narrow the games (each player left out counts once). */
export function filterCount(filters) {
  return (filters.colour !== 'all') + filters.rated + filters.short + Object.values(filters.excluded).reduce((n, set) => n + set.size, 0);
}

/** The rows that count under the gear's choices. */
export function filterRows(rows, settings, accounts) {
  const f = activeFilters(settings, accounts);
  if (!filterCount(f)) return rows;
  return rows.filter(r => (f.colour === 'all' || r.me === f.colour)
    && (!f.rated || r.rated !== false)
    && (!f.short || !(r.n < 2 * SHORT_GAME_MOVES))
    && !f.excluded[r.site]?.has(lower(r.opp)));
}

/** Opponents in `rows`, most games first: {site, key, name, games}. The name is spelled as in the latest game. */
export function opponentList(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = lower(r.opp); if (!key) continue;
    const id = `${r.site}:${key}`, entry = map.get(id) || {site: r.site, key, name: r.opp, games: 0, t: -Infinity};
    entry.games++;
    if ((r.t ?? 0) >= entry.t) { entry.t = r.t ?? 0; entry.name = r.opp; }
    map.set(id, entry);
  }
  return [...map.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name)).map(({t, ...entry}) => entry);
}
