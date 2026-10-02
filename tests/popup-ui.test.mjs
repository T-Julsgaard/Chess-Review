import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { settle } from './helpers/app.mjs';

test('popup initializes with game review only and still submits PGN',async t=>{
  const html=fs.readFileSync(new URL('../popup.html',import.meta.url),'utf8');
  const source=fs.readFileSync(new URL('../popup.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  const dom=new JSDOM(html,{url:'https://extension.test/popup.html'}),opened=[];
  t.after(()=>dom.window.close());
  const document=dom.window.document;
  const context=vm.createContext({document,window:dom.window,console,
    browserAPI:{storage:{local:{async get(){return {};}}},tabs:{async query(){return [{url:'https://example.test/'}];}}},
    isSupportedChessUrl:()=>false,
    openAnalysisTab:async payload=>{opened.push(payload);},
  });
  vm.runInContext(source,context);await settle();
  assert.equal(document.getElementById('exploreMode'),null);
  assert.doesNotMatch(document.body.textContent,/Explore board|or FEN/i);
  assert.doesNotMatch(document.getElementById('manualInput').placeholder,/FEN/i);
  assert.match(document.getElementById('status').textContent,/URL or PGN/);
  document.getElementById('manualInput').value='1. e4 e5';
  document.getElementById('analyzeManual').click();await settle();
  assert.equal(opened.length,1);assert.equal(opened[0].pgn,'1. e4 e5');assert.equal(opened[0].source,'pgn');
});
