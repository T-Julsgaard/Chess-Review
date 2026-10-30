import {Engine} from '../../engine/uci.js';
import {Chess} from '../../lib/chess.js';
import {publicMoveQuality, publicGameAccuracy, sf19MoveQuality, sf19GameAccuracy} from '../../lib/public-scoring.js';
import {runFastPreview} from './fast-preview-browser.mjs';

async function post(type, value) {
  const response = await fetch('/record', {method: 'POST', body: JSON.stringify({type, ...value})});
  if (!response.ok) throw Error('Could not retain benchmark evidence: ' + await response.text());
}

export async function runBenchmark({games, calibration, pilot = false, longGames = false, fastPreview = false}) {
  if (fastPreview) return runFastPreview({games, calibration});
  const jobs = [];
  if (pilot) {
    for (const build of ['nnue', 'sf19lite']) jobs.push({build, depth: 16, trial: 0, cold: true, game: games[0], limit: 8});
  } else if (longGames) {
    for (let trial = 0; trial < 3; trial++) for (const game of games) {
      for (const depth of trial % 2 ? [8, 6] : [6, 8]) jobs.push({build: 'nnue', depth, trial, cold: true, game});
    }
  } else {
    // Alternate engine order to reduce systematic warmup/order bias. No overlapping searches.
    for (const depth of [6, 8, 16]) for (let trial = 0; trial < (depth === 16 ? 1 : 3); trial++) {
      for (const game of games) for (const build of trial % 2 ? ['sf19lite', 'nnue'] : ['nnue', 'sf19lite']) {
        jobs.push({build, depth, trial, cold: true, game});
      }
    }
    // Historical "retained" keys mean no additional explicit Clear Hash. The
    // wrapper still sends ucinewgame, so this measures single-reset overhead,
    // not actual hash retention. See the report's post-collection correction.
    for (let trial = 0; trial < 3; trial++) for (const game of games) {
      for (const build of trial % 2 ? ['sf19lite', 'nnue'] : ['nnue', 'sf19lite']) jobs.push({build, depth: 8, trial, cold: false, game});
    }
  }
  const results = [];
  for (const job of jobs) {
    const {build, depth, trial, cold, game} = job;
    const key = [build, depth, cold ? 'cold' : 'retained', game.id, trial].join('-');
    await post('begin', {key, build, depth, trial, cold, game: game.id});
    const chess = new Chess(), history = {initialFen: chess.fen(), moves: []};
    const started = performance.now();
    const engine = new Engine(build === 'nnue' ? '/engine/stockfish-nnue.js' : '/engine/stockfish-19-lite-single.js');
    const observations = [];
    let searches = 0, recoveries = 0;
    try {
      await engine.setOptions({Hash: 16, 'Skill Level': 20, UCI_LimitStrength: false, UCI_ShowWDL: true, UCI_Chess960: false});
      if (!new RegExp('^Stockfish ' + (build === 'nnue' ? 18 : 19) + '\\b').test(engine.identity)) throw Error('Wrong engine identity');
      const startupMs = performance.now() - started, searchStarted = performance.now();
      for (let i = 0; i < Math.min(game.moves.length, job.limit || Infinity); i++) {
        const fen = chess.fen(), played = game.moves[i], legal = chess.moves({verbose: true});
        if (!legal.some(move => move.lan === played)) throw Error('Illegal recorded move');
        const options = {cold, requireExact: true, budget: {kind: 'depth', value: depth}};
        const search = async searchMove => {
          searches++;
          return engine.analyse(fen, depth, 1, history, null, {...options, searchMove});
        };
        let best;
        try { best = await search(null); }
        catch (error) {
          if (!error.scoringMove) throw error;
          recoveries++; best = await search(error.scoringMove);
        }
        const top = best.bestmove === played;
        const actual = top ? best : await search(played);
        const forced = legal.length === 1;
        const quality = build === 'nnue'
          ? publicMoveQuality(best.score, actual.score, calibration.quality, {top, forced})
          : sf19MoveQuality(best.score, actual.score, {top, forced});
        if (!Number.isFinite(quality.quality)) throw Error('Invalid move quality');
        observations.push({ply: i + 1, color: chess.turn(), played, bestmove: best.bestmove,
          best: best.score, actual: actual.score, bestDepth: best.lines[0]?.depth, actualDepth: actual.lines[0]?.depth,
          legalChoices: legal.length, top, ...quality});
        chess.move({from: played.slice(0, 2), to: played.slice(2, 4), promotion: played[4]});
        history.moves.push(played);
        if (depth === 16 && (i + 1) % 10 === 0) await post('progress', {key, completed: i + 1, total: job.limit || game.moves.length, elapsedMs: performance.now() - started});
      }
      const searchMs = performance.now() - searchStarted, totalMs = performance.now() - started;
      const accuracy = Object.fromEntries(['w', 'b'].map(color => {
        const moves = observations.filter(move => move.color === color);
        return [color, build === 'nnue' ? publicGameAccuracy(moves) : sf19GameAccuracy(moves)];
      }));
      const result = {key, build, depth, trial, cold, game: game.id, identity: engine.identity,
        plies: observations.length, searches, recoveries, startupMs, searchMs, totalMs, accuracy,
        decisions: Object.fromEntries(['w', 'b'].map(color => [color, observations.filter(move => move.color === color && move.eligible).length]))};
      if (observations.length !== (job.limit || game.moves.length)) throw Error('Incomplete game');
      await post('result', {...result, observations});
      results.push(result);
    } finally { engine.terminate(); }
  }
  return {userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, results};
}

globalThis.runBenchmark = runBenchmark;
