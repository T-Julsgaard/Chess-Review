import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mapLayout, createGameMap, gameUrl, MAP_CELLS} from '../lib/profile/game-map.js';
import {createPreparation} from '../lib/profile/preparation.js';
import {collectLichess} from '../lib/profile/sources.js';
import {fetchImport} from '../lib/import-request.js';
import {createTourLoader} from '../lib/profile/loader.js';
import {finishedPreviewGame} from '../lib/preview-analysis.js';
import {collectProfile} from '../lib/profile/collector.js';
import {createProfileStore} from '../lib/profile/store.js';
import {app, loadGame, deferred, settle} from './helpers/app.mjs';

const rows = n => Array.from({length: n}, (_, i) => ({id: String(i), site: 'lichess', t: i + 1, me: 'w', opp: `Player ${i}`, n: 30, res: ['w', 'd', 'l'][i % 3], url: 'https://lichess.org/abcd1234'}));
const settings = {depth: {depth: 6}, sample: {id: 'all', every: 1}, ms: 1400, workers: 2};
function memory() {
  const entries = new Map(); let job = null;
  return {entries, async loadJob() { return job; }, async saveJob(value) { job = value; },
    async loadEngine(site, ids) { return Object.fromEntries(ids.filter(id => entries.has(`${site}:${id}`)).map(id => [id, entries.get(`${site}:${id}`)])); }};
}
function dom(t) {
  const d = new JSDOM('', {pretendToBeVisual: true}); t.after(() => d.window.close());
  const doc = d.window.document;
  const h = (tag, attrs = {}, ...children) => {
    const node = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else if (key === 'hidden') node.hidden = value;
      else node.setAttribute(key === 'class' ? 'class' : key, String(value));
    }
    node.append(...children.filter(Boolean)); return node;
  };
  return {doc, h, win: d.window};
}

test('game map: 100,000 games are represented exactly with bounded cells and constant DOM', t => {
  const games = rows(100000), {cells} = mapLayout(games);
  assert.ok(cells.length <= MAP_CELLS);
  assert.equal(cells.reduce((n, c) => n + c.end - c.start, 0), games.length);
  assert.equal(cells.reduce((n, c) => n + c.counts.w, 0), 33334);
  const d = dom(t), map = createGameMap(d); map.update(games);
  assert.equal(map.element.querySelectorAll('*').length, 4);
  assert.equal(map.element.querySelectorAll('path').length, 3);
  assert.ok(map.element.getAttribute('aria-label').startsWith((100000).toLocaleString() + ' games'));
  assert.equal(map.caption.querySelector('.profile-map-summary').textContent, (100000).toLocaleString() + ' games');
});

test('game map: keyboard zoom, selection, opening, streaming updates and returning to all games', t => {
  const d = dom(t), opened = [], games = rows(3000), map = createGameMap({...d, onOpen: url => opened.push(url)});
  d.doc.body.append(map.element, map.caption); map.update(games);
  const key = value => map.element.dispatchEvent(new d.win.KeyboardEvent('keydown', {key: value, bubbles: true}));
  key('Enter'); assert.match(map.element.getAttribute('aria-label'), /^3 games/);
  key('ArrowRight'); assert.match(map.caption.textContent, /Player 1/);
  key('Enter'); assert.deepEqual(opened, ['https://lichess.org/abcd1234']);
  map.caption.querySelector('.profile-map-actions button:last-child').click();
  assert.deepEqual(opened, ['https://lichess.org/abcd1234', 'https://lichess.org/abcd1234']);
  map.update([...games, ...rows(10).map(r => ({...r, id: 'new' + r.id}))]);
  key('Escape'); assert.ok(map.element.getAttribute('aria-label').startsWith((3010).toLocaleString() + ' games'));
  for (const url of ['javascript:alert(1)', 'https://lichess.org.evil.test/a', 'http://lichess.org/a']) assert.equal(gameUrl({url}), null);
});

test('preparation: analysis starts before collection finishes, waits for the host and handles both sites', async () => {
  const store = memory(), first = deferred(), started = deferred(), events = [], games = rows(5), sent = [];
  let clock = 1000;
  const sendMessage = async message => {
    sent.push(message); const job = message.job;
    await store.saveJob({...job, status: 'running', done: 0, total: job.rows.length, startedAt: clock, updatedAt: clock});
    (async () => {
      if (sent.length === 1) { started.resolve(); await first.promise; }
      for (const row of job.rows) store.entries.set(`${job.site}:${row.id}`, {v: 1, acc: 80});
      await store.saveJob({...job, status: 'done', done: job.rows.length, total: job.rows.length, startedAt: clock, finishedAt: clock + 500, perGameMs: 100, failed: 0});
      clock += 500;
    })();
    return {ok: true};
  };
  const prep = createPreparation({store, sendMessage, rows: () => games, settings, sites: ['lichess', 'chesscom'], accounts: {lichess: 'me', chesscom: 'me'}, onProgress: p => events.push(p), now: () => clock});
  prep.notify(); await started.promise;
  assert.equal(events.at(-1)?.collecting ?? true, true);
  games.push({...rows(1)[0], site: 'chesscom', id: 'cc'}); prep.notify();
  let finished = false; const finishing = prep.finish().then(result => { finished = true; return result; });
  await settle(); assert.equal(finished, false);
  first.resolve(); const result = await finishing;
  assert.equal(result.done, 6); assert.equal(Object.keys(result.entries).length, 6);
  assert.deepEqual(sent.map(m => m.job.site), ['lichess', 'chesscom']);
  assert.ok(events.some(e => e.etaMs > 0)); assert.equal(events.at(-1).remaining, 0);
});

test('preparation: every game has no 2,000-game cutoff; failures finish and cached results are reused', async () => {
  const store = memory(), games = rows(2120), sent = [], statuses = [];
  store.entries.set('lichess:0', {v: 1, acc: 99});
  const prep = createPreparation({store, rows: () => games, settings, sites: ['lichess'], accounts: {lichess: 'me'}, onProgress: p => statuses.push(p),
    sendMessage: async ({job}) => {
      sent.push(job);
      for (const row of job.rows) if (row.id !== '1') store.entries.set(`lichess:${row.id}`, {v: 1, acc: 80});
      await store.saveJob({...job, status: 'done', done: job.rows.length, total: job.rows.length, failed: job.rows.some(r => r.id === '1') ? 1 : 0, startedAt: 1000, finishedAt: 1001});
      return {ok: true};
    }});
  const result = await prep.finish();
  assert.equal(result.done, 2120); assert.equal(result.failed, 1); assert.equal(Object.keys(result.entries).length, 2119);
  assert.ok(sent.every(j => j.rows.length <= 40)); assert.ok(!sent.some(j => j.rows.some(r => r.id === '0')));
  assert.equal(statuses.at(-1).remaining, 0);
});

test('preparation: cancelling a waiting build cancels only its own host job', async () => {
  const store = memory(), abort = new AbortController(), started = deferred(), sent = [];
  const prep = createPreparation({store, rows: () => rows(3), settings, sites: ['lichess'], accounts: {lichess: 'me'}, signal: abort.signal,
    sendMessage: async message => {
      sent.push(message);
      if (message.job) { await store.saveJob({...message.job, status: 'running', done: 0, total: 3, updatedAt: Date.now(), startedAt: Date.now()}); started.resolve(); }
      return {ok: true};
    }});
  prep.notify(); await started.promise; await settle(); abort.abort();
  await assert.rejects(prep.finish(), /abort/i);
  assert.equal(sent.at(-1).action, 'cancel'); assert.equal(sent.at(-1).id, sent[0].job.id);
});

test('Lichess: valid games publish before EOF, across split UTF-8 chunks, without an export cap', async t => {
  let controller, requested;
  const stream = new ReadableStream({start(c) { controller = c; }});
  t.mock.method(globalThis, 'fetch', async url => { requested = url; return new Response(stream); });
  const batch = deferred(), received = [], abort = new AbortController(); t.after(() => abort.abort());
  const game = id => JSON.stringify({id, status: 'mate', moves: 'e4 e5', players: {white: {user: {name: 'tést'}}, black: {user: {name: 'other'}}}}) + '\n';
  const collecting = collectLichess('tést', {signal: abort.signal, onBatch: games => { received.push(...games); batch.resolve(); }});
  const bytes = new TextEncoder().encode(Array.from({length: 20}, (_, i) => game(String(i))).join(''));
  const split = bytes.indexOf(195) + 1;
  controller.enqueue(bytes.slice(0, split)); controller.enqueue(bytes.slice(split));
  await batch.promise;
  assert.equal(received.length, 20); assert.equal(received[0].white.name, 'tést');
  assert.equal(new URL(requested).searchParams.has('max'), false);
  controller.enqueue(new TextEncoder().encode(game('last').trim())); controller.close();
  assert.equal(await collecting, 21); assert.equal(received.at(-1).id, 'last');
});

test('stream cancellation releases a stalled reader', async t => {
  let cancelled = false;
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({cancel() { cancelled = true; }})));
  const abort = new AbortController(), response = await fetchImport('https://example.test', {signal: abort.signal, stream: true});
  const lines = response.lines(), pending = lines.next(); abort.abort();
  await assert.rejects(pending, /abort/i); assert.equal(cancelled, true);
});

test('cancelled partial imports are marked incomplete and retry the full history', async t => {
  const data = {}, store = createProfileStore({
    async get(key) { return {[key]: data[key]}; }, async set(values) { Object.assign(data, values); },
  });
  const source = Array.from({length: 200}, (_, i) => JSON.stringify({id: 'game' + i, status: 'mate', winner: 'white', lastMoveAt: Date.UTC(2026, 0, 2),
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 d6 Nc3 Nf6', players: {white: {user: {name: 'tester'}}, black: {user: {name: 'opponent'}}}}) + '\n').join('');
  const abort = new AbortController(), merge = store.mergeRows.bind(store);
  store.mergeRows = async (...args) => { const result = await merge(...args); if (args[3]?.complete === false) abort.abort(); return result; };
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode(source)); }})));
  await assert.rejects(collectProfile({site: 'lichess', account: 'tester', store, signal: abort.signal}), /abort/i);
  assert.equal((await store.loadRows('lichess', 'tester')).complete, false);
  store.mergeRows = merge;
  let url;
  t.mock.method(globalThis, 'fetch', async value => { url = value; return new Response(source); });
  const result = await collectProfile({site: 'lichess', account: 'tester', store});
  assert.equal(new URL(url).searchParams.has('since'), false);
  assert.equal(result.rows.length, 200); assert.equal(result.complete, true);
});

test('loader displays a measured ETA and honest unknown-total state', t => {
  const d = dom(t), loader = createTourLoader({...d, makePiece: () => d.doc.createElement('img'), motion: () => false}); t.after(() => loader.stop());
  loader.update({games: 190, text: 'Checking accuracy', etaMs: 64000, fraction: .5});
  assert.match(loader.element.textContent, /190/); assert.match(loader.element.textContent, /About 2 min remaining/);
  loader.update({etaMs: null}); assert.match(loader.element.textContent, /Estimating time remaining/);
});

test('workspace: games stream onto the main board beside the animation; deck waits for analysis after EOF', async t => {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6'); a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  Object.assign(a.state.settings, {profileDepth: 'fast', profileSample: 'all'});
  await a.call('openProfile'); await settle();
  const w = a.run('profileWorkspace'), doc = a.dom.window.document, started = deferred(), finishHost = deferred();
  t.after(() => w.close());
  w.site = 'lichess'; w.account = 'tester'; w.period = 'all';
  let controller;
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({start(c) { controller = c; }})));
  w.o.sendMessage = async message => {
    if (message.action !== 'start') return {ok: true};
    const job = message.job;
    assert.ok(job.rows.every(row => row.pgn?.includes('[Result "1-0"]')), 'the engine reuses downloaded moves');
    assert.equal(finishedPreviewGame(job.rows[0].pgn).moves.length, 10);
    await w.store.saveJob({...job, status: 'running', done: 0, total: job.rows.length, startedAt: Date.now(), updatedAt: Date.now()});
    started.resolve();
    (async () => {
      await finishHost.promise;
      for (const row of job.rows) await w.store.saveEngine('lichess', row.id, {v: 1, acc: 80, t: row.t});
      await w.store.saveJob({...job, status: 'done', done: job.rows.length, total: job.rows.length, failed: 0, startedAt: Date.now(), finishedAt: Date.now()});
    })();
    return {ok: true};
  };
  const loading = w.load();
  for (let i = 0; i < 100 && !controller; i++) await settle();
  controller.enqueue(new TextEncoder().encode(Array.from({length: 20}, (_, i) => JSON.stringify({id: 'game' + i, status: 'mate', winner: 'white', speed: 'blitz',
    lastMoveAt: Date.UTC(2026, 0, 2), moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 d6 Nc3 Nf6',
    players: {white: {user: {name: 'tester'}}, black: {user: {name: 'opponent'}}}}) + '\n').join('')));
  await started.promise;
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(w.phase, 'loading'); assert.equal(w.report, null);
  assert.ok(doc.querySelector('.profile-loader')); assert.ok(doc.querySelector('.board .profile-game-map'));
  assert.equal(doc.querySelector('.profile-map-summary').textContent, '20 games');
  controller.close(); await settle(); assert.equal(w.phase, 'loading');
  finishHost.resolve(); await loading;
  assert.equal(w.phase, 'deck'); assert.equal(w.report.engine.games, 20);
  assert.equal(doc.querySelector('.profile-loader'), null); assert.ok(doc.querySelector('.board .profile-game-map'));
});
