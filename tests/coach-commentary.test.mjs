import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame } from './helpers/app.mjs';

test('category labels follow the special-replies toggle without changing the move or evaluation', async t => {
  const a = app(t); const S = loadGame(a, '1. e4 e5');
  S.idx = 1; S.classif[1] = 'inacc'; S.settings.coach = 'old_soviet';
  a.replace('loadCoach', async () => null);
  a.replace('renderReview', () => {});
  const header = () => a.call('renderMoveComment').querySelector('.ip-head');
  const label = a.call('categoryName', 'inacc');
  const original = header();
  assert.equal(original.querySelector('.ip-move').textContent, 'e4');
  await a.call('setCoachPlain', false);
  const special = header();
  assert.equal(special.querySelector('.ip-move').textContent, 'e4 ' + label);
  assert.equal(special.querySelector('.ip-eval').textContent, original.querySelector('.ip-eval').textContent);
  assert.equal(special.querySelector('.ip-badge').src, original.querySelector('.ip-badge').src);
  S.settings.categoryNames = {inacc:'Careful move'};
  assert.equal(header().querySelector('.ip-move').textContent, 'e4 Careful move');
  await a.call('setCoachPlain', true);
  assert.equal(header().querySelector('.ip-move').textContent, 'e4');
});
