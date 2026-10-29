import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function auditLearning({review,call,evaluate,waitFor,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(m=>m.openLearning())");
  await waitFor(review,"!!document.querySelector('.puzzle-mode-grid')&&!document.querySelector('.learn-transition-surface')",'Puzzle modes');
  await run(`Promise.all([import('./analysis.js'),import('./lib/learning/leaderboard-client.js'),import('./browser-compat.js')]).then(async([m,{LeaderboardClient},{browserAPI:api}])=>{
    const w=m.learningWorkspace,ids=w.puzzles.slice(0,15).map(p=>p.id);window.syncCalls=[];window.syncTotal=0;window.syncRevision=0;window.syncIds=ids.slice(0,5);
    await api.storage.local.set({'leaderboard:v1':{id:'sync-player',name:'Knight-sync',token:'a'.repeat(64),scores:{}},'leaderboard:practice:v1':null});
    const fetcher=async(url,options)=>{const route=new URL(url).pathname;window.syncCalls.push(route);
      if(route.startsWith('/v1/boards/'))return Response.json({rows:[],hasNext:false});
      if(route==='/v1/practice/attempts'){const body=JSON.parse(options.body);window.syncTotal+=body.attempts.length;window.syncRevision++;window.syncIds=window.syncIds.slice(body.attempts.length);}
      return Response.json({id:'browser-batch',revision:window.syncRevision,puzzleIds:window.syncIds,expiresAt:Date.now()+604800000,total:window.syncTotal});};
    window.syncClient=w.leaderboardClient=new LeaderboardClient(api.storage.local,{endpoint:'https://isolated-sync.example',fetcher});
    w.leaderboardClient.onPersonalChange=()=>w.updateLeaderboardPersonal();
  })`);
  await run("import('./analysis.js').then(m=>m.learningWorkspace.showLeaderboard('solve-puzzle'))");
  assert.equal(await run("document.querySelector('.leaderboard-personal strong').textContent"),'0');
  assert.equal(await run("document.querySelector('[data-focus=leaderboard-refresh]').textContent"),'↻ Refresh');
  await run(`import('./analysis.js').then(async({learningWorkspace:w})=>{window.syncBatch=await window.syncClient.start('solve-puzzle');
    await window.syncClient.practice.record(window.syncBatch.puzzleIds[0],['e2e4']);await w.updateLeaderboardPersonal();})`);
  assert.equal(await run("document.querySelector('.leaderboard-personal strong').textContent"),'1');
  assert.match(await run("document.querySelector('.leaderboard-personal').textContent"),/Syncing/);
  assert.equal(await run("window.syncCalls.filter(p=>p.endsWith('/attempts')).length"),0);
  const pending=await run("import('./browser-compat.js').then(({browserAPI:api})=>api.storage.local.get('leaderboard:practice:v1')).then(s=>s['leaderboard:practice:v1'].pending.length)");
  assert.equal(pending,1,'Pending proof is persisted using native storage under the origin lock');
  await run("import('./analysis.js').then(async({learningWorkspace:w})=>{await w.returnFromLeaderboard();await w.showLeaderboard('solve-puzzle');})");
  assert.equal(await run("window.syncCalls.filter(p=>p.endsWith('/attempts')).length"),1);
  assert.equal(await run("window.syncCalls.filter(p=>p.startsWith('/v1/boards/')).length"),1,'Reopening reuses the cached page');
  assert.match(await run("document.querySelector('.leaderboard-personal').textContent"),/Saved/);
  assert.equal(await run("import('./analysis.js').then(m=>m.learningWorkspace.leaderboardTimer===null)"),true,'No polling timer');
  const clip=await run("(()=>{const r=document.querySelector('.learn-leaderboard').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:Math.min(r.height,innerHeight-r.y),scale:1};})()");
  const {data}=await call('Page.captureScreenshot',{format:'png',clip},review.sessionId);
  await fs.writeFile(path.join(out,'leaderboard-sync-personal.png'),Buffer.from(data,'base64'));
  await run('window.syncClient.practice.stop()');
  console.log('Leaderboard sync: native storage/locks, queued personal score, verified-state handoff, on-open flush, page cache and no polling passed. Screenshot: '+out);
}
