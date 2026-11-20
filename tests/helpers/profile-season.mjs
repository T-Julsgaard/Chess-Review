// Deterministic synthetic season: 300 games over a year with a built-in rival, night games and habits.
function rng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
export function season(count = 300, seed = 7) {
  const rand = rng(seed), rows = [], start = Date.UTC(2026, 0, 5, 18) / 1000;
  const opps = ['rival_rick', 'nemesis_nina', 'victim_vic', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const openings = [['C50', 'Italian Game', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O'], ['B20', 'Sicilian Defense', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5'], ['D02', 'London System', 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6']];
  let rating = 1500;
  for (let i = 0; i < count; i++) {
    const t = start + i * 86400 * 1.2 + (i % 3) * 3600 * 2;
    const oppIdx = i % 7 === 0 ? 0 : i % 9 === 0 ? 1 : i % 10 === 0 ? 2 : 3 + Math.floor(rand() * 10);
    const opp = opps[oppIdx];
    const r = rand();
    let res = r < 0.5 ? 'w' : r < 0.9 ? 'l' : 'd';
    if (oppIdx === 1) res = 'l';
    if (oppIdx === 2) res = 'w';
    rating += res === 'w' ? 8 : res === 'l' ? -7 : 0;
    const me = i % 2 ? 'b' : 'w';
    const op = openings[me === 'w' ? (i % 5 === 0 ? 2 : 0) : 1];
    const n = 40 + Math.floor(rand() * 80);
    const term = res === 'd' ? 'repetition' : rand() < 0.3 ? 'mate' : rand() < 0.5 ? 'resign' : 'time';
    rows.push({v: 1, id: String(i), site: 'chesscom', url: 'https://www.chess.com/game/live/' + i, t, cls: i % 4 === 0 ? 'bullet' : 'blitz', tc: '180+2', rated: true, me, opp, oppRating: 1480 + Math.floor(rand() * 100), myRating: rating,
      res, term, eco: op[0], op: op[1], bot: false, n, myMoves: Math.ceil(n / 2), knights4: rand() < 0.7, castle: rand() < 0.6 ? 6 : 0, castleSide: 'k', oppCastleSide: 'k', fian: me === 'b' && rand() < 0.2, qtrade: rand() < 0.1 ? 15 : 0,
      qEarly: false, gambit: false, storm: rand() < 0.4, pair25: false, ep: 0, promo: 0, under: 0, checks: 2 + Math.floor(rand() * 4), caps: 8, mateBy: res === 'w' && term === 'mate' ? 'q' : null, matePattern: res === 'w' && term === 'mate' ? 'back-rank' : null, matedBy: res === 'l' && term === 'mate' ? 'q' : null,
      matMin: res === 'w' && i % 17 === 0 ? -5 : -1, matMax: res !== 'w' && i % 19 === 0 ? 6 : res === 'w' && i % 6 === 0 ? 4 : 2, matFinal: 0, lowPly: 30, highPly: 20, swings: 0, endgame: n > 90 ? 70 : 0,
      think: 6, thinkN: 20, snap: 8, tb: [2, 2, 2, 2, 5, 4, 2, 1], tf: i % 4 === 0 ? [3, 3, 4, 4, 2, 2, 1, 1] : null, longThink: 20 + Math.floor(rand() * 60), longPly: 23, trouble: rand() < 0.3, ahead: 0.6, dur: 300, line: op[2], first: me === 'w' ? op[2].split(' ')[0] + ' ' + op[2].split(' ')[2] : op[2].split(' ')[1] + ' ' + op[2].split(' ')[3],
      fenEnd: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', fenLow: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', fenHigh: '', heat: '0'.repeat(28) + '5' + '0'.repeat(35)});
  }
  return rows;
}

