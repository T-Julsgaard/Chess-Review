import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { BADGE_FONTS, gradeSvg, gradeText } from '../move-grades.js';
import { app, loadGame, settle } from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3'); a.call('computeDerived');
  a.state.idx = 1; a.state.classif[1] = 'mistake'; a.state.moveGrades[1] = 2;
  a.call('buildUI'); a.call('renderAll');
  return a;
}
const numeral = svg => new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.querySelector('text');

test('every score always uses equal size and one decimal, including zero, ten and pending', () => {
  for (const font of Object.keys(BADGE_FONTS)) {
    const sizes = new Set();
    for (const score of [0, 1.9, 6.4, 9, 10, null]) {
      const text = numeral(gradeSvg('good', score, 'Good', false, { badgeFont: font }));
      sizes.add(text.getAttribute('font-size'));
      assert.equal(text.textContent, score === null ? '—' : score.toFixed(1));
    }
    assert.equal(sizes.size, 1, font);
  }
  assert.equal(gradeText(9), '9'); assert.equal(gradeText(9, true), '9.0');
  assert.equal(gradeText(null, true), '—');
  assert.equal(numeral(gradeSvg('book', null, 'Book', true, { badgeDecimals: true })), null);
});

test('sixteen local font choices ship with licenses and unsafe font names fall back', () => {
  const added = Object.entries(BADGE_FONTS).filter(([, font]) => font.file);
  assert.ok(added.length >= 16);
  for (const [id, font] of added) {
    const data = fs.readFileSync(new URL(`../fonts/${font.file}`, import.meta.url));
    assert.equal(data.readUInt32BE(0), 0x00010000, `${id} is a TrueType font`);
    assert.match(fs.readFileSync(new URL(`../fonts/${id}-OFL.txt`, import.meta.url), 'utf8'), /SIL OPEN FONT LICENSE/i);
  }
  for (const font of ['unknown', '__proto__', '<script>']) {
    assert.equal(numeral(gradeSvg('best', 9, 'Best', false, { badgeFont: font })).getAttribute('font-family'), BADGE_FONTS.spacemono.family);
  }
  assert.match(fs.readFileSync(new URL('../scripts/package.mjs', import.meta.url), 'utf8'), /'fonts'/);
});

test('hover labels default off while accessible score labels remain', t => {
  const a = review(t), doc = a.dom.window.document;
  assert.equal(a.state.settings.badgeFont, 'spacemono');
  assert.equal(a.state.settings.badgeTooltip, false);
  assert.equal(Object.hasOwn(a.state.settings, 'badgeDecimals'), false);
  const badge = doc.querySelector('.sq-badge'); badge.focus();
  const event = new a.dom.window.Event('pointerenter'); Object.assign(event, { pointerType: 'mouse', buttons: 0 });
  badge.dispatchEvent(event);
  assert.equal(doc.getElementById('boardBadgeTip'), null);
  assert.equal(doc.querySelector('.qb').hasAttribute('title'), false);
  assert.equal(badge.getAttribute('aria-label'), 'Mistake, score 2');
  a.state.moveGrades[1] = 2.4; a.call('paintBoard');
  assert.equal(badge.querySelector('text').textContent, '2.4');
});

test('font settings update mounted badges and persist without changing scores', async t => {
  const a = review(t), doc = a.dom.window.document, badge = doc.querySelector('.sq-badge');
  const moveBadge = doc.querySelector('.qb'); badge.focus();
  const before = JSON.stringify({ grades: a.state.moveGrades, evals: a.state.evals, bests: a.state.bests, acc: a.state.acc });
  await a.call('setSetting', 'badgeFont', 'spacegrotesk');
  assert.equal(doc.querySelector('.sq-badge'), badge); assert.equal(doc.activeElement, badge);
  assert.equal(doc.querySelector('.qb'), moveBadge);
  for (const node of [badge, moveBadge]) {
    assert.equal(node.querySelector('text').textContent, '2.0');
    assert.match(node.querySelector('text').getAttribute('font-family'), /Badge Space Grotesk/);
  }
  assert.equal(a.store.settings.badgeFont, 'spacegrotesk');
  assert.equal(JSON.stringify({ grades: a.state.moveGrades, evals: a.state.evals, bests: a.state.bests, acc: a.state.acc }), before);
});

test('hover setting automatically shows the current move and immediately dismisses it when disabled', async t => {
  const a = review(t), doc = a.dom.window.document, badge = doc.querySelector('.sq-badge');
  await a.call('setSetting', 'badgeTooltip', true);
  const image = doc.querySelector('#boardBadgeTip img');
  assert.match(image.src, /icons\/labels\/mistake\.png$/);
  image.dispatchEvent(new a.dom.window.Event('load'));
  assert.equal(doc.getElementById('boardBadgeTip').getAttribute('aria-hidden'), 'false');
  assert.equal(doc.querySelector('.qb').hasAttribute('title'), false);
  await a.call('setSetting', 'badgeTooltip', false);
  assert.equal(doc.getElementById('boardBadgeTip').getAttribute('aria-hidden'), 'true');
  assert.equal(doc.querySelector('.qb').hasAttribute('title'), false);
  a.state.classif[1] = 'inacc'; a.state.moveGrades[1] = 4; a.call('renderMoves');
  assert.equal(doc.querySelector('.qb').hasAttribute('title'), false);
});

test('Visual exposes Category badges with previews and hover labels off by default', t => {
  const a = review(t), doc = a.dom.window.document; a.call('toggleSettings');
  assert.equal(doc.querySelector('.set-subtabs'), null);
  [...doc.querySelectorAll('.set-sect-head')].find(b => b.textContent === 'Category badges').click();
  assert.ok(doc.querySelector('.badge-settings').closest('.set-section').classList.contains('open'));
  assert.equal(doc.querySelectorAll('.badge-font-option').length, Object.keys(BADGE_FONTS).length);
  assert.equal(doc.querySelectorAll('.badge-preview-item').length, 5);
  assert.doesNotMatch(doc.querySelector('.badge-settings').textContent, /Equal number size/);
  assert.equal(doc.querySelector('.badge-settings .set-reset'), null);
  assert.equal(a.state.settings.badgeFont, 'spacemono');
  assert.equal(a.state.settings.badgeTooltip, false);
});

test('accuracy category explainers work with hover labels off and after renaming', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const cls of ['brilliant', 'blunder']) {
    const label = doc.querySelector(`[data-category="${cls}"]`);
    assert.equal(label.hasAttribute('title'), false);
    label.dispatchEvent(new a.dom.window.MouseEvent('mouseenter'));
    assert.ok(doc.querySelector('.q-tip').classList.contains('show'));
    assert.match(doc.querySelector('.q-tip-body').textContent, cls === 'brilliant' ? /sacrifice/ : /mate/);
    label.dispatchEvent(new a.dom.window.MouseEvent('mouseleave'));
    assert.equal(doc.querySelector('.q-tip').classList.contains('show'), false);
  }
  a.call('setCategoryName', 'blunder', 'Oops');
  doc.querySelector('[data-category="blunder"]').focus();
  assert.equal(doc.querySelector('.q-tip-nm').textContent, 'Oops');
});

test('obsolete number sizing and animation preferences are removed while font choices survive', t => {
  const a = review(t);
  Object.assign(a.state.settings, {badgeFlicker: true, badgeFont: 'sora', badgeDecimals: true});
  assert.equal(a.call('migrateVisualAssetSettings', a.state.settings), true);
  assert.equal(Object.hasOwn(a.state.settings, 'badgeFlicker'), false);
  assert.equal(Object.hasOwn(a.state.settings, 'badgeDecimals'), false);
  assert.equal(a.state.settings.badgeFont, 'sora');
  assert.equal(a.call('migrateVisualAssetSettings', a.state.settings), false);
  a.call('renderSettings');
  assert.doesNotMatch(a.dom.window.document.querySelector('.badge-settings').textContent, /Number flicker|tick up or down/);
});

test('legacy default fonts upgrade once while a new explicit Original selection survives', t => {
  const a = review(t);
  Object.assign(a.state.settings, { badgeFont: 'original', badgeDecimals: false });
  assert.equal(a.call('migrateVisualAssetSettings', a.state.settings), true);
  assert.equal(a.state.settings.badgeFont, 'spacemono');
  a.state.settings.badgeFont = 'original';
  assert.equal(a.call('migrateVisualAssetSettings', a.state.settings), false);
  assert.equal(a.state.settings.badgeFont, 'original');
});

test('navigation immediately displays the final move score and keeps it stable', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const a = review(t), doc = a.dom.window.document, S = a.state;
  a.replace('renderEngineCurrent', () => {});
  S.idx = 0;
  const before = JSON.stringify({grades: S.moveGrades, evals: S.evals, acc: S.acc});
  a.call('go', 1);
  assert.equal(doc.querySelector('.sq-badge text').textContent, '2.0');
  assert.equal(doc.querySelector('.qb text').textContent, '2.0');
  assert.equal(doc.querySelector('.sq-badge').getAttribute('aria-label'), 'Mistake, score 2');
  t.mock.timers.tick(2000);
  assert.equal(doc.querySelector('.sq-badge text').textContent, '2.0');
  a.call('go', 2); a.call('go', 1);
  assert.equal(doc.querySelector('.sq-badge text').textContent, '2.0');
  a.call('go', 0); a.call('go', 1);
  assert.equal(doc.querySelector('.sq-badge text').textContent, '2.0');
  assert.equal(JSON.stringify({grades: S.moveGrades, evals: S.evals, acc: S.acc}), before);
});

test('choosing fonts preserves the independent list scroll, outer scroll and keyboard focus', async t => {
  const a = review(t), doc = a.dom.window.document;
  a.call('toggleSettings');
  [...doc.querySelectorAll('.set-sect-head')].find(b => b.textContent === 'Category badges').click();
  doc.getElementById('settings').scrollTop = 110;
  doc.querySelector('.badge-font-options').scrollTop = 580;
  const option = doc.querySelector('[data-font="lora"]'); option.focus(); option.click();
  await settle();
  assert.equal(doc.querySelector('.badge-font-options').scrollTop, 580);
  assert.equal(doc.getElementById('settings').scrollTop, 110);
  assert.equal(doc.activeElement.dataset.font, 'lora');
  assert.equal(doc.activeElement.getAttribute('aria-pressed'), 'true');
  assert.match(doc.querySelector('.badge-preview-item text').getAttribute('font-family'), /Badge Lora/);
});
