import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { settle,deferred } from './helpers/app.mjs';
import {mountFluidActions} from '../lib/fluid-actions.js';
import {createImportRequest} from '../lib/import-request.js';

test('popup offers a blank workspace and still submits a game PGN',async t=>{
  const html=fs.readFileSync(new URL('../popup.html',import.meta.url),'utf8');
  const source=fs.readFileSync(new URL('../popup.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  const dom=new JSDOM(html,{url:'https://extension.test/popup.html'}),opened=[];
  t.after(()=>dom.window.close());
  const document=dom.window.document;
  const context=vm.createContext({document,window:dom.window,console,createImportRequest,mountFluidActions,
    browserAPI:{storage:{local:{async get(){return {};}}},tabs:{async query(){return [{url:'https://example.test/'}];}}},
    isSupportedChessUrl:()=>false,
    openAnalysisTab:async payload=>{opened.push(payload);},
  });
  vm.runInContext(source,context);await settle();
  assert.ok(document.getElementById('openWorkspace'));
  assert.equal(document.getElementById('exploreMode'),null);
  assert.equal(document.getElementById('username'),null);
  assert.equal(document.getElementById('saveUser'),null);
  assert.doesNotMatch(document.body.textContent,/Explore board|or FEN/i);
  assert.doesNotMatch(document.getElementById('manualInput').placeholder,/FEN/i);
  assert.match(document.getElementById('status').textContent,/URL or PGN/);
  document.getElementById('manualInput').value='1. e4 e5';
  document.getElementById('analyzeManual').click();await settle();
  assert.equal(opened.length,1);assert.equal(opened[0].pgn,'1. e4 e5');assert.equal(opened[0].source,'pgn');
});

test('Cancel import immediately enables retry and ignores the canceled operation\'s late result',async t=>{
  const html=fs.readFileSync(new URL('../popup.html',import.meta.url),'utf8');
  const source=fs.readFileSync(new URL('../popup.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  const dom=new JSDOM(html,{url:'https://extension.test/popup.html'}),requests=[];t.after(()=>dom.window.close());let closed=0;
  dom.window.close=()=>{closed++;};const document=dom.window.document;
  const context=vm.createContext({document,window:dom.window,console,createImportRequest,mountFluidActions,
    browserAPI:{storage:{local:{async get(){return {};}}},tabs:{async query(){return [{url:'https://example.test/'}];}}},
    isSupportedChessUrl:()=>false,
    openAnalysisTab:(_payload,{signal})=>{const job=deferred();requests.push({job,signal});return job.promise;},
  });
  vm.runInContext(source,context);await settle();document.getElementById('manualInput').value='1. e4 e5';
  const start=document.getElementById('analyzeManual'),cancel=document.getElementById('cancelImport');start.click();await settle();
  assert.equal(start.disabled,true);assert.equal(cancel.hidden,false);cancel.click();assert.equal(requests[0].signal.aborted,true);assert.equal(start.disabled,false);assert.equal(cancel.hidden,true);
  start.click();await settle();requests[0].job.resolve();await settle();assert.equal(closed,0);assert.equal(start.disabled,true);
  requests[1].job.resolve();await settle();assert.equal(closed,1);assert.equal(start.disabled,false);
});

function popup(t,{supported=false,preview=false,open=async()=>{},current=async()=>{},manual=async()=>{},save=async()=>{},position=async()=>{}}={}) {
  const html=fs.readFileSync(new URL('../popup.html',import.meta.url),'utf8');
  const source=fs.readFileSync(new URL('../popup.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  const dom=new JSDOM(html,{url:'https://extension.test/popup.html'+(preview?'?screen-preview=popup':'')});
  let closed=0;t.after(()=>dom.window.close());dom.window.close=()=>{closed++;};
  const context=vm.createContext({document:dom.window.document,window:dom.window,console,createImportRequest,mountFluidActions,
    browserAPI:{runtime:{getURL:path=>'https://extension.test/'+path},storage:{local:{async get(){return {};},set:save}},tabs:{create:position,async query(){return [{url:supported?'https://lichess.org/AAAAAAAA':'https://example.test'}];}}},
    isSupportedChessUrl:()=>supported,openBlankWorkspaceTab:open,analyzeActiveTab:current,
    parseGameId:value=>value.includes('/game/')?{id:'12345678'}:null,analyzeChesscomUrl:manual});
  vm.runInContext(source,context);
  return {dom,doc:dom.window.document,closed:()=>closed};
}

test('position editor opens from the popup and is disabled during other imports',async t=>{
  const tabs=[],pending=deferred(),p=popup(t,{position:async options=>{tabs.push(options);},open:()=>pending.promise});await settle();
  p.doc.getElementById('openWorkspace').click();assert.equal(p.doc.getElementById('openPosition').disabled,true);
  p.doc.getElementById('cancelImport').click();p.doc.getElementById('openPosition').click();await settle();
  assert.equal(tabs.length,1);assert.equal(tabs[0].url,'https://extension.test/analysis.html?workspace=position');assert.equal(p.closed(),1);pending.resolve();await settle();
});

test('a supported chess page keeps both actions available until the user chooses',async t=>{
  let reviews=0,workspaces=0;const p=popup(t,{supported:true,current:async()=>{reviews++;},open:async()=>{workspaces++;}});await settle();
  assert.equal(reviews,0);assert.equal(p.doc.getElementById('openWorkspace').disabled,false);
  p.doc.getElementById('openWorkspace').click();await settle();assert.equal(workspaces,1);assert.equal(reviews,0);assert.equal(p.closed(),1);
});

test('Analyze this game still explicitly reviews the supported active tab',async t=>{
  let reviews=0;const p=popup(t,{supported:true,current:async()=>{reviews++;}});await settle();
  p.doc.getElementById('analyzeCurrent').click();await settle();assert.equal(reviews,1);assert.equal(p.closed(),1);
});

test('blank-workspace launch failures are recoverable and suppress duplicate opens',async t=>{
  const pending=deferred();let opens=0;const p=popup(t,{open:()=>{opens++;return pending.promise;}});await settle();
  const button=p.doc.getElementById('openWorkspace');button.click();button.click();await settle();
  assert.equal(opens,1);assert.equal(button.disabled,true);pending.reject(Error('Tab could not open'));await settle();
  assert.equal(button.disabled,false);assert.match(p.doc.getElementById('status').textContent,/Tab could not open/);assert.equal(p.closed(),0);
});

test('preview actions cannot open a workspace or import a game',async t=>{
  let writes=0,opens=0;const p=popup(t,{preview:true,open:async()=>{opens++;},save:async()=>{writes++;}});await settle();
  p.doc.getElementById('openWorkspace').click();p.doc.getElementById('analyzeManual').click();await settle();
  assert.equal(opens,0);assert.equal(writes,0);assert.match(p.doc.getElementById('status').textContent,/Preview actions are disabled/);
});

test('a pasted Chess.com URL uses automatic archive lookup without a username field',async t=>{
  const calls=[],p=popup(t,{manual:async(url,options)=>{calls.push({url,signal:options.signal});}});await settle();
  p.doc.getElementById('manualInput').value='https://www.chess.com/game/live/12345678';
  p.doc.getElementById('analyzeManual').click();await settle();
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://www.chess.com/game/live/12345678');assert.equal(p.closed(),1);
});

test('missing player detection directs the user to the PGN field',async t=>{
  const p=popup(t,{supported:true,current:async()=>{throw Object.assign(Error('Paste its PGN.'),{code:'NO_USERNAME'});}});await settle();
  p.doc.getElementById('analyzeCurrent').click();await settle();
  assert.equal(p.doc.getElementById('manual').open,true);assert.equal(p.doc.activeElement.id,'manualInput');
});
