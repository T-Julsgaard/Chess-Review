import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, deferred } from './helpers/app.mjs';
import { analysisCacheKey } from '../gameid.js';

// Two independent analysis tabs = two vm contexts with their own S.library snapshots, sharing one
// browser storage and one Web Locks manager — exactly like two extension tabs sharing
// browserAPI.storage.local["library"]. This lets us interleave their read/modify/write cycles.
function sharedTabs(t) {
  const tabs = [app(t), app(t)];
  const store = { library: [] };
  let lock = Promise.resolve();
  const locks = {
    request(name, callback) {
      assert.equal(name, 'chess-review-library');
      const next = lock.then(callback);
      lock = next.catch(() => {});
      return next;
    },
  };
  const storage = {
    async get(key) {
      if (Array.isArray(key)) {
        const out = {}; for (const k of key) out[k] = structuredClone(store[k]); return out;
      }
      return { [key]: structuredClone(store[key]) };
    },
    async set(values) { Object.assign(store, structuredClone(values)); },
    async remove(keys) { for (const k of Array.isArray(keys) ? keys : [keys]) delete store[k]; },
  };
  for (const a of tabs) {
    a.context.browserAPI.storage.local = storage;
    Object.defineProperty(a.dom.window.navigator, 'locks', { value: locks, configurable: true });
    a.replace('renderLibrary', () => {});
    loadGame(a, '1. e4 e5');
    a.call('computeDerived');
  }
  return { tabs, store, storage };
}

test('1: simultaneous saves in stale tabs keep both games and their analysis', async t => {
  const { tabs: [a, b], store, storage } = sharedTabs(t);
  a.state.meta = { gameId: 'a' };
  b.state.meta = { gameId: 'b' };
  // Force a real interleaving: hold tab A's read open until tab B has queued its save.
  const firstRead = deferred(), release = deferred();
  const get = storage.get;
  let reads = 0;
  storage.get = async (key) => {
    if (++reads === 1) { firstRead.resolve(); await release.promise; }
    return get(key);
  };
  const first = a.call('saveToLibrary');
  await firstRead.promise;
  const second = b.call('saveToLibrary');
  release.resolve();
  await Promise.all([first, second]);
  assert.deepEqual(store.library.map((g) => g.id).sort(), ['a', 'b']);
  assert.ok(store[analysisCacheKey('a')]);
  assert.ok(store[analysisCacheKey('b')]);
});

test('2: a favorite set in one tab survives another tab saving', async t => {
  const { tabs: [a, b], store } = sharedTabs(t);
  a.state.meta = { gameId: 'a' };
  b.state.meta = { gameId: 'b' };
  await a.call('saveToLibrary');
  // Tab B still holds the stale (empty) library; both mutations are in flight together.
  const fav = a.call('toggleFav', 'a');
  const save = b.call('saveToLibrary');
  await Promise.all([fav, save]);
  assert.equal(store.library.find((g) => g.id === 'a').fav, true);
  assert.ok(store.library.find((g) => g.id === 'b'));
});

test('3: a solved mark in one tab survives another tab saving', async t => {
  const { tabs: [a, b], store } = sharedTabs(t);
  a.state.meta = { gameId: 'a' };
  b.state.meta = { gameId: 'b' };
  await a.call('saveToLibrary');
  const solved = a.call('markCurrentSolved');
  const save = b.call('saveToLibrary');
  await Promise.all([solved, save]);
  assert.equal(store.library.find((g) => g.id === 'a').solved, true);
  assert.ok(store.library.find((g) => g.id === 'b'));
});

test('4: a stale tab writing later does not lose another tab changes', async t => {
  const { tabs: [a, b], store } = sharedTabs(t);
  a.state.meta = { gameId: 'a' };
  b.state.meta = { gameId: 'b' };
  await a.call('saveToLibrary');
  await a.call('toggleFav', 'a');
  assert.equal(store.library.find((g) => g.id === 'a').fav, true);
  // Tab B never refreshed: its in-memory library is still the initial empty list.
  assert.equal(b.state.library.length, 0);
  await b.call('saveToLibrary');               // the stale write lands afterwards
  assert.equal(store.library.length, 2);
  assert.equal(store.library.find((g) => g.id === 'a').fav, true);
  assert.equal(store.library.find((g) => g.id === 'a').solved, true);
  assert.ok(store.library.find((g) => g.id === 'b'));
});

test('5: two tabs saving the same game id keep exactly one record', async t => {
  const { tabs: [a, b], store } = sharedTabs(t);
  a.state.meta = { gameId: 'x' };
  b.state.meta = { gameId: 'x' };
  store.library = [{ id: 'x', fav: true, solved: true, savedAt: 1 }]; // already a favorite
  await Promise.all([a.call('saveToLibrary'), b.call('saveToLibrary')]);
  assert.equal(store.library.filter((g) => g.id === 'x').length, 1);
  assert.equal(store.library.find((g) => g.id === 'x').fav, true);
  assert.equal(store.library.find((g) => g.id === 'x').solved, true);
});

test('6: eviction still holds under concurrent writes', async t => {
  const { tabs: [a, b], store } = sharedTabs(t);
  store.library = Array.from({ length: 300 }, (_, i) => ({ id: String(i), savedAt: i }));
  store[analysisCacheKey('299')] = { old: true };
  store[analysisCacheKey('0')] = { retained: true };
  a.state.meta = { gameId: 'newA' };
  b.state.meta = { gameId: 'newB' };
  await Promise.all([a.call('saveToLibrary'), b.call('saveToLibrary')]);
  assert.equal(store.library.length, 300);
  assert.equal(store.library[0].id, 'newB');               // last queued is newest
  assert.ok(store.library.some((g) => g.id === 'newA'));
  assert.equal(store[analysisCacheKey('299')], undefined); // evicted blob cleaned up
  assert.ok(store[analysisCacheKey('0')]);                 // untouched blob retained
});
