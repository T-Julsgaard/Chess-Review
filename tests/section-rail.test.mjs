import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {app, loadGame, settle} from './helpers/app.mjs';
import {createSectionRail, SECTIONS} from '../lib/section-rail.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.state.settings.profileDepth = 'off';
  t.after(() => { a.run('profileWorkspace')?.close(); a.run('learningWorkspace')?.close(); });
  return a;
}
const current = doc => doc.querySelector('.section-btn[aria-current="page"]')?.dataset.section;

test('section rail: Review, Learn and Playstyle in that order, Review current on open', t => {
  const a = review(t), doc = a.dom.window.document;
  const buttons = [...doc.querySelectorAll('.section-rail .section-btn')];
  assert.deepEqual(buttons.map(b => b.textContent), ['Review', 'Learn', 'Playstyle']);
  assert.equal(current(doc), 'review');
  // The older toolbar buttons stay.
  assert.ok(doc.querySelector('#learningToggle') && doc.querySelector('#profileToggle'));
});

test('section rail: each button opens its section and marks it current; Review returns', async t => {
  const a = review(t), doc = a.dom.window.document;
  const click = id => doc.querySelector(`.section-btn[data-section="${id}"]`).click();
  click('playstyle'); for (let i = 0; i < 6; i++) await settle();
  assert.ok(a.run('profileWorkspace'));
  assert.equal(current(doc), 'playstyle');
  click('review'); for (let i = 0; i < 6; i++) await settle();
  assert.equal(a.run('profileWorkspace'), null);
  assert.equal(current(doc), 'review');
  // The old toolbar button drives the same rail.
  doc.querySelector('#profileToggle').click(); for (let i = 0; i < 6; i++) await settle();
  assert.equal(current(doc), 'playstyle');
});

test('section rail: Playstyle and Learn hand over directly, without fading the review back in', async t => {
  const a = review(t), doc = a.dom.window.document;
  const click = id => doc.querySelector(`.section-btn[data-section="${id}"]`).click();
  click('playstyle'); for (let i = 0; i < 6; i++) await settle();
  const profile = a.run('profileWorkspace'), closes = [];
  const close = profile.close.bind(profile);
  profile.close = options => { closes.push(options); return close(options); };
  click('learn'); for (let i = 0; i < 20; i++) await settle();
  assert.deepEqual(closes.map(options => options?.handoff), [true]);
  assert.equal(a.run('profileWorkspace'), null);
  assert.ok(a.run('learningWorkspace'));
  assert.equal(current(doc), 'learn');
});

test('section rail: clicking the current section only acknowledges it', async t => {
  const a = review(t), doc = a.dom.window.document;
  const button = doc.querySelector('.section-btn[data-section="review"]');
  button.click(); await settle();
  assert.equal(a.run('profileWorkspace'), null);
  assert.equal(a.run('learningWorkspace'), null);
  assert.equal(current(doc), 'review');
});

test('section rail: stands beside the panel column and hides without room', () => {
  const dom = new JSDOM('<!doctype html><body></body>', {pretendToBeVisual: true});
  const {document} = dom.window;
  Object.defineProperty(dom.window, 'innerWidth', {value: 1366, configurable: true});
  Object.defineProperty(dom.window, 'innerHeight', {value: 657, configurable: true});
  const picked = [];
  const rail = createSectionRail({document, onSelect: id => picked.push(id)});
  document.body.append(rail.element);
  rail.set('learn', {animate: false});
  assert.equal(rail.current, 'learn');
  assert.equal(rail.buttons.get('learn').getAttribute('aria-current'), 'page');
  assert.equal(rail.buttons.get('review').getAttribute('aria-current'), null);
  assert.equal(rail.place({left: 714, top: 101, right: 1210, bottom: 633, width: 496, height: 532}), true);
  assert.equal(rail.element.hidden, false);
  assert.equal(rail.element.style.top, '101px');
  assert.equal(rail.element.style.height, '532px');
  assert.ok(parseFloat(rail.element.style.left) > 1210);
  // No room to the right of the column (narrow window): the rail steps aside.
  Object.defineProperty(dom.window, 'innerWidth', {value: 1000, configurable: true});
  assert.equal(rail.place({left: 57, top: 64, right: 953, bottom: 650, width: 896, height: 586}), false);
  assert.equal(rail.element.hidden, true);
  rail.buttons.get('playstyle').click();
  assert.deepEqual(picked, ['playstyle']);
  assert.deepEqual(SECTIONS.map(s => s.id), ['review', 'learn', 'playstyle']);
});
