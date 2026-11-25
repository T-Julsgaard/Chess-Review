import test from 'node:test';
import assert from 'node:assert/strict';
import {app, deferred} from './helpers/app.mjs';
import {Chess} from '../lib/chess.js';
import {monthStart, playerArchive} from '../lib/review-archive-source.js';

const pgn = '[White "Opponent"]\n[Black "River"]\n[Result "0-1"]\n\n1. e4 e5 2. Nf3 Nc6 0-1';
const game = (id, end_time) => ({pgn, end_time, time_class: 'rapid', rules: 'chess',
  white: {username: 'Opponent'}, black: {username: 'River'}, url: 'https://www.chess.com/game/live/' + id});
const tick = () => new Promise(resolve => setImmediate(resolve));

async function launch(t) {
  const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease', async () => {});
  await a.start();
  const doc = a.dom.window.document;
  const select = selector => doc.querySelector(selector);
  const search = name => { select('#archive-username').value = name; select('.archive-form').requestSubmit(); };
  return {a, doc, select, search};
}

test('Chess.com lookup stays inside Insights, Moves and the move controls until a game opens', async t => {
  const {a, doc, select, search} = await launch(t);
  const insights = select('#reviewMount .insight-panel'), moves = select('.moves-panel #movesBody');
  const controls = select('#controls'), board = select('#boardWrap').innerHTML;
  const modules = [...doc.querySelectorAll('#canvas .mod')];
  assert.ok(insights.contains(select('.archive-form')));
  assert.equal(select('.archive-form').firstElementChild, select('.archive-sites'));
  assert.doesNotMatch(select('.archive-form').textContent, /Find a game/);
  assert.equal(select('.ip-close-game'), null);
  assert.equal(select('#boardWrap input, #boardWrap form'), null);
  const urls = [];
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(url);
    return Response.json({games: [game('12345', 1700000000), game('98765', 1701000000), {...game('22222', 1702000000), rules: 'bughouse'}]});
  });
  search(''); assert.equal(urls.length, 0); assert.equal(select('input[aria-invalid]').id, 'archive-username');
  search('River'); await tick();
  assert.match(urls[0], /\/player\/river\/games\/\d{4}\/\d{2}$/);
  assert.equal(select('.archive-count').textContent, '2 games');
  assert.equal(doc.querySelectorAll('.archive-game').length, 2);
  assert.equal(select('.archive-result').textContent, 'Win');
  assert.ok(moves.contains(select('.archive-game')));
  assert.ok(controls.contains(select('[aria-label="Previous month"]')));
  select('.archive-game').focus();
  assert.equal(select('#boardWrap').innerHTML, board);
  assert.deepEqual([...doc.querySelectorAll('#canvas .mod')], modules);
  assert.equal(a.state.pgn, ''); assert.equal(a.state.analyzing, false);
  assert.equal(select('[aria-label="Next month"]').disabled, true);
  select('[aria-label="Previous month"]').click(); await tick();
  assert.equal(select('[aria-label="Next month"]').disabled, false);
  assert.notEqual(urls[1], urls[0]);
  select('[aria-label="Next month"]').click(); await tick();
  assert.equal(urls.at(-1), urls[0]);
  select('#archive-username').focus();
  a.call('renderReview'); a.call('renderMoves');
  assert.ok(insights.contains(select('#archive-username')));
  assert.equal(doc.activeElement, select('#archive-username'));
  a.replace('loadBook', async () => {}); a.replace('loadCalibration', async () => {}); a.replace('startAnalysis', () => {});
  select('.archive-game').click(); await tick();
  assert.equal(a.state.meta.gameId, '98765'); assert.equal(a.state.flipped, true);
  assert.equal(a.state.pgn, pgn); assert.equal(a.state.blank, false);
  assert.equal(select('.archive-form, .archive-period, .archive-game'), null);
  assert.equal(doc.querySelectorAll('.ml-move').length, 4); assert.ok(select('[aria-label="Play"]'));
  assert.equal((await a.call('loadJob')).pgn, pgn);
  const close = select('#reviewMount .ip-close-game');
  close.click();
  assert.equal(doc.activeElement, select('#archive-username'));
  assert.equal(select('#archive-username').value, 'River');
  assert.ok(moves.contains(select('.archive-game')));
  assert.ok(controls.contains(select('[aria-label="Previous month"]')));
  assert.equal(urls.length, 3);
  assert.equal(select('.ip-close-game'), null);
  assert.equal((await a.call('loadJob')).source, 'blank');
  select('.archive-game').click(); await tick();
  assert.equal(a.state.pgn, pgn);
});

for (const motion of ['on', 'off', 'reduced']) {
  test(`opening a game from the archive with interface motion ${motion}`, async t => {
    const {a, select, search} = await launch(t);
    const {window} = a.dom;
    const preparation = deferred(), exit = deferred(), animations = [];
    a.state.settings.uiAnim = motion !== 'off';
    window.matchMedia = () => ({matches: motion === 'reduced'});
    window.Element.prototype.animate = function (frames) {
      const animation = {finished: exit.promise, cancel() { this.canceled = true; }};
      animations.push({node: this, frames, animation});
      return animation;
    };
    t.mock.method(globalThis, 'fetch', async () => Response.json({games: [game('12345', 1700000000)]}));
    a.replace('loadBook', () => preparation.promise);
    a.replace('loadCalibration', async () => {});
    let analysisStarted = false;
    a.replace('startAnalysis', () => { analysisStarted = true; });
    search('River'); await tick();
    const row = select('.archive-game');
    row.click(); await tick();
    assert.equal(row.getAttribute('aria-busy'), 'true');
    assert.equal(a.state.blank, true);
    assert.equal(animations.length, 0);

    preparation.resolve(); await tick();
    if (motion === 'on') {
      const outgoing = animations.slice();
      assert.ok(row.isConnected);
      assert.equal(a.state.blank, true);
      assert.equal(analysisStarted, false);
      assert.ok(outgoing.some(({node}) => node.id === 'boardWrap'));
      assert.ok(outgoing.some(({node}) => node.id === 'movesBody'));
      exit.resolve(); await tick();
      assert.deepEqual(animations.slice(outgoing.length).map(({node}) => node), outgoing.map(({node}) => node));
      for (const [index, {frames, animation}] of outgoing.entries()) {
        assert.equal(animation.canceled, true);
        assert.equal(animations[outgoing.length + index].frames[0].opacity, frames[1].opacity);
      }
    } else {
      assert.equal(animations.length, 0);
    }
    assert.equal(a.state.blank, false);
    assert.equal(a.state.pgn, pgn);
    assert.equal(row.isConnected, false);
    assert.equal(analysisStarted, true);
    assert.ok(select('.ml-move[data-ply="1"]'));
  });
}

test('closing a game from a direct link cancels review work and clears the reload handoff', async t => {
  const a = app(t);
  const {document, location, sessionStorage} = a.dom.window;
  a.replace('loadBook', async () => {}); a.replace('loadCalibration', async () => {}); a.replace('startAnalysis', () => {});
  a.call('buildUI');
  await a.call('applyGame', {pgn, meta: {flip: true}, analysis: null});
  assert.equal((await a.call('loadJob')).pgn, pgn);
  a.state.evals[0] = {cp: 300};
  a.call('renderEvalBar');
  assert.equal(document.querySelector('#evalbarMount .score.bot').textContent, '3.0');
  const pending = deferred();
  const read = a.context.browserAPI.storage.local.get;
  a.context.browserAPI.storage.local.get = key => typeof key === 'string' && key.startsWith('analysis:') ? pending.promise : read(key);
  const nextGame = a.call('applyGame', {pgn: '1. d4 d5'});
  let terminated = false;
  a.state.evalEngines = [{terminate() { terminated = true; }}];
  a.state.progress = 2;
  document.querySelector('#reviewMount .ip-close-game').click();
  pending.resolve({});
  await nextGame;
  assert.equal(terminated, true);
  assert.equal(a.state.blank, true);
  assert.equal(a.state.analyzing, false);
  assert.equal(a.state.flipped, false);
  assert.equal(a.state.progress, 0);
  assert.equal(a.call('activePos').fen, new Chess().fen());
  assert.equal(document.querySelector('#evalbarMount .white-fill').style.height, '50%');
  assert.equal(document.querySelector('#evalbarMount .score.bot').textContent, '');
  assert.equal(location.hash, '');
  assert.equal(sessionStorage.getItem('job:test-game'), null);
  assert.equal((await a.call('loadJob')).source, 'blank');
});

test('a replacement search cancels the first and an empty month can be retried after a network failure', async t => {
  const {select, search} = await launch(t);
  const late = deferred(); let firstSignal, failed = false;
  t.mock.method(globalThis, 'fetch', async (url, {signal}) => {
    if (url.includes('/first/')) { firstSignal = signal; return late.promise; }
    if (!failed) { failed = true; throw Error('Network offline'); }
    return Response.json(url.endsWith('/archives') ? {archives: []} : {games: []});
  });
  search('First'); search('Second'); await tick();
  assert.equal(firstSignal.aborted, true); assert.equal(select('.archive-retry').hidden, false);
  late.resolve(Response.json({games: [game('12345', 1700000000)]}));
  select('.archive-retry').click(); await tick();
  assert.equal(select('.archive-head h3').textContent, 'Second');
  assert.match(select('.archive-status').textContent, /No games this month/);
  assert.equal(select('.archive-game'), null);
});

test('Lichess streams tagged PGNs inside the selected UTC month, including a year boundary', async t => {
  const january = new Date('2026-01-18T22:40:00Z'), month = monthStart(january, -1);
  assert.equal(month.toISOString(), '2025-12-01T00:00:00.000Z');
  const data = {id: 'abcdefgh', variant: 'standard', winner: 'black', status: 'mate', moves: 'e4 e5 Nf3 Nc6', pgn,
    createdAt: +month, players: {white: {user: {name: 'Opponent'}}, black: {user: {name: 'River'}}}};
  const stream = new TransformStream(), writer = stream.writable.getWriter(), first = deferred();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const params = new URL(url).searchParams;
    assert.equal(+params.get('since'), +month); assert.equal(+params.get('until'), +monthStart(january) - 1);
    assert.equal(params.get('tags'), 'true'); assert.equal(params.get('pgnInJson'), 'true');
    assert.equal(options.headers.Accept, 'application/x-ndjson');
    return new Response(stream.readable);
  });
  const loading = playerArchive('lichess', 'River')(month, new AbortController().signal, batch => first.resolve(batch));
  await writer.write(new TextEncoder().encode(JSON.stringify(data) + '\n'));
  const [row] = await first.promise;
  assert.equal(row.meta.gameId, data.id); assert.equal(row.pgn, pgn); assert.equal(row.result, 'b');
  await writer.close(); await loading;
});

test('both providers distinguish an unknown username from an empty month', async t => {
  const {select, search} = await launch(t);
  t.mock.method(globalThis, 'fetch', async () => new Response(null, {status: 404}));
  for (const [site, label] of [['chesscom', 'Chess.com'], ['lichess', 'Lichess']]) {
    select('.archive-sites [data-site="' + site + '"]').click();
    search('Missing'); await tick();
    assert.equal(select('.archive-status').textContent, label + ' has no player called Missing.');
    assert.equal(select('.archive-game'), null);
  }
});
