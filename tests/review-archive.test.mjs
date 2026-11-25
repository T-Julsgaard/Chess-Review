import test from 'node:test';
import assert from 'node:assert/strict';
import {app, deferred} from './helpers/app.mjs';
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
