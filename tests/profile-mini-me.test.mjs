import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {figurePoints, waveLift, waveSwing, createMiniMe, createTypewriter} from '../lib/profile/mini-me.js';

test('mini-me: one flat sheet of characters, centred, with the waving arm marked', () => {
  const points = figurePoints();
  assert.ok(points.length > 800, 'the figure keeps its detail: ' + points.length);
  assert.ok(points.every(p => !('z' in p)), 'flat, like the portfolio sheet');
  assert.ok(points.some(p => p.arm === 1) && points.some(p => p.arm === 2), 'upper arm and forearm both wave');
  assert.ok(points.every(p => p.glyph >= 1 && p.glyph <= 9));
  // Centred on his middle, so he turns about it and sits in the middle of the canvas.
  const xs = points.map(p => p.x);
  assert.ok(Math.abs(Math.max(...xs) + Math.min(...xs)) < .2);
});

test('mini-me: the wave raises the arm, swings it, and puts it back down', () => {
  assert.equal(waveLift(-1), 0);
  assert.ok(waveLift(1000) > .99, 'up during the wiggle');
  assert.equal(waveLift(10000), 0, 'down afterwards');
  assert.equal(waveSwing(100), 0, 'no swing while rising');
  assert.ok([...Array(30)].some((_, i) => Math.abs(waveSwing(500 + i * 40)) > .1), 'swings while up');
});

test('mini-me: a page without canvas drawing still gets a labelled, focusable figure', () => {
  const {window} = new JSDOM('<body></body>');
  const mini = createMiniMe({doc: window.document, win: window});
  window.document.body.append(mini.element);
  assert.equal(mini.element.tagName, 'CANVAS');
  assert.equal(mini.element.getAttribute('role'), 'img');
  assert.match(mini.element.getAttribute('aria-label'), /developer.*turn him around/);
  assert.doesNotMatch(mini.element.getAttribute('aria-label'), /zoom/);
  assert.equal(mini.element.tabIndex, 0);
  assert.doesNotThrow(() => mini.start());
});

test('typewriter: types a line in its final place, erases it, then types the next; the last stays', async () => {
  const {window} = new JSDOM('<body></body>');
  // Every key and pause runs at once; Math.random only varies the pace.
  const win = {setTimeout: fn => { queueMicrotask(fn); return 1; }, clearTimeout() {}};
  const lines = ['Hi.', 'Second line.', 'Last one.'];
  const note = createTypewriter({doc: window.document, win, lines});
  window.document.body.append(note.element);
  assert.equal(note.element.querySelector('.profile-type-sr').textContent, lines.join(' '), 'screen readers get it all at once');
  assert.equal(note.element.querySelector('.profile-type-screen').getAttribute('aria-hidden'), 'true');
  const typed = () => [...note.element.querySelectorAll('.profile-type-char.is-visible')].map(n => n.textContent).join('');
  const rest = () => [...note.element.querySelectorAll('.profile-type-char:not(.is-visible)')].map(n => n.textContent).join('');
  const seen = [];
  const watch = new window.MutationObserver(() => seen.push(typed() + '|' + rest()));
  watch.observe(note.element, {subtree: true, childList: true, characterData: true, attributes: true});
  note.start();
  for (let i = 0; i < 400; i++) await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(seen.includes('Hi|.'), 'the untyped rest keeps its place');
  assert.ok(seen.includes('Sec|ond line.'));
  assert.equal(typed() + '|' + rest(), 'Last one.|', 'the last line stays typed');
});

test('mini-me: the wheel scrolls the panel as usual; he does not zoom', () => {
  const {window} = new JSDOM('<body></body>');
  const mini = createMiniMe({doc: window.document, win: window});
  window.document.body.append(mini.element);
  const wheel = new window.WheelEvent('wheel', {deltaY: -100, bubbles: true, cancelable: true});
  mini.element.dispatchEvent(wheel);
  assert.ok(!wheel.defaultPrevented);
});

test('typewriter: long paragraphs keep the same letter boxes while typing and erasing', async () => {
  const {window} = new JSDOM('<body></body>');
  let next;
  const win = {setTimeout: fn => { next = fn; return 1; }};
  const line = "It's 100% free and open source, with no ads or marketing budget, so the only way it reaches new players is through word of mouth.";
  const note = createTypewriter({doc: window.document, win, lines: [line, 'Thanks.']});
  window.document.body.append(note.element);
  note.start();
  const text = note.element.querySelector('.profile-type-text');
  const letters = [...text.children];
  assert.equal(letters.length, line.length);
  let frames = 0, fullyTyped = false, erased = false;
  while (next) {
    const fn = next; next = null; fn(); await Promise.resolve();
    if (text.textContent !== line) break;
    frames++;
    assert.deepEqual([...text.children], letters, 'keys change visibility without replacing inline boxes');
    assert.equal(text.querySelectorAll('.is-caret').length, 1);
    const visible = text.querySelectorAll('.is-visible').length;
    if (visible === letters.length) fullyTyped = true;
    if (fullyTyped && visible === 0) erased = true;
  }
  assert.ok(frames >= line.length * 2 && fullyTyped && erased);
  window.close();
});

test('typewriter: a line break in a line is kept on screen, and read as a space', () => {
  const {window} = new JSDOM('<body></body>');
  const note = createTypewriter({doc: window.document, win: window, lines: ['Hi.', 'One half,\nthe other.'], motion: () => false});
  window.document.body.append(note.element);
  note.start();
  assert.equal(note.element.querySelector('.profile-type-sr').textContent, 'Hi. One half, the other.');
  assert.equal(note.element.querySelectorAll('.profile-type-all > *')[1].textContent, 'One half,\nthe other.');
});

test('typewriter: without motion every line simply stands', () => {
  const {window} = new JSDOM('<body></body>');
  const note = createTypewriter({doc: window.document, win: window, lines: ['Hi.', 'There.'], motion: () => false});
  window.document.body.append(note.element);
  note.start();
  assert.ok(note.element.classList.contains('is-still'));
  assert.deepEqual([...note.element.querySelectorAll('.profile-type-all > *')].map(n => n.textContent), ['Hi.', 'There.']);
});
