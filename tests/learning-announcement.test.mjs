import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {claimLearningAnnouncement, disableLearningAnnouncement, mountLearningAnnouncement,
  LEARNING_ANNOUNCEMENT_SEEN as seen, LEARNING_ANNOUNCEMENT_DISABLED as disabled} from '../lib/learning-announcement.js';
import {app, loadGame, settle} from './helpers/app.mjs';

function persistence() {
  const data = {}, backup = new Map();
  let pending = Promise.resolve();
  const storage = {
    async get(keys) { return Object.fromEntries(keys.map(key => [key, data[key]])); },
    async set(values) { Object.assign(data, structuredClone(values)); },
  };
  const local = {getItem: key => backup.get(key) ?? null, setItem: (key, value) => backup.set(key, value)};
  // Simulate a shared origin lock across independently mounted extension tabs.
  const locks = {request(name, callback) {
    assert.equal(name, 'chess-review-learning-announcement');
    const result = pending.then(callback); pending = result.catch(() => {}); return result;
  }};
  return {storage, local, locks, data, backup};
}

test('claim persists before showing and never repeats without a dismissal, after settings resets or later updates', async () => {
  const p = persistence();
  assert.equal(await claimLearningAnnouncement(p), true);
  assert.equal(p.data[seen], true); assert.equal(p.backup.get(seen), 'true');
  assert.equal(await claimLearningAnnouncement(p), false);
  Object.assign(p.data, {settings: {}, layout: null, 'learning:v1': {}, settingsResetFor030: true});
  assert.equal(await claimLearningAnnouncement(p), false);
  p.backup.clear(); // Extension storage alone survives a browser restart.
  assert.equal(await claimLearningAnnouncement(p), false);
});

test('simultaneous first opens in different windows claim exactly once', async () => {
  const p = persistence();
  const results = await Promise.all(Array.from({length: 12}, () => claimLearningAnnouncement(p)));
  assert.equal(results.filter(Boolean).length, 1);
});

test('the independent local backup suppresses a lost extension marker', async () => {
  const p = persistence(); await claimLearningAnnouncement(p); delete p.data[seen];
  assert.equal(await claimLearningAnnouncement(p), false);
});

test('permanent opt-out survives a lost seen marker in either storage backend', async () => {
  for (const lost of ['extension', 'backup']) {
    const p = persistence(); await claimLearningAnnouncement(p); await disableLearningAnnouncement(p);
    assert.equal(p.data[disabled], true); assert.equal(p.backup.get(disabled), 'true');
    delete p.data[seen]; p.backup.delete(seen);
    if (lost === 'extension') delete p.data[disabled]; else p.backup.delete(disabled);
    assert.equal(await claimLearningAnnouncement(p), false);
  }
});

test('opt-out still persists independently when extension storage rejects a write', async () => {
  const p = persistence(); p.storage.set = async () => {throw Error('storage unavailable');};
  await disableLearningAnnouncement(p);
  assert.equal(p.backup.get(disabled), 'true');
  assert.equal(await claimLearningAnnouncement(p), false);
});

for (const failure of ['read', 'write', 'readback', 'missing-write', 'local-read', 'lock', 'missing-lock']) {
  test(`persistence failure ${failure} fails closed without showing an unrecorded announcement`, async () => {
    const p = persistence(); let reads = 0;
    if (failure === 'read') p.storage.get = async () => {throw Error('read failed');};
    if (failure === 'write') p.storage.set = async () => {throw Error('write failed');};
    if (failure === 'readback') { const get = p.storage.get; p.storage.get = async keys => {if (++reads > 1) throw Error('readback failed'); return get(keys);}; }
    if (failure === 'missing-write') p.storage.set = async () => {};
    if (failure === 'local-read') p.local.getItem = () => {throw Error('blocked');};
    if (failure === 'lock') p.locks.request = async () => {throw Error('lock unavailable');};
    if (failure === 'missing-lock') p.locks = null;
    assert.equal(await claimLearningAnnouncement(p), false);
  });
}

test('a failed backup write still relies on confirmed extension persistence', async () => {
  const p = persistence(); p.local.setItem = () => {throw Error('quota');};
  assert.equal(await claimLearningAnnouncement(p), true);
  assert.equal(await claimLearningAnnouncement(p), false);
});

test('a hidden or closed page cannot claim while waiting for the origin lock', async () => {
  const p = persistence(); let eligible = true;
  const result = claimLearningAnnouncement({...p, eligible: () => eligible}); eligible = false;
  assert.equal(await result, false); assert.equal(p.data[seen], undefined);
});

function setup(t, {hidden = false} = {}) {
  const dom = new JSDOM('<header class="topbar"><button id="learningToggle">Learn with Chess review</button></header><div id="canvas"><button class="learn-entry-button">Solve Puzzles</button></div>',
    {url: 'https://extension.test', pretendToBeVisual: true});
  const p = persistence();
  Object.defineProperty(dom.window.navigator, 'locks', {value: p.locks});
  let visibility = hidden ? 'hidden' : 'visible';
  Object.defineProperty(dom.window.document, 'visibilityState', {get: () => visibility});
  const mount = () => mountLearningAnnouncement({document: dom.window.document, storage: p.storage});
  t.after(() => dom.window.close());
  return {...p, dom, document: dom.window.document, mount, visible() {
    visibility = 'visible'; dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
  }};
}

for (const dismissal of ['.learning-announcement-dismiss', '.learning-announcement-disable', '#learningToggle', '.learn-entry-button', 'Escape', 'pagehide']) {
  test(`closing with ${dismissal} cleans up and never repeats on reopen`, async t => {
    const p = setup(t), controller = p.mount(); await controller.ready;
    assert.ok(p.document.querySelector('.learning-announcement'));
    assert.equal(p.document.querySelectorAll('.learning-announcement-target').length, 2);
    assert.equal(p.document.activeElement, p.document.body, 'Non-modal note must not steal focus');
    if (dismissal === 'Escape') p.document.dispatchEvent(new p.dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    else if (dismissal === 'pagehide') p.dom.window.dispatchEvent(new p.dom.window.Event('pagehide'));
    else p.document.querySelector(dismissal).click();
    assert.equal(p.document.querySelector('.learning-announcement'), null);
    assert.equal(p.document.querySelector('.learning-announcement-arrows'), null);
    assert.equal(p.document.querySelectorAll('.learning-announcement-target').length, 0);
    if (dismissal === '.learning-announcement-disable') assert.equal(p.data[disabled], true);
    const reopened = p.mount(); await reopened.ready;
    assert.equal(p.document.querySelector('.learning-announcement'), null);
    reopened.dispose();
  });
}

test('opening in a background tab waits for visibility without consuming the announcement', async t => {
  const p = setup(t, {hidden: true}), controller = p.mount(); await controller.ready;
  assert.equal(p.data[seen], undefined); assert.equal(p.document.querySelector('.learning-announcement'), null);
  p.visible(); await settle();
  assert.ok(p.document.querySelector('.learning-announcement')); controller.dispose();
});

test('disposing during an unfinished claim cannot mount a late announcement', async t => {
  const p = setup(t), controller = p.mount(); controller.dispose(); await controller.ready;
  assert.equal(p.data[seen], undefined); assert.equal(p.document.querySelector('.learning-announcement'), null);
});

test('preview workspaces never consume or display the announcement', async t => {
  const a = app(t, {url: 'https://extension.test/analysis.html?screen-preview=workspace-blank'});
  a.store.settingsResetFor030 = true;
  // Preview startup may read bundled data; none of it uses live announcement storage.
  await a.start();
  assert.ok(a.dom.window.document.querySelector('#learningToggle'));
  assert.equal(a.store[seen], undefined);
  assert.equal(a.dom.window.document.querySelector('.learning-announcement'), null);
});

test('entering learning programmatically dismisses the note', async t => {
  const a = app(t); loadGame(a, '1. e4 e5'); a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  let closed = 0; a.context.__announcement = {close() {closed++;}};
  a.run('learningAnnouncement = __announcement');
  // The lazy module may fail, but the obsolete review pointers must already close.
  a.replace('loadLearningWorkspace', async () => {throw Error('test load failure');});
  const warn = console.warn; console.warn = () => {};
  try {await a.call('openLearning');} finally {console.warn = warn;}
  assert.equal(closed, 1);
});
