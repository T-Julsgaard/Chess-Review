import {leaderboardNationality} from './leaderboard-nationality.js';
export const LEADERBOARD_PREFERENCES_KEY='leaderboardPreferences:v1';
export const LEADERBOARD_CONSENT_VERSION=1;

export async function leaderboardPreferences(storage) {
  const value=(await storage.get(LEADERBOARD_PREFERENCES_KEY))[LEADERBOARD_PREFERENCES_KEY];
  let nationality=null;
  try {nationality=leaderboardNationality(value?.nationality);}catch{/* Invalid local values never publish a flag. */}
  return {enabled:value?.version===LEADERBOARD_CONSENT_VERSION&&value.enabled===true,
    nationality,showNationality:value?.version===LEADERBOARD_CONSENT_VERSION&&!!nationality,
    pendingCountryRemoval:value?.pendingCountryRemoval===true||value?.showNationality===true&&!nationality,
    pendingDeletion:value?.pendingDeletion===true,
    ...(Number.isFinite(value?.acceptedAt)?{acceptedAt:value.acceptedAt}:{})};
}

const queues=new WeakMap();
// Merge against the latest consent under a cross-tab lock. A late country
// response must never restore consent that has since been withdrawn.
export function withLeaderboardPrivacyLock(storage,action) {
  const execute=()=>globalThis.navigator?.locks?.request
    ?navigator.locks.request('chess-review-leaderboard-privacy',action):action();
  const pending=(queues.get(storage)||Promise.resolve()).then(execute);
  queues.set(storage,pending.catch(()=>{}));return pending;
}
export function updateLeaderboardPreferences(storage,change) {
  return withLeaderboardPrivacyLock(storage,async()=>{
    const next=await change(await leaderboardPreferences(storage));
    await storage.set({[LEADERBOARD_PREFERENCES_KEY]:{version:LEADERBOARD_CONSENT_VERSION,...next}});
    return next;
  });
}
