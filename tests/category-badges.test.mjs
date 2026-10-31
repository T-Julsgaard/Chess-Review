import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { CATEGORY_SYMBOLS, CATEGORY_SYMBOL_OPTIONS, categoryBadgeSymbol, cleanBadgeSymbols } from '../lib/category-badges.js';
import { MOVE_GRADE_CONFIG, gradeSvg } from '../move-grades.js';
import { puzzleResultBadge } from '../lib/puzzle-badge.js';
import { app, loadGame, branch, settle } from './helpers/app.mjs';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3'); a.call('computeDerived');
  a.state.idx = 1; a.state.classif[1] = 'mistake'; a.state.moveGrades[1] = 2.4;
  a.call('buildUI'); a.call('renderAll');
  return a;
}
const parse = svg => new JSDOM(svg, {contentType:'image/svg+xml'}).window.document;
const mark = node => node.querySelector('.category-symbol')?.dataset.symbol;
const snapshot = a => JSON.stringify({classif:a.state.classif, grades:a.state.moveGrades, evals:a.state.evals,
  bests:a.state.bests, accuracy:a.state.acc, counts:a.state.counts});
function openSettings(a) {
  a.call('toggleSettings');
  [...a.dom.window.document.querySelectorAll('.set-sect-head')].find(node => node.textContent === 'Badges').click();
}

test('every scored category defaults to numbers and Book defaults to its book icon', () => {
  for (const [category, cfg] of Object.entries(MOVE_GRADE_CONFIG)) {
    const doc = parse(gradeSvg(category, 3.2, category));
    assert.equal(doc.querySelector('circle').getAttribute('r'), '49');
    assert.equal(doc.querySelector('circle').getAttribute('fill'), cfg.color);
    assert.equal(categoryBadgeSymbol(category), category === 'book' ? 'book' : 'numbers');
    if (category === 'book') assert.equal(mark(doc), 'book');
    else assert.equal(doc.querySelector('text').textContent, '3.2');
    doc.defaultView.close();
  }
  const book = parse(fs.readFileSync(new URL('../icons/book.svg', import.meta.url), 'utf8'));
  assert.equal(CATEGORY_SYMBOLS.book.svg, book.querySelector('g').outerHTML.replace(' xmlns="http://www.w3.org/2000/svg"', ''));
  book.defaultView.close();
});

test('symbols render only for their category and saved selections reject unrelated or unsafe symbols', () => {
  for (const [category, allowed] of Object.entries(CATEGORY_SYMBOL_OPTIONS)) {
    for (const symbol of allowed) {
      const doc = parse(gradeSvg(category, 3.2, '<Category>', false, {badgeSymbols:{[category]:symbol}}));
      assert.equal(doc.querySelector('circle').getAttribute('fill'), MOVE_GRADE_CONFIG[category].color);
      assert.equal(doc.querySelector('svg').getAttribute('aria-label'), '<Category>');
      assert.equal(mark(doc), symbol);
      assert.equal(doc.querySelector('Category, text, image, use, script'), null);
      assert.ok(doc.querySelector('.category-symbol [fill="#fff"],.category-symbol [stroke="#fff"]'));
      doc.defaultView.close();
    }
    for (const symbol of [...Object.keys(CATEGORY_SYMBOLS).filter(id => !allowed.includes(id)), '__proto__', 'constructor', '<script>', null, {}]) {
      assert.equal(categoryBadgeSymbol(category, {badgeSymbols:{[category]:symbol}}), category === 'book' ? 'book' : 'numbers');
      assert.deepEqual(cleanBadgeSymbols({[category]:symbol}), {});
    }
  }
  assert.deepEqual(cleanBadgeSymbols({good:'anchor',mistake:'star',best:'numbers',book:'book',other:'check'}), {good:'anchor'});
});

test('Badges exposes category-specific choices with numbers first and the primary symbol immediately below', t => {
  const a = review(t), doc = a.dom.window.document; openSettings(a);
  const primary = {brilliant:'brilliant',great:'great',best:'star',excellent:'thumbSimple',good:'check',book:'book',inacc:'dubious',mistake:'mistake',miss:'miss',blunder:'blunder'};
  const exposed = new Set();
  assert.equal(doc.querySelectorAll('.badge-symbol-row[data-symbol-category]').length, 10);
  assert.equal(doc.querySelectorAll('.badge-preview-item').length, 10);
  for (const [category, symbols] of Object.entries(CATEGORY_SYMBOL_OPTIONS)) {
    const choices = [...doc.querySelectorAll(`[data-symbol-category="${category}"] .lib-dd-opt`)];
    assert.deepEqual(choices.map(node => node.dataset.symbol), [...(category === 'book' ? [] : ['numbers']), ...symbols]);
    assert.equal(choices[category === 'book' ? 0 : 1].dataset.symbol, primary[category]);
    assert.equal(choices[0].getAttribute('aria-selected'), 'true');
    assert.match(choices[0].textContent, /\(default\)/);
    for (const symbol of symbols) exposed.add(symbol);
  }
  assert.deepEqual([...exposed].sort(), Object.keys(CATEGORY_SYMBOLS).sort());
  assert.deepEqual(Object.keys(CATEGORY_SYMBOLS).filter(id => id.startsWith('thumb')), ['thumbSimple','thumbDetailed']);
});

test('individual selections refresh mounted badges, preserve focus and persist without changing analysis', async t => {
  const a = review(t), doc = a.dom.window.document, before = snapshot(a);
  const board = doc.querySelector('.sq-badge'), move = doc.querySelector('.qb');
  openSettings(a);
  const picker = doc.querySelector('[data-badge-picker="mistake"]'); picker.focus();
  picker.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true}));
  assert.equal(doc.activeElement.dataset.symbol, 'numbers');
  doc.querySelector('[data-symbol-category="mistake"] .lib-dd-opt[data-symbol="steps"]').click(); await settle();
  assert.equal(doc.activeElement.dataset.badgePicker, 'mistake');
  assert.equal(a.store.settings.badgeSymbols.mistake, 'steps');
  assert.equal(doc.querySelector('.sq-badge'), board);
  assert.equal(doc.querySelector('.qb'), move);
  for (const node of [board, move]) assert.equal(mark(node), 'steps');
  assert.equal(board.getAttribute('aria-label'), 'Mistake');
  await a.call('setCategoryBadgeSymbol','mistake','numbers');
  assert.equal(board.querySelector('text').textContent, '2.4');
  assert.equal(board.getAttribute('aria-label'), 'Mistake, score 2.4');
  assert.equal(Object.hasOwn(a.store.settings.badgeSymbols,'mistake'), false);
  assert.equal(snapshot(a), before);
});

test('Simple and Detailed thumbs are selectable only for Excellent and persist through appearance changes', async t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.classif[1] = 'excellent'; a.state.moveGrades[1] = 8; a.call('renderAll'); openSettings(a);
  for (const symbol of ['thumbSimple','thumbDetailed']) {
    doc.querySelector(`[data-symbol-category="excellent"] .lib-dd-opt[data-symbol="${symbol}"]`).click(); await settle();
    assert.equal(mark(doc.querySelector('.sq-badge')), symbol);
    assert.equal(a.store.settings.badgeSymbols.excellent, symbol);
  }
  await a.call('setSetting','badgeAppearance','ink-mineral');
  assert.equal(mark(doc.querySelector('.sq-badge')), 'thumbDetailed');
  await a.call('setSetting','badgeAppearance','solid');
  assert.equal(mark(doc.querySelector('.sq-badge')), 'thumbDetailed');
  await a.call('setCategoryBadgeSymbol','excellent','numbers');
  assert.equal(doc.querySelector('.sq-badge text').textContent, '8.0');
});

test('Solid and Ink & mineral support mixed symbols and numbers and visual reset restores defaults', async t => {
  const a = review(t), doc = a.dom.window.document, before = snapshot(a), board = doc.querySelector('.sq-badge');
  const original = board.querySelector('svg').outerHTML;
  openSettings(a);
  doc.querySelector('[data-setting="badgeAppearance"][data-value="ink-mineral"]').click(); await settle();
  assert.equal(a.store.settings.badgeAppearance, 'ink-mineral');
  assert.equal(board.querySelector('text').getAttribute('fill'), '#e7a779');
  await a.call('setCategoryBadgeSymbol','mistake','steps');
  assert.equal(board.querySelector('.category-symbol g').getAttribute('stroke'), '#e7a779');
  a.call('setAccuracyPage',1);
  for (const node of doc.querySelectorAll('.grade-badge[data-badge-category]')) assert.equal(node.querySelector('circle').getAttribute('stroke-width'), '2.5');
  await a.call('setSetting','badgeAppearance','solid');
  assert.equal(board.querySelector('.category-symbol g').getAttribute('stroke'), '#fff');
  await a.call('setCategoryBadgeSymbol','mistake','numbers');
  assert.equal(board.querySelector('svg').outerHTML, original);
  await a.call('setCategoryBadgeSymbol','mistake','steps');
  await a.call('setSetting','badgeAppearance','ink-mineral');
  await a.call('resetVisualSettings');
  assert.deepEqual(a.store.settings.badgeSymbols, {});
  assert.equal(a.store.settings.badgeAppearance, 'solid');
  assert.equal(snapshot(a), before);
});

test('number fonts remain available for mixed selections and symbols can be chosen individually', async t => {
  const a = review(t), doc = a.dom.window.document; openSettings(a);
  const symbols = Object.fromEntries(Object.entries(CATEGORY_SYMBOL_OPTIONS).map(([category, choices]) => [category, choices[0]]));
  await a.call('setSetting','badgeSymbols',symbols);
  assert.equal(doc.querySelector('.badge-font-options'), null);
  for (const [category, symbol] of Object.entries(symbols)) assert.equal(mark(doc.querySelector(`.badge-preview-item[data-badge-category="${category}"]`)), symbol);
  await a.call('setCategoryBadgeSymbol','good','numbers');
  assert.ok(doc.querySelector('.badge-font-options'));
  assert.equal(a.store.settings.badgeSymbols.mistake, 'mistake');
});

test('navigation, variations, later categories and puzzle feedback retain their independent behavior', async t => {
  const a = review(t), doc = a.dom.window.document;
  a.replace('renderEngineCurrent',()=>{});
  const result = puzzleResultBadge(doc,'correct'); doc.querySelector('.board').append(result);
  const puzzle = result.outerHTML;
  await a.call('setCategoryBadgeSymbol','good','anchor');
  a.state.classif[2] = 'good'; a.state.moveGrades[2] = 6;
  a.call('go',2); assert.equal(mark(doc.querySelector('.sq-badge[data-badge-category]')), 'anchor');
  assert.equal(result.outerHTML, puzzle);
  assert.equal(result.isConnected, true);
  await a.call('setCategoryBadgeSymbol','brilliant','flame');
  a.state.classif[2] = 'brilliant'; a.call('paintBoard'); a.call('renderMoves');
  assert.equal(mark(doc.querySelector('.sq-badge[data-badge-category]')), 'flame');
  assert.equal(mark(doc.querySelector('.ml-move[data-ply="2"] .qb')), 'flame');
  const variation = branch(a,0,1); variation.positions[1].classif = 'good'; variation.positions[1].moveGrade = 5.8;
  a.call('paintBoard'); assert.equal(mark(doc.querySelector('.sq-badge[data-badge-category]')), 'anchor');
});

test('loaded preferences normalize unsupported assignments and preserve valid mixed selections', t => {
  const a = review(t);
  Object.assign(a.state.settings, {badgeSymbols:{good:'anchor',miss:'constructor',other:'star',mistake:'star',excellent:'missing',best:'numbers'}});
  assert.equal(a.call('migrateVisualAssetSettings',a.state.settings), true);
  assert.equal(JSON.stringify(a.state.settings.badgeSymbols), JSON.stringify({good:'anchor'}));
  assert.equal(a.call('migrateVisualAssetSettings',a.state.settings), false);
  a.state.settings.badgeAppearance = 'constructor';
  a.call('migrateVisualAssetSettings',a.state.settings);
  assert.equal(a.state.settings.badgeAppearance, 'solid');
  a.state.settings.badgeAppearance = 'ink-mineral';
  assert.equal(a.call('migrateVisualAssetSettings',a.state.settings), false);
});

test('independent edits from stale reviews merge without losing other categories', async t => {
  const a = review(t), b = review(t), data = {settings:{badgeSymbols:{}}};
  const storage = {async get(key) {return {[key]:structuredClone(data[key])};},async set(values) {Object.assign(data,structuredClone(values));}};
  let queue = Promise.resolve();
  const locks = {request(_name,fn) {const next = queue.then(fn);queue = next;return next;}};
  for (const view of [a,b]) {
    view.context.browserAPI.storage.local = storage;
    Object.defineProperty(view.dom.window.navigator,'locks',{value:locks});
  }
  await Promise.all([a.call('setCategoryBadgeSymbol','good','anchor'),b.call('setCategoryBadgeSymbol','miss','hourglass')]);
  assert.deepEqual(data.settings.badgeSymbols,{good:'anchor',miss:'hourglass'});
  await a.call('setCategoryBadgeSymbol','good','numbers');
  assert.deepEqual(data.settings.badgeSymbols,{miss:'hourglass'});
});
