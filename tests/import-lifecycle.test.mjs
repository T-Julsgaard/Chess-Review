import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {createImportRequest,fetchImport,importDelay,waitImport} from '../lib/import-request.js';
import {deferred,settle} from './helpers/app.mjs';

for(const phase of ['headers','body'])test(`import cancellation releases stalled ${phase} and permits a retry`,async t=>{
  const stalled=deferred(),request=createImportRequest();t.after(()=>request.dispose());
  t.mock.method(globalThis,'fetch',async()=>phase==='headers'?stalled.promise:{ok:true,text:()=>stalled.promise});
  const work=(async()=>{const response=await fetchImport('https://example.test',{signal:request.signal});return response.text();})();
  await settle();request.cancel();await assert.rejects(work,error=>error.code==='IMPORT_CANCELLED');
  stalled.resolve(phase==='headers'?{ok:true,text:async()=> 'late'}:'late');await settle();
  t.mock.method(globalThis,'fetch',async()=>({ok:true,text:async()=> 'retry'}));
  assert.equal(await (await fetchImport('https://example.test')).text(),'retry');
});
test('overall budget aborts pending browser work and retry delays',async t=>{
  const request=createImportRequest(undefined,10);t.after(()=>request.dispose());
  await assert.rejects(waitImport(new Promise(()=>{}),request.signal),error=>error.code==='IMPORT_TIMEOUT');
  const next=createImportRequest();t.after(()=>next.dispose());const delay=importDelay(60000,next.signal);next.cancel();
  await assert.rejects(delay,error=>error.code==='IMPORT_CANCELLED');
});

for(const [file,url,html,selector] of [
  ['content.js','https://www.chess.com/game/live/12345678','<div class="game-over-modal-shell-buttons"><a href="/analysis?tab=review">Review</a><div class="game-over-secondary-actions-row-component"></div></div>','.chess-analyzer-free-review'],
  ['lichess-content.js','https://lichess.org/AAAAAAAA','<div class="rcontrols"><div class="follow-up"><a class="fbt">Analysis board</a></div></div>','.chess-analyzer-review'],
]){
  function content(t){
    const dom=new JSDOM(html,{url,runScripts:'outside-only'}),w=dom.window,sent=[],jobs=[];t.after(()=>w.close());
    w.TextDecoder=TextDecoder;w.console={log(){},info(){},warn(){}};w.setTimeout=()=>0;
    w.fetch=async()=>{throw Error('No logo needed');};
    w.chrome={runtime:{getURL:p=>p,onMessage:{addListener(){}},sendMessage:message=>{const job=deferred();sent.push(message);jobs.push(job);return job.promise;}}};
    w.eval(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'));return {w,sent,jobs};
  }
  test(`${file}: late shared fragments deduplicate, retain failed delivery and preserve history state`,async t=>{
    const {w,sent,jobs}=content(t);const fragment='#gambit='+Buffer.from(JSON.stringify({pgn:'1. e4 e5'})).toString('base64');
    w.history.replaceState({kept:true},'',fragment);w.dispatchEvent(new w.HashChangeEvent('hashchange'));w.dispatchEvent(new w.HashChangeEvent('hashchange'));
    assert.equal(sent.length,1);assert.equal(w.location.hash,fragment);jobs[0].resolve({ok:false});await settle();assert.equal(w.location.hash,fragment);
    w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.equal(sent.length,2);jobs[1].resolve({ok:true});await settle();assert.equal(w.location.hash,'');assert.equal(w.history.state.kept,true);
  });
  test(`${file}: review button remains busy until completion without a five-second reset`,async t=>{
    const {w,sent,jobs}=content(t),button=w.document.querySelector(selector);assert.ok(button);button.click();await settle();
    assert.equal(button.disabled,true);assert.equal(sent[0].gameKey,url);jobs[0].resolve({ok:false,error:'Offline'});await settle();assert.equal(button.disabled,false);
    if(file==='lichess-content.js'){
      assert.match(button.textContent,/Couldn't open review/);assert.equal(button.title,'Offline');
      button.click();assert.equal(button.title,'');assert.equal(button.disabled,true);
      jobs[1].resolve({ok:true});await settle();assert.equal(button.disabled,false);assert.match(button.textContent,/Analyze with Chess Review/);
    }
  });
}
test('background joins same-game requests, cancels replaced games, and acknowledges shares only after tab handoff',async t=>{
  let listener;const calls=[],shares=[],errors=[];
  const context=vm.createContext({console,createImportRequest,waitImport,checkImport:signal=>{if(signal.aborted)throw signal.reason;},setTimeout,clearTimeout,
    browserAPI:{runtime:{onInstalled:{addListener(){}},onMessage:{addListener(fn){listener=fn;}}},commands:{onCommand:{addListener(){}}},storage:{local:{async get(){return {};},async set(value){errors.push(value);}}}},
    resetSettingsForRelease:async()=>{},reloadActiveAndAnalyze:async()=>{},
    createButtonPreviewService:()=>({cancel(){},get:async()=>({ok:false})}),createPreviewRunner:()=>()=>{},loadGameFromTab:()=>{},isSupportedChessUrl:()=>false,
    analyzeActiveTab:(_user,tab,{signal})=>{const work=deferred();calls.push({tab,signal,work});return waitImport(work.promise,signal);},
    openAnalysisTab:(payload,options)=>{const work=deferred();shares.push({payload,options,work});return work.promise;},
  });
  vm.runInContext(fs.readFileSync(new URL('../background.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''),context);
  const send=message=>new Promise(resolve=>assert.equal(listener(message,{tab:{id:7}},resolve),true));
  const a=send({type:'freeGameReview',gameKey:'A'}),b=send({type:'freeGameReview',gameKey:'A'});await settle();assert.equal(calls.length,1);
  const c=send({type:'freeGameReview',gameKey:'B'});await settle();assert.equal(calls.length,2);assert.equal(calls[0].signal.aborted,true);assert.equal((await a).ok,false);assert.equal((await b).ok,false);
  calls[1].work.resolve();assert.equal((await c).ok,true);assert.equal(errors.length,0);
  let acknowledged=false;const share=send({type:'openShared',payload:{pgn:'1. e4'}}).then(value=>{acknowledged=true;return value;});await settle();assert.equal(acknowledged,false);
  assert.equal(shares[0].options.sourceTabId,7);
  shares[0].work.resolve();assert.equal((await share).ok,true);
});

test('preview messages require a supported top-level page, including Lichess metadata fallback routes',async()=>{
  let listener;const calls=[];
  const context=vm.createContext({console,
    browserAPI:{runtime:{onInstalled:{addListener(){}},onMessage:{addListener(fn){listener=fn;}}},commands:{onCommand:{addListener(){}}}},
    createButtonPreviewService:()=>({cancel(...args){calls.push(['cancel',...args]);},async get(...args){calls.push(['get',...args]);return {ok:true};}}),
    createPreviewRunner:()=>()=>{},loadGameFromTab:()=>{},isSupportedChessUrl:url=>/^https:\/\/(?:www\.)?(?:chess\.com|lichess\.org)\//.test(url),
  });
  vm.runInContext(fs.readFileSync(new URL('../background.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''),context);
  const message={type:'buttonPreview',key:'lichess:AAAAAAAA'};
  for(const sender of [{frameId:1,tab:{id:7},url:'https://lichess.org/AAAAAAAA'},
    {frameId:0,tab:{id:7},url:'https://lichess.org.example.com/AAAAAAAA'},
    {frameId:0,url:'https://lichess.org/AAAAAAAA'}]) {
    assert.equal(listener(message,sender,()=>{}),undefined);
  }
  assert.equal(calls.length,0);
  const result=await new Promise(resolve=>assert.equal(listener(message,{frameId:0,tab:{id:7},url:'https://lichess.org/future/game/AAAAAAAA'},resolve),true));
  assert.equal(result.ok,true);assert.deepEqual(calls,[['get',7,'lichess:AAAAAAAA']]);
});
