import {LEADERBOARD_URL} from './leaderboard-config.js';
import {leaderboardPreview} from './leaderboard-preview.js';
import {PracticeQueue} from './leaderboard-practice.js';
import {validLeaderboardName} from './leaderboard-name.js';

const KEY='leaderboard:v1';
const DATA_PERMISSIONS=['authenticationInfo','locationInfo','technicalAndInteraction'];
// Chromium may also expose `browser`; only Firefox has getBrowserInfo.
const firefoxPermissions=()=>typeof browser!=='undefined'&&typeof browser.runtime?.getBrowserInfo==='function'?browser.permissions:null;
const boards=new WeakMap(),pendingBoards=new WeakMap(),cooldowns=new WeakMap();
export class LeaderboardClient {
  constructor(storage,{endpoint=LEADERBOARD_URL,fetcher=(...args)=>fetch(...args)}={}) {
    this.storage=storage;this.endpoint=endpoint.replace(/\/$/,'');this.fetcher=fetcher;this.practice=new PracticeQueue(this);
    // A cache is shared by callers using the same transport, never by a test or
    // preview transport and a production client.
    this.cacheKey=fetcher;
  }
  get preview() {return leaderboardPreview.active;}
  get configured() {return this.preview||/^https:\/\/[^/]+$/.test(this.endpoint);}
  assertLive() {if(this.preview)throw Error('Clear test data before using online leaderboards.');}
  async credentials() {return this.preview?null:(await this.storage.get(KEY))[KEY]||null;}
  async connect(token) {
    this.assertLive();
    if(!/^[a-f0-9]{64}$/.test(token))throw Error('Enter the player key from the verification page.');
    // Firefox requires a separate, user-initiated grant for optional account data.
    if(firefoxPermissions()?.request){
      const granted=await firefoxPermissions().request({data_collection:DATA_PERMISSIONS});
      if(!granted)throw Error('Allow online player data to connect.');
    }
    const player=await this.request('/v1/me',{token});
    if(!validLeaderboardName(player.name))throw Error('Invalid player name received.');
    const previous=await this.credentials();
    if(previous?.id!==player.id)await this.practice.discard();
    await this.storage.set({[KEY]:{token,name:player.name,id:player.id,scores:player.scores||{}}});return player;
  }
  async disconnect() {this.assertLive();await this.practice.flush();this.practice.stop();await this.storage.set({[KEY]:null});}
  async remember(mode,score,owner) {
    this.assertLive();if(!Number.isSafeInteger(score)||score<0)return;
    const player=await this.credentials();if(!player||owner&&owner!==player.id)return;
    player.scores={...player.scores,[mode]:Math.max(score,player.scores?.[mode]||0)};
    await this.storage.set({[KEY]:player});this.onPersonalChange?.();
  }
  async personal(mode) {
    if(this.preview)return null;
    const player=await this.credentials();if(!player)return null;
    const state=mode==='solve-puzzle'?await this.practice.load():null;
    const confirmed=Math.max(player.scores?.[mode]||0,state?.session.total||0),waiting=state?.pending.length||0;
    return {score:Math.max(confirmed,(state?.session.total||0)+waiting),confirmed,syncing:!!waiting,blocked:!!state?.blocked,error:state?.error};
  }
  async request(path,{body,token,signal}={}) {
    const sourceSignal=leaderboardPreview.signal;
    this.assertLive();
    if(!this.configured)throw Error('Leaderboards are not connected yet.');
    const cooldown=cooldowns.get(this.cacheKey);
    if(cooldown?.until>Date.now())throw Object.assign(Error('Please wait before retrying.'),{retryAt:cooldown.until});
    if(token&&firefoxPermissions()?.contains&&
      !await firefoxPermissions().contains({data_collection:DATA_PERMISSIONS}))throw Error('Online player permission was removed. Reconnect to continue.');
    this.assertLive();if(sourceSignal.aborted)throw Error('Leaderboard data source changed. Try again.');
    const timeout=AbortSignal.timeout(10000);
    let response;try {response=await this.fetcher(this.endpoint+path,{method:body?'POST':'GET',
      headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.any([sourceSignal,timeout,...(signal?[signal]:[])]),
      credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});}catch(error){
      if(!sourceSignal.aborted&&!signal?.aborted){
        const failures=(cooldown?.failures||0)+1,until=Date.now()+Math.min(900000,30000*2**Math.min(failures-1,5));
        cooldowns.set(this.cacheKey,{until,failures});error.retryAt=until;
      }
      throw error;
    }
    if(!response.ok){
      const error=Object.assign(Error(response.status===429?'Too many requests. Try again in a minute.':response.status===401?'Reconnect your player key.':response.status===409?'This ranked session has ended. Start a new run.':'Leaderboard unavailable. Try again shortly.'),{status:response.status});
      if([429,503].includes(response.status)){
        const failures=(cooldown?.failures||0)+1,raw=response.headers.get('Retry-After'),seconds=Number(raw),date=Date.parse(raw);
        const retry=raw?(Number.isFinite(seconds)?Date.now()+Math.max(1,seconds)*1000:date):0;
        error.retryAt=Math.max(Number.isFinite(retry)?retry:0,Date.now()+Math.min(900000,60000*2**Math.min(failures-1,4)));
        cooldowns.set(this.cacheKey,{until:error.retryAt,failures});
      }
      throw error;
    }
    cooldowns.delete(this.cacheKey);
    const data=await response.json();
    if(sourceSignal.aborted)throw Error('Leaderboard data source changed. Try again.');
    return data;
  }
  async list(mode,page,signal,{fresh=false}={}) {
    if(this.preview)return leaderboardPreview.list(mode,page);
    let cache=boards.get(this.cacheKey);if(!cache)boards.set(this.cacheKey,cache=new Map());
    let pending=pendingBoards.get(this.cacheKey);if(!pending)pendingBoards.set(this.cacheKey,pending=new Map());
    const key=this.endpoint+'/'+mode+'/'+page,saved=cache.get(key);
    if(saved&&((!fresh&&saved.until>Date.now())||saved.fetchedAt+10000>Date.now()))return structuredClone(saved.data);
    let request=pending.get(key);
    if(!request){request=this.request(`/v1/boards/${mode}?page=${page}`).then(data=>{
      if(!Array.isArray(data.rows)||data.rows.length>10||data.rows.some(r=>!validLeaderboardName(r.name)||!Number.isSafeInteger(r.score)||r.score<0))throw Error('Leaderboard unavailable.');
      cache.set(key,{data:structuredClone(data),until:Date.now()+60000,fetchedAt:Date.now()});
      if(cache.size>60)cache.delete(cache.keys().next().value);return data;
    }).finally(()=>pending.delete(key));pending.set(key,request);}
    // Leaving one screen must not cancel a fetch another caller is sharing.
    const result=request.catch(error=>{
      if(signal?.aborted||!saved)throw error;
      return {...structuredClone(saved.data),stale:true,message:error.message};
    });
    if(!signal)return structuredClone(await result);
    let abort;try{return structuredClone(await Promise.race([result,new Promise((_,reject)=>{
      abort=()=>reject(signal.reason||new DOMException('Aborted','AbortError'));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
    })]));}finally{signal.removeEventListener('abort',abort);}
  }
  async start(mode) {
    this.assertLive();
    if(mode==='solve-puzzle')return this.practice.start();
    const player=await this.credentials();if(!player)throw Error('Connect a player key to play ranked.');
    return this.request('/v1/sessions',{token:player.token,body:{mode}});
  }
  async attempt(session,moves) {
    this.assertLive();
    const player=await this.credentials();
    const result=await this.request('/v1/attempts',{token:player?.token,body:{session:session.id,revision:session.revision,moves}});
    if(session.mode)await this.remember(session.mode,result.score,player?.id);return result;
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
    await this.request('/v1/delete-player',{token:player?.token,body:{}});await this.practice.discard();await this.storage.set({[KEY]:null});
    boards.get(this.cacheKey)?.clear();
  }
}
