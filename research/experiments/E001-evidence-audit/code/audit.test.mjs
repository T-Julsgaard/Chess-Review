import test from 'node:test';
import assert from 'node:assert/strict';
import {playerComponents, playerRoleOverlap} from './audit.mjs';

const game = (id, white, black, split='train') => ({id, split, players:[{id:white},{id:black}]});
test('shared opponents and transitive links keep dependent games together', () => {
  const games = [game('a','one','two'),game('b','three','four'),game('c','two','three'),game('d','five','six')];
  assert.deepEqual(playerComponents(games), [['a','b','c'],['d']]);
  assert.deepEqual(playerComponents([...games].reverse()), [['a','b','c'],['d']]);
});
test('role and evaluation-fold overlap include either color and count players once', () => {
  const games = [game('a','one','two'),game('b','two','three','validation'),game('c','two','four','test')];
  assert.equal(playerRoleOverlap(games), 1);
  assert.equal(playerRoleOverlap(games, g => g.id), 1);
  assert.throws(() => playerComponents([game('a',null,'two')]), /Missing player/);
});
