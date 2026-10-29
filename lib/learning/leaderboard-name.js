export const LEADERBOARD_NAME_MAX=25;

// Public names are assigned by the service. Keep a narrow alphabet so a future
// write path cannot turn a display name into a URL, markup or hidden characters.
export function validLeaderboardName(name) {
  return typeof name==='string'&&name.length<=LEADERBOARD_NAME_MAX&&name===name.trim()&&
    /^[A-Za-z0-9](?:[A-Za-z0-9 _-]*[A-Za-z0-9])?$/.test(name);
}
