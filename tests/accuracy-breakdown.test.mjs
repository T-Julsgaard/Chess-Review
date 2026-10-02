import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame } from './helpers/app.mjs';

test('expanded Accuracy puts Book last and keeps all categories', t => {
  const a = app(t); loadGame(a, '1. e4 e5'); a.call('computeDerived'); a.call('buildUI');
  a.state.qbreakExpanded = true; a.call('renderStats');
  const labels = [...a.dom.window.document.querySelectorAll('.qbreak [data-category]')].map(n => n.dataset.category);
  assert.equal(labels.length, 10); assert.equal(new Set(labels).size, 10);
  assert.equal(labels.at(-1), 'book'); assert.equal(labels[2], 'best');
});
