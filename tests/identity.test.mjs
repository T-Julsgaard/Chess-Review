import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveIdentity, bottomSide, knownAccounts, rememberAccount, cleanPerspective, siteForUrl, accountName, IDENTITY_KEY, ACCOUNT_TTL_MS} from '../lib/identity.js';

const NOW = Date.UTC(2026, 10, 9);
const players = {w:'Alice', b:'Bob'};
// Owner faced three opponents with a clear lead: the learned history account on Chess.com.
const history = {'playerHistory:v1':{chesscom:['X1','X2','X3'].map((opponent, i) => ({site:'chesscom', id:String(i + 1), white:'Owner', black:opponent}))}};
const remembered = (name, seenAt = NOW - 864e5, site = 'chesscom') => ({[IDENTITY_KEY]:{[site]:{accounts:[{name, seenAt, via:'test'}]}}});
const resolve = (extra = {}) => resolveIdentity({site:'chesscom', players, now:NOW, ...extra});
function storage(initial = {}) {
  const store = structuredClone(initial), writes = [];
  return {store, writes, async get(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(list.filter(k => k in store).map(k => [k, structuredClone(store[k])]));
  }, async set(value) {writes.push(value); Object.assign(store, structuredClone(value));}};
}

test('a live signed-in account decides the side, case-insensitively', () => {
  assert.deepEqual(resolve({perspective:{account:'bob', boardFlip:false}, store:history}), {side:'b', name:'Bob', source:'account', reason:'account'});
});
test('a live signed-in account that is not a player means "not your game", whatever else is known', () => {
  const result = resolve({players:{w:'Owner', b:'Carol'}, perspective:{account:'Dave', bottom:'Carol', boardFlip:true}, store:{...history, ...remembered('Carol')}});
  assert.equal(result.side, null); assert.equal(result.reason, 'signed-in-account-not-in-game');
});
test('a remembered sign-in identifies you when the page can no longer read the account', () => {
  assert.equal(resolve({store:remembered('Alice'), perspective:{boardFlip:true}}).source, 'remembered-account');
  assert.equal(resolve({store:remembered('Alice'), perspective:{boardFlip:true}}).side, 'w', 'outranks the bottom player');
});
test('remembered sign-ins expire and the most recent matching one wins', () => {
  assert.equal(resolve({store:remembered('Alice', NOW - ACCOUNT_TTL_MS - 1)}).source, null);
  const store = {[IDENTITY_KEY]:{chesscom:{accounts:[{name:'Alice', seenAt:NOW - 5e8}, {name:'Bob', seenAt:NOW - 1e6}]}}};
  assert.deepEqual(knownAccounts(store, 'chesscom', NOW), ['Bob', 'Alice']);
  assert.equal(resolve({store}).side, 'b');
  assert.deepEqual(knownAccounts(store, 'lichess', NOW), [], 'accounts are per site');
});
test('recorded game history identifies you after a few reviews, without any page markup', () => {
  const result = resolve({players:{w:'Rival', b:'Owner'}, store:history, perspective:{boardFlip:false}});
  assert.equal(result.side, 'b'); assert.equal(result.source, 'history');
});
test('history positive is used even when an older remembered account is not in the game', () => {
  assert.equal(resolve({players:{w:'Rival', b:'Owner'}, store:{...history, ...remembered('OldAlt')}}).source, 'history');
});
test('once you are known, someone else\'s game never borrows the bottom player as "you"', () => {
  for (const store of [history, remembered('Owner')]) {
    const result = resolve({store, perspective:{bottom:'Bob', boardFlip:true}});
    assert.equal(result.side, null); assert.equal(result.reason, 'known-account-not-in-game');
  }
});
test('with nothing known, the verified bottom player is the fallback', () => {
  assert.deepEqual(resolve({perspective:{bottom:'Bob', boardFlip:true}}), {side:'b', name:'Bob', source:'bottom', reason:'bottom'});
  assert.equal(resolve({perspective:{boardFlip:false}}).side, 'w', 'board orientation alone');
  assert.equal(resolve({perspective:{bottom:'Bob'}}).side, 'b', 'bottom name alone');
  assert.equal(resolve({}).side, null);
  assert.equal(resolveIdentity({site:'lichess', players, store:history, perspective:{boardFlip:true}, now:NOW}).source, 'bottom', 'Chess.com history says nothing about Lichess');
});
test('the bottom player must agree with the board orientation and be a real player', () => {
  assert.equal(bottomSide(players, {bottom:'Bob', boardFlip:false}), null, 'name and orientation disagree');
  assert.equal(bottomSide(players, {bottom:'Player'}), null, 'loading placeholder is not a player');
  assert.equal(bottomSide(players, {bottom:'Bob', boardFlip:true}), 'b');
  assert.equal(bottomSide({w:'Same', b:'same'}, {bottom:'Same'}), null, 'ambiguous names never resolve');
});
test('URL orientation hints (?flip=, ?username=) are never treated as the bottom player', () => {
  assert.equal(resolve({flip:true}).side, null);
  assert.equal(resolve({perspective:{signedIn:false}}).side, null);
});
test('games without real player names stay anonymous', () => {
  assert.equal(resolve({players:{w:'White', b:'Bob'}, perspective:{account:'Bob'}}).side, null);
  assert.equal(resolve({players:{}, perspective:{boardFlip:true}}).side, null);
});
test('page perspective is reduced to validated fields', () => {
  assert.deepEqual(cleanPerspective({account:' Bob ', bottom:'a b', signedIn:true, extra:1}), {account:'Bob', bottom:'', signedIn:true, boardFlip:null});
  assert.equal(cleanPerspective({account:'', bottom:'', signedIn:'yes'}), null);
  assert.equal(cleanPerspective('Bob'), null);
  assert.equal(accountName('<script>'), '');
});
test('sites are recognised only on their real HTTPS origins', () => {
  assert.equal(siteForUrl('https://www.chess.com/game/live/1'), 'chesscom');
  assert.equal(siteForUrl('https://lichess.org/abcdefgh'), 'lichess');
  assert.equal(siteForUrl('https://lichess.org.evil.test/'), null);
  assert.equal(siteForUrl('http://lichess.org/'), null);
});
test('remembering an account stores it per site, refreshes rarely and keeps a short list', async () => {
  const s = storage();
  assert.equal(await rememberAccount(s, 'lichess', 'Alice', 'body-username', NOW), true);
  assert.equal(await rememberAccount(s, 'lichess', 'Alice', 'body-username', NOW + 60e3), false, 'no write spam');
  assert.equal(await rememberAccount(s, 'lichess', 'Alice', 'body-username', NOW + 7 * 36e5), true, 'stale stamp refreshed');
  assert.equal(await rememberAccount(s, 'lichess', 'not a name', 'x', NOW), false);
  assert.equal(await rememberAccount(s, 'evil', 'Alice', 'x', NOW), false);
  for (let i = 0; i < 7; i++) await rememberAccount(s, 'lichess', 'Alt' + i, 'x', NOW + i);
  const accounts = s.store[IDENTITY_KEY].lichess.accounts;
  assert.equal(accounts.length, 5); assert.equal(accounts[0].name, 'Alt6');
  assert.equal(s.store[IDENTITY_KEY].chesscom, undefined);
});
test('a signed-out visitor is a spectator: no bottom-player guess, but known accounts still count', () => {
  const result = resolve({perspective:{signedIn:false, bottom:'Bob', boardFlip:true}});
  assert.equal(result.side, null); assert.equal(result.reason, 'signed-out');
  assert.equal(resolve({perspective:{signedIn:false, boardFlip:true}, store:remembered('Alice')}).side, 'w');
  assert.equal(resolve({perspective:{signedIn:true, boardFlip:true}}).source, 'bottom', 'signed in but unreadable still falls back');
});
test('switching back to an earlier account re-stamps it as the most recent, even within the refresh window', async () => {
  const s = storage();
  await rememberAccount(s, 'chesscom', 'Main', 'context', NOW);
  await rememberAccount(s, 'chesscom', 'Alt', 'context', NOW + 60e3);
  assert.equal(await rememberAccount(s, 'chesscom', 'Main', 'context', NOW + 120e3), true);
  assert.deepEqual(knownAccounts(s.store, 'chesscom', NOW + 120e3), ['Main', 'Alt']);
});
test('a renamed capitalisation or new detection source is recorded, corrupt stored data is replaced', async () => {
  const s = storage({[IDENTITY_KEY]:{chesscom:'garbage', lichess:{accounts:[{name:'Old'}, null, {name:'Kept', seenAt:NOW}]}}});
  assert.equal(await rememberAccount(s, 'chesscom', 'Main', 'context', NOW), true);
  assert.deepEqual(s.store[IDENTITY_KEY].chesscom.accounts.map(a => a.name), ['Main']);
  assert.equal(s.store[IDENTITY_KEY].lichess.accounts.length, 3, 'other sites untouched');
  await rememberAccount(s, 'lichess', 'New', 'body-username', NOW + 1);
  assert.deepEqual(s.store[IDENTITY_KEY].lichess.accounts.map(a => a.name), ['New', 'Kept'], 'invalid entries dropped on write');
  assert.equal(await rememberAccount(s, 'chesscom', 'main', 'context', NOW + 1), true, 'casing updated');
  assert.equal(await rememberAccount(s, 'chesscom', 'main', 'navigation', NOW + 2), true, 'source updated');
  assert.deepEqual(s.store[IDENTITY_KEY].chesscom.accounts.map(a => a.name), ['main']);
});
test('a storage failure never throws out of rememberAccount', async () => {
  assert.equal(await rememberAccount({async get() {throw Error('down');}}, 'lichess', 'Alice'), false);
});
