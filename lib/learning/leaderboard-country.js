import {leaderboardPreferences,updateLeaderboardPreferences} from './leaderboard-preferences.js';

const KEY='leaderboardCountry:v1';
// Publish only the player's explicit selection. Game history is never consulted.
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
  const saved=(await client.storage.get(KEY))[KEY],country=preferences.nationality;
  if(saved?.id===player.id&&saved?.endpoint===client.endpoint&&saved?.country===country)return;
  await client.request('/v1/me',{token:player.token,body:{country}});
  await client.storage.set({[KEY]:{id:player.id,endpoint:client.endpoint,country}});
}
