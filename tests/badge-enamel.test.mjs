import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { ENAMEL_PALETTE } from '../lib/badge-enamel.js';
import { CATEGORY_SYMBOL_OPTIONS } from '../lib/category-badges.js';
import { gradeSvg } from '../move-grades.js';
import { CHECKMATE_BADGES, checkmateBadgeSvg } from '../lib/mate-mark.js';
import { app, loadGame, settle } from './helpers/app.mjs';

const luminance = hex => hex.slice(1).match(/../g).map(part => {
  const channel = parseInt(part,16) / 255;
  return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
}).reduce((sum,channel,index) => sum + channel * [.2126,.7152,.0722][index],0);

test('Enamel keeps ink contrast above 4.5:1 for every category and checkmate', () => {
  for (const [category, {ink,face}] of Object.entries(ENAMEL_PALETTE)) {
    assert.ok((luminance(face)+.05)/(luminance(ink)+.05) >= 4.5,category);
  }
});

test('Enamel renders numbers, every matching symbol and all four checkmate hashes', () => {
  const verify = (svg, category) => {
    const dom = new JSDOM(svg,{contentType:'image/svg+xml'}), doc = dom.window.document;
    const {rim,ink,face} = ENAMEL_PALETTE[category];
    const disc = doc.querySelector('circle');
    assert.equal(disc.getAttribute('fill'),face);
    assert.equal(disc.getAttribute('stroke'),rim);
    assert.equal(disc.getAttribute('stroke-width'),'7');
    assert.equal(doc.querySelector('[fill="#fff"],[stroke="#fff"]'),null);
    assert.ok(doc.querySelector(`[fill="${ink}"],[stroke="${ink}"]`));
    assert.equal(doc.querySelector('script,image,use'),null);
    dom.window.close();
  };
  for(const [category,symbols] of Object.entries(CATEGORY_SYMBOL_OPTIONS)) {
    verify(gradeSvg(category,2.4,category,false,{badgeAppearance:'enamel'}),category);
    for(const symbol of symbols) verify(gradeSvg(category,2.4,category,false,{badgeAppearance:'enamel',badgeSymbols:{[category]:symbol}}),category);
  }
  for(const checkmateBadge of Object.keys(CHECKMATE_BADGES)) verify(checkmateBadgeSvg({checkmateBadge,badgeAppearance:'enamel'}),'checkmate');
});

test('Enamel selection persists, refreshes mounted grade and mate badges, and preserves independent symbol choices', async t => {
  const a = app(t); loadGame(a,'1. f3 e5 2. g4 Qh4#'); a.call('computeDerived');
  a.state.idx=a.state.total; a.state.classif[a.state.idx]='best'; a.state.moveGrades[a.state.idx]=9;
  a.call('buildUI'); a.call('renderAll'); a.call('toggleSettings');
  const doc=a.dom.window.document;
  [...doc.querySelectorAll('.set-sect-head')].find(node=>node.textContent==='Badges').click();
  const grade=doc.querySelector('.sq-badge[data-badge-category]'),mate=doc.querySelector('.mate-badge-layer');
  const scores=JSON.stringify(a.state.moveGrades);
  doc.querySelector('[data-setting="badgeAppearance"][data-value="enamel"]').click(); await settle();
  assert.equal(a.store.settings.badgeAppearance,'enamel');
  assert.equal(grade.querySelector('circle').getAttribute('stroke'),ENAMEL_PALETTE.best.rim);
  assert.equal(mate.querySelector('circle').getAttribute('stroke'),ENAMEL_PALETTE.checkmate.rim);
  await a.call('setCategoryBadgeSymbol','best','summit');
  assert.equal(grade.querySelector('.category-symbol').dataset.symbol,'summit');
  assert.equal(grade.querySelector('.category-symbol g').getAttribute('stroke'),ENAMEL_PALETTE.best.ink);
  a.call('paintBoard'); assert.equal(doc.querySelector('.mate-badge-layer'),mate);
  assert.equal(a.call('migrateVisualAssetSettings',a.state.settings),false);
  await a.call('setSetting','badgeAppearance','solid');
  assert.equal(grade.querySelector('.category-symbol').dataset.symbol,'summit');
  assert.equal(JSON.stringify(a.state.moveGrades),scores);
});
