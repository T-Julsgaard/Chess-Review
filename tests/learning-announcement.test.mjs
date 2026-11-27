import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {claimLearningAnnouncement, mountLearningAnnouncement, INTRO_STEPS,
  INTRO_TOUR_SEEN as seen, INTRO_EXPLANATIONS_PENDING as pending} from '../lib/learning-announcement.js';
const legacy = ['learningAnnouncement:puzzles:seen', 'learningAnnouncement:puzzles:disabled'];
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

test('users updating past the earlier puzzles note (seen or opted out) still get the intro once', async () => {
  for (const key of legacy) for (const backend of ['extension', 'backup']) {
    const p = persistence();
    if (backend === 'extension') p.data[key] = true; else p.backup.set(key, 'true');
    assert.equal(await claimLearningAnnouncement(p), true, `${key} in ${backend}`);
    assert.equal(p.data[seen], true);
    assert.equal(await claimLearningAnnouncement(p), false);
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

function setup(t, {hidden = false, motion = false, game = true, shared, explanationsDelay = 0} = {}) {
  // Without a game, Insights holds the saved-games search and no explanations switch.
  const toggle = '<button class="ip-explanations-toggle" data-section="explanations"></button>';
  const dom = new JSDOM(`<header class="topbar"></header><nav class="section-rail"><button class="section-btn" data-section="learn">Learn</button><button class="section-btn" data-section="playstyle">Playstyle</button></nav><div id="canvas"><button class="learn-entry-button">Solve Puzzles</button><div class="insight-panel">${game ? toggle : '<form class="archive"></form>'}</div></div>`,
    {url: 'https://extension.test', pretendToBeVisual: true});
  // Tabs of one browser profile share extension storage and the origin lock.
  const p = shared || persistence();
  Object.defineProperty(dom.window.navigator, 'locks', {value: p.locks});
  let visibility = hidden ? 'hidden' : 'visible';
  Object.defineProperty(dom.window.document, 'visibilityState', {get: () => visibility});
  const settingsChanges = [];
  // The paced engine demonstration has its own test against the real app.
  const mount = () => mountLearningAnnouncement({document: dom.window.document, storage: p.storage, motion: () => motion,
    explanationsDelay, setEngineExplanations: enabled => { settingsChanges.push(enabled); }});
  t.after(() => dom.window.close());
  const document = dom.window.document;
  return {...p, dom, document, mount, settingsChanges,
    card: () => document.querySelector('.learning-announcement'),
    highlighted: () => [...document.querySelectorAll('.learning-announcement-target')].map(button => button.dataset.section),
    loadGame() { document.querySelector('.insight-panel').innerHTML = toggle; },
    async watched() { await new Promise(resolve => dom.window.setTimeout(resolve, 150)); await settle(); },
    visible() { visibility = 'visible'; document.dispatchEvent(new dom.window.Event('visibilitychange')); }};
}

test('the same card introduces Player profile, Learn and finally engine explanations', async t => {
  const p = setup(t), controller = p.mount(); await controller.ready;
  const card = p.card();
  assert.ok(card);
  assert.deepEqual(p.highlighted(), ['playstyle']);
  assert.equal(card.querySelector('h2').textContent, INTRO_STEPS[0].title);
  assert.equal(card.querySelector('.learning-announcement-eyebrow').textContent, 'Welcome to Chess Review');
  assert.deepEqual([...card.querySelectorAll('button')].map(button => button.textContent), ['Got it'], 'No opt-out button');
  assert.equal(card.querySelector('.learning-announcement-steps').getAttribute('aria-label'), 'Step 1 of 3');
  assert.deepEqual(p.settingsChanges, [false], 'The intro starts with explanations off');
  assert.equal(p.document.querySelectorAll('.learning-announcement-arrow').length, 1);
  assert.equal(p.document.activeElement, p.document.body, 'Non-modal intro must not steal focus');
  card.querySelector('.learning-announcement-dismiss').click();
  assert.equal(p.card(), card, 'The card morphs instead of being replaced');
  assert.equal(controller.step, 1);
  assert.deepEqual(p.highlighted(), ['learn']);
  assert.equal(card.querySelector('h2').textContent, 'Learn with Chess Review');
  assert.match(card.querySelector('p').textContent, /50,000 puzzles/);
  assert.equal(card.querySelector('.learning-announcement-steps').getAttribute('aria-label'), 'Step 2 of 3');
  assert.deepEqual([...card.querySelectorAll('.learning-announcement-steps i')].map(dot => dot.classList.contains('active')), [false, true, false]);
  assert.deepEqual(p.settingsChanges, [false]);
  card.querySelector('.learning-announcement-dismiss').click(); await settle();
  assert.equal(p.card(), card);
  assert.equal(controller.step, 2);
  assert.equal(card.querySelector('h2').textContent, 'Engine explanations');
  assert.equal(card.querySelector('.learning-announcement-steps').getAttribute('aria-label'), 'Step 3 of 3');
  assert.deepEqual(p.highlighted(), ['explanations']);
  assert.deepEqual(p.settingsChanges, [false, true]);
  card.querySelector('.learning-announcement-dismiss').click();
  assert.equal(p.card(), null);
  assert.equal(p.document.querySelector('.learning-announcement-arrows'), null);
  assert.deepEqual(p.highlighted(), []);
  const reopened = p.mount(); await reopened.ready;
  assert.equal(p.card(), null, 'Finishing the tour never shows it again');
  assert.deepEqual(p.settingsChanges, [false, true], 'Reopening does not reset the preference');
});

test('the animated morph ignores repeated clicks and never skips step two', async t => {
  const p = setup(t, {motion: true}), win = p.dom.window;
  const pending = [];
  win.Element.prototype.animate = function () {
    assert.equal(INTRO_STEPS.some(step => this.matches(step.target)), false, 'Tour animations stay on the callout');
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
  assert.deepEqual(p.highlighted(), ['learn']);
  pending.splice(0).forEach(animation => animation.finish()); await settle();
  await new Promise(resolve => win.setTimeout(resolve, 200));
  assert.equal(p.document.querySelector('.learning-announcement-morph'), null);
  gotIt.click(); gotIt.click();
  pending.splice(0).forEach(animation => animation.finish()); await settle();
  assert.equal(controller.step, 2, 'The next morph reaches explanations without skipping it');
  pending.splice(0).forEach(animation => animation.finish()); await settle();
  await new Promise(resolve => win.setTimeout(resolve, 200));
  gotIt.click();
  assert.equal(p.card().inert, true, 'The final Got it pops the card away');
  pending.splice(0).forEach(animation => animation.finish()); await settle();
  assert.equal(p.card(), null);
});

test('the second morph timeout still advances to engine explanations', async t => {
  const p = setup(t, {motion: true}), win = p.dom.window;
  const controller = p.mount(); await controller.ready;
  p.card().querySelector('button').click();
  win.Element.prototype.animate = () => ({finished: new Promise(() => {}), cancel() {}});
  p.card().querySelector('button').click();
  await new Promise(resolve => win.setTimeout(resolve, 950));
  assert.equal(controller.step, 2);
  assert.deepEqual(p.settingsChanges, [false, true]);
});

function engineApp(t, {motion = false, explanationsDelay = 0} = {}) {
  const a = app(t), p = persistence(), doc = a.dom.window.document;
  loadGame(a, '1. e4 e5'); a.state.settings.coach = 'old_soviet';
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll'); a.call('applySettings');
  Object.defineProperty(a.dom.window.navigator, 'locks', {value: {request: (name, callback) =>
    name === 'chess-review-settings' ? callback() : p.locks.request(name, callback)}});
  const changes = [];
  const controller = mountLearningAnnouncement({document: doc, storage: p.storage, motion: () => motion, explanationsDelay,
    setEngineExplanations: async enabled => { changes.push(enabled); await a.call('setCoachEngineReplies', enabled); }});
  t.after(() => controller.dispose());
  return {a, doc, changes, controller, gotIt: () => doc.querySelector('.learning-announcement-dismiss'),
    wait: ms => new Promise(resolve => a.dom.window.setTimeout(resolve, ms))};
}

test('engine explanations target follows the live switch after Insights rerenders', async t => {
  const {a, doc, changes, controller, gotIt} = engineApp(t); await controller.ready;
  assert.ok(doc.querySelector('.learning-announcement'));
  assert.equal(a.call('engineExplanationsEnabled'), false);
  assert.ok(doc.querySelector('.coach-frame'));
  const oldSwitch = doc.querySelector('.ip-explanations-toggle');
  const button = gotIt(); button.focus();
  gotIt().click(); gotIt().click(); await settle();
  assert.equal(doc.activeElement, button, 'Saving the preference keeps keyboard focus on Got it');
  assert.equal(oldSwitch.isConnected, false);
  assert.equal(doc.querySelector('.ip-explanations-toggle').getAttribute('aria-checked'), 'true');
  assert.ok(doc.querySelector('.ip-explanations-toggle.learning-announcement-target'));
  assert.equal(doc.querySelector('.coach-frame'), null);
  assert.equal(a.store.settings.coachEngineReplies, true);
  gotIt().click();
  assert.deepEqual(changes, [false, true]);
  assert.equal(a.call('engineExplanationsEnabled'), true);
});

test('the engine card pauses, slides the switch on, lets the coach fall, then readies Got it', async t => {
  const {a, doc, changes, controller, gotIt, wait} = engineApp(t, {motion: true, explanationsDelay: 200});
  a.dom.window.matchMedia = () => ({matches: false});
  await controller.ready;
  doc.querySelector('.coach-frame').classList.add('ready'); // jsdom never loads the portrait
  const title = () => doc.querySelector('.learning-announcement h2').textContent;
  gotIt().click(); await wait(1000); gotIt().click();
  for (let i = 0; i < 100 && title() !== 'Engine explanations'; i++) await wait(10);
  assert.equal(title(), 'Engine explanations');
  const live = doc.querySelector('.ip-explanations-toggle');
  assert.equal(live.getAttribute('aria-checked'), 'false', 'The switch is still off while the user finds it');
  assert.ok(doc.querySelector('.coach-frame'), 'The coach is still there');
  assert.deepEqual(changes, [false]);
  assert.equal(gotIt().getAttribute('aria-disabled'), 'true');
  gotIt().click();
  assert.ok(doc.querySelector('.learning-announcement'), 'Got it waits for the demonstration');
  await wait(200);
  assert.equal(live.isConnected, true);
  assert.equal(live.getAttribute('aria-checked'), 'true', 'The switch on screen slides on before Insights rebuilds');
  assert.deepEqual(changes, [false], 'The setting changes once the slide has played');
  await wait(450); await settle();
  assert.deepEqual(changes, [false, true]);
  assert.equal(a.store.settings.coachEngineReplies, true);
  assert.equal(gotIt().getAttribute('aria-disabled'), 'true', 'Got it waits while the coach falls');
  await wait(700);
  assert.equal(gotIt().hasAttribute('aria-disabled'), false);
  gotIt().click(); await wait(400);
  assert.equal(doc.querySelector('.learning-announcement'), null);
});

test('a coach still loading for a new game arrives and is seen before the switch moves', async t => {
  const p = setup(t, {game: false, motion: true, explanationsDelay: 50}), win = p.dom.window;
  win.matchMedia = () => ({matches: false});
  const wait = ms => new Promise(resolve => win.setTimeout(resolve, ms));
  const controller = p.mount(); await controller.ready;
  gotIt(p); await wait(1000); gotIt(p); await wait(400);
  p.loadGame();
  const coach = p.document.createElement('iframe'); coach.className = 'coach-frame'; p.document.body.append(coach);
  await p.watched(); await wait(300);
  assert.equal(title(p), 'Engine explanations');
  assert.equal(p.document.querySelector('.ip-explanations-toggle').getAttribute('aria-checked'), null, 'Nothing moves while the coach loads');
  coach.classList.add('ready'); await wait(400);
  assert.equal(p.document.querySelector('.ip-explanations-toggle').getAttribute('aria-checked'), null, 'The coach is seen first');
  await wait(800);
  assert.equal(p.document.querySelector('.ip-explanations-toggle').getAttribute('aria-checked'), 'true');
  await wait(400);
  assert.deepEqual(p.settingsChanges, [false, true]);
  controller.dispose();
});

test('skipping the engine card before the switch moves still turns explanations on at once', async t => {
  const {doc, changes, controller, gotIt} = engineApp(t, {explanationsDelay: 5000}); await controller.ready;
  gotIt().click(); await settle(); gotIt().click(); await settle();
  assert.deepEqual(changes, [false]);
  doc.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await settle();
  assert.equal(doc.querySelector('.learning-announcement'), null);
  assert.deepEqual(changes, [false, true]);
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

for (const step of [0, 1, 2]) {
  for (const dismissal of ['[data-section=playstyle]', '[data-section=learn]', '.learn-entry-button', 'Escape', 'pagehide']) {
    test(`closing step ${step + 1} with ${dismissal} cleans up and never repeats on reopen`, async t => {
      const p = setup(t), controller = p.mount(); await controller.ready;
      for (let i = 0; i < step; i++) { p.card().querySelector('.learning-announcement-dismiss').click(); await settle(); }
      assert.equal(controller.step, step);
      if (dismissal === 'Escape') p.document.dispatchEvent(new p.dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
      else if (dismissal === 'pagehide') p.dom.window.dispatchEvent(new p.dom.window.Event('pagehide'));
      else p.document.querySelector(dismissal).click();
      if (dismissal === '.learn-entry-button') { assert.ok(p.card(), 'Unrelated buttons leave the tour open'); controller.close(); }
      assert.equal(p.card(), null);
      assert.equal(p.document.querySelector('.learning-announcement-arrows'), null);
      assert.deepEqual(p.highlighted(), []);
      assert.equal(p.data[seen], true);
      await settle();
      assert.deepEqual(p.settingsChanges, [false, true], 'Completing or skipping leaves explanations on');
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

const title = p => p.card()?.querySelector('h2').textContent;
const gotIt = p => p.card().querySelector('.learning-announcement-dismiss').click();

test('without a game the tour stops after Learn and the first game shows the engine card', async t => {
  const p = setup(t, {game: false}), controller = p.mount(); await controller.ready;
  assert.equal(title(p), INTRO_STEPS[0].title);
  assert.equal(p.data[pending], true, 'The engine card is owed before anything can interrupt the tour');
  gotIt(p); await settle();
  assert.equal(title(p), INTRO_STEPS[1].title);
  gotIt(p); await settle();
  assert.equal(p.card(), null, 'Got it on Learn ends the visible tour without a game');
  assert.deepEqual(p.highlighted(), []);
  assert.deepEqual(p.settingsChanges, [false], 'Explanations wait for the card that demonstrates them');
  await p.watched();
  assert.equal(p.card(), null, 'Nothing shows while the workspace stays empty');
  p.loadGame(); await p.watched();
  assert.equal(title(p), 'Engine explanations');
  assert.equal(p.card().querySelector('.learning-announcement-steps').getAttribute('aria-label'), 'Step 3 of 3');
  assert.deepEqual(p.highlighted(), ['explanations']);
  assert.deepEqual(p.settingsChanges, [false, true]);
  assert.equal(p.data[pending], false);
  gotIt(p);
  assert.equal(p.card(), null);
  p.loadGame(); await p.watched();
  assert.equal(p.card(), null, 'The engine card shows once');
  const reopened = p.mount(); await reopened.ready;
  assert.equal(p.card(), null); reopened.dispose();
});

for (const dismissal of ['Escape', '[data-section=learn]', 'pagehide']) {
  test(`skipping the gameless tour with ${dismissal} still shows the engine card with a game in another tab`, async t => {
    const blank = setup(t, {game: false}), controller = blank.mount(); await controller.ready;
    if (dismissal === 'Escape') blank.document.dispatchEvent(new blank.dom.window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    else if (dismissal === 'pagehide') blank.dom.window.dispatchEvent(new blank.dom.window.Event('pagehide'));
    else blank.document.querySelector(dismissal).click();
    assert.equal(blank.card(), null); await settle();
    assert.deepEqual(blank.settingsChanges, [false]);
    const tabs = [setup(t, {shared: blank}), setup(t, {shared: blank})];
    const mounted = tabs.map(tab => tab.mount());
    await Promise.all(mounted.map(tab => tab.ready));
    assert.equal(tabs.filter(tab => tab.card()).length, 1, 'Exactly one tab shows the engine card');
    const shown = tabs.find(tab => tab.card());
    assert.equal(title(shown), 'Engine explanations');
    assert.deepEqual(shown.settingsChanges, [true]);
    gotIt(shown); mounted.forEach(tab => tab.dispose());
    const later = setup(t, {shared: blank}), again = later.mount(); await again.ready;
    assert.equal(later.card(), null); again.dispose();
  });
}

test('a game loaded during the tour lets it continue straight to engine explanations', async t => {
  const p = setup(t, {game: false}), controller = p.mount(); await controller.ready;
  p.loadGame(); gotIt(p); await settle(); gotIt(p); await settle();
  assert.equal(title(p), 'Engine explanations');
  assert.deepEqual(p.settingsChanges, [false, true]);
  assert.equal(p.data[pending], false);
  gotIt(p); await p.watched();
  assert.equal(p.card(), null); controller.dispose();
});

test('closing the game mid-tour defers the engine card to the next game', async t => {
  const p = setup(t), controller = p.mount(); await controller.ready;
  assert.equal(p.data[pending], undefined, 'A tour with a game owes nothing');
  p.document.querySelector('.insight-panel').innerHTML = '';
  gotIt(p); await settle(); gotIt(p); await settle();
  assert.equal(p.card(), null);
  assert.equal(p.data[pending], true);
  p.loadGame(); await p.watched();
  assert.equal(title(p), 'Engine explanations'); controller.dispose();
});

test('the engine card waits while Learn or the profile covers the game', async t => {
  const p = setup(t, {game: false}), controller = p.mount(); await controller.ready;
  gotIt(p); await settle(); gotIt(p); await settle();
  p.document.body.classList.add('has-learning');
  p.loadGame(); await p.watched();
  assert.equal(p.card(), null);
  p.document.body.classList.remove('has-learning'); await p.watched();
  assert.equal(title(p), 'Engine explanations'); controller.dispose();
});

test('a missing section button means no tour and no consumed marker', async t => {
  const p = setup(t); p.document.querySelector('[data-section=playstyle]').remove();
  const controller = p.mount(); await controller.ready;
  assert.equal(p.card(), null); assert.equal(p.data[seen], undefined);
});

test('the card moves off the highlighted button in a narrow window', async t => {
  const p = setup(t), win = p.dom.window;
  Object.defineProperties(win, {innerWidth: {value: 500}, innerHeight: {value: 800}});
  const rect = (left, top, width, height) => ({left, top, width, height, right: left + width, bottom: top + height});
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('topbar')) return rect(0, 0, 500, 52);
    if (this.dataset.section === 'playstyle') return rect(300, 80, 100, 34);
    if (this.dataset.section === 'learn') return rect(190, 8, 100, 34);
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
  assert.ok(a.dom.window.document.querySelector('[data-section=learn]'));
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
