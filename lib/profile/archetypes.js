// Player profile — historical twin. Each archetype is a weighted bundle of
// documented, replay-derived tendencies. Every tendency is compared with what is
// normal for players of the same rating (a 900 who drops pieces and wins after
// being "down material" is not playing like Tal; every 900 game looks like that),
// turned into a standard score, shrunk towards normal when it rests on few games,
// and each archetype's score is the weighted sum of those standard scores divided
// by the length of its weight vector, so archetypes with more traits are not
// favoured, then rescaled by the archetype's own spread across a broad population
// (`calibration`) so no archetype wins by default. Nakamura additionally needs
// bullet to be most of the player's games. The reason lines are built from
// the tendencies that contributed most, each with the player's own number.
import {MIN_GAMES} from './insights.js';

const share = (rows, test) => rows.length ? rows.filter(test).length / rows.length : 0;
const mean = (rows, pick) => rows.length ? rows.reduce((s, r) => s + pick(r), 0) / rows.length : 0;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Rating anchors for the rating-aware references below (piecewise linear between them).
const ANCHORS = [800, 1200, 1600, 2000, 2400];
// Reference distribution for each tendency: `mean` (a number, or one value per
// rating anchor), `sd` (spread between players) and `k`, the number of games of
// evidence at which the player's own figure and the reference count equally.
// Calibrated on a simulated population of players from 600 to 2400 (see
// tests/profile-twin-distribution.test.mjs); round on purpose.
const REF = {
  sacrifice: {mean: [.07, .08, .09, .1, .11], sd: .1, k: 12}, checks: {mean: [.12, .1, .083, .082, .085], sd: .022, k: 10}, storm: {mean: .33, sd: .14, k: 10},
  opposite: {mean: .31, sd: .09, k: 10}, gambit: {mean: .115, sd: .04, k: 15}, queenEarly: {mean: [.26, .19, .175, .16, .16], sd: .105, k: 15},
  fianchetto: {mean: .24, sd: .145, k: 10}, flank: {mean: .2, sd: .25, k: 8}, e4: {mean: .45, sd: .26, k: 8}, d4: {mean: .32, sd: .17, k: 8},
  sicilian: {mean: .18, sd: .14, k: 8}, e5: {mean: .35, sd: .22, k: 8}, shortWins: {mean: [.74, .59, .48, .45, .44], sd: .11, k: 15},
  draws: {mean: [.027, .042, .072, .098, .12], sd: [.018, .023, .035, .048, .048], k: 20}, losses: {mean: [.45, .46, .44, .42, .405], sd: .055, k: 30}, wins: {mean: [.52, .5, .49, .48, .475], sd: .05, k: 30},
  endgame: {mean: [.25, .285, .33, .355, .45], sd: .11, k: 15}, endgameWins: {mean: [.49, .46, .435, .42, .405], sd: .08, k: 10}, queenTrade: {mean: [.15, .17, .185, .185, .215], sd: .085, k: 15},
  length: {mean: [48, 60, 70, 76, 86], sd: 10, k: 15}, comeback: {mean: [.34, .37, .44, .49, .53], sd: .07, k: 15}, convert: {mean: [.74, .67, .6, .56, .53], sd: .057, k: 15},
  bounce: {mean: .48, sd: .07, k: 15}, bullet: {mean: .21, sd: .24, k: 10}, fast: {mean: .65, sd: .32, k: 10}, snap: {mean: .52, sd: .15, k: 10}, flag: {mean: [.063, .105, .16, .19, .19], sd: .06, k: 10},
  swings: {mean: [.61, .71, .87, .98, 1.23], sd: .23, k: 15}, fightOn: {mean: [.66, .51, .5, .53, .55], sd: .16, k: 10},
  castleEarly: {mean: [.1, .28, .445, .51, .66], sd: .105, k: 15}, knights: {mean: [.41, .475, .495, .515, .59], sd: .1, k: 15}, pair: {mean: .4, sd: .1, k: 10},
  materialSafe: {mean: [.29, .26, .23, .2, .155], sd: .05, k: 20},
};

function atRating(m, rating) {
  if (!Array.isArray(m)) return m;
  const x = clamp(rating, ANCHORS[0], ANCHORS.at(-1));
  let i = 0; while (i < ANCHORS.length - 2 && x > ANCHORS[i + 1]) i++;
  const f = (x - ANCHORS[i]) / (ANCHORS[i + 1] - ANCHORS[i]);
  return m[i] + f * (m[i + 1] - m[i]);
}

/**
 * Raw tendencies (shares and averages, for copy), the rating-aware reference for
 * each (`typical`), and `norm`: standard scores against that reference (0 = normal
 * for the rating, +1 = one player-to-player spread above it), shrunk to 0 when
 * the evidence is thin.
 */
export function tendencies(rows) {
  const wins = rows.filter(r => r.res === 'w'), losses = rows.filter(r => r.res === 'l');
  const white = rows.filter(r => r.me === 'w'), black = rows.filter(r => r.me === 'b');
  const blackVsE4 = black.filter(r => r.line.startsWith('e4 '));
  const bothCastled = rows.filter(r => r.castleSide && r.oppCastleSide), oppKingside = rows.filter(r => r.oppCastleSide === 'k');
  const ahead = rows.filter(r => r.matMax >= 3), behind = rows.filter(r => r.matMin <= -3);
  const endgames = rows.filter(r => r.endgame), long = rows.filter(r => r.n >= 50);
  const timed = rows.filter(r => r.thinkN > 0);
  const sorted = [...rows].sort((a, b) => a.t - b.t);
  let afterLoss = 0, afterLossWins = 0;
  for (let i = 1; i < sorted.length; i++) if (sorted[i - 1].res === 'l' && sorted[i].t - sorted[i - 1].t <= 7200) { afterLoss++; if (sorted[i].res === 'w') afterLossWins++; }
  const rated = rows.filter(r => Number.isFinite(r.myRating) && r.myRating > 0);
  const rating = rated.length ? mean(rated, r => r.myRating) : 1200;
  const myMoves = rows.reduce((s, r) => s + (r.myMoves || Math.ceil(r.n / 2)), 0);
  const sacrificeWins = share(wins, r => r.matMin <= -2), oppSacrificeWins = share(losses, r => r.matMax >= 2);
  const raw = {
    rating: Math.round(rating),
    // Being two points down at some moment is normal in every game with a trade, and more so in
    // blunder-heavy games, so a sacrificial style is measured against the opponents' mirror figure.
    sacrificeWins, oppSacrificeWins, sacrifice: sacrificeWins - oppSacrificeWins,
    checks: mean(rows, r => r.checks), checksPerMove: myMoves ? rows.reduce((s, r) => s + r.checks, 0) / myMoves : 0,
    storm: share(oppKingside, r => r.storm), opposite: share(bothCastled, r => r.castleSide !== r.oppCastleSide), gambit: share(rows, r => r.gambit), queenEarly: share(rows, r => r.qEarly),
    fianchetto: share(rows, r => r.fian), flank: share(white, r => /^(Nf3|c4|b3|g3|f4|b4)$/.test(r.first.split(' ')[0])), e4: share(white, r => r.first.startsWith('e4')),
    d4: share(white, r => /^(d4|c4)/.test(r.first)), sicilian: share(blackVsE4, r => r.line.split(' ')[1] === 'c5'), e5: share(blackVsE4, r => r.line.split(' ')[1] === 'e5'),
    shortWins: share(wins, r => r.n <= 60), draws: share(rows, r => r.res === 'd'), losses: share(rows, r => r.res === 'l'), wins: share(rows, r => r.res === 'w'),
    endgame: share(rows, r => r.endgame), endgameWins: share(endgames, r => r.res === 'w'), queenTrade: share(rows, r => r.qtrade && r.qtrade <= 20),
    length: mean(rows, r => r.n), comeback: share(behind, r => r.res !== 'l'), convert: share(ahead, r => r.res === 'w'), bounce: afterLoss ? afterLossWins / afterLoss : 0,
    bullet: share(rows, r => r.cls === 'bullet'), fast: share(rows, r => r.cls === 'bullet' || r.cls === 'blitz'),
    snap: (() => { const n = timed.reduce((s, r) => s + r.thinkN, 0); return n ? timed.reduce((s, r) => s + r.snap, 0) / n : 0; })(),
    flag: share(wins, r => r.term === 'time'), swings: mean(rows, r => r.swings), fightOn: share(losses, r => r.term !== 'resign'),
    castleEarly: share(rows, r => r.castle && r.castle <= 8), knights: share(rows, r => r.knights4), pair: share(long, r => r.pair25),
    materialSafe: share(rows, r => r.matMin >= -1), aheadGames: ahead.length, behindGames: behind.length, afterLoss,
  };
  // Evidence behind each figure: the number of games it was measured on.
  const evidence = {sacrifice: Math.min(wins.length, losses.length), checks: rows.length, storm: oppKingside.length, opposite: bothCastled.length, flank: white.length, e4: white.length, d4: white.length,
    sicilian: blackVsE4.length, e5: blackVsE4.length, shortWins: wins.length, endgameWins: endgames.length, comeback: behind.length, convert: ahead.length, bounce: afterLoss,
    flag: wins.length, fightOn: losses.length, pair: long.length, snap: timed.length};
  const value = {...raw, checks: raw.checksPerMove};
  const typical = {}, norm = {};
  for (const key of Object.keys(REF)) {
    const ref = REF[key], n = evidence[key] ?? rows.length;
    typical[key] = atRating(ref.mean, rating);
    norm[key] = clamp((value[key] - typical[key]) / atRating(ref.sd, rating), -3, 3) * n / (n + ref.k);
  }
  typical.checks *= rows.length ? myMoves / rows.length : 0;
  return {raw, typical, norm};
}

const pc = v => Math.round(100 * v) + '%';
const vs = (typical, fmt = pc) => `, against about ${fmt(typical)} for players at your rating`;
// Each trait: weight and a sentence template (raw figures, rating references).
// Negative weights reward a low figure; their sentences describe the low figure.
export const ARCHETYPES = [
  {id: 'tal', name: 'Mikhail Tal', era: 'World Champion 1960–61', tagline: 'The magician from Riga', blurb: 'Tal sacrificed material for initiative and dragged opponents into positions nobody could calculate. He trusted the attack more than the material count.',
    traits: {sacrifice: [1.4, r => `${pc(r.sacrificeWins)} of your wins came after you were two points down; your opponents manage that in ${pc(r.oppSacrificeWins)} of your losses.`], checks: [.8, (r, t) => `You give ${r.checks.toFixed(1)} checks per game${vs(t.checks, v => v.toFixed(1))}.`],
      opposite: [.6, r => `Opposite-side castling in ${pc(r.opposite)} of games where both sides castle.`], storm: [.4, r => `You storm the king with your pawns in ${pc(r.storm)} of games where your opponent castles short.`],
      shortWins: [.4, (r, t) => `${pc(r.shortWins)} of your wins finished inside 30 moves${vs(t.shortWins)}.`], draws: [-.4, null], queenTrade: [-.4, null]},
    calibration: [-.2, 1.5],
    exemplar: rows => rows.filter(r => r.res === 'w').sort((a, b) => a.matMin - b.matMin)[0], exemplarCaption: 'Your most Tal-like win: material went out, the attack came in.'},
  {id: 'morphy', name: 'Paul Morphy', era: 'Unofficial world champion, 1858', tagline: 'Development, then the knockout', blurb: 'Morphy brought every piece out fast, opened the centre and punished slow play with crisp combinations in open games.',
    traits: {knights: [1, (r, t) => `Both knights are out by move 4 in ${pc(r.knights)} of your games${vs(t.knights)}.`], castleEarly: [.8, (r, t) => `You castle by move 8 in ${pc(r.castleEarly)} of games${vs(t.castleEarly)}.`],
      e5: [.8, r => `You meet 1.e4 with 1...e5, the open game, in ${pc(r.e5)} of your Black games.`], e4: [.6, r => `You open 1.e4 in ${pc(r.e4)} of your White games.`],
      shortWins: [.5, (r, t) => `${pc(r.shortWins)} of your wins are over by move 30${vs(t.shortWins)}.`], endgame: [-.4, null]},
    calibration: [.18, 1.27],
    exemplar: rows => rows.filter(r => r.res === 'w' && r.term === 'mate').sort((a, b) => a.n - b.n)[0] || rows.filter(r => r.res === 'w').sort((a, b) => a.n - b.n)[0], exemplarCaption: 'Your fastest finish: develop, open lines, mate.',
    famous: {label: 'Morphy v. the Duke of Brunswick and Count Isouard, Paris 1858', moves: ['e4','e5','Nf3','d6','d4','Bg4','dxe5','Bxf3','Qxf3','dxe5','Bc4','Nf6','Qb3','Qe7','Nc3','c6','Bg5','b5','Nxb5','cxb5','Bxb5+','Nbd7','O-O-O','Rd8','Rxd7','Rxd7','Rd1','Qe6','Bxd7+','Nxd7','Qb8+','Nxb8','Rd8#'], from: 20}},
  {id: 'anderssen', name: 'Adolf Anderssen', era: 'Leading master of the 1850s–60s', tagline: 'The romantic attacker', blurb: 'Anderssen played the Immortal and Evergreen games: gambits, open files and a king hunt no matter the cost.',
    traits: {gambit: [1.4, (r, t) => `You are a pawn down after move 10 in ${pc(r.gambit)} of your games, usually on purpose${vs(t.gambit)}.`], queenEarly: [.7, (r, t) => `Your queen joins by move 5 in ${pc(r.queenEarly)} of games${vs(t.queenEarly)}.`],
      sacrifice: [.5, r => `${pc(r.sacrificeWins)} of your wins came with material invested, against ${pc(r.oppSacrificeWins)} of your opponents' wins.`], checks: [.4, (r, t) => `${r.checks.toFixed(1)} checks per game${vs(t.checks, v => v.toFixed(1))}.`], draws: [-.5, null], endgame: [-.4, null]},
    calibration: [.02, 1.2],
    exemplar: rows => rows.filter(r => r.res === 'w' && r.gambit).sort((a, b) => a.matMin - b.matMin)[0] || rows.filter(r => r.res === 'w').sort((a, b) => a.matMin - b.matMin)[0], exemplarCaption: 'Your most romantic win: the material never mattered.',
    famous: {label: 'Anderssen v. Kieseritzky, London 1851 (the Immortal Game)', moves: ['e4','e5','f4','exf4','Bc4','Qh4+','Kf1','b5','Bxb5','Nf6','Nf3','Qh6','d3','Nh5','Nh4','Qg5','Nf5','c6','g4','Nf6','Rg1','cxb5','h4','Qg6','h5','Qg5','Qf3','Ng8','Bxf4','Qf6','Nc3','Bc5','Nd5','Qxb2','Bd6','Bxg1','e5','Qxa1+','Ke2','Na6','Nxg7+','Kd8','Qf6+','Nxf6','Be7#'], from: 34}},
  {id: 'lasker', name: 'Emanuel Lasker', era: 'World Champion 1894–1921', tagline: 'The fighter', blurb: 'Lasker defended worse positions better than anyone, set practical problems and kept finding resources when the position looked lost.',
    traits: {comeback: [1.3, (r, t) => `You avoid defeat in ${pc(r.comeback)} of games where you were three points down${vs(t.comeback)}.`], fightOn: [.8, (r, t) => `You resign rarely: ${pc(r.fightOn)} of your losses go to mate or the clock${vs(t.fightOn)}.`],
      bounce: [.8, (r, t) => `Right after a loss you win ${pc(r.bounce)} of the next games${vs(t.bounce)}.`], length: [.4, (r, t) => `Your games average ${Math.round(r.length / 2)} moves${vs(t.length, v => Math.round(v / 2))}.`], shortWins: [-.3, null]},
    calibration: [.17, 1.24],
    exemplar: rows => rows.filter(r => r.res === 'w').sort((a, b) => a.matMin - b.matMin)[0], exemplarCaption: 'Your biggest fightback.'},
  {id: 'capablanca', name: 'José Raúl Capablanca', era: 'World Champion 1921–27', tagline: 'Effortless technique', blurb: 'Capablanca simplified, traded queens when it suited him and converted small endgame edges with almost no mistakes.',
    traits: {queenTrade: [1.2, (r, t) => `Queens leave the board by move 20 in ${pc(r.queenTrade)} of your games${vs(t.queenTrade)}.`], endgame: [.8, (r, t) => `${pc(r.endgame)} of your games reach an endgame${vs(t.endgame)}.`],
      endgameWins: [.7, (r, t) => `You win ${pc(r.endgameWins)} of the games that reach an endgame${vs(t.endgameWins)}.`], materialSafe: [.6, r => `You never drop more than a pawn in ${pc(r.materialSafe)} of games.`],
      checks: [-.4, null], sacrifice: [-.4, null]},
    calibration: [.18, 1.18],
    exemplar: rows => rows.filter(r => r.res === 'w' && r.endgame).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.res === 'w').sort((a, b) => b.n - a.n)[0], exemplarCaption: 'Your cleanest grind: a long game, an endgame, a win.'},
  {id: 'petrosian', name: 'Tigran Petrosian', era: 'World Champion 1963–69', tagline: 'Iron Tigran', blurb: 'Petrosian removed his opponents\' ideas before they existed. Prophylaxis, patience and a loss rate other champions envied.',
    traits: {losses: [-1.2, (r, t) => `You lose only ${pc(r.losses)} of your games${vs(t.losses)}.`], draws: [1, (r, t) => `${pc(r.draws)} of your games are drawn${vs(t.draws)}.`],
      materialSafe: [.7, r => `You stay within a pawn of material in ${pc(r.materialSafe)} of games.`], castleEarly: [.4, (r, t) => `King tucked away by move 8 in ${pc(r.castleEarly)} of games${vs(t.castleEarly)}.`],
      swings: [-.5, (r, t) => `Your games rarely swing: ${r.swings.toFixed(2)} big swings per game${vs(t.swings, v => v.toFixed(2))}.`], storm: [-.4, null]},
    calibration: [.1, 1.05],
    exemplar: rows => rows.filter(r => r.res !== 'l' && r.matMin >= -1).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.res !== 'l').sort((a, b) => b.matMin - a.matMin || b.n - a.n)[0], exemplarCaption: 'Your most Petrosian game: nothing was allowed to happen.'},
  {id: 'karpov', name: 'Anatoly Karpov', era: 'World Champion 1975–85', tagline: 'The boa constrictor', blurb: 'Karpov took a small edge and squeezed. He converted advantages with relentless precision and rarely let a won game slip.',
    traits: {convert: [1.3, (r, t) => `You convert ${pc(r.convert)} of the games where you were clearly ahead${vs(t.convert)}.`], d4: [.8, r => `You open 1.d4 or 1.c4 in ${pc(r.d4)} of your White games.`],
      wins: [.5, (r, t) => `You win ${pc(r.wins)} of your games${vs(t.wins)}.`], materialSafe: [.4, r => `You stay within a pawn in ${pc(r.materialSafe)} of games.`], gambit: [-.4, null], opposite: [-.3, null]},
    calibration: [.06, 1.19],
    exemplar: rows => rows.filter(r => r.res === 'w' && r.matMax >= 3 && r.matMin >= -1).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.res === 'w').sort((a, b) => b.matMax - a.matMax)[0], exemplarCaption: 'A squeeze: ahead early, never in doubt.'},
  {id: 'kasparov', name: 'Garry Kasparov', era: 'World Champion 1985–2000', tagline: 'Dynamic energy', blurb: 'Kasparov combined deep opening preparation with relentless dynamic play: sharp Sicilians, long main lines and a huge win rate.',
    traits: {sicilian: [1.4, r => `You answer 1.e4 with the Sicilian in ${pc(r.sicilian)} of games.`], storm: [.6, r => `Pawn storms in ${pc(r.storm)} of games where your opponent castles short.`],
      wins: [.5, (r, t) => `You win ${pc(r.wins)} of your games${vs(t.wins)}.`], opposite: [.4, r => `Opposite-side castling in ${pc(r.opposite)} of games where both sides castle.`], draws: [-.4, null]},
    calibration: [-.05, 1.2],
    exemplar: rows => rows.filter(r => r.res === 'w' && r.line.includes('c5')).sort((a, b) => b.checks - a.checks)[0] || rows.filter(r => r.res === 'w').sort((a, b) => b.checks - a.checks)[0], exemplarCaption: 'Your most dynamic win.'},
  {id: 'fischer', name: 'Bobby Fischer', era: 'World Champion 1972–75', tagline: 'Best by test', blurb: 'Fischer played 1.e4, trusted clear principles, kept his pieces active and refused draws when there was still a game to win.',
    traits: {e4: [1.1, r => `1.e4 in ${pc(r.e4)} of your White games. "Best by test."`], pair: [.8, r => `You keep the bishop pair past move 25 in ${pc(r.pair)} of your longer games.`],
      wins: [.6, (r, t) => `You win ${pc(r.wins)} of your games${vs(t.wins)}.`], draws: [-.5, (r, t) => `Only ${pc(r.draws)} draws${vs(t.draws)}.`], knights: [.3, (r, t) => `Fast development: both knights out by move 4 in ${pc(r.knights)} of games${vs(t.knights)}.`], flank: [-.4, null]},
    calibration: [.05, 1.05],
    exemplar: rows => rows.filter(r => r.res === 'w' && r.first.startsWith('e4')).sort((a, b) => b.myRating - a.myRating || a.matMin - b.matMin)[0] || rows.filter(r => r.res === 'w')[0], exemplarCaption: 'Principled and direct: a 1.e4 win.'},
  {id: 'reti', name: 'Richard Réti', era: 'Hypermodern pioneer, 1920s', tagline: 'Control from a distance', blurb: 'Réti fianchettoed, attacked the centre from the flanks and let opponents overextend before striking.',
    traits: {flank: [1.3, r => `You open with a flank move (Nf3, c4, b3, g3) in ${pc(r.flank)} of your White games.`], fianchetto: [1.2, r => `A fianchetto appears in ${pc(r.fianchetto)} of your games.`],
      endgame: [.3, (r, t) => `${pc(r.endgame)} of your games reach an endgame${vs(t.endgame)}.`], e4: [-.6, null], gambit: [-.3, null]},
    calibration: [.14, 1.29],
    exemplar: rows => rows.filter(r => r.res === 'w' && r.fian).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.fian)[0] || rows.filter(r => r.res === 'w')[0], exemplarCaption: 'Hypermodern: the bishops did the work from afar.',
    famous: {label: 'Réti v. Tartakower, Vienna 1910', moves: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6','Qd3','e5','dxe5','Qa5+','Bd2','Qxe5','O-O-O','Nxe4','Qd8+','Kxd8','Bg5+','Kc7','Bd8#'], from: 14}},
  {id: 'carlsen', name: 'Magnus Carlsen', era: 'World Champion 2013–23', tagline: 'The grinder', blurb: 'Carlsen wins equal positions. Endgame mastery, zero fear of long games and the stamina to outlast anyone.',
    traits: {endgameWins: [1.1, (r, t) => `You win ${pc(r.endgameWins)} of games that reach an endgame${vs(t.endgameWins)}.`], length: [.9, (r, t) => `${Math.round(r.length / 2)} moves on average${vs(t.length, v => Math.round(v / 2))}.`],
      endgame: [.6, (r, t) => `${pc(r.endgame)} of your games reach an endgame${vs(t.endgame)}.`], losses: [-.5, (r, t) => `You lose only ${pc(r.losses)} of your games${vs(t.losses)}.`], shortWins: [-.4, null]},
    calibration: [.18, 1.25],
    exemplar: rows => rows.filter(r => r.res === 'w' && r.endgame && r.matMax <= 2).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.res === 'w' && r.endgame).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.res === 'w').sort((a, b) => b.n - a.n)[0], exemplarCaption: 'A grind from nothing: equal for ages, then a win.'},
  {id: 'nakamura', name: 'Hikaru Nakamura', era: 'Speed-chess specialist', tagline: 'Fast hands', blurb: 'Nakamura lives in bullet and blitz: instant decisions, flagging opponents and play that never slows down.',
    traits: {bullet: [1.4, r => `${pc(r.bullet)} of your games are bullet.`], flag: [.8, (r, t) => `${pc(r.flag)} of your wins come on the clock${vs(t.flag)}.`], snap: [.6, r => `${pc(r.snap)} of your moves take under five seconds.`],
      fast: [.3, r => `${pc(r.fast)} of your games are bullet or blitz.`], length: [-.2, null]},
    // Speed is the whole story: only a player who mostly plays bullet is a Nakamura.
    gate: raw => raw.bullet >= .5, calibration: [.4, 1.25],
    exemplar: rows => rows.filter(r => r.res === 'w' && r.term === 'time').sort((a, b) => a.matMin - b.matMin)[0] || rows.filter(r => r.cls === 'bullet' && r.res === 'w')[0], exemplarCaption: 'A flag: the clock was the last piece on the board.'},
];

/** Rank archetypes for the rows. Returns null below MIN_GAMES. */
export function classify(rows) {
  if (!rows || rows.length < MIN_GAMES) return null;
  const {raw, typical, norm} = tendencies(rows);
  const scored = ARCHETYPES.map(archetype => {
    const parts = Object.entries(archetype.traits).map(([key, [weight, text]]) => ({key, weight, contribution: weight * norm[key], text}));
    const scale = Math.sqrt(parts.reduce((s, p) => s + p.weight * p.weight, 0));
    const [mu, sigma] = archetype.calibration || [0, 1];
    let score = (parts.reduce((s, p) => s + p.contribution, 0) / scale - mu) / sigma;
    if (archetype.gate && !archetype.gate(raw)) score -= 3;
    const telling = parts.filter(p => p.text).sort((a, b) => b.contribution - a.contribution);
    const reasons = [...telling.filter(p => p.contribution > 0), ...telling.filter(p => p.contribution <= 0 && p.weight > 0)].slice(0, 3).map(p => p.text(raw, typical));
    return {id: archetype.id, name: archetype.name, era: archetype.era, tagline: archetype.tagline, blurb: archetype.blurb, score: Math.round(100 * score) / 100, reasons};
  }).sort((a, b) => b.score - a.score);
  const winner = ARCHETYPES.find(a => a.id === scored[0].id);
  const exemplar = winner.exemplar(rows) || null;
  return {winner: scored[0], runnerUp: scored[1], ranking: scored,
    exemplar: exemplar ? {id: exemplar.id, url: exemplar.url, opp: exemplar.opp, res: exemplar.res, t: exemplar.t, fen: exemplar.fenEnd, fenLow: exemplar.fenLow, lowPly: exemplar.lowPly, me: exemplar.me, n: exemplar.n, caption: winner.exemplarCaption} : null,
    famous: winner.famous || null, tendencies: raw};
}
