import test from 'node:test';
import assert from 'node:assert/strict';
import {historyGame,inferredPlayer,inferredPlayerProfile,rankPlayers,rememberAnalyzedGame,archivePlayers,PLAYER_HISTORY_KEY} from '../lib/player-history.js';
import {app,settle} from './helpers/app.mjs';

function game(id,white='Owner',black='Opponent',site='chesscom') {
  return {pgn:`[Site "${site==='chesscom'?'Chess.com':'https://lichess.org/'+String(id).padStart(8,'0')}"]\n[White "${white}"]\n[Black "${black}"]\n\n1. e4 e5`,meta:{gameId:String(id),url:site==='chesscom'?`https://www.chess.com/game/live/${id}`:`https://lichess.org/${String(id).padStart(8,'0')}`}};
}
function storage(store={}) {
  return {store,async get(keys){return Object.fromEntries(keys.map(key=>[key,store[key]]));},async set(values){Object.assign(store,structuredClone(values));}};
}

test('one game and fifty matches against the same friend cannot establish ownership',()=>{
  assert.equal(inferredPlayer({library:[game(1)]},'chesscom'),'');
  const library=Array.from({length:50},(_,i)=>i%2?game(i,'Friend','Owner'):game(i,'Owner','Friend'));
  assert.equal(inferredPlayer({library},'chesscom'),'');
});

test('older library evidence distinguishes the owner after fifty recent matches with a friend',()=>{
  const earlier=[game(101,'Owner','Alice'),game(102,'Bob','Owner'),game(103,'OWNER','Carol')];
  const recent=Array.from({length:50},(_,i)=>game(i,'Friend','owner'));
  const store={library:[...recent,...earlier],[PLAYER_HISTORY_KEY]:{chesscom:recent.map(historyGame)}};
  assert.equal(inferredPlayer(store,'chesscom').toLowerCase(),'owner');
  assert.equal(rankPlayers(store,'chesscom')[0].games,53,'Library/history overlap must count once');
});

test('frequency needs a clear lead, several opponents, and separate histories for each site',()=>{
  const library=[game(1,'Owner','Alice'),game(2,'Owner','Bob'),game(3,'Owner','Carol'),game(4,'Alice','Bob'),
    ...[1,2,3,4].map((id,i)=>game(id,'DifferentOwner','LiOpponent'+i,'lichess'))];
  assert.equal(inferredPlayer({library},'chesscom'),'','A one-game lead is ambiguous');
  library.push(game(5,'Owner','Dave'));
  assert.equal(inferredPlayer({library},'chesscom'),'Owner');
  assert.equal(inferredPlayer({library},'lichess'),'DifferentOwner');
});

test('library ownership labels are ignored, and arbitrary PGN origins do not identify an account',()=>{
  const library=[1,2,3].map(id=>({...game(id,'Owner','Opponent'+id),myName:'Opponent'+id,playerKnown:true,meSide:'b'}));
  assert.equal(inferredPlayer({library},'chesscom'),'Owner');
  assert.equal(historyGame({pgn:'[Site "https://example.test/chess.com"]\n[White "Owner"]\n[Black "Friend"]\n\n1. e4 e5'}),null);
  assert.equal(historyGame(game(1,'Anonymous','Friend')),null);
});

test('pasted PGN and active-tab imports of the same game share one identity',()=>{
  const active=game(12345678);
  const pasted={pgn:active.pgn.replace('[Site "Chess.com"]','[Site "Chess.com"]\n[Link "https://www.chess.com/game/live/12345678"]')};
  assert.equal(historyGame(active).id,historyGame(pasted).id);
  assert.equal(rankPlayers({library:[active,pasted]},'chesscom')[0].games,1);
});

test('recent history holds fifty unique games per site and serializes concurrent analysis tabs',async()=>{
  const s=storage();
  await Promise.all(Array.from({length:55},(_,i)=>rememberAnalyzedGame(game(i,'Owner','Opponent'+i),s)));
  assert.equal(s.store[PLAYER_HISTORY_KEY].chesscom.length,50);
  assert.equal(s.store[PLAYER_HISTORY_KEY].chesscom[0].id,'54');
  await rememberAnalyzedGame(game(54,'Owner','Opponent54'),s);
  assert.equal(s.store[PLAYER_HISTORY_KEY].chesscom.length,50);
  await rememberAnalyzedGame(game(1,'LichessOwner','Friend','lichess'),s);
  assert.equal(s.store[PLAYER_HISTORY_KEY].chesscom.length,50);
  assert.equal(s.store[PLAYER_HISTORY_KEY].lichess.length,1);
});

test('legacy usernames remain lookup candidates but never establish ownership',async()=>{
  const s=storage({username:'WrongFirstPlayer'});
  assert.deepEqual(await archivePlayers(s),['wrongfirstplayer']);
  assert.equal(await rememberAnalyzedGame(game(1),s),'');
  assert.equal(s.store.username,'WrongFirstPlayer');
});

test('country evidence follows the inferred username across sides and survives reopening without flags',async()=>{
  const s=storage();
  const first=game(1,'Owner','Alice');first.meta.white={user:'owner',countryId:'dk'};first.meta.black={user:'Alice',countryId:'2'};
  await rememberAnalyzedGame(first,s);
  assert.equal(inferredPlayerProfile(s.store),null,'A flag does not establish account ownership');
  await rememberAnalyzedGame(game(2,'Bob','OWNER'),s);
  await rememberAnalyzedGame(game(3,'Owner','Carol'),s);
  assert.deepEqual(inferredPlayerProfile(s.store),{name:'Owner',country:'DK'});
  await rememberAnalyzedGame(game(1,'Owner','Alice'),s);
  assert.equal(s.store[PLAYER_HISTORY_KEY].chesscom[0].whiteCountry,'DK');
  assert.equal(inferredPlayerProfile(s.store).country,'DK');
  const changed=game(4,'Dave','Owner');changed.meta.black={user:'Owner',countryId:'xe'};
  await rememberAnalyzedGame(changed,s);
  assert.equal(inferredPlayerProfile(s.store).country,'XE');
});

test('missing, unrecognized, mismatched and other-site flags cannot borrow an opponent country',()=>{
  const library=[1,2,3].map(id=>{
    const g=game(id,'Owner','Opponent'+id);g.meta.white={user:'SomebodyElse',countryId:'DK'};g.meta.black={user:'Opponent'+id,countryId:'US'};return g;
  });
  assert.deepEqual(inferredPlayerProfile({library}),{name:'Owner',country:null});
  library[0].meta.white={user:'Owner',countryId:'../../DK'};
  assert.equal(inferredPlayerProfile({library}).country,null);
  const lichess=game(1,'Owner','Alice','lichess');lichess.meta.white={user:'Owner',countryId:'DK'};
  assert.equal(historyGame(lichess).whiteCountry,undefined);
});

test('unavailable history storage cannot block reviewing a game',async()=>{
  assert.equal(await rememberAnalyzedGame(game(1),{async get(){throw Error('Storage unavailable');}}),'');
  const s=storage({library:[1,2,3].map(id=>game(id,'Owner','Opponent'+id))});
  s.set=async()=>{throw Error('Storage full');};
  assert.equal(await rememberAnalyzedGame(game(4,'Owner','Opponent4'),s),'Owner');
});

test('review uses inferred site identity while preserving page orientation and ignoring legacy identity',async t=>{
  const a=app(t);a.replace('startAnalysis',()=>{});a.call('buildUI');a.state.username='Friend';
  a.store.library=[1,2,3].map(id=>game(id,'Owner','Opponent'+id));
  await a.call('applyGame',{...game(4,'Friend','Owner'),meta:{...game(4).meta,flip:false},analysis:null});
  assert.equal(a.state.meSide,'b');assert.equal(a.state.playerKnown,true);assert.equal(a.state.flipped,false);
  await a.call('applyGame',{...game(1,'LichessOwner','Friend','lichess'),meta:{...game(1,'LichessOwner','Friend','lichess').meta,flip:true},analysis:null});
  assert.equal(a.state.playerKnown,false);assert.equal(a.state.flipped,true);
  await settle();
});

test('automatic anonymous library games can learn the account on reopening',async t=>{
  const a=app(t);a.replace('startAnalysis',()=>{});a.call('buildUI');
  const payload={...game(4,'Friend','Owner'),analysis:null};
  await a.call('applyGame',payload);assert.equal(a.state.playerKnown,false);
  const meta=structuredClone(a.state.meta);
  a.store.library=[1,2,3].map(id=>game(id,'Owner','Opponent'+id));
  await a.call('applyGame',{...payload,meta});
  assert.equal(a.state.playerKnown,true);assert.equal(a.state.meSide,'b');
});

test('old library account guesses are reevaluated from both players rather than perpetuated',async t=>{
  const a=app(t);a.replace('startAnalysis',()=>{});a.call('buildUI');
  a.store.library=[1,2,3].map(id=>game(id,'Owner','Opponent'+id));
  await a.call('applyGame',{...game(4,'Friend','Owner'),meta:{...game(4).meta,myName:'Friend',playerKnown:true},analysis:null});
  assert.equal(a.state.playerKnown,true);assert.equal(a.state.meSide,'b');assert.equal(a.state.meta.myName,'Owner');
});

test('library reopening uses the newly inferred side when the original page had no orientation hint',async t=>{
  const a=app(t);a.replace('startAnalysis',()=>{});a.call('buildUI');
  a.store.library=[1,2,3].map(id=>game(id,'Owner','Opponent'+id));
  const payload=game(4,'Friend','Owner');
  await a.call('openLibraryGame',{...payload,id:'4',myName:'Friend',playerKnown:true,meSide:'w'});
  assert.equal(a.state.meSide,'b');assert.equal(a.state.flipped,true);
});
