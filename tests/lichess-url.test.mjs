import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {parseLichessGameId, fetchGamePgn} from '../lichess.js';

const script = readFileSync(new URL('../lichess-content.js', import.meta.url), 'utf8');
function gameInfo(t, path, og, html = '', {board = true} = {}) {
  const dom = new JSDOM((board ? '<cg-container></cg-container>' : '')+html, {url:'https://lichess.org'+path, runScripts:'outside-only'});
  const w = dom.window;
  t.after(() => w.close());
  w.console = {log(){}, info(){}, warn(){}};
  w.setTimeout = () => 0;
  if (og) {
    const meta = w.document.createElement('meta');
    meta.setAttribute('property', 'og:url');
    meta.content = og;
    w.document.head.append(meta);
  }
  let listener, response;
  w.chrome = {runtime:{onMessage:{addListener(fn){listener=fn;}}}};
  w.eval(script);
  listener({type:'getGameInfo'}, {}, value => {response=value;});
  return response;
}

test('round fallback reads SAN despite changing custom tags and excludes numbers and result text', t => {
  const info = gameInfo(t, '/game/9pnmvxvAERfi', null,
    '<div class="round__app"><i5d><app><qzm>1</qzm><z7yx>e4</z7yx><z7yx>e5</z7yx><qzm>2</qzm><z7yx>Nf3</z7yx><z7yx>Nf6</z7yx><div class="result-wrap">1-0 White is victorious</div></app></i5d></div>');
  assert.equal(info.movetext, '1. e4 e5 2. Nf3 Nf6');
});

test('a successful HTTP response containing a signup page is rejected as an export failure', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ok:true, text:async()=> '<!DOCTYPE html><html>Sign up</html>'}));
  await assert.rejects(fetchGamePgn('9pnmvxvA'), /web page instead of a PGN/);
});

for (const path of ['/9pnmvxvA', '/9pnmvxvAERfi', '/9pnmvxvA/black/analysis',
  '/game/9pnmvxvA', '/game/9pnmvxvAERfi', '/game/9pnmvxvA/white#87', '/game/9pnmvxvA/black/analysis']) {
  test(`Lichess URL and content script recognize ${path}`, t => {
    assert.equal(parseLichessGameId('https://lichess.org'+path)?.id, '9pnmvxvA');
    assert.equal(gameInfo(t, path).gameId, '9pnmvxvA');
  });
}

test('the current Lichess og:url identifies a game even without an ID in the page path', t => {
  assert.equal(gameInfo(t, '/', 'https://lichess.org/game/9pnmvxvA').gameId, '9pnmvxvA');
});

for (const path of ['/analysis', '/training', '/practice', '/game', '/game/analysis', '/game/not-an-id', '/study/9pnmvxvA',
  '/game/9pnmvxvAA', '/game/9pnmvxvAAA', '/game/9pnmvxvAAAA', '/game/9pnmvxvAAAAAA']) {
  test(`Lichess does not mistake ${path} for a game`, t => {
    assert.equal(parseLichessGameId(path), null);
    assert.equal(gameInfo(t, path).gameId, null);
  });
}

test('current game path takes precedence over stale metadata after navigation', t => {
  assert.equal(gameInfo(t, '/game/BBBBBBBB/black', 'https://lichess.org/game/AAAAAAAA').gameId, 'BBBBBBBB');
});

test('embedded game data survives a future game-page URL change', t => {
  const html = '<script type="application/json" id="page-init-data">{"mode":"replay","cfg":{"data":{"game":{"id":"9pnmvxvA"}}}}</script>';
  assert.equal(gameInfo(t, '/future/game/9pnmvxvA', 'https://lichess.org/future/game/9pnmvxvA', html).gameId, '9pnmvxvA');
  assert.equal(gameInfo(t, '/future/game/9pnmvxvA', null, html, {board:false}).gameId, null);
});

for (const json of ['{broken', 'null', '{"cfg":{"data":{"game":{"id":"9pnmvxvAERfi"}}}}',
  '{"cfg":{"data":{"game":{"id":"analysis"}}}}', '{"study":{"game":{"id":"9pnmvxvA"}}}',
  '{"cfg":{"data":{"game":{"id":["9pnmvxvA"]}}}}']) {
  test(`unrelated or malformed page data cannot invent a game: ${json}`, t => {
    const html = `<script type="application/json" id="page-init-data">${json}</script>`;
    assert.equal(gameInfo(t, '/study/chapter', null, html).gameId, null);
    assert.equal(gameInfo(t, '/game/9pnmvxvA', null, html).gameId, '9pnmvxvA');
  });
}

test('foreign and malformed metadata fall through to the current game', t => {
  for (const og of ['https://lichess.org.example.com/game/AAAAAAAA', 'not a URL']) {
    assert.equal(gameInfo(t, '/', og).gameId, null);
    assert.equal(gameInfo(t, '/game/9pnmvxvA', og).gameId, '9pnmvxvA');
  }
});

test('pasted URLs must belong to Lichess, while paths and player tokens remain supported', () => {
  for (const value of ['https://example.com/game/9pnmvxvA', 'https://lichess.org.example.com/9pnmvxvA',
    '//example.com/9pnmvxvA', 'ftp://lichess.org/9pnmvxvA']) assert.equal(parseLichessGameId(value), null);
  for (const value of ['/game/9pnmvxvAERfi', 'https://www.lichess.org/game/9pnmvxvA', '9pnmvxvA']) {
    assert.equal(parseLichessGameId(value)?.id, '9pnmvxvA');
  }
});

test('round move fallback retains castling, captures, disambiguation, promotions and check', t => {
  const tokens = ['O-O', 'O-O-O', 'Raxd1', 'exd8=Q+', 'Nbd2!', 'Qh4#'];
  const html = '<div class="round__app"><app>' + tokens.map(san => `<changed-tag>${san}</changed-tag>`).join('') + '</app></div>';
  assert.equal(gameInfo(t, '/game/9pnmvxvA', null, html).movetext, '1. O-O O-O-O 2. Raxd1 exd8=Q+ 3. Nbd2! Qh4#');
});

test('replay PGN fallback preserves the complete export before a move list has rendered', t => {
  const pgn = '[Event "Replay"]\n[White "Player"]\n[Result "1-0"]\n\n1. e4 e5 1-0';
  const html = `<div class="analyse__underboard"><div class="pgn">${pgn}</div></div>`;
  const info = gameInfo(t, '/game/9pnmvxvA', null, html);
  assert.equal(info.pgn, pgn);
  assert.equal(info.movetext, null);
  assert.equal(gameInfo(t, '/game/9pnmvxvA', null, '<div class="pgn">1. d4 d5</div>').pgn, null);
});

test('embedded perspective is a fallback behind the displayed board and explicit URL', t => {
  const data = '<script type="application/json" id="page-init-data">{"cfg":{"data":{"orientation":"black"}}}</script>';
  assert.equal(gameInfo(t, '/game/9pnmvxvA', null, data).flip, true);
  assert.equal(gameInfo(t, '/game/9pnmvxvA/white', null, data).flip, false);
  assert.equal(gameInfo(t, '/game/9pnmvxvA', null, data + '<div class="cg-wrap orientation-white"></div>').flip, false);
});
