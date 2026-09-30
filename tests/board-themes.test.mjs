import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { app, loadGame } from './helpers/app.mjs';

test('retired matching settings migrate to Honeywood and discard source metadata', t => {
  const a = app(t);
  Object.assign(a.state.settings, {
    boardTheme: 'chesscom', ccBoardTheme: 'green', ccBoardUrl: 'https://example.test/board.png',
    ccPieceSet: 'neo', ccPieceUrlMap: {}, ccPieceUrlTemplate: 'https://example.test/piece.png',
  });
  assert.equal(a.call('migrateVisualAssetSettings', a.state.settings), true);
  assert.equal(a.state.settings.boardTheme, 'maple');
  assert.ok(Object.keys(a.state.settings).every(key => !key.startsWith('cc')));
  assert.equal(a.call('migrateVisualAssetSettings', a.state.settings), false);
});

for (const boardTheme of ['maple', 'green', 'ocean', 'custom']) {
  test(`opening games keeps the chosen ${boardTheme} board despite legacy theme payloads`, async t => {
    const a = app(t); loadGame(a, '1. e4 e5');
    Object.assign(a.state.settings, { boardTheme, boardCustomLight: '#abcdef', boardCustomDark: '#123456' });
    a.call('buildUI');
    a.replace('startAnalysis', () => {});
    a.call('applySettings');
    const colors = () => ['--sq-light', '--sq-dark'].map(key => a.dom.window.document.documentElement.style.getPropertyValue(key));
    const before = colors();
    await a.call('applyGame', { pgn: '1. d4 d5', theme: { boardTheme: 'bubblegum' }, analysis: null });
    assert.equal(a.state.settings.boardTheme, boardTheme);
    assert.deepEqual(colors(), before);
    await a.call('setSetting', 'boardTheme', boardTheme);
    assert.equal(a.store.settings.boardTheme, boardTheme);
    a.call('migrateVisualAssetSettings', a.store.settings);
    assert.equal(a.store.settings.boardTheme, boardTheme);
    const chips = a.call('visualSettings').querySelectorAll('.set-chip');
    assert.ok([...chips].some(chip => chip.title === 'Honeywood'));
    assert.ok([...chips].every(chip => !['chesscom', 'Blossom'].includes(chip.title)));
  });
}

for (const [file, url] of [
  ['content.js', 'https://www.chess.com/game/live/12345678'],
  ['lichess-content.js', 'https://lichess.org/AAAAAAAA'],
]) {
  test(`${file} reports game info without inspecting source themes`, t => {
    const dom = new JSDOM('<body data-board="green" data-piece-set="neo"><cg-container></cg-container></body>', {
      url, runScripts: 'outside-only',
    });
    t.after(() => dom.window.close());
    const w = dom.window;
    let listener;
    w.console = { log() {}, info() {}, warn() {} };
    w.getComputedStyle = () => { throw Error('Unexpected source-style inspection'); };
    w.performance.getEntriesByType = () => { throw Error('Unexpected source-resource inspection'); };
    w.chrome = { runtime: {
      getURL: path => `chrome-extension://test/${path}`,
      onMessage: { addListener(fn) { listener = fn; } },
    } };
    w.eval(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
    let response;
    listener({ type: 'getGameInfo' }, {}, value => { response = value; });
    assert.equal(response.ok, true);
    assert.equal(Object.hasOwn(response, 'theme'), false);
    assert.ok(response.gameId);
    let responded = false;
    listener({ type: 'getTheme' }, {}, () => { responded = true; });
    assert.equal(responded, false);
  });
}
