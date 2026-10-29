// Optional live contract check. npm test stays offline; this reads public Lichess
// pages rendered by an isolated Chrome profile and exercises the real import code.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';

const chrome = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
const gameId = '9pnmvxvA';
const script = await readFile(new URL('../lichess-content.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url)));
assert.ok(manifest.content_scripts.some(entry => entry.matches.includes('https://lichess.org/*')
  && entry.js.includes('lichess-content.js')), 'Lichess content script must remain registered');

let info, payload, opened;
globalThis.chrome = {
  runtime: {getURL: value => `chrome-extension://smoke/${value}`},
  storage: {local: {
    async get() {return {};}, // Always check the live endpoint, never a cached PGN.
    async set(values) {for (const [key, value] of Object.entries(values)) if (key.startsWith('job:')) payload = value;},
    async remove() {},
  }},
  tabs: {
    async query() {return [{id:1, url:info.url, index:0, windowId:1}];},
    async sendMessage() {return info;},
    async create(value) {opened = value; return {id:2};},
  },
};
const {analyzeActiveTab} = await import('../analyze-flow.js');
const {parseLichessGameId} = await import('../lichess.js');
const runFile = promisify(execFile);
const liveFetch = globalThis.fetch;
try {
  for (const pathname of [`/${gameId}`, `/game/${gameId}/black`]) {
    const url = 'https://lichess.org' + pathname;
    const profile = await mkdtemp(path.join(os.tmpdir(), 'chess-review-lichess-'));
    let dom;
    try {
      const {stdout:html} = await runFile(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check',
        `--user-data-dir=${profile}`, '--timeout=30000', '--virtual-time-budget=10000', '--dump-dom', url],
      {windowsHide:true, timeout:60000, maxBuffer:8 * 1024 * 1024});
      dom = new JSDOM(html, {url, runScripts:'outside-only'});
      const w = dom.window;
      // Also validate the site's actual canonical URL, so a future route change
      // is flagged even when the embedded-data fallback keeps reviews working.
      const canonical = w.document.querySelector('meta[property="og:url"]')?.content;
      assert.equal(parseLichessGameId(canonical)?.id, gameId, `Unrecognized live Lichess URL: ${canonical}`);
      let listener;
      w.console = {log(){}, info(){}, warn(){}};
      w.setTimeout = () => 0;
      w.fetch = async () => {throw Error('Logo not needed');};
      w.chrome = {runtime:{getURL:value=>value, onMessage:{addListener(fn){listener=fn;}}}};
      w.eval(script);
      listener({type:'getGameInfo'}, {}, value => {info = value;});
      assert.equal(info.gameId, gameId, 'Rendered page must identify the correct game');
      if (pathname.endsWith('/black')) assert.equal(info.flip, true, 'Black perspective must survive import');
      else assert.notEqual(info.flip, true, 'Default White perspective must survive import');
      if (w.document.querySelector('.rcontrols .follow-up')) {
        assert.ok(w.document.querySelector('.chess-analyzer-review'), 'Post-game review button must be available');
      }
      for (const fallback of [false, true]) {
        globalThis.fetch = fallback ? async () => {throw Error('Exercise DOM recovery');} : liveFetch;
        payload = opened = null;
        await analyzeActiveTab();
        assert.ok(opened?.url.startsWith('chrome-extension://smoke/analysis.html#'), 'Review must open');
        assert.equal(payload.meta.gameId, gameId);
        assert.equal(payload.meta.flip, info.flip);
        const chess = new Chess();
        chess.loadPgn(payload.pgn, {strict:true});
        assert.equal(chess.history().length, 87, 'Import must retain the full game, including its final move');
        console.log(`PASS ${url}: ${fallback ? 'forced DOM fallback' : 'live export / automatic recovery'}, 87 legal moves`);
      }
    } finally {
      dom?.window.close();
      // Only remove the isolated temporary profile created by this iteration.
      await rm(profile, {recursive:true, force:true, maxRetries:5, retryDelay:200});
    }
  }
} finally {globalThis.fetch = liveFetch;}
