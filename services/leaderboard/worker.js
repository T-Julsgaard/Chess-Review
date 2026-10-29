import {Chess} from '../../lib/chess.js';
import {flagCodeForCountryId,countryNameForId} from '../../flags.js';

const MODES=new Set(['solve-puzzle','timeAttack','knockout']);
const MAX_BODY=4096,DAY=86400000;
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new HttpError(status,message);};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
  'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  ...(status===429?{'Retry-After':'60'}:{})}});
export async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
}
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
async function bodyOf(request) {
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail(415,'JSON required');
  if(Number(request.headers.get('Content-Length'))>MAX_BODY)fail(413,'Request too large');
  const reader=request.body?.getReader();if(!reader)fail(400,'Invalid request');
  let length=0;const chunks=[];
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;
    if(length>MAX_BODY){await reader.cancel();fail(413,'Request too large');}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try {const body=JSON.parse(new TextDecoder().decode(bytes));if(!body||Array.isArray(body)||typeof body!=='object')throw Error();return body;}
  catch {fail(400,'Invalid JSON');}
}
async function budget(env,kind,limit,now,cost=1) {
  const row=await env.DB.prepare(`INSERT INTO quotas(key,used) VALUES (?,?)
    ON CONFLICT(key) DO UPDATE SET used=used+excluded.used WHERE used+excluded.used <= ? RETURNING used`)
    .bind(kind+':'+Math.floor(now/DAY),cost,limit).first();
  if(!row)fail(503,'Daily service capacity reached');
}
// Conservative work estimates, not platform billing counters. Cloudflare Free
// remains the hard boundary. Fixed counter work per mutation, none per board read.
async function reserve(env,now,cost,player) {
  if(player)await budget(env,'player-'+player,10000,now,cost);
  await budget(env,'write-units',80000,now,cost);
}
async function personal(env,id) {
  const {results}=await env.DB.prepare('SELECT mode,score FROM records WHERE player_id=?').bind(id).all();
  return Object.fromEntries(results.map(r=>[r.mode,r.score]));
}
async function authenticate(request,env) {
  const value=request.headers.get('Authorization')||'';
  if(!/^Bearer [a-f0-9]{64}$/.test(value))fail(401,'Player key required');
  const player=await env.DB.prepare('SELECT id,name FROM players WHERE token_hash=?').bind(await digest(value.slice(7))).first();
  if(!player)fail(401,'Player key required');return player;
}
// Canonical continuation, with the same legal alternative-checkmate rule as practice.
// Every entry is a player move; opponent replies are reconstructed on the service.
export function verifyAttempt(puzzle,moves) {
  if(!Array.isArray(moves)||!moves.length||moves.length>32||moves.some(m=>typeof m!=='string'||!/^([a-h][1-8]){2}[qrbn]?$/.test(m)))fail(400,'Invalid moves');
  const line=typeof puzzle.solution==='string'?JSON.parse(puzzle.solution):puzzle.solution;
  let step=0;
  for(let i=0;i<moves.length;i++){
    if(moves[i]!==line[step]) {
      // Canonical lines were validated during catalog import. Only deviations
      // need chess reconstruction, keeping normal proofs cheap on Workers Free.
      const chess=new Chess(puzzle.fen);
      for(const ply of line.slice(0,step))chess.move({from:ply.slice(0,2),to:ply.slice(2,4),promotion:ply[4]});
      try {chess.move({from:moves[i].slice(0,2),to:moves[i].slice(2,4),promotion:moves[i][4]});}catch{fail(400,'Illegal move');}
      if(i!==moves.length-1)fail(400,'Moves after a mistake or completion');
      return chess.isCheckmate();
    }
    step+=2;
    if(step>=line.length){if(i!==moves.length-1)fail(400,'Moves after completion');return true;}
  }
  fail(400,'Incomplete solution');
}
async function pickPuzzle(env,player,mode,seen,previous=0) {
  const target=mode==='solve-puzzle'?1200:Math.min(3000,450+seen.length*(mode==='knockout'?25:40));
  // Indexed ranges keep reads bounded. Deduplication survives new practice sessions.
  const excluded=new Set(seen);
  for(const [low,high] of [[Math.max(previous,target-80),target+120],[Math.max(previous,target-300),target+500],[0,4000]]) {
    const {results}=await env.DB.prepare(`SELECT id,rating FROM puzzles p WHERE rating BETWEEN ? AND ?
      AND p.id NOT IN (SELECT value FROM json_each(?))
      AND (? != 'solve-puzzle' OR NOT EXISTS(SELECT 1 FROM solves s WHERE s.player_id=? AND s.puzzle_id=p.id))
      ORDER BY rating,id LIMIT 128`).bind(low,high,JSON.stringify(seen),mode,player).all();
    const choices=results.filter(p=>!excluded.has(p.id));
    if(choices.length)return choices[crypto.getRandomValues(new Uint32Array(1))[0]%choices.length].id;
  }
  return null;
}
async function enroll(request,env,now) {
  const body=await bodyOf(request);
  if(typeof body.turnstile!=='string'||body.turnstile.length>2048)fail(400,'Verification required');
  // Expiring single-use widget tokens are checked on the service, never trusted from the client.
  const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:body.turnstile,
      remoteip:request.headers.get('CF-Connecting-IP')||''}),signal:AbortSignal.timeout(8000)});
  const result=await verification.json();
  if(!result.success||result.hostname!==env.TURNSTILE_HOSTNAME||result.action!=='enroll')fail(403,'Verification failed');
  await reserve(env,now,6);
  const token=secret(),id=crypto.randomUUID(),name='Knight-'+id.replaceAll('-','').slice(0,10);
  await env.DB.prepare('INSERT INTO players(id,token_hash,name,created_at) VALUES (?,?,?,?)').bind(id,await digest(token),name,now).run();
  return json({token,id,name},201);
}
async function start(request,env,player,now) {
  const {mode}=await bodyOf(request);if(!MODES.has(mode))fail(400,'Invalid mode');
  await reserve(env,now,10,player.id);
  const puzzleId=await pickPuzzle(env,player.id,mode,[]);if(!puzzleId)fail(409,'No puzzles available');
  const id=crypto.randomUUID(),deadline=now+600000,lives=mode==='timeAttack'?3:1;
  await env.DB.prepare(`INSERT INTO sessions(player_id,id,mode,puzzle_id,lives,started_at,updated_at,deadline) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(player_id) DO UPDATE SET id=excluded.id,mode=excluded.mode,puzzle_id=excluded.puzzle_id,lives=excluded.lives,
    started_at=excluded.started_at,updated_at=excluded.updated_at,deadline=excluded.deadline,score=0,revision=0,seen='[]',last_hash=NULL,last_response=NULL`)
    .bind(player.id,id,mode,puzzleId,lives,0,now,deadline).run();
  return json({id,revision:0,puzzleId,score:0});
}
async function ready(request,env,player,now) {
  const {session}=await bodyOf(request);if(typeof session!=='string'||session.length>40)fail(400,'Invalid session');
  await reserve(env,now,8,player.id);
  const row=await env.DB.prepare(`UPDATE sessions SET started_at=?,updated_at=?,deadline=?+CASE WHEN mode='timeAttack' THEN 180000 ELSE 21600000 END
    WHERE player_id=? AND id=? AND started_at=0 AND deadline>? RETURNING deadline`).bind(now,now,now,player.id,session,now).first();
  if(row)return json({...row,remainingMs:row.deadline-now});
  const existing=await env.DB.prepare('SELECT deadline FROM sessions WHERE player_id=? AND id=? AND started_at>0 AND deadline>?').bind(player.id,session,now).first();
  if(!existing)fail(409,'Session ended');return json({...existing,remainingMs:existing.deadline-now});
}
async function attempt(request,env,player,now) {
  const body=await bodyOf(request);
  if(typeof body.session!=='string'||body.session.length>40||!Number.isSafeInteger(body.revision)||body.revision<0)fail(400,'Invalid session');
  const hash=await digest(JSON.stringify(body.moves));
  const session=await env.DB.prepare('SELECT * FROM sessions WHERE player_id=? AND id=?').bind(player.id,body.session).first();
  if(!session)fail(409,'Session ended');
  if(body.revision===session.revision-1&&hash===session.last_hash)return json(JSON.parse(session.last_response));
  if(!session.started_at||body.revision!==session.revision||now>=session.deadline||!session.puzzle_id||session.lives<=0||session.revision>=1000)fail(409,'Session ended');
  if(now-session.updated_at<250)fail(429,'Slow down');
  const puzzle=await env.DB.prepare('SELECT fen,solution,rating FROM puzzles WHERE id=?').bind(session.puzzle_id).first();
  const correct=verifyAttempt(puzzle,body.moves);
  await reserve(env,now,12,player.id);
  const score=session.score+(correct?1:0),lives=session.lives-(correct?0:1),seen=[...JSON.parse(session.seen),session.puzzle_id];
  const next=lives>0&&seen.length<1000?await pickPuzzle(env,player.id,session.mode,seen,puzzle.rating):null;
  const result={id:session.id,revision:session.revision+1,puzzleId:next,score,ended:!next||lives<=0,deadline:session.deadline};
  // A single compare-and-swap statement and DB triggers commit the verified result
  // and ranking together. Parallel requests cannot count the same puzzle twice.
  const updated=await env.DB.prepare(`UPDATE sessions SET score=?,lives=?,puzzle_id=?,seen=?,revision=revision+1,
    updated_at=?,last_hash=?,last_response=? WHERE player_id=? AND id=? AND revision=? RETURNING revision`)
    .bind(score,lives,next,JSON.stringify(seen),now,hash,JSON.stringify(result),player.id,session.id,session.revision).first();
  if(!updated)fail(409,'Session changed');return json(result);
}
async function practicePuzzles(env,player,excluded=[]) {
  const ids=[];
  for(let i=0;i<5;i++){
    const id=await pickPuzzle(env,player,'solve-puzzle',[...excluded,...ids]);
    if(!id)break;ids.push(id);
  }
  return ids;
}
async function startPractice(env,player,now) {
  let row=await env.DB.prepare('SELECT * FROM practice_batches WHERE player_id=?').bind(player.id).first();
  if(!row||row.expires_at<=now||!JSON.parse(row.puzzles).length){
    await reserve(env,now,10,player.id);
    const ids=await practicePuzzles(env,player.id);if(!ids.length)fail(409,'No puzzles available');
    // Do not replace another tab's newly issued batch in a race.
    row=await env.DB.prepare(`INSERT INTO practice_batches(player_id,id,puzzles,expires_at) VALUES (?,?,?,?)
      ON CONFLICT(player_id) DO UPDATE SET id=excluded.id,puzzles=excluded.puzzles,expires_at=excluded.expires_at,
      revision=0,accepted='[]',last_hash=NULL,last_response=NULL
      WHERE expires_at<=? OR puzzles='[]' RETURNING *`).bind(player.id,crypto.randomUUID(),JSON.stringify(ids),now+7*DAY,now).first()
      ||await env.DB.prepare('SELECT * FROM practice_batches WHERE player_id=?').bind(player.id).first();
  }
  const scores=await personal(env,player.id);
  return json({id:row.id,revision:row.revision,puzzleIds:JSON.parse(row.puzzles),expiresAt:row.expires_at,total:scores['solve-puzzle']||0});
}
async function submitPractice(request,env,player,now) {
  const body=await bodyOf(request),attempts=body.attempts;
  if(typeof body.session!=='string'||body.session.length>40||!Number.isSafeInteger(body.revision)||body.revision<0||
    !Array.isArray(attempts)||attempts.length>5||(!attempts.length&&body.end!==true)||
    (body.end!==undefined&&typeof body.end!=='boolean'))fail(400,'Invalid practice batch');
  const hash=await digest(JSON.stringify({attempts,end:body.end===true}));
  const row=await env.DB.prepare('SELECT * FROM practice_batches WHERE player_id=? AND id=?').bind(player.id,body.session).first();
  if(!row)fail(409,'Practice batch ended');
  if(body.revision===row.revision-1&&hash===row.last_hash)return json(JSON.parse(row.last_response));
  if(body.revision!==row.revision||row.expires_at<=now)fail(409,'Practice batch ended');
  const assigned=JSON.parse(row.puzzles),accepted=[];
  for(let i=0;i<attempts.length;i++){
    const proof=attempts[i];
    if(!proof||proof.puzzleId!==assigned[i])fail(400,'Unassigned puzzle');
    const puzzle=await env.DB.prepare('SELECT fen,solution FROM puzzles WHERE id=?').bind(proof.puzzleId).first();
    if(!puzzle||!verifyAttempt(puzzle,proof.moves))fail(400,'Invalid practice solution');
    accepted.push(proof.puzzleId);
  }
  await reserve(env,now,6+accepted.length*10,player.id);
  let ids=body.end?[]:assigned.slice(accepted.length);
  if(!body.end&&!ids.length)ids=await practicePuzzles(env,player.id,assigned);
  const result={id:row.id,revision:row.revision+1,puzzleIds:ids,expiresAt:now+7*DAY,ended:!ids.length};
  // The CAS, deduplication, score triggers and saved replay response commit as
  // one statement. The total is computed before triggers from unique new IDs.
  const updated=await env.DB.prepare(`UPDATE practice_batches SET revision=revision+1,puzzles=?,accepted=?,expires_at=?,last_hash=?,
    last_response=json_set(?,'$.total',COALESCE((SELECT score FROM records WHERE player_id=? AND mode='solve-puzzle'),0)+
      (SELECT COUNT(*) FROM json_each(?) a WHERE NOT EXISTS(SELECT 1 FROM solves WHERE player_id=? AND puzzle_id=a.value)))
    WHERE player_id=? AND id=? AND revision=? RETURNING last_response`)
    .bind(JSON.stringify(ids),JSON.stringify(accepted),result.expiresAt,hash,JSON.stringify(result),player.id,JSON.stringify(accepted),player.id,player.id,row.id,row.revision).first();
  if(!updated)fail(409,'Practice batch changed');return json(JSON.parse(updated.last_response));
}
async function board(request,env,ctx,mode) {
  const url=new URL(request.url),raw=url.searchParams.get('page')||'1';
  if(!MODES.has(mode)||!/^\d{1,3}$/.test(raw)||Number(raw)<1||Number(raw)>100)fail(400,'Invalid page');
  const page=Number(raw),key=new Request(url.origin+`/v1/boards/${mode}?page=${page}`);
  const cache=globalThis.caches?.default,cached=await cache?.match(key);if(cached)return cached;
  const {results}=await env.DB.prepare(`SELECT p.id,p.name,r.score,c.country FROM records r JOIN players p ON p.id=r.player_id
    LEFT JOIN player_countries c ON c.player_id=p.id
    WHERE r.mode=? ORDER BY r.score DESC,r.achieved_at,r.player_id LIMIT 11 OFFSET ?`).bind(mode,(page-1)*10).all();
  const response=json({rows:results.slice(0,10),hasNext:results.length>10&&page<100});
  response.headers.set('Cache-Control','public, max-age=30');
  if(cache)ctx.waitUntil(cache.put(key,response.clone()));return response;
}
function joinPage(env) {
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Chess Review · Player key</title>
<style>body{margin:0;background:#171b19;color:#edf1eb;font:16px system-ui;display:grid;min-height:100vh;place-items:center}main{max-width:420px;padding:36px;border:1px solid #39433b;border-radius:18px;background:#212722}h1{font-size:26px}p{color:#b8c5b9;line-height:1.6}textarea{box-sizing:border-box;width:100%;padding:14px;background:#171b19;color:#bbd58c;border:1px solid #52604e;border-radius:8px;resize:none}button{padding:12px 18px;background:#bbd58c;border:0;border-radius:8px;cursor:pointer}small{display:block;margin-top:20px;color:#b8c5b9}</style>
<main><h1>Your place on the board</h1><p>Verify once, then paste your private player key into the extension.</p>
<div class="cf-turnstile" data-sitekey="${env.TURNSTILE_SITE_KEY}" data-action="enroll" data-callback="onVerified"></div>
<p id="status" role="status"></p><section id="result" hidden><label for="key">Private player key</label><textarea id="key" readonly rows="3"></textarea><button id="copy">Copy key</button><p>Keep this key private. It controls your scores and can delete your records.</p></section>
<small>Only ranked puzzle answers are sent. No email, browsing history or game data. Cloudflare processes network information for security.</small></main>
<script src="/join.js"></script><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script></html>`;
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
    'Content-Security-Policy':"default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'unsafe-inline'; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'}});
}
const JOIN_JS=`window.onVerified=async token=>{const status=document.getElementById('status');status.textContent='Creating player key…';try{const response=await fetch('/v1/enroll',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({turnstile:token}),credentials:'omit'});if(!response.ok)throw Error();const data=await response.json();document.getElementById('key').value=data.token;document.getElementById('result').hidden=false;status.textContent=data.name;}catch{status.textContent='Could not create a key. Reload and try again later.';}};document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(document.getElementById('key').value);document.getElementById('status').textContent='Copied. Paste the key into Chess Review.';}catch{document.getElementById('key').select();}};`;

export default {
  async fetch(request,env,ctx) {
    try {
      if(env.ENABLED!=='true'||!env.DB||!env.TURNSTILE_SECRET_KEY||!env.TURNSTILE_SITE_KEY||!env.TURNSTILE_HOSTNAME||!env.IP_HASH_KEY||!env.GLOBAL_LIMIT||!env.READ_LIMIT||!env.WRITE_LIMIT||!env.JOIN_LIMIT||!env.PLAYER_LIMIT||!env.START_LIMIT)fail(503,'Leaderboards unavailable');
      const url=new URL(request.url),path=url.pathname;
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*',
        'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'86400'}});
      if(!await env.GLOBAL_LIMIT.limit({key:'all'}).then(r=>r.success))fail(429,'Slow down');
      // No raw IP is stored, logged or returned. The keyed digest rotates daily.
      const ip=request.headers.get('CF-Connecting-IP');if(!ip)fail(403,'Cloudflare ingress required');
      const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.IP_HASH_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
      const tag=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(Math.floor(Date.now()/DAY)+':'+ip))),n=>n.toString(16).padStart(2,'0')).join('');
      const limiter=path==='/v1/enroll'?env.JOIN_LIMIT:request.method==='GET'?env.READ_LIMIT:env.WRITE_LIMIT;
      if(!(await limiter.limit({key:tag})).success)fail(429,'Slow down');
      if(request.method==='GET'&&path==='/join')return joinPage(env);
      if(request.method==='GET'&&path==='/join.js')return new Response(JOIN_JS,{headers:{'Content-Type':'text/javascript','X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=3600'}});
      if(request.method==='GET'&&path.startsWith('/v1/boards/'))return await board(request,env,ctx,path.slice(11));
      const now=Date.now();
      if(request.method==='POST'&&path==='/v1/enroll')return await enroll(request,env,now);
      if(!['/v1/me','/v1/sessions','/v1/ready','/v1/attempts','/v1/practice','/v1/practice/attempts','/v1/delete-player'].includes(path))fail(404,'Not found');
      const player=await authenticate(request,env);
      if(request.method==='POST'&&!(await env.PLAYER_LIMIT.limit({key:'player:'+player.id})).success)fail(429,'Slow down');
      // Failed proofs and repeated reads of a current assignment must also count
      // against the player's allowance, even when they make no score changes.
      if(request.method==='POST'&&path!=='/v1/delete-player')await budget(env,'requests-'+player.id,2500,now);
      if(request.method==='POST'&&['/v1/sessions','/v1/practice'].includes(path)&&!(await env.START_LIMIT.limit({key:player.id})).success)fail(429,'Slow down');
      if(request.method==='GET'&&path==='/v1/me')return json({...player,scores:await personal(env,player.id)});
      if(request.method==='POST'&&path==='/v1/practice'){await bodyOf(request);return await startPractice(env,player,now);}
      if(request.method==='POST'&&path==='/v1/practice/attempts')return await submitPractice(request,env,player,now);
      if(request.method==='POST'&&path==='/v1/sessions')return await start(request,env,player,now);
      if(request.method==='POST'&&path==='/v1/me'){
        const {country}=await bodyOf(request);
        if(typeof country!=='string'||country.length>12||!flagCodeForCountryId(country)||!countryNameForId(country))fail(400,'Invalid country');
        await reserve(env,now,8,player.id);
        await env.DB.prepare(`INSERT INTO player_countries(player_id,country) VALUES (?,?)
          ON CONFLICT(player_id) DO UPDATE SET country=excluded.country`).bind(player.id,country.trim().toUpperCase()).run();
        return json({country:country.trim().toUpperCase()});
      }
      if(request.method==='POST'&&path==='/v1/ready')return await ready(request,env,player,now);
      if(request.method==='POST'&&path==='/v1/attempts')return await attempt(request,env,player,now);
      if(request.method==='POST'&&path==='/v1/delete-player'){
        await bodyOf(request);await env.DB.prepare('DELETE FROM players WHERE id=?').bind(player.id).run();return json({deleted:true});
      }
      fail(405,'Method not allowed');
    } catch(error) {
      const response=json({error:error instanceof HttpError?error.message:'Service temporarily unavailable'},error.status||503);
      if(error.message==='Daily service capacity reached')response.headers.set('Retry-After',String(Math.ceil((DAY-Date.now()%DAY)/1000)));
      return response;
    }
  },
  async scheduled(event,env) {
    // Sessions are bounded to one per player; old rows and daily counters are pruned.
    await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE deadline < ?').bind(Date.now()-DAY),
      env.DB.prepare('DELETE FROM practice_batches WHERE expires_at < ?').bind(Date.now()-DAY),
      env.DB.prepare("DELETE FROM quotas WHERE key LIKE '%:%' AND CAST(substr(key,instr(key,':')+1) AS INTEGER) < ?").bind(Math.floor(Date.now()/DAY)-2)]);
  }
};
