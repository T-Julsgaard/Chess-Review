import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { BADGE_FONTS, gradeSvg, gradeText } from '../move-grades.js';
import { app, loadGame } from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3'); a.call('computeDerived');
  a.state.idx = 1; a.state.classif[1] = 'mistake'; a.state.moveGrades[1] = 2;
  a.call('buildUI'); a.call('renderAll');
  return a;
}
const numeral = svg => new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.querySelector('text');

test('fixed decimals use equal size for every score, including zero, ten and pending', () => {
  for (const font of Object.keys(BADGE_FONTS)) {
    const sizes = new Set();
    for (const score of [0, 1.9, 6.4, 9, 10, null]) {
      const text = numeral(gradeSvg('good', score, 'Good', false, { badgeDecimals: true, badgeFont: font }));
      sizes.add(text.getAttribute('font-size'));
      assert.equal(text.textContent, score === null ? '—' : score.toFixed(1));
    }
    assert.equal(sizes.size, 1, font);
  }
  assert.equal(gradeText(9), '9'); assert.equal(gradeText(9, true), '9.0');
  assert.equal(gradeText(null, true), '—');
  assert.equal(numeral(gradeSvg('book', null, 'Book', true, { badgeDecimals: true })), null);
});

test('six local font choices ship with licenses and unsafe font names fall back', () => {
  const added = Object.entries(BADGE_FONTS).filter(([, font]) => font.file);
  assert.ok(added.length >= 6);
  for (const [id, font] of added) {
    const data = fs.readFileSync(new URL(`../fonts/${font.file}`, import.meta.url));
    assert.equal(data.readUInt32BE(0), 0x00010000, `${id} is a TrueType font`);
    assert.match(fs.readFileSync(new URL(`../fonts/${id}-OFL.txt`, import.meta.url), 'utf8'), /SIL OPEN FONT LICENSE/i);
  }
  for (const font of ['unknown', '__proto__', '<script>']) {
    assert.equal(numeral(gradeSvg('best', 9, 'Best', false, { badgeFont: font })).getAttribute('font-family'), BADGE_FONTS.original.family);
  }
  assert.match(fs.readFileSync(new URL('../scripts/package.mjs', import.meta.url), 'utf8'), /'fonts'/);
});

test('hover labels and animations default off while accessible score labels remain', t => {
  const a = review(t), doc = a.dom.window.document;
  assert.equal(a.state.settings.badgeFont, 'original');
  for (const key of ['badgeTooltip', 'badgeDecimals', 'badgeFlicker']) assert.equal(a.state.settings[key], false);
  const badge = doc.querySelector('.sq-badge'); badge.focus();
  const event = new a.dom.window.Event('pointerenter'); Object.assign(event, { pointerType: 'mouse', buttons: 0 });
  badge.dispatchEvent(event);
  assert.equal(doc.getElementById('boardBadgeTip'), null);
  assert.equal(doc.querySelector('.qb').hasAttribute('title'), false);
  assert.equal(badge.getAttribute('aria-label'), 'Mistake, score 2');
  a.state.moveGrades[1] = 2.4; a.call('paintBoard');
  assert.equal(badge.querySelector('text').classList.contains('grade-updated'), false);
});

test('font and decimal settings update mounted badges and persist without changing scores', async t => {
  const a = review(t), doc = a.dom.window.document, badge = doc.querySelector('.sq-badge');
  const moveBadge = doc.querySelector('.qb'); badge.focus();
  const before = JSON.stringify({ grades: a.state.moveGrades, evals: a.state.evals, bests: a.state.bests, acc: a.state.acc });
  await a.call('setSetting', 'badgeDecimals', true);
  await a.call('setSetting', 'badgeFont', 'spacegrotesk');
  assert.equal(doc.querySelector('.sq-badge'), badge); assert.equal(doc.activeElement, badge);
  assert.equal(doc.querySelector('.qb'), moveBadge);
  for (const node of [badge, moveBadge]) {
    assert.equal(node.querySelector('text').textContent, '2.0');
    assert.match(node.querySelector('text').getAttribute('font-family'), /Badge Space Grotesk/);
  }
  assert.equal(a.store.settings.badgeFont, 'spacegrotesk'); assert.equal(a.store.settings.badgeDecimals, true);
  await a.call('setSetting', 'badgeFlicker', true);
  assert.equal(doc.documentElement.classList.contains('badge-flicker'), true);
  assert.equal(JSON.stringify({ grades: a.state.moveGrades, evals: a.state.evals, bests: a.state.bests, acc: a.state.acc }), before);
});

test('hover setting enables labels, dismisses them immediately when disabled, and covers new move badges', async t => {
  const a = review(t), doc = a.dom.window.document, badge = doc.querySelector('.sq-badge');
  await a.call('setSetting', 'badgeTooltip', true);
  badge.focus();
  assert.equal(doc.getElementById('boardBadgeTip').getAttribute('aria-hidden'), 'false');
  assert.equal(doc.querySelector('.qb').title, 'Mistake, score 2');
  await a.call('setSetting', 'badgeTooltip', false);
  assert.equal(doc.getElementById('boardBadgeTip').getAttribute('aria-hidden'), 'true');
  assert.equal(doc.querySelector('.qb').hasAttribute('title'), false);
  a.state.classif[1] = 'inacc'; a.state.moveGrades[1] = 4; a.call('renderMoves');
  assert.equal(doc.querySelector('.qb').hasAttribute('title'), false);
});

test('Visual exposes Category badges with previews and an independent reset', async t => {
  const a = review(t), doc = a.dom.window.document; a.call('toggleSettings');
  [...doc.querySelectorAll('.set-subtabs button')].find(b => b.textContent === 'Category badges').click();
  assert.equal(doc.querySelectorAll('.badge-font-option').length, 7);
  assert.equal(doc.querySelectorAll('.badge-preview-item').length, 5);
  a.state.settings.badgeFont = 'sora'; a.state.settings.badgeDecimals = true;
  a.state.settings.badgeFlicker = true; a.state.settings.badgeTooltip = true;
  a.state.settings.accent = 'custom';
  a.call('renderSettings');
  doc.querySelector('.badge-settings .set-reset').click();
  // The reset saves before applying the visual refresh.
  await Promise.resolve(); await Promise.resolve();
  assert.equal(a.state.settings.badgeFont, 'original'); assert.equal(a.state.settings.badgeDecimals, false);
  assert.equal(a.state.settings.badgeFlicker, false); assert.equal(a.state.settings.badgeTooltip, false);
  assert.equal(a.state.settings.accent, 'custom');
  assert.equal(doc.querySelector('.sq-badge text').textContent, '2');
});
