import {LEADERBOARD_URL} from './leaderboard-config.js';
import {leaderboardPreview} from './leaderboard-preview.js';

const KEY='leaderboard:v1';
const DATA_PERMISSIONS=['authenticationInfo','technicalAndInteraction'];
export class LeaderboardClient {
  constructor(storage,{endpoint=LEADERBOARD_URL,fetcher=(...args)=>fetch(...args)}={}) {
    this.storage=storage;this.endpoint=endpoint.replace(/\/$/,'');this.fetcher=fetcher;
  }
  get preview() {return leaderboardPreview.active;}
  get configured() {return this.preview||/^https:\/\/[^/]+$/.test(this.endpoint);}
  assertLive() {if(this.preview)throw Error('Clear test data before using online leaderboards.');}
  async credentials() {return this.preview?null:(await this.storage.get(KEY))[KEY]||null;}
  async connect(token) {
    this.assertLive();
    if(!/^[a-f0-9]{64}$/.test(token))throw Error('Enter the player key from the verification page.');
    // Firefox requires a separate, user-initiated grant for optional account data.
    if(typeof browser!=='undefined'&&browser.permissions?.request){
      const granted=await browser.permissions.request({data_collection:DATA_PERMISSIONS});
      if(!granted)throw Error('Allow online player data to connect.');
    }
    const player=await this.request('/v1/me',{token});
    await this.storage.set({[KEY]:{token,name:player.name,id:player.id}});return player;
  }
  async disconnect() {this.assertLive();await this.storage.set({[KEY]:null});}
  async request(path,{body,token,signal}={}) {
    const sourceSignal=leaderboardPreview.signal;
    this.assertLive();
    if(!this.configured)throw Error('Leaderboards are not connected yet.');
    if(token&&typeof browser!=='undefined'&&browser.permissions?.contains&&
      !await browser.permissions.contains({data_collection:DATA_PERMISSIONS}))throw Error('Online player permission was removed. Reconnect to continue.');
    this.assertLive();if(sourceSignal.aborted)throw Error('Leaderboard data source changed. Try again.');
    const timeout=AbortSignal.timeout(10000);
    const response=await this.fetcher(this.endpoint+path,{method:body?'POST':'GET',
      headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.any([sourceSignal,timeout,...(signal?[signal]:[])]),
      credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    if(!response.ok)throw Error(response.status===429?'Too many requests. Try again in a minute.':response.status===401?'Reconnect your player key.':response.status===409?'This ranked session has ended. Start a new run.':'Leaderboard unavailable. Try again shortly.');
    const data=await response.json();
    if(sourceSignal.aborted)throw Error('Leaderboard data source changed. Try again.');
    return data;
  }
  list(mode,page,signal) {return this.preview?Promise.resolve(leaderboardPreview.list(mode,page)):this.request(`/v1/boards/${mode}?page=${page}`,{signal});}
  async start(mode) {
    this.assertLive();
    const player=await this.credentials();if(!player)throw Error('Connect a player key to play ranked.');
    return this.request('/v1/sessions',{token:player.token,body:{mode}});
  }
  async attempt(session,moves) {
    this.assertLive();
    const player=await this.credentials();
    return this.request('/v1/attempts',{token:player?.token,body:{session:session.id,revision:session.revision,moves}});
  }
  async ready(session) {
    this.assertLive();
    const player=await this.credentials();
    const sent=performance.now(),result=await this.request('/v1/ready',{token:player?.token,body:{session:session.id}});
    // Do not depend on the player's wall clock. Subtract the round trip so the
    // visible countdown conservatively includes transport time.
    return {...result,remainingMs:Math.max(0,result.remainingMs-(performance.now()-sent))};
  }
  async removePlayer() {
    this.assertLive();
    const player=await this.credentials();
    await this.request('/v1/delete-player',{token:player?.token,body:{}});await this.disconnect();
  }
}
