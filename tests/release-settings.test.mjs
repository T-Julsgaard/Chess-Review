import test from 'node:test';
import assert from 'node:assert/strict';
import { UI_SETUPS, MODERN_LAYOUT } from '../lib/ui-setups.js';
import { LEARNING_ANNOUNCEMENT_SEEN as seen, LEARNING_ANNOUNCEMENT_DISABLED as disabled } from '../lib/learning-announcement.js';

let installed;
globalThis.chrome = {
  runtime: {
    onInstalled: { addListener(listener) { installed = listener; } },
    onMessage: { addListener() {} },
  },
  commands: { onCommand: { addListener() {} } },
};
// Initialize the browser facade only after the extension API mock exists.
const { app, deferred, settle } = await import('./helpers/app.mjs');
const { resetSettingsForRelease } = await import('../release-settings.js');
await import('../background.js');

function setup(version = '0.4.0') {
  const pending = new Map();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: {
    request(name, callback) {
      const next = (pending.get(name) || Promise.resolve()).then(callback);
      pending.set(name, next.catch(() => {})); return next;
    },
  } });
  const store = {
    settingsResetFor030: true,
    settings: { uiSetup: 'old', boardTheme: 'custom', boardCustomLight: '#123456', pieceStyle: 'merida',
      enginePath: 'sf19lite', engineLines: 1, classifyLines: 3, coach: 'professor', categoryNames: { best: 'Top' },
      sound: false, soundVolume: 0, soundFx: { move: { snd: 'default', volume: 21 } },
      puzzleSuccessSound: 'soft-retro', puzzleIncorrectSound: 'default',
      moveAnim: false, uiAnim: false, animSpeed: 3, learningTransition: 'morph3' },
    layout: { board: { x: 20, y: 30, w: 400, h: 400 } }, layoutMode: 'custom', layoutVersion: 8,
    username: 'saved-user',
    library: [{ id: 'game-one', pgn: '1. e4 e5 *', fav: true, solved: true }],
    'analysis:game-one': { pgn: '1. e4 e5 *', evals: [{ cp: 12 }], bests: [{ bestmove: 'e2e4' }] },
    'job:pending': { pgn: '1. d4 d5 *' },
    'cache:game-one': { data: 'cached PGN' },
    'playerHistory:v1': { chesscom: [{ id: 'game-one', white: 'saved-user', black: 'opponent' }] },
    'learning:v1': { schema: 1, lessons: { fork: { status: 'completed' } }, bests: { sprint: 12 } },
    'unknown:future-data': { keep: true },
  };
  const original = structuredClone(store), writes = [];
  chrome.runtime.getManifest = () => ({ version });
  chrome.storage = { local: {
    async get(key) {
      const keys = key == null ? Object.keys(store) : Array.isArray(key) ? key : [key];
      return Object.fromEntries(keys.map(k => [k, structuredClone(store[k])]));
    },
    async set(values) { writes.push(structuredClone(values)); Object.assign(store, structuredClone(values)); },
    async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key]; },
  } };
  return { store, original, writes };
}

async function workspace(t) {
  const a = app(t, { url: 'https://extension.test/analysis.html?workspace=blank' });
  a.context.resetSettingsForRelease = resetSettingsForRelease;
  a.context.browserAPI.storage.local = chrome.storage.local;
  Object.defineProperty(a.dom.window.navigator, 'locks', { value: navigator.locks });
  a.replace('initTabZoom', async () => {});
  await a.start();
  await a.run('learningAnnouncement?.ready');
  return a;
}

function assertModern(settings) {
  assert.equal(settings.uiSetup, 'modern');
  assert.equal(settings.uiSetupBase, 'modern');
  assert.equal(settings.engineLines, 2);
  assert.equal(settings.classifyLines, 2);
  for (const [key, value] of Object.entries(UI_SETUPS.modern.designs)) assert.equal(settings[key], value);
}

for (const previousVersion of ['0.1.0', '0.2.0', '0.3.0']) {
  test(`updating from ${previousVersion} saves Modern, preserves audio/motion and all other stored data`, async () => {
    const { store, original, writes } = setup();
    await installed({ reason: 'update', previousVersion });
    assertModern(store.settings);
    assert.equal(store.layout, null);
    assert.equal(store.layoutMode, 'custom');
    assert.equal(store.layoutVersion, 0);
    assert.equal(store.settingsResetFor040, true);
    for (const key of ['sound', 'soundVolume', 'soundFx', 'puzzleSuccessSound', 'puzzleIncorrectSound', 'moveAnim', 'uiAnim', 'animSpeed', 'learningTransition']) {
      assert.deepEqual(store.settings[key], original.settings[key], `Preserve preference ${key}`);
    }
    assert.equal(store.settings.boardTheme, undefined);
    assert.equal(store.settings.enginePath, undefined);
    assert.equal(store.settings.categoryNames, undefined);
    for (const key of Object.keys(original).filter(key => !['settings', 'layout', 'layoutMode', 'layoutVersion'].includes(key))) {
      assert.deepEqual(store[key], original[key], `Preserve data ${key}`);
    }
    assert.equal(writes.length, 1);
  });
}

test('old and custom 0.3.0 layouts both open Modern and later deliberate changes survive reopening', async t => {
  for (const preset of ['old', 'custom']) {
    const { store } = setup(); store.settings.uiSetup = preset;
    await installed({ reason: 'update', previousVersion: '0.3.0' });
    const a = await workspace(t);
    assertModern(a.state.settings);
    assert.equal(a.state.settings.boardTheme, 'maple');
    assert.equal(a.state.settings.pieceStyle, 'image');
    assert.equal(a.state.settings.enginePath, 'nnue');
    assert.equal(a.state.settings.sound, false); assert.equal(a.state.settings.soundVolume, 0);
    assert.equal(a.state.settings.moveAnim, false); assert.equal(a.state.settings.animSpeed, 3);
    assert.equal(a.state.username, 'saved-user'); assert.equal(a.state.library[0].fav, true);
    assert.equal(a.state.layoutMode, 'custom');
    assert.deepEqual(structuredClone(a.call('layoutForSave')), MODERN_LAYOUT);
    await a.call('saveLayout', true);
    const again = await workspace(t); assertModern(again.state.settings);
    assert.deepEqual(structuredClone(again.call('layoutForSave')), MODERN_LAYOUT);
    await again.call('applyUiSetup', 'old');
    await again.call('setEngineSetting', 'engineLines', 1);
    await again.call('saveLayout', true);
    await installed({ reason: 'update', previousVersion: '0.4.0' });
    const edited = await workspace(t);
    assert.equal(edited.state.settings.uiSetup, 'old');
    assert.equal(edited.state.settings.engineLines, 1);
    assert.equal(edited.state.layoutMode, 'auto');
  }
});

for (const version of ['0.4.0', '0.4.1', '0.10.0', '1.0.0']) {
  test(`${version} migrates users who skipped 0.4.0, but never repeats after completion`, async () => {
    const { store, writes } = setup(version);
    await installed({ reason: 'update', previousVersion: '0.3.0' });
    assertModern(store.settings);
    store.settings = { uiSetup: 'old', boardTheme: 'coral', soundVolume: 23 };
    store.layout = { board: { x: 10 } }; store.layoutMode = 'custom'; store.layoutVersion = 9;
    const customized = structuredClone(store);
    await installed({ reason: 'update', previousVersion: '0.4.0' });
    await resetSettingsForRelease({ reason: 'startup' });
    assert.deepEqual(store, customized); assert.equal(writes.length, 1);
  });
}

for (const version of ['0.2.0', '0.3.0', '0.3.9']) {
  test(`${version} cannot run the 0.4.0 migration`, async () => {
    const { store, original, writes } = setup(version);
    await installed({ reason: 'update', previousVersion: '0.2.0' });
    await resetSettingsForRelease({ reason: 'startup' });
    assert.deepEqual(store, original); assert.equal(writes.length, 0);
  });
}

for (const version of ['0.4.0', '0.4.1', '1.0.0']) {
  test(`fresh installation of ${version} keeps Modern and shows the developer note exactly once`, async t => {
    const { store } = setup(version);
    for (const key of Object.keys(store)) delete store[key];
    await installed({ reason: 'install' });
    assertModern(store.settings); assert.equal(store[seen], undefined);
    const first = await workspace(t);
    assertModern(first.state.settings);
    assert.equal(first.state.settings.soundVolume, 50);
    assert.equal(first.dom.window.document.querySelectorAll('.learning-announcement-target').length, 2);
    assert.ok(first.dom.window.document.querySelector('.learning-announcement'));
    assert.equal(store[seen], true);
    first.dom.window.document.querySelector('.learning-announcement-dismiss').click();
    const reopened = await workspace(t);
    assertModern(reopened.state.settings);
    assert.equal(reopened.dom.window.document.querySelector('.learning-announcement'), null);
  });
}

test('an existing 0.3.0 user sees the note after migration without losing Modern on dismissal', async t => {
  const { store } = setup();
  const first = await workspace(t);
  assertModern(first.state.settings);
  assert.ok(first.dom.window.document.querySelector('.learning-announcement'));
  first.dom.window.document.querySelector('.learning-announcement-dismiss').click();
  const reopened = await workspace(t);
  assertModern(reopened.state.settings); assert.equal(store[seen], true);
  assert.equal(reopened.dom.window.document.querySelector('.learning-announcement'), null);
});

for (const marker of [seen, disabled]) {
  test(`migration respects an existing ${marker} marker`, async t => {
    const { store } = setup(); store[marker] = true;
    const a = await workspace(t);
    assertModern(a.state.settings); assert.equal(store[marker], true);
    assert.equal(a.dom.window.document.querySelector('.learning-announcement'), null);
  });
}

test('browser updates and unrelated background events never reset settings', async () => {
  const { store, original, writes } = setup();
  await installed({ reason: 'chrome_update' }); await installed({ reason: 'shared_module_update' });
  assert.deepEqual(store, original); assert.equal(writes.length, 0);
});

test('a failed storage write records no completion and retries before the next workspace opens', async t => {
  const { store, original } = setup(), set = chrome.storage.local.set;
  chrome.storage.local.set = async () => { throw Error('Storage unavailable'); };
  await assert.rejects(resetSettingsForRelease({ reason: 'update' }), /Storage unavailable/);
  assert.deepEqual(store, original);
  chrome.storage.local.set = set;
  const a = await workspace(t); assertModern(a.state.settings);
  assert.equal(store.settingsResetFor040, true);
});

test('simultaneous update and startup callers commit a single migration', async () => {
  const { store, writes } = setup();
  await Promise.all([installed({ reason: 'update', previousVersion: '0.3.0' }),
    resetSettingsForRelease({ reason: 'startup' }), resetSettingsForRelease({ reason: 'startup' })]);
  assert.equal(writes.length, 1); assertModern(store.settings); assert.equal(store.library[0].fav, true);
});

test('review startup waits for an in-progress update before loading or painting preferences', async t => {
  setup();
  const entered = deferred(), proceed = deferred(), set = chrome.storage.local.set;
  chrome.storage.local.set = async values => { entered.resolve(); await proceed.promise; return set(values); };
  const update = installed({ reason: 'update', previousVersion: '0.3.0' }); await entered.promise;
  const a = app(t); a.context.resetSettingsForRelease = resetSettingsForRelease;
  a.context.browserAPI.storage.local = chrome.storage.local;
  a.replace('loadJob', async () => ({ pgn: '1. e4 e5 *', analysis: null }));
  a.replace('loadBook', async () => {}); a.replace('loadCalibration', async () => {});
  let paints = 0; a.replace('buildUI', () => { paints++; }); a.replace('applyGame', async () => {});
  a.replace('rememberReviewJob', () => false); a.replace('initTabZoom', () => {});
  let reads = 0; const get = chrome.storage.local.get;
  chrome.storage.local.get = async keys => { if (Array.isArray(keys) && keys.includes('username')) reads++; return get(keys); };
  const startup = a.start(); await settle();
  assert.equal(reads, 0); assert.equal(paints, 0);
  proceed.resolve(); await Promise.all([update, startup]);
  assert.equal(reads, 1); assert.equal(paints, 1); assertModern(a.state.settings);
  assert.equal(a.state.username, 'saved-user'); assert.equal(a.state.library[0].fav, true);
});

const DEFAULT_TABS = { ...UI_SETUPS.modern.designs, barStyle: 'flat2' };
function migratedUser(version) {
  const context = setup(version);
  Object.assign(context.store, { settingsResetFor040: true, layoutMode: 'custom', layoutVersion: 9,
    layout: { board: { x: 11, y: 12, w: 400, h: 400 } } });
  context.store.settings = { uiSetup: 'custom', uiSetupBase: 'modern', graphDesign: 'bars2', engineDesign: 'original',
    accuracyDesign: 'original', accuracyQualityDesign: 'original', movesDesign: 'full', barStyle: 'gradient',
    boardTheme: 'coral', soundVolume: 23, engineLines: 3, badgeAppearance: 'enamel' };
  return { ...context, before: structuredClone(context.store) };
}

for (const version of ['0.5.0', '0.5.1', '1.0.0']) {
  test(`${version} returns tab styles to their defaults once, keeping placements and other preferences`, async () => {
    const { store, before, writes } = migratedUser(version);
    await installed({ reason: 'update', previousVersion: '0.4.0' });
    assert.equal(store.tabStylesResetFor050, true);
    assert.deepEqual(store.settings, { ...before.settings, ...DEFAULT_TABS });
    for (const key of Object.keys(before).filter(key => key !== 'settings')) {
      assert.deepEqual(store[key], before[key], `Preserve ${key}`);
    }
    assert.equal(writes.length, 1);
    store.settings.graphDesign = 'bars4'; store.settings.barStyle = 'mono';
    const customized = structuredClone(store);
    await resetSettingsForRelease({ reason: 'startup' });
    await installed({ reason: 'update', previousVersion: '0.5.0' });
    assert.deepEqual(store, customized); assert.equal(writes.length, 1);
  });
}

for (const version of ['0.4.0', '0.4.1', '0.4.9']) {
  test(`${version} leaves migrated tab styles unchanged`, async () => {
    const { store, before, writes } = migratedUser(version);
    await installed({ reason: 'update', previousVersion: '0.4.0' });
    await resetSettingsForRelease({ reason: 'startup' });
    assert.deepEqual(store, before); assert.equal(writes.length, 0);
  });
}

test('0.5.0 users who skipped 0.4.0 complete both resets in one write', async () => {
  const { store, writes } = setup('0.5.0');
  await installed({ reason: 'update', previousVersion: '0.3.0' });
  assertModern(store.settings);
  assert.equal(store.settings.barStyle, 'flat2');
  assert.equal(store.settingsResetFor040, true); assert.equal(store.tabStylesResetFor050, true);
  assert.equal(writes.length, 1);
});

const MODERN_040 = { ...structuredClone(MODERN_LAYOUT),
  evalbar: { x: 254.04, y: 52.42405289710294, w: 27.115889429536, h: 737.5521924833793, scale: 0.9038629809845334 } };

test('an untouched 0.4.0 Modern arrangement adopts the 0.5.0 eval bar and stays responsive Modern', async t => {
  const { store, before, writes } = migratedUser('0.5.0');
  Object.assign(store.settings, { uiSetup: 'modern', uiSetupBase: 'modern' });
  store.layout = structuredClone(MODERN_040);
  await installed({ reason: 'update', previousVersion: '0.4.0' });
  assert.deepEqual(store.layout, MODERN_LAYOUT);
  assert.equal(store.layoutMode, before.layoutMode); assert.equal(store.layoutVersion, before.layoutVersion);
  assert.equal(writes.length, 1);
  const a = await workspace(t);
  assert.equal(a.state.settings.uiSetup, 'modern');
  assert.equal(a.call('isResponsiveModern'), true);
});

test('an early 0.5.0 install that already reset tab styles still adopts the new eval bar once', async () => {
  const { store, writes } = migratedUser('0.5.1');
  Object.assign(store.settings, { uiSetup: 'modern', uiSetupBase: 'modern', graphDesign: 'bars4' });
  store.tabStylesResetFor050 = true;
  store.layout = structuredClone(MODERN_040);
  const settings = structuredClone(store.settings);
  await resetSettingsForRelease({ reason: 'startup' });
  assert.deepEqual(store.layout, MODERN_LAYOUT);
  assert.deepEqual(store.settings, settings, 'Later tab choices are not reset again');
  assert.equal(writes.length, 1);
  await resetSettingsForRelease({ reason: 'startup' });
  await installed({ reason: 'update', previousVersion: '0.5.0' });
  assert.equal(writes.length, 1);
});

test('an edited 0.4.0 Modern arrangement keeps every panel where the user put it', async () => {
  const { store } = migratedUser('0.5.0');
  const edited = structuredClone(MODERN_040); edited.board.x += 40;
  store.layout = structuredClone(edited);
  await installed({ reason: 'update', previousVersion: '0.4.0' });
  assert.deepEqual(store.layout, edited);
  assert.equal(store.tabStylesResetFor050, true);
});

test('an Old setup keeps its arrangement and opens as Custom with the default tab styles', async t => {
  const { store } = migratedUser('0.5.0');
  Object.assign(store.settings, { uiSetup: 'old', uiSetupBase: 'old' });
  store.layout = null; store.layoutMode = 'auto';
  await installed({ reason: 'update', previousVersion: '0.4.0' });
  const a = await workspace(t);
  for (const [key, value] of Object.entries(DEFAULT_TABS)) assert.equal(a.state.settings[key], value, key);
  assert.equal(a.state.settings.uiSetup, 'custom');
  assert.equal(a.state.settings.uiSetupBase, 'old');
  assert.equal(a.state.layoutMode, 'auto');
  assert.equal(a.state.settings.boardTheme, 'coral');
});

test('a new module context and a late update event retain later customization', async () => {
  const { store, writes } = setup();
  await resetSettingsForRelease({ reason: 'startup' });
  store.settings = { uiSetup: 'custom', boardTheme: 'coral', soundVolume: 23 };
  const restarted = await import('../release-settings.js?restarted');
  await restarted.resetSettingsForRelease({ reason: 'startup' });
  await installed({ reason: 'update', previousVersion: '0.3.0' });
  assert.deepEqual(store.settings, { uiSetup: 'custom', boardTheme: 'coral', soundVolume: 23 });
  assert.equal(writes.length, 1);
});
