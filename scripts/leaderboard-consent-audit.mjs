import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function auditLearning({review,call,evaluate,waitFor,out}) {
  const run=expression=>evaluate(review,expression);
  await run("import('./analysis.js').then(m=>m.openLearning())");
  await waitFor(review,"!!document.querySelector('.puzzle-mode-grid')&&!document.querySelector('.learn-transition-surface')",'Puzzle modes');
  await run(`import('./analysis.js').then(({learningWorkspace:w})=>{
    window.consentRequests=[];w.leaderboardClient.endpoint='https://isolated-consent.example';
    w.leaderboardClient.fetcher=async(url,options)=>{
      window.consentRequests.push({url,body:options.body});
      if(url.endsWith('/v1/me'))return Response.json(options.body?{country:null}:{id:'audit-player',name:'Knight-audit',scores:{}});
      if(url.endsWith('/v1/delete-player'))return Response.json({deleted:true});
      return Response.json({rows:[{id:'audit-player',name:'Knight-audit',score:42,country:'DK'}],hasNext:false});
    };
  })`);
  const screenshot=async(name,selector)=>{
    await run(`document.querySelector('${selector}').scrollIntoView({block:'start'})`);
    const clip=await run(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:Math.min(r.height,window.innerHeight-r.y),scale:1};})()`);
    const {data}=await call('Page.captureScreenshot',{format:'png',clip},review.sessionId);
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(data,'base64'));
  };
  await run("document.querySelector('[data-focus=leaderboard-timeAttack]').click()");
  await waitFor(review,"!!document.querySelector('.leaderboard-opt-in')&&!document.querySelector('.leaderboard-entering')",'Opt-in panel');
  assert.equal(await run('window.consentRequests.length'),0);
  assert.equal(await run("!!document.querySelector('.leaderboard-table,.leaderboard-pagination')"),false);
  const gap=await run("document.querySelector('.leaderboard-opt-in').getBoundingClientRect().top-document.querySelector('.leaderboard-hero').getBoundingClientRect().bottom");
  assert.ok(gap>=40);await screenshot('leaderboard-opt-in','.learn-leaderboard');
  await run("document.querySelector('[data-focus=leaderboard-opt-in]').click()");
  assert.equal(await run("document.querySelector('[data-focus=leaderboard-nationality-choice]').value"),'');
  assert.equal(await run("document.querySelector('[data-focus=leaderboard-join]').disabled"),true);
  await run("(()=>{const field=document.querySelector('[data-focus=leaderboard-nationality-choice]');field.value='none';field.dispatchEvent(new Event('change'));})()");
  assert.equal(await run("import('./browser-compat.js').then(async({browserAPI:api})=>!!(await api.storage.local.get('leaderboardPreferences:v1'))['leaderboardPreferences:v1'])"),false);
  await screenshot('leaderboard-nationality-choice','.leaderboard-opt-in');
  await run("document.querySelector('[data-focus=leaderboard-join]').click()");
  await waitFor(review,"!!document.querySelector('.leaderboard-table tbody tr')&&!document.querySelector('.leaderboard-entering')",'Opted-in rankings');
  assert.equal(await run("import('./analysis.js').then(({learningWorkspace:w})=>w.leaderboardClient.preferences()).then(p=>p.enabled&&!p.showNationality)"),true);
  await run("import('./analysis.js').then(async({learningWorkspace:w})=>{await w.leaderboardClient.connect('a'.repeat(64));await w.showLeaderboard('timeAttack');})");
  await waitFor(review,"!!document.querySelector('[data-focus=leaderboard-settings]')&&!document.querySelector('.leaderboard-entering')",'Connected player controls');
  await run("document.querySelector('[data-focus=leaderboard-settings]').click()");
  await waitFor(review,"!document.querySelector('#settings').hidden&&document.querySelector('.set-leaderboard-settings')?.dataset.state==='enabled'",'Leaderboard settings');
  assert.equal(await run("document.querySelector('.set-tab.on').textContent"),'General');
  await screenshot('leaderboard-general-settings','.set-leaderboard-settings');
  const choose=async value=>{
    await run("(()=>{const field=document.querySelector('[data-leaderboard-setting=nationality]');field.value='"+value+"';field.dispatchEvent(new Event('change'));})()");
    await waitFor(review,"document.querySelector('.set-leaderboard-settings')?.getAttribute('aria-busy')==='false'&&document.querySelector('[data-leaderboard-setting=nationality]')?.value==='"+value+"'",'Nationality saved');
  };
  await choose('DK');
  assert.equal(await run("window.consentRequests.some(r=>r.body&&JSON.parse(r.body).country==='DK')"),true);
  await screenshot('leaderboard-general-nationality','.set-leaderboard-settings');
  await choose('US');
  assert.equal(await run("window.consentRequests.some(r=>r.body&&JSON.parse(r.body).country==='US')"),true);
  await choose('none');
  assert.equal(await run("window.consentRequests.some(r=>r.body&&JSON.parse(r.body).country===null)"),true);
  await run("document.querySelector('[data-leaderboard-setting=delete]').click()");
  await screenshot('leaderboard-general-deletion','.set-leaderboard-settings');
  await run("document.querySelector('[data-leaderboard-setting=cancel-delete]').click()");
  assert.equal(await run("window.consentRequests.filter(r=>r.url.endsWith('/v1/delete-player')).length"),0);
  await run("document.querySelector('[data-leaderboard-setting=delete]').click();document.querySelector('[data-leaderboard-setting=confirm-delete]').click()");
  await waitFor(review,"document.querySelector('.set-leaderboard-settings')?.dataset.state==='off'&&document.querySelector('.set-leaderboard-settings').getAttribute('aria-busy')==='false'",'Opted out');
  assert.equal(await run("import('./analysis.js').then(({learningWorkspace:w})=>!!w.root.querySelector('.leaderboard-opt-in'))"),true);
  assert.equal(await run("import('./analysis.js').then(({learningWorkspace:w})=>w.leaderboardClient.credentials())"),null);
  assert.equal(await run("window.consentRequests.filter(r=>r.url.endsWith('/v1/delete-player')).length"),1);
  await screenshot('leaderboard-general-off','.set-leaderboard-settings');
  // Native storage events also withdraw access when preferences change elsewhere.
  await run("import('./analysis.js').then(async m=>{await m.toggleSettings();await m.learningWorkspace.leaderboardClient.optIn(false);await m.learningWorkspace.showLeaderboard('timeAttack');})");
  await run("import('./browser-compat.js').then(({browserAPI:api})=>api.storage.local.set({'leaderboardPreferences:v1':{version:1,enabled:false,showNationality:false}}))");
  await waitFor(review,"!!document.querySelector('.leaderboard-opt-in')",'Storage-event withdrawal');
  assert.equal(await run("!!document.querySelector('.leaderboard-table')"),false);
  console.log('Leaderboard consent: native storage, gated viewing, separate nationality, removal, opt-out, deletion and settings passed. Screenshots: '+out);
}
