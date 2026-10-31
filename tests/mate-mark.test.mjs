import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, branch, settle } from './helpers/app.mjs';
import { CHECKMATE_BADGES, checkmateBadgeSvg } from '../lib/mate-mark.js';
import { JSDOM } from 'jsdom';

const FOOLS_MATE = '1. f3 e5 2. g4 Qh4#';
function review(t, pgn = FOOLS_MATE) {
  const a = app(t);
  loadGame(a, pgn); a.call('computeDerived');
  a.call('buildUI'); a.call('buildBoard');
  return a;
}
const squares = a => [...a.dom.window.document.querySelectorAll('.mate-glow')].map(n => n.closest('.sq'));
const sqName = (a, node) => Object.entries(a.run('sqByName')).find(([, sq]) => sq === node)?.[0];

test('the final mated position marks the mated king with a glow and a "#" badge', t => {
  const a = review(t);
  a.state.idx = a.state.total; a.state.classif[a.state.idx] = 'best'; a.call('paintBoard');
  const marked = squares(a);
  assert.equal(marked.length, 1);
  assert.equal(sqName(a, marked[0]), 'e1');
  assert.ok(marked[0].querySelector('.mate-glow'));
  assert.equal(marked[0].classList.contains('has-badge'), false);
  assert.equal(a.dom.window.document.querySelector('.mate-badge').getAttribute('aria-label'), 'Checkmate');
  // The mating queen keeps its own grade badge.
  assert.ok(a.run('sqByName').h4.querySelector('.sq-badge[data-badge-category="best"]'));
});

test('adjacent mating-piece and king badges use separate layers in both orientations', t => {
  const a = review(t, '[SetUp "1"]\n[FEN "7r/8/8/8/8/7q/4k3/6K1 b - - 0 1"]\n\n1... Qh1#');
  a.state.idx = a.state.total; a.state.classif[a.state.idx] = 'best';
  for (const flipped of [false, true]) {
    a.state.flipped = flipped; a.call('buildBoard');
    const doc = a.dom.window.document, board = doc.querySelector('.board'), layer = board.querySelector(':scope > .mate-badge-layer');
    assert.ok(layer?.querySelector('.mate-badge'));
    assert.equal(layer.dataset.matedSquare, 'g1');
    assert.equal(layer.style.left, flipped ? '12.5%' : '75%');
    assert.equal(layer.style.top, flipped ? '0%' : '87.5%');
    assert.equal(layer.classList.contains('top-row'), flipped);
    // Raising the whole king square would instead clip the queen's badge when flipped.
    assert.equal(a.run('sqByName.g1').classList.contains('has-badge'), false);
    assert.ok(a.run('sqByName.g1').querySelector('.mate-glow'));
    assert.ok(a.run('sqByName.h1').querySelector('.sq-badge'));
    assert.ok([...board.children].indexOf(layer) > [...board.children].indexOf(a.run('sqByName.h1')));
    a.call('paintBoard');assert.equal(doc.querySelector('.mate-badge-layer'), layer);
  }
});

test('the mark is on the same square when the board is flipped and clears when navigating away', t => {
  const a = review(t);
  a.state.idx = a.state.total; a.state.flipped = true; a.call('buildBoard');
  assert.equal(sqName(a, squares(a)[0]), 'e1');
  a.state.idx -= 1; a.call('paintBoard');
  assert.equal(a.dom.window.document.querySelectorAll('.mate-glow, .mate-badge').length, 0);
  assert.equal(a.run('sqByName').e1.classList.contains('has-badge'), false);
  a.state.idx += 1; a.call('paintBoard'); a.call('paintBoard');
  assert.equal(a.dom.window.document.querySelectorAll('.mate-glow').length, 1);
});

test('a mate reached in a variation is marked, while plain check is not', t => {
  const a = review(t, '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6');
  const v = branch(a, a.state.total, 0);
  a.call('paintBoard');
  assert.equal(squares(a).length, 0);
  v.positions.push({ ...v.positions[0], fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', from: 'h5', to: 'f7', san: 'Qxf7#' });
  v.idx = 1; a.call('paintBoard');
  assert.equal(sqName(a, squares(a)[0]), 'e8');
  v.positions[1] = { ...v.positions[1], fen: 'rnbqkbnr/ppp2ppp/8/1B1pp3/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 3', from: 'f1', to: 'b5', san: 'Bb5+' };
  a.call('paintBoard');
  assert.equal(a.dom.window.document.querySelectorAll('.mate-glow, .mate-badge').length, 0);
});

test('the learning board marks a mate played on the free board', async t => {
  const a = review(t);
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ schema: 1, puzzles: [{ id: 'unused' }] }) }));
  await a.call('openLearning');
  const w = a.run('learningWorkspace'), doc = a.dom.window.document;
  t.after(() => w.close());
  for (const move of ['f2f3', 'e7e5', 'g2g4']) w.submitMove(move);
  assert.equal(doc.querySelectorAll('.learn-board .mate-badge').length, 0);
  w.submitMove('d8h4');
  const marked = doc.querySelector('.learn-square .mate-glow')?.closest('.learn-square');
  assert.equal(marked?.dataset.square, 'e1');
  assert.ok(marked.querySelector('.mate-glow')); assert.equal(marked.classList.contains('has-badge'), false);
  assert.ok(doc.querySelector('.learn-board > .mate-badge-layer .mate-badge'));
  await a.call('setSetting','checkmateBadge','slab');
  assert.equal(doc.querySelector('.learn-board .mate-badge svg').dataset.checkmateStyle,'slab');
  w.render();
  assert.equal(doc.querySelector('.learn-board .mate-badge svg').dataset.checkmateStyle,'slab');
});

test('all four checkmate options are self-contained round hash badges in both appearances', () => {
  const paths = new Set();
  for (const [style, glyph] of Object.entries(CHECKMATE_BADGES)) {
    paths.add(glyph.path);
    for (const badgeAppearance of ['solid','ink-mineral']) {
      const dom = new JSDOM(checkmateBadgeSvg({checkmateBadge:style,badgeAppearance}),{contentType:'image/svg+xml'});
      const doc = dom.window.document;
      assert.equal(doc.querySelector('svg').dataset.checkmateStyle,style);
      assert.equal(doc.querySelectorAll('circle').length,1);
      assert.equal(doc.querySelectorAll('path').length,1);
      assert.equal(doc.querySelector('text,image,use,script'),null);
      assert.equal(doc.querySelector('path').getAttribute('stroke'),badgeAppearance === 'solid' ? '#fff' : '#e78781');
      dom.window.close();
    }
  }
  assert.equal(paths.size,4);
  assert.match(checkmateBadgeSvg({checkmateBadge:'constructor'}),/data-checkmate-style="rounded"/);
});

test('checkmate picker saves designs, updates mounted marks and retains them through navigation and flipping', async t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.idx = a.state.total; a.call('paintBoard');
  a.call('toggleSettings');
  [...doc.querySelectorAll('.set-sect-head')].find(node=>node.textContent==='Badges').click();
  assert.equal(doc.querySelectorAll('[data-checkmate-picker] .lib-dd-opt').length,4);
  const layer=doc.querySelector('.mate-badge-layer');
  for(const style of Object.keys(CHECKMATE_BADGES)) {
    doc.querySelector(`.lib-dd-opt[data-setting="checkmateBadge"][data-value="${style}"]`).click(); await settle();
    assert.equal(a.store.settings.checkmateBadge,style);
    assert.equal(doc.querySelector('.mate-badge-layer'),layer);
    assert.equal(doc.querySelector('.mate-badge svg').dataset.checkmateStyle,style);
    assert.equal(doc.activeElement.dataset.setting,'checkmateBadge');
    a.call('paintBoard'); assert.equal(doc.querySelector('.mate-badge-layer'),layer);
  }
  await a.call('setSetting','badgeAppearance','ink-mineral');
  assert.equal(doc.querySelector('.mate-badge path').getAttribute('stroke'),'#e78781');
  a.state.flipped=true; a.call('buildBoard');
  assert.equal(doc.querySelector('.mate-badge svg').dataset.checkmateStyle,'slab');
  a.state.idx--; a.call('paintBoard'); assert.equal(doc.querySelector('.mate-badge'),null);
  a.state.idx++; a.call('paintBoard');
  assert.equal(doc.querySelector('.mate-badge svg').dataset.checkmateStyle,'slab');
  await a.call('setSetting','checkmateBadge','<svg>');
  assert.equal(a.store.settings.checkmateBadge,'rounded');
  a.state.settings.checkmateBadge='constructor'; a.call('migrateVisualAssetSettings',a.state.settings);
  assert.equal(a.state.settings.checkmateBadge,'rounded');
});
