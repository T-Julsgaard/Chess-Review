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
  // The error hangs inside the field wrapper (positioned out of flow), so the centred form doesn't move.
  assert.equal(select('#archive-input-error').parentElement, select('.archive-field'));
  assert.equal(select('#archive-input-error').hidden, false);
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
  test(`opening an archive game reveals its moves with interface motion ${motion}`, async t => {
    const {a, select, search} = await launch(t);
    const {window} = a.dom;
    const preparation = deferred(), animations = [];
    a.state.settings.uiAnim = motion !== 'off';
    window.matchMedia = () => ({matches: motion === 'reduced'});
    window.Element.prototype.animate = function (frames, options) {
      const animation = {finished: Promise.resolve(), cancel() {}};
      animations.push({node: this, frames, options, animation});
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
    assert.equal(animations.length, motion === 'on' ? 2 : 0);
    for (const [index, {node, frames, options}] of animations.entries()) {
      assert.ok(node.matches('#movesBody .ml-pair'));
      assert.equal(frames[0].opacity, 0);
      assert.equal(frames.at(-1).opacity, 1);
      assert.equal(options.delay, index * 16);
      assert.equal(options.duration, 180);
      assert.equal(options.fill, 'backwards');
    }
    assert.equal(a.state.blank, false);
    assert.equal(a.state.pgn, pgn);
    assert.equal(row.isConnected, false);
    assert.equal(analysisStarted, true);
    assert.ok(select('.ml-move[data-ply="1"]'));
    a.call('renderMoves');
    a.call('go', 1);
    assert.equal(animations.length, motion === 'on' ? 2 : 0, 'progress and navigation do not replay the entrance');
  });
}

for (const style of ['rows', 'cards', 'compact']) {
  test(`long ${style} move lists finish their entrance quickly and library switches do not replay it`, async t => {
    const {a, select} = await launch(t);
    const chess = new Chess();
    for (let cycle = 0; cycle < 24; cycle++) {
      for (const san of ['Nf3', 'Nf6', 'Ng1', 'Ng8']) chess.move(san);
    }
    a.state.settings.mlStyle = style;
    a.replace('loadBook', async () => {});
    a.replace('loadCalibration', async () => {});
    a.replace('startAnalysis', () => {});
    const animations = [];
    a.dom.window.Element.prototype.animate = function (frames, options) {
      animations.push({node: this, options});
    };
    await a.call('applyGame', {pgn: chess.pgn(), source: 'archive'});
    assert.equal(animations.length, style === 'compact' ? 96 : 48);
    assert.ok(animations.every(({node}) => node.matches(style === 'compact' ? '.ml-move' : '.ml-pair')));
    assert.ok(animations.every(({options}) => options.delay + options.duration <= 420));
    assert.equal(animations[1].options.delay, 16);
    const count = animations.length;
    a.state.evals[2] = {cp: 0};
    select('.ml-move[data-ply="2"]').click();
    assert.equal(a.state.idx, 2, 'moves remain interactive during the reveal');
    await a.call('applyGame', {pgn, source: 'library'});
    assert.equal(animations.length, count);
    a.call('closeReviewGame');
    await a.call('applyGame', {pgn, source: 'library'});
    assert.equal(animations.length, count, 'other ways of loading from the blank workspace stay unchanged');
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
