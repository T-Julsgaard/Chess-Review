import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, deferred } from './helpers/app.mjs';

function sharedTabs(t) {
  const tabs = [app(t), app(t)], store = {library: []};
  let lock = Promise.resolve();
  const locks = { request(name, callback) {
    assert.equal(name, 'chess-review-library');
    const next = lock.then(callback); lock = next.catch(() => {}); return next;
  }};
  const storage = {
    async get(key) { return {[key]: structuredClone(store[key])}; },
    async set(values) { Object.assign(store, structuredClone(values)); },
    async remove(keys) { for (const key of keys) delete store[key]; },
  };
  for (const a of tabs) {
    a.context.browserAPI.storage.local = storage;
    Object.defineProperty(a.dom.window.navigator, 'locks', {value: locks});
    a.replace('renderLibrary', () => {});
    loadGame(a, '1. e4 e5'); a.call('computeDerived');
  }
  return {tabs, store, storage};
}

test('simultaneous reviews in stale tabs retain both games and their analysis', async t => {
  const {tabs: [a,b], store, storage} = sharedTabs(t);
  a.state.meta = {gameId: 'a'}; b.state.meta = {gameId: 'b'};
  const reading = deferred(), proceed = deferred(), get = storage.get;
  let reads = 0;
  storage.get = async key => {
    if (++reads === 1) { reading.resolve(); await proceed.promise; }
    return get(key);
  };
  const first = a.call('saveToLibrary'); await reading.promise;
  const second = b.call('saveToLibrary');
  proceed.resolve(); await Promise.all([first,second]);
  assert.deepEqual(store.library.map(game => game.id).sort(), ['a','b']);
  assert.ok(store['analysis:a']); assert.ok(store['analysis:b']);
});

test('favorites and solved state from another tab survive reanalysis and stale updates', async t => {
  const {tabs: [a,b], store} = sharedTabs(t);
  a.state.meta = {gameId: 'a'}; b.state.meta = {gameId: 'b'};
  await a.call('saveToLibrary'); await b.call('saveToLibrary');
  store.library.find(game => game.id === 'a').solved = false;
  await Promise.all([b.call('toggleFav', 'a'), a.call('markCurrentSolved')]);
  a.state.library = [];
  await a.call('saveToLibrary');
  assert.equal(store.library.length, 2);
  assert.equal(store.library.find(game => game.id === 'a').fav, true);
  assert.equal(store.library.find(game => game.id === 'a').solved, true);
});

test('library eviction removes only the analysis of games beyond the cap', async t => {
  const {tabs: [a], store} = sharedTabs(t);
  store.library = Array.from({length: 300}, (_,i) => ({id: String(i)}));
  store['analysis:299'] = {old: true}; store['analysis:0'] = {retained: true};
  a.state.meta = {gameId: 'new'};
  await a.call('saveToLibrary');
  assert.equal(store.library.length, 300);
  assert.equal(store.library[0].id, 'new');
  assert.equal(store['analysis:299'], undefined);
  assert.ok(store['analysis:0']); assert.ok(store['analysis:new']);
});
