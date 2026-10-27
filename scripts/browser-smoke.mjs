import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { cmd } from 'web-ext';

// Uses fresh test-only copies of the packaged extensions and isolated headless profiles.
// The loopback reporting permission and smoke files are never added to store ZIPs.
const root=process.cwd(), artifacts=path.join(root,'web-ext-artifacts');
let recordPath;
try { ({recordPath}=JSON.parse(await fs.readFile(path.join(artifacts,'latest-release.json')))); }
catch(error) { if(error.code!=='ENOENT')throw error; }
const releases=JSON.parse(await fs.readFile(recordPath || path.join(artifacts,'release-sizes.json')));
const packages=recordPath ? releases.packages : releases;
// Current learning/popup flows have dedicated learning-browser.mjs audits. This
// option keeps engine/review smoke coverage usable without the legacy Home flow.
const reviewOnly=process.argv.includes('--review-only');
const requested=process.argv.slice(2).filter(arg=>arg!=='--review-only');
if(requested.some(browser=>!['chrome','firefox'].includes(browser)))throw Error('Optional arguments: chrome firefox');
const reportDir=recordPath ? path.dirname(recordPath) : artifacts;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const reports=new Map();
const server=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  res.setHeader('Access-Control-Allow-Origin','*');res.end('ok');
  if(body){const data=JSON.parse(body);console.log(JSON.stringify(data));if(data.done)reports.set(data.browser,data);}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const endpoint=`http://127.0.0.1:${server.address().port}`;
let chromeProcess, ws, firefoxRunner;
try {
  for(const release of packages.filter(p=>!requested.length||requested.includes(p.browser))){
    const sourceDir=await fs.mkdtemp(path.join(artifacts,`smoke-${release.browser}-`));
    await fs.cp(release.sourceDir,sourceDir,{recursive:true});
    const manifest=JSON.parse(await fs.readFile(path.join(sourceDir,'manifest.json')));
    manifest.host_permissions.push('http://127.0.0.1/*');
    await fs.writeFile(path.join(sourceDir,'manifest.json'),JSON.stringify(manifest));
    // Iframe dimensions are CSS pixels and do not resize when their parent tab
    // zooms. Exercise the responsive fallback here; release-layout.mjs checks
    // the real tab/window zoom fit separately.
    await fs.appendFile(path.join(sourceDir,'analysis.js'), '\nglobalThis.__smokeResponsive=()=>{fitViewport();};\nglobalThis.__smokePreferences=()=>({settings:structuredClone(S.settings),layoutMode:S.layoutMode,layout:structuredClone(layoutForSave())});\n');
    await fs.appendFile(path.join(sourceDir,'analysis.js'), '\nglobalThis.__smokeLearningReview=()=>({idx:S.idx,flipped:S.flipped,fen:activePos().fen,classif:[...S.classif]});\n');
    await fs.appendFile(path.join(sourceDir,'analysis.js'), '\nglobalThis.__smokePuzzleCount=()=>learningWorkspace?.ready?learningWorkspace.puzzles.length:0;\n');
    await fs.appendFile(path.join(sourceDir,'background.js'), '\nbrowserAPI.runtime.onInstalled.addListener(() => browserAPI.tabs.create({url:browserAPI.runtime.getURL("smoke.html")}));\n');
    await fs.appendFile(path.join(sourceDir,'background.js'), '\nbrowserAPI.runtime.onMessage.addListener((message,sender,reply)=>{if(message.type!=="smokeReleaseReset")return;resetSettingsForRelease({reason:"update",previousVersion:"0.3.0"}).then(()=>reply({ok:true}),error=>reply({error:error.message}));return true;});\n');
    await fs.writeFile(path.join(sourceDir,'smoke.html'),'<!doctype html><script type="module" src="smoke-client.js"></script>');
    await fs.writeFile(path.join(sourceDir,'smoke-client.js'), `
import {browserAPI} from './browser-compat.js';
import {Engine} from './engine/uci.js';
import {Chess} from './lib/chess.js';
import {calibratedReview} from './lib/calibrated-review.js';
import {resetSettingsForRelease} from './release-settings.js';
import {UI_SETUPS,MODERN_LAYOUT} from './lib/ui-setups.js';
const report=data=>fetch(${JSON.stringify(endpoint)},{method:'POST',body:JSON.stringify({browser:${JSON.stringify(release.browser)},...data})});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try {
  const waitWorkspace=async(frame,previousDocument)=>{
    for(let i=0;i<150;i++){
      await wait(100);
      const doc=frame.contentDocument;
      if(doc===previousDocument)continue;
      if(doc?.querySelector('.board')&&frame.contentWindow.__smokePreferences&&!doc.querySelector('#startup'))return frame.contentWindow.__smokePreferences();
      const error=doc?.querySelector('#error');if(error&&!error.hidden)throw Error(error.textContent);
    }
    throw Error('Workspace did not become ready');
  };
  const assertModern=preferences=>{
    const settings=preferences.settings;
    if(settings.uiSetup!=='modern'||settings.uiSetupBase!=='modern'||settings.engineLines!==2||settings.classifyLines!==2||preferences.layoutMode!=='custom')throw Error('Modern defaults missing');
    for(const [key,value]of Object.entries(UI_SETUPS.modern.designs))if(settings[key]!==value)throw Error('Modern design missing: '+key);
    for(const [key,box]of Object.entries(MODERN_LAYOUT))for(const [property,value]of Object.entries(box)){
      if(!(Math.abs(preferences.layout[key]?.[property]-value)<=1e-6))throw Error('Modern layout mismatch: '+key+'.'+property+' '+preferences.layout[key]?.[property]+' instead of '+value);
    }
  };
  const waitNote=async frame=>{
    for(let i=0;i<100;i++){if(frame.contentDocument.querySelector('.learning-announcement'))return;await wait(100);}
    throw Error('Developer note missing');
  };
  // A brand-new isolated profile must get both Modern and the once-only note.
  await resetSettingsForRelease({reason:'startup'});
  const fresh=document.createElement('iframe');fresh.style='width:1680px;height:1000px';
  fresh.src='analysis.html?workspace=blank';document.body.append(fresh);
  assertModern(await waitWorkspace(fresh));await waitNote(fresh);
  if(fresh.contentDocument.querySelectorAll('.learning-announcement-target').length!==2)throw Error('Developer note must highlight both learning buttons');
  fresh.contentDocument.querySelector('.learning-announcement-dismiss').click();
  const firstDocument=fresh.contentDocument;
  fresh.src='analysis.html?workspace=blank';
  assertModern(await waitWorkspace(fresh,firstDocument));await wait(300);
  if(fresh.contentDocument.querySelector('.learning-announcement'))throw Error('New-install note repeated');
  fresh.contentDocument.querySelector('.learn-entry-button').click();
  for(let i=0;i<200&&fresh.contentWindow.__smokePuzzleCount()!==50000;i++)await wait(100);
  if(fresh.contentWindow.__smokePuzzleCount()!==50000)throw Error('Packaged puzzle library did not load all 50,000 puzzles');
  fresh.remove();await report({step:'fresh-install-modern-and-note',modernPersists:true,twoPanelLines:true,bothButtonsHighlighted:true,noteShownOnce:true});
  await report({step:'packaged-puzzle-library',count:50000});
  const results=[];
  for(const [key,file] of [['nnue','engine/stockfish-nnue.js'],['sf19lite','engine/stockfish-19-lite-single.js']]) {
    const engine=new Engine(file);
    try {
      await engine.setOptions({Hash:16,MultiPV:2});
      const search=await engine.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',8,2);
      if(!/^[a-h][1-8][a-h][1-8]/.test(search.bestmove)||!Number.isFinite(search.score.cp))throw Error('Invalid engine result');
      results.push({key,bestmove:search.bestmove,score:search.score});
      await report({step:'real-engine',result:results.at(-1)});
    } finally {engine.terminate();}
    const id='smoke-'+key;
    const pgn='[WhiteElo "1500"]\\n[BlackElo "1800"]\\n\\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 *';
    await browserAPI.storage.local.set({settings:{...(key==='sf19lite'?{enginePath:'sf19'}:{}),ratingMode:'context',engineDepth:8,engineWorkers:1,depthBumped:true,sound:false,coachPlain:true},['job:'+id]:{pgn,meta:{gameId:id},source:'pgn'}});
    const frame=document.createElement('iframe');frame.style='width:1680px;height:1000px';frame.src='analysis.html#'+id;document.body.append(frame);
    let saved;
    for(let i=0;i<250;i++){await wait(100);saved=(await browserAPI.storage.local.get('analysis:'+id))['analysis:'+id];if(saved)break;}
    if(!saved||saved.engineBuild!==key||saved.evals.length!==23||!saved.evals.every(Boolean))throw Error('Review did not complete with '+key+': '+frame.contentDocument?.body?.innerText?.slice(-1200));
    const board=frame.contentDocument.querySelector('.board');if(!board)throw Error('Board missing');
    const doc=frame.contentDocument;
    if(typeof frame.contentWindow.navigator.locks?.request!=='function')throw Error('Cross-tab library locks unavailable');
    doc.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));
    const glyph=doc.querySelector('.sq-badge');
    if(!glyph?.querySelector('svg > circle')||!glyph.getAttribute('aria-label'))throw Error('Vector move glyph missing');
    const numeral=doc.querySelector('.grade-badge .grade-numeral');
    if(!numeral||!/^\\d+(\\.\\d)?$/.test(numeral.textContent))throw Error('Numeric category glyph missing');
    if(glyph.querySelector('text')&&!/score /.test(glyph.getAttribute('aria-label')))throw Error('Move grade accessible label missing');
    await report({step:'numeric-glyph',key,label:glyph.getAttribute('aria-label'),reference:numeral.textContent});
    await report({step:'completed-review',key,positions:saved.evals.length,engineBuild:saved.engineBuild});
    doc.querySelector('[aria-label="Settings"]').click();
    [...doc.querySelectorAll('.set-tab')].find(button=>button.textContent==='Engine').click();
    const ratingSection=()=>[...doc.querySelectorAll('.set-section')].find(section=>section.textContent.includes('Estimated rating'));
    const labels=[...ratingSection().querySelectorAll('.lib-dd-opt')].map(button=>button.textContent);
    if(JSON.stringify(labels)!==JSON.stringify(['Use recorded rating','Moves only']))throw Error('Rating options missing for '+key);
    if(JSON.stringify([...doc.querySelectorAll('.set-tab')].map(tab=>tab.textContent))!==JSON.stringify(['Visual','Engine']))throw Error('Settings tabs changed');
    if(doc.querySelector('#conceptsMount'))throw Error('Retired concept panel present');
    const calibration=await (await fetch('./data/calibration.json')).json();
    const chess=new Chess(),game=new Chess(),positions=[{fen:chess.fen()}];
    game.loadPgn(pgn);
    for(const move of game.history({verbose:true})) {
      const played=chess.move({from:move.from,to:move.to,promotion:move.promotion});
      positions.push({...played,fen:chess.fen()});
    }
    for(const [mode,label] of [['moves','Moves only'],['context','Use recorded rating']]) {
      const previousKey=saved.settingsKey;
      ratingSection().querySelector('.lib-dd-btn').click();
      [...ratingSection().querySelectorAll('.lib-dd-opt')].find(button=>button.textContent===label).click();
      for(let i=0;i<250;i++) {
        await wait(100);
        const next=(await browserAPI.storage.local.get('analysis:'+id))['analysis:'+id];
        if(next?.settingsKey!==previousKey){saved=next;break;}
      }
      const stored=(await browserAPI.storage.local.get('settings')).settings;
      if(stored.ratingMode!==mode||saved.settingsKey===previousKey)throw Error('Rating mode did not persist/reanalyze for '+key);
      if(ratingSection().querySelector('.lib-dd-cur').textContent!==label)throw Error('Rating mode display stale for '+key);
      if(key==='sf19lite') {
        const scores=calibratedReview(positions,saved.bests,calibration,{w:{rating:1500},b:{rating:1800}},mode);
        if(['w','b'].some(color=>scores[color].ratingMethod!==mode||!Number.isFinite(scores[color].rating)))throw Error('SF19 rating mode not honored by real evidence');
        await report({step:'real-rating-mode',key,mode,ratings:{w:scores.w.rating,b:scores.b.rating}});
      }
    }
    await report({step:'rating-controls',key,labels,persistedModes:['moves','context']});
    if(key==='nnue') {
      frame.contentWindow.__smokeResponsive();
      const sizes=[[1920,920],[1366,648],[1280,600],[1470,836],[1024,648],[820,648],[768,900],[390,844],[320,640]];
      for(const [width,height] of sizes) {
        frame.style.width=width+'px';frame.style.height=height+'px';await wait(250);
        const rect=doc.querySelector('.board').getBoundingClientRect();
        if(Math.abs(rect.width-rect.height)>1||doc.documentElement.scrollWidth>frame.contentWindow.innerWidth+1)
          throw Error('Responsive layout overflow or distorted board at '+width+'x'+height);
      }
      frame.style.width='1680px';frame.style.height='1000px';await wait(250);
      await report({step:'responsive-layouts',sizes});
      if (${!reviewOnly}) {
      const reviewBefore=JSON.stringify(frame.contentWindow.__smokeLearningReview());
      const clickLearning=text=>{
        const button=[...doc.querySelectorAll('.learning-workspace button')].find(b=>b.textContent===text);
        if(!button)throw Error('Learning control missing: '+text);button.click();
      };
      const waitLearning=async(predicate,label)=>{for(let i=0;i<150;i++){if(predicate())return;await wait(100);}throw Error('Learning timed out: '+label);};
      doc.querySelector('.learn-entry-button').click();
      await waitLearning(()=>doc.querySelector('.destinations'),'Home');
      clickLearning('Chess Concepts');await waitLearning(()=>doc.querySelector('.learn-category'),'Concept library');
      const forkCard=[...doc.querySelectorAll('.learn-card')].find(card=>card.querySelector('h3').textContent==='Forks and double attacks');
      forkCard.querySelector('button').click();await waitLearning(()=>doc.querySelector('.learn-tabs'),'Lesson');
      clickLearning('Practise');await waitLearning(()=>doc.querySelector('.learn-move-input'),'Exercise');
      doc.querySelector('[data-square=e4]').click();doc.querySelector('[data-square=f6]').click();
      await waitLearning(()=>doc.querySelector('.learn-feedback.correct'),'Concept proof worker');
      clickLearning('Openings');await waitLearning(()=>doc.querySelector('[aria-label="Playing color"]'),'Opening library');
      const italian=[...doc.querySelectorAll('.learn-card')].find(card=>card.querySelector('h3').textContent==='Italian Game');
      [...italian.querySelectorAll('button')].find(b=>b.textContent==='Study opening').click();await waitLearning(()=>doc.querySelector('[aria-label="Practice color"]'),'Opening course');
      const color=doc.querySelector('[aria-label="Practice color"]');color.value='b';color.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));await wait(100);
      clickLearning('Practise this line');await waitLearning(()=>doc.querySelector('.learn-move-input'),'Opening practice');
      doc.querySelector('[data-square=e7]').click();doc.querySelector('[data-square=e5]').click();
      await waitLearning(()=>doc.querySelector('[data-square=f3] .piece-img')?.dataset.piece==='wN','Automatic White reply');
      clickLearning('Puzzles');await waitLearning(()=>doc.querySelector('.learn-practice-actions'),'Puzzle room');
      clickLearning('Mixed practice');await waitLearning(()=>doc.querySelector('.learn-move-input'),'Puzzle');
      if(doc.querySelector('.learn-board .annotated')||doc.querySelector('.learn-copy').textContent.includes('Why the solution works'))throw Error('Puzzle leaked solution');
      clickLearning('Reveal solution');await waitLearning(()=>doc.querySelector('.learn-feedback.revealed'),'Solution reveal');
      doc.querySelector('#learningToggle').click();await waitLearning(()=>!doc.querySelector('.learning-workspace'),'Return to review');
      if(JSON.stringify(frame.contentWindow.__smokeLearningReview())!==reviewBefore)throw Error('Learning changed the review state');
      const learning=(await browserAPI.storage.local.get('learning:v1'))['learning:v1'];
      if(!learning?.lessons.fork.exercises[0]?.passed||!Object.values(learning.puzzles).some(p=>p.assisted>0))throw Error('Learning progress not persisted');
      await report({step:'learning',proofWorker:true,openingBlackReply:true,puzzleSpoilersHidden:true,assistancePersisted:true,reviewPreserved:true});
      }
    }
    const handoff=(await browserAPI.storage.local.get('job:'+id))['job:'+id];
    if(handoff)throw Error('Completed startup left its one-shot handoff behind');
    const previousDocument=frame.contentDocument;
    frame.contentWindow.location.reload();
    for(let i=0;i<100;i++) {
      await wait(100);
      if(frame.contentDocument!==previousDocument&&frame.contentDocument?.querySelector('.board'))break;
    }
    if(frame.contentDocument===previousDocument||!frame.contentDocument?.querySelector('.board')
      ||!frame.contentDocument.querySelector('#error').hidden)throw Error('Review reload lost its game for '+key);
    await report({step:'review-reload',key});
    frame.remove();
  }
  // Simulate upgrading a 0.3.0 user to 0.4.0 against real browser storage and render the
  // resulting defaults. Existing engine tests above also populate saved games.
  await browserAPI.storage.local.remove(['settingsResetFor040','learningAnnouncement:puzzles:seen','learningAnnouncement:puzzles:disabled']);
  localStorage.removeItem('learningAnnouncement:puzzles:seen');localStorage.removeItem('learningAnnouncement:puzzles:disabled');
  const resetJob={pgn:'1. e4 e5 *',meta:{gameId:'reset-smoke'},source:'pgn'};
  const library=(await browserAPI.storage.local.get('library')).library;
  library[0].fav=true;
  await browserAPI.storage.local.set({settingsResetFor030:true,username:'reset-user',library,
    settings:{uiSetup:'old',boardTheme:'custom',pieceStyle:'merida',coach:'professor',sound:false,soundVolume:0,moveAnim:false,animSpeed:3,soundFx:{move:{snd:'default',volume:21}},enginePath:'sf19lite',engineLines:1,classifyLines:3},
    'playerHistory:v1':{chesscom:[{id:'preserved-history',white:'reset-user',black:'opponent'}]},
    layout:{board:{x:20,y:30,w:400,h:400}},layoutMode:'custom',layoutVersion:8,
    'job:reset-smoke':resetJob});
  const before=await browserAPI.storage.local.get(null);
  const [backgroundReset]=await Promise.all([
    browserAPI.runtime.sendMessage({type:'smokeReleaseReset'}),
    resetSettingsForRelease({reason:'startup'}),
    resetSettingsForRelease({reason:'update',previousVersion:'0.3.0'}),
  ]);
  if(!backgroundReset.ok)throw Error('Background reset failed: '+backgroundReset.error);
  const after=await browserAPI.storage.local.get(null);
  for(const key of Object.keys(before)) {
    if(['settings','layout','layoutMode','layoutVersion'].includes(key))continue;
    if(JSON.stringify(before[key])!==JSON.stringify(after[key]))throw Error('Release reset changed '+key);
  }
  if(!after.settingsResetFor040||after.settings.uiSetup!=='modern'||after.layout!==null||after.layoutMode!=='custom')throw Error('Release migration did not save Modern');
  const resetFrame=document.createElement('iframe');resetFrame.style='width:1680px;height:1000px';
  resetFrame.src='analysis.html#reset-smoke';document.body.append(resetFrame);
  let previousWorkspace;
  const preferences=async()=>{
    const result=await waitWorkspace(resetFrame,previousWorkspace);
    previousWorkspace=resetFrame.contentDocument;return result;
  };
  const defaults=await preferences();
  assertModern(defaults);await waitNote(resetFrame);
  resetFrame.contentDocument.querySelector('.learning-announcement-dismiss').click();
  for(const [key,value] of Object.entries({boardTheme:'maple',pieceStyle:'image',coach:'old_soviet',sound:false,soundVolume:0,moveAnim:false,animSpeed:3,enginePath:'nnue'})) {
    if(defaults.settings[key]!==value)throw Error('Reset default incorrect: '+key);
  }
  await wait(400); // Let startup's saved layout settle before the customization.
  await browserAPI.storage.local.set({settings:{...defaults.settings,boardTheme:'coral',soundVolume:23}});
  await resetSettingsForRelease({reason:'update',previousVersion:'0.4.0'});
  resetFrame.src='about:blank';await wait(100);
  await browserAPI.storage.local.set({'job:reset-smoke':resetJob});
  resetFrame.src='analysis.html#reset-smoke';
  const reopened=await preferences();
  assertModern(reopened);await wait(300);
  if(resetFrame.contentDocument.querySelector('.learning-announcement'))throw Error('Upgrade note repeated');
  if(reopened.settings.boardTheme!=='coral'||reopened.settings.soundVolume!==23)throw Error('Release reset repeated after customization');
  if(!(await browserAPI.storage.local.get('library')).library.find(game=>game.id===library[0].id)?.fav)throw Error('Favorite flag lost after reopening');
  // Exercise recovery when the install/update handler never completed: actual
  // review startup must reset before building its first UI, without an event.
  resetFrame.src='about:blank';await wait(100);
  await browserAPI.storage.local.remove('settingsResetFor040');
  await browserAPI.storage.local.set({'job:reset-smoke':resetJob});
  resetFrame.src='analysis.html#reset-smoke';
  const retried=await preferences();
  assertModern(retried);
  if(retried.settings.boardTheme!=='maple'||retried.settings.soundVolume!==23||retried.settings.moveAnim!==false)throw Error('Review startup failed to recover the migration');
  if(!(await browserAPI.storage.local.get('library')).library.find(game=>game.id===library[0].id)?.fav)throw Error('Favorite flag lost after startup recovery');
  resetFrame.remove();
  await report({step:'one-time-release-migration-040',preservedUsername:true,preservedGamesAndFavorites:true,preservedAnalyses:true,preservedPlayerHistory:true,preservedAudioAndMotion:true,modernPersisted:true,twoPanelLines:true,noteShownOnce:true,customizationsRetained:true,backgroundAndPageCoordination:true,startupRecovery:true});
  await report({done:true,ok:true,results,learning:${!reviewOnly}});
} catch(e){await report({done:true,ok:false,error:e.message,stack:e.stack});}
`);
    if(release.browser==='chrome'){
      const profile=await fs.mkdtemp(path.join(artifacts,'smoke-chrome-profile-'));
      chromeProcess=spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
        '--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
        '--enable-unsafe-extension-debugging',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
      let portInfo;
      for(let i=0;i<100;i++){try{portInfo=await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8');break;}catch{await sleep(100);}}
      if(!portInfo)throw Error('Chrome did not expose debugging port');
      const [port,route]=portInfo.trim().split(/\r?\n/);
      ws=new WebSocket(`ws://127.0.0.1:${port}${route}`);
      await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;setTimeout(()=>j(Error('CDP connection timed out')),10000).unref();});
      let seq=0;const pending=new Map();
      ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const [r,j]=pending.get(m.id);pending.delete(m.id);m.error?j(Error(JSON.stringify(m.error))):r(m.result);}};
      const call=(method,params={})=>new Promise((r,j)=>{const id=++seq;pending.set(id,[r,j]);setTimeout(()=>j(Error(method+' timed out')),15000).unref();ws.send(JSON.stringify({id,method,params}));});
      const loaded=await call('Extensions.loadUnpacked',{path:sourceDir});
      console.log('Chrome extension loaded:',loaded.id);
    } else {
      const profile=await fs.mkdtemp(path.join(artifacts,'smoke-firefox-profile-'));
      firefoxRunner=await cmd.run({sourceDir,artifactsDir:artifacts,firefox:process.env.FIREFOX_PATH || 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',firefoxProfile:profile,keepProfileChanges:true,target:['firefox-desktop'],args:['-headless'],noReload:true,noInput:true,startUrl:['about:blank']});
    }
    for(let i=0;i<6000&&!reports.has(release.browser);i++)await sleep(100);
    if(!reports.get(release.browser)?.ok)throw Error(JSON.stringify(reports.get(release.browser)||{error:'Browser smoke timed out',browser:release.browser}));
    if(release.browser==='chrome'){ws.close();chromeProcess.kill();chromeProcess=null;}else{await firefoxRunner.exit();firefoxRunner=null;}
  }
  await fs.writeFile(path.join(reportDir,'browser-smoke-results.json'),JSON.stringify([...reports.values()],null,2));
} finally {
  ws?.close();chromeProcess?.kill();if(firefoxRunner)await firefoxRunner.exit();server.close();
}
