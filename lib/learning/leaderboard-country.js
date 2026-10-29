import {inferredPlayerProfile,PLAYER_HISTORY_KEY} from '../player-history.js';

const KEY='leaderboardCountry:v1';
// Inferred account names stay local. Publish only a known flag for the connected
// player key, and send again only when the country or service has changed.
export async function syncLeaderboardCountry(client,player) {
  if(client.preview||!player||!client.storage)return;
  const store=await client.storage.get([PLAYER_HISTORY_KEY,'library',KEY]);
  const profile=inferredPlayerProfile(store),saved=store[KEY];
  if(!profile?.country||saved?.id===player.id&&saved?.endpoint===client.endpoint&&saved?.country===profile.country)return;
  await client.request('/v1/me',{token:player.token,body:{country:profile.country}});
  await client.storage.set({[KEY]:{id:player.id,endpoint:client.endpoint,country:profile.country}});
}
