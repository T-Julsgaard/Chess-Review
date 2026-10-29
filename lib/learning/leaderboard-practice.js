const KEY='leaderboard:practice:v1';

// Only server-assigned proofs live here; ordinary offline totals are never
// uploaded. Persist before sending so a lost response/restart can replay safely.
export class PracticeQueue {
  constructor(client) {this.client=client;this.work=Promise.resolve();this.stopped=false;}
  run(action) {
    const execute=()=>globalThis.navigator?.locks?.request
      ?navigator.locks.request('chess-review-practice:'+this.client.endpoint,action):action();
    const result=this.work.then(execute);this.work=result.catch(()=>{});return result;
  }
  async load() {
    this.client.assertLive();const player=await this.client.credentials();
    const state=(await this.client.storage.get(KEY))[KEY];
    return state?.owner===player?.id&&state.endpoint===this.client.endpoint?state:null;
  }
  async save(state) {this.client.assertLive();await this.client.storage.set({[KEY]:state});this.client.onPersonalChange?.();}
  view(state) {
    const ids=state.session.puzzleIds,n=state.pending.length;
    return {...state.session,practice:true,started:true,mode:'solve-puzzle',score:state.session.total+n,
      puzzleId:ids[n],nextPuzzle:ids[n],syncing:!!n};
  }
  stop() {this.stopped=true;clearTimeout(this.timer);this.timer=null;}
  schedule(state) {
    clearTimeout(this.timer);this.timer=null;
    if(this.stopped||(!state?.pending.length&&!state?.end)||state.blocked)return;
    const at=Math.max(state.firstAt+60000,state.retryAt||0);
    this.timer=setTimeout(()=>{this.timer=null;this.flush().catch(()=>{});},Math.max(0,at-Date.now()));
    this.timer.unref?.();
  }
  async resume() {
    if(!this.client.configured||this.client.preview)return;
    this.stopped=false;
    return this.run(async()=>{const state=await this.load();if(state?.pending.length||state?.end)await this.send(state);});
  }
  async start() {
    this.client.assertLive();this.stopped=false;
    return this.run(async()=>{
      let state=await this.load();
      if(state?.pending.length||state?.end){await this.send(state);state=await this.load();if(state?.pending.length||state?.end)throw Error('Sync pending practice results before starting another ranked session.');}
      const player=await this.client.credentials();if(!player)throw Error('Connect a player key to play ranked.');
      const session=await this.client.request('/v1/practice',{token:player.token,body:{}});
      this.validate(session);
      state={owner:player.id,endpoint:this.client.endpoint,session,pending:[],end:false};
      await this.save(state);await this.client.remember('solve-puzzle',session.total,state.owner);return this.view(state);
    });
  }
  validate(session) {
    if(typeof session.id!=='string'||!Number.isSafeInteger(session.revision)||session.revision<0||
      !Number.isSafeInteger(session.total)||session.total<0||!Number.isFinite(session.expiresAt)||
      !Array.isArray(session.puzzleIds)||session.puzzleIds.length>5||session.puzzleIds.some(id=>typeof id!=='string'))throw Error('Invalid practice response.');
  }
  async record(puzzleId,moves) {
    return this.run(async()=>{
      const state=await this.load();if(!state||state.end||state.blocked)throw Error('Ranked practice is not active.');
      if(state.pending.some(p=>p.puzzleId===puzzleId))return this.view(state);
      if(state.session.puzzleIds[state.pending.length]!==puzzleId)throw Error('Practice changed in another tab. Reopen ranked practice.');
      state.pending.push({puzzleId,moves:[...moves]});state.firstAt ||= Date.now();
      await this.save(state);
      if(state.pending.length===5||state.pending.length===state.session.puzzleIds.length)await this.send(state);
      else this.schedule(state);
      return this.view(state);
    });
  }
  async flush({end=false}={}) {
    if(!this.client.configured||this.client.preview)return;
    return this.run(async()=>{
      const state=await this.load();if(!state)return;
      if(end){state.end=true;state.firstAt ||= Date.now();await this.save(state);}
      if(state.pending.length||state.end)await this.send(state);
      return this.view(state);
    });
  }
  async send(state) {
    if(state.blocked){this.schedule(state);return;}
    if(state.retryAt>Date.now()){this.schedule(state);return;}
    try {
      const player=await this.client.credentials();if(player?.id!==state.owner)return;
      const result=await this.client.request('/v1/practice/attempts',{token:player.token,
        body:{session:state.session.id,revision:state.session.revision,attempts:state.pending,end:!!state.end}});
      this.validate(result);
      state.session=result;state.pending=[];state.end=false;state.firstAt=null;state.retryAt=0;state.failures=0;delete state.error;
      await this.save(state);await this.client.remember('solve-puzzle',result.total,state.owner);
    } catch(error) {
      if(this.client.preview)return;
      state.error=error.message;state.failures=(state.failures||0)+1;
      state.retryAt=Math.max(error.retryAt||0,Date.now()+Math.min(900000,60000*2**Math.min(state.failures-1,4)));
      // Auth/validation/conflict errors need user action, not an endless retry.
      state.blocked=[400,401,403,409].includes(error.status);
      await this.save(state);
    }
    this.schedule(state);
  }
  async discard() {this.client.assertLive();this.stop();return this.run(()=>this.save(null));}
}
