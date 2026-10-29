import {inferredPlayerProfile,PLAYER_HISTORY_KEY} from '../player-history.js';
import {leaderboardPreferences,updateLeaderboardPreferences} from './leaderboard-preferences.js';

const KEY='leaderboardCountry:v1';
// Inferred account names stay local. Publish only a known flag for the connected
// player key, and send again only when the country or service has changed.
export async function syncLeaderboardCountry(client,player) {
  if(client.preview||!player||!client.storage)return;
  const preferences=await leaderboardPreferences(client.storage);
  if(!preferences.enabled||!preferences.showNationality){
    if(preferences.pendingCountryRemoval){
      await client.request('/v1/me',{token:player.token,body:{country:null},management:true});
      await client.storage.set({[KEY]:null});
      await updateLeaderboardPreferences(client.storage,current=>({...current,pendingCountryRemoval:false}));
    }
    return;
  }
  const store=await client.storage.get([PLAYER_HISTORY_KEY,'library',KEY]);
  const profile=inferredPlayerProfile(store),saved=store[KEY];
  const country=profile?.country||null;
  if(!country&&!saved)return;
  if(saved?.id===player.id&&saved?.endpoint===client.endpoint&&saved?.country===country)return;
  await client.request('/v1/me',{token:player.token,body:{country}});
  await client.storage.set({[KEY]:{id:player.id,endpoint:client.endpoint,country}});
}
