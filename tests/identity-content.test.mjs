import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const chess = readFileSync(new URL('../content.js', import.meta.url), 'utf8');
const lichess = readFileSync(new URL('../lichess-content.js', import.meta.url), 'utf8');

function page(t, {site, html, path, htmlClass = '', bodyAttrs = ''}) {
  const origin = site === 'chess' ? 'https://www.chess.com' : 'https://lichess.org';
  const dom = new JSDOM(`<!doctype html><html class="${htmlClass}"><body ${bodyAttrs}>${html}</body></html>`,
    {url:origin + path, runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window, sent = [], warnings = [], listeners = [], timers = [];
  t.after(() => w.close());
  w.console = {log() {}, info() {}, warn: message => warnings.push(message)};
  w.setTimeout = fn => {timers.push(fn); return timers.length;}; w.clearTimeout = () => {};
  w.setInterval = () => 0; w.clearInterval = () => {};
  w.requestAnimationFrame = () => 0;
  w.fetch = async () => {throw Error('offline');};
  w.chrome = {runtime:{getURL:p => p, onMessage:{addListener:fn => listeners.push(fn)},
    sendMessage:message => {sent.push(message); return Promise.resolve();}}, storage:{onChanged:{addListener() {}}}};
  w.eval(site === 'chess' ? chess : lichess);
  return {w, sent, warnings, runTimers:() => timers.splice(0).forEach(fn => fn()),
    accounts:() => JSON.parse(JSON.stringify(sent.filter(m => m.type === 'accountSeen'))),
    info() {let reply; listeners[0]({type:'getGameInfo'}, {}, value => {reply = value;}); return reply;}};
}

test('Lichess reports the signed-in account from the page body once', t => {
  const p = page(t, {site:'lichess', path:'/abcdefgh', bodyAttrs:'data-user="alice" data-username="Alice"', html:'<button id="user_tag">Alice</button>'});
  p.runTimers();
  assert.deepEqual(p.accounts(), [{type:'accountSeen', site:'lichess', name:'Alice', via:'body-username'}]);
  assert.equal(p.info().perspective.account, 'Alice');
});
test('Lichess falls back to the header tag when body data is gone', t => {
  const p = page(t, {site:'lichess', path:'/', html:'<button id="user_tag"> Alice </button>'});
  assert.deepEqual(p.accounts().map(m => [m.name, m.via]), [['Alice', 'user-tag']]);
});
test('Lichess signed-out pages report nothing and do not warn', t => {
  const p = page(t, {site:'lichess', path:'/', html:'<a class="signin" href="/login">Sign in</a>'});
  p.runTimers();
  assert.equal(p.accounts().length, 0); assert.equal(p.warnings.length, 0);
  assert.equal(p.info().perspective.signedIn, false);
});
test('Lichess warns once when it is signed in but the name is unreadable', t => {
  const p = page(t, {site:'lichess', path:'/', html:'<button id="user_tag">  </button>'});
  p.runTimers();
  assert.equal(p.accounts().length, 0); assert.equal(p.warnings.filter(w => /signed-in/.test(w)).length, 1);
});
test('Lichess reads the bottom player from its profile link, not its title or rating text', t => {
  const html = '<div class="cg-wrap orientation-black"></div>'
    + '<div class="ruser-top ruser user-link"><a class="text" href="/@/Rival">Rival 2726</a></div>'
    + '<div class="ruser-bottom ruser user-link"><span class="utitle">GM</span><a class="text" href="/@/Hero">GM Hero 2910</a></div>';
  const info = page(t, {site:'lichess', path:'/abcdefgh', html}).info();
  assert.equal(info.perspective.bottom, 'Hero'); assert.equal(info.perspective.boardFlip, true);
  const hinted = page(t, {site:'lichess', path:'/abcdefgh/black', html:'<div class="cg-wrap"></div>'}).info();
  assert.equal(hinted.flip, true); assert.equal(hinted.perspective.boardFlip, null, 'URL segment is not the rendered board');
});
test('Lichess analysis view (finished games) reads the main board orientation without a bottom player block', t => {
  const html = '<div class="mini-game"><div class="cg-wrap orientation-black"></div></div>'
    + '<main class="analyse"><div class="analyse__board"><div class="cg-wrap cgv1 orientation-white manipulable"></div></div>'
    + '<aside class="analyse__side"><div class="game__meta__players"><div class="player color-icon is white text"><a class="user-link" href="/@/Hero">Hero</a></div></div></aside></main>';
  const info = page(t, {site:'lichess', path:'/game/abcdefgh', bodyAttrs:'data-username="Hero"', html}).info();
  assert.equal(info.perspective.bottom, ''); assert.equal(info.perspective.boardFlip, false); assert.equal(info.perspective.account, 'Hero');
  assert.equal(info.flip, false, 'the review orientation also follows the main board');
});
test('Chess.com reads the signed-in user from its boot context and never on a signed-out page', t => {
  const context = '<script>window.context = {"user":{"id":1,"username":"Hero","flags":{"a":"}"}},"i18n":{}};</script>';
  const p = page(t, {site:'chess', path:'/home', html:context});
  assert.deepEqual(p.accounts().map(m => [m.name, m.via]), [['Hero', 'context']]);
  const out = page(t, {site:'chess', path:'/home', htmlClass:'user-logged-out', html:context});
  out.runTimers();
  assert.equal(out.accounts().length, 0); assert.equal(out.info().perspective.signedIn, false);
});
test('Chess.com navigation fallback needs one agreeing profile link outside the board', t => {
  const nav = '<nav class="nav-component"><a href="/member/Hero">Profile</a><a href="https://www.chess.com/member/hero/stats">Stats</a></nav>';
  const board = '<div class="board-layout-player board-layout-top"><nav><a href="/member/Rival">Rival</a></nav></div>';
  assert.deepEqual(page(t, {site:'chess', path:'/game/live/12345678', html:nav + board}).accounts().map(m => m.name), ['Hero']);
  const ambiguous = '<nav><a href="/member/Hero">Hero</a><a href="/member/Friend">Friend</a></nav>';
  assert.equal(page(t, {site:'chess', path:'/home', html:ambiguous}).accounts().length, 0);
});
test('Chess.com navigation fallback never takes the profile being viewed as your account', t => {
  // Live markup: the site menu is <nav id="sidebar-main-menu">; a profile page adds a <nav> of tabs inside <main>.
  const tabs = '<main><nav class="profile-header-tabs-component"><a href="/member/hikaru">Overview</a><a href="/member/hikaru/games">Games</a></nav></main>';
  const sidebar = '<nav id="sidebar-main-menu" class="sidebar-container"><a href="https://www.chess.com/member/julsgaard">Profile</a></nav>';
  assert.deepEqual(page(t, {site:'chess', path:'/member/hikaru', html:sidebar + tabs}).accounts().map(m => m.name), ['julsgaard']);
  const noSidebar = page(t, {site:'chess', path:'/member/hikaru', html:tabs});
  noSidebar.runTimers();
  assert.equal(noSidebar.accounts().length, 0, 'profile tabs alone are not the signed-in user');
  const ownerInHeader = page(t, {site:'chess', path:'/member/hikaru', html:'<header><a href="/member/hikaru">Hikaru</a></header>'});
  ownerInHeader.runTimers();
  assert.equal(ownerInHeader.accounts().length, 0, 'the profile owner is excluded wherever the link sits');
});
test('Chess.com reads orientation from the game board, not an earlier preview board', t => {
  const html = '<div class="preview"><wc-chess-board class="board flipped"></wc-chess-board></div>'
    + '<div class="board-layout-chessboard"><wc-chess-board id="board-single" class="board"></wc-chess-board></div>';
  assert.equal(page(t, {site:'chess', path:'/game/live/12345678', html}).info().perspective.boardFlip, false);
});
test('Chess.com bottom player ignores the loading placeholder', t => {
  const block = name => `<div class="board-layout-player board-layout-bottom"><div class="player-component player-bottom"><span class="cc-user-username-component">${name}</span></div></div>`;
  assert.equal(page(t, {site:'chess', path:'/game/live/12345678', html:'<wc-chess-board class="board"></wc-chess-board>' + block('Player')}).info().perspective.bottom, '');
  const info = page(t, {site:'chess', path:'/game/live/12345678', html:'<wc-chess-board class="board flipped"></wc-chess-board>' + block('Hero')}).info();
  assert.equal(info.perspective.bottom, 'Hero'); assert.equal(info.perspective.boardFlip, true);
  const hinted = page(t, {site:'chess', path:'/game/live/12345678?flip=true', html:'<wc-chess-board class="board"></wc-chess-board>'}).info();
  assert.equal(hinted.flip, true); assert.equal(hinted.perspective.boardFlip, false, 'URL hint is not the rendered board');
});
