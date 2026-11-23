import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {claimLearningAnnouncement, mountLearningAnnouncement, INTRO_STEPS,
  INTRO_TOUR_SEEN as seen, LEGACY_ANNOUNCEMENT_KEYS as legacy} from '../lib/learning-announcement.js';
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

test('claim persists before showing and never repeats, after settings resets or later updates', async () => {
  const p = persistence();
  assert.equal(await claimLearningAnnouncement(p), true);
  assert.equal(p.data[seen], true); assert.equal(p.backup.get(seen), 'true');
  assert.equal(await claimLearningAnnouncement(p), false);
  Object.assign(p.data, {settings: {}, layout: null, 'learning:v1': {}, settingsResetFor040: true});
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

test('users who saw or opted out of the earlier puzzles note are not first-time users', async () => {
  for (const key of legacy) for (const backend of ['extension', 'backup']) {
    const p = persistence();
    if (backend === 'extension') p.data[key] = true; else p.backup.set(key, 'true');
    assert.equal(await claimLearningAnnouncement(p), false, `${key} in ${backend}`);
    assert.equal(p.data[seen], undefined);
  }
});

for (const failure of ['read', 'write', 'readback', 'missing-write', 'local-read', 'lock', 'missing-lock']) {
  test(`persistence failure ${failure} fails closed without showing an unrecorded intro`, async () => {
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

function setup(t, {hidden = false, motion = false} = {}) {
  const dom = new JSDOM('<header class="topbar"><button id="learningToggle">Learn with Chess review</button><button id="profileToggle">Player profile</button></header><div id="canvas"><button class="learn-entry-button">Solve Puzzles</button></div>',
    {url: 'https://extension.test', pretendToBeVisual: true});
  const p = persistence();
  Object.defineProperty(dom.window.navigator, 'locks', {value: p.locks});
  let visibility = hidden ? 'hidden' : 'visible';
  Object.defineProperty(dom.window.document, 'visibilityState', {get: () => visibility});
  const mount = () => mountLearningAnnouncement({document: dom.window.document, storage: p.storage, motion: () => motion});
  t.after(() => dom.window.close());
  const document = dom.window.document;
  return {...p, dom, document, mount,
    card: () => document.querySelector('.learning-announcement'),
    highlighted: () => [...document.querySelectorAll('.learning-announcement-target')].map(button => button.id),
    visible() { visibility = 'visible'; document.dispatchEvent(new dom.window.Event('visibilitychange')); }};
}

test('the tour starts on Player profile and Got it moves the same card to Learn with Chess Review', async t => {
  const p = setup(t), controller = p.mount(); await controller.ready;
  const card = p.card();
  assert.ok(card);
  assert.deepEqual(p.highlighted(), ['profileToggle']);
  assert.equal(card.querySelector('h2').textContent, INTRO_STEPS[0].title);
  assert.equal(card.querySelector('.learning-announcement-eyebrow').textContent, 'Welcome to Chess Review');
  assert.deepEqual([...card.querySelectorAll('button')].map(button => button.textContent), ['Got it'], 'No opt-out button');
  assert.equal(card.querySelector('.learning-announcement-steps').getAttribute('aria-label'), 'Step 1 of 2');
  assert.equal(p.document.querySelectorAll('.learning-announcement-arrow').length, 1);
  assert.equal(p.document.activeElement, p.document.body, 'Non-modal intro must not steal focus');
  card.querySelector('.learning-announcement-dismiss').click();
  assert.equal(p.card(), card, 'The card morphs instead of being replaced');
  assert.equal(controller.step, 1);
  assert.deepEqual(p.highlighted(), ['learningToggle']);
  assert.equal(card.querySelector('h2').textContent, 'Learn with Chess Review');
  assert.match(card.querySelector('p').textContent, /50,000 puzzles/);
  assert.equal(card.querySelector('.learning-announcement-steps').getAttribute('aria-label'), 'Step 2 of 2');
  assert.deepEqual([...card.querySelectorAll('.learning-announcement-steps i')].map(dot => dot.classList.contains('active')), [false, true]);
  card.querySelector('.learning-announcement-dismiss').click();
  assert.equal(p.card(), null);
  assert.equal(p.document.querySelector('.learning-announcement-arrows'), null);
  assert.deepEqual(p.highlighted(), []);
  const reopened = p.mount(); await reopened.ready;
  assert.equal(p.card(), null, 'Finishing the tour never shows it again');
});

test('the animated morph ignores repeated clicks and never skips step two', async t => {
  const p = setup(t, {motion: true}), win = p.dom.window;
  const pending = [];
  win.Element.prototype.animate = function () {
    let resolve; const finished = new Promise(r => {resolve = r;});
    const animation = {finished, playState: 'running', cancel() {this.playState = 'idle'; resolve();}, finish: () => resolve()};
    pending.push(animation); return animation;
  };
  const controller = p.mount(); await controller.ready;
  const gotIt = p.card().querySelector('.learning-announcement-dismiss');
  gotIt.click(); gotIt.click(); gotIt.click();
  assert.equal(controller.step, 0, 'Text swaps only once the slide-out ends');
  pending.splice(0).forEach(animation => animation.finish()); await settle();
  assert.equal(controller.step, 1);
  assert.ok(p.card(), 'Extra clicks during the morph must not dismiss the card');
  assert.deepEqual(p.highlighted(), ['learningToggle']);
  pending.splice(0).forEach(animation => animation.finish()); await settle();
  await new Promise(resolve => win.setTimeout(resolve, 200));
  assert.equal(p.document.querySelector('.learning-announcement-morph'), null);
  gotIt.click();
  assert.equal(p.card().inert, true, 'The final Got it pops the card away');
  pending.splice(0).forEach(animation => animation.finish()); await settle();
  assert.equal(p.card(), null);
});

test('closing the tab mid-morph cleans up without a late swap', async t => {
  const p = setup(t, {motion: true}), win = p.dom.window;
  win.Element.prototype.animate = () => ({finished: new Promise(() => {}), cancel() {}});
  const controller = p.mount(); await controller.ready;
  p.card().querySelector('.learning-announcement-dismiss').click();
  win.dispatchEvent(new win.Event('pagehide'));
  assert.equal(p.card(), null);
  await new Promise(resolve => win.setTimeout(resolve, 950));
  assert.equal(p.card(), null); assert.deepEqual(p.highlighted(), []);
});

for (const step of [0, 1]) {
  for (const dismissal of ['#profileToggle', '#learningToggle', '.learn-entry-button', 'Escape', 'pagehide']) {
    test(`closing step ${step + 1} with ${dismissal} cleans up and never repeats on reopen`, async t => {
      const p = setup(t), controller = p.mount(); await controller.ready;
      if (step) p.card().querySelector('.learning-announcement-dismiss').click();
      assert.equal(controller.step, step);
      if (dismissal === 'Escape') p.document.dispatchEvent(new p.dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
      else if (dismissal === 'pagehide') p.dom.window.dispatchEvent(new p.dom.window.Event('pagehide'));
      else p.document.querySelector(dismissal).click();
      if (dismissal === '.learn-entry-button') { assert.ok(p.card(), 'Unrelated buttons leave the tour open'); controller.close(); }
      assert.equal(p.card(), null);
      assert.equal(p.document.querySelector('.learning-announcement-arrows'), null);
      assert.deepEqual(p.highlighted(), []);
      assert.equal(p.data[seen], true);
      const reopened = p.mount(); await reopened.ready;
      assert.equal(p.card(), null);
      reopened.dispose();
    });
  }
}

test('opening in a background tab waits for visibility without consuming the intro', async t => {
  const p = setup(t, {hidden: true}), controller = p.mount(); await controller.ready;
  assert.equal(p.data[seen], undefined); assert.equal(p.card(), null);
  p.visible(); await settle();
  assert.ok(p.card()); controller.dispose();
});

test('a missing toolbar button means no tour and no consumed marker', async t => {
  const p = setup(t); p.document.querySelector('#profileToggle').remove();
  const controller = p.mount(); await controller.ready;
  assert.equal(p.card(), null); assert.equal(p.data[seen], undefined);
});

test('the card moves off the highlighted button in a narrow window', async t => {
  const p = setup(t), win = p.dom.window;
  Object.defineProperties(win, {innerWidth: {value: 500}, innerHeight: {value: 800}});
  const rect = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('topbar')) return rect(0, 0, 500, 52);
    if (this.id === 'profileToggle') return rect(300, 80, 100, 34); // wrapped under the toolbar
    if (this.id === 'learningToggle') return rect(190, 8, 100, 34);
    if (this.classList.contains('learning-announcement')) return rect(204, parseFloat(this.style.top) || 0, 280, 200);
    return rect(0, 0, 0, 0);
  };
  Object.defineProperty(win.HTMLElement.prototype, 'offsetHeight', {get() {return this.classList.contains('learning-announcement') ? 200 : 0;}});
  const controller = p.mount(); await controller.ready;
  const card = p.card().getBoundingClientRect();
  assert.ok(card.top >= 130); assert.ok(card.bottom <= win.innerHeight - 16);
  const arrow = p.document.querySelector('.learning-announcement-arrow');
  assert.notEqual(arrow.style.display, 'none');
  assert.match(arrow.getAttribute('d'), /^M 350 \d+/, 'The arrow leaves the card toward the button above it');
});

test('disposing during an unfinished claim cannot mount a late intro', async t => {
  const p = setup(t), controller = p.mount(); controller.dispose(); await controller.ready;
  assert.equal(p.data[seen], undefined); assert.equal(p.card(), null);
});

test('preview workspaces never consume or display the intro', async t => {
  const a = app(t, {url: 'https://extension.test/analysis.html?screen-preview=workspace-blank'});
  a.store.settingsResetFor040 = true;
  // Preview startup may read bundled data; none of it uses live intro storage.
  await a.start();
  assert.ok(a.dom.window.document.querySelector('#learningToggle'));
  assert.equal(a.store[seen], undefined);
  assert.equal(a.dom.window.document.querySelector('.learning-announcement'), null);
});

for (const [entry, loader] of [['openLearning', 'loadLearningWorkspace'], ['openProfile', 'loadProfileStory']]) {
  test(`${entry} called programmatically ends the tour`, async t => {
    const a = app(t); loadGame(a, '1. e4 e5'); a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
    let closed = 0; a.context.__announcement = {close() {closed++;}};
    a.run('learningAnnouncement = __announcement');
    // The lazy module may fail, but the intro must already have closed.
    a.replace(loader, async () => {throw Error('test load failure');});
    const warn = console.warn; console.warn = () => {};
    try {await a.call(entry);} finally {console.warn = warn;}
    assert.equal(closed, 1);
  });
}
