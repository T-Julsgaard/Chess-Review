// Player profile — historical twin. Each archetype is a weighted bundle of
// documented, replay-derived tendencies. The player's rates are normalised against
// round reference values, the best-scoring archetype wins, and the reason is built
// from the three tendencies that contributed most, each with the player's own number.
import {MIN_GAMES} from './insights.js';

const share = (rows, test) => rows.length ? rows.filter(test).length / rows.length : 0;
const mean = (rows, pick) => rows.length ? rows.reduce((s, r) => s + pick(r), 0) / rows.length : 0;

/** Normalised tendency values (0 = none, 1 = reference "a lot"), with raw figures for copy. */
export function tendencies(rows) {
  const wins = rows.filter(r => r.res === 'w'), losses = rows.filter(r => r.res === 'l');
  const white = rows.filter(r => r.me === 'w'), black = rows.filter(r => r.me === 'b');
  const bothCastled = rows.filter(r => r.castleSide && r.oppCastleSide);
  const ahead = rows.filter(r => r.matMax >= 3), behind = rows.filter(r => r.matMin <= -3);
  const endgames = rows.filter(r => r.endgame);
  const sorted = [...rows].sort((a, b) => a.t - b.t);
  let afterLoss = 0, afterLossWins = 0;
  for (let i = 1; i < sorted.length; i++) if (sorted[i - 1].res === 'l' && sorted[i].t - sorted[i - 1].t <= 7200) { afterLoss++; if (sorted[i].res === 'w') afterLossWins++; }
  const raw = {
    sacrificeWins: share(wins, r => r.matMin <= -2), checks: mean(rows, r => r.checks), storm: share(rows.filter(r => r.oppCastleSide === 'k'), r => r.storm),
    opposite: share(bothCastled, r => r.castleSide !== r.oppCastleSide), gambit: share(rows, r => r.gambit), queenEarly: share(rows, r => r.qEarly),
    fianchetto: share(rows, r => r.fian), flank: share(white, r => /^(Nf3|c4|b3|g3|f4|b4)$/.test(r.first.split(' ')[0])), e4: share(white, r => r.first.startsWith('e4')),
    d4: share(white, r => /^(d4|c4)/.test(r.first)), sicilian: share(black.filter(r => r.line.startsWith('e4 ')), r => r.line.split(' ')[1] === 'c5'),
    shortWins: share(wins, r => r.n <= 60), draws: share(rows, r => r.res === 'd'), losses: share(rows, r => r.res === 'l'), wins: share(rows, r => r.res === 'w'),
    endgame: share(rows, r => r.endgame), endgameWins: share(endgames, r => r.res === 'w'), queenTrade: share(rows, r => r.qtrade && r.qtrade <= 20),
    length: mean(rows, r => r.n), comeback: share(behind, r => r.res !== 'l'), convert: share(ahead, r => r.res === 'w'), bounce: afterLoss ? afterLossWins / afterLoss : 0,
    bullet: share(rows, r => r.cls === 'bullet'), snap: (() => { const n = rows.reduce((s, r) => s + r.thinkN, 0); return n ? rows.reduce((s, r) => s + r.snap, 0) / n : 0; })(),
    flag: share(wins, r => r.term === 'time'), swings: mean(rows, r => r.swings), fightOn: share(losses, r => r.term !== 'resign'),
    castleEarly: share(rows, r => r.castle && r.castle <= 8), knights: share(rows, r => r.knights4), pair: share(rows.filter(r => r.n >= 50), r => r.pair25),
    materialSafe: share(rows, r => r.matMin >= -1), aheadGames: ahead.length, behindGames: behind.length, afterLoss,
  };
  const ref = {sacrificeWins: .3, checks: 4, storm: .3, opposite: .3, gambit: .25, queenEarly: .25, fianchetto: .5, flank: .4, e4: .9, d4: .8, sicilian: .5,
    shortWins: .6, draws: .15, losses: .55, wins: .6, endgame: .5, endgameWins: .6, queenTrade: .3, length: 110, comeback: .35, convert: .9, bounce: .6,
    bullet: .6, snap: .6, flag: .3, swings: 1, fightOn: .6, castleEarly: .7, knights: .6, pair: .55, materialSafe: .7};
  const norm = {};
  for (const [key, value] of Object.entries(raw)) norm[key] = ref[key] ? Math.min(1.5, value / ref[key]) : value;
  return {raw, norm};
}

const pc = v => Math.round(100 * v) + '%';
// Each trait: weight and a sentence template using the player's raw figure.
export const ARCHETYPES = [
  {id: 'tal', name: 'Mikhail Tal', era: 'World Champion 1960–61', tagline: 'The magician from Riga', blurb: 'Tal sacrificed material for initiative and dragged opponents into positions nobody could calculate. He trusted the attack more than the material count.',
    traits: {sacrificeWins: [1.4, r => `${pc(r.sacrificeWins)} of your wins came after you gave up material.`], checks: [.9, r => `You give ${r.checks.toFixed(1)} checks per game.`], opposite: [.6, r => `Opposite-side castling in ${pc(r.opposite)} of games where both sides castle.`], shortWins: [.7, r => `${pc(r.shortWins)} of your wins finished inside 30 moves.`], swings: [.6, r => `Your games swing: ${r.swings.toFixed(1)} big material swings per game.`], draws: [-.6, null], queenTrade: [-.5, null]},
    exemplar: rows => rows.filter(r => r.res === 'w').sort((a, b) => a.matMin - b.matMin)[0], exemplarCaption: 'Your most Tal-like win: material went out, the attack came in.'},
  {id: 'morphy', name: 'Paul Morphy', era: 'Unofficial world champion, 1858', tagline: 'Development, then the knockout', blurb: 'Morphy brought every piece out fast, opened the centre and punished slow play with crisp combinations in open games.',
    traits: {knights: [1.1, r => `Both knights are out by move 4 in ${pc(r.knights)} of your games.`], castleEarly: [.8, r => `You castle by move 8 in ${pc(r.castleEarly)} of games.`], e4: [.7, r => `You open 1.e4 in ${pc(r.e4)} of your White games.`], shortWins: [.9, r => `${pc(r.shortWins)} of your wins are over by move 30.`], gambit: [.5, r => `You invest a pawn in the opening in ${pc(r.gambit)} of games.`], endgame: [-.5, null]},
    exemplar: rows => rows.filter(r => r.res === 'w' && r.term === 'mate').sort((a, b) => a.n - b.n)[0] || rows.filter(r => r.res === 'w').sort((a, b) => a.n - b.n)[0], exemplarCaption: 'Your fastest finish: develop, open lines, mate.',
    famous: {label: 'Morphy v. the Duke of Brunswick and Count Isouard, Paris 1858', moves: ['e4','e5','Nf3','d6','d4','Bg4','dxe5','Bxf3','Qxf3','dxe5','Bc4','Nf6','Qb3','Qe7','Nc3','c6','Bg5','b5','Nxb5','cxb5','Bxb5+','Nbd7','O-O-O','Rd8','Rxd7','Rxd7','Rd1','Qe6','Bxd7+','Nxd7','Qb8+','Nxb8','Rd8#'], from: 20}},
  {id: 'anderssen', name: 'Adolf Anderssen', era: 'Leading master of the 1850s–60s', tagline: 'The romantic attacker', blurb: 'Anderssen played the Immortal and Evergreen games: gambits, open files and a king hunt no matter the cost.',
    traits: {gambit: [1.3, r => `You are a pawn down after move 10 in ${pc(r.gambit)} of your games, usually on purpose.`], sacrificeWins: [.8, r => `${pc(r.sacrificeWins)} of your wins came with material invested.`], checks: [.7, r => `${r.checks.toFixed(1)} checks per game.`], queenEarly: [.5, r => `Your queen joins early in ${pc(r.queenEarly)} of games.`], draws: [-.7, null], endgame: [-.6, null]},
    exemplar: rows => rows.filter(r => r.res === 'w' && r.gambit).sort((a, b) => a.matMin - b.matMin)[0] || rows.filter(r => r.res === 'w').sort((a, b) => a.matMin - b.matMin)[0], exemplarCaption: 'Your most romantic win: the material never mattered.',
    famous: {label: 'Anderssen v. Kieseritzky, London 1851 (the Immortal Game)', moves: ['e4','e5','f4','exf4','Bc4','Qh4+','Kf1','b5','Bxb5','Nf6','Nf3','Qh6','d3','Nh5','Nh4','Qg5','Nf5','c6','g4','Nf6','Rg1','cxb5','h4','Qg6','h5','Qg5','Qf3','Ng8','Bxf4','Qf6','Nc3','Bc5','Nd5','Qxb2','Bd6','Bxg1','e5','Qxa1+','Ke2','Na6','Nxg7+','Kd8','Qf6+','Nxf6','Be7#'], from: 34}},
  {id: 'lasker', name: 'Emanuel Lasker', era: 'World Champion 1894–1921', tagline: 'The fighter', blurb: 'Lasker defended worse positions better than anyone, set practical problems and kept finding resources when the position looked lost.',
    traits: {comeback: [1.4, r => `You avoid defeat in ${pc(r.comeback)} of games where you were three points down.`], fightOn: [.8, r => `You resign rarely: ${pc(r.fightOn)} of your losses go to mate or the clock.`], bounce: [.8, r => `Right after a loss you win ${pc(r.bounce)} of the next games.`], swings: [.5, r => `${r.swings.toFixed(1)} big swings per game.`], length: [.4, r => `Your games average ${Math.round(r.length / 2)} moves.`], shortWins: [-.4, null]},
    exemplar: rows => rows.filter(r => r.res === 'w').sort((a, b) => a.matMin - b.matMin)[0], exemplarCaption: 'Your biggest fightback.'},
  {id: 'capablanca', name: 'José Raúl Capablanca', era: 'World Champion 1921–27', tagline: 'Effortless technique', blurb: 'Capablanca simplified, traded queens when it suited him and converted small endgame edges with almost no mistakes.',
    traits: {endgame: [1.1, r => `${pc(r.endgame)} of your games reach an endgame.`], endgameWins: [1.1, r => `You win ${pc(r.endgameWins)} of the games that reach one.`], queenTrade: [.9, r => `Queens leave the board by move 20 in ${pc(r.queenTrade)} of your games.`], materialSafe: [.7, r => `You never drop more than a pawn in ${pc(r.materialSafe)} of games.`], convert: [.6, r => `You convert ${pc(r.convert)} of games where you were three points up.`], sacrificeWins: [-.6, null], checks: [-.3, null]},
    exemplar: rows => rows.filter(r => r.res === 'w' && r.endgame).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.res === 'w').sort((a, b) => b.n - a.n)[0], exemplarCaption: 'Your cleanest grind: a long game, an endgame, a win.'},
  {id: 'petrosian', name: 'Tigran Petrosian', era: 'World Champion 1963–69', tagline: 'Iron Tigran', blurb: 'Petrosian removed his opponents\' ideas before they existed. Prophylaxis, patience and a loss rate other champions envied.',
    traits: {losses: [-1.4, r => `You lose only ${pc(r.losses)} of your games.`], draws: [.9, r => `${pc(r.draws)} of your games are drawn.`], materialSafe: [.9, r => `You stay within a pawn of material in ${pc(r.materialSafe)} of games.`], length: [.6, r => `Long games: ${Math.round(r.length / 2)} moves on average.`], castleEarly: [.4, r => `King tucked away by move 8 in ${pc(r.castleEarly)} of games.`], sacrificeWins: [-.5, null], shortWins: [-.5, null]},
    exemplar: rows => rows.filter(r => r.res !== 'l' && r.matMin >= -1).sort((a, b) => b.n - a.n)[0], exemplarCaption: 'Your most Petrosian game: nothing was allowed to happen.'},
  {id: 'karpov', name: 'Anatoly Karpov', era: 'World Champion 1975–85', tagline: 'The boa constrictor', blurb: 'Karpov took a small edge and squeezed. He converted advantages with relentless precision and rarely let a won game slip.',
    traits: {convert: [1.4, r => `You convert ${pc(r.convert)} of the games where you were clearly ahead.`], wins: [.7, r => `You win ${pc(r.wins)} of your games.`], d4: [.6, r => `You open 1.d4 or 1.c4 in ${pc(r.d4)} of your White games.`], materialSafe: [.6, r => `You stay within a pawn in ${pc(r.materialSafe)} of games.`], length: [.4, r => `${Math.round(r.length / 2)} moves on average.`], gambit: [-.5, null], sacrificeWins: [-.4, null]},
    exemplar: rows => rows.filter(r => r.res === 'w' && r.matMax >= 3 && r.matMin >= -1).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.res === 'w').sort((a, b) => b.matMax - a.matMax)[0], exemplarCaption: 'A squeeze: ahead early, never in doubt.'},
  {id: 'kasparov', name: 'Garry Kasparov', era: 'World Champion 1985–2000', tagline: 'Dynamic energy', blurb: 'Kasparov combined deep opening preparation with relentless dynamic play: sharp Sicilians, long main lines and a huge win rate.',
    traits: {sicilian: [1, r => `You answer 1.e4 with the Sicilian in ${pc(r.sicilian)} of games.`], wins: [.9, r => `You win ${pc(r.wins)} of your games.`], checks: [.5, r => `${r.checks.toFixed(1)} checks per game.`], storm: [.6, r => `Pawn storms against a castled king in ${pc(r.storm)} of those games.`], e4: [.4, r => `1.e4 in ${pc(r.e4)} of your White games.`], draws: [-.5, null]},
    exemplar: rows => rows.filter(r => r.res === 'w' && r.line.includes('c5')).sort((a, b) => b.checks - a.checks)[0] || rows.filter(r => r.res === 'w').sort((a, b) => b.checks - a.checks)[0], exemplarCaption: 'Your most dynamic win.'},
  {id: 'fischer', name: 'Bobby Fischer', era: 'World Champion 1972–75', tagline: 'Best by test', blurb: 'Fischer played 1.e4, trusted clear principles, kept his pieces active and refused draws when there was still a game to win.',
    traits: {e4: [1.3, r => `1.e4 in ${pc(r.e4)} of your White games. "Best by test."`], wins: [.8, r => `You win ${pc(r.wins)} of your games.`], draws: [-.9, r => `Only ${pc(r.draws)} draws.`], pair: [.5, r => `You keep the bishop pair past move 25 in ${pc(r.pair)} of your longer games.`], knights: [.4, r => `Fast development: both knights out by move 4 in ${pc(r.knights)} of games.`], flank: [-.5, null]},
    exemplar: rows => rows.filter(r => r.res === 'w' && r.first.startsWith('e4')).sort((a, b) => b.myRating - a.myRating || a.matMin - b.matMin)[0] || rows.filter(r => r.res === 'w')[0], exemplarCaption: 'Principled and direct: a 1.e4 win.'},
  {id: 'reti', name: 'Richard Réti', era: 'Hypermodern pioneer, 1920s', tagline: 'Control from a distance', blurb: 'Réti fianchettoed, attacked the centre from the flanks and let opponents overextend before striking.',
    traits: {fianchetto: [1.3, r => `A fianchetto appears in ${pc(r.fianchetto)} of your games.`], flank: [1.2, r => `You open with a flank move (Nf3, c4, b3, g3) in ${pc(r.flank)} of your White games.`], endgame: [.4, r => `${pc(r.endgame)} of your games reach an endgame.`], e4: [-.8, null], gambit: [-.3, null]},
    exemplar: rows => rows.filter(r => r.res === 'w' && r.fian).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.fian)[0], exemplarCaption: 'Hypermodern: the bishops did the work from afar.',
    famous: {label: 'Réti v. Tartakower, Vienna 1910', moves: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6','Qd3','e5','dxe5','Qa5+','Bd2','Qxe5','O-O-O','Nxe4','Qd8+','Kxd8','Bg5+','Kc7','Bd8#'], from: 14}},
  {id: 'carlsen', name: 'Magnus Carlsen', era: 'World Champion 2013–23', tagline: 'The grinder', blurb: 'Carlsen wins equal positions. Endgame mastery, zero fear of long games and the stamina to outlast anyone.',
    traits: {endgameWins: [1.2, r => `You win ${pc(r.endgameWins)} of games that reach an endgame.`], endgame: [.9, r => `${pc(r.endgame)} of your games go that deep.`], length: [.7, r => `${Math.round(r.length / 2)} moves on average.`], losses: [-.8, r => `You lose only ${pc(r.losses)} of your games.`], convert: [.5, r => `You convert ${pc(r.convert)} of clearly better positions.`], shortWins: [-.6, null]},
    exemplar: rows => rows.filter(r => r.res === 'w' && r.endgame && r.matMax <= 2).sort((a, b) => b.n - a.n)[0] || rows.filter(r => r.res === 'w' && r.endgame).sort((a, b) => b.n - a.n)[0], exemplarCaption: 'A grind from nothing: equal for ages, then a win.'},
  {id: 'nakamura', name: 'Hikaru Nakamura', era: 'Speed-chess specialist', tagline: 'Fast hands', blurb: 'Nakamura lives in bullet and blitz: instant decisions, flagging opponents and play that never slows down.',
    traits: {bullet: [1.4, r => `${pc(r.bullet)} of your games are bullet.`], snap: [1.1, r => `${pc(r.snap)} of your moves take under five seconds.`], flag: [.9, r => `${pc(r.flag)} of your wins come on the clock.`], checks: [.3, null], length: [-.3, null]},
    exemplar: rows => rows.filter(r => r.res === 'w' && r.term === 'time').sort((a, b) => a.matMin - b.matMin)[0] || rows.filter(r => r.cls === 'bullet' && r.res === 'w')[0], exemplarCaption: 'A flag: the clock was the last piece on the board.'},
];

/** Rank archetypes for the rows. Returns null below MIN_GAMES. */
export function classify(rows) {
  if (!rows || rows.length < MIN_GAMES) return null;
  const {raw, norm} = tendencies(rows);
  const scored = ARCHETYPES.map(archetype => {
    const parts = Object.entries(archetype.traits).map(([key, [weight, text]]) => ({key, weight, contribution: weight * norm[key], text}));
    const score = parts.reduce((s, p) => s + p.contribution, 0);
    const reasons = parts.filter(p => p.text && p.contribution > 0 || (p.weight < 0 && p.text)).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 3).map(p => p.text(raw));
    return {id: archetype.id, name: archetype.name, era: archetype.era, tagline: archetype.tagline, blurb: archetype.blurb, score: Math.round(100 * score) / 100, reasons};
  }).sort((a, b) => b.score - a.score);
  const winner = ARCHETYPES.find(a => a.id === scored[0].id);
  const exemplar = winner.exemplar(rows) || null;
  return {winner: scored[0], runnerUp: scored[1], ranking: scored,
    exemplar: exemplar ? {id: exemplar.id, url: exemplar.url, opp: exemplar.opp, res: exemplar.res, t: exemplar.t, fen: exemplar.fenEnd, fenLow: exemplar.fenLow, lowPly: exemplar.lowPly, me: exemplar.me, n: exemplar.n, caption: winner.exemplarCaption} : null,
    famous: winner.famous || null, tendencies: raw};
}
