// Historical twin balance. A synthetic population of players (ratings 600–2400,
// bullet to daily, attackers, grinders, gambiteers, flank players, blunder-fests)
// is replayed game by game as a material random walk, turned into feature rows
// with the real field names, and classified. No archetype may dominate, every one
// must win somewhere, and the obvious styles must land on the obvious twins.
import test from 'node:test';
import assert from 'node:assert/strict';
import {classify, ARCHETYPES} from '../lib/profile/archetypes.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const pick = (rand, weights) => { const total = Object.values(weights).reduce((a, b) => a + b, 0); let x = rand() * total; for (const [k, w] of Object.entries(weights)) { x -= w; if (x <= 0) return k; } return Object.keys(weights)[0]; };
const gauss = rand => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const SECOND = {e4: 'Nf3', d4: 'c4', Nf3: 'g3', c4: 'Nc3', b3: 'Bb2', g3: 'Bg2', f4: 'Nf3', b4: 'Bb2', c5: 'd6', e5: 'Nc6', c6: 'd5', e6: 'd5', d5: 'Qxd5', Nf6: 'e5', g6: 'Bg7', d6: 'Nf6', Nc6: 'e5'};
const BLUNDER = {1: .45, 3: .35, 5: .12, 9: .08};

/** One season of feature rows for a player described by `P`. */
export function playerRows(P, seed) {
  const rand = rng(seed), rows = [];
  const low = clamp((1500 - P.rating) / 900, 0, 1), high = clamp((P.rating - 1500) / 900, 0, 1);
  const base = .09 * Math.exp(-(P.rating - 600) / 500) + .006;
  let t = Date.UTC(2026, 0, 3, 18) / 1000, prevLoss = false;
  for (let g = 0; g < P.games; g++) {
    t += rand() < .25 ? 86400 * (1 + Math.floor(rand() * 3)) : 300 + Math.floor(rand() * 900);
    const cls = pick(rand, P.mix), me = g % 2 ? 'b' : 'w';
    const clsF = {bullet: 1.6, blitz: 1.15, rapid: .85, daily: .6}[cls];
    const tilt = prevLoss ? P.tilt : 0;
    let pMe = base * clsF * (1 - 4 * P.edge) * (1 - .3 * P.solid + .25 * P.aggr) * (1 + tilt), pOpp = base * clsF;
    const L = Math.max(24, Math.round(66 + 50 * P.grind + 22 * P.solid - 14 * P.aggr + 18 * high - 8 * low + gauss(rand) * 22 + (cls === 'bullet' ? 8 : 0)));
    // Opening.
    let first, line;
    if (me === 'w') { const m = pick(rand, P.white); first = m + ' ' + SECOND[m]; line = `${m} ${m === 'e4' ? 'e5' : 'd5'} ${SECOND[m]} Nc6`; }
    else { const oppMove = pick(rand, {e4: .6, d4: .3, Nf3: .05, c4: .05}); const reply = oppMove === 'e4' ? pick(rand, P.vsE4) : pick(rand, {d5: .5, Nf6: .4, g6: .1 + P.fian}); first = reply + ' ' + (SECOND[reply] || 'Nf6'); line = `${oppMove} ${reply} Nf3 ${SECOND[reply] || 'Nf6'}`; }
    const gambit = rand() < P.gambitP + (first.startsWith('f4') ? .3 : 0);
    const sacPly = rand() < .35 * P.aggr ? 14 + Math.floor(rand() * 26) : -1;
    let bal = 0, matMin = 0, matMax = 0, swings = 0, swingState = 0, bal20 = null, minBal20 = 0, pieces = 14, endgame = 0, checks = 0, myMoves = 0;
    let res = null, term = null, n = 0, attack = 0, gambitBoost = 0;
    // Balance after every ply, as features.js tracks it; exchanges where the opponent captures first dip for one ply.
    const track = b => {
      if (b < matMin) matMin = b; if (b > matMax) matMax = b;
      if (b >= 2 && swingState <= 0) { if (swingState < 0) swings++; swingState = 1; }
      else if (b <= -2 && swingState >= 0) { if (swingState > 0) swings++; swingState = -1; }
    };
    const resignMe = P.resign, resignOpp = .35 + .5 * high;
    for (let ply = 0; ply < 400 && !res; ply++) {
      n = ply + 1;
      const mine = (ply % 2 === 0) === (me === 'w');
      if (mine) {
        myMoves++;
        if (gambit && ply < 10 && ply >= 4 && bal === 0 && !gambitBoost) { bal -= 1; gambitBoost = 24; }
        if (sacPly >= 0 && (ply === sacPly || ply === sacPly + 1)) { bal -= rand() < .5 ? 2 : 3; attack = 16; }
        if (rand() < pMe) { const v = Number(pick(rand, BLUNDER)); bal -= v; if (v >= 3) pieces--; }
        if (rand() < .045 + .06 * P.aggr + .05 * low + (attack ? .25 : 0)) checks++;
      } else {
        const boost = (attack ? 2.5 + 2 * P.aggr : 1) * (gambitBoost ? 1.4 : 1);
        if (rand() < pOpp * boost) { const v = Number(pick(rand, BLUNDER)); bal += v; if (v >= 3) pieces--; }
      }
      if (attack) attack--; if (gambitBoost) gambitBoost--;
      if (ply > 8 && rand() < .03 + .015 * P.solid + .01 * P.grind) { pieces -= 2; track(bal + (rand() < .5 ? -3 : 3)); }
      if (!endgame && pieces <= 6) endgame = n;
      track(bal);
      if (ply === 19) bal20 = bal; if (ply < 20) minBal20 = Math.min(minBal20, bal);
      if (ply < 10) continue;
      if (attack && rand() < .03 + .04 * P.aggr) { res = 'w'; term = 'mate'; break; }
      if (Math.abs(bal) >= 3) {
        const winning = bal > 0;
        const mateP = (.004 + .012 * low) * Math.min(3, Math.abs(bal) / 3);
        if (rand() < mateP) { res = winning ? 'w' : 'l'; term = 'mate'; break; }
        if (rand() < (winning ? resignOpp : resignMe) * .05 * Math.min(2, Math.abs(bal) / 4)) { res = winning ? 'w' : 'l'; term = 'resign'; break; }
      }
      const flagP = {bullet: .006, blitz: .0018, rapid: .0006, daily: .0002}[cls] * (ply > 40 ? 1 : .2);
      if (rand() < flagP) { const iWin = rand() < .5 + 2 * P.edge + (cls === 'bullet' ? P.speed * .15 : 0); res = iWin ? 'w' : 'l'; term = 'time'; break; }
      if (ply >= L) {
        if (bal >= 2) res = rand() < .85 ? 'w' : rand() < .6 ? 'd' : 'l';
        else if (bal <= -2) res = rand() < .85 ? 'l' : rand() < .6 ? 'd' : 'w';
        else res = rand() < .04 + .3 * P.solid + .08 * high + .1 * P.grind * high ? 'd' : rand() < .5 + 3 * P.edge + .15 * P.grind * Math.sign(bal) ? 'w' : 'l';
        term = res === 'd' ? pick(rand, {agreed: 2, repetition: 2, stalemate: low + .1, insufficient: 1}) : rand() < .5 + .3 * low ? 'mate' : pick(rand, {resign: resignMe + .2, time: .4});
        if (res === 'w' && term === 'resign' && rand() > resignOpp) term = 'mate';
      }
    }
    if (!res) { res = 'd'; term = 'repetition'; }
    prevLoss = res === 'l';
    const castled = rand() < .5 + .35 * high - .25 * low + .15 * P.solid;
    const castleSide = castled ? (rand() < .1 + .3 * P.aggr ? 'q' : 'k') : null;
    const oppCastleSide = rand() < .55 + .35 * high ? (rand() < .12 ? 'q' : 'k') : null;
    const qTraded = rand() < .06 + .3 * P.solid + .1 * P.grind;
    const thinkN = cls === 'daily' ? 0 : myMoves;
    const snapP = {bullet: .88, blitz: .55, rapid: .25, daily: 0}[cls];
    let snap = 0; for (let i = 0; i < thinkN; i++) if (rand() < snapP) snap++;
    rows.push({v: 1, id: `${seed}-${g}`, site: 'chesscom', url: '', t, cls, tc: '', rated: true, me, opp: 'o' + Math.floor(rand() * 400),
      oppRating: Math.round(P.rating + gauss(rand) * 80), myRating: Math.round(P.rating + gauss(rand) * 30), res, term, eco: '', op: '', bot: false, n, myMoves,
      knights4: rand() < .3 + .35 * P.devel + .1 * high, castle: castled ? Math.round(clamp(9 - 4 * P.devel + gauss(rand) * 2.5 + 3 * low, 3, 25)) : 0, castleSide, oppCastleSide,
      fian: rand() < P.fian, qtrade: qTraded && n > 30 ? Math.round(clamp(12 + gauss(rand) * 6 + 6 * (1 - P.solid), 6, 40)) : 0, qEarly: rand() < P.qEarly,
      gambit: bal20 != null && bal20 <= -1 && bal20 >= -2 && minBal20 >= -2, storm: oppCastleSide === 'k' && rand() < .08 + .5 * P.aggr, pair25: n >= 50 && rand() < .25 + .3 * P.bishops,
      ep: 0, promo: 0, under: 0, checks, caps: 8, mateBy: null, matePattern: null, matedBy: null, matMin, matMax, matFinal: bal, lowPly: 30, highPly: 20, swings, endgame,
      think: null, thinkN, snap, longThink: null, longPly: 0, trouble: false, ahead: null, dur: null, line, first, fenEnd: '8/8/8/8/8/8/8/8 w - - 0 1', fenLow: '', fenHigh: '', heat: ''});
  }
  return rows;
}

const MIX = {
  bullet: {bullet: .8, blitz: .15, rapid: .05, daily: 0}, blitz: {bullet: .1, blitz: .8, rapid: .1, daily: 0}, rapid: {bullet: 0, blitz: .2, rapid: .8, daily: 0},
  daily: {bullet: 0, blitz: .1, rapid: .15, daily: .75}, mixed: {bullet: .3, blitz: .4, rapid: .25, daily: .05}, speed: {bullet: .45, blitz: .5, rapid: .05, daily: 0},
};
const DEFAULT = {aggr: .3, solid: .3, grind: .3, edge: 0, resign: .5, devel: .4, fian: .1, qEarly: .12, gambitP: .03, bishops: .3, tilt: .1, speed: .5,
  white: {e4: .6, d4: .25, Nf3: .05, c4: .05, f4: .02, g3: .02, b3: .01}, vsE4: {e5: .45, c5: .2, c6: .1, e6: .1, d5: .07, Nc6: .04, g6: .04}};
// Style presets: each sets the parameters it is about; everything else is drawn at random.
export const STYLES = {
  attacker: {aggr: [.75, 1], white: {e4: .9, d4: .1}, vsE4: {e5: .5, c5: .4, d5: .1}},
  gambiteer: {gambitP: [.3, .5], aggr: [.4, .7], qEarly: [.25, .45], white: {e4: .6, f4: .3, b4: .1}, vsE4: {e5: .7, d5: .3}},
  solid: {solid: [.75, 1], aggr: [0, .15], resign: [.6, .9], white: {d4: .7, Nf3: .2, e4: .1}, vsE4: {c6: .5, e6: .5}},
  grinder: {grind: [.75, 1], solid: [.4, .7], aggr: [0, .2], resign: [.2, .4]},
  sicilian: {vsE4: {c5: .95, e5: .05}, white: {e4: .9, d4: .1}, aggr: [.4, .7]},
  london: {white: {d4: .95, e4: .05}, vsE4: {c6: .4, e6: .3, e5: .3}, solid: [.4, .7], aggr: [.1, .3]},
  flank: {white: {Nf3: .4, c4: .3, g3: .15, b3: .15}, fian: [.6, .9], vsE4: {g6: .5, c5: .3, d6: .2}},
  classical: {white: {e4: .95, d4: .05}, vsE4: {e5: .95, c5: .05}, devel: [.75, 1], aggr: [.2, .5]},
  fighter: {resign: [0, .1], tilt: [-.2, 0], aggr: [.2, .5]},
  improver: {edge: [.03, .05], solid: [.3, .6], grind: [.3, .6], bishops: [.4, .8]},
  blunderfest: {rating: [600, 1000], qEarly: [.2, .5], devel: [0, .3], resign: [0, .3]},
  bullet: {mix: 'bullet', speed: [.6, 1]},
  daily: {mix: 'daily'},
  random: {},
};

/** A deterministic population of `count` varied players. */
export function population(count = 1200, seed = 11) {
  const rand = rng(seed), players = [];
  const range = ([lo, hi]) => lo + rand() * (hi - lo);
  const perturb = dist => Object.fromEntries(Object.entries(dist).map(([k, w]) => [k, w * Math.pow(.4 + 1.2 * rand(), 2)]));
  const randomDist = keys => Object.fromEntries(keys.map(k => [k, Math.pow(rand(), 2)]));
  const styleWeights = {random: 6, attacker: 1, gambiteer: 1, solid: 1, grinder: 1, sicilian: 1, london: 1, flank: 1, classical: 1, fighter: 1, improver: 1, blunderfest: 2, bullet: 1, daily: 1};
  for (let i = 0; i < count; i++) {
    const style = pick(rand, styleWeights), S = STYLES[style];
    const r = rand(), rating = S.rating ? range(S.rating) : r < .55 ? range([600, 1400]) : r < .88 ? range([1400, 1900]) : range([1900, 2400]);
    const P = {style, rating, games: 60 + Math.floor(rand() * 340), mix: MIX[S.mix || pick(rand, {blitz: 3, rapid: 2.5, mixed: 2, bullet: 1, speed: 1, daily: .7})]};
    for (const key of ['aggr', 'solid', 'grind', 'resign', 'devel', 'fian', 'qEarly', 'bishops', 'speed']) P[key] = S[key] ? range(S[key]) : rand() * (key === 'fian' ? .5 : key === 'qEarly' ? .35 : 1);
    P.edge = S.edge ? range(S.edge) : (rand() - .5) * .04; P.tilt = S.tilt ? range(S.tilt) : rand() * .3; P.gambitP = S.gambitP ? range(S.gambitP) : rand() * rand() * .2;
    P.white = S.white || (style === 'random' && rand() < .3 ? randomDist(Object.keys(DEFAULT.white)) : perturb(DEFAULT.white));
    P.vsE4 = S.vsE4 || (style === 'random' && rand() < .3 ? randomDist(Object.keys(DEFAULT.vsE4)) : perturb(DEFAULT.vsE4));
    players.push(P);
  }
  return players;
}

/** Winner counts for a classifier over a population. */
export function distribution(classifyFn, players = population()) {
  const counts = {}, byStyle = {};
  players.forEach((P, i) => {
    const id = classifyFn(playerRows(P, 1000 + i)).winner.id;
    counts[id] = (counts[id] || 0) + 1;
    (byStyle[P.style] ||= {})[id] = (byStyle[P.style][id] || 0) + 1;
  });
  return {counts, byStyle, total: players.length};
}

test('historical twin: no archetype dominates a broad population and every one wins somewhere', t => {
  const {counts, byStyle, total} = distribution(classify);
  t.diagnostic(ARCHETYPES.map(a => `${a.id} ${(100 * (counts[a.id] || 0) / total).toFixed(1)}%`).join(', '));
  for (const a of ARCHETYPES) {
    assert.ok((counts[a.id] || 0) > 0, a.id + ' never wins');
    assert.ok((counts[a.id] || 0) / total <= .2, `${a.id} wins ${counts[a.id]} of ${total}`);
  }
  const top = (style, ids, share = .4) => {
    const c = byStyle[style], n = Object.values(c).reduce((a, b) => a + b, 0), hit = ids.reduce((s, id) => s + (c[id] || 0), 0);
    assert.ok(hit / n >= share, `${style}: ${JSON.stringify(c)}`);
  };
  top('bullet', ['nakamura'], .5);
  top('sicilian', ['kasparov'], .4);
  top('flank', ['reti'], .5);
  top('grinder', ['capablanca', 'carlsen', 'petrosian', 'karpov'], .6);
  top('solid', ['petrosian', 'capablanca', 'karpov', 'carlsen'], .6);
  top('gambiteer', ['anderssen', 'tal', 'morphy'], .5);
  // Low-rated blunder-fests are spread out, not all Tal.
  const fest = byStyle.blunderfest, festN = Object.values(fest).reduce((a, b) => a + b, 0);
  assert.ok(Object.keys(fest).length >= 5 && Math.max(...Object.values(fest)) / festN <= .4, JSON.stringify(fest));
});

test('historical twin: Nakamura needs bullet-dominant play', () => {
  const players = population(300, 5).filter(P => P.mix.bullet < .4);
  for (const [i, P] of players.entries()) assert.notEqual(classify(playerRows(P, 50 + i)).winner.id, 'nakamura', JSON.stringify(P.mix));
});
