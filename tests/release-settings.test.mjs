import test from 'node:test';
import assert from 'node:assert/strict';
import { app, deferred, settle } from './helpers/app.mjs';

let installed;
globalThis.chrome = {
  runtime: {
    onInstalled: { addListener(listener) { installed = listener; } },
    onMessage: { addListener() {} },
  },
  commands: { onCommand: { addListener() {} } },
};
const { resetSettingsForRelease } = await import('../release-settings.js');
await import('../background.js');

function setup(version = '0.2.1') {
  let pending = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: {
    request(name, callback) {
      assert.equal(name, 'chess-review-release-settings');
      const next = pending.then(callback); pending = next.catch(() => {}); return next;
    },
  } });
  const store = {
    settings: { boardTheme: 'custom', boardCustomLight: '#123456', pieceStyle: 'merida',
      enginePath: 'sf19lite', coach: 'professor', soundVolume: 37, categoryNames: { best: 'Top' } },
    layout: { board: { x: 20, y: 30, w: 400, h: 400 } }, layoutMode: 'custom', layoutVersion: 8,
    username: 'saved-user',
    library: [{ id: 'game-one', pgn: '1. e4 e5 *', fav: true, solved: true }],
    'analysis:game-one': { pgn: '1. e4 e5 *', evals: [{ cp: 12 }], bests: [{ bestmove: 'e2e4' }] },
    'job:pending': { pgn: '1. d4 d5 *' },
    'cache:game-one': { data: 'cached PGN' },
  };
  const original = structuredClone(store), writes = [];
  chrome.runtime.getManifest = () => ({ version });
  chrome.storage = { local: {
    async get(key) {
      return Object.fromEntries((Array.isArray(key) ? key : [key]).map(k => [k, structuredClone(store[k])]));
    },
    async set(values) { writes.push(structuredClone(values)); Object.assign(store, structuredClone(values)); },
  } };
  return { store, original, writes };
}

for (const previousVersion of ['0.1.0', '0.2.0']) {
  test(`updating from ${previousVersion} resets preferences and preserves all game data`, async t => {
    const { store, original, writes } = setup();
    await installed({ reason: 'update', previousVersion });
    assert.deepEqual(store.settings, {});
    assert.equal(store.layout, null);
    assert.equal(store.layoutMode, 'auto');
    assert.equal(store.layoutVersion, 0);
    assert.equal(store.settingsResetFor021, true);
    for (const key of ['username', 'library', 'analysis:game-one', 'job:pending', 'cache:game-one']) {
      assert.deepEqual(store[key], original[key], `Preserve ${key}`);
    }
    assert.equal(writes.length, 1);
    // The normal startup merge now resolves every user preference to the current
    // defaults, including arbitrary/custom preferences from the old settings.
    const a = app(t);
    a.context.__storedSettings = store.settings;
    a.run('S.settings = { ...DEFAULT_SETTINGS, ...__storedSettings };');
    assert.equal(a.state.settings.boardTheme, 'maple');
    assert.equal(a.state.settings.pieceStyle, 'image');
    assert.equal(a.state.settings.enginePath, 'nnue');
    assert.equal(a.state.settings.coach, 'old_soviet');
    assert.equal(a.state.settings.soundVolume, 50);
    assert.equal(Object.keys(a.state.settings.categoryNames).length, 0);
  });
}

test('the same release never resets later customizations a second time', async () => {
  const { store, writes } = setup();
  await installed({ reason: 'update', previousVersion: '0.2.0' });
  store.settings = { boardTheme: 'coral', soundVolume: 23 };
  store.layout = { board: { x: 10 } }; store.layoutMode = 'custom'; store.layoutVersion = 8;
  const customized = structuredClone(store);
  await installed({ reason: 'update', previousVersion: '0.2.1' });
  assert.deepEqual(store, customized);
  assert.equal(writes.length, 1);
});

test('a fresh installation marks the release without clearing preferences or games', async () => {
  const { store, original, writes } = setup();
  await installed({ reason: 'install' });
  assert.deepEqual(store, { ...original, settingsResetFor021: true });
  await installed({ reason: 'update', previousVersion: '0.2.1' });
  assert.equal(writes.length, 1);
});

for (const marked of [false, true]) {
  test(`future updates leave preferences intact (completion marker: ${marked})`, async () => {
    const { store, writes } = setup('0.2.2');
    if (marked) store.settingsResetFor021 = true;
    const original = structuredClone(store);
    // Includes someone upgrading directly from 0.1, skipping 0.2.1 altogether.
    await installed({ reason: 'update', previousVersion: '0.1.0' });
    assert.deepEqual(store, original);
    assert.equal(writes.length, 0);
  });
}

test('browser updates and ordinary background loads never reset settings', async () => {
  const { store, original, writes } = setup();
  await installed({ reason: 'chrome_update' });
  await installed({ reason: 'shared_module_update' });
  assert.deepEqual(store, original);
  assert.equal(writes.length, 0);
});

test('a failed storage write does not record completion and can be retried', async () => {
  const { store, original } = setup();
  const set = chrome.storage.local.set;
  chrome.storage.local.set = async () => { throw Error('Storage unavailable'); };
  await assert.rejects(resetSettingsForRelease({ reason: 'update' }), /Storage unavailable/);
  assert.deepEqual(store, original);
  chrome.storage.local.set = set;
  await resetSettingsForRelease({ reason: 'startup' });
  assert.equal(store.settingsResetFor021, true);
});

test('simultaneous update and startup callers commit a single reset', async () => {
  const { store, writes } = setup();
  await Promise.all([
    installed({ reason: 'update', previousVersion: '0.2.0' }),
    resetSettingsForRelease({ reason: 'startup' }),
    resetSettingsForRelease({ reason: 'startup' }),
  ]);
  assert.equal(writes.length, 1);
  assert.equal(store.library[0].fav, true);
});

test('review startup waits for an in-progress update before loading preferences', async t => {
  const { store } = setup();
  const entered = deferred(), proceed = deferred(), set = chrome.storage.local.set;
  chrome.storage.local.set = async values => { entered.resolve(); await proceed.promise; return set(values); };
  const update = installed({ reason: 'update', previousVersion: '0.2.0' });
  await entered.promise;
  const a = app(t);
  a.context.resetSettingsForRelease = resetSettingsForRelease;
  a.context.browserAPI.storage.local = chrome.storage.local;
  a.replace('loadJob', async () => ({ pgn: '1. e4 e5 *', analysis: null }));
  a.replace('loadBook', async () => {}); a.replace('loadCalibration', async () => {});
  a.replace('buildUI', () => {}); a.replace('applyGame', async () => {});
  a.replace('rememberReviewJob', () => false); a.replace('initTabZoom', () => {});
  let reads = 0;
  const get = chrome.storage.local.get;
  chrome.storage.local.get = async keys => { if (Array.isArray(keys) && keys.includes('username')) reads++; return get(keys); };
  const startup = a.start();
  await settle();
  assert.equal(reads, 0, 'Startup must not read stale settings during the reset');
  proceed.resolve(); await Promise.all([update, startup]);
  assert.equal(reads, 1);
  assert.equal(a.state.settings.boardTheme, 'maple');
  assert.equal(a.state.username, 'saved-user');
  assert.equal(a.state.library[0].fav, true);
  assert.equal(store.settingsResetFor021, true);
});

test('first review retries a missed update and late update events preserve customization', async () => {
  const { store, writes } = setup();
  await resetSettingsForRelease({ reason: 'startup' });
  store.settings = { boardTheme: 'coral' };
  await installed({ reason: 'update', previousVersion: '0.2.0' });
  assert.deepEqual(store.settings, { boardTheme: 'coral' });
  assert.equal(writes.length, 1);
});

test('startup on an empty install only marks completion and retains the username', async () => {
  const { store, writes } = setup();
  for (const key of ['settings', 'layout', 'layoutMode', 'layoutVersion']) delete store[key];
  const original = structuredClone(store);
  await resetSettingsForRelease({ reason: 'startup' });
  assert.deepEqual(store, { ...original, settingsResetFor021: true });
  assert.equal(writes.length, 1);
});
