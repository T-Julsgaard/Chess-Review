import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {parseLichessGameId, fetchGamePgn} from '../lichess.js';

const script = readFileSync(new URL('../lichess-content.js', import.meta.url), 'utf8');
function gameInfo(t, path, og, html = '') {
  const dom = new JSDOM('<cg-container></cg-container>'+html, {url:'https://lichess.org'+path, runScripts:'outside-only'});
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

for (const path of ['/analysis', '/training', '/practice', '/game', '/game/analysis', '/game/not-an-id', '/study/9pnmvxvA']) {
  test(`Lichess does not mistake ${path} for a game`, t => {
    assert.equal(parseLichessGameId(path), null);
    assert.equal(gameInfo(t, path).gameId, null);
  });
}
