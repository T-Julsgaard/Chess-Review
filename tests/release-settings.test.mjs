import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from './helpers/app.mjs';

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
  const store = {
    settings: { boardTheme: 'custom', boardCustomLight: '#123456', pieceStyle: 'merida',
      enginePath: 'sf19lite', coach: 'professor', soundVolume: 37, categoryNames: { best: 'Top' } },
    layout: { board: { x: 20, y: 30, w: 400, h: 400 } }, layoutMode: 'custom', layoutVersion: 8,
    username: 'saved-user',
    library: [{ id: 'game-one', pgn: '1. e4 e5 *', favorite: true, solved: [2] }],
    'analysis:game-one': { pgn: '1. e4 e5 *', evals: [{ cp: 12 }], bests: [{ bestmove: 'e2e4' }] },
    'job:pending': { pgn: '1. d4 d5 *' },
    'cache:game-one': { data: 'cached PGN' },
  };
  const original = structuredClone(store), writes = [];
  chrome.runtime.getManifest = () => ({ version });
  chrome.storage = { local: {
    async get(key) { return { [key]: structuredClone(store[key]) }; },
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
  await resetSettingsForRelease({ reason: 'update' });
  assert.equal(store.settingsResetFor021, true);
});
